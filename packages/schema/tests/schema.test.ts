import { describe, it, expect } from 'vitest';
import {
  LevelSchema,
  ExamKindSchema,
  QuestionOriginSchema,
  ReviewStatusSchema,
  RichTextSchema,
} from '../src/index.js';

describe('@jlpt/schema smoke test', () => {
  it('validates standard JLPT level enums', () => {
    expect(LevelSchema.parse('N1')).toBe('N1');
    expect(LevelSchema.parse('N5')).toBe('N5');
    expect(() => LevelSchema.parse('N6')).toThrow();
  });

  it('validates exam kind enum values', () => {
    expect(ExamKindSchema.parse('original')).toBe('original');
    expect(ExamKindSchema.parse('practice')).toBe('practice');
    expect(() => ExamKindSchema.parse('unknown')).toThrow();
  });

  it('validates question origin values', () => {
    expect(QuestionOriginSchema.parse('official_past_exam')).toBe('official_past_exam');
    expect(QuestionOriginSchema.parse('ai_generated')).toBe('ai_generated');
  });

  it('validates review status values', () => {
    expect(ReviewStatusSchema.parse('draft')).toBe('draft');
    expect(ReviewStatusSchema.parse('approved')).toBe('approved');
  });

  it('validates rich text structure', () => {
    const valid = [
      { t: 'ruby', text: '漢字', rt: 'かんじ' },
      { t: 'text', text: 'を勉強する' },
      { t: 'blank' },
      { t: 'star' },
    ];
    expect(RichTextSchema.parse(valid)).toEqual(valid);
  });
});
