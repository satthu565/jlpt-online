import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { eq, and, sql } from 'drizzle-orm';
import { createDbClient, type DbClientInstance } from '../../../apps/api/dist/src/db/client.js';
import { runMigrations } from '../../../apps/api/dist/src/db/migrate.js';
import * as schema from '../../../apps/api/dist/src/db/schema.js';
import { generateUuidV7 } from '../../../apps/api/dist/src/common/utils/uuid.js';
import { PaymentService } from '../../../apps/api/dist/src/modules/payment/payment.service.js';
import { PaymentController } from '../../../apps/api/dist/src/modules/payment/payment.controller.js';
import { PaymentProviderRegistry } from '../../../apps/api/dist/src/modules/payment/provider/provider.registry.js';
import { PayOSAdapter } from '../../../apps/api/dist/src/modules/payment/provider/payos.adapter.js';
import { EntitlementService } from '../../../apps/api/dist/src/modules/entitlement/entitlement.service.js';
import { OutboxService } from '../../../apps/api/dist/src/modules/outbox/outbox.service.js';
import { ScoringService } from '../../../apps/api/dist/src/modules/scoring/scoring.service.js';

describe('Billing Replay & Outbox Reliability (Acceptance 1: Không double-charge/double-count)', () => {
  let dbClient: DbClientInstance;
  let paymentService: PaymentService;
  let _paymentController: PaymentController;
  let entitlementService: EntitlementService;
  let outboxService: OutboxService;
  let adapter: PayOSAdapter;
  let registry: PaymentProviderRegistry;

  let studentId: string;
  let adminId: string;
  const checksumKey = 'test_secret_checksum_key_replay_001';

  beforeAll(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    const scoringService = new ScoringService(dbClient);
    outboxService = new OutboxService(dbClient, scoringService);
    entitlementService = new EntitlementService(dbClient, outboxService);

    adapter = new PayOSAdapter({
      clientId: 'payos_replay_client',
      apiKey: 'payos_replay_key',
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
    _paymentController = new PaymentController(paymentService);

    await paymentService.ensureInitialPlans();

    // Create test student
    studentId = generateUuidV7();
    await dbClient.db.insert(schema.users).values({
      id: studentId,
      email: `student_${studentId.slice(0, 8)}@test.local`,
      name: 'Nguyen Van Replay',
      role: 'student',
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });

    // Create test admin
    adminId = generateUuidV7();
    await dbClient.db.insert(schema.users).values({
      id: adminId,
      email: `admin_${adminId.slice(0, 8)}@test.local`,
      name: 'Billing Admin',
      role: 'admin',
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });
  });

  afterAll(async () => {
    await dbClient.close();
  });

  describe('1. Webhook Replay Idempotency: Không Double-Charge & Không Nhân đôi Thời hạn Gói', () => {
    let orderId: string;
    let initialPeriodEnd: Date;
    const webhookEventId = `evt_pay_${generateUuidV7()}`;

    it('tạo đơn hàng mới và checkout session cho gói premium_month', async () => {
      const checkoutRes = await paymentService.createCheckoutSession(studentId, {
        planId: 'premium_month',
        returnPath: '/tai-khoan',
      });

      expect(checkoutRes.orderId).toBeDefined();
      expect(checkoutRes.checkoutUrl).toBeDefined();
      orderId = checkoutRes.orderId;

      // Verify order initial state is created
      const order = await dbClient.db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
      expect(order[0]?.status).toBe('created');
      expect(order[0]?.totalAmount).toBe(199000);
    });

    it('lần nhận webhook đầu tiên: chuyển trạng thái paid, cấp thuê bao 30 ngày, phát đúng 1 sự kiện payment.captured', async () => {
      const payloadData = {
        orderId,
        amount: 199000,
        currency: 'VND',
        code: '00',
        reference: webhookEventId,
      };
      const signature = adapter.generateSignature(payloadData);

      const webhookBody = {
        code: '00',
        desc: 'success',
        data: payloadData,
        signature,
      };

      const result = await paymentService.handleWebhook('payos', webhookBody, signature);
      expect(result.received).toBe(true);

      // Verify order status is paid
      const order = await dbClient.db.select().from(schema.orders).where(eq(schema.orders.id, orderId));
      expect(order[0]?.status).toBe('paid');

      // Verify subscription is active
      const sub = await dbClient.db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, studentId));
      expect(sub).toHaveLength(1);
      expect(sub[0]?.status).toBe('active');
      expect(sub[0]?.planId).toBe('premium_month');
      initialPeriodEnd = sub[0]!.currentPeriodEnd;

      // Check duration is approximately 30 days
      const days = (initialPeriodEnd.getTime() - sub[0]!.currentPeriodStart.getTime()) / (1000 * 60 * 60 * 24);
      expect(Math.round(days)).toBe(30);

      // Verify outbox emitted exactly 1 payment.captured event
      const outboxRows = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(
          and(
            eq(schema.outbox.topic, 'payment.captured'),
            sql`${schema.outbox.payload}->>'aggregateId' = ${orderId}`,
          ),
        );
      expect(outboxRows).toHaveLength(1);
    });

    it('replay lặp lại webhook 5 lần: được deduplicate, không cộng thêm ngày, không phát thêm sự kiện outbox', async () => {
      const payloadData = {
        orderId,
        amount: 199000,
        currency: 'VND',
        code: '00',
        reference: webhookEventId,
      };
      const signature = adapter.generateSignature(payloadData);

      const webhookBody = {
        code: '00',
        desc: 'success',
        data: payloadData,
        signature,
      };

      // Replay identical webhook 5 consecutive times
      for (let i = 0; i < 5; i++) {
        const replayRes = await paymentService.handleWebhook('payos', webhookBody, signature);
        expect(replayRes.received).toBe(true);
        expect(replayRes.deduplicated).toBe(true);
      }

      // INVARIANT 1: Subscription currentPeriodEnd is completely unchanged (NOT extended 30*5 days!)
      const sub = await dbClient.db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, studentId));
      expect(sub).toHaveLength(1);
      expect(sub[0]?.currentPeriodEnd.getTime()).toBe(initialPeriodEnd.getTime());

      // INVARIANT 2: No duplicate subscription records
      const allSubs = await dbClient.db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, studentId));
      expect(allSubs).toHaveLength(1);

      // INVARIANT 3: Outbox table has EXACTLY 1 payment.captured event for this order (no double-count)
      const outboxRows = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(
          and(
            eq(schema.outbox.topic, 'payment.captured'),
            sql`${schema.outbox.payload}->>'aggregateId' = ${orderId}`,
          ),
        );
      expect(outboxRows).toHaveLength(1);

      // INVARIANT 4: Only 1 webhook receipt entry marked processed
      const webhookEvents = await dbClient.db
        .select()
        .from(schema.paymentWebhookEvents)
        .where(
          and(
            eq(schema.paymentWebhookEvents.provider, 'payos'),
            eq(schema.paymentWebhookEvents.eventId, webhookEventId),
          ),
        );
      expect(webhookEvents).toHaveLength(1);
      expect(webhookEvents[0]?.processedAt).not.toBeNull();
    });
  });

  describe('2. Xử lý Sự kiện Out-of-Order: Webhook FAILED đến sau PAID không hạ cấp trạng thái', () => {
    let orderId2: string;
    const delayedFailedEventId = `evt_failed_delayed_${generateUuidV7()}`;

    beforeAll(async () => {
      const checkoutRes = await paymentService.createCheckoutSession(studentId, {
        planId: 'premium_quarter',
        returnPath: '/tai-khoan',
      });
      orderId2 = checkoutRes.orderId;

      // Pay the order first
      const paidPayload = {
        orderId: orderId2,
        amount: 499000,
        currency: 'VND',
        code: '00',
        reference: `evt_paid_first_${generateUuidV7()}`,
      };
      const sig = adapter.generateSignature(paidPayload);
      await paymentService.handleWebhook('payos', { code: '00', desc: 'success', data: paidPayload, signature: sig });
    });

    it('bỏ qua webhook FAILED đến trễ sau khi đơn hàng đã PAID (ignoredOutOfOrder: true)', async () => {
      const delayedFailedPayload = {
        orderId: orderId2,
        amount: 499000,
        currency: 'VND',
        code: '01', // Failed attempt
        reference: delayedFailedEventId,
      };
      const sig = adapter.generateSignature(delayedFailedPayload);

      const result = await paymentService.handleWebhook('payos', {
        code: '01',
        desc: 'delayed bank timeout',
        data: delayedFailedPayload,
        signature: sig,
      });

      expect(result.received).toBe(true);
      expect(result.ignoredOutOfOrder).toBe(true);

      // Verify order status remains 'paid'
      const order = await dbClient.db.select().from(schema.orders).where(eq(schema.orders.id, orderId2));
      expect(order[0]?.status).toBe('paid');

      // Verify subscription is still active
      const sub = await dbClient.db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, studentId));
      expect(sub[0]?.status).toBe('active');
    });
  });

  describe('3. Outbox Relay & Replay Idempotency cho Downstream Consumer', () => {
    it('relayOutbox chỉ relay các sự kiện chưa xuất bản một lần duy nhất', async () => {
      // Run relayOutbox batch
      const relayedCount = await outboxService.relayOutbox(100);
      expect(relayedCount).toBeGreaterThan(0);

      // Run relayOutbox again immediately: must find 0 pending rows (idempotent)
      const secondRunRelayed = await outboxService.relayOutbox(100);
      expect(secondRunRelayed).toBe(0);
    });

    it('consumer xử lý lại sự kiện payment.captured không ghi nhận double revenue', async () => {
      // Simulate consumer calculating total revenue from payment.captured events
      const events = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'payment.captured'));

      expect(events.length).toBeGreaterThanOrEqual(2);

      // Consumer ledger simulation with event-level deduplication
      const revenueLedger = new Map<string, number>();

      const processEvent = (eventRow: typeof events[0]) => {
        const raw = eventRow.payload as {
          payload?: {
            orderId?: string;
            amountMinor?: number;
          };
          orderId?: string;
          amountMinor?: number;
        };
        const orderId = raw.payload?.orderId || raw.orderId || eventRow.id;
        const amountMinor = raw.payload?.amountMinor ?? raw.amountMinor ?? 0;
        // Idempotent insertion by aggregate orderId or eventId
        if (!revenueLedger.has(orderId)) {
          revenueLedger.set(orderId, amountMinor);
        }
      };

      // Process all events 3 times (simulating duplicate delivery)
      for (let i = 0; i < 3; i++) {
        for (const evt of events) {
          processEvent(evt);
        }
      }

      // Ledger must have exact single entry per order
      expect(revenueLedger.size).toBe(events.length);
    });
  });

  describe('4. Quản lý Hoàn tiền (Refunds) & Chống Double-Refund', () => {
    let orderToRefundId: string;
    const orderAmount = 200000;

    beforeAll(async () => {
      const checkoutRes = await paymentService.createCheckoutSession(studentId, {
        planId: 'premium_month',
        returnPath: '/tai-khoan',
      });
      orderToRefundId = checkoutRes.orderId;

      // Force order totalAmount to exactly 200000 for deterministic math
      await dbClient.db
        .update(schema.orders)
        .set({ totalAmount: orderAmount, status: 'paid' })
        .where(eq(schema.orders.id, orderToRefundId));
    });

    it('cho phép hoàn tiền một phần (120,000 VND / 200,000 VND)', async () => {
      const refundReq = await paymentService.requestRefund(studentId, {
        transactionId: orderToRefundId,
        amountMinor: 120000,
        reason: 'Học viên chuyển công tác không tiếp tục học.',
      });

      expect(refundReq.refundId).toBeDefined();
      expect(refundReq.status).toBe('requested');

      const approved = await paymentService.approveRefund(adminId, refundReq.refundId);
      expect(approved.approved).toBe(true);

      const reqDb = await dbClient.db.select().from(schema.refundRequests).where(eq(schema.refundRequests.id, refundReq.refundId));
      expect(reqDb[0]?.status).toBe('refunded');
    });

    it('chấp thuận yêu cầu hoàn trả số tiền còn lại (80,000 VND) và chuyển trạng thái đơn hàng sang refunded', async () => {
      const refundReq2 = await paymentService.requestRefund(studentId, {
        transactionId: orderToRefundId,
        amountMinor: 80000,
        reason: 'Hoàn nốt số tiền còn lại.',
      });

      const approved2 = await paymentService.approveRefund(adminId, refundReq2.refundId);
      expect(approved2.approved).toBe(true);

      // Total refunded amount across refundRequests should now be exactly 200,000
      const refundSum = await dbClient.db
        .select({
          sum: sql<number>`coalesce(sum(${schema.refundRequests.amount}), 0)`,
        })
        .from(schema.refundRequests)
        .where(
          and(
            eq(schema.refundRequests.orderId, orderToRefundId),
            eq(schema.refundRequests.status, 'refunded'),
          ),
        );
      expect(Number(refundSum[0]?.sum)).toBe(200000);

      const orderDb = await dbClient.db.select().from(schema.orders).where(eq(schema.orders.id, orderToRefundId));
      expect(orderDb[0]?.status).toBe('refunded');
    });

    it('từ chối khi gửi thêm bất kỳ yêu cầu hoàn tiền nào khi đơn hàng đã hoàn tiền đầy đủ (maxRefundable <= 0)', async () => {
      // Order is fully refunded (200k / 200k)
      await expect(
        paymentService.requestRefund(studentId, {
          transactionId: orderToRefundId,
          amountMinor: 10000,
          reason: 'Thử hoàn thêm lần nữa khi đã hết hạn mức.',
        }),
      ).rejects.toThrow(/Đơn hàng này đã được hoàn tiền đầy đủ trước đó/);
    });
  });
});
