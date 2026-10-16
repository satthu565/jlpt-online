import { validateMediaAccess } from '@jlpt/media-token';

export interface Env {
  ENVIRONMENT?: string;
  MEDIA_TOKEN_SECRET?: string;
  MEDIA_BUCKET?: R2Bucket;
  MEDIA_CACHE?: {
    match(request: Request | string): Promise<Response | undefined>;
    put(request: Request | string, response: Response): Promise<void>;
  };
  MEDIA_FIXTURES?: Record<string, string | Uint8Array>;
  NOW_UNIX_SEC?: number; // for deterministic expiration testing
}

interface ByteRange {
  start: number;
  end: number;
}

function parseRangeHeader(
  rangeHeader: string,
  totalSize: number,
): ByteRange | 'unsatisfiable' | 'invalid' {
  const match = rangeHeader.trim().match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return 'invalid';

  const [, startStr, endStr] = match;
  if (!startStr && !endStr) return 'invalid';

  if (!startStr && endStr) {
    // Suffix range: -suffix (last N bytes)
    const suffix = parseInt(endStr, 10);
    if (isNaN(suffix) || suffix <= 0) return 'invalid';
    const start = Math.max(0, totalSize - suffix);
    return { start, end: totalSize - 1 };
  }

  if (startStr && !endStr) {
    // Prefix range: start-
    const start = parseInt(startStr, 10);
    if (isNaN(start) || start < 0) return 'invalid';
    if (start >= totalSize) return 'unsatisfiable';
    return { start, end: totalSize - 1 };
  }

  if (startStr && endStr) {
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end) || start < 0 || start > end) return 'invalid';
    if (start >= totalSize) return 'unsatisfiable';
    return { start, end: Math.min(end, totalSize - 1) };
  }

  return 'invalid';
}

function getContentType(pathname: string): string {
  const ext = pathname.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'json':
      return 'application/json; charset=utf-8';
    case 'mp3':
      return 'audio/mpeg';
    case 'm4a':
    case 'aac':
      return 'audio/aac';
    case 'ogg':
      return 'audio/ogg';
    case 'wav':
      return 'audio/wav';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function resolveObjectKey(normalizedPath: string): { key: string; isSnapshot: boolean } | null {
  // Snapshot path: exams/:examId/v:version/snapshot.json
  if (/^exams\/[^/]+\/v\d+\/snapshot\.json$/.test(normalizedPath)) {
    return { key: normalizedPath, isSnapshot: true };
  }

  // Media asset path: m/:key or media/:key
  const mediaMatch = normalizedPath.match(/^(?:m|media)\/(.+)$/);
  if (mediaMatch?.[1]) {
    return { key: `media/${mediaMatch[1]}`, isSnapshot: false };
  }

  return null;
}

function cleanCacheUrl(requestUrl: string): string {
  const url = new URL(requestUrl);
  url.searchParams.delete('t');
  url.searchParams.delete('token');
  return url.toString();
}

export default {
  async fetch(request: Request, env: Env, _ctx?: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const normalizedPath = url.pathname.replace(/^\/+/, '');

    // 1. Health check endpoints
    if (url.pathname === '/healthz' || url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      });
    }

    // Only allow GET and HEAD
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    // 2. Validate route
    const resolved = resolveObjectKey(normalizedPath);
    if (!resolved) {
      return new Response(JSON.stringify({ error: 'NOT_FOUND', message: 'Route not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    // 3. SIGNED MEDIA CHECK BEFORE CACHE
    // Per acceptance: "Signed media check trước cache; Range206 đúng"
    // Unauthenticated or invalid token requests MUST NEVER hit or read the cache!
    const token = url.searchParams.get('t') ?? url.searchParams.get('token');
    const secret = env.MEDIA_TOKEN_SECRET;

    if (!token) {
      return new Response(
        JSON.stringify({
          error: 'FORBIDDEN',
          code: 'MISSING_TOKEN',
          message: 'Signed media token is required',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    if (!secret) {
      return new Response(
        JSON.stringify({
          error: 'SERVER_CONFIGURATION_ERROR',
          message: 'MEDIA_TOKEN_SECRET is not configured',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    const validation = await validateMediaAccess(token, secret, normalizedPath, {
      nowUnixSec: env.NOW_UNIX_SEC,
    });

    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          error: 'FORBIDDEN',
          code: validation.reason ?? 'INVALID_TOKEN',
          message: 'Invalid or expired media token',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        },
      );
    }

    // 4. Token is valid. Now check Cache if GET request and NO Range header requested
    const rangeHeader = request.headers.get('range');
    const cacheKeyUrl = cleanCacheUrl(request.url);
    const cache =
      env.MEDIA_CACHE ?? (typeof caches !== 'undefined' ? (caches as unknown as { default: Cache }).default : undefined);

    if (request.method === 'GET' && !rangeHeader && cache) {
      try {
        const cachedResponse = await cache.match(cacheKeyUrl);
        if (cachedResponse) {
          const hitHeaders = new Headers(cachedResponse.headers);
          hitHeaders.set('CF-Cache-Status', 'HIT');
          hitHeaders.set('X-JLPT-Cache', 'HIT');
          return new Response(cachedResponse.body, {
            status: cachedResponse.status,
            statusText: cachedResponse.statusText,
            headers: hitHeaders,
          });
        }
      } catch {
        // Continue to source if cache match fails
      }
    }

    // 5. Fetch content from R2 Bucket or Fixtures
    let contentBytes: Uint8Array | null = null;
    let etag = `"${resolved.key}"`;

    if (env.MEDIA_BUCKET) {
      const r2Object = await env.MEDIA_BUCKET.get(resolved.key);
      if (!r2Object) {
        return new Response(
          JSON.stringify({ error: 'NOT_FOUND', message: 'Asset not found in storage' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
          },
        );
      }
      etag = r2Object.httpEtag ?? etag;
      const buf = await r2Object.arrayBuffer();
      contentBytes = new Uint8Array(buf);
    } else if (env.MEDIA_FIXTURES && env.MEDIA_FIXTURES[resolved.key]) {
      const raw = env.MEDIA_FIXTURES[resolved.key];
      if (typeof raw === 'string') {
        contentBytes = new TextEncoder().encode(raw);
      } else if (raw instanceof Uint8Array) {
        contentBytes = raw;
      }
    }

    if (!contentBytes) {
      return new Response(
        JSON.stringify({
          error: 'NOT_FOUND',
          message: 'Requested asset not found in storage bucket or fixtures',
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        },
      );
    }

    const totalSize = contentBytes.byteLength;
    const contentType = getContentType(resolved.key);
    // Cache-Control headers per contract A11:
    // media: private, max-age=86400, immutable
    // snapshot: private, max-age=3600
    const cacheControl = resolved.isSnapshot
      ? 'private, max-age=3600'
      : 'private, max-age=86400, immutable';

    // 6. Handle Range Request (Accept-Ranges: bytes, Range 206)
    if (rangeHeader) {
      const parsedRange = parseRangeHeader(rangeHeader, totalSize);

      if (parsedRange === 'unsatisfiable') {
        return new Response(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Cache-Control': 'no-store',
          },
        });
      }

      if (parsedRange !== 'invalid') {
        const { start, end } = parsedRange;
        const chunkLength = end - start + 1;
        const sliced = contentBytes.slice(start, end + 1);

        const rangeHeaders: Record<string, string> = {
          'Content-Type': contentType,
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Content-Length': String(chunkLength),
          'Accept-Ranges': 'bytes',
          'Cache-Control': cacheControl,
          'ETag': etag,
          'CF-Cache-Status': 'BYPASS',
        };

        if (request.method === 'HEAD') {
          return new Response(null, { status: 206, headers: rangeHeaders });
        }

        return new Response(sliced, {
          status: 206,
          headers: rangeHeaders,
        });
      }
    }

    // 7. Full 200 OK Response
    const responseHeaders = new Headers({
      'Content-Type': contentType,
      'Content-Length': String(totalSize),
      'Accept-Ranges': 'bytes',
      'Cache-Control': cacheControl,
      'ETag': etag,
      'CF-Cache-Status': 'MISS',
      'X-JLPT-Cache': 'MISS',
    });

    if (request.method === 'HEAD') {
      return new Response(null, { status: 200, headers: responseHeaders });
    }

    const fullResponse = new Response(contentBytes, {
      status: 200,
      headers: responseHeaders,
    });

    // Populate edge cache for whole responses if caching is enabled
    if (cache && request.method === 'GET') {
      try {
        await cache.put(cacheKeyUrl, fullResponse.clone());
      } catch {
        // Ignore cache storage error
      }
    }

    return fullResponse;
  },
};
