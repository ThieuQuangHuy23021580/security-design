'use strict';

const express = require('express');
const config = require('./config');
const { router: ordersRouter } = require('./routes/orders.routes');
const { router: internalRouter } = require('./routes/internal.routes');

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '256kb' }));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => {
  res.json({
    service: 'order-service',
    status: 'ok',
    time: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// API công khai — mount đúng prefix để khớp với route của Gateway
// (/orders -> Order Service).
// ---------------------------------------------------------------------------
app.use('/orders', ordersRouter);

// ---------------------------------------------------------------------------
// API nội bộ — chỉ Gateway được gọi (dùng cho aggregation).
// ---------------------------------------------------------------------------
app.use('/internal/orders', internalRouter);

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
  console.error('[order-service] error:', err);
  res.status(500).json({ error: 'internal_error', message: 'Lỗi không mong muốn.' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`[order-service] Đang lắng nghe tại http://0.0.0.0:${config.port}`);
});

module.exports = app;
