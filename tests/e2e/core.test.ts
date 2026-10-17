import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { assertNoAnswerLeak } from '@jlpt/schema';
import {
  getApiBaseUrl,
  stopApiServer,
  AUTH_TOKENS,
  generateTestTotp,
} from '../fixtures/test-server.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

interface ApiEnvelope<T = Record<string, unknown>> {
  status?: number;
  data?: T;
  error?: { code?: string; message?: string };
}

describe('Core Vertical Slice E2E: Demo Package flow (N06)', () => {
  let baseUrl: string;
  let demoExamId: string;
  let activeAttemptId: string;
  let activeLeaseToken: string;

  beforeAll(async () => {
    baseUrl = await getApiBaseUrl();
    const examsRes = await fetch(`${baseUrl}/api/v1/exams`);
    if (examsRes.ok) {
      const examsData = (await examsRes.json()) as { items?: Array<{ id: string; slug: string }> };
      const found = examsData.items?.find((x) => x.slug === 'demo-n5-1');
      if (found) {
        demoExamId = found.id;
      }
    }
  }, 60000);

  afterAll(() => {
    stopApiServer();
  });

  describe('1. Validate Phase: Import v2 Package Verification', () => {
    it('rejects standalone PDF or corrupt payloads with 400 Bad Request', async () => {
      const corruptPayload = {
        dataBase64: Buffer.from('NOT_A_ZIP_FILE_CORRUPT').toString('base64'),
        fileName: 'corrupt.zip',
      };

      const res = await fetch(`${baseUrl}/api/v1/admin/imports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.editor}`,
          'x-totp-code': generateTestTotp(),
        },
        body: JSON.stringify(corruptPayload),
      });

      expect(res.status).toBe(400);
      const json = (await res.json()) as ApiEnvelope;
      expect(json.error?.message || JSON.stringify(json)).toMatch(/ZIP|không hợp lệ/i);
    });

    it('uploads and validates demo-data/demo-n5-1.zip successfully', async () => {
      const zipPath = path.join(
        REPO_ROOT,
        'docs/multi-worker/demo-data/demo-n5-1.zip',
      );
      expect(fs.existsSync(zipPath)).toBe(true);

      const zipBuf = fs.readFileSync(zipPath);
      const payload = {
        dataBase64: zipBuf.toString('base64'),
        fileName: 'demo-n5-1.zip',
      };

      const res = await fetch(`${baseUrl}/api/v1/admin/imports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.editor}`,
          'x-totp-code': generateTestTotp(),
        },
        body: JSON.stringify(payload),
      });

      expect([200, 201]).toContain(res.status);
      const data = (await res.json()) as {
        id: string;
        status: string;
        packageId: string;
        examId?: string;
        totalQuestions?: number;
      };

      expect(data.packageId).toBe('6f1c2a10-5d3e-4b7a-9c21-0a0000000501');
      expect(['succeeded', 'ready', 'draft']).toContain(data.status);

      // Verify exam discovery
      const examsRes = await fetch(`${baseUrl}/api/v1/exams`);
      expect(examsRes.status).toBe(200);
      const examsData = (await examsRes.json()) as { items: Array<{ id: string; slug: string }> };
      let found = examsData.items.find((x) => x.slug === 'demo-n5-1');
      if (!found) {
        const singleRes = await fetch(`${baseUrl}/api/v1/exams/demo-n5-1`);
        if (singleRes.ok) {
          const singleData = (await singleRes.json()) as { id: string; slug: string };
          found = singleData;
        }
      }
      expect(found).toBeDefined();
      demoExamId = found!.id;
    });
  });

  describe('2. Review Phase: 4-Eyes Role Separation', () => {
    it('enforces 4-Eyes principle: prevents Editor from reviewing/approving own content', async () => {
      const decisionPayload = {
        decision: 'approved',
        comments: 'Self-approval attempt by editor',
      };

      // Editor attempts to submit review decision on exam_version
      const res = await fetch(
        `${baseUrl}/api/v1/admin/reviews/exam_version/${demoExamId}/v1/decision`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AUTH_TOKENS.editor}`,
            'x-totp-code': generateTestTotp(),
          },
          body: JSON.stringify(decisionPayload),
        },
      );

      // Must be rejected with 403 Forbidden due to editor == reviewer 4-eyes violation
      expect(res.status).toBe(403);
      const err = (await res.json()) as ApiEnvelope;
      expect(err.error?.message || JSON.stringify(err)).toMatch(
        /4-eyes|Người duyệt|người sửa|editor/i,
      );
    });

    it('allows independent Reviewer to review and approve questions', async () => {
      const decisionPayload = {
        decision: 'approved',
        comments: 'Phê duyệt nội dung đề thi bởi Reviewer độc lập (4-Eyes separation)',
      };

      const res = await fetch(
        `${baseUrl}/api/v1/admin/reviews/exam_version/${demoExamId}/v1/decision`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AUTH_TOKENS.reviewer}`,
            'x-totp-code': generateTestTotp(),
          },
          body: JSON.stringify(decisionPayload),
        },
      );

      expect([200, 201]).toContain(res.status);
      const data = (await res.json()) as { id: string; status: string };
      expect(data.status).toBe('approved');
    });
  });

  describe('3. Publish Phase: Immutable Snapshot & Zero Answer Leakage', () => {
    it('restricts publishing to Admin role only', async () => {
      const studentPublishRes = await fetch(
        `${baseUrl}/api/v1/admin/exams/${demoExamId}/publish`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
        },
      );
      if (studentPublishRes.status !== 403) {
        console.error('studentPublishRes error:', studentPublishRes.status, await studentPublishRes.text());
      }
      expect(studentPublishRes.status).toBe(403);

      const editorPublishRes = await fetch(
        `${baseUrl}/api/v1/admin/exams/${demoExamId}/publish`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${AUTH_TOKENS.editor}`,
            'x-totp-code': generateTestTotp(),
          },
        },
      );
      expect(editorPublishRes.status).toBe(403);
    });

    it('publishes exam version and guarantees strict zero answer leakage in public snapshot', async () => {
      const publishRes = await fetch(
        `${baseUrl}/api/v1/admin/exams/${demoExamId}/publish`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${AUTH_TOKENS.admin}`,
            'x-totp-code': generateTestTotp(),
          },
        },
      );
      // If already published in seed, 200/201 or idempotent success
      if (![200, 201].includes(publishRes.status)) {
        console.error('publishRes error:', publishRes.status, await publishRes.text());
      }
      expect([200, 201]).toContain(publishRes.status);
      const pubData = (await publishRes.json()) as { version: number; totalQuestions?: number };
      expect(pubData.version).toBeGreaterThanOrEqual(1);

      // Verify public exam metadata
      const publicRes = await fetch(`${baseUrl}/api/v1/exams/demo-n5-1`);
      expect(publicRes.status).toBe(200);
      const publicExam = (await publicRes.json()) as Record<string, unknown>;

      expect(publicExam.slug).toBe('demo-n5-1');
      expect(publicExam.level).toBe('N5');
      expect(publicExam.totalQuestions).toBe(29);

      // Strict contract zero-leak assertion
      expect(() => assertNoAnswerLeak(publicExam)).not.toThrow();
      expect(publicExam).not.toHaveProperty('keys');
      expect(publicExam).not.toHaveProperty('answerKeys');
      expect(publicExam).not.toHaveProperty('solution');
    });
  });

  describe('4. Thi Phase: Attempt Lifecycle, Lease, Section Deadlines & Submission', () => {
    beforeAll(() => {
      expect(demoExamId, 'demoExamId must be discovered or initialized before Thi phase').toBeDefined();
    });

    it('rejects attempt creation for unverified student accounts (403 EMAIL_NOT_VERIFIED)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.unverifiedStudent}`,
        },
        body: JSON.stringify({
          examId: demoExamId,
          mode: 'real',
        }),
      });

      expect(res.status).toBe(403);
      const err = (await res.json()) as ApiEnvelope;
      expect(err.error?.code).toBe('EMAIL_NOT_VERIFIED');
    });

    it('creates a new exam attempt and receives valid lease token with zero answer leak', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          examId: demoExamId,
          mode: 'real',
        }),
      });

      if (res.status === 409) {
        const conflict = (await res.json()) as { error?: { code?: string; details?: { attemptId?: string } } };
        if (conflict.error?.code === 'ATTEMPT_ALREADY_OPEN' && conflict.error.details?.attemptId) {
          const resumeRes = await fetch(`${baseUrl}/api/v1/attempts/${conflict.error.details.attemptId}/resume`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${AUTH_TOKENS.student}`,
            },
          });
          if (resumeRes.ok) {
            const resumeData = (await resumeRes.json()) as { lease: string; mediaToken?: string };
            activeAttemptId = conflict.error.details.attemptId;
            activeLeaseToken = resumeData.lease;
            expect(activeAttemptId).toBeDefined();
            expect(activeLeaseToken).toBeDefined();
            return;
          }
        }
      }

      expect(res.status).toBe(201);
      const data = (await res.json()) as {
        attemptId: string;
        lease: string;
        mediaToken: string;
      };

      expect(data.attemptId).toBeDefined();
      expect(data.lease).toBeDefined();
      activeAttemptId = data.attemptId;
      activeLeaseToken = data.lease;

      // Assert zero answer leakage in initialization response
      expect(() => assertNoAnswerLeak(data as unknown as Record<string, unknown>)).not.toThrow();
    });

    it('prevents multiple concurrent open attempts on the same exam (409 ATTEMPT_ALREADY_OPEN)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          examId: demoExamId,
          mode: 'real',
        }),
      });

      expect(res.status).toBe(409);
      const err = (await res.json()) as { error?: { code?: string; details?: { attemptId?: string } } };
      expect(err.error?.code).toBe('ATTEMPT_ALREADY_OPEN');
      expect(err.error?.details?.attemptId).toBe(activeAttemptId);
    });

    it('prevents reviewing results before the attempt is submitted (409 ATTEMPT_NOT_SUBMITTED)', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/review`,
        {
          headers: {
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
        },
      );

      expect(res.status).toBe(409);
      const err = (await res.json()) as ApiEnvelope;
      expect(err.error?.code).toBe('ATTEMPT_NOT_SUBMITTED');
    });

    it('advances sections and saves answer sheets with monotonic sequence ACK', async () => {
      // 1. Advance to Section 1
      const nextSec1 = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/sections/next`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
          body: JSON.stringify({ lease: activeLeaseToken }),
        },
      );
      expect(nextSec1.status).toBe(200);
      const sec1Data = (await nextSec1.json()) as { sectionIndex: number; deadline: string };
      expect(sec1Data.sectionIndex).toBe(0);
      expect(new Date(sec1Data.deadline).getTime()).toBeGreaterThan(Date.now());

      const baseAnswers = Array(29).fill(0);
      baseAnswers[0] = 2;
      baseAnswers[1] = 1;
      baseAnswers[2] = 3;

      // 2. Submit answers for Section 1 (seq=1)
      const sheet1Res = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/sheet`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
          body: JSON.stringify({
            lease: activeLeaseToken,
            seq: 1,
            answers: baseAnswers,
            flags: Array(29).fill(0),
            changes: [
              { i: 0, v: 2, at: Date.now() },
              { i: 1, v: 1, at: Date.now() },
              { i: 2, v: 3, at: Date.now() },
            ],
          }),
        },
      );
      expect(sheet1Res.status).toBe(200);
      const ack1 = (await sheet1Res.json()) as { lastSeq: number; serverNow: string };
      expect(ack1.lastSeq).toBe(1);

      // 3. Advance to Section 2
      const nextSec2 = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/sections/next`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
          body: JSON.stringify({ lease: activeLeaseToken }),
        },
      );
      expect(nextSec2.status).toBe(200);
      const sec2Data = (await nextSec2.json()) as { sectionIndex: number };
      expect(sec2Data.sectionIndex).toBe(1);

      // 4. Submit answers for Section 2 (seq=2)
      baseAnswers[12] = 1;
      baseAnswers[13] = 4;
      const sheet2Res = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/sheet`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
          body: JSON.stringify({
            lease: activeLeaseToken,
            seq: 2,
            answers: baseAnswers,
            flags: Array(29).fill(0),
            changes: [
              { i: 12, v: 1, at: Date.now() },
              { i: 13, v: 4, at: Date.now() },
            ],
          }),
        },
      );
      expect(sheet2Res.status).toBe(200);
      const ack2 = (await sheet2Res.json()) as { lastSeq: number };
      expect(ack2.lastSeq).toBe(2);

      // 5. Advance to Section 3
      const nextSec3 = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/sections/next`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
          body: JSON.stringify({ lease: activeLeaseToken }),
        },
      );
      expect(nextSec3.status).toBe(200);
      const sec3Data = (await nextSec3.json()) as { sectionIndex: number };
      expect(sec3Data.sectionIndex).toBe(2);

      // 6. Submit answers for Section 3 (seq=3)
      baseAnswers[22] = 3;
      baseAnswers[23] = 2;
      const sheet3Res = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/sheet`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
          body: JSON.stringify({
            lease: activeLeaseToken,
            seq: 3,
            answers: baseAnswers,
            flags: Array(29).fill(0),
            changes: [
              { i: 22, v: 3, at: Date.now() },
              { i: 23, v: 2, at: Date.now() },
            ],
          }),
        },
      );
      expect(sheet3Res.status).toBe(200);
      const ack3 = (await sheet3Res.json()) as { lastSeq: number };
      expect(ack3.lastSeq).toBe(3);
    });

    it('submits exam attempt with transaction consistency and returns certified scoring result', async () => {
      const finalAnswers = Array(29).fill(1); // fill all with valid option 1
      const submitRes = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
          body: JSON.stringify({
            lease: activeLeaseToken,
            seq: 4,
            answers: finalAnswers,
            flags: Array(29).fill(0),
          }),
        },
      );

      expect(submitRes.status).toBe(200);
      const submitData = (await submitRes.json()) as {
        result: {
          scoring: { total: number; passEstimate: boolean };
          totals: { total: number };
        };
      };

      expect(submitData.result).toBeDefined();
      expect(typeof submitData.result.scoring.total).toBe('number');
      expect(typeof submitData.result.scoring.passEstimate).toBe('boolean');
      expect(typeof submitData.result.totals.total).toBe('number');

      // Double submit must be idempotent
      const doubleSubmitRes = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
          body: JSON.stringify({
            lease: activeLeaseToken,
            seq: 4,
            answers: finalAnswers,
            flags: Array(29).fill(0),
          }),
        },
      );
      expect(doubleSubmitRes.status).toBe(200);
      const doubleSubmitData = (await doubleSubmitRes.json()) as typeof submitData;
      expect(doubleSubmitData.result.scoring.total).toBe(submitData.result.scoring.total);
    });

    it('rejects sheet update after attempt is closed (409 ATTEMPT_CLOSED)', async () => {
      const lateSheetRes = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/sheet`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
          body: JSON.stringify({
            lease: activeLeaseToken,
            seq: 99,
            answers: Array(29).fill(1),
            flags: Array(29).fill(0),
            changes: [{ i: 0, v: 1, at: Date.now() }],
          }),
        },
      );

      expect(lateSheetRes.status).toBe(409);
      const err = (await lateSheetRes.json()) as ApiEnvelope;
      expect(err.error?.code).toBe('ATTEMPT_CLOSED');
    });
  });

  describe('5. Review Phase: Post-Exam Review & Explanations', () => {
    it('reveals correct answers and Vietnamese explanations to candidate after submission', async () => {
      const reviewRes = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/review`,
        {
          headers: {
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
        },
      );

      expect(reviewRes.status).toBe(200);
      const reviewData = (await reviewRes.json()) as {
        answers: number[];
        correct: number[];
        result: { totalScore: number };
      };

      expect(Array.isArray(reviewData.correct)).toBe(true);
      expect(reviewData.correct.length).toBe(29);
      expect(reviewData.result).toBeDefined();

      // Check candidate explanation endpoint
      const explanationRes = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/explanations/0`,
        {
          headers: {
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
        },
      );

      expect(explanationRes.status).toBe(200);
      const explanationData = (await explanationRes.json()) as {
        index: number;
        hasExplanation?: boolean;
      };
      expect(explanationData.index).toBe(0);
    });

    it('strictly prevents IDOR: other candidates receive 404 Not Found on review and 403 on explanations', async () => {
      const idorRes = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/review`,
        {
          headers: {
            Authorization: `Bearer ${AUTH_TOKENS.otherStudent}`,
          },
        },
      );

      expect(idorRes.status).toBe(404);
      const err = (await idorRes.json()) as ApiEnvelope;
      expect(err.error?.code).toBe('NOT_FOUND');

      const idorExplRes = await fetch(
        `${baseUrl}/api/v1/attempts/${activeAttemptId}/explanations/0`,
        {
          headers: {
            Authorization: `Bearer ${AUTH_TOKENS.otherStudent}`,
          },
        },
      );
      expect(idorExplRes.status).toBe(403);
    });
  });
});
