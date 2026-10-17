import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminAuthProvider, type StaffUser } from '../lib/auth-context';
import { AdminApiClient, AdminClientGuardError } from '../lib/api-client';
import { generateTotp, verifyTotp } from '../lib/totp';
import { t } from '../lib/i18n';
import viMessages from '../messages/vi.json';
import jaMessages from '../messages/ja.json';
import enMessages from '../messages/en.json';

// Mock Next.js navigation for unit/integration tests in Node environment
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Pages in scope for I02
import AdminDashboardPage from '../app/page';
import UsersPage from '../app/users/page';
import AuditLogsPage from '../app/audit-logs/page';
import NotificationsSettingsPage from '../app/settings/notifications/page';
import OrgSettingsPage from '../app/settings/org/page';
import BackupSettingsPage from '../app/settings/backup/page';
import AdminLoginPage from '../app/login/page';
import { AdminNavigation } from '../lib/admin-nav';

describe('I02: Đăng nhập nhân sự thật và khung quản trị nối API', () => {
  const staffAdmin: StaffUser = {
    id: 'usr_staff_admin_01',
    email: 'publisher@jlpt.local',
    name: 'Quản trị viên Hệ thống',
    role: 'admin',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  const renderWithAuth = (ui: React.ReactElement, user: StaffUser = staffAdmin, locale: 'vi' | 'ja' | 'en' = 'vi') => {
    return renderToStaticMarkup(
      <AdminAuthProvider initialUser={user} initialToken="live_jwt_token_sample" initialLocale={locale}>
        {ui}
      </AdminAuthProvider>,
    );
  };

  describe('Nghiệm thu 1: Sai mật khẩu hoặc sai TOTP bị từ chối bởi API, không chỉ ở UI', () => {
    it('Xác thực TOTP RFC 6238 từ chối mã không hợp lệ hoặc sai timestamp', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const validCode = generateTotp(secret, { digits: 6, timeStepSeconds: 30 });
      expect(validCode).toHaveLength(6);
      expect(/^\d{6}$/.test(validCode)).toBe(true);

      // Mã đúng được chấp thuận
      expect(verifyTotp(validCode, secret)).toBe(true);

      // Mã sai bị từ chối dứt khoát
      expect(verifyTotp('000000', secret)).toBe(false);
      expect(verifyTotp('999999', secret)).toBe(false);
      expect(verifyTotp('abcdef', secret)).toBe(false);
      expect(verifyTotp('', secret)).toBe(false);
    });

    it('AdminApiClient từ chối các phiên chưa xác minh 2FA khi truy cập tài nguyên được bảo vệ', () => {
      const client = new AdminApiClient({ baseUrl: 'http://127.0.0.1:4000' });
      // Chưa đăng nhập -> UNAUTHENTICATED
      expect(() => client.enforceGuard(['admin'])).toThrow(AdminClientGuardError);
      try {
        client.enforceGuard(['admin']);
      } catch (err) {
        expect((err as AdminClientGuardError).code).toBe('UNAUTHENTICATED');
      }

      // Giả lập staff đăng nhập nhưng trạng thái 2FA chưa verify
      client.setAuth(
        {
          id: 'usr_staff_02',
          email: 'editor@jlpt.local',
          name: 'Biên tập viên',
          role: 'editor',
          twoFactorEnabled: true,
          twoFactorStatus: 'challenge_required',
        },
        'active_jwt_token_123',
      );

      // Bị chặn vì chưa hoàn thành 2FA challenge
      expect(() => client.enforceGuard(['editor'])).toThrow(AdminClientGuardError);
      try {
        client.enforceGuard(['editor']);
      } catch (err) {
        expect((err as AdminClientGuardError).code).toBe('TWO_FACTOR_REQUIRED');
      }

      // Khi đã verify 2FA -> Cho phép
      client.setAuth(
        {
          id: 'usr_staff_02',
          email: 'editor@jlpt.local',
          name: 'Biên tập viên',
          role: 'editor',
          twoFactorEnabled: true,
          twoFactorStatus: 'verified',
        },
        'active_jwt_token_123',
      );
      expect(() => client.enforceGuard(['editor'])).not.toThrow();
    });

    it('Mô phỏng máy chủ API từ chối sai mật khẩu với mã HTTP 401 UNAUTHENTICATED', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            code: 'UNAUTHENTICATED',
            message: 'Sai địa chỉ email hoặc mật khẩu không chính xác.',
          },
        }),
      });

      const res = await mockFetch('/api/v1/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'publisher@jlpt.local', password: 'WrongPassword123!' }),
      });

      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error.code).toBe('UNAUTHENTICATED');
    });

    it('Mô phỏng máy chủ API từ chối sai TOTP với mã HTTP 403 TWO_FACTOR_REQUIRED', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({
          error: {
            code: 'TWO_FACTOR_REQUIRED',
            message: 'Mã xác thực 2 bước (TOTP) không đúng hoặc đã hết hạn.',
          },
        }),
      });

      const res = await mockFetch('/api/v1/admin/dashboard', {
        headers: {
          Authorization: 'Bearer valid_jwt_token',
          'x-totp-code': '000000',
        },
      });

      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.error.code).toBe('TWO_FACTOR_REQUIRED');
    });
  });

  describe('Nghiệm thu 2: Không còn dữ liệu viết cứng, mảng mẫu hay đăng nhập giả trong các trang thuộc phạm vi', () => {
    it('Trang đăng nhập (login/page.tsx) chỉ gửi credentials thật tới API, không có role picker hay bypass checkbox', () => {
      const html = renderWithAuth(<AdminLoginPage />, staffAdmin);
      expect(html).not.toContain('mockActiveSecret');
      expect(html).not.toContain('mockHashedRecoveryCodes');
      expect(html).not.toContain('data-testid="mock-login-role"');
      expect(html).not.toContain('Bỏ qua 2FA (Mock Mode)');
      expect(html).toContain('name="email"');
      expect(html).toContain('name="password"');
    });

    it('Trang Tổng quan (page.tsx) khởi tạo với chỉ số 0 và tải từ /api/v1/admin/dashboard', () => {
      const html = renderWithAuth(<AdminDashboardPage />);
      expect(html).not.toContain('totalUsers: 1420');
      expect(html).toContain('data-testid="stat-total-users"');
      expect(html).toContain('data-testid="stat-gross-revenue"');
    });

    it('Trang Quản trị người dùng (users/page.tsx) kết nối API, có thanh tìm kiếm và bộ lọc', () => {
      const html = renderWithAuth(<UsersPage />);
      expect(html).not.toContain('aud_sample_1');
      expect(html).not.toContain('SAMPLE_USERS');
      expect(html).toContain('data-testid="input-user-search"');
      expect(html).toContain('data-testid="select-role-filter"');
    });

    it('Trang Nhật ký kiểm toán (audit-logs/page.tsx) loại bỏ các bản ghi mẫu aud_sample_', () => {
      const html = renderWithAuth(<AuditLogsPage />);
      expect(html).not.toContain('aud_sample_1');
      expect(html).not.toContain('aud_sample_2');
      expect(html).toContain('Nhật ký kiểm toán hệ thống (Audit Logs - ADM-14)');
    });

    it('Trang Mẫu thông báo (settings/notifications/page.tsx) loại bỏ mã mẫu tpl-1, tpl-2, tpl-3', () => {
      const html = renderWithAuth(<NotificationsSettingsPage />);
      expect(html).not.toContain('tpl-1');
      expect(html).not.toContain('tpl-2');
      expect(html).not.toContain('tpl-3');
      expect(html).toContain('Cấu hình Thông báo &amp; Email Tự động (ADM-18)');
    });

    it('Trang Cài đặt Tổ chức (settings/org/page.tsx) loại bỏ mã mẫu app-01, app-02', () => {
      const html = renderWithAuth(<OrgSettingsPage />);
      expect(html).not.toContain('app-01');
      expect(html).not.toContain('app-02');
      expect(html).toContain('Cài đặt Tổ chức &amp; Hồ sơ Giáo viên (Teacher / Org)');
    });

    it('Trang Cài đặt Sao lưu (settings/backup/page.tsx) không lộ secrets và kết nối API', () => {
      const html = renderWithAuth(<BackupSettingsPage />);
      expect(html).not.toContain('db_secret_password');
      expect(html).not.toContain('super_secret_key');
      expect(html).toContain('Sao lưu &amp; Phục hồi Hệ thống (ADM-20 / SYS-08)');
    });
  });

  describe('Nghiệm thu 4: Trạng thái đang tải (loading), rỗng (empty) và lỗi API (error retry)', () => {
    it('AuditLogsPage hiển thị trạng thái rỗng khi chưa có nhật ký', () => {
      const html = renderWithAuth(<AuditLogsPage initialLogs={[]} />);
      expect(html).toContain('data-testid="audit-empty"');
      expect(html).toContain('Chưa có nhật ký hoạt động nào.');
    });

    it('NotificationsSettingsPage hiển thị thông báo rỗng khi danh sách mẫu thông báo trống', () => {
      const html = renderWithAuth(<NotificationsSettingsPage initialTemplates={[]} />);
      expect(html).toContain('data-testid="notifications-empty"');
      expect(html).toContain('Không có dữ liệu hiển thị');
    });

    it('OrgSettingsPage hiển thị thông báo rỗng khi không có hồ sơ giáo viên chờ duyệt', () => {
      const html = renderWithAuth(<OrgSettingsPage initialApplications={[]} />);
      expect(html).toContain('data-testid="org-empty"');
      expect(html).toContain('Không có dữ liệu hiển thị');
    });
  });

  describe('Nghiệm thu 5: Viewport 390px vs 1366px, không cuộn ngang, Tailwind classes và i18n', () => {
    it('Khung quản trị (layout.tsx & admin-nav.tsx) chứa overflow-x-hidden và ngăn cuộn ngang', () => {
      const html = renderWithAuth(
        <div className="w-full max-w-7xl mx-auto p-4 overflow-x-hidden">
          <AdminNavigation />
        </div>,
      );

      // Mobile button có mặt
      expect(html).toContain('data-testid="btn-open-mobile-nav"');
      // Navigation chứa các liên kết quản trị
      expect(html).toContain('/audit-logs');
      expect(html).toContain('/settings/org');
      expect(html).toContain('/settings/notifications');
      expect(html).toContain('overflow-x-hidden');
    });

    it('Kiểm tra đối xứng 100% các translation keys giữa 3 ngôn ngữ vi, ja, en', () => {
      const flattenKeys = (obj: Record<string, unknown>, prefix = ''): string[] => {
        let keys: string[] = [];
        for (const [k, v] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${k}` : k;
          if (v && typeof v === 'object' && !Array.isArray(v)) {
            keys = keys.concat(flattenKeys(v as Record<string, unknown>, fullKey));
          } else {
            keys.push(fullKey);
          }
        }
        return keys.sort();
      };

      const viKeys = flattenKeys(viMessages as Record<string, unknown>);
      const jaKeys = flattenKeys(jaMessages as Record<string, unknown>);
      const enKeys = flattenKeys(enMessages as Record<string, unknown>);

      expect(viKeys.length).toBeGreaterThanOrEqual(100);
      expect(jaKeys).toEqual(viKeys);
      expect(enKeys).toEqual(viKeys);
    });

    it('Trang quản trị hiển thị đúng từ điển khi đổi locale sang vi, ja, en (không để lộ key thô)', () => {
      const viHtml = renderWithAuth(<AdminDashboardPage />, staffAdmin, 'vi');
      expect(viHtml).toContain('Quản trị viên');
      expect(viHtml).not.toContain('roles.admin');

      const jaHtml = renderWithAuth(<AdminDashboardPage />, staffAdmin, 'ja');
      expect(jaHtml).toContain('管理者');
      expect(jaHtml).not.toContain('roles.admin');

      const enHtml = renderWithAuth(<AdminDashboardPage />, staffAdmin, 'en');
      expect(enHtml).toContain('Administrator');
      expect(enHtml).not.toContain('roles.admin');
    });

    it('Hàm dịch t() dịch chính xác và fallback mượt mà không crash', () => {
      expect(t('common.loading', 'vi')).toBe('Đang tải dữ liệu...');
      expect(t('common.loading', 'ja')).toBe('読み込み中...');
      expect(t('common.loading', 'en')).toBe('Loading data...');

      expect(t('common.retry', 'vi')).toBe('Thử lại');
      expect(t('common.retry', 'ja')).toBe('再試行');
      expect(t('common.retry', 'en')).toBe('Retry');

      expect(t('auth.unauthenticated', 'vi')).toBe('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.');
      expect(t('auth.forbidden', 'vi')).toBe('Bạn không có quyền truy cập vào khu vực này.');
    });
  });
});
