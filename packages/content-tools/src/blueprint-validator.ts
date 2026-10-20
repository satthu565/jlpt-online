import type {
  Exam,
  Group,
  BlueprintDefinition,
  BlueprintValidationResult,
  MondaiType,
} from './types.js';

/**
 * Validates an exam against a blueprint definition (Feature PDF-23, Task I21).
 *
 * Rules:
 * - For original exams (`exam.kind === 'original'`):
 *   Blueprint defines the structural skeleton:
 *   1. Must have all required sections according to level/blueprint, in correct order.
 *   2. All mondaiTypes present in exam must exist in blueprint for that section (no unknown mondaiTypes).
 *   3. Deviation in question count per mondaiType, total questions, or durationSec is ONLY a WARNING
 *      (recorded with actual count and blueprint reference count e.g. 10/11), not blocking import/review/publish.
 * - For practice/synthetic/mixed exams:
 *   Strict alignment with blueprint question counts is enforced as ERRORS.
 * - Missing section, incorrect section order, or unknown mondaiType is always an ERROR regardless of exam kind.
 */
export function validateExamAgainstBlueprint(
  exam: Exam,
  groups: Group[],
  blueprint: BlueprintDefinition,
): BlueprintValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isOriginal = exam.kind === 'original';

  const groupMap = new Map<string, Group>();
  for (const g of groups) {
    groupMap.set(g.id, g);
  }

  // Calculate blueprint total expected questions
  let expectedTotalQuestions = 0;
  for (const bpSec of blueprint.sections) {
    for (const m of bpSec.mondai) {
      expectedTotalQuestions += m.questionCount;
    }
  }

  if (exam.totalQuestions !== expectedTotalQuestions) {
    if (isOriginal) {
      warnings.push(
        `/exam/totalQuestions: tổng số câu thực tế (${exam.totalQuestions}) khác số tham chiếu blueprint (${expectedTotalQuestions}) (${exam.totalQuestions}/${expectedTotalQuestions})`,
      );
    } else {
      errors.push(
        `/exam/totalQuestions: tổng số câu (${exam.totalQuestions}) không khớp cấu trúc blueprint (${expectedTotalQuestions})`,
      );
    }
  }

  // Check sections count
  if (exam.sections.length !== blueprint.sections.length) {
    errors.push(
      `/exam/sections: số phần thi (${exam.sections.length}) không khớp với blueprint (${blueprint.sections.length})`,
    );
  }

  for (let sIdx = 0; sIdx < blueprint.sections.length; sIdx++) {
    const bpSec = blueprint.sections[sIdx]!;
    const sp = `/exam/sections/${sIdx}`;

    const examSec = exam.sections.find((s) => s.code === bpSec.code);
    if (!examSec) {
      errors.push(`/exam/sections: thiếu phần thi ${bpSec.code} theo blueprint`);
      continue;
    }

    if (exam.sections[sIdx] && exam.sections[sIdx]!.code !== bpSec.code) {
      errors.push(
        `${sp}: thứ tự phần thi (${exam.sections[sIdx]!.code}) không khớp với blueprint (${bpSec.code})`,
      );
    }

    if (examSec.durationSec !== null && examSec.durationSec !== bpSec.durationSec) {
      warnings.push(
        `${sp}/durationSec: thời lượng (${examSec.durationSec}s) khác với cấu trúc blueprint (${bpSec.durationSec}s)`,
      );
    }

    // Count actual questions by mondaiType in this section
    const actualMondaiCounts = new Map<MondaiType, number>();
    for (const gid of examSec.groupIds) {
      const g = groupMap.get(gid);
      if (g) {
        const count = actualMondaiCounts.get(g.mondaiType) ?? 0;
        actualMondaiCounts.set(g.mondaiType, count + g.questions.length);
      }
    }

    const expectedMondaiTypes = new Set<MondaiType>();
    for (const m of bpSec.mondai) {
      expectedMondaiTypes.add(m.type);
      const actualCount = actualMondaiCounts.get(m.type) ?? 0;
      if (actualCount !== m.questionCount) {
        if (isOriginal) {
          warnings.push(
            `${sp}/mondai/${m.type}: số câu thực tế (${actualCount}) khác số tham chiếu blueprint (${m.questionCount}) (${actualCount}/${m.questionCount})`,
          );
        } else {
          errors.push(
            `${sp}/mondai/${m.type}: số câu (${actualCount}) không khớp cấu trúc blueprint (${m.questionCount})`,
          );
        }
      }
    }

    // Check for unexpected mondai types in section
    for (const actualType of actualMondaiCounts.keys()) {
      if (!expectedMondaiTypes.has(actualType)) {
        errors.push(
          `${sp}/mondai/${actualType}: dạng mondai không có trong cấu trúc blueprint của phần ${bpSec.code}`,
        );
      }
    }
  }

  // Check for unexpected extra sections not present in blueprint
  for (let sIdx = 0; sIdx < exam.sections.length; sIdx++) {
    const sec = exam.sections[sIdx]!;
    if (!blueprint.sections.some((b) => b.code === sec.code)) {
      errors.push(`/exam/sections/${sIdx}: phần thi ${sec.code} không có trong blueprint`);
    }
  }

  let actualTotalQuestions = 0;
  for (const g of groups) {
    actualTotalQuestions += g.questions.length;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    expectedTotalQuestions,
    actualTotalQuestions,
  };
}
