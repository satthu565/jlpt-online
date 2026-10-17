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
});
