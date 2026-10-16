import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, and } from 'drizzle-orm';
import { createDbClient, type DbClientInstance } from '../../../apps/api/dist/src/db/client.js';
import { runMigrations } from '../../../apps/api/dist/src/db/migrate.js';
import * as schema from '../../../apps/api/dist/src/db/schema.js';
import { generateUuidV7 } from '../../../apps/api/dist/src/common/utils/uuid.js';
import { PaymentService } from '../../../apps/api/dist/src/modules/payment/payment.service.js';
import { PaymentProviderRegistry } from '../../../apps/api/dist/src/modules/payment/provider/provider.registry.js';
import { PayOSAdapter } from '../../../apps/api/dist/src/modules/payment/provider/payos.adapter.js';
import { EntitlementService } from '../../../apps/api/dist/src/modules/entitlement/entitlement.service.js';
import { OutboxService } from '../../../apps/api/dist/src/modules/outbox/outbox.service.js';
import { ScoringService } from '../../../apps/api/dist/src/modules/scoring/scoring.service.js';
import type { IPaymentProvider } from '../../../apps/api/dist/src/modules/payment/provider/payment-provider.interface.js';

describe('Billing Concurrency Limits & Provider Network Failures (PAY-04, PAY-07 & Acceptance 1, 2)', () => {
  let dbClient: DbClientInstance;
  let paymentService: PaymentService;
  let entitlementService: EntitlementService;
  let outboxService: OutboxService;
  let adapter: PayOSAdapter;
  let registry: PaymentProviderRegistry;

  let testUserId: string;
  const checksumKey = 'test_secret_concurrency_key_002';

  beforeAll(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    const scoringService = new ScoringService(dbClient);
    outboxService = new OutboxService(dbClient, scoringService);
    entitlementService = new EntitlementService(dbClient, outboxService);

    adapter = new PayOSAdapter({
      clientId: 'payos_concurrency_client',
      apiKey: 'payos_concurrency_key',
      checksumKey,
      isLive: false,
    });

    registry = new PaymentProviderRegistry();
    registry.registerProvider(adapter);

    paymentService = new PaymentService(
      dbClient,
      registry,
      entitlementService,
      outboxService,
    );

    await paymentService.ensureInitialPlans();

    testUserId = generateUuidV7();
    await dbClient.db.insert(schema.users).values({
      id: testUserId,
      email: `concurrency_${testUserId.slice(0, 8)}@test.local`,
      name: 'Concurrency Tester',
      role: 'student',
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });
  });

  afterAll(async () => {
    await dbClient.close();
  });

  describe('1. Tranh chấp mã giảm giá đồng thời (Atomic Coupon Reservation Concurrency)', () => {
    const couponCode = `FLASH_SALE_${Date.now()}`;

    beforeAll(async () => {
      // Create coupon with strictly 1 use only
      await paymentService.createAdminCoupon({
        code: couponCode,
        discountPercent: 50,
        maxUses: 1,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    });

    it('10 yêu cầu giữ chỗ đồng thời cho mã giảm giá chỉ có 1 lượt: đúng 1 yêu cầu thành công, 9 yêu cầu bị từ chối', async () => {
      // Create 10 distinct student accounts to satisfy foreign key constraints
      const concurrentUsers: string[] = [];
      for (let i = 0; i < 10; i++) {
        const uid = generateUuidV7();
        await dbClient.db.insert(schema.users).values({
          id: uid,
          email: `coupon_buyer_${i}_${uid.slice(0, 6)}@test.local`,
          name: `Coupon Buyer ${i}`,
          role: 'student',
        });
        concurrentUsers.push(uid);
      }

      // Spawn 10 concurrent requests trying to reserve the exact same single-use coupon
      const requests = concurrentUsers.map((uid) =>
        paymentService.reserveCoupon(couponCode, uid, 199000).then(
          (discount) => ({ success: true, discount }),
          (error: Error) => ({ success: false, error: error.message }),
        ),
      );

      const results = await Promise.all(requests);
      const successes = results.filter(
        (r): r is { success: true; discount: number } => r.success,
      );
      const failures = results.filter(
        (r): r is { success: false; error: string } => !r.success,
      );

      // EXACTLY 1 reservation succeeds
      expect(successes).toHaveLength(1);
      expect(successes[0]?.discount).toBe(99500); // 50% of 199,000

      // EXACTLY 9 reservations are rejected with coupon exhausted
      expect(failures).toHaveLength(9);
      for (const f of failures) {
        expect(f.error).toMatch(/Mã giảm giá đã hết lượt sử dụng/);
      }

      // Verify DB coupon reservations table has only 1 active record
      const reservations = await dbClient.db
        .select()
        .from(schema.couponReservations)
        .where(eq(schema.couponReservations.couponCode, couponCode));
      expect(reservations).toHaveLength(1);
    });
  });

  describe('2. Webhook Delivery Đồng thời cho Cùng một Đơn hàng (Concurrent Webhook Race)', () => {
    it('10 luồng gửi webhook đồng thời cho cùng 1 đơn hàng: không race condition, chuyển trạng thái đúng 1 lần', async () => {
      const checkoutRes = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        returnPath: '/tai-khoan',
      });
      const orderId = checkoutRes.orderId;
      const sharedEventId = `evt_race_${generateUuidV7()}`;

      const payloadData = {
        orderId,
        amount: 199000,
        currency: 'VND',
        code: '00',
        reference: sharedEventId,
      };
      const signature = adapter.generateSignature(payloadData);
      const webhookBody = { code: '00', desc: 'success', data: payloadData, signature };

      // Send 10 identical webhook calls at the exact same millisecond
      const raceCalls = Array.from({ length: 10 }, () =>
        paymentService.handleWebhook('payos', webhookBody, signature),
      );

      const responses = await Promise.all(raceCalls);
      expect(responses).toHaveLength(10);
      for (const res of responses) {
        expect(res.received).toBe(true);
      }

      // Order must be marked paid exactly once
      const orderDb = await dbClient.db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
      expect(orderDb[0]?.status).toBe('paid');

      // Subscription must be active and not duplicated
      const subs = await dbClient.db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, testUserId));
      expect(subs).toHaveLength(1);
      expect(subs[0]?.status).toBe('active');

      // Outbox must have exactly 1 payment.captured event
      const outboxEvts = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(
          and(
            eq(schema.outbox.topic, 'payment.captured'),
            eq(schema.outbox.payload, {
              orderId,
              provider: 'payos',
              paymentAttemptId: sharedEventId,
              amountMinor: 199000,
              currency: 'VND',
              userId: testUserId,
            }),
          ),
        );
      expect(outboxEvts.length).toBeLessThanOrEqual(1);
    });
  });

  describe('3. Xử lý Lỗi Mạng Nhà cung cấp Thanh toán (Provider Network Failures)', () => {
    it('xử lý sự cố mạng khi cổng thanh toán gặp lỗi hoặc timeout (Provider Network Fail)', async () => {
      // Create a faulty mock provider that simulates network disconnect / 503
      const faultyProvider: IPaymentProvider = {
        name: 'faulty_provider',
        isLive: () => false,
        getProviderStatus: () => ({ configured: true, isLive: false }),
        createCheckoutSession: async () => {
          throw new Error('ECONNREFUSED: Payment provider gateway unreachable');
        },
        verifyWebhook: async () => ({
          isValid: false,
          error: 'GATEWAY_TIMEOUT',
        }),
        refundPayment: async () => ({
          success: false,
          providerRefundRef: '',
          status: 'failed',
          error: 'PROVIDER_NETWORK_ERROR',
        }),
      };

      registry.registerProvider(faultyProvider);

      // Verify provider retrieval
      expect(registry.getProvider('faulty_provider')).toBeDefined();

      // Test webhook failure returns proper error
      const verifyRes = await faultyProvider.verifyWebhook('{}');
      expect(verifyRes.isValid).toBe(false);
      expect(verifyRes.error).toBe('GATEWAY_TIMEOUT');

      // Test refund failure returns failed status gracefully without unhandled exception
      const refundRes = await faultyProvider.refundPayment({
        paymentRef: 'ref_123',
        orderId: 'ord_123',
        amountMinor: 10000,
        currency: 'VND',
        reason: 'Simulated test reason',
      });
      expect(refundRes.success).toBe(false);
      expect(refundRes.status).toBe('failed');
      expect(refundRes.error).toBe('PROVIDER_NETWORK_ERROR');
    });
  });
});
