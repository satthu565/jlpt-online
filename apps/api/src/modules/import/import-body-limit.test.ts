import 'reflect-metadata';
import fs from 'node:fs';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApp } from '../../main.js';
import { getOrCreateDbClient } from '../../common/database/database.module.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { resolveRepoPath } from '../../common/utils/paths.js';

describe('I18 Body Size Limits (multipart, zip, octet-stream)', () => {
  let app: NestFastifyApplication;
  let adminHeaders: Record<string, string>;
  let draftZipBuffer: Buffer;
  let readyZipBuffer: Buffer;

  // Set IMPORT_MAX_BYTES to 2 MB (2 * 1024 * 1024) for testing route-level body limit
  const TEST_IMPORT_MAX_BYTES = 2 * 1024 * 1024;

  beforeAll(async () => {
    process.env.ADMIN_HOST = 'admin.jlpt.local';
    process.env.IMPORT_MAX_BYTES = String(TEST_IMPORT_MAX_BYTES);

    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    // Create Admin User & Session for authorized import tests
    const client = await getOrCreateDbClient();
    const adminId = generateUuidV7();
    const adminToken = `tok_admin_i18_${Date.now()}`;

    await client.db.insert(schema.users).values({
      id: adminId,
      email: `admin_i18_${Date.now()}@jlpt.local`,
      name: 'Admin I18 Tester',
      role: 'admin',
      emailVerified: true,
    });

    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: adminId,
      token: adminToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    adminHeaders = {
      Authorization: `Bearer ${adminToken}`,
      Host: 'admin.jlpt.local',
    };

    draftZipBuffer = fs.readFileSync(resolveRepoPath('fixtures/imports/draft.zip'));
    readyZipBuffer = fs.readFileSync(resolveRepoPath('fixtures/imports/ready.zip'));
  });

  afterAll(async () => {
    delete process.env.ADMIN_HOST;
    delete process.env.IMPORT_MAX_BYTES;
    await app.close();
  });

  describe('Acceptance 1: body 2 MB application/octet-stream vào route không phải nhập gói trả 413 mà không cần đăng nhập', () => {
    it('returns 413 for 2 MB application/octet-stream to /api/v1/auth/sign-in/email without auth', async () => {
      const payload2Mb = Buffer.alloc(2 * 1024 * 1024, 0xaa);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-in/email',
        headers: {
          'content-type': 'application/octet-stream',
        },
        payload: payload2Mb,
      });

      expect(res.statusCode).toBe(413);
      const data = JSON.parse(res.payload);
      expect(data.error).toBeDefined();
      expect(data.error.message).toMatch(/too large|Payload Too Large/i);
    });

    it('returns 413 for 2 MB application/zip to non-import route without auth', async () => {
      const payload2Mb = Buffer.alloc(2 * 1024 * 1024, 0xbb);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/health',
        headers: {
          'content-type': 'application/zip',
        },
        payload: payload2Mb,
      });

      expect(res.statusCode).toBe(413);
    });

    it('returns 413 for 2 MB multipart/form-data to non-import route without auth', async () => {
      const boundary = '----WebKitFormBoundaryAcceptance1';
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="big.bin"\r\nContent-Type: application/octet-stream\r\n\r\n`;
      const footer = `\r\n--${boundary}--\r\n`;
      const bigContent = Buffer.alloc(2 * 1024 * 1024, 0xcc);
      const payload = Buffer.concat([Buffer.from(header), bigContent, Buffer.from(footer)]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-in/email',
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      expect(res.statusCode).toBe(413);
    });

    it('does NOT return 413 for payload under 1 MB to non-import route', async () => {
      const smallBuffer = Buffer.from(JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' }));
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/sign-in/email',
        headers: {
          'content-type': 'application/json',
        },
        payload: smallBuffer,
      });

      // Passed body parser; reaches validation/auth handler, returning non-413 (401 invalid credentials)
      expect(res.statusCode).not.toBe(413);
    });
  });

  describe('Acceptance 2: gói vượt IMPORT_MAX_BYTES vào /api/v1/admin/imports trả 413; gói fixtures hợp lệ vẫn nhập được ở chế độ draft và ready', () => {
    it('returns 413 when package exceeds IMPORT_MAX_BYTES (3 MB > 2 MB limit)', async () => {
      const payload3Mb = Buffer.alloc(3 * 1024 * 1024, 0xee);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/imports',
        headers: {
          ...adminHeaders,
          'content-type': 'application/zip',
        },
        payload: payload3Mb,
      });

      expect(res.statusCode).toBe(413);
      const data = JSON.parse(res.payload);
      expect(data.error).toBeDefined();
      expect(data.error.message).toMatch(/too large|Payload Too Large/i);
    });

    it('allows body between 1 MB and IMPORT_MAX_BYTES (1.5 MB) on /api/v1/admin/imports without 413', async () => {
      // 1.5 MB exceeds the default 1 MB parser bodyLimit, but is within 2 MB IMPORT_MAX_BYTES
      const payload1_5Mb = Buffer.alloc(Math.floor(1.5 * 1024 * 1024), 0xff);
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/imports',
        headers: {
          'content-type': 'application/zip',
          // Without admin auth header: should reach auth guard and return 401, not 413
        },
        payload: payload1_5Mb,
      });

      expect(res.statusCode).toBe(401);
    });

    it('successfully imports valid draft fixture in draft mode (?mode=draft)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/imports?mode=draft',
        headers: {
          ...adminHeaders,
          'content-type': 'application/zip',
        },
        payload: draftZipBuffer,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('DRAFT_ONLY');
      expect(body.readiness).toBe('DRAFT_ONLY');
      expect(body.blockingIssueCount).toBeGreaterThanOrEqual(1);
      expect(body.draftExamId).toBeDefined();
    });

    it('successfully imports valid ready fixture in ready mode (?mode=ready)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/imports?mode=ready',
        headers: {
          ...adminHeaders,
          'content-type': 'application/zip',
        },
        payload: readyZipBuffer,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('succeeded');
      expect(body.readiness).toBe('READY_FOR_REVIEW');
      expect(body.blockingIssueCount).toBe(0);
      expect(body.draftExamId).toBeDefined();
    });

    it('successfully imports valid fixture via multipart/form-data upload', async () => {
      const boundary = '----WebKitFormBoundaryMultipartImport';
      const header = `--${boundary}\r\nContent-Disposition: form-data; name="mode"\r\n\r\ndraft\r\n--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="draft-package.zip"\r\nContent-Type: application/zip\r\n\r\n`;
      const footer = `\r\n--${boundary}--\r\n`;
      const payload = Buffer.concat([Buffer.from(header), draftZipBuffer, Buffer.from(footer)]);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/imports',
        headers: {
          ...adminHeaders,
          'content-type': `multipart/form-data; boundary=${boundary}`,
        },
        payload,
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.status).toBe('DRAFT_ONLY');
      expect(body.readiness).toBe('DRAFT_ONLY');
    });

    it('I19: gói 12 MB vào /api/v1/admin/imports đạt; body 2 MB vào route khác trả 413 (với IMPORT_MAX_BYTES mặc định 150 MB)', async () => {
      delete process.env.IMPORT_MAX_BYTES;
      const defaultApp = await createApp();
      await defaultApp.init();
      await defaultApp.getHttpAdapter().getInstance().ready();

      try {
        // 1. Body 2 MB to non-import route returns 413
        const payload2Mb = Buffer.alloc(2 * 1024 * 1024, 0xaa);
        const resNonImport = await defaultApp.inject({
          method: 'POST',
          url: '/api/v1/auth/sign-in/email',
          headers: {
            'content-type': 'application/octet-stream',
          },
          payload: payload2Mb,
        });
        expect(resNonImport.statusCode).toBe(413);

        // 2. Gói 12 MB to /api/v1/admin/imports is accepted by Fastify (not 413)
        const payload12Mb = Buffer.alloc(12 * 1024 * 1024, 0xbb);
        const resImport = await defaultApp.inject({
          method: 'POST',
          url: '/api/v1/admin/imports',
          headers: {
            ...adminHeaders,
            'content-type': 'application/zip',
          },
          payload: payload12Mb,
        });
        expect(resImport.statusCode).not.toBe(413);
      } finally {
        await defaultApp.close();
      }
    }, 30_000);
  });
});
