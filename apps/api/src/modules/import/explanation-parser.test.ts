import { describe, expect, it } from 'vitest';
import {
  parsePackageExplanation,
  extractPlainTextFromRichText,
} from './explanation-parser.js';
import type { RichBlock, RichText } from '@jlpt/schema';

describe('I17 Explanation Parser Unit Tests', () => {
  it('extractPlainTextFromRichText handles text, ruby, br, and emphasis', () => {
    const segments: RichText = [
      { t: 'text', text: 'Chào ' },
      { t: 'ruby', text: '日本語', rt: 'にほんご' },
      { t: 'br' },
      {
        t: 'emphasis',
        children: [{ t: 'text', text: 'rất quan trọng' }],
      },
    ];
    expect(extractPlainTextFromRichText(segments)).toBe('Chào 日本語\nrất quan trọng');
  });

  it('parses structured explanation with prefix matching (Acceptance 1)', () => {
    const blocks: RichBlock[] = [
      {
        type: 'paragraph',
        content: [
          {
            t: 'text',
            text: `• Dịch nghĩa:
Người phụ nữ sẽ mua vé trước khi đi xem phim.

• Đáp án đúng: [3] Vì ở cuối đoạn hội thoại, cô ấy nói rõ "先にチケットを買っておきます".

• Phân tích các phương án còn lại:
- [1] Phương án 1 sai: người đàn ông mới là người đi mua nước.
- [2] Phương án 2 sai: hai người không ăn tối trước khi xem phim.
- [4] Phương án 4 sai: đây là kế hoạch của ngày mai.`,
          },
        ],
      },
    ];

    const result = parsePackageExplanation({ locale: 'vi', blocks });
    expect(result).not.toBeNull();
    expect(result!.translationVi).toBe('Người phụ nữ sẽ mua vé trước khi đi xem phim.');
    expect(result!.translation).toEqual([
      { t: 'text', text: 'Người phụ nữ sẽ mua vé trước khi đi xem phim.' },
    ]);
    expect(result!.correctReason).toEqual([
      {
        t: 'text',
        text: 'Đáp án đúng: [3] Vì ở cuối đoạn hội thoại, cô ấy nói rõ "先にチケットを買っておきます".',
      },
    ]);
    expect(result!.wrongReasonsByOption).toBeDefined();
    expect(result!.wrongReasonsByOption!['1']).toEqual([
      { t: 'text', text: 'Phương án 1 sai: người đàn ông mới là người đi mua nước.' },
    ]);
    expect(result!.wrongReasonsByOption!['2']).toEqual([
      { t: 'text', text: 'Phương án 2 sai: hai người không ăn tối trước khi xem phim.' },
    ]);
    expect(result!.wrongReasonsByOption!['4']).toEqual([
      { t: 'text', text: 'Phương án 4 sai: đây là kế hoạch của ngày mai.' },
    ]);
    expect(result!.explanationMarkdown).toContain('**Lý do đúng**:');
    expect(result!.explanationMarkdown).toContain('**Phân tích các phương án còn lại**:');
    expect(result!.explanationMarkdown).toContain('- [1] Phương án 1:');
  });

  it('fallback: keeps all blocks and uses full text as correctReason when no prefixes match', () => {
    const blocks: RichBlock[] = [
      {
        type: 'paragraph',
        content: [
          {
            t: 'text',
            text: '先週 đọc là せんしゅう (tuần trước). Chú ý trường âm しゅう, không phải しゅ.',
          },
        ],
      },
    ];

    const result = parsePackageExplanation({ locale: 'vi', blocks });
    expect(result).not.toBeNull();
    expect(result!.translation).toBeUndefined();
    expect(result!.translationVi).toBe('');
    expect(result!.wrongReasonsByOption).toBeUndefined();
    expect(result!.correctReason).toEqual([
      {
        t: 'text',
        text: '先週 đọc là せんしゅう (tuần trước). Chú ý trường âm しゅう, không phải しゅ.',
      },
    ]);
    expect(result!.blocks).toEqual(blocks);
  });

  it('listening question: attaches group.transcript even when explanation is null (Acceptance 4)', () => {
    const groupTranscript: RichText = [
      { t: 'text', text: '男：映画は何時からですか。\n女：７時です。' },
    ];

    const result = parsePackageExplanation(null, groupTranscript);
    expect(result).not.toBeNull();
    expect(result!.transcript).toEqual(groupTranscript);
    expect(result!.correctReason).toBeDefined();
    expect(result!.explanationMarkdown).toContain('Script bài nghe');
  });

  it('listening question with both explanation and transcript attaches both', () => {
    const blocks: RichBlock[] = [
      {
        type: 'paragraph',
        content: [
          {
            t: 'text',
            text: '• Dịch nghĩa: Bài hội thoại về giờ chiếu phim.\n\n• Đáp án đúng: [1] Lúc 7 giờ tối.',
          },
        ],
      },
    ];
    const groupTranscript: RichText = [
      { t: 'text', text: '男：映画は何時からですか。\n女：７時です。' },
    ];

    const result = parsePackageExplanation({ locale: 'vi', blocks }, groupTranscript);
    expect(result).not.toBeNull();
    expect(result!.transcript).toEqual(groupTranscript);
    expect(result!.translationVi).toBe('Bài hội thoại về giờ chiếu phim.');
    expect(result!.correctReason).toEqual([
      { t: 'text', text: 'Đáp án đúng: [1] Lúc 7 giờ tối.' },
    ]);
  });
});
