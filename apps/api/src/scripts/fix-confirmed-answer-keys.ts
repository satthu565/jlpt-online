import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { DB_CLIENT } from '../common/database/database.module.js';
import { generateUuidV7 } from '../common/utils/uuid.js';
import type { DbClientInstance } from '../db/client.js';
import { ExamService } from '../modules/exam/exam.service.js';

export type ConfirmedAnswerKeyFix = readonly [
  examSlug: string,
  questionNumber: number,
  expectedOldKey: number,
  correctedKey: number,
  reason: string,
];

export const CONFIRMED_ANSWER_KEY_FIXES: readonly ConfirmedAnswerKeyFix[] = [
  ['n1-2025-07', 20, 3, 2, '保留 is valid in 返答を保留した, not データをパソコンに保留した'],
  ['n1-2024-12', 37, 4, 2, 'The grammatical order places option 2 in the starred slot'],
  ['n1-2024-07', 47, 3, 1, 'Environment can preserve or reduce mutation-driven diversity'],
  ['n1-2024-07', 69, 1, 3, 'The displayed response asks why the speakers are in conflict'],
  ['n1-2024-07', 70, 1, 3, 'The displayed response agrees that the movie scene is moving'],
  ['n1-2024-07', 71, 1, 3, 'The displayed response says the coffee is poor'],
  ['n1-2024-07', 72, 1, 3, 'The response shows surprise because Mori is normally punctual'],
  ['n1-2024-07', 73, 1, 2, 'The displayed response says notification is unnecessary'],
  ['n1-2024-07', 76, 1, 2, 'The displayed response says Kimura is the best'],
  ['n1-2024-07', 78, 1, 2, 'The section chief record was nearly surpassed'],
  ['n1-2023-07', 17, 4, 3, '不慮 means unexpected, matching 思いがけない'],
  ['n1-2022-07', 58, 1, 2, 'The author reads to reconsider their own narrow viewpoint'],
  ['n1-2019-12', 60, 4, 2, 'Excessive media demands burden researchers'],
  ['n1-2019-07', 20, 3, 1, '簡素なゲーム is valid usage; 簡素な味 is not'],
  ['n1-2016-07', 57, 4, 1, 'Ordinary people can serve as witnesses to their era'],
  ['n1-2015-12', 51, 3, 1, 'A work may be recognized later'],
  ['n1-2011-07', 62, 4, 2, '教養 is learning cultivated in each person disposition'],
  ['n2-2021-12', 37, 3, 1, '社会人にもなって is the valid reproach construction'],
  ['n2-2013-07', 32, 4, 2, 'A river can 隔てる two cities; the keyed sentence is malformed'],
  ['n3-2024-07', 61, 3, 4, 'Coffee should be taken immediately before the nap'],
  ['n3-2021-07', 51, 1, 3, 'Order 2-1-3-4 places option 3 in the starred slot'],
  ['n3-2015-12', 49, 2, 1, 'Order 4-2-1-3 places option 1 in the starred slot'],
  ['n4-2022-12', 44, 2, 4, 'The valid order places option 4 in the starred slot'],
  ['n4-2012-12', 12, 3, 4, '歩いて is valid; the keyed option 歩て is malformed'],
  ['n4-2010-2011', 65, 4, 3, 'The writer was not yet accustomed to the work'],
  ['n5-2024-07', 25, 2, 4, '新しいカメラがほしいです requires が'],
  ['n5-2012-12', 41, 2, 1, 'きょうしつでは、ぼうしをぬいでください requires では'],
] as const;

interface ResolvedFix {
  fix: ConfirmedAnswerKeyFix;
  examId: string;
  questionId: string;
  groupId: string;
  questionVersion: number;
  groupVersion: number;
  currentKey: number;
  publishedVersion: number;
  publishedKey: number;
}

const fixId = (fix: ConfirmedAnswerKeyFix) => fix[0] + ':Q' + fix[1];

async function resolveFixes(sql: DbClientInstance['rawClient']): Promise<ResolvedFix[]> {
  const resolved: ResolvedFix[] = [];
  for (const fix of CONFIRMED_ANSWER_KEY_FIXES) {
    const [slug, questionNumber, expectedOldKey, correctedKey] = fix;
    const rows = await sql`
      select e.id as exam_id, e.published_version, q.id as question_id, q.group_id,
             qv.version as question_version, qv.status as question_status,
             gv.version as group_version, gv.status as group_status,
             ca.correct_option as current_key, eak.keys[${questionNumber}] as published_key
      from exams e
      join exam_items ei on ei.exam_id = e.id and ei.order_index = ${questionNumber - 1}
      join questions q on q.id = ei.question_id and q.deleted_at is null
      join lateral (
        select * from question_versions v where v.question_id = q.id
        order by v.version desc limit 1
      ) qv on true
      join lateral (
        select * from question_group_versions v where v.group_id = q.group_id
        order by v.version desc limit 1
      ) gv on true
      join correct_answers ca on ca.question_id = q.id and ca.question_version = qv.version
      join exam_answer_keys eak on eak.exam_id = e.id and eak.version = e.published_version
      where e.slug = ${slug} and e.deleted_at is null
    `;
    const row = rows[0];
    if (!row) throw new Error(fixId(fix) + ': target was not found');
    if (row.question_status !== 'approved' || row.group_status !== 'approved') {
      throw new Error(fixId(fix) + ': latest content is not approved');
    }
    if (row.question_version !== row.group_version) {
      throw new Error(fixId(fix) + ': question/group versions are not aligned');
    }
    if (row.current_key !== expectedOldKey && row.current_key !== correctedKey) {
      throw new Error(fixId(fix) + ': unexpected current key ' + row.current_key);
    }
    resolved.push({
      fix,
      examId: row.exam_id,
      questionId: row.question_id,
      groupId: row.group_id,
      questionVersion: row.question_version,
      groupVersion: row.group_version,
      currentKey: row.current_key,
      publishedVersion: row.published_version,
      publishedKey: row.published_key,
    });
  }
  return resolved;
}

async function requireBackup(): Promise<string> {
  const backupPath = process.env.CONFIRMED_ANSWER_KEYS_BACKUP;
  if (!backupPath) throw new Error('CONFIRMED_ANSWER_KEYS_BACKUP is required');
  const info = await stat(backupPath);
  if (!info.isFile() || info.size < 1024 * 1024) {
    throw new Error('Backup is missing or unexpectedly small: ' + backupPath);
  }
  return backupPath;
}

async function applyQuestionVersions(
  sql: DbClientInstance['rawClient'],
  resolved: ResolvedFix[],
): Promise<number> {
  const [editor] = await sql`select id from users where role = 'editor' and blocked_at is null`;
  const [reviewer] = await sql`select id from users where role = 'reviewer' and blocked_at is null`;
  const [admin] = await sql`select id from users where role = 'admin' and blocked_at is null`;
  if (!editor || !reviewer || !admin || editor.id === reviewer.id) {
    throw new Error('Distinct active editor, reviewer, and admin users are required');
  }

  const byGroup = new Map<string, ResolvedFix[]>();
  for (const item of resolved) {
    const values = byGroup.get(item.groupId) ?? [];
    values.push(item);
    byGroup.set(item.groupId, values);
  }

  let changed = 0;
  await sql.begin(async (tx: DbClientInstance['rawClient']) => {
    for (const [groupId, groupFixes] of byGroup) {
      if (groupFixes.every((item) => item.currentKey === item.fix[3])) continue;
      const sourceVersion = groupFixes[0]!.groupVersion;
      const nextVersion = sourceVersion + 1;
      const latest = await tx`
        select version, status from question_group_versions
        where group_id = ${groupId} order by version desc limit 1 for update
      `;
      if (latest[0]?.version !== sourceVersion || latest[0]?.status !== 'approved') {
        throw new Error('Group changed after preflight: ' + groupId);
      }
      await tx`
        insert into question_group_versions
          (group_id, version, passage, audio_sha256, status, created_at)
        select group_id, ${nextVersion}, passage, audio_sha256, 'approved', now()
        from question_group_versions
        where group_id = ${groupId} and version = ${sourceVersion}
      `;
      const questions = await tx`
        select id from questions where group_id = ${groupId} and deleted_at is null
      `;
      for (const question of questions) {
        const target = groupFixes.find((item) => item.questionId === question.id);
        await tx`
          insert into question_versions
            (question_id, version, stem, explanation, status, created_at)
          select question_id, ${nextVersion}, stem, explanation, 'approved', now()
          from question_versions
          where question_id = ${question.id} and version = ${sourceVersion}
        `;
        await tx`
          insert into answer_options (question_id, question_version, order_index, content)
          select question_id, ${nextVersion}, order_index, content
          from answer_options
          where question_id = ${question.id} and question_version = ${sourceVersion}
        `;
        if (target) {
          await tx`
            insert into correct_answers
              (question_id, question_version, correct_option, explanation_notes)
            select question_id, ${nextVersion}, ${target.fix[3]}, explanation_notes
            from correct_answers
            where question_id = ${question.id} and question_version = ${sourceVersion}
          `;
        } else {
          await tx`
            insert into correct_answers
              (question_id, question_version, correct_option, explanation_notes)
            select question_id, ${nextVersion}, correct_option, explanation_notes
            from correct_answers
            where question_id = ${question.id} and question_version = ${sourceVersion}
          `;
        }
      }
      await tx`
        insert into content_reviews
          (id, target_type, target_id, target_version, reviewer_id, last_editor_id,
           status, comments, reviewed_at)
        values (${generateUuidV7()}, 'group_version', ${groupId}, ${nextVersion},
                ${reviewer.id}, ${editor.id}, 'approved',
                ${'Owner-authorized confirmed answer-key correction: ' + groupFixes.map((x) => fixId(x.fix)).join(', ')},
                now())
      `;
      await tx`
        insert into operator_actions
          (id, operator_id, action, target_resource, details, timestamp)
        values (${generateUuidV7()}, ${admin.id}, 'content.correct_answer.bulk_fix',
                ${'question_group:' + groupId},
                ${JSON.stringify({
                  source: 'owner-authorized-maintenance',
                  version: nextVersion,
                  fixes: groupFixes.map((x) => ({
                    examSlug: x.fix[0], questionNumber: x.fix[1], from: x.fix[2], to: x.fix[3],
                  })),
                })}::jsonb, now())
      `;
      changed += 1;
    }
  });
  return changed;
}

export async function runConfirmedAnswerKeyFix(argv = process.argv.slice(2)): Promise<void> {
  const apply = argv.includes('--apply');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const dbClient = app.get<DbClientInstance>(DB_CLIENT);
    const examService = app.get(ExamService);
    let resolved = await resolveFixes(dbClient.rawClient);
    const status = () => ({
      mode: apply ? 'apply' : 'dry-run',
      fixes: resolved.length,
      affectedExams: new Set(resolved.map((x) => x.examId)).size,
      affectedGroups: new Set(resolved.map((x) => x.groupId)).size,
      pendingQuestionVersions: resolved.filter((x) => x.currentKey !== x.fix[3]).length,
      pendingPublishedKeys: resolved.filter((x) => x.publishedKey !== x.fix[3]).length,
    });
    Logger.log(JSON.stringify(status()), 'ConfirmedAnswerKeyFix');
    if (!apply) return;

    const backupPath = await requireBackup();
    const groupsVersioned = await applyQuestionVersions(dbClient.rawClient, resolved);
    resolved = await resolveFixes(dbClient.rawClient);
    for (const item of resolved) {
      if (item.currentKey !== item.fix[3]) throw new Error(fixId(item.fix) + ': versioning failed');
    }

    const byExam = new Map<string, ResolvedFix[]>();
    for (const item of resolved) {
      const values = byExam.get(item.examId) ?? [];
      values.push(item);
      byExam.set(item.examId, values);
    }
    const [admin] = await dbClient.rawClient`
      select id from users where role = 'admin' and blocked_at is null
    `;
    if (!admin) throw new Error('Active admin user is required');
    let examsPublished = 0;
    for (const [examId, examFixes] of byExam) {
      if (examFixes.every((item) => item.publishedKey === item.fix[3])) continue;
      await examService.publishExam(examId, admin.id);
      examsPublished += 1;
    }

    resolved = await resolveFixes(dbClient.rawClient);
    for (const item of resolved) {
      if (item.currentKey !== item.fix[3] || item.publishedKey !== item.fix[3]) {
        throw new Error(fixId(item.fix) + ': final verification failed');
      }
    }
    Logger.log(
      JSON.stringify({ groupsVersioned, examsPublished, fixesVerified: resolved.length, backupPath }),
      'ConfirmedAnswerKeyFix',
    );
  } finally {
    await app.close();
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  runConfirmedAnswerKeyFix().catch((error: unknown) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    Logger.error(normalized.message, normalized.stack, 'ConfirmedAnswerKeyFix');
    process.exitCode = 1;
  });
}
