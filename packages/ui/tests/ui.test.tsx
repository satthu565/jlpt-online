import { describe, it, expect } from 'vitest';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { House, FileText, Ellipsis } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import {
  tokens,
  Button,
  Input,
  Select,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Alert,
  Badge,
  Modal,
  SkipToContent,
  ThemeToggle,
  LocaleSwitcher,
  Header,
  Footer,
  RichTextView,
  CookieConsentBanner,
  ShareDialog,
  JsonLd,
  TTSAudioPlayer,
  WatermarkBadge,
} from '../src/index.js';

describe('@jlpt/ui component suite', () => {
  it('exports design tokens with colors, fonts, breakpoints', () => {
    expect(tokens.colors.primary[500]).toBe('#22c55e');
    expect(tokens.fonts.japanese).toContain('Noto Sans JP');
    expect(tokens.breakpoints.sm).toBe('640px');
  });

  it('renders Button with variants, loading state and icons', () => {
    const htmlPrimary = renderToString(<Button variant="primary">Luyện thi</Button>);
    expect(htmlPrimary).toContain('Luyện thi');
    expect(htmlPrimary).toContain('jlpt-button');

    const htmlLoading = renderToString(
      <Button loading disabled variant="danger">
        Đang xử lý
      </Button>,
    );
    expect(htmlLoading).toContain('aria-busy="true"');
    expect(htmlLoading).toContain('disabled');
    expect(htmlLoading).toContain('Đang xử lý');
  });

  it('renders Input with labels, hints, and error alerts', () => {
    const htmlNormal = renderToString(
      <Input label="Email đăng nhập" id="email-field" placeholder="user@example.com" hint="Dùng email thật" />,
    );
    expect(htmlNormal).toContain('for="email-field"');
    expect(htmlNormal).toContain('id="email-field"');
    expect(htmlNormal).toContain('user@example.com');
    expect(htmlNormal).toContain('Dùng email thật');
    expect(htmlNormal).toContain('aria-invalid="false"');

    const htmlError = renderToString(
      <Input label="Mật khẩu" id="pwd-field" error="Mật khẩu tối thiểu 8 ký tự" />,
    );
    expect(htmlError).toContain('aria-invalid="true"');
    expect(htmlError).toContain('role="alert"');
    expect(htmlError).toContain('Mật khẩu tối thiểu 8 ký tự');
  });

  it('renders Select with options and labels', () => {
    const options = [
      { value: 'N5', label: 'JLPT N5 (Sơ cấp)' },
      { value: 'N4', label: 'JLPT N4' },
      { value: 'N3', label: 'JLPT N3' },
    ];
    const html = renderToString(
      <Select label="Cấp độ ôn tập" id="level-select" options={options} defaultValue="N3" />,
    );
    expect(html).toContain('for="level-select"');
    expect(html).toContain('id="level-select"');
    expect(html).toContain('JLPT N5 (Sơ cấp)');
    expect(html).toContain('JLPT N3');
  });

  it('renders Card with header, title, content and footer', () => {
    const html = renderToString(
      <Card elevated>
        <CardHeader>
          <CardTitle as="h2">Đề thi tháng 12/2023</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Thời gian làm bài: 105 phút - 60 câu hỏi</p>
        </CardContent>
        <CardFooter>
          <Button variant="primary">Bắt đầu thi</Button>
        </CardFooter>
      </Card>,
    );
    expect(html).toContain('Đề thi tháng 12/2023');
    expect(html).toContain('Thời gian làm bài: 105 phút');
    expect(html).toContain('Bắt đầu thi');
  });

  it('renders Alert with different variants and roles', () => {
    const htmlSuccess = renderToString(<Alert variant="success" title="Thành công">Đã lưu kết quả.</Alert>);
    expect(htmlSuccess).toContain('role="alert"');
    expect(htmlSuccess).toContain('aria-live="polite"');
    expect(htmlSuccess).toContain('Thành công');
    expect(htmlSuccess).toContain('Đã lưu kết quả.');

    const htmlError = renderToString(<Alert variant="error" title="Lỗi">Không thể kết nối máy chủ.</Alert>);
    expect(htmlError).toContain('Không thể kết nối máy chủ.');
  });

  it('renders Badge with variants and JLPT levels', () => {
    const htmlN1 = renderToString(<Badge variant="danger">N1</Badge>);
    expect(htmlN1).toContain('N1');
    expect(htmlN1).toContain('jlpt-badge-danger');
  });

  it('renders Modal dialog when open and hides when closed', () => {
    const htmlClosed = renderToString(
      <Modal isOpen={false} onClose={() => {}} title="Xác nhận">
        Nội dung
      </Modal>,
    );
    expect(htmlClosed).toBe('');

    const htmlOpen = renderToString(
      <Modal isOpen={true} onClose={() => {}} title="Xác nhận xóa">
        Bạn có chắc muốn xóa?
      </Modal>,
    );
    expect(htmlOpen).toContain('role="dialog"');
    expect(htmlOpen).toContain('aria-modal="true"');
    expect(htmlOpen).toContain('Xác nhận xóa');
    expect(htmlOpen).toContain('Bạn có chắc muốn xóa?');
  });

  it('renders SkipToContent link with skip-link class', () => {
    const html = renderToString(<SkipToContent targetId="main-content" label="Bỏ qua tới nội dung" />);
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('skip-link');
    expect(html).toContain('Bỏ qua tới nội dung');
  });

  it('renders ThemeToggle with light, dark, and system options', () => {
    const html = renderToString(<ThemeToggle />);
    expect(html).toContain('role="group"');
    expect(html).toContain('Sáng');
    expect(html).toContain('Tối');
    expect(html).toContain('Hệ thống');
  });

  it('renders LocaleSwitcher with vi, ja, en options', () => {
    const html = renderToString(
      <LocaleSwitcher currentLocale="vi" onLocaleChange={() => {}} />,
    );
    expect(html).toContain('value="vi"');
    expect(html).toContain('value="ja"');
    expect(html).toContain('value="en"');
    expect(html).toContain('Tiếng Việt');
    expect(html).toContain('日本語');
    expect(html).toContain('English');
  });

  it('renders Header with responsive nav items and mobile toggle', () => {
    const navItems = [
      { label: 'Trang chủ', href: '/', active: true },
      { label: 'Đề thi', href: '/de-thi' },
      { label: 'Tài khoản', href: '/tai-khoan' },
    ];
    const html = renderToString(<Header navItems={navItems} brandName="JLPT Online" />);
    expect(html).not.toContain('JLPT Online');
    expect(html).toContain('Trang chủ');
    expect(html).toContain('Đề thi');
    expect(html).toContain('aria-label="Mở menu điều hướng"');
    expect(html).toContain('aria-controls="mobile-navigation-drawer"');
    expect(html).toContain('src="/images/brand/logo-v3-header.webp"');
    expect(html).toContain('alt="Gokakuya.com - Trang chủ"');
    expect(html).toContain('width="501"');
    expect(html).toContain('height="96"');
    expect(html).toContain('sm:h-12');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('dark:bg-white');
  });

  it('renders Header with active pill styles, CSS variables, and outline icons', () => {
    const navItems = [
      { label: 'Trang chủ', href: '/', active: true, icon: House },
      { label: 'Thư viện đề', href: '/de-thi', icon: FileText },
      {
        label: 'Thêm',
        icon: Ellipsis,
        children: [
          { label: 'Kế hoạch', href: '/ke-hoach', active: false },
          { label: 'Lịch sử', href: '/lich-su', active: true },
        ],
      },
    ];
    const html = renderToString(<Header navItems={navItems} brandName="JLPT Online" />);

    // Active item has aria-current="page", active class, and pill background
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('header-nav-link--active');
    expect(html).toContain('bg-[var(--nav-active-bg,#FDE8EA)]');
    expect(html).toContain('text-[var(--nav-active-fg,#D6000F)]');
    expect(html).toContain('rounded-xl');
    expect(html).toContain('min-h-11');

    // Inactive link has transparent background and slate color token
    expect(html).toContain('text-[var(--nav-inactive-fg,#334155)]');

    // Outline SVG icons with aria-hidden
    expect(html).toContain('lucide-house');
    expect(html).toContain('lucide-file-text');
    expect(html).toContain('aria-hidden="true"');

    // Dropdown trigger "Thêm" has ellipsis icon, label, chevron, and active state because child is active
    expect(html).toContain('header-nav-dropdown-trigger');
    expect(html).toContain('lucide-ellipsis');
    expect(html).toContain('lucide-chevron-down');

    // Stylesheet verifies CSS variables for dark/light modes
    const cssPath = path.resolve(__dirname, '../src/styles.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    expect(cssContent).toContain('--nav-active-fg: #D6000F');
    expect(cssContent).toContain('--nav-active-bg: #FDE8EA');
    expect(cssContent).toContain('--nav-active-fg: #FF6B70');
    expect(cssContent).toContain('--nav-active-bg: rgba(255, 107, 112, 0.14)');
    expect(cssContent).toContain('--nav-inactive-fg: #334155');
    expect(cssContent).toContain('--nav-inactive-fg: #e2e8f0');
  });

  it('renders Header fallback letter badge when logoSrc is empty', () => {
    const html = renderToString(<Header brandName="JLPT Online" logoSrc="" />);
    expect(html).toContain('JLPT Online');
    expect(html).toContain('>J<');
    expect(html).not.toContain('src="/images/brand/logo-v3-header.webp"');
  });

  it('renders Footer with links, copyright, and brand logo', () => {
    const links = [
      { label: 'Điều khoản', href: '/dieu-khoan' },
      { label: 'Chính sách', href: '/chinh-sach' },
    ];
    const html = renderToString(<Footer links={links} brandName="JLPT Online" />);
    expect(html).toContain('Điều khoản');
    expect(html).toContain('Chính sách');
    expect(html).toContain('JLPT Online');
    expect(html).toContain('WCAG 2.1 AA');
    expect(html).toContain('src="/images/brand/logo-v3-footer.webp"');
    expect(html).toContain('alt="Gokakuya.com"');
    expect(html).toContain('w-56');
    expect(html).not.toContain('rounded-xl');
    expect(html).toContain('width="520"');
    expect(html).toContain('height="100"');
    expect(html).toContain('loading="lazy"');
  });

  it('renders RichTextView with ruby, star, blank, underline, images', () => {
    const html = renderToString(
      <RichTextView
        segments={[
          { t: 'text', text: '今日は' },
          { t: 'ruby', text: '天気', rt: 'てんき' },
          { t: 'text', text: 'が良い。' },
          { t: 'blank' },
          { t: 'star' },
          { t: 'underline', text: '本' },
          { t: 'br' },
          { t: 'image', url: '/sample.png' },
        ]}
      />,
    );
    expect(html).toContain('今日は');
    expect(html).toContain('<ruby');
    expect(html).toContain('<rt');
    expect(html).toContain('てんき');
    expect(html).toContain('font-japanese');
    expect(html).toContain('aria-label="Ô trống điền từ"');
    expect(html).toContain('aria-label="Vị trí dấu sao"');
    expect(html).toContain('<u');
    expect(html).toContain('src="/sample.png"');
  });

  it('renders CookieConsentBanner with accessible buttons and notice', () => {
    const html = renderToString(
      <CookieConsentBanner
        isOpen
        onAcceptAll={() => {}}
        onRejectAnalytics={() => {}}
        labels={{
          title: 'Chính sách Cookie',
          description: 'Chúng tôi sử dụng cookie để cải thiện trải nghiệm.',
          acceptAll: 'Chấp nhận tất cả',
          rejectAnalytics: 'Từ chối cookie phân tích',
          customize: 'Tùy chỉnh',
        }}
      />,
    );
    expect(html).toContain('Chính sách Cookie');
    expect(html).toContain('Chấp nhận tất cả');
    expect(html).toContain('Từ chối cookie phân tích');
    expect(html).toContain('data-testid="cookie-consent-banner"');
  });

  it('renders ShareDialog with URL copy input and social buttons', () => {
    const html = renderToString(
      <ShareDialog
        isOpen
        onClose={() => {}}
        url="https://jlpt.vn/n3/de-thi"
        title="Đề thi JLPT N3"
        labels={{
          dialogTitle: 'Chia sẻ đề thi',
          copyLink: 'Sao chép liên kết',
          copied: 'Đã sao chép!',
          close: 'Đóng',
        }}
      />,
    );
    expect(html).toContain('Chia sẻ đề thi');
    expect(html).toContain('https://jlpt.vn/n3/de-thi');
    expect(html).toContain('Sao chép liên kết');
  });

  it('renders JsonLd script tag with valid escaped content', () => {
    const html = renderToString(
      <JsonLd
        id="course-ld"
        data={{
          '@context': 'https://schema.org',
          '@type': 'Course',
          name: 'Khóa luyện thi JLPT N3',
        }}
      />,
    );
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('Khóa luyện thi JLPT N3');
  });

  it('renders TTSAudioPlayer and displays sandbox warning when in sandbox mode', () => {
    const html = renderToString(
      <TTSAudioPlayer
        text="こんにちは"
        status="SANDBOX"
        isExternal={false}
        labels={{
          play: 'Phát âm',
          pause: 'Tạm dừng',
          loading: 'Đang tải...',
          sandboxNotice: 'Đang sử dụng bộ phát âm dự phòng (Sandbox Fallback)',
          errorNotice: 'Không thể phát âm thanh',
        }}
      />,
    );
    expect(html).toContain('Phát âm');
    expect(html).toContain('data-testid="tts-sandbox-alert"');
    expect(html).toContain('Đang sử dụng bộ phát âm dự phòng (Sandbox Fallback)');
  });

  it('renders WatermarkBadge with masked user ID and tamper-evident notice', () => {
    const html = renderToString(
      <WatermarkBadge
        userId="user-998877665544"
        timestamp="2026-10-16T12:00:00Z"
      />,
    );
    expect(html).toContain('data-testid="security-watermark"');
    expect(html).toContain('user...5544');
    expect(html).toContain('2026-10-16T12:00:00Z');
    expect(html).toContain('BẢN QUYỀN THUỘC JLPT ONLINE');
  });
});

