import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { assertNoAnswerLeak } from '@jlpt/schema';
import {
  getApiBaseUrl,
  stopApiServer,
  AUTH_TOKENS,
} from '../fixtures/test-server.ts';

interface ApiEnvelope {
  status?: number;
  data?: unknown;
  error?: { code?: string; message?: string };
}

describe('Security Negative Matrix: Cross-Tenant, IDOR, RBAC & Lease Protection (N06)', () => {
  let baseUrl: string;
  let demoExamId: string;
  let candidate1AttemptId: string;
  let candidate1Lease: string;

  beforeAll(async () => {
    baseUrl = await getApiBaseUrl();

    // Look up demo-n5-1 exam
    const examsRes = await fetch(`${baseUrl}/api/v1/exams`);
    expect(examsRes.status).toBe(200);
    const examsData = (await examsRes.json()) as { items?: Array<{ id: string; slug: string }> };
    const found = examsData.items?.find((x) => x.slug === 'demo-n5-1');
    expect(found).toBeDefined();
    demoExamId = found!.id;

    // Create baseline attempt for Student 1 (Candidate A)
    const initRes = await fetch(`${baseUrl}/api/v1/attempts`, {
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
    expect(initRes.status).toBe(201);
    const initData = (await initRes.json()) as {
      attemptId: string;
      lease: string;
      mediaToken: string;
    };
    candidate1AttemptId = initData.attemptId;
    candidate1Lease = initData.lease;
  }, 60000);

  afterAll(() => {
    stopApiServer();
  });

  // ===========================================================================
  // 1. Cross-Tenant Isolation Negative Matrix
  // ===========================================================================
  describe('1. Cross-Tenant Isolation Matrix (TenantGuard & Boundaries)', () => {
    it('rejects access to protected admin tenant routes without admin credentials', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/imports`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
          'x-organization-id': 'org-internal',
        },
      });
      expect(res.status).toBe(403);
    });

    it('denies student access to tenant audit logs with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/audit-logs`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
          'x-organization-id': 'org-foreign-tenant-999',
        },
      });
      expect(res.status).toBe(403);
    });

    it('denies unauthenticated cross-tenant access to audit and import endpoints', async () => {
      const resAudit = await fetch(`${baseUrl}/api/v1/admin/audit-logs`, {
        headers: {
          'x-organization-id': 'org-foreign-tenant-999',
        },
      });
      expect(resAudit.status).toBe(401);

      const resImports = await fetch(`${baseUrl}/api/v1/admin/imports`, {
        headers: {
          'x-organization-id': 'org-foreign-tenant-999',
        },
      });
      expect(resImports.status).toBe(401);
    });
  });

  // ===========================================================================
  // 2. IDOR Negative Matrix (Attempt Ownership Isolation)
  // ===========================================================================
  describe('2. IDOR Negative Matrix: Cross-Candidate Attempt Hijacking Prevention', () => {
    it('prevents Candidate B from viewing Candidate A attempt details (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.otherStudent}`,
        },
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiEnvelope;
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('prevents Candidate B from modifying Candidate A answer sheet (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}/sheet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.otherStudent}`,
        },
        body: JSON.stringify({
          lease: candidate1Lease,
          seq: 1,
          answers: Array(29).fill(2),
          flags: Array(29).fill(0),
          changes: [{ i: 0, v: 2, at: Date.now() }],
        }),
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiEnvelope;
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('prevents Candidate B from advancing Candidate A exam section (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}/sections/next`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.otherStudent}`,
        },
        body: JSON.stringify({
          lease: candidate1Lease,
        }),
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiEnvelope;
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('prevents Candidate B from submitting Candidate A exam attempt (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.otherStudent}`,
        },
        body: JSON.stringify({
          lease: candidate1Lease,
          seq: 1,
          answers: Array(29).fill(1),
          flags: Array(29).fill(0),
        }),
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiEnvelope;
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('prevents Candidate B from resuming Candidate A attempt (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}/resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.otherStudent}`,
        },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiEnvelope;
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('prevents Candidate B from accessing Candidate A post-exam review (404 Not Found)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}/review`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.otherStudent}`,
        },
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ApiEnvelope;
      expect(body.error?.code).toBe('NOT_FOUND');
    });

    it('prevents Candidate B from inspecting Candidate A question explanations (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}/explanations/0`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.otherStudent}`,
        },
      });
      expect(res.status).toBe(403);
      const body = (await res.json()) as ApiEnvelope;
      expect(body.error?.code).toBe('FORBIDDEN');
    });

    it('rejects unauthenticated attempts with 401/404', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}/review`);
      expect([401, 404]).toContain(res.status);
    });
  });

  // ===========================================================================
  // 3. RBAC Negative Matrix
  // ===========================================================================
  describe('3. Role-Based Access Control (RBAC) Negative Matrix', () => {
    it('denies Student from accessing admin import jobs (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/imports`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
      });
      expect(res.status).toBe(403);
    });

    it('denies Student from publishing exam versions (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/exams/${demoExamId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
      });
      expect(res.status).toBe(403);
    });

    it('denies Student from accessing moderation explanations (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/explanations`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
      });
      expect(res.status).toBe(403);
    });

    it('denies Editor from publishing exams (Admin only required)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/admin/exams/${demoExamId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.editor}`,
        },
      });
      expect(res.status).toBe(403);
    });

    it('strictly enforces 4-Eyes principle: Editor cannot approve own content version', async () => {
      const res = await fetch(
        `${baseUrl}/api/v1/admin/reviews/exam_version/${demoExamId}/v1/decision`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AUTH_TOKENS.editor}`,
          },
          body: JSON.stringify({
            decision: 'approved',
            comments: 'Editor self-review attempt',
          }),
        },
      );
      expect(res.status).toBe(403);
      const err = (await res.json()) as ApiEnvelope;
      expect(err.error?.message || JSON.stringify(err)).toMatch(
        /4-eyes|Người duyệt|người sửa|editor/i,
      );
    });
  });

  // ===========================================================================
  // 4. Lease Tampering & Session Integrity Matrix
  // ===========================================================================
  describe('4. Lease & Attempt Session Integrity Matrix', () => {
    const forgedLease = '0192f000-0000-7000-8000-000000000099';

    it('rejects attempt advance with forged lease token (409 LEASE_INVALID)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}/sections/next`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          lease: forgedLease,
        }),
      });
      expect(res.status).toBe(409);
      const body = (await res.json()) as ApiEnvelope;
      expect(body.error?.code).toBe('LEASE_INVALID');
    });

    it('rejects answer sheet update with forged lease token (409 LEASE_INVALID)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}/sheet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          lease: forgedLease,
          seq: 1,
          answers: Array(29).fill(1),
          flags: Array(29).fill(0),
          changes: [{ i: 0, v: 1, at: Date.now() }],
        }),
      });
      expect(res.status).toBe(409);
      const body = (await res.json()) as ApiEnvelope;
      expect(body.error?.code).toBe('LEASE_INVALID');
    });

    it('rejects submission with forged lease token (409 LEASE_INVALID)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          lease: forgedLease,
          seq: 1,
          answers: Array(29).fill(1),
          flags: Array(29).fill(0),
        }),
      });
      expect(res.status).toBe(409);
      const body = (await res.json()) as ApiEnvelope;
      expect(body.error?.code).toBe('LEASE_INVALID');
    });

    it('strictly forbids unverified student accounts from starting real attempts', async () => {
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
      const body = (await res.json()) as ApiEnvelope;
      expect(body.error?.code).toBe('EMAIL_NOT_VERIFIED');
    });
  });

  // ===========================================================================
  // 5. Zero Answer Leakage Guarantee Across All Student Surfaces
  // ===========================================================================
  describe('5. Zero Answer Leakage Guarantee (Contract assertion)', () => {
    it('public exam definition has strictly zero answer keys or solutions', async () => {
      const res = await fetch(`${baseUrl}/api/v1/exams/demo-n5-1`);
      expect(res.status).toBe(200);
      const exam = (await res.json()) as Record<string, unknown>;
      expect(() => assertNoAnswerLeak(exam)).not.toThrow();
      expect(exam).not.toHaveProperty('keys');
      expect(exam).not.toHaveProperty('correctOption');
      expect(exam).not.toHaveProperty('solution');
    });

    it('attempt creation returns no answers or question solutions', async () => {
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
      // 409 because candidate already has open attempt
      expect([201, 409]).toContain(res.status);
      const data = (await res.json()) as Record<string, unknown>;
      expect(() => assertNoAnswerLeak(data)).not.toThrow();
    });
  });
});
