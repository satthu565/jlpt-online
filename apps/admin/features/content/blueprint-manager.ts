import type { Blueprint, Level } from '@jlpt/schema';
import type { StaffUser } from '../../lib/auth-context';

export class BlueprintManagerError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'FORBIDDEN'
      | 'OFFICIAL_SOURCE_REQUIRED'
      | 'CONFIRMATION_REQUIRED'
      | 'INVALID_STRUCTURE'
      | 'IMMUTABLE_VERSION'
      | 'NOT_FOUND',
  ) {
    super(message);
    this.name = 'BlueprintManagerError';
  }
}

export interface BlueprintActivationConfirmation {
  confirmedBy: string;
  notes?: string;
  confirmedAt?: string;
}

/**
 * Blueprint Manager (ADM-08, Acceptance 2)
 * Manages official and synthetic blueprints, versions, and immutable activation.
 */
export class BlueprintManager {
  private blueprints: Map<string, Blueprint[]> = new Map(); // id -> all versions

  constructor(initialBlueprints: Blueprint[] = []) {
    for (const bp of initialBlueprints) {
      const id = bp.id || `bp_${bp.level}_v${bp.version}`;
      const versions = this.blueprints.get(id) ?? [];
      versions.push({ ...bp, id });
      this.blueprints.set(id, versions);
    }
  }

  /**
   * List blueprints. Returns latest version of each level/blueprint.
   */
  public listBlueprints(filter?: { level?: Level; status?: string }): Blueprint[] {
    const list: Blueprint[] = [];
    for (const versions of this.blueprints.values()) {
      if (versions.length === 0) continue;
      const latest = [...versions].sort((a, b) => b.version - a.version)[0]!;

      if (filter?.level && latest.level !== filter.level) continue;
      if (filter?.status && latest.status !== filter.status) continue;

      list.push(latest);
    }
    return list.sort((a, b) => a.level.localeCompare(b.level));
  }

  /**
   * Get specific blueprint by ID and optional version.
   */
  public getBlueprint(id: string, version?: number): Blueprint | null {
    const versions = this.blueprints.get(id);
    if (!versions || versions.length === 0) return null;

    if (version !== undefined) {
      return versions.find((v) => v.version === version) ?? null;
    }

    return [...versions].sort((a, b) => b.version - a.version)[0] ?? null;
  }

  /**
   * Create a new blueprint (v1).
   */
  public createBlueprint(data: Omit<Blueprint, 'id' | 'status'>, operator: StaffUser): Blueprint {
    if (operator.role !== 'admin' && operator.role !== 'editor') {
      throw new BlueprintManagerError('Chỉ Editor hoặc Admin mới có quyền tạo bản thiết kế đề thi.', 'FORBIDDEN');
    }

    // SourceRef is mandatory
    if (!data.sourceRef || data.sourceRef.length === 0) {
      throw new BlueprintManagerError('Trường sourceRef bắt buộc phải có nguồn tham chiếu.', 'OFFICIAL_SOURCE_REQUIRED');
    }

    const id = `bp_${data.level}_${Date.now()}`;
    const bp: Blueprint = {
      ...data,
      id,
      status: 'draft',
      isConfirmed: false,
    };

    this.blueprints.set(id, [bp]);
    return bp;
  }

  /**
   * Acceptance 2: "Không sửa đè published version"
   * Create a new version for an existing blueprint.
   * Modifying an active/published blueprint NEVER overwrites; it creates a new version (v+1).
   */
  public createNewVersion(
    id: string,
    updates: Partial<Omit<Blueprint, 'id' | 'version' | 'status' | 'isConfirmed'>>,
    operator: StaffUser,
  ): Blueprint {
    if (operator.role !== 'admin' && operator.role !== 'editor') {
      throw new BlueprintManagerError('Chỉ Editor hoặc Admin mới có quyền tạo phiên bản mới cho bản thiết kế.', 'FORBIDDEN');
    }

    const current = this.getBlueprint(id);
    if (!current) {
      throw new BlueprintManagerError('Không tìm thấy bản thiết kế đề thi.', 'NOT_FOUND');
    }

    // If attempting to mutate active version directly, disallow overwriting:
    const nextVersion = current.version + 1;
    const newBlueprint: Blueprint = {
      ...current,
      ...updates,
      id: current.id,
      version: nextVersion,
      status: 'draft',
      isConfirmed: false,
    };

    const versions = this.blueprints.get(id) ?? [];
    versions.push(newBlueprint);
    this.blueprints.set(id, versions);

    return newBlueprint;
  }

  /**
   * Attempting to overwrite a published/active version directly throws IMMUTABLE_VERSION error.
   */
  public overwriteActiveVersion(): never {
    throw new BlueprintManagerError(
      'Không thể sửa đè phiên bản blueprint đã kích hoạt/sử dụng. Phải tạo phiên bản mới (v+1).',
      'IMMUTABLE_VERSION',
    );
  }

  /**
   * Activate Blueprint with verification and confirmation.
   */
  public activateBlueprint(
    id: string,
    version: number,
    operator: StaffUser,
    confirmation?: BlueprintActivationConfirmation,
  ): Blueprint {
    if (operator.role !== 'admin') {
      throw new BlueprintManagerError('Chỉ Quản trị viên (Admin) mới có quyền kích hoạt Blueprint chính thức.', 'FORBIDDEN');
    }

    const bp = this.getBlueprint(id, version);
    if (!bp) {
      throw new BlueprintManagerError('Không tìm thấy phiên bản blueprint.', 'NOT_FOUND');
    }

    const isOfficial = bp.kind === 'official' || Boolean(bp.isOfficial);

    if (isOfficial) {
      // 1. Verify official source reference contains jlpt.jp
      if (!bp.sourceRef || bp.sourceRef.length === 0) {
        throw new BlueprintManagerError(
          'Blueprint thi thật yêu cầu có nguồn chính thức (jlpt.jp) trước khi kích hoạt.',
          'OFFICIAL_SOURCE_REQUIRED',
        );
      }

      const hasOfficialUrl = bp.sourceRef.some((ref) => ref.url.includes('jlpt.jp'));
      if (!hasOfficialUrl) {
        throw new BlueprintManagerError(
          'Nguồn tham chiếu của blueprint thi thật phải là nguồn chính thức từ jlpt.jp.',
          'OFFICIAL_SOURCE_REQUIRED',
        );
      }

      // 2. Verify confirmation from project owner / authorized operator
      if (!confirmation || !confirmation.confirmedBy) {
        throw new BlueprintManagerError(
          'Blueprint thi thật chỉ kích hoạt khi có xác nhận từ chủ dự án hoặc người vận hành có thẩm quyền.',
          'CONFIRMATION_REQUIRED',
        );
      }

      // 3. Verify no zero placeholder values
      for (const section of bp.sections) {
        if (section.durationSec <= 0) {
          throw new BlueprintManagerError(
            `Thời gian phần thi ${section.code} phải lớn hơn 0, không được để placeholder 0.`,
            'INVALID_STRUCTURE',
          );
        }
        for (const mondai of section.mondai) {
          if (mondai.questionCount <= 0) {
            throw new BlueprintManagerError(
              `Số câu hỏi dạng ${mondai.type} phải lớn hơn 0, không được để placeholder 0.`,
              'INVALID_STRUCTURE',
            );
          }
        }
      }
    }

    const activated: Blueprint = {
      ...bp,
      status: 'active',
      isConfirmed: true,
      kind: isOfficial ? 'official' : 'synthetic',
      isOfficial,
    };

    const versions = this.blueprints.get(id) ?? [];
    const idx = versions.findIndex((v) => v.version === version);
    if (idx >= 0) {
      versions[idx] = activated;
    }
    this.blueprints.set(id, versions);

    return activated;
  }
}
