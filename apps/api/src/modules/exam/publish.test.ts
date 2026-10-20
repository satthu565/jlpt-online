import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
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
import { ImportService } from '../import/import.service.js';
import { ExamService } from './exam.service.js';
import { backfillListeningTimeline } from '../import/backfill-listening-timeline.js';
import { assertNoAnswerLeak, PublicExamSnapshotSchema } from '@jlpt/schema';

describe('B01 Exam Module - Review Workflow, Publishing & Zero Answer Leaks', () => {
  let tempStorageDir: string;
  let dbClient: DbClientInstance;
  let storageService: StorageService;
  let mediaService: MediaService;
  let outboxService: OutboxService;
  let blueprintService: BlueprintService;
  let reviewService: ReviewService;
  let importService: ImportService;
  let examService: ExamService;

  const editorUserId = '0192f000-0000-7000-8000-0000000000e1';
  const reviewerUserId = '0192f000-0000-7000-8000-0000000000d1';
  const publisherUserId = '0192f000-0000-7000-8000-0000000000b1';

  beforeEach(async () => {
    tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jlpt-publish-test-'));
    process.env.STORAGE_LOCAL_ROOT = tempStorageDir;

    dbClient = await createDbClient();
    await runMigrations(dbClient);

    const localStorage = new LocalFsStorage(tempStorageDir);
    storageService = new StorageService();
    storageService.setStorageInstance(localStorage);

    mediaService = new MediaService(dbClient, storageService);
    outboxService = new OutboxService(dbClient);
    blueprintService = new BlueprintService(dbClient);
    reviewService = new ReviewService(dbClient, outboxService);
    importService = new ImportService(
      dbClient,
      storageService,
      mediaService,
      reviewService,
      outboxService,
      blueprintService,
    );
    examService = new ExamService(dbClient, storageService, outboxService, blueprintService);

    // Create test accounts
    await dbClient.db
      .insert(schema.users)
      .values([
        {
          id: editorUserId,
          name: 'Content Editor',
          email: 'editor@jlpt.local',
          emailVerified: true,
          role: 'editor',
          locale: 'vi',
          timezone: 'Asia/Ho_Chi_Minh',
        },
        {
          id: reviewerUserId,
          name: 'Content Reviewer',
          email: 'reviewer@jlpt.local',
          emailVerified: true,
          role: 'reviewer',
          locale: 'vi',
          timezone: 'Asia/Ho_Chi_Minh',
        },
        {
          id: publisherUserId,
          name: 'Content Publisher',
          email: 'publisher@jlpt.local',
          emailVerified: true,
          role: 'admin',
          locale: 'vi',
          timezone: 'Asia/Ho_Chi_Minh',
        },
      ])
      .onConflictDoNothing();

    // Seed synthetic blueprint for demo exam
    const bpPath = resolveRepoPath(
      'docs/multi-worker/demo-data/blueprints/synthetic-n5-demo-v1.json',
    );
    const bpData = JSON.parse(fs.readFileSync(bpPath, 'utf8'));
    await blueprintService.upsertBlueprint(bpData, publisherUserId);
  });

  afterEach(async () => {
    if (dbClient) {
      await dbClient.close();
    }
    delete process.env.STORAGE_LOCAL_ROOT;
    if (tempStorageDir && fs.existsSync(tempStorageDir)) {
      fs.rmSync(tempStorageDir, { recursive: true, force: true });
    }
  });

  describe('Acceptance 3: Editor!=reviewer; create version và outbox transaction consistent', () => {
    it('strictly forbids editor from approving their own content (separation of duties)', async () => {
      // Import package as editor
      const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
      const zipBuffer = fs.readFileSync(zipPath);
      await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', editorUserId);

      // Get one imported group
      const groups = await dbClient.db.select().from(schema.questionGroups);
      expect(groups.length).toBeGreaterThan(0);
      const testGroupId = groups[0]!.id;

      // Editor submits group for review
      await reviewService.submitForReview('group_version', testGroupId, 1, editorUserId);

      // Same user (editor) tries to approve -> MUST throw 403 Forbidden
      await expect(
        reviewService.reviewDecision(
          'group_version',
          testGroupId,
          1,
          { decision: 'approved', comments: 'Tự duyệt bài của mình' },
          editorUserId,
        ),
      ).rejects.toThrow(/Người duyệt không được là người sửa cuối cùng/);
    });

    it('allows a distinct reviewer to approve and emits content.approved in outbox', async () => {
      const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
      const zipBuffer = fs.readFileSync(zipPath);
      await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', editorUserId);

      const groups = await dbClient.db.select().from(schema.questionGroups);
      const testGroupId = groups[0]!.id;

      await reviewService.submitForReview('group_version', testGroupId, 1, editorUserId);

      // Distinct reviewer (reviewerUserId !== editorUserId) approves
      const decision = await reviewService.reviewDecision(
        'group_version',
        testGroupId,
        1,
        { decision: 'approved', comments: 'Đã kiểm tra và phê duyệt' },
        reviewerUserId,
      );

      expect(decision.status).toBe('approved');

      // Verify group status in DB
      const gvRows = await dbClient.db
        .select()
        .from(schema.questionGroupVersions)
        .where(eq(schema.questionGroupVersions.groupId, testGroupId));
      expect(gvRows[0]?.status).toBe('approved');

      // Verify content_reviews table has recorded reviewer and lastEditor
      const reviews = await dbClient.db
        .select()
        .from(schema.contentReviews)
        .where(eq(schema.contentReviews.targetId, testGroupId));
      expect(reviews.length).toBe(1);
      expect(reviews[0]?.reviewerId).toBe(reviewerUserId);
      expect(reviews[0]?.lastEditorId).toBe(editorUserId);

      // Verify Outbox event content.approved
      const outboxRows = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'content.approved'));
      expect(outboxRows.length).toBeGreaterThanOrEqual(1);
    });

    it('rejects publishing when any question or group remains unapproved (draft or in_review)', async () => {
      const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
      const zipBuffer = fs.readFileSync(zipPath);
      await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', editorUserId);

      const examRows = await dbClient.db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.slug, 'demo-n5-1'));
      const examId = examRows[0]!.id;

      // Attempting to publish right away (all questions in draft) MUST fail
      await expect(
        examService.publishExam(examId, publisherUserId),
      ).rejects.toThrow(/chưa được duyệt/);
    });

    it('publishes exam successfully when all questions are approved, creating version snapshot and outbox event', async () => {
      // 1. Import
      const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
      const zipBuffer = fs.readFileSync(zipPath);
      await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', editorUserId);

      const examRows = await dbClient.db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.slug, 'demo-n5-1'));
      const examId = examRows[0]!.id;

      // 2. Approve all questions via Reviewer
      await reviewService.approveAllExamQuestions(examId, reviewerUserId, editorUserId);

      // 3. Publish via Publisher
      const publishResult = await examService.publishExam(examId, publisherUserId);
      expect(publishResult.version).toBe(1);
      expect(publishResult.totalQuestions).toBe(29);
      expect(publishResult.snapshotKey).toBe(`exams/${examId}/v1/snapshot.json`);
      expect(publishResult.manifestKey).toBe(`exams/${examId}/v1/manifest.json`);

      // 4. Verify Snapshot in Storage
      const snapshotObj = await storageService.get(publishResult.snapshotKey);
      expect(snapshotObj).not.toBeNull();
      const snapshot = JSON.parse(snapshotObj!.data.toString('utf8'));

      // Strict Zero Answer Leak assertion
      expect(() => assertNoAnswerLeak(snapshot)).not.toThrow();
      expect(() => PublicExamSnapshotSchema.parse(snapshot)).not.toThrow();
      expect(snapshot.totalQuestions).toBe(29);

      // Verify Manifest in Storage
      const manifestObj = await storageService.get(publishResult.manifestKey);
      expect(manifestObj).not.toBeNull();

      // 5. Verify Server-Only Answer Key in Database
      const answerKeyRows = await dbClient.db
        .select()
        .from(schema.examAnswerKeys)
        .where(eq(schema.examAnswerKeys.examId, examId));
      expect(answerKeyRows.length).toBe(1);
      expect(answerKeyRows[0]?.version).toBe(1);
      expect(answerKeyRows[0]?.keys.length).toBe(29);
      for (const k of answerKeyRows[0]!.keys) {
        expect(k).toBeGreaterThanOrEqual(1);
        expect(k).toBeLessThanOrEqual(4);
      }

      // 6. Verify exam status
      const updatedExam = await dbClient.db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.id, examId));
      expect(updatedExam[0]?.publishedVersion).toBe(1);

      // 7. Verify outbox event content.published
      const outboxPublish = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'content.published'));
      expect(outboxPublish.length).toBe(1);
      const payload = outboxPublish[0]?.payload as { payload: { examId: string; version: number; publisherId: string } };
      expect(payload.payload.examId).toBe(examId);
      expect(payload.payload.version).toBe(1);
      expect(payload.payload.publisherId).toBe(publisherUserId);
    });

    it('enforces immutability: re-publishing increments to version 2 rather than mutating version 1', async () => {
      // Setup and publish version 1
      const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
      const zipBuffer = fs.readFileSync(zipPath);
      await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', editorUserId);

      const examRows = await dbClient.db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.slug, 'demo-n5-1'));
      const examId = examRows[0]!.id;
      await reviewService.approveAllExamQuestions(examId, reviewerUserId, editorUserId);
      const v1 = await examService.publishExam(examId, publisherUserId);
      expect(v1.version).toBe(1);

      // Publish again
      const v2 = await examService.publishExam(examId, publisherUserId);
      expect(v2.version).toBe(2);

      // Both version 1 and version 2 records must exist in exam_versions
      const versions = await dbClient.db
        .select()
        .from(schema.examVersions)
        .where(eq(schema.examVersions.examId, examId))
        .orderBy(schema.examVersions.version);
      expect(versions.length).toBe(2);
      expect(versions[0]?.version).toBe(1);
      expect(versions[1]?.version).toBe(2);
    });

    it('unpublishes exam and emits content.taken_down event', async () => {
      const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
      const zipBuffer = fs.readFileSync(zipPath);
      await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', editorUserId);

      const examRows = await dbClient.db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.slug, 'demo-n5-1'));
      const examId = examRows[0]!.id;
      await reviewService.approveAllExamQuestions(examId, reviewerUserId, editorUserId);
      await examService.publishExam(examId, publisherUserId);

      // Unpublish
      await examService.unpublishExam(examId, publisherUserId, 'Gỡ để kiểm tra');

      const examAfter = await dbClient.db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.id, examId));
      expect(examAfter[0]?.publishedVersion).toBeNull();

      const outboxTakedown = await dbClient.db
        .select()
        .from(schema.outbox)
        .where(eq(schema.outbox.topic, 'content.taken_down'));
      expect(outboxTakedown.length).toBe(1);
    });

    it('supports public exam discovery (A8) only returning published exams', async () => {
      // Import exam (draft)
      const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
      const zipBuffer = fs.readFileSync(zipPath);
      await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', editorUserId);

      // Before publish: public list is empty
      const listBefore = await examService.listPublicExams();
      expect(listBefore.length).toBe(0);

      // Before publish: public slug lookup throws NotFoundException
      await expect(examService.getPublicExamBySlug('demo-n5-1')).rejects.toThrow();

      // Approve and publish
      const examRows = await dbClient.db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.slug, 'demo-n5-1'));
      const examId = examRows[0]!.id;
      await reviewService.approveAllExamQuestions(examId, reviewerUserId, editorUserId);
      await examService.publishExam(examId, publisherUserId);

      // After publish: public list returns exam
      const listAfter = await examService.listPublicExams({ level: 'N5' });
      expect(listAfter.length).toBe(1);
      expect(listAfter[0]?.slug).toBe('demo-n5-1');
      expect(listAfter[0]?.publishedVersion).toBe(1);

      // After publish: public slug lookup succeeds
      const detail = await examService.getPublicExamBySlug('demo-n5-1');
      expect(detail.slug).toBe('demo-n5-1');
      expect(detail.totalQuestions).toBe(29);
      expect(detail.publishedVersion).toBe(1);
    });

    it('collects media keys and audioSha256 into examManifest.media and publicGroups.media', async () => {
      const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
      const zipBuffer = fs.readFileSync(zipPath);
      await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', editorUserId);

      const examRows = await dbClient.db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.slug, 'demo-n5-1'));
      const examId = examRows[0]!.id;

      await reviewService.approveAllExamQuestions(examId, reviewerUserId, editorUserId);
      const publishResult = await examService.publishExam(examId, publisherUserId);

      // Verify exam manifest media
      const manifestObj = await storageService.get(publishResult.manifestKey);
      expect(manifestObj).not.toBeNull();
      const manifest = JSON.parse(manifestObj!.data.toString('utf8'));
      expect(Array.isArray(manifest.media)).toBe(true);
      expect(manifest.media.length).toBeGreaterThan(0);
      expect(manifest.media.some((m: string) => m.endsWith('.wav'))).toBe(true);

      // Verify public groups media in snapshot
      const snapshotObj = await storageService.get(publishResult.snapshotKey);
      expect(snapshotObj).not.toBeNull();
      const snapshot = JSON.parse(snapshotObj!.data.toString('utf8'));
      const listeningSec = snapshot.sections.find((s: { code: string }) => s.code === 'listening');
      expect(listeningSec).toBeDefined();
      const groupsWithMedia = listeningSec.groups.filter((g: { media: string[] }) => g.media.length > 0);
      expect(groupsWithMedia.length).toBeGreaterThan(0);
    });

    it('keeps the package listening timeline in the published snapshot and the preview', async () => {
      const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
      await importService.processPackageImport(fs.readFileSync(zipPath), 'demo-n5-1.zip', editorUserId);
      const examId = (
        await dbClient.db.select().from(schema.exams).where(eq(schema.exams.slug, 'demo-n5-1'))
      )[0]!.id;

      // Group audio is the audio file, never an image of the same group.
      const groupVersions = await dbClient.db.select().from(schema.questionGroupVersions);
      const audioShas = groupVersions
        .map((g: typeof schema.questionGroupVersions.$inferSelect) => g.audioSha256)
        .filter(Boolean) as string[];
      expect(audioShas.length).toBeGreaterThan(0);
      for (const sha of audioShas) {
        const asset = await dbClient.db
          .select()
          .from(schema.mediaAssets)
          .where(eq(schema.mediaAssets.sha256, sha));
        expect(asset[0]?.mime).toMatch(/^audio\//);
      }

      await reviewService.approveAllExamQuestions(examId, reviewerUserId, editorUserId);
      const publishResult = await examService.publishExam(examId, publisherUserId);
      const snapshot = JSON.parse((await storageService.get(publishResult.snapshotKey))!.data.toString('utf8'));
      expect(() => PublicExamSnapshotSchema.parse(snapshot)).not.toThrow();

      const listeningSec = snapshot.sections.find((s: { code: string }) => s.code === 'listening');
      expect(listeningSec.listeningTimeline).toHaveLength(7);
      const groupIds = new Set(listeningSec.groups.map((g: { groupId: string }) => g.groupId));
      for (const item of listeningSec.listeningTimeline) {
        expect(groupIds.has(item.groupId)).toBe(true);
        expect(item.mediaKey).toMatch(/^media\/.+\.(wav|mp3)$/);
      }
      expect(snapshot.sections.filter((s: { listeningTimeline: unknown }) => s.listeningTimeline)).toHaveLength(1);

      const exam = (await dbClient.db.select().from(schema.exams).where(eq(schema.exams.id, examId)))[0]!;
      const preview = await examService.constructPublicSnapshot(exam, 1);
      const previewSec = preview.sections.find((s) => s.code === 'listening')!;
      expect(previewSec.listeningTimeline).toEqual(listeningSec.listeningTimeline);
    });

    it('backfills the timeline and group audio of exams imported before the timeline was stored', async () => {
      const zipBuffer = fs.readFileSync(resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip'));
      await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', editorUserId);
      const examId = (
        await dbClient.db.select().from(schema.exams).where(eq(schema.exams.slug, 'demo-n5-1'))
      )[0]!.id;
      const sectionsBefore = await dbClient.db
        .select()
        .from(schema.examSections)
        .where(eq(schema.examSections.examId, examId));
      const expected = sectionsBefore.find((s: { code: string }) => s.code === 'listening')!.listeningTimeline;

      // State left by older imports: no timeline, audio pointing at another file.
      await dbClient.db
        .update(schema.examSections)
        .set({ listeningTimeline: null })
        .where(eq(schema.examSections.examId, examId));
      await dbClient.db.update(schema.questionGroupVersions).set({ audioSha256: 'not-the-audio' });

      const result = await backfillListeningTimeline(dbClient, zipBuffer);
      expect(result).toMatchObject({ examSlug: 'demo-n5-1', sections: 1 });
      expect(result.groupsAudioFixed).toBeGreaterThan(0);

      const sectionsAfter = await dbClient.db
        .select()
        .from(schema.examSections)
        .where(eq(schema.examSections.examId, examId));
      expect(sectionsAfter.find((s: { code: string }) => s.code === 'listening')!.listeningTimeline).toEqual(expected);
      const audio = await dbClient.db.select().from(schema.questionGroupVersions);
      expect(audio.some((g: { audioSha256: string | null }) => g.audioSha256 === 'not-the-audio')).toBe(false);

      // Re-running changes nothing.
      expect((await backfillListeningTimeline(dbClient, zipBuffer)).groupsAudioFixed).toBe(0);
    });

    it('persists lastEditorId across in-memory cache wipes / server restart and prevents self-approval', async () => {
      const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
      const zipBuffer = fs.readFileSync(zipPath);
      await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', editorUserId);

      const groups = await dbClient.db.select().from(schema.questionGroups);
      const testGroupId = groups[0]!.id;

      // Simulate process restart by creating a fresh ReviewService instance with empty in-memory cache
      const freshReviewService = new ReviewService(dbClient, outboxService);

      // Verify getLastEditor retrieves editorUserId from database (content_reviews / import_artifacts)
      const restoredEditor = await freshReviewService.getLastEditor('group_version', testGroupId, 1);
      expect(restoredEditor).toBe(editorUserId);

      // Verify self-approval is strictly forbidden even after cache wipe
      await expect(
        freshReviewService.reviewDecision(
          'group_version',
          testGroupId,
          1,
          { decision: 'approved', comments: 'Tự duyệt sau khi xóa bộ nhớ đệm' },
          editorUserId,
        ),
      ).rejects.toThrow(/Người duyệt không được là người sửa cuối cùng/);

      // Verify distinct reviewer can approve successfully
      const approved = await freshReviewService.reviewDecision(
        'group_version',
        testGroupId,
        1,
        { decision: 'approved', comments: 'Duyệt hợp lệ sau khi khởi động lại' },
        reviewerUserId,
      );
      expect(approved.status).toBe('approved');
    });

    it('strictly rejects review decision with BadRequestException when lastEditorId is completely unknown', async () => {
      const unknownTargetId = '0192f000-0000-7000-8000-000000000099';
      await expect(
        reviewService.reviewDecision(
          'group_version',
          unknownTargetId,
          1,
          { decision: 'approved' },
          reviewerUserId,
        ),
      ).rejects.toThrow(/Không thể xác định người biên tập/);
    });
  });
});
