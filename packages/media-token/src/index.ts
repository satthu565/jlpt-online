export interface MediaTokenPayload {
  a?: string; // attemptId
  e?: string; // examId
  v?: number; // version
  k?: 'attempt' | 'review'; // scope
  mediaKey?: string; // backwards compatibility
  exp: number; // unix timestamp in seconds
}

export async function signMediaToken(
  payload: MediaTokenPayload,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const payloadStr = JSON.stringify(payload);
  const payloadB64 = Buffer.from(payloadStr).toString('base64url');

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(payloadB64),
  );

  const sigB64 = Buffer.from(signature).toString('base64url');
  return `${payloadB64}.${sigB64}`;
}

export async function verifyMediaToken(
  token: string,
  secret: string,
  nowUnixSec: number = Math.floor(Date.now() / 1000),
): Promise<MediaTokenPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const payloadB64 = parts[0];
  const sigB64 = parts[1];
  if (!payloadB64 || !sigB64) return null;

  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sigBuf = Buffer.from(sigB64, 'base64url');
    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBuf,
      enc.encode(payloadB64),
    );

    if (!isValid) return null;

    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const payload = JSON.parse(payloadStr) as MediaTokenPayload;

    if (payload.exp < nowUnixSec) {
      return null; // expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Generate expiration time for attempt token: total duration + 30 minutes (A11)
 */
export function generateAttemptTokenExp(
  totalDurationSec: number,
  nowUnixSec: number = Math.floor(Date.now() / 1000),
): number {
  return nowUnixSec + totalDurationSec + 30 * 60;
}

/**
 * Generate expiration time for review token: 2 hours (A11)
 */
export function generateReviewTokenExp(
  nowUnixSec: number = Math.floor(Date.now() / 1000),
): number {
  return nowUnixSec + 2 * 3600;
}

export interface MediaAccessValidationResult {
  valid: boolean;
  reason?: string;
  payload?: MediaTokenPayload;
}

/**
 * Validates token against a specific resource request path and optional manifest (A11)
 *
 * Rules:
 * - Token must be valid and not expired.
 * - For snapshot URLs (exams/:examId/v:version/snapshot.json), token's (e, v) must match.
 * - For media URLs (m/:key or media/:key), if manifestMedia is provided, the key must exist in manifest.
 */
export async function validateMediaAccess(
  token: string,
  secret: string,
  requestPath: string,
  options?: {
    manifestMedia?: string[];
    nowUnixSec?: number;
  },
): Promise<MediaAccessValidationResult> {
  const payload = await verifyMediaToken(token, secret, options?.nowUnixSec);
  if (!payload) {
    return { valid: false, reason: 'TOKEN_INVALID_OR_EXPIRED' };
  }

  const normalizedPath = requestPath.replace(/^\/+/, '');

  // 1. Check snapshot request: exams/{examId}/v{version}/snapshot.json
  const snapshotMatch = normalizedPath.match(/^exams\/([^/]+)\/v(\d+)\/snapshot\.json$/);
  if (snapshotMatch) {
    const examId = snapshotMatch[1];
    const version = Number.parseInt(snapshotMatch[2] ?? '0', 10);
    if (payload.e && payload.e !== examId) {
      return { valid: false, reason: 'EXAM_MISMATCH', payload };
    }
    if (payload.v !== undefined && payload.v !== version) {
      return { valid: false, reason: 'VERSION_MISMATCH', payload };
    }
    return { valid: true, payload };
  }

  // 2. Check media request: m/{mediaKey} or media/{mediaKey}
  const mediaMatch = normalizedPath.match(/^(?:m|media)\/(.+)$/);
  if (mediaMatch) {
    const mediaKey = mediaMatch[1];
    if (options?.manifestMedia && options.manifestMedia.length > 0) {
      const allowed = options.manifestMedia.some(
        (m) =>
          m === mediaKey ||
          m === `media/${mediaKey}` ||
          m.replace(/^media\//, '') === mediaKey,
      );
      if (!allowed) {
        return { valid: false, reason: 'MEDIA_NOT_IN_MANIFEST', payload };
      }
    }
    return { valid: true, payload };
  }

  return { valid: true, payload };
}

/**
 * Builds public snapshot URL with mediaToken query param (A11)
 */
export function buildMediaSnapshotUrl(
  baseUrl: string,
  examId: string,
  version: number,
  token: string,
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `${cleanBase}/exams/${examId}/v${version}/snapshot.json?t=${encodeURIComponent(token)}`;
}

/**
 * Builds media asset URL with mediaToken query param (A11)
 */
export function buildMediaAssetUrl(
  baseUrl: string,
  mediaKey: string,
  token: string,
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanKey = mediaKey.replace(/^\/+/, '');
  const prefix = cleanKey.startsWith('m/') || cleanKey.startsWith('media/') ? '' : 'm/';
  return `${cleanBase}/${prefix}${cleanKey}?t=${encodeURIComponent(token)}`;
}

