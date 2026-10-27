'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('./config');
const { findAccount } = require('./data/accounts');
const { verifyToken, propagateIdentity } = require('./middleware/auth');
const { buildDashboard } = require('./services/aggregation.service');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

function fail(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: code, message, ...extra });
}

// ---------------------------------------------------------------
// Health check
// ---------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({ service: 'gateway-core', status: 'ok', time: new Date().toISOString() });
});

// ---------------------------------------------------------------
// Auth: cap JWT cho client
// ---------------------------------------------------------------

/**
 * POST /auth/login — xac thuc tai khoan mau va cap JWT.
 * Client gui header Authorization: Bearer <token> cho cac API duoc bao ve.
 */
app.post('/auth/login', (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return fail(res, 400, 'missing_credentials',
      'Can gui username va password.');
  }
  const account = findAccount(String(username), String(password));
  if (!account) {
    return fail(res, 401, 'invalid_credentials',
      'Username hoac password khong dung.');
  }
  const token = jwt.sign(
    {
      sub: account.userId,
      username: account.username,
      role: account.role,
    },
    config.jwt.secret,
    {
      algorithm: 'HS256',
      issuer: config.jwt.issuer,
      expiresIn: config.jwt.expiresIn,
    },
  );
  return res.json({
    token,
    tokenType: 'Bearer',
    expiresIn: Number(config.jwt.expiresIn),
    user: {
      id: account.userId,
      username: account.username,
      role: account.role,
    },
  });
});

/**
 * POST /auth/verify — kiem tra chu ky JWT (dung cho client/kiem thu).
 */
app.get('/auth/verify', verifyToken, (req, res) => {
  return res.json({
    valid: true,
    user: {
      id: req.user.sub,
      username: req.user.username,
      role: req.user.role,
      expiresAt: req.user.exp ? new Date(req.user.exp * 1000).toISOString() : null,
    },
  });
});

// ---------------------------------------------------------------
// Aggregation: GET /dashboard
// ---------------------------------------------------------------

/**
 * GET /dashboard — goi SONG SONG User Service + Order Service roi tong hop.
 * Nguoi dung lay tu JWT da xac thuc; client khong the tu khai bao userId.
 */
app.get('/dashboard', verifyToken, async (req, res) => {
  const userId = req.user.sub;
  if (!userId) {
    return fail(res, 401, 'unauthorized',
      'Token khong chua dinh danh nguoi dung (sub).');
  }
  try {
    const dashboard = await buildDashboard(userId);
    return res.json(dashboard);
  } catch (err) {
    const status = err.httpStatus ?? 502;
    console.error('[gateway-core] aggregation failed:', err.message, err.details);
    return res.status(status).json({
      error: 'aggregation_failed',
      message: err.message,
      details: err.details ?? [],
    });
  }
});

// ---------------------------------------------------------------
// Proxy: chuyen tiep request da xac thuc xuong User/Order Service
// (Nginx dinh tuyen /users va /orders; cac route public o day chi
//  la fallback khi chay gateway-core doc lap)
// ---------------------------------------------------------------
app.use('/users', verifyToken, propagateIdentity, (req, res) => {
  return fail(res, 502, 'no_upstream',
    'Yeu cau /users phai duoc dinh tuyen qua Nginx API Gateway.');
});

app.use('/orders', verifyToken, propagateIdentity, (req, res) => {
  return fail(res, 502, 'no_upstream',
    'Yeu cau /orders phai duoc dinh tuyen qua Nginx API Gateway.');
});

// ---------------------------------------------------------------
// 404 + error handler
// ---------------------------------------------------------------
app.use((req, res) => {
  fail(res, 404, 'not_found', `Khong tim thay endpoint ${req.method} ${req.originalUrl}.`);
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[gateway-core] error:', err);
  fail(res, 500, 'internal_error', 'Loi khong mong doi.');
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`[gateway-core] Dang lang nghe tai http://0.0.0.0:${config.port}`);
});

module.exports = app;
