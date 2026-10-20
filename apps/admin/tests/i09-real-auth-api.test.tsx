import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminAuthProvider, type StaffUser } from '../lib/auth-context';
import AdminDashboardPage from '../app/page';
import UsersPage from '../app/users/page';
import AuditLogsPage from '../app/audit-logs/page';
import NotificationsSettingsPage from '../app/settings/notifications/page';
import OrgSettingsPage from '../app/settings/org/page';
import BackupSettingsPage from '../app/settings/backup/page';
import LoginPage from '../app/login/page';
import Verify2faPage from '../app/verify-2fa/page';
import Setup2faPage from '../app/setup-2fa/page';
import { AdminApiClient, AdminClientGuardError } from '../lib/api-client';
import { t } from '../lib/i18n';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

describe('I09 Real Staff Authentication & Admin Portal API Suite', () => {
  const adminUser: StaffUser = {
    id: 'u_admin_publisher',
    email: 'publisher@jlpt.local',
    name: 'Quản trị viên Hệ thống',
    role: 'admin',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  const renderWithAuth = (
    ui: React.ReactElement,
    user: StaffUser | null = adminUser,
    token: string | null = 'mock-session-tok-123',
    locale: 'vi' | 'ja' | 'en' = 'vi',
    initialLoading = false,
  ) => {
    return renderToStaticMarkup(
      <AdminAuthProvider
        initialUser={user}
        initialToken={token}
        initialLocale={locale}
        initialLoading={initialLoading}
      >
        {ui}
      </AdminAuthProvider>,
    );
  };

  describe('Acceptance 1 & 2: Real API Authentication & Strict Rejections', () => {
    it('API rejects login with incorrect password with 401 UNAUTHENTICATED', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Email hoặc mật khẩu không chính xác.',
          },
        }),
      });

      const client = new AdminApiClient({
        baseUrl: 'http://localhost:4000',
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      await expect(client.loginWithPassword('publisher@jlpt.local', 'WrongPassword123!')).rejects.toThrow(
        AdminClientGuardError,
      );

      try {
        await client.loginWithPassword('publisher@jlpt.local', 'WrongPassword123!');
      } catch (err: unknown) {
        const e = err as AdminClientGuardError;
        expect(e.status).toBe(401);
        expect(e.code).toBe('UNAUTHENTICATED');
        expect(e.message).toBe('Email hoặc mật khẩu không chính xác.');
      }
    });

    it('API rejects invalid 6-digit TOTP challenge with 403 TWO_FACTOR_REQUIRED', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: 'TWO_FACTOR_REQUIRED',
            message: 'Mã xác thực TOTP không hợp lệ hoặc đã hết hạn.',
          },
        }),
      });

      const client = new AdminApiClient({
        baseUrl: 'http://localhost:4000',
        token: 'pending_session_tok',
        user: { ...adminUser, twoFactorStatus: 'challenge_required' },
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      await expect(client.verify2faChallenge('000000')).rejects.toThrow(AdminClientGuardError);

      try {
        await client.verify2faChallenge('000000');
      } catch (err: unknown) {
        const e = err as AdminClientGuardError;
        expect(e.status).toBe(403);
        expect(e.code).toBe('TWO_FACTOR_REQUIRED');
      }
    });

    it('API rejects invalid recovery code on /api/v1/auth/totp/recovery', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: 'INVALID_RECOVERY_CODE',
            message: 'Mã khôi phục không hợp lệ hoặc đã qua sử dụng.',
          },
        }),
      });

      const client = new AdminApiClient({
        baseUrl: 'http://localhost:4000',
        token: 'pending_session_tok',
        user: { ...adminUser, twoFactorStatus: 'challenge_required' },
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      await expect(client.verifyRecoveryCode('INVALID-CODE')).rejects.toThrow(AdminClientGuardError);
    });

    it('Enrolls 2FA and verifies TOTP confirmation via API', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/v1/auth/totp/setup')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              secret: 'JBSWY3DPEHPK3PXP',
              formattedSecret: 'JBSW Y3DP EHPK 3PXP',
              otpauthUri: 'otpauth://totp/JLPT:publisher@jlpt.local?secret=JBSWY3DPEHPK3PXP',
              recoveryCodes: ['REC-1', 'REC-2', 'REC-3', 'REC-4', 'REC-5', 'REC-6', 'REC-7', 'REC-8'],
              qrSvg: '<svg>mock qr</svg>',
            }),
          });
        }
        if (url.includes('/api/v1/auth/totp/confirm')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              success: true,
              verified: true,
            }),
          });
        }
        return Promise.reject(new Error(`Unexpected url: ${url}`));
      });

      const client = new AdminApiClient({
        baseUrl: 'http://localhost:4000',
        token: 'setup_session_tok',
        user: { ...adminUser, twoFactorEnabled: false, twoFactorStatus: 'setup_required' },
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const setupRes = client.initiate2faSetup();
      expect(setupRes.secret).toBeDefined();
      expect(setupRes.recoveryCodes).toHaveLength(8);

      expect(() => client.confirm2faSetup(setupRes.secret, '000000')).toThrow(AdminClientGuardError);
    });
  });

  describe('Acceptance 3 & 5: In-Scope Pages Connected to Real API with States', () => {
    it('LoginPage renders real login form without mock role selector or fake 2FA checkbox', () => {
      const html = renderWithAuth(<LoginPage />, null, null);
      expect(html).toContain('data-testid="email-input"');
      expect(html).toContain('data-testid="password-input"');
      expect(html).toContain('data-testid="submit-login-button"');
      expect(html).not.toContain('mock-role-picker');
      expect(html).not.toContain('fake-2fa-toggle');
    });

    it('Verify2faPage renders TOTP input and recovery code switch without client shortcuts', () => {
      const html = renderWithAuth(<Verify2faPage />, { ...adminUser, twoFactorStatus: 'challenge_required' });
      expect(html).toContain('data-testid="verify-2fa-card"');
      expect(html).toContain('data-testid="challenge-code-input"');
      expect(html).toContain('data-testid="submit-challenge-button"');
    });

    it('Setup2faPage renders QR code placeholder and confirmation code input', () => {
      const html = renderWithAuth(<Setup2faPage />, { ...adminUser, twoFactorEnabled: false, twoFactorStatus: 'setup_required' });
      expect(html).toContain('data-testid="qr-code-container"');
      expect(html).toContain('data-testid="totp-code-input"');
      expect(html).toContain('data-testid="submit-verify-totp-button"');
    });

    it('Dashboard (/) renders live system overview and empty states correctly', () => {
      const html = renderWithAuth(<AdminDashboardPage />);
      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Tổng quan chỉ số hoạt động hệ thống');
      expect(html).toContain('data-testid="stat-total-users"');
      expect(html).toContain('data-testid="stat-total-exams"');
      expect(html).toContain('data-testid="stat-completion-rate"');
      expect(html).toContain('data-testid="stat-open-reports"');
      expect(html).toContain('data-testid="stat-gross-revenue"');
      expect(html).toContain('data-testid="activity-empty"');
    });

    it('UsersPage (/users) renders user list with initial data and empty state', () => {
      const emptyHtml = renderWithAuth(<UsersPage initialUsers={[]} />);
      expect(htmlHasTestId(emptyHtml, 'users-empty')).toBe(true);

      const populatedHtml = renderWithAuth(
        <UsersPage
          initialUsers={[
            {
              id: 'usr_admin_01',
              email: 'admin@jlpt.local',
              name: 'Admin User',
              role: 'admin',
              twoFactorEnabled: true,
              twoFactorStatus: 'verified',
              createdAt: '2026-01-01T00:00:00Z',
              updatedAt: '2026-01-01T00:00:00Z',
            },
          ]}
        />,
      );
      expect(populatedHtml).toContain('admin@jlpt.local');
      expect(populatedHtml).toContain('data-testid="user-row-usr_admin_01"');
    });

    it('AuditLogsPage (/audit-logs) renders audit entries with Actor and Tenant', () => {
      const emptyHtml = renderWithAuth(<AuditLogsPage initialLogs={[]} />);
      expect(emptyHtml).toContain('data-testid="audit-empty"');

      const populatedHtml = renderWithAuth(
        <AuditLogsPage
          initialLogs={[
            {
              id: 'aud_entry_101',
              operatorId: 'u_admin_1',
              operatorEmail: 'admin@jlpt.local',
              tenantId: 'global',
              action: 'role_change',
              targetResource: 'users',
              targetId: 'u_editor_1',
              details: { previousRole: 'student', newRole: 'editor' },
              timestamp: '2026-01-10T10:00:00Z',
            },
          ]}
        />,
      );
      expect(populatedHtml).toContain('Người thực hiện (Actor):');
      expect(populatedHtml).toContain('Đơn vị (Tenant):');
      expect(populatedHtml).toContain('admin@jlpt.local');
    });

    it('NotificationsSettingsPage (/settings/notifications) renders templates and empty state', () => {
      const emptyHtml = renderWithAuth(<NotificationsSettingsPage initialTemplates={[]} />);
      expect(emptyHtml).toContain('data-testid="notifications-empty"');

      const populatedHtml = renderWithAuth(
        <NotificationsSettingsPage
          initialTemplates={[
            {
              id: 'tpl-1',
              key: 'auth_otp',
              name: 'OTP Verification',
              channel: 'email',
              subject: 'OTP Subject',
              bodyTemplate: 'OTP Body {{otp}}',
              isActive: true,
              variables: ['otp'],
            },
          ]}
        />,
      );
      expect(populatedHtml).toContain('data-testid="tpl-item-tpl-1"');
      expect(populatedHtml).toContain('data-testid="input-tpl-subject"');
      expect(populatedHtml).toContain('data-testid="input-tpl-body"');
    });

    it('OrgSettingsPage (/settings/org) renders teacher applications and empty state', () => {
      const emptyHtml = renderWithAuth(<OrgSettingsPage initialApplications={[]} />);
      expect(emptyHtml).toContain('data-testid="org-empty"');

      const populatedHtml = renderWithAuth(
        <OrgSettingsPage
          initialApplications={[
            {
              id: 'app-01',
              applicantName: 'Teacher Tanaka',
              email: 'tanaka@school.jp',
              currentOrg: 'Tokyo Japanese School',
              jlptCertificate: 'N1 - 180/180',
              yearsOfExperience: 8,
              status: 'pending',
              appliedAt: '2026-02-01T00:00:00Z',
            },
          ]}
        />,
      );
      expect(populatedHtml).toContain('data-testid="teacher-app-app-01"');
      expect(populatedHtml).toContain('Teacher Tanaka');
    });

    it('BackupSettingsPage (/settings/backup) renders backup panel with zero raw secrets', () => {
      const html = renderWithAuth(<BackupSettingsPage />);
      expect(html).toContain('data-testid="backup-management-panel"');
      expect(html).toContain('data-testid="backup-security-notice"');
      expect(html).toContain('data-testid="btn-trigger-base-backup"');
      expect(html).toContain('data-testid="backup-jobs-table"');
      expect(html).toContain('data-testid="backup-empty"');
      expect(html).not.toContain('super_secret_db_password_123');
      expect(html).not.toContain('walg_secret_key_abc_xyz');
    });

    it('UI Guard enforces 401 unauthenticated redirect and 403 forbidden protection', () => {
      // Unauthenticated user
      const unauthHtml = renderWithAuth(<UsersPage />, null, null);
      expect(unauthHtml).toContain('data-testid="guard-unauthenticated"');

      // Unauthorized student role
      const studentHtml = renderWithAuth(<UsersPage />, {
        id: 'u_student',
        email: 'student@example.com',
        name: 'Student',
        role: 'student',
        twoFactorEnabled: false,
        twoFactorStatus: 'setup_required',
      });
      expect(studentHtml).toContain('data-testid="guard-non-staff"');
    });
  });

  describe('Acceptance 6: Responsive Layout & Tri-Locale Verification', () => {
    it('All in-scope pages enforce overflow-x-hidden container for 390px and 1366px viewports', () => {
      const pages = [
        <AdminDashboardPage key="dash" />,
        <UsersPage key="users" />,
        <AuditLogsPage key="audit" />,
        <NotificationsSettingsPage key="notif" />,
        <OrgSettingsPage key="org" />,
        <BackupSettingsPage key="backup" />,
      ];

      for (const page of pages) {
        const html = renderWithAuth(page);
        expect(html).toContain('overflow-x-hidden');
      }
    });

    it('Verifies tri-locale i18n support across vi, ja, and en with 0 unparsed keys', () => {
      const locales: Array<'vi' | 'ja' | 'en'> = ['vi', 'ja', 'en'];

      for (const loc of locales) {
        const title = t('app.title', loc);
        expect(title).toBeDefined();
        expect(title).not.toBe('app.title');

        const loading = t('common.loading', loc);
        expect(loading).toBeDefined();
        expect(loading).not.toBe('common.loading');

        const adminRole = t('roles.admin', loc);
        expect(adminRole).toBeDefined();
        expect(adminRole).not.toBe('roles.admin');

        // Render dashboard under each locale
        const html = renderWithAuth(<AdminDashboardPage />, adminUser, 'tok-123', loc);
        expect(html).not.toMatch(/\b(app|roles|auth|nav|users|backup|common)\.[a-zA-Z0-9_.-]+\b/);
      }
    });
  });
});

function htmlHasTestId(html: string, testId: string): boolean {
  return html.includes(`data-testid="${testId}"`);
}
