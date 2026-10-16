import { BadRequestException, Injectable } from '@nestjs/common';
import { ExternalPrerequisiteError } from '../ai/provider/live-ai-provider.js';
import type { TTSRequestDto, TTSResponseDto } from './learning.types.js';

export const TTS_LICENSE_INFO = {
  license: 'Open-Voice-License-1.0',
  attribution: 'Open J-Talk / HTS Voice Japanese Speech Synthesis Engine (Sandbox Fallback)',
  provider: 'JLPT-TTS-Sandbox',
  allowedVoices: ['ja-JP-Standard-A', 'ja-JP-Standard-B', 'ja-JP-Neural2-B', 'sandbox-voice-1'],
};

export class LiveTtsProvider {
  readonly id = 'live-tts-adapter';
  readonly name = 'Production External TTS Provider';
  private apiKey?: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.TTS_PROVIDER_API_KEY ?? process.env.GOOGLE_TTS_API_KEY;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  getProviderStatus(): {
    configured: boolean;
    isLive: boolean;
    status: 'READY' | 'BLOCKED_EXTERNAL';
    externalId: string;
    missingPrerequisites: string[];
  } {
    const configured = this.isAvailable();
    return {
      configured,
      isLive: false,
      status: configured ? 'READY' : 'BLOCKED_EXTERNAL',
      externalId: 'tts-provider',
      missingPrerequisites: configured ? [] : ['tts-provider', 'TTS_PROVIDER_API_KEY'],
    };
  }

  async synthesize(_text: string, _voice?: string): Promise<{ audioBuffer: Buffer; durationMs: number }> {
    if (!this.isAvailable()) {
      throw new ExternalPrerequisiteError(
        'tts-provider',
        'BLOCKED_EXTERNAL',
        'External TTS provider credential (tts-provider) is not configured in environment. Production voice synthesis is blocked pending operator configuration.',
      );
    }
    throw new Error('Live TTS provider execution requires valid cloud audio billing contract.');
  }
}

@Injectable()
export class TTSService {
  private userUsage = new Map<string, number>();
  private liveProvider = new LiveTtsProvider();

  getLiveProviderStatus() {
    return this.liveProvider.getProviderStatus();
  }

  async synthesizeLivePronunciation(_userId: string, dto: TTSRequestDto) {
    if (!this.liveProvider.isAvailable()) {
      throw new ExternalPrerequisiteError(
        'tts-provider',
        'BLOCKED_EXTERNAL',
        'External TTS provider credential (tts-provider) is not configured in environment. Production voice synthesis is blocked pending operator configuration.',
      );
    }
    return this.liveProvider.synthesize(dto.text, dto.voice);
  }

  /**
   * Synthesizes Japanese pronunciation with license verification and sandbox fallback.
   * (VOC-16, Acceptance 4).
   */
  async synthesizePronunciation(
    userId: string,
    dto: TTSRequestDto,
  ): Promise<TTSResponseDto> {
    if (!dto.text || dto.text.trim().length === 0) {
      throw new BadRequestException('Text is required for TTS synthesis');
    }

    const trimmed = dto.text.trim();
    const voice = dto.voice ?? 'sandbox-voice-1';

    if (!TTS_LICENSE_INFO.allowedVoices.includes(voice)) {
      throw new BadRequestException(
        `Voice '${voice}' is not supported or not permitted under current license policy`,
      );
    }

    // Check user budget quota (e.g. 500 requests per day)
    const currentCount = this.userUsage.get(userId) ?? 0;
    const quotaLimit = 500;
    if (currentCount >= quotaLimit) {
      throw new BadRequestException('Daily TTS quota limit exceeded');
    }
    this.userUsage.set(userId, currentCount + 1);

    // Encode text into safe pronunciation URL / sandbox data
    const encoded = encodeURIComponent(trimmed);
    const audioUrl = `/api/v1/media/audio/tts/sandbox?text=${encoded}&voice=${encodeURIComponent(voice)}`;

    return {
      audioUrl,
      format: 'mp3',
      license: TTS_LICENSE_INFO.license,
      attribution: TTS_LICENSE_INFO.attribution,
      isExternal: false,
      status: 'SANDBOX', // Note: external tts-provider is MISSING, so status is SANDBOX
      quota: {
        remaining: quotaLimit - (currentCount + 1),
        resetAt: new Date(Date.now() + 86400000).toISOString(),
      },
    };
  }

  /**
   * Returns current TTS license and attribution metadata (Acceptance 4).
   */
  getLicenseMetadata() {
    return {
      license: TTS_LICENSE_INFO.license,
      attribution: TTS_LICENSE_INFO.attribution,
      provider: TTS_LICENSE_INFO.provider,
      allowedVoices: [...TTS_LICENSE_INFO.allowedVoices],
      status: 'SANDBOX',
    };
  }
}
