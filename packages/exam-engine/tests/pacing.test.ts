import { describe, it, expect } from 'vitest';
import type { Blueprint, BlueprintSection, Level, MondaiType } from '@jlpt/schema';
import {
  MONDAI_TYPE_NAMES,
  RECOMMENDED_MONDAI_PACE,
  STANDARD_PACING_MODELS,
  calculateBlueprintPacing,
  calculateExamBlueprintPacing,
  evaluatePacing,
  getAllPacingModels,
  getPacingModel,
} from '../src/pacing.js';

describe('P01: JLPT Exam Pacing Model and Progress Milestones', () => {
  const ALL_LEVELS: Level[] = ['N1', 'N2', 'N3', 'N4', 'N5'];

  describe('Standard Pacing Models Coverage across N1–N5', () => {
    it('provides valid pacing models for all 5 levels', () => {
      expect(STANDARD_PACING_MODELS.N1).toBeDefined();
      expect(STANDARD_PACING_MODELS.N5).toBeDefined();

      for (const level of ALL_LEVELS) {
        const models = getAllPacingModels(level);
        expect(models.length).toBeGreaterThanOrEqual(2);

        for (const model of models) {
          expect(model.level).toBe(level);
          expect(model.totalDurationSec).toBeGreaterThan(0);
          expect(model.totalQuestions).toBeGreaterThan(0);
          expect(model.mondaiPacing.length).toBeGreaterThan(0);
          expect(model.milestones.length).toBeGreaterThan(0);

          // Verify sum of question counts matches totalQuestions
          const sumQ = model.mondaiPacing.reduce((acc, m) => acc + m.questionCount, 0);
          expect(sumQ).toBe(model.totalQuestions);

          // Verify milestones have monotonically increasing elapsed time
          let lastElapsed = 0;
          let lastQ = 0;
          for (const ms of model.milestones) {
            expect(ms.targetElapsedSec).toBeGreaterThanOrEqual(lastElapsed);
            expect(ms.targetQuestionIndex).toBeGreaterThanOrEqual(lastQ);
            expect(ms.targetRemainingSec).toBeGreaterThanOrEqual(0);
            expect(ms.cumulativePercent).toBeGreaterThan(0);
            expect(ms.cumulativePercent).toBeLessThanOrEqual(100);
            lastElapsed = ms.targetElapsedSec;
            lastQ = ms.targetQuestionIndex;
          }
        }
      }
    });

    it('covers all official MondaiTypes with recommended timing in RECOMMENDED_MONDAI_PACE', () => {
      const allMondaiTypes: MondaiType[] = [
        'kanji_reading',
        'orthography',
        'word_formation',
        'contextual',
        'paraphrase',
        'usage',
        'grammar_form',
        'sentence_composition',
        'text_grammar',
        'comprehension_short',
        'comprehension_mid',
        'comprehension_long',
        'integrated_reading',
        'thematic',
        'info_retrieval',
        'task_based',
        'point',
        'summary',
        'utterance',
        'quick_response',
        'integrated_listening',
      ];

      for (const mType of allMondaiTypes) {
        expect(MONDAI_TYPE_NAMES[mType]).toBeDefined();
        // At least one level must have recommended pace for this mondai type
        const hasPace = ALL_LEVELS.some((lvl) => RECOMMENDED_MONDAI_PACE[lvl][mType] !== undefined);
        expect(hasPace).toBe(true);
      }
    });

    it('retrieves specific section models by code for N1', () => {
      const s1 = getPacingModel('N1', 'language_reading');
      expect(s1.sectionCode).toBe('language_reading');
      expect(s1.totalDurationSec).toBe(6600); // 110 minutes
      expect(s1.totalQuestions).toBe(70);

      const s2 = getPacingModel('N1', 'listening');
      expect(s2.sectionCode).toBe('listening');
      expect(s2.totalDurationSec).toBe(3600); // 60 minutes
    });

    it('retrieves specific section models for N4/N5 (including 2020 updated durations)', () => {
      // N4 Vocab was revised to 25 min (1500s)
      const n4Vocab = getPacingModel('N4', 'language_vocab');
      expect(n4Vocab.totalDurationSec).toBe(1500);

      // N5 Vocab was revised to 20 min (1200s), Grammar/Reading to 40 min (2400s)
      const n5Vocab = getPacingModel('N5', 'language_vocab');
      expect(n5Vocab.totalDurationSec).toBe(1200);

      const n5GrammarReading = getPacingModel('N5', 'language_grammar_reading');
      expect(n5GrammarReading.totalDurationSec).toBe(2400);
    });
  });

  describe('Pace Evaluation Logic (evaluatePacing)', () => {
    it('detects ON_TRACK status when examinee pace matches expected question target', () => {
      // In N1 language_reading: Q25 target is at ~1435s (~24 min). At elapsed 1435s and Q25:
      const evalResult = evaluatePacing({
        level: 'N1',
        sectionCode: 'language_reading',
        currentQuestionIndex: 25,
        elapsedSec: 1435,
      });

      expect(evalResult.paceStatus).toBe('ON_TRACK');
      expect(Math.abs(evalResult.diffQuestions)).toBeLessThanOrEqual(1);
      expect(evalResult.message).toContain('đúng chuẩn');
      expect(evalResult.recommendedPacePerRemainingQuestionSec).toBeGreaterThan(0);
    });

    it('detects AHEAD status when examinee is working faster than target schedule', () => {
      // At elapsed 1000s, examinee is already at Q35 (ahead of Q18 target)
      const evalResult = evaluatePacing({
        level: 'N1',
        sectionCode: 'language_reading',
        currentQuestionIndex: 35,
        elapsedSec: 1000,
      });

      expect(evalResult.paceStatus).toBe('AHEAD');
      expect(evalResult.diffQuestions).toBeGreaterThanOrEqual(2);
      expect(evalResult.message).toContain('nhanh hơn');
    });

    it('detects AHEAD status when examinee is ahead in time with diffSec between 61s and 89s (diffQuestions = 0 or 1)', () => {
      // In N1 language_reading: Q25 target expectedElapsedSec is around 1435s.
      // If elapsedSec is 1360s (diffSec = +75s), diffQuestions = 0:
      const evalResult = evaluatePacing({
        level: 'N1',
        sectionCode: 'language_reading',
        currentQuestionIndex: 25,
        elapsedSec: 1360, // 75s faster than target 1435s
      });

      expect(evalResult.diffSec).toBe(75);
      expect(evalResult.paceStatus).toBe('AHEAD');
      expect(evalResult.message).toContain('nhanh hơn');
      expect(evalResult.message).not.toContain('chậm');
    });

    it('detects ON_TRACK when within tolerance (+/-1 question and +/-60s)', () => {
      // At elapsed 1410s and Q25 (expected ~1435s, diffSec = +25s, diffQuestions = 0):
      const evalResult = evaluatePacing({
        level: 'N1',
        sectionCode: 'language_reading',
        currentQuestionIndex: 25,
        elapsedSec: 1410,
      });

      expect(evalResult.paceStatus).toBe('ON_TRACK');
      expect(evalResult.message).toContain('đúng chuẩn');
    });

    it('detects BEHIND status when examinee is lagging moderately', () => {
      // At elapsed 2500s, expected is around Q43, examinee is at Q41 (2 questions behind)
      const evalResult = evaluatePacing({
        level: 'N1',
        sectionCode: 'language_reading',
        currentQuestionIndex: 41,
        elapsedSec: 2500,
      });

      expect(evalResult.paceStatus).toBe('BEHIND');
      expect(evalResult.diffQuestions).toBeLessThan(0);
      expect(evalResult.message).toContain('chậm hơn');
    });

    it('detects CRITICAL status when examinee is severely behind schedule', () => {
      // At elapsed 5000s in 6600s section, examinee is only at question 30 (out of 71)
      const evalResult = evaluatePacing({
        level: 'N1',
        sectionCode: 'language_reading',
        currentQuestionIndex: 30,
        elapsedSec: 5000,
      });

      expect(evalResult.paceStatus).toBe('CRITICAL');
      expect(evalResult.diffQuestions).toBeLessThan(-3);
      expect(evalResult.message).toContain('Cảnh báo');
    });

    it('identifies nearest upcoming milestone correctly', () => {
      const evalResult = evaluatePacing({
        level: 'N1',
        sectionCode: 'language_reading',
        currentQuestionIndex: 15, // within Mondai 1–4
        elapsedSec: 600,
      });

      expect(evalResult.currentMilestone).toBeDefined();
      expect(evalResult.currentMilestone?.targetQuestionIndex).toBeGreaterThanOrEqual(15);
      expect(evalResult.currentMilestone?.label).toContain('Từ vựng');
    });
  });

  describe('Dynamic Blueprint Pacing Calculation (calculateBlueprintPacing)', () => {
    it('dynamically generates section pacing model and milestones from a BlueprintSection', () => {
      const customSection: BlueprintSection = {
        code: 'custom_section_1',
        title: 'Phần thi thử nghiệm ngữ pháp đọc hiểu',
        durationSec: 3000,
        mondai: [
          { type: 'grammar_form', skill: 'grammar', questionCount: 10 },
          { type: 'sentence_composition', skill: 'grammar', questionCount: 5 },
          { type: 'comprehension_short', skill: 'reading', questionCount: 4 },
        ],
      };

      const model = calculateBlueprintPacing(customSection, 'N2');
      expect(model.level).toBe('N2');
      expect(model.sectionCode).toBe('custom_section_1');
      expect(model.totalDurationSec).toBe(3000);
      expect(model.totalQuestions).toBe(19); // 10 + 5 + 4
      expect(model.mondaiPacing).toHaveLength(3);

      expect(model.mondaiPacing[0]?.mondaiType).toBe('grammar_form');
      expect(model.mondaiPacing[0]?.questionCount).toBe(10);
      expect(model.mondaiPacing[0]?.recommendedSecPerQuestion).toBe(50); // N2 grammar_form

      expect(model.milestones.length).toBeGreaterThan(0);
      const lastMilestone = model.milestones[model.milestones.length - 1]!;
      expect(lastMilestone.targetQuestionIndex).toBe(19);
    });

    it('calculates pacing for all sections of a multi-section Blueprint via calculateExamBlueprintPacing', () => {
      const fullBlueprint: Blueprint = {
        level: 'N2',
        version: 1,
        effectiveFrom: '2026-10',
        sourceRef: [{ url: 'https://www.jlpt.jp', accessedAt: '2026-10-18' }],
        sections: [
          {
            code: 'sec_lang_reading',
            title: 'Ngôn ngữ & Đọc hiểu',
            durationSec: 4200,
            mondai: [
              { type: 'kanji_reading', skill: 'kanji', questionCount: 5 },
              { type: 'orthography', skill: 'kanji', questionCount: 5 },
            ],
          },
          {
            code: 'sec_listening',
            title: 'Nghe hiểu',
            durationSec: 2100,
            mondai: [
              { type: 'task_based', skill: 'listening', questionCount: 5 },
              { type: 'point', skill: 'listening', questionCount: 6 },
            ],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            {
              code: 'total',
              label: 'Total',
              skills: ['kanji', 'listening'],
              maxScaled: 180,
              minPass: 90,
            },
          ],
          totalMax: 180,
          totalPass: 90,
        },
      };

      const sectionModels = calculateExamBlueprintPacing(fullBlueprint);
      expect(sectionModels).toHaveLength(2);
      expect(sectionModels[0]?.sectionCode).toBe('sec_lang_reading');
      expect(sectionModels[0]?.totalDurationSec).toBe(4200);
      expect(sectionModels[1]?.sectionCode).toBe('sec_listening');
      expect(sectionModels[1]?.totalDurationSec).toBe(2100);
    });
  });
});
