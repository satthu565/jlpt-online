import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq } from 'drizzle-orm';
import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { NestFactory } from '@nestjs/core';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { Roles } from '../decorators/roles.decorator.js';
import { RolesGuard } from './roles.guard.js';
import { AuthGuard } from './auth.guard.js';
import { TenantGuard } from './tenant.guard.js';
import { OriginGuard } from './origin.guard.js';
import { TotpGuard } from './totp.guard.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { RateLimit } from '../decorators/rate-limit.decorator.js';
import { RequireTotp } from '../decorators/require-totp.decorator.js';
import { ApiExceptionFilter } from '../filters/api-exception.filter.js';
import { PiiMaskingInterceptor } from '../interceptors/pii-masking.interceptor.js';
import { maskPii, maskPiiString, maskEmail } from '../utils/pii.js';
import { DatabaseModule, getOrCreateDbClient } from '../database/database.module.js';
import { EmailModule } from '../../modules/email/email.module.js';
import { AuthModule } from '../../modules/auth/auth.module.js';
import { AuthService } from '../../modules/auth/auth.service.js';
import { AuditModule } from '../../modules/audit/audit.module.js';
import { AdminModule } from '../../modules/admin/admin.module.js';
import { AuditService } from '../../modules/audit/audit.service.js';
import { generateTotp } from '../utils/totp.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../utils/uuid.js';

@Controller('test-rbac')
class RbacTestController {
  @Get('public-endpoint')
  publicEndpoint() {
    return { ok: true };
  }

  @Get('student-endpoint')
  studentEndpoint() {
    return { ok: true, access: 'student' };
  }

  @Get('editor-endpoint')
  @Roles('editor', 'admin')
  editorEndpoint() {
    return { ok: true, access: 'editor' };
  }

  @Get('admin-endpoint')
  @Roles('admin')
  adminEndpoint() {
    return { ok: true, access: 'admin' };
  }

  @Get('tenant-scoped')
  @UseGuards(TenantGuard)
  tenantScoped() {
    return { ok: true, access: 'tenant' };
  }

  @Post('state-change')
  stateChange() {
    return { ok: true, mutated: true };
  }

  @Get('limited-endpoint')
  @RateLimit({ limit: 2, windowSec: 60, keyPrefix: 'test-limit' })
  limitedEndpoint() {
    return { ok: true };
  }
}

@Controller('admin/test')
class AdminHostTestController {
  @Get('dashboard')
  @Roles('admin', 'editor')
  adminDashboard() {
    return { ok: true, access: 'admin_dashboard' };
  }

  @Post('sensitive-action')
  @Roles('admin')
  @RequireTotp()
  sensitiveAction() {
    return { ok: true, action: 'sensitive_completed' };
  }
}

@Module({
  imports: [DatabaseModule, EmailModule, AuthModule, AuditModule, AdminModule],
  controllers: [RbacTestController, AdminHostTestController],
  providers: [
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TotpGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: PiiMaskingInterceptor },
  ],
})
class TestAppModule {}

describe('F03 Authorization and PII Protection (SYS-06, SYS-07)', () => {
  let app: NestFastifyApplication;
  let studentToken = '';
  let editorToken = '';
  let adminToken = '';

  beforeAll(async () => {
    process.env.ADMIN_HOST = 'admin.jlpt.local';

    const client = await getOrCreateDbClient();

    // 1. Create Student User & Session
    const studentId = generateUuidV7();
    studentToken = 'test_token_student_' + Date.now();
    await client.db.insert(schema.users).values({
      id: studentId,
      email: `student_${Date.now()}@example.com`,
      role: 'student',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: studentId,
      token: studentToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // 2. Create Editor User & Session
    const editorId = generateUuidV7();
    editorToken = 'test_token_editor_' + Date.now();
    await client.db.insert(schema.users).values({
      id: editorId,
      email: `editor_${Date.now()}@example.com`,
      role: 'editor',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: editorId,
      token: editorToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // 3. Create Admin User & Session
    const adminId = generateUuidV7();
    adminToken = 'test_token_admin_' + Date.now();
    await client.db.insert(schema.users).values({
      id: adminId,
      email: `admin_${Date.now()}@example.com`,
      role: 'admin',
      emailVerified: true,
    });
    await client.db.insert(schema.sessions).values({
      id: generateUuidV7(),
      userId: adminId,
      token: adminToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // Start test app
    app = await NestFactory.create<NestFastifyApplication>(
      TestAppModule,
      new FastifyAdapter(),
      { logger: ['error', 'warn'] },
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    delete process.env.ADMIN_HOST;
    await app.close();
  });

  describe('Acceptance 3: Endpoint thiếu quyền mặc định bị từ chối', () => {
    it('Yêu cầu không có thông tin xác thực bị từ chối 401 UNAUTHENTICATED', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-rbac/student-endpoint',
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('UNAUTHENTICATED');
      expect(body.error.requestId).toBeDefined();
    });

    it('Yêu cầu với token không hợp lệ bị từ chối 401 UNAUTHENTICATED', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-rbac/student-endpoint',
        headers: {
          authorization: 'Bearer invalid_bogus_token_123',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('UNAUTHENTICATED');
    });

    it('Học viên có quyền truy cập endpoint thông thường', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-rbac/student-endpoint',
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.ok).toBe(true);
    });

    it('SYS-07: Học viên (student) bị từ chối 403 FORBIDDEN khi vào endpoint của editor/admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-rbac/editor-endpoint',
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('SYS-07: Editor có quyền truy cập editor-endpoint', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-rbac/editor-endpoint',
        headers: {
          authorization: `Bearer ${editorToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.access).toBe('editor');
    });

    it('SYS-07: Editor bị từ chối 403 khi vào endpoint chỉ dành cho Admin', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-rbac/admin-endpoint',
        headers: {
          authorization: `Bearer ${editorToken}`,
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('FORBIDDEN');
    });

    it('SYS-07: Admin có quyền truy cập toàn bộ các role endpoint', async () => {
      // Editor endpoint
      const res1 = await app.inject({
        method: 'GET',
        url: '/api/v1/test-rbac/editor-endpoint',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res1.statusCode).toBe(200);

      // Admin endpoint
      const res2 = await app.inject({
        method: 'GET',
        url: '/api/v1/test-rbac/admin-endpoint',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res2.statusCode).toBe(200);
    });

    it('SYS-07 & Hợp đồng: Route /api/v1/admin/* từ chối khi không truy cập qua ADMIN_HOST', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/test/dashboard',
        headers: {
          authorization: `Bearer ${adminToken}`,
          host: 'public.example.com',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('ADMIN_HOST');
    });

    it('P0 Security: Từ chối kẻ tấn công giả mạo Host header chứa tên miền phụ (admin.jlpt.local.attacker.com)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/test/dashboard',
        headers: {
          authorization: `Bearer ${adminToken}`,
          host: 'admin.jlpt.local.attacker.com',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toContain('ADMIN_HOST');
    });

    it('SYS-07 & Hợp đồng: Route /api/v1/admin/* cho phép khi truy cập đúng ADMIN_HOST (kể cả có cổng)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/test/dashboard',
        headers: {
          authorization: `Bearer ${adminToken}`,
          host: 'admin.jlpt.local:3000',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.access).toBe('admin_dashboard');
    });

    it('P1 Security: Học viên truy cập endpoint thường có query parameter chứa /api/v1/admin không bị chặn nhầm', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-rbac/student-endpoint?redirect=/api/v1/admin',
        headers: {
          authorization: `Bearer ${studentToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.ok).toBe(true);
    });
  });

  describe('Tenant Isolation (TenantGuard)', () => {
    it('Truy cập chéo tổ chức bị từ chối 403 TENANT_FORBIDDEN', async () => {
      // User with tenantId 'org-1' trying to access 'org-2'
      const client = await getOrCreateDbClient();
      const crossUserId = generateUuidV7();
      const crossToken = 'cross_tenant_token_' + Date.now();
      await client.db.insert(schema.users).values({
        id: crossUserId,
        email: `tenant_${Date.now()}@example.com`,
        role: 'student',
        emailVerified: true,
      });
      await client.db.insert(schema.sessions).values({
        id: generateUuidV7(),
        userId: crossUserId,
        token: crossToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      // Override session user context with tenantId
      const authService = app.get(AuthService);
      const originalGetSession = authService.getSession.bind(authService);
      authService.getSession = async (token: string) => {
        const session = await originalGetSession(token);
        if (session && token === crossToken) {
          return { ...session, tenantId: 'org-1' };
        }
        return session;
      };

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/test-rbac/tenant-scoped',
        headers: {
          authorization: `Bearer ${crossToken}`,
          'x-organization-id': 'org-2',
        },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error.code).toBe('TENANT_FORBIDDEN');

      // Restore
      authService.getSession = originalGetSession;
    });
  });

  describe('Acceptance 3: Log che PII và bảo vệ dữ liệu (SYS-06)', () => {
    it('Che địa chỉ email nhạy cảm (maskEmail)', () => {
      expect(maskEmail('john.doe@example.com')).toBe('j***@example.com');
      expect(maskEmail('student@jlpt.vn')).toBe('s***@jlpt.vn');
      expect(maskEmail('a@b.com')).toBe('a***@b.com');
    });

    it('Che bearer token và secret parameters trong chuỗi log (maskPiiString)', () => {
      const rawLog = 'Request: GET /api/v1/auth/verify?token=secret123456 Authorization: Bearer eyJhbGciOi...';
      const masked = maskPiiString(rawLog);
      expect(masked).not.toContain('secret123456');
      expect(masked).not.toContain('eyJhbGciOi...');
      expect(masked).toContain('token=[REDACTED]');
      expect(masked).toContain('Bearer [REDACTED]');
    });

    it('Đệ quy che các trường nhạy cảm trong đối tượng dữ liệu (maskPii)', () => {
      const sensitivePayload = {
        email: 'user@example.com',
        password: 'mySecretPassword123!',
        newPassword: 'myNewSecretPassword456!',
        accessToken: 'access_secret_token_abc',
        refreshToken: 'refresh_secret_token_xyz',
        nested: {
          apiKey: 'pk_live_123456',
          userEmail: 'nested.user@domain.com',
          normalField: 'clean_data',
        },
      };

      const masked = maskPii(sensitivePayload);
      expect(masked.password).toBe('[REDACTED]');
      expect(masked.newPassword).toBe('[REDACTED]');
      expect(masked.accessToken).toBe('[REDACTED]');
      expect(masked.refreshToken).toBe('[REDACTED]');
      expect(masked.email).toBe('u***@example.com');
      expect(masked.nested.apiKey).toBe('[REDACTED]');
      expect(masked.nested.userEmail).toBe('n***@domain.com');
      expect(masked.nested.normalField).toBe('clean_data');
    });
  });

  describe('Acceptance 4: TOTP Origin CSRF rate-limit audit có negative tests', () => {
    const testTotpSecret = 'JBSWY3DPEHPK3PXP';

    describe('TOTP 2FA Verification (Negative & Positive)', () => {
      it('Negative: Admin endpoint yêu cầu TOTP từ chối khi không có mã TOTP (TWO_FACTOR_REQUIRED)', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/admin/test/sensitive-action',
          headers: {
            authorization: `Bearer ${adminToken}`,
            host: 'admin.jlpt.local',
          },
        });

        expect(res.statusCode).toBe(403);
        const body = JSON.parse(res.payload);
        expect(body.error.code).toBe('TWO_FACTOR_REQUIRED');
      });

      it('Negative: Admin endpoint từ chối khi mã TOTP không hợp lệ (TWO_FACTOR_REQUIRED)', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/admin/test/sensitive-action',
          headers: {
            authorization: `Bearer ${adminToken}`,
            host: 'admin.jlpt.local',
            'x-totp-code': '000000', // Invalid code
          },
        });

        expect(res.statusCode).toBe(403);
        const body = JSON.parse(res.payload);
        expect(body.error.code).toBe('TWO_FACTOR_REQUIRED');
      });

      it('Positive: Admin endpoint chấp nhận khi gửi đúng mã TOTP chuẩn RFC 6238', async () => {
        const validCode = generateTotp(testTotpSecret);

        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/admin/test/sensitive-action',
          headers: {
            authorization: `Bearer ${adminToken}`,
            host: 'admin.jlpt.local',
            'x-totp-code': validCode,
          },
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.payload);
        expect(body.action).toBe('sensitive_completed');
      });
    });

    describe('Origin & CSRF Protection (Negative & Positive)', () => {
      it('Negative: Request ghi bị từ chối 403 khi Origin không thuộc danh sách cho phép (CSRF attempt)', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/test-rbac/state-change',
          headers: {
            authorization: `Bearer ${studentToken}`,
            origin: 'https://malicious-attacker.evil.com',
          },
        });

        expect(res.statusCode).toBe(403);
        const body = JSON.parse(res.payload);
        expect(body.error.code).toBe('FORBIDDEN');
        expect(body.error.message).toContain('Origin');
      });

      it('Positive: Request ghi thành công khi Origin khớp host máy chủ', async () => {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/test-rbac/state-change',
          headers: {
            authorization: `Bearer ${studentToken}`,
            origin: 'http://localhost:3000',
            host: 'localhost:3000',
          },
        });

        expect(res.statusCode).toBe(201);
        const body = JSON.parse(res.payload);
        expect(body.mutated).toBe(true);
      });
    });

    describe('Rate Limiting (SYS-12, Negative)', () => {
      it('Negative: Vượt quá giới hạn gọi liên tiếp bị chặn 429 RATE_LIMITED', async () => {
        // First 2 requests within limit
        const res1 = await app.inject({
          method: 'GET',
          url: '/api/v1/test-rbac/limited-endpoint',
          headers: { authorization: `Bearer ${studentToken}` },
        });
        expect(res1.statusCode).toBe(200);

        const res2 = await app.inject({
          method: 'GET',
          url: '/api/v1/test-rbac/limited-endpoint',
          headers: { authorization: `Bearer ${studentToken}` },
        });
        expect(res2.statusCode).toBe(200);

        // 3rd request exceeds limit of 2
        const res3 = await app.inject({
          method: 'GET',
          url: '/api/v1/test-rbac/limited-endpoint',
          headers: { authorization: `Bearer ${studentToken}` },
        });
        expect(res3.statusCode).toBe(429);
        const body = JSON.parse(res3.payload);
        expect(body.error.code).toBe('RATE_LIMITED');
      });
    });

    describe('Audit Logs (ADM-14, Negative & Positive)', () => {
      it('Negative: Học viên thường bị từ chối 403 khi cố xem nhật ký thao tác quản trị', async () => {
        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/admin/audit-logs',
          headers: {
            authorization: `Bearer ${studentToken}`,
            host: 'admin.jlpt.local',
          },
        });

        expect(res.statusCode).toBe(403);
        const body = JSON.parse(res.payload);
        expect(body.error.code).toBe('FORBIDDEN');
      });

      it('Positive: Admin có thể xem nhật ký audit và các thao tác đã ghi nhận', async () => {
        // Record an audit action first
        const auditService = app.get(AuditService);
        const client = await getOrCreateDbClient();
        const [adminUser] = await client.db
          .select()
          .from(schema.users)
          .where(eq(schema.users.role, 'admin'))
          .limit(1);

        await auditService.recordAction({
          operatorId: adminUser!.id,
          action: 'EXAM_PUBLISH',
          targetResource: 'exam:0192f000-0000-7000-8000-000000000001',
          details: { version: 1, note: 'Approved release' },
        });

        const validCode = generateTotp(testTotpSecret);

        const res = await app.inject({
          method: 'GET',
          url: '/api/v1/admin/audit-logs',
          headers: {
            authorization: `Bearer ${adminToken}`,
            host: 'admin.jlpt.local',
            'x-totp-code': validCode,
          },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.payload);
        expect(body.items).toBeDefined();
        expect(Array.isArray(body.items)).toBe(true);
        expect(body.items.some((i: { action?: string }) => i.action === 'EXAM_PUBLISH')).toBe(true);
      });
    });
  });
});

