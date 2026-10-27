import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * BENCHMARK - GOI QUA API GATEWAY (co xac thuc JWT)
 *
 * Muc dich: do do tre cua cung API khi di qua Gateway, de so sanh voi
 * kich ban goi truc tiep User Service (direct-user-service.js).
 *
 * CACH CHAY (tu thu muc goc du an):
 *   docker compose --profile bench run --rm k6 run /benchmark/via-gateway.js
 *
 * VE RATE LIMIT (quan trong):
 *   Yeu cau E: "khong de rate limit lam sai lech do overhead co ban".
 *   => Kich ban nay goi cong BENCH (8081) cua Gateway, noi rate limit duoc
 *      dat rat cao (10000r/s) va xac thuc JWT van duoc bat nhu route chinh.
 *   => Cong cong chinh (8080) van giu nguyen rate limit 10r/s de demo
 *      va kiem thu, KHONG dung de do benchmark.
 *
 *   Do do cung dua giua 2 kich ban:
 *     - Cung so VU, cung thoi luong, cung thu tuyen.
 *     - Cung xac thuc JWT tren ca 2 duong dan.
 */

const BASE_URL = __ENV.TARGET_BASE_URL || 'http://gateway:8081';
const TOKEN = __ENV.JWT_TOKEN || '';
const PATH = '/bench/gateway/users/me';

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
  tags: { endpoint: 'via-gateway' },
};

export default function () {
  const res = http.get(`${BASE_URL}${PATH}`, params);
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(Number(__ENV.SLEEP || 0.1));
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, 'GOI QUA API GATEWAY'),
    'benchmark-results/via-gateway.json': JSON.stringify(data, null, 2),
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
