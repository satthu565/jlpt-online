import crypto from 'node:crypto';
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
  type TimelineEntry,
} from '../src/index.js';

const ROOT = path.resolve(__dirname, '../../..');
const N3_BLUEPRINT_PATH = path.join(ROOT, 'packages/schema/fixtures/blueprints/synthetic-n3.json');

function loadN3Blueprint(): BlueprintDefinition {
  return JSON.parse(fs.readFileSync(N3_BLUEPRINT_PATH, 'utf-8')) as BlueprintDefinition;
}

function createDummyQuestion(id: string, number: string, skill: SkillType, mondaiType?: MondaiType): Question {
  const stem =
    mondaiType === 'sentence_composition'
      ? [
          { t: 'text' as const, text: `Câu hỏi sắp xếp số ${number}: ` },
          { t: 'blank' as const, label: '1' },
          { t: 'blank' as const, label: '2' },
          { t: 'star' as const },
          { t: 'blank' as const, label: '3' },
        ]
      : [{ t: 'text' as const, text: `Nội dung câu hỏi ${id} số ${number}` }];

  return {
    id,
    number,
    skill,
    stem,
    options: [
      { label: '1', content: [{ t: 'text' as const, text: `Lựa chọn 1 của câu ${number}` }] },
      { label: '2', content: [{ t: 'text' as const, text: `Lựa chọn 2 của câu ${number}` }] },
      { label: '3', content: [{ t: 'text' as const, text: `Lựa chọn 3 của câu ${number}` }] },
      { label: '4', content: [{ t: 'text' as const, text: `Lựa chọn 4 của câu ${number}` }] },
    ],
    correctOption: 1,
    sourcePages: [],
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
  const mediaList: ImportPackageV2['media'] = [];
  let globalQuestionNumber = 1;

  const sections = bp.sections
    .filter((sec) => (includeListening ? true : sec.code !== 'listening'))
    .map((sec, sIdx) => {
      const groupIds: string[] = [];
      const listeningTimeline: TimelineEntry[] = [];
      let timelineTimeMs = 0;

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

        const groupMediaKeys: string[] = [];
        if (sec.code === 'listening') {
          const hash = crypto.createHash('sha256').update(gid).digest('hex');
          const mediaPath = `media/${hash}.mp3`;
          groupMediaKeys.push(mediaPath);
          mediaList.push({
            path: mediaPath,
            sha256: hash,
            mimeType: 'audio/mpeg',
            durationMs: 60000,
            width: null,
            height: null,
          });

          listeningTimeline.push({
            groupId: gid,
            mediaKey: mediaPath,
            startMs: timelineTimeMs,
            endMs: timelineTimeMs + 2000,
            audioStartMs: 0,
            audioEndMs: 2000,
            gapAfterMs: 1000,
          });
          timelineTimeMs += 3000;
        }

        const questions: Question[] = [];
        for (let q = 1; q <= qCount; q++) {
          const qid = `q-s${sIdx}-m${mIdx}-${q}`;
          const currentNum = String(globalQuestionNumber++);
          questions.push(createDummyQuestion(qid, currentNum, m.skill as SkillType, mType));
        }

        groups.push({
          id: gid,
          sectionCode: sec.code,
          mondaiType: mType,
          orderInSection: mIdx + 1,
          instructions: [{ t: 'text', text: `Hướng dẫn ${m.type}` }],
          passage: [],
          mediaKeys: groupMediaKeys,
          sourcePages: [],
          questions,
          transcript: null,
        });
      });

      return {
        code: sec.code as SectionCode,
        title: sec.title,
        durationSec: sec.durationSec,
        groupIds,
        listeningTimeline,
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
      id: bp.id ?? 'synthetic-n3-blueprint-v1',
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
    media: mediaList,
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
});
