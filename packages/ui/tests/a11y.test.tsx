import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  Button,
  Input,
  Select,
  Alert,
  Modal,
  SkipToContent,
  Header,
  Footer,
  RichTextView,
  ThemeToggle,
  LocaleSwitcher,
} from '../src/index.js';

describe('@jlpt/ui Accessibility (SYS-14 & WCAG 2.1 AA)', () => {
  it('SkipToContent provides accessible landmark skip link', () => {
    const html = renderToString(<SkipToContent targetId="main-content" />);
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('skip-link');
    // Ensure text label is not empty
    expect(html).toMatch(/>[^<]+<\/a>/);
  });

  it('Input associates label htmlFor with input id and aria-invalid on error', () => {
    const html = renderToString(
      <Input
        label="Họ và tên"
        id="full-name"
        error="Họ và tên không được để trống"
        required
      />,
    );

    // Label association
    expect(html).toContain('for="full-name"');
    expect(html).toContain('id="full-name"');

    // ARIA attributes for screen readers
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('aria-describedby="full-name-error"');

    // Error container with alert role
    expect(html).toContain('id="full-name-error"');
    expect(html).toContain('role="alert"');
  });

  it('Select associates label with select id and error container', () => {
    const html = renderToString(
      <Select
        label="Trình độ mục tiêu"
        id="target-level"
        options={[{ value: 'N2', label: 'JLPT N2' }]}
        error="Vui lòng chọn trình độ"
      />,
    );
    expect(html).toContain('for="target-level"');
    expect(html).toContain('id="target-level"');
    expect(html).toContain('aria-invalid="true"');
    expect(html).toContain('role="alert"');
  });

  it('Buttons announce loading states via aria-busy and disabled', () => {
    const html = renderToString(<Button loading>Lưu thông tin</Button>);
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain('disabled');
  });

  it('Alerts announce messages using role="alert" and aria-live="polite"', () => {
    const html = renderToString(
      <Alert variant="warning" title="Cảnh báo">
        Thời gian thi sắp hết
      </Alert>,
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="polite"');
  });

  it('Modal includes role="dialog", aria-modal="true" and labelledby', () => {
    const html = renderToString(
      <Modal isOpen={true} onClose={() => {}} title="Xác nhận hủy phiên">
        Bạn có chắc muốn đăng xuất khỏi thiết bị này?
      </Modal>,
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('aria-label="Đóng hộp thoại"');
  });

  it('Header includes semantic HTML5 landmarks and accessible menu controls', () => {
    const html = renderToString(
      <Header
        brandName="JLPT Online"
        navItems={[
          { label: 'Trang chủ', href: '/', active: true },
          { label: 'Thư viện', href: '/de-thi' },
        ]}
      />,
    );
    // Landmark elements
    expect(html).toContain('<header');
    expect(html).toContain('<nav');
    expect(html).toContain('aria-label="Main Navigation"');

    // Active page indicated via aria-current
    expect(html).toContain('aria-current="page"');

    // Mobile menu button accessibility
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-controls="mobile-navigation-drawer"');
    expect(html).toContain('aria-label="Mở menu điều hướng"');
  });

  it('Footer includes semantic footer tag and navigation landmark', () => {
    const html = renderToString(
      <Footer
        links={[{ label: 'Hỗ trợ', href: '/ho-tro' }]}
        brandName="JLPT Online"
      />,
    );
    expect(html).toContain('<footer');
    expect(html).toContain('<nav');
    expect(html).toContain('aria-label="Footer Navigation"');
  });

  it('RichTextView provides accessible labels for blanks and star questions', () => {
    const html = renderToString(
      <RichTextView
        segments={[
          { t: 'text', text: '公園に' },
          { t: 'blank' },
          { t: 'star' },
          { t: 'text', text: '行きます。' },
          { t: 'image', url: '/question1.png' },
        ]}
      />,
    );
    expect(html).toContain('role="textbox"');
    expect(html).toContain('aria-label="Ô trống điền từ"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Vị trí dấu sao"');
    expect(html).toContain('alt="Minh họa câu hỏi"');
  });

  it('ThemeToggle buttons have explicit labels and pressed states', () => {
    const html = renderToString(<ThemeToggle />);
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-pressed=');
    expect(html).toContain('aria-label=');
  });

  it('LocaleSwitcher includes accessible screen reader label', () => {
    const html = renderToString(
      <LocaleSwitcher currentLocale="vi" onLocaleChange={() => {}} />,
    );
    expect(html).toContain('class="sr-only"');
    expect(html).toContain('for="jlpt-locale-select"');
    expect(html).toContain('aria-label="Chọn ngôn ngữ giao diện"');
  });
});
