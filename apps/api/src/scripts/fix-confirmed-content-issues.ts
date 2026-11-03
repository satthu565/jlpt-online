import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { DB_CLIENT } from '../common/database/database.module.js';
import { generateUuidV7 } from '../common/utils/uuid.js';
import type { DbClientInstance } from '../db/client.js';
import { ExamService } from '../modules/exam/exam.service.js';

type ContentLocation = 'stem' | 'passage' | 'option';

export type ConfirmedContentCorrection = readonly [
  examSlug: string,
  questionNumber: number,
  location: ContentLocation,
  optionIndex: number | null,
  oldText: string,
  newText: string,
  reason: string,
];

export const CONFIRMED_CONTENT_CORRECTIONS: readonly ConfirmedContentCorrection[] = [
  ['n1-2025-12', 57, 'option', null, '完成', '完全', 'OCR correction'],
  ['n1-2025-12', 57, 'option', null, '車要', '重要', 'OCR correction'],
  ['n1-2023-07', 57, 'passage', null, 'プログミング', 'プログラミング', 'OCR correction'],
  ['n1-2021-12', 53, 'stem', null, 'この文章のキーワードを「水温」の他に３つあげるとしたら、以下どの３つ[KHONG_DOC_RO]るか。', 'この文章のキーワードを「水温」の他に３つあげるとしたら、以下どの３つか。', 'Restore the complete question from the source paper'],
  ['n1-2021-12', 62, 'passage', null, '弊店の客層に合うよう[KHONG_DOC_RO]階または２階', '弊店の客層に合うよう１階または２階', 'Restore the requested floor from the source paper'],
  ['n1-2021-12', 62, 'passage', null, '直[KHONG_DOC_RO]ご相談', '直接ご相談', 'Restore the missing kanji from the source paper'],
  ['n1-2021-12', 62, 'passage', null, 'ご出店お願いえれば', 'ご出店お願いできれば', 'Restore the missing verb from the source paper'],
  ['n1-2021-12', 62, 'passage', null, '貴社の方針　心より', '貴社の方針に心より', 'Restore the missing particle from the source paper'],
  ['n1-2021-12', 62, 'passage', null, '平屋になんじだ年配', '平屋になじんだ年配', 'Correct the OCR kana from the source paper'],
  ['n1-2021-12', 63, 'option', 3, '商店街にる現店舗', '商店街にある現店舗', 'Restore the missing kana from the source paper'],
  ['n1-2013-12', 24, 'option', 3, '当てはめて', 'に当てはめて', 'Missing particle'],
  ['n1-2013-07', 59, 'passage', null, '石垣そのものの them... 大規模な崩壊', '石垣そのものの大規模な崩壊', 'Remove foreign OCR text absent from the source paper'],
  ['n1-2013-07', 60, 'option', 3, '[KHONG_DOC_RO]', '化学薬品の有用性', 'Restore the printed option from the source paper'],
  ['n1-2012-07', 48, 'passage', null, '植物を実際に取り寄せで植える土地', '植物を実際に取り寄せて植える土地', 'Verb form'],
  ['n1-2012-07', 50, 'option', 3, '定年後は何もしることがない', '定年後は何もすることがない', 'Verb typo'],
  ['n1-2011-07', 20, 'option', 3, '為替レール', '為替レート', 'Loanword typo'],
  ['n1-2010-12', 26, 'stem', null, '運営運転', '営業運転', 'Railway term'],
  ['n1-2010-12', 53, 'passage', null, '生産すら流通まで', '生産から流通まで', 'OCR correction'],

  ['n2-2022-12', 101, 'option', 4, '2月', '1月', 'Transcript and timeline require January'],
  ['n2-2022-07', 70, 'passage', null, '7000円', '700円', 'Child ticket price typo'],
  ['n2-2024-07', 44, 'option', 3, '慰める', '褒める', 'The sentence requires praise'],
  ['n2-2024-07', 44, 'option', 4, '慰めることがない', '褒めることがない', 'The sentence requires praise'],
  ['n2-2022-12', 70, 'passage', null, '適応対象', '適用対象', 'Wrong kanji for applicability'],
  ['n2-2022-12', 70, 'passage', null, '同時に適応できません', '同時に適用できません', 'Wrong kanji for applicability'],
  ['n2-2024-07', 70, 'stem', null, '応募条件を満たしだれている', '応募条件を満たしている', 'OCR correction'],
  ['n2-2022-12', 57, 'passage', null, '軌き方', '動き方', 'OCR correction'],
  ['n2-2013-12', 74, 'passage', null, '（2月17日必着）', '（12月17日必着）', 'Deadline must fall within the stated application period'],
  ['n2-2021-07', 54, 'option', 4, 'ペットボトルの飲み物で減量する女性が昨年辺りから増えていること。（※ đề in trùng với lựa chọn 3）', 'どのような飲み物が流行するかは、人気のある雑誌の影響を受けること。', 'Restore printed option 4 from the owner-provided source image'],
  ['n2-2021-07', 60, 'passage', null, '小学生はまだまだ経 漠のものです。さらに興味をもたらされた 囲のものになります。', '小学生はまだまだ経験の幅が狭いものです。ですから、おのずと興味や関心を持つ対象も、非常に限られた範囲のものになります。', 'Restore the complete sentences from the original published passage'],

  ['n3-2023-12', 28, 'stem', null, 'すっと', 'ずっと', 'Kana typo'],
  ['n3-2023-07', 71, 'option', 2, '自分の会社の商品を良さを信じて', '自分の会社の商品の良さを信じて', 'Particle correction'],
  ['n3-2022-07', 62, 'option', 2, '熱い飲み物を入れら', '熱い飲み物を入れたら', 'Verb form'],
  ['n3-2022-07', 67, 'passage', null, '私は両親結婚記念日に', '私は両親の結婚記念日に', 'Missing particle'],
  ['n3-2011-12', 1, 'stem', null, '十年問で', '十年間で', 'OCR correction'],
  ['n3-2017-07', 69, 'passage', null, '生まれで約半年', '生まれて約半年', 'Verb form'],
  ['n3-2016-07', 21, 'option', 3, '否定た', '否定した', 'Missing kana'],
  ['n3-2016-07', 28, 'option', 1, '紹介ている', '紹介している', 'Missing kana'],
  ['n3-2017-07', 74, 'stem', null, '気をつけなればならない', '気をつけなければならない', 'Missing kana'],
  ['n3-2012-12', 62, 'option', 1, '田川駅を発車する', '田村駅を発車する', 'Restore the source distractor so only option 3 is true'],
  ['n3-2021-07', 65, 'stem', null, 'とあるが、筆者はどこにその原因があると考えているか。', 'とあるが、何が面白いのか。', 'Question must ask what the underlined phrase describes'],
  ['n3-2022-07', 71, 'passage', null, '60 分の「特別割引レッスン」(1000 円)を1 回９０分受けることができます。', '60 分の「特別割引レッスン」(1000 円)を1 回受けることができます。', 'Remove the conflicting regular-lesson duration'],
  ['n3-2022-07', 71, 'passage', null, '※ニつ', '※二つ', 'Katakana OCR correction'],
  ['n3-2022-07', 71, 'passage', null, '料金(ー人1000 円)', '料金(一人1000 円)', 'OCR correction'],

  ['n4-2024-07', 51, 'passage', null, '先生が「質がありますか。」', '先生が「質問がありますか。」', 'Missing kanji'],
  ['n4-2021-12', 27, 'option', 3, 'そだててました', 'そだてていました', 'Missing kana'],
  ['n4-2018-12', 61, 'stem', null, '試験中の日間に', '試験中の3日間に', 'Missing number'],
  ['n4-2021-07', 16, 'option', 1, 'えいきょう', 'えいぎょう', 'Reading typo'],
  ['n4-2021-07', 44, 'option', 1, '静かに', '静かで', 'Conjunction form'],
  ['n4-2012-12', 37, 'stem', null, 'にるとい う', 'に似るという', 'OCR and spacing correction'],
  ['n4-2010-2011', 11, 'stem', null, '7時　', '7時に　', 'Missing particle'],

  ['n5-2024-07', 56, 'option', 1, 'だい4かい', 'だい4か', '第4課 reading'],
  ['n5-2024-07', 56, 'option', 2, 'だい5かい', 'だい5か', '第5課 reading'],
  ['n5-2024-07', 56, 'option', 3, 'だい6かい', 'だい6か', '第6課 reading'],
  ['n5-2024-07', 56, 'option', 4, 'だい7かい', 'だい7か', '第7課 reading'],
  ['n5-2024-12', 59, 'option', 3, '次のバスは何分ですか。', '次のバスは何時何分ですか。', 'Ask the arrival time stated in the prompt'],
  ['n5-2012-12', 25, 'stem', null, 'いすの うに', 'いすの うえに', 'Missing kana'],
  ['n5-2012-12', 26, 'stem', null, 'あさこの しんごうで', 'あそこの しんごうで', 'Kana typo'],
  ['n5-2013-07', 42, 'stem', null, 'そばは', 'そぼは', '祖母 reading typo'],
  ['n5-2017-07', 54, 'option', 3, 'の', 'が', 'Restore 日本語がかんたんな本 and remove ambiguity'],
  ['n5-2010-2011', 54, 'option', 3, 'の', 'が', 'Restore 日本語がかんたんな本 and remove ambiguity'],
] as const;

interface ResolvedCorrection {
  correction: ConfirmedContentCorrection;
  examId: string;
  questionId: string;
  groupId: string;
  questionVersion: number;
  groupVersion: number;
  oldCount: number;
  newCount: number;
  state: 'pending' | 'applied';
}

const correctionId = (c: ConfirmedContentCorrection) =>
  `${c[0]}:Q${c[1]}:${c[2]}${c[3] === null ? '' : c[3]}`;

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

export function getCorrectionState(
  oldText: string,
  newText: string,
  oldCount: number,
  newCount: number,
): 'pending' | 'applied' | 'invalid' {
  if (newCount >= 1 && (oldCount === 0 || newText.includes(oldText))) return 'applied';
  if (oldCount === 1 && newCount === 0) return 'pending';
  return 'invalid';
}

export function selectCorrections(
  argv: string[],
): readonly ConfirmedContentCorrection[] {
  const onlyArg = argv.find((arg) => arg.startsWith('--only='));
  if (!onlyArg) return CONFIRMED_CONTENT_CORRECTIONS;
  const requestedIds = new Set(onlyArg.slice('--only='.length).split(',').filter(Boolean));
  if (requestedIds.size === 0) throw new Error('--only requires at least one correction id');
  const selected = CONFIRMED_CONTENT_CORRECTIONS.filter((item) => requestedIds.has(correctionId(item)));
  const selectedIds = new Set(selected.map(correctionId));
  const missingIds = Array.from(requestedIds).filter((id) => !selectedIds.has(id));
  if (missingIds.length > 0) throw new Error('Unknown correction ids: ' + missingIds.join(', '));
  return selected;
}

async function resolveCorrections(
  sql: DbClientInstance['rawClient'],
  corrections: readonly ConfirmedContentCorrection[],
): Promise<ResolvedCorrection[]> {
  const resolved: ResolvedCorrection[] = [];
  for (const correction of corrections) {
    const [slug, questionNumber, location, optionIndex, oldText, newText] = correction;
    const rows = await sql`
      select e.id as exam_id, q.id as question_id, q.group_id,
             qv.version as question_version, qv.status as question_status,
             qv.stem, gv.version as group_version, gv.status as group_status, gv.passage
      from exams e
      join exam_items ei on ei.exam_id=e.id and ei.order_index=${questionNumber - 1}
      join questions q on q.id=ei.question_id and q.deleted_at is null
      join lateral (
        select * from question_versions v where v.question_id=q.id order by v.version desc limit 1
      ) qv on true
      join lateral (
        select * from question_group_versions v where v.group_id=q.group_id order by v.version desc limit 1
      ) gv on true
      where e.slug=${slug} and e.deleted_at is null
    `;
    const row = rows[0];
    if (!row) throw new Error(correctionId(correction) + ': target not found');
    if (row.question_status !== 'approved' || row.group_status !== 'approved') {
      throw new Error(correctionId(correction) + ': latest content is not approved');
    }
    if (row.question_version !== row.group_version) {
      throw new Error(correctionId(correction) + ': question/group versions are not aligned');
    }

    let target: unknown;
    if (location === 'stem') target = row.stem;
    else if (location === 'passage') target = row.passage;
    else {
      const options = await sql`
        select content from answer_options
        where question_id=${row.question_id} and question_version=${row.question_version}
          and (${optionIndex}::int is null or order_index=${optionIndex})
        order by order_index
      `;
      target = options.map((option: { content: unknown }) => option.content);
    }
    const oldCount = countText(target, oldText);
    const newCount = countText(target, newText);
    const state = getCorrectionState(oldText, newText, oldCount, newCount);
    if (state === 'invalid') {
      throw new Error(
        `${correctionId(correction)}: expected one old or new occurrence, found old=${oldCount}, new=${newCount}`,
      );
    }
    resolved.push({
      correction,
      examId: row.exam_id,
      questionId: row.question_id,
      groupId: row.group_id,
      questionVersion: row.question_version,
      groupVersion: row.group_version,
      oldCount,
      newCount,
      state,
    });
  }
  return resolved;
}

async function requireBackup(): Promise<string> {
  const backupPath = process.env.CONFIRMED_CONTENT_BACKUP;
  if (!backupPath) throw new Error('CONFIRMED_CONTENT_BACKUP is required');
  const info = await stat(backupPath);
  if (!info.isFile() || info.size < 1024 * 1024) {
    throw new Error('Backup is missing or unexpectedly small: ' + backupPath);
  }
  return backupPath;
}

async function versionContent(
  sql: DbClientInstance['rawClient'],
  resolved: ResolvedCorrection[],
): Promise<{ groupsVersioned: number }> {
  const [editor] = await sql`select id from users where role='editor' and blocked_at is null`;
  const [reviewer] = await sql`select id from users where role='reviewer' and blocked_at is null`;
  const [admin] = await sql`select id from users where role='admin' and blocked_at is null`;
  if (!editor || !reviewer || !admin || editor.id === reviewer.id) {
    throw new Error('Distinct active editor, reviewer, and admin users are required');
  }

  const pending = resolved.filter((item) => item.state === 'pending');
  const byGroup = new Map<string, ResolvedCorrection[]>();
  for (const item of pending) {
    const values = byGroup.get(item.groupId) ?? [];
    values.push(item);
    byGroup.set(item.groupId, values);
  }
  let groupsVersioned = 0;

  await sql.begin(async (tx: DbClientInstance['rawClient']) => {
    for (const [groupId, corrections] of byGroup) {
      const sourceVersion = corrections[0]!.groupVersion;
      const nextVersion = sourceVersion + 1;
      const latest = await tx`
        select version,status,passage from question_group_versions
        where group_id=${groupId} order by version desc limit 1 for update
      `;
      if (latest[0]?.version !== sourceVersion || latest[0]?.status !== 'approved') {
        throw new Error('Group changed after preflight: ' + groupId);
      }
      let passage = latest[0].passage;
      for (const item of corrections.filter((x) => x.correction[2] === 'passage')) {
        passage = replaceText(passage, item.correction[4], item.correction[5]);
      }
      await tx`
        insert into question_group_versions
          (group_id,version,passage,audio_sha256,status,created_at)
        select group_id,${nextVersion},${JSON.stringify(passage)}::jsonb,audio_sha256,'approved',now()
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
        const questionCorrections = corrections.filter((x) => x.questionId === question.id);
        let stem = version.stem;
        for (const item of questionCorrections.filter((x) => x.correction[2] === 'stem')) {
          stem = replaceText(stem, item.correction[4], item.correction[5]);
        }
        const explanationJson = version.explanation === null ? null : JSON.stringify(version.explanation);
        await tx`
          insert into question_versions
            (question_id,version,stem,explanation,status,created_at)
          values (${question.id},${nextVersion},${JSON.stringify(stem)}::jsonb,${explanationJson}::jsonb,'approved',now())
        `;

        const options = await tx`
          select order_index,content from answer_options
          where question_id=${question.id} and question_version=${sourceVersion}
          order by order_index
        `;
        for (const option of options) {
          let content = option.content;
          for (const item of questionCorrections.filter(
            (x) => x.correction[2] === 'option' &&
              (x.correction[3] === null || x.correction[3] === option.order_index),
          )) {
            content = replaceText(content, item.correction[4], item.correction[5]);
          }
          await tx`
            insert into answer_options (question_id,question_version,order_index,content)
            values (${question.id},${nextVersion},${option.order_index},${JSON.stringify(content)}::jsonb)
          `;
        }
        await tx`
          insert into correct_answers
            (question_id,question_version,correct_option,explanation_notes)
          select question_id,${nextVersion},correct_option,explanation_notes
          from correct_answers where question_id=${question.id} and question_version=${sourceVersion}
        `;
      }

      await tx`
        insert into content_reviews
          (id,target_type,target_id,target_version,reviewer_id,last_editor_id,status,comments,reviewed_at)
        values (${generateUuidV7()},'group_version',${groupId},${nextVersion},${reviewer.id},${editor.id},
                'approved',${'Owner-authorized confirmed content cleanup: ' + corrections.map((x) => correctionId(x.correction)).join(', ')},now())
      `;
      await tx`
        insert into operator_actions (id,operator_id,action,target_resource,details,timestamp)
        values (${generateUuidV7()},${admin.id},'content.text.bulk_fix',${'question_group:' + groupId},
                ${JSON.stringify({
                  source: 'owner-authorized-maintenance', version: nextVersion,
                  corrections: corrections.map((x) => ({
                    examSlug: x.correction[0], questionNumber: x.correction[1],
                    location: x.correction[2], optionIndex: x.correction[3],
                    from: x.correction[4], to: x.correction[5],
                  })),
                })}::jsonb,now())
      `;
      groupsVersioned += 1;
    }
  });
  return { groupsVersioned };
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

export async function runConfirmedContentCleanup(argv = process.argv.slice(2)): Promise<void> {
  const apply = argv.includes('--apply');
  const corrections = selectCorrections(argv);
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const dbClient = app.get<DbClientInstance>(DB_CLIENT);
    const examService = app.get(ExamService);
    let resolved = await resolveCorrections(dbClient.rawClient, corrections);
    Logger.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run', corrections: resolved.length,
      affectedExams: new Set(resolved.map((x) => x.examId)).size,
      affectedGroups: new Set(resolved.map((x) => x.groupId)).size,
      pendingCorrections: resolved.filter((x) => x.state === 'pending').length,
      pendingIds: resolved.filter((x) => x.state === 'pending').map((x) => correctionId(x.correction)),
    }), 'ConfirmedContentCleanup');
    if (!apply) return;

    const backupPath = await requireBackup();
    const result = await versionContent(dbClient.rawClient, resolved);
    resolved = await resolveCorrections(dbClient.rawClient, corrections);
    if (resolved.some((x) => x.state !== 'applied')) {
      throw new Error('Post-version content verification failed');
    }
    const [admin] = await dbClient.rawClient`select id from users where role='admin' and blocked_at is null`;
    if (!admin) throw new Error('Active admin user is required');
    const affectedExamIds = Array.from(new Set(resolved.map((x) => x.examId)));
    const examIdsToPublish: string[] = [];
    for (const examId of affectedExamIds) {
      if (await examNeedsRepublish(dbClient.rawClient, examId)) examIdsToPublish.push(examId);
    }
    for (const examId of examIdsToPublish) await examService.publishExam(examId, admin.id);
    resolved = await resolveCorrections(dbClient.rawClient, corrections);
    if (resolved.some((x) => x.state !== 'applied')) {
      throw new Error('Final published content verification failed');
    }
    for (const examId of affectedExamIds) {
      if (await examNeedsRepublish(dbClient.rawClient, examId)) {
        throw new Error('Exam still needs republish: ' + examId);
      }
    }
    Logger.log(JSON.stringify({
      groupsVersioned: result.groupsVersioned,
      examsPublished: examIdsToPublish.length,
      correctionsVerified: resolved.length,
      backupPath,
    }), 'ConfirmedContentCleanup');
  } finally {
    await app.close();
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  runConfirmedContentCleanup().catch((error: unknown) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    Logger.error(normalized.message, normalized.stack, 'ConfirmedContentCleanup');
    process.exitCode = 1;
  });
}
