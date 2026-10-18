/**
 * Target Routes Configuration for JLPT Online Lighthouse Performance Gate
 * Task: D01
 * Scope:
 *  - Main pages: /, /de-thi, /phong-thi, /n5, /dang-nhap, admin /login
 */

import type { TargetRoute } from './types.ts';

export const TARGET_ROUTES: TargetRoute[] = [
  {
    id: 'web_home',
    name: 'Trang chủ (Home)',
    app: 'web',
    path: '/',
  },
  {
    id: 'web_de-thi',
    name: 'Thư viện đề thi (Library)',
    app: 'web',
    path: '/de-thi',
  },
  {
    id: 'web_phong-thi',
    name: 'Phòng thi trực tuyến (Exam Room)',
    app: 'web',
    path: '/phong-thi',
  },
  {
    id: 'web_n5',
    name: 'Trang cấp độ N5 (SEO Landing)',
    app: 'web',
    path: '/n5',
  },
  {
    id: 'web_dang-nhap',
    name: 'Đăng nhập học viên (Student Login)',
    app: 'web',
    path: '/dang-nhap',
  },
  {
    id: 'admin_login',
    name: 'Đăng nhập nhân sự (Staff Admin Login)',
    app: 'admin',
    path: '/login',
  },
];

export function getBaseUrls(): { webUrl: string; adminUrl: string } {
  const webUrl = (
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.STAGING_WEB_URL ||
    'http://127.0.0.1:3000'
  ).replace(/\/$/, '');

  const adminUrl = (
    process.env.ADMIN_URL ||
    process.env.STAGING_ADMIN_URL ||
    'http://127.0.0.1:3001'
  ).replace(/\/$/, '');

  return { webUrl, adminUrl };
}

export function resolveTargetUrl(
  target: TargetRoute,
  overrides?: { webUrl?: string; adminUrl?: string },
): string {
  const baseUrls = overrides || getBaseUrls();
  const base = target.app === 'admin' ? (baseUrls.adminUrl || 'http://127.0.0.1:3001') : (baseUrls.webUrl || 'http://127.0.0.1:3000');
  const cleanBase = base.replace(/\/$/, '');
  const cleanPath = target.path.startsWith('/') ? target.path : `/${target.path}`;
  return `${cleanBase}${cleanPath}`;
}
