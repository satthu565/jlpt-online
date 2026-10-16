import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDbClient, runMigrations, type DbClientInstance } from '../../db/index.js';
import * as schema from '../../db/schema.js';
import { CmsService } from './cms.service.js';
import type { Blueprint } from '@jlpt/schema';
import { ConflictException, ForbiddenException } from '@nestjs/common';

describe('CmsService Integration Tests (C04: ADM-04, ADM-08)', () => {
  let client: DbClientInstance;
  let service: CmsService;
  let adminId: string;
  let editorId: string;
  let reviewerId: string;

  beforeEach(async () => {
    client = await createDbClient();
    await runMigrations(client);
    service = new CmsService(client);

    adminId = crypto.randomUUID();
    editorId = crypto.randomUUID();
    reviewerId = crypto.randomUUID();

    // Seed staff users
    await client.db.insert(schema.users).values([
      { id: adminId, email: 'admin@jlpt.local', role: 'admin' },
      { id: editorId, email: 'editor@jlpt.local', role: 'editor' },
      { id: reviewerId, email: 'reviewer@jlpt.local', role: 'reviewer' },
    ]);
  });

  afterEach(async () => {
    await client.close();
  });

  describe('Question Groups & Version Immutability (Acceptance 2)', () => {
    it('creates a question group draft and updates in-place while in draft status', async () => {
      const created = await service.createQuestionGroup(
        {
          level: 'N1',
          sectionCode: 'language_knowledge',
          mondaiType: 'kanji_reading',
          skill: 'reading',
          title: 'Mondai 1 Kanji',
          instructions: [{ t: 'text', text: 'Hướng dẫn ban đầu' }],
          questions: [
            {
              tempId: 't1',
              stem: [{ t: 'text', text: 'Đề bài' }],
              options: [
                { label: '1', content: [{ t: 'text', text: 'A' }] },
                { label: '2', content: [{ t: 'text', text: 'B' }] },
                { label: '3', content: [{ t: 'text', text: 'C' }] },
                { label: '4', content: [{ t: 'text', text: 'D' }] },
              ],
              correctOption: 1,
            },
          ],
          sourceRef: 'https://jlpt.jp',
        },
        editorId,
      );

      expect(created.version).toBe(1);
      expect(created.status).toBe('draft');

      // Update draft group: updates in-place, version remains 1
      const updated = await service.updateQuestionGroup(
        created.groupId,
        {
          passage: [{ type: 'paragraph', content: [{ t: 'text', text: 'Bài đọc bổ sung' }] }],
        },
        editorId,
      );

      expect(updated.isNewVersion).toBe(false);
      expect(updated.version).toBe(1);
    });

    it('branches a new version (v2) when updating an approved group (never overwriting approved version)', async () => {
      const created = await service.createQuestionGroup(
        {
          level: 'N2',
          sectionCode: 'reading',
          mondaiType: 'comprehension_short',
          skill: 'reading',
          instructions: [{ t: 'text', text: 'Bài đọc ngắn' }],
          questions: [
            {
              stem: [{ t: 'text', text: 'Câu hỏi' }],
              options: [
                { label: '1', content: [{ t: 'text', text: 'A' }] },
                { label: '2', content: [{ t: 'text', text: 'B' }] },
                { label: '3', content: [{ t: 'text', text: 'C' }] },
              ],
              correctOption: 2,
            },
          ],
          sourceRef: 'https://jlpt.jp',
        },
        editorId,
      );

      // Reviewer approves version 1
      await service.reviewQuestionGroup(created.groupId, 'approved', 'Đạt yêu cầu', reviewerId);

      // Editor modifies approved group: must NOT overwrite v1, branches to v2
      const res = await service.updateQuestionGroup(
        created.groupId,
        {
          passage: [{ type: 'paragraph', content: [{ t: 'text', text: 'Đoạn văn sửa mới' }] }],
        },
        editorId,
      );

      expect(res.isNewVersion).toBe(true);
      expect(res.version).toBe(2);
      expect(res.status).toBe('draft');
    });

    it('enforces two-person review rule (reviewer cannot be the same user)', async () => {
      const created = await service.createQuestionGroup(
        {
          level: 'N3',
          sectionCode: 'listening',
          mondaiType: 'task_based',
          skill: 'listening',
          instructions: [{ t: 'text', text: 'Nghe' }],
          questions: [
            {
              stem: [{ t: 'text', text: 'Câu hỏi nghe' }],
              options: [
                { label: '1', content: [{ t: 'text', text: '1' }] },
                { label: '2', content: [{ t: 'text', text: '2' }] },
                { label: '3', content: [{ t: 'text', text: '3' }] },
              ],
              correctOption: 1,
            },
          ],
          sourceRef: 'https://jlpt.jp',
        },
        editorId,
      );

      // 1. Tác giả (editorId) cố tình tự duyệt nhóm câu hỏi của mình ngay lần duyệt đầu tiên -> Phải ném ForbiddenException
      await expect(
        service.reviewQuestionGroup(created.groupId, 'approved', 'Tác giả tự duyệt', editorId),
      ).rejects.toThrow(ForbiddenException);

      // 2. Lần duyệt đầu tiên hợp lệ bởi reviewerId
      await service.reviewQuestionGroup(created.groupId, 'rejected', 'Cần sửa lại', reviewerId);

      // 3. Cùng reviewerId cố tình duyệt tiếp tục lần 2 mà không có người thứ hai -> Bị chặn
      await expect(
        service.reviewQuestionGroup(created.groupId, 'approved', 'Tự duyệt lại', reviewerId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Blueprints & Activation (Acceptance 2 & ADM-08)', () => {
    const sampleBlueprint: Blueprint = {
      id: crypto.randomUUID(),
      level: 'N1',
      version: 1,
      kind: 'official',
      status: 'draft',
      isOfficial: true,
      effectiveFrom: '2026-01-01',
      sourceRef: [{ url: 'https://www.jlpt.jp/guidelines.html', accessedAt: '2026-01-01T00:00:00Z' }],
      sections: [
        {
          code: 'language_knowledge',
          title: 'Kiến thức ngôn ngữ',
          durationSec: 6600,
          mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 6 }],
        },
      ],
      scoring: {
        method: 'linear_reference',
        rounding: 'round',
        scoringSections: [
          { code: 'language_knowledge', label: 'Ngôn ngữ', skills: ['kanji'], maxScaled: 60, minPass: 19 },
        ],
        totalMax: 60,
        totalPass: 30,
      },
    };

    it('creates blueprint, versions, and activates with official confirmation', async () => {
      const created = await service.createBlueprint(sampleBlueprint, adminId);
      expect(created.version).toBe(1);

      // Activate with confirmation
      const activated = await service.activateBlueprint(created.id, {
        confirmedBy: adminId,
        notes: 'Xác nhận theo đề án 2026',
      });
      expect(activated.active).toBe(true);

      // Branch to version 2 (preserving v1)
      const v2 = await service.createBlueprintVersion(
        created.id,
        {
          sections: [
            {
              code: 'language_knowledge',
              title: 'Kiến thức ngôn ngữ',
              durationSec: 6600,
              mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 7 }],
            },
          ],
        },
        adminId,
      );
      expect(v2.version).toBe(2);
      expect(v2.status).toBe('draft');
    });
  });

  describe('Exams & Version Immutability (Acceptance 2 & ADM-04)', () => {
    it('creates exam and disallows in-place overwrite once published', async () => {
      const exam = await service.createExam(
        {
          slug: 'exam-n1-immutability-test',
          level: 'N1',
          title: 'Đề thi N1 Mẫu',
          kind: 'original',
          description: 'Mô tả đề thi',
          blueprintId: crypto.randomUUID(),
          blueprintVersion: 1,
          sourceRefs: ['https://jlpt.jp'],
        },
        editorId,
      );

      // Publish the exam
      const published = await service.publishExam(exam.id, adminId);
      expect(published.version).toBe(1);

      // Attempting to overwrite the published exam in-place -> Must throw ConflictException!
      await expect(
        service.updateExam(exam.id, { title: 'Tên sửa đè nguy hiểm' }, editorId),
      ).rejects.toThrow(ConflictException);
    });
  });
});
