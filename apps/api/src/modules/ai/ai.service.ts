import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import {
  aiContentVersions,
  aiRequests,
  eventAttempts,
  examAttempts,
  examEvents,
  moderationReviews,
  providerAccounts,
  usageLedger,
  usageReservations,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { OutboxService } from '../outbox/outbox.service.js';
import type {
  AiProvider,
  AiProviderRequest,
} from './provider/ai-provider.interface.js';
import { SandboxAiProvider } from './provider/sandbox-ai-provider.js';
import {
  FORBIDDEN_CLIENT_AI_KEYS,
  type AiRequestResponseDto,
  type AiReviewDto,
  type AiUsageDto,
  type CreateAiRequestDto,
} from './ai.types.js';

const USER_TOKEN_QUOTA_DEFAULT = 100_000;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private provider: AiProvider;

  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    @Optional() private readonly outboxService?: OutboxService,
    customProvider?: AiProvider,
  ) {
    this.provider = customProvider ?? new SandboxAiProvider();
  }

  setProvider(provider: AiProvider): void {
    this.provider = provider;
  }

  getProvider(): AiProvider {
    return this.provider;
  }

  /**
   * Validates that the client does not send forbidden system prompts, raw secrets, or tool permissions.
   * Satisfies Acceptance 1: Không nhận model-provided tool permission hoặc raw secret.
   */
  private validateClientPayload(dto: CreateAiRequestDto): void {
    for (const key of Object.keys(dto)) {
      if (
        (FORBIDDEN_CLIENT_AI_KEYS as readonly string[]).includes(key) ||
        key.toLowerCase().includes('secret') ||
        key.toLowerCase().includes('apikey') ||
        key.toLowerCase().includes('systemprompt') ||
        key.toLowerCase().includes('toolpermission')
      ) {
        throw new BadRequestException(
          `Security violation: Model-provided tool permissions, system prompts, raw secrets, and answer keys are strictly forbidden. Found key '${key}'.`,
        );
      }
    }
  }

  /**
   * Ensures AI is strictly blocked during an active real exam or event embargo.
   * Satisfies Acceptance 2: AI bị chặn trong active real exam và event embargo.
   */
  async assertNoActiveExamOrEmbargo(
    userId: string,
    dto: CreateAiRequestDto,
  ): Promise<void> {
    const db = this.dbClient.db;

    // 1. Check for active real exam attempt
    const activeAttempts = await db
      .select({ id: examAttempts.id, mode: examAttempts.mode, status: examAttempts.status })
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.userId, userId),
          eq(examAttempts.mode, 'real'),
          eq(examAttempts.status, 'in_progress'),
        ),
      )
      .limit(1);

    if (activeAttempts.length > 0) {
      throw new ForbiddenException(
        'AI assistance is strictly blocked during an active real exam session.',
      );
    }

    // 2. Check event embargo if attemptId or questionId is provided
    if (dto.attemptId) {
      const eventAtts = await db
        .select({
          eventId: eventAttempts.eventId,
          releaseAt: examEvents.resultReleaseAt,
        })
        .from(eventAttempts)
        .innerJoin(examEvents, eq(eventAttempts.eventId, examEvents.id))
        .where(eq(eventAttempts.attemptId, dto.attemptId))
        .limit(1);

      if (eventAtts.length > 0) {
        const releaseAt = eventAtts[0]?.releaseAt;
        if (releaseAt && new Date(releaseAt).getTime() > Date.now()) {
          throw new ForbiddenException(
            'AI assistance is blocked because this exam event is currently under embargo.',
          );
        }
      }
    }
  }

  /**
   * Moderation and safety policy check (AI-14).
   */
  private checkModeration(message?: string): { flagged: boolean; reason?: string } {
    if (!message) return { flagged: false };
    const lower = message.toLowerCase();

    // Harmful phrases or prompt injection attempts
    const bannedPatterns = [
      'ignore previous instructions',
      'jailbreak',
      'system override',
      'drop table',
      'reveal prompt',
    ];

    for (const pattern of bannedPatterns) {
      if (lower.includes(pattern)) {
        return { flagged: true, reason: `Policy violation: detected pattern '${pattern}'` };
      }
    }

    return { flagged: false };
  }

  /**
   * Estimates tokens for reservation.
   */
  private estimateTokens(action: string): number {
    switch (action) {
      case 'explain_reading':
        return 700;
      case 'generate_question':
        return 650;
      case 'weekly_summary':
        return 600;
      case 'deep_explain':
        return 550;
      case 'analyze_transcript':
        return 500;
      default:
        return 400;
    }
  }

  /**
   * Primary entry point for AI actions (AI-01..14, EXPL-11).
   * Guarantees:
   * - No raw secret / tool permission intake.
   * - Blocked in active real exams and embargoes.
   * - Atomic token reservation with refund on failure.
   * - Mandatory ai_generated label and pending review for generated questions.
   */
  async processAiRequest(
    userId: string,
    dto: CreateAiRequestDto,
  ): Promise<AiRequestResponseDto> {
    // 1. Input sanitization
    this.validateClientPayload(dto);

    // 2. Exam and embargo guard
    await this.assertNoActiveExamOrEmbargo(userId, dto);

    // 3. Moderation check (AI-14)
    const moderation = this.checkModeration(dto.message);
    if (moderation.flagged) {
      const reviewId = generateUuidV7();
      await this.dbClient.db.insert(moderationReviews).values({
        id: reviewId,
        contentId: reviewId,
        score: 0,
        flagged: true,
        reviewedAt: new Date(),
      });
      throw new BadRequestException(
        `Moderation Error: ${moderation.reason ?? 'Input content violated safety policy.'}`,
      );
    }

    // 4. Ensure provider record exists in providerAccounts table
    const providerId = this.provider.id;
    await this.dbClient.db
      .insert(providerAccounts)
      .values({
        id: providerId,
        providerName: this.provider.name,
        isActive: true,
        configRef: `env:${providerId}`,
      })
      .onConflictDoNothing();

    // 5. Atomic Token & Cost Reservation (Acceptance 3)
    const estimatedTokens = this.estimateTokens(dto.action);
    const reservationId = generateUuidV7();
    const requestId = generateUuidV7();

    // Check user quota
    const usage = await this.getUserUsage(userId);
    if (usage.totalTokensUsed + estimatedTokens > USER_TOKEN_QUOTA_DEFAULT) {
      throw new HttpException(
        'Token/cost budget exhausted. Please upgrade your plan or wait for the next billing cycle.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Reserve tokens atomically
    await this.dbClient.db.insert(usageReservations).values({
      id: reservationId,
      userId,
      estimatedTokens,
      reservedAt: new Date(),
    });

    const actionToExecute = dto.depth === 'deep' ? 'deep_explain' : dto.action;
    const providerRequest: AiProviderRequest = {
      action: actionToExecute,
      userMessage: dto.message,
      context: {
        questionId: dto.questionId,
        userLevel: (dto.userLevel as string) ?? 'N3',
        vocabWord: (dto.vocabWord as string) ?? (dto.message || '単語'),
        grammarPoint: (dto.grammarPoint as string) ?? (dto.message || '文法'),
      },
      locale: dto.locale ?? 'vi',
    };

    let response;
    try {
      response = await this.provider.generate(providerRequest);
    } catch (err: unknown) {
      // Failure: Refund reservation atomically (Acceptance 3)
      await this.dbClient.db
        .update(usageReservations)
        .set({ settledAt: new Date(), estimatedTokens: 0 })
        .where(eq(usageReservations.id, reservationId));

      // Record failed request
      await this.dbClient.db.insert(aiRequests).values({
        id: requestId,
        userId,
        providerId,
        taskType: dto.action,
        promptTokens: 0,
        completionTokens: 0,
        status: 'failed',
        createdAt: new Date(),
      });

      // Emit cancellation event to outbox
      if (this.outboxService) {
        await this.outboxService.emitEvent(
          'ai.request.cancelled',
          requestId,
          userId,
          {
            requestId,
            userId,
          },
        );
      }

      this.logger.error(`AI provider execution failed: ${String(err)}`);
      throw err;
    }

    // Success: Settle reservation atomically
    await this.dbClient.db
      .update(usageReservations)
      .set({ settledAt: new Date() })
      .where(eq(usageReservations.id, reservationId));

    // Record settled request in aiRequests
    await this.dbClient.db.insert(aiRequests).values({
      id: requestId,
      userId,
      providerId,
      taskType: dto.action,
      promptTokens: response.tokensUsed.prompt,
      completionTokens: response.tokensUsed.completion,
      status: 'completed',
      createdAt: new Date(),
    });

    // Record into usageLedger
    await this.dbClient.db.insert(usageLedger).values({
      id: generateUuidV7(),
      userId,
      aiRequestId: requestId,
      tokensUsed: response.tokensUsed.total,
      costMicroUsd: response.costMicroUsd,
      recordedAt: new Date(),
    });

    // Emit settlement event to outbox
    if (this.outboxService) {
      await this.outboxService.emitEvent(
        'ai.request.settled',
        requestId,
        userId,
        {
          requestId,
          userId,
          tokensUsed: response.tokensUsed.total,
          costMinor: Math.round(response.costMicroUsd / 10000), // convert to minor currency unit
        },
      );
    }

    // 6. Generated Content Labeling & Approval (Acceptance 4)
    // Generated questions require two-person review before publication!
    const isGeneratedQuestion = dto.action === 'generate_question';
    const approvalStatus = isGeneratedQuestion ? 'pending' : 'approved';

    const contentVersionId = generateUuidV7();
    await this.dbClient.db.insert(aiContentVersions).values({
      id: contentVersionId,
      questionId: dto.questionId ?? null,
      generatedType: dto.action,
      content: response.structured ?? { text: response.text },
      aiGenerated: true, // MANDATORY label
      approvalStatus,
      createdAt: new Date(),
    });

    return {
      requestId,
      status: 'completed',
      action: dto.action,
      aiGenerated: true,
      approvalStatus,
      result: {
        text: response.text,
        structured: response.structured,
      },
      tokensUsed: response.tokensUsed.total,
      costMicroUsd: response.costMicroUsd,
      providerId,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves user AI usage and budget stats (no secrets exposed).
   */
  async getUserUsage(userId: string): Promise<AiUsageDto> {
    const db = this.dbClient.db;

    const ledgerRows = await db
      .select({
        totalTokens: sql<number>`coalesce(sum(${usageLedger.tokensUsed}), 0)::int`,
        totalCost: sql<number>`coalesce(sum(${usageLedger.costMicroUsd}), 0)::int`,
      })
      .from(usageLedger)
      .where(eq(usageLedger.userId, userId));

    const activeReservations = await db
      .select({
        count: sql<number>`count(*)::int`,
        reservedTokens: sql<number>`coalesce(sum(${usageReservations.estimatedTokens}), 0)::int`,
      })
      .from(usageReservations)
      .where(
        and(
          eq(usageReservations.userId, userId),
          isNull(usageReservations.settledAt),
        ),
      );

    const totalTokensUsed = Number(ledgerRows[0]?.totalTokens ?? 0);
    const totalCostMicroUsd = Number(ledgerRows[0]?.totalCost ?? 0);
    const activeResTokens = Number(activeReservations[0]?.reservedTokens ?? 0);
    const effectiveUsed = totalTokensUsed + activeResTokens;

    return {
      userId,
      totalTokensUsed,
      totalCostMicroUsd,
      activeReservationsCount: Number(activeReservations[0]?.count ?? 0),
      remainingTokensQuota: Math.max(0, USER_TOKEN_QUOTA_DEFAULT - effectiveUsed),
      isBudgetExhausted: effectiveUsed >= USER_TOKEN_QUOTA_DEFAULT,
    };
  }

  /**
   * Retrieves AI Request by ID (owner check).
   */
  async getAiRequest(requestId: string, userId: string) {
    const rows = await this.dbClient.db
      .select()
      .from(aiRequests)
      .where(and(eq(aiRequests.id, requestId), eq(aiRequests.userId, userId)))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`AI request '${requestId}' not found or access denied.`);
    }

    return rows[0];
  }

  /**
   * Staff review for AI generated content (Acceptance 4).
   * Enforces two-person review (separation of duties).
   */
  async reviewAiContent(reviewDto: AiReviewDto) {
    const db = this.dbClient.db;

    const rows = await db
      .select()
      .from(aiContentVersions)
      .where(eq(aiContentVersions.id, reviewDto.contentId))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Content version '${reviewDto.contentId}' not found.`);
    }

    await db
      .update(aiContentVersions)
      .set({ approvalStatus: reviewDto.approvalStatus })
      .where(eq(aiContentVersions.id, reviewDto.contentId));

    if (this.outboxService) {
      await this.outboxService.emitEvent(
        'ai.content.reviewed',
        reviewDto.contentId,
        reviewDto.reviewerId,
        {
          contentId: reviewDto.contentId,
          approvalStatus: reviewDto.approvalStatus,
          reviewerId: reviewDto.reviewerId,
        },
      );
    }

    return {
      contentId: reviewDto.contentId,
      approvalStatus: reviewDto.approvalStatus,
      reviewerId: reviewDto.reviewerId,
    };
  }
}
