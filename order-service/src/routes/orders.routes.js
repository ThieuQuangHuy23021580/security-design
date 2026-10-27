'use strict';

const express = require('express');
const { orders } = require('../data/orders');
const { requireJwt } = require('../middleware/auth');

/**
 * Router cho API don hang.
 *
 * Router duoc mount tai `/orders`, khop voi route cua API Gateway
 * (Nginx dinh tuyen /orders -> Order Service).
 */
const router = express.Router();

/** Chuẩn hóa lỗi thành JSON thống nhất. */
function fail(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: code, message, ...extra });
}

/** Tổng hợp số liệu đơn hàng cho 1 danh sách. */
function summarize(list) {
  return {
    orderCount: list.length,
    totalAmount: list.reduce((sum, o) => sum + (o.total ?? 0), 0),
    currency: list[0]?.currency ?? 'VND',
    statuses: list.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

/**
 * GET /orders/me — danh sách đơn hàng của người dùng hiện tại.
 * userId lấy từ JWT đã xác thực, KHÔNG lấy từ query/body của client.
 */
router.get('/me', requireJwt, (req, res) => {
  const list = orders
    .filter((o) => o.userId === req.user.sub)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({ orders: list, summary: summarize(list) });
});

/**
 * GET /orders/:id — chi tiết một đơn hàng.
 * Chỉ chủ đơn hoặc admin được xem.
 */
router.get('/:id', requireJwt, (req, res) => {
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return fail(res, 404, 'order_not_found', 'Không tìm thấy đơn hàng.');

  const isOwner = order.userId === req.user.sub;
  const isAdmin = req.user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return fail(res, 403, 'forbidden', 'Bạn không có quyền xem đơn hàng này.');
  }
  return res.json({ order });
});

module.exports = { router, summarize };
