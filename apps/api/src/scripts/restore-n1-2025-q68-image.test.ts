import { describe, expect, it } from 'vitest';
import {
  EXPECTED_IMAGE_HEIGHT,
  EXPECTED_IMAGE_SHA256,
  EXPECTED_IMAGE_WIDTH,
  EXPECTED_MEDIA_KEY,
  getRestorationState,
} from './restore-n1-2025-q68-image.js';

describe('N1 12/2025 Q68 image restoration', () => {
  it('pins the owner-supplied image identity and dimensions', () => {
    expect(EXPECTED_IMAGE_SHA256).toHaveLength(64);
    expect(EXPECTED_MEDIA_KEY).toBe(`media/${EXPECTED_IMAGE_SHA256}.png`);
    expect([EXPECTED_IMAGE_WIDTH, EXPECTED_IMAGE_HEIGHT]).toEqual([1546, 738]);
  });

  it('recognizes the exact pending content shape', () => {
    expect(
      getRestorationState({
        passage: [],
        stem: [
          {
            t: 'text',
            text: '（聴解 問題1 2番：問題用紙に何も印刷されていません。音声を聞いて、1から4の中から、最もよいものを一つ選んでください。）',
          },
        ],
        options: ['選択肢1', '選択肢2', '選択肢3', '選択肢4'],
        hasGroupMedia: false,
      }),
    ).toBe('pending');
  });

  it('recognizes the exact applied content shape', () => {
    expect(
      getRestorationState({
        passage: [],
        stem: [
          {
            t: 'text',
            text: '（聴解 問題1 2番：画像の選択肢を見て、音声を聞き、1から4の中から最もよいものを一つ選んでください。）',
          },
        ],
        options: ['1', '2', '3', '4'],
        hasGroupMedia: true,
      }),
    ).toBe('applied');
  });

  it('recognizes the duplicated live shape that needs a follow-up version', () => {
    expect(
      getRestorationState({
        passage: [{ type: 'image', mediaKey: EXPECTED_MEDIA_KEY }],
        stem: [
          {
            t: 'text',
            text: '（聴解 問題1 2番：画像の選択肢を見て、音声を聞き、1から4の中から最もよいものを一つ選んでください。）',
          },
        ],
        options: ['1', '2', '3', '4'],
        hasGroupMedia: false,
      }),
    ).toBe('duplicated');
  });
});
