import type {
  Exam,
  Group,
  BlueprintDefinition,
  BlueprintValidationResult,
  MondaiType,
} from './types.js';

/**
 * Validates an exam against a blueprint definition (Feature PDF-23).
 * Verifies:
 * 1. Total questions count matches blueprint expected total
 * 2. Section codes and order match blueprint sections
 * 3. Question count for each mondaiType matches blueprint specifications
 * 4. Error reporting uses specific JSON Pointer paths
 */
export function validateExamAgainstBlueprint(
  exam: Exam,
  groups: Group[],
  blueprint: BlueprintDefinition,
): BlueprintValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

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
    errors.push(
      `/exam/totalQuestions: tổng số câu (${exam.totalQuestions}) không khớp cấu trúc blueprint (${expectedTotalQuestions})`,
    );
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
        errors.push(
          `${sp}/mondai/${m.type}: số câu (${actualCount}) không khớp cấu trúc blueprint (${m.questionCount})`,
        );
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
