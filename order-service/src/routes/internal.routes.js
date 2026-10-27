'use strict';

const express = require('express');
const { orders } = require('../data/orders');
const { requireInternalToken } = require('../middleware/auth');
const { summarize } = require('./orders.routes');

/**
 * Router API nội bộ — CHỈ Gateway được gọi.
 *
 * Dùng cho cơ chế Gateway Aggregation: Gateway gọi endpoint này để lấy
 * danh sách đơn hàng tương ứng với người dùng đang đăng nhập.
 *
 * Bảo vệ bằng header `x-internal-token` (so sánh chính xác, fail-closed).
 */
const router = express.Router();

/** Chuẩn hóa lỗi thành JSON thống nhất. */
function fail(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: code, message, ...extra });
}

/**
 * GET /internal/orders?userId=... — danh sách đơn hàng của một người dùng.
 *
 * Trả về kèm trường `valid` để Gateway biết dữ liệu có dùng được hay không
 * (phục vụ kiểm tra dữ liệu không hợp lệ ở tầng aggregation).
 */
router.get('/', requireInternalToken, (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return fail(res, 400, 'missing_user_id', 'Thiếu tham số userId.');
  }
  const list = orders
    .filter((o) => o.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({
    orders: list,
    summary: summarize(list),
    valid: Array.isArray(list),
  });
});

module.exports = { router };
