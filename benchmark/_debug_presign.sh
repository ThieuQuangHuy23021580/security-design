#!/bin/bash
# Debug endpoint pre-signed URL.
BASE=http://localhost:8080

TOK=$(curl -s -X POST "$BASE/auth/login" -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"alice123"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "TOKEN_LEN=${#TOK}"

echo "=== PRESIGN RESPONSE ==="
curl -s -i -X POST "$BASE/users/me/avatar/presign" \
  -H "Authorization: Bearer $TOK" \
  -H 'Content-Type: application/json' \
  -d '{"contentType":"image/png"}'
echo

echo "=== USER SERVICE LOGS (20 dong cuoi) ==="
docker compose logs user-service 2>&1 | tail -20

echo "=== MINIO HEALTH ==="
curl -s -o /dev/null -w 'minio_live=%{http_code}\n' http://localhost:9000/minio/health/live

echo "=== BUCKET LIST (qua mc trong container minio) ==="
docker compose exec -T minio sh -c \
  'mc alias set local http://127.0.0.1:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD" >/dev/null 2>&1; mc ls local' 2>&1
