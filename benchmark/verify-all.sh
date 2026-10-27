#!/bin/bash
# =============================================================================
# Script kiem thu toan bo 5 yeu cau cua de bai.
# Chay tu may host (da co docker compose up).
#
#   bash benchmark/verify-all.sh
#
# Script chi DOC va goi API — khong thay doi du lieu he thong.
# =============================================================================

BASE="${GATEWAY_URL:-http://localhost:8080}"
PASS=0
FAIL=0

log()  { printf '%s\n' "$*"; }
head2() { printf '\n%s\n%s\n' "==================================================================" "  $*"; printf '%s\n' "=================================================================="; }

# check <mo ta> <gia tri thuc> <gia tri mong doi>
check() {
    local desc="$1" actual="$2" expected="$3"
    if [ "$actual" = "$expected" ]; then
        printf '  [PASS] %-58s (%s)\n' "$desc" "$actual"
        PASS=$((PASS + 1))
    else
        printf '  [FAIL] %-58s (mong doi %s, nhan %s)\n' "$desc" "$expected" "$actual"
        FAIL=$((FAIL + 1))
    fi
}

# check_re <mo ta> <chuoi> <regex>
check_re() {
    local desc="$1" haystack="$2" pattern="$3"
    if printf '%s' "$haystack" | grep -qE "$pattern"; then
        printf '  [PASS] %-58s\n' "$desc"
        PASS=$((PASS + 1))
    else
        printf '  [FAIL] %-58s\n' "$desc"
        FAIL=$((FAIL + 1))
    fi
}

http_code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

# -----------------------------------------------------------------------------
head2 "0. Cho he thong san sang"
for i in $(seq 1 40); do
    if [ "$(http_code "$BASE/health")" = "200" ]; then
        log "  Gateway san sang sau ${i}s."
        break
    fi
    sleep 1
done

# -----------------------------------------------------------------------------
head2 "1. Dang nhap lay JWT"
LOGIN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" \
    -d '{"username":"alice","password":"alice123"}')
TOKEN=$(printf '%s' "$LOGIN" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
if [ -n "$TOKEN" ]; then
    log "  [PASS] Dang nhap thanh cong, da lay duoc token (${#TOKEN} ky tu)."
    PASS=$((PASS + 1))
else
    log "  [FAIL] Khong lay duoc token: $LOGIN"
    FAIL=$((FAIL + 1))
    log "  Dung lai vi khong the kiem thu tiep."
    exit 1
fi
AUTH="Authorization: Bearer $TOKEN"

# Sai mat khau phai bi tu choi
check "Dang nhap sai mat khau -> 401" \
    "$(http_code -X POST "$BASE/auth/login" -H 'Content-Type: application/json' -d '{"username":"alice","password":"sai"}')" "401"

# -----------------------------------------------------------------------------
head2 "2. A. GATEWAY ROUTING"
USERS_BODY=$(curl -s "$BASE/users/me" -H "$AUTH")
check "/users/me -> 200" "$(http_code "$BASE/users/me" -H "$AUTH")" "200"
check_re "/users/me tra ve dung user alice (u-1001)" "$USERS_BODY" '"id":"u-1001"'

ORDERS_BODY=$(curl -s "$BASE/orders/me" -H "$AUTH")
check "/orders/me -> 200" "$(http_code "$BASE/orders/me" -H "$AUTH")" "200"
check_re "/orders/me tra ve danh sach don hang" "$ORDERS_BODY" '"orders":\['
check_re "/orders/me co tom tat don hang" "$ORDERS_BODY" '"summary":\{'

# Routing toi dung service: response cua 2 service khac nhau
check_re "/users/me do User Service xu ly" "$USERS_BODY" '"email"'
check_re "/orders/me do Order Service xu ly" "$ORDERS_BODY" '"totalAmount"'

# Order Service kiem tra quyen so huu
check "Xem don hang cua nguoi khac -> 403" \
    "$(http_code "$BASE/orders/o-5004" -H "$AUTH")" "403"

# -----------------------------------------------------------------------------
head2 "3. B. GATEWAY OFFLOADING — JWT"
check "Khong co token -> 401" "$(http_code "$BASE/users/me")" "401"
check "Token rac -> 401" \
    "$(http_code "$BASE/users/me" -H 'Authorization: Bearer abc.def.ghi')" "401"
check "Token sai chu ky -> 401" \
    "$(http_code "$BASE/users/me" -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1LTEwMDEiLCJpc3MiOiJzZWN1cml0eS1kZXNpZ24ifQ.saisaisaisaisaisaisaisaisaisaisai')" "401"
check "Token hop le -> 200" "$(http_code "$BASE/users/me" -H "$AUTH")" "200"

# Token het han: tao bang node trong container gateway-core (da co jsonwebtoken).
# Dung chinh JWT_SECRET dang chay trong he thong de chu ky hop le, chi co exp la qua khu.
EXPIRED=$(docker compose exec -T gateway-core node -e "
const jwt=require('jsonwebtoken');
console.log(jwt.sign({sub:'u-1001',username:'alice',role:'customer'},
  process.env.JWT_SECRET,
  {algorithm:'HS256',issuer:process.env.JWT_ISSUER||'security-design',expiresIn:-60}));
" 2>/dev/null | tr -d '\r')
if [ -n "$EXPIRED" ]; then
    check "Token het han (chu ky dung, exp qua khu) -> 401" \
        "$(http_code "$BASE/users/me" -H "Authorization: Bearer $EXPIRED")" "401"
else
    log "  [SKIP] Khong tao duoc token het han."
fi

# -----------------------------------------------------------------------------
head2 "4. B. GATEWAY OFFLOADING — RATE LIMIT (10 req/s)"
log "  Gui 30 request lien tiep toi /users/me..."
OK_COUNT=0
TOO_MANY=0
OTHER=0
for i in $(seq 1 30); do
    CODE=$(http_code "$BASE/users/me" -H "$AUTH")
    case "$CODE" in
        200) OK_COUNT=$((OK_COUNT + 1)) ;;
        429) TOO_MANY=$((TOO_MANY + 1)) ;;
        *)   OTHER=$((OTHER + 1)) ;;
    esac
done
log "  Ket qua: 200=$OK_COUNT  429=$TOO_MANY  khac=$OTHER"
if [ "$TOO_MANY" -gt 0 ]; then
    log "  [PASS] Da xuat hien HTTP 429 (rate limit hoat dong)."
    PASS=$((PASS + 1))
else
    log "  [FAIL] Khong co request nao bi 429."
    FAIL=$((FAIL + 1))
fi

log "  Cho 3 giay de bo dem rate limit reset..."
sleep 3
check "Sau khi cho, request lai thanh cong -> 200" \
    "$(http_code "$BASE/users/me" -H "$AUTH")" "200"

# -----------------------------------------------------------------------------
head2 "5. C. GATEWAY AGGREGATION — /dashboard"
DASH=$(curl -s "$BASE/dashboard" -H "$AUTH")
DASH_CODE=$(http_code "$BASE/dashboard" -H "$AUTH")
check "/dashboard -> 200" "$DASH_CODE" "200"
check_re "/dashboard co thong tin user" "$DASH" '"user":\{'
check_re "/dashboard co danh sach orders" "$DASH" '"orders":\['
check_re "/dashboard co orderSummary" "$DASH" '"orderSummary":\{'
check_re "/dashboard co generatedAt (du lieu tinh toan, khong hard-code)" "$DASH" '"generatedAt":"'

# Khong tin userId do client khai bao
DASH_SPOOF=$(curl -s "$BASE/dashboard?userId=u-1003" -H "$AUTH")
check_re "/dashboard?userId=u-1003 VAN tra ve alice (u-1001)" "$DASH_SPOOF" '"id":"u-1001"'

check "/dashboard khong co token -> 401" "$(http_code "$BASE/dashboard")" "401"

# -----------------------------------------------------------------------------
head2 "6. D. VALET KEY — pre-signed URL + MinIO"
PRESIGN=$(curl -s -X POST "$BASE/users/me/avatar/presign" -H "$AUTH" \
    -H "Content-Type: application/json" -d '{"contentType":"image/png"}')
check_re "Tao duoc pre-signed URL" "$PRESIGN" '"uploadUrl":"http'
check_re "Phuong thuc la PUT" "$PRESIGN" '"method":"PUT"'
check_re "Het han sau 300 giay" "$PRESIGN" '"expiresIn":300'
check_re "Object nam trong thu muc cua user tu JWT" "$PRESIGN" 'avatars/u-1001/'
check_re "URL dung endpoint cong khai (localhost:9000)" "$PRESIGN" 'http://localhost:9000'
# Khong duoc lo secret key MinIO trong response.
if printf '%s' "$PRESIGN" | grep -q 'minioadmin123'; then
    log "  [FAIL] Response co chua MINIO secret key!"
    FAIL=$((FAIL + 1))
else
    log "  [PASS] Khong lo thong tin xac thuc MinIO trong response"
    PASS=$((PASS + 1))
fi

UPLOAD_URL=$(printf '%s' "$PRESIGN" | sed -n 's/.*"uploadUrl":"\([^"]*\)".*/\1/p')
OBJECT=$(printf '%s' "$PRESIGN" | sed -n 's/.*"objectName":"\([^"]*\)".*/\1/p')

if [ -n "$UPLOAD_URL" ]; then
    TMPIMG=$(mktemp)
    printf '\x89PNG\r\n\x1a\n' > "$TMPIMG"
    PUT_CODE=$(http_code -X PUT "$UPLOAD_URL" -H "Content-Type: image/png" --data-binary "@$TMPIMG")
    check "PUT anh truc tiep len MinIO -> 200" "$PUT_CODE" "200"

    CONFIRM=$(curl -s -X POST "$BASE/users/me/avatar/confirm" -H "$AUTH" \
        -H "Content-Type: application/json" -d "{\"objectName\":\"$OBJECT\"}")
    check_re "Xac nhan object da tai len" "$CONFIRM" '"avatarUrl":"/avatars/'

    # Object cua nguoi khac phai bi tu choi
    check "Xac nhan object cua nguoi khac -> 403" \
        "$(http_code -X POST "$BASE/users/me/avatar/confirm" -H "$AUTH" \
            -H 'Content-Type: application/json' \
            -d '{"objectName":"avatars/u-1002/avatar.png"}')" "403"

    # URL chi cho PUT, khong cho GET
    GET_CODE=$(http_code "$(printf '%s' "$UPLOAD_URL" | sed 's/?.*//')")
    log "  GET tren object URL -> $GET_CODE (PUT-only URL khong dung duoc cho GET: 403 la binh thuong)"

    rm -f "$TMPIMG"
else
    log "  [FAIL] Khong lay duoc uploadUrl."
    FAIL=$((FAIL + 1))
fi

# -----------------------------------------------------------------------------
head2 "7. Kiem tra cong KHONG bi lo ra ngoai"
# User Service (3001) va Order Service (3002) khong duoc publish
for port in 3001 3002 3003 8081; do
    CODE=$(curl -s -o /dev/null -m 3 -w '%{http_code}' "http://localhost:$port/health" 2>/dev/null)
    if [ "$CODE" = "000" ] || [ -z "$CODE" ]; then
        printf '  [PASS] Cong %-5s khong truy cap duoc tu host (dung thiet ke)\n' "$port"
        PASS=$((PASS + 1))
    else
        printf '  [FAIL] Cong %-5s VAN truy cap duoc (HTTP %s) — service dang bi lo ra ngoai!\n' "$port" "$CODE"
        FAIL=$((FAIL + 1))
    fi
done

# -----------------------------------------------------------------------------
head2 "TONG KET"
log "  PASS: $PASS"
log "  FAIL: $FAIL"
if [ "$FAIL" -eq 0 ]; then
    log "  => TAT CA KIEM THU DEU DAT."
    exit 0
else
    log "  => CO $FAIL KIEM THU THAT BAI."
    exit 1
fi
