import type {
  AiProvider,
  AiProviderRequest,
  AiProviderResponse,
} from './ai-provider.interface.js';

import { ExternalPrerequisiteError } from '@jlpt/content-tools';
export { ExternalPrerequisiteError };

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

  getProviderStatus(): {
    configured: boolean;
    isLive: boolean;
    status: 'READY' | 'BLOCKED_EXTERNAL';
    externalId: string;
    missingPrerequisites: string[];
  } {
    const configured = Boolean(this.apiKey && this.apiKey.trim().length > 0);
    return {
      configured,
      isLive: false,
      status: configured ? 'READY' : 'BLOCKED_EXTERNAL',
      externalId: 'ai-provider',
      missingPrerequisites: configured ? [] : ['ai-provider', 'AI_PROVIDER_API_KEY'],
    };
  }

  async generate(_request: AiProviderRequest): Promise<AiProviderResponse> {
    const available = await this.isAvailable();
    if (!available) {
      throw new ExternalPrerequisiteError(
        'ai-provider',
        'BLOCKED_EXTERNAL',
        'External AI provider credential (ai-provider) is not configured in environment. Production requests are blocked pending external configuration.',
      );
    }

    throw new Error('Live provider execution requires valid operator network lease and active subscription budget.');
  }
}
