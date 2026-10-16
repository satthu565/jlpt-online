import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { and, desc, eq, gt, gte, isNull, sql } from 'drizzle-orm';
import { integer, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { OutboxService } from '../outbox/outbox.service.js';

export const tenantPlansTable = pgTable('tenant_plans', {
  tenantId: text('tenant_id').primaryKey(),
  planCode: text('plan_code').notNull(),
  status: text('status').notNull(),
  totalSeats: integer('total_seats').notNull(),
  usedSeats: integer('used_seats').notNull(),
  maxClasses: integer('max_classes').notNull(),
  features: jsonb('features').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
import type {
  AIQuotaRefundResult,
  AIQuotaReserveParams,
  AIQuotaReserveResult,
  AIQuotaSettleParams,
  FeatureCheckResult,
  TenantPlanDetails,
  TenantPlanStatus,
  UserEntitlementItem,
} from './entitlement.types.js';

export const DEFAULT_FREE_ENTITLEMENTS = [
  'basic_exams',
  'practice_mode',
  'vocab_flashcards',
  'daily_ai_limit_5',
];

export const FREE_TIER_LIMITS = {
  DAILY_EXAMS: 3,
  DAILY_AI_TOKENS: 2000,
  DAILY_AI_REQUESTS: 5,
};

export const PREMIUM_TIER_LIMITS = {
  MONTHLY_AI_TOKENS: 500000,
  UNLIMITED_EXAMS: true,
};

@Injectable()
export class EntitlementService {
  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    @Optional() private readonly outboxService?: OutboxService,
  ) {}

  /**
   * Retrieves active entitlements for a user (PAY-01, PAY-03).
   * Checks subscription, explicit grants, and falls back to Free Plan defaults.
   */
  async getUserEntitlements(userId: string): Promise<{ items: UserEntitlementItem[] }> {
    const db = this.dbClient.db;
    const now = new Date();
    const result: Map<string, UserEntitlementItem> = new Map();

    // 1. Check active subscription
    const userSubscriptions = await db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.userId, userId),
          gt(schema.subscriptions.currentPeriodEnd, now),
        ),
      )
      .orderBy(desc(schema.subscriptions.currentPeriodEnd));

    const activeSub = userSubscriptions.find((s: typeof schema.subscriptions.$inferSelect) =>
      s.status === 'active' || (s.status === 'cancelled' && s.currentPeriodEnd > now),
    );

    if (activeSub) {
      // Find plan version entitlements
      const versions = await db
        .select()
        .from(schema.planVersions)
        .where(eq(schema.planVersions.planId, activeSub.planId))
        .orderBy(desc(schema.planVersions.version))
        .limit(1);

      const planVersion = versions[0];
      const entitlements = (planVersion?.entitlements as string[]) || [];

      for (const ent of entitlements) {
        result.set(ent, {
          entitlement: ent,
          active: true,
          expiresAt: activeSub.currentPeriodEnd.toISOString(),
        });
      }

      // Always grant standard premium capabilities to active subscriptions
      result.set('premium_subscription', {
        entitlement: 'premium_subscription',
        active: true,
        expiresAt: activeSub.currentPeriodEnd.toISOString(),
      });
      result.set('unlimited_exams', {
        entitlement: 'unlimited_exams',
        active: true,
        expiresAt: activeSub.currentPeriodEnd.toISOString(),
      });
      result.set('ai_explanations', {
        entitlement: 'ai_explanations',
        active: true,
        expiresAt: activeSub.currentPeriodEnd.toISOString(),
      });
      result.set('advanced_analytics', {
        entitlement: 'advanced_analytics',
        active: true,
        expiresAt: activeSub.currentPeriodEnd.toISOString(),
      });
    }

    // 2. Check explicit entitlement grants
    const grants = await db
      .select()
      .from(schema.entitlementGrants)
      .where(eq(schema.entitlementGrants.userId, userId));

    for (const grant of grants) {
      if (!grant.expiresAt || grant.expiresAt > now) {
        result.set(grant.entitlementCode, {
          entitlement: grant.entitlementCode,
          active: true,
          expiresAt: grant.expiresAt ? grant.expiresAt.toISOString() : null,
        });
      }
    }

    // 3. Fallback to Free Plan entitlements if user has no subscription (PAY-01)
    if (!activeSub) {
      for (const ent of DEFAULT_FREE_ENTITLEMENTS) {
        if (!result.has(ent)) {
          result.set(ent, {
            entitlement: ent,
            active: true,
            expiresAt: null,
          });
        }
      }
    }

    return { items: Array.from(result.values()) };
  }

  /**
   * Checks whether a user holds a specific entitlement.
   */
  async hasEntitlement(userId: string, code: string): Promise<boolean> {
    const { items } = await this.getUserEntitlements(userId);
    return items.some((item) => item.entitlement === code && item.active);
  }

  /**
   * Feature-gating checks according to user plan (PAY-03).
   */
  async checkFeatureAccess(userId: string, featureCode: string): Promise<FeatureCheckResult> {
    const entitlements = await this.getUserEntitlements(userId);
    const hasCode = entitlements.items.some((i) => i.entitlement === featureCode && i.active);

    if (hasCode) {
      return { allowed: true };
    }

    // Free tier checks
    if (featureCode === 'unlimited_exams') {
      return {
        allowed: false,
        code: 'FEATURE_GATED',
        reason: 'Tài khoản miễn phí giới hạn số lần thi thử mỗi ngày.',
        limit: FREE_TIER_LIMITS.DAILY_EXAMS,
      };
    }

    if (featureCode === 'download_offline') {
      return {
        allowed: false,
        code: 'FEATURE_GATED',
        reason: 'Tính năng tải đề thi học ngoại tuyến chỉ dành cho gói trả phí.',
      };
    }

    if (featureCode === 'ai_explanations') {
      const hasFreeAi = entitlements.items.some((i) => i.entitlement === 'daily_ai_limit_5');
      if (hasFreeAi) {
        return {
          allowed: true,
          limit: FREE_TIER_LIMITS.DAILY_AI_REQUESTS,
        };
      }
      return {
        allowed: false,
        code: 'FEATURE_GATED',
        reason: 'Bạn đã hết lượt sử dụng AI hôm nay.',
      };
    }

    return {
      allowed: false,
      code: 'ENTITLEMENT_REQUIRED',
      reason: `Tính năng yêu cầu quyền ${featureCode}.`,
    };
  }

  /**
   * Grants a plan entitlement to a user when an order is completed.
   */
  async grantPlanEntitlements(
    userId: string,
    planId: string,
    expiresAt: Date,
    tx?: unknown,
  ): Promise<void> {
    const db = (tx as typeof this.dbClient.db) || this.dbClient.db;

    // Ensure entitlement definition exists
    await db
      .insert(schema.entitlementDefinitions)
      .values([
        { code: 'premium_access', name: 'Premium Access', description: 'Full access to JLPT' },
        { code: 'unlimited_exams', name: 'Unlimited Exams', description: 'Take unlimited tests' },
        { code: 'ai_explanations', name: 'AI Explanations', description: 'AI explanations' },
      ])
      .onConflictDoNothing();

    // Insert grant
    await db.insert(schema.entitlementGrants).values({
      id: generateUuidV7(),
      userId,
      entitlementCode: 'premium_access',
      grantedAt: new Date(),
      expiresAt,
      sourceRef: `order_${planId}`,
    });
  }

  async ensureTenantPlansTable(): Promise<void> {
    await this.dbClient.query(`
      CREATE TABLE IF NOT EXISTS tenant_plans (
        tenant_id TEXT PRIMARY KEY,
        plan_code TEXT NOT NULL,
        status TEXT NOT NULL,
        total_seats INTEGER NOT NULL,
        used_seats INTEGER NOT NULL,
        max_classes INTEGER NOT NULL,
        features JSONB NOT NULL DEFAULT '[]'::jsonb,
        expires_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  /**
   * Tenant Plan State Machine (PAY-10): trial -> active -> suspended -> expired.
   * Persisted in database according to DB contract.
   */
  async getTenantPlan(tenantId: string): Promise<TenantPlanDetails> {
    await this.ensureTenantPlansTable();
    const db = this.dbClient.db;

    const rows = await db
      .select()
      .from(tenantPlansTable)
      .where(eq(tenantPlansTable.tenantId, tenantId))
      .limit(1);

    if (rows.length > 0) {
      const row = rows[0]!;
      return {
        tenantId: row.tenantId,
        planCode: row.planCode,
        status: row.status as TenantPlanStatus,
        totalSeats: row.totalSeats,
        usedSeats: row.usedSeats,
        maxClasses: row.maxClasses,
        features: Array.isArray(row.features)
          ? (row.features as string[])
          : typeof row.features === 'string'
          ? JSON.parse(row.features)
          : [],
        expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
      };
    }

    const defaultPlan: TenantPlanDetails = {
      tenantId,
      planCode: 'organization_standard',
      status: 'active',
      totalSeats: 50,
      usedSeats: 0,
      maxClasses: 10,
      features: ['unlimited_exams', 'teacher_dashboard', 'class_assignments'],
      expiresAt: null,
    };

    await db
      .insert(tenantPlansTable)
      .values({
        tenantId: defaultPlan.tenantId,
        planCode: defaultPlan.planCode,
        status: defaultPlan.status,
        totalSeats: defaultPlan.totalSeats,
        usedSeats: defaultPlan.usedSeats,
        maxClasses: defaultPlan.maxClasses,
        features: defaultPlan.features,
        expiresAt: null,
      })
      .onConflictDoNothing();

    return defaultPlan;
  }

  async setTenantPlan(
    tenantId: string,
    update: {
      planCode?: string;
      status?: TenantPlanStatus;
      totalSeats?: number;
      usedSeats?: number;
      maxClasses?: number;
      expiresAt?: string | null;
    },
  ): Promise<TenantPlanDetails> {
    await this.ensureTenantPlansTable();
    const current = await this.getTenantPlan(tenantId);
    const updated: TenantPlanDetails = {
      ...current,
      ...update,
      tenantId,
    };

    // Valid state transitions
    const validTransitions: Record<TenantPlanStatus, TenantPlanStatus[]> = {
      trial: ['active', 'suspended', 'expired'],
      active: ['suspended', 'expired', 'trial'],
      suspended: ['active', 'expired'],
      expired: ['active', 'trial'],
    };

    if (update.status && update.status !== current.status) {
      if (!validTransitions[current.status]?.includes(update.status)) {
        throw new BadRequestException(
          `Chuyển trạng thái gói tổ chức không hợp lệ: từ ${current.status} sang ${update.status}`,
        );
      }
    }

    const db = this.dbClient.db;
    await db
      .update(tenantPlansTable)
      .set({
        planCode: updated.planCode,
        status: updated.status,
        totalSeats: updated.totalSeats,
        usedSeats: updated.usedSeats,
        maxClasses: updated.maxClasses,
        features: updated.features,
        expiresAt: updated.expiresAt ? new Date(updated.expiresAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(tenantPlansTable.tenantId, tenantId));

    return updated;
  }

  async assignTenantSeat(tenantId: string): Promise<{ success: boolean; remainingSeats: number }> {
    await this.ensureTenantPlansTable();
    const db = this.dbClient.db;

    return await db.transaction(async (tx: typeof db) => {
      const rows = await tx
        .select()
        .from(tenantPlansTable)
        .where(eq(tenantPlansTable.tenantId, tenantId))
        .for('update');

      let plan: TenantPlanDetails;
      if (rows.length > 0) {
        const row = rows[0]!;
        plan = {
          tenantId: row.tenantId,
          planCode: row.planCode,
          status: row.status as TenantPlanStatus,
          totalSeats: row.totalSeats,
          usedSeats: row.usedSeats,
          maxClasses: row.maxClasses,
          features: Array.isArray(row.features)
            ? (row.features as string[])
            : typeof row.features === 'string'
            ? JSON.parse(row.features)
            : [],
          expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
        };
      } else {
        plan = await this.getTenantPlan(tenantId);
      }

      if (plan.status !== 'active' && plan.status !== 'trial') {
        throw new BadRequestException(`Gói của tổ chức đang ở trạng thái ${plan.status}.`);
      }

      if (plan.usedSeats >= plan.totalSeats) {
        throw new BadRequestException('Tổ chức đã dùng hết số lượng tài khoản (seats) được cấp.');
      }

      const newUsedSeats = plan.usedSeats + 1;
      await tx
        .update(tenantPlansTable)
        .set({
          usedSeats: newUsedSeats,
          updatedAt: new Date(),
        })
        .where(eq(tenantPlansTable.tenantId, tenantId));

      return {
        success: true,
        remainingSeats: plan.totalSeats - newUsedSeats,
      };
    });
  }

  /**
   * Atomic AI Quota Reservation (PAY-11, Acceptance 3).
   * Checks limit and atomically reserves tokens inside database transaction with row locking.
   */
  async reserveAIQuota(params: AIQuotaReserveParams): Promise<AIQuotaReserveResult> {
    const db = this.dbClient.db;

    if (params.estimatedTokens <= 0) {
      throw new BadRequestException('estimatedTokens phải lớn hơn 0.');
    }

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Determine user allowance: check if user has active paid subscription
    const userEntitlements = await this.getUserEntitlements(params.userId);
    const isPremium = userEntitlements.items.some((i) => i.entitlement === 'premium_subscription');
    const tokenLimit = isPremium
      ? PREMIUM_TIER_LIMITS.MONTHLY_AI_TOKENS
      : FREE_TIER_LIMITS.DAILY_AI_TOKENS * 30;

    return await db.transaction(async (tx: typeof db) => {
      // Row-level lock on user to prevent race condition (TOCTOU)
      await tx
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.id, params.userId))
        .for('update');

      // Sum settled usage in current window inside transaction
      const ledgerRows = await tx
        .select({
          totalTokens: sql<number>`coalesce(sum(${schema.usageLedger.tokensUsed}), 0)`,
        })
        .from(schema.usageLedger)
        .where(
          and(
            eq(schema.usageLedger.userId, params.userId),
            gte(schema.usageLedger.recordedAt, startOfMonth),
          ),
        );

      const settledTokens = Number(ledgerRows[0]?.totalTokens ?? 0);

      // Sum active reservations that have not settled yet inside transaction
      const pendingReservations = await tx
        .select({
          totalReserved: sql<number>`coalesce(sum(${schema.usageReservations.estimatedTokens}), 0)`,
        })
        .from(schema.usageReservations)
        .where(
          and(
            eq(schema.usageReservations.userId, params.userId),
            isNull(schema.usageReservations.settledAt),
          ),
        );

      const activeReservedTokens = Number(pendingReservations[0]?.totalReserved ?? 0);

      if (settledTokens + activeReservedTokens + params.estimatedTokens > tokenLimit) {
        throw new BadRequestException({
          code: 'QUOTA_EXCEEDED',
          message: 'Hạn mức token AI cho chu kỳ này đã vượt quá giới hạn.',
          currentUsage: settledTokens + activeReservedTokens,
          limit: tokenLimit,
        });
      }

      const reservationId = generateUuidV7();
      const reservedAt = new Date();

      await tx.insert(schema.usageReservations).values({
        id: reservationId,
        userId: params.userId,
        estimatedTokens: params.estimatedTokens,
        reservedAt,
      });

      return {
        reservationId,
        estimatedTokens: params.estimatedTokens,
        reservedAt: reservedAt.toISOString(),
      };
    });
  }

  /**
   * Atomic AI Quota Settlement (PAY-11, Acceptance 3).
   * Marks reservation settled, records actual tokens in usage_ledger, emits outbox event.
   */
  async settleAIQuota(params: AIQuotaSettleParams): Promise<{ settled: boolean; ledgerId: string }> {
    const db = this.dbClient.db;

    // Check reservation exists and not already settled
    const existing = await db
      .select()
      .from(schema.usageReservations)
      .where(eq(schema.usageReservations.id, params.reservationId))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException(`Không tìm thấy phiên giữ hạn mức ${params.reservationId}`);
    }

    const reservation = existing[0]!;
    if (reservation.settledAt) {
      // Idempotent return if already settled
      return { settled: true, ledgerId: params.reservationId };
    }

    const ledgerId = generateUuidV7();
    const now = new Date();

    // In transaction: mark reservation settled and record actual usage
    await db.transaction(async (tx: typeof db) => {
      await tx
        .update(schema.usageReservations)
        .set({ settledAt: now })
        .where(eq(schema.usageReservations.id, params.reservationId));

      let validAiRequestId: string | null = null;
      if (params.aiRequestId) {
        const aiReq = await tx
          .select({ id: schema.aiRequests.id })
          .from(schema.aiRequests)
          .where(eq(schema.aiRequests.id, params.aiRequestId))
          .limit(1);
        if (aiReq.length > 0) {
          validAiRequestId = params.aiRequestId;
        }
      }

      await tx.insert(schema.usageLedger).values({
        id: ledgerId,
        userId: reservation.userId,
        aiRequestId: validAiRequestId,
        tokensUsed: params.actualTokens,
        costMicroUsd: params.costMicroUsd,
        recordedAt: now,
      });

      // Emit outbox event if outboxService is available
      if (this.outboxService) {
        await this.outboxService.emitEvent(
          'ai.request.settled',
          params.aiRequestId || ledgerId,
          reservation.userId,
          {
            requestId: params.aiRequestId || ledgerId,
            userId: reservation.userId,
            tokensUsed: params.actualTokens,
            costMinor: Math.round(params.costMicroUsd / 100),
          },
          tx,
        );
      }
    });

    return { settled: true, ledgerId };
  }

  /**
   * Atomic AI Quota Refund / Cancellation (PAY-11, Acceptance 3).
   * Releases reservation if AI failed or timed out, ensures zero token leak and no double debit.
   */
  async refundAIQuota(reservationId: string): Promise<AIQuotaRefundResult> {
    const db = this.dbClient.db;

    const existing = await db
      .select()
      .from(schema.usageReservations)
      .where(eq(schema.usageReservations.id, reservationId))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException(`Không tìm thấy phiên giữ hạn mức ${reservationId}`);
    }

    const reservation = existing[0]!;

    if (reservation.settledAt) {
      throw new BadRequestException('Không thể hủy phiên giữ hạn mức đã được thanh toán (settled).');
    }

    // In transaction: delete reservation and emit ai.request.cancelled
    await db.transaction(async (tx: typeof db) => {
      await tx
        .delete(schema.usageReservations)
        .where(eq(schema.usageReservations.id, reservationId));

      if (this.outboxService) {
        await this.outboxService.emitEvent(
          'ai.request.cancelled',
          reservationId,
          reservation.userId,
          {
            requestId: reservationId,
            userId: reservation.userId,
          },
          tx,
        );
      }
    });

    return {
      refunded: true,
      reservationId,
    };
  }
}
