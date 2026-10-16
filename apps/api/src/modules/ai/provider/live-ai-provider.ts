import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse,
} from './ai-provider.interface.js';

export class ExternalPrerequisiteError extends Error {
  constructor(
    public readonly externalId: string,
    public readonly status: 'MISSING' | 'BLOCKED_EXTERNAL',
    message: string,
  ) {
    super(message);
    this.name = 'ExternalPrerequisiteError';
  }
}

export class LiveAiProvider implements AiProvider {
  readonly id = 'live-adapter';
  readonly name = 'Production External AI Provider';

  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.AI_PROVIDER_API_KEY;
  }

  async isAvailable(): Promise<boolean> {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async generate(_request: AiProviderRequest): Promise<AiProviderResponse> {
    const available = await this.isAvailable();
    if (!available) {
      throw new ExternalPrerequisiteError(
        'ai-provider',
        'MISSING',
        'External AI provider credential (ai-provider) is not configured in environment. Production requests are blocked pending external configuration.',
      );
    }

    throw new Error('Live provider execution requires valid operator network lease and active subscription budget.');
  }
}
