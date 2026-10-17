import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { PayOSAdapter } from './provider/payos.adapter.js';
import { PaymentProviderRegistry } from './provider/provider.registry.js';
import { PaymentService } from './payment.service.js';
import { ReconciliationService } from './reconciliation.service.js';
import { EntitlementService } from '../entitlement/entitlement.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { ScoringService } from '../scoring/scoring.service.js';
import type { ProviderStatementItem } from './payment.types.js';

describe('V04 Admin Payment Reconciliation & Provider Readiness', () => {
  let dbClient: DbClientInstance;
  let adapter: PayOSAdapter;
  let registry: PaymentProviderRegistry;
  let paymentService: PaymentService;
  let reconciliationService: ReconciliationService;
  let entitlementService: EntitlementService;
  let outboxService: OutboxService;
  let testUserId: string;
  let adminUserId: string;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    const scoringService = new ScoringService(dbClient);
    outboxService = new OutboxService(dbClient, scoringService);
    entitlementService = new EntitlementService(dbClient, outboxService);

    adapter = new PayOSAdapter({
      clientId: 'sandbox-client-v04',
      apiKey: 'sandbox-api-key-v04',
      checksumKey: 'test_checksum_key_for_v04_reconciliation',
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

    reconciliationService = new ReconciliationService(
      dbClient,
      registry,
      outboxService,
    );

    testUserId = generateUuidV7();
    adminUserId = generateUuidV7();

    await dbClient.db.insert(schema.users).values([
      {
        id: testUserId,
        email: 'payer_v04@test.local',
        name: 'Payer V04',
        role: 'student',
        locale: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
      },
      {
        id: adminUserId,
        email: 'admin_v04@jlpt.local',
        name: 'Admin V04',
        role: 'admin',
        locale: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
      },
    ]);
  });

  afterEach(async () => {
    await dbClient.close();
  });

  describe('Acceptance 1: Webhook/live readiness có bằng chứng riêng sandbox', () => {
    it('kiểm tra trạng thái readiness: xác nhận rõ sandbox mode, không nhận vơ là live', () => {
      const readiness = reconciliationService.getReadinessStatus('payos');

      expect(readiness.provider).toBe('payos');
      expect(readiness.isLive).toBe(false);
      expect(readiness.mode).toBe('sandbox');
      expect(readiness.configured).toBe(true);
      expect(readiness.webhookVerifiedInSandbox).toBe(true);
      expect(readiness.evidence.sandboxTested).toBe(true);
      expect(readiness.evidence.replayProtected).toBe(true);
      expect(readiness.evidence.outOfOrderProtected).toBe(true);
    });

    it('bằng chứng sandbox: webhook có chữ ký HMAC hợp lệ chuyển đơn hàng thành công', async () => {
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        quantity: 1,
        returnPath: '/dashboard',
      });

      const payload = {
        orderId: session.orderId,
        amount: session.amountMinor,
        currency: 'VND',
        code: '00',
        reference: `PAYOS_REF_${session.orderId.slice(0, 8)}`,
      };
      const signature = adapter.generateSignature(payload);

      const webhookRes = await paymentService.handleWebhook('payos', {
        code: '00',
        data: payload,
        signature,
      });

      expect(webhookRes.received).toBe(true);

      const updatedOrder = await dbClient.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, session.orderId));
      expect(updatedOrder[0]?.status).toBe('paid');
    });

    it('bằng chứng sandbox: chữ ký sai bị từ chối và đơn hàng không bị cập nhật sai', async () => {
      const session = await paymentService.createCheckoutSession(testUserId, {
        planId: 'premium_month',
        term: 'month',
        quantity: 1,
        returnPath: '/dashboard',
      });

      const payload = {
        orderId: session.orderId,
        amount: session.amountMinor,
        code: '00',
      };
      const badSignature = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

      await expect(
        paymentService.handleWebhook('payos', {
          code: '00',
          data: payload,
          signature: badSignature,
        }),
      ).rejects.toThrow();

      const orderStillCreated = await dbClient.db
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, session.orderId));
      expect(orderStillCreated[0]?.status).toBe('created');
    });
  });

  describe('Acceptance 3: Mọi action audit có actor và tenant', () => {
    it('thao tác đối soát ghi nhận audit log với actor và tenant đầy đủ', async () => {
      const run = await reconciliationService.runReconciliation({
        provider: 'payos',
        actor: {
          id: adminUserId,
          email: 'admin_v04@jlpt.local',
          role: 'admin',
          tenantId: 'tenant_hn_01',
        },
      });

      expect(run.runId).toBeDefined();

      // Check operatorActions table
      const auditRows = await dbClient.db
        .select()
        .from(schema.operatorActions)
        .where(eq(schema.operatorActions.action, 'payment_reconciliation_run'));

      expect(auditRows.length).toBeGreaterThanOrEqual(1);
      const latestAudit = auditRows[0]!;
      expect(latestAudit.operatorId).toBe(adminUserId);
      const details = latestAudit.details as Record<string, unknown>;
      expect(details['actorId']).toBe(adminUserId);
      expect(details['actorEmail']).toBe('admin_v04@jlpt.local');
      expect(details['tenantId']).toBe('tenant_hn_01');
    });

    it('khi actor không chỉ định tenant, hệ thống mặc định ghi nhận tenantId global (không để trống)', async () => {
      await reconciliationService.runReconciliation({
        provider: 'payos',
        actor: {
          id: adminUserId,
          email: 'admin_v04@jlpt.local',
          role: 'admin',
        },
      });

      const auditRows = await dbClient.db
        .select()
        .from(schema.operatorActions)
        .where(eq(schema.operatorActions.action, 'payment_reconciliation_run'));

      const details = auditRows[0]!.details as Record<string, unknown>;
      expect(details['tenantId']).toBe('global');
    });
  });

  describe('Payment Reconciliation Engine & Discrepancies Detection', () => {
    it('đối soát đơn hàng khớp 100%: ghi nhận trạng thái reconciled và lưu vào reconciliation_runs', async () => {
      // Create paid order
      const orderId = generateUuidV7();
      await dbClient.db.insert(schema.orders).values({
        id: orderId,
        userId: testUserId,
        totalAmount: 199000,
        currency: 'VND',
        status: 'paid',
        createdAt: new Date(),
      });

      await dbClient.db.insert(schema.paymentAttempts).values({
        id: generateUuidV7(),
        orderId,
        provider: 'payos',
        providerPaymentRef: 'PAYOS_TX_001',
        status: 'successful',
        amount: 199000,
        currency: 'VND',
        createdAt: new Date(),
      });

      const externalStatements: ProviderStatementItem[] = [
        {
          reference: 'PAYOS_TX_001',
          orderId,
          amountMinor: 199000,
          currency: 'VND',
          status: 'PAID',
          timestamp: new Date().toISOString(),
        },
      ];

      const summary = await reconciliationService.runReconciliation({
        provider: 'payos',
        externalStatements,
        actor: {
          id: adminUserId,
          email: 'admin_v04@jlpt.local',
          role: 'admin',
          tenantId: 'global',
        },
      });

      expect(summary.status).toBe('reconciled');
      expect(summary.discrepanciesCount).toBe(0);
      expect(summary.matchedOrdersCount).toBe(1);
      expect(summary.grossSettledMinor).toBe(199000);
      expect(summary.netSettledMinor).toBe(199000);

      // Verify row in reconciliation_runs database table
      const runs = await reconciliationService.listReconciliationRuns();
      expect(runs.length).toBeGreaterThanOrEqual(1);
      const savedRun = runs[0]!;
      expect(savedRun.id).toBe(summary.runId);
      expect(savedRun.status).toBe('reconciled');
      expect(savedRun.discrepanciesFound).toBe(0);
    });

    it('phát hiện sai lệch số tiền (amount_mismatch) khi đơn hàng nội bộ không khớp chứng từ provider', async () => {
      const orderId = generateUuidV7();
      await dbClient.db.insert(schema.orders).values({
        id: orderId,
        userId: testUserId,
        totalAmount: 199000,
        currency: 'VND',
        status: 'paid',
        createdAt: new Date(),
      });

      // Provider statement reports only 150.000 VND
      const externalStatements: ProviderStatementItem[] = [
        {
          reference: 'PAYOS_TX_MISMATCH',
          orderId,
          amountMinor: 150000,
          currency: 'VND',
          status: 'PAID',
          timestamp: new Date().toISOString(),
        },
      ];

      const summary = await reconciliationService.runReconciliation({
        provider: 'payos',
        externalStatements,
      });

      expect(summary.status).toBe('discrepancy_detected');
      expect(summary.discrepanciesCount).toBeGreaterThanOrEqual(1);
      expect(summary.discrepancies.some((d) => d.type === 'amount_mismatch')).toBe(true);
    });

    it('phát hiện chứng từ provider lạ không có trong đơn hàng nội bộ (missing_internal_order)', async () => {
      const unknownOrderId = generateUuidV7();
      const externalStatements: ProviderStatementItem[] = [
        {
          reference: 'PAYOS_TX_UNKNOWN',
          orderId: unknownOrderId,
          amountMinor: 299000,
          currency: 'VND',
          status: 'PAID',
          timestamp: new Date().toISOString(),
        },
      ];

      const summary = await reconciliationService.runReconciliation({
        provider: 'payos',
        externalStatements,
      });

      expect(summary.status).toBe('discrepancy_detected');
      expect(summary.discrepancies.some((d) => d.type === 'missing_internal_order')).toBe(true);
    });

    it('phát hiện sai lệch hoàn tiền (refund_amount_mismatch) khi số tiền hoàn không khớp chứng từ', async () => {
      const orderId = generateUuidV7();
      await dbClient.db.insert(schema.orders).values({
        id: orderId,
        userId: testUserId,
        totalAmount: 199000,
        currency: 'VND',
        status: 'refunded',
        createdAt: new Date(),
      });

      const refundId = generateUuidV7();
      await dbClient.db.insert(schema.refundRequests).values({
        id: refundId,
        orderId,
        amount: 199000,
        status: 'refunded',
        createdAt: new Date(),
      });

      await dbClient.db.insert(schema.refundAttempts).values({
        id: generateUuidV7(),
        refundRequestId: refundId,
        providerRefundRef: 'REF_TX_001',
        status: 'successful',
        processedAt: new Date(),
      });

      // Provider statement reports only 100.000 refunded
      const externalStatements: ProviderStatementItem[] = [
        {
          reference: 'REF_TX_001',
          orderId,
          amountMinor: 100000,
          currency: 'VND',
          status: 'REFUNDED',
          timestamp: new Date().toISOString(),
        },
      ];

      const summary = await reconciliationService.runReconciliation({
        provider: 'payos',
        externalStatements,
      });

      expect(summary.status).toBe('discrepancy_detected');
      expect(summary.discrepancies.some((d) => d.type === 'refund_amount_mismatch')).toBe(true);
    });

    it('phát hiện mã tham chiếu giao dịch bị trùng lặp giữa các đơn hàng (duplicate_provider_ref)', async () => {
      const orderA = generateUuidV7();
      const orderB = generateUuidV7();

      await dbClient.db.insert(schema.orders).values([
        {
          id: orderA,
          userId: testUserId,
          totalAmount: 199000,
          currency: 'VND',
          status: 'paid',
          createdAt: new Date(),
        },
        {
          id: orderB,
          userId: testUserId,
          totalAmount: 199000,
          currency: 'VND',
          status: 'paid',
          createdAt: new Date(),
        },
      ]);

      const duplicatedRef = 'PAYOS_DUP_REF_999';
      await dbClient.db.insert(schema.paymentAttempts).values([
        {
          id: generateUuidV7(),
          orderId: orderA,
          provider: 'payos',
          providerPaymentRef: duplicatedRef,
          status: 'successful',
          amount: 199000,
          currency: 'VND',
          createdAt: new Date(),
        },
        {
          id: generateUuidV7(),
          orderId: orderB,
          provider: 'payos',
          providerPaymentRef: duplicatedRef, // Duplicate!
          status: 'successful',
          amount: 199000,
          currency: 'VND',
          createdAt: new Date(),
        },
      ]);

      const summary = await reconciliationService.runReconciliation({
        provider: 'payos',
      });

      expect(summary.status).toBe('discrepancy_detected');
      expect(summary.discrepancies.some((d) => d.type === 'duplicate_provider_ref')).toBe(true);
    });
  });
});
