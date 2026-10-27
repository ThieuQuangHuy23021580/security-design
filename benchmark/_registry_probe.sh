#!/bin/bash
# Kiem tra minio/minio tren Docker Hub qua registry API (co token).
LOG=/mnt/d/sd-workspace/.logs
mkdir -p "$LOG"
exec > >(tee -a "$LOG/registry.log") 2>&1

echo "=== token"
TOK=$(curl -s -m 25 "https://auth.docker.io/token?service=registry.docker.io&scope=repository:minio/minio:pull" \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "token_len=${#TOK}"

echo "=== tags/list"
curl -s -m 25 -H "Authorization: Bearer $TOK" \
  https://registry-1.docker.io/v2/minio/minio/tags/list | head -c 1200
echo

echo "=== quay token"
QTOK=$(curl -s -m 25 "https://quay.io/v2/auth?service=quay.io&scope=repository:minio/minio:pull" \
  | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "quay_token_len=${#QTOK}"
echo "=== quay tags"
curl -s -m 25 -H "Authorization: Bearer $QTOK" \
  https://quay.io/v2/minio/minio/tags/list | head -c 800
echo
echo "=== DONE"
