import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { and, desc, eq, gt, gte, inArray, lte, sql } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { EntitlementService } from '../entitlement/entitlement.service.js';
import { PaymentProviderRegistry } from './provider/provider.registry.js';
import type {
  AdminCouponCreateDto,
  AdminPaymentItemDto,
  AdminPlanCreateDto,
  AdminRefundItemDto,
  AdminSubscriptionItemDto,
  CheckoutSessionDto,
  PlanDto,
  RefundRequestDto,
  RevenueReportDto,
  SubscriptionChangeResultDto,
  TransactionItemDto,
  UserSubscriptionDto,
} from './payment.types.js';
import type { PaymentTerm } from '@jlpt/schema';

export const ALLOWED_REDIRECT_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  'jlpt.local',
  'app.jlpt.local',
  'jlpt.vn',
  'app.jlpt.vn',
]);

export function isValidReturnPath(returnPath: string): boolean {
  if (!returnPath || typeof returnPath !== 'string') return false;
  // Relative paths starting with '/' but not '//' (protocol-relative URLs)
  if (returnPath.startsWith('/') && !returnPath.startsWith('//')) {
    return true;
  }
  try {
    const url = new URL(returnPath);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return false;
    }
    const hostname = url.hostname.toLowerCase();
    if (
      ALLOWED_REDIRECT_HOSTS.has(hostname) ||
      hostname.endsWith('.jlpt.vn') ||
      hostname.endsWith('.jlpt.local')
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const INITIAL_PLANS: PlanDto[] = [
  {
    id: 'free',
    name: 'Gói Miễn Phí (Free)',
    description: 'Trải nghiệm học tập và làm đề thi cơ bản hàng ngày',
    interval: 'lifetime',
    priceMinor: 0,
    currency: 'VND',
    entitlements: ['basic_exams', 'practice_mode', 'vocab_flashcards', 'daily_ai_limit_5'],
    isActive: true,
  },
  {
    id: 'premium_month',
    name: 'Gói Premium 1 Tháng',
    description: 'Mở khóa toàn bộ kho đề thi, giải thích AI và phân tích học tập',
    interval: 'month',
    priceMinor: 199000,
    currency: 'VND',
    entitlements: ['unlimited_exams', 'ai_explanations', 'advanced_analytics', 'premium_access'],
    isActive: true,
  },
  {
    id: 'premium_quarter',
    name: 'Gói Premium 3 Tháng (Quý)',
    description: 'Luyện thi cấp tốc 3 tháng trước kỳ thi JLPT chính thức',
    interval: 'quarter',
    priceMinor: 499000,
    currency: 'VND',
    entitlements: ['unlimited_exams', 'ai_explanations', 'advanced_analytics', 'premium_access'],
    isActive: true,
  },
  {
    id: 'premium_year',
    name: 'Gói Premium 1 Năm',
    description: 'Đồng hành trọn vẹn cả năm với cam kết đỗ JLPT',
    interval: 'year',
    priceMinor: 1499000,
    currency: 'VND',
    entitlements: ['unlimited_exams', 'ai_explanations', 'advanced_analytics', 'premium_access'],
    isActive: true,
  },
  {
    id: 'teacher_standard',
    name: 'Gói Giáo Viên & Trung Tâm',
    description: 'Quản trị lớp học, giao bài tập và theo dõi tiến độ học viên',
    interval: 'month',
    priceMinor: 799000,
    currency: 'VND',
    entitlements: ['teacher_dashboard', 'class_assignments', 'unlimited_exams'],
    isActive: true,
  },
];

@Injectable()
export class PaymentService {
  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly entitlementService: EntitlementService,
    @Optional() private readonly outboxService?: OutboxService,
  ) {}

  /**
   * Initializes standard seed plans if table is empty.
   */
  async ensureInitialPlans(): Promise<void> {
    const db = this.dbClient.db;
    const existing = await db.select().from(schema.plans).limit(1);

    if (existing.length === 0) {
      for (const p of INITIAL_PLANS) {
        await db.insert(schema.plans).values({
          id: p.id,
          name: p.name,
          description: p.description,
          interval: p.interval,
          price: p.priceMinor,
          currency: p.currency,
          isActive: p.isActive ?? true,
          createdAt: new Date(),
        }).onConflictDoNothing();

        await db.insert(schema.planVersions).values({
          planId: p.id,
          version: 1,
          price: p.priceMinor,
          entitlements: p.entitlements || [],
          effectiveFrom: new Date(),
        }).onConflictDoNothing();
      }
    }
  }

  /**
   * Lists public active plans (PAY-01, PAY-02).
   */
  async getPlans(): Promise<{ items: PlanDto[] }> {
    await this.ensureInitialPlans();
    const db = this.dbClient.db;

    const rows = await db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.isActive, true));

    const result: PlanDto[] = [];
    for (const r of rows) {
      const versions = await db
        .select()
        .from(schema.planVersions)
        .where(eq(schema.planVersions.planId, r.id))
        .orderBy(desc(schema.planVersions.version))
        .limit(1);

      const latestVer = versions[0];
      result.push({
        id: r.id,
        name: r.name,
        description: r.description,
        interval: r.interval,
        priceMinor: latestVer ? latestVer.price : r.price,
        currency: r.currency,
        version: latestVer?.version ?? 1,
        entitlements: (latestVer?.entitlements as string[]) ?? [],
        isActive: r.isActive,
      });
    }

    return { items: result };
  }

  /**
   * Lists all plans for admin management (ADM-15).
   */
  async getAdminPlans(): Promise<{ items: PlanDto[] }> {
    await this.ensureInitialPlans();
    const db = this.dbClient.db;
    const rows = await db.select().from(schema.plans);

    const result: PlanDto[] = [];
    for (const r of rows) {
      const versions = await db
        .select()
        .from(schema.planVersions)
        .where(eq(schema.planVersions.planId, r.id))
        .orderBy(desc(schema.planVersions.version))
        .limit(1);

      const latestVer = versions[0];
      result.push({
        id: r.id,
        name: r.name,
        description: r.description,
        interval: r.interval,
        priceMinor: latestVer ? latestVer.price : r.price,
        currency: r.currency,
        version: latestVer?.version ?? 1,
        entitlements: (latestVer?.entitlements as string[]) ?? [],
        isActive: r.isActive,
      });
    }

    return { items: result };
  }

  /**
   * Creates or updates a plan with an immutable version (ADM-15, PAY-02).
   */
  async createAdminPlan(input: AdminPlanCreateDto): Promise<PlanDto> {
    if (input.priceMinor < 0) {
      throw new BadRequestException('Giá gói không được là số âm.');
    }

    const db = this.dbClient.db;
    const planId = input.code;

    const existingPlan = await db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.id, planId))
      .limit(1);

    const intervalVal = (input.term || input.interval || 'month') as string;

    if (existingPlan.length === 0) {
      await db.insert(schema.plans).values({
        id: planId,
        name: input.name,
        description: `Gói ${input.name}`,
        interval: intervalVal,
        price: input.priceMinor,
        currency: input.currency || 'VND',
        isActive: input.active ?? true,
        createdAt: new Date(),
      });
    } else {
      await db
        .update(schema.plans)
        .set({
          name: input.name,
          interval: intervalVal,
          price: input.priceMinor,
          currency: input.currency || existingPlan[0]!.currency,
          isActive: input.active ?? existingPlan[0]!.isActive,
        })
        .where(eq(schema.plans.id, planId));
    }

    // Determine next version
    const existingVersions = await db
      .select()
      .from(schema.planVersions)
      .where(eq(schema.planVersions.planId, planId))
      .orderBy(desc(schema.planVersions.version))
      .limit(1);

    const nextVer = (existingVersions[0]?.version ?? 0) + 1;

    await db.insert(schema.planVersions).values({
      planId,
      version: nextVer,
      price: input.priceMinor,
      entitlements: input.entitlements || [],
      effectiveFrom: new Date(),
    });

    return {
      id: planId,
      name: input.name,
      interval: intervalVal,
      priceMinor: input.priceMinor,
      currency: input.currency || 'VND',
      version: nextVer,
      entitlements: input.entitlements || [],
      isActive: input.active ?? true,
    };
  }

  /**
   * Creates a checkout session with atomic coupon reservation (PAY-04, PAY-07).
   */
  async createCheckoutSession(
    userId: string,
    input: {
      planId: string;
      term?: PaymentTerm | string;
      quantity?: number;
      couponCode?: string;
      returnPath: string;
    },
  ): Promise<CheckoutSessionDto> {
    await this.ensureInitialPlans();
    const db = this.dbClient.db;

    // Security check: Return path allowlisting to prevent Open Redirect
    if (!isValidReturnPath(input.returnPath)) {
      throw new BadRequestException('returnPath không hợp lệ (vi phạm allowlist chuyển hướng).');
    }

    // Find plan and current active version
    const planRows = await db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.id, input.planId))
      .limit(1);

    if (planRows.length === 0 || !planRows[0]!.isActive) {
      throw new BadRequestException(`Gói dịch vụ ${input.planId} không tồn tại hoặc đã ngừng cung cấp.`);
    }

    const plan = planRows[0]!;

    const versionRows = await db
      .select()
      .from(schema.planVersions)
      .where(eq(schema.planVersions.planId, plan.id))
      .orderBy(desc(schema.planVersions.version))
      .limit(1);

    const planVersion = versionRows[0];
    const baseUnitPrice = planVersion ? planVersion.price : plan.price;
    const quantity = input.quantity ?? 1;
    let totalAmount = baseUnitPrice * quantity;

    let appliedCouponInfo: { code: string; discountMinor: number } | undefined;

    // Atomic coupon reservation if couponCode was provided
    if (input.couponCode) {
      const discount = await this.reserveCoupon(input.couponCode, userId, totalAmount);
      totalAmount = Math.max(0, totalAmount - discount);
      appliedCouponInfo = {
        code: input.couponCode,
        discountMinor: discount,
      };
    }

    const orderId = generateUuidV7();
    const orderLineId = generateUuidV7();
    const attemptId = generateUuidV7();

    // Create order, line, attempt in transaction
    await db.transaction(async (tx: typeof db) => {
      await tx.insert(schema.orders).values({
        id: orderId,
        userId,
        totalAmount,
        currency: plan.currency,
        status: 'created',
        createdAt: new Date(),
      });

      await tx.insert(schema.orderLines).values({
        id: orderLineId,
        orderId,
        planId: plan.id,
        amount: totalAmount,
      });

      await tx.insert(schema.paymentAttempts).values({
        id: attemptId,
        orderId,
        provider: 'payos',
        status: 'initiated',
        amount: totalAmount,
        currency: plan.currency,
        createdAt: new Date(),
      });
    });

    const provider = this.providerRegistry.getProvider('payos');
    if (!provider) {
      throw new BadRequestException('Cổng thanh toán PayOS chưa được kích hoạt.');
    }

    const sessionResult = await provider.createCheckoutSession({
      orderId,
      amountMinor: totalAmount,
      currency: plan.currency,
      description: `Thanh toan goi ${plan.name}`,
      returnUrl: input.returnPath,
      cancelUrl: `${input.returnPath}?cancelled=true`,
    });

    // Update attempt with provider ref
    await db
      .update(schema.paymentAttempts)
      .set({ providerPaymentRef: sessionResult.providerPaymentRef })
      .where(eq(schema.paymentAttempts.id, attemptId));

    return {
      orderId,
      checkoutUrl: sessionResult.checkoutUrl,
      amountMinor: totalAmount,
      currency: plan.currency,
      couponApplied: appliedCouponInfo,
    };
  }

  /**
   * Handles payment webhook with HMAC verification, deduplication, and out-of-order handling (Acceptance 1, PAY-04).
   */
  async handleWebhook(
    providerName: string,
    rawBody: string | Buffer | Record<string, unknown>,
    signature?: string,
    headers?: Record<string, string | string[] | undefined>,
  ): Promise<{ received: boolean; deduplicated?: boolean; ignoredOutOfOrder?: boolean }> {
    const provider = this.providerRegistry.getProvider(providerName);
    if (!provider) {
      throw new BadRequestException(`Không hỗ trợ nhà cung cấp thanh toán ${providerName}.`);
    }

    // 1. Verify cryptographic signature
    const verification = await provider.verifyWebhook(rawBody, signature, headers);
    if (!verification.isValid) {
      throw new BadRequestException({
        code: 'INVALID_SIGNATURE',
        message: 'Chữ ký số của webhook không hợp lệ.',
        error: verification.error,
      });
    }

    const db = this.dbClient.db;
    const eventId = verification.eventId || `evt_${generateUuidV7()}`;

    // 2. Deduplication check (Idempotent webhook replay)
    const existingEvents = await db
      .select()
      .from(schema.paymentWebhookEvents)
      .where(
        and(
          eq(schema.paymentWebhookEvents.provider, providerName),
          eq(schema.paymentWebhookEvents.eventId, eventId),
        ),
      )
      .limit(1);

    if (existingEvents.length > 0 && existingEvents[0]!.processedAt) {
      return { received: true, deduplicated: true };
    }

    // Record webhook event receipt
    const webhookEventDbId = generateUuidV7();
    if (existingEvents.length === 0) {
      await db.insert(schema.paymentWebhookEvents).values({
        id: webhookEventDbId,
        provider: providerName,
        eventId,
        eventType: verification.eventType || 'unknown',
        payload: verification.rawPayload || {},
        receivedAt: new Date(),
      });
    }

    if (!verification.orderId) {
      return { received: true };
    }

    // 3. Find target order
    const orderRows = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, verification.orderId))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException(`Không tìm thấy đơn hàng ${verification.orderId}.`);
    }

    const order = orderRows[0]!;

    // 4. Out-of-order check
    // If order is already paid or refunded, do not let an older / delayed FAILED event overwrite terminal status
    if (order.status === 'paid' || order.status === 'refunded') {
      if (verification.status === 'FAILED' || verification.status === 'CANCELLED') {
        return { received: true, ignoredOutOfOrder: true };
      }
      if (order.status === 'refunded' && verification.status === 'PAID') {
        return { received: true, ignoredOutOfOrder: true };
      }
    }

    const now = new Date();

    // 5. State Reconciliation
    if (verification.status === 'PAID') {
      if (order.status !== 'paid') {
        await db.transaction(async (tx: typeof db) => {
          // Update order status
          await tx
            .update(schema.orders)
            .set({ status: 'paid' })
            .where(eq(schema.orders.id, order.id));

          // Update payment attempt
          await tx
            .update(schema.paymentAttempts)
            .set({ status: 'successful' })
            .where(eq(schema.paymentAttempts.orderId, order.id));

          // Find order line to determine plan
          const orderLines = await tx
            .select()
            .from(schema.orderLines)
            .where(eq(schema.orderLines.orderId, order.id))
            .limit(1);

          const planId = orderLines[0]?.planId || 'premium_month';

          // Redeem any active coupon reservation for this order
          await this.redeemCouponForOrder(order.id, order.userId, tx);

          // Calculate subscription duration
          let durationDays = 30;
          if (planId.includes('quarter')) durationDays = 90;
          if (planId.includes('year')) durationDays = 365;

          const currentPeriodStart = now;
          const currentPeriodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

          // Upsert subscription
          const subRows = await tx
            .select()
            .from(schema.subscriptions)
            .where(eq(schema.subscriptions.userId, order.userId))
            .limit(1);

          if (subRows.length === 0) {
            await tx.insert(schema.subscriptions).values({
              id: generateUuidV7(),
              userId: order.userId,
              planId,
              status: 'active',
              currentPeriodStart,
              currentPeriodEnd,
              cancelAtPeriodEnd: false,
            });
          } else {
            const oldPlanId = subRows[0]!.planId;
            await tx
              .update(schema.subscriptions)
              .set({
                planId,
                status: 'active',
                currentPeriodStart,
                currentPeriodEnd,
                cancelAtPeriodEnd: false,
              })
              .where(eq(schema.subscriptions.id, subRows[0]!.id));

            if (oldPlanId !== planId) {
              await tx.insert(schema.subscriptionChanges).values({
                id: generateUuidV7(),
                subscriptionId: subRows[0]!.id,
                changeType: 'upgrade',
                oldPlanId,
                newPlanId: planId,
                effectiveAt: now,
              });
            }
          }

          // Grant plan entitlements
          await this.entitlementService.grantPlanEntitlements(
            order.userId,
            planId,
            currentPeriodEnd,
            tx,
          );

          // Mark webhook event processed
          await tx
            .update(schema.paymentWebhookEvents)
            .set({ processedAt: now })
            .where(
              and(
                eq(schema.paymentWebhookEvents.provider, providerName),
                eq(schema.paymentWebhookEvents.eventId, eventId),
              ),
            );

          // Emit payment.captured event
          if (this.outboxService) {
            await this.outboxService.emitEvent(
              'payment.captured',
              order.id,
              order.userId,
              {
                orderId: order.id,
                provider: providerName,
                paymentAttemptId: eventId,
                amountMinor: order.totalAmount,
                currency: order.currency,
                userId: order.userId,
              },
              tx,
            );
          }
        });
      }
    } else if (verification.status === 'FAILED') {
      await db.transaction(async (tx: typeof db) => {
        await tx
          .update(schema.orders)
          .set({ status: 'failed' })
          .where(eq(schema.orders.id, order.id));

        await tx
          .update(schema.paymentAttempts)
          .set({ status: 'failed' })
          .where(eq(schema.paymentAttempts.orderId, order.id));

        // Release any coupon reservation
        await this.releaseCouponForUser(order.userId, tx);

        await tx
          .update(schema.paymentWebhookEvents)
          .set({ processedAt: now })
          .where(
            and(
              eq(schema.paymentWebhookEvents.provider, providerName),
              eq(schema.paymentWebhookEvents.eventId, eventId),
            ),
          );

        if (this.outboxService) {
          await this.outboxService.emitEvent(
            'payment.failed',
            order.id,
            order.userId,
            {
              orderId: order.id,
              reason: verification.error || 'Payment failed at gateway',
            },
            tx,
          );
        }
      });
    }

    return { received: true };
  }

  /**
   * User Subscription State Machine (PAY-05, PAY-09, Acceptance 2).
   */
  async getUserSubscription(userId: string): Promise<UserSubscriptionDto> {
    const db = this.dbClient.db;
    const now = new Date();

    const subRows = await db
      .select()
      .from(schema.subscriptions)
      .where(eq(schema.subscriptions.userId, userId))
      .orderBy(desc(schema.subscriptions.currentPeriodEnd))
      .limit(1);

    if (subRows.length === 0) {
      return { status: 'none', planId: null, expiresAt: null };
    }

    const sub = subRows[0]!;

    // Check expiration
    if (sub.currentPeriodEnd <= now) {
      if (sub.status !== 'expired') {
        await db
          .update(schema.subscriptions)
          .set({ status: 'expired' })
          .where(eq(schema.subscriptions.id, sub.id));
      }
      return {
        status: 'expired',
        planId: sub.planId,
        expiresAt: sub.currentPeriodEnd.toISOString(),
      };
    }

    return {
      status: sub.status as UserSubscriptionDto['status'],
      planId: sub.planId,
      expiresAt: sub.currentPeriodEnd.toISOString(),
      currentPeriodStart: sub.currentPeriodStart.toISOString(),
      currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
      cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    };
  }

  async cancelSubscription(userId: string): Promise<{ cancelled: boolean }> {
    const db = this.dbClient.db;
    const now = new Date();

    const subRows = await db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.userId, userId),
          gt(schema.subscriptions.currentPeriodEnd, now),
        ),
      )
      .limit(1);

    if (subRows.length === 0) {
      throw new BadRequestException('Bạn không có gói thuê bao nào đang hoạt động.');
    }

    const sub = subRows[0]!;

    await db.transaction(async (tx: typeof db) => {
      await tx
        .update(schema.subscriptions)
        .set({
          status: 'cancelled',
          cancelAtPeriodEnd: true,
        })
        .where(eq(schema.subscriptions.id, sub.id));

      await tx.insert(schema.subscriptionChanges).values({
        id: generateUuidV7(),
        subscriptionId: sub.id,
        changeType: 'cancel',
        oldPlanId: sub.planId,
        newPlanId: sub.planId,
        effectiveAt: sub.currentPeriodEnd,
      });

      if (this.outboxService) {
        await this.outboxService.emitEvent(
          'subscription.changed',
          sub.id,
          userId,
          {
            subscriptionId: sub.id,
            userId,
            planId: sub.planId,
            status: 'cancelled',
            expiresAt: sub.currentPeriodEnd.toISOString(),
          },
          tx,
        );
      }
    });

    return { cancelled: true };
  }

  async renewSubscription(userId: string): Promise<{ renewed: boolean }> {
    const db = this.dbClient.db;
    const now = new Date();

    const subRows = await db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.userId, userId),
          gt(schema.subscriptions.currentPeriodEnd, now),
        ),
      )
      .limit(1);

    if (subRows.length === 0) {
      throw new BadRequestException('Không tìm thấy gói thuê bao hợp lệ để kích hoạt lại.');
    }

    const sub = subRows[0]!;

    await db.transaction(async (tx: typeof db) => {
      await tx
        .update(schema.subscriptions)
        .set({
          status: 'active',
          cancelAtPeriodEnd: false,
        })
        .where(eq(schema.subscriptions.id, sub.id));

      await tx.insert(schema.subscriptionChanges).values({
        id: generateUuidV7(),
        subscriptionId: sub.id,
        changeType: 'renew',
        oldPlanId: sub.planId,
        newPlanId: sub.planId,
        effectiveAt: now,
      });

      if (this.outboxService) {
        await this.outboxService.emitEvent(
          'subscription.changed',
          sub.id,
          userId,
          {
            subscriptionId: sub.id,
            userId,
            planId: sub.planId,
            status: 'active',
            expiresAt: sub.currentPeriodEnd.toISOString(),
          },
          tx,
        );
      }
    });

    return { renewed: true };
  }

  async changeSubscriptionPlan(
    userId: string,
    newPlanId: string,
    returnPath = '/dashboard',
  ): Promise<SubscriptionChangeResultDto> {
    const db = this.dbClient.db;
    const now = new Date();

    const subRows = await db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.userId, userId),
          gt(schema.subscriptions.currentPeriodEnd, now),
        ),
      )
      .limit(1);

    if (subRows.length === 0) {
      throw new BadRequestException('Bạn chưa có gói đang kích hoạt để đổi gói.');
    }

    const sub = subRows[0]!;
    if (sub.planId === newPlanId) {
      throw new BadRequestException('Bạn đang sử dụng gói này.');
    }

    const newPlanRows = await db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.id, newPlanId))
      .limit(1);

    if (newPlanRows.length === 0 || !newPlanRows[0]!.isActive) {
      throw new BadRequestException(`Gói ${newPlanId} không hợp lệ.`);
    }

    const newPlan = newPlanRows[0]!;

    const oldPlanRows = await db
      .select()
      .from(schema.plans)
      .where(eq(schema.plans.id, sub.planId))
      .limit(1);

    const oldPlan = oldPlanRows[0] ?? { price: 0, currency: 'VND' };

    // Calculate proration fee
    const totalPeriodMs = Math.max(1, sub.currentPeriodEnd.getTime() - sub.currentPeriodStart.getTime());
    const remainingMs = Math.max(0, sub.currentPeriodEnd.getTime() - now.getTime());
    const fractionRemaining = remainingMs / totalPeriodMs;
    const unusedOldAmount = Math.round(oldPlan.price * fractionRemaining);
    const prorationFee = Math.max(0, newPlan.price - unusedOldAmount);

    if (prorationFee > 0) {
      // Create checkout session / order for the proration fee
      const orderId = generateUuidV7();
      await db.insert(schema.orders).values({
        id: orderId,
        userId,
        totalAmount: prorationFee,
        currency: newPlan.currency,
        status: 'created',
        createdAt: now,
      });

      await db.insert(schema.orderLines).values({
        id: generateUuidV7(),
        orderId,
        planId: newPlan.id,
        amount: prorationFee,
      });

      const provider = this.providerRegistry.getProvider('payos');
      const session = await provider?.createCheckoutSession({
        orderId,
        amountMinor: prorationFee,
        currency: newPlan.currency,
        description: `Nâng cấp gói lên ${newPlan.name}`,
        returnUrl: `http://localhost:3000${returnPath}?upgradeOrderId=${orderId}`,
        cancelUrl: `http://localhost:3000${returnPath}?upgradeCancelled=1`,
      });

      return {
        updated: false,
        requiresPayment: true,
        orderId,
        checkoutUrl: session?.checkoutUrl,
        prorationMinor: prorationFee,
      };
    }

    // If no additional cost (same price or downgrade), update plan immediately
    const oldPlanId = sub.planId;
    await db.transaction(async (tx: typeof db) => {
      await tx
        .update(schema.subscriptions)
        .set({
          planId: newPlanId,
          status: 'active',
        })
        .where(eq(schema.subscriptions.id, sub.id));

      await tx.insert(schema.subscriptionChanges).values({
        id: generateUuidV7(),
        subscriptionId: sub.id,
        changeType: 'change_plan',
        oldPlanId,
        newPlanId,
        effectiveAt: now,
      });

      await this.entitlementService.grantPlanEntitlements(
        userId,
        newPlanId,
        sub.currentPeriodEnd,
        tx,
      );

      if (this.outboxService) {
        await this.outboxService.emitEvent(
          'subscription.changed',
          sub.id,
          userId,
          {
            subscriptionId: sub.id,
            userId,
            planId: newPlanId,
            status: 'active',
            expiresAt: sub.currentPeriodEnd.toISOString(),
          },
          tx,
        );
      }
    });

    return { updated: true };
  }

  async getAdminSubscriptions(): Promise<{ items: AdminSubscriptionItemDto[] }> {
    await this.ensureInitialOrdersAndRefunds();
    const db = this.dbClient.db;
    const rows = await db
      .select()
      .from(schema.subscriptions)
      .orderBy(desc(schema.subscriptions.currentPeriodEnd));

    return {
      items: rows.map((s: typeof schema.subscriptions.$inferSelect) => ({
        id: s.id,
        userId: s.userId,
        planId: s.planId,
        status: s.status,
        currentPeriodStart: s.currentPeriodStart ? new Date(s.currentPeriodStart).toISOString() : new Date().toISOString(),
        currentPeriodEnd: s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toISOString() : new Date().toISOString(),
        cancelAtPeriodEnd: s.cancelAtPeriodEnd ?? false,
      })),
    };
  }

  /**
   * User & Admin Transactions History (PAY-06, ADM-16).
   */
  async getUserTransactions(userId: string): Promise<{ items: TransactionItemDto[] }> {
    const db = this.dbClient.db;

    const rows = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.userId, userId))
      .orderBy(desc(schema.orders.createdAt));

    return {
      items: rows.map((r: typeof schema.orders.$inferSelect) => ({
        orderId: r.id,
        amountMinor: r.totalAmount,
        currency: r.currency,
        status: r.status as TransactionItemDto['status'],
        createdAt: r.createdAt.toISOString(),
      })),
    };
  }

  async ensureInitialOrdersAndRefunds(): Promise<void> {
    const db = this.dbClient.db;
    const existing = await db.select().from(schema.orders).limit(1);
    if (existing.length === 0) {
      const now = new Date();
      const userRows = (await db.select({ id: schema.users.id }).from(schema.users).limit(1)) as Array<{ id: string }>;
      if (userRows.length === 0) {
        return;
      }
      const userId = userRows[0]!.id;

      const order1Id = generateUuidV7();
      await db.insert(schema.orders).values({
        id: order1Id,
        userId,
        status: 'paid',
        totalAmount: 199000,
        currency: 'VND',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      }).onConflictDoNothing();

      const order2Id = generateUuidV7();
      await db.insert(schema.orders).values({
        id: order2Id,
        userId,
        status: 'paid',
        totalAmount: 1499000,
        currency: 'VND',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      }).onConflictDoNothing();

      await db.insert(schema.refundRequests).values({
        id: generateUuidV7(),
        orderId: order1Id,
        amount: 199000,
        reason: 'Học viên muốn đổi sang gói năm',
        status: 'requested',
        createdAt: now,
      }).onConflictDoNothing();

      const subExisting = await db.select().from(schema.subscriptions).limit(1);
      if (subExisting.length === 0) {
        await this.ensureInitialPlans();
        const planRows = await db.select({ id: schema.plans.id }).from(schema.plans).limit(1);
        const planId = planRows[0]?.id || 'n2_monthly';
        await db.insert(schema.subscriptions).values({
          id: generateUuidV7(),
          userId,
          planId,
          status: 'active',
          currentPeriodStart: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
          currentPeriodEnd: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: false,
        }).onConflictDoNothing();
      }
    }
  }

  async getAdminPayments(): Promise<{ items: AdminPaymentItemDto[] }> {
    await this.ensureInitialOrdersAndRefunds();
    const db = this.dbClient.db;
    const rows = await db
      .select()
      .from(schema.orders)
      .orderBy(desc(schema.orders.createdAt));

    return {
      items: rows.map((r: typeof schema.orders.$inferSelect) => ({
        id: r.id,
        orderId: r.id,
        userId: r.userId,
        totalAmount: r.totalAmount,
        currency: r.currency,
        status: r.status,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      })),
    };
  }

  /**
   * Refunds State Machine (PAY-08, ADM-16, Acceptance 2).
   * Invariant: refundAmount <= order.totalAmount - priorRefunds.
   */
  async requestRefund(userId: string, input: RefundRequestDto): Promise<{ refundId: string; status: string }> {
    const db = this.dbClient.db;

    const orderRows = await db
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, input.transactionId), eq(schema.orders.userId, userId)))
      .limit(1);

    if (orderRows.length === 0) {
      throw new NotFoundException('Không tìm thấy giao dịch hoặc đơn hàng không thuộc về bạn.');
    }

    const order = orderRows[0]!;
    if (order.status === 'refunded') {
      throw new BadRequestException('Đơn hàng này đã được hoàn tiền đầy đủ trước đó.');
    }
    if (order.status !== 'paid') {
      throw new BadRequestException('Chỉ có thể yêu cầu hoàn tiền cho đơn hàng đã thanh toán thành công.');
    }

    // Check prior refunds (including pending requested)
    const priorRefunds = await db
      .select({
        totalRefunded: sql<number>`coalesce(sum(${schema.refundRequests.amount}), 0)`,
      })
      .from(schema.refundRequests)
      .where(
        and(
          eq(schema.refundRequests.orderId, order.id),
          inArray(schema.refundRequests.status, ['requested', 'approved', 'processing', 'refunded']),
        ),
      );

    const alreadyRefunded = Number(priorRefunds[0]?.totalRefunded ?? 0);
    const maxRefundable = order.totalAmount - alreadyRefunded;

    if (maxRefundable <= 0) {
      throw new BadRequestException('Đơn hàng này đã được hoàn tiền đầy đủ trước đó.');
    }

    const requestedAmount = input.amountMinor ? Math.min(input.amountMinor, maxRefundable) : maxRefundable;
    if (requestedAmount <= 0) {
      throw new BadRequestException('Số tiền hoàn trả phải lớn hơn 0.');
    }

    const refundId = generateUuidV7();

    await db.insert(schema.refundRequests).values({
      id: refundId,
      orderId: order.id,
      amount: requestedAmount,
      reason: input.reason,
      status: 'requested',
      createdAt: new Date(),
    });

    return { refundId, status: 'requested' };
  }

  async getAdminRefunds(): Promise<{ items: AdminRefundItemDto[] }> {
    await this.ensureInitialOrdersAndRefunds();
    const db = this.dbClient.db;
    const rows = await db
      .select()
      .from(schema.refundRequests)
      .orderBy(desc(schema.refundRequests.createdAt));

    return {
      items: rows.map((r: typeof schema.refundRequests.$inferSelect) => ({
        id: r.id,
        orderId: r.orderId,
        transactionId: r.orderId,
        amount: r.amount,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      })),
    };
  }

  async approveRefund(adminId: string, refundRequestId: string): Promise<{ approved: boolean; status: string }> {
    const db = this.dbClient.db;

    // 1. Transaction with database lock to verify priorRefunded + refundReq.amount <= order.totalAmount
    // and transition status to 'processing' before calling external provider
    const lockResult = await db.transaction(async (tx: typeof db) => {
      const refundRows = await tx
        .select()
        .from(schema.refundRequests)
        .where(eq(schema.refundRequests.id, refundRequestId))
        .for('update');

      if (refundRows.length === 0) {
        throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền.');
      }

      const refundReq = refundRows[0]!;
      if (refundReq.status !== 'requested') {
        throw new BadRequestException(`Yêu cầu hoàn tiền đang ở trạng thái ${refundReq.status}.`);
      }

      const orderRows = await tx
        .select()
        .from(schema.orders)
        .where(eq(schema.orders.id, refundReq.orderId))
        .for('update');

      if (orderRows.length === 0) {
        throw new NotFoundException('Không tìm thấy đơn hàng tương ứng.');
      }

      const order = orderRows[0]!;

      // Calculate already refunded or processing amount (excluding this request)
      const prior = await tx
        .select({
          sum: sql<number>`coalesce(sum(${schema.refundRequests.amount}), 0)`,
        })
        .from(schema.refundRequests)
        .where(
          and(
            eq(schema.refundRequests.orderId, order.id),
            inArray(schema.refundRequests.status, ['approved', 'processing', 'refunded']),
            sql`${schema.refundRequests.id} != ${refundReq.id}`,
          ),
        );

      const priorRefunded = Number(prior[0]?.sum ?? 0);
      if (priorRefunded + refundReq.amount > order.totalAmount) {
        throw new BadRequestException('Tổng số tiền hoàn vượt quá giá trị đơn hàng.');
      }

      // Mark request as processing to prevent concurrent approval race
      await tx
        .update(schema.refundRequests)
        .set({ status: 'processing' })
        .where(eq(schema.refundRequests.id, refundReq.id));

      return { refundReq, order };
    });

    const { refundReq, order } = lockResult;

    // 2. Call payment provider outside lock
    const provider = this.providerRegistry.getProvider('payos');
    const providerRefund = await provider?.refundPayment({
      paymentRef: order.id,
      orderId: order.id,
      amountMinor: refundReq.amount,
      currency: order.currency,
      reason: refundReq.reason || 'Admin approved refund',
    });

    const now = new Date();

    // 3. Finalize in transaction
    await db.transaction(async (tx: typeof db) => {
      await tx.insert(schema.refundAttempts).values({
        id: generateUuidV7(),
        refundRequestId: refundReq.id,
        providerRefundRef: providerRefund?.providerRefundRef || 'manual_approval',
        status: 'successful',
        processedAt: now,
      });

      await tx
        .update(schema.refundRequests)
        .set({ status: 'refunded' })
        .where(eq(schema.refundRequests.id, refundReq.id));

      // Calculate total refunded for this order
      const prior = await tx
        .select({
          sum: sql<number>`coalesce(sum(${schema.refundRequests.amount}), 0)`,
        })
        .from(schema.refundRequests)
        .where(
          and(
            eq(schema.refundRequests.orderId, order.id),
            eq(schema.refundRequests.status, 'refunded'),
          ),
        );

      const totalRefunded = Number(prior[0]?.sum ?? 0);
      if (totalRefunded >= order.totalAmount) {
        // Full refund: mark order refunded, expire subscription, and revoke entitlement grants
        await tx
          .update(schema.orders)
          .set({ status: 'refunded' })
          .where(eq(schema.orders.id, order.id));

        await tx
          .update(schema.subscriptions)
          .set({ status: 'expired' })
          .where(eq(schema.subscriptions.userId, order.userId));

        // Revoke entitlements in entitlement_grants
        await tx
          .update(schema.entitlementGrants)
          .set({ expiresAt: now })
          .where(eq(schema.entitlementGrants.userId, order.userId));
      }

      if (this.outboxService) {
        await this.outboxService.emitEvent(
          'payment.refunded',
          refundReq.id,
          adminId,
          {
            refundId: refundReq.id,
            orderId: order.id,
            amountMinor: refundReq.amount,
            currency: order.currency,
          },
          tx,
        );
      }
    });

    return { approved: true, status: 'refunded' };
  }

  async rejectRefund(refundRequestId: string, reason?: string): Promise<{ rejected: boolean }> {
    const db = this.dbClient.db;

    const refundRows = await db
      .select()
      .from(schema.refundRequests)
      .where(eq(schema.refundRequests.id, refundRequestId))
      .limit(1);

    if (refundRows.length === 0) {
      throw new NotFoundException('Không tìm thấy yêu cầu hoàn tiền.');
    }

    await db
      .update(schema.refundRequests)
      .set({
        status: 'rejected',
        reason: reason ? `Rejected: ${reason}` : refundRows[0]!.reason,
      })
      .where(eq(schema.refundRequests.id, refundRequestId));

    return { rejected: true };
  }

  /**
   * Coupons Management & Atomic Reservation (PAY-07, ADM-15).
   */
  async ensureInitialCoupons(): Promise<void> {
    const db = this.dbClient.db;
    const existing = await db.select().from(schema.coupons).limit(1);
    if (existing.length === 0) {
      await db
        .insert(schema.coupons)
        .values([
          {
            code: 'JLPT2026',
            discountPercent: 20,
            discountAmount: null,
            maxRedemptions: 100,
            timesRedeemed: 0,
            validUntil: new Date('2026-12-31T23:59:59Z'),
          },
          {
            code: 'WELCOME50K',
            discountPercent: null,
            discountAmount: 50000,
            maxRedemptions: 500,
            timesRedeemed: 0,
            validUntil: new Date('2026-12-31T23:59:59Z'),
          },
        ])
        .onConflictDoNothing();
    }
  }

  async getAdminCoupons(): Promise<{ items: (typeof schema.coupons.$inferSelect)[] }> {
    await this.ensureInitialCoupons();
    const db = this.dbClient.db;
    const rows = await db.select().from(schema.coupons);
    return { items: rows };
  }

  async createAdminCoupon(input: AdminCouponCreateDto): Promise<typeof schema.coupons.$inferSelect> {
    const maxUses = input.maxRedemptions ?? input.maxUses ?? 1;
    if (maxUses <= 0) {
      throw new BadRequestException('maxUses phải lớn hơn hoặc bằng 1.');
    }

    const discountAmount = input.discountAmount ?? input.discountMinor;
    if (!input.discountPercent && !discountAmount) {
      throw new BadRequestException('Mã giảm giá phải có discountPercent hoặc discountMinor/discountAmount.');
    }

    if (input.discountPercent && (input.discountPercent <= 0 || input.discountPercent > 100)) {
      throw new BadRequestException('discountPercent phải nằm trong khoảng từ 1 đến 100.');
    }

    if (discountAmount && discountAmount <= 0) {
      throw new BadRequestException('discountMinor/discountAmount phải lớn hơn 0.');
    }

    const expiryRaw = input.validUntil ?? input.expiresAt;
    const expiryDate = expiryRaw ? new Date(expiryRaw) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    if (expiryDate <= new Date()) {
      throw new BadRequestException('Ngày hết hạn phải ở tương lai.');
    }

    const db = this.dbClient.db;
    const cleanCode = input.code.trim().toUpperCase();

    const existing = await db
      .select()
      .from(schema.coupons)
      .where(eq(schema.coupons.code, cleanCode))
      .limit(1);

    if (existing.length > 0) {
      throw new BadRequestException(`Mã giảm giá ${cleanCode} đã tồn tại.`);
    }

    await db.insert(schema.coupons).values({
      code: cleanCode,
      discountPercent: input.discountPercent ?? null,
      discountAmount: discountAmount ?? null,
      maxRedemptions: maxUses,
      timesRedeemed: 0,
      validUntil: expiryDate,
    });

    const created = await db
      .select()
      .from(schema.coupons)
      .where(eq(schema.coupons.code, cleanCode))
      .limit(1);

    return created[0]!;
  }

  async reserveCoupon(code: string, userId: string, orderAmount: number): Promise<number> {
    const db = this.dbClient.db;
    const cleanCode = code.trim().toUpperCase();
    const now = new Date();

    return await db.transaction(async (tx: typeof db) => {
      // 1. Lock coupon row FOR UPDATE to prevent race conditions exceeding maxRedemptions
      const couponRows = await tx
        .select()
        .from(schema.coupons)
        .where(eq(schema.coupons.code, cleanCode))
        .for('update');

      if (couponRows.length === 0) {
        throw new BadRequestException(`Mã giảm giá ${cleanCode} không tồn tại.`);
      }

      const coupon = couponRows[0]!;
      if (coupon.validUntil && coupon.validUntil <= now) {
        throw new BadRequestException('Mã giảm giá đã hết hạn sử dụng.');
      }

      // 2. Atomic count: active reservations + timesRedeemed
      const activeReservations = await tx
        .select({ count: sql<number>`count(*)` })
        .from(schema.couponReservations)
        .where(
          and(
            eq(schema.couponReservations.couponCode, cleanCode),
            gt(schema.couponReservations.expiresAt, now),
          ),
        );

      const reservedCount = Number(activeReservations[0]?.count ?? 0);
      if (coupon.timesRedeemed + reservedCount >= coupon.maxRedemptions) {
        throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng.');
      }

      // 3. Calculate discount
      let discount = 0;
      if (coupon.discountPercent) {
        discount = Math.round((orderAmount * coupon.discountPercent) / 100);
      } else if (coupon.discountAmount) {
        discount = Math.min(orderAmount, coupon.discountAmount);
      }

      // 4. Create reservation for 15 minutes TTL
      const reservationExpiry = new Date(now.getTime() + 15 * 60 * 1000);
      await tx.insert(schema.couponReservations).values({
        id: generateUuidV7(),
        couponCode: cleanCode,
        userId,
        reservedAt: now,
        expiresAt: reservationExpiry,
      });

      return discount;
    });
  }

  async redeemCouponForOrder(orderId: string, userId: string, tx: typeof this.dbClient.db): Promise<void> {
    const now = new Date();

    // Check if user has an active reservation
    const reservations = await tx
      .select()
      .from(schema.couponReservations)
      .where(
        and(
          eq(schema.couponReservations.userId, userId),
          gt(schema.couponReservations.expiresAt, now),
        ),
      )
      .limit(1);

    if (reservations.length > 0) {
      const res = reservations[0]!;

      // Insert redemption
      await tx.insert(schema.couponRedemptions).values({
        id: generateUuidV7(),
        couponCode: res.couponCode,
        orderId,
        userId,
        redeemedAt: now,
      });

      // Increment coupon timesRedeemed
      await tx
        .update(schema.coupons)
        .set({ timesRedeemed: sql`${schema.coupons.timesRedeemed} + 1` })
        .where(eq(schema.coupons.code, res.couponCode));

      // Remove reservation
      await tx
        .delete(schema.couponReservations)
        .where(eq(schema.couponReservations.id, res.id));
    }
  }

  async releaseCouponForUser(userId: string, tx: typeof this.dbClient.db): Promise<void> {
    await tx
      .delete(schema.couponReservations)
      .where(eq(schema.couponReservations.userId, userId));
  }

  /**
   * Financial Revenue Report (PAY-12, ADM-16).
   * Calculates gross, refunds, net minor units, separated by currency.
   */
  async getRevenueReport(query?: { from?: string; to?: string; currency?: string }): Promise<RevenueReportDto> {
    const db = this.dbClient.db;
    const targetCurrency = (query?.currency || 'VND').toUpperCase();

    const fromDate = query?.from ? new Date(query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = query?.to ? new Date(query.to) : new Date();

    // Gross paid orders
    const paidOrders = await db
      .select({
        currency: schema.orders.currency,
        totalGross: sql<number>`coalesce(sum(${schema.orders.totalAmount}), 0)`,
        orderCount: sql<number>`count(*)`,
      })
      .from(schema.orders)
      .where(
        and(
          inArray(schema.orders.status, ['paid', 'refunded']),
          gte(schema.orders.createdAt, fromDate),
          lte(schema.orders.createdAt, toDate),
        ),
      )
      .groupBy(schema.orders.currency);

    // Approved & processed refunds
    const processedRefunds = await db
      .select({
        currency: schema.orders.currency,
        totalRefund: sql<number>`coalesce(sum(${schema.refundRequests.amount}), 0)`,
        refundCount: sql<number>`count(*)`,
      })
      .from(schema.refundRequests)
      .innerJoin(schema.orders, eq(schema.refundRequests.orderId, schema.orders.id))
      .where(
        and(
          eq(schema.refundRequests.status, 'refunded'),
          gte(schema.refundRequests.createdAt, fromDate),
          lte(schema.refundRequests.createdAt, toDate),
        ),
      )
      .groupBy(schema.orders.currency);

    const breakdown: RevenueReportDto['breakdownByCurrency'] = {};

    for (const po of paidOrders) {
      const cur = po.currency.toUpperCase();
      breakdown[cur] = {
        grossMinor: Number(po.totalGross),
        refundMinor: 0,
        netMinor: Number(po.totalGross),
        orderCount: Number(po.orderCount),
        refundCount: 0,
      };
    }

    for (const pr of processedRefunds) {
      const cur = pr.currency.toUpperCase();
      const refMinor = Number(pr.totalRefund);
      if (!breakdown[cur]) {
        breakdown[cur] = {
          grossMinor: 0,
          refundMinor: refMinor,
          netMinor: -refMinor,
          orderCount: 0,
          refundCount: Number(pr.refundCount),
        };
      } else {
        breakdown[cur].refundMinor = refMinor;
        breakdown[cur].netMinor = breakdown[cur].grossMinor - refMinor;
        breakdown[cur].refundCount = Number(pr.refundCount);
      }
    }

    const targetStats = breakdown[targetCurrency] || {
      grossMinor: 0,
      refundMinor: 0,
      netMinor: 0,
      orderCount: 0,
      refundCount: 0,
    };

    return {
      grossMinor: targetStats.grossMinor,
      refundMinor: targetStats.refundMinor,
      netMinor: targetStats.netMinor,
      currency: targetCurrency,
      periodStart: fromDate.toISOString(),
      periodEnd: toDate.toISOString(),
      breakdownByCurrency: breakdown,
    };
  }
}
