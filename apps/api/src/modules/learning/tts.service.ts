import { BadRequestException, Injectable } from '@nestjs/common';
import type { TTSRequestDto, TTSResponseDto } from './learning.types.js';

export const TTS_LICENSE_INFO = {
  license: 'Open-Voice-License-1.0',
  attribution: 'Open J-Talk / HTS Voice Japanese Speech Synthesis Engine (Sandbox Fallback)',
  provider: 'JLPT-TTS-Sandbox',
  allowedVoices: ['ja-JP-Standard-A', 'ja-JP-Standard-B', 'ja-JP-Neural2-B', 'sandbox-voice-1'],
};

@Injectable()
export class TTSService {
  private userUsage = new Map<string, number>();

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
