import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import {
  contentLicenses,
  examSources,
  questionGroups,
  questionSourceRefs,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type {
  CreateLicenseDto,
  CreateSourceDto,
  SourceRights,
  UpdateLicenseDto,
  UpdateSourceDto,
} from './license.types.js';

export class LicenseDeniedError extends Error {
  public readonly code = 'LICENSE_DENIED';
  constructor(message: string) {
    super(message);
    this.name = 'LicenseDeniedError';
  }
}

@Injectable()
export class LicenseService {
  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  // ---------------------------------------------------------------------------
  // Sources CRUD (QB-17)
  // ---------------------------------------------------------------------------

  async createSource(dto: CreateSourceDto) {
    const existing = await this.dbClient.db
      .select()
      .from(examSources)
      .where(eq(examSources.slug, dto.slug))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException(`Nguồn với mã slug "${dto.slug}" đã tồn tại`);
    }

    const id = generateUuidV7();
    const [inserted] = await this.dbClient.db
      .insert(examSources)
      .values({
        id,
        slug: dto.slug,
        name: dto.name,
        provenance: dto.provenance,
        metadata: dto.metadata || {},
      })
      .returning();

    return inserted;
  }

  async getSource(id: string) {
    const records = await this.dbClient.db
      .select()
      .from(examSources)
      .where(eq(examSources.id, id))
      .limit(1);

    if (records.length === 0) {
      throw new NotFoundException(`Không tìm thấy nguồn: ${id}`);
    }
    return records[0];
  }

  async listSources() {
    return this.dbClient.db.select().from(examSources);
  }

  async updateSource(id: string, dto: UpdateSourceDto) {
    await this.getSource(id);

    const valuesToUpdate: Record<string, unknown> = {};
    if (dto.name !== undefined) valuesToUpdate.name = dto.name;
    if (dto.provenance !== undefined) valuesToUpdate.provenance = dto.provenance;
    if (dto.metadata !== undefined) valuesToUpdate.metadata = dto.metadata;

    const [updated] = await this.dbClient.db
      .update(examSources)
      .set(valuesToUpdate)
      .where(eq(examSources.id, id))
      .returning();

    return updated;
  }

  async deleteSource(id: string) {
    await this.getSource(id);

    // Check if referenced by licenses
    const licenses = await this.dbClient.db
      .select({ id: contentLicenses.id })
      .from(contentLicenses)
      .where(eq(contentLicenses.sourceId, id))
      .limit(1);

    if (licenses.length > 0) {
      throw new ConflictException('Không thể xóa nguồn đang có license tham chiếu');
    }

    // Check if referenced by question groups
    const groups = await this.dbClient.db
      .select({ id: questionGroups.id })
      .from(questionGroups)
      .where(eq(questionGroups.sourceId, id))
      .limit(1);

    if (groups.length > 0) {
      throw new ConflictException('Không thể xóa nguồn đang được nhóm câu hỏi tham chiếu');
    }

    // Check if referenced by question source refs
    const sourceRefs = await this.dbClient.db
      .select({ id: questionSourceRefs.id })
      .from(questionSourceRefs)
      .where(eq(questionSourceRefs.sourceId, id))
      .limit(1);

    if (sourceRefs.length > 0) {
      throw new ConflictException('Không thể xóa nguồn đang được câu hỏi tham chiếu');
    }

    await this.dbClient.db.delete(examSources).where(eq(examSources.id, id));
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Licenses CRUD & Takedown (QB-16, ADM-19)
  // ---------------------------------------------------------------------------

  async createLicense(dto: CreateLicenseDto) {
    // Verify source exists
    await this.getSource(dto.sourceId);

    const id = generateUuidV7();
    const effectiveFrom = new Date(dto.effectiveFrom);
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;

    const termsPayload = JSON.stringify({
      terms: dto.terms || '',
      rights: {
        displayAllowed: dto.rights?.displayAllowed ?? true,
        remixAllowed: dto.rights?.remixAllowed ?? true,
        commercialAllowed: dto.rights?.commercialAllowed ?? false,
        transcriptAllowed: dto.rights?.transcriptAllowed ?? true,
        aiProcessingAllowed: dto.rights?.aiProcessingAllowed ?? false,
        exportAllowed: dto.rights?.exportAllowed ?? false,
      },
    });

    const [inserted] = await this.dbClient.db
      .insert(contentLicenses)
      .values({
        id,
        sourceId: dto.sourceId,
        licenseType: dto.licenseType,
        effectiveFrom,
        expiresAt,
        revokedAt: null,
        terms: termsPayload,
      })
      .returning();

    return inserted;
  }

  async getLicense(id: string) {
    const records = await this.dbClient.db
      .select()
      .from(contentLicenses)
      .where(eq(contentLicenses.id, id))
      .limit(1);

    if (records.length === 0) {
      throw new NotFoundException(`Không tìm thấy license: ${id}`);
    }
    return records[0];
  }

  async listLicenses(sourceId?: string) {
    if (sourceId) {
      return this.dbClient.db
        .select()
        .from(contentLicenses)
        .where(eq(contentLicenses.sourceId, sourceId));
    }
    return this.dbClient.db.select().from(contentLicenses);
  }

  async updateLicense(id: string, dto: UpdateLicenseDto) {
    const existing = await this.getLicense(id);

    const valuesToUpdate: Record<string, unknown> = {};
    if (dto.licenseType !== undefined) valuesToUpdate.licenseType = dto.licenseType;
    if (dto.effectiveFrom !== undefined) valuesToUpdate.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.expiresAt !== undefined) {
      valuesToUpdate.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    }

    if (dto.terms !== undefined || dto.rights !== undefined) {
      let currentTermsObj = { terms: '', rights: {} };
      try {
        if (existing.terms) currentTermsObj = JSON.parse(existing.terms);
      } catch {
        // Ignore
      }

      valuesToUpdate.terms = JSON.stringify({
        terms: dto.terms ?? currentTermsObj.terms,
        rights: {
          ...(currentTermsObj.rights || {}),
          ...(dto.rights || {}),
        },
      });
    }

    const [updated] = await this.dbClient.db
      .update(contentLicenses)
      .set(valuesToUpdate)
      .where(eq(contentLicenses.id, id))
      .returning();

    return updated;
  }

  async deleteLicense(id: string) {
    await this.getLicense(id);

    // Cannot delete if referenced by question groups
    const groups = await this.dbClient.db
      .select({ id: questionGroups.id })
      .from(questionGroups)
      .where(eq(questionGroups.licenseId, id))
      .limit(1);

    if (groups.length > 0) {
      throw new ConflictException('Không thể xóa license đang được câu hỏi tham chiếu');
    }

    await this.dbClient.db.delete(contentLicenses).where(eq(contentLicenses.id, id));
    return { success: true };
  }

  /**
   * Takedown action (ADM-19): revokes license immediately and records takedown reason.
   */
  async takedownLicense(licenseId: string, reason: string, operatorUserId?: string) {
    const existing = await this.getLicense(licenseId);

    const parsed: { terms?: string; rights?: Record<string, unknown>; takedown?: unknown } = {};
    try {
      if (existing.terms) {
        Object.assign(parsed, JSON.parse(existing.terms));
      }
    } catch {
      // Ignore
    }

    parsed.takedown = {
      revokedAt: new Date().toISOString(),
      reason,
      operatorUserId,
    };

    const [updated] = await this.dbClient.db
      .update(contentLicenses)
      .set({
        revokedAt: new Date(),
        terms: JSON.stringify(parsed),
      })
      .where(eq(contentLicenses.id, licenseId))
      .returning();

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Rights Verification & Enforcement (Acceptance 3)
  // ---------------------------------------------------------------------------

  /**
   * Evaluates active rights for a given source ID.
   */
  async checkSourceRights(sourceId: string): Promise<{
    allowed: boolean;
    remixAllowed: boolean;
    reason?: string;
    license?: typeof contentLicenses.$inferSelect;
  }> {
    const now = new Date();

    const licenses = await this.dbClient.db
      .select()
      .from(contentLicenses)
      .where(eq(contentLicenses.sourceId, sourceId));

    if (licenses.length === 0) {
      return {
        allowed: false,
        remixAllowed: false,
        reason: 'Nguồn chưa được cấp license bản quyền',
      };
    }

    // Find latest valid active license
    const activeLicense = licenses.find((lic: typeof contentLicenses.$inferSelect) => {
      if (lic.revokedAt !== null) return false;
      if (lic.effectiveFrom > now) return false;
      if (lic.expiresAt !== null && lic.expiresAt <= now) return false;
      return true;
    });

    if (!activeLicense) {
      return {
        allowed: false,
        remixAllowed: false,
        reason: 'License của nguồn này đã hết hạn hoặc đã bị thu hồi/gỡ bản quyền (takedown)',
      };
    }

    let rights: Partial<SourceRights> = {};
    try {
      if (activeLicense.terms) {
        const parsed = JSON.parse(activeLicense.terms);
        rights = parsed.rights || {};
      }
    } catch {
      // Ignore
    }

    const displayAllowed = rights.displayAllowed ?? true;
    const remixAllowed = rights.remixAllowed ?? true;

    return {
      allowed: displayAllowed,
      remixAllowed,
      reason: displayAllowed ? undefined : 'Quyền hiển thị đã bị từ chối bởi điều khoản license',
      license: activeLicense,
    };
  }

  /**
   * Enforces that a source has valid permission to be published in exams.
   * Throws LicenseDeniedError if unauthorized.
   */
  async enforcePublishable(sourceId: string | null | undefined): Promise<void> {
    if (!sourceId) {
      throw new LicenseDeniedError(
        'LICENSE_DENIED: Câu hỏi hoặc nhóm câu chưa gắn nguồn bản quyền hợp lệ, không thể xuất bản',
      );
    }

    const rights = await this.checkSourceRights(sourceId);
    if (!rights.allowed) {
      throw new LicenseDeniedError(
        `LICENSE_DENIED: Nguồn chưa cấp quyền không thể xuất bản (${rights.reason})`,
      );
    }
  }

  /**
   * Enforces that a source has valid permission to be remixed into practice or mixed exams.
   * Throws LicenseDeniedError if unauthorized.
   */
  async enforceMixable(sourceId: string | null | undefined): Promise<void> {
    if (!sourceId) {
      throw new LicenseDeniedError(
        'LICENSE_DENIED: Câu hỏi hoặc nhóm câu chưa gắn nguồn bản quyền hợp lệ, không thể trộn đề',
      );
    }

    const rights = await this.checkSourceRights(sourceId);
    if (!rights.allowed || !rights.remixAllowed) {
      throw new LicenseDeniedError(
        `LICENSE_DENIED: Nguồn chưa cấp quyền không thể trộn đề (${rights.reason || 'remix bị từ chối'})`,
      );
    }
  }
}
