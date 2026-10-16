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
    switch (seg.t) {
      case 'text': {
        const text = normalizeJapaneseTextNFC(seg.text);
        if (text.trim().length > 0) {
          results.push({
            text,
            isTarget: inheritedTarget,
            role,
          });
        }
        break;
      }
      case 'ruby': {
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
        break;
      }
      case 'underline': {
        // Underline in JLPT indicates the word being tested directly!
        const isTarget = true;
        if (seg.children && seg.children.length > 0) {
          results.push(...extractSegmentsFromRichText(seg.children, role, isTarget));
        } else if (seg.text) {
          const text = normalizeJapaneseTextNFC(seg.text);
          if (text.trim().length > 0) {
            results.push({
              text,
              isTarget,
              role,
            });
          }
        }
        break;
      }
      case 'emphasis': {
        if (seg.children && seg.children.length > 0) {
          results.push(...extractSegmentsFromRichText(seg.children, role, inheritedTarget));
        }
        break;
      }
      case 'blank':
      case 'star':
      case 'br':
      case 'image':
      default:
        break;
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
