# ==============================================================================
# MinIO - build tu binary chinh thuc cua MinIO.
#
# LY DO DUNG FILE NAY THAY VI `image: minio/minio:latest`:
#   MinIO da go bo Docker Hub repo `minio/minio` (tra ve
#   "pull access denied for minio/minio"), va duong dan cu
#   dl.min.io/server/minio/... cung tra ve 410 Gone.
#   Binary chinh thuc bay gio nam o dl.min.io/aistor/minio/release/...
#   File nay tai binary do va bo sung `mc` (client) de tao bucket.
#
# Build:
#   docker compose build minio
# ==============================================================================
FROM alpine:3.20

ARG MINIO_DOWNLOAD_URL=https://dl.min.io/aistor/minio/release/linux-amd64/minio
ARG MC_DOWNLOAD_URL=https://dl.min.io/aistor/mc/release/linux-amd64/mc

RUN apk add --no-cache ca-certificates curl \
    && mkdir -p /data \
    && curl -fsSL "$MINIO_DOWNLOAD_URL" -o /usr/local/bin/minio \
    && chmod +x /usr/local/bin/minio \
    && curl -fsSL "$MC_DOWNLOAD_URL" -o /usr/local/bin/mc \
    && chmod +x /usr/local/bin/mc \
    && rm -rf /var/cache/apk/*

EXPOSE 9000 9001

# ENTRYPOINT la binary minio; CMD la tham so mac dinh.
# => container chay: `minio server /data --console-address ":9001"`
# Container minio-init (xem docker-compose.yml) override entrypoint thanh `mc`.
ENTRYPOINT ["/usr/local/bin/minio"]
CMD ["server", "/data", "--console-address", ":9001"]
