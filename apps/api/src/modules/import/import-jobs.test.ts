import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import * as schema from '../../db/schema.js';
import { StorageService } from '../storage/storage.service.js';
import { MediaService } from '../media/media.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { BlueprintService } from '../blueprint/blueprint.service.js';
import { ReviewService } from '../review/review.service.js';
import { ImportService } from './import.service.js';
import { execFileSync } from 'node:child_process';
import { runDemoSeed } from './demo-seed.js';

function createZipBuffer(files: Record<string, string | Uint8Array>): Buffer {
  const tmpDir = fs.mkdtempSync(path.join(process.cwd(), 'node_modules/.tmp-zip-'));
  try {
    for (const [p, content] of Object.entries(files)) {
      const fullPath = path.join(tmpDir, p);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }
    const zipPath = path.join(tmpDir, 'out.zip');
    execFileSync('python3', [
      '-c',
      `
import zipfile, os, sys
src = sys.argv[1]
out = sys.argv[2]
with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(src):
        for f in files:
            if f != 'out.zip':
                fp = os.path.join(root, f)
                arc = os.path.relpath(fp, src)
                z.write(fp, arc)
`,
      tmpDir,
      zipPath,
    ]);
    return fs.readFileSync(zipPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('B01 Import Module - Import Jobs, Validation & Idempotency', () => {
  let dbClient: DbClientInstance;
  let storageService: StorageService;
  let mediaService: MediaService;
  let outboxService: OutboxService;
  let blueprintService: BlueprintService;
  let reviewService: ReviewService;
  let importService: ImportService;

  const testUserId = '0192f000-0000-7000-8000-0000000000e1';

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);

    storageService = new StorageService();
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

    // Create test user
    await dbClient.db
      .insert(schema.users)
      .values({
        id: testUserId,
        name: 'Test Content Editor',
        email: 'editor@jlpt.local',
        emailVerified: true,
        role: 'editor',
        locale: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
      })
      .onConflictDoNothing();
  });

  afterEach(async () => {
    await dbClient.close();
  });

  describe('Acceptance 1: Validate trước import DB; transaction rollback không để dữ liệu dở', () => {
    it('rejects corrupted zip archive before touching the database', async () => {
      const corruptBuffer = Buffer.from('not a zip file content');

      await expect(
        importService.processPackageImport(corruptBuffer, 'corrupt.zip', testUserId),
      ).rejects.toThrow(/ZIP không hợp lệ/);

      // Verify zero jobs or questions created
      const jobs = await dbClient.db.select().from(schema.importJobs);
      expect(jobs.length).toBe(0);

      const questions = await dbClient.db.select().from(schema.questions);
      expect(questions.length).toBe(0);
    });

    it('rejects zip missing import.json at root before inserting into DB', async () => {
      // Create minimal zip without import.json
      const zipPath = path.resolve(process.cwd(), 'docs/multi-worker/demo-data/demo-n5-1.zip');
      const validZip = fs.readFileSync(zipPath);

      // Mutate package: change import.json name or create a buffer missing it
      const { readZipBuffer } = await import('@jlpt/content-tools');
      const files = readZipBuffer(validZip);
      delete files['import.json'];

      // Pack files without import.json
      const archiver = await import('node:zlib');
      // Or pass invalid payload
      const emptyBuffer = Buffer.from([
        0x50, 0x4b, 0x05, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);

      await expect(
        importService.processPackageImport(emptyBuffer, 'empty.zip', testUserId),
      ).rejects.toThrow(/thiếu tệp import.json/);

      const jobs = await dbClient.db.select().from(schema.importJobs);
      expect(jobs.length).toBe(0);
    });

    it('rejects draft package with blocking issues in ready mode without modifying DB', async () => {
      const draftZipPath = path.resolve(process.cwd(), 'docs/multi-worker/examples/import-v2-draft.zip');
      if (fs.existsSync(draftZipPath)) {
        const draftBuffer = fs.readFileSync(draftZipPath);

        await expect(
          importService.processPackageImport(draftBuffer, 'draft.zip', testUserId, { mode: 'ready' }),
        ).rejects.toThrow();

        const jobs = await dbClient.db.select().from(schema.importJobs);
        expect(jobs.length).toBe(0);
      }
    });

    it('guarantees complete transaction rollback on failure so no orphaned rows exist', async () => {
      const zipPath = path.resolve(process.cwd(), 'docs/multi-worker/demo-data/demo-n5-1.zip');
      const validZip = fs.readFileSync(zipPath);

      // Monkey patch dbClient.db.transaction to simulate a failure halfway through
      const originalTx = dbClient.db.transaction.bind(dbClient.db);
      dbClient.db.transaction = async (cb: any) => {
        return originalTx(async (tx: any) => {
          // Perform first insert then intentionally throw
          await tx.insert(schema.importJobs).values({
            id: '0192f000-0000-7000-8000-000000000099',
            uploadedBy: testUserId,
            status: 'pending',
            packageSha256: 'test-sha',
            fileName: 'fail.zip',
            targetLevel: 'N5',
          });
          throw new Error('Simulated mid-transaction failure');
        });
      };

      await expect(
        importService.processPackageImport(validZip, 'demo-n5-1.zip', testUserId),
      ).rejects.toThrow('Simulated mid-transaction failure');

      // Verify that the rollback was clean and NO partial importJobs exist
      const jobs = await dbClient.db.select().from(schema.importJobs);
      expect(jobs.length).toBe(0);

      const groups = await dbClient.db.select().from(schema.questionGroups);
      expect(groups.length).toBe(0);

      const outboxRows = await dbClient.db.select().from(schema.outbox);
      expect(outboxRows.length).toBe(0);
    });
  });

  describe('Acceptance 2: PackageId/revision/content hash chống trùng và nhận diện conflict', () => {
    it('processes initial import successfully and emits outbox domain event', async () => {
      const zipPath = path.resolve(process.cwd(), 'docs/multi-worker/demo-data/demo-n5-1.zip');
      const zipBuffer = fs.readFileSync(zipPath);

      const result = await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', testUserId);

      expect(result.status).toBe('succeeded');
      expect(result.idempotent).toBe(false);
      expect(result.packageId).toBe('6f1c2a10-5d3e-4b7a-9c21-0a0000000501');
      expect(result.revision).toBe(1);
      expect(result.contentHash).toBeDefined();

      // Verify database entities
      const jobs = await dbClient.db.select().from(schema.importJobs);
      expect(jobs.length).toBe(1);
      expect(jobs[0]?.status).toBe('succeeded');

      const questions = await dbClient.db.select().from(schema.questions);
      expect(questions.length).toBe(29);

      const groups = await dbClient.db.select().from(schema.questionGroups);
      expect(groups.length).toBe(15);

      const exams = await dbClient.db.select().from(schema.exams);
      expect(exams.length).toBe(1);
      expect(exams[0]?.slug).toBe('demo-n5-1');
      expect(exams[0]?.publishedVersion).toBeNull(); // Draft

      // Verify Outbox Event
      const outboxEvents = await dbClient.db.select().from(schema.outbox);
      expect(outboxEvents.length).toBe(1);
      expect(outboxEvents[0]?.topic).toBe('content.import.completed');

      const payload = outboxEvents[0]?.payload as any;
      expect(payload.payload.importJobId).toBe(result.id);
      expect(payload.payload.revision).toBe(1);
      expect(payload.payload.questionsCount).toBe(29);
      expect(payload.payload.groupsCount).toBe(15);
    });

    it('returns IDEMPOTENT_SKIP when re-importing the same package without duplicate rows', async () => {
      const zipPath = path.resolve(process.cwd(), 'docs/multi-worker/demo-data/demo-n5-1.zip');
      const zipBuffer = fs.readFileSync(zipPath);

      // First import
      const firstResult = await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', testUserId);
      expect(firstResult.idempotent).toBe(false);

      // Second import (same bytes, same hash)
      const secondResult = await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', testUserId);
      expect(secondResult.idempotent).toBe(true);
      expect(secondResult.packageId).toBe(firstResult.packageId);
      expect(secondResult.revision).toBe(firstResult.revision);

      // Verify NO duplicate rows created in database
      const jobs = await dbClient.db.select().from(schema.importJobs);
      expect(jobs.length).toBe(1);

      const questions = await dbClient.db.select().from(schema.questions);
      expect(questions.length).toBe(29);

      const groups = await dbClient.db.select().from(schema.questionGroups);
      expect(groups.length).toBe(15);

      const exams = await dbClient.db.select().from(schema.exams);
      expect(exams.length).toBe(1);
    });

    it('rejects with 409 Conflict when content changes but revision is NOT incremented', async () => {
      const zipPath = path.resolve(process.cwd(), 'docs/multi-worker/demo-data/demo-n5-1.zip');
      const zipBuffer = fs.readFileSync(zipPath);

      // 1. Initial import
      await importService.processPackageImport(zipBuffer, 'demo-n5-1.zip', testUserId);

      // 2. Modify existing import.json content without changing revision (same packageId, same revision=1)
      const { readZipBuffer } = await import('@jlpt/content-tools');
      const files = readZipBuffer(zipBuffer);
      const pkgJson = JSON.parse(Buffer.from(files['import.json']!).toString('utf8'));

      // Mutate a question stem
      pkgJson.groups[0].questions[0].stem = [{ t: 'text', text: 'Nội dung câu hỏi đã bị sửa đổi' }];

      // Repack into a valid zip buffer using python3 zipfile
      const modifiedFiles: Record<string, string | Uint8Array> = {
        'import.json': JSON.stringify(pkgJson, null, 2),
      };
      for (const [p, b] of Object.entries(files)) {
        if (p !== 'import.json') {
          modifiedFiles[p] = b;
        }
      }
      const modifiedZipBuffer = createZipBuffer(modifiedFiles);

      // 3. Attempting to re-import modified content with same revision MUST throw 409 Conflict
      await expect(
        importService.processPackageImport(modifiedZipBuffer, 'demo-n5-1-modified.zip', testUserId),
      ).rejects.toThrow(/phát hiện xung đột nội dung/);
    });

    it('rejects with 409 Conflict when incoming revision is lower than already stored revision', async () => {
      // Simulate that database already has revision 3 for a packageId
      const packageId = '0192f000-0000-7000-8000-000000000055';
      await dbClient.db.insert(schema.importJobs).values({
        id: '0192f000-0000-7000-8000-000000000056',
        uploadedBy: testUserId,
        status: 'succeeded',
        packageSha256: 'rev3-hash',
        fileName: 'pkg-v3.zip',
        targetLevel: 'N5',
        errorLog: { packageId, revision: 3, contentHash: 'rev3-hash' },
      });

      // Try importing a zip with revision 1
      const zipPath = path.resolve(process.cwd(), 'docs/multi-worker/demo-data/demo-n5-1.zip');
      const zipBuffer = fs.readFileSync(zipPath);
      const { readZipBuffer } = await import('@jlpt/content-tools');
      const files = readZipBuffer(zipBuffer);
      const pkgJson = JSON.parse(Buffer.from(files['import.json']!).toString('utf8'));
      pkgJson.packageId = packageId;
      pkgJson.revision = 1;

      const regressionFiles: Record<string, string | Uint8Array> = {
        'import.json': JSON.stringify(pkgJson, null, 2),
      };
      for (const [p, b] of Object.entries(files)) {
        if (p !== 'import.json') {
          regressionFiles[p] = b;
        }
      }
      const regressionZip = createZipBuffer(regressionFiles);

      await expect(
        importService.processPackageImport(regressionZip, 'regression.zip', testUserId),
      ).rejects.toThrow(/nhỏ hơn revision cao nhất đã có/);
    });
  });

  describe('Acceptance 4: Lệnh demo:seed nạp blueprint và gói qua đúng luồng import→duyệt→publish', () => {
    it('executes the full pipeline cleanly and repeated execution is idempotent without duplicates', async () => {
      // 1. First execution of runDemoSeed
      const firstSeed = await runDemoSeed(dbClient);
      expect(firstSeed.publishedVersion).toBe(1);
      expect(firstSeed.idempotent).toBe(false);

      // Verify exam is published
      const exams = await dbClient.db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.slug, 'demo-n5-1'));
      expect(exams.length).toBe(1);
      expect(exams[0]?.publishedVersion).toBe(1);

      // Verify all 29 questions exist and are approved
      const qVersions = await dbClient.db.select().from(schema.questionVersions);
      expect(qVersions.length).toBe(29);
      for (const qv of qVersions) {
        expect(qv.status).toBe('approved');
      }

      // Verify review journal has separation of duties (reviewer != editor)
      const reviews = await dbClient.db.select().from(schema.contentReviews);
      expect(reviews.length).toBeGreaterThanOrEqual(29);
      for (const rev of reviews) {
        expect(rev.reviewerId).not.toBe(rev.lastEditorId);
      }

      // Verify exam versions and answer keys created
      const versions = await dbClient.db.select().from(schema.examVersions);
      expect(versions.length).toBe(1);
      expect(versions[0]?.version).toBe(1);
      expect(versions[0]?.totalQuestions).toBe(29);

      const keys = await dbClient.db.select().from(schema.examAnswerKeys);
      expect(keys.length).toBe(1);
      expect(keys[0]?.keys.length).toBe(29);

      // Verify outbox has both content.import.completed, content.approved, and content.published
      const outboxList = await dbClient.db.select().from(schema.outbox);
      const topics = outboxList.map((e: { topic: string }) => e.topic);
      expect(topics).toContain('content.import.completed');
      expect(topics).toContain('content.approved');
      expect(topics).toContain('content.published');

      // 2. Second execution of runDemoSeed on same database (Acceptance 4: chạy lại không tạo trùng)
      const secondSeed = await runDemoSeed(dbClient);
      expect(secondSeed.idempotent).toBe(true);
      expect(secondSeed.examId).toBe(firstSeed.examId);
      expect(secondSeed.publishedVersion).toBe(1);

      // Ensure NO duplicate exam, exam_versions, or questions
      const examsAfter = await dbClient.db
        .select()
        .from(schema.exams)
        .where(eq(schema.exams.slug, 'demo-n5-1'));
      expect(examsAfter.length).toBe(1);

      const versionsAfter = await dbClient.db.select().from(schema.examVersions);
      expect(versionsAfter.length).toBe(1);

      const qVersionsAfter = await dbClient.db.select().from(schema.questionVersions);
      expect(qVersionsAfter.length).toBe(29);
    });
  });
});
