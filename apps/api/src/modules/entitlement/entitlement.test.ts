import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { EntitlementService, DEFAULT_FREE_ENTITLEMENTS } from './entitlement.service.js';
import { EntitlementController } from './entitlement.controller.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { ScoringService } from '../scoring/scoring.service.js';

describe('L04 Entitlement Module Tests (PAY-01, PAY-03, PAY-10, PAY-11)', () => {
  let dbClient: DbClientInstance;
  let entitlementService: EntitlementService;
  let entitlementController: EntitlementController;
  let outboxService: OutboxService;
  let scoringService: ScoringService;
  let testUserId: string;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    scoringService = new ScoringService(dbClient);
    outboxService = new OutboxService(dbClient, scoringService);
    entitlementService = new EntitlementService(dbClient, outboxService);
    entitlementController = new EntitlementController(entitlementService);

    testUserId = generateUuidV7();
    // Seed test user
    await dbClient.db.insert(schema.users).values({
      id: testUserId,
      email: `user_${testUserId.slice(0, 8)}@test.local`,
      name: 'Test Student',
      role: 'student',
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });
  });

  afterEach(async () => {
    await dbClient.close();
  });

  describe('PAY-01: Gói tài khoản miễn phí (Free Plan Entitlements)', () => {
    it('cấp các quyền mặc định cơ bản cho người dùng chưa đăng ký gói trả phí', async () => {
      const entitlements = await entitlementService.getUserEntitlements(testUserId);
      expect(entitlements.items.length).toBeGreaterThanOrEqual(4);

      for (const expected of DEFAULT_FREE_ENTITLEMENTS) {
        expect(entitlements.items.some((i) => i.entitlement === expected && i.active)).toBe(true);
      }
    });

    it('hasEntitlement trả về true với quyền miễn phí và false với quyền premium', async () => {
      const hasBasic = await entitlementService.hasEntitlement(testUserId, 'basic_exams');
      expect(hasBasic).toBe(true);

      const hasPremium = await entitlementService.hasEntitlement(testUserId, 'premium_subscription');
      expect(hasPremium).toBe(false);
    });

    it('controller trả về danh sách quyền lợi cho user đã xác thực', async () => {
      const res = await entitlementController.getUserEntitlements({
        userId: testUserId,
        email: 'student@test.local',
        name: 'Student',
        role: 'student',
        sessionId: 'session_1',
        sessionToken: 'token_1',
        emailVerified: true,
      });
      expect(res.items.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('PAY-03: Giới hạn tính năng theo gói (Feature Gating)', () => {
    it('chặn tính năng thi thử không giới hạn đối với tài khoản miễn phí', async () => {
      const check = await entitlementService.checkFeatureAccess(testUserId, 'unlimited_exams');
      expect(check.allowed).toBe(false);
      expect(check.code).toBe('FEATURE_GATED');
      expect(check.limit).toBe(3);
    });

    it('chặn tính năng tải bài thi ngoại tuyến đối với tài khoản miễn phí', async () => {
      const check = await entitlementService.checkFeatureAccess(testUserId, 'download_offline');
      expect(check.allowed).toBe(false);
      expect(check.code).toBe('FEATURE_GATED');
    });

    it('cho phép tính năng giải thích AI trong hạn mức miễn phí', async () => {
      const check = await entitlementService.checkFeatureAccess(testUserId, 'ai_explanations');
      expect(check.allowed).toBe(true);
      expect(check.limit).toBe(5);
    });

    it('mở khóa toàn bộ tính năng khi học viên có gói Premium hoạt động', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      // Seed a premium plan and subscription
      await dbClient.db.insert(schema.plans).values({
        id: 'premium_month',
        name: 'Gói Premium Tháng',
        interval: 'month',
        price: 199000,
        currency: 'VND',
        isActive: true,
      });

      await dbClient.db.insert(schema.planVersions).values({
        planId: 'premium_month',
        version: 1,
        price: 199000,
        entitlements: ['unlimited_exams', 'ai_explanations', 'advanced_analytics'],
        effectiveFrom: now,
      });

      await dbClient.db.insert(schema.subscriptions).values({
        id: generateUuidV7(),
        userId: testUserId,
        planId: 'premium_month',
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: expiresAt,
        cancelAtPeriodEnd: false,
      });

      const checkExams = await entitlementService.checkFeatureAccess(testUserId, 'unlimited_exams');
      expect(checkExams.allowed).toBe(true);

      const checkAi = await entitlementService.checkFeatureAccess(testUserId, 'ai_explanations');
      expect(checkAi.allowed).toBe(true);

      const checkAnalytics = await entitlementService.checkFeatureAccess(testUserId, 'advanced_analytics');
      expect(checkAnalytics.allowed).toBe(true);
    });
  });

  describe('PAY-10: Gói giáo viên/trung tâm và State Machine gói tổ chức (Acceptance 2)', () => {
    it('khởi tạo gói tổ chức với trạng thái active và hạn ngạch tài khoản (seats)', async () => {
      const tenantId = generateUuidV7();
      const plan = await entitlementService.getTenantPlan(tenantId);

      expect(plan.tenantId).toBe(tenantId);
      expect(plan.status).toBe('active');
      expect(plan.totalSeats).toBe(50);
      expect(plan.usedSeats).toBe(0);
    });

    it('chuyển trạng thái state machine gói tổ chức: active -> suspended -> expired', async () => {
      const tenantId = generateUuidV7();

      // active -> suspended
      const suspended = await entitlementService.setTenantPlan(tenantId, { status: 'suspended' });
      expect(suspended.status).toBe('suspended');

      // suspended -> expired
      const expired = await entitlementService.setTenantPlan(tenantId, { status: 'expired' });
      expect(expired.status).toBe('expired');

      // expired -> active
      const reactivated = await entitlementService.setTenantPlan(tenantId, { status: 'active' });
      expect(reactivated.status).toBe('active');
    });

    it('từ chối chuyển trạng thái bất hợp lệ trong state machine tổ chức', async () => {
      const tenantId = generateUuidV7();
      await entitlementService.setTenantPlan(tenantId, { status: 'suspended' });

      // Cannot transition from suspended to trial
      await expect(
        entitlementService.setTenantPlan(tenantId, { status: 'trial' }),
      ).rejects.toThrow();
    });

    it('cấp ghế học viên (seats) trong tổ chức và chặn khi vượt quá quota', async () => {
      const tenantId = generateUuidV7();
      await entitlementService.setTenantPlan(tenantId, { totalSeats: 2, usedSeats: 0 });

      // Assign seat 1
      const res1 = await entitlementService.assignTenantSeat(tenantId);
      expect(res1.success).toBe(true);
      expect(res1.remainingSeats).toBe(1);

      // Assign seat 2
      const res2 = await entitlementService.assignTenantSeat(tenantId);
      expect(res2.success).toBe(true);
      expect(res2.remainingSeats).toBe(0);

      // Assign seat 3 -> overdraft error
      await expect(entitlementService.assignTenantSeat(tenantId)).rejects.toThrow(
        'Tổ chức đã dùng hết số lượng tài khoản (seats) được cấp.',
      );
    });

    it('chặn cấp ghế nếu gói tổ chức bị tạm dừng (suspended)', async () => {
      const tenantId = generateUuidV7();
      await entitlementService.setTenantPlan(tenantId, { status: 'suspended' });

      await expect(entitlementService.assignTenantSeat(tenantId)).rejects.toThrow(
        'Gói của tổ chức đang ở trạng thái suspended.',
      );
    });
  });

  describe('PAY-11 & Acceptance 3: Quota AI reserve/settle/refund nguyên tử', () => {
    it('reserve hạn mức token AI thành công khi còn trong giới hạn', async () => {
      const reserve = await entitlementService.reserveAIQuota({
        userId: testUserId,
        estimatedTokens: 500,
        taskType: 'explain_question',
      });

      expect(reserve.reservationId).toBeDefined();
      expect(reserve.estimatedTokens).toBe(500);

      // Verify in DB
      const rows = await dbClient.db
        .select()
        .from(schema.usageReservations)
        .where(eq(schema.usageReservations.id, reserve.reservationId));

      expect(rows.length).toBe(1);
      expect(rows[0]!.estimatedTokens).toBe(500);
      expect(rows[0]!.settledAt).toBeNull();
    });

    it('từ chối reserve khi yêu cầu vượt quá hạn mức token (chống overdraft nguyên tử)', async () => {
      // Free tier allowance is 60,000 monthly
      await expect(
        entitlementService.reserveAIQuota({
          userId: testUserId,
          estimatedTokens: 70000,
          taskType: 'explain_question',
        }),
      ).rejects.toThrow('Hạn mức token AI cho chu kỳ này đã vượt quá giới hạn.');
    });

    it('settle hạn mức AI: cập nhật settledAt, ghi nhận usage_ledger và phát sự kiện outbox', async () => {
      const reserve = await entitlementService.reserveAIQuota({
        userId: testUserId,
        estimatedTokens: 400,
        taskType: 'grammar_explanation',
      });

      const settle = await entitlementService.settleAIQuota({
        reservationId: reserve.reservationId,
        actualTokens: 380,
        costMicroUsd: 1200,
        aiRequestId: '0192a000-0000-7000-8000-000000000099',
      });

      expect(settle.settled).toBe(true);

      // Verify reservation is settled
      const resRows = await dbClient.db
        .select()
        .from(schema.usageReservations)
        .where(eq(schema.usageReservations.id, reserve.reservationId));
      expect(resRows[0]!.settledAt).not.toBeNull();

      // Verify usage ledger record
      const ledgerRows = await dbClient.db
        .select()
        .from(schema.usageLedger)
        .where(eq(schema.usageLedger.userId, testUserId));
      expect(ledgerRows.length).toBe(1);
      expect(ledgerRows[0]!.tokensUsed).toBe(380);
      expect(ledgerRows[0]!.costMicroUsd).toBe(1200);

      // Verify outbox event emitted
      const outboxEvents = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'ai.request.settled'));
      expect(outboxEvents.length).toBe(1);
    });

    it('refund hạn mức AI khi request bị lỗi: hủy reservation, không trừ ledger và không rò rỉ token', async () => {
      const reserve = await entitlementService.reserveAIQuota({
        userId: testUserId,
        estimatedTokens: 450,
        taskType: 'reading_explanation',
      });

      const refund = await entitlementService.refundAIQuota(reserve.reservationId);
      expect(refund.refunded).toBe(true);
      expect(refund.reservationId).toBe(reserve.reservationId);

      // Verify reservation is deleted / released
      const resRows = await dbClient.db
        .select()
        .from(schema.usageReservations)
        .where(eq(schema.usageReservations.id, reserve.reservationId));
      expect(resRows.length).toBe(0);

      // Verify zero rows in usage_ledger (no double debit, zero token leak)
      const ledgerRows = await dbClient.db
        .select()
        .from(schema.usageLedger)
        .where(eq(schema.usageLedger.userId, testUserId));
      expect(ledgerRows.length).toBe(0);

      // Verify outbox event ai.request.cancelled emitted
      const outboxEvents = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'ai.request.cancelled'));
      expect(outboxEvents.length).toBe(1);
    });

    it('từ chối refund một phiên giữ đã settle trước đó', async () => {
      const reserve = await entitlementService.reserveAIQuota({
        userId: testUserId,
        estimatedTokens: 300,
        taskType: 'vocab_hint',
      });

      await entitlementService.settleAIQuota({
        reservationId: reserve.reservationId,
        actualTokens: 300,
        costMicroUsd: 1000,
      });

      await expect(entitlementService.refundAIQuota(reserve.reservationId)).rejects.toThrow(
        'Không thể hủy phiên giữ hạn mức đã được thanh toán (settled).',
      );
    });
  });
});
