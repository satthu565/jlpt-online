import { lemmatizeJapaneseWord } from './lemmatizer.js';
import type { DictionaryLookupResult } from './types.js';
import {
  DICTIONARY_LICENSE_INFO,
  findDictionaryEntry,
  getAllDictionaryEntries,
} from './vocab-dict.js';
import { getHanVietForWord, getHanVietForKanji } from './hanviet.js';
import { getKanjiInfo } from './kanji-dict.js';

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

export interface DictionaryAdapterOptions {
  providerType?: 'sandbox' | 'external';
  apiKey?: string;
  customAttribution?: string;
  customLicense?: string;
}

export class DictionaryAdapter {
  private providerType: 'sandbox' | 'external';
  private apiKey?: string;
  private attribution: string;
  private license: string;

  constructor(options: DictionaryAdapterOptions = {}) {
    this.providerType = options.providerType ?? 'sandbox';
    this.apiKey = options.apiKey ?? process.env.DICTIONARY_API_KEY;
    this.attribution = options.customAttribution ?? DICTIONARY_LICENSE_INFO.attribution;
    this.license = options.customLicense ?? DICTIONARY_LICENSE_INFO.license;
  }

  isAvailable(): boolean {
    if (this.providerType === 'sandbox') return true;
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  getProviderStatus(): {
    configured: boolean;
    isLive: boolean;
    status: 'READY' | 'SANDBOX_FALLBACK' | 'BLOCKED_EXTERNAL';
    externalId: string;
    missingPrerequisites: string[];
  } {
    if (this.providerType === 'external') {
      const available = this.isAvailable();
      if (!available) {
        return {
          configured: false,
          isLive: false,
          status: 'BLOCKED_EXTERNAL',
          externalId: 'dictionary',
          missingPrerequisites: ['dictionary', 'DICTIONARY_API_KEY'],
        };
      }
      return {
        configured: true,
        isLive: true,
        status: 'READY',
        externalId: 'dictionary',
        missingPrerequisites: [],
      };
    }
    return {
      configured: true,
      isLive: false,
      status: 'SANDBOX_FALLBACK',
      externalId: 'dictionary',
      missingPrerequisites: [],
    };
  }

  /**
   * Tra cứu từ vựng trong từ điển kèm bản quyền và xuất xứ đầy đủ.
   */
  lookup(text: string, locale = 'vi'): DictionaryLookupResult | null {
    if (!text || text.trim().length === 0) return null;

    if (this.providerType === 'external' && !this.isAvailable()) {
      throw new ExternalPrerequisiteError(
        'dictionary',
        'BLOCKED_EXTERNAL',
        'External dictionary provider credential (dictionary) is not configured in environment. Production requests are blocked pending external configuration.',
      );
    }

    const trimmed = text.trim();
    // 1. Direct lookup
    let entry = findDictionaryEntry(trimmed);

    // 2. If not found, try lemmatized base form
    if (!entry) {
      const lemma = lemmatizeJapaneseWord(trimmed);
      if (lemma.baseForm && lemma.baseForm !== trimmed) {
        entry = findDictionaryEntry(lemma.baseForm);
      }
    }

    if (!entry) {
      // 3. Fallback for single Kanji character lookup
      if (Array.from(trimmed).length === 1) {
        const kHanViet = getHanVietForKanji(trimmed);
        const kInfo = getKanjiInfo(trimmed);
        if (kHanViet || (kInfo && kInfo.meanings.length > 0)) {
          return {
            entry: trimmed,
            readings: [...(kInfo?.onyomi ?? []), ...(kInfo?.kunyomi ?? [])],
            meanings: kInfo?.meanings && kInfo.meanings.length > 0 ? kInfo.meanings : (kHanViet ? [kHanViet.toLowerCase()] : []),
            examples: [],
            license: this.license,
            attribution: this.attribution,
            level: kInfo?.level,
            partOfSpeech: 'kanji',
            isExternal: this.providerType === 'external',
            status: this.providerType === 'external' ? 'READY' : 'SANDBOX',
            hanViet: kHanViet || '',
          };
        }
      }
      return null;
    }

    const meanings =
      locale === 'en'
        ? entry.meanings.filter((m) => !/[\u4e00-\u9fa5\u00C0-\u1EF9]/.test(m))
        : entry.meanings;

    const hanViet = entry.hanViet || getHanVietForWord(entry.term) || getHanVietForWord(trimmed) || '';

    return {
      entry: entry.term,
      readings: [...entry.readings],
      meanings: meanings.length > 0 ? meanings : entry.meanings,
      examples: [...entry.examples],
      license: this.license,
      attribution: this.attribution,
      level: entry.level,
      partOfSpeech: entry.partOfSpeech,
      isExternal: this.providerType === 'external',
      status: this.providerType === 'external' ? 'READY' : 'SANDBOX',
      hanViet,
    };
  }

  /**
   * Returns license and attribution metadata.
   */
  getLicenseMetadata() {
    let status: 'READY' | 'SANDBOX_FALLBACK' | 'BLOCKED_EXTERNAL' = 'SANDBOX_FALLBACK';
    if (this.providerType === 'external') {
      status = this.isAvailable() ? 'READY' : 'BLOCKED_EXTERNAL';
    }
    return {
      license: this.license,
      attribution: this.attribution,
      provider: DICTIONARY_LICENSE_INFO.provider,
      rightsTerms: DICTIONARY_LICENSE_INFO.rightsTerms,
      status,
    };
  }

  /**
   * Returns all available sandbox dictionary entries.
   */
  listAllEntries() {
    return getAllDictionaryEntries();
  }
}
