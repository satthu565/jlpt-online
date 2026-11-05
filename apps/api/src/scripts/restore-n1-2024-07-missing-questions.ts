import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { DB_CLIENT } from '../common/database/database.module.js';
import { generateUuidV7 } from '../common/utils/uuid.js';
import type { DbClientInstance } from '../db/client.js';
import { ExamService } from '../modules/exam/exam.service.js';
import { N1_2024_07_MISSING_GROUPS, type MissingGroup } from './n1-2024-07-missing-content.js';

export const TARGET_EXAM_SLUG = 'n1-2024-07';
export const BEFORE_TOTAL = 81;
export const AFTER_TOTAL = 96;

/** Final 1-based question number (= source paper number) of every restored question, in order. */
export function restoredQuestionNumbers(groups: readonly MissingGroup[] = N1_2024_07_MISSING_GROUPS) {
  return groups.flatMap((group) => group.questions.map((question) => question.number));
}

/**
 * Maps a pre-restoration 0-based order index to the post-restoration one.
 * Source Q25, Q41-44 and Q57-66 were missing, so later items shift by 1, 5 and 15.
 */
export function shiftedOrderIndex(oldIndex: number): number {
  if (oldIndex < 24) return oldIndex;
  if (oldIndex < 39) return oldIndex + 1;
  if (oldIndex < 51) return oldIndex + 5;
  return oldIndex + 15;
}

type Sql = DbClientInstance['rawClient'];

interface Target {
  examId: string;
  sectionId: string;
  sourceId: string | null;
  licenseId: string | null;
  jobId: string;
  total: number;
  state: 'pending' | 'applied';
}

function explanationBlocks(
  question: MissingGroup['questions'][number],
  optionTexts: readonly string[],
) {
  const correctText = optionTexts[question.correctOption - 1]!;
  const wrongLines = [1, 2, 3, 4]
    .filter((option) => option !== question.correctOption)
    .map((option) => `- [${option}] ${question.wrong[option]!}`);
  return [
    { type: 'paragraph', content: [{ t: 'text', text: `• Dịch nghĩa: ${question.translation}` }] },
    {
      type: 'paragraph',
      content: [
        { t: 'text', text: `• Đáp án đúng: [${question.correctOption}] ${correctText}` },
        { t: 'br' },
        { t: 'text', text: question.reason },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { t: 'text', text: '• Phân tích các phương án còn lại:' },
        ...wrongLines.flatMap((line) => [{ t: 'br' }, { t: 'text', text: line }]),
      ],
    },
  ];
}

function plainText(nodes: unknown): string {
  if (Array.isArray(nodes)) return nodes.map(plainText).join('');
  if (nodes && typeof nodes === 'object') {
    const record = nodes as Record<string, unknown>;
    if (typeof record.text === 'string') return record.text;
    if ('children' in record) return plainText(record.children);
  }
  return '';
}

async function resolveTarget(sql: Sql): Promise<Target> {
  const [exam] = await sql`
    select e.id, e.total_questions from exams e where e.slug=${TARGET_EXAM_SLUG} and e.deleted_at is null
  `;
  if (!exam) throw new Error('Target exam not found');
  const [anchor] = await sql`
    select ei.section_id, qg.source_id, qg.license_id, ia.job_id
    from exam_items ei
    join questions q on q.id=ei.question_id
    join question_groups qg on qg.id=q.group_id
    join lateral (
      select job_id from import_artifacts
      where artifact_type='group' and storage_key=q.group_id::text order by created_at limit 1
    ) ia on true
    where ei.exam_id=${exam.id} and ei.order_index=23
  `;
  if (!anchor) throw new Error('Anchor question (Q24) not found');
  let state: Target['state'];
  if (exam.total_questions === BEFORE_TOTAL) state = 'pending';
  else if (exam.total_questions === AFTER_TOTAL) state = 'applied';
  else throw new Error(`Unexpected total_questions=${exam.total_questions}`);
  return {
    examId: exam.id as string,
    sectionId: anchor.section_id as string,
    sourceId: anchor.source_id as string | null,
    licenseId: anchor.license_id as string | null,
    jobId: anchor.job_id as string,
    total: exam.total_questions as number,
    state,
  };
}

async function verifyApplied(sql: Sql, target: Target): Promise<void> {
  const rows = await sql`
    select ei.order_index+1 as n, ca.correct_option as k
    from exam_items ei
    join questions q on q.id=ei.question_id and q.deleted_at is null
    join lateral (
      select * from question_versions v where v.question_id=q.id order by v.version desc limit 1
    ) qv on true
    join correct_answers ca on ca.question_id=q.id and ca.question_version=qv.version
    where ei.exam_id=${target.examId}
    order by ei.order_index
  `;
  if (rows.length !== AFTER_TOTAL) throw new Error(`Expected ${AFTER_TOTAL} items, found ${rows.length}`);
  rows.forEach((row: { n: number }, index: number) => {
    if (row.n !== index + 1) throw new Error('Order indexes are not contiguous');
  });
  for (const group of N1_2024_07_MISSING_GROUPS) {
    for (const question of group.questions) {
      const live = rows[question.number - 1] as { k: number };
      if (live.k !== question.correctOption) {
        throw new Error(`Q${question.number}: key ${live.k} != ${question.correctOption}`);
      }
    }
  }
  const [published] = await sql`
    select e.published_version, eak.keys
    from exams e join exam_answer_keys eak on eak.exam_id=e.id and eak.version=e.published_version
    where e.id=${target.examId}
  `;
  const keys = published?.keys as number[] | undefined;
  if (!keys || keys.length !== AFTER_TOTAL) throw new Error('Published answer keys are not restored');
  for (const group of N1_2024_07_MISSING_GROUPS) {
    for (const question of group.questions) {
      if (keys[question.number - 1] !== question.correctOption) {
        throw new Error(`Published key mismatch at Q${question.number}`);
      }
    }
  }
}

async function requireBackup(): Promise<string> {
  const backupPath = process.env.N1_2024_07_BACKUP;
  if (!backupPath) throw new Error('N1_2024_07_BACKUP is required to apply');
  const info = await stat(backupPath);
  if (!info.isFile() || info.size < 1024 * 1024) throw new Error('Backup missing or too small');
  return backupPath;
}

async function insertRestored(sql: Sql, target: Target, dryRun: boolean): Promise<void> {
  const [editor] = await sql`select id from users where role='editor' and blocked_at is null`;
  const [reviewer] = await sql`select id from users where role='reviewer' and blocked_at is null`;
  const [admin] = await sql`select id from users where role='admin' and blocked_at is null`;
  if (!editor || !reviewer || !admin || editor.id === reviewer.id) {
    throw new Error('Distinct active editor, reviewer, and admin users are required');
  }
  await sql.begin(async (tx: Sql) => {
    const [exam] = await tx`select total_questions from exams where id=${target.examId} for update`;
    if (exam?.total_questions !== BEFORE_TOTAL) throw new Error('Exam changed after preflight');

    await tx`
      update exam_items set order_index = case
        when order_index < 24 then order_index
        when order_index < 39 then order_index + 1
        when order_index < 51 then order_index + 5
        else order_index + 15 end
      where exam_id=${target.examId}
    `;

    for (const group of N1_2024_07_MISSING_GROUPS) {
      const groupId = generateUuidV7();
      await tx`
        insert into question_groups (id,source_id,license_id,level,section_code,title,created_at)
        values (${groupId},${target.sourceId},${target.licenseId},'N1','language_reading',${group.title},now())
      `;
      await tx`
        insert into question_group_versions (group_id,version,passage,audio_sha256,status,created_at)
        values (${groupId},1,${JSON.stringify(group.passage)}::jsonb,null,'approved',now())
      `;
      await tx`
        insert into import_artifacts (id,job_id,artifact_type,storage_key,created_at)
        values (${generateUuidV7()},${target.jobId},'group',${groupId},now())
      `;
      for (const question of group.questions) {
        const questionId = generateUuidV7();
        const optionTexts = question.options.map((option) => plainText(option));
        const blocks = explanationBlocks(question, optionTexts);
        await tx`
          insert into questions (id,group_id,level,skill,mondai_type,origin,created_at)
          values (${questionId},${groupId},'N1',${group.skill},${group.mondaiType},'official_past_exam',now())
        `;
        await tx`
          insert into question_versions (question_id,version,stem,explanation,status,created_at)
          values (
            ${questionId},1,${JSON.stringify(question.stem)}::jsonb,
            ${JSON.stringify({ locale: 'vi', blocks })}::jsonb,'approved',now()
          )
        `;
        for (let index = 0; index < question.options.length; index += 1) {
          await tx`
            insert into answer_options (question_id,question_version,order_index,content)
            values (${questionId},1,${index + 1},${JSON.stringify(question.options[index])}::jsonb)
          `;
        }
        await tx`
          insert into correct_answers (question_id,question_version,correct_option,explanation_notes)
          values (${questionId},1,${question.correctOption},null)
        `;
        await tx`
          insert into explanation_versions
            (id,question_id,version,content,locale,author_id,ai_generated,status,created_at)
          values (
            ${generateUuidV7()},${questionId},1,
            ${JSON.stringify({
              questionId,
              contentVersion: 1,
              language: 'vi',
              origin: 'official_past_exam',
              humanReviewed: true,
              correctReason: [{ t: 'text', text: question.reason }],
              translation: [{ t: 'text', text: question.translation }],
              blocks,
              explanationMarkdown: question.reason,
              translationVi: question.translation,
            })}::jsonb,
            'vi',${editor.id},false,'approved',now()
          )
        `;
        await tx`
          insert into import_artifacts (id,job_id,artifact_type,storage_key,created_at)
          values (${generateUuidV7()},${target.jobId},'question',${questionId},now())
        `;
        await tx`
          insert into exam_items (id,exam_id,section_id,question_id,order_index)
          values (${generateUuidV7()},${target.examId},${target.sectionId},${questionId},${question.number - 1})
        `;
      }
      await tx`
        insert into content_reviews
          (id,target_type,target_id,target_version,reviewer_id,last_editor_id,status,comments,reviewed_at)
        values (
          ${generateUuidV7()},'group_version',${groupId},1,${reviewer.id},${editor.id},'approved',
          ${'Restored from full N1 7/2024 paper: ' + group.title},now()
        )
      `;
    }

    await tx`update exams set total_questions=${AFTER_TOTAL},updated_at=now() where id=${target.examId}`;
    await tx`
      insert into operator_actions (id,operator_id,action,target_resource,details,timestamp)
      values (
        ${generateUuidV7()},${admin.id},'content.missing.restore',${'exam:' + target.examId},
        ${JSON.stringify({
          source: 'owner-supplied-full-pdf',
          file: 'JLPT-N1-7-2024-full.pdf',
          examSlug: TARGET_EXAM_SLUG,
          restoredQuestions: restoredQuestionNumbers(),
        })}::jsonb,now()
      )
    `;
    if (dryRun) throw new DryRunRollback();
  });
}

class DryRunRollback extends Error {
  constructor() {
    super('dry-run rollback');
  }
}

export async function runRestore(argv = process.argv.slice(2)): Promise<void> {
  const apply = argv.includes('--apply');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const dbClient = app.get<DbClientInstance>(DB_CLIENT);
    const sql = dbClient.rawClient;
    const examService = app.get(ExamService);
    const target = await resolveTarget(sql);
    Logger.log(
      JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        state: target.state,
        total: target.total,
        restored: restoredQuestionNumbers(),
      }),
      'N1202407Restore',
    );
    if (target.state === 'applied') {
      await verifyApplied(sql, target);
      Logger.log('already applied and verified', 'N1202407Restore');
      return;
    }
    if (!apply) {
      try {
        await insertRestored(sql, target, true);
      } catch (error) {
        if (!(error instanceof DryRunRollback)) throw error;
      }
      Logger.log('dry-run: transaction executed and rolled back', 'N1202407Restore');
      return;
    }
    const backupPath = await requireBackup();
    await insertRestored(sql, target, false);
    const [admin] = await sql`select id from users where role='admin' and blocked_at is null`;
    if (!admin) throw new Error('Active admin user is required');
    await examService.publishExam(target.examId, admin.id);
    await verifyApplied(sql, { ...target, state: 'applied' });
    Logger.log(JSON.stringify({ applied: true, total: AFTER_TOTAL, backupPath }), 'N1202407Restore');
  } finally {
    await app.close();
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  runRestore().catch((error: unknown) => {
    Logger.error(error instanceof Error ? error.message : String(error), undefined, 'N1202407Restore');
    process.exitCode = 1;
  });
}
