import type { Blueprint, Level, MondaiType, Skill } from '@jlpt/schema';
import type { MixedExamValidationResult } from './types.js';

export interface QuestionGroupCandidate {
  groupId: string;
  level: Level;
  mondaiType: MondaiType;
  skill: Skill;
  questionCount: number;
  isApproved: boolean;
  hasMedia: boolean;
  hasAnswerKeys: boolean;
}

export interface CandidateExamStructure {
  level: Level;
  sections: Array<{
    code: string;
    mondai: Array<{
      type: MondaiType;
      skill: Skill;
      questionCount: number;
      selectedGroupIds: string[];
    }>;
  }>;
}

/**
 * Validates exam mixing conformity against blueprint specifications according to 6 rules (SYS-16)
 *
 * Rules:
 * 1. Only mix questions of the same level as the target blueprint.
 * 2. Only mix questions within the same mondai_type.
 * 3. Unit of selection is QuestionGroup (reading passage & audio remain bound to their questions).
 * 4. Verify question counts and section structure match target blueprint.
 * 5. Only approved questions with verified answer keys and media.
 * 6. Deterministic reproduction via seeds and configs.
 */
export function verifyMixedExamConformity(
  blueprint: Blueprint,
  candidate: CandidateExamStructure,
): MixedExamValidationResult {
  const errors: string[] = [];

  // Rule 1: Level conformity
  if (candidate.level !== blueprint.level) {
    errors.push(
      `Đề trộn có cấp độ (${candidate.level}) không khớp với blueprint (${blueprint.level}).`,
    );
  }

  // Rule 4: Section structure conformity
  if (candidate.sections.length !== blueprint.sections.length) {
    errors.push(
      `Số lượng phần thi của đề trộn (${candidate.sections.length}) không khớp với blueprint (${blueprint.sections.length}).`,
    );
  }

  for (let sIdx = 0; sIdx < blueprint.sections.length; sIdx++) {
    const bpSec = blueprint.sections[sIdx]!;
    const candSec = candidate.sections[sIdx];

    if (!candSec) continue;

    if (candSec.code !== bpSec.code) {
      errors.push(
        `Phần thi ${sIdx + 1}: Mã phần thi (${candSec.code}) không khớp với blueprint (${bpSec.code}).`,
      );
    }

    if (candSec.mondai.length !== bpSec.mondai.length) {
      errors.push(
        `Phần thi ${bpSec.code}: Số dạng 問題 (${candSec.mondai.length}) không khớp với blueprint (${bpSec.mondai.length}).`,
      );
      continue;
    }

    for (let mIdx = 0; mIdx < bpSec.mondai.length; mIdx++) {
      const bpMon = bpSec.mondai[mIdx]!;
      const candMon = candSec.mondai[mIdx]!;

      // Rule 2: Mondai type match
      if (candMon.type !== bpMon.type) {
        errors.push(
          `Phần ${bpSec.code}, dạng ${mIdx + 1}: Dạng 問題 (${candMon.type}) không khớp với blueprint (${bpMon.type}).`,
        );
      }

      // Rule 4: Question count match
      if (candMon.questionCount !== bpMon.questionCount) {
        errors.push(
          `Phần ${bpSec.code}, dạng ${bpMon.type}: Số câu hỏi (${candMon.questionCount}) không khớp với blueprint (${bpMon.questionCount}).`,
        );
      }

      // Rule 3: Unit of selection is QuestionGroup
      if (!candMon.selectedGroupIds || candMon.selectedGroupIds.length === 0) {
        errors.push(
          `Phần ${bpSec.code}, dạng ${bpMon.type}: Phải chọn ít nhất một QuestionGroup hợp lệ.`,
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Filter candidates meeting Rule 5 (approved, complete answer keys, verified media)
 */
export function filterEligiblePoolGroups(
  candidates: QuestionGroupCandidate[],
  targetLevel: Level,
): QuestionGroupCandidate[] {
  return candidates.filter(
    (g) =>
      g.level === targetLevel &&
      g.isApproved &&
      g.hasAnswerKeys &&
      g.hasMedia,
  );
}
