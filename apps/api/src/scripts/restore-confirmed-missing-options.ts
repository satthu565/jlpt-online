import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { DB_CLIENT } from '../common/database/database.module.js';
import { generateUuidV7 } from '../common/utils/uuid.js';
import type { DbClientInstance } from '../db/client.js';
import { ExamService } from '../modules/exam/exam.service.js';

export type MissingOptionRestoration = readonly [
  examSlug: string,
  questionNumber: number,
  optionIndex: number,
  oldText: string,
  newText: string,
];

// Cross-checked against the reconstructed 2023-12 N2 listening paper on
// PassJapanese and N-NOTE. The current Vietnamese explanations independently
// contain the same option texts.
export const CONFIRMED_MISSING_OPTION_RESTORATIONS: readonly MissingOptionRestoration[] = [
  ['n2-2023-12', 72, 1, '選択肢1', '話す内容を整理する'],
  ['n2-2023-12', 72, 2, '選択肢2', 'げんこうに内容を足す'],
  ['n2-2023-12', 72, 3, '選択肢3', 'ゆっくり話す練習をする'],
  ['n2-2023-12', 72, 4, '選択肢4', 'げんこうを暗記する'],
  ['n2-2023-12', 73, 1, '選択肢1', 'アイウ'],
  ['n2-2023-12', 73, 2, '選択肢2', 'アイエ'],
  ['n2-2023-12', 73, 3, '選択肢3', 'アウエ'],
  ['n2-2023-12', 73, 4, '選択肢4', 'イウエ'],
  ['n2-2023-12', 74, 1, '選択肢1', '発表のテーマ'],
  ['n2-2023-12', 74, 2, '選択肢2', '発表で取り上げる国'],
  ['n2-2023-12', 74, 3, '選択肢3', 'グループの係り'],
  ['n2-2023-12', 74, 4, '選択肢4', 'しりょう集めのぶんたん'],
  ['n2-2023-12', 75, 1, '選択肢1', 'えんそうの動画を作る'],
  ['n2-2023-12', 75, 2, '選択肢2', 'えんそうの動画を提出する'],
  ['n2-2023-12', 75, 3, '選択肢3', '応募の書類を作る'],
  ['n2-2023-12', 75, 4, '選択肢4', '応募の書類を提出する'],
  ['n2-2023-12', 76, 1, '選択肢1', '置く場所を変える'],
  ['n2-2023-12', 76, 2, '選択肢2', '水を十分にあたえる'],
  ['n2-2023-12', 76, 3, '選択肢3', '弱くなったえだを切る'],
  ['n2-2023-12', 76, 4, '選択肢4', '別のはちにうえる'],
  ['n2-2023-12', 77, 1, '選択肢1', '親しみやすい印象をあたえる点'],
  ['n2-2023-12', 77, 2, '選択肢2', '聞き取りやすい声をしている点'],
  ['n2-2023-12', 77, 3, '選択肢3', '司会者として番組を進めるのが上手な点'],
  ['n2-2023-12', 77, 4, '選択肢4', 'インタビューで相手の話をうまく聞き出す点'],
  ['n2-2023-12', 78, 1, '選択肢1', '会場に駐車場がない点'],
  ['n2-2023-12', 78, 2, '選択肢2', '費用が予算をこえている点'],
  ['n2-2023-12', 78, 3, '選択肢3', '対象者がしぼれていない点'],
  ['n2-2023-12', 78, 4, '選択肢4', '安全面への対策が不十分な点'],
  ['n2-2023-12', 79, 1, '選択肢1', '知り合いの人にゆずる'],
  ['n2-2023-12', 79, 2, '選択肢2', '手を加えて、違う服にする'],
  ['n2-2023-12', 79, 3, '選択肢3', 'あみものの材料として使う'],
  ['n2-2023-12', 79, 4, '選択肢4', 'リサイクルショップに売る'],
  ['n2-2023-12', 80, 1, '選択肢1', '写真のような絵が書けること'],
  ['n2-2023-12', 80, 2, '選択肢2', '初心者でも早く上手になること'],
  ['n2-2023-12', 80, 3, '選択肢3', '費用がかからないこと'],
  ['n2-2023-12', 80, 4, '選択肢4', '消しゴムで消して書き直せること'],
  ['n2-2023-12', 81, 1, '選択肢1', 'アクセサリーを作るため'],
  ['n2-2023-12', 81, 2, '選択肢2', '家具を作るため'],
  ['n2-2023-12', 81, 3, '選択肢3', '貝の研究をするため'],
  ['n2-2023-12', 81, 4, '選択肢4', 'かいがんのごみの問題を知らせるため'],
  ['n2-2023-12', 82, 1, '選択肢1', '音がうるさい'],
  ['n2-2023-12', 82, 2, '選択肢2', 'じゅうでんに時間がかかる'],
  ['n2-2023-12', 82, 3, '選択肢3', '吸い込むパワーが弱い'],
  ['n2-2023-12', 82, 4, '選択肢4', '対応できる段差が低い'],
] as const;

interface ResolvedRestoration {
  restoration: MissingOptionRestoration;
  examId: string;
  questionId: string;
  groupId: string;
  sourceVersion: number;
  state: 'pending' | 'applied';
}

const restorationId = (item: MissingOptionRestoration) =>
  item[0] + ':Q' + item[1] + ':option' + item[2];

function countText(value: unknown, needle: string): number {
  if (typeof value === 'string') return value.split(needle).length - 1;
  if (Array.isArray(value)) return value.reduce((sum, item) => sum + countText(item, needle), 0);
  if (value && typeof value === 'object') {
    return Object.values(value).reduce((sum, item) => sum + countText(item, needle), 0);
  }
  return 0;
}

function replaceText(value: unknown, oldText: string, newText: string): unknown {
  if (typeof value === 'string') return value.split(oldText).join(newText);
  if (Array.isArray(value)) return value.map((item) => replaceText(item, oldText, newText));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, replaceText(item, oldText, newText)]),
    );
  }
  return value;
}

async function resolveRestorations(
  sql: DbClientInstance['rawClient'],
): Promise<ResolvedRestoration[]> {
  const resolved: ResolvedRestoration[] = [];
  for (const restoration of CONFIRMED_MISSING_OPTION_RESTORATIONS) {
    const [slug, questionNumber, optionIndex, oldText, newText] = restoration;
    const rows = await sql`
      select e.id as exam_id, q.id as question_id, q.group_id,
             qv.version as question_version, qv.status as question_status,
             gv.version as group_version, gv.status as group_status,
             ao.content
      from exams e
      join exam_items ei on ei.exam_id=e.id and ei.order_index=${questionNumber - 1}
      join questions q on q.id=ei.question_id and q.deleted_at is null
      join lateral (
        select * from question_versions v where v.question_id=q.id order by v.version desc limit 1
      ) qv on true
      join lateral (
        select * from question_group_versions v where v.group_id=q.group_id order by v.version desc limit 1
      ) gv on true
      join answer_options ao on ao.question_id=q.id and ao.question_version=qv.version
        and ao.order_index=${optionIndex}
      where e.slug=${slug} and e.deleted_at is null
    `;
    const row = rows[0];
    if (!row) throw new Error(restorationId(restoration) + ': target not found');
    if (row.question_status !== 'approved' || row.group_status !== 'approved') {
      throw new Error(restorationId(restoration) + ': latest content is not approved');
    }
    if (row.question_version !== row.group_version) {
      throw new Error(restorationId(restoration) + ': question/group versions are not aligned');
    }
    const oldCount = countText(row.content, oldText);
    const newCount = countText(row.content, newText);
    let state: 'pending' | 'applied';
    if (oldCount === 1 && newCount === 0) state = 'pending';
    else if (oldCount === 0 && newCount === 1) state = 'applied';
    else {
      throw new Error(
        restorationId(restoration) +
          ': expected one old or new occurrence, found old=' +
          oldCount +
          ', new=' +
          newCount,
      );
    }
    resolved.push({
      restoration,
      examId: row.exam_id,
      questionId: row.question_id,
      groupId: row.group_id,
      sourceVersion: row.question_version,
      state,
    });
  }
  return resolved;
}

async function requireBackup(): Promise<string> {
  const backupPath = process.env.MISSING_CONTENT_BACKUP;
  if (!backupPath) throw new Error('MISSING_CONTENT_BACKUP is required');
  const info = await stat(backupPath);
  if (!info.isFile() || info.size < 1024 * 1024) {
    throw new Error('Backup is missing or unexpectedly small: ' + backupPath);
  }
  return backupPath;
}

async function versionContent(
  sql: DbClientInstance['rawClient'],
  resolved: ResolvedRestoration[],
): Promise<number> {
  const [editor] = await sql`select id from users where role='editor' and blocked_at is null`;
  const [reviewer] = await sql`select id from users where role='reviewer' and blocked_at is null`;
  const [admin] = await sql`select id from users where role='admin' and blocked_at is null`;
  if (!editor || !reviewer || !admin || editor.id === reviewer.id) {
    throw new Error('Distinct active editor, reviewer, and admin users are required');
  }

  const byGroup = new Map<string, ResolvedRestoration[]>();
  for (const item of resolved.filter((candidate) => candidate.state === 'pending')) {
    const group = byGroup.get(item.groupId) ?? [];
    group.push(item);
    byGroup.set(item.groupId, group);
  }

  await sql.begin(async (tx: DbClientInstance['rawClient']) => {
    for (const [groupId, restorations] of byGroup) {
      const sourceVersion = restorations[0]!.sourceVersion;
      const nextVersion = sourceVersion + 1;
      const [latest] = await tx`
        select version,status from question_group_versions
        where group_id=${groupId} order by version desc limit 1 for update
      `;
      if (latest?.version !== sourceVersion || latest?.status !== 'approved') {
        throw new Error('Group changed after preflight: ' + groupId);
      }
      await tx`
        insert into question_group_versions
          (group_id,version,passage,audio_sha256,status,created_at)
        select group_id,${nextVersion},passage,audio_sha256,'approved',now()
        from question_group_versions where group_id=${groupId} and version=${sourceVersion}
      `;

      const questions = await tx`
        select id from questions where group_id=${groupId} and deleted_at is null
      `;
      for (const question of questions) {
        const [version] = await tx`
          select stem,explanation from question_versions
          where question_id=${question.id} and version=${sourceVersion}
        `;
        if (!version) throw new Error('Question source version missing: ' + question.id);
        await tx`
          insert into question_versions
            (question_id,version,stem,explanation,status,created_at)
          values (
            ${question.id},${nextVersion},${JSON.stringify(version.stem)}::jsonb,
            ${version.explanation === null ? null : JSON.stringify(version.explanation)}::jsonb,
            'approved',now()
          )
        `;

        const options = await tx`
          select order_index,content from answer_options
          where question_id=${question.id} and question_version=${sourceVersion}
          order by order_index
        `;
        for (const option of options) {
          let content = option.content;
          for (const item of restorations.filter(
            (candidate) =>
              candidate.questionId === question.id &&
              candidate.restoration[2] === option.order_index,
          )) {
            content = replaceText(content, item.restoration[3], item.restoration[4]);
          }
          await tx`
            insert into answer_options (question_id,question_version,order_index,content)
            values (
              ${question.id},${nextVersion},${option.order_index},
              ${JSON.stringify(content)}::jsonb
            )
          `;
        }
        await tx`
          insert into correct_answers
            (question_id,question_version,correct_option,explanation_notes)
          select question_id,${nextVersion},correct_option,explanation_notes
          from correct_answers where question_id=${question.id} and question_version=${sourceVersion}
        `;
      }

      const details = restorations.map((item) => ({
        examSlug: item.restoration[0],
        questionNumber: item.restoration[1],
        optionIndex: item.restoration[2],
        from: item.restoration[3],
        to: item.restoration[4],
      }));
      await tx`
        insert into content_reviews
          (id,target_type,target_id,target_version,reviewer_id,last_editor_id,status,comments,reviewed_at)
        values (
          ${generateUuidV7()},'group_version',${groupId},${nextVersion},${reviewer.id},${editor.id},
          'approved','Owner-authorized restoration of confirmed missing printed options',now()
        )
      `;
      await tx`
        insert into operator_actions (id,operator_id,action,target_resource,details,timestamp)
        values (
          ${generateUuidV7()},${admin.id},'content.options.restore',
          ${'question_group:' + groupId},
          ${JSON.stringify({
            source: 'owner-authorized-maintenance',
            references: ['PassJapanese 2023-12 N2 listening', 'N-NOTE N2 exam 4'],
            version: nextVersion,
            restorations: details,
          })}::jsonb,now()
        )
      `;
    }
  });
  return byGroup.size;
}

async function examNeedsRepublish(
  sql: DbClientInstance['rawClient'],
  examId: string,
): Promise<boolean> {
  const [row] = await sql`
    select exists (
      select 1
      from exam_items ei
      join questions q on q.id=ei.question_id and q.deleted_at is null
      join lateral (
        select created_at from question_group_versions gv
        where gv.group_id=q.group_id order by gv.version desc limit 1
      ) latest_group on true
      join exams e on e.id=ei.exam_id
      join exam_versions ev on ev.exam_id=e.id and ev.version=e.published_version
      where ei.exam_id=${examId} and latest_group.created_at > ev.published_at
    ) as needs_republish
  `;
  return row?.needs_republish === true;
}

export async function runMissingOptionRestoration(argv = process.argv.slice(2)): Promise<void> {
  const apply = argv.includes('--apply');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const dbClient = app.get<DbClientInstance>(DB_CLIENT);
    const examService = app.get(ExamService);
    let resolved = await resolveRestorations(dbClient.rawClient);
    Logger.log(
      JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        restorations: resolved.length,
        affectedQuestions: new Set(resolved.map((item) => item.questionId)).size,
        affectedGroups: new Set(resolved.map((item) => item.groupId)).size,
        pending: resolved.filter((item) => item.state === 'pending').length,
      }),
      'MissingOptionRestoration',
    );
    if (!apply) return;

    const backupPath = await requireBackup();
    const groupsVersioned = await versionContent(dbClient.rawClient, resolved);
    resolved = await resolveRestorations(dbClient.rawClient);
    if (resolved.some((item) => item.state !== 'applied')) {
      throw new Error('Post-version restoration verification failed');
    }
    const [admin] =
      await dbClient.rawClient`select id from users where role='admin' and blocked_at is null`;
    if (!admin) throw new Error('Active admin user is required');
    const examIds = Array.from(new Set(resolved.map((item) => item.examId)));
    let examsPublished = 0;
    for (const examId of examIds) {
      if (await examNeedsRepublish(dbClient.rawClient, examId)) {
        await examService.publishExam(examId, admin.id);
        examsPublished += 1;
      }
    }
    for (const examId of examIds) {
      if (await examNeedsRepublish(dbClient.rawClient, examId)) {
        throw new Error('Exam still needs republish: ' + examId);
      }
    }
    Logger.log(
      JSON.stringify({
        groupsVersioned,
        examsPublished,
        restorationsVerified: resolved.length,
        backupPath,
      }),
      'MissingOptionRestoration',
    );
  } finally {
    await app.close();
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  runMissingOptionRestoration().catch((error: unknown) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    Logger.error(normalized.message, normalized.stack, 'MissingOptionRestoration');
    process.exitCode = 1;
  });
}
