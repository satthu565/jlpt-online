export const FORBIDDEN_CLIENT_AI_KEYS = [
  'systemPrompt',
  'system_prompt',
  'prompt',
  'providerKey',
  'provider_key',
  'apiKey',
  'api_key',
  'rawSecret',
  'raw_secret',
  'secret',
  'toolPermissions',
  'tool_permissions',
  'tools',
  'answerKey',
  'answer_key',
  'keys',
  'correctAnswer',
  'correct_answer',
] as const;

export type AiAction =
  | 'explain_question'
  | 'analyze_grammar'
  | 'compare_options'
  | 'explain_reading'
  | 'analyze_transcript'
  | 'ask_context'
  | 'memory_hint'
  | 'grammar_example'
  | 'generate_question'
  | 'detect_repeated_errors'
  | 'recommend_practice'
  | 'weekly_summary'
  | 'generate_flashcards'
  | 'moderate_content'
  | 'deep_explain';

export interface CreateAiRequestDto {
  action: AiAction;
  questionId?: string;
  attemptId?: string;
  notebookId?: string;
  message?: string;
  locale?: string;
  depth?: 'standard' | 'deep';
  [key: string]: unknown;
}

export interface AiRequestResponseDto {
  requestId: string;
  status: 'completed' | 'queued' | 'failed' | 'cancelled';
  action: string;
  aiGenerated: true;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  result?: {
    text: string;
    structured?: Record<string, unknown>;
  };
  tokensUsed: number;
  costMicroUsd: number;
  providerId: string;
  createdAt: string;
}

export interface AiUsageDto {
  userId: string;
  totalTokensUsed: number;
  totalCostMicroUsd: number;
  activeReservationsCount: number;
  remainingTokensQuota: number;
  isBudgetExhausted: boolean;
}

export interface AiReviewDto {
  contentId: string;
  approvalStatus: 'approved' | 'rejected';
  reviewerId: string;
  reviewNotes?: string;
}
