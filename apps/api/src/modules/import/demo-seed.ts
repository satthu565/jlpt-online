import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { eq } from 'drizzle-orm';
import { resolveRepoPath } from '../../common/utils/paths.js';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import * as schema from '../../db/schema.js';
import { StorageService } from '../storage/storage.service.js';
import { MediaService } from '../media/media.service.js';
import { OutboxService } from '../outbox/outbox.service.js';
import { BlueprintService } from '../blueprint/blueprint.service.js';
import { ReviewService } from '../review/review.service.js';
import { ImportService } from './import.service.js';
import { ExamService } from '../exam/exam.service.js';

export interface DemoSeedResult {
  blueprintId: string;
  examId: string;
  publishedVersion: number;
  idempotent: boolean;
  message: string;
}

export async function runDemoSeed(
  client?: DbClientInstance,
  options?: { storageService?: StorageService },
): Promise<DemoSeedResult> {
  let dbClient = client;
  let closeOnExit = false;

  if (!dbClient) {
    closeOnExit = true;
    if (process.env.PGLITE_DATA_DIR) {
      console.log(`ℹ demo:seed sử dụng thư mục dữ liệu PGlite: ${process.env.PGLITE_DATA_DIR}`);
      const { PGlite } = await import('@electric-sql/pglite');
      const { drizzle } = await import('drizzle-orm/pglite');
      const pglite = new PGlite(process.env.PGLITE_DATA_DIR);
      const db = drizzle(pglite, { schema });
      dbClient = {
        db,
        rawClient: pglite,
        type: 'pglite',
        close: async () => {
          await pglite.close();
        },
        query: async (sqlQuery: string) => pglite.query(sqlQuery),
      };
    } else {
      if (!process.env.DATABASE_URL) {
        console.warn(
          '⚠️ CẢNH BÁO: Chưa cấu hình DATABASE_URL hoặc PGLITE_DATA_DIR. demo:seed đang chạy với PGlite in-memory; ' +
            'dữ liệu sẽ giải phóng khi tiến trình CLI kết thúc. Để kiểm tra tính idempotent qua các lần chạy CLI kế tiếp, ' +
            'vui lòng thiết lập biến môi trường DATABASE_URL hoặc PGLITE_DATA_DIR.',
        );
      }
      dbClient = await createDbClient();
    }
  }

  try {
    // 1. Ensure migrations are applied
    await runMigrations(dbClient);

    // 2. Initialize domain services
    if (!options?.storageService && !process.env.STORAGE_LOCAL_ROOT) {
      const defaultDataDir = resolveRepoPath('.data/storage');
      try {
        if (!fs.existsSync(defaultDataDir)) {
          fs.mkdirSync(defaultDataDir, { recursive: true });
        }
        process.env.STORAGE_LOCAL_ROOT = defaultDataDir;
      } catch {
        process.env.STORAGE_LOCAL_ROOT = resolveRepoPath('node_modules/.cache/storage');
      }
    }
    const storageService = options?.storageService ?? new StorageService();
    const mediaService = new MediaService(dbClient, storageService);
    const outboxService = new OutboxService(dbClient);
    const blueprintService = new BlueprintService(dbClient);
    const reviewService = new ReviewService(dbClient, outboxService);
    const importService = new ImportService(
      dbClient,
      storageService,
      mediaService,
      reviewService,
      outboxService,
      blueprintService,
    );
    const examService = new ExamService(dbClient, storageService, outboxService, blueprintService);

    // 3. Seed distinct accounts for editor, reviewer, and publisher (Acceptance 3 & 4)
    const editorId = '0192f000-0000-7000-8000-0000000000e1';
    const reviewerId = '0192f000-0000-7000-8000-0000000000d1'; // valid hex
    const publisherId = '0192f000-0000-7000-8000-0000000000b1'; // valid hex

    await dbClient.db
      .insert(schema.users)
      .values([
        {
          id: editorId,
          name: 'Demo Content Editor',
          email: 'editor@jlpt.local',
          emailVerified: true,
          role: 'editor',
          locale: 'vi',
          timezone: 'Asia/Ho_Chi_Minh',
        },
        {
          id: reviewerId,
          name: 'Demo Content Reviewer',
          email: 'reviewer@jlpt.local',
          emailVerified: true,
          role: 'reviewer',
          locale: 'vi',
          timezone: 'Asia/Ho_Chi_Minh',
        },
        {
          id: publisherId,
          name: 'Demo Content Publisher',
          email: 'publisher@jlpt.local',
          emailVerified: true,
          role: 'admin',
          locale: 'vi',
          timezone: 'Asia/Ho_Chi_Minh',
        },
      ])
      .onConflictDoNothing();

    // 4. Load & Seed Synthetic Blueprint
    const blueprintPath = resolveRepoPath(
      'docs/multi-worker/demo-data/blueprints/synthetic-n5-demo-v1.json',
    );
    if (!fs.existsSync(blueprintPath)) {
      throw new Error(`Tệp blueprint demo không tồn tại: ${blueprintPath}`);
    }

    const bpData = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
    const seededBlueprint = await blueprintService.upsertBlueprint(bpData, publisherId);
    console.log(`✓ Blueprint ${seededBlueprint.id} (${seededBlueprint.level}) sẵn sàng`);

    // 5. Check if demo exam is already published (Idempotency check)
    const existingExam = await dbClient.db
      .select()
      .from(schema.exams)
      .where(eq(schema.exams.slug, 'demo-n5-1'))
      .limit(1);

    if (existingExam.length > 0 && existingExam[0]!.publishedVersion !== null) {
      console.log(
        `✓ Đề demo demo-n5-1 đã được xuất bản (v${existingExam[0]!.publishedVersion}); bỏ qua tạo trùng (idempotent)`,
      );
      return {
        blueprintId: seededBlueprint.id,
        examId: existingExam[0]!.id,
        publishedVersion: existingExam[0]!.publishedVersion,
        idempotent: true,
        message: 'Đề demo đã được nạp và xuất bản trước đó, không tạo trùng',
      };
    }

    // 6. Step 1: Import package v2 ZIP via Editor account
    const zipPath = resolveRepoPath('docs/multi-worker/demo-data/demo-n5-1.zip');
    if (!fs.existsSync(zipPath)) {
      throw new Error(`Tệp zip demo không tồn tại: ${zipPath}`);
    }

    const zipBuffer = fs.readFileSync(zipPath);
    console.log(`→ Đang nạp gói demo-n5-1.zip qua tài khoản editor (${editorId})...`);
    const importResult = await importService.processPackageImport(
      zipBuffer,
      'demo-n5-1.zip',
      editorId,
      { mode: 'ready' },
    );
    console.log(`✓ Gói nhập thành công (Job: ${importResult.id}, Trạng thái: ${importResult.status})`);

    // Fetch imported exam ID
    const importedExamRows = await dbClient.db
      .select()
      .from(schema.exams)
      .where(eq(schema.exams.slug, 'demo-n5-1'))
      .limit(1);

    if (importedExamRows.length === 0) {
      throw new Error('Không tìm thấy đề thi demo-n5-1 sau khi nạp');
    }
    const exam = importedExamRows[0]!;

    // 7. Step 2: Review & Approve via Reviewer account (Reviewer != Editor)
    console.log(`→ Đang duyệt toàn bộ câu hỏi qua tài khoản reviewer (${reviewerId})...`);
    const reviewResult = await reviewService.approveAllExamQuestions(
      exam.id,
      reviewerId,
      editorId,
      'Duyệt nội dung đề demo N5 tự soạn',
    );
    console.log(
      `✓ Đã duyệt ${reviewResult.approvedGroups} nhóm câu và ${reviewResult.approvedQuestions} câu hỏi`,
    );

    // 8. Step 3: Publish exam via Publisher account
    console.log(`→ Đang xuất bản đề thi qua tài khoản publisher (${publisherId})...`);
    const publishResult = await examService.publishExam(exam.id, publisherId);
    console.log(
      `✓ Đề thi ${exam.slug} đã xuất bản thành công phiên bản v${publishResult.version} (${publishResult.totalQuestions} câu hỏi)`,
    );

    return {
      blueprintId: seededBlueprint.id,
      examId: exam.id,
      publishedVersion: publishResult.version,
      idempotent: false,
      message: 'Nạp đề demo N5 qua luồng import → duyệt → publish thành công',
    };
  } finally {
    if (closeOnExit) {
      await dbClient.close();
    }
  }
}

// Auto-run if executed directly as main script
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  runDemoSeed()
    .then((res) => {
      console.log('Seed demo-data hoàn tất:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Lỗi seed demo-data:', err);
      process.exit(1);
    });
}
