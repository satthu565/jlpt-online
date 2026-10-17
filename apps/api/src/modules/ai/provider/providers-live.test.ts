import { describe, expect, it } from 'vitest';
import {
  ExternalPrerequisiteError,
  LiveAiProvider,
} from './live-ai-provider.js';
import { LiveTtsProvider, TTSService } from '../../learning/tts.service.js';
import { DictionaryAdapter } from '@jlpt/content-tools';
import { validatePackagePath } from '@jlpt/content-tools';
import fs from 'node:fs';
import path from 'node:path';

function resolveFixture(relPath: string): string {
  const candidate1 = path.resolve(process.cwd(), relPath);
  if (fs.existsSync(candidate1)) return candidate1;
  const candidate2 = path.resolve(process.cwd(), '../../', relPath);
  if (fs.existsSync(candidate2)) return candidate2;
  return candidate1;
}

describe('V05 Acceptance 2 & Check 2: Live Providers & External Prerequisites (BLOCKED_EXTERNAL)', () => {
  // ---------------------------------------------------------------------------
  // 1. Live AI Provider (ai-provider)
  // ---------------------------------------------------------------------------
  describe('Live AI Provider (externalId: ai-provider)', () => {
    it('returns configured: false and status: BLOCKED_EXTERNAL when credential is missing', async () => {
      const provider = new LiveAiProvider(undefined);
      const isAvailable = await provider.isAvailable();
      expect(isAvailable).toBe(false);

      const status = provider.getProviderStatus();
      expect(status.configured).toBe(false);
      expect(status.isLive).toBe(false);
      expect(status.status).toBe('BLOCKED_EXTERNAL');
      expect(status.externalId).toBe('ai-provider');
      expect(status.missingPrerequisites).toContain('ai-provider');
      expect(status.missingPrerequisites).toContain('AI_PROVIDER_API_KEY');
    });

    it('strictly throws ExternalPrerequisiteError with BLOCKED_EXTERNAL status when generate is invoked without credentials', async () => {
      const provider = new LiveAiProvider('');
      await expect(
        provider.generate({
          action: 'generate_question',
          userMessage: 'Sinh câu hỏi N3 ngữ pháp',
        }),
      ).rejects.toThrow(ExternalPrerequisiteError);

      try {
        await provider.generate({ action: 'generate_question' });
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ExternalPrerequisiteError);
        const pErr = err as ExternalPrerequisiteError;
        expect(pErr.externalId).toBe('ai-provider');
        expect(pErr.status).toBe('BLOCKED_EXTERNAL');
        expect(pErr.message).toContain('External AI provider credential (ai-provider) is not configured');
      }
    });

    it('never falsely marks unconfigured provider as live or available', async () => {
      const emptyProvider = new LiveAiProvider('   ');
      expect(await emptyProvider.isAvailable()).toBe(false);
      expect(emptyProvider.getProviderStatus().status).toBe('BLOCKED_EXTERNAL');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Live TTS Provider (tts-provider)
  // ---------------------------------------------------------------------------
  describe('Live TTS Provider (externalId: tts-provider)', () => {
    it('returns configured: false and status: BLOCKED_EXTERNAL when TTS credentials are missing', () => {
      const ttsProvider = new LiveTtsProvider(undefined);
      expect(ttsProvider.isAvailable()).toBe(false);

      const status = ttsProvider.getProviderStatus();
      expect(status.configured).toBe(false);
      expect(status.isLive).toBe(false);
      expect(status.status).toBe('BLOCKED_EXTERNAL');
      expect(status.externalId).toBe('tts-provider');
      expect(status.missingPrerequisites).toContain('tts-provider');
      expect(status.missingPrerequisites).toContain('TTS_PROVIDER_API_KEY');
    });

    it('strictly throws ExternalPrerequisiteError with BLOCKED_EXTERNAL status when live synthesis is attempted without credentials', async () => {
      const ttsProvider = new LiveTtsProvider('');
      await expect(ttsProvider.synthesize('こんにちは')).rejects.toThrow(ExternalPrerequisiteError);

      try {
        await ttsProvider.synthesize('こんにちは');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ExternalPrerequisiteError);
        const pErr = err as ExternalPrerequisiteError;
        expect(pErr.externalId).toBe('tts-provider');
        expect(pErr.status).toBe('BLOCKED_EXTERNAL');
        expect(pErr.message).toContain('External TTS provider credential (tts-provider) is not configured');
      }
    });

    it('TTSService provides transparent sandbox fallback and reports BLOCKED_EXTERNAL for live requests', async () => {
      const ttsService = new TTSService();

      // Live status must report BLOCKED_EXTERNAL when unconfigured
      const liveStatus = ttsService.getLiveProviderStatus();
      expect(liveStatus.status).toBe('BLOCKED_EXTERNAL');
      expect(liveStatus.externalId).toBe('tts-provider');

      // Calling synthesizeLivePronunciation must throw BLOCKED_EXTERNAL
      await expect(
        ttsService.synthesizeLivePronunciation('user-1', { text: '勉強' }),
      ).rejects.toThrow(ExternalPrerequisiteError);

      // Default synthesizePronunciation must fall back gracefully to SANDBOX without pretending to be live
      const sandboxRes = await ttsService.synthesizePronunciation('user-1', { text: '勉強' });
      expect(sandboxRes.status).toBe('SANDBOX');
      expect(sandboxRes.isExternal).toBe(false);
      expect(sandboxRes.audioUrl).toContain('sandbox');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Dictionary Provider (dictionary)
  // ---------------------------------------------------------------------------
  describe('Dictionary Provider (externalId: dictionary)', () => {
    it('returns configured: false and status: BLOCKED_EXTERNAL when external dictionary credentials are missing', () => {
      const adapter = new DictionaryAdapter({ providerType: 'external', apiKey: undefined });
      expect(adapter.isAvailable()).toBe(false);

      const status = adapter.getProviderStatus();
      expect(status.configured).toBe(false);
      expect(status.isLive).toBe(false);
      expect(status.status).toBe('BLOCKED_EXTERNAL');
      expect(status.externalId).toBe('dictionary');
      expect(status.missingPrerequisites).toContain('dictionary');
      expect(status.missingPrerequisites).toContain('DICTIONARY_API_KEY');
    });

    it('strictly throws ExternalPrerequisiteError with BLOCKED_EXTERNAL status when external lookup is attempted without credentials', () => {
      const adapter = new DictionaryAdapter({ providerType: 'external', apiKey: '' });

      expect(() => adapter.lookup('先生')).toThrow(ExternalPrerequisiteError);

      try {
        adapter.lookup('先生');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ExternalPrerequisiteError);
        const pErr = err as ExternalPrerequisiteError;
        expect(pErr.externalId).toBe('dictionary');
        expect(pErr.status).toBe('BLOCKED_EXTERNAL');
        expect(pErr.message).toContain('External dictionary provider credential (dictionary) is not configured');
      }
    });

    it('reports BLOCKED_EXTERNAL in license metadata when external dictionary is unconfigured', () => {
      const adapter = new DictionaryAdapter({ providerType: 'external', apiKey: undefined });
      const meta = adapter.getLicenseMetadata();
      expect(meta.status).toBe('BLOCKED_EXTERNAL');
    });

    it('sandbox dictionary operates normally without external dependency', () => {
      const sandboxAdapter = new DictionaryAdapter({ providerType: 'sandbox' });
      expect(sandboxAdapter.isAvailable()).toBe(true);
      expect(sandboxAdapter.getProviderStatus().status).toBe('SANDBOX_FALLBACK');

      const entry = sandboxAdapter.lookup('先生');
      expect(entry).not.toBeNull();
      expect(entry?.entry).toBe('先生');
      expect(entry?.status).toBe('SANDBOX');
      expect(entry?.isExternal).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Prepared Import Data and Sample Rights (sample-rights, prepared-import-data)
  // ---------------------------------------------------------------------------
  describe('Prepared Import Data & Rights Prerequisites (prepared-import-data, sample-rights)', () => {
    it('verifies that draft packages with missing answers or unverified sources retain blocking issues', () => {
      const draftPath = resolveFixture('fixtures/imports/draft');
      const result = validatePackagePath(draftPath, { mode: 'draft' });

      expect(result.readiness).toBe('DRAFT_ONLY');
      expect(result.publicationApproved).toBe(false);
      expect(result.blockingIssueCount).toBeGreaterThan(0);
    });

    it('strictly forbids ready publication when rightsStatus is unverified or external rights confirmation is missing', () => {
      const readyPath = resolveFixture('fixtures/imports/ready');
      const result = validatePackagePath(readyPath, { mode: 'ready' });

      // Even when package content format is valid, publication approval requires explicit coordinator/owner grant
      expect(result.publicationApproved).toBe(false);
      expect(result.readiness).toBe('READY_FOR_REVIEW');
    });
  });
});
