import { BlueprintSchema, type Blueprint } from '@jlpt/schema';
import type { BlueprintValidationResult } from './types.js';

export class BlueprintValidationError extends Error {
  constructor(message: string, public readonly errors: string[]) {
    super(message);
    this.name = 'BlueprintValidationError';
  }
}

/**
 * Validates an exam blueprint against JLPT blueprint specifications (Acceptance 6 & 7)
 *
 * Rules:
 * - Conforms to BlueprintSchema.
 * - Sections and mondai must have positive question counts and durations (> 0).
 * - TotalMax must equal sum of maxScaled across all scoring sections.
 * - All skills tested in sections must be mapped to at least one scoring section.
 * - Official blueprints require official source references (jlpt.jp) and cannot have zero placeholders.
 */
export function validateBlueprint(blueprint: unknown): BlueprintValidationResult {
  const parseResult = BlueprintSchema.safeParse(blueprint);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!parseResult.success) {
    for (const issue of parseResult.error.issues) {
      errors.push(`[${issue.path.join('.')}] ${issue.message}`);
    }
    return {
      valid: false,
      errors,
      warnings,
      isOfficial: false,
      canActivate: false,
      totalDurationSec: 0,
      totalQuestions: 0,
    };
  }

  const bp = parseResult.data;
  const isOfficial = bp.kind === 'official' || Boolean(bp.isOfficial);

  if (bp.sections.length === 0) {
    errors.push('Blueprint phải có ít nhất một phần thi.');
  }

  let totalDurationSec = 0;
  let totalQuestions = 0;
  const skillsUsed = new Set<string>();

  for (let sIdx = 0; sIdx < bp.sections.length; sIdx++) {
    const sec = bp.sections[sIdx]!;
    if (sec.durationSec <= 0) {
      errors.push(`Phần thi ${sec.code}: Thời lượng (${sec.durationSec}s) phải lớn hơn 0.`);
    }
    totalDurationSec += sec.durationSec;

    if (sec.mondai.length === 0) {
      errors.push(`Phần thi ${sec.code}: Phải chứa ít nhất một dạng 問題.`);
    }

    for (let mIdx = 0; mIdx < sec.mondai.length; mIdx++) {
      const mon = sec.mondai[mIdx]!;
      if (mon.questionCount <= 0) {
        errors.push(
          `Phần thi ${sec.code}, dạng ${mon.type}: Số câu hỏi (${mon.questionCount}) phải lớn hơn 0.`,
        );
      }
      totalQuestions += mon.questionCount;
      skillsUsed.add(mon.skill);
    }
  }

  // Scoring validation
  const scoring = bp.scoring;
  let sumMaxScaled = 0;
  const coveredSkills = new Set<string>();

  for (const sSec of scoring.scoringSections) {
    if (sSec.maxScaled <= 0) {
      errors.push(`Phần tính điểm ${sSec.code}: Điểm tối đa (${sSec.maxScaled}) phải lớn hơn 0.`);
    }
    sumMaxScaled += sSec.maxScaled;
    for (const sk of sSec.skills) {
      coveredSkills.add(sk);
    }
  }

  if (sumMaxScaled !== scoring.totalMax) {
    errors.push(
      `Tổng điểm tối đa (${scoring.totalMax}) không khớp với tổng maxScaled của các phần điểm (${sumMaxScaled}).`,
    );
  }

  if (scoring.totalPass > scoring.totalMax) {
    errors.push(`Điểm đỗ (${scoring.totalPass}) không được vượt quá điểm tối đa (${scoring.totalMax}).`);
  }

  // Check if all tested skills are covered by scoring sections
  for (const skill of skillsUsed) {
    if (!coveredSkills.has(skill)) {
      warnings.push(`Kỹ năng "${skill}" có câu hỏi trong đề nhưng chưa nằm trong phần tính điểm nào.`);
    }
  }

  // Official blueprint specific checks
  if (isOfficial) {
    if (!bp.sourceRef || bp.sourceRef.length === 0) {
      errors.push('Blueprint chính thức bắt buộc phải có nguồn tham chiếu (sourceRef).');
    } else {
      const hasOfficialDomain = bp.sourceRef.some((ref) => ref.url.includes('jlpt.jp'));
      if (!hasOfficialDomain) {
        errors.push('Blueprint chính thức phải có nguồn tham chiếu từ jlpt.jp.');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    isOfficial,
    canActivate: errors.length === 0 && !isOfficial, // Official can only activate when confirmed
    totalDurationSec,
    totalQuestions,
  };
}

/**
 * Asserts blueprint validity, throwing BlueprintValidationError if invalid
 */
export function assertValidBlueprint(blueprint: unknown): Blueprint {
  const result = validateBlueprint(blueprint);
  if (!result.valid) {
    throw new BlueprintValidationError(
      `Blueprint không hợp lệ: ${result.errors.join('; ')}`,
      result.errors,
    );
  }
  return blueprint as Blueprint;
}

/**
 * Determines whether a blueprint can be activated based on external prerequisites (Acceptance 6)
 *
 * Rules:
 * - Synthetic blueprints can be activated immediately for demo/practice.
 * - Official blueprints CANNOT be activated until 'jlpt-blueprints' external prerequisite is confirmed.
 */
export function canActivateBlueprint(
  blueprint: Blueprint,
  externalPrerequisites?: { 'jlpt-blueprints'?: string },
): { canActivate: boolean; reason?: string } {
  const isOfficial = blueprint.kind === 'official' || Boolean(blueprint.isOfficial);

  if (!isOfficial) {
    return { canActivate: true };
  }

  const blueprintPrereq = externalPrerequisites?.['jlpt-blueprints'];
  if (blueprintPrereq === 'CONFIRMED' || blueprintPrereq === 'READY') {
    return { canActivate: true };
  }

  return {
    canActivate: false,
    reason:
      "Blueprint chính thức chỉ kích hoạt khi jlpt-blueprints được xác nhận; trước đó chỉ blueprint synthetic.",
  };
}
