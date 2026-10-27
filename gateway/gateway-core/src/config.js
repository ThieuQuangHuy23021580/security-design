'use strict';

/**
 * Cấu hình Gateway Core.
 */

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || value === '') {
    throw new Error(`Thieu bien moi truong bat buoc: ${name}`);
  }
  return value;
}

const config = {
  port: Number(process.env.PORT ?? 3003),

  jwt: {
    secret: required('JWT_SECRET'),
    issuer: process.env.JWT_ISSUER ?? 'security-design',
    expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 3600),
  },

  // Token nội bộ dùng để Gateway gọi API /internal/* của các service.
  internalToken: required('INTERNAL_API_TOKEN', 'dev-internal-token'),

  // Địa chỉ nội bộ của các service trong mạng Docker.
  services: {
    user: process.env.USER_SERVICE_URL ?? 'http://user-service:3001',
    order: process.env.ORDER_SERVICE_URL ?? 'http://order-service:3002',
  },

  // Thời gian tối đa chờ 1 service trả lời (ms) khi tổng hợp /dashboard.
  timeoutMs: Number(process.env.GATEWAY_TIMEOUT_MS ?? 3000),
};

module.exports = config;
