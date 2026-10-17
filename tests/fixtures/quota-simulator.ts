import { eq, and, sql, isNull } from 'drizzle-orm';
import type { DbClientInstance } from '../../apps/api/src/db/client.js';
import * as schema from '../../apps/api/src/db/schema.js';
import { generateUuidV7 } from '../../apps/api/src/common/utils/uuid.js';
import type { OutboxService, DbTx } from '../../apps/api/src/modules/outbox/outbox.service.js';

export class QuotaExceededError extends Error {
  status: number;
  constructor(message = 'Token/cost budget exhausted. Please upgrade your plan or wait for the next cycle.') {
    super(message);
    this.name = 'QuotaExceededError';
    this.status = 429;
  }
}

export class QuotaSimulatorHelper {
  constructor(
    private readonly dbClient: DbClientInstance,
    private readonly outboxService?: OutboxService,
  ) {}

  /**
   * Simulates atomic token reservation under high concurrency using database transaction locking.
   */
  async reserveTokensAtomically(
    userId: string,
    tokens: number,
    budget: number,
  ): Promise<{ reservationId: string }> {
    return await this.dbClient.db.transaction(async (tx: DbTx) => {
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

  /**
   * Settles an active token reservation into usageLedger and emits domain outbox event.
   */
  async settleReservation(
    userId: string,
    reservationId: string,
    estimatedTokens: number,
    options: {
      providerId?: string;
      taskType?: string;
      promptTokens?: number;
      completionTokens?: number;
      costMicroUsd?: number;
    } = {},
  ): Promise<{ requestId: string }> {
    const requestId = generateUuidV7();
    await this.dbClient.db.transaction(async (tx: DbTx) => {
      // Mark reservation settled
      await tx
        .update(schema.usageReservations)
        .set({ settledAt: new Date() })
        .where(eq(schema.usageReservations.id, reservationId));

      // Insert into aiRequests
      await tx.insert(schema.aiRequests).values({
        id: requestId,
        userId,
        providerId: options.providerId || 'provider_sandbox_sim',
        taskType: options.taskType || 'explain_question',
        promptTokens: options.promptTokens || 100,
        completionTokens: options.completionTokens || 150,
        status: 'completed',
      });

      // Insert into usageLedger
      await tx.insert(schema.usageLedger).values({
        id: generateUuidV7(),
        userId,
        aiRequestId: requestId,
        tokensUsed: estimatedTokens,
        costMicroUsd: options.costMicroUsd || 500,
        recordedAt: new Date(),
      });

      // Emit outbox event
      if (this.outboxService) {
        await this.outboxService.emitEvent(
          'ai.request.settled',
          requestId,
          userId,
          {
            requestId,
            userId,
            tokensUsed: estimatedTokens,
            costMinor: 1,
          },
          tx,
        );
      }
    });

    return { requestId };
  }

  /**
   * Cancels/refunds an active token reservation and emits cancellation outbox event.
   */
  async cancelReservation(
    userId: string,
    reservationId: string,
  ): Promise<{ requestId: string }> {
    const requestId = generateUuidV7();
    await this.dbClient.db.transaction(async (tx: DbTx) => {
      // Cancel reservation by setting settledAt and estimatedTokens = 0
      await tx
        .update(schema.usageReservations)
        .set({ settledAt: new Date(), estimatedTokens: 0 })
        .where(eq(schema.usageReservations.id, reservationId));

      // Emit cancellation outbox event
      if (this.outboxService) {
        await this.outboxService.emitEvent(
          'ai.request.cancelled',
          requestId,
          userId,
          {
            requestId,
            userId,
          },
          tx,
        );
      }
    });

    return { requestId };
  }
}
