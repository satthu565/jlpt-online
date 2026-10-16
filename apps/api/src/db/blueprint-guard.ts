import { type Blueprint } from '@jlpt/schema';

export interface BlueprintActivationConfirmation {
  confirmedBy: string; // UUID of operator or project owner
  confirmedAt?: string;
  notes?: string;
}

export class BlueprintActivationError extends Error {
  constructor(message: string, public readonly code: 'OFFICIAL_SOURCE_REQUIRED' | 'CONFIRMATION_REQUIRED' | 'INVALID_STRUCTURE') {
    super(message);
    this.name = 'BlueprintActivationError';
  }
}

/**
 * Blueprint Activation Guard (Acceptance 3)
 * Blueprint thi thật chỉ kích hoạt khi có nguồn chính thức và xác nhận.
 *
 * Rules:
 * - Synthetic blueprints (kind === 'synthetic' or isOfficial === false) can be activated for dev/testing.
 * - Official blueprints (kind === 'official' or isOfficial === true) REQUIRE:
 *   1. Non-empty sourceRef with valid official URL (e.g. jlpt.jp).
 *   2. Explicit confirmation from project owner / authorized operator.
 *   3. All sections durationSec > 0 and questionCount > 0 (no unconfirmed placeholders).
 */
export function activateBlueprint(
  blueprint: Blueprint,
  confirmation?: BlueprintActivationConfirmation,
): Blueprint & { status: 'active'; isConfirmed: boolean; confirmedBy?: string; confirmedAt?: string } {
  const isOfficial = blueprint.kind === 'official' || Boolean(blueprint.isOfficial);

  if (isOfficial) {
    // 1. Verify official source reference
    if (!blueprint.sourceRef || blueprint.sourceRef.length === 0) {
      throw new BlueprintActivationError(
        'Blueprint thi thật yêu cầu có nguồn chính thức (jlpt.jp) trước khi kích hoạt.',
        'OFFICIAL_SOURCE_REQUIRED',
      );
    }

    const hasOfficialUrl = blueprint.sourceRef.some((ref) =>
      ref.url.includes('jlpt.jp'),
    );
    if (!hasOfficialUrl) {
      throw new BlueprintActivationError(
        'Nguồn tham chiếu của blueprint thi thật phải là nguồn chính thức từ jlpt.jp.',
        'OFFICIAL_SOURCE_REQUIRED',
      );
    }

    // 2. Verify project owner / operator confirmation
    if (!confirmation || !confirmation.confirmedBy) {
      throw new BlueprintActivationError(
        'Blueprint thi thật chỉ kích hoạt khi có xác nhận từ chủ dự án hoặc người vận hành có thẩm quyền.',
        'CONFIRMATION_REQUIRED',
      );
    }

    // 3. Verify no zero placeholder values in structure
    for (const section of blueprint.sections) {
      if (section.durationSec <= 0) {
        throw new BlueprintActivationError(
          `Thời gian phần thi ${section.code} phải lớn hơn 0, không được để placeholder 0.`,
          'INVALID_STRUCTURE',
        );
      }
      for (const mondai of section.mondai) {
        if (mondai.questionCount <= 0) {
          throw new BlueprintActivationError(
            `Số câu hỏi dạng ${mondai.type} phải lớn hơn 0, không được để placeholder 0.`,
            'INVALID_STRUCTURE',
          );
        }
      }
    }

    return {
      ...blueprint,
      kind: 'official',
      isOfficial: true,
      status: 'active',
      isConfirmed: true,
      confirmedBy: confirmation.confirmedBy,
      confirmedAt: confirmation.confirmedAt ?? new Date().toISOString(),
    };
  }

  // Synthetic blueprint activation
  return {
    ...blueprint,
    kind: 'synthetic',
    isOfficial: false,
    status: 'active',
    isConfirmed: true,
    confirmedBy: confirmation?.confirmedBy,
    confirmedAt: confirmation?.confirmedAt ?? new Date().toISOString(),
  };
}
