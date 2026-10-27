#!/bin/bash
# Kiem tra chainguard/minio va cleanstart/minio co phai MinIO that khong.
for img in "chainguard/minio:latest" "cleanstart/minio:latest"; do
  echo "========== $img"
  echo "--- entrypoint / cmd"
  docker inspect "$img" --format 'Entrypoint={{.Config.Entrypoint}} Cmd={{.Config.Cmd}} User={{.Config.User}}'
  echo "--- env (rut gon)"
  docker inspect "$img" --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -iE 'minio|version' | head -8
  echo "--- version"
  docker run --rm --entrypoint sh "$img" -c 'minio --version 2>&1 | head -3' 2>&1 | head -5
done
