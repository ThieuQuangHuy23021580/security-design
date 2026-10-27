'use strict';

/**
 * Cấu hình tập trung cho Order Service.
 */

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === null || value === '') {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${name}`);
  }
  return value;
}

const config = {
  port: Number(process.env.PORT ?? 3002),

  jwt: {
    secret: required('JWT_SECRET'),
    issuer: process.env.JWT_ISSUER ?? 'security-design',
    expiresIn: Number(process.env.JWT_EXPIRES_IN ?? 3600),
  },
};

module.exports = config;
