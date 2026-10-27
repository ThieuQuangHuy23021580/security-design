#!/bin/bash
# Kiem tra suc khoe WSL + disk + thu pull minio (docker hub + quay fallback).
LOG=/mnt/d/sd-workspace/.logs
mkdir -p "$LOG"
echo "=== DISK" | tee -a "$LOG/hc.log"
df -h / /var/lib/docker 2>&1 | tail -3 | tee -a "$LOG/hc.log"
echo "=== DOCKER" | tee -a "$LOG/hc.log"
docker info --format '{{.ServerVersion}} storage={{.Driver}}' 2>&1 | tee -a "$LOG/hc.log"
echo "=== IMAGES" | tee -a "$LOG/hc.log"
docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}' 2>&1 | tee -a "$LOG/hc.log"
echo "=== PULL minio (docker hub)" | tee -a "$LOG/hc.log"
timeout 300 docker pull minio/minio:RELEASE.2024-06-13T22-53-53Z 2>&1 | tail -4 | tee -a "$LOG/hc.log"
echo "=== PULL minio (quay)" | tee -a "$LOG/hc.log"
timeout 300 docker pull quay.io/minio/minio:latest 2>&1 | tail -4 | tee -a "$LOG/hc.log"
echo "=== PULL k6" | tee -a "$LOG/hc.log"
timeout 300 docker pull grafana/k6:latest 2>&1 | tail -4 | tee -a "$LOG/hc.log"
echo "=== DONE" | tee -a "$LOG/hc.log"
