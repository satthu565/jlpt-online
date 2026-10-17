/* global __VU, __ITER */
/**
 * JLPT Online - k6 Multi-Scenario Stepped Load Test (SYS-10 / Task V06)
 *
 * Scenarios:
 *   1. Concurrent Exam Start & Section Initiation (bắt đầu đồng loạt)
 *   2. Periodic Answer Autosave with Lease (lưu phiếu đều đặn, SLA: p95 < 300ms)
 *   3. Deadline Concurrent Submission Spike (nộp đồng loạt lúc hết giờ, SLA: p95 < 1000ms, error < 0.1%)
 *   4. Immutable Snapshot & Media Streaming with HTTP Range 206
 *
 * Target vs Observed Capacity:
 *   - Target: 2000 concurrent candidates (V1 Goal) / 500 (small 4GB) / 2000 (large 8GB)
 *   - Observed: Measured live and recorded in docs/release/load-capacity-report.json
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Stage 1: Warmup & Catalog Browse
    { duration: '1m', target: 100 },  // Stage 2: Concurrent Start
    { duration: '1m', target: 200 },  // Stage 3: High-Frequency Answering
    { duration: '30s', target: 250 }, // Stage 4: Deadline Submission Spike
    { duration: '30s', target: 0 },   // Cooldown
  ],
  thresholds: {
    // Contract SLA thresholds
    'http_req_duration{scenario:save_answers}': ['p(95)<300'],
    'http_req_duration{scenario:submit_exam}': ['p(95)<1000'],
    'http_req_duration': ['p(95)<500'],
    'http_req_failed': ['rate<0.001'], // error < 0.1%
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:4000';
const MEDIA_TOKEN = __ENV.MEDIA_TOKEN || 'tok_media_streaming_demo';

export function setup() {
  const catalogRes = http.get(`${BASE_URL}/api/v1/exams`);
  let examId = 'demo-n5-1';
  if (catalogRes.status === 200) {
    try {
      const data = JSON.parse(catalogRes.body);
      const item = data.items?.find((x) => x.slug === 'demo-n5-1');
      if (item) examId = item.id;
    } catch {
      // ignore
    }
  }

  let mediaAssetId = '';
  const mediaSha = '25e6d7d051a1487de1e86e7dcb1817c5117727d0018780f3f0534982f8f4c884';
  const mediaRes = http.get(`${BASE_URL}/api/v1/media/by-sha/${mediaSha}`);
  if (mediaRes.status === 200) {
    try {
      const mData = JSON.parse(mediaRes.body);
      mediaAssetId = mData.id;
    } catch {
      // ignore
    }
  }

  return { examId, mediaAssetId };
}

let vuAttemptId = '';
let vuLease = '';
let vuGuestId = '';

export default function (data) {
  const vuId = __VU;
  const iteration = __ITER;
  const clientIp = `198.51.100.${(vuId % 50) + 1}`;
  const examId = data?.examId || 'demo-n5-1';
  const mediaAssetId = data?.mediaAssetId || '';
  if (!vuGuestId) {
    vuGuestId = `0192f000-0000-7000-8000-${String(vuId + 10).padStart(12, '0')}`;
  }

  const headers = {
    'Content-Type': 'application/json',
    'x-forwarded-for': clientIp,
    'cf-connecting-ip': clientIp,
    cookie: `__Host-guest=${vuGuestId}`,
    'user-agent': `JLPT-k6-Load-Agent/1.0 (VU ${vuId})`,
  };

  // Scenario 1: Healthcheck & Exam Start
  group('1. Health & Exam Initiation', () => {
    const healthRes = http.get(`${BASE_URL}/api/v1/health`, { headers });
    check(healthRes, {
      'health status is 200': (r) => r.status === 200,
    });

    const catalogRes = http.get(`${BASE_URL}/api/v1/exams`, { headers });
    check(catalogRes, {
      'exams catalog status is 200': (r) => r.status === 200,
    });

    // Initialize attempt if not yet created for this VU
    if (!vuAttemptId) {
      const initRes = http.post(
        `${BASE_URL}/api/v1/attempts`,
        JSON.stringify({
          examId,
          mode: 'real',
        }),
        {
          headers,
          tags: { scenario: 'start_attempt' },
        }
      );

      // Per Reviewer W3: strictly accept 201 for attempt initiation
      check(initRes, {
        'attempt initiated with 201': (r) => r.status === 201,
      });

      if (initRes.status === 201) {
        const body = JSON.parse(initRes.body);
        vuAttemptId = body.attemptId;
        vuLease = body.lease;

        // Immediately start Section 0 so sheet autosave is accepted
        const sectionRes = http.post(
          `${BASE_URL}/api/v1/attempts/${vuAttemptId}/sections/next`,
          JSON.stringify({ lease: vuLease }),
          {
            headers,
            tags: { scenario: 'start_section' },
          }
        );

        check(sectionRes, {
          'section started with 200': (r) => r.status === 200,
        });
      }
    }
  });

  sleep(0.5);

  // Scenario 2: Periodic Answer Autosave with Lease
  if (vuAttemptId) {
    group('2. Answering & Sheet Autosave', () => {
      const payload = JSON.stringify({
        lease: vuLease,
        seq: iteration + 1,
        answers: [1, 2, 3, 4, 1, 2, 3, 4],
        flags: [0, 0, 0, 0, 0, 0, 0, 0],
        changes: [{ i: iteration % 8, v: 2, at: Date.now() }],
      });

      const saveRes = http.put(
        `${BASE_URL}/api/v1/attempts/${vuAttemptId}/sheet`,
        payload,
        {
          headers,
          tags: { scenario: 'save_answers' },
        }
      );

      // Per Reviewer W3: strictly accept 200 (no 404/409 accepted)
      check(saveRes, {
        'save response is accepted with 200': (r) => r.status === 200,
      });
    });
  }

  sleep(0.5);

  // Scenario 3: Media Range 206 Streaming
  group('3. Audio Range 206 Streaming', () => {
    const rangeHeaders = {
      ...headers,
      Range: 'bytes=0-1023',
      'X-Media-Token': MEDIA_TOKEN,
    };

    const mediaEndpoint = mediaAssetId
      ? `${BASE_URL}/api/v1/media/${mediaAssetId}?t=${MEDIA_TOKEN}`
      : `${BASE_URL}/api/v1/health`;

    const mediaRes = http.get(mediaEndpoint, {
      headers: rangeHeaders,
      tags: { scenario: 'media_range' },
    });

    check(mediaRes, {
      'media request returned 206 Partial Content': (r) => r.status === 206,
    });
  });

  sleep(0.5);

  // Scenario 4: Submission Spike at Deadline
  if (iteration % 5 === 0 && vuAttemptId) {
    group('4. Deadline Submission Spike', () => {
      const submitPayload = JSON.stringify({
        lease: vuLease,
        seq: iteration + 2,
        answers: [1, 2, 3, 4, 1, 2, 3, 4],
        flags: [0, 0, 0, 0, 0, 0, 0, 0],
      });

      const submitRes = http.post(
        `${BASE_URL}/api/v1/attempts/${vuAttemptId}/submit`,
        submitPayload,
        {
          headers,
          tags: { scenario: 'submit_exam' },
        }
      );

      // Per Reviewer W3: strictly accept 200 (no 404/409 accepted)
      check(submitRes, {
        'submit response handled with 200': (r) => r.status === 200,
      });

      // Clear attempt so next cycle can create a fresh attempt
      vuAttemptId = '';
      vuLease = '';
    });
  }

  sleep(1);
}
