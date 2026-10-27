'use strict';

/**
 * Dữ liệu mẫu (JSON thay cho database) cho User Service.
 * Mô phỏng bảng `users` với các trường cần dùng cho nghiệp vụ.
 */

const users = [
  {
    id: 'u-1001',
    username: 'alice',
    email: 'alice@example.com',
    fullName: 'Nguyễn Thị Alice',
    role: 'customer',
    avatarUrl: null,
    createdAt: '2026-01-05T08:00:00.000Z',
  },
  {
    id: 'u-1002',
    username: 'bob',
    email: 'bob@example.com',
    fullName: 'Trần Văn Bob',
    role: 'customer',
    avatarUrl: null,
    createdAt: '2026-01-07T09:30:00.000Z',
  },
  {
    id: 'u-1003',
    username: 'admin',
    email: 'admin@example.com',
    fullName: 'Lê Quản Trị',
    role: 'admin',
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

module.exports = { users };
