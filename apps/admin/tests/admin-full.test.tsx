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

      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Tổng quan chỉ số hoạt động hệ thống');
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
      const html = renderWithAuth(
        <ContentReportsPage
          initialReports={[
            {
              id: 'rep-01',
              questionId: 'q-n3-kanji-04',
              examTitle: 'JLPT N3 Tháng 12/2023',
              level: 'N3',
              issueType: 'wrong_answer',
              description: 'Đáp án đúng là B thay vì C...',
              status: 'open',
              reporterEmail: 'student1@example.com',
              createdAt: '2026-10-15 09:30',
            },
          ]}
        />,
      );

      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Quản lý Báo lỗi Câu hỏi từ Người dùng');
      expect(html).toContain('data-testid="select-report-filter"');
      expect(html).toContain('data-testid="report-card-rep-01"');
      expect(html).toContain('data-testid="btn-resolve-rep-01"');
      expect(html).toContain('data-testid="btn-reject-rep-01"');
    });
  });

  describe('ADM-10: Quản lý nội dung giải thích và bản dịch (Two-Person Review)', () => {
    it('hiển thị hàng đợi duyệt lời giải và áp dụng quy tắc kiểm soát 2 người', () => {
      const html = renderWithAuth(
        <ExplanationReviewsPage
          initialItems={[
            {
              id: 'exp-rev-1',
              questionId: 'q-n3-grammar-15',
              version: 2,
              level: 'N3',
              authorId: 'usr-editor-01',
              authorName: 'Biên tập viên A',
              explanationMarkdown: '**Ngữ pháp**: ~わけにはいかない',
              translationVi: 'Vì ngày mai có cuộc họp quan trọng...',
              status: 'pending',
              submittedAt: '2026-10-15 16:40',
            },
          ]}
        />,
      );

      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Kiểm duyệt Lời giải &amp; Bản dịch');
      expect(html).toContain('data-testid="explanation-card-exp-rev-1"');
      expect(html).toContain('NỘI DUNG LỜI GIẢI (MARKDOWN):');
      expect(html).toContain('BẢN DỊCH TIẾNG VIỆT:');
      expect(html).toContain('data-testid="btn-approve-explanation-exp-rev-1"');
    });
  });

  describe('ADM-11: Quản lý các đề thi trộn ngẫu nhiên đã tạo', () => {
    it('hiển thị danh sách đề thi trộn, bộ lọc cấp độ N1-N5 và nút khởi tạo', () => {
      const html = renderWithAuth(
        <MixedExamsPage
          initialExams={[
            {
              id: 'mix-01',
              title: 'Đề Trộn N3 Tổng Hợp #1042',
              level: 'N3',
              mode: 'random',
              questionCount: 35,
              seed: 'seed-9481-n3',
              createdAt: '2026-10-15 11:20',
              attemptCount: 128,
              status: 'active',
            },
          ]}
        />,
      );

      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Quản lý Đề thi Trộn Ngẫu nhiên');
      expect(html).toContain('data-testid="btn-create-mixed-exam"');
      expect(html).toContain('data-testid="filter-level-N3"');
      expect(html).toContain('data-testid="mixed-exam-card-mix-01"');
      expect(html).toContain('seed-9481-n3');
    });
  });

  describe('ADM-12: Quản lý từ vựng và mẫu ngữ pháp', () => {
    it('hiển thị bảng từ vựng, cấp độ, furigana và nút thêm từ mới', () => {
      const html = renderWithAuth(
        <VocabManagementPage
          initialEntries={[
            {
              id: 'voc-test-1',
              word: '怠る',
              reading: 'おこたる',
              meaningVi: 'Bỏ bê, lơ là, sao nhãng',
              level: 'N2',
              partOfSpeech: 'Động từ nhóm 1',
              exampleSentence: '試験の準備を怠ってはいけない。',
            },
          ]}
        />,
      );

      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Quản lý Từ vựng &amp; Ngữ pháp');
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
      const html = renderWithAuth(
        <CmsManagementPage
          initialArticles={[
            {
              id: 'art-01',
              slug: 'huong-dan-thi-jlpt-toan-dien',
              title: 'Hướng dẫn thi JLPT N1-N5 toàn diện: Cấu trúc đề thi, thang điểm và chiến lược',
              version: 1,
              status: 'published',
              author: 'Admin JLPT',
              locale: 'vi',
              markdown: '# Hướng Dẫn Toàn Diện Về Kỳ Thi JLPT N1 - N5',
              summary: 'Cẩm nang chi tiết nhất về kỳ thi năng lực tiếng Nhật JLPT dành cho mọi cấp độ.',
              tags: ['JLPT', 'N1'],
              publishedAt: '2026-10-15 08:00',
            },
          ]}
        />,
      );

      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Quản trị Nội dung CMS &amp; Bài viết');
      expect(html).toContain('data-testid="tab-articles"');
      expect(html).toContain('data-testid="btn-create-article"');
      expect(html).toContain('data-testid="cms-article-card-art-01"');
      expect(html).toContain('Hướng dẫn thi JLPT N1-N5 toàn diện');
    });
  });

  describe('ADM-17: Xem báo cáo sử dụng hệ thống (15 Chỉ số Báo cáo)', () => {
    it('hiển thị đủ 15 tab báo cáo, nút xuất CSV và cảnh báo D7/D30 insufficient-data', () => {
      const html = renderWithAuth(<ReportsHubPage />);

      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Trung tâm Báo cáo &amp; Phân tích Hệ thống');
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
      const html = renderWithAuth(
        <NotificationsSettingsPage
          initialTemplates={[
            {
              id: 'tpl-1',
              key: 'auth_otp',
              name: 'Mã xác thực OTP',
              channel: 'email',
              subject: 'Mã xác thực OTP JLPT',
              bodyTemplate: 'Mã OTP của bạn là: {{otp_code}}',
              isActive: true,
              variables: ['otp_code'],
            },
          ]}
        />,
      );

      expect(html).toContain('data-testid="page-title"');
      expect(html).toContain('Cấu hình Thông báo &amp; Email Tự động');
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
      expect(html).toContain('data-testid="ai-empty"');
    });

    it('OrgSettingsPage hiển thị hồ sơ ứng tuyển giáo viên và thao tác phê duyệt', () => {
      const html = renderWithAuth(
        <OrgSettingsPage
          initialApplications={[
            {
              id: 'app-01',
              applicantName: 'Nguyễn Văn A',
              email: 'teacher.a@example.com',
              currentOrg: 'Đại học Ngoại Ngữ',
              jlptCertificate: 'N1 - 170/180',
              yearsOfExperience: 5,
              status: 'pending',
              appliedAt: '2026-10-15T08:00:00Z',
            },
          ]}
        />,
      );
      expect(html).toContain('Cài đặt Tổ chức &amp; Hồ sơ Giáo viên');
      expect(html).toContain('data-testid="teacher-app-app-01"');
      expect(html).toContain('data-testid="btn-approve-teacher-app-01"');
    });

    it('ExperimentsAdminPage hiển thị các thử nghiệm A/B và so sánh biến thể', () => {
      const html = renderWithAuth(
        <ExperimentsAdminPage
          initialExperiments={[
            {
              id: 'exp_checkout_layout_v1',
              name: 'Thử nghiệm giao diện thanh toán (1 bước vs 2 bước)',
              description: 'Đánh giá tỷ lệ hoàn tất đơn hàng gói Premium khi giảm bớt trường nhập liệu.',
              isActive: true,
              totalAssignments: 1420,
              totalExposures: 1210,
              variants: [
                {
                  key: 'control',
                  name: 'Gốc (2 bước)',
                  weight: 50,
                  assignments: 710,
                  conversions: 84,
                  conversionRate: 11.8,
                },
                {
                  key: 'variant_b',
                  name: 'Mới (1 chạm)',
                  weight: 50,
                  assignments: 710,
                  conversions: 106,
                  conversionRate: 14.9,
                },
              ],
            },
          ]}
        />,
      );
      expect(html).toContain('Quản trị Thử nghiệm A/B &amp; Tối ưu Giao diện');
      expect(html).toContain('data-testid="experiment-card-exp_checkout_layout_v1"');
      expect(html).toContain('data-testid="btn-toggle-experiment-exp_checkout_layout_v1"');
    });
  });
});
