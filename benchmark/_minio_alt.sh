#!/bin/bash
# Thu cac image MinIO community con dung duoc.
for img in \
  "bitnami/minio:latest" \
  "bitnami/minio:2024.12.18" \
  "rook/minio:latest" \
  "vulhub/minio:latest"
do
  echo "===== PULL $img"
  timeout 300 docker pull "$img" 2>&1 | tail -3
done
echo "===== IMAGES"
docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep -i minio
