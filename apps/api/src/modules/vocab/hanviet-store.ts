import { getHanVietForWord as computeHanVietForWord } from '@jlpt/content-tools';

/**
 * H01: Hán Việt saved on dictionary entries (lexical_entries.han_viet), keyed by headword.
 * Notebook, flashcards, quizzes and review lists call getHanVietForWord(term) synchronously; with this
 * cache they pick up the stored value (including an editor's manual fix) instead of recomputing it
 * without a reading. Filled when the API starts and updated whenever an entry is edited.
 */
const stored = new Map<string, string>();

function key(term: string): string {
  return term.normalize('NFC').trim();
}

export function setStoredHanViet(entries: Iterable<{ term: string; hanViet: string | null }>, replace = false): void {
  if (replace) stored.clear();
  for (const e of entries) {
    if (e.hanViet) stored.set(key(e.term), e.hanViet);
  }
}

export function clearStoredHanViet(): void {
  stored.clear();
}

export function getStoredHanViet(term: string): string | undefined {
  return stored.get(key(term));
}

/** Stored value of the matching dictionary entry when there is one; otherwise computed (layers 1-3). */
export function getHanVietForWord(word: string, reading?: string): string {
  if (!word || typeof word !== 'string') return '';
  if (!reading) {
    const hit = stored.get(key(word));
    if (hit) return hit;
  }
  return computeHanVietForWord(word, reading);
}
