'use strict';

/**
 * Dữ liệu mẫu (JSON thay cho database) cho Order Service.
 * Mô phỏng bảng `orders` liên kết với `users` qua trường userId.
 */

const orders = [
  {
    id: 'o-5001',
    userId: 'u-1001',
    items: [
      { sku: 'SKU-CHAIR-01', name: 'Ghế văn phòng', quantity: 1, price: 1290000 },
      { sku: 'SKU-DESK-02', name: 'Bàn làm việc', quantity: 1, price: 2450000 },
    ],
    total: 3740000,
    currency: 'VND',
    status: 'completed',
    createdAt: '2026-02-11T02:15:00.000Z',
  },
  {
    id: 'o-5002',
    userId: 'u-1001',
    items: [
      { sku: 'SKU-LAMP-07', name: 'Đèn bàn học', quantity: 2, price: 320000 },
    ],
    total: 640000,
    currency: 'VND',
    status: 'shipped',
    createdAt: '2026-03-02T07:40:00.000Z',
  },
  {
    id: 'o-5003',
    userId: 'u-1001',
    items: [
      { sku: 'SKU-MONITOR-09', name: 'Màn hình 24 inch', quantity: 1, price: 3990000 },
    ],
    total: 3990000,
    currency: 'VND',
    status: 'pending',
    createdAt: '2026-03-15T13:05:00.000Z',
  },
  {
    id: 'o-5004',
    userId: 'u-1002',
    items: [
      { sku: 'SKU-CHAIR-01', name: 'Ghế văn phòng', quantity: 1, price: 1290000 },
    ],
    total: 1290000,
    currency: 'VND',
    status: 'completed',
    createdAt: '2026-02-20T10:00:00.000Z',
  },
  {
    id: 'o-5005',
    userId: 'u-1003',
    items: [
      { sku: 'SKU-DESK-02', name: 'Bàn làm việc', quantity: 3, price: 2450000 },
    ],
    total: 7350000,
    currency: 'VND',
    status: 'processing',
    createdAt: '2026-03-18T04:25:00.000Z',
  },
];

module.exports = { orders };
