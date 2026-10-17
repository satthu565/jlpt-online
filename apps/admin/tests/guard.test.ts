import { describe, it, expect, vi } from 'vitest';
import type { Role } from '@jlpt/schema';
import { AdminApiClient, AdminClientGuardError } from '../lib/api-client';
import { canAccessRoute } from '../lib/navigation';

describe('Admin UI & API Guard Direct Access Prevention (Acceptance 3: Thử gọi trực tiếp API không vượt được UI guard)', () => {
  describe('Layer 1: Client-Side UI Guard Direct Invocation Prevention', () => {
    it('Blocks direct API calls when unauthenticated (No Token / No User)', async () => {
      const unauthClient = new AdminApiClient({
        baseUrl: 'http://localhost:4000',
        token: null,
        user: null,
      });

      // Calling any domain API directly without auth throws UNAUTHENTICATED
      await expect(unauthClient.listQuestions()).rejects.toThrow(AdminClientGuardError);

      try {
        await unauthClient.listQuestions();
      } catch (err: unknown) {
        const e = err as AdminClientGuardError;
        expect(e.code).toBe('UNAUTHENTICATED');
        expect(e.status).toBe(401);
      }

      await expect(unauthClient.listAuditLogs()).rejects.toThrow(AdminClientGuardError);
      await expect(unauthClient.listPendingReviews()).rejects.toThrow(AdminClientGuardError);
      await expect(unauthClient.publishExam('ex_01')).rejects.toThrow(AdminClientGuardError);
    });

    it('Blocks direct API calls when 2FA is pending enrollment (setup_required)', async () => {
      const pendingClient = new AdminApiClient({
        baseUrl: 'http://localhost:4000',
        token: 'temp_token_123',
        user: {
          id: 'u_editor_1',
          email: 'editor@jlpt.local',
          name: 'Editor',
          role: 'editor',
          twoFactorEnabled: false,
          twoFactorStatus: 'setup_required',
        },
      });

      // Even though the user has an editor token, 2FA has not been verified!
      await expect(pendingClient.listQuestions()).rejects.toThrow(AdminClientGuardError);

      try {
        await pendingClient.listQuestions();
      } catch (err: unknown) {
        const e = err as AdminClientGuardError;
        expect(e.code).toBe('TWO_FACTOR_REQUIRED');
        expect(e.status).toBe(403);
        expect(e.message).toContain('Nhân sự bắt buộc phải hoàn thành xác thực hai yếu tố (2FA)');
      }
    });

    it('Blocks direct API calls when 2FA challenge is pending (challenge_required)', async () => {
      const challengeClient = new AdminApiClient({
        baseUrl: 'http://localhost:4000',
        token: 'challenge_token_456',
        user: {
          id: 'u_admin_1',
          email: 'admin@jlpt.local',
          name: 'Admin',
          role: 'admin',
          twoFactorEnabled: true,
          twoFactorStatus: 'challenge_required',
        },
      });

      // Admin with unverified 2FA challenge cannot access any endpoint
      await expect(challengeClient.listUsers()).rejects.toThrow(AdminClientGuardError);

      try {
        await challengeClient.listUsers();
      } catch (err: unknown) {
        const e = err as AdminClientGuardError;
        expect(e.code).toBe('TWO_FACTOR_REQUIRED');
        expect(e.status).toBe(403);
      }
    });

    it('Blocks direct API calls when role lacks permission (Editor trying to list audit logs or publish exam)', async () => {
      const mockFetch: typeof fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/groups')) return new Response(JSON.stringify({ items: [{ id: 'grp_01' }] }), { status: 200 });
        if (url.includes('/reviews')) return new Response(JSON.stringify({ items: [{ id: 'rev_01' }] }), { status: 200 });
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }) as unknown as typeof fetch;

      const editorClient = new AdminApiClient({
        baseUrl: 'http://localhost:4000',
        token: 'editor_valid_token',
        user: {
          id: 'u_editor_2',
          email: 'editor2@jlpt.local',
          name: 'Editor 2',
          role: 'editor',
          twoFactorEnabled: true,
          twoFactorStatus: 'verified',
        },
        fetchFn: mockFetch,
      });

      // Allowed for editor:
      const questions = await editorClient.listQuestions();
      expect(questions).toBeDefined();

      // Blocked by UI Guard: Editor calling audit logs -> FORBIDDEN
      await expect(editorClient.listAuditLogs()).rejects.toThrow(AdminClientGuardError);
      try {
        await editorClient.listAuditLogs();
      } catch (err: unknown) {
        const e = err as AdminClientGuardError;
        expect(e.code).toBe('FORBIDDEN');
        expect(e.status).toBe(403);
        expect(e.details.userRole).toBe('editor');
      }

      // Blocked by UI Guard: Editor calling publish exam -> FORBIDDEN
      await expect(editorClient.publishExam('ex_01')).rejects.toThrow(AdminClientGuardError);
    });

    it('Blocks direct API calls when Reviewer tries to create or edit question groups', async () => {
      const mockFetch: typeof fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/groups')) return new Response(JSON.stringify({ items: [{ id: 'grp_01' }] }), { status: 200 });
        if (url.includes('/reviews')) return new Response(JSON.stringify({ items: [{ id: 'rev_01' }] }), { status: 200 });
        return new Response(JSON.stringify({ items: [] }), { status: 200 });
      }) as unknown as typeof fetch;

      const reviewerClient = new AdminApiClient({
        baseUrl: 'http://localhost:4000',
        token: 'reviewer_valid_token',
        user: {
          id: 'u_reviewer_1',
          email: 'reviewer@jlpt.local',
          name: 'Reviewer',
          role: 'reviewer',
          twoFactorEnabled: true,
          twoFactorStatus: 'verified',
        },
        fetchFn: mockFetch,
      });

      // Reviewer can list pending reviews
      const reviews = await reviewerClient.listPendingReviews();
      expect(reviews).toBeDefined();

      // Reviewer cannot create question groups (Editor/Admin only)
      await expect(reviewerClient.createQuestionGroup({ title: 'New Group' })).rejects.toThrow(AdminClientGuardError);
      try {
        await reviewerClient.createQuestionGroup({ title: 'New Group' });
      } catch (err: unknown) {
        const e = err as AdminClientGuardError;
        expect(e.code).toBe('FORBIDDEN');
      }
    });

    it('Blocks direct API calls when Student attempts to call any admin client method', async () => {
      const studentClient = new AdminApiClient({
        baseUrl: 'http://localhost:4000',
        token: 'student_token',
        user: {
          id: 'u_student_1',
          email: 'student@example.com',
          name: 'Student',
          role: 'student' as unknown as Role,
          twoFactorEnabled: true,
          twoFactorStatus: 'verified',
        },
      });

      await expect(studentClient.listQuestions()).rejects.toThrow(AdminClientGuardError);
      await expect(studentClient.listAuditLogs()).rejects.toThrow(AdminClientGuardError);
      await expect(studentClient.listExams()).rejects.toThrow(AdminClientGuardError);
    });
  });

  describe('Layer 2: Server-Side Network Guard Direct HTTP Request Prevention', () => {
    // Simulated server dispatcher matching the fastify/NestJS RolesGuard & AuthGuard logic
    const simulateBackendRequest = async (
      pathname: string,
      headers: Record<string, string>,
      dbUserSession?: { role: string; twoFactorEnabled: boolean } | null,
    ) => {
      const authHeader = headers['authorization'] || headers['Authorization'];
      const hostHeader = (headers['host'] || headers['Host'] || '').toLowerCase().split(':')[0];
      const adminHost = 'admin.jlpt.local';

      // 1. Auth check
      if (!authHeader || !authHeader.startsWith('Bearer ') || !dbUserSession) {
        return {
          status: 401,
          body: { error: { code: 'UNAUTHENTICATED', message: 'Yêu cầu đăng nhập.' } },
        };
      }

      // 2. Admin host check
      if (pathname.startsWith('/api/v1/admin')) {
        if (hostHeader !== adminHost) {
          return {
            status: 403,
            body: { error: { code: 'FORBIDDEN', message: 'Khu vực quản trị chỉ được phép truy cập qua ADMIN_HOST.' } },
          };
        }

        // 3. Staff check
        const staffRoles = ['admin', 'editor', 'reviewer', 'moderator', 'billing_admin'];
        if (!staffRoles.includes(dbUserSession.role)) {
          return {
            status: 403,
            body: { error: { code: 'FORBIDDEN', message: 'Tài khoản không thuộc quyền quản trị.' } },
          };
        }

        // 4. TOTP 2FA check (ENFORCE_STAFF_2FA=true)
        if (dbUserSession.twoFactorEnabled === false) {
          return {
            status: 403,
            body: { error: { code: 'TWO_FACTOR_REQUIRED', message: 'Nhân sự bắt buộc phải kích hoạt 2FA.' } },
          };
        }

        // 5. Endpoint-specific role check
        if (pathname === '/api/v1/admin/audit-logs' && dbUserSession.role !== 'admin') {
          return {
            status: 403,
            body: { error: { code: 'FORBIDDEN', message: 'Quyền hạn không đủ.' } },
          };
        }
      }

      return { status: 200, body: { success: true } };
    };

    it('Direct HTTP request without token returns 401 UNAUTHENTICATED', async () => {
      const mockFetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        const headers = (init.headers || {}) as Record<string, string>;
        const res = await simulateBackendRequest('/api/v1/admin/audit-logs', headers, null);
        return new Response(JSON.stringify(res.body), { status: res.status });
      });

      const client = new AdminApiClient({
        fetchFn: mockFetch as unknown as typeof fetch,
        token: 'some_token',
        user: {
          id: '1',
          email: 'admin@jlpt.local',
          name: 'Admin',
          role: 'admin',
          twoFactorEnabled: true,
          twoFactorStatus: 'verified',
        },
      });

      // Calling when server rejects auth token:
      await expect(
        client.request('GET', '/api/v1/admin/audit-logs', { skipGuard: true }),
      ).rejects.toThrow(AdminClientGuardError);
    });

    it('Direct HTTP request from non-admin Host header returns 403 FORBIDDEN', async () => {
      const mockFetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        const headers = (init.headers || {}) as Record<string, string>;
        const res = await simulateBackendRequest('/api/v1/admin/audit-logs', headers, {
          role: 'admin',
          twoFactorEnabled: true,
        });
        return new Response(JSON.stringify(res.body), { status: res.status });
      });

      const client = new AdminApiClient({
        fetchFn: mockFetch as unknown as typeof fetch,
        adminHost: 'attacker-domain.com', // Spoofed or wrong host
        token: 'admin_tok',
        user: {
          id: '1',
          email: 'admin@jlpt.local',
          name: 'Admin',
          role: 'admin',
          twoFactorEnabled: true,
          twoFactorStatus: 'verified',
        },
      });

      await expect(client.request('GET', '/api/v1/admin/audit-logs')).rejects.toThrow(AdminClientGuardError);
      try {
        await client.request('GET', '/api/v1/admin/audit-logs');
      } catch (err: unknown) {
        const e = err as AdminClientGuardError;
        expect(e.code).toBe('FORBIDDEN');
      }
    });

    it('Direct HTTP request with twoFactorEnabled=false returns 403 TWO_FACTOR_REQUIRED', async () => {
      const mockFetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        const headers = (init.headers || {}) as Record<string, string>;
        const res = await simulateBackendRequest('/api/v1/admin/groups', headers, {
          role: 'editor',
          twoFactorEnabled: false, // Server detects 2FA is NOT enabled
        });
        return new Response(JSON.stringify(res.body), { status: res.status });
      });

      const client = new AdminApiClient({
        fetchFn: mockFetch as unknown as typeof fetch,
        token: 'editor_tok',
        user: {
          id: '2',
          email: 'editor@jlpt.local',
          name: 'Editor',
          role: 'editor',
          twoFactorEnabled: true, // Client attempts to forge flag, but server verifies DB
          twoFactorStatus: 'verified',
        },
      });

      await expect(client.listQuestions()).rejects.toThrow(AdminClientGuardError);
      try {
        await client.listQuestions();
      } catch (err: unknown) {
        const e = err as AdminClientGuardError;
        expect(e.code).toBe('TWO_FACTOR_REQUIRED');
      }
    });

    it('Direct HTTP request by editor to admin-only endpoint returns 403 FORBIDDEN', async () => {
      const mockFetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        const headers = (init.headers || {}) as Record<string, string>;
        const res = await simulateBackendRequest('/api/v1/admin/audit-logs', headers, {
          role: 'editor',
          twoFactorEnabled: true,
        });
        return new Response(JSON.stringify(res.body), { status: res.status });
      });

      const client = new AdminApiClient({
        fetchFn: mockFetch as unknown as typeof fetch,
        token: 'editor_tok',
        user: {
          id: '2',
          email: 'editor@jlpt.local',
          name: 'Editor',
          role: 'editor',
          twoFactorEnabled: true,
          twoFactorStatus: 'verified',
        },
      });

      await expect(client.request('GET', '/api/v1/admin/audit-logs', { skipGuard: true })).rejects.toThrow(
        AdminClientGuardError,
      );
      try {
        await client.request('GET', '/api/v1/admin/audit-logs', { skipGuard: true });
      } catch (err: unknown) {
        const e = err as AdminClientGuardError;
        expect(e.code).toBe('FORBIDDEN');
      }
    });

    it('Direct HTTP request by student to admin endpoint returns 403 FORBIDDEN', async () => {
      const mockFetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
        const headers = (init.headers || {}) as Record<string, string>;
        const res = await simulateBackendRequest('/api/v1/admin/exams', headers, {
          role: 'student',
          twoFactorEnabled: true,
        });
        return new Response(JSON.stringify(res.body), { status: res.status });
      });

      const client = new AdminApiClient({
        fetchFn: mockFetch as unknown as typeof fetch,
        token: 'student_tok',
        user: {
          id: '3',
          email: 'student@example.com',
          name: 'Student',
          role: 'student' as unknown as Role,
          twoFactorEnabled: true,
          twoFactorStatus: 'verified',
        },
      });

      await expect(client.request('GET', '/api/v1/admin/exams', { skipGuard: true })).rejects.toThrow(
        AdminClientGuardError,
      );
    });
  });

  describe('Layer 3: UI Navigation Guard Matrix', () => {
    it('disallows direct route navigation attempts for unauthorized roles', () => {
      // Editor directly typing /audit-logs in URL bar
      expect(canAccessRoute('editor', '/audit-logs')).toBe(false);
      expect(canAccessRoute('editor', '/users')).toBe(false);
      expect(canAccessRoute('editor', '/reviews')).toBe(false);

      // Reviewer directly typing /questions in URL bar
      expect(canAccessRoute('reviewer', '/questions')).toBe(false);
      expect(canAccessRoute('reviewer', '/imports')).toBe(false);
      expect(canAccessRoute('reviewer', '/audit-logs')).toBe(false);

      // Student directly typing any admin path
      expect(canAccessRoute('student', '/')).toBe(false);
      expect(canAccessRoute('student', '/questions')).toBe(false);
      expect(canAccessRoute('student', '/exams')).toBe(false);
    });
  });
});
