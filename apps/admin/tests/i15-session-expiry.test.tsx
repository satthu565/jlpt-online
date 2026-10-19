import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminAuthProvider, useAdminAuth, type StaffUser } from '../lib/auth-context';
import { AdminApiClient, AdminClientGuardError } from '../lib/api-client';
import StaffLoginPage from '../app/login/page';
import { AdminGuard } from '../lib/ui-guard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

describe('I15: Admin Session Expiration and Login Redirection', () => {
  const sampleAdmin: StaffUser = {
    id: 'u_admin_1',
    email: 'publisher@jlpt.local',
    name: 'Admin Staff',
    role: 'admin',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('1. useAdminAuth guard behavior', () => {
    it('strictly throws an informative error when used outside AdminAuthProvider', () => {
      function ConsumerOutsideProvider() {
        useAdminAuth();
        return null;
      }

      expect(() => renderToStaticMarkup(<ConsumerOutsideProvider />)).toThrow(
        'useAdminAuth must be used within an AdminAuthProvider',
      );
    });

    it('returns valid context when used within AdminAuthProvider', () => {
      let authUserEmail: string | undefined;
      let isAuthenticated = false;
      function ConsumerInsideProvider() {
        const ctx = useAdminAuth();
        authUserEmail = ctx.user?.email;
        isAuthenticated = ctx.isAuthenticated;
        return <div>Inside</div>;
      }

      renderToStaticMarkup(
        <AdminAuthProvider initialUser={sampleAdmin} initialToken="tok-123">
          <ConsumerInsideProvider />
        </AdminAuthProvider>,
      );

      expect(authUserEmail).toBe('publisher@jlpt.local');
      expect(isAuthenticated).toBe(true);
    });
  });

  describe('2. AdminApiClient 401 onUnauthorized callback integration', () => {
    it('AdminApiClient triggers onUnauthorized callback when API responds with 401', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { code: 'UNAUTHENTICATED', message: 'Phiên hết hạn.' } }),
      });

      const client = new AdminApiClient({
        baseUrl: 'http://localhost:4000',
        fetchFn: mockFetch as unknown as typeof fetch,
        token: 'tok-123',
        user: sampleAdmin,
      });

      const onUnauthorized = vi.fn();
      client.setOnUnauthorized(onUnauthorized);

      await expect(client.request('GET', '/api/v1/admin/users')).rejects.toThrow(AdminClientGuardError);
      expect(onUnauthorized).toHaveBeenCalledTimes(1);
    });

    it('AdminApiClient does NOT trigger onUnauthorized on non-401 responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: { code: 'FORBIDDEN', message: 'Không có quyền.' } }),
      });

      const client = new AdminApiClient({
        baseUrl: 'http://localhost:4000',
        fetchFn: mockFetch as unknown as typeof fetch,
        token: 'tok-123',
        user: sampleAdmin,
      });

      const onUnauthorized = vi.fn();
      client.setOnUnauthorized(onUnauthorized);

      await expect(client.request('GET', '/api/v1/admin/users')).rejects.toThrow(AdminClientGuardError);
      expect(onUnauthorized).not.toHaveBeenCalled();
    });
  });

  describe('3. UI Guard and Login View behavior on expired session', () => {
    it('AdminGuard renders unauthenticated alert with login link when user is null', () => {
      const html = renderToStaticMarkup(
        <AdminAuthProvider initialUser={null} initialToken={null} initialLoading={false}>
          <AdminGuard>
            <div data-testid="protected-content">Secret Content</div>
          </AdminGuard>
        </AdminAuthProvider>,
      );

      expect(html).toContain('data-testid="guard-unauthenticated"');
      expect(html).toContain('/login');
      expect(html).not.toContain('Secret Content');
    });

    it('StaffLoginPage renders login card, inputs, and submit button', () => {
      const html = renderToStaticMarkup(
        <AdminAuthProvider initialUser={null} initialToken={null}>
          <StaffLoginPage />
        </AdminAuthProvider>,
      );

      expect(html).toContain('data-testid="login-card"');
      expect(html).toContain('data-testid="email-input"');
      expect(html).toContain('data-testid="password-input"');
      expect(html).toContain('data-testid="submit-login-button"');
    });
  });
});
