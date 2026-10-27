'use strict';

const config = require('../config');

/**
 * Lop aggregation cua Gateway.
 *
 * NGUYEN TAC:
 *  - Gateway CHI lam viec tong hop (fan-out + fan-in), KHONG chua nghiep vu
 *    cua User Service hay Order Service.
 *  - Hai service duoc goi SONG SONG (Promise.allSettled) de giam do tre.
 *  - Neu MOT service that bai, Gateway tra loi 502/503 thay vi tra du lieu sai.
 *  - Dung lieu khong hop le (thieu truong, sai kieu) bi phat hien va bao loi.
 */

/**
 * Goi mot noi bo service bang header x-internal-token.
 * Dung fetch native (Node 18+) de kiem soat timeout.
 */
async function callInternal(baseUrl, path, { timeoutMs } = {}) {
  const controller = new AbortController();
  const limit = timeoutMs ?? config.timeoutMs;
  const timer = setTimeout(() => controller.abort(), limit);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      headers: {
        'x-internal-token': config.internalToken,
        accept: 'application/json',
      },
      signal: controller.signal,
    });

    const text = await response.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      const err = new Error(
        `Phan hoi khong phai JSON hop le tu ${path} (HTTP ${response.status}).`,
      );
      err.kind = 'invalid_data';
      throw err;
    }

    if (!response.ok) {
      const err = new Error(
        body?.message ?? `Service ${path} tra ve HTTP ${response.status}.`,
      );
      err.kind = 'service_error';
      err.status = response.status;
      throw err;
    }

    return body;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(
        `Service ${path} khong phan hoi trong ${limit}ms.`,
      );
      timeoutErr.kind = 'timeout';
      throw timeoutErr;
    }
    if (!err.kind) {
      err.kind = 'unreachable';
      err.message = `Khong ket noi duoc service ${path}: ${err.message}`;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Kiem tra payload tu User Service co dung cau truc khong. */
function validateUserPayload(body) {
  if (!body || typeof body !== 'object') return false;
  const user = body.user;
  if (!user || typeof user !== 'object') return false;
  if (typeof user.id !== 'string' || !user.id) return false;
  if (typeof user.username !== 'string') return false;
  return true;
}

/** Kiem tra payload tu Order Service co dung cau truc khong. */
function validateOrdersPayload(body) {
  if (!body || typeof body !== 'object') return false;
  if (!Array.isArray(body.orders)) return false;
  return body.orders.every(
    (o) =>
      o && typeof o === 'object' &&
      typeof o.id === 'string' && typeof o.userId === 'string',
  );
}

/**
 * Tong hop du lieu dashboard cho mot nguoi dung.
 * userId lay tu JWT da xac thuc (req.user.sub), KHONG tin tuong id client gui len.
 */
async function buildDashboard(userId) {
  const [userResult, orderResult] = await Promise.allSettled([
    callInternal(config.services.user, `/internal/users/${encodeURIComponent(userId)}`),
    callInternal(config.services.order, `/internal/orders?userId=${encodeURIComponent(userId)}`),
  ]);

  const errors = [];

  if (userResult.status === 'rejected') {
    errors.push({ service: 'user-service', ...describeError(userResult.reason) });
  } else if (!validateUserPayload(userResult.value)) {
    errors.push({
      service: 'user-service',
      kind: 'invalid_data',
      message: 'Du lieu nguoi dung nhan duoc khong dung cau truc mong doi.',
    });
  }

  if (orderResult.status === 'rejected') {
    errors.push({ service: 'order-service', ...describeError(orderResult.reason) });
  } else if (!validateOrdersPayload(orderResult.value)) {
    errors.push({
      service: 'order-service',
      kind: 'invalid_data',
      message: 'Du lieu don hang nhan duoc khong dung cau truc mong doi.',
    });
  }

  // Service nao that bai -> Gateway khong the tra dashboard hoan chinh.
  if (errors.length > 0) {
    const err = new Error('Khong the tai du lieu dashboard tu cac service phia sau.');
    err.kind = 'aggregation_failed';
    err.details = errors;
    // 503 neu service khong phan hoi, 502 neu service tra du lieu sai.
    const hasConnectivity = errors.some(
      (e) => e.kind === 'unreachable' || e.kind === 'timeout',
    );
    err.httpStatus = hasConnectivity ? 503 : 502;
    throw err;
  }

  const user = userResult.value.user;
  const { orders, summary } = orderResult.value;

  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    },
    orders,
    orderSummary: summary ?? {
      orderCount: orders.length,
      totalAmount: orders.reduce((sum, o) => sum + (o.total ?? 0), 0),
      currency: 'VND',
      statuses: {},
    },
    generatedAt: new Date().toISOString(),
  };
}

function describeError(err) {
  return {
    kind: err.kind ?? 'unknown',
    message: err.message ?? 'Loi khong xac dinh.',
  };
}

module.exports = {
  buildDashboard,
  callInternal,
  validateUserPayload,
  validateOrdersPayload,
};
