/** Where a learner goes after signing in when no (valid) `?redirect=` was given. */
export const DEFAULT_AFTER_LOGIN = '/tai-khoan';

const AUTH_PAGES = ['/dang-nhap', '/dang-ky', '/quen-mat-khau', '/dat-lai-mat-khau', '/xac-minh-email'];
const MAX_LENGTH = 2048;

/**
 * Turns the `redirect` query value into a same-site path that is safe to navigate to after sign-in.
 * Only relative paths are accepted (never another site, never `//host`, `\\host` or `javascript:`),
 * and the auth pages themselves are refused so a sign-in cannot bounce back to itself.
 */
export function getSafeRedirect(raw: string | null | undefined, fallback: string = DEFAULT_AFTER_LOGIN): string {
  if (!raw || raw.length > MAX_LENGTH) return fallback;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(raw)) return fallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;

  let url: URL;
  try {
    url = new URL(raw, 'http://redirect.invalid');
  } catch {
    return fallback;
  }
  if (url.origin !== 'http://redirect.invalid') return fallback;
  if (AUTH_PAGES.some((page) => url.pathname === page || url.pathname.startsWith(`${page}/`))) return fallback;

  return `${url.pathname}${url.search}${url.hash}`;
}
