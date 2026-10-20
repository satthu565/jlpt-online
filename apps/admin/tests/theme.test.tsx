import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ThemeProvider } from '@jlpt/ui/theme-context';
import { ThemeToggle } from '@jlpt/ui/components/theme-toggle';
import { AdminAuthProvider, type StaffUser } from '../lib/auth-context';
import { AdminNavigation } from '../lib/admin-nav';

describe('Admin Dark Mode & Theme System (Acceptance 2: Admin có chế độ tối hoạt động)', () => {
  const adminUser: StaffUser = {
    id: 'usr_admin_theme_01',
    email: 'admin.theme@jlpt.local',
    name: 'Quản trị viên Theme',
    role: 'admin',
    twoFactorEnabled: true,
    twoFactorStatus: 'verified',
  };

  it('renders ThemeProvider and ThemeToggle with light, dark, and system options', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider defaultTheme="dark">
        <ThemeToggle />
      </ThemeProvider>,
    );

    expect(html).toContain('jlpt-theme-toggle');
    expect(html).toContain('aria-label="Chuyển đổi giao diện sáng/tối"');
    expect(html).toContain('☀️');
    expect(html).toContain('🌙');
    expect(html).toContain('💻');
  });

  it('AdminNavigation integrates ThemeToggle with dark mode support', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider defaultTheme="system">
        <AdminAuthProvider initialUser={adminUser} initialToken="test-token">
          <AdminNavigation />
        </AdminAuthProvider>
      </ThemeProvider>,
    );

    expect(html).toContain('data-testid="admin-navigation"');
    expect(html).toContain('jlpt-theme-toggle');
    expect(html).toContain('Giao diện / テーマ');
    expect(html).toContain('🌙');
  });

  it('renders dark mode tokens and styling classes on admin navigation container', () => {
    const html = renderToStaticMarkup(
      <ThemeProvider defaultTheme="dark">
        <AdminAuthProvider initialUser={adminUser} initialToken="test-token">
          <AdminNavigation />
        </AdminAuthProvider>
      </ThemeProvider>,
    );

    expect(html).toContain('bg-gray-900');
    expect(html).toContain('text-gray-100');
    expect(html).toContain('border-gray-800');
  });
});
