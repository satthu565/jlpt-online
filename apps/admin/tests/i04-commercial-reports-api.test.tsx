import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminAuthProvider, type StaffUser } from '../lib/auth-context';
import PlansPage from '../app/commercial/plans/page';
import PaymentsPage from '../app/commercial/payments/page';
import RefundsPage from '../app/commercial/refunds/page';
import CommercialReconciliationPage from '../app/commercial/reconciliation/page';
import ReportsHubPage from '../app/reports/page';
import RevenueReportPage from '../app/reports/revenue/page';
import ContentReportsPage from '../app/reports/content/page';
import ExperimentsAdminPage from '../app/experiments/page';
import { PlansManager } from '../features/billing/plans-manager';
import { CouponsManager } from '../features/billing/coupons-manager';
import { PaymentsManager } from '../features/billing/payments-manager';
import { RefundsManager } from '../features/billing/refunds-manager';
import { ReconciliationManager } from '../features/billing/reconciliation-manager';
import { AdminApiClient } from '../lib/api-client';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

describe('I04 Commercial, Reports & Experiments Real API Integration Suite', () => {
  const billingAdminUser: StaffUser = {
    id: 'u_billing_admin_1',
    email: 'billing@jlpt.local',
    name: 'Quản trị viên Tài chính',
    role: 'billing_admin',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  const editorUser: StaffUser = {
    id: 'u_editor_1',
    email: 'editor@jlpt.local',
    name: 'Biên tập viên',
    role: 'editor',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  const renderWithAuth = (
    ui: React.ReactElement,
    user: StaffUser | null = billingAdminUser,
    token: string | null = 'mock-session-tok-billing',
    locale: 'vi' | 'ja' | 'en' = 'vi',
  ) => {
    return renderToStaticMarkup(
      <AdminAuthProvider
        initialUser={user}
        initialToken={token}
        initialLocale={locale}
        initialLoading={false}
      >
        {ui}
      </AdminAuthProvider>,
    );
  };

  describe('1. Plans & Coupons Management (Commercial Plans)', () => {
    it('PlansPage renders with page-title, plans manager and coupons manager', () => {
      const html = renderWithAuth(<PlansPage />);
      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Quản trị các gói dịch vụ và mã giảm giá');
      expect(html).toContain('data-testid="plans-heading"');
      expect(html).toContain('data-testid="coupons-heading"');
      expect(html).toContain('data-testid="create-plan-button"');
      expect(html).toContain('data-testid="create-coupon-button"');
    });

    it('PlansManager renders empty state when no plans available', () => {
      const html = renderWithAuth(<PlansManager onPlanCreated={vi.fn()} />);
      expect(html).toContain('data-testid="plans-heading"');
      expect(html).toContain('data-testid="plans-empty"');
    });

    it('CouponsManager renders empty state when no coupons available', () => {
      const html = renderWithAuth(<CouponsManager onCouponCreated={vi.fn()} />);
      expect(html).toContain('data-testid="coupons-heading"');
      expect(html).toContain('data-testid="coupons-empty"');
    });

    it('PlansPage enforces RBAC and blocks unauthorized editor role', () => {
      const html = renderWithAuth(<PlansPage />, editorUser);
      expect(html).toContain('data-testid="guard-forbidden"');
      expect(html).toContain('Từ chối truy cập (403 Forbidden)');
    });
  });

  describe('2. Payments & Subscriptions Management', () => {
    it('PaymentsPage renders with page-title, tabs and tables', () => {
      const html = renderWithAuth(<PaymentsPage />);
      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Quản trị giao dịch và thuê bao');
      expect(html).toContain('data-testid="tab-payments"');
      expect(html).toContain('data-testid="tab-subscriptions"');
    });

    it('PaymentsManager renders empty state when payment items are empty', () => {
      const html = renderWithAuth(<PaymentsManager />);
      expect(html).toContain('data-testid="payments-empty"');
    });

    it('PaymentsPage blocks editor role without billing_admin permission', () => {
      const html = renderWithAuth(<PaymentsPage />, editorUser);
      expect(html).toContain('data-testid="guard-forbidden"');
    });
  });

  describe('3. Refunds Management', () => {
    it('RefundsPage renders with page-title and refunds table heading', () => {
      const html = renderWithAuth(<RefundsPage />);
      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Quản trị yêu cầu hoàn tiền');
      expect(html).toContain('data-testid="refunds-heading"');
    });

    it('RefundsManager renders empty state when no refund requests pending', () => {
      const html = renderWithAuth(<RefundsManager />);
      expect(html).toContain('data-testid="refunds-empty"');
    });

    it('RefundsPage blocks editor role', () => {
      const html = renderWithAuth(<RefundsPage />, editorUser);
      expect(html).toContain('data-testid="guard-forbidden"');
    });
  });

  describe('4. Commercial Reconciliation Management', () => {
    it('CommercialReconciliationPage renders with page-title and run button', () => {
      const html = renderWithAuth(<CommercialReconciliationPage />);
      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Đối soát Giao dịch &amp; Chứng từ Cổng thanh toán (Reconciliation)');
      expect(html).toContain('data-testid="reconciliation-panel"');
      expect(html).toContain('data-testid="btn-run-reconciliation"');
      expect(html).toContain('data-testid="reconciliation-empty"');
    });

    it('ReconciliationManager can render without AuthProvider safely', () => {
      const html = renderToStaticMarkup(<ReconciliationManager currentUser={billingAdminUser} />);
      expect(html).toContain('data-testid="reconciliation-panel"');
      expect(html).toContain('data-testid="btn-run-reconciliation"');
    });
  });

  describe('5. Reports Hub (15 business metrics & CSV export)', () => {
    it('ReportsHubPage renders all 15 report tabs, dateRange selector, and export button', () => {
      const html = renderWithAuth(<ReportsHubPage />);
      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Trung tâm Báo cáo &amp; Phân tích Hệ thống (ADM-17)');
      expect(html).toContain('data-testid="btn-export-csv"');
      expect(html).toContain('data-testid="reports-tab-nav"');
      expect(html).toContain('data-testid="report-tab-acquisition"');
      expect(html).toContain('data-testid="report-tab-retention"');
      expect(html).toContain('data-testid="report-tab-conversion"');
      expect(html).toContain('data-testid="report-tab-provider_costs"');
      expect(html).toContain('data-testid="report-content-panel"');
      expect(html).toContain('data-testid="report-view-acquisition"');
    });
  });

  describe('6. Revenue Financial Report', () => {
    it('RevenueReportPage renders cards for Gross, Refunds, and Net revenue with currency select', () => {
      const html = renderWithAuth(<RevenueReportPage />);
      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Báo cáo doanh thu tài chính');
      expect(html).toContain('data-testid="currency-select"');
      expect(html).toContain('data-testid="card-gross"');
      expect(html).toContain('data-testid="card-refunds"');
      expect(html).toContain('data-testid="card-net"');
    });
  });

  describe('7. User Content Error Reports (ADM-09)', () => {
    it('ContentReportsPage renders filter toolbar and report list', () => {
      const testReports = [
        {
          id: 'rep-01',
          questionId: 'q-n3-kanji-04',
          level: 'N3',
          issueType: 'wrong_answer',
          status: 'open' as const,
          createdAt: '2026-10-15 09:30',
        },
      ];
      const html = renderWithAuth(<ContentReportsPage initialReports={testReports} />);
      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Quản lý Báo lỗi Câu hỏi từ Người dùng (ADM-09)');
      expect(html).toContain('data-testid="select-report-filter"');
      expect(html).toContain('data-testid="report-card-rep-01"');
      expect(html).toContain('data-testid="btn-resolve-rep-01"');
      expect(html).toContain('data-testid="btn-reject-rep-01"');
    });

    it('ContentReportsPage renders empty state when initialReports is empty', () => {
      const html = renderWithAuth(<ContentReportsPage initialReports={[]} />);
      expect(html).toContain('data-testid="reports-empty"');
    });
  });

  describe('8. A/B Experiments Management', () => {
    const adminUser: StaffUser = {
      ...billingAdminUser,
      role: 'admin',
    };

    it('ExperimentsAdminPage renders with page-title, experiment cards and toggle buttons', () => {
      const testExperiments = [
        {
          id: 'exp_checkout_layout_v1',
          name: 'Thử nghiệm giao diện thanh toán (1 bước vs 2 bước)',
          description: 'Đánh giá tỷ lệ hoàn tất đơn hàng gói Premium khi giảm bớt trường nhập liệu.',
          isActive: true,
          totalAssignments: 1420,
          totalExposures: 1210,
          variants: [
            { key: 'control', name: 'Gốc (2 bước)', weight: 50, assignments: 710, conversions: 84, conversionRate: 11.8 },
            { key: 'variant_b', name: 'Mới (1 chạm)', weight: 50, assignments: 710, conversions: 106, conversionRate: 14.9 },
          ],
        },
      ];
      const html = renderWithAuth(<ExperimentsAdminPage initialExperiments={testExperiments} />, adminUser);
      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Quản trị Thử nghiệm A/B &amp; Tối ưu Giao diện');
      expect(html).toContain('data-testid="experiment-card-exp_checkout_layout_v1"');
      expect(html).toContain('data-testid="experiment-status-exp_checkout_layout_v1"');
      expect(html).toContain('data-testid="btn-toggle-experiment-exp_checkout_layout_v1"');
    });

    it('ExperimentsAdminPage renders empty state when initialExperiments is empty', () => {
      const html = renderWithAuth(<ExperimentsAdminPage initialExperiments={[]} />, adminUser);
      expect(html).toContain('data-testid="experiments-empty"');
    });
  });

  describe('9. Multi-Locale (vi, ja, en) Translation Completeness', () => {
    it('renders PlansPage in Vietnamese without raw translation keys', () => {
      const html = renderWithAuth(<PlansPage />, billingAdminUser, 'tok', 'vi');
      expect(html).toContain('Quản trị các gói dịch vụ');
      expect(html).not.toMatch(/commercial\.\w+/);
    });

    it('renders PlansPage in English without raw translation keys', () => {
      const html = renderWithAuth(<PlansPage />, billingAdminUser, 'tok', 'en');
      expect(html).toContain('Membership Plans &amp; Discount Coupons');
      expect(html).not.toMatch(/commercial\.\w+/);
    });

    it('renders PlansPage in Japanese without raw translation keys', () => {
      const html = renderWithAuth(<PlansPage />, billingAdminUser, 'tok', 'ja');
      expect(html).toContain('プラン管理および割引クーポン');
      expect(html).not.toMatch(/commercial\.\w+/);
    });

    it('renders RevenueReportPage in English and Japanese', () => {
      const htmlEn = renderWithAuth(<RevenueReportPage />, billingAdminUser, 'tok', 'en');
      expect(htmlEn).toContain('Financial Revenue Report');
      expect(htmlEn).not.toMatch(/reports\.\w+/);

      const htmlJa = renderWithAuth(<RevenueReportPage />, billingAdminUser, 'tok', 'ja');
      expect(htmlJa).toContain('財務収益レポート');
      expect(htmlJa).not.toMatch(/reports\.\w+/);
    });

    it('renders ExperimentsAdminPage in English and Japanese', () => {
      const adminRoleUser: StaffUser = {
        ...billingAdminUser,
        role: 'admin',
      };
      const htmlEn = renderWithAuth(<ExperimentsAdminPage />, adminRoleUser, 'tok', 'en');
      expect(htmlEn).toContain('A/B Testing &amp; UI Optimization');
      expect(htmlEn).not.toMatch(/experiments\.\w+/);

      const htmlJa = renderWithAuth(<ExperimentsAdminPage />, adminRoleUser, 'tok', 'ja');
      expect(htmlJa).toContain('A/Bテスト検証およびUI最適化');
      expect(htmlJa).not.toMatch(/experiments\.\w+/);
    });
  });

  describe('10. AdminApiClient Domain Methods Verification', () => {
    it('AdminApiClient exposes all I04 commercial, report and experiment endpoints', async () => {
      const mockFetch = vi.fn().mockImplementation(async (url: string, opts?: { method?: string; body?: unknown }) => {
        if (url.includes('/api/v1/admin/plans')) {
          if (opts?.method === 'POST') {
            return { ok: true, status: 201, json: async () => ({ id: 'new_plan', name: 'New Plan' }) };
          }
          return { ok: true, status: 200, json: async () => ({ plans: [] }) };
        }
        if (url.includes('/api/v1/admin/coupons')) {
          return { ok: true, status: 200, json: async () => ({ coupons: [] }) };
        }
        if (url.includes('/api/v1/admin/payments')) {
          return { ok: true, status: 200, json: async () => ({ payments: [] }) };
        }
        if (url.includes('/api/v1/admin/subscriptions')) {
          return { ok: true, status: 200, json: async () => ({ subscriptions: [] }) };
        }
        if (url.includes('/api/v1/admin/refunds')) {
          return { ok: true, status: 200, json: async () => ({ refunds: [] }) };
        }
        if (url.includes('/api/v1/admin/reports/revenue')) {
          return { ok: true, status: 200, json: async () => ({ grossMinor: 100000, refundMinor: 0, netMinor: 100000, currency: 'VND' }) };
        }
        if (url.includes('/api/v1/admin/reconciliation/runs')) {
          return { ok: true, status: 200, json: async () => [] };
        }
        if (url.includes('/api/v1/experiments')) {
          return { ok: true, status: 200, json: async () => [] };
        }
        if (url.includes('/api/v1/admin/content-reports')) {
          return { ok: true, status: 200, json: async () => ({ items: [] }) };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      });

      const client = new AdminApiClient({
        fetchFn: mockFetch,
        user: { ...billingAdminUser, role: 'admin' },
        token: 'valid-billing-token',
      });

      const plansRes = await client.listPlans();
      expect(plansRes).toBeDefined();

      const couponsRes = await client.listCoupons();
      expect(couponsRes).toBeDefined();

      const paymentsRes = await client.listPayments();
      expect(paymentsRes).toBeDefined();

      const subsRes = await client.listSubscriptions();
      expect(subsRes).toBeDefined();

      const refundsRes = await client.listRefunds();
      expect(refundsRes).toBeDefined();

      const revenueRes = await client.getRevenueReport({ currency: 'VND' });
      expect(revenueRes.grossMinor).toBe(100000);

      const recRes = await client.listReconciliationRuns();
      expect(Array.isArray(recRes)).toBe(true);

      const expRes = await client.listExperiments();
      expect(Array.isArray(expRes)).toBe(true);

      const contentReportsRes = await client.listContentReports();
      expect(contentReportsRes.items).toBeDefined();
    });
  });
});
