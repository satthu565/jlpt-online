import crypto from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { DB_CLIENT } from '../common/database/database.module.js';
import { generateUuidV7 } from '../common/utils/uuid.js';
import type { DbClientInstance } from '../db/client.js';
import { ExamService } from '../modules/exam/exam.service.js';
import { MediaService } from '../modules/media/media.service.js';

export const TARGET_EXAM_SLUG = 'n3-2010-12';
export const Q79_IMAGE_SHA256 =
  'd36a9554ff2986e666885440cf0fc9301d611e0b861032d8a8cf1734fd7123dd';
export const Q79_IMAGE_WIDTH = 2197;
export const Q79_IMAGE_HEIGHT = 1053;
export const Q79_IMAGE_KEY = `media/${Q79_IMAGE_SHA256}.png`;

export const SOURCE_FILES = {
  'dap-an.png': '11ff2d90a3640499960ad32bfab59c0a72e626bbef13cd104fa3607ffd395780',
  'mondai 1 - 1 ban.png': 'b174f0f8f987548f4a569b3fa935e5624d17555637766bfcc33160c535d1ae8e',
  'mondai 1 - 2 ban.png': 'ff71d6f37ba20c628f84eac9d85b154e4ae74bbe47eb69a4978233ba40bc6dbc',
  'mondai 1 - 3 ban.png': '5c6c705bab25a6969426e831610e559daf8e370ef0b2f9327535746d051eb166',
  'mondai 1 - 4 ban.png': '632849a1151bce6d0baacdbf3fa65e7f763783f02b3a7d77d6dcb2ecd7d2ca62',
  'mondai 1 - 5 ban.png': Q79_IMAGE_SHA256,
  'mondai 1 - 6 ban.png': '22b985185b0d3cec435b4abcce4b5264058d4a4a637a29dbee9b9c03cceb37d0',
  'mondai 2 - 1 ban.png': 'dc95789ae91dfa3339ff7a9628dcd7a850c8db122920538e2a2fb415f53a4e8c',
  'mondai 2 - 2 ban.png': 'dfca71e3200bb4932c9625452addbf3e739f81bd9e2b4077e8bb485da8af5e96',
  'mondai 2 - 3 ban.png': '458cbb734cd0493bc887f6cbbf1f54a2c6eacb8f9decf80f1ff74c18c75a9ed6',
  'mondai 2 - 4 ban.png': '777c4abb5d66b5a8eae383b5df1faa1886c643943f9a7b9dd5675851dfe511de',
  'mondai 2 - 5 ban.png': 'fbcca2525b4b82580795481586dd98cdf49bc54d883b46e6810e5c47dd1fd679',
  'mondai 2 - 6 ban.png': '4cd25b6b9c18deb4193f1f2543193974121b8ba309d1bfe0fc87f6804818f308',
} as const;

export const RESTORATIONS = [
  { question: 75, answer: 2, options: ['行く日を決める', '人数をかくにんする', 'ホテルをさがす', '先生にそうだんする'] },
  { question: 76, answer: 2, options: ['東京電気に行く', '東京電気に電話する', 'ぶひんを注文する', 'しゅっちょうほうこくを書く'] },
  { question: 77, answer: 1, options: ['ポスターを作る', '音楽を決める', 'ダンスのれんしゅうをする', 'ふくそうのそうだんをする'] },
  { question: 78, answer: 3, options: ['かいぎに出る', 'メールを送る', 'かいぎのきろくを読む', '電話をする'] },
  { question: 79, answer: 2, options: ['1', '2', '3', '4'] },
  { question: 80, answer: 4, options: ['歌を歌う', 'ダンスをする', 'バイオリンをひく', 'ギターをひく'] },
  { question: 81, answer: 4, options: ['プールで泳ぐ', '水の中を歩く', 'ジョギングをする', '自転車に乗る'] },
  { question: 82, answer: 2, options: ['テニスの試合があるから', 'りょうしんと出かけるから', '空港へ行くから', 'アルバイトがあるから'] },
  { question: 83, answer: 1, options: ['お母さんのセーター', 'お母さんのマフラー', '自分のセーター', '自分のマフラー'] },
  { question: 84, answer: 4, options: ['静かだから', '世話をしなくてもいいから', '一人でさびしいから', 'ともだちにもらったから'] },
  { question: 85, answer: 3, options: ['字を書くこと', '食事すること', '頭を洗うこと', 'バス通学すること'] },
  { question: 86, answer: 1, options: ['仕事がしやすいから', '近くにひっこしたから', 'こんでいる電車に乗りたくないから', '電話がかかってくるから'] },
] as const;

type RestorationState = 'pending' | 'applied' | 'invalid';

interface ResolvedRestoration {
  restoration: (typeof RESTORATIONS)[number];
  examId: string;
  questionId: string;
  groupId: string;
  sourceVersion: number;
  state: Exclude<RestorationState, 'invalid'>;
}

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

export function getOptionState(contents: unknown[], expected: readonly string[]): RestorationState {
  if (contents.length !== 4 || expected.length !== 4) return 'invalid';
  const pending = contents.every((content, index) => countText(content, `選択肢${index + 1}`) === 1);
  const applied = contents.every((content, index) => countText(content, expected[index]!) === 1);
  if (pending) return 'pending';
  if (applied) return 'applied';
  return 'invalid';
}

async function loadSourceFiles(): Promise<{
  sourceDir: string;
  q79Buffer: Buffer;
}> {
  const sourceDir = process.env.N3_2010_LISTENING_SOURCE_DIR;
  if (!sourceDir) throw new Error('N3_2010_LISTENING_SOURCE_DIR is required');
  let q79Buffer: Buffer | undefined;
  for (const [name, expectedHash] of Object.entries(SOURCE_FILES)) {
    const buffer = await readFile(path.join(sourceDir, name));
    const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');
    if (actualHash !== expectedHash) throw new Error(`${name} has unexpected SHA-256: ${actualHash}`);
    if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
      throw new Error(`${name} is not a PNG`);
    }
    if (name === 'mondai 1 - 5 ban.png') q79Buffer = buffer;
  }
  if (!q79Buffer) throw new Error('Q79 source image not found');
  if (
    q79Buffer.readUInt32BE(16) !== Q79_IMAGE_WIDTH ||
    q79Buffer.readUInt32BE(20) !== Q79_IMAGE_HEIGHT
  ) {
    throw new Error('Q79 source image dimensions are unexpected');
  }
  return { sourceDir, q79Buffer };
}

async function resolveRestorations(
  sql: DbClientInstance['rawClient'],
): Promise<ResolvedRestoration[]> {
  const resolved: ResolvedRestoration[] = [];
  for (const restoration of RESTORATIONS) {
    const rows = await sql`
      select e.id as exam_id, q.id as question_id, q.group_id,
             qv.version as question_version, qv.status as question_status,
             gv.version as group_version, gv.status as group_status,
             ca.correct_option
      from exams e
      join exam_items ei on ei.exam_id=e.id and ei.order_index=${restoration.question - 1}
      join questions q on q.id=ei.question_id and q.deleted_at is null
      join lateral (
        select * from question_versions v where v.question_id=q.id order by v.version desc limit 1
      ) qv on true
      join lateral (
        select * from question_group_versions v where v.group_id=q.group_id order by v.version desc limit 1
      ) gv on true
      join correct_answers ca on ca.question_id=q.id and ca.question_version=qv.version
      where e.slug=${TARGET_EXAM_SLUG} and e.deleted_at is null
    `;
    const row = rows[0];
    if (!row) throw new Error(`Q${restoration.question}: target not found`);
    if (
      row.question_status !== 'approved' ||
      row.group_status !== 'approved' ||
      row.question_version !== row.group_version ||
      row.correct_option !== restoration.answer
    ) {
      throw new Error(`Q${restoration.question}: unexpected content or answer state`);
    }
    const options = await sql`
      select content from answer_options
      where question_id=${row.question_id} and question_version=${row.question_version}
      order by order_index
    `;
    let state = getOptionState(
      options.map((option: { content: unknown }) => option.content),
      restoration.options,
    );
    if (state === 'invalid') throw new Error(`Q${restoration.question}: options are neither pending nor applied`);
    if (restoration.question === 79) {
      const [artifact] = await sql`
        select exists (
          select 1 from import_artifacts
          where artifact_type='group_media'
            and storage_key=${row.group_id + ':' + Q79_IMAGE_KEY}
        ) as exists
      `;
      const hasMedia = artifact?.exists === true;
      if ((state === 'pending' && hasMedia) || (state === 'applied' && !hasMedia)) state = 'invalid';
      if (state === 'invalid') throw new Error('Q79: image/options state is inconsistent');
    }
    resolved.push({
      restoration,
      examId: row.exam_id as string,
      questionId: row.question_id as string,
      groupId: row.group_id as string,
      sourceVersion: row.question_version as number,
      state,
    });
  }
  if (new Set(resolved.map((item) => item.groupId)).size !== resolved.length) {
    throw new Error('Expected one listening question per target group');
  }
  const states = new Set(resolved.map((item) => item.state));
  if (states.size !== 1) throw new Error('Target questions are partially restored');
  return resolved;
}

async function requireBackup(): Promise<string> {
  const backupPath = process.env.N3_2010_LISTENING_BACKUP;
  if (!backupPath) throw new Error('N3_2010_LISTENING_BACKUP is required');
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
  await sql.begin(async (tx: DbClientInstance['rawClient']) => {
    for (const item of resolved) {
      const nextVersion = item.sourceVersion + 1;
      const [latest] = await tx`
        select version,status from question_group_versions
        where group_id=${item.groupId} order by version desc limit 1 for update
      `;
      if (latest?.version !== item.sourceVersion || latest?.status !== 'approved') {
        throw new Error(`Q${item.restoration.question}: group changed after preflight`);
      }
      await tx`
        insert into question_group_versions
          (group_id,version,passage,audio_sha256,status,created_at)
        select group_id,${nextVersion},passage,audio_sha256,'approved',now()
        from question_group_versions where group_id=${item.groupId} and version=${item.sourceVersion}
      `;
      const questions = await tx`
        select id from questions where group_id=${item.groupId} and deleted_at is null
      `;
      for (const question of questions) {
        await tx`
          insert into question_versions
            (question_id,version,stem,explanation,status,created_at)
          select question_id,${nextVersion},stem,explanation,'approved',now()
          from question_versions where question_id=${question.id} and version=${item.sourceVersion}
        `;
        const options = await tx`
          select order_index,content from answer_options
          where question_id=${question.id} and question_version=${item.sourceVersion}
          order by order_index
        `;
        for (const option of options) {
          const content =
            question.id === item.questionId
              ? replaceText(
                  option.content,
                  `選択肢${option.order_index}`,
                  item.restoration.options[option.order_index - 1]!,
                )
              : option.content;
          await tx`
            insert into answer_options (question_id,question_version,order_index,content)
            values (${question.id},${nextVersion},${option.order_index},${JSON.stringify(content)}::jsonb)
          `;
        }
        await tx`
          insert into correct_answers
            (question_id,question_version,correct_option,explanation_notes)
          select question_id,${nextVersion},correct_option,explanation_notes
          from correct_answers where question_id=${question.id} and question_version=${item.sourceVersion}
        `;
      }
      if (item.restoration.question === 79) {
        const [sourceArtifact] = await tx`
          select job_id from import_artifacts
          where artifact_type='group' and storage_key=${item.groupId}
          order by created_at asc limit 1
        `;
        if (!sourceArtifact) throw new Error('Q79 original group import artifact not found');
        await tx`
          insert into import_artifacts (id,job_id,artifact_type,storage_key,created_at)
          values (
            ${generateUuidV7()},${sourceArtifact.job_id},'group_media',
            ${item.groupId + ':' + Q79_IMAGE_KEY},now()
          )
        `;
      }
      await tx`
        insert into content_reviews
          (id,target_type,target_id,target_version,reviewer_id,last_editor_id,status,comments,reviewed_at)
        values (
          ${generateUuidV7()},'group_version',${item.groupId},${nextVersion},${reviewer.id},${editor.id},
          'approved','Owner-supplied N3 12/2010 listening choices for Q75-86',now()
        )
      `;
    }
    await tx`
      insert into operator_actions (id,operator_id,action,target_resource,details,timestamp)
      values (
        ${generateUuidV7()},${admin.id},'content.options.restore',${'exam:' + resolved[0]!.examId},
        ${JSON.stringify({
          source: 'owner-supplied-listening-slides',
          examSlug: TARGET_EXAM_SLUG,
          questionRange: [75, 86],
          answersVerified: RESTORATIONS.map((item) => item.answer),
          q79ImageKey: Q79_IMAGE_KEY,
          sourceHashes: SOURCE_FILES,
        })}::jsonb,now()
      )
    `;
  });
  return resolved.length;
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

export async function runN3ListeningOptionRestoration(argv = process.argv.slice(2)): Promise<void> {
  const apply = argv.includes('--apply');
  const sources = await loadSourceFiles();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const dbClient = app.get<DbClientInstance>(DB_CLIENT);
    const examService = app.get(ExamService);
    const mediaService = app.get(MediaService);
    let resolved = await resolveRestorations(dbClient.rawClient);
    Logger.log(
      JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        state: resolved[0]!.state,
        restorations: resolved.length,
        sourceDir: sources.sourceDir,
        answerSequence: RESTORATIONS.map((item) => item.answer),
      }),
      'N3ListeningOptionRestoration',
    );
    if (!apply || resolved[0]!.state === 'applied') return;
    const backupPath = await requireBackup();
    const imageAsset = await mediaService.uploadMedia(
      sources.q79Buffer,
      'n3-2010-12-q79-listening-choices.png',
      'image/png',
    );
    if (
      imageAsset.sha256 !== Q79_IMAGE_SHA256 ||
      imageAsset.key !== Q79_IMAGE_KEY ||
      imageAsset.dimensions?.width !== Q79_IMAGE_WIDTH ||
      imageAsset.dimensions?.height !== Q79_IMAGE_HEIGHT
    ) {
      throw new Error('Stored Q79 image metadata does not match the source');
    }
    await dbClient.rawClient`
      update media_assets set rights='owner-supplied' where sha256=${Q79_IMAGE_SHA256}
    `;
    const groupsVersioned = await versionContent(dbClient.rawClient, resolved);
    resolved = await resolveRestorations(dbClient.rawClient);
    if (resolved.some((item) => item.state !== 'applied')) {
      throw new Error('Post-version restoration verification failed');
    }
    const [admin] =
      await dbClient.rawClient`select id from users where role='admin' and blocked_at is null`;
    if (!admin) throw new Error('Active admin user is required');
    let examsPublished = 0;
    if (await examNeedsRepublish(dbClient.rawClient, resolved[0]!.examId)) {
      await examService.publishExam(resolved[0]!.examId, admin.id);
      examsPublished = 1;
    }
    if (await examNeedsRepublish(dbClient.rawClient, resolved[0]!.examId)) {
      throw new Error('Exam still needs republish');
    }
    Logger.log(
      JSON.stringify({
        state: 'applied',
        groupsVersioned,
        examsPublished,
        backupPath,
        q79ImageKey: Q79_IMAGE_KEY,
      }),
      'N3ListeningOptionRestoration',
    );
  } finally {
    await app.close();
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  runN3ListeningOptionRestoration().catch((error: unknown) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    Logger.error(normalized.message, normalized.stack, 'N3ListeningOptionRestoration');
    process.exitCode = 1;
  });
}
