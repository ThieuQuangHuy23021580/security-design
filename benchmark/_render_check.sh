#!/bin/bash
# Render nginx.conf.template bang envsubst (giong y chang moi truong trong container)
# roi chay `nginx -t` de kiem tra cu phap, va hien thi dong 170-180.
LOG=/mnt/d/sd-workspace/.logs
mkdir -p "$LOG"
cd /mnt/d/sd-workspace || exit 1

export GATEWAY_PORT=8080
export RATE_LIMIT_RATE=10r/s
export RATE_LIMIT_BURST=10
export JWT_SECRET=doi-secret-nay-truoc-khi-nop-bai-va-phai-du-dai-32-ky-tu
export USER_SERVICE_HOST=user-service
export USER_SERVICE_PORT=3001
export ORDER_SERVICE_HOST=order-service
export ORDER_SERVICE_PORT=3002
export GATEWAY_CORE_HOST=gateway-core
export GATEWAY_CORE_PORT=3003

export NGINX_ENVSUBST_FILTER='^(GATEWAY_PORT|RATE_LIMIT_RATE|RATE_LIMIT_BURST|JWT_SECRET|USER_SERVICE_HOST|USER_SERVICE_PORT|ORDER_SERVICE_HOST|ORDER_SERVICE_PORT|GATEWAY_CORE_HOST|GATEWAY_CORE_PORT)$'

envsubst "$NGINX_ENVSUBST_FILTER" < gateway/templates/nginx.conf.template > "$LOG/nginx.rendered.conf"

echo "=== DONG 168-182 (da render)"
nl -ba "$LOG/nginx.rendered.conf" | sed -n '168,182p'
echo "=== KIEM TRA CACHE"
grep -n 'proxy_cache\|limit_req off\|auth_jwt off' "$LOG/nginx.rendered.conf"
echo "=== NGINX -T (trong container)"
docker compose run --rm --no-deps --entrypoint sh gateway -c 'nginx -t 2>&1' | tail -10
