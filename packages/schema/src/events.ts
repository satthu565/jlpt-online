import { z } from 'zod';
import { EventTopicSchema, type EventTopic } from './enums.js';

export const BaseEventPayloadSchema = z.record(z.string(), z.unknown());

export const ContentImportRequestedPayloadSchema = z.object({
  importJobId: z.string().uuid(),
  packageHash: z.string(),
  sourceRef: z.string().optional(),
});

export const ContentImportCompletedPayloadSchema = z.object({
  importJobId: z.string().uuid(),
  revision: z.number().int().nonnegative(),
  groupsCount: z.number().int().nonnegative(),
  questionsCount: z.number().int().nonnegative(),
});

export const ContentImportFailedPayloadSchema = z.object({
  importJobId: z.string().uuid(),
  errorCode: z.string(),
  message: z.string(),
});

export const ContentApprovedPayloadSchema = z.object({
  resourceType: z.enum(['group', 'explanation', 'blueprint', 'exam']),
  resourceId: z.string().uuid(),
  version: z.number().int().positive(),
  reviewerId: z.string().uuid(),
});

export const ContentPublishedPayloadSchema = z.object({
  examId: z.string().uuid(),
  version: z.number().int().positive(),
  publisherId: z.string().uuid(),
});

export const ContentTakenDownPayloadSchema = z.object({
  examId: z.string().uuid(),
  version: z.number().int().positive(),
  reason: z.string(),
});

export const AttemptSubmittedPayloadSchema = z.object({
  attemptId: z.string().uuid(),
  examId: z.string().uuid(),
  examVersion: z.number().int().positive(),
  userId: z.string().uuid().nullable().optional(),
  score: z.number().nonnegative(),
  passed: z.boolean(),
});

export const LearningCardReviewedPayloadSchema = z.object({
  clientReviewId: z.string().uuid(),
  cardId: z.string().uuid(),
  userId: z.string().uuid(),
  rating: z.enum(['again', 'hard', 'good', 'easy']),
  nextDueAt: z.string().datetime(),
});

export const StudySessionCompletedPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  planId: z.string().uuid(),
  userId: z.string().uuid(),
  durationMs: z.number().int().nonnegative(),
});

export const StudySessionMissedPayloadSchema = z.object({
  sessionId: z.string().uuid(),
  planId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const PaymentCapturedPayloadSchema = z.object({
  orderId: z.string().uuid(),
  provider: z.string(),
  paymentAttemptId: z.string(),
  amountMinor: z.number().int().nonnegative(),
  currency: z.string(),
  userId: z.string().uuid(),
});

export const PaymentRefundedPayloadSchema = z.object({
  refundId: z.string().uuid(),
  orderId: z.string().uuid(),
  amountMinor: z.number().int().nonnegative(),
  currency: z.string(),
});

export const PaymentFailedPayloadSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string(),
});

export const SubscriptionChangedPayloadSchema = z.object({
  subscriptionId: z.string().uuid(),
  userId: z.string().uuid(),
  planId: z.string(),
  status: z.string(),
  expiresAt: z.string().datetime().optional(),
});

export const AIRequestSettledPayloadSchema = z.object({
  requestId: z.string().uuid(),
  userId: z.string().uuid(),
  tokensUsed: z.number().int().nonnegative(),
  costMinor: z.number().int().nonnegative(),
});

export const AIRequestCancelledPayloadSchema = z.object({
  requestId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const FORBIDDEN_EVENT_ANSWER_FIELDS = [
  'correct',
  'correctOption',
  'isCorrect',
  'answer',
  'answers',
  'answerKey',
  'keys',
  'explanation',
  'explanations',
  'rawAnswer',
] as const;

export const FORBIDDEN_EVENT_PII_FIELDS = [
  'email',
  'password',
  'passwd',
  'secret',
  'bearerToken',
  'authToken',
  'phone',
  'phoneNumber',
  'bankAccount',
  'creditCard',
  'cardNumber',
] as const;

const EMAIL_PATTERN = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/;
const BEARER_PATTERN = /^Bearer\s+/i;

/**
 * Asserts that an event envelope or payload does not leak exam answers or user PII.
 * Satisfies Acceptance 3: Public events không chứa answers hay PII.
 */
export function assertNoEventLeak(data: unknown, path = ''): void {
  if (data === null || data === undefined) return;

  if (Array.isArray(data)) {
    data.forEach((item, index) => assertNoEventLeak(item, `${path}[${index}]`));
    return;
  }

  if (typeof data === 'string') {
    if (EMAIL_PATTERN.test(data.trim())) {
      throw new Error(
        `Security violation: plain email PII detected at path "${path}" in event envelope/payload`,
      );
    }
    if (BEARER_PATTERN.test(data.trim())) {
      throw new Error(
        `Security violation: bearer token secret detected at path "${path}" in event envelope/payload`,
      );
    }
    return;
  }

  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of Object.keys(obj)) {
      const lower = key.toLowerCase();
      for (const forbidden of FORBIDDEN_EVENT_ANSWER_FIELDS) {
        if (lower === forbidden.toLowerCase()) {
          throw new Error(
            `Security violation: forbidden answer field "${key}" detected at path "${path ? path + '.' + key : key}" in event envelope/payload`,
          );
        }
      }
      for (const forbidden of FORBIDDEN_EVENT_PII_FIELDS) {
        if (lower === forbidden.toLowerCase()) {
          throw new Error(
            `Security violation: forbidden PII field "${key}" detected at path "${path ? path + '.' + key : key}" in event envelope/payload`,
          );
        }
      }
      assertNoEventLeak(obj[key], path ? `${path}.${key}` : key);
    }
  }
}

export const AIContentReviewedPayloadSchema = z.object({
  contentId: z.string().uuid(),
  decision: z.enum(['approve', 'reject']),
  reviewerId: z.string().uuid(),
  aiGenerated: z.boolean().default(true),
  contentType: z.enum(['explanation', 'hint', 'translation', 'flashcard', 'question']).optional(),
});

export const AssignmentCreatedPayloadSchema = z.object({
  assignmentId: z.string().uuid(),
  classId: z.string().uuid(),
  examId: z.string().uuid().optional(),
  dueAt: z.string().datetime(),
});

export const AssignmentCompletedPayloadSchema = z.object({
  assignmentId: z.string().uuid(),
  classId: z.string().uuid(),
  learnerId: z.string().uuid(),
  attemptId: z.string().uuid(),
});

export const ExamEventResultsReleasedPayloadSchema = z.object({
  eventId: z.string().uuid(),
  examId: z.string().uuid(),
  participantsCount: z.number().int().nonnegative(),
  releasedAt: z.string().datetime(),
});

export const PrivacyConsentChangedPayloadSchema = z.object({
  userId: z.string().uuid(),
  purpose: z.string(),
  granted: z.boolean(),
  policyVersion: z.string(),
  withdrawnAt: z.string().datetime().optional(),
});

export const PrivacyDeletionRequestedPayloadSchema = z.object({
  userId: z.string().uuid(),
  deletionRequestId: z.string().uuid(),
  requestedAt: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const ExperimentExposedPayloadSchema = z.object({
  experimentId: z.string(),
  variant: z.string(),
  subjectId: z.string(),
});

export const EventEnvelopeSchema = z
  .object({
    eventId: z.string().uuid(),
    schemaVersion: z.literal(1),
    topic: EventTopicSchema,
    occurredAt: z.string().datetime(),
    actorId: z.string(),
    tenantId: z.string().uuid().nullable().default(null),
    aggregateId: z.string().uuid(),
    aggregateVersion: z.number().int().positive().default(1),
    correlationId: z.string(),
    payload: BaseEventPayloadSchema,
  })
  .superRefine((data, ctx) => {
    try {
      assertNoEventLeak(data);
    } catch (err: unknown) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  });
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export function createEventEnvelope<T extends Record<string, unknown>>(
  topic: EventTopic,
  aggregateId: string,
  actorId: string,
  payload: T,
  options?: {
    eventId?: string;
    occurredAt?: string;
    tenantId?: string | null;
    aggregateVersion?: number;
    correlationId?: string;
  },
): EventEnvelope {
  const envelope: EventEnvelope = {
    eventId: options?.eventId ?? crypto.randomUUID(),
    schemaVersion: 1,
    topic,
    occurredAt: options?.occurredAt ?? new Date().toISOString(),
    actorId,
    tenantId: options?.tenantId ?? null,
    aggregateId,
    aggregateVersion: options?.aggregateVersion ?? 1,
    correlationId: options?.correlationId ?? `req_${Date.now()}`,
    payload,
  };
  assertNoEventLeak(envelope);
  return envelope;
}

