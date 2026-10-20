import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BlueprintSchema,
  ExamAnswerKeySchema,
  type Blueprint,
  RetentionViolationError,
} from '@jlpt/schema';

// We import database utilities directly from local module
import {
  activateBlueprint,
  BlueprintActivationError,
  createDbClient,
  ensureAttemptEventsPartitions,
  getPartitionMonths,
  resolveMigrationsDir,
  runMigrations,
  seedDatabase,
  verifyRollbackCompatibility,
  canPurgeDomain,
  assertRetentionObligationNotViolated,
  executeRetentionSafeDeletion,
} from './index.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../../../../packages/schema/fixtures');

describe('F08 Database Schema and Migrations', () => {
  describe('Acceptance 1: Migrate fresh seeded rollback-code compatibility pass', () => {
    it('migrates a fresh database and executes all statements cleanly', async () => {
      const client = await createDbClient();
      try {
        const result = await runMigrations(client);
        expect(result.applied.length).toBeGreaterThan(0);
        expect(result.alreadyApplied.length).toBe(0);

        // Verify ledger table recorded migrations
        const ledger = (await client.query(
          `SELECT name FROM "__drizzle_migrations" ORDER BY name ASC;`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        )) as any;
        const names = (ledger.rows ?? ledger).map((r: { name: string }) => r.name);
        expect(names).toContain('0000_legal_paibok.sql');
        expect(names).toContain('0001_curvy_invisible_woman.sql');
        expect(names).toContain('0002_tenant_retention_community.sql');
        expect(names).toContain('0003_privacy_export_isolation.sql');
        expect(names).toContain('0004_dataset_slug.sql');
        expect(names).toContain('0005_blueprint_effective_to.sql');
        expect(names).toContain('0006_section_listening_timeline.sql');
        expect(names.length).toBe(7);
      } finally {
        await client.close();
      }
    });

    it('re-running migrations is completely idempotent (no errors, 0 new applied)', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        const secondRun = await runMigrations(client);
        expect(secondRun.applied.length).toBe(0);
        expect(secondRun.alreadyApplied.length).toBeGreaterThanOrEqual(4);
      } finally {
        await client.close();
      }
    });

    it('concurrent migration runs are serialised (api and worker boot together)', async () => {
      const client = await createDbClient();
      try {
        const [first, second] = await Promise.all([runMigrations(client), runMigrations(client)]);
        expect(first.applied.length).toBeGreaterThanOrEqual(4);
        expect(second.applied.length).toBe(0);
      } finally {
        await client.close();
      }
    });

    it('seeds fresh migrated database and succeeds idempotently', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);

        const seedResult = await seedDatabase(client, fixturesDir);
        expect(seedResult.usersSeeded).toBeGreaterThan(0);
        expect(seedResult.blueprintsSeeded).toBeGreaterThanOrEqual(10); // 5 synthetic + 5 official drafts
        expect(seedResult.examsSeeded).toBe(5); // N1-N5 synthetic exams
        expect(seedResult.questionsSeeded).toBeGreaterThan(0);
        expect(seedResult.partitionsCreated).toBeGreaterThanOrEqual(3);

        // Verify admin user exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const adminRes = (await client.query(`SELECT * FROM "users" WHERE email = 'admin@jlpt.local';`)) as any;
        const adminUser = adminRes.rows ?? adminRes;
        expect(adminUser.length).toBe(1);
        expect(adminUser[0].role).toBe('admin');


        // Verify seeding a second time is fully idempotent
        const secondSeed = await seedDatabase(client, fixturesDir);
        expect(secondSeed.examsSeeded).toBe(5);
      } finally {
        await client.close();
      }
    });

    it('passes rollback-code compatibility verification (expand-contract pattern)', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const compatResult = await verifyRollbackCompatibility(client);
        expect(compatResult.compatible).toBe(true);
        expect(compatResult.checkedTables).toContain('exams');
        expect(compatResult.checkedTables).toContain('exam_versions');
        expect(compatResult.checkedTables).toContain('exam_attempts');
        expect(compatResult.checkedTables).toContain('blueprints');
        expect(compatResult.checkedTables).toContain('users');
        expect(compatResult.checkedTables).toContain('outbox');
        expect(compatResult.checkedTables).toContain('tenant_plans');
        expect(compatResult.checkedTables).toContain('retention_policies');
        expect(compatResult.checkedTables).toContain('org_memberships');
        expect(compatResult.checkedTables).toContain('classes');
        expect(compatResult.checkedTables).toContain('assignments');
        expect(compatResult.checkedTables).toContain('exam_events');
        expect(compatResult.checkedTables).toContain('explanation_versions');
        expect(compatResult.checkedTables).toContain('class_memberships');
        expect(compatResult.checkedTables).toContain('assignment_learners');
        expect(compatResult.checkedTables).toContain('comment_reports');
        expect(compatResult.checkedTables).toContain('ai_content_versions');
        expect(compatResult.checkedTables).toContain('export_jobs');
        expect(compatResult.checkedTables).toContain('data_export_jobs');
        expect(compatResult.checkedTables).toContain('deletion_requests');
        expect(compatResult.checkedTables).toContain('report_snapshots');
        expect(compatResult.checkedTables.length).toBe(21);

        for (const msg of Object.values(compatResult.details)) {
          expect(msg).not.toContain('FAILED');
        }

      } finally {
        await client.close();
      }
    });

    it('enforces CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL) on exam_attempts', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);

        const attemptId = '0192f000-00aa-7000-8000-000000000001';
        const examId = '0192f000-00bb-7000-8000-000000000002';
        const leaseId = '0192f000-00cc-7000-8000-000000000003';

        // Attempt without user_id and without guest_id must be rejected
        await expect(
          client.query(`
            INSERT INTO "exam_attempts" (
              id, user_id, guest_id, exam_id, exam_version, mode, status, lease_id, attempt_month
            ) VALUES (
              '${attemptId}', NULL, NULL, '${examId}', 1, 'real', 'in_progress', '${leaseId}', '2026-10-01'
            );
          `),
        ).rejects.toThrow();

        // Attempt with guest_id must be accepted
        const guestId = '0192f000-00dd-7000-8000-000000000004';
        // Need to create dummy exam and version for FK
        await client.query(`
          INSERT INTO "exams" (id, slug, level, title, kind) VALUES ('${examId}', 'check-test', 'N5', 'Check Test', 'synthetic');
        `);
        const adminId = '0192f000-0000-7000-8000-000000000001';
        await client.query(`
          INSERT INTO "users" (id, email, role) VALUES ('${adminId}', 'admin-fk@test.local', 'admin') ON CONFLICT DO NOTHING;
        `);
        await client.query(`
          INSERT INTO "blueprints" (id, level, version, effective_from, source_ref, sections, scoring)
          VALUES ('0192f000-00ee-7000-8000-000000000005', 'N5', 1, '2026-10', '[]', '[]', '{"method":"linear_reference","rounding":"round"}');
        `);
        await client.query(`
          INSERT INTO "exam_versions" (exam_id, version, snapshot_key, manifest_key, blueprint_id, blueprint_version, scoring, total_questions, published_at, published_by)
          VALUES ('${examId}', 1, 'snap', 'man', '0192f000-00ee-7000-8000-000000000005', 1, '{}', 0, now(), '${adminId}');
        `);


        await client.query(`
          INSERT INTO "exam_attempts" (
            id, user_id, guest_id, exam_id, exam_version, mode, status, lease_id, attempt_month
          ) VALUES (
            '${attemptId}', NULL, '${guestId}', '${examId}', 1, 'real', 'in_progress', '${leaseId}', '2026-10-01'
          );
        `);

        // Verify inserted attempt exists
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = (await client.query(`SELECT id, guest_id FROM "exam_attempts" WHERE id = '${attemptId}';`)) as any;
        const inserted = (res.rows ?? res)[0];
        expect(inserted.guest_id).toBe(guestId);
      } finally {
        await client.close();
      }
    });

    it('enforces unique open attempt policy (only 1 in_progress attempt per user per exam)', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const userId = '0192f000-0000-7000-8000-000000000001'; // admin
        // Find seeded exam
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const examsRes = (await client.query(`SELECT id FROM "exams" LIMIT 1;`)) as any;
        const examId = (examsRes.rows ?? examsRes)[0].id;

        const attempt1 = '0192f000-0111-7000-8000-000000000001';
        const attempt2 = '0192f000-0222-7000-8000-000000000002';
        const lease1 = '0192f000-0333-7000-8000-000000000003';
        const lease2 = '0192f000-0444-7000-8000-000000000004';

        // First attempt in_progress: succeeds
        await client.query(`
          INSERT INTO "exam_attempts" (
            id, user_id, exam_id, exam_version, mode, status, lease_id, attempt_month
          ) VALUES (
            '${attempt1}', '${userId}', '${examId}', 1, 'real', 'in_progress', '${lease1}', '2026-10-01'
          );
        `);

        // Second attempt in_progress for same user and exam: must fail unique index
        await expect(
          client.query(`
            INSERT INTO "exam_attempts" (
              id, user_id, exam_id, exam_version, mode, status, lease_id, attempt_month
            ) VALUES (
              '${attempt2}', '${userId}', '${examId}', 1, 'real', 'in_progress', '${lease2}', '2026-10-01'
            );
          `),
        ).rejects.toThrow();
      } finally {
        await client.close();
      }
    });

    it('enforces CHECK (mode, status, submitted_by) on exam_attempts according to A10', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const userId = '0192f000-0000-7000-8000-000000000001';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const examsRes = (await client.query(`SELECT id FROM "exams" LIMIT 1;`)) as any;
        const examId = (examsRes.rows ?? examsRes)[0].id;

        // 1. Invalid mode: rejects
        await expect(
          client.query(`
            INSERT INTO "exam_attempts" (
              id, user_id, exam_id, exam_version, mode, status, lease_id, attempt_month
            ) VALUES (
              '0192f000-0aa1-7000-8000-000000000001', '${userId}', '${examId}', 1, 'invalid_mode', 'in_progress', '0192f000-0bb1-7000-8000-000000000001', '2026-10-01'
            );
          `),
        ).rejects.toThrow();

        // 2. Invalid status: rejects
        await expect(
          client.query(`
            INSERT INTO "exam_attempts" (
              id, user_id, exam_id, exam_version, mode, status, lease_id, attempt_month
            ) VALUES (
              '0192f000-0aa2-7000-8000-000000000002', '${userId}', '${examId}', 1, 'real', 'paused', '0192f000-0bb2-7000-8000-000000000002', '2026-10-01'
            );
          `),
        ).rejects.toThrow();

        // 3. Invalid submitted_by: rejects
        await expect(
          client.query(`
            INSERT INTO "exam_attempts" (
              id, user_id, exam_id, exam_version, mode, status, submitted_by, lease_id, attempt_month
            ) VALUES (
              '0192f000-0aa3-7000-8000-000000000003', '${userId}', '${examId}', 1, 'real', 'submitted', 'unauthorized_actor', '0192f000-0bb3-7000-8000-000000000003', '2026-10-01'
            );
          `),
        ).rejects.toThrow();

        // 4. Valid mode, status, submitted_by: succeeds
        await client.query(`
          INSERT INTO "exam_attempts" (
            id, user_id, exam_id, exam_version, mode, status, submitted_by, lease_id, attempt_month
          ) VALUES (
            '0192f000-0aa4-7000-8000-000000000004', '${userId}', '${examId}', 1, 'practice', 'submitted', 'auto_client', '0192f000-0bb4-7000-8000-000000000004', '2026-10-01'
          );
        `);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const queryRes = (await client.query(`SELECT mode, status, submitted_by FROM "exam_attempts" WHERE id = '0192f000-0aa4-7000-8000-000000000004';`)) as any;
        const inserted = (queryRes.rows ?? queryRes)[0];
        expect(inserted.mode).toBe('practice');
        expect(inserted.status).toBe('submitted');
        expect(inserted.submitted_by).toBe('auto_client');
      } finally {
        await client.close();
      }
    });

    it('creates and manages attempt_events partitions idempotently and routes inserts/queries correctly', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const months = getPartitionMonths(new Date('2026-10-15T00:00:00Z'), 3);
        expect(months.length).toBe(3);
        expect(months[0]?.startDate).toBe('2026-10-01');
        expect(months[1]?.startDate).toBe('2026-11-01');
        expect(months[2]?.startDate).toBe('2026-12-01');

        const created = await ensureAttemptEventsPartitions(client, months);
        expect(created.length).toBe(3);

        // Calling again does not fail (idempotency)
        const createdAgain = await ensureAttemptEventsPartitions(client, months);
        expect(createdAgain.length).toBe(3);

        // Create an attempt to satisfy FK attempt_id -> exam_attempts(id)
        const userId = '0192f000-0000-7000-8000-000000000001';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const examsRes = (await client.query(`SELECT id FROM "exams" LIMIT 1;`)) as any;
        const examId = (examsRes.rows ?? examsRes)[0].id;
        const attemptId = '0192f000-0ee1-7000-8000-000000000001';

        await client.query(`
          INSERT INTO "exam_attempts" (
            id, user_id, exam_id, exam_version, mode, status, lease_id, attempt_month
          ) VALUES (
            '${attemptId}', '${userId}', '${examId}', 1, 'real', 'in_progress', '0192f000-0ee2-7000-8000-000000000002', '2026-10-01'
          );
        `);

        // Insert event into October partition
        const eventOct = '0192f000-0ee3-7000-8000-000000000003';
        await client.query(`
          INSERT INTO "attempt_events" (
            id, attempt_month, attempt_id, seq, type, payload
          ) VALUES (
            '${eventOct}', '2026-10-15', '${attemptId}', 1, 'answers', '{"section": 0}'
          );
        `);

        // Insert event into November partition
        const eventNov = '0192f000-0ee4-7000-8000-000000000004';
        await client.query(`
          INSERT INTO "attempt_events" (
            id, attempt_month, attempt_id, seq, type, payload
          ) VALUES (
            '${eventNov}', '2026-11-05', '${attemptId}', 2, 'answers', '{"section": 1}'
          );
        `);

        // Query parent table: returns both events across partitions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parentRes = (await client.query(`SELECT id, attempt_month FROM "attempt_events" ORDER BY seq ASC;`)) as any;
        const parentRows = parentRes.rows ?? parentRes;
        expect(parentRows.length).toBe(2);
        expect(parentRows[0].id).toBe(eventOct);
        expect(parentRows[1].id).toBe(eventNov);

        // Query individual partition tables: verify rows were routed into exact physical partitions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const octPartitionRes = (await client.query(`SELECT id FROM "attempt_events_y2026m10";`)) as any;
        const octRows = octPartitionRes.rows ?? octPartitionRes;
        expect(octRows.length).toBe(1);
        expect(octRows[0].id).toBe(eventOct);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const novPartitionRes = (await client.query(`SELECT id FROM "attempt_events_y2026m11";`)) as any;
        const novRows = novPartitionRes.rows ?? novPartitionRes;
        expect(novRows.length).toBe(1);
        expect(novRows[0].id).toBe(eventNov);
      } finally {
        await client.close();
      }
    });

    it('verifies card_schedules table exists with snake_case naming', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = (await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'card_schedules';`)) as any;
        const rows = res.rows ?? res;
        const columns = rows.map((r: { column_name: string }) => r.column_name);
        expect(columns).toContain('card_id');
        expect(columns).toContain('due_at');
        expect(columns).toContain('interval_days');
        expect(columns).toContain('ease_factor');
        expect(columns).toContain('repetitions');
        expect(columns).toContain('state');
      } finally {
        await client.close();
      }
    });

    it('resolves migrations directory gracefully with dist/ and repo fallbacks', () => {
      const resolved = resolveMigrationsDir();
      expect(fs.existsSync(resolved)).toBe(true);
      expect(fs.existsSync(path.join(resolved, '0000_legal_paibok.sql'))).toBe(true);

      // Even if called with non-existent dir, falls back to a valid migrations directory
      const fallback = resolveMigrationsDir('/non/existent/path');
      expect(fs.existsSync(fallback)).toBe(true);
      expect(fs.existsSync(path.join(fallback, '0000_legal_paibok.sql'))).toBe(true);
    });
  });

  describe('Acceptance 2: Có dữ liệu tự soạn N1–N5, gắn nhãn synthetic', () => {
    const levels = ['n1', 'n2', 'n3', 'n4', 'n5'];

    it('all N1–N5 synthetic blueprint fixtures conform to BlueprintSchema and are labeled synthetic', () => {
      for (const lvl of levels) {
        const filePath = path.join(fixturesDir, 'blueprints', `synthetic-${lvl}.json`);
        expect(fs.existsSync(filePath), `Blueprint file missing: ${filePath}`).toBe(true);

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const parsed = BlueprintSchema.parse(data);

        expect(parsed.kind).toBe('synthetic');
        expect(parsed.isOfficial).toBe(false);
        expect(parsed.status).toBe('active');
        expect(parsed.level).toBe(lvl.toUpperCase());
        expect(parsed.sections.length).toBeGreaterThan(0);

        for (const sec of parsed.sections) {
          expect(sec.durationSec).toBeGreaterThan(0);
          expect(sec.mondai.length).toBeGreaterThan(0);
          for (const m of sec.mondai) {
            expect(m.questionCount).toBeGreaterThan(0);
          }
        }
      }
    });

    it('all N1–N5 synthetic exam fixtures are labeled synthetic with self_authored provenance', () => {
      for (const lvl of levels) {
        const filePath = path.join(fixturesDir, 'synthetic-exams', `synthetic-${lvl}.json`);
        expect(fs.existsSync(filePath), `Exam file missing: ${filePath}`).toBe(true);

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        expect(data.kind).toBe('synthetic');
        expect(data.provenance).toBe('self_authored');
        expect(data.label).toBe('synthetic');
        expect(data.level).toBe(lvl.toUpperCase());
        expect(data.questions.length).toBeGreaterThanOrEqual(4);

        // Verify each level has furigana/ruby question
        const hasRuby = data.questions.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (q: any) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            q.stem && q.stem.some((block: any) => block.content?.some((seg: any) => seg.type === 'ruby')),
        );
        expect(hasRuby, `Level ${lvl} should include a question with ruby/furigana`).toBe(true);

        // Verify each level has sentence composition star (★) question
        const hasStar = data.questions.some(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (q: any) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            q.stem && q.stem.some((block: any) => block.content?.some((seg: any) => seg.type === 'star')),
        );
        expect(hasStar, `Level ${lvl} should include a question with star ★`).toBe(true);

        // Verify each level has reading and listening questions
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const skills = data.questions.map((q: any) => q.skill);
        expect(skills).toContain('reading');
        expect(skills).toContain('listening');

        // Verify answer key conforms to ExamAnswerKeySchema
        const answerKey = ExamAnswerKeySchema.parse(data.answerKey);
        expect(answerKey.keys.length).toBe(data.questions.length);
        expect(answerKey.skills.length).toBe(data.questions.length);
      }
    });
  });

  describe('Acceptance 3: Blueprint thi thật chỉ kích hoạt khi có nguồn chính thức và xác nhận', () => {
    const levels = ['n1', 'n2', 'n3', 'n4', 'n5'];

    it('all official blueprints in fixtures are initially in draft status and unconfirmed', () => {
      for (const lvl of levels) {
        const filePath = path.join(fixturesDir, 'blueprints', `official-${lvl}.draft.json`);
        expect(fs.existsSync(filePath), `Official blueprint missing: ${filePath}`).toBe(true);

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const parsed = BlueprintSchema.parse(data);

        expect(parsed.kind).toBe('official');
        expect(parsed.isOfficial).toBe(true);
        expect(parsed.status).toBe('draft');
        expect(parsed.isConfirmed).toBe(false);
        expect(parsed.sourceRef.length).toBeGreaterThan(0);
        expect(parsed.sourceRef[0]?.url).toContain('jlpt.jp');
      }
    });

    it('rejects activating official blueprint without confirmation', () => {
      const officialDraft: Blueprint = {
        level: 'N1',
        version: 1,
        kind: 'official',
        isOfficial: true,
        status: 'draft',
        isConfirmed: false,
        effectiveFrom: '2026-10',
        sourceRef: [{ url: 'https://www.jlpt.jp/e/about/structure.html', accessedAt: '2026-10-15' }],
        sections: [
          {
            code: 'test',
            title: 'Test',
            durationSec: 3600,
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 5 }],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            { code: 's1', label: 'L1', skills: ['kanji'], maxScaled: 60, minPass: 19 },
          ],
          totalMax: 180,
          totalPass: 100,
        },
      };

      expect(() => activateBlueprint(officialDraft)).toThrow(BlueprintActivationError);
      expect(() => activateBlueprint(officialDraft)).toThrow(
        /xác nhận từ chủ dự án hoặc người vận hành/,
      );
    });

    it('rejects activating official blueprint with missing or non-jlpt.jp sourceRef', () => {
      const invalidOfficial: Blueprint = {
        level: 'N2',
        version: 1,
        kind: 'official',
        isOfficial: true,
        status: 'draft',
        isConfirmed: false,
        effectiveFrom: '2026-10',
        sourceRef: [], // Missing sources
        sections: [
          {
            code: 'test',
            title: 'Test',
            durationSec: 3600,
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 5 }],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            { code: 's1', label: 'L1', skills: ['kanji'], maxScaled: 60, minPass: 19 },
          ],
          totalMax: 180,
          totalPass: 90,
        },
      };

      const confirmation = { confirmedBy: '0192f000-0000-7000-8000-000000000001' };

      expect(() => activateBlueprint(invalidOfficial, confirmation)).toThrow(
        BlueprintActivationError,
      );
      expect(() => activateBlueprint(invalidOfficial, confirmation)).toThrow(
        /nguồn chính thức \(jlpt\.jp\)/,
      );
    });

    it('rejects activating official blueprint with zero placeholder values', () => {
      const blueprintWithZero: Blueprint = {
        level: 'N3',
        version: 1,
        kind: 'official',
        isOfficial: true,
        status: 'draft',
        isConfirmed: false,
        effectiveFrom: '2026-10',
        sourceRef: [{ url: 'https://www.jlpt.jp/e/about/structure.html', accessedAt: '2026-10-15' }],
        sections: [
          {
            code: 'vocab',
            title: 'Vocab',
            durationSec: 0, // 0 placeholder!
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 5 }],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            { code: 's1', label: 'L1', skills: ['kanji'], maxScaled: 60, minPass: 19 },
          ],
          totalMax: 180,
          totalPass: 95,
        },
      };

      const confirmation = { confirmedBy: '0192f000-0000-7000-8000-000000000001' };

      expect(() => activateBlueprint(blueprintWithZero, confirmation)).toThrow(
        BlueprintActivationError,
      );
      expect(() => activateBlueprint(blueprintWithZero, confirmation)).toThrow(
        /không được để placeholder 0/,
      );
    });

    it('successfully activates official blueprint when official source and confirmation are both present', () => {
      const officialDraft: Blueprint = {
        level: 'N1',
        version: 1,
        kind: 'official',
        isOfficial: true,
        status: 'draft',
        isConfirmed: false,
        effectiveFrom: '2026-10',
        sourceRef: [{ url: 'https://www.jlpt.jp/e/about/structure.html', accessedAt: '2026-10-15' }],
        sections: [
          {
            code: 'test',
            title: 'Test',
            durationSec: 3600,
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 5 }],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            { code: 's1', label: 'L1', skills: ['kanji'], maxScaled: 60, minPass: 19 },
          ],
          totalMax: 180,
          totalPass: 100,
        },
      };

      const confirmation = {
        confirmedBy: '0192f000-0000-7000-8000-000000000001',
        confirmedAt: '2026-10-16T00:00:00Z',
        notes: 'Chủ dự án đã xác nhận cấu trúc đề thi chính thức N1 từ jlpt.jp.',
      };

      const activated = activateBlueprint(officialDraft, confirmation);
      expect(activated.status).toBe('active');
      expect(activated.isConfirmed).toBe(true);
      expect(activated.confirmedBy).toBe(confirmation.confirmedBy);
      expect(activated.confirmedAt).toBe(confirmation.confirmedAt);
    });

    it('synthetic blueprint activates cleanly with synthetic label', () => {
      const syntheticBp: Blueprint = {
        level: 'N5',
        version: 1,
        kind: 'synthetic',
        isOfficial: false,
        status: 'draft',
        effectiveFrom: '2026-10',
        sourceRef: [],
        sections: [
          {
            code: 'test',
            title: 'Test',
            durationSec: 1200,
            mondai: [{ type: 'kanji_reading', skill: 'kanji', questionCount: 5 }],
          },
        ],
        scoring: {
          method: 'linear_reference',
          rounding: 'round',
          scoringSections: [
            { code: 's1', label: 'L1', skills: ['kanji'], maxScaled: 120, minPass: 38 },
          ],
          totalMax: 180,
          totalPass: 80,
        },
      };

      const activated = activateBlueprint(syntheticBp);
      expect(activated.status).toBe('active');
      expect(activated.kind).toBe('synthetic');
      expect(activated.isOfficial).toBe(false);
    });
  });

  describe('A01 Acceptance 1: Tenant-scoped composite constraints and isolation', () => {
    it('enforces composite unique constraint and valid role check on org_memberships', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const orgId = '0192f000-0010-7000-8000-000000000001';
        const teacherId = '0192f000-0010-7000-8000-000000000002';
        const adminId = '0192f000-0000-7000-8000-000000000001';

        await client.query(
          `INSERT INTO "organizations" (id, name, slug) VALUES ('${orgId}', 'JLPT Academy', 'jlpt-academy');`,
        );
        await client.query(
          `INSERT INTO "users" (id, email, role) VALUES ('${teacherId}', 'teacher@jlpt.local', 'user') ON CONFLICT DO NOTHING;`,
        );

        // First membership: succeeds
        await client.query(`
          INSERT INTO "org_memberships" (id, org_id, user_id, role)
          VALUES ('0192f000-0010-7000-8000-000000000003', '${orgId}', '${teacherId}', 'teacher');
        `);

        // Duplicate membership for same (org_id, user_id): must fail composite unique index
        await expect(
          client.query(`
            INSERT INTO "org_memberships" (id, org_id, user_id, role)
            VALUES ('0192f000-0010-7000-8000-000000000004', '${orgId}', '${teacherId}', 'member');
          `),
        ).rejects.toThrow();

        // Invalid role: must fail check constraint
        await expect(
          client.query(`
            INSERT INTO "org_memberships" (id, org_id, user_id, role)
            VALUES ('0192f000-0010-7000-8000-000000000005', '${orgId}', '${adminId}', 'invalid_role');
          `),
        ).rejects.toThrow();
      } finally {
        await client.close();
      }
    });

    it('enforces unique class name within tenant and valid JLPT level check', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const orgId = '0192f000-0020-7000-8000-000000000001';
        const teacherId = '0192f000-0000-7000-8000-000000000001'; // admin

        await client.query(`
          INSERT INTO "organizations" (id, name, slug) VALUES ('${orgId}', 'Tokyo Institute', 'tokyo-inst');
        `);

        // First class in org: succeeds
        await client.query(`
          INSERT INTO "classes" (id, org_id, teacher_id, name, level)
          VALUES ('0192f000-0020-7000-8000-000000000002', '${orgId}', '${teacherId}', 'Lớp N1 Cấp Tốc', 'N1');
        `);

        // Duplicate class name in SAME org: must fail composite unique index
        await expect(
          client.query(`
            INSERT INTO "classes" (id, org_id, teacher_id, name, level)
            VALUES ('0192f000-0020-7000-8000-000000000003', '${orgId}', '${teacherId}', 'Lớp N1 Cấp Tốc', 'N1');
          `),
        ).rejects.toThrow();

        // Invalid JLPT level: must fail check constraint
        await expect(
          client.query(`
            INSERT INTO "classes" (id, org_id, teacher_id, name, level)
            VALUES ('0192f000-0020-7000-8000-000000000004', '${orgId}', '${teacherId}', 'Lớp N9', 'N9');
          `),
        ).rejects.toThrow();
      } finally {
        await client.close();
      }
    });

    it('enforces composite unique constraint on class_memberships and valid status check', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const orgId = '0192f000-0030-7000-8000-000000000001';
        const classId = '0192f000-0030-7000-8000-000000000002';
        const studentId = '0192f000-0030-7000-8000-000000000003';
        const teacherId = '0192f000-0000-7000-8000-000000000001';

        await client.query(
          `INSERT INTO "organizations" (id, name, slug) VALUES ('${orgId}', 'Kyoto Center', 'kyoto-ctr');`,
        );
        await client.query(
          `INSERT INTO "classes" (id, org_id, teacher_id, name, level) VALUES ('${classId}', '${orgId}', '${teacherId}', 'Class 1', 'N2');`,
        );
        await client.query(
          `INSERT INTO "users" (id, email, role) VALUES ('${studentId}', 'student@jlpt.local', 'student') ON CONFLICT DO NOTHING;`,
        );


        // First enrollment: succeeds
        await client.query(`
          INSERT INTO "class_memberships" (id, class_id, student_id, status)
          VALUES ('0192f000-0030-7000-8000-000000000004', '${classId}', '${studentId}', 'active');
        `);

        // Duplicate enrollment for same (class_id, student_id): must fail
        await expect(
          client.query(`
            INSERT INTO "class_memberships" (id, class_id, student_id, status)
            VALUES ('0192f000-0030-7000-8000-000000000005', '${classId}', '${studentId}', 'active');
          `),
        ).rejects.toThrow();

        // Invalid status: must fail check constraint
        await expect(
          client.query(`
            INSERT INTO "class_memberships" (id, class_id, student_id, status)
            VALUES ('0192f000-0030-7000-8000-000000000006', '${classId}', '${studentId}', 'invalid_status');
          `),
        ).rejects.toThrow();
      } finally {
        await client.close();
      }
    });

    it('enforces CHECK (opens_at <= due_at) on assignments and unique assignment_learners', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const orgId = '0192f000-0040-7000-8000-000000000001';
        const classId = '0192f000-0040-7000-8000-000000000002';
        const teacherId = '0192f000-0000-7000-8000-000000000001';
        const studentId = '0192f000-0040-7000-8000-000000000003';
        const assignmentId = '0192f000-0040-7000-8000-000000000004';

        await client.query(
          `INSERT INTO "organizations" (id, name, slug) VALUES ('${orgId}', 'Osaka Center', 'osaka-ctr');`,
        );
        await client.query(
          `INSERT INTO "classes" (id, org_id, teacher_id, name, level) VALUES ('${classId}', '${orgId}', '${teacherId}', 'Class Osaka', 'N3');`,
        );
        await client.query(
          `INSERT INTO "users" (id, email, role) VALUES ('${studentId}', 'student_osaka@jlpt.local', 'student') ON CONFLICT DO NOTHING;`,
        );


        // Invalid assignment timeline: opens_at > due_at must fail
        await expect(
          client.query(`
            INSERT INTO "assignments" (id, class_id, title, opens_at, due_at)
            VALUES ('${assignmentId}', '${classId}', 'BTVN 1', '2026-11-10T00:00:00Z', '2026-11-05T00:00:00Z');
          `),
        ).rejects.toThrow();

        // Valid assignment timeline: succeeds
        await client.query(`
          INSERT INTO "assignments" (id, class_id, title, opens_at, due_at)
          VALUES ('${assignmentId}', '${classId}', 'BTVN 1', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z');
        `);

        // First assignment_learner: succeeds
        await client.query(`
          INSERT INTO "assignment_learners" (id, assignment_id, learner_id, status)
          VALUES ('0192f000-0040-7000-8000-000000000005', '${assignmentId}', '${studentId}', 'assigned');
        `);

        // Duplicate assignment_learner: must fail
        await expect(
          client.query(`
            INSERT INTO "assignment_learners" (id, assignment_id, learner_id, status)
            VALUES ('0192f000-0040-7000-8000-000000000006', '${assignmentId}', '${studentId}', 'assigned');
          `),
        ).rejects.toThrow();
      } finally {
        await client.close();
      }
    });

    it('enforces tenant_plans state machine and seats constraints', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);

        // Valid tenant plan
        await client.query(`
          INSERT INTO "tenant_plans" (tenant_id, plan_code, status, total_seats, used_seats, max_classes, features)
          VALUES ('org_123', 'teacher_pro', 'active', 50, 10, 5, '["ai_feedback"]'::jsonb);
        `);

        // Query inserted tenant plan
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = (await client.query(`SELECT * FROM "tenant_plans" WHERE tenant_id = 'org_123';`)) as any;
        const plan = (res.rows ?? res)[0];
        expect(plan.plan_code).toBe('teacher_pro');
        expect(plan.status).toBe('active');
        expect(plan.total_seats).toBe(50);
        expect(plan.used_seats).toBe(10);

        // Invalid status: must fail check constraint
        await expect(
          client.query(`
            INSERT INTO "tenant_plans" (tenant_id, plan_code, status, total_seats, used_seats, max_classes)
            VALUES ('org_invalid', 'plan', 'banned_status', 10, 0, 1);
          `),
        ).rejects.toThrow();

        // used_seats > total_seats: must fail check constraint
        await expect(
          client.query(`
            INSERT INTO "tenant_plans" (tenant_id, plan_code, status, total_seats, used_seats, max_classes)
            VALUES ('org_overflow', 'plan', 'active', 10, 15, 1);
          `),
        ).rejects.toThrow();
      } finally {
        await client.close();
      }
    });

    it('enforces timeline constraints and duplicate registration checks on exam_events', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const eventId = '0192f000-0050-7000-8000-000000000001';
        const userId = '0192f000-0000-7000-8000-000000000001';

        // Invalid timeline: starts_at >= ends_at
        await expect(
          client.query(`
            INSERT INTO "exam_events" (
              id, title, level, opens_at, starts_at, ends_at, result_release_at, capacity
            ) VALUES (
              '${eventId}', 'Thi thử quốc gia', 'N1',
              '2026-12-01T08:00:00Z', '2026-12-01T12:00:00Z', '2026-12-01T11:00:00Z', '2026-12-01T13:00:00Z', 100
            );
          `),
        ).rejects.toThrow();

        // Valid timeline: succeeds
        await client.query(`
          INSERT INTO "exam_events" (
            id, title, level, opens_at, starts_at, ends_at, result_release_at, capacity
          ) VALUES (
            '${eventId}', 'Thi thử quốc gia', 'N1',
            '2026-12-01T08:00:00Z', '2026-12-01T09:00:00Z', '2026-12-01T11:00:00Z', '2026-12-01T12:00:00Z', 100
          );
        `);

        // First registration: succeeds
        await client.query(`
          INSERT INTO "event_registrations" (id, event_id, user_id)
          VALUES ('0192f000-0050-7000-8000-000000000002', '${eventId}', '${userId}');
        `);

        // Duplicate registration for same event: must fail
        await expect(
          client.query(`
            INSERT INTO "event_registrations" (id, event_id, user_id)
            VALUES ('0192f000-0050-7000-8000-000000000003', '${eventId}', '${userId}');
          `),
        ).rejects.toThrow();

        // Single result publication per event
        await client.query(`
          INSERT INTO "event_result_publications" (id, event_id, released_at, released_by)
          VALUES ('0192f000-0050-7000-8000-000000000004', '${eventId}', now(), '${userId}');
        `);

        // Duplicate publication: must fail
        await expect(
          client.query(`
            INSERT INTO "event_result_publications" (id, event_id, released_at, released_by)
            VALUES ('0192f000-0050-7000-8000-000000000005', '${eventId}', now(), '${userId}');
          `),
        ).rejects.toThrow();
      } finally {
        await client.close();
      }
    });

    it('enforces composite unique constraint on comment_reports', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const threadId = '0192f000-0060-7000-8000-000000000001';
        const commentId = '0192f000-0060-7000-8000-000000000002';
        const authorId = '0192f000-0000-7000-8000-000000000001';
        const reporterId = '0192f000-0060-7000-8000-000000000003';

        await client.query(`
          INSERT INTO "users" (id, email, role) VALUES ('${reporterId}', 'reporter@jlpt.local', 'user') ON CONFLICT DO NOTHING;
        `);
        await client.query(`
          INSERT INTO "discussion_threads" (id, target_type, target_id, author_id, title, content)
          VALUES ('${threadId}', 'general', '0192f000-0060-7000-8000-000000000010', '${authorId}', 'Thảo luận', 'Nội dung');
        `);
        await client.query(`
          INSERT INTO "comments" (id, thread_id, author_id, content)
          VALUES ('${commentId}', '${threadId}', '${authorId}', 'Bình luận 1');
        `);

        // First report: succeeds
        await client.query(`
          INSERT INTO "comment_reports" (id, comment_id, reported_by, reason)
          VALUES ('0192f000-0060-7000-8000-000000000004', '${commentId}', '${reporterId}', 'Spam');
        `);

        // Duplicate report from same reporter: must fail
        await expect(
          client.query(`
            INSERT INTO "comment_reports" (id, comment_id, reported_by, reason)
            VALUES ('0192f000-0060-7000-8000-000000000005', '${commentId}', '${reporterId}', 'Duplicate report');
          `),
        ).rejects.toThrow();
      } finally {
        await client.close();
      }
    });
  });

  describe('A01 Acceptance 2: Delete/export không phá nghĩa vụ retention chưa được phê duyệt', () => {
    it('enforces retention_policies constraints: unique domain, retention_days > 0, approval rule', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const adminId = '0192f000-0000-7000-8000-000000000001';

        // Duplicate domain: must fail
        await expect(
          client.query(`
            INSERT INTO "retention_policies" (id, domain, retention_days, policy_approved, approved_by)
            VALUES ('0192f000-0070-7000-8000-000000000001', 'billing', 365, true, '${adminId}');
          `),
        ).rejects.toThrow();

        // retention_days <= 0: must fail check constraint
        await expect(
          client.query(`
            INSERT INTO "retention_policies" (id, domain, retention_days, policy_approved)
            VALUES ('0192f000-0070-7000-8000-000000000002', 'zero_days_domain', 0, false);
          `),
        ).rejects.toThrow();

        // policy_approved = true without approved_by: must fail approval check
        await expect(
          client.query(`
            INSERT INTO "retention_policies" (id, domain, retention_days, policy_approved, approved_by)
            VALUES ('0192f000-0070-7000-8000-000000000003', 'approved_without_approver', 30, true, NULL);
          `),
        ).rejects.toThrow();
      } finally {
        await client.close();
      }
    });

    it('canPurgeDomain returns canPurge: true for approved domain, false for unapproved', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const billingCheck = await canPurgeDomain(client, 'billing');
        expect(billingCheck.canPurge).toBe(true);
        expect(billingCheck.policyApproved).toBe(true);
        expect(billingCheck.retentionDays).toBe(3650);

        const unapprovedCheck = await canPurgeDomain(client, 'unapproved_sample');
        expect(unapprovedCheck.canPurge).toBe(false);
        expect(unapprovedCheck.policyApproved).toBe(false);
        expect(unapprovedCheck.reason).toContain('chưa có chính sách lưu trữ');

        const unknownCheck = await canPurgeDomain(client, 'unknown_domain');
        expect(unknownCheck.canPurge).toBe(false);
      } finally {
        await client.close();
      }
    });

    it('assertRetentionObligationNotViolated rejects purging data in unapproved domain', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        await expect(assertRetentionObligationNotViolated(client, 'billing')).resolves.not.toThrow();
        await expect(assertRetentionObligationNotViolated(client, 'unapproved_sample')).rejects.toThrow(
          RetentionViolationError,
        );
      } finally {
        await client.close();
      }
    });

    it('executeRetentionSafeDeletion preserves unapproved ledger data and records audit request', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const userId = '0192f000-0000-7000-8000-000000000001';

        // When requesting deletion across approved ('billing', 'audit_logs') and unapproved ('unapproved_sample') domains
        const result = await executeRetentionSafeDeletion(client, userId, [
          'billing',
          'audit_logs',
          'unapproved_sample',
        ]);

        expect(result.deletedDomains).toContain('billing');
        expect(result.deletedDomains).toContain('audit_logs');
        expect(result.preservedDomains).toContain('unapproved_sample');
        expect(result.status).toBe('blocked_retention');
        expect(result.notes).toContain('Bảo tồn các miền bắt buộc');

        // Verify recorded deletion_requests entry
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reqRows = (await client.query(`SELECT * FROM "deletion_requests" WHERE user_id = '${userId}';`)) as any;
        const rows = reqRows.rows ?? reqRows;
        expect(rows.length).toBeGreaterThan(0);
        expect(rows[0].status).toBe('blocked_retention');
      } finally {
        await client.close();
      }
    });
  });

  describe('A01 Acceptance 3: AI generation labels and Versioning', () => {
    it('explanation_versions preserves ai_generated label and enforces unique (question_id, version, locale)', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const adminId = '0192f000-0000-7000-8000-000000000001';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const qRes = (await client.query(`SELECT id FROM "questions" LIMIT 1;`)) as any;
        const questionId = (qRes.rows ?? qRes)[0].id;

        // Insert AI generated explanation
        const explId = '0192f000-0080-7000-8000-000000000001';
        await client.query(`
          INSERT INTO "explanation_versions" (
            id, question_id, version, content, locale, author_id, ai_generated, status
          ) VALUES (
            '${explId}', '${questionId}', 2, '{"text":"Giải thích tự động bởi AI"}'::jsonb, 'vi', '${adminId}', true, 'draft'
          );
        `);

        // Query inserted explanation: verify ai_generated is true
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const insertedRes = (await client.query(`SELECT ai_generated FROM "explanation_versions" WHERE id = '${explId}';`)) as any;
        const inserted = (insertedRes.rows ?? insertedRes)[0];
        expect(inserted.ai_generated).toBe(true);

        // Duplicate (question_id, version, locale): must fail unique index
        await expect(
          client.query(`
            INSERT INTO "explanation_versions" (
              id, question_id, version, content, locale, author_id, ai_generated, status
            ) VALUES (
              '0192f000-0080-7000-8000-000000000002', '${questionId}', 2, '{"text":"Duplicate"}'::jsonb, 'vi', '${adminId}', false, 'draft'
            );
          `),
        ).rejects.toThrow();
      } finally {
        await client.close();
      }
    });

    it('ai_content_versions enforces valid approval_status check constraint', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);

        // Invalid approval_status: must fail
        await expect(
          client.query(`
            INSERT INTO "ai_content_versions" (id, generated_type, content, ai_generated, approval_status)
            VALUES ('0192f000-0090-7000-8000-000000000001', 'hint', '{"hint":"test"}'::jsonb, true, 'invalid_status');
          `),
        ).rejects.toThrow();

        // Valid approval_status: succeeds
        await client.query(`
          INSERT INTO "ai_content_versions" (id, generated_type, content, ai_generated, approval_status)
          VALUES ('0192f000-0090-7000-8000-000000000002', 'hint', '{"hint":"test"}'::jsonb, true, 'approved');
        `);
      } finally {
        await client.close();
      }
    });
  });

  describe('V01 Acceptance 3: Race tests, concurrent migration serialization, and privacy migration', () => {
    it('concurrent migrations (5 parallel callers) are serialised and execute ledger once', async () => {
      const client = await createDbClient();
      try {
        const results = await Promise.all([
          runMigrations(client),
          runMigrations(client),
          runMigrations(client),
          runMigrations(client),
          runMigrations(client),
        ]);
        const appliedRuns = results.filter((r) => r.applied.length > 0);
        const zeroAppliedRuns = results.filter((r) => r.applied.length === 0);
        expect(appliedRuns.length).toBe(1);
        expect(appliedRuns[0]!.applied.length).toBeGreaterThanOrEqual(4);
        expect(zeroAppliedRuns.length).toBe(4);
        for (const r of zeroAppliedRuns) {
          expect(r.alreadyApplied.length).toBeGreaterThanOrEqual(4);
        }
      } finally {
        await client.close();
      }
    });

    it('enforces export_jobs status check constraint from migration 0003', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const userId = '0192f000-0000-7000-8000-000000000001';
        // Invalid status: must fail
        await expect(
          client.query(`
            INSERT INTO "export_jobs" (id, job_type, status, requested_by)
            VALUES ('0192f000-0095-7000-8000-000000000001', 'score_report_pdf', 'illegal_status', '${userId}');
          `),
        ).rejects.toThrow();

        // Valid status: succeeds
        await client.query(`
          INSERT INTO "export_jobs" (id, job_type, status, requested_by)
          VALUES ('0192f000-0095-7000-8000-000000000002', 'score_report_pdf', 'completed', '${userId}');
        `);
      } finally {
        await client.close();
      }
    });

    it('creates and verifies privacy indices for data export, deletion requests, and report snapshots', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        const indexRes = (await client.query(`
          SELECT indexname FROM pg_indexes
          WHERE schemaname = 'public'
          AND indexname IN (
            'data_export_jobs_user_status_idx',
            'deletion_requests_user_status_idx',
            'report_snapshots_name_period_idx',
            'export_jobs_requested_by_status_idx'
          );
        `)) as { rows?: Array<{ indexname: string }> } | Array<{ indexname: string }>;
        const rows = 'rows' in indexRes && Array.isArray(indexRes.rows) ? indexRes.rows : (indexRes as Array<{ indexname: string }>);
        const names = rows.map((r) => r.indexname);
        expect(names).toContain('data_export_jobs_user_status_idx');
        expect(names).toContain('deletion_requests_user_status_idx');
        expect(names).toContain('report_snapshots_name_period_idx');
        expect(names).toContain('export_jobs_requested_by_status_idx');
      } finally {
        await client.close();
      }
    });
  });

  describe('R01 Acceptance: Final database migrations and schema consistency verification', () => {
    it('migration journal meta matches migration directory perfectly', () => {
      const migrationsDir = resolveMigrationsDir();
      const journalPath = path.join(migrationsDir, 'meta', '_journal.json');
      expect(fs.existsSync(journalPath)).toBe(true);

      const journal = JSON.parse(fs.readFileSync(journalPath, 'utf8'));
      expect(journal.dialect).toBe('postgresql');
      expect(Array.isArray(journal.entries)).toBe(true);
      expect(journal.entries.length).toBe(7);

      const sqlFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
      expect(sqlFiles.length).toBe(7);

      for (let i = 0; i < journal.entries.length; i++) {
        expect(journal.entries[i].idx).toBe(i);
        const expectedTag = sqlFiles[i]!.replace('.sql', '');
        expect(journal.entries[i].tag).toBe(expectedTag);
      }
    });

    it('serializes 10 concurrent migration callers with zero lock errors', async () => {
      const client = await createDbClient();
      try {
        const results = await Promise.all(
          Array.from({ length: 10 }, () => runMigrations(client)),
        );
        const appliedRuns = results.filter((r) => r.applied.length > 0);
        const zeroAppliedRuns = results.filter((r) => r.applied.length === 0);
        expect(appliedRuns.length).toBe(1);
        expect(appliedRuns[0]!.applied.length).toBe(7);
        expect(zeroAppliedRuns.length).toBe(9);
        for (const r of zeroAppliedRuns) {
          expect(r.alreadyApplied.length).toBe(7);
        }
      } finally {
        await client.close();
      }
    });

    it('verifies all 21 core domain tables exist and pass expand-contract compatibility', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);
        await seedDatabase(client, fixturesDir);

        const compat = await verifyRollbackCompatibility(client);
        expect(compat.compatible).toBe(true);
        expect(compat.checkedTables.length).toBe(21);
        for (const [_table, status] of Object.entries(compat.details)) {
          expect(status).not.toContain('FAILED');
          expect(status).toContain('PASSED');
        }
      } finally {
        await client.close();
      }
    });
  });
});

