/**
 * Normalizes Japanese text for similarity and deduplication comparison.
 *
 * Rules:
 * - Preserves Unicode NFC (never converts to NFKC as per JLPT guidelines).
 * - Strips Ruby/Furigana annotations (<ruby>漢<rt>かん</rt></ruby> -> 漢).
 * - Strips HTML markup, Japanese full-width whitespace, punctuation, and brackets.
 */
export function normalizeJapaneseText(text: string): string {
  if (!text) return '';

  // Ensure Unicode NFC normalization
  let normalized = text.normalize('NFC');

  // Strip ruby annotations: keep base text, strip <rt>...</rt>
  normalized = normalized.replace(/<rt>[^<]*<\/rt>/gi, '');
  normalized = normalized.replace(/<[^>]+>/g, '');

  // Strip Japanese punctuation and symbols
  // 、 。 「 」 『 』 （ ） 【 】 〔 〕 ［ ］ ・ … — 〜 ～
  normalized = normalized.replace(
    /[、。・…—〜～「」『』（）()【】〔〕［］〈〉《》！？\s\u3000.,!?:;'"\-–—_[\]{}]/gu,
    '',
  );

  return normalized.toLowerCase();
}

/**
 * Extracts character n-grams (default bigrams: n = 2).
 */
export function extractCharacterNgrams(text: string, n = 2): Set<string> {
  const ngrams = new Set<string>();
  const normalized = normalizeJapaneseText(text);

  if (normalized.length === 0) {
    return ngrams;
  }

  if (normalized.length < n) {
    ngrams.add(normalized);
    return ngrams;
  }

  for (let i = 0; i <= normalized.length - n; i++) {
    ngrams.add(normalized.slice(i, i + n));
  }

  return ngrams;
}
