import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DbClientInstance } from './client.js';
import { ensureAttemptEventsPartitions } from './partitions.js';
import * as schema from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SeedResult {
  usersSeeded: number;
  blueprintsSeeded: number;
  examsSeeded: number;
  questionsSeeded: number;
  partitionsCreated: number;
}

/**
 * Seeds fresh database with development data, synthetic N1-N5 exams, and blueprints.
 * Fully idempotent.
 */
export async function seedDatabase(
  client: DbClientInstance,
  fixturesDir?: string,
): Promise<SeedResult> {
  const rootFixtureDir =
    fixturesDir ?? path.resolve(__dirname, '../../../../packages/schema/fixtures');

  let usersSeeded = 0;
  let blueprintsSeeded = 0;
  let examsSeeded = 0;
  let questionsSeeded = 0;

  // 1. Seed Roles & Admin user
  const adminId = '0192f000-0000-7000-8000-000000000001';
  await client.db
    .insert(schema.users)
    .values({
      id: adminId,
      name: 'System Admin',
      email: 'admin@jlpt.local',
      emailVerified: true,
      role: 'admin',
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    })
    .onConflictDoNothing();
  usersSeeded++;

  // 2. Seed Initial Source & License
  const sourceId = '0192f000-0000-7000-8000-000000000002';
  await client.db
    .insert(schema.examSources)
    .values({
      id: sourceId,
      slug: 'self-authored',
      name: 'JLPT Online Self-Authored',
      provenance: 'self_authored',
      metadata: { label: 'synthetic' },
    })
    .onConflictDoNothing();

  const licenseId = '0192f000-0000-7000-8000-000000000003';
  await client.db
    .insert(schema.contentLicenses)
    .values({
      id: licenseId,
      sourceId,
      licenseType: 'internal_synthetic',
      effectiveFrom: new Date('2026-10-01T00:00:00Z'),
      terms: 'Nội dung tự soạn độc quyền cho JLPT Online (gắn nhãn synthetic).',
    })
    .onConflictDoNothing();

  // 3. Seed Blueprints (Synthetic active N1-N5 + Official draft N1-N5)
  const bpDir = path.join(rootFixtureDir, 'blueprints');
  if (fs.existsSync(bpDir)) {
    const bpFiles = fs.readdirSync(bpDir).filter((f) => f.endsWith('.json'));
    for (const f of bpFiles) {
      const content = JSON.parse(fs.readFileSync(path.join(bpDir, f), 'utf8'));
      // Deterministic UUID for blueprint based on level and kind
      const isOfficial = content.kind === 'official' || content.isOfficial === true;
      const bpId = isOfficial
        ? `0192f000-0001-7000-8000-00000000000${content.level.slice(1)}`
        : `0192f000-0002-7000-8000-00000000000${content.level.slice(1)}`;

      await client.db
        .insert(schema.blueprints)
        .values({
          id: bpId,
          level: content.level,
          version: content.version ?? 1,
          kind: isOfficial ? 'official' : 'synthetic',
          status: isOfficial ? 'draft' : 'active',
          isOfficial,
          isConfirmed: !isOfficial,
          effectiveFrom: content.effectiveFrom ?? '2026-10',
          sourceRef: content.sourceRef ?? [],
          note: content.note ?? '',
          sections: content.sections,
          scoring: content.scoring,
        })
        .onConflictDoNothing();
      blueprintsSeeded++;
    }
  }

  // 4. Seed Synthetic Exams N1-N5
  const examDir = path.join(rootFixtureDir, 'synthetic-exams');
  if (fs.existsSync(examDir)) {
    const examFiles = fs.readdirSync(examDir).filter((f) => f.endsWith('.json'));
    for (const f of examFiles) {
      const examData = JSON.parse(fs.readFileSync(path.join(examDir, f), 'utf8'));

      // Blueprint ID for this synthetic level
      const bpId = `0192f000-0002-7000-8000-00000000000${examData.level.slice(1)}`;

      await client.db
        .insert(schema.exams)
        .values({
          id: examData.id,
          slug: examData.slug,
          level: examData.level,
          title: examData.title,
          kind: 'synthetic',
          year: examData.year ?? 2026,
          session: examData.session ?? '10',
          totalQuestions: examData.totalQuestions,
          description: examData.description ?? '',
          publishedVersion: 1,
        })
        .onConflictDoNothing();

      // Exam Version
      await client.db
        .insert(schema.examVersions)
        .values({
          examId: examData.id,
          version: 1,
          snapshotKey: `exams/${examData.id}/v1/snapshot.json`,
          manifestKey: `exams/${examData.id}/v1/manifest.json`,
          blueprintId: bpId,
          blueprintVersion: 1,
          scoring: { method: 'linear_reference', rounding: 'round' },
          totalQuestions: examData.totalQuestions,
          publishedAt: new Date(),
          publishedBy: adminId,
        })
        .onConflictDoNothing();

      // Exam Answer Key (Server only)
      if (examData.answerKey) {
        await client.db
          .insert(schema.examAnswerKeys)
          .values({
            examId: examData.id,
            version: 1,
            keys: examData.answerKey.keys,
            skills: examData.answerKey.skills,
            mondaiTypes: examData.answerKey.mondaiTypes,
            sectionRanges: examData.answerKey.sectionRanges,
          })
          .onConflictDoNothing();
      }

      // Seed Questions & Options
      if (Array.isArray(examData.questions)) {
        for (const q of examData.questions) {
          await client.db
            .insert(schema.questions)
            .values({
              id: q.id,
              level: examData.level,
              skill: q.skill,
              mondaiType: q.mondaiType,
              origin: 'self_composed',
            })
            .onConflictDoNothing();

          await client.db
            .insert(schema.questionVersions)
            .values({
              questionId: q.id,
              version: 1,
              stem: q.stem,
              explanation: q.explanation,
              status: 'approved',
            })
            .onConflictDoNothing();

          if (Array.isArray(q.options)) {
            for (const opt of q.options) {
              await client.db
                .insert(schema.answerOptions)
                .values({
                  questionId: q.id,
                  questionVersion: 1,
                  orderIndex: opt.orderIndex,
                  content: opt.content,
                })
                .onConflictDoNothing();
            }
          }

          if (q.correctOption) {
            await client.db
              .insert(schema.correctAnswers)
              .values({
                questionId: q.id,
                questionVersion: 1,
                correctOption: q.correctOption,
              })
              .onConflictDoNothing();
          }

          questionsSeeded++;
        }
      }

      examsSeeded++;
    }
  }

  // 5. Seed Retention Policies (idempotent)
  const defaultPolicies = [
    {
      id: '0192f000-0000-7000-8000-000000000011',
      domain: 'billing',
      retentionDays: 3650,
      policyApproved: true,
      approvedBy: adminId,
    },
    {
      id: '0192f000-0000-7000-8000-000000000012',
      domain: 'exam_attempts',
      retentionDays: 1825,
      policyApproved: true,
      approvedBy: adminId,
    },
    {
      id: '0192f000-0000-7000-8000-000000000013',
      domain: 'audit_logs',
      retentionDays: 730,
      policyApproved: true,
      approvedBy: adminId,
    },
    {
      id: '0192f000-0000-7000-8000-000000000014',
      domain: 'unapproved_sample',
      retentionDays: 30,
      policyApproved: false,
      approvedBy: null,
    },
  ];

  for (const pol of defaultPolicies) {
    await client.db
      .insert(schema.retentionPolicies)
      .values(pol)
      .onConflictDoNothing();
  }

  // 6. Partitions creation (idempotent)
  const partitions = await ensureAttemptEventsPartitions(client);

  return {
    usersSeeded,
    blueprintsSeeded,
    examsSeeded,
    questionsSeeded,
    partitionsCreated: partitions.length,
  };
}


// Standalone runner CLI support
if (process.argv[1] && process.argv[1].endsWith('seed.ts')) {
  import('./client.js').then(async ({ createDbClient }) => {
    console.log('[db:seed] Starting database seeder...');
    const client = await createDbClient();
    try {
      const res = await seedDatabase(client);
      console.log(
        `[db:seed] Seeded: ${res.usersSeeded} users, ${res.blueprintsSeeded} blueprints, ${res.examsSeeded} exams, ${res.questionsSeeded} questions, ${res.partitionsCreated} partitions`,
      );
    } finally {
      await client.close();
    }
  });
}
