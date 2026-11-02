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
import { MediaService } from '../modules/media/media.service.js';

export const TARGET_EXAM_SLUG = 'n1-2025-12';
export const TARGET_QUESTION_NUMBER = 68;
export const EXPECTED_IMAGE_SHA256 =
  '60fa452d5319dfe9782115caf80b43d7a6eb92c8456af54b525e055a96a206e6';
export const EXPECTED_IMAGE_WIDTH = 1546;
export const EXPECTED_IMAGE_HEIGHT = 738;
export const EXPECTED_MEDIA_KEY = `media/${EXPECTED_IMAGE_SHA256}.png`;

const OLD_STEM_TEXT =
  '（聴解 問題1 2番：問題用紙に何も印刷されていません。音声を聞いて、1から4の中から、最もよいものを一つ選んでください。）';
const NEW_STEM_TEXT =
  '（聴解 問題1 2番：画像の選択肢を見て、音声を聞き、1から4の中から最もよいものを一つ選んでください。）';
const OLD_OPTIONS = ['選択肢1', '選択肢2', '選択肢3', '選択肢4'] as const;
const NEW_OPTIONS = ['1', '2', '3', '4'] as const;
const NEW_PASSAGE = [
  {
    type: 'image',
    mediaKey: EXPECTED_MEDIA_KEY,
    alt: '問題1 2番 6月の予約日カレンダー（選択肢1〜4）',
    width: EXPECTED_IMAGE_WIDTH,
    height: EXPECTED_IMAGE_HEIGHT,
  },
] as const;

type RestorationState = 'pending' | 'applied' | 'invalid';

interface TargetContent {
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

export function getRestorationState(input: {
  passage: unknown;
  stem: unknown;
  options: unknown[];
}): RestorationState {
  const pendingPassage = Array.isArray(input.passage) && input.passage.length === 0;
  const appliedPassage = countText(input.passage, EXPECTED_MEDIA_KEY) === 1;
  const pendingStem = countText(input.stem, OLD_STEM_TEXT) === 1;
  const appliedStem = countText(input.stem, NEW_STEM_TEXT) === 1;
  const pendingOptions = OLD_OPTIONS.every(
    (text, index) => countText(input.options[index], text) === 1,
  );
  const appliedOptions = NEW_OPTIONS.every(
    (text, index) => countText(input.options[index], text) === 1,
  );

  if (pendingPassage && pendingStem && pendingOptions) return 'pending';
  if (appliedPassage && appliedStem && appliedOptions) return 'applied';
  return 'invalid';
}

async function validateImage(): Promise<{ path: string; buffer: Buffer }> {
  const imagePath = process.env.N1_Q68_IMAGE;
  if (!imagePath) throw new Error('N1_Q68_IMAGE is required');
  const buffer = await readFile(imagePath);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  if (sha256 !== EXPECTED_IMAGE_SHA256) {
    throw new Error(`Unexpected image SHA-256: ${sha256}`);
  }
  const pngSignature = '89504e470d0a1a0a';
  if (buffer.subarray(0, 8).toString('hex') !== pngSignature) {
    throw new Error('The supplied file is not a PNG');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== EXPECTED_IMAGE_WIDTH || height !== EXPECTED_IMAGE_HEIGHT) {
    throw new Error(`Unexpected image dimensions: ${width}x${height}`);
  }
  return { path: imagePath, buffer };
}

async function resolveTarget(sql: DbClientInstance['rawClient']): Promise<TargetContent> {
  const rows = await sql`
    select e.id as exam_id, q.id as question_id, q.group_id,
           qv.version as question_version, qv.status as question_status, qv.stem,
           gv.version as group_version, gv.status as group_status, gv.passage,
           ca.correct_option
    from exams e
    join exam_items ei on ei.exam_id=e.id and ei.order_index=${TARGET_QUESTION_NUMBER - 1}
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
  if (!row) throw new Error('Target question not found');
  if (row.question_status !== 'approved' || row.group_status !== 'approved') {
    throw new Error('Latest target content is not approved');
  }
  if (row.question_version !== row.group_version) {
    throw new Error('Question/group versions are not aligned');
  }
  if (row.correct_option !== 3) {
    throw new Error(`Expected correct option 3, found ${row.correct_option}`);
  }
  const options = await sql`
    select content from answer_options
    where question_id=${row.question_id} and question_version=${row.question_version}
    order by order_index
  `;
  if (options.length !== 4) throw new Error(`Expected four options, found ${options.length}`);
  const state = getRestorationState({
    passage: row.passage,
    stem: row.stem,
    options: options.map((option: { content: unknown }) => option.content),
  });
  if (state === 'invalid') throw new Error('Target content is neither pending nor applied');
  if (state === 'applied') {
    const media = await sql`select key,mime,size,rights from media_assets where sha256=${EXPECTED_IMAGE_SHA256}`;
    if (
      media.length !== 1 ||
      media[0].key !== EXPECTED_MEDIA_KEY ||
      media[0].mime !== 'image/png' ||
      media[0].rights !== 'owner-supplied'
    ) {
      throw new Error('Applied media record is missing or inconsistent');
    }
  }
  return {
    examId: row.exam_id,
    questionId: row.question_id,
    groupId: row.group_id,
    sourceVersion: row.question_version,
    state,
  };
}

async function requireBackup(): Promise<string> {
  const backupPath = process.env.N1_Q68_BACKUP;
  if (!backupPath) throw new Error('N1_Q68_BACKUP is required');
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
      select version,status from question_group_versions
      where group_id=${target.groupId} order by version desc limit 1 for update
    `;
    if (latest?.version !== target.sourceVersion || latest?.status !== 'approved') {
      throw new Error('Group changed after preflight');
    }
    await tx`
      insert into question_group_versions
        (group_id,version,passage,audio_sha256,status,created_at)
      select group_id,${nextVersion},${JSON.stringify(NEW_PASSAGE)}::jsonb,audio_sha256,'approved',now()
      from question_group_versions
      where group_id=${target.groupId} and version=${target.sourceVersion}
    `;

    const questions = await tx`
      select id from questions where group_id=${target.groupId} and deleted_at is null
    `;
    for (const question of questions) {
      const [version] = await tx`
        select stem,explanation from question_versions
        where question_id=${question.id} and version=${target.sourceVersion}
      `;
      if (!version) throw new Error('Question source version missing: ' + question.id);
      const stem =
        question.id === target.questionId
          ? replaceText(version.stem, OLD_STEM_TEXT, NEW_STEM_TEXT)
          : version.stem;
      await tx`
        insert into question_versions
          (question_id,version,stem,explanation,status,created_at)
        values (
          ${question.id},${nextVersion},${JSON.stringify(stem)}::jsonb,
          ${version.explanation === null ? null : JSON.stringify(version.explanation)}::jsonb,
          'approved',now()
        )
      `;

      const options = await tx`
        select order_index,content from answer_options
        where question_id=${question.id} and question_version=${target.sourceVersion}
        order by order_index
      `;
      for (const option of options) {
        const content =
          question.id === target.questionId
            ? replaceText(
                option.content,
                OLD_OPTIONS[option.order_index - 1]!,
                NEW_OPTIONS[option.order_index - 1]!,
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
        from correct_answers where question_id=${question.id} and question_version=${target.sourceVersion}
      `;
    }

    await tx`
      insert into content_reviews
        (id,target_type,target_id,target_version,reviewer_id,last_editor_id,status,comments,reviewed_at)
      values (
        ${generateUuidV7()},'group_version',${target.groupId},${nextVersion},${reviewer.id},${editor.id},
        'approved','Owner-supplied original calendar choices for N1 12/2025 Q68',now()
      )
    `;
    await tx`
      insert into operator_actions (id,operator_id,action,target_resource,details,timestamp)
      values (
        ${generateUuidV7()},${admin.id},'content.media.restore',${'question_group:' + target.groupId},
        ${JSON.stringify({
          source: 'owner-supplied-image',
          examSlug: TARGET_EXAM_SLUG,
          questionNumber: TARGET_QUESTION_NUMBER,
          version: nextVersion,
          mediaKey: EXPECTED_MEDIA_KEY,
          sha256: EXPECTED_IMAGE_SHA256,
          correctOption: 3,
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

export async function runN1Q68ImageRestoration(argv = process.argv.slice(2)): Promise<void> {
  const apply = argv.includes('--apply');
  const image = await validateImage();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const dbClient = app.get<DbClientInstance>(DB_CLIENT);
    const mediaService = app.get(MediaService);
    const examService = app.get(ExamService);
    let target = await resolveTarget(dbClient.rawClient);
    Logger.log(
      JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        state: target.state,
        imagePath: image.path,
        imageSha256: EXPECTED_IMAGE_SHA256,
        imageDimensions: `${EXPECTED_IMAGE_WIDTH}x${EXPECTED_IMAGE_HEIGHT}`,
      }),
      'N1Q68ImageRestoration',
    );
    if (!apply || target.state === 'applied') return;

    const backupPath = await requireBackup();
    const asset = await mediaService.uploadMedia(
      image.buffer,
      'n1-2025-12-q68-calendar-options.png',
      'image/png',
    );
    if (
      asset.sha256 !== EXPECTED_IMAGE_SHA256 ||
      asset.key !== EXPECTED_MEDIA_KEY ||
      asset.dimensions?.width !== EXPECTED_IMAGE_WIDTH ||
      asset.dimensions?.height !== EXPECTED_IMAGE_HEIGHT
    ) {
      throw new Error('Stored media metadata does not match the supplied image');
    }
    await dbClient.rawClient`
      update media_assets set rights='owner-supplied' where sha256=${EXPECTED_IMAGE_SHA256}
    `;
    const contentVersion = await versionContent(dbClient.rawClient, target);
    target = await resolveTarget(dbClient.rawClient);
    if (target.state !== 'applied') throw new Error('Post-version verification failed');

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
    target = await resolveTarget(dbClient.rawClient);
    Logger.log(
      JSON.stringify({
        state: target.state,
        contentVersion,
        examsPublished,
        backupPath,
        mediaKey: asset.key,
      }),
      'N1Q68ImageRestoration',
    );
  } finally {
    await app.close();
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  runN1Q68ImageRestoration().catch((error: unknown) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    Logger.error(normalized.message, normalized.stack, 'N1Q68ImageRestoration');
    process.exitCode = 1;
  });
}
