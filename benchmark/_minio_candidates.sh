#!/bin/bash
# Thu pull cac image MinIO thay the (minio/minio da bi go khoi Docker Hub).
LOG=/mnt/d/sd-workspace/.logs
mkdir -p "$LOG"
exec > >(tee -a "$LOG/minio_candidates.log") 2>&1

for img in \
  "alpine/minio:latest" \
  "bitnamicharts/minio:latest" \
  "quay.io/minio/minio:latest" \
  "quay.io/minio/minio:RELEASE.2024-01-16T16-07-38Z" \
  "minio/minio:latest"
do
  echo "===== PULL $img"
  timeout 300 docker pull "$img" 2>&1 | tail -3
done

echo "===== FINAL IMAGES"
docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep -i minio
echo "===== DONE"
