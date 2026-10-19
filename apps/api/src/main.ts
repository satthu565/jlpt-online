import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';

export async function createApp(): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter();
  const fastify = adapter.getInstance();

  // Register buffer parsers for multipart/form-data and binary zip uploads
  fastify.addContentTypeParser(
    'multipart/form-data',
    (_req: unknown, payload: import('stream').Readable, done: (err: Error | null, res?: Buffer) => void) => {
      const chunks: Buffer[] = [];
      payload.on('data', (chunk: Buffer) => chunks.push(chunk));
      payload.on('end', () => done(null, Buffer.concat(chunks)));
      payload.on('error', (err: Error) => done(err));
    },
  );
  fastify.addContentTypeParser(
    'application/zip',
    (_req: unknown, payload: import('stream').Readable, done: (err: Error | null, res?: Buffer) => void) => {
      const chunks: Buffer[] = [];
      payload.on('data', (chunk: Buffer) => chunks.push(chunk));
      payload.on('end', () => done(null, Buffer.concat(chunks)));
      payload.on('error', (err: Error) => done(err));
    },
  );
  fastify.addContentTypeParser(
    'application/octet-stream',
    (_req: unknown, payload: import('stream').Readable, done: (err: Error | null, res?: Buffer) => void) => {
      const chunks: Buffer[] = [];
      payload.on('data', (chunk: Buffer) => chunks.push(chunk));
      payload.on('end', () => done(null, Buffer.concat(chunks)));
      payload.on('error', (err: Error) => done(err));
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
