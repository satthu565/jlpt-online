import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

export async function createApp(): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter();
  const fastify = adapter.getInstance();

  const maxImportBytes = process.env['IMPORT_MAX_BYTES']
    ? parseInt(process.env['IMPORT_MAX_BYTES'], 10)
    : 50 * 1024 * 1024; // 50MB default

  // Register buffer parsers with bodyLimit to prevent memory exhaustion (DoS/OOM)
  fastify.addContentTypeParser(
    ['multipart/form-data', 'application/zip', 'application/octet-stream'],
    { parseAs: 'buffer', bodyLimit: maxImportBytes },
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
