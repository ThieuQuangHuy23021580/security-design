'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Middleware xac thuc JWT tai tang Gateway.
 *
 * QUAN TRONG: xac thuc bang `jwt.verify` (co kiem tra chu ky) chu khong
 * phai `jwt.decode`. Token het han, sai chu ky, sai issuer deu bi tu choi.
 *
 * Sau khi xac thuc thanh cong, Gateway gan cac header danh tinh nguoi dung
 * xuong phia duoi cho service (chi trong mang Docker noi bo).
 */

function extractToken(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (!token || scheme.toLowerCase() !== 'bearer') return null;
  return token.trim() || null;
}

/**
 * Kiem tra JWT. Neu thanh cong gan req.user = payload.
 */
function verifyToken(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Thieu token Bearer trong header Authorization.',
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
        ? 'Token da het han.'
        : 'Token khong hop le.';
    return res.status(401).json({ error: 'unauthorized', message });
  }
}

/**
 * Cap nhat header Authorization + danh tinh nguoi dung cho request xuong duoi.
 * Service phia duoi dung cac header nay de quyet dinh quyen
 * (vi du: chi chinh chu so huoc duoc doi avatar).
 */
function propagateIdentity(req, res, next) {
  const token = extractToken(req);
  if (token) req.headers.authorization = `Bearer ${token}`;
  if (req.user) {
    req.headers['x-user-id'] = String(req.user.sub);
    req.headers['x-user-name'] = String(req.user.username ?? req.user.name ?? '');
    req.headers['x-user-role'] = String(req.user.role ?? 'customer');
  }
  return next();
}

module.exports = { verifyToken, propagateIdentity, extractToken };
