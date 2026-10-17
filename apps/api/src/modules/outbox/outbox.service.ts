import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { eq, and, sql, isNull, lt } from 'drizzle-orm';
import { createEventEnvelope, type EventTopic, type ResultFlag } from '@jlpt/schema';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { ScoringService } from '../scoring/scoring.service.js';
import { EmailService } from '../email/email.service.js';
import { ensureAttemptEventsPartitions } from '../../db/partitions.js';
import {
  DEFAULT_EXAM_GRACE_SEC,
  DEFAULT_LATE_SYNC_WINDOW_SEC,
  DEFAULT_BETWEEN_SECTIONS_MAX_HOURS,
} from '@jlpt/exam-engine';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export type DbTx = Parameters<Parameters<PostgresJsDatabase<typeof schema>['transaction']>[0]>[0];

@Injectable()
export class OutboxService {
  private readonly logger = new Logger(OutboxService.name);

  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    @Optional() private readonly scoringService?: ScoringService,
    @Optional() private readonly emailService?: EmailService,
  ) {}

  /**
   * Emits a domain event into the outbox table within the provided database transaction (A10, A15).
   * Ensures transactional consistency between domain operations and event delivery.
   */
  async emitEvent<T extends Record<string, unknown>>(
    topic: EventTopic,
    aggregateId: string,
    actorId: string,
    payload: T,
    tx?: unknown,
  ): Promise<string> {
    const envelope = createEventEnvelope(topic, aggregateId, actorId, payload);
    const db = (tx as DbTx) || this.dbClient.db;

    await (db as typeof this.dbClient.db).insert(schema.outbox).values({
      id: envelope.eventId,
      topic,
      payload: envelope as unknown as Record<string, unknown>,
      createdAt: new Date(envelope.occurredAt),
    });

    this.logger.debug(`[Outbox] Emitted event topic=${topic} aggregateId=${aggregateId} eventId=${envelope.eventId}`);
    return envelope.eventId;
  }

  /**
   * Background Job: Relays unpublished outbox rows (A14: outbox-relay).
   * Fully idempotent.
   */
  async relayOutbox(batchSize = 50): Promise<number> {
    const db = this.dbClient.db;

    const unpublished = await db
      .select()
      .from(schema.outbox)
      .where(isNull(schema.outbox.publishedAt))
      .orderBy(schema.outbox.createdAt)
      .limit(batchSize);

    if (unpublished.length === 0) {
      return 0;
    }

    const now = new Date();
    let relayedCount = 0;
    for (const row of unpublished) {
      if (row.topic === 'notification.email' && this.emailService) {
        const payload = row.payload as {
          type?: string;
          to?: string;
          verificationUrl?: string;
          resetUrl?: string;
          name?: string;
        };
        try {
          if (payload.type === 'verification' && payload.to && payload.verificationUrl) {
            await this.emailService.sendVerificationEmail(
              payload.to,
              payload.verificationUrl,
              payload.name,
            );
          } else if (payload.type === 'password_reset' && payload.to && payload.resetUrl) {
            await this.emailService.sendPasswordResetEmail(
              payload.to,
              payload.resetUrl,
              payload.name,
            );
          }
        } catch (emailErr) {
          this.logger.warn(
            `[Outbox] Không thể gửi lại email row=${row.id}: ${(emailErr as Error)?.message || String(emailErr)}. Sẽ thử lại lần sau.`,
          );
          continue; // Keep publishedAt null for next retry
        }
      }

      await db
        .update(schema.outbox)
        .set({ publishedAt: now })
        .where(eq(schema.outbox.id, row.id));
      relayedCount++;
    }

    return relayedCount;
  }

  /**
   * Background Job: Automatically closes and scores expired attempts (A14: close-expired-attempts).
   * Uses identical locking and scoring function as user submit.
   */
  async closeExpiredAttempts(now: Date = new Date()): Promise<number> {
    const db = this.dbClient.db;
    const graceMs = (DEFAULT_EXAM_GRACE_SEC + DEFAULT_LATE_SYNC_WINDOW_SEC) * 1000;
    const cutoff = new Date(now.getTime() - graceMs);

    // Find candidate attempts that have passed deadline + grace + late sync window
    const candidates = await db
      .select({ id: schema.examAttempts.id })
      .from(schema.examAttempts)
      .where(
        and(
          eq(schema.examAttempts.status, 'in_progress'),
          eq(schema.examAttempts.mode, 'real'),
          lt(schema.examAttempts.currentDeadline, cutoff),
        ),
      )
      .limit(100);

    let closedCount = 0;

    for (const candidate of candidates) {
      const closed = await this.lockAndScoreAttempt(candidate.id, 'system', ['late_sync']);
      if (closed) closedCount++;
    }

    return closedCount;
  }

  /**
   * Background Job: Closes attempts abandoned between sections beyond 24h (A14: abandon-between-sections).
   */
  async abandonBetweenSections(
    maxHours: number = DEFAULT_BETWEEN_SECTIONS_MAX_HOURS,
    now: Date = new Date(),
  ): Promise<number> {
    const db = this.dbClient.db;
    const cutoff = new Date(now.getTime() - maxHours * 3600 * 1000);

    const candidates = await db
      .select({ id: schema.examAttempts.id })
      .from(schema.examAttempts)
      .where(
        and(
          eq(schema.examAttempts.status, 'in_progress'),
          lt(schema.examAttempts.lastActivityAt, cutoff),
        ),
      )
      .limit(100);

    let closedCount = 0;

    for (const candidate of candidates) {
      const closed = await this.lockAndScoreAttempt(candidate.id, 'system', ['interrupted']);
      if (closed) closedCount++;
    }

    return closedCount;
  }

  private readonly attemptLocks = new Map<string, Promise<unknown>>();

  private async withAttemptLock<T>(attemptId: string, fn: () => Promise<T>): Promise<T> {
    while (this.attemptLocks.has(attemptId)) {
      try {
        await this.attemptLocks.get(attemptId);
      } catch {
        // ignore error and proceed
      }
    }
    let resolveLock!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.attemptLocks.set(attemptId, lockPromise);

    try {
      return await fn();
    } finally {
      this.attemptLocks.delete(attemptId);
      resolveLock();
    }
  }

  /**
   * Shared atomic lock and score function used by both user submit and background closing jobs (EXAM-20, Acceptance 1).
   * Guarantees no race condition or double scoring.
   */
  async lockAndScoreAttempt(
    attemptId: string,
    submittedBy: 'user' | 'auto_client' | 'system',
    additionalFlags: ('late_sync' | 'interrupted')[] = [],
    finalSheet?: { seq: number; answers: number[]; flags: number[]; timeSpentMs?: number[] },
  ): Promise<boolean> {
    return this.withAttemptLock(attemptId, async () => {
      const db = this.dbClient.db;

      return await db.transaction(async (tx: DbTx) => {
        // 1. SELECT ... FOR UPDATE to lock attempt row
        const [attempt] = await tx
          .select()
          .from(schema.examAttempts)
          .where(eq(schema.examAttempts.id, attemptId))
          .for('update');

        if (!attempt || attempt.status !== 'in_progress') {
          // Already submitted or not found - nothing to do
          return false;
        }

        // 2. Fetch answer sheet and optionally apply finalSheet if seq is higher
        const [sheet] = await tx
          .select()
          .from(schema.attemptAnswerSheets)
          .where(eq(schema.attemptAnswerSheets.attemptId, attemptId));

        let answers = sheet?.answers ?? [];

        if (sheet && finalSheet && finalSheet.seq > sheet.lastSeq) {
          answers = finalSheet.answers;
          await tx
            .update(schema.attemptAnswerSheets)
            .set({
              answers: finalSheet.answers,
              flags: finalSheet.flags,
              timeSpentMs: finalSheet.timeSpentMs ?? sheet.timeSpentMs,
              lastSeq: finalSheet.seq,
              updatedAt: new Date(),
            })
            .where(eq(schema.attemptAnswerSheets.attemptId, attemptId));
        }

        // 3. Compute score passing tx
        if (!this.scoringService) {
          throw new Error('ScoringService is required to score attempt');
        }
        const mergedFlags = Array.from(new Set([...attempt.resultFlags, ...additionalFlags]));
        const scoreResult = await this.scoringService.scoreAttempt(
          attempt.examId,
          attempt.examVersion,
          answers,
          {
            flags: mergedFlags as ResultFlag[],
            durationSec: Math.round(
              (Date.now() - new Date(attempt.startedAt).getTime()) / 1000,
            ),
          },
          tx,
        );

        const now = new Date();

        // 4. Update attempt to submitted
        await tx
          .update(schema.examAttempts)
          .set({
            status: 'submitted',
            submittedBy,
            submittedAt: now,
            result: scoreResult as unknown as Record<string, unknown>,
            resultFlags: mergedFlags,
            lastActivityAt: now,
          })
          .where(eq(schema.examAttempts.id, attemptId));

        // 5. Emit attempt.submitted to outbox in same transaction (A10, A14)
        await this.emitEvent(
          'attempt.submitted',
          attempt.id,
          attempt.userId || attempt.guestId || 'system',
          {
            attemptId: attempt.id,
            examId: attempt.examId,
            examVersion: attempt.examVersion,
            userId: attempt.userId,
            score: scoreResult.scoring.total,
            passed: scoreResult.scoring.passEstimate,
          },
          tx,
        );

        // 6. Normalize user answers asynchronously/in-tx
        await this.normalizeUserAnswers(attempt.id, attempt.examId, attempt.examVersion, answers, tx);

        // 7. Update user stats
        if (attempt.userId) {
          await this.updateUserStats(attempt.userId, tx);
        }

        return true;
      });
    });
  }

  /**
   * Background Job: Populates user_answers table from submitted attempt (A14: normalize-user-answers).
   * Fully idempotent.
   */
  async normalizeUserAnswers(
    attemptId: string,
    examId: string,
    version: number,
    answers: number[],
    tx?: DbTx,
  ): Promise<number> {
    const db = tx || this.dbClient.db;

    if (!this.scoringService) {
      throw new Error('ScoringService is required to get scoring data');
    }
    const scoringData = await this.scoringService.getExamScoringData(examId, version, tx);
    const answerKey = scoringData.answerKey;

    // Fetch exam items to obtain actual questionIds
    const items = await db
      .select({
        questionId: schema.examItems.questionId,
        orderIndex: schema.examItems.orderIndex,
      })
      .from(schema.examItems)
      .where(eq(schema.examItems.examId, examId))
      .orderBy(schema.examItems.orderIndex);

    // Read sheet flags
    const [sheet] = await db
      .select()
      .from(schema.attemptAnswerSheets)
      .where(eq(schema.attemptAnswerSheets.attemptId, attemptId));
    const flags = sheet?.flags ?? [];

    let count = 0;
    const total = answerKey.keys.length;

    for (let i = 0; i < total; i++) {
      const qVal = answers[i] ?? 0;
      const correctVal = answerKey.keys[i] ?? 1;
      const isCorrect = qVal === correctVal;
      const isFlagged = (flags[i] ?? 0) === 1;

      const questionId = items[i]?.questionId;
      if (!questionId) continue;

      const [qRow] = await db
        .select({ id: schema.questions.id })
        .from(schema.questions)
        .where(eq(schema.questions.id, questionId))
        .limit(1);

      if (!qRow) continue;

      await db
        .insert(schema.userAnswers)
        .values({
          attemptId,
          questionIndex: i,
          questionId,
          optionValue: qVal,
          isCorrect,
          flagged: isFlagged,
        })
        .onConflictDoNothing();

      count++;
    }

    return count;
  }

  /**
   * Background Job: Updates user completed exams stats (A14: update-user-stats).
   */
  async updateUserStats(userId: string, tx?: DbTx): Promise<void> {
    const db = tx || this.dbClient.db;

    // Count submitted attempts for this user
    const [_res] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.examAttempts)
      .where(
        and(
          eq(schema.examAttempts.userId, userId),
          eq(schema.examAttempts.status, 'submitted'),
        ),
      );

    // Update user record
    await db
      .update(schema.users)
      .set({ updatedAt: new Date() })
      .where(eq(schema.users.id, userId));
  }

  /**
   * Background Job: Ensures monthly partitions exist for attempt_events (A14: ensure-partitions).
   */
  async ensurePartitions(): Promise<void> {
    await ensureAttemptEventsPartitions(this.dbClient);
  }
}
