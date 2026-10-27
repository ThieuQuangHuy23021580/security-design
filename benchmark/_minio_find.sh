#!/bin/bash
# Tim image MinIO community con dung duoc.
for img in \
  "ghcr.io/minio/minio:latest" \
  "quay.io/minio/minio:RELEASE.2023-12-20T01-00-02Z" \
  "docker.io/minio/minio:RELEASE.2023-12-20T01-00-02Z" \
  "docker.io/minio/minio:RELEASE.2024-12-18T13-15-44Z" \
  "docker.io/bitnami/minio:2024.6.13" \
  "docker.io/chainguard/minio:latest" \
  "docker.io/cleanstart/minio:latest"
do
  echo "===== $img"
  timeout 200 docker pull "$img" 2>&1 | tail -2
done
echo "===== KET QUA"
docker images --format '{{.Repository}}:{{.Tag}}' | grep -i minio
