import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { PayOSAdapter } from './provider/payos.adapter.js';
import { PaymentProviderRegistry } from './provider/provider.registry.js';
import { PaymentService } from './payment.service.js';
import { EntitlementService } from '../entitlement/entitlement.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { ScoringService } from '../scoring/scoring.service.js';

describe('Payment Provider Adapter & Webhook Security (PAY-04 & Acceptance 1, 4)', () => {
  let dbClient: DbClientInstance;
  let adapter: PayOSAdapter;
  let registry: PaymentProviderRegistry;
  let paymentService: PaymentService;
  let entitlementService: EntitlementService;
  let outboxService: OutboxService;
  let testUserId: string;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    const scoringService = new ScoringService(dbClient);
    outboxService = new OutboxService(dbClient, scoringService);
    entitlementService = new EntitlementService(dbClient, outboxService);

    adapter = new PayOSAdapter({
      clientId: 'test-client-id-fixture',
      apiKey: 'test-api-key-fixture',
      checksumKey: 'a1b2c3d4e5f678901234567890abcdef',
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

    testUserId = generateUuidV7();
    await dbClient.db.insert(schema.users).values({
      id: testUserId,
      email: `payer_${testUserId.slice(0, 8)}@test.local`,
      name: 'Payer User',
      role: 'student',
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });
  });

  afterEach(async () => {
    await dbClient.close();
  });

  describe('Chữ ký số HMAC SHA256 và xác thực Payload (PAY-04)', () => {
    it('sinh và xác thực chữ ký PayOS hợp lệ với các trường sắp xếp theo thứ tự bảng chữ cái', async () => {
      const dataPayload = {
        orderId: '0192a000-0000-7000-8000-000000000001',
        amount: 199000,
        currency: 'VND',
        code: '00',
        reference: 'REF123456',
      };

      const signature = adapter.generateSignature(dataPayload);
      expect(signature).toBeDefined();
      expect(signature.length).toBe(64); // SHA256 hex string

      const webhookBody = {
        code: '00',
        desc: 'success',
        data: dataPayload,
        signature,
      };

      const result = await adapter.verifyWebhook(webhookBody);
      expect(result.isValid).toBe(true);
      expect(result.status).toBe('PAID');
      expect(result.amountMinor).toBe(199000);
      expect(result.orderId).toBe(dataPayload.orderId);
      expect(result.eventId).toBe('REF123456');
    });

    it('từ chối khi chữ ký sai (Acceptance 1: Webhook chữ ký sai bị từ chối)', async () => {
      const dataPayload = {
        orderId: '0192a000-0000-7000-8000-000000000002',
        amount: 199000,
        currency: 'VND',
        code: '00',
      };

      const webhookBody = {
        code: '00',
        desc: 'success',
        data: dataPayload,
        signature: '0000000000000000000000000000000000000000000000000000000000000000', // Invalid signature
      };

      const result = await adapter.verifyWebhook(webhookBody);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_SIGNATURE');

      // PaymentService throws 400 BadRequestException when signature is invalid
      await expect(
        paymentService.handleWebhook('payos', webhookBody),
      ).rejects.toThrow('Chữ ký số của webhook không hợp lệ.');
    });

    it('từ chối khi dữ liệu bị giả mạo dù signature có định dạng hợp lệ', async () => {
      const originalData = {
        orderId: '0192a000-0000-7000-8000-000000000003',
        amount: 199000,
        currency: 'VND',
        code: '00',
      };

      const signature = adapter.generateSignature(originalData);

      // Attacker tampers amount from 199,000 to 1,000
      const tamperedBody = {
        code: '00',
        data: {
          ...originalData,
          amount: 1000,
        },
        signature,
      };

      const result = await adapter.verifyWebhook(tamperedBody);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_SIGNATURE');
    });

    it('từ chối webhook khi thiếu chữ ký', async () => {
      const bodyWithoutSig = {
        code: '00',
        data: {
          orderId: '0192a000-0000-7000-8000-000000000004',
          amount: 199000,
        },
      };

      const result = await adapter.verifyWebhook(bodyWithoutSig);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('MISSING_SIGNATURE');
    });

    it('từ chối chuỗi JSON không hợp lệ', async () => {
      const result = await adapter.verifyWebhook('not-a-json-string');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('INVALID_JSON_BODY');
    });
  });

  describe('Deduplication & Out-of-Order Webhook Handling (Acceptance 1)', () => {
    it('lặp webhook (replay): xử lý idempotent, trả về deduplicated: true và không cấp quyền hai lần', async () => {
      // 1. Create checkout session
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        quantity: 1,
        returnPath: '/dashboard',
      });

      const dataPayload = {
        orderId: session.orderId,
        amount: session.amountMinor,
        currency: 'VND',
        code: '00',
        reference: `PAY_REF_${session.orderId.slice(0, 8)}`,
      };
      const signature = adapter.generateSignature(dataPayload);
      const webhookPayload = { code: '00', data: dataPayload, signature };

      // First webhook delivery
      const firstRun = await paymentService.handleWebhook('payos', webhookPayload);
      expect(firstRun.received).toBe(true);

      // Verify order is paid and entitlements granted
      const subFirst = await paymentService.getUserSubscription(testUserId);
      expect(subFirst.status).toBe('active');

      const grantsFirst = await dbClient.db
        .select()
        .from(schema.entitlementGrants)
        .where(eq(schema.entitlementGrants.userId, testUserId));
      expect(grantsFirst.length).toBe(1);

      // Duplicate replay delivery
      const secondRun = await paymentService.handleWebhook('payos', webhookPayload);
      expect(secondRun.received).toBe(true);
      expect(secondRun.deduplicated).toBe(true);

      // Check grants not duplicated
      const grantsSecond = await dbClient.db
        .select()
        .from(schema.entitlementGrants)
        .where(eq(schema.entitlementGrants.userId, testUserId));
      expect(grantsSecond.length).toBe(1);
    });

    it('out-of-order webhook: sự kiện failed đến muộn không ghi đè trạng thái paid của đơn hàng', async () => {
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        quantity: 1,
        returnPath: '/dashboard',
      });

      // 1. Order is paid first
      const paidData = {
        orderId: session.orderId,
        amount: session.amountMinor,
        code: '00',
        reference: `REF_PAID_${session.orderId.slice(0, 8)}`,
      };
      const paidSig = adapter.generateSignature(paidData);
      await paymentService.handleWebhook('payos', { code: '00', data: paidData, signature: paidSig });

      // Verify order is paid
      const orderAfterPaid = await dbClient.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, session.orderId));
      expect(orderAfterPaid[0]!.status).toBe('paid');

      // 2. Out-of-order / delayed failure arrives later
      const delayedFailedData = {
        orderId: session.orderId,
        amount: session.amountMinor,
        code: '01', // Failed
        reference: `REF_FAILED_${session.orderId.slice(0, 8)}`,
      };
      const failedSig = adapter.generateSignature(delayedFailedData);
      const outOfOrderRes = await paymentService.handleWebhook('payos', {
        code: '01',
        data: delayedFailedData,
        signature: failedSig,
      });

      expect(outOfOrderRes.received).toBe(true);
      expect(outOfOrderRes.ignoredOutOfOrder).toBe(true);

      // Order must remain paid!
      const orderAfterLateFail = await dbClient.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, session.orderId));
      expect(orderAfterLateFail[0]!.status).toBe('paid');
    });
  });

  describe('Acceptance 4: Không coi mock là live verified', () => {
    it('kiểm tra trạng thái provider: nhận diện chính xác sandbox/mock chưa live verified', () => {
      const status = adapter.getProviderStatus();
      expect(status.isLive).toBe(false);
      expect(adapter.isLive()).toBe(false);
    });

    it('khi thiếu thông tin production, provider báo rõ missingPrerequisites payment-provider', () => {
      // Mock adapter with missing production environment keys
      const unconfiguredAdapter = new PayOSAdapter({
        clientId: undefined,
        apiKey: undefined,
        isLive: false,
      });

      const status = unconfiguredAdapter.getProviderStatus();
      expect(status.configured).toBe(false);
      expect(status.isLive).toBe(false);
      expect(status.missingPrerequisites).toContain('payment-provider');
      expect(status.missingPrerequisites).toContain('PAYOS_CLIENT_ID');
      expect(status.missingPrerequisites).toContain('PAYOS_API_KEY');
    });

    it('không bao giờ trả về isLive: true nếu không đủ cấu hình production thật', () => {
      const testAdapter = new PayOSAdapter();
      // In test/sandbox environment, isLive must strictly be false
      expect(testAdapter.isLive()).toBe(false);
    });
  });
});
