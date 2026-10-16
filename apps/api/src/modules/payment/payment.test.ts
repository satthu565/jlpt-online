import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { PaymentService } from './payment.service.js';
import { PaymentController } from './payment.controller.js';
import { PaymentProviderRegistry } from './provider/provider.registry.js';
import { PayOSAdapter } from './provider/payos.adapter.js';
import { EntitlementService } from '../entitlement/entitlement.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { ScoringService } from '../scoring/scoring.service.js';

describe('L04 Payment & Commercial System (PAY-01..12, ADM-15, ADM-16)', () => {
  let dbClient: DbClientInstance;
  let paymentService: PaymentService;
  let paymentController: PaymentController;
  let entitlementService: EntitlementService;
  let outboxService: OutboxService;
  let adapter: PayOSAdapter;
  let registry: PaymentProviderRegistry;
  let testUserId: string;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    const scoringService = new ScoringService(dbClient);
    outboxService = new OutboxService(dbClient, scoringService);
    entitlementService = new EntitlementService(dbClient, outboxService);

    adapter = new PayOSAdapter({
      clientId: 'payos_test_client',
      apiKey: 'payos_test_key',
      checksumKey: 'test_checksum_key_1234567890abcdef',
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
    paymentController = new PaymentController(paymentService);

    testUserId = generateUuidV7();
    await dbClient.db.insert(schema.users).values({
      id: testUserId,
      email: `student_${testUserId.slice(0, 8)}@test.local`,
      name: 'Nguyen Van A',
      role: 'student',
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });
  });

  afterEach(async () => {
    await dbClient.close();
  });

  describe('PAY-01 & PAY-02: Bảng giá công khai và gói Premium (month/quarter/year)', () => {
    it('liệt kê các gói dịch vụ công khai với đầy đủ đơn vị tiền tệ và quyền lợi', async () => {
      const res = await paymentService.getPlans();
      expect(res.items.length).toBeGreaterThanOrEqual(4);

      const ctrlRes = await paymentController.listPlans();
      expect(ctrlRes.items.length).toBeGreaterThanOrEqual(4);

      const free = res.items.find((p) => p.id === 'free');
      expect(free).toBeDefined();
      expect(free?.priceMinor).toBe(0);

      const month = res.items.find((p) => p.id === 'premium_month');
      expect(month).toBeDefined();
      expect(month?.interval).toBe('month');
      expect(month?.priceMinor).toBe(199000);

      const quarter = res.items.find((p) => p.id === 'premium_quarter');
      expect(quarter).toBeDefined();
      expect(quarter?.interval).toBe('quarter');
      expect(quarter?.priceMinor).toBe(499000);

      const year = res.items.find((p) => p.id === 'premium_year');
      expect(year).toBeDefined();
      expect(year?.interval).toBe('year');
      expect(year?.priceMinor).toBe(1499000);
    });

    it('ADM-15: Quản trị viên tạo gói mới với phiên bản tăng dần bất biến', async () => {
      const created = await paymentService.createAdminPlan({
        code: 'premium_pro_2026',
        name: 'Gói Pro Đặc Biệt 2026',
        term: 'year',
        priceMinor: 1899000,
        currency: 'VND',
        entitlements: ['unlimited_exams', 'ai_explanations', 'mock_n1_pro'],
      });

      expect(created.id).toBe('premium_pro_2026');
      expect(created.version).toBe(1);

      // Updating creates version 2
      const updated = await paymentService.createAdminPlan({
        code: 'premium_pro_2026',
        name: 'Gói Pro Đặc Biệt 2026 (Giảm giá)',
        term: 'year',
        priceMinor: 1699000,
        currency: 'VND',
      });

      expect(updated.version).toBe(2);
      expect(updated.priceMinor).toBe(1699000);
    });

    it('ADM-15: từ chối tạo gói với giá âm', async () => {
      await expect(
        paymentService.createAdminPlan({
          code: 'bad_plan',
          name: 'Gói Lỗi',
          term: 'month',
          priceMinor: -100,
        }),
      ).rejects.toThrow('Giá gói không được là số âm.');
    });
  });

  describe('PAY-04 & PAY-07: Phiên thanh toán (Checkout Session) và Mã giảm giá nguyên tử', () => {
    it('khởi tạo phiên thanh toán và tính giá chuẩn trên server (không tin tưởng client)', async () => {
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        quantity: 1,
        returnPath: '/profile/billing',
      });

      expect(session.orderId).toBeDefined();
      expect(session.amountMinor).toBe(199000);
      expect(session.currency).toBe('VND');
      expect(session.checkoutUrl).toContain('pay.payos.vn');

      // Verify order record in DB
      const order = await dbClient.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, session.orderId));
      expect(order.length).toBe(1);
      expect(order[0]!.totalAmount).toBe(199000);
      expect(order[0]!.status).toBe('created');
    });

    it('chặn returnPath không an toàn (phòng chống Open Redirect)', async () => {
      await expect(
        paymentService.createCheckoutSession(testUserId, {
          planId: 'premium_month',
          term: 'month',
          returnPath: 'javascript:alert(1)',
        }),
      ).rejects.toThrow('returnPath không hợp lệ.');
    });

    it('áp dụng mã giảm giá phần trăm: giữ chỗ nguyên tử (reservation) và trừ giá đúng', async () => {
      // 1. Admin creates coupon
      await paymentService.createAdminCoupon({
        code: 'DISCOUNT20',
        discountPercent: 20,
        maxUses: 10,
        expiresAt: '2026-12-31T23:59:59Z',
      });

      // 2. Checkout with coupon
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month', // 199,000 VND
        term: 'month',
        couponCode: 'DISCOUNT20', // 20% off = 39,800 -> 159,200 VND
        returnPath: '/dashboard',
      });

      expect(session.couponApplied?.code).toBe('DISCOUNT20');
      expect(session.amountMinor).toBe(159200);

      // Verify coupon reservation row exists in DB
      const res = await dbClient.db
        .select()
        .from(schema.couponReservations)
        .where(eq(schema.couponReservations.userId, testUserId));
      expect(res.length).toBe(1);
      expect(res[0]!.couponCode).toBe('DISCOUNT20');
    });

    it('từ chối mã giảm giá khi đã hết số lượt sử dụng tối đa (maxRedemptions cap)', async () => {
      // Create coupon with only 1 use
      await paymentService.createAdminCoupon({
        code: 'LIMITED1',
        discountPercent: 50,
        maxUses: 1,
        expiresAt: '2026-12-31T23:59:59Z',
      });

      // User 1 reserves it
      await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        couponCode: 'LIMITED1',
        returnPath: '/dashboard',
      });

      // User 2 attempts to use exhausted coupon
      const anotherUserId = generateUuidV7();
      await dbClient.db.insert(schema.users).values({
        id: anotherUserId,
        email: `another_${anotherUserId.slice(0, 8)}@test.local`,
        role: 'student',
      });

      await expect(
        paymentService.createCheckoutSession(anotherUserId, {
          planId: 'premium_month',
          term: 'month',
          couponCode: 'LIMITED1',
          returnPath: '/dashboard',
        }),
      ).rejects.toThrow('Mã giảm giá đã hết lượt sử dụng.');
    });

    it('từ chối tạo mã giảm giá hết hạn hoặc mức giảm âm / vượt quá 100%', async () => {
      await expect(
        paymentService.createAdminCoupon({
          code: 'EXPIRED',
          discountPercent: 10,
          maxUses: 10,
          expiresAt: '2020-01-01T00:00:00Z',
        }),
      ).rejects.toThrow('Ngày hết hạn phải ở tương lai.');

      await expect(
        paymentService.createAdminCoupon({
          code: 'OVER100',
          discountPercent: 150,
          maxUses: 10,
          expiresAt: '2026-12-31T23:59:59Z',
        }),
      ).rejects.toThrow('discountPercent phải nằm trong khoảng từ 1 đến 100.');
    });
  });

  describe('PAY-05 & PAY-09: State Machine Thuê bao học viên (Subscriptions)', () => {
    it('thanh toán thành công kích hoạt trạng thái active và cấp quyền học viên', async () => {
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        returnPath: '/dashboard',
      });

      const data = {
        orderId: session.orderId,
        amount: session.amountMinor,
        code: '00',
        reference: `REF_${session.orderId.slice(0, 8)}`,
      };
      const signature = adapter.generateSignature(data);

      await paymentService.handleWebhook('payos', { code: '00', data, signature });

      const sub = await paymentService.getUserSubscription(testUserId);
      expect(sub.status).toBe('active');
      expect(sub.planId).toBe('premium_month');
      expect(sub.expiresAt).toBeDefined();

      // Check entitlements
      const ents = await entitlementService.getUserEntitlements(testUserId);
      expect(ents.items.some((i) => i.entitlement === 'unlimited_exams' && i.active)).toBe(true);
      expect(ents.items.some((i) => i.entitlement === 'premium_subscription' && i.active)).toBe(true);
    });

    it('hủy gói (cancel): chuyển sang trạng thái cancelled (cancelAtPeriodEnd = true) và quyền vẫn còn hiệu lực đến cuối kỳ', async () => {
      // Setup active subscription
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        returnPath: '/dashboard',
      });
      const data = { orderId: session.orderId, amount: session.amountMinor, code: '00', reference: 'REF_SUB_1' };
      const signature = adapter.generateSignature(data);
      await paymentService.handleWebhook('payos', { code: '00', data, signature });

      // User cancels subscription
      const cancelRes = await paymentService.cancelSubscription(testUserId);
      expect(cancelRes.cancelled).toBe(true);

      const sub = await paymentService.getUserSubscription(testUserId);
      expect(sub.status).toBe('cancelled');
      expect(sub.cancelAtPeriodEnd).toBe(true);

      // User still retains premium access until period end
      const ents = await entitlementService.getUserEntitlements(testUserId);
      expect(ents.items.some((i) => i.entitlement === 'unlimited_exams' && i.active)).toBe(true);
    });

    it('gia hạn lại (renew): kích hoạt lại gói đã hủy trước đó', async () => {
      // Setup cancelled subscription
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        returnPath: '/dashboard',
      });
      const data = { orderId: session.orderId, amount: session.amountMinor, code: '00', reference: 'REF_SUB_2' };
      const signature = adapter.generateSignature(data);
      await paymentService.handleWebhook('payos', { code: '00', data, signature });
      await paymentService.cancelSubscription(testUserId);

      // User renews
      const renewRes = await paymentService.renewSubscription(testUserId);
      expect(renewRes.renewed).toBe(true);

      const sub = await paymentService.getUserSubscription(testUserId);
      expect(sub.status).toBe('active');
      expect(sub.cancelAtPeriodEnd).toBe(false);
    });

    it('chuyển đổi gói (change plan): nâng cấp sang gói mới và ghi nhận audit subscription_changes', async () => {
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        returnPath: '/dashboard',
      });
      const data = { orderId: session.orderId, amount: session.amountMinor, code: '00', reference: 'REF_SUB_3' };
      const signature = adapter.generateSignature(data);
      await paymentService.handleWebhook('payos', { code: '00', data, signature });

      // Upgrade to yearly plan
      const changeRes = await paymentService.changeSubscriptionPlan(testUserId, 'premium_year');
      expect(changeRes.updated).toBe(true);

      const sub = await paymentService.getUserSubscription(testUserId);
      expect(sub.planId).toBe('premium_year');

      const changes = await dbClient.db.select().from(schema.subscriptionChanges);
      expect(changes.length).toBeGreaterThanOrEqual(1);
      expect(changes.some((c: typeof schema.subscriptionChanges.$inferSelect) => c.newPlanId === 'premium_year')).toBe(true);
    });
  });

  describe('PAY-06: Lịch sử giao dịch của người dùng và quản trị viên (ADM-16)', () => {
    it('trả về danh sách giao dịch của người dùng với đầy đủ trạng thái và số tiền', async () => {
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        returnPath: '/dashboard',
      });

      const history = await paymentService.getUserTransactions(testUserId);
      expect(history.items.length).toBe(1);
      expect(history.items[0]!.orderId).toBe(session.orderId);
      expect(history.items[0]!.amountMinor).toBe(199000);
      expect(history.items[0]!.status).toBe('created');
    });

    it('ADM-16: Quản trị viên xem danh sách toàn bộ giao dịch hệ thống', async () => {
      const adminPayments = await paymentService.getAdminPayments();
      expect(Array.isArray(adminPayments.items)).toBe(true);
    });
  });

  describe('PAY-08 & ADM-16: Quản lý hoàn tiền (Refunds State Machine & Invariants)', () => {
    it('gửi yêu cầu hoàn tiền thành công cho đơn hàng đã thanh toán', async () => {
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        returnPath: '/dashboard',
      });

      const data = { orderId: session.orderId, amount: session.amountMinor, code: '00', reference: 'REF_FOR_REFUND' };
      const signature = adapter.generateSignature(data);
      await paymentService.handleWebhook('payos', { code: '00', data, signature });

      const refund = await paymentService.requestRefund(testUserId, {
        transactionId: session.orderId,
        reason: 'Học viên muốn đổi khóa học',
      });

      expect(refund.refundId).toBeDefined();
      expect(refund.status).toBe('requested');

      // Verify row in DB
      const rows = await dbClient.db
        .select()
        .from(schema.refundRequests)
        .where(eq(schema.refundRequests.id, refund.refundId));
      expect(rows.length).toBe(1);
      expect(rows[0]!.amount).toBe(199000);
    });

    it('từ chối yêu cầu hoàn tiền cho đơn hàng chưa thanh toán', async () => {
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        returnPath: '/dashboard',
      });

      await expect(
        paymentService.requestRefund(testUserId, {
          transactionId: session.orderId,
          reason: 'Lý do nào đó',
        }),
      ).rejects.toThrow('Chỉ có thể yêu cầu hoàn tiền cho đơn hàng đã thanh toán thành công.');
    });

    it('phê duyệt hoàn tiền (approve): chuyển trạng thái refunded, thu hồi quyền và phát outbox event', async () => {
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        returnPath: '/dashboard',
      });
      const data = { orderId: session.orderId, amount: session.amountMinor, code: '00', reference: 'REF_APPROVE' };
      const signature = adapter.generateSignature(data);
      await paymentService.handleWebhook('payos', { code: '00', data, signature });

      const req = await paymentService.requestRefund(testUserId, {
        transactionId: session.orderId,
        reason: 'Thỏa điều kiện hoàn tiền 7 ngày',
      });

      const adminId = generateUuidV7();
      const approveRes = await paymentService.approveRefund(adminId, req.refundId);
      expect(approveRes.approved).toBe(true);
      expect(approveRes.status).toBe('refunded');

      // Verify refund request status
      const reqAfter = await dbClient.db
        .select()
        .from(schema.refundRequests)
        .where(eq(schema.refundRequests.id, req.refundId));
      expect(reqAfter[0]!.status).toBe('refunded');

      // Verify subscription is expired after full refund
      const sub = await paymentService.getUserSubscription(testUserId);
      expect(sub.status).toBe('expired');

      // Verify outbox event emitted
      const outboxEvents = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'payment.refunded'));
      expect(outboxEvents.length).toBe(1);
    });

    it('từ chối yêu cầu hoàn tiền (reject): cập nhật trạng thái rejected kèm lý do', async () => {
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        returnPath: '/dashboard',
      });
      const data = { orderId: session.orderId, amount: session.amountMinor, code: '00', reference: 'REF_REJECT' };
      const signature = adapter.generateSignature(data);
      await paymentService.handleWebhook('payos', { code: '00', data, signature });

      const req = await paymentService.requestRefund(testUserId, {
        transactionId: session.orderId,
        reason: 'Không thích học nữa',
      });

      const rejectRes = await paymentService.rejectRefund(req.refundId, 'Đã quá thời hạn quy định.');
      expect(rejectRes.rejected).toBe(true);

      const reqAfter = await dbClient.db
        .select()
        .from(schema.refundRequests)
        .where(eq(schema.refundRequests.id, req.refundId));
      expect(reqAfter[0]!.status).toBe('rejected');
    });

    it('bảo đảm bất biến: không thể hoàn tiền vượt quá tổng tiền đơn hàng trừ các lần hoàn trước đó', async () => {
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        returnPath: '/dashboard',
      });
      const data = { orderId: session.orderId, amount: session.amountMinor, code: '00', reference: 'REF_INVARIANT' };
      const signature = adapter.generateSignature(data);
      await paymentService.handleWebhook('payos', { code: '00', data, signature });

      // First full refund
      const req1 = await paymentService.requestRefund(testUserId, {
        transactionId: session.orderId,
        reason: 'Lần 1',
      });
      await paymentService.approveRefund(generateUuidV7(), req1.refundId);

      // Second refund attempt on same order -> rejected
      await expect(
        paymentService.requestRefund(testUserId, {
          transactionId: session.orderId,
          reason: 'Lần 2 đòi hoàn tiếp',
        }),
      ).rejects.toThrow('Đơn hàng này đã được hoàn tiền đầy đủ trước đó.');
    });
  });

  describe('PAY-12: Báo cáo tài chính doanh thu', () => {
    it('tính toán chính xác Gross, Refund, Net phân tách theo đơn vị tiền tệ VND', async () => {
      // Seed 1 paid order
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        returnPath: '/dashboard',
      });
      const data = { orderId: session.orderId, amount: 199000, code: '00', reference: 'REF_REV_1' };
      const signature = adapter.generateSignature(data);
      await paymentService.handleWebhook('payos', { code: '00', data, signature });

      const report = await paymentService.getRevenueReport({ currency: 'VND' });
      expect(report.currency).toBe('VND');
      expect(report.grossMinor).toBe(199000);
      expect(report.refundMinor).toBe(0);
      expect(report.netMinor).toBe(199000);

      // Refund the order
      const req = await paymentService.requestRefund(testUserId, {
        transactionId: session.orderId,
        reason: 'Hoàn tiền',
      });
      await paymentService.approveRefund(generateUuidV7(), req.refundId);

      const reportAfterRefund = await paymentService.getRevenueReport({ currency: 'VND' });
      expect(reportAfterRefund.grossMinor).toBe(199000);
      expect(reportAfterRefund.refundMinor).toBe(199000);
      expect(reportAfterRefund.netMinor).toBe(0);
    });

    it('tách biệt tiền tệ: doanh thu JPY và USD không cộng gộp lẫn lộn vào VND', async () => {
      const reportJPY = await paymentService.getRevenueReport({ currency: 'JPY' });
      expect(reportJPY.currency).toBe('JPY');
      expect(reportJPY.grossMinor).toBe(0);
      expect(reportJPY.netMinor).toBe(0);
    });
  });
});
