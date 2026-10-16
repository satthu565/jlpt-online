export type AiAction =
  | 'explain_question'
  | 'analyze_grammar'
  | 'compare_options'
  | 'explain_reading'
  | 'analyze_transcript'
  | 'ask_context'
  | 'memory_hint'
  | 'grammar_example'
  | 'detect_repeated_errors'
  | 'recommend_practice'
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
