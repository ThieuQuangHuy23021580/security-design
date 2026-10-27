'use strict';

/**
 * Tai khoan mau cho API /auth/login.
 * Du lieu JSON thay cho database (theo yeu cau de bai).
 * Mat khau duoc luu o dang ban ro cho muc dich demo hoc tap.
 */

const accounts = [
  { username: 'alice', password: 'alice123', userId: 'u-1001', role: 'customer' },
  { username: 'bob', password: 'bob123', userId: 'u-1002', role: 'customer' },
  { username: 'admin', password: 'admin123', userId: 'u-1003', role: 'admin' },
];

function findAccount(username, password) {
  return accounts.find(
    (a) => a.username === username && a.password === password,
  );
}

module.exports = { accounts, findAccount };
