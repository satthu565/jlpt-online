import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Providers } from '../app/providers';
import HomePage from '../app/page';
import LoginPage from '../app/(auth)/dang-nhap/page';
import RegisterPage from '../app/(auth)/dang-ky/page';
import ForgotPasswordPage from '../app/(auth)/quen-mat-khau/page';
import ResetPasswordPage from '../app/(auth)/dat-lai-mat-khau/page';
import AccountPage from '../app/(account)/tai-khoan/page';

const h = React.createElement;

describe('Web Application Accessibility (SYS-14 & WCAG 2.1 AA)', () => {
  it('Providers render skip link and primary landmarks', () => {
    const html = renderToString(
      h(Providers, null, h('div', null, 'Content')),
    );

    // Skip to content link
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('skip-link');

    // Landmarks
    expect(html).toContain('<header');
    expect(html).toContain('id="main-content"');
    expect(html).toContain('<footer');
    expect(html).toContain('<nav');
  });

  it('HomePage contains heading hierarchy and responsive level cards', () => {
    const html = renderToString(
      h(Providers, null, h(HomePage)),
    );

    // H1 and H2 structure
    expect(html).toContain('<h1');
    expect(html).toContain('<h2');
    expect(html).toContain('<h3');

    // 5 JLPT Levels
    expect(html).toContain('N1');
    expect(html).toContain('N2');
    expect(html).toContain('N3');
    expect(html).toContain('N4');
    expect(html).toContain('N5');
  });

  it('LoginPage forms have explicit label-input associations and autoComplete attributes', () => {
    const html = renderToString(
      h(Providers, null, h(LoginPage)),
    );

    expect(html).toContain('for="login-email"');
    expect(html).toContain('id="login-email"');
    expect(html).toMatch(/autocomplete="email"/i);

    expect(html).toContain('for="login-password"');
    expect(html).toContain('id="login-password"');
    expect(html).toMatch(/autocomplete="current-password"/i);

    expect(html).toContain('id="remember-me"');
  });

  it('RegisterPage forms associate all fields with labels and terms agreement', () => {
    const html = renderToString(
      h(Providers, null, h(RegisterPage)),
    );

    expect(html).toContain('for="register-name"');
    expect(html).toContain('id="register-name"');

    expect(html).toContain('for="register-email"');
    expect(html).toContain('id="register-email"');

    expect(html).toContain('for="register-password"');
    expect(html).toContain('id="register-password"');

    expect(html).toContain('for="register-confirm-password"');
    expect(html).toContain('id="register-confirm-password"');

    expect(html).toContain('id="agree-terms"');
  });

  it('ForgotPasswordPage provides clear accessible instructions and inputs', () => {
    const html = renderToString(
      h(Providers, null, h(ForgotPasswordPage)),
    );

    expect(html).toContain('for="forgot-email"');
    expect(html).toContain('id="forgot-email"');
    expect(html).toContain('type="submit"');
  });

  it('ResetPasswordPage includes accessible password fields', () => {
    const html = renderToString(
      h(Providers, null, h(ResetPasswordPage)),
    );

    expect(html).toContain('for="reset-new-password"');
    expect(html).toContain('id="reset-new-password"');
    expect(html).toContain('for="reset-confirm-password"');
    expect(html).toContain('id="reset-confirm-password"');
  });

  it('AccountPage includes accessible ARIA tablist, tabs, and tabpanels', () => {
    const html = renderToString(
      h(Providers, null, h(AccountPage)),
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain('role="tab"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('role="tabpanel"');
    expect(html).toContain('for="target-level-select"');
    expect(html).toContain('id="target-level-select"');
  });
});
