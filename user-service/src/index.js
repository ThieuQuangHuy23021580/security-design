'use strict';

const express = require('express');
const config = require('./config');
const { router: usersRouter, ensureBucket } = require('./routes/users.routes');
const { router: internalRouter } = require('./routes/internal.routes');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    service: 'user-service',
    status: 'ok',
    time: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// API công khai — mount đúng prefix để khớp với route của Gateway
// (/users -> User Service, /orders -> Order Service).
// ---------------------------------------------------------------------------
app.use('/users', usersRouter);

// ---------------------------------------------------------------------------
// API nội bộ — chỉ Gateway được gọi (dùng cho aggregation).
// ---------------------------------------------------------------------------
app.use('/internal/users', internalRouter);

// ---------------------------------------------------------------------------
// 404 + error handler
// ---------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: `Không tìm thấy endpoint ${req.method} ${req.originalUrl}.`,
  });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[user-service] error:', err);
  res.status(500).json({ error: 'internal_error', message: 'Lỗi không mong muốn.' });
});

async function start() {
  try {
    await ensureBucket();
    console.log(`[user-service] Bucket "${config.minio.bucket}" đã sẵn sàng.`);
  } catch (err) {
    // Không làm service sập nếu MinIO chưa sẵn sàng — request sau sẽ thử lại.
    console.warn('[user-service] Chưa kết nối được MinIO:', err.message);
  }
  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[user-service] Đang lắng nghe tại http://0.0.0.0:${config.port}`);
  });
}

if (require.main === module) start();

module.exports = app;
