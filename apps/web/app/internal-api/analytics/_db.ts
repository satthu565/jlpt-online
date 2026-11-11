import type { NextRequest } from 'next/server';

/** Connection string of the application database; it must come from the service environment, never from code. */
export function getAnalyticsDbUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set for the web service (see /etc/jlpt/web-db.env on the VM)');
  }
  return url;
}

/** Resolve the signed-in user from the caller's own session (never from a query param). */
export async function resolveSessionUserId(request: NextRequest): Promise<string | null> {
  const base = (
    process.env.API_INTERNAL_URL ||
    process.env.STAGING_API_URL ||
    'http://127.0.0.1:4000'
  ).replace(/\/$/, '');
  const apiRoot = /\/api\/v1$/.test(base) ? base : `${base}/api/v1`;
  const headers: Record<string, string> = {};
  const auth = request.headers.get('authorization');
  const cookie = request.headers.get('cookie');
  if (auth) headers['authorization'] = auth;
  if (cookie) headers['cookie'] = cookie;
  if (!auth && !cookie) return null;
  try {
    const res = await fetch(`${apiRoot}/auth/session`, { headers, cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { user?: { id?: string } | null };
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}
