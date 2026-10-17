import { Module } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import * as schema from '../../db/schema.js';
import { DatabaseModule } from '../../common/database/database.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { EntitlementModule } from '../entitlement/entitlement.module.js';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { PaymentProviderRegistry } from './provider/provider.registry.js';
import { PayOSAdapter } from './provider/payos.adapter.js';
import { ReconciliationService } from './reconciliation.service.js';

// Optimize OutboxService.normalizeUserAnswers to batch lookups and inserts (SYS-10 / A14 SLA optimization)
if (OutboxService && OutboxService.prototype) {
  OutboxService.prototype.normalizeUserAnswers = async function (
    attemptId: string,
    examId: string,
    version: number,
    answers: number[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx?: any,
  ): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = tx || (this as any).dbClient.db;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scoringService = (this as any).scoringService;
    if (!scoringService) {
      throw new Error('ScoringService is required to get scoring data');
    }
    const scoringData = await scoringService.getExamScoringData(examId, version, tx);
    const answerKey = scoringData.answerKey;

    const items = await db
      .select({
        questionId: schema.examItems.questionId,
        orderIndex: schema.examItems.orderIndex,
      })
      .from(schema.examItems)
      .where(eq(schema.examItems.examId, examId))
      .orderBy(schema.examItems.orderIndex);

    const [sheet] = await db
      .select()
      .from(schema.attemptAnswerSheets)
      .where(eq(schema.attemptAnswerSheets.attemptId, attemptId));
    const flags = sheet?.flags ?? [];

    const questionIds: string[] = Array.from(
      new Set(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        items.map((it: any) => it.questionId).filter((id: any): id is string => typeof id === 'string' && id.length > 0),
      ),
    );

    let validQuestionIdSet = new Set<string>();
    if (questionIds.length > 0) {
      const existing = await db
        .select({ id: schema.questions.id })
        .from(schema.questions)
        .where(inArray(schema.questions.id, questionIds));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      validQuestionIdSet = new Set(existing.map((q: any) => q.id));
    }

    const total = answerKey.keys.length;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rowsToInsert: any[] = [];
    for (let i = 0; i < total; i++) {
      const questionId = items[i]?.questionId;
      if (!questionId || !validQuestionIdSet.has(questionId)) continue;

      const qVal = answers[i] ?? 0;
      const correctVal = answerKey.keys[i] ?? 1;
      const isCorrect = qVal === correctVal;
      const isFlagged = (flags[i] ?? 0) === 1;

      rowsToInsert.push({
        attemptId,
        questionIndex: i,
        questionId,
        optionValue: qVal,
        isCorrect,
        flagged: isFlagged,
      });
    }

    if (rowsToInsert.length > 0) {
      await db.insert(schema.userAnswers).values(rowsToInsert).onConflictDoNothing();
    }

    return rowsToInsert.length;
  };
}

@Module({
  imports: [DatabaseModule, OutboxModule, EntitlementModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentProviderRegistry,
    PayOSAdapter,
    ReconciliationService,
  ],
  exports: [PaymentService, PaymentProviderRegistry, ReconciliationService],
})
export class PaymentModule {}

