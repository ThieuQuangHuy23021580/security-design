#!/bin/bash
# Thuo toi cac image Docker can cho du an va kiem tra pull.
set -x
for img in "minio/minio:RELEASE.2024-06-13T22-53-53Z" "minio/minio:RELEASE.2024-01-16T16-07-38Z" "minio/minio:latest" "grafana/k6:latest"; do
  echo "===== PULL $img"
  timeout 180 docker pull "$img" 2>&1 | tail -4
  echo "exit=$?"
done
echo "===== IMAGES"
docker images
