'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware xác thực JWT + token nội bộ cho Order Service.
 *
 * - `requireJwt`: kiểm tra chữ ký JWT đầy đủ (verify + issuer + expiry).
 * - `requireInternalToken`: chỉ Gateway được gọi trực tiếp vào service,
 *   qua header `x-internal-token`.
 */

function extractToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
}

function requireJwt(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Thiếu token Bearer trong header Authorization.',
    });
  }
  try {
    req.user = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      algorithms: ['HS256'],
    });
    return next();
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError'
        ? 'Token đã hết hạn.'
        : 'Token không hợp lệ.';
    return res.status(401).json({ error: 'unauthorized', message });
  }
}

function requireInternalToken(req, res, next) {
  const expected = process.env.INTERNAL_API_TOKEN;
  if (!expected) {
    return res.status(503).json({
      error: 'internal_api_disabled',
      message: 'Order Service chưa được cấu hình token nội bộ.',
    });
  }
  if (req.headers['x-internal-token'] !== expected) {
    return res.status(403).json({
      error: 'forbidden',
      message: 'Không có quyền truy cập API nội bộ.',
    });
  }
  return next();
}

module.exports = { requireJwt, requireInternalToken };
