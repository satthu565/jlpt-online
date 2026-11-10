import type { NextRequest } from 'next/server';

// TODO(security): the fallback below is a staging credential kept only so the preview
// keeps working; set DATABASE_URL in the service environment and delete it.
const STAGING_FALLBACK_URL =
  'postgres://jlpt:311168c62385bd1fac12286debed8054@172.18.0.3:5432/jlpt_staging';

export function getAnalyticsDbUrl(): string {
  return process.env.DATABASE_URL || STAGING_FALLBACK_URL;
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
