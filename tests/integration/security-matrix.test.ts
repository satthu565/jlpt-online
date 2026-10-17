import { execSync } from 'node:child_process';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { assertNoAnswerLeak } from '@jlpt/schema';
import { signMediaToken, verifyMediaToken } from '@jlpt/media-token';
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
    if (initRes.status === 409) {
      // Resume existing open attempt if one was left in progress
      const errData = (await initRes.json()) as {
        details?: { attemptId?: string };
        error?: { details?: { attemptId?: string } };
      };
      const attemptId = errData?.error?.details?.attemptId || errData?.details?.attemptId;
      expect(attemptId).toBeDefined();
      candidate1AttemptId = attemptId!;
      const resumeRes = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}/resume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${AUTH_TOKENS.student}` },
      });
      expect(resumeRes.status).toBe(200);
      const resumeData = (await resumeRes.json()) as { lease: string };
      expect(resumeData.lease).toBeDefined();
      candidate1Lease = resumeData.lease;
    } else {
      expect(initRes.status).toBe(201);
      const initData = (await initRes.json()) as {
        attemptId: string;
        lease: string;
        mediaToken: string;
      };
      candidate1AttemptId = initData.attemptId;
      candidate1Lease = initData.lease;
    }
  }, 60000);

  afterAll(() => {
    stopApiServer();
  });

  // ===========================================================================
  // 1. Cross-Tenant Isolation Negative Matrix
  // ===========================================================================
  describe('1. Cross-Tenant Isolation Matrix (TenantGuard & Boundaries)', () => {
    it('blocks cross-tenant access with 403 TENANT_FORBIDDEN when Student A accesses Tenant B resources', async () => {
      // Student A (tenant: org-alpha) accesses resource with target tenant org-beta
      const res = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
          'x-organization-id': 'org-beta',
        },
      });
      expect(res.status).toBe(403);
      const body = (await res.json()) as ApiEnvelope;
      expect(body.error?.code).toBe('TENANT_FORBIDDEN');
      expect(body.error?.message).toContain('Không có quyền truy cập tổ chức');
    });

    it('blocks cross-tenant access with 403 TENANT_FORBIDDEN when Student B accesses Tenant A resources', async () => {
      // Student B (tenant: org-beta) creates attempt targeting tenant org-alpha
      const res = await fetch(`${baseUrl}/api/v1/attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.otherStudent}`,
          'x-organization-id': 'org-alpha',
        },
        body: JSON.stringify({
          examId: demoExamId,
          mode: 'real',
        }),
      });
      expect(res.status).toBe(403);
      const body = (await res.json()) as ApiEnvelope;
      expect(body.error?.code).toBe('TENANT_FORBIDDEN');
      expect(body.error?.message).toContain('Không có quyền truy cập tổ chức');
    });

    it('permits access when user accesses resources within their own tenant boundary', async () => {
      // Student A (org-alpha) accesses their attempt with matching tenant org-alpha
      const res = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
          'x-organization-id': 'org-alpha',
        },
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { status?: string };
      expect(body.status).toBe('in_progress');
    });

    it('allows admin cross-tenant operational maintenance across both tenants', async () => {
      // Admin has role 'admin' which grants cross-tenant operational access in TenantGuard
      const resAlpha = await fetch(`${baseUrl}/api/v1/admin/audit-logs`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.admin}`,
          'x-organization-id': 'org-alpha',
        },
      });
      expect(resAlpha.status).toBe(200);

      const resBeta = await fetch(`${baseUrl}/api/v1/admin/audit-logs`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.admin}`,
          'x-organization-id': 'org-beta',
        },
      });
      expect(resBeta.status).toBe(200);
    });

    it('denies unauthenticated cross-tenant access to audit and import endpoints (401)', async () => {
      const resAudit = await fetch(`${baseUrl}/api/v1/admin/audit-logs`, {
        headers: {
          'x-organization-id': 'org-beta',
        },
      });
      expect(resAudit.status).toBe(401);

      const resImports = await fetch(`${baseUrl}/api/v1/admin/imports`, {
        headers: {
          'x-organization-id': 'org-beta',
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

  // ===========================================================================
  // 6. OWASP ASVS L2 & Hardening Security Verification (SYS-10 / Task V06)
  // ===========================================================================
  describe('6. OWASP ASVS L2 & Hardening Security Gate (Task V06)', () => {
    const testSecret = 'test_secret_key_for_asvs_l2_hardening_at_least_32_bytes!';

    it('rejects tampered media token signatures immediately (no unauthorized audio leak)', async () => {
      const validToken = await signMediaToken(
        {
          a: candidate1AttemptId,
          e: demoExamId,
          v: 1,
          k: 'attempt',
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        testSecret
      );

      // Tamper with the signature bytes
      const parts = validToken.split('.');
      expect(parts.length).toBe(2);
      const tamperedToken = `${parts[0]}.forgedSignatureBytes1234567890`;

      const verifyResult = await verifyMediaToken(tamperedToken, testSecret);
      expect(verifyResult).toBeNull();
    });

    it('rejects expired media tokens strictly', async () => {
      const pastTimeUnix = Math.floor(Date.now() / 1000) - 300; // 5 mins ago
      const expiredToken = await signMediaToken(
        {
          a: candidate1AttemptId,
          e: demoExamId,
          v: 1,
          k: 'attempt',
          exp: pastTimeUnix,
        },
        testSecret
      );

      const verifyResult = await verifyMediaToken(expiredToken, testSecret);
      expect(verifyResult).toBeNull();
    });

    it('denies student accounts from calling administrative routes (/api/v1/admin/*) with 403 Forbidden', async () => {
      const adminEndpoints = [
        '/api/v1/admin/audit-logs',
        '/api/v1/admin/imports',
        `/api/v1/admin/exams/${demoExamId}/publish`,
        '/api/v1/admin/explanations',
      ];

      for (const ep of adminEndpoints) {
        const res = await fetch(`${baseUrl}${ep}`, {
          method: ep.includes('publish') ? 'POST' : 'GET',
          headers: {
            Authorization: `Bearer ${AUTH_TOKENS.student}`,
          },
        });
        expect([401, 403]).toContain(res.status);
      }
    });

    it('dependency audit passes with zero high or critical security vulnerabilities (T1.9.3)', () => {
      // pnpm audit --audit-level=high must exit with 0 code
      expect(() => {
        execSync('pnpm audit --audit-level=high', { stdio: 'pipe' });
      }).not.toThrow();
    });

    it('verifies acceptance: No P0/P1 accepted silently (rejections must be explicit)', async () => {
      // 1. Cross-tenant access must return explicit TENANT_FORBIDDEN error envelope
      const crossTenantRes = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
          'x-organization-id': 'org-beta',
        },
      });
      expect(crossTenantRes.status).toBe(403);
      const crossTenantBody = (await crossTenantRes.json()) as ApiEnvelope;
      expect(crossTenantBody.error?.code).toBe('TENANT_FORBIDDEN');

      // 2. IDOR hijack must return explicit NOT_FOUND error envelope
      const idorRes = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}`, {
        headers: {
          Authorization: `Bearer ${AUTH_TOKENS.otherStudent}`,
        },
      });
      expect(idorRes.status).toBe(404);
      const idorBody = (await idorRes.json()) as ApiEnvelope;
      expect(idorBody.error?.code).toBe('NOT_FOUND');

      // 3. Forged lease must return explicit LEASE_INVALID error envelope
      const leaseRes = await fetch(`${baseUrl}/api/v1/attempts/${candidate1AttemptId}/sections/next`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AUTH_TOKENS.student}`,
        },
        body: JSON.stringify({
          lease: '0192f000-0000-7000-8000-000000000099',
        }),
      });
      expect(leaseRes.status).toBe(409);
      const leaseBody = (await leaseRes.json()) as ApiEnvelope;
      expect(leaseBody.error?.code).toBe('LEASE_INVALID');
    });
  });
});

