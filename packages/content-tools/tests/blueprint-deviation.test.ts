import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  validateExamAgainstBlueprint,
  validateImportData,
  type ImportPackageV2,
  type BlueprintDefinition,
  type Exam,
  type Group,
  type Question,
  type MondaiType,
  type SkillType,
  type SectionCode,
} from '../src/index.js';
import { generateMixedExam, calculateStandardExamResult, type CandidateGroup } from '../../exam-engine/src/index.js';
import type { Blueprint, ExamAnswerKey, BlueprintScoring } from '@jlpt/schema';

const ROOT = path.resolve(__dirname, '../../..');
const N3_BLUEPRINT_PATH = path.join(ROOT, 'packages/schema/fixtures/blueprints/synthetic-n3.json');

function loadN3Blueprint(): BlueprintDefinition {
  return JSON.parse(fs.readFileSync(N3_BLUEPRINT_PATH, 'utf-8')) as BlueprintDefinition;
}

function createDummyQuestion(id: string, number: string, skill: SkillType): Question {
  return {
    id,
    number,
    skill,
    stem: [{ t: 'text', text: `Câu hỏi ${number}` }],
    options: [
      { label: '1', content: [{ t: 'text', text: 'Đáp án 1' }] },
      { label: '2', content: [{ t: 'text', text: 'Đáp án 2' }] },
      { label: '3', content: [{ t: 'text', text: 'Đáp án 3' }] },
      { label: '4', content: [{ t: 'text', text: 'Đáp án 4' }] },
    ],
    correctOption: 1,
    sourcePages: [{ sourceId: 'src-1', page: 1 }],
    explanation: null,
  };
}

function buildN3ExamAndGroups(options?: {
  mondai3Count?: number;
  includeListening?: boolean;
  strangeMondaiType?: MondaiType;
}): { exam: Exam; groups: Group[]; pkg: ImportPackageV2 } {
  const bp = loadN3Blueprint();
  const mondai3Count = options?.mondai3Count ?? 11;
  const includeListening = options?.includeListening ?? true;

  const groups: Group[] = [];
  const sections = bp.sections
    .filter((sec) => (includeListening ? true : sec.code !== 'listening'))
    .map((sec, sIdx) => {
      const groupIds: string[] = [];
      sec.mondai.forEach((m, mIdx) => {
        let qCount = m.questionCount;
        // In Section 0, Mondai 2 (which is Mondai 3: contextual)
        if (sIdx === 0 && mIdx === 2) {
          qCount = mondai3Count;
        }

        const mType: MondaiType =
          sIdx === 0 && mIdx === 0 && options?.strangeMondaiType
            ? options.strangeMondaiType
            : (m.type as MondaiType);

        const gid = `g-s${sIdx}-m${mIdx}`;
        groupIds.push(gid);

        const questions: Question[] = [];
        for (let q = 1; q <= qCount; q++) {
          const qid = `q-s${sIdx}-m${mIdx}-${q}`;
          questions.push(createDummyQuestion(qid, `${questions.length + 1}`, m.skill as SkillType));
        }

        groups.push({
          id: gid,
          sectionCode: sec.code,
          mondaiType: mType,
          orderInSection: mIdx + 1,
          instructions: [{ t: 'text', text: `Hướng dẫn ${m.type}` }],
          passage: [],
          mediaKeys: [],
          sourcePages: [{ sourceId: 'src-1', page: 1 }],
          questions,
          transcript: null,
        });
      });

      return {
        code: sec.code as SectionCode,
        title: sec.title,
        durationSec: sec.durationSec,
        groupIds,
        listeningTimeline: [],
      };
    });

  let totalQuestions = 0;
  for (const g of groups) {
    totalQuestions += g.questions.length;
  }

  const exam: Exam = {
    title: 'JLPT N3 Official Exam July 2023',
    slug: 'jlpt-n3-2023-07-mock',
    kind: 'original',
    blueprintRef: {
      id: bp.id,
      version: bp.version,
    },
    totalQuestions,
    sections,
  };

  const pkg: ImportPackageV2 = {
    formatVersion: 2,
    packageId: '00000000-0000-4000-8000-000000000301',
    revision: 1,
    source: {
      name: 'Đề thi JLPT N3 năm 2023',
      level: 'N3',
      year: 2023,
      session: 7,
      provenance: 'official_past_exam',
      licenseRef: 'official-n3-2023-07',
      rightsStatus: 'owner_confirmed',
    },
    sourceFiles: [],
    exam,
    groups,
    media: [],
    issues: [],
  };

  return { exam, groups, pkg };
}

describe('Task I21: Blueprint: đề gốc được lệch số câu so với số tham chiếu', () => {
  const bp = loadN3Blueprint();

  // --------------------------------------------------------------------------
  // Acceptance 1: Test: đề N3 có 問題3 10 câu (tham chiếu 11) nhập được,
  // readiness không giảm vì số câu, có warning nêu 10/11
  // --------------------------------------------------------------------------
  it('Acceptance 1: đề N3 có 問題3 10 câu (tham chiếu 11) nhập được, readiness không giảm vì số câu, có warning nêu 10/11', () => {
    // 問題3 (contextual) has 10 questions while reference is 11
    const { exam, groups, pkg } = buildN3ExamAndGroups({ mondai3Count: 10 });

    expect(exam.kind).toBe('original');
    // Reference blueprint expects 11 for contextual in section 0
    expect(bp.sections[0]!.mondai[2]!.questionCount).toBe(11);
    expect(groups.find((g) => g.id === 'g-s0-m2')!.questions.length).toBe(10);

    // 1. Direct blueprint validator check
    const bpResult = validateExamAgainstBlueprint(exam, groups, bp);
    expect(bpResult.valid).toBe(true);
    expect(bpResult.errors).toEqual([]);

    // Must have warning stating actual and reference question count (10/11)
    const mondai3Warning = bpResult.warnings.find(
      (w) => w.includes('/mondai/contextual') && w.includes('10/11'),
    );
    expect(mondai3Warning).toBeDefined();
    expect(mondai3Warning).toContain('10/11');
    expect(mondai3Warning).toContain('10');
    expect(mondai3Warning).toContain('11');

    // Also warning for totalQuestions (95/96)
    const totalWarning = bpResult.warnings.find((w) => w.includes('/exam/totalQuestions'));
    expect(totalWarning).toBeDefined();
    expect(totalWarning).toContain('95/96');

    // 2. Full package validation check via validateImportData
    const pkgResult = validateImportData(pkg, { blueprint: bp, mode: 'ready' });
    if (!pkgResult.valid) {
      console.log('pkgResult.errors:', pkgResult.errors);
    }
    expect(pkgResult.valid).toBe(true);
    // Readiness is NOT downgraded to INVALID or DRAFT_ONLY; remains READY_FOR_REVIEW
    expect(pkgResult.readiness).toBe('READY_FOR_REVIEW');
    expect(pkgResult.blockingIssueCount).toBe(0);
    expect(pkgResult.errors).toEqual([]);
    expect(pkgResult.warnings.some((w) => w.includes('10/11'))).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Acceptance 2: Test: đề thiếu section listening hoặc có mondaiType lạ vẫn bị lỗi
  // --------------------------------------------------------------------------
  it('Acceptance 2: đề thiếu section listening hoặc có mondaiType lạ vẫn bị lỗi', () => {
    // Case A: Missing listening section
    const missingListening = buildN3ExamAndGroups({ includeListening: false });
    const resA = validateExamAgainstBlueprint(
      missingListening.exam,
      missingListening.groups,
      bp,
    );
    expect(resA.valid).toBe(false);
    expect(resA.errors.some((e) => e.includes('listening'))).toBe(true);

    const pkgResultA = validateImportData(missingListening.pkg, { blueprint: bp, mode: 'ready' });
    expect(pkgResultA.valid).toBe(false);
    expect(pkgResultA.readiness).toBe('INVALID');
    expect(pkgResultA.errors.some((e) => e.includes('listening'))).toBe(true);

    // Case B: Strange / unexpected mondaiType in section 0
    // (using 'task_based' which belongs to listening, not language_vocab)
    const strangeMondai = buildN3ExamAndGroups({
      strangeMondaiType: 'task_based' as MondaiType,
    });
    const resB = validateExamAgainstBlueprint(
      strangeMondai.exam,
      strangeMondai.groups,
      bp,
    );
    expect(resB.valid).toBe(false);
    expect(
      resB.errors.some(
        (e) =>
          e.includes('/mondai/task_based') &&
          e.includes('không có trong cấu trúc blueprint'),
      ),
    ).toBe(true);

    const pkgResultB = validateImportData(strangeMondai.pkg, { blueprint: bp, mode: 'ready' });
    expect(pkgResultB.valid).toBe(false);
    expect(pkgResultB.readiness).toBe('INVALID');
    expect(
      pkgResultB.errors.some(
        (e) =>
          e.includes('/mondai/task_based') &&
          e.includes('không có trong cấu trúc blueprint'),
      ),
    ).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Acceptance 3: Test: đề trộn N3 sinh đúng số câu tham chiếu
  // --------------------------------------------------------------------------
  it('Acceptance 3: đề trộn N3 sinh đúng số câu tham chiếu', () => {
    const n3Bp = bp as unknown as Blueprint;

    // Create candidate pool for N3 containing groups for all required mondai types
    const sessions = ['2023-07', '2023-12'];
    const pool: CandidateGroup[] = [];

    for (const section of n3Bp.sections) {
      for (const mon of section.mondai) {
        for (const session of sessions) {
          // Provide enough candidate groups with single questions
          for (let i = 0; i < mon.questionCount; i++) {
            pool.push({
              groupId: `cand-${session}-${mon.type}-${i}`,
              sourceSession: session,
              level: 'N3',
              sectionCode: section.code,
              mondaiType: mon.type,
              skill: mon.skill,
              questions: [{ id: `q-${session}-${mon.type}-${i}`, number: `${i + 1}` }],
              questionCount: 1,
              isApproved: true,
              hasAnswerKeys: true,
              hasMedia: false,
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
    expect(mixedResult.generatedExam.totalQuestions).toBe(expectedTotal);

    // Verify every mondai in the generated exam has EXACTLY the reference question count
    for (const sec of mixedResult.generatedExam.sections) {
      const bpSec = n3Bp.sections.find((s) => s.code === sec.code)!;
      for (const mon of sec.mondai) {
        const bpMon = bpSec.mondai.find((m) => m.type === mon.type)!;
        expect(mon.questionCount).toBe(bpMon.questionCount);
      }
    }

    // Specifically verify 問題3 (contextual) has exact reference count (11)
    const vocabSec = mixedResult.generatedExam.sections.find((s) => s.code === 'language_vocab')!;
    const mondai3 = vocabSec.mondai.find((m) => m.type === 'contextual')!;
    expect(mondai3.questionCount).toBe(11);
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
