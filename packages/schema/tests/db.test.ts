import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BlueprintSchema,
  ExamAnswerKeySchema,
  type Blueprint,
} from '../src/index.js';

// We import database utilities directly from apps/api/src/db
import {
  activateBlueprint,
  BlueprintActivationError,
  createDbClient,
  ensureAttemptEventsPartitions,
  getPartitionMonths,
  runMigrations,
  seedDatabase,
  verifyRollbackCompatibility,
} from '../../../apps/api/src/db/index.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturesDir = path.resolve(__dirname, '../fixtures');

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
        expect(secondRun.alreadyApplied.length).toBeGreaterThanOrEqual(2);
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

    it('creates and manages attempt_events partitions idempotently', async () => {
      const client = await createDbClient();
      try {
        await runMigrations(client);

        const months = getPartitionMonths(new Date('2026-10-15T00:00:00Z'), 3);
        expect(months.length).toBe(3);
        expect(months[0].startDate).toBe('2026-10-01');
        expect(months[1].startDate).toBe('2026-11-01');
        expect(months[2].startDate).toBe('2026-12-01');

        const created = await ensureAttemptEventsPartitions(client, months);
        expect(created.length).toBe(3);

        // Calling again does not fail
        const createdAgain = await ensureAttemptEventsPartitions(client, months);
        expect(createdAgain.length).toBe(3);
      } finally {
        await client.close();
      }
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
        expect(parsed.sourceRef[0].url).toContain('jlpt.jp');
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
});
