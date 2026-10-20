import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { resolveRepoPath } from '../../common/utils/paths.js';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import * as schema from '../../db/schema.js';
import { StorageService } from '../storage/storage.service.js';
import { LocalFsStorage } from '../storage/local-fs.storage.js';
import { MediaService } from '../media/media.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { BlueprintService, toDeterministicUuid } from '../blueprint/blueprint.service.js';
import { ReviewService } from '../review/review.service.js';
import { ExamService } from '../exam/exam.service.js';
import { ImportService } from './import.service.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { readZipBuffer } from '@jlpt/content-tools';
import { execFileSync } from 'node:child_process';

function createZipBuffer(files: Record<string, string | Uint8Array>): Buffer {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jlpt-tmp-zip-'));
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

describe('I17: Lời giải trong gói nhập đi vào quy trình duyệt và hiện cho học viên', () => {
  let dbClient: DbClientInstance;
  let tempStorageDir: string;
  let storageService: StorageService;
  let mediaService: MediaService;
  let outboxService: OutboxService;
  let blueprintService: BlueprintService;
  let reviewService: ReviewService;
  let examService: ExamService;
  let importService: ImportService;

  const editorUserId = '0192f000-0000-7000-8000-0000000000e1';
  const reviewerUserId = '0192f000-0000-7000-8000-0000000000d1';
  const publisherUserId = '0192f000-0000-7000-8000-0000000000b1';
  const candidateUserId = '0192f000-0000-7000-8000-0000000000c1';

  beforeEach(async () => {
    tempStorageDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jlpt-import-i17-'));
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
    examService = new ExamService(dbClient, storageService, outboxService, blueprintService);
    importService = new ImportService(
      dbClient,
      storageService,
      mediaService,
      reviewService,
      outboxService,
      blueprintService,
    );

    // Create test users
    await dbClient.db
      .insert(schema.users)
      .values([
        {
          id: editorUserId,
          name: 'Biên tập viên A',
          email: 'editor@jlpt.local',
          role: 'editor',
          emailVerified: true,
          createdAt: new Date(),
        },
        {
          id: reviewerUserId,
          name: 'Kiểm duyệt viên B',
          email: 'reviewer@jlpt.local',
          role: 'reviewer',
          emailVerified: true,
          createdAt: new Date(),
        },
        {
          id: publisherUserId,
          name: 'Xuất bản viên C',
          email: 'publisher@jlpt.local',
          role: 'admin',
          emailVerified: true,
          createdAt: new Date(),
        },
        {
          id: candidateUserId,
          name: 'Học viên D',
          email: 'student@jlpt.local',
          role: 'user',
          emailVerified: true,
          createdAt: new Date(),
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
    await dbClient.close();
    delete process.env.STORAGE_LOCAL_ROOT;
    fs.rmSync(tempStorageDir, { recursive: true, force: true });
  });

  it('Acceptance 1: Nhập gói có explanation tách tiền tố -> màn duyệt hiện bản nháp với bản dịch, lý do đúng, lý do sai từng phương án', async () => {
    const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
    const demoZipBuffer = fs.readFileSync(zipPath);
    const files = readZipBuffer(demoZipBuffer);
    const importJsonStr = new TextDecoder().decode(files['import.json']!);
    const pkg = JSON.parse(importJsonStr);

    pkg.packageId = generateUuidV7();
    pkg.exam.slug = `demo-n5-ac1-${generateUuidV7().slice(0, 8)}`;

    // Give question 0 a rich prefix-structured explanation
    pkg.groups[0].questions[0].explanation = {
      locale: 'vi',
      blocks: [
        {
          type: 'paragraph',
          content: [
            {
              t: 'text',
              text: `• Dịch nghĩa:
Ngọn núi (山) rất cao.

• Đáp án đúng: [1] 山 đọc là やま (núi).

• Phân tích các phương án còn lại:
- [2] Phương án 2 sai: かわ là sông.
- [3] Phương án 3 sai: うみ là biển.
- [4] Phương án 4 sai: そら là bầu trời.`,
            },
          ],
        },
      ],
    };

    files['import.json'] = new TextEncoder().encode(JSON.stringify(pkg));
    const zipBuffer = createZipBuffer(files as Record<string, Uint8Array>);

    const importRes = await importService.processPackageImport(
      zipBuffer,
      'demo-n5-1-custom.zip',
      editorUserId,
      { mode: 'ready' },
    );
    expect(importRes.status).toBe('succeeded');

    const q0Id = toDeterministicUuid(`${pkg.packageId}:q:${pkg.groups[0].questions[0].id}`);

    // 1. Check explanation_versions row exists for this question
    const [expRow] = await dbClient.db
      .select()
      .from(schema.explanationVersions)
      .where(eq(schema.explanationVersions.questionId, q0Id));

    expect(expRow).toBeDefined();
    expect(expRow!.status).toBe('draft');
    expect(expRow!.authorId).toBe(editorUserId);
    expect(expRow!.locale).toBe('vi');

    const content = expRow!.content as Record<string, unknown>;
    expect(content.translation).toEqual([
      { t: 'text', text: 'Ngọn núi (山) rất cao.' },
    ]);
    expect(content.correctReason).toEqual([
      { t: 'text', text: 'Đáp án đúng: [1] 山 đọc là やま (núi).' },
    ]);
    expect(content.wrongReasonsByOption).toBeDefined();
    const wrongMap = content.wrongReasonsByOption as Record<string, unknown>;
    expect(wrongMap['2']).toEqual([{ t: 'text', text: 'Phương án 2 sai: かわ là sông.' }]);
    expect(wrongMap['3']).toEqual([{ t: 'text', text: 'Phương án 3 sai: うみ là biển.' }]);
    expect(wrongMap['4']).toEqual([{ t: 'text', text: 'Phương án 4 sai: そら là bầu trời.' }]);
    expect(content.blocks).toBeDefined();

    // 2. Check admin listExplanations returns mapped fields for admin UI
    const list = await reviewService.listExplanations({ questionId: q0Id });
    expect(list.items.length).toBe(1);
    const adminItem = list.items[0]!;
    expect(adminItem.status).toBe('pending');
    expect(adminItem.rawStatus).toBe('draft');
    expect(adminItem.level).toBe('N5');
    expect(adminItem.authorName).toBe('Biên tập viên A');
    expect(adminItem.translationVi).toContain('Ngọn núi (山) rất cao.');
    expect(adminItem.explanationMarkdown).toContain('**Lý do đúng**:');
    expect(adminItem.explanationMarkdown).toContain('Đáp án đúng: [1] 山 đọc là やま (núi).');
    expect(adminItem.explanationMarkdown).toContain('**Phân tích các phương án còn lại**:');
    expect(adminItem.explanationMarkdown).toContain('- [2] Phương án 2:');
    expect(adminItem.explanationMarkdown).toContain('- [3] Phương án 3:');
    expect(adminItem.explanationMarkdown).toContain('- [4] Phương án 4:');
  });

  it('Acceptance 2: Reviewer duyệt -> học viên hiện đủ lời giải; chưa duyệt thì không hiện', async () => {
    const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
    const demoZipBuffer = fs.readFileSync(zipPath);
    const files = readZipBuffer(demoZipBuffer);
    const importJsonStr = new TextDecoder().decode(files['import.json']!);
    const pkg = JSON.parse(importJsonStr);

    pkg.packageId = generateUuidV7();
    const examSlug = `demo-n5-ac2-${generateUuidV7().slice(0, 8)}`;
    pkg.exam.slug = examSlug;

    pkg.groups[0].questions[0].explanation = {
      locale: 'vi',
      blocks: [
        {
          type: 'paragraph',
          content: [
            {
              t: 'text',
              text: `• Dịch nghĩa:
Ngọn núi (山) rất cao.

• Đáp án đúng: [1] 山 đọc là やま (núi).

• Phân tích các phương án còn lại:
- [2] Phương án 2 sai: かわ là sông.`,
            },
          ],
        },
      ],
    };

    files['import.json'] = new TextEncoder().encode(JSON.stringify(pkg));
    const zipBuffer = createZipBuffer(files as Record<string, Uint8Array>);

    await importService.processPackageImport(zipBuffer, 'demo-n5-2.zip', editorUserId, { mode: 'ready' });

    // Find exam
    const [exam] = await dbClient.db
      .select()
      .from(schema.exams)
      .where(eq(schema.exams.slug, examSlug));
    expect(exam).toBeDefined();

    // Approve questions and publish exam
    await reviewService.approveAllExamQuestions(exam!.id, reviewerUserId, editorUserId, 'Duyệt đề');
    await examService.publishExam(exam!.id, publisherUserId);

    // Create a submitted attempt for learner
    const attemptId = generateUuidV7();
    await dbClient.db.insert(schema.examAttempts).values({
      id: attemptId,
      userId: candidateUserId,
      examId: exam!.id,
      examVersion: 1,
      mode: 'real',
      status: 'submitted',
      leaseId: generateUuidV7(),
      attemptMonth: '2026-10-01',
      startedAt: new Date(),
      lastActivityAt: new Date(),
      submittedAt: new Date(),
    });

    await dbClient.db.insert(schema.attemptAnswerSheets).values({
      attemptId,
      answers: new Array(29).fill(1),
      flags: new Array(29).fill(0),
      timeSpentMs: new Array(29).fill(5000),
    });

    // 1. BEFORE review approval: learner receives hasExplanation: false
    const explBefore = await reviewService.getLearnerExplanation(attemptId, 0, candidateUserId);
    expect(explBefore.hasExplanation).toBe(false);
    expect(explBefore.explanation).toBeNull();

    // 2. Four-eyes enforcement: editor CANNOT review own explanation
    const q0Id = toDeterministicUuid(`${pkg.packageId}:q:${pkg.groups[0].questions[0].id}`);
    const [draftExpl] = await dbClient.db
      .select()
      .from(schema.explanationVersions)
      .where(eq(schema.explanationVersions.questionId, q0Id));
    expect(draftExpl).toBeDefined();

    await expect(
      reviewService.reviewExplanation(draftExpl!.id, editorUserId, 'approved'),
    ).rejects.toThrow();

    // 3. Reviewer approves explanation
    const approved = await reviewService.reviewExplanation(
      draftExpl!.id,
      reviewerUserId,
      'approved',
      'Đã duyệt chuẩn',
    );
    expect(approved.status).toBe('approved');

    // 4. AFTER review approval: learner receives full explanation
    const explAfter = await reviewService.getLearnerExplanation(attemptId, 0, candidateUserId);
    expect(explAfter.hasExplanation).toBe(true);
    expect(explAfter.correctReason).toBeDefined();
    expect(explAfter.translation).toBeDefined();
    expect(explAfter.wrongReasonsByOption).toBeDefined();
    expect((explAfter.wrongReasonsByOption as Record<string, unknown>)!['2']).toEqual([{ t: 'text', text: 'Phương án 2 sai: かわ là sông.' }]);
  });

  it('Acceptance 3 (Negative test): Không lộ lời giải trước khi nộp bài', async () => {
    const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
    const demoZipBuffer = fs.readFileSync(zipPath);
    const files = readZipBuffer(demoZipBuffer);
    const importJsonStr = new TextDecoder().decode(files['import.json']!);
    const pkg = JSON.parse(importJsonStr);

    pkg.packageId = generateUuidV7();
    const examSlug = `demo-n5-ac3-${generateUuidV7().slice(0, 8)}`;
    pkg.exam.slug = examSlug;

    files['import.json'] = new TextEncoder().encode(JSON.stringify(pkg));
    const zipBuffer = createZipBuffer(files as Record<string, Uint8Array>);

    await importService.processPackageImport(zipBuffer, 'demo-n5-3.zip', editorUserId, { mode: 'ready' });

    const [exam] = await dbClient.db
      .select()
      .from(schema.exams)
      .where(eq(schema.exams.slug, examSlug));
    expect(exam).toBeDefined();

    await reviewService.approveAllExamQuestions(exam!.id, reviewerUserId, editorUserId, 'Duyệt đề');
    await examService.publishExam(exam!.id, publisherUserId);

    const attemptId = generateUuidV7();

    // Attempt is IN PROGRESS (not submitted)
    await dbClient.db.insert(schema.examAttempts).values({
      id: attemptId,
      userId: candidateUserId,
      examId: exam!.id,
      examVersion: 1,
      mode: 'real',
      status: 'in_progress',
      leaseId: generateUuidV7(),
      attemptMonth: '2026-10-01',
      startedAt: new Date(),
      lastActivityAt: new Date(),
    });

    // Attempting to view explanation must throw ConflictException RESULTS_EMBARGOED
    await expect(
      reviewService.getLearnerExplanation(attemptId, 0, candidateUserId),
    ).rejects.toThrow(/Kết quả chưa được công bố/);
  });

  it('Acceptance 4: Gói có group nghe kèm transcript -> màn duyệt và trang xem lại bài hiện script; API làm bài không trả transcript', async () => {
    const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
    const demoZipBuffer = fs.readFileSync(zipPath);
    const files = readZipBuffer(demoZipBuffer);
    const importJsonStr = new TextDecoder().decode(files['import.json']!);
    const pkg = JSON.parse(importJsonStr);

    pkg.packageId = generateUuidV7();
    const examSlug = `demo-n5-ac4-${generateUuidV7().slice(0, 8)}`;
    pkg.exam.slug = examSlug;

    files['import.json'] = new TextEncoder().encode(JSON.stringify(pkg));
    const zipBuffer = createZipBuffer(files as Record<string, Uint8Array>);

    await importService.processPackageImport(zipBuffer, 'demo-n5-4.zip', editorUserId, { mode: 'ready' });

    const [exam] = await dbClient.db
      .select()
      .from(schema.exams)
      .where(eq(schema.exams.slug, examSlug));
    expect(exam).toBeDefined();

    await reviewService.approveAllExamQuestions(exam!.id, reviewerUserId, editorUserId, 'Duyệt đề');
    await examService.publishExam(exam!.id, publisherUserId);

    // Question in listening group (group g-task1 has transcript, question q-23)
    const listeningQId = toDeterministicUuid(`${pkg.packageId}:q:q-23`);
    const [q] = await dbClient.db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.id, listeningQId));

    expect(q).toBeDefined();

    // 1. Verify draft explanation was created for listening question with transcript
    const [exp] = await dbClient.db
      .select()
      .from(schema.explanationVersions)
      .where(eq(schema.explanationVersions.questionId, listeningQId));

    expect(exp).toBeDefined();
    expect(exp!.status).toBe('draft');
    const content = exp!.content as Record<string, unknown>;
    expect(content.transcript).toBeDefined();
    expect(Array.isArray(content.transcript)).toBe(true);

    // 2. Moderation list shows script preview
    const list = await reviewService.listExplanations({ questionId: listeningQId });
    expect(list.items.length).toBe(1);
    expect(list.items[0]!.explanationMarkdown).toContain('Script bài nghe');

    // 3. Reviewer approves explanation
    await reviewService.reviewExplanation(exp!.id, reviewerUserId, 'approved', 'Duyệt script bài nghe');

    // 4. API làm bài (exam delivery snapshot) does NOT leak transcript
    const publicSnapshot = await examService.getExamSnapshot(exam!.id, 1);
    const rawSnapshotStr = JSON.stringify(publicSnapshot);
    expect(rawSnapshotStr).not.toContain('男の人と 女の人が 話しています');
    expect(rawSnapshotStr).not.toContain('"transcript"');

    // 5. Learner reviews after submission: transcript is included
    const attemptId = generateUuidV7();
    await dbClient.db.insert(schema.examAttempts).values({
      id: attemptId,
      userId: candidateUserId,
      examId: exam!.id,
      examVersion: 1,
      mode: 'real',
      status: 'submitted',
      leaseId: generateUuidV7(),
      attemptMonth: '2026-10-01',
      startedAt: new Date(),
      lastActivityAt: new Date(),
      submittedAt: new Date(),
    });

    await dbClient.db.insert(schema.attemptAnswerSheets).values({
      attemptId,
      answers: new Array(29).fill(1),
      flags: new Array(29).fill(0),
      timeSpentMs: new Array(29).fill(3000),
    });

    // Find global orderIndex of listening question
    const [item] = await dbClient.db
      .select()
      .from(schema.examItems)
      .where(and(eq(schema.examItems.examId, exam!.id), eq(schema.examItems.questionId, listeningQId)));

    expect(item).toBeDefined();

    const learnerExpl = await reviewService.getLearnerExplanation(attemptId, item!.orderIndex, candidateUserId);
    expect(learnerExpl.hasExplanation).toBe(true);
    expect(learnerExpl.transcript).toBeDefined();
    expect(Array.isArray(learnerExpl.transcript)).toBe(true);
  });
});
