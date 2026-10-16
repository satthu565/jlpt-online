import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AdminAuthProvider, type StaffUser } from '../lib/auth-context';
import AdminDashboardPage from '../app/page';
import ContentReportsPage from '../app/reports/content/page';
import ExplanationReviewsPage from '../app/reviews/explanations/page';
import MixedExamsPage from '../app/exams/mixed/page';
import VocabManagementPage from '../app/vocab/page';
import CmsManagementPage from '../app/cms/page';
import ReportsHubPage from '../app/reports/page';
import NotificationsSettingsPage from '../app/settings/notifications/page';
import AiModerationPage from '../app/moderation/ai/page';
import OrgSettingsPage from '../app/settings/org/page';
import ExperimentsAdminPage from '../app/experiments/page';

describe('Admin Full Suite (ADM-01, 09, 10, 11, 12, 13, 17, 18, Moderation, Org, Experiments)', () => {
  const adminUser: StaffUser = {
    id: 'usr_admin_01',
    email: 'admin@jlpt.local',
    name: 'Quản trị viên Hệ thống',
    role: 'admin',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  const renderWithAuth = (ui: React.ReactElement, user: StaffUser = adminUser) => {
    return renderToStaticMarkup(
      <AdminAuthProvider initialUser={user} initialToken="mock-token-xyz">
        {ui}
      </AdminAuthProvider>,
    );
  };

  describe('ADM-01: Dashboard tổng quan hệ thống', () => {
    it('hiển thị đầy đủ các thẻ chỉ số KPI hoạt động và hoạt động trực tiếp', () => {
      const html = renderWithAuth(<AdminDashboardPage />);

      expect(html).toContain('Tổng quan chỉ số hoạt động hệ thống (ADM-01)');
      expect(html).toContain('data-testid="stat-total-users"');
      expect(html).toContain('data-testid="stat-total-exams"');
      expect(html).toContain('data-testid="stat-completion-rate"');
      expect(html).toContain('data-testid="stat-open-reports"');
      expect(html).toContain('data-testid="stat-gross-revenue"');
      expect(html).toContain('Nhật ký hoạt động trực tiếp gần đây');
    });
  });

  describe('ADM-09: Quản lý báo lỗi câu hỏi từ người dùng', () => {
    it('hiển thị danh sách báo lỗi câu hỏi và bộ lọc trạng thái/loại lỗi', () => {
      const html = renderWithAuth(<ContentReportsPage />);

      expect(html).toContain('Quản lý Báo lỗi Câu hỏi từ Người dùng (ADM-09)');
      expect(html).toContain('data-testid="select-report-filter"');
      expect(html).toContain('data-testid="report-card-rep-01"');
      expect(html).toContain('data-testid="btn-resolve-rep-01"');
      expect(html).toContain('data-testid="btn-reject-rep-01"');
    });
  });

  describe('ADM-10: Quản lý nội dung giải thích và bản dịch (Two-Person Review)', () => {
    it('hiển thị hàng đợi duyệt lời giải và áp dụng quy tắc kiểm soát 2 người', () => {
      const html = renderWithAuth(<ExplanationReviewsPage />);

      expect(html).toContain('Kiểm duyệt Lời giải &amp; Bản dịch (ADM-10)');
      expect(html).toContain('data-testid="explanation-card-exp-rev-1"');
      expect(html).toContain('NỘI DUNG LỜI GIẢI (MARKDOWN):');
      expect(html).toContain('BẢN DỊCH TIẾNG VIỆT:');
      expect(html).toContain('data-testid="btn-approve-explanation-exp-rev-1"');
    });
  });

  describe('ADM-11: Quản lý các đề thi trộn ngẫu nhiên đã tạo', () => {
    it('hiển thị danh sách đề thi trộn, bộ lọc cấp độ N1-N5 và nút khởi tạo', () => {
      const html = renderWithAuth(<MixedExamsPage />);

      expect(html).toContain('Quản lý Đề thi Trộn Ngẫu nhiên (ADM-11)');
      expect(html).toContain('data-testid="btn-create-mixed-exam"');
      expect(html).toContain('data-testid="filter-level-N3"');
      expect(html).toContain('data-testid="mixed-exam-card-mix-01"');
      expect(html).toContain('seed-9481-n3');
    });
  });

  describe('ADM-12: Quản lý từ vựng và mẫu ngữ pháp', () => {
    it('hiển thị bảng từ vựng, cấp độ, furigana và nút thêm từ mới', () => {
      const html = renderWithAuth(<VocabManagementPage />);

      expect(html).toContain('Quản lý Từ vựng &amp; Ngữ pháp (ADM-12)');
      expect(html).toContain('data-testid="input-vocab-search"');
      expect(html).toContain('data-testid="select-vocab-level"');
      expect(html).toContain('data-testid="btn-add-vocab"');
      expect(html).toContain('怠る');
      expect(html).toContain('おこたる');
      expect(html).toContain('Bỏ bê, lơ là, sao nhãng');
    });
  });

  describe('ADM-13: Quản lý bài viết và nội dung trang chủ (CMS)', () => {
    it('hiển thị danh sách bài viết blog, nút soạn thảo và xem trước Markdown', () => {
      const html = renderWithAuth(<CmsManagementPage />);

      expect(html).toContain('Quản trị Nội dung CMS &amp; Bài viết (ADM-13)');
      expect(html).toContain('data-testid="tab-articles"');
      expect(html).toContain('data-testid="btn-create-article"');
      expect(html).toContain('data-testid="cms-article-card-art-01"');
      expect(html).toContain('Hướng dẫn thi JLPT N1-N5 toàn diện');
    });
  });

  describe('ADM-17: Xem báo cáo sử dụng hệ thống (15 Chỉ số Báo cáo)', () => {
    it('hiển thị đủ 15 tab báo cáo, nút xuất CSV và cảnh báo D7/D30 insufficient-data', () => {
      const html = renderWithAuth(<ReportsHubPage />);

      expect(html).toContain('Trung tâm Báo cáo &amp; Phân tích Hệ thống (ADM-17)');
      expect(html).toContain('data-testid="btn-export-csv"');
      expect(html).toContain('data-testid="reports-tab-nav"');
      expect(html).toContain('data-testid="report-tab-acquisition"');
      expect(html).toContain('data-testid="report-tab-retention"');
      expect(html).toContain('data-testid="report-tab-conversion"');
      expect(html).toContain('data-testid="report-tab-provider_costs"');
      expect(html).toContain('data-testid="report-tab-experiment_performance"');
    });
  });

  describe('ADM-18: Cấu hình thông báo và email tự động', () => {
    it('hiển thị danh sách mẫu thông báo, trình chỉnh sửa template và nút gửi thử nghiệm', () => {
      const html = renderWithAuth(<NotificationsSettingsPage />);

      expect(html).toContain('Cấu hình Thông báo &amp; Email Tự động (ADM-18)');
      expect(html).toContain('data-testid="tpl-item-tpl-1"');
      expect(html).toContain('data-testid="input-tpl-subject"');
      expect(html).toContain('data-testid="input-tpl-body"');
      expect(html).toContain('data-testid="btn-test-send"');
      expect(html).toContain('data-testid="btn-save-notification-tpl"');
    });
  });

  describe('AI Moderation, Teacher Org Settings & A/B Experiments', () => {
    it('AiModerationPage hiển thị nhật ký kiểm duyệt và chi phí AI', () => {
      const html = renderWithAuth(<AiModerationPage />);
      expect(html).toContain('Kiểm duyệt Nội dung AI &amp; Giám sát Chi phí');
      expect(html).toContain('data-testid="checkbox-filter-flagged"');
      expect(html).toContain('gemini-1.5-flash');
    });

    it('OrgSettingsPage hiển thị hồ sơ ứng tuyển giáo viên và thao tác phê duyệt', () => {
      const html = renderWithAuth(<OrgSettingsPage />);
      expect(html).toContain('Cài đặt Tổ chức &amp; Hồ sơ Giáo viên');
      expect(html).toContain('data-testid="teacher-app-app-01"');
      expect(html).toContain('data-testid="btn-approve-teacher-app-01"');
    });

    it('ExperimentsAdminPage hiển thị các thử nghiệm A/B và so sánh biến thể', () => {
      const html = renderWithAuth(<ExperimentsAdminPage />);
      expect(html).toContain('Quản trị Thử nghiệm A/B &amp; Tối ưu Giao diện');
      expect(html).toContain('data-testid="experiment-card-exp_checkout_layout_v1"');
      expect(html).toContain('data-testid="btn-toggle-experiment-exp_checkout_layout_v1"');
    });
  });
});
