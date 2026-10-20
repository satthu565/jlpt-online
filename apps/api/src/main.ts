import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

export async function createApp(): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter();
  const fastify = adapter.getInstance();

  const rawMaxImport = process.env['IMPORT_MAX_BYTES'];
  const parsedMaxImport = rawMaxImport ? parseInt(rawMaxImport, 10) : NaN;
  const maxImportBytes =
    Number.isInteger(parsedMaxImport) && parsedMaxImport > 0
      ? parsedMaxImport
      : 50 * 1024 * 1024; // 50MB default

  // Route POST /api/v1/admin/imports receives bodyLimit from IMPORT_MAX_BYTES (default 50 MB)
  fastify.addHook('onRoute', (routeOptions) => {
    const normalizedUrl = routeOptions.url.replace(/\/+$/, '');
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
    ['multipart/form-data', 'application/zip', 'application/octet-stream', 'application/x-zip-compressed'],
    { parseAs: 'buffer', bodyLimit: 1024 * 1024 },
    (_req: unknown, body: Buffer, done: (err: Error | null, res?: Buffer) => void) => {
      done(null, body);
    },
  );

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    logger: ['error', 'warn'],
  });
  app.setGlobalPrefix('api/v1');
  return app;
}

async function bootstrap() {
  const app = await createApp();
  const port = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`JLPT API listening on port ${port}`);
}

if (process.env['NODE_ENV'] !== 'test') {
  bootstrap().catch((err) => {
    console.error('Fatal error during bootstrap:', err);
    process.exit(1);
  });
}
