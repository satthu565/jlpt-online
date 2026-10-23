import type { FastifyInstance } from 'fastify';

export const DEFAULT_BODY_LIMIT_BYTES = 1024 * 1024; // 1 MB default
// 150 MB: a full exam package carries the listening audio (N2 packages reach ~80 MB).
export const DEFAULT_MAX_IMPORT_BYTES = 150 * 1024 * 1024; // 150 MB default

export function getMaxImportBytes(): number {
  const rawMaxImport = process.env['IMPORT_MAX_BYTES'];
  const parsedMaxImport = rawMaxImport ? parseInt(rawMaxImport, 10) : NaN;
  return Number.isInteger(parsedMaxImport) && parsedMaxImport > 0
    ? parsedMaxImport
    : DEFAULT_MAX_IMPORT_BYTES;
}

/**
 * Shared HTTP configuration for Fastify instances across both local main.ts and Docker entrypoint.js.
 * Configures:
 * 1. Fastify route hook: sets routeOptions.bodyLimit = IMPORT_MAX_BYTES (default 150 MB) for POST /api/v1/admin/imports
 * 2. Fastify content type parser: parses multipart/form-data, application/zip, application/octet-stream,
 *    and application/x-zip-compressed as Buffer with default bodyLimit (1 MB) to prevent DoS/OOM on non-import routes.
 */
export function configureImportFastify(fastify: FastifyInstance): void {
  const maxImportBytes = getMaxImportBytes();

  // Route POST /api/v1/admin/imports receives bodyLimit from IMPORT_MAX_BYTES (default 150 MB)
  fastify.addHook('onRoute', (routeOptions) => {
    const urlWithoutQuery = (routeOptions.url || '').split('?')[0] || '';
    const normalizedUrl = urlWithoutQuery.replace(/\/+$/, '');
    const isImportRoute =
      normalizedUrl === '/api/v1/admin/imports' || normalizedUrl === '/admin/imports';
    const isPostMethod =
      routeOptions.method === 'POST' ||
      (Array.isArray(routeOptions.method) && routeOptions.method.includes('POST'));

    if (isImportRoute && isPostMethod) {
      routeOptions.bodyLimit = maxImportBytes;
    }
  });

  // Register common buffer parsers with default bodyLimit (1 MB) to prevent memory exhaustion (DoS/OOM)
  fastify.addContentTypeParser(
    [
      'multipart/form-data',
      'application/zip',
      'application/x-zip',
      'application/x-zip-compressed',
      'application/octet-stream',
    ],
    { parseAs: 'buffer', bodyLimit: DEFAULT_BODY_LIMIT_BYTES },
    (_req: unknown, body: Buffer, done: (err: Error | null, res?: Buffer) => void) => {
      done(null, body);
    },
  );
}
