import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Providers } from '../app/providers';
import viMessages from '../messages/vi.json' with { type: 'json' };
import TermsOfServicePage from '../app/(info)/dieu-khoan/page';
import { PrivacyPolicyContent } from '../app/(info)/chinh-sach/privacy-policy-content';
import PrivacyPolicyAliasPage from '../app/(info)/chinh-sach-bao-mat/page';
import PrivacyPolicyPage from '../app/(info)/chinh-sach/page';

const renderWithProviders = (ui: React.ReactElement): string => {
  return renderToStaticMarkup(<Providers messages={viMessages}>{ui}</Providers>)
    .replace(/&amp;/g, '&');
};

describe('Legal Pages Hero Integration (Terms of Service, Privacy Policy, Privacy Policy Alias)', () => {
  describe('Terms of Service Page (/dieu-khoan)', () => {
    it('renders ExamHero with gradient background, minimal props, exact title and subtitle', () => {
      const html = renderWithProviders(<TermsOfServicePage />);

      // Minimal gradient background (pure CSS gradient, no photo)
      expect(html).not.toContain('/images/hero-jlpt-bg.webp');
      expect(html).toContain('from-sky-100');
      expect(html).toContain('dark:from-slate-900');

      // No badge, countdown, or login prompt
      expect(html).not.toContain('ĐẾM NGƯỢC KỲ THI JLPT');
      expect(html).not.toContain('Kho đề thi JLPT chính thức 2010 – 2026');
      expect(html).not.toContain('Đăng nhập để lưu tiến độ');

      // Title & Subtitle inside hero
      expect(html).toContain('Điều khoản Dịch vụ & Quy chế Phòng thi JLPT Online');
      expect(html).toContain(
        'Quy định sử dụng dịch vụ, bản quyền nội dung đề thi năng lực tiếng Nhật JLPT và chính sách hoàn tiền minh bạch.',
      );

      // Only one h1 heading on the page
      const h1Count = (html.match(/<h1[\s>]/g) || []).length;
      expect(h1Count).toBe(1);

      // Existing content preserved below hero
      expect(html).toContain('Điều khoản dịch vụ');
      expect(html).toContain('1. Chấp thuận điều khoản');
      expect(html).toContain('2. Quyền sở hữu trí tuệ & Bản quyền nội dung');
      expect(html).toContain('3. Quy chế thi và Phòng thi trực tuyến');
      expect(html).toContain('4. Chính sách thanh toán & Hoàn tiền');
      expect(html).toContain('Cập nhật lần cuối: Ngày 16 tháng 10 năm 2026');
    });
  });

  describe('Privacy Policy Page (/chinh-sach and /chinh-sach-bao-mat)', () => {
    it('PrivacyPolicyContent renders ExamHero with gradient background, minimal props, exact title and subtitle', () => {
      const html = renderWithProviders(<PrivacyPolicyContent />);

      // Minimal gradient background
      expect(html).not.toContain('/images/hero-jlpt-bg.webp');
      expect(html).toContain('from-sky-100');
      expect(html).toContain('dark:from-slate-900');

      // No badge, countdown, or login prompt
      expect(html).not.toContain('ĐẾM NGƯỢC KỲ THI JLPT');
      expect(html).not.toContain('Kho đề thi JLPT chính thức 2010 – 2026');
      expect(html).not.toContain('Đăng nhập để lưu tiến độ');

      // Title & Subtitle inside hero
      expect(html).toContain('Chính sách Quyền riêng tư & Bảo vệ Dữ liệu Học viên');
      expect(html).toContain(
        'Cam kết bảo mật dữ liệu học viên, quyền riêng tư theo tiêu chuẩn quốc tế và chính sách quản lý cookie minh bạch.',
      );

      // Only one h1 heading on the page
      const h1Count = (html.match(/<h1[\s>]/g) || []).length;
      expect(h1Count).toBe(1);

      // Existing content preserved below hero
      expect(html).toContain('Chính sách quyền riêng tư');
      expect(html).toContain('1. Cam kết bảo vệ dữ liệu cá nhân');
      expect(html).toContain('2. Thông tin thu thập & Mục đích sử dụng');
      expect(html).toContain('3. Chính sách Cookie & Quyền từ chối');
      expect(html).toContain('4. Quyền của học viên đối với dữ liệu');
      expect(html).toContain('Cập nhật lần cuối: Ngày 16 tháng 10 năm 2026');
    });

    it('/chinh-sach-bao-mat re-exports PrivacyPolicyPage and PrivacyPolicyContent consistently', () => {
      expect(PrivacyPolicyAliasPage).toBe(PrivacyPolicyPage);
    });
  });
});
