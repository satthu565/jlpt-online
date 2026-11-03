import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { DB_CLIENT } from '../common/database/database.module.js';
import { generateUuidV7 } from '../common/utils/uuid.js';
import type { DbClientInstance } from '../db/client.js';
import { ExamService } from '../modules/exam/exam.service.js';

type JsonRecord = Record<string, unknown>;

export interface ExplanationAnswerSync {
  examSlug: string;
  questionNumber: number;
  staleAnswer: number;
  correctAnswer: number;
  reason: string;
  staleAnswerReason: string;
}

export const N2_EXPLANATION_ANSWER_SYNCS: readonly ExplanationAnswerSync[] = [
  {
    examSlug: 'n2-2021-12',
    questionNumber: 37,
    staleAnswer: 3,
    correctAnswer: 1,
    reason:
      'Cấu trúc「N + にもなって」mang ý nghĩa "dù đã trở thành... rồi mà lại...", dùng để phê phán, chê trách hoặc thể hiện sự bất mãn khi ai đó không hành động phù hợp với vai trò, lứa tuổi hay địa vị đáng có (ở đây là "đã là người lớn đi làm rồi mà vẫn không tự dậy nổi một mình").',
    staleAnswerReason:
      'Trợ từ「でも」trong「〜にでもなる」dùng để đưa ra gợi ý ví dụ hoặc lựa chọn tạm thời ("hay là trở thành..."), không kết hợp thành mẫu ngữ pháp chê trách mang sắc thái「にもなって」.',
  },
  {
    examSlug: 'n2-2013-07',
    questionNumber: 32,
    staleAnswer: 4,
    correctAnswer: 2,
    reason:
      '「隔てる」（へだてる）mang nghĩa ngăn cách, chia cách giữa hai địa điểm hoặc hai thực thể (ở đây: dòng sông lớn chia cắt hai thành phố). Mẫu câu:「AがBとCを隔てる」hoặc「AがBを隔てている」.',
    staleAnswerReason:
      'Muốn diễn đạt "ngồi cách xa người bên cạnh" trong phòng thi phải dùng「間隔を空けて」（かんかくをあけて）hoặc「離れて」, kết hợp「人と隔てて座る」là sai cách kết hợp từ trong tiếng Nhật.',
  },
] as const;

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function flattenText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(flattenText).join('');
  if (value !== null && typeof value === 'object') {
    const record = value as JsonRecord;
    if (typeof record.text === 'string') return record.text;
    if ('children' in record) return flattenText(record.children);
    if ('content' in record) return flattenText(record.content);
  }
  return '';
}

function syncId(sync: ExplanationAnswerSync): string {
  return `${sync.examSlug}:Q${sync.questionNumber}`;
}

export function getExplanationSyncState(
  content: unknown,
  staleAnswer: number,
  correctAnswer: number,
): 'pending' | 'applied' | 'invalid' {
  const correctReason = flattenText(asRecord(content).correctReason);
  if (correctReason.includes(`Đáp án đúng: [${correctAnswer}]`)) return 'applied';
  if (correctReason.includes(`Đáp án đúng: [${staleAnswer}]`)) return 'pending';
  return 'invalid';
}

function normalizeWrongReasons(value: unknown): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(asRecord(value)).map(([key, reason]) => [key, reason]),
  );
}

export function synchronizeExplanationContent(
  source: unknown,
  sync: ExplanationAnswerSync,
  options: ReadonlyMap<number, string>,
  contentVersion: number,
): JsonRecord {
  const existing = asRecord(source);
  const correctOption = options.get(sync.correctAnswer) ?? `Phương án ${sync.correctAnswer}`;
  const correctText = `Đáp án đúng: [${sync.correctAnswer}] ${correctOption}\n${sync.reason}`;
  const wrongReasons = normalizeWrongReasons(existing.wrongReasonsByOption);
  delete wrongReasons[String(sync.correctAnswer)];
  wrongReasons[String(sync.staleAnswer)] = [
    {
      t: 'text',
      text: `${options.get(sync.staleAnswer) ?? `Phương án ${sync.staleAnswer}`}: ${sync.staleAnswerReason}`,
    },
  ];

  const wrongLines = Array.from(options.entries())
    .filter(([index]) => index !== sync.correctAnswer)
    .map(([index, option]) => {
      const reason = flattenText(wrongReasons[String(index)]) || 'Không phù hợp với nội dung câu hỏi.';
      return `- [${index}] Phương án ${index}: ${option}: ${reason.replace(`${option}: `, '')}`;
    });
  const translationVi = typeof existing.translationVi === 'string' ? existing.translationVi : '';
  const blocks: unknown[] = [];
  if (translationVi.length > 0) {
    blocks.push({
      type: 'paragraph',
      content: [{ t: 'text', text: `• Dịch nghĩa: ${translationVi}` }],
    });
  }
  blocks.push({
    type: 'paragraph',
    content: [
      { t: 'text', text: `• Đáp án đúng: [${sync.correctAnswer}] ${correctOption}` },
      { t: 'br' },
      { t: 'text', text: sync.reason },
    ],
  });
  blocks.push({
    type: 'paragraph',
    content: [
      { t: 'text', text: '• Phân tích các phương án còn lại:' },
      ...wrongLines.flatMap((line) => [{ t: 'br' }, { t: 'text', text: line }]),
    ],
  });

  const transcript = Array.isArray(existing.transcript) ? existing.transcript : undefined;
  const transcriptMarkdown = transcript ? `\n\n**Script bài nghe**:\n${flattenText(transcript)}` : '';
  return {
    ...existing,
    contentVersion,
    humanReviewed: true,
    correctReason: [{ t: 'text', text: correctText }],
    wrongReasonsByOption: wrongReasons,
    blocks,
    explanationMarkdown: `**Lý do đúng**:\n${correctText}\n\n**Phân tích các phương án còn lại**:\n${wrongLines.join('\n')}${transcriptMarkdown}`,
  };
}

interface ResolvedSync {
  sync: ExplanationAnswerSync;
  examId: string;
  questionId: string;
  groupId: string;
  questionVersion: number;
  groupVersion: number;
  explanationVersion: number;
  explanationContent: unknown;
  options: Map<number, string>;
  state: 'pending' | 'applied';
}

async function resolveSyncs(sql: DbClientInstance['rawClient']): Promise<ResolvedSync[]> {
  const resolved: ResolvedSync[] = [];
  for (const sync of N2_EXPLANATION_ANSWER_SYNCS) {
    const rows = await sql`
      select e.id as exam_id, q.id as question_id, q.group_id,
             qv.version as question_version, qv.status as question_status,
             gv.version as group_version, gv.status as group_status,
             ca.correct_option,
             xv.version as explanation_version, xv.content as explanation_content
      from exams e
      join exam_items ei on ei.exam_id=e.id and ei.order_index=${sync.questionNumber - 1}
      join questions q on q.id=ei.question_id and q.deleted_at is null
      join lateral (
        select * from question_versions v where v.question_id=q.id order by v.version desc limit 1
      ) qv on true
      join lateral (
        select * from question_group_versions v where v.group_id=q.group_id order by v.version desc limit 1
      ) gv on true
      join correct_answers ca on ca.question_id=q.id and ca.question_version=qv.version
      join lateral (
        select * from explanation_versions v
        where v.question_id=q.id and v.locale='vi' order by v.version desc limit 1
      ) xv on true
      where e.slug=${sync.examSlug} and e.deleted_at is null
    `;
    const row = rows[0];
    if (!row) throw new Error(syncId(sync) + ': target not found');
    if (row.question_status !== 'approved' || row.group_status !== 'approved') {
      throw new Error(syncId(sync) + ': latest content is not approved');
    }
    if (row.question_version !== row.group_version) {
      throw new Error(syncId(sync) + ': question/group versions are not aligned');
    }
    if (row.correct_option !== sync.correctAnswer) {
      throw new Error(syncId(sync) + ': current answer key is ' + row.correct_option);
    }
    const state = getExplanationSyncState(
      row.explanation_content,
      sync.staleAnswer,
      sync.correctAnswer,
    );
    if (state === 'invalid') throw new Error(syncId(sync) + ': explanation has an unexpected answer');
    const optionRows = await sql`
      select order_index,content from answer_options
      where question_id=${row.question_id} and question_version=${row.question_version}
      order by order_index
    `;
    const options = new Map<number, string>(
      optionRows.map((option: { order_index: number; content: unknown }) => [
        option.order_index,
        flattenText(option.content),
      ]),
    );
    resolved.push({
      sync,
      examId: row.exam_id,
      questionId: row.question_id,
      groupId: row.group_id,
      questionVersion: row.question_version,
      groupVersion: row.group_version,
      explanationVersion: row.explanation_version,
      explanationContent: row.explanation_content,
      options,
      state,
    });
  }
  return resolved;
}

async function requireBackup(): Promise<string> {
  const backupPath = process.env.N2_EXPLANATION_SYNC_BACKUP;
  if (!backupPath) throw new Error('N2_EXPLANATION_SYNC_BACKUP is required');
  const info = await stat(backupPath);
  if (!info.isFile() || info.size < 1024 * 1024) {
    throw new Error('Backup is missing or unexpectedly small: ' + backupPath);
  }
  return backupPath;
}

async function versionExplanations(
  sql: DbClientInstance['rawClient'],
  resolved: ResolvedSync[],
): Promise<number> {
  const [editor] = await sql`select id from users where role='editor' and blocked_at is null`;
  const [reviewer] = await sql`select id from users where role='reviewer' and blocked_at is null`;
  const [admin] = await sql`select id from users where role='admin' and blocked_at is null`;
  if (!editor || !reviewer || !admin || editor.id === reviewer.id) {
    throw new Error('Distinct active editor, reviewer, and admin users are required');
  }

  const byGroup = new Map<string, ResolvedSync[]>();
  for (const item of resolved.filter((candidate) => candidate.state === 'pending')) {
    const values = byGroup.get(item.groupId) ?? [];
    values.push(item);
    byGroup.set(item.groupId, values);
  }

  let groupsVersioned = 0;
  await sql.begin(async (tx: DbClientInstance['rawClient']) => {
    for (const [groupId, groupSyncs] of byGroup) {
      const sourceVersion = groupSyncs[0]!.groupVersion;
      const nextVersion = sourceVersion + 1;
      const latest = await tx`
        select version,status from question_group_versions
        where group_id=${groupId} order by version desc limit 1 for update
      `;
      if (latest[0]?.version !== sourceVersion || latest[0]?.status !== 'approved') {
        throw new Error('Group changed after preflight: ' + groupId);
      }
      await tx`
        insert into question_group_versions
          (group_id,version,passage,audio_sha256,status,created_at)
        select group_id,${nextVersion},passage,audio_sha256,'approved',now()
        from question_group_versions where group_id=${groupId} and version=${sourceVersion}
      `;

      const questions = await tx`
        select id from questions where group_id=${groupId} and deleted_at is null order by id
      `;
      for (const question of questions) {
        const target = groupSyncs.find((item) => item.questionId === question.id);
        const [questionVersion] = await tx`
          select stem,explanation from question_versions
          where question_id=${question.id} and version=${sourceVersion}
        `;
        if (!questionVersion) throw new Error('Question source version missing: ' + question.id);
        let questionExplanation = questionVersion.explanation;
        if (target) {
          const synced = synchronizeExplanationContent(
            target.explanationContent,
            target.sync,
            target.options,
            nextVersion,
          );
          questionExplanation = { locale: 'vi', blocks: synced.blocks };
        }
        const serializedQuestionExplanation =
          questionExplanation === null ? null : JSON.stringify(questionExplanation);
        await tx`
          insert into question_versions
            (question_id,version,stem,explanation,status,created_at)
          values (
            ${question.id},${nextVersion},${JSON.stringify(questionVersion.stem)}::jsonb,
            ${serializedQuestionExplanation}::jsonb,'approved',now()
          )
        `;
        await tx`
          insert into answer_options (question_id,question_version,order_index,content)
          select question_id,${nextVersion},order_index,content from answer_options
          where question_id=${question.id} and question_version=${sourceVersion}
        `;
        await tx`
          insert into correct_answers
            (question_id,question_version,correct_option,explanation_notes)
          select question_id,${nextVersion},correct_option,explanation_notes from correct_answers
          where question_id=${question.id} and question_version=${sourceVersion}
        `;

        const explanationRows = await tx`
          select distinct on (locale) content,locale,author_id,ai_generated
          from explanation_versions where question_id=${question.id}
          order by locale,version desc
        `;
        for (const explanation of explanationRows) {
          let content = explanation.content;
          if (target && explanation.locale === 'vi') {
            content = synchronizeExplanationContent(
              target.explanationContent,
              target.sync,
              target.options,
              nextVersion,
            );
          } else {
            content = { ...asRecord(content), contentVersion: nextVersion };
          }
          await tx`
            insert into explanation_versions
              (id,question_id,version,content,locale,author_id,ai_generated,status,created_at)
            values (
              ${generateUuidV7()},${question.id},${nextVersion},${JSON.stringify(content)}::jsonb,
              ${explanation.locale},${target && explanation.locale === 'vi' ? editor.id : explanation.author_id},
              ${target && explanation.locale === 'vi' ? false : explanation.ai_generated},'approved',now()
            )
          `;
        }
      }

      await tx`
        insert into content_reviews
          (id,target_type,target_id,target_version,reviewer_id,last_editor_id,status,comments,reviewed_at)
        values (
          ${generateUuidV7()},'group_version',${groupId},${nextVersion},${reviewer.id},${editor.id},
          'approved',${'Owner-authorized N2 explanation/answer synchronization: ' + groupSyncs.map((item) => syncId(item.sync)).join(', ')},now()
        )
      `;
      await tx`
        insert into operator_actions (id,operator_id,action,target_resource,details,timestamp)
        values (
          ${generateUuidV7()},${admin.id},'content.explanation.answer_sync',${'question_group:' + groupId},
          ${JSON.stringify({
            source: 'owner-authorized-maintenance',
            version: nextVersion,
            questions: groupSyncs.map((item) => ({
              examSlug: item.sync.examSlug,
              questionNumber: item.sync.questionNumber,
              staleAnswer: item.sync.staleAnswer,
              correctAnswer: item.sync.correctAnswer,
            })),
          })}::jsonb,now()
        )
      `;
      groupsVersioned += 1;
    }
  });
  return groupsVersioned;
}

async function examNeedsRepublish(
  sql: DbClientInstance['rawClient'],
  examId: string,
): Promise<boolean> {
  const [row] = await sql`
    select exists (
      select 1 from exam_items ei
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

export async function runN2ExplanationAnswerSync(argv = process.argv.slice(2)): Promise<void> {
  const apply = argv.includes('--apply');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const dbClient = app.get<DbClientInstance>(DB_CLIENT);
    const examService = app.get(ExamService);
    let resolved = await resolveSyncs(dbClient.rawClient);
    Logger.log(
      JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        explanations: resolved.length,
        affectedExams: new Set(resolved.map((item) => item.examId)).size,
        affectedGroups: new Set(resolved.map((item) => item.groupId)).size,
        pendingExplanations: resolved.filter((item) => item.state === 'pending').length,
        pendingIds: resolved
          .filter((item) => item.state === 'pending')
          .map((item) => syncId(item.sync)),
      }),
      'N2ExplanationAnswerSync',
    );
    if (!apply) return;

    const backupPath = await requireBackup();
    const groupsVersioned = await versionExplanations(dbClient.rawClient, resolved);
    resolved = await resolveSyncs(dbClient.rawClient);
    if (resolved.some((item) => item.state !== 'applied')) {
      throw new Error('Post-version explanation verification failed');
    }
    const [admin] = await dbClient.rawClient`
      select id from users where role='admin' and blocked_at is null
    `;
    if (!admin) throw new Error('Active admin user is required');
    const affectedExamIds = Array.from(new Set(resolved.map((item) => item.examId)));
    const examIdsToPublish: string[] = [];
    for (const examId of affectedExamIds) {
      if (await examNeedsRepublish(dbClient.rawClient, examId)) examIdsToPublish.push(examId);
    }
    for (const examId of examIdsToPublish) await examService.publishExam(examId, admin.id);
    resolved = await resolveSyncs(dbClient.rawClient);
    if (resolved.some((item) => item.state !== 'applied')) {
      throw new Error('Final published explanation verification failed');
    }
    for (const examId of affectedExamIds) {
      if (await examNeedsRepublish(dbClient.rawClient, examId)) {
        throw new Error('Exam still needs republish: ' + examId);
      }
    }
    Logger.log(
      JSON.stringify({
        groupsVersioned,
        examsPublished: examIdsToPublish.length,
        explanationsVerified: resolved.length,
        backupPath,
      }),
      'N2ExplanationAnswerSync',
    );
  } finally {
    await app.close();
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  runN2ExplanationAnswerSync().catch((error: unknown) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    Logger.error(normalized.message, normalized.stack, 'N2ExplanationAnswerSync');
    process.exitCode = 1;
  });
}
