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

export interface DisputedQuestionFix {
  examSlug: string;
  questionNumber: number;
  oldKey: number;
  newKey: number;
  optionLabels?: Record<number, string>;
  reason: string;
  oldKeyReason: string;
  wrongReasons?: Record<number, string>;
}

export const N1_3_DISPUTED_FIXES: readonly DisputedQuestionFix[] = [
  {
    examSlug: 'n1-2025-07',
    questionNumber: 88,
    oldKey: 1,
    newKey: 2,
    optionLabels: {
      1: '困りましたね。すぐに対策を考えないとね',
      2: '全く問題ないんですね。それは安心しました',
      3: 'スケジュールにちょっと遅れが出ているんですね',
    },
    reason:
      'Thông báo trong bài nghe nêu rõ tiến độ thi công hoàn toàn không chịu ảnh hưởng nào của thời tiết xấu (「工事の報告ですが、スケジュールになんら天候不良の影響はありません」). Do đó, phản ứng hợp lý và tự nhiên nhất là yên tâm vì không có vấn đề gì (「全く問題ないんですね。それは安心しました」).',
    oldKeyReason:
      'Phương án 1 (「困りましたね。すぐに対策を考えないとね」) mâu thuẫn trực tiếp vì thông báo khẳng định tiến độ hoàn toàn không bị ảnh hưởng xấu.',
    wrongReasons: {
      1: 'Phương án 1 (困りましたね。すぐに対策を考えないとね): Mâu thuẫn trực tiếp với thông báo khẳng định tiến độ hoàn toàn không bị ảnh hưởng xấu.',
      3: 'Phương án 3 (スケジュールにちょっと遅れが出ているんですね): Sai lệch vì thông báo khẳng định không có sự chậm trễ.',
    },
  },
  {
    examSlug: 'n1-2023-12',
    questionNumber: 63,
    oldKey: 3,
    newKey: 4,
    reason:
      'Tác giả phân tích rằng trong lúc khó khăn thực sự, sự ủng hộ hời hợt trên mạng xã hội là vô ích; chỉ có gia đình và bạn bè – những mối quan hệ thân thuộc dù phiền toái nhưng sâu sắc, gắn kết bền chặt (「面倒な人間関係に支えられた家族や友人たち」「その小さく面倒な人間関係をどれだけ濃密に作れるか」) – mới là chỗ dựa liên tục và là nơi đón nhận sự thay đổi để vượt qua khó khăn.',
    oldKeyReason:
      'Phương án 3 sai bẫy từ vựng vì tác giả không hề khuyên "mở rộng mối quan hệ" (広げていけば) mà nhấn mạnh việc tạo dựng quan hệ sâu sắc, đậm đặc (濃密に作れるか).',
    wrongReasons: {
      1: 'Phương án 1: Sai vì nhận ra sự lệch pha chỉ là bản chất khó khăn, vượt qua cần sự đồng hành của mối quan hệ chứ không thể chỉ đơn phương bản thân cố gắng.',
      2: 'Phương án 2: Sai vì tác giả cho rằng người nghĩ tranh luận làm thay đổi đối phương là thiếu hiểu biết về bản chất con người.',
      3: 'Phương án 3: Sai bẫy từ vựng (bài nhấn mạnh mối quan hệ sâu sắc 濃密 chứ không khuyên mở rộng số lượng quan hệ 広げていけば).',
    },
  },
  {
    examSlug: 'n1-2019-07',
    questionNumber: 90,
    oldKey: 2,
    newKey: 1,
    optionLabels: {
      1: '2、3分でいいですか。',
      2: 'もちろん差し上げますよ。',
      3: '李さんから挨拶あるんですね。',
    },
    reason:
      'Khi học trò dùng khiêm nhường ngữ xin thầy phát biểu đôi lời trong tiệc chia tay (「先生、あしたの李さんの送別会、最後に一言頂戴したいんですが」), phản ứng tự nhiên và đúng mực nhất của thầy giáo là nhận lời và hỏi thời lượng 2-3 phút có được không (「2、3分でいいですか」).',
    oldKeyReason:
      'Phương án 2 (「もちろん差し上げますよ」) sai nghiêm trọng về kính ngữ vì「差し上げる」là khiêm nhường ngữ (chỉ dùng khi người dưới dâng tặng người trên), người bề trên/thầy giáo không bao giờ dùng「差し上げる」khi nói với học trò.',
    wrongReasons: {
      2: 'Phương án 2 (もちろん差し上げますよ): Sai kính ngữ nặng nề vì 差し上げる là khiêm nhường ngữ, bề trên không bao giờ dùng cho người dưới.',
      3: 'Phương án 3 (李さんから挨拶あるんですね): Không phù hợp ngữ cảnh phản hồi lời mời phát biểu của học trò.',
    },
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
    if (record.t === 'br') return '\n';
    if (typeof record.text === 'string') return record.text;
    if ('children' in record) return flattenText(record.children);
    if ('content' in record) return flattenText(record.content);
  }
  return '';
}

export function fixId(fix: DisputedQuestionFix): string {
  return `${fix.examSlug}:Q${fix.questionNumber}`;
}

export function getDisputedFixState(
  currentKey: number,
  publishedKey: number,
  newKey: number,
): 'pending' | 'applied' {
  return currentKey === newKey && publishedKey === newKey ? 'applied' : 'pending';
}

export interface ResolvedDisputedFix {
  fix: DisputedQuestionFix;
  examId: string;
  questionId: string;
  groupId: string;
  questionVersion: number;
  groupVersion: number;
  currentKey: number;
  publishedVersion: number;
  publishedKey: number;
  options: ReadonlyMap<number, string>;
  explanationContent: unknown;
  state: 'pending' | 'applied';
}

export async function resolveDisputedFixes(
  sql: DbClientInstance['rawClient'],
  fixes: readonly DisputedQuestionFix[] = N1_3_DISPUTED_FIXES,
): Promise<ResolvedDisputedFix[]> {
  const resolved: ResolvedDisputedFix[] = [];
  for (const fix of fixes) {
    const rows = await sql`
      select e.id as exam_id, e.published_version, q.id as question_id, q.group_id,
             qv.version as question_version, qv.status as question_status,
             gv.version as group_version, gv.status as group_status,
             ca.correct_option as current_key, eak.keys[${fix.questionNumber}] as published_key
      from exams e
      join exam_items ei on ei.exam_id = e.id and ei.order_index = ${fix.questionNumber - 1}
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
      where e.slug = ${fix.examSlug} and e.deleted_at is null
    `;
    const row = rows[0];
    if (!row) throw new Error(`${fixId(fix)}: target question was not found`);
    if (row.question_status !== 'approved' || row.group_status !== 'approved') {
      throw new Error(`${fixId(fix)}: latest question/group is not approved`);
    }

    const optionRows = await sql`
      select order_index, content from answer_options
      where question_id = ${row.question_id} and question_version = ${row.question_version}
      order by order_index
    `;
    const options = new Map<number, string>();
    for (const opt of optionRows) {
      const dbText = flattenText(opt.content);
      const override = fix.optionLabels?.[opt.order_index];
      options.set(opt.order_index, override || dbText || `Phương án ${opt.order_index}`);
    }

    const explRows = await sql`
      select content from explanation_versions
      where question_id = ${row.question_id} and locale = 'vi'
      order by version desc limit 1
    `;
    const explContent = explRows[0]?.content;
    const state = getDisputedFixState(row.current_key, row.published_key, fix.newKey);

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
      options,
      explanationContent: explContent,
      state,
    });
  }
  return resolved;
}

export function buildUpdatedExplanation(
  source: unknown,
  fix: DisputedQuestionFix,
  options: ReadonlyMap<number, string>,
  nextVersion: number,
): JsonRecord {
  const existing = asRecord(source);
  const correctOptionText = options.get(fix.newKey) ?? `Phương án ${fix.newKey}`;
  const correctText = `Đáp án đúng: [${fix.newKey}] ${correctOptionText}\n${fix.reason}`;

  const wrongReasons: Record<string, unknown> = {};
  for (const [idx, optText] of options.entries()) {
    if (idx === fix.newKey) continue;
    let reasonText = fix.wrongReasons?.[idx];
    if (!reasonText) {
      if (idx === fix.oldKey) {
        reasonText = fix.oldKeyReason;
      } else {
        reasonText = `Phương án ${idx}: ${optText}: Không phù hợp với ngữ cảnh câu hỏi.`;
      }
    }
    wrongReasons[String(idx)] = [{ t: 'text', text: reasonText }];
  }

  const wrongLines: string[] = [];
  for (const [idx, optText] of options.entries()) {
    if (idx === fix.newKey) continue;
    const wr =
      fix.wrongReasons?.[idx] ||
      (idx === fix.oldKey ? fix.oldKeyReason : `Phương án ${idx}: ${optText}: Không phù hợp.`);
    wrongLines.push(`- [${idx}] ${wr}`);
  }

  const translationVi = typeof existing.translationVi === 'string' ? existing.translationVi : '';
  const blocks: unknown[] = [];
  if (translationVi) {
    blocks.push({
      type: 'paragraph',
      content: [{ t: 'text', text: `• Dịch nghĩa: ${translationVi}` }],
    });
  }
  blocks.push({
    type: 'paragraph',
    content: [
      { t: 'text', text: `• Đáp án đúng: [${fix.newKey}] ${correctOptionText}` },
      { t: 'br' },
      { t: 'text', text: fix.reason },
    ],
  });
  blocks.push({
    type: 'paragraph',
    content: [
      { t: 'text', text: '• Phân tích các phương án còn lại:' },
      ...wrongLines.flatMap((line) => [{ t: 'br' }, { t: 'text', text: line }]),
    ],
  });

  const markdownParts: string[] = [
    `**Lý do đúng**:\n${correctText}`,
    `**Phân tích các phương án còn lại**:\n${wrongLines.join('\n')}`,
  ];
  if (typeof existing.explanationMarkdown === 'string') {
    const idx = existing.explanationMarkdown.indexOf('**Script bài nghe**:');
    if (idx !== -1) {
      markdownParts.push(existing.explanationMarkdown.slice(idx).trim());
    }
  } else if (Array.isArray(existing.transcript) && existing.transcript.length > 0) {
    markdownParts.push(`**Script bài nghe**:\n${flattenText(existing.transcript)}`);
  }

  return {
    ...existing,
    contentVersion: nextVersion,
    humanReviewed: true,
    correctReason: [{ t: 'text', text: correctText }],
    wrongReasonsByOption: wrongReasons,
    explanationMarkdown: markdownParts.join('\n\n'),
    blocks,
  };
}

async function requireBackup(): Promise<string> {
  const backupPath = process.env.DISPUTED_ANSWER_KEYS_BACKUP;
  if (!backupPath) throw new Error('DISPUTED_ANSWER_KEYS_BACKUP is required to apply fixes');
  const info = await stat(backupPath);
  if (!info.isFile() || info.size < 1024 * 1024) {
    throw new Error('Backup file is missing or smaller than 1 MiB: ' + backupPath);
  }
  return backupPath;
}

export async function applyDisputedFixes(
  sql: DbClientInstance['rawClient'],
  resolved: ResolvedDisputedFix[],
): Promise<number> {
  const [editor] = await sql`select id from users where role = 'editor' and blocked_at is null`;
  const [reviewer] = await sql`select id from users where role = 'reviewer' and blocked_at is null`;
  const [admin] = await sql`select id from users where role = 'admin' and blocked_at is null`;
  if (!editor || !reviewer || !admin || editor.id === reviewer.id) {
    throw new Error('Distinct active editor, reviewer, and admin users are required');
  }

  const byGroup = new Map<string, ResolvedDisputedFix[]>();
  for (const item of resolved) {
    const list = byGroup.get(item.groupId) ?? [];
    list.push(item);
    byGroup.set(item.groupId, list);
  }

  let groupsVersioned = 0;
  await sql.begin(async (tx: DbClientInstance['rawClient']) => {
    for (const [groupId, groupFixes] of byGroup) {
      const sourceVersion = groupFixes[0]!.groupVersion;
      const nextVersion = sourceVersion + 1;

      const latest = await tx`
        select version, status from question_group_versions
        where group_id = ${groupId} order by version desc limit 1 for update
      `;
      if (latest[0]?.version !== sourceVersion || latest[0]?.status !== 'approved') {
        throw new Error('Group version changed after preflight: ' + groupId);
      }

      await tx`
        insert into question_group_versions
          (group_id, version, passage, audio_sha256, status, created_at)
        select group_id, ${nextVersion}, passage, audio_sha256, 'approved', now()
        from question_group_versions where group_id = ${groupId} and version = ${sourceVersion}
      `;

      const questions = await tx`
        select id from questions where group_id = ${groupId} and deleted_at is null order by id
      `;
      for (const q of questions) {
        const target = groupFixes.find((item) => item.questionId === q.id);
        const [qVer] = await tx`
          select stem, explanation from question_versions
          where question_id = ${q.id} and version = ${sourceVersion}
        `;
        if (!qVer) throw new Error('Source question version missing: ' + q.id);

        let qExpl = qVer.explanation;
        if (target) {
          const synced = buildUpdatedExplanation(
            target.explanationContent,
            target.fix,
            target.options,
            nextVersion,
          );
          qExpl = { locale: 'vi', blocks: synced.blocks };
        }

        await tx`
          insert into question_versions
            (question_id, version, stem, explanation, status, created_at)
          values (
            ${q.id}, ${nextVersion}, ${JSON.stringify(qVer.stem)}::jsonb,
            ${qExpl ? JSON.stringify(qExpl) : null}::jsonb, 'approved', now()
          )
        `;

        await tx`
          insert into answer_options (question_id, question_version, order_index, content)
          select question_id, ${nextVersion}, order_index, content from answer_options
          where question_id = ${q.id} and question_version = ${sourceVersion}
        `;

        if (target) {
          await tx`
            insert into correct_answers
              (question_id, question_version, correct_option, explanation_notes)
            values (
              ${q.id}, ${nextVersion}, ${target.fix.newKey}, ${target.fix.reason}
            )
          `;
        } else {
          await tx`
            insert into correct_answers
              (question_id, question_version, correct_option, explanation_notes)
            select question_id, ${nextVersion}, correct_option, explanation_notes
            from correct_answers
            where question_id = ${q.id} and question_version = ${sourceVersion}
          `;
        }

        const explRows = await tx`
          select distinct on (locale) content, locale, author_id, ai_generated
          from explanation_versions where question_id = ${q.id}
          order by locale, version desc
        `;
        for (const expl of explRows) {
          let content = expl.content;
          if (target && expl.locale === 'vi') {
            content = buildUpdatedExplanation(
              target.explanationContent,
              target.fix,
              target.options,
              nextVersion,
            );
          } else {
            content = { ...asRecord(content), contentVersion: nextVersion };
          }
          await tx`
            insert into explanation_versions
              (id, question_id, version, content, locale, author_id, ai_generated, status, created_at)
            values (
              ${generateUuidV7()}, ${q.id}, ${nextVersion}, ${JSON.stringify(content)}::jsonb,
              ${expl.locale}, ${target && expl.locale === 'vi' ? editor.id : expl.author_id},
              ${target && expl.locale === 'vi' ? false : expl.ai_generated}, 'approved', now()
            )
          `;
        }
      }

      await tx`
        insert into content_reviews
          (id, target_type, target_id, target_version, reviewer_id, last_editor_id, status, comments, reviewed_at)
        values (
          ${generateUuidV7()}, 'group_version', ${groupId}, ${nextVersion}, ${reviewer.id}, ${editor.id},
          'approved', ${'Owner-authorized disputed answer-key and explanation correction: ' + groupFixes.map((x) => fixId(x.fix)).join(', ')}, now()
        )
      `;

      await tx`
        insert into operator_actions (id, operator_id, action, target_resource, details, timestamp)
        values (
          ${generateUuidV7()}, ${admin.id}, 'content.disputed_answer.fix', ${'question_group:' + groupId},
          ${JSON.stringify({
            source: 'owner-authorized-disputed-fix',
            version: nextVersion,
            fixes: groupFixes.map((item) => ({
              examSlug: item.fix.examSlug,
              questionNumber: item.fix.questionNumber,
              oldKey: item.fix.oldKey,
              newKey: item.fix.newKey,
            })),
          })}::jsonb, now()
        )
      `;
      groupsVersioned += 1;
    }
  });

  return groupsVersioned;
}

export async function runDisputedFix(
  argv = process.argv.slice(2),
  fixes: readonly DisputedQuestionFix[] = N1_3_DISPUTED_FIXES,
): Promise<void> {
  const apply = argv.includes('--apply');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const dbClient = app.get<DbClientInstance>(DB_CLIENT);
    const examService = app.get(ExamService);
    let resolved = await resolveDisputedFixes(dbClient.rawClient, fixes);

    Logger.log(
      JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        fixes: resolved.length,
        pending: resolved.filter((x) => x.state === 'pending').length,
        affectedExams: Array.from(new Set(resolved.map((x) => x.fix.examSlug))),
      }),
      'DisputedQuestionFix',
    );

    if (!apply) return;

    const backupPath = await requireBackup();
    const groupsVersioned = await applyDisputedFixes(dbClient.rawClient, resolved);

    // Republish exams
    const [admin] = await dbClient.rawClient`
      select id from users where role = 'admin' and blocked_at is null
    `;
    if (!admin) throw new Error('Active admin user is required');

    const affectedExamIds = Array.from(new Set(resolved.map((x) => x.examId)));
    for (const examId of affectedExamIds) {
      await examService.publishExam(examId, admin.id);
    }

    // Verify after apply
    resolved = await resolveDisputedFixes(dbClient.rawClient, fixes);
    for (const item of resolved) {
      if (item.currentKey !== item.fix.newKey || item.publishedKey !== item.fix.newKey) {
        throw new Error(`${fixId(item.fix)}: verification failed after publish`);
      }
    }

    Logger.log(
      JSON.stringify({
        applied: true,
        groupsVersioned,
        examsRepublished: affectedExamIds.length,
        backupPath,
      }),
      'DisputedQuestionFix',
    );
  } finally {
    await app.close();
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  runDisputedFix().catch((error: unknown) => {
    Logger.error(error instanceof Error ? error.message : String(error), undefined, 'DisputedQuestionFix');
    process.exitCode = 1;
  });
}
