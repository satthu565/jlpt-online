import { describe, it, expect } from 'vitest';
import React from 'react';
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
    expect(html).toContain('JLPT Online');
    expect(html).toContain('Trang chủ');
    expect(html).toContain('Đề thi');
    expect(html).toContain('aria-label="Mở menu điều hướng"');
    expect(html).toContain('aria-controls="mobile-navigation-drawer"');
  });

  it('renders Footer with links and copyright', () => {
    const links = [
      { label: 'Điều khoản', href: '/dieu-khoan' },
      { label: 'Chính sách', href: '/chinh-sach' },
    ];
    const html = renderToString(<Footer links={links} brandName="JLPT Online" />);
    expect(html).toContain('Điều khoản');
    expect(html).toContain('Chính sách');
    expect(html).toContain('JLPT Online');
    expect(html).toContain('WCAG 2.1 AA');
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
});
