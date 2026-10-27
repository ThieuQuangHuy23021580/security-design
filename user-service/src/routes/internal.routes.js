'use strict';

const express = require('express');
const { users } = require('../data/users');
const { requireInternalToken } = require('../middleware/auth');

/**
 * Router API nội bộ — CHỈ Gateway được gọi.
 *
 * Dùng cho cơ chế Gateway Aggregation: Gateway gọi endpoint này để lấy
 * thông tin người dùng rồi tổng hợp với dữ liệu đơn hàng từ Order Service.
 *
 * Bảo vệ bằng header `x-internal-token` (so sánh chính xác, fail-closed).
 */
const router = express.Router();

/** Chuẩn hóa lỗi thành JSON thống nhất. */
function fail(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: code, message, ...extra });
}

/**
 * GET /internal/users/:id — thông tin một người dùng.
 */
router.get('/:id', requireInternalToken, (req, res) => {
  const user = users.find((u) => u.id === req.params.id);
  if (!user) return fail(res, 404, 'user_not_found', 'Không tìm thấy người dùng.');
  return res.json({ user });
});

/**
 * GET /internal/users — danh sách người dùng (dữ liệu mẫu).
 */
router.get('/', requireInternalToken, (req, res) => {
  return res.json({ users, count: users.length });
});

module.exports = { router };
