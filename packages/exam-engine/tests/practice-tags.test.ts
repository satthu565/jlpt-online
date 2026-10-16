import { describe, it, expect } from 'vitest';
import {
  generatePracticeExam,
  PoolShortageError,
  deterministicUuid,
  type CandidateGroup,
} from '../src/index.js';

describe('Tag Grammar & Vocab Practice Integration (Acceptance 4 & PRA-16)', () => {
  function makeTaggedCandidate(
    idx: number,
    skill: 'grammar' | 'vocabulary' | 'kanji',
    mondaiType: 'grammar_form' | 'contextual',
    tags: string[],
    level: 'N1' | 'N2' | 'N3' | 'N4' | 'N5' = 'N2',
  ): CandidateGroup {
    const groupId = deterministicUuid(idx + 1, `group_tag_${idx}`);
    return {
      groupId,
      sourceSession: '2023-12',
      level,
      mondaiType,
      skill,
      questions: [
        {
          id: `q_${groupId}_0`,
          stem: `Stem for ${idx}`,
          tags,
          exposureCount: 0,
        },
      ],
      questionCount: 1,
      hasMedia: false,
      isApproved: true,
      hasAnswerKeys: true,
      tags,
      license: {
        remixAllowed: true,
        displayAllowed: true,
      },
    };
  }

  it('generates a 10-question practice exam targeting a specific grammar pattern (grammar:n2_ni_tsurete)', () => {
    const grammarTag = 'grammar:n2_ni_tsurete';

    // Create pool with 12 questions tagged with grammar:n2_ni_tsurete and 10 other questions
    const targetPool = Array.from({ length: 12 }, (_, i) =>
      makeTaggedCandidate(i, 'grammar', 'grammar_form', [grammarTag, 'level:N2', 'skill:grammar']),
    );
    const noisePool = Array.from({ length: 10 }, (_, i) =>
      makeTaggedCandidate(100 + i, 'grammar', 'grammar_form', ['grammar:wake_ni_wa_ikanai', 'level:N2']),
    );

    const fullPool = [...targetPool, ...noisePool];

    const result = generatePracticeExam({
      config: {
        level: 'N2',
        skills: ['grammar'],
        mondaiTypes: ['grammar_form'],
        questionCount: 10,
        pool: 'tagged',
        tagIds: [grammarTag],
      },
      pool: fullPool,
      seed: 42,
    });

    expect(result.generatedExam).toBeDefined();
    expect(result.selectedGroups.length).toBe(10);
    // Verify all selected groups strictly contain the targeted grammar tag
    for (const group of result.selectedGroups) {
      const hasTag =
        group.tags?.includes(grammarTag) ||
        group.questions.some((q) => q.tags?.includes(grammarTag));
      expect(hasTag).toBe(true);
    }
  });

  it('generates targeted vocabulary practice by vocab and target_vocab tags', () => {
    const vocabTags = ['vocab:taberu', 'target_vocab:nihongo'];

    const targetPool = [
      ...Array.from({ length: 6 }, (_, i) =>
        makeTaggedCandidate(200 + i, 'vocabulary', 'contextual', ['vocab:taberu', 'level:N3'], 'N3'),
      ),
      ...Array.from({ length: 6 }, (_, i) =>
        makeTaggedCandidate(300 + i, 'vocabulary', 'contextual', ['target_vocab:nihongo', 'level:N3'], 'N3'),
      ),
    ];
    const noisePool = Array.from({ length: 10 }, (_, i) =>
      makeTaggedCandidate(400 + i, 'vocabulary', 'contextual', ['vocab:nomu', 'level:N3'], 'N3'),
    );

    const result = generatePracticeExam({
      config: {
        level: 'N3',
        skills: ['vocabulary'],
        mondaiTypes: ['contextual'],
        questionCount: 10,
        pool: 'tagged',
        tagIds: vocabTags,
      },
      pool: [...targetPool, ...noisePool],
      seed: 12345,
    });

    expect(result.selectedGroups.length).toBe(10);
    for (const group of result.selectedGroups) {
      const hasAnyTargetTag =
        group.tags?.some((t) => vocabTags.includes(t)) ||
        group.questions.some((q) => q.tags?.some((t) => vocabTags.includes(t)));
      expect(hasAnyTargetTag).toBe(true);
    }
  });

  it('reports PoolShortageError when available questions with requested tag are insufficient', () => {
    const scarceTag = 'grammar:te_wa_dame';

    // Only 3 candidates with this tag, but user asked for 10
    const pool = Array.from({ length: 3 }, (_, i) =>
      makeTaggedCandidate(500 + i, 'grammar', 'grammar_form', [scarceTag], 'N4'),
    );

    expect(() =>
      generatePracticeExam({
        config: {
          level: 'N4',
          skills: ['grammar'],
          mondaiTypes: ['grammar_form'],
          questionCount: 10,
          pool: 'tagged',
          tagIds: [scarceTag],
        },
        pool,
        seed: 999,
      }),
    ).toThrow(PoolShortageError);
  });
});
