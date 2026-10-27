'use strict';

/**
 * Cấu hình tập trung cho User Service.
 * Mọi bí mật đều đến từ biến môi trường, không hard-code.
 */

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || value === '') {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${name}`);
  }
  return value;
}

const config = {
  port: Number(process.env.PORT ?? 3001),

  jwt: {
    secret: required('JWT_SECRET'),
    issuer: process.env.JWT_ISSUER ?? 'security-design',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '3600',
  },

  minio: {
    // Endpoint nội bộ: User Service gọi MinIO bằng địa chỉ trong mạng Docker.
    internalEndpoint: process.env.MINIO_INTERNAL_ENDPOINT ?? 'http://minio:9000',
    // Endpoint công khai: dùng để KÝ pre-signed URL mà client ngoài Docker truy cập được.
    publicEndpoint: process.env.MINIO_PUBLIC_ENDPOINT ?? 'http://localhost:9000',
    accessKey: required('MINIO_ROOT_USER', 'minioadmin'),
    secretKey: required('MINIO_ROOT_PASSWORD', 'minioadmin123'),
    bucket: process.env.MINIO_BUCKET ?? 'avatars',
    useSSL: (process.env.MINIO_USE_SSL ?? 'false') === 'true',
    // Thời hạn pre-signed URL (giây). Đề bài yêu cầu đúng 300 giây = 5 phút.
    presignExpiry: Number(process.env.MINIO_PRESIGN_EXPIRY ?? 300),
  },
};

module.exports = config;
