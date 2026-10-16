import type { RichBlock, RichText, RichTextSegment } from '@jlpt/schema';
import type { ExtractedSegment, SentenceRole } from './types.js';

export const KANJI_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf]/;
export const KANJI_GLOBAL_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf]/g;
export const HIRAGANA_REGEX = /[\u3040-\u309f]/;
export const KATAKANA_REGEX = /[\u30a0-\u30ff]/;
export const JAPANESE_CHAR_REGEX = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/;

/**
 * Normalizes Japanese text to Unicode NFC form.
 * Preserves exact Japanese characters without converting full-width alphanumeric to half-width (no NFKC).
 */
export function normalizeJapaneseTextNFC(text: string): string {
  if (!text) return '';
  return text.normalize('NFC');
}

/**
 * Checks if a character is a Kanji.
 */
export function isKanji(char: string): boolean {
  return KANJI_REGEX.test(char);
}

/**
 * Extracts all Kanji characters from a text string.
 */
export function extractKanjiCharacters(text: string): string[] {
  const normalized = normalizeJapaneseTextNFC(text);
  const matches = normalized.match(KANJI_GLOBAL_REGEX);
  return matches ?? [];
}

/**
 * Checks if a string contains any Japanese characters (Kanji, Hiragana, Katakana).
 */
export function containsJapanese(text: string): boolean {
  return JAPANESE_CHAR_REGEX.test(text);
}

/**
 * Converts RichText to plain text string.
 */
export function richTextToPlainText(richText: RichText | null | undefined): string {
  if (!richText || !Array.isArray(richText)) return '';
  let out = '';
  for (const seg of richText) {
    out += segmentToText(seg);
  }
  return normalizeJapaneseTextNFC(out);
}

function segmentToText(seg: RichTextSegment): string {
  switch (seg.t) {
    case 'text':
      return seg.text;
    case 'ruby':
      return seg.text;
    case 'underline':
      if (seg.children) {
        return seg.children.map(segmentToText).join('');
      }
      return seg.text ?? '';
    case 'emphasis':
      if (seg.children) {
        return seg.children.map(segmentToText).join('');
      }
      return '';
    case 'blank':
      return seg.label ? `(${seg.label})` : '(__)';
    case 'star':
      return '★';
    case 'br':
      return '\n';
    case 'image':
      return '';
    default:
      return '';
  }
}

/**
 * Extracts text segments from RichText, preserving role and marking target status.
 * Underlined segments or segments with isTarget=true are marked as target words (tested directly).
 */
export function extractSegmentsFromRichText(
  richText: RichText | null | undefined,
  role: SentenceRole,
  inheritedTarget = false,
): ExtractedSegment[] {
  if (!richText || !Array.isArray(richText)) return [];
  const results: ExtractedSegment[] = [];

  for (const seg of richText) {
    if (seg.t === 'ruby') {
      const text = normalizeJapaneseTextNFC(seg.text);
      const reading = normalizeJapaneseTextNFC(seg.rt);
      if (text.trim().length > 0) {
        results.push({
          text,
          reading,
          isTarget: inheritedTarget,
          role,
        });
      }
    } else if (seg.t === 'underline') {
      // Underline in JLPT indicates the word being tested directly
      const isTarget = true;
      const s = seg as { children?: RichTextSegment[]; text?: string };
      if (s.children && s.children.length > 0) {
        results.push(...extractSegmentsFromRichText(s.children, role, isTarget));
      } else if (typeof s.text === 'string') {
        const text = normalizeJapaneseTextNFC(s.text);
        if (text.trim().length > 0) {
          results.push({
            text,
            isTarget,
            role,
          });
        }
      }
    } else if (seg.t === 'emphasis') {
      if (seg.children && seg.children.length > 0) {
        results.push(...extractSegmentsFromRichText(seg.children, role, inheritedTarget));
      }
    } else if (seg.t === 'text' || (!seg.t && typeof (seg as { text?: unknown }).text === 'string')) {
      const text = normalizeJapaneseTextNFC((seg as { text: string }).text);
      if (text.trim().length > 0) {
        results.push({
          text,
          isTarget: inheritedTarget,
          role,
        });
      }
    }
  }

  return results;
}

/**
 * Extracts text segments from RichBlock[] (passages).
 */
export function extractSegmentsFromRichBlocks(
  blocks: RichBlock[] | null | undefined,
  role: SentenceRole = 'passage',
): ExtractedSegment[] {
  if (!blocks || !Array.isArray(blocks)) return [];
  const results: ExtractedSegment[] = [];

  for (const block of blocks) {
    if (block.type === 'paragraph') {
      results.push(...extractSegmentsFromRichText(block.content, role, false));
    } else if (block.type === 'table') {
      for (const row of block.rows) {
        for (const cell of row) {
          results.push(...extractSegmentsFromRichText(cell, role, false));
        }
      }
    }
  }

  return results;
}
