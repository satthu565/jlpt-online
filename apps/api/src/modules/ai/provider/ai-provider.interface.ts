export interface AiProviderRequest {
  action: string;
  userMessage?: string;
  context?: {
    questionId?: string;
    questionText?: string;
    options?: string[];
    correctAnswer?: number;
    passage?: string;
    transcript?: string;
    grammarPoint?: string;
    vocabWord?: string;
    userLevel?: string;
    history?: Array<{ questionId: string; wasCorrect: boolean; skill?: string }>;
  };
  locale?: string;
}

export interface AiProviderResponse {
  text: string;
  structured?: Record<string, unknown>;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  costMicroUsd: number;
  model: string;
  finishReason: 'stop' | 'length' | 'moderation_flagged';
  moderationScore?: number;
}

export interface AiProvider {
  readonly id: string;
  readonly name: string;
  isAvailable(): Promise<boolean>;
  generate(request: AiProviderRequest): Promise<AiProviderResponse>;
}
