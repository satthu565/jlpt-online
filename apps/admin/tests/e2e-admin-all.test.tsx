import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminAuthProvider, type StaffUser } from '../lib/auth-context';

import AdminDashboardPage from '../app/page';
import QuestionsPage from '../app/questions/page';
import BlueprintsPage from '../app/blueprints/page';
import MediaPage from '../app/media/page';
import ImportsPage from '../app/imports/page';
import ReviewsPage from '../app/reviews/page';
import ExplanationReviewsPage from '../app/reviews/explanations/page';
import ContentReportsPage from '../app/reports/content/page';
import ExamsPage from '../app/exams/page';
import MixedExamsPage from '../app/exams/mixed/page';
import CmsManagementPage from '../app/cms/page';
import VocabManagementPage from '../app/vocab/page';
import PlansPage from '../app/commercial/plans/page';
import PaymentsPage from '../app/commercial/payments/page';
import RefundsPage from '../app/commercial/refunds/page';
import CommercialReconciliationPage from '../app/commercial/reconciliation/page';
import ReportsHubPage from '../app/reports/page';
import RevenueReportPage from '../app/reports/revenue/page';
import UsersPage from '../app/users/page';
import AuditLogsPage from '../app/audit-logs/page';
import ExperimentsAdminPage from '../app/experiments/page';
import AiModerationPage from '../app/moderation/ai/page';
import OrgSettingsPage from '../app/settings/org/page';
import NotificationsSettingsPage from '../app/settings/notifications/page';
import SettingsHubPage from '../app/settings/page';
import BackupSettingsPage from '../app/settings/backup/page';
import { BillingManager } from '../features/billing/billing-service';
import { ReconciliationManager } from '../features/billing/reconciliation-manager';
import { BackupService, BackupManagerView } from '../features/backup';
import { AuditLogService } from '../features/users/audit-service';

describe('Admin E2E Full Flows Suite (test:e2e:admin-all)', () => {
  const adminUser: StaffUser = {
    id: 'usr_admin_01',
    email: 'admin@jlpt.local',
    name: 'Quản trị viên Hệ thống',
    role: 'admin',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  const renderWithAdmin = (ui: React.ReactElement) => {
    return renderToStaticMarkup(
      <AdminAuthProvider initialUser={adminUser} initialToken="mock-admin-token">
        {ui}
      </AdminAuthProvider>,
    );
  };

  describe('1. Tổng quan & Giám sát vận hành (Dashboard & Settings)', () => {
    it('AdminDashboardPage hiển thị đầy đủ các thẻ chỉ số KPI hoạt động', () => {
      const html = renderWithAdmin(<AdminDashboardPage />);
      expect(html).toContain('Tổng quan chỉ số hoạt động hệ thống (ADM-01)');
      expect(html).toContain('data-testid="stat-total-users"');
      expect(html).toContain('data-testid="stat-gross-revenue"');
    });

    it('SettingsHubPage hiển thị các phân mục cài đặt thông báo, tổ chức và sao lưu', () => {
      const html = renderWithAdmin(<SettingsHubPage />);
      expect(html).toContain('Cài đặt Hệ thống Quản trị (System Settings)');
      expect(html).toContain('data-testid="settings-card-notifications"');
      expect(html).toContain('data-testid="settings-card-org"');
      expect(html).toContain('data-testid="settings-card-backup"');
    });

    it('BackupSettingsPage hiển thị quản trị sao lưu phục hồi với zero raw secrets trong browser', () => {
      const html = renderWithAdmin(<BackupSettingsPage />);
      expect(html).toContain('Sao lưu &amp; Phục hồi Hệ thống (ADM-20 / SYS-08)');
      expect(html).toContain('data-testid="btn-trigger-base-backup"');
      expect(html).toContain('data-testid="btn-trigger-restore-pitr"');
      expect(html).toContain('Chính sách bảo vệ an toàn &amp; vận hành sao lưu');
    });
  });

  describe('2. Biên tập nội dung & Đề thi (Authoring & Exams)', () => {
    it('QuestionsPage hiển thị ngân hàng câu hỏi', () => {
      const html = renderWithAdmin(<QuestionsPage />);
      expect(html).toContain('Ngân hàng câu hỏi');
    });

    it('BlueprintsPage hiển thị bản thiết kế đề', () => {
      const html = renderWithAdmin(<BlueprintsPage />);
      expect(html).toContain('Bản thiết kế đề thi');
    });

    it('MediaPage hiển thị thư viện phương tiện', () => {
      const html = renderWithAdmin(<MediaPage />);
      expect(html).toContain('Thư viện phương tiện');
    });

    it('ImportsPage hiển thị quản trị nhập đề thi', () => {
      const html = renderWithAdmin(<ImportsPage />);
      expect(html).toContain('Quản lý Gói Nhập Đề thi');
    });

    it('ExamsPage hiển thị danh sách đề thi chính thức', () => {
      const html = renderWithAdmin(<ExamsPage />);
      expect(html).toContain('Quản lý &amp; Xuất bản Đề thi');
    });

    it('MixedExamsPage hiển thị quản lý đề thi trộn', () => {
      const html = renderWithAdmin(<MixedExamsPage />);
      expect(html).toContain('Quản lý Đề thi Trộn Ngẫu nhiên (ADM-11)');
    });

    it('CmsManagementPage hiển thị quản trị nội dung CMS', () => {
      const html = renderWithAdmin(<CmsManagementPage />);
      expect(html).toContain('Quản trị Nội dung CMS &amp; Bài viết (ADM-13)');
    });

    it('VocabManagementPage hiển thị quản trị từ vựng và ngữ pháp', () => {
      const html = renderWithAdmin(<VocabManagementPage />);
      expect(html).toContain('Quản lý Từ vựng &amp; Ngữ pháp (ADM-12)');
    });
  });

  describe('3. Kiểm duyệt chất lượng & Hỗ trợ (Quality & Moderation)', () => {
    it('ReviewsPage hiển thị hàng đợi duyệt', () => {
      const html = renderWithAdmin(<ReviewsPage />);
      expect(html).toContain('Hàng đợi kiểm duyệt');
    });

    it('ExplanationReviewsPage hiển thị kiểm duyệt lời giải', () => {
      const html = renderWithAdmin(<ExplanationReviewsPage />);
      expect(html).toContain('Kiểm duyệt Lời giải &amp; Bản dịch (ADM-10)');
    });

    it('ContentReportsPage hiển thị quản lý báo lỗi câu hỏi', () => {
      const html = renderWithAdmin(<ContentReportsPage />);
      expect(html).toContain('Quản lý Báo lỗi Câu hỏi từ Người dùng (ADM-09)');
    });

    it('AiModerationPage hiển thị kiểm duyệt nội dung AI', () => {
      const html = renderWithAdmin(<AiModerationPage />);
      expect(html).toContain('Kiểm duyệt Nội dung AI &amp; Giám sát Chi phí');
    });
  });

  describe('4. Thương mại, Thanh toán & Đối soát (Commercial & Reconciliation)', () => {
    it('PlansPage hiển thị quản lý gói dịch vụ', () => {
      const html = renderWithAdmin(<PlansPage />);
      expect(html).toContain('Quản trị các gói dịch vụ');
    });

    it('PaymentsPage hiển thị danh sách giao dịch thanh toán', () => {
      const html = renderWithAdmin(<PaymentsPage />);
      expect(html).toContain('Quản trị giao dịch và thuê bao');
    });

    it('RefundsPage hiển thị quản trị yêu cầu hoàn tiền', () => {
      const html = renderWithAdmin(<RefundsPage />);
      expect(html).toContain('Quản trị yêu cầu hoàn tiền');
    });

    it('CommercialReconciliationPage hiển thị đối soát giao dịch và chứng từ', () => {
      const html = renderWithAdmin(<CommercialReconciliationPage />);
      expect(html).toContain('Đối soát Giao dịch &amp; Chứng từ Cổng thanh toán (Reconciliation)');
      expect(html).toContain('data-testid="btn-run-reconciliation"');
      expect(html).toContain('data-testid="reconciliation-runs-table"');
    });
  });

  describe('5. Báo cáo phân tích & Kiểm toán (Analytics & Audit Logs)', () => {
    it('ReportsHubPage hiển thị trung tâm báo cáo với các tab phân tích', () => {
      const html = renderWithAdmin(<ReportsHubPage />);
      expect(html).toContain('Trung tâm Báo cáo &amp; Phân tích Hệ thống (ADM-17)');
    });

    it('RevenueReportPage hiển thị báo cáo doanh thu tài chính', () => {
      const html = renderWithAdmin(<RevenueReportPage />);
      expect(html).toContain('Báo cáo doanh thu');
    });

    it('UsersPage hiển thị quản trị người dùng', () => {
      const html = renderWithAdmin(<UsersPage />);
      expect(html).toContain('Quản lý người dùng');
    });

    it('AuditLogsPage hiển thị nhật ký kiểm toán hệ thống với actor và tenant', () => {
      const html = renderWithAdmin(<AuditLogsPage />);
      expect(html).toContain('Nhật ký kiểm toán hệ thống (Audit Logs - ADM-14)');
      expect(html).toContain('Người thực hiện (Actor):');
      expect(html).toContain('Đơn vị (Tenant):');
    });

    it('ExperimentsAdminPage hiển thị quản trị thử nghiệm A/B', () => {
      const html = renderWithAdmin(<ExperimentsAdminPage />);
      expect(html).toContain('Quản trị Thử nghiệm A/B &amp; Tối ưu Giao diện');
    });

    it('OrgSettingsPage hiển thị cài đặt tổ chức giáo viên', () => {
      const html = renderWithAdmin(<OrgSettingsPage />);
      expect(html).toContain('Cài đặt Tổ chức &amp; Hồ sơ Giáo viên');
    });

    it('NotificationsSettingsPage hiển thị cấu hình mẫu thông báo', () => {
      const html = renderWithAdmin(<NotificationsSettingsPage />);
      expect(html).toContain('Cấu hình Thông báo &amp; Email Tự động (ADM-18)');
    });
  });

  describe('6. Nghiệm thu R04: Chốt Toàn diện Admin Payment, Đối soát Vận hành & Báo cáo Doanh thu', () => {
    it('Quy trình Quản trị Gói Dịch vụ & Giữ chỗ Mã Giảm giá (ADM-15, PAY-01, PAY-07)', () => {
      const billingManager = new BillingManager();
      const plan = billingManager.createPlan({
        name: 'Gói Chuyên Sâu N2',
        code: 'pro_n2',
        interval: 'quarter',
        priceMinor: 450000,
        currency: 'VND',
        entitlements: ['unlimited_exams', 'ai_explanations'],
      });
      expect(plan.id).toBe('pro_n2');
      expect(plan.version).toBe(1);

      // Tăng version khi cập nhật gói (tính bất biến)
      const updatedPlan = billingManager.createPlan({
        name: 'Gói Chuyên Sâu N2 Bản Mới',
        code: 'pro_n2',
        interval: 'quarter',
        priceMinor: 480000,
        currency: 'VND',
      });
      expect(updatedPlan.version).toBe(2);
      expect(updatedPlan.priceMinor).toBe(480000);

      // Xác thực giới hạn mã giảm giá (coupon cap)
      const coupon = billingManager.createCoupon({
        code: 'R04FINAL',
        discountPercent: 25,
        maxRedemptions: 50,
      });
      expect(coupon.code).toBe('R04FINAL');
      expect(coupon.maxRedemptions).toBe(50);
      expect(coupon.timesRedeemed).toBe(0);

      expect(() => {
        billingManager.createCoupon({
          code: 'INVALID_CAP',
          discountPercent: 150,
          maxRedemptions: 10,
        });
      }).toThrowError('Phần trăm giảm phải từ 1 đến 100.');
    });

    it('State Machine Hoàn tiền & Phân định Đơn vị Tiền tệ Tuyệt đối (ADM-16, PAY-08, PAY-12)', () => {
      const billingManager = new BillingManager();
      const refunds = billingManager.listRefunds();
      const requested = refunds.find((r) => r.status === 'requested')!;
      expect(requested).toBeDefined();

      const approved = billingManager.approveRefund(requested.id);
      expect(approved.status).toBe('refunded');

      // Tách biệt tiền tệ: Thêm refund JPY không làm ảnh hưởng doanh thu VND
      billingManager.addRefund({
        id: 'refund-jpy-r04',
        orderId: 'order-jpy-r04',
        amount: 3000,
        currency: 'JPY',
        status: 'refunded',
        createdAt: new Date().toISOString(),
      });

      const reportVND = billingManager.getRevenueReport('VND');
      expect(reportVND.currency).toBe('VND');
      expect(reportVND.refundMinor).toBe(199000);

      const reportJPY = billingManager.getRevenueReport('JPY');
      expect(reportJPY.currency).toBe('JPY');
      expect(reportJPY.refundMinor).toBe(3000);
      expect(reportJPY.grossMinor).toBe(0);
      expect(reportJPY.netMinor).toBe(-3000);
    });

    it('Động cơ Đối soát Đa chiều & Báo cáo Sai lệch Nhà cung cấp (PAY-04, ADM-16, Acceptance 1)', () => {
      const billingManager = new BillingManager();
      const statements = [
        {
          reference: 'PAYOS_STMT_R04_MISMATCH',
          orderId: '0192a000-0000-7000-8000-000000000001',
          amountMinor: 100000, // Sai lệch so với đơn hàng nội bộ 199.000
          currency: 'VND',
          status: 'PAID' as const,
        },
        {
          reference: 'PAYOS_STMT_R04_ORPHAN',
          orderId: 'non_existent_order_id',
          amountMinor: 199000,
          currency: 'VND',
          status: 'PAID' as const,
        },
      ];

      const run = billingManager.runReconciliation('payos', statements);
      expect(run.status).toBe('discrepancy_detected');
      expect(run.discrepanciesFound).toBe(2);
      expect(run.discrepancies?.some((d) => d.type === 'amount_mismatch')).toBe(true);
      expect(run.discrepancies?.some((d) => d.type === 'missing_internal_order')).toBe(true);

      // Render ReconciliationManager component hiển thị trực quan các sai lệch
      const html = renderToStaticMarkup(
        <ReconciliationManager billingManager={billingManager} currentUser={adminUser} />,
      );
      expect(html).toContain('data-testid="reconciliation-panel"');
      expect(html).toContain('data-testid="reconciliation-runs-table"');
      expect(html).toContain('Phát hiện lệch');
    });

    it('Toàn vẹn Kiểm toán Multi-tenant & Bảo vệ Bí mật Trình duyệt (ADM-14, ADM-20, SYS-08)', () => {
      const auditService = new AuditLogService();
      auditService.recordAction(
        { id: adminUser.id, email: adminUser.email, role: adminUser.role, tenantId: 'tenant_center_01' },
        'reconciliation_run',
        'payments',
        'rec_run_r04',
      );

      const logs = auditService.listLogs(adminUser, { tenantId: 'tenant_center_01' });
      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0]!.tenantId).toBe('tenant_center_01');
      expect(logs[0]!.operatorId).toBe(adminUser.id);

      // Giao diện sao lưu phục hồi tuyệt đối không rò rỉ secrets vào DOM
      const backupService = new BackupService();
      const htmlBackup = renderToStaticMarkup(
        <BackupManagerView backupService={backupService} currentUser={adminUser} />,
      );
      expect(htmlBackup).not.toContain('db_secret_password');
      expect(htmlBackup).not.toContain('super_secret_key');
      expect(htmlBackup).toContain('data-testid="btn-trigger-base-backup"');
    });
  });
});
