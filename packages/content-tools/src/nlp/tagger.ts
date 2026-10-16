import type { RichBlock, RichText } from '@jlpt/schema';
import { GrammarAnalyzer } from './grammar-analyzer.js';
import { extractKanjiCharacters, richTextToPlainText } from './japanese-text.js';
import { tokenizeRichBlocks, tokenizeRichText } from './tokenizer.js';
import type { QuestionTagItem } from './types.js';

export interface QuestionTaggingInput {
  id?: string;
  skill?: string;
  level?: string;
  mondai?: string | number;
  stem?: RichText | unknown;
  options?: Array<{
    id?: string;
    content?: RichText | unknown;
  }>;
  passage?: RichBlock[] | unknown;
}

/**
 * Extracts and tags a question with vocabulary, target vocabulary, Kanji, and grammar patterns (QB-09).
 */
export function tagQuestion(input: QuestionTaggingInput): QuestionTagItem[] {
  const tags = new Map<string, QuestionTagItem>();

  function addTag(tag: string, category: QuestionTagItem['category']) {
    if (!tags.has(tag)) {
      tags.set(tag, { tag, category });
    }
  }

  // 1. Level tag
  if (input.level && ['N1', 'N2', 'N3', 'N4', 'N5'].includes(input.level.toUpperCase())) {
    addTag(`level:${input.level.toUpperCase()}`, 'level');
  }

  // 2. Skill tag
  if (input.skill) {
    addTag(`skill:${input.skill.toLowerCase()}`, 'skill');
  }

  // 3. Mondai tag
  if (input.mondai !== undefined && input.mondai !== null) {
    addTag(`mondai:${input.mondai}`, 'mondai');
  }

  // 4. Extract tokens from stem
  if (input.stem) {
    const stemTokens = tokenizeRichText(input.stem as RichText, 'stem', false);
    for (const token of stemTokens) {
      if (token.baseForm && token.baseForm.length > 0) {
        if (token.isTarget) {
          addTag(`target_vocab:${token.baseForm}`, 'target_vocab');
        } else {
          addTag(`vocab:${token.baseForm}`, 'vocab');
        }
      }
    }

    const stemText = richTextToPlainText(input.stem as RichText);
    // Kanji tags
    const kanjis = extractKanjiCharacters(stemText);
    for (const k of kanjis) {
      addTag(`kanji:${k}`, 'kanji');
    }

    // Grammar tags
    const grammarAnalyzer = new GrammarAnalyzer();
    const grammarMatches = grammarAnalyzer.findPatterns(stemText, {
      role: 'stem',
      isTarget: input.skill === 'grammar',
    });
    for (const match of grammarMatches) {
      addTag(`grammar:${match.patternId}`, 'grammar');
    }
  }

  // 5. Extract tokens from options
  if (input.options && Array.isArray(input.options)) {
    for (const opt of input.options) {
      if (opt.content) {
        const optTokens = tokenizeRichText(opt.content as RichText, 'option', false);
        for (const token of optTokens) {
          if (token.baseForm && token.baseForm.length > 0) {
            addTag(`vocab:${token.baseForm}`, 'vocab');
          }
        }

        const optText = richTextToPlainText(opt.content as RichText);
        const optKanjis = extractKanjiCharacters(optText);
        for (const k of optKanjis) {
          addTag(`kanji:${k}`, 'kanji');
        }
      }
    }
  }

  // 6. Extract tokens from passage if present
  if (input.passage && Array.isArray(input.passage)) {
    const passageBlocks = input.passage as RichBlock[];
    const passageTokens = tokenizeRichBlocks(passageBlocks, 'passage');
    for (const token of passageTokens) {
      if (token.baseForm && token.baseForm.length > 0) {
        addTag(`vocab:${token.baseForm}`, 'vocab');
      }
    }

    for (const block of passageBlocks) {
      if (block.type === 'paragraph') {
        const text = richTextToPlainText(block.content);
        const blockKanjis = extractKanjiCharacters(text);
        for (const k of blockKanjis) {
          addTag(`kanji:${k}`, 'kanji');
        }
      }
    }
  }

  return Array.from(tags.values());
}
