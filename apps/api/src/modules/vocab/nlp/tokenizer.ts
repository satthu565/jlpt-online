import type { RichBlock, RichText } from '@jlpt/schema';
import {
  extractSegmentsFromRichBlocks,
  extractSegmentsFromRichText,
  normalizeJapaneseTextNFC,
} from './japanese-text.js';
import { lemmatize } from './lemmatizer.js';
import type {
  SentenceRole,
  WordToken,
} from './types.js';
import { findDictionaryEntry } from './vocab-dict.js';

// Common Japanese particles
const PARTICLES = new Set([
  'は',
  'が',
  'を',
  'に',
  'で',
  'と',
  'へ',
  'から',
  'まで',
  'より',
  'も',
  'ね',
  'よ',
  'の',
  'か',
]);

const PUNCTUATION_REGEX = /[\s\t\n\r、。！？「」『』（）()[\]・★…\-_:;]/;
const KANJI_CHAR_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf]/;
const HIRAGANA_CHAR_REGEX = /[\u3040-\u309f]/;
const KATAKANA_CHAR_REGEX = /[\u30a0-\u30ff]/;

/**
 * Tokenizes plain text string into word tokens.
 */
export function tokenizeJapaneseText(
  text: string,
  role: SentenceRole = 'stem',
  isTarget = false,
  givenReading?: string,
): WordToken[] {
  const normalized = normalizeJapaneseTextNFC(text);
  if (!normalized || normalized.trim().length === 0) return [];

  const tokens: WordToken[] = [];
  let index = 0;

  while (index < normalized.length) {
    const char = normalized[index]!;

    // 1. Skip punctuation and whitespace
    if (PUNCTUATION_REGEX.test(char)) {
      index += 1;
      continue;
    }

    // 2. Try longest dictionary match from current index
    let dictMatch: ReturnType<typeof findDictionaryEntry> | null = null;
    let matchLen = 0;
    for (let len = Math.min(10, normalized.length - index); len >= 2; len--) {
      const slice = normalized.slice(index, index + len);
      const entry = findDictionaryEntry(slice);
      if (entry) {
        dictMatch = entry;
        matchLen = len;
        break;
      }
    }

    // If dictionary matched a compound word (and next character is not okurigana extending it)
    if (dictMatch && matchLen > 0) {
      const surface = normalized.slice(index, index + matchLen);
      // Check if this is a verb/adjective in dictionary or a noun/compound
      const nextChar = normalized[index + matchLen];
      const isNextHiragana = nextChar && HIRAGANA_CHAR_REGEX.test(nextChar) && !PARTICLES.has(nextChar);

      // If next char is not okurigana, take the dictionary match
      if (!isNextHiragana || dictMatch.partOfSpeech !== 'noun') {
        const lemma = lemmatize(surface);
        tokens.push({
          surface,
          baseForm: lemma.baseForm || dictMatch.term,
          reading: givenReading ?? dictMatch.readings[0],
          partOfSpeech: lemma.partOfSpeech || dictMatch.partOfSpeech,
          level: dictMatch.level,
          isTarget,
          role,
          span: { start: index, end: index + matchLen },
        });
        index += matchLen;
        continue;
      }
    }

    // 3. Single-character particle check (when not part of a word)
    if (PARTICLES.has(char)) {
      tokens.push({
        surface: char,
        baseForm: char,
        reading: char,
        partOfSpeech: 'particle',
        isTarget,
        role,
        span: { start: index, end: index + 1 },
      });
      index += 1;
      continue;
    }

    // 4. Katakana loan word (e.g. サッカー, ケーキ, ビル)
    if (KATAKANA_CHAR_REGEX.test(char)) {
      let katakanaEnd = index + 1;
      while (
        katakanaEnd < normalized.length &&
        KATAKANA_CHAR_REGEX.test(normalized[katakanaEnd]!)
      ) {
        katakanaEnd += 1;
      }
      const surface = normalized.slice(index, katakanaEnd);
      const entry = findDictionaryEntry(surface);
      tokens.push({
        surface,
        baseForm: surface,
        reading: givenReading ?? entry?.readings[0] ?? surface,
        partOfSpeech: entry?.partOfSpeech ?? 'noun',
        level: entry?.level,
        isTarget,
        role,
        span: { start: index, end: katakanaEnd },
      });
      index = katakanaEnd;
      continue;
    }

    // 5. Word starting with Kanji:
    if (KANJI_CHAR_REGEX.test(char)) {
      // Find where kanji sequence ends
      let kEnd = index + 1;
      while (kEnd < normalized.length && KANJI_CHAR_REGEX.test(normalized[kEnd]!)) {
        kEnd += 1;
      }

      // Check if followed by Hiragana okurigana (e.g. 登りました, 食べた, 高い, 静かな)
      const nextChar = normalized[kEnd];
      const hasOkurigana = nextChar && HIRAGANA_CHAR_REGEX.test(nextChar) && !PARTICLES.has(nextChar);

      if (hasOkurigana) {
        // Collect following Hiragana until particle, punctuation, kanji, katakana, or space
        let okuriEnd = kEnd;
        while (
          okuriEnd < normalized.length &&
          HIRAGANA_CHAR_REGEX.test(normalized[okuriEnd]!) &&
          !PUNCTUATION_REGEX.test(normalized[okuriEnd]!)
        ) {
          // If we encounter a particle at okuriEnd, check if it's an inflection ending or particle
          const ch = normalized[okuriEnd]!;
          if (PARTICLES.has(ch)) {
            // Check if current word up to okuriEnd is a valid inflected form
            const currentSub = normalized.slice(index, okuriEnd);
            const lemmaSub = lemmatize(currentSub);
            if (lemmaSub.inflection && lemmaSub.inflection !== 'dictionary') {
              // Word ended before this particle
              break;
            }
          }
          okuriEnd += 1;
        }

        const surface = normalized.slice(index, okuriEnd);
        const lemma = lemmatize(surface);
        const entry = findDictionaryEntry(lemma.baseForm);

        tokens.push({
          surface,
          baseForm: lemma.baseForm,
          reading: givenReading ?? entry?.readings[0],
          partOfSpeech: lemma.partOfSpeech ?? entry?.partOfSpeech ?? 'verb',
          level: entry?.level,
          isTarget,
          role,
          span: { start: index, end: okuriEnd },
        });

        index = okuriEnd;
        continue;
      }

      // Pure Kanji compound (e.g. 富士山, 学校, 先生, 山)
      const surface = normalized.slice(index, kEnd);
      const entry = findDictionaryEntry(surface);
      tokens.push({
        surface,
        baseForm: surface,
        reading: givenReading ?? entry?.readings[0],
        partOfSpeech: entry?.partOfSpeech ?? 'noun',
        level: entry?.level,
        isTarget,
        role,
        span: { start: index, end: kEnd },
      });
      index = kEnd;
      continue;
    }

    // 6. Hiragana word sequence (verbs/adverbs in hiragana, e.g. とても, どこ, わたし)
    let hEnd = index + 1;
    while (
      hEnd < normalized.length &&
      HIRAGANA_CHAR_REGEX.test(normalized[hEnd]!) &&
      !PUNCTUATION_REGEX.test(normalized[hEnd]!) &&
      !PARTICLES.has(normalized[hEnd]!)
    ) {
      hEnd += 1;
    }

    const surface = normalized.slice(index, hEnd);
    const lemma = lemmatize(surface);
    const entry = findDictionaryEntry(lemma.baseForm);

    tokens.push({
      surface,
      baseForm: lemma.baseForm,
      reading: givenReading ?? entry?.readings[0] ?? surface,
      partOfSpeech: lemma.partOfSpeech ?? entry?.partOfSpeech ?? 'other',
      level: entry?.level,
      isTarget,
      role,
      span: { start: index, end: hEnd },
    });

    index = hEnd;
  }

  return tokens;
}

/**
 * Tokenizes RichText structures, preserving sentence roles and target marking.
 */
export function tokenizeRichText(
  richText: RichText | null | undefined,
  role: SentenceRole = 'stem',
  inheritedTarget = false,
): WordToken[] {
  const segments = extractSegmentsFromRichText(richText, role, inheritedTarget);
  const tokens: WordToken[] = [];

  for (const seg of segments) {
    tokens.push(...tokenizeJapaneseText(seg.text, seg.role, seg.isTarget, seg.reading));
  }

  return tokens;
}

/**
 * Tokenizes RichBlock structures (e.g. reading passages).
 */
export function tokenizeRichBlocks(
  blocks: RichBlock[] | null | undefined,
  role: SentenceRole = 'passage',
): WordToken[] {
  const segments = extractSegmentsFromRichBlocks(blocks, role);
  const tokens: WordToken[] = [];

  for (const seg of segments) {
    tokens.push(...tokenizeJapaneseText(seg.text, seg.role, seg.isTarget, seg.reading));
  }

  return tokens;
}
