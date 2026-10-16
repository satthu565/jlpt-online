import { lemmatizeJapaneseWord } from './lemmatizer.js';
import type { DictionaryLookupResult } from './types.js';
import {
  DICTIONARY_LICENSE_INFO,
  findDictionaryEntry,
  getAllDictionaryEntries,
} from './vocab-dict.js';

export interface DictionaryAdapterOptions {
  providerType?: 'sandbox' | 'external';
  customAttribution?: string;
  customLicense?: string;
}

export class DictionaryAdapter {
  private providerType: 'sandbox' | 'external';
  private attribution: string;
  private license: string;

  constructor(options: DictionaryAdapterOptions = {}) {
    this.providerType = options.providerType ?? 'sandbox';
    this.attribution = options.customAttribution ?? DICTIONARY_LICENSE_INFO.attribution;
    this.license = options.customLicense ?? DICTIONARY_LICENSE_INFO.license;
  }

  /**
   * Tra cứu từ vựng trong từ điển kèm bản quyền và xuất xứ đầy đủ.
   */
  lookup(text: string, locale = 'vi'): DictionaryLookupResult | null {
    if (!text || text.trim().length === 0) return null;

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
      return null;
    }

    const meanings =
      locale === 'en'
        ? entry.meanings.filter((m) => !/[\u4e00-\u9fa5\u00C0-\u1EF9]/.test(m))
        : entry.meanings;

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
    };
  }

  /**
   * Returns license and attribution metadata.
   */
  getLicenseMetadata() {
    return {
      license: this.license,
      attribution: this.attribution,
      provider: DICTIONARY_LICENSE_INFO.provider,
      rightsTerms: DICTIONARY_LICENSE_INFO.rightsTerms,
      status: this.providerType === 'external' ? 'READY' : 'SANDBOX_FALLBACK',
    };
  }

  /**
   * Returns all available sandbox dictionary entries.
   */
  listAllEntries() {
    return getAllDictionaryEntries();
  }
}
