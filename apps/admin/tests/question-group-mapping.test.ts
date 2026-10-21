import { describe, expect, it } from 'vitest';
import { toAdminQuestionGroup } from '../features/content/types';

describe('toAdminQuestionGroup', () => {
  it('maps GET /admin/groups/:id (versions and options in separate rows) to the editor model', () => {
    const group = toAdminQuestionGroup({
      id: 'g1',
      level: 'N3',
      sectionCode: 'language_vocab',
      title: 'Nhóm 1',
      sourceId: 'src-1',
      version: { version: 2, passage: [{ t: 'paragraph', text: [] }], status: 'approved', audioSha256: null },
      questions: [
        {
          id: 'q1',
          mondaiType: 'kanji_reading',
          skill: 'vocabulary',
          version: { stem: [{ t: 'text', text: '予約' }] },
          options: [
            { orderIndex: 1, content: [{ t: 'text', text: 'よやく' }] },
            { orderIndex: 2, content: [{ t: 'text', text: 'ようやく' }] },
          ],
          correctAnswer: { correctOption: 1 },
        },
      ],
    });
    expect(group.id).toBe('g1');
    expect(group.version).toBe(2);
    expect(group.status).toBe('approved');
    expect(group.mondaiType).toBe('kanji_reading');
    expect(group.questions).toHaveLength(1);
    expect(group.questions[0]!.stem).toEqual([{ t: 'text', text: '予約' }]);
    expect(group.questions[0]!.options.map((o) => o.isCorrect)).toEqual([true, false]);
    expect(group.questions[0]!.correctOption).toBe(1);
  });

  it('never leaves questions undefined (the editor reads questions[0])', () => {
    const group = toAdminQuestionGroup({ id: 'g2' });
    expect(group.questions).toEqual([]);
    expect(group.passage).toBeNull();
  });
});
