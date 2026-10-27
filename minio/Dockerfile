# ==============================================================================
# MinIO — image nen cho kho luu anh dai dien.
#
# LY DO DUNG FILE NAY THAY VI `image: minio/minio:latest`:
#   MinIO da go bo Docker Hub repo `minio/minio` (tra ve
#   "pull access denied for minio/minio"), va dl.min.io/server/... tra ve 410 Gone.
#   Ban binary o dl.min.io/aistor/... la AIStor Enterprise, doi hoi license
#   nen khong dung duoc cho bai tap.
#
#   `chainguard/minio` la MinIO Community (AGPLv3) va van hoat dong binh thuong.
#
# LUU Y: bucket `avatars` KHONG tao o day. User Service tu tao bucket khi
# khoi dong (xem user-service/src/services/minio.service.js -> ensureBucket),
# nho vay khong can them MinIO Client (mc) vao image.
# ==============================================================================
FROM chainguard/minio:latest

ENV MINIO_ROOT_USER=minioadmin \
    MINIO_ROOT_PASSWORD=minioadmin123

EXPOSE 9000 9001

# ENTRYPOINT la binary minio; CMD la tham so mac dinh.
ENTRYPOINT ["/usr/bin/minio"]
CMD ["server", "/data", "--console-address", ":9001"]
