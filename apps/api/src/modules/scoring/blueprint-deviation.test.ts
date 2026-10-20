import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  generateMixedExam,
  calculateStandardExamResult,
  type CandidateGroup,
} from '@jlpt/exam-engine';
import type { Blueprint, ExamAnswerKey, BlueprintScoring } from '@jlpt/schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../../../..');
const N3_BLUEPRINT_PATH = path.join(ROOT, 'packages/schema/fixtures/blueprints/synthetic-n3.json');

function loadN3Blueprint(): Blueprint {
  return JSON.parse(fs.readFileSync(N3_BLUEPRINT_PATH, 'utf-8')) as Blueprint;
}

describe('Task I21: Blueprint: Đề trộn sinh đúng số câu tham chiếu & Chấm điểm đề gốc dùng số câu thật', () => {
  const n3Bp = loadN3Blueprint();

  // --------------------------------------------------------------------------
  // Acceptance 3: Test: đề trộn N3 sinh đúng số câu tham chiếu
  // --------------------------------------------------------------------------
  it('Acceptance 3: đề trộn N3 sinh đúng số câu tham chiếu', () => {
    // Create candidate pool for N3 containing groups for all required mondai types
    const sessions = ['2023-07', '2023-12'];
    const pool: CandidateGroup[] = [];

    const allSkills = Array.from(new Set(n3Bp.sections.flatMap((s) => s.mondai.map((m) => m.skill))));
    const allMondaiTypes = Array.from(new Set(n3Bp.sections.flatMap((s) => s.mondai.map((m) => m.type))));

    for (const section of n3Bp.sections) {
      for (const mon of section.mondai) {
        for (const session of sessions) {
          // Provide enough candidate groups with single questions
          for (let i = 0; i < mon.questionCount; i++) {
            const groupId = crypto.randomUUID();
            const questionId = crypto.randomUUID();
            pool.push({
              groupId,
              sourceSession: session,
              sourceId: `src-${session}`,
              level: 'N3',
              sectionCode: section.code,
              mondaiType: mon.type,
              skill: mon.skill,
              questions: [{ id: questionId, difficulty: 0.5, exposureCount: 0 }],
              questionCount: 1,
              isApproved: true,
              hasAnswerKeys: true,
              hasMedia: true,
              mediaKeys: mon.skill === 'listening' ? ['audio.mp3'] : undefined,
              license: {
                remixAllowed: true,
                displayAllowed: true,
              },
              averageDifficulty: 0.5,
              maxExposure: 0,
            });
          }
        }
      }
    }

    const mixedResult = generateMixedExam({
      blueprint: n3Bp,
      config: {
        level: 'N3',
        sourceSessions: sessions,
        sourceWeights: { '2023-07': 0.5, '2023-12': 0.5 },
        skills: allSkills,
        mondaiTypes: allMondaiTypes,
        mode: 'Random',
        seed: 42,
        blueprintVersion: 1,
      },
      pool,
    });

    expect(mixedResult.generatedExam.blueprintConformant).toBe(true);

    // Calculate blueprint total expected questions
    let expectedTotal = 0;
    for (const sec of n3Bp.sections) {
      for (const m of sec.mondai) {
        expectedTotal += m.questionCount;
      }
    }
    const totalSelectedQuestions = mixedResult.selectedGroups.reduce(
      (sum, g) => sum + g.questionCount,
      0,
    );
    expect(totalSelectedQuestions).toBe(expectedTotal);

    // Verify every mondai in the generated exam has EXACTLY the reference question count
    for (const sec of n3Bp.sections) {
      for (const mon of sec.mondai) {
        const actualCount = mixedResult.selectedGroups
          .filter((g) => g.mondaiType === mon.type)
          .reduce((sum, g) => sum + g.questionCount, 0);
        expect(actualCount).toBe(mon.questionCount);
      }
    }

    // Specifically verify 問題3 (contextual) has exact reference count (11)
    const mondai3Count = mixedResult.selectedGroups
      .filter((g) => g.mondaiType === 'contextual')
      .reduce((sum, g) => sum + g.questionCount, 0);
    expect(mondai3Count).toBe(11);
  });

  // --------------------------------------------------------------------------
  // Acceptance 4: Test: chấm điểm đề gốc dùng số câu thật
  // --------------------------------------------------------------------------
  it('Acceptance 4: chấm điểm đề gốc dùng số câu thật (tính theo actual question count, không theo blueprint)', () => {
    // Consider a scoring section with maxScaled = 60
    // Suppose an original exam has 10 questions in this section instead of reference 11
    const actualQuestionCount = 10;
    const blueprintReferenceCount = 11;

    const answerKey: ExamAnswerKey = {
      examId: 'original-exam-n3',
      version: 1,
      keys: Array.from({ length: actualQuestionCount }, () => 1),
      skills: Array.from({ length: actualQuestionCount }, () => 'vocabulary'),
      mondaiTypes: Array.from({ length: actualQuestionCount }, () => 'contextual'),
      sectionRanges: [[0, actualQuestionCount - 1]],
    };

    const scoringConfig: BlueprintScoring = {
      method: 'linear_reference',
      rounding: 'round',
      scoringSections: [
        {
          code: 'language',
          label: 'Ngôn ngữ',
          skills: ['vocabulary'],
          maxScaled: 60,
          minPass: 19,
        },
      ],
      totalMax: 60,
      totalPass: 19,
    };

    // Candidate answers all 10 questions correctly
    const perfectAnswers = Array.from({ length: actualQuestionCount }, () => 1);
    const perfectResult = calculateStandardExamResult(perfectAnswers, answerKey, scoringConfig);

    const scoredSec = perfectResult.scoring.sections[0]!;
    // rawMax must be 10 (the actual questions in the exam), NOT 11 (the blueprint question count)
    expect(scoredSec.rawMax).toBe(actualQuestionCount);
    expect(scoredSec.raw).toBe(actualQuestionCount);
    // Scaled score must be 10/10 * 60 = 60
    // If it had incorrectly divided by blueprintReferenceCount (11), it would be 10/11 * 60 = 55
    expect(scoredSec.scaled).toBe(60);
    expect(scoredSec.passed).toBe(true);

    // Candidate answers 5 out of 10 questions correctly (50%)
    const halfAnswers = [1, 1, 1, 1, 1, 2, 2, 2, 2, 2];
    const halfResult = calculateStandardExamResult(halfAnswers, answerKey, scoringConfig);
    const halfSec = halfResult.scoring.sections[0]!;
    expect(halfSec.rawMax).toBe(10);
    expect(halfSec.raw).toBe(5);
    // Scaled score must be 5/10 * 60 = 30
    // If it had incorrectly divided by 11, it would be 5/11 * 60 = 27
    expect(halfSec.scaled).toBe(30);

    expect(actualQuestionCount).not.toBe(blueprintReferenceCount);
  });
});
