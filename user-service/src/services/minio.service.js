'use strict';

const { Client } = require('minio');
const config = require('../config');

/**
 * Client MinIO dùng để:
 *  1. Tạo pre-signed URL (PUT) cho client tải ảnh trực tiếp lên MinIO.
 *  2. Xác minh/đọc object sau khi client tải lên.
 *
 * Client MinIO chỉ tồn tại trong server (User Service) —
 * thông tin xác thực KHÔNG bao giờ gửi xuống client.
 */

/** Parse "http://host:port" thành { endPoint, port, useSSL }. */
function parseEndpoint(endpoint) {
  const url = new URL(endpoint);
  return {
    endPoint: url.hostname,
    port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
    useSSL: url.protocol === 'https:',
  };
}

// Client nội bộ: User Service dùng để quản lý bucket và đọc metadata object.
// Chạy trong mạng Docker nên dùng hostname "minio".
const internalOptions = {
  ...parseEndpoint(config.minio.internalEndpoint),
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
};
const internalClient = new Client(internalOptions);

// Client "public": chỉ dùng để KÝ pre-signed URL.
//
// LÝ do: MinIO ký chữ ký vào canonical request có chứa header Host.
// Nếu ký bằng hostname nội bộ ("minio") thì client trên máy host sẽ
// không gọi được (và chữ ký cũng không khớp khi đổi Host).
// Ký bằng endpoint công khai ("localhost:9000") để client ngoài Docker
// truy cập trực tiếp được MinIO qua cổng đã publish.
const publicOptions = {
  ...parseEndpoint(config.minio.publicEndpoint),
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
};
const publicClient = new Client(publicOptions);

/**
 * Tạo pre-signed URL cho phép PUT lên đúng một object.
 * Client upload trực tiếp lên MinIO, không đi qua Gateway/User Service.
 */
async function createPresignedPutUrl(objectName, expirySeconds) {
  return publicClient.presignedPutObject(
    config.minio.bucket,
    objectName,
    expirySeconds,
  );
}

/**
 * Đảm bảo bucket tồn tại (tạo nếu chưa có).
 */
async function ensureBucket() {
  const exists = await internalClient.bucketExists(config.minio.bucket);
  if (!exists) {
    await internalClient.makeBucket(config.minio.bucket);
  }
}

/**
 * Kiểm tra object đã tồn tại và trả về kích thước (bytes).
 */
async function statObject(objectName) {
  const stat = await internalClient.statObject(config.minio.bucket, objectName);
  return { size: stat.size, contentType: stat.metaData?.['content-type'] ?? null };
}

module.exports = {
  internalClient,
  createPresignedPutUrl,
  ensureBucket,
  statObject,
};
