import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { resolveRepoPath } from '../../common/utils/paths.js';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import * as schema from '../../db/schema.js';
import { StorageService } from '../storage/storage.service.js';
import { LocalFsStorage } from '../storage/local-fs.storage.js';
import { MediaService } from '../media/media.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { BlueprintService } from '../blueprint/blueprint.service.js';
import { ReviewService } from '../review/review.service.js';
import { AuditService } from '../audit/audit.service.js';
import { ImportService } from '../import/import.service.js';
import { ExamService } from './exam.service.js';

describe('Admin "Duyệt & xuất bản" cả đề (owner decision 2026-10-20)', () => {
  let tempStorageDir: string;
  let dbClient: DbClientInstance;
  let reviewService: ReviewService;
  let importService: ImportService;
  let examService: ExamService;
  const adminUserId = '0192f000-0000-7000-8000-0000000000a1';

  beforeEach(async () => {
    tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jlpt-approve-publish-'));
    process.env.STORAGE_LOCAL_ROOT = tempStorageDir;
    dbClient = await createDbClient();
    await runMigrations(dbClient);
    const storageService = new StorageService();
    storageService.setStorageInstance(new LocalFsStorage(tempStorageDir));
    const outboxService = new OutboxService(dbClient);
    const blueprintService = new BlueprintService(dbClient);
    reviewService = new ReviewService(dbClient, outboxService);
    importService = new ImportService(
      dbClient,
      storageService,
      new MediaService(dbClient, storageService),
      reviewService,
      outboxService,
      blueprintService,
    );
    examService = new ExamService(
      dbClient,
      storageService,
      outboxService,
      blueprintService,
      reviewService,
      new AuditService(dbClient),
    );
    await dbClient.db
      .insert(schema.users)
      .values({
        id: adminUserId,
        name: 'Owner Admin',
        email: 'owner-admin@jlpt.local',
        emailVerified: true,
        role: 'admin',
        locale: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
      })
      .onConflictDoNothing();
    const bp = JSON.parse(
      fs.readFileSync(resolveRepoPath('docs/multi-worker/demo-data/blueprints/synthetic-n5-demo-v1.json'), 'utf8'),
    );
    await blueprintService.upsertBlueprint(bp, adminUserId);
  });

  afterEach(async () => {
    await dbClient?.close();
    delete process.env.STORAGE_LOCAL_ROOT;
    if (tempStorageDir && fs.existsSync(tempStorageDir)) fs.rmSync(tempStorageDir, { recursive: true, force: true });
  });

  async function importDemoAsAdmin(): Promise<string> {
    const zip = fs.readFileSync(resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip'));
    const job = await importService.processPackageImport(zip, 'demo-n5-1.zip', adminUserId);
    expect(job.draftExamId).toBeTruthy();
    return job.draftExamId!;
  }

  it('admin đã nạp đề vẫn duyệt và xuất bản cả đề bằng một thao tác, có ghi nhật ký kiểm toán', async () => {
    const examId = await importDemoAsAdmin();
    await expect(examService.publishExam(examId, adminUserId)).rejects.toThrow(/chưa được duyệt/);

    const res = await examService.approveAndPublishExam(examId, adminUserId);
    expect(res.version).toBe(1);
    expect(res.approvedGroups).toBeGreaterThan(0);

    const versions = await dbClient.db.select().from(schema.questionGroupVersions);
    expect(versions.every((v: { status: string }) => v.status === 'approved')).toBe(true);
    const reviews = await dbClient.db.select().from(schema.contentReviews);
    expect(reviews.length).toBe(res.approvedGroups);
    expect(reviews.every((r: { reviewerId: string; comments: string | null }) => r.reviewerId === adminUserId && r.comments === 'Admin duyệt cả đề và xuất bản')).toBe(true);
    const audit = await dbClient.db
      .select()
      .from(schema.operatorActions)
      .where(eq(schema.operatorActions.action, 'exam.approve_and_publish'));
    expect(audit).toHaveLength(1);
    expect(audit[0]!.targetResource).toBe(`exam:${examId}`);
  });

  it('nhóm đã duyệt không bị duyệt lại ở lần sau', async () => {
    const examId = await importDemoAsAdmin();
    await examService.approveAndPublishExam(examId, adminUserId);
    const again = await examService.approveAndPublishExam(examId, adminUserId);
    expect(again.approvedGroups).toBe(0);
    expect(again.version).toBe(2);
  });

  it('xuất bản lại sau khi gỡ không trùng phiên bản (publishedVersion bị đặt lại về null)', async () => {
    const examId = await importDemoAsAdmin();
    const first = await examService.approveAndPublishExam(examId, adminUserId);
    expect(first.version).toBe(1);
    await examService.unpublishExam(examId, adminUserId, 'test takedown');
    const again = await examService.approveAndPublishExam(examId, adminUserId);
    expect(again.version).toBe(2);
  });

  it('ngoài lối admin này, quy tắc 4 mắt vẫn áp dụng: admin không tự duyệt nội dung mình nạp', async () => {
    await importDemoAsAdmin();
    const [group] = await dbClient.db.select().from(schema.questionGroupVersions).limit(1);
    await expect(
      reviewService.reviewDecision('group_version', group!.groupId, group!.version, { decision: 'approved' }, adminUserId),
    ).rejects.toThrow(/Người duyệt không được là người sửa cuối cùng/);
  });

  it('gói nháp (DRAFT_ONLY) vẫn không được duyệt kể cả với admin', async () => {
    const draftZip = fs.readFileSync(resolveRepoPath('fixtures/imports/draft.zip'));
    const job = await importService.processPackageImport(draftZip, 'draft.zip', adminUserId, { mode: 'draft' });
    expect(job.draftExamId).toBeTruthy();
    await expect(examService.approveAndPublishExam(job.draftExamId!, adminUserId)).rejects.toThrow();
  });
});
