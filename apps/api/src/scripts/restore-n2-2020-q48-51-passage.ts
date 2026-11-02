import crypto from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { DB_CLIENT } from '../common/database/database.module.js';
import { generateUuidV7 } from '../common/utils/uuid.js';
import type { DbClientInstance } from '../db/client.js';
import { ExamService } from '../modules/exam/exam.service.js';

export const TARGET_EXAM_SLUG = 'n2-2020-12';
export const TARGET_QUESTION_NUMBERS = [48, 49, 50, 51] as const;
export const EXPECTED_ANSWERS = [3, 1, 3, 4] as const;
export const EXPECTED_PDF_SHA256 =
  '7d1a70bf835648e4c7ea51b538bae86397bdbbc205032424c037dbebd61ac8e5';

export const OLD_PASSAGE = [
  {
    type: 'paragraph',
    content: [
      {
        t: 'text',
        text: '（※ 原文の問題用紙において「問題9 文章(暫缺)」となっており、本文が収録されていません。以下の選択肢は問題用紙に掲載された選択肢原文です。）',
      },
    ],
  },
] as const;

export const NEW_PASSAGE = [
  {
    type: 'paragraph',
    content: [{ t: 'text', text: '以下は留学生がスピーチのために書いた文章である。' }],
  },
  {
    type: 'paragraph',
    content: [{ t: 'text', text: 'ロボット・セラピー' }],
  },
  {
    type: 'paragraph',
    content: [{ t: 'text', text: 'プリュースタージョン' }],
  },
  {
    type: 'paragraph',
    content: [
      {
        t: 'text',
        text: '私はロボット工学を専攻しています。将来は医療分野でのロボット活用に関わる仕事をするのが夢です。今は「ロボット・セラピー」というものに興味があります。最近、介護の現場で注目されているものですが、みなさん、',
      },
      { t: 'blank', label: '48' },
      { t: 'text', text: '。' },
    ],
  },
  {
    type: 'paragraph',
    content: [
      {
        t: 'text',
        text: '「ロボット・セラピー」なら聞いたことのある人も多いかもしれません。動物と触れ合うことで穏やかな気持ちになり、ストレスが減るなどの医療効果で知られています。しかし、実際に介護施設などで動物を飼おうとすると、アレルギーや世話の問題など、難しい面もあります。',
      },
      { t: 'blank', label: '49' },
      {
        t: 'text',
        text: '、アニマル・セラピーに替わるものとして、最近、ロボット・セラピーが注目されるようになりました。',
      },
    ],
  },
  {
    type: 'paragraph',
    content: [
      {
        t: 'text',
        text: 'ロボット・セラピーのロボットには動物型、赤ちゃん型などがあり、それらに共通するのはコミュニケーションが可能だということです。どの型のロボットも、感覚機能を持っており、触れ合う人の様子や周囲の状況を判断して、様々な感情を表現することができます。例えば、だっこされたり、なでられたりすると、可愛い声を出して喜んだり、気持ち良さそうな表情をしたりします。こういったロボットとの触れ合いによって、精神的安定やコミュニケーション能力の改善などの効果が',
      },
      { t: 'blank', label: '50' },
      { t: 'text', text: '。' },
    ],
  },
  {
    type: 'paragraph',
    content: [
      {
        t: 'text',
        text: '私が今学んでいるのはロボット工学の基礎です。将来こういったロボットの研究、開発に参加するために、これからも勉強を続けます。そして、医療分野に',
      },
      { t: 'blank', label: '51' },
      { t: 'text', text: '。' },
    ],
  },
] as const;

type RestorationState = 'pending' | 'applied' | 'invalid';

interface TargetContent {
  examId: string;
  groupId: string;
  sourceVersion: number;
  questionIds: string[];
  state: Exclude<RestorationState, 'invalid'>;
}

export function getRestorationState(passage: unknown): RestorationState {
  const serialized = JSON.stringify(passage);
  if (serialized === JSON.stringify(OLD_PASSAGE)) return 'pending';
  if (serialized === JSON.stringify(NEW_PASSAGE)) return 'applied';
  return 'invalid';
}

function collectBlankLabels(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectBlankLabels);
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const own = record['t'] === 'blank' && typeof record['label'] === 'string' ? [record['label']] : [];
  return own.concat(Object.values(record).flatMap(collectBlankLabels));
}

export function validateNewPassage(): void {
  const labels = collectBlankLabels(NEW_PASSAGE);
  if (JSON.stringify(labels) !== JSON.stringify(['48', '49', '50', '51'])) {
    throw new Error('Restored passage must contain blanks 48-51 exactly once and in order');
  }
}

async function validatePdf(): Promise<string> {
  const pdfPath = process.env.N2_2020_FULL_PDF;
  if (!pdfPath) throw new Error('N2_2020_FULL_PDF is required');
  const buffer = await readFile(pdfPath);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  if (sha256 !== EXPECTED_PDF_SHA256) throw new Error(`Unexpected PDF SHA-256: ${sha256}`);
  if (!buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Supplied source is not a PDF');
  return pdfPath;
}

async function resolveTarget(sql: DbClientInstance['rawClient']): Promise<TargetContent> {
  const rows = await sql`
    select e.id as exam_id, q.group_id,
           qv.version as question_version, qv.status as question_status,
           gv.version as group_version, gv.status as group_status, gv.passage
    from exams e
    join exam_items ei on ei.exam_id=e.id and ei.order_index=${TARGET_QUESTION_NUMBERS[0] - 1}
    join questions q on q.id=ei.question_id and q.deleted_at is null
    join lateral (
      select * from question_versions v where v.question_id=q.id order by v.version desc limit 1
    ) qv on true
    join lateral (
      select * from question_group_versions v where v.group_id=q.group_id order by v.version desc limit 1
    ) gv on true
    where e.slug=${TARGET_EXAM_SLUG} and e.deleted_at is null
  `;
  const row = rows[0];
  if (!row) throw new Error('Target passage not found');
  if (row.question_status !== 'approved' || row.group_status !== 'approved') {
    throw new Error('Latest target content is not approved');
  }
  if (row.question_version !== row.group_version) {
    throw new Error('Question/group versions are not aligned');
  }
  const questions = await sql`
    select ei.order_index + 1 as question_number, q.id as question_id,
           qv.version as question_version, qv.status as question_status,
           ca.correct_option
    from exams e
    join exam_items ei on ei.exam_id=e.id
    join questions q on q.id=ei.question_id and q.group_id=${row.group_id} and q.deleted_at is null
    join lateral (
      select * from question_versions v where v.question_id=q.id order by v.version desc limit 1
    ) qv on true
    join correct_answers ca on ca.question_id=q.id and ca.question_version=qv.version
    where e.slug=${TARGET_EXAM_SLUG}
    order by ei.order_index
  `;
  if (questions.length !== TARGET_QUESTION_NUMBERS.length) {
    throw new Error(`Expected four questions in target group, found ${questions.length}`);
  }
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index]!;
    if (
      question.question_number !== TARGET_QUESTION_NUMBERS[index] ||
      question.question_version !== row.group_version ||
      question.question_status !== 'approved' ||
      question.correct_option !== EXPECTED_ANSWERS[index]
    ) {
      throw new Error(`Unexpected target question state at index ${index}`);
    }
  }
  const state = getRestorationState(row.passage);
  if (state === 'invalid') throw new Error('Target passage is neither pending nor applied');
  return {
    examId: row.exam_id as string,
    groupId: row.group_id as string,
    sourceVersion: row.group_version as number,
    questionIds: questions.map((question: { question_id: string }) => question.question_id),
    state,
  };
}

async function requireBackup(): Promise<string> {
  const backupPath = process.env.N2_2020_PASSAGE_BACKUP;
  if (!backupPath) throw new Error('N2_2020_PASSAGE_BACKUP is required');
  const info = await stat(backupPath);
  if (!info.isFile() || info.size < 1024 * 1024) {
    throw new Error('Backup is missing or unexpectedly small: ' + backupPath);
  }
  return backupPath;
}

async function versionContent(
  sql: DbClientInstance['rawClient'],
  target: TargetContent,
): Promise<number> {
  const [editor] = await sql`select id from users where role='editor' and blocked_at is null`;
  const [reviewer] = await sql`select id from users where role='reviewer' and blocked_at is null`;
  const [admin] = await sql`select id from users where role='admin' and blocked_at is null`;
  if (!editor || !reviewer || !admin || editor.id === reviewer.id) {
    throw new Error('Distinct active editor, reviewer, and admin users are required');
  }
  const nextVersion = target.sourceVersion + 1;
  await sql.begin(async (tx: DbClientInstance['rawClient']) => {
    const [latest] = await tx`
      select version,status,passage from question_group_versions
      where group_id=${target.groupId} order by version desc limit 1 for update
    `;
    if (
      latest?.version !== target.sourceVersion ||
      latest?.status !== 'approved' ||
      getRestorationState(latest?.passage) !== 'pending'
    ) {
      throw new Error('Target group changed after preflight');
    }
    await tx`
      insert into question_group_versions
        (group_id,version,passage,audio_sha256,status,created_at)
      select group_id,${nextVersion},${JSON.stringify(NEW_PASSAGE)}::jsonb,audio_sha256,'approved',now()
      from question_group_versions
      where group_id=${target.groupId} and version=${target.sourceVersion}
    `;
    for (const questionId of target.questionIds) {
      await tx`
        insert into question_versions
          (question_id,version,stem,explanation,status,created_at)
        select question_id,${nextVersion},stem,explanation,'approved',now()
        from question_versions
        where question_id=${questionId} and version=${target.sourceVersion}
      `;
      await tx`
        insert into answer_options (question_id,question_version,order_index,content)
        select question_id,${nextVersion},order_index,content
        from answer_options
        where question_id=${questionId} and question_version=${target.sourceVersion}
      `;
      await tx`
        insert into correct_answers
          (question_id,question_version,correct_option,explanation_notes)
        select question_id,${nextVersion},correct_option,explanation_notes
        from correct_answers
        where question_id=${questionId} and question_version=${target.sourceVersion}
      `;
    }
    await tx`
      insert into content_reviews
        (id,target_type,target_id,target_version,reviewer_id,last_editor_id,status,comments,reviewed_at)
      values (
        ${generateUuidV7()},'group_version',${target.groupId},${nextVersion},${reviewer.id},${editor.id},
        'approved','Owner-supplied full N2 12/2020 paper restores 問題9 Q48-51 passage',now()
      )
    `;
    await tx`
      insert into operator_actions (id,operator_id,action,target_resource,details,timestamp)
      values (
        ${generateUuidV7()},${admin.id},'content.passage.restore',${'question_group:' + target.groupId},
        ${JSON.stringify({
          source: 'owner-supplied-full-pdf',
          sourceSha256: EXPECTED_PDF_SHA256,
          sourcePage: 6,
          examSlug: TARGET_EXAM_SLUG,
          questionNumbers: TARGET_QUESTION_NUMBERS,
          version: nextVersion,
          answersVerified: EXPECTED_ANSWERS,
        })}::jsonb,now()
      )
    `;
  });
  return nextVersion;
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

export async function runN2Q48To51PassageRestoration(argv = process.argv.slice(2)): Promise<void> {
  validateNewPassage();
  const apply = argv.includes('--apply');
  const pdfPath = await validatePdf();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const dbClient = app.get<DbClientInstance>(DB_CLIENT);
    const examService = app.get(ExamService);
    let target = await resolveTarget(dbClient.rawClient);
    Logger.log(
      JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        state: target.state,
        pdfPath,
        pdfSha256: EXPECTED_PDF_SHA256,
        sourcePage: 6,
        questionNumbers: TARGET_QUESTION_NUMBERS,
      }),
      'N2Q48To51PassageRestoration',
    );
    if (!apply || target.state === 'applied') return;
    const backupPath = await requireBackup();
    const contentVersion = await versionContent(dbClient.rawClient, target);
    target = await resolveTarget(dbClient.rawClient);
    if (target.state !== 'applied') throw new Error('Post-version restoration verification failed');
    const [admin] =
      await dbClient.rawClient`select id from users where role='admin' and blocked_at is null`;
    if (!admin) throw new Error('Active admin user is required');
    let examsPublished = 0;
    if (await examNeedsRepublish(dbClient.rawClient, target.examId)) {
      await examService.publishExam(target.examId, admin.id);
      examsPublished = 1;
    }
    if (await examNeedsRepublish(dbClient.rawClient, target.examId)) {
      throw new Error('Exam still needs republish');
    }
    Logger.log(
      JSON.stringify({
        state: target.state,
        contentVersion,
        examsPublished,
        backupPath,
      }),
      'N2Q48To51PassageRestoration',
    );
  } finally {
    await app.close();
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  runN2Q48To51PassageRestoration().catch((error: unknown) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    Logger.error(normalized.message, normalized.stack, 'N2Q48To51PassageRestoration');
    process.exitCode = 1;
  });
}
