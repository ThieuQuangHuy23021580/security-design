'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware xác thực JWT dùng cho các API nội bộ của service.
 *
 * Lưu ý kiến trúc: trong hệ thống này Nginx (API Gateway) là nơi xác thực
 * token cho các route public. Các route nội bộ (ví dụ /internal/users/:id)
 * được bảo vệ bằng header `x-internal-token` để chỉ Gateway mới gọi được.
 *
 * JWT vẫn được kiểm tra chữ ký đầy đủ (verify + issuer + expiry),
 * không dùng decode không xác thực.
 */

function extractToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
}

/** Xác thực JWT từ header Authorization: Bearer <token>. */
function requireJwt(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Thiếu token Bearer trong header Authorization.',
    });
  }
  try {
    const payload = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      algorithms: ['HS256'],
    });
    req.user = payload;
    return next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token đã hết hạn.'
        : 'Token không hợp lệ.';
    return res.status(401).json({ error: 'unauthorized', message });
  }
}

/**
 * Middleware nội bộ: chỉ Gateway mới được gọi trực tiếp vào service.
 * Gateway gửi kèm header `x-internal-token` lấy từ biến môi trường.
 */
function requireInternalToken(req, res, next) {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) {
    // Không cấu hình thì không mở đường vào nội bộ (fail-closed).
    return res.status(503).json({
      error: 'internal_api_disabled',
      message: 'User Service chưa được cấu hình token nội bộ.',
    });
  }
  const provided = req.headers['x-internal-token'];
  if (provided !== expected) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Không có quyền truy cập API nội bộ.',
    });
  }
  return next();
}

module.exports = { requireJwt, requireInternalToken, extractToken };
