import { describe, it, expect } from 'vitest';
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import { Button } from '../src/components/button.js';
import { Header, type NavItem } from '../src/components/header.js';

function sRGBtoLin(c: number): number {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
}

function calculateContrast(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('Theme Polish & Contrast Verification (SYS-14, WCAG 2.1 AA)', () => {
  const cssPath = path.resolve(__dirname, '../src/styles.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('1. Primary button contrast: text is white (#FFFFFF) on red CTA with >= 4.5:1 contrast in both light and dark mode', () => {
    // Light mode: #D6000F bg, #FFFFFF text
    const lightContrast = calculateContrast('#FFFFFF', '#D6000F');
    expect(lightContrast).toBeGreaterThanOrEqual(4.5);
    expect(Number(lightContrast.toFixed(2))).toBe(5.43);

    // Dark mode: #E5252D bg, #FFFFFF text
    const darkContrast = calculateContrast('#FFFFFF', '#E5252D');
    expect(darkContrast).toBeGreaterThanOrEqual(4.5);
    expect(Number(darkContrast.toFixed(2))).toBe(4.53);

    // Verify token definitions in stylesheet
    expect(cssContent).toContain('--accent: #D6000F');
    expect(cssContent).toContain('--accent-foreground: #FFFFFF');
    expect(cssContent).toContain('--accent: #E5252D');
    expect(cssContent).toContain('--color-primary-text: var(--accent-foreground)');

    // Verify button explicit classes and unlayered overrides
    expect(cssContent).toContain('.button--primary');
    expect(cssContent).toContain('color: var(--accent-foreground) !important');

    // Verify Button component applies primary variant classes
    const htmlBtn = renderToString(<Button variant="primary">Đăng ký</Button>);
    expect(htmlBtn).toContain('button--primary');
    expect(htmlBtn).toContain('text-[var(--accent-foreground,#ffffff)]');

    // Verify Button with asChild (anchor tag)
    const htmlLinkBtn = renderToString(
      <Button variant="primary" asChild>
        <a href="/dang-ky">Đăng ký</a>
      </Button>,
    );
    expect(htmlLinkBtn).toContain('button--primary');
    expect(htmlLinkBtn).toContain('text-[var(--accent-foreground,#ffffff)]');
    expect(htmlLinkBtn).toContain('href="/dang-ky"');
  });

  it('2. Header responsive spacing: >= 16px gap between menu and account controls, <1024px mobile drawer', () => {
    // Mobile breakpoint rules
    expect(cssContent).toContain('@media (max-width: 1023px)');
    expect(cssContent).toContain('.desktop-nav {\n    display: none !important;\n  }');
    expect(cssContent).toContain('.mobile-menu-button {\n    display: inline-flex !important;\n  }');

    // Desktop breakpoint rules (1024px, 1280px, 1440px)
    expect(cssContent).toContain('@media (min-width: 1024px)');
    expect(cssContent).toContain('.desktop-nav {\n    display: flex !important;');
    expect(cssContent).toContain('.header-nav-link {\n    padding: 0.2rem 0.25rem !important;');
    expect(cssContent).toContain('@media (min-width: 1280px)');
    expect(cssContent).toContain('.header-nav-link {\n    padding: 0.375rem 0.5rem !important;');

    // Header component structure
    const navItems: NavItem[] = [
      { label: 'Trang chủ', href: '/', active: true },
      { label: 'Thư viện đề', href: '/de-thi' },
      { label: 'Thêm', children: [{ label: 'Kế hoạch', href: '/ke-hoach' }] },
    ];
    const htmlHeader = renderToString(
      <Header
        navItems={navItems}
        userMenu={<button type="button">Đăng nhập</button>}
      />,
    );

    // Guaranteed gap between brand-nav and right-group
    expect(htmlHeader).toContain('justify-between');
    expect(htmlHeader).toContain('gap-4');
    expect(htmlHeader).toContain('header-brand-nav');
    expect(htmlHeader).toContain('header-right-group');
  });

  it('3. Dark mode header nav: active item is #FF6B70 on rgba(255, 107, 112, 0.14), inactive item is #e2e8f0', () => {
    // CSS variable tokens
    expect(cssContent).toContain('--nav-active-fg: #FF6B70');
    expect(cssContent).toContain('--nav-active-bg: rgba(255, 107, 112, 0.14)');
    expect(cssContent).toContain('--nav-inactive-fg: #e2e8f0');

    // Rule definitions in styles.css
    expect(cssContent).toContain('.dark .header-nav-link--active');
    expect(cssContent).toContain('color: var(--nav-active-fg) !important');
    expect(cssContent).toContain('background-color: var(--nav-active-bg) !important');
    expect(cssContent).toContain('.dark .header-nav-link:not(.header-nav-link--active)');
    expect(cssContent).toContain('color: #e2e8f0');
  });
});
