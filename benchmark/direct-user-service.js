import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * BENCHMARK - GOI TRUC TIEP User Service (khong qua Gateway)
 *
 * Muc dich: do do tre "baseline" cua API khi client goi thang service,
 * de so sanh voi khi goi qua API Gateway (overhead cua gateway).
 *
 * CACH CHAY (tu thu muc goc du an):
 *   docker compose --profile bench run --rm k6 run /benchmark/direct-user-service.js
 *
 * GHI CHU VE DIEU KIEN TUONG DUONG:
 *   - Cung so VU, cung thoi luong, cung endpoint logic (doc du lieu).
 *   - Rate limit cua Gateway KHONG ap dung o kich ban nay, nen khi so
 *     sanh phai chay kich ban qua Gateway voi rate limit noi long.
 */

const BASE_URL = __ENV.TARGET_BASE_URL || 'http://user-service:3001';
const TOKEN = __ENV.JWT_TOKEN || '';
const PATH = '/users/me';

export const options = {
  scenarios: {
    users: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || '30s',
      gracefulStop: '5s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
  },
  discardResponseBodies: false,
  summaryTrendStats: ['avg', 'med', 'p(95)', 'p(99)', 'min', 'max'],
};

const params = {
  headers: {
    'Content-Type': 'application/json',
    ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
  },
  tags: { endpoint: 'direct-user-service' },
};

export default function () {
  const res = http.get(`${BASE_URL}${PATH}`, params);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(Number(__ENV.SLEEP || 0.1));
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, 'GOI TRUC TIEP User Service'),
    'benchmark-results/direct-user-service.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data, title) {
  const m = data.metrics;
  const req = m.http_reqs?.values ?? {};
  const dur = m.http_req_duration?.values ?? {};
  const failed = m.http_req_failed?.values ?? {};
  const rps = req.rate ?? 0;

  return [
    '',
    '='.repeat(78),
    `  ${title}`,
    '='.repeat(78),
    `  So request         : ${req.count ?? 0}`,
    `  Request/giay (RPS): ${rps.toFixed(2)}`,
    `  Do tre trung binh  : ${(dur.avg ?? 0).toFixed(3)} ms`,
    `  P50 (median)       : ${(dur.med ?? 0).toFixed(3)} ms`,
    `  P95                : ${(dur['p(95)'] ?? 0).toFixed(3)} ms`,
    `  P99                : ${(dur['p(99)'] ?? 0).toFixed(3)} ms`,
    `  Min / Max          : ${(dur.min ?? 0).toFixed(3)} / ${(dur.max ?? 0).toFixed(3)} ms`,
    `  Ty le loi          : ${((failed.passes ?? 0) * 100).toFixed(2)}%`,
    '='.repeat(78),
    '',
  ].join('\n');
}
