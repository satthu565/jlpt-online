import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { DB_CLIENT } from '../common/database/database.module.js';
import { generateUuidV7 } from '../common/utils/uuid.js';
import type { DbClientInstance } from '../db/client.js';
import { ExamService } from '../modules/exam/exam.service.js';
import { N1_2024_07_LISTENING_ENTRIES, type ListeningEntry } from './n1-2024-07-listening-content.js';

export const TARGET_EXAM_SLUG = 'n1-2024-07';

type Sql = DbClientInstance['rawClient'];
type JsonRecord = Record<string, unknown>;

interface Resolved {
  entry: ListeningEntry;
  questionId: string;
  groupId: string;
  version: number;
  key: number;
  options: string[];
  explanation: JsonRecord;
  state: 'pending' | 'applied';
}

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function flatten(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(flatten).join('');
  if (value !== null && typeof value === 'object') {
    const record = value as JsonRecord;
    if (record.t === 'br') return '\n';
    if (typeof record.text === 'string') return record.text;
    if ('children' in record) return flatten(record.children);
  }
  return '';
}

export function transcriptNodes(lines: readonly string[]): JsonRecord[] {
  return lines.flatMap((line, index) =>
    index === 0 ? [{ t: 'text', text: line }] : [{ t: 'br' }, { t: 'text', text: line }],
  );
}

export function buildListeningExplanation(
  existing: JsonRecord,
  entry: ListeningEntry,
  options: readonly string[],
  key: number,
  nextVersion: number,
): JsonRecord {
  const translationBlock = {
    type: 'paragraph',
    content: [{ t: 'text', text: `• Dịch nghĩa: ${entry.translation}` }],
  };
  let transcript = existing.transcript;
  if (entry.transcript) transcript = transcriptNodes(entry.transcript);
  if (entry.transcriptReplace) {
    const [from, to] = entry.transcriptReplace;
    const text = flatten(transcript);
    if (!text.includes(from)) throw new Error(`Q${entry.number}: transcript lacks "${from}"`);
    transcript = transcriptNodes(text.replace(from, to).split('\n'));
  }
  const scriptMarkdown = `**Script bài nghe**:\n${flatten(transcript)}`;

  if (!entry.reason || !entry.wrong) {
    // Explanation already written; only add the translation line.
    const blocks = Array.isArray(existing.blocks) ? (existing.blocks as unknown[]) : [];
    return {
      ...existing,
      contentVersion: nextVersion,
      humanReviewed: true,
      translation: [{ t: 'text', text: entry.translation }],
      translationVi: entry.translation,
      blocks: [translationBlock, ...blocks],
    };
  }

  const correctText = options[key - 1] ?? '';
  const wrongLines = [1, 2, 3, 4]
    .filter((option) => option !== key && options[option - 1] !== undefined)
    .map((option) => `- [${option}] ${options[option - 1]}: ${entry.wrong![option]!}`);
  const correct = `Đáp án đúng: [${key}] ${correctText}\n${entry.reason}`;
  const wrongReasons: Record<string, unknown> = {};
  for (const option of [1, 2, 3, 4]) {
    if (option === key || entry.wrong[option] === undefined) continue;
    wrongReasons[String(option)] = [{ t: 'text', text: entry.wrong[option] }];
  }
  const blocks = [
    translationBlock,
    {
      type: 'paragraph',
      content: [
        { t: 'text', text: `• Đáp án đúng: [${key}] ${correctText}` },
        { t: 'br' },
        { t: 'text', text: entry.reason },
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
  return {
    ...existing,
    contentVersion: nextVersion,
    humanReviewed: true,
    transcript,
    correctReason: [{ t: 'text', text: correct }],
    wrongReasonsByOption: wrongReasons,
    translation: [{ t: 'text', text: entry.translation }],
    translationVi: entry.translation,
    explanationMarkdown: [
      `**Lý do đúng**:\n${correct}`,
      `**Phân tích các phương án còn lại**:\n${wrongLines.join('\n')}`,
      scriptMarkdown,
    ].join('\n\n'),
    blocks,
  };
}

async function resolveAll(sql: Sql): Promise<Resolved[]> {
  const resolved: Resolved[] = [];
  for (const entry of N1_2024_07_LISTENING_ENTRIES) {
    const rows = await sql`
      select q.id as question_id, q.group_id, qv.version as qv, qv.status as q_status,
             gv.version as gv, gv.status as g_status, ca.correct_option as key
      from exams e
      join exam_items ei on ei.exam_id=e.id and ei.order_index=${entry.number - 1}
      join questions q on q.id=ei.question_id and q.deleted_at is null
      join lateral (select * from question_versions v where v.question_id=q.id order by v.version desc limit 1) qv on true
      join lateral (select * from question_group_versions v where v.group_id=q.group_id order by v.version desc limit 1) gv on true
      join correct_answers ca on ca.question_id=q.id and ca.question_version=qv.version
      where e.slug=${TARGET_EXAM_SLUG} and e.deleted_at is null
    `;
    const row = rows[0];
    if (!row) throw new Error(`Q${entry.number}: not found`);
    if (row.q_status !== 'approved' || row.g_status !== 'approved') {
      throw new Error(`Q${entry.number}: latest version is not approved`);
    }
    if (row.qv !== row.gv) throw new Error(`Q${entry.number}: question/group versions differ`);
    const optionRows = await sql`
      select content from answer_options
      where question_id=${row.question_id} and question_version=${row.qv} order by order_index
    `;
    const [expl] = await sql`
      select content from explanation_versions
      where question_id=${row.question_id} and locale='vi' order by version desc limit 1
    `;
    const explanation = asRecord(expl?.content);
    const done =
      typeof explanation.translationVi === 'string' &&
      explanation.translationVi === entry.translation &&
      explanation.humanReviewed === true;
    resolved.push({
      entry,
      questionId: row.question_id as string,
      groupId: row.group_id as string,
      version: row.qv as number,
      key: row.key as number,
      options: optionRows.map((option: { content: unknown }) => flatten(option.content)),
      explanation,
      state: done ? 'applied' : 'pending',
    });
  }
  return resolved;
}

async function requireBackup(): Promise<string> {
  const backupPath = process.env.N1_2024_07_BACKUP;
  if (!backupPath) throw new Error('N1_2024_07_BACKUP is required to apply');
  const info = await stat(backupPath);
  if (!info.isFile() || info.size < 1024 * 1024) throw new Error('Backup missing or too small');
  return backupPath;
}

async function applyPending(sql: Sql, pending: Resolved[], dryRun: boolean): Promise<void> {
  const [editor] = await sql`select id from users where role='editor' and blocked_at is null`;
  const [reviewer] = await sql`select id from users where role='reviewer' and blocked_at is null`;
  const [admin] = await sql`select id from users where role='admin' and blocked_at is null`;
  if (!editor || !reviewer || !admin || editor.id === reviewer.id) {
    throw new Error('Distinct active editor, reviewer, and admin users are required');
  }
  const byGroup = new Map<string, Resolved[]>();
  for (const item of pending) byGroup.set(item.groupId, [...(byGroup.get(item.groupId) ?? []), item]);

  await sql.begin(async (tx: Sql) => {
    for (const [groupId, items] of byGroup) {
      const sourceVersion = items[0]!.version;
      const nextVersion = sourceVersion + 1;
      const [latest] = await tx`
        select version, status from question_group_versions
        where group_id=${groupId} order by version desc limit 1 for update
      `;
      if (latest?.version !== sourceVersion || latest?.status !== 'approved') {
        throw new Error('Group version changed after preflight: ' + groupId);
      }
      await tx`
        insert into question_group_versions (group_id,version,passage,audio_sha256,status,created_at)
        select group_id,${nextVersion},passage,audio_sha256,'approved',now()
        from question_group_versions where group_id=${groupId} and version=${sourceVersion}
      `;
      const questions = await tx`
        select id from questions where group_id=${groupId} and deleted_at is null order by id
      `;
      for (const question of questions) {
        const target = items.find((item) => item.questionId === question.id);
        const [qVer] = await tx`
          select stem, explanation from question_versions
          where question_id=${question.id} and version=${sourceVersion}
        `;
        if (!qVer) throw new Error('Source question version missing: ' + question.id);
        let questionExplanation = qVer.explanation;
        let content: JsonRecord | undefined;
        if (target) {
          content = buildListeningExplanation(
            target.explanation,
            target.entry,
            target.options,
            target.key,
            nextVersion,
          );
          questionExplanation = { locale: 'vi', blocks: content.blocks };
        }
        await tx`
          insert into question_versions (question_id,version,stem,explanation,status,created_at)
          values (
            ${question.id},${nextVersion},${JSON.stringify(qVer.stem)}::jsonb,
            ${questionExplanation ? JSON.stringify(questionExplanation) : null}::jsonb,'approved',now()
          )
        `;
        await tx`
          insert into answer_options (question_id,question_version,order_index,content)
          select question_id,${nextVersion},order_index,content from answer_options
          where question_id=${question.id} and question_version=${sourceVersion}
        `;
        await tx`
          insert into correct_answers (question_id,question_version,correct_option,explanation_notes)
          select question_id,${nextVersion},correct_option,explanation_notes from correct_answers
          where question_id=${question.id} and question_version=${sourceVersion}
        `;
        const explRows = await tx`
          select distinct on (locale) content, locale, author_id, ai_generated
          from explanation_versions where question_id=${question.id}
          order by locale, version desc
        `;
        for (const expl of explRows) {
          const isTarget = Boolean(target && content && expl.locale === 'vi');
          const nextContent = isTarget ? content : { ...asRecord(expl.content), contentVersion: nextVersion };
          await tx`
            insert into explanation_versions
              (id,question_id,version,content,locale,author_id,ai_generated,status,created_at)
            values (
              ${generateUuidV7()},${question.id},${nextVersion},${JSON.stringify(nextContent)}::jsonb,
              ${expl.locale},${isTarget ? editor.id : expl.author_id},
              ${isTarget ? false : expl.ai_generated},'approved',now()
            )
          `;
        }
      }
      await tx`
        insert into content_reviews
          (id,target_type,target_id,target_version,reviewer_id,last_editor_id,status,comments,reviewed_at)
        values (
          ${generateUuidV7()},'group_version',${groupId},${nextVersion},${reviewer.id},${editor.id},'approved',
          ${'N1 7/2024 listening explanation/transcript update: ' + items.map((item) => 'Q' + item.entry.number).join(', ')},now()
        )
      `;
    }
    await tx`
      insert into operator_actions (id,operator_id,action,target_resource,details,timestamp)
      values (
        ${generateUuidV7()},${admin.id},'content.listening.explanations',${'exam:' + TARGET_EXAM_SLUG},
        ${JSON.stringify({ questions: pending.map((item) => item.entry.number) })}::jsonb,now()
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

export async function runListening(argv = process.argv.slice(2)): Promise<void> {
  const apply = argv.includes('--apply');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const sql = app.get<DbClientInstance>(DB_CLIENT).rawClient;
    const examService = app.get(ExamService);
    let resolved = await resolveAll(sql);
    const pending = resolved.filter((item) => item.state === 'pending');
    Logger.log(
      JSON.stringify({ mode: apply ? 'apply' : 'dry-run', total: resolved.length, pending: pending.length }),
      'N1202407Listening',
    );
    if (pending.length === 0) return;
    if (!apply) {
      try {
        await applyPending(sql, pending, true);
      } catch (error) {
        if (!(error instanceof DryRunRollback)) throw error;
      }
      Logger.log('dry-run: transaction executed and rolled back', 'N1202407Listening');
      return;
    }
    const backupPath = await requireBackup();
    await applyPending(sql, pending, false);
    const [exam] = await sql`select id from exams where slug=${TARGET_EXAM_SLUG}`;
    const [admin] = await sql`select id from users where role='admin' and blocked_at is null`;
    if (!exam || !admin) throw new Error('Exam or admin user missing');
    await examService.publishExam(exam.id, admin.id);
    const keysBefore = new Map(resolved.map((item) => [item.entry.number, item.key]));
    resolved = await resolveAll(sql);
    for (const item of resolved) {
      if (item.state !== 'applied') throw new Error(`Q${item.entry.number}: verification failed`);
      if (item.key !== keysBefore.get(item.entry.number)) {
        throw new Error(`Q${item.entry.number}: key changed unexpectedly`);
      }
    }
    Logger.log(JSON.stringify({ applied: true, updated: pending.length, backupPath }), 'N1202407Listening');
  } finally {
    await app.close();
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  runListening().catch((error: unknown) => {
    Logger.error(error instanceof Error ? error.message : String(error), undefined, 'N1202407Listening');
    process.exitCode = 1;
  });
}
