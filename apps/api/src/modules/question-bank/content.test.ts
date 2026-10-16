import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { assertNoAnswerLeak } from '@jlpt/schema';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { questionGroups, questionGroupVersions } from '../../db/schema.js';
import { LocalFsStorage } from '../storage/local-fs.storage.js';
import { StorageService } from '../storage/storage.service.js';
import { LicenseService } from '../license/license.service.js';
import { MediaService } from '../media/media.service.js';
import { QuestionBankService } from './question-bank.service.js';

function createRawZip(entries: Array<{ name: string; content: Buffer }>): Buffer {
  const localHeaders: Buffer[] = [];
  const cdEntries: Buffer[] = [];
  let currentOffset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const compData = entry.content; // stored
    const compSize = compData.length;
    const uncompSize = entry.content.length;

    const local = Buffer.alloc(30 + nameBuf.length);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); // method 0 (stored)
    local.writeUInt16LE(0, 10);
    local.writeUInt16LE(0, 12);
    local.writeUInt32LE(0x12345678, 14);
    local.writeUInt32LE(compSize, 18);
    local.writeUInt32LE(uncompSize, 22);
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28);
    nameBuf.copy(local, 30);
    localHeaders.push(local, compData);

    const cd = Buffer.alloc(46 + nameBuf.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(0x12345678, 16);
    cd.writeUInt32LE(compSize, 20);
    cd.writeUInt32LE(uncompSize, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(currentOffset, 42);
    nameBuf.copy(cd, 46);
    cdEntries.push(cd);

    currentOffset += local.length + compData.length;
  }

  const cdBuffer = Buffer.concat(cdEntries);
  const cdOffset = currentOffset;
  const cdSize = cdBuffer.length;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, cdBuffer, eocd]);
}

import { users } from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';

describe('Question Bank Module - Versioning, Review, and Idempotency (C02)', () => {
  let dbClient: DbClientInstance;
  let tempStorageDir: string;
  let licenseService: LicenseService;
  let mediaService: MediaService;
  let qbService: QuestionBankService;
  let authorId: string;
  let reviewerId: string;
  let editorId: string;
  let importerId: string;

  beforeEach(async () => {
    tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jlpt-qb-test-'));
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    const localStorage = new LocalFsStorage(tempStorageDir);
    const storageService = new StorageService();
    storageService.setStorageInstance(localStorage);

    licenseService = new LicenseService(dbClient);
    mediaService = new MediaService(dbClient, storageService);
    qbService = new QuestionBankService(dbClient, licenseService, mediaService);

    // Create test users in DB
    authorId = generateUuidV7();
    reviewerId = generateUuidV7();
    editorId = generateUuidV7();
    importerId = generateUuidV7();

    await dbClient.db.insert(users).values([
      { id: authorId, email: 'author@jlpt.local', name: 'Author Editor', role: 'editor' },
      { id: reviewerId, email: 'reviewer@jlpt.local', name: 'Content Reviewer', role: 'reviewer' },
      { id: editorId, email: 'editor2@jlpt.local', name: 'Second Editor', role: 'editor' },
      { id: importerId, email: 'importer@jlpt.local', name: 'Admin Importer', role: 'admin' },
    ]);
  });

  afterEach(async () => {
    await dbClient.close();
    if (fs.existsSync(tempStorageDir)) {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
    }
  });

  describe('Question Groups & Questions Full CRUD', () => {
    it('creates question group and nested questions with unique IDs and initial draft version 1', async () => {
      const source = await licenseService.createSource({
        slug: 'src-n5-vocab',
        name: 'N5 Vocab Source',
        provenance: 'self_authored',
      });

      const license = await licenseService.createLicense({
        sourceId: source.id,
        licenseType: 'open_perpetual',
        effectiveFrom: new Date('2026-01-01'),
      });

      const res = await qbService.createGroup(
        {
          level: 'N5',
          sectionCode: 'language_vocab',
          title: '問題 1: 漢字の読み方',
          sourceId: source.id,
          licenseId: license.id,
          passage: [{ t: 'paragraph', content: [{ t: 'text', text: 'この地図を見てください。' }] }],
          questions: [
            {
              stem: [
                { t: 'text', text: 'この' },
                { t: 'underline', children: [{ t: 'text', text: '地図' }] },
                { t: 'text', text: 'をみてください。' },
              ],
              options: [
                { orderIndex: 1, content: [{ t: 'text', text: 'ちず' }] },
                { orderIndex: 2, content: [{ t: 'text', text: 'ちづ' }] },
                { orderIndex: 3, content: [{ t: 'text', text: 'じず' }] },
                { orderIndex: 4, content: [{ t: 'text', text: 'じづ' }] },
              ],
              correctOption: 1,
              skill: 'kanji',
              mondaiType: 'kanji_reading',
              origin: 'self_authored',
            },
          ],
        },
        authorId,
      );

      expect(res.id).toBeDefined();
      expect(res.version.version).toBe(1);
      expect(res.version.status).toBe('draft');
      expect(res.questions.length).toBe(1);
      expect(res.questions[0].id).toBeDefined();
      expect(res.questions[0].correctAnswer.correctOption).toBe(1);
    });
  });

  describe('Acceptance 2: Sửa nội dung approved tạo phiên bản mới', () => {
    it('updates draft version in-place, but creates new version when modifying approved content', async () => {
      // 1. Create group in draft
      const created = await qbService.createGroup(
        {
          level: 'N5',
          sectionCode: 'language_vocab',
          title: 'Initial Group Title',
          questions: [
            {
              stem: [{ t: 'text', text: 'Câu hỏi ban đầu' }],
              options: [
                { orderIndex: 1, content: [{ t: 'text', text: 'A' }] },
                { orderIndex: 2, content: [{ t: 'text', text: 'B' }] },
                { orderIndex: 3, content: [{ t: 'text', text: 'C' }] },
                { orderIndex: 4, content: [{ t: 'text', text: 'D' }] },
              ],
              correctOption: 1,
              skill: 'vocabulary',
              mondaiType: 'contextual',
            },
          ],
        },
        authorId,
      );

      const groupId = created.id;
      expect(created.version.version).toBe(1);
      expect(created.version.status).toBe('draft');

      // 2. Modifying draft group updates version 1 in place
      const updatedDraft = await qbService.updateGroup(
        groupId,
        {
          title: 'Draft Edited Title',
          questions: [
            {
              stem: [{ t: 'text', text: 'Câu hỏi chỉnh sửa bản nháp' }],
              options: [
                { orderIndex: 1, content: [{ t: 'text', text: 'A modified' }] },
                { orderIndex: 2, content: [{ t: 'text', text: 'B' }] },
                { orderIndex: 3, content: [{ t: 'text', text: 'C' }] },
                { orderIndex: 4, content: [{ t: 'text', text: 'D' }] },
              ],
              correctOption: 1,
              skill: 'vocabulary',
              mondaiType: 'contextual',
            },
          ],
        },
        authorId,
      );

      expect(updatedDraft.isNewVersion).toBe(false);
      expect(updatedDraft.version.version).toBe(1);

      // 3. Submit for review & approve
      await qbService.submitForReview(groupId, 1, authorId);

      const reviewRes = await qbService.reviewGroup(
        groupId,
        1,
        { decision: 'approved', comment: 'Đạt chuẩn biên tập N5' },
        reviewerId, // Different user from author!
      );

      expect(reviewRes.status).toBe('approved');
      expect(reviewRes.version.status).toBe('approved');

      // 4. CRITICAL: Now editor modifies the APPROVED group!
      // This MUST create version 2 in 'draft' status, leaving version 1 immutable!
      const updatedApproved = await qbService.updateGroup(
        groupId,
        {
          title: 'New Improved Version 2',
          questions: [
            {
              stem: [{ t: 'text', text: 'Câu hỏi đã sửa sau khi approved' }],
              options: [
                { orderIndex: 1, content: [{ t: 'text', text: 'Opt 1' }] },
                { orderIndex: 2, content: [{ t: 'text', text: 'Opt 2' }] },
                { orderIndex: 3, content: [{ t: 'text', text: 'Opt 3' }] },
                { orderIndex: 4, content: [{ t: 'text', text: 'Opt 4' }] },
              ],
              correctOption: 2,
              skill: 'vocabulary',
              mondaiType: 'contextual',
            },
          ],
        },
        editorId,
      );

      expect(updatedApproved.isNewVersion).toBe(true);
      expect(updatedApproved.version.version).toBe(2);
      expect(updatedApproved.version.status).toBe('draft');

      // 5. Verify database integrity: version 1 must STILL exist in 'approved' status!
      const rows = await dbClient.db
        .select()
        .from(questionGroupVersions)
        .where(eq(questionGroupVersions.groupId, groupId))
        .orderBy(questionGroupVersions.version);

      expect(rows.length).toBe(2);
      expect(rows[0]?.version).toBe(1);
      expect(rows[0]?.status).toBe('approved'); // IMMUTABLE!
      expect(rows[1]?.version).toBe(2);
      expect(rows[1]?.status).toBe('draft'); // NEW DRAFT!
    });
  });

  describe('Review Workflow & Separation of Duties', () => {
    it('prevents author/last editor from approving their own content', async () => {
      const created = await qbService.createGroup(
        {
          level: 'N4',
          sectionCode: 'reading',
          questions: [
            {
              stem: [{ t: 'text', text: 'Reading test' }],
              options: [
                { orderIndex: 1, content: [{ t: 'text', text: '1' }] },
                { orderIndex: 2, content: [{ t: 'text', text: '2' }] },
                { orderIndex: 3, content: [{ t: 'text', text: '3' }] },
                { orderIndex: 4, content: [{ t: 'text', text: '4' }] },
              ],
              correctOption: 3,
              skill: 'reading',
              mondaiType: 'comprehension_short',
            },
          ],
        },
        authorId,
      );

      await qbService.submitForReview(created.id, 1, authorId);

      // Reviewer is same as last editor -> FORBIDDEN!
      await expect(
        qbService.reviewGroup(
          created.id,
          1,
          { decision: 'approved', comment: 'Self approval attempt' },
          authorId,
        ),
      ).rejects.toThrow(ForbiddenException);

      // Independent reviewer approves -> SUCCESS
      const approved = await qbService.reviewGroup(
        created.id,
        1,
        { decision: 'approved', comment: 'Independent review pass' },
        reviewerId,
      );
      expect(approved.status).toBe('approved');
    });

    it('allows temporarily hiding flawed questions (QB-13)', async () => {
      const created = await qbService.createGroup(
        {
          level: 'N3',
          sectionCode: 'grammar',
          questions: [
            {
              stem: [{ t: 'text', text: 'Flawed question' }],
              options: [
                { orderIndex: 1, content: [{ t: 'text', text: '1' }] },
                { orderIndex: 2, content: [{ t: 'text', text: '2' }] },
                { orderIndex: 3, content: [{ t: 'text', text: '3' }] },
                { orderIndex: 4, content: [{ t: 'text', text: '4' }] },
              ],
              correctOption: 1,
              skill: 'grammar',
              mondaiType: 'grammar_form',
            },
          ],
        },
        authorId,
      );

      const hideRes = await qbService.hideGroup(
        created.id,
        { reason: 'Phát hiện lỗi sai đề bài từ người học báo cáo' },
        editorId,
      );

      expect(hideRes.status).toBe('hidden');
      expect(hideRes.version.status).toBe('hidden');
    });
  });

  describe('Public Student Preview (Strictly No Answer Leaks)', () => {
    it('returns public question preview with zero answer keys or correct fields', async () => {
      const created = await qbService.createGroup(
        {
          level: 'N5',
          sectionCode: 'language_vocab',
          title: 'Preview test',
          questions: [
            {
              stem: [{ t: 'text', text: 'Student sees stem' }],
              options: [
                { orderIndex: 1, content: [{ t: 'text', text: 'Opt 1' }] },
                { orderIndex: 2, content: [{ t: 'text', text: 'Opt 2' }] },
                { orderIndex: 3, content: [{ t: 'text', text: 'Opt 3' }] },
                { orderIndex: 4, content: [{ t: 'text', text: 'Opt 4' }] },
              ],
              correctOption: 2,
              explanation: [{ t: 'text', text: 'Private explanation' }],
              skill: 'vocabulary',
              mondaiType: 'contextual',
            },
          ],
        },
        authorId,
      );

      const publicPreview = await qbService.getGroupPublicPreview(created.id, 1);

      // Verify assertNoAnswerLeak does not throw
      expect(() => assertNoAnswerLeak(publicPreview)).not.toThrow();

      // Inspect public payload directly
      expect(publicPreview.groupId).toBe(created.id);
      expect(publicPreview.questions[0]?.stem).toBeDefined();
      expect(publicPreview.questions[0]?.options.length).toBe(4);
      const firstQ = publicPreview.questions[0] as unknown as Record<string, unknown>;
      expect(firstQ['correctOption']).toBeUndefined();
      expect(firstQ['correct']).toBeUndefined();
      expect(firstQ['isCorrect']).toBeUndefined();
      expect(firstQ['explanation']).toBeUndefined();
    });
  });

  describe('Acceptance 4: Import trùng checksum idempotent', () => {
    it('processes ZIP import idempotently when checksum matches and detects conflict when modified', async () => {
      const validZip = createRawZip([
        {
          name: 'import.json',
          content: Buffer.from(
            JSON.stringify({
              formatVersion: 2,
              packageId: 'b7c01df2-4735-43a9-9ec7-c0e8eb8754b1',
              revision: 1,
              source: {
                level: 'N5',
                provenance: 'self_authored',
              },
              groups: [
                {
                  sectionCode: 'language_vocab',
                  mondaiType: 'kanji_reading',
                  title: 'Nhập từ gói ZIP mẫu',
                  questions: [
                    {
                      stem: [{ t: 'text', text: 'Kanji q1' }],
                      options: [
                        { label: '1', content: [{ t: 'text', text: 'A' }] },
                        { label: '2', content: [{ t: 'text', text: 'B' }] },
                        { label: '3', content: [{ t: 'text', text: 'C' }] },
                        { label: '4', content: [{ t: 'text', text: 'D' }] },
                      ],
                      correctOption: 1,
                    },
                  ],
                },
              ],
            }),
            'utf8',
          ),
        },
      ]);

      // First import
      const firstRes = await qbService.importPackage(validZip, 'sample-n5.zip', importerId);
      expect(firstRes.status).toBe('succeeded');
      expect(firstRes.idempotent).toBe(false);
      expect(firstRes.jobId).toBeDefined();

      // Second import with IDENTICAL checksum
      const secondRes = await qbService.importPackage(validZip, 'sample-n5.zip', importerId);
      expect(secondRes.status).toBe('succeeded');
      expect(secondRes.idempotent).toBe(true);
      expect(secondRes.jobId).toBe(firstRes.jobId);
      expect(secondRes.message).toBe('Import trùng checksum idempotent');

      // Database question_groups must not be duplicated
      const groups = await dbClient.db
        .select()
        .from(questionGroups)
        .where(eq(questionGroups.title, 'Nhập từ gói ZIP mẫu'));
      expect(groups).toHaveLength(1);

      // Third import with SAME packageId and revision, but MODIFIED content (different checksum)
      const modifiedZip = createRawZip([
        {
          name: 'import.json',
          content: Buffer.from(
            JSON.stringify({
              formatVersion: 2,
              packageId: 'b7c01df2-4735-43a9-9ec7-c0e8eb8754b1', // Same ID
              revision: 1, // Same revision
              source: {
                level: 'N5',
                provenance: 'self_authored',
              },
              groups: [
                {
                  sectionCode: 'language_vocab',
                  mondaiType: 'kanji_reading',
                  title: 'Nội dung bị thay đổi âm thầm mà không tăng revision',
                  questions: [],
                },
              ],
            }),
            'utf8',
          ),
        },
      ]);

      await expect(
        qbService.importPackage(modifiedZip, 'sample-n5-modified.zip', importerId),
      ).rejects.toThrow(ConflictException);
    });
  });
});
