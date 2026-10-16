import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { createDbClient, type DbClientInstance } from '../../../apps/api/src/db/client.js';
import { runMigrations } from '../../../apps/api/src/db/migrate.js';
import * as schema from '../../../apps/api/src/db/schema.js';
import { generateUuidV7 } from '../../../apps/api/src/common/utils/uuid.js';
import { EntitlementService } from '../../../apps/api/src/modules/entitlement/entitlement.service.js';
import { OutboxService } from '../../../apps/api/src/modules/outbox/outbox.service.js';

class QuotaExceededError extends Error {
  status: number;
  constructor(message = 'Token/cost budget exhausted. Please upgrade your plan or wait for the next cycle.') {
    super(message);
    this.name = 'QuotaExceededError';
    this.status = 429;
  }
}

type TransactionDb = DbClientInstance['db'];

describe('Account Quota Simulator & Concurrency Limits (L06 Task Card Scope)', () => {
  let dbClient: DbClientInstance;
  let entitlementService: EntitlementService;
  let outboxService: OutboxService;

  let freeStudentId: string;
  let premiumStudentId: string;

  beforeAll(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    outboxService = new OutboxService(dbClient);
    entitlementService = new EntitlementService(dbClient, outboxService);

    // 1. Create Free Student User
    freeStudentId = generateUuidV7();
    await dbClient.db.insert(schema.users).values({
      id: freeStudentId,
      email: `free_${freeStudentId.slice(0, 8)}@jlpt.test`,
      name: 'Free Student',
      role: 'student',
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });

    // 2. Create Premium Student User
    premiumStudentId = generateUuidV7();
    await dbClient.db.insert(schema.users).values({
      id: premiumStudentId,
      email: `premium_${premiumStudentId.slice(0, 8)}@jlpt.test`,
      name: 'Premium Student',
      role: 'student',
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });

    // 3. Set up Premium Plan and Subscription
    const planId = 'plan_premium_monthly_sim';
    await dbClient.db.insert(schema.plans).values({
      id: planId,
      name: 'Gói Cao Cấp Hàng Tháng',
      description: 'Gói Cao Cấp',
      interval: 'month',
      price: 199000,
      currency: 'VND',
      isActive: true,
    }).onConflictDoNothing();

    await dbClient.db.insert(schema.planVersions).values({
      planId,
      version: 1,
      price: 199000,
      currency: 'VND',
      entitlements: ['unlimited_exams', 'ai_explanations', 'advanced_analytics', 'premium_subscription'],
      effectiveFrom: new Date(),
    });

    // Grant active subscription to premiumStudent
    const oneMonthLater = new Date(Date.now() + 30 * 24 * 3600 * 1000);
    await dbClient.db.insert(schema.subscriptions).values({
      id: generateUuidV7(),
      userId: premiumStudentId,
      planId,
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: oneMonthLater,
    });

    // Seed provider account for AI requests
    await dbClient.db.insert(schema.providerAccounts).values({
      id: 'provider_sandbox_sim',
      providerName: 'Sandbox AI Provider',
      isActive: true,
      configRef: 'env:sandbox',
    }).onConflictDoNothing();
  });

  afterAll(async () => {
    if (dbClient) {
      await dbClient.close();
    }
  });

  describe('1. Feature-Gating & Account Quota: Free Tier vs Premium Tier', () => {
    it('Free Tier: bị chặn thi không giới hạn và tải offline, nhưng được cấp hạn mức AI hàng ngày (5 lượt)', async () => {
      // 1. Check unlimited_exams
      const examCheck = await entitlementService.checkFeatureAccess(freeStudentId, 'unlimited_exams');
      expect(examCheck.allowed).toBe(false);
      expect(examCheck.code).toBe('FEATURE_GATED');
      expect(examCheck.limit).toBe(3);

      // 2. Check download_offline
      const downloadCheck = await entitlementService.checkFeatureAccess(freeStudentId, 'download_offline');
      expect(downloadCheck.allowed).toBe(false);
      expect(downloadCheck.code).toBe('FEATURE_GATED');

      // 3. Check ai_explanations (Free tier has daily limit of 5)
      const aiCheck = await entitlementService.checkFeatureAccess(freeStudentId, 'ai_explanations');
      expect(aiCheck.allowed).toBe(true);
      expect(aiCheck.limit).toBe(5);
    });

    it('Premium Tier: mở toàn bộ tính năng cao cấp không giới hạn', async () => {
      // 1. Unlimited exams
      const examCheck = await entitlementService.checkFeatureAccess(premiumStudentId, 'unlimited_exams');
      expect(examCheck.allowed).toBe(true);

      // 2. AI explanations
      const aiCheck = await entitlementService.checkFeatureAccess(premiumStudentId, 'ai_explanations');
      expect(aiCheck.allowed).toBe(true);

      // 3. Advanced analytics
      const analyticsCheck = await entitlementService.checkFeatureAccess(premiumStudentId, 'advanced_analytics');
      expect(analyticsCheck.allowed).toBe(true);
    });
  });

  describe('2. Concurrency Limits & Atomic Token Reservation: 10 concurrent requests, zero overdraw', () => {
    const SIMULATED_USER_BUDGET = 1000;
    const TOKENS_PER_REQUEST = 250;
    let concurrencyUserId: string;

    beforeAll(async () => {
      concurrencyUserId = generateUuidV7();
      await dbClient.db.insert(schema.users).values({
        id: concurrencyUserId,
        email: `concurrency_${concurrencyUserId.slice(0, 8)}@jlpt.test`,
        name: 'Concurrency Test User',
        role: 'student',
        locale: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
      });
    });

    /**
     * Simulates atomic token reservation under high concurrency using database transaction locking.
     */
    async function reserveTokensAtomically(
      userId: string,
      tokens: number,
      budget: number,
    ): Promise<{ reservationId: string }> {
      return await dbClient.db.transaction(async (tx: TransactionDb) => {
        // Query settled ledger tokens
        const ledgerRows = await tx
          .select({
            total: sql<number>`coalesce(sum(${schema.usageLedger.tokensUsed}), 0)::int`,
          })
          .from(schema.usageLedger)
          .where(eq(schema.usageLedger.userId, userId));

        // Query active unsettled reservations
        const activeResRows = await tx
          .select({
            total: sql<number>`coalesce(sum(${schema.usageReservations.estimatedTokens}), 0)::int`,
          })
          .from(schema.usageReservations)
          .where(
            and(
              eq(schema.usageReservations.userId, userId),
              isNull(schema.usageReservations.settledAt),
            ),
          );

        const currentUsage =
          Number(ledgerRows[0]?.total ?? 0) + Number(activeResRows[0]?.total ?? 0);

        if (currentUsage + tokens > budget) {
          throw new QuotaExceededError();
        }

        const reservationId = generateUuidV7();
        await tx.insert(schema.usageReservations).values({
          id: reservationId,
          userId,
          estimatedTokens: tokens,
          reservedAt: new Date(),
        });

        return { reservationId };
      });
    }

    it('gửi đồng thời 10 yêu cầu giữ chỗ (250 tokens/request) với ngân sách 1,000 tokens: đúng 4 thành công, 6 bị chặn 429', async () => {
      const promises = Array.from({ length: 10 }, async () => {
        try {
          const res = await reserveTokensAtomically(
            concurrencyUserId,
            TOKENS_PER_REQUEST,
            SIMULATED_USER_BUDGET,
          );
          return { success: true, reservationId: res.reservationId };
        } catch (err: unknown) {
          const status = err instanceof QuotaExceededError ? err.status : 500;
          return { success: false, status };
        }
      });

      const results = await Promise.all(promises);

      const successful = results.filter((r) => r.success);
      const rejected = results.filter((r) => !r.success);

      // Exactly 4 succeed (4 * 250 = 1000)
      expect(successful.length).toBe(4);
      // Exactly 6 rejected with HTTP 429 Too Many Requests
      expect(rejected.length).toBe(6);
      expect(rejected.every((r) => r.status === 429)).toBe(true);

      // Verify DB state: total active reserved tokens is exactly 1,000, zero overdraw
      const activeReservations = await dbClient.db
        .select()
        .from(schema.usageReservations)
        .where(
          and(
            eq(schema.usageReservations.userId, concurrencyUserId),
            isNull(schema.usageReservations.settledAt),
          ),
        );

      expect(activeReservations.length).toBe(4);
      const totalReserved = activeReservations.reduce(
        (sum: number, r: { estimatedTokens: number }) => sum + r.estimatedTokens,
        0,
      );
      expect(totalReserved).toBe(1000);
    });

    it('quy trình thanh quyết toán (settle) vs hoàn tiền (cancel/refund) khi gọi provider failover', async () => {
      const activeReservations = await dbClient.db
        .select()
        .from(schema.usageReservations)
        .where(
          and(
            eq(schema.usageReservations.userId, concurrencyUserId),
            isNull(schema.usageReservations.settledAt),
          ),
        );

      expect(activeReservations.length).toBe(4);
      const [res1, res2, res3, res4] = activeReservations;

      // 1. res1 & res2 succeed -> Settle reservation into usageLedger and emit outbox event
      for (const res of [res1!, res2!]) {
        const requestId = generateUuidV7();
        await dbClient.db.transaction(async (tx: TransactionDb) => {
          // Mark reservation settled
          await tx
            .update(schema.usageReservations)
            .set({ settledAt: new Date() })
            .where(eq(schema.usageReservations.id, res.id));

          // Insert into aiRequests
          await tx.insert(schema.aiRequests).values({
            id: requestId,
            userId: concurrencyUserId,
            providerId: 'provider_sandbox_sim',
            taskType: 'explain_question',
            promptTokens: 100,
            completionTokens: 150,
            status: 'completed',
          });

          // Insert into usageLedger
          await tx.insert(schema.usageLedger).values({
            id: generateUuidV7(),
            userId: concurrencyUserId,
            aiRequestId: requestId,
            tokensUsed: res.estimatedTokens,
            costMicroUsd: 500,
            recordedAt: new Date(),
          });

          // Emit outbox event
          await outboxService.emitEvent(
            'ai.request.settled',
            requestId,
            concurrencyUserId,
            {
              requestId,
              userId: concurrencyUserId,
              tokensUsed: res.estimatedTokens,
              costMinor: 1,
            },
            tx,
          );
        });
      }

      // 2. res3 & res4 fail (e.g. provider network timeout) -> Refund reservation and emit cancellation
      for (const res of [res3!, res4!]) {
        const requestId = generateUuidV7();
        await dbClient.db.transaction(async (tx: TransactionDb) => {
          // Cancel reservation by setting settledAt and estimatedTokens = 0
          await tx
            .update(schema.usageReservations)
            .set({ settledAt: new Date(), estimatedTokens: 0 })
            .where(eq(schema.usageReservations.id, res.id));

          // Emit cancellation outbox event
          await outboxService.emitEvent(
            'ai.request.cancelled',
            requestId,
            concurrencyUserId,
            {
              requestId,
              userId: concurrencyUserId,
            },
            tx,
          );
        });
      }

      // 3. Verify outbox events were recorded
      const settledEvents = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'ai.request.settled'));
      expect(settledEvents.length).toBeGreaterThanOrEqual(2);

      const cancelledEvents = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'ai.request.cancelled'));
      expect(cancelledEvents.length).toBeGreaterThanOrEqual(2);

      // 4. Verify that refunded tokens released quota:
      // Now 500 tokens were refunded, so 2 new requests (2 * 250 = 500) must succeed!
      const nextRequest1 = await reserveTokensAtomically(
        concurrencyUserId,
        TOKENS_PER_REQUEST,
        SIMULATED_USER_BUDGET,
      );
      expect(nextRequest1.reservationId).toBeDefined();

      const nextRequest2 = await reserveTokensAtomically(
        concurrencyUserId,
        TOKENS_PER_REQUEST,
        SIMULATED_USER_BUDGET,
      );
      expect(nextRequest2.reservationId).toBeDefined();

      // The 3rd request must be rejected because budget is full again (500 settled + 500 reserved = 1000)
      await expect(
        reserveTokensAtomically(concurrencyUserId, TOKENS_PER_REQUEST, SIMULATED_USER_BUDGET),
      ).rejects.toThrow();
    });
  });
});
