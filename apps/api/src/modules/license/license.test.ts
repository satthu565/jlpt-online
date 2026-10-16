import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { questionGroups } from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { LicenseDeniedError, LicenseService } from './license.service.js';

describe('License Module - Source Provenance & Rights Enforcement (Acceptance 3)', () => {
  let dbClient: DbClientInstance;
  let licenseService: LicenseService;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);
    licenseService = new LicenseService(dbClient);
  });

  afterEach(async () => {
    await dbClient.close();
  });

  describe('Sources CRUD & References', () => {
    it('creates and retrieves exam source with provenance metadata', async () => {
      const source = await licenseService.createSource({
        slug: 'jlpt-official-2023-12',
        name: 'Đề thi chính thức 12/2023',
        provenance: 'official_released',
        metadata: { publisher: 'JEES', year: 2023, session: '12' },
      });

      expect(source.id).toBeDefined();
      expect(source.slug).toBe('jlpt-official-2023-12');
      expect(source.provenance).toBe('official_released');

      const retrieved = await licenseService.getSource(source.id);
      expect(retrieved.name).toBe('Đề thi chính thức 12/2023');

      // Update
      const updated = await licenseService.updateSource(source.id, {
        name: 'Đề thi chính thức 12/2023 - Đã chuẩn hóa',
      });
      expect(updated.name).toBe('Đề thi chính thức 12/2023 - Đã chuẩn hóa');
    });

    it('prevents creating duplicate source slugs', async () => {
      await licenseService.createSource({
        slug: 'unique-source-slug',
        name: 'Nguồn A',
        provenance: 'self_authored',
      });

      await expect(
        licenseService.createSource({
          slug: 'unique-source-slug',
          name: 'Nguồn B',
          provenance: 'self_authored',
        }),
      ).rejects.toThrow(/đã tồn tại/);
    });

    it('prevents deleting a source that is referenced by active licenses or questions', async () => {
      const source = await licenseService.createSource({
        slug: 'referenced-source',
        name: 'Nguồn có câu hỏi',
        provenance: 'licensed_partner',
      });

      const license = await licenseService.createLicense({
        sourceId: source.id,
        licenseType: 'partner_agreement',
        effectiveFrom: new Date('2026-01-01'),
      });

      // Cannot delete source while license references it
      await expect(licenseService.deleteSource(source.id)).rejects.toThrow(
        /Không thể xóa nguồn đang có license tham chiếu/,
      );

      // Link a question group to this license
      await dbClient.db.insert(questionGroups).values({
        id: generateUuidV7(),
        sourceId: source.id,
        licenseId: license.id,
        level: 'N5',
        sectionCode: 'language_vocab',
        title: 'Nhóm thử nghiệm',
      });

      // Cannot delete license while question group references it
      await expect(licenseService.deleteLicense(license.id)).rejects.toThrow(
        /Không thể xóa license đang được câu hỏi tham chiếu/,
      );
    });
  });

  describe('Acceptance 3: Nguồn chưa cấp quyền không xuất bản hoặc trộn', () => {
    it('rejects publishing when source has no license', async () => {
      const source = await licenseService.createSource({
        slug: 'unlicensed-source',
        name: 'Nguồn chưa ký hợp đồng',
        provenance: 'licensed_partner',
      });

      await expect(licenseService.enforcePublishable(source.id)).rejects.toThrow(LicenseDeniedError);
      await expect(licenseService.enforcePublishable(source.id)).rejects.toThrow(
        /Nguồn chưa cấp quyền không thể xuất bản/,
      );

      await expect(licenseService.enforceMixable(source.id)).rejects.toThrow(LicenseDeniedError);
      await expect(licenseService.enforceMixable(source.id)).rejects.toThrow(
        /Nguồn chưa cấp quyền không thể trộn đề/,
      );
    });

    it('rejects publishing when license has expired', async () => {
      const source = await licenseService.createSource({
        slug: 'expired-source',
        name: 'Nguồn đã hết hạn',
        provenance: 'licensed_partner',
      });

      // License expired in 2025
      await licenseService.createLicense({
        sourceId: source.id,
        licenseType: 'limited_time',
        effectiveFrom: new Date('2024-01-01'),
        expiresAt: new Date('2025-01-01'),
      });

      await expect(licenseService.enforcePublishable(source.id)).rejects.toThrow(LicenseDeniedError);
      await expect(licenseService.enforceMixable(source.id)).rejects.toThrow(LicenseDeniedError);
    });

    it('allows publishing but denies mixing when remixAllowed is false', async () => {
      const source = await licenseService.createSource({
        slug: 'no-remix-source',
        name: 'Nguồn chỉ cho thi nguyên đề, cấm trộn',
        provenance: 'licensed_partner',
      });

      await licenseService.createLicense({
        sourceId: source.id,
        licenseType: 'full_exam_only',
        effectiveFrom: new Date('2026-01-01'),
        rights: {
          displayAllowed: true,
          remixAllowed: false, // Forbidden from mixing!
        },
      });

      // Publishing is allowed
      await expect(licenseService.enforcePublishable(source.id)).resolves.not.toThrow();

      // Mixing is strictly forbidden
      await expect(licenseService.enforceMixable(source.id)).rejects.toThrow(LicenseDeniedError);
      await expect(licenseService.enforceMixable(source.id)).rejects.toThrow(
        /Nguồn chưa cấp quyền không thể trộn đề/,
      );
    });

    it('immediately blocks publishing and mixing upon takedown / revocation (ADM-19)', async () => {
      const source = await licenseService.createSource({
        slug: 'takedown-test-source',
        name: 'Nguồn có tranh chấp',
        provenance: 'licensed_partner',
      });

      const license = await licenseService.createLicense({
        sourceId: source.id,
        licenseType: 'standard_license',
        effectiveFrom: new Date('2026-01-01'),
        rights: {
          displayAllowed: true,
          remixAllowed: true,
        },
      });

      // Initially active and allowed
      await expect(licenseService.enforcePublishable(source.id)).resolves.not.toThrow();
      await expect(licenseService.enforceMixable(source.id)).resolves.not.toThrow();

      // Legal team / Admin executes Takedown (ADM-19)
      const takedownRes = await licenseService.takedownLicense(
        license.id,
        'Yêu cầu gỡ bản quyền theo đơn khiếu nại của tác giả số #2026-TKD',
        'admin-user-id',
      );

      expect(takedownRes.revokedAt).not.toBeNull();

      // Now immediately forbidden
      await expect(licenseService.enforcePublishable(source.id)).rejects.toThrow(LicenseDeniedError);
      await expect(licenseService.enforceMixable(source.id)).rejects.toThrow(LicenseDeniedError);
    });

    it('allows both publishing and mixing when license is valid and active', async () => {
      const source = await licenseService.createSource({
        slug: 'fully-licensed-source',
        name: 'Nguồn tự biên soạn đạt chuẩn',
        provenance: 'self_authored',
      });

      await licenseService.createLicense({
        sourceId: source.id,
        licenseType: 'perpetual_open',
        effectiveFrom: new Date('2026-01-01'),
        rights: {
          displayAllowed: true,
          remixAllowed: true,
          commercialAllowed: true,
        },
      });

      await expect(licenseService.enforcePublishable(source.id)).resolves.not.toThrow();
      await expect(licenseService.enforceMixable(source.id)).resolves.not.toThrow();
    });
  });
});
