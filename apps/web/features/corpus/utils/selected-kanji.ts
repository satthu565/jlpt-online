/** Unique kanji in selection order; kana, punctuation and iteration marks are excluded. */
export function selectedKanji(text: string): string[] {
  return [...new Set(text.normalize('NFC').match(/[\p{Unified_Ideograph}〇]/gu) ?? [])];
}
