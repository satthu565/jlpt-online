import { z } from 'zod';

export const LevelSchema = z.enum(['N1', 'N2', 'N3', 'N4', 'N5']);
export type Level = z.infer<typeof LevelSchema>;

export const SessionSchema = z.enum(['7', '12']);
export type Session = z.infer<typeof SessionSchema>;

export const ExamKindSchema = z.enum(['original', 'practice', 'mixed', 'custom']);
export type ExamKind = z.infer<typeof ExamKindSchema>;

export const QuestionOriginSchema = z.enum([
  'official_past_exam',
  'self_authored',
  'third_party',
  'ai_generated',
]);
export type QuestionOrigin = z.infer<typeof QuestionOriginSchema>;

export const ReviewStatusSchema = z.enum([
  'draft',
  'in_review',
  'approved',
  'rejected',
  'hidden',
]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const AttemptModeSchema = z.enum(['real', 'practice']);
export type AttemptMode = z.infer<typeof AttemptModeSchema>;

export const AttemptStatusSchema = z.enum(['in_progress', 'submitted']);
export type AttemptStatus = z.infer<typeof AttemptStatusSchema>;

export const SubmittedBySchema = z.enum(['user', 'auto_client', 'system']);
export type SubmittedBy = z.infer<typeof SubmittedBySchema>;

export const ResultFlagSchema = z.enum(['late_sync', 'interrupted']);
export type ResultFlag = z.infer<typeof ResultFlagSchema>;

export const SkillSchema = z.enum(['kanji', 'vocabulary', 'grammar', 'reading', 'listening']);
export type Skill = z.infer<typeof SkillSchema>;

export const RoleSchema = z.enum([
  'admin',
  'editor',
  'reviewer',
  'moderator',
  'billing_admin',
  'student',
]);
export type Role = z.infer<typeof RoleSchema>;

export const OrgRoleSchema = z.enum(['org_manager', 'teacher']);
export type OrgRole = z.infer<typeof OrgRoleSchema>;

export const SectionCodeSchema = z.enum([
  'language_vocab',
  'language_reading',
  'language_grammar_reading',
  'listening',
]);
export type SectionCode = z.infer<typeof SectionCodeSchema>;

export const MondaiTypeSchema = z.enum([
  'kanji_reading',
  'orthography',
  'word_formation',
  'contextual',
  'paraphrase',
  'usage',
  'grammar_form',
  'sentence_composition',
  'text_grammar',
  'comprehension_short',
  'comprehension_mid',
  'comprehension_long',
  'integrated_reading',
  'thematic',
  'info_retrieval',
  'task_based',
  'point',
  'summary',
  'utterance',
  'quick_response',
  'integrated_listening',
]);
export type MondaiType = z.infer<typeof MondaiTypeSchema>;

export const AttemptEventTypeSchema = z.enum([
  'answers',
  'section_start',
  'section_lock',
  'submit',
  'resume',
  'offline',
  'online',
  'audio_error',
  'late_sync',
]);
export type AttemptEventType = z.infer<typeof AttemptEventTypeSchema>;

export const ErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'TURNSTILE_FAILED',
  'UNAUTHENTICATED',
  'EMAIL_NOT_VERIFIED',
  'FORBIDDEN',
  'TWO_FACTOR_REQUIRED',
  'NOT_FOUND',
  'ATTEMPT_ALREADY_OPEN',
  'LEASE_INVALID',
  'ATTEMPT_CLOSED',
  'ATTEMPT_NOT_SUBMITTED',
  'SECTION_NOT_STARTED',
  'NO_MORE_SECTIONS',
  'DEADLINE_PASSED',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'POOL_SHORTAGE',
  'LICENSE_DENIED',
  'ENTITLEMENT_REQUIRED',
  'TENANT_FORBIDDEN',
  'VERSION_CONFLICT',
  'IDEMPOTENCY_CONFLICT',
  'EVENT_NOT_STARTED',
  'RESULTS_EMBARGOED',
  'QUOTA_EXHAUSTED',
  'PROVIDER_UNAVAILABLE',
  'CONTENT_REVIEW_REQUIRED',
  'INSUFFICIENT_DATA',
]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

export const EventTopicSchema = z.enum([
  'content.import.requested',
  'content.import.completed',
  'content.import.failed',
  'content.approved',
  'content.published',
  'content.taken_down',
  'attempt.submitted',
  'learning.card.reviewed',
  'study.session.completed',
  'study.session.missed',
  'payment.captured',
  'payment.refunded',
  'payment.failed',
  'subscription.changed',
  'ai.request.settled',
  'ai.request.cancelled',
  'ai.content.reviewed',
  'assignment.created',
  'assignment.completed',
  'exam_event.results_released',
  'privacy.consent.changed',
  'privacy.deletion.requested',
  'experiment.exposed',
]);
export type EventTopic = z.infer<typeof EventTopicSchema>;

export const AIActionSchema = z.enum([
  'explain_question',
  'analyze_grammar',
  'compare_options',
  'explain_reading',
  'analyze_transcript',
  'ask_context',
  'memory_hint',
  'grammar_example',
  'generate_question',
  'detect_repeated_errors',
  'recommend_practice',
  'weekly_summary',
  'generate_flashcards',
]);
export type AIAction = z.infer<typeof AIActionSchema>;

export const PaymentTermSchema = z.enum(['month', 'quarter', 'year']);
export type PaymentTerm = z.infer<typeof PaymentTermSchema>;

export const ExportKindSchema = z.enum(['PDF', 'CSV', 'XLSX', 'JSON']);
export type ExportKind = z.infer<typeof ExportKindSchema>;

export const AsyncJobStatusSchema = z.enum([
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
]);
export type AsyncJobStatus = z.infer<typeof AsyncJobStatusSchema>;

export const MixModeSchema = z.enum([
  'Random',
  'Balanced',
  'Weakness',
  'Unseen',
  'Challenge',
  'Revision',
  'Custom',
]);
export type MixMode = z.infer<typeof MixModeSchema>;

export const PracticePoolSchema = z.enum([
  'wrong',
  'unseen',
  'marked',
  'random',
  'tagged',
  'difficulty',
]);
export type PracticePool = z.infer<typeof PracticePoolSchema>;

export const FSRSRatingSchema = z.enum(['again', 'hard', 'good', 'easy']);
export type FSRSRating = z.infer<typeof FSRSRatingSchema>;
