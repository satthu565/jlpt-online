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

export const TARGET_EXAM_SLUG = 'n2-2023-12';
export const TARGET_QUESTION_NUMBER = 73;
export const EXPECTED_AUDIO_SHA256 =
  'b17a55fb1cd1fb3edcdd02338174b0ed3303c186132bbbdc379db4831f745cf2';
export const EXPECTED_BOOKLET_SHA256 =
  '09791b93924b07276581503af2a2bb90eed0bbc499546c23bf584d6b8b88d532';
export const EXPECTED_SCRIPT_SHA256 =
  'db444ed0dc06c8983f78630e8dd058700c534efb035aed7cdf89ee34eb255dff';
export const EXPECTED_IMAGE_SHA256 =
  'e810a3a1ea4216e494df0030791bb7211cc5f93a427c9dbc0f026af2fdd5c2e4';
export const EXPECTED_MANIFEST_SHA256 =
  '0c59e65384b9aab0cab9c09b33ef945f9f4177762fdd6dacda39e1d38b96fbad';
export const EXPECTED_AUDIO_DURATION_MS = 2_936_127;
export const EXPECTED_IMAGE_WIDTH = 542;
export const EXPECTED_IMAGE_HEIGHT = 427;
export const EXPECTED_AUDIO_KEY = `media/${EXPECTED_AUDIO_SHA256}.mp3`;
export const EXPECTED_IMAGE_KEY = `media/${EXPECTED_IMAGE_SHA256}.jpg`;

const EXPECTED_NUMBERS = [
  'L1-1', 'L1-2', 'L1-3', 'L1-4', 'L1-5',
  'L2-1', 'L2-2', 'L2-3', 'L2-4', 'L2-5', 'L2-6',
  'L3-1', 'L3-2', 'L3-3', 'L3-4', 'L3-5',
  'L4-1', 'L4-2', 'L4-3', 'L4-4', 'L4-5', 'L4-6',
  'L4-7', 'L4-8', 'L4-9', 'L4-10', 'L4-11',
  'L5-1', 'L5-2', 'L5-3',
] as const;

interface TimelineEntry {
  groupId: string;
  mediaKey: string;
  startMs: number;
  endMs: number;
  audioStartMs: number;
  audioEndMs: number;
  gapAfterMs: number;
}

interface CanonicalGroup {
  id: string;
  transcript: unknown[];
  questions: Array<{ number: string }>;
}

interface CanonicalManifest {
  exam: {
    slug: string;
    sections: Array<{
      code: string;
      groupIds: string[];
      listeningTimeline: TimelineEntry[];
    }>;
  };
  groups: CanonicalGroup[];
}

interface SourceFile {
  path: string;
  buffer: Buffer;
}

interface LiveQuestion {
  questionNumber: number;
  questionId: string;
  groupId: string;
  sourceVersion: number;
  audioSha256: string | null;
}

interface LiveQuestionRow {
  question_number: number;
  question_id: string;
  group_id: string;
  question_version: number;
  question_status: string;
  group_version: number;
  group_status: string;
  audio_sha256: string | null;
}

interface TargetState {
  examId: string;
  sectionId: string;
  durationSec: number;
  questions: LiveQuestion[];
  state: 'pending' | 'applied';
}

function hash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function loadPinnedFile(envName: string, expectedHash: string): Promise<SourceFile> {
  const path = process.env[envName];
  if (!path) throw new Error(`${envName} is required`);
  const buffer = await readFile(path);
  const actualHash = hash(buffer);
  if (actualHash !== expectedHash) {
    throw new Error(`${envName} has unexpected SHA-256: ${actualHash}`);
  }
  return { path, buffer };
}

export function validateCanonicalManifest(input: CanonicalManifest): {
  groups: CanonicalGroup[];
  timeline: TimelineEntry[];
} {
  if (input.exam.slug !== TARGET_EXAM_SLUG) throw new Error('Unexpected manifest exam slug');
  const section = input.exam.sections.find((candidate) => candidate.code === 'listening');
  if (!section) throw new Error('Canonical listening section not found');
  if (section.groupIds.length !== EXPECTED_NUMBERS.length) {
    throw new Error(`Expected 30 canonical listening groups, found ${section.groupIds.length}`);
  }
  if (section.listeningTimeline.length !== EXPECTED_NUMBERS.length) {
    throw new Error(`Expected 30 canonical timeline entries, found ${section.listeningTimeline.length}`);
  }
  const byId = new Map(input.groups.map((group) => [group.id, group]));
  const groups = section.groupIds.map((id, index) => {
    const group = byId.get(id);
    if (!group) throw new Error(`Canonical group not found: ${id}`);
    if (group.questions.length !== 1 || group.questions[0]?.number !== EXPECTED_NUMBERS[index]) {
      throw new Error(`Unexpected canonical question order at ${id}`);
    }
    if (!Array.isArray(group.transcript) || group.transcript.length === 0) {
      throw new Error(`Canonical transcript is empty: ${id}`);
    }
    return group;
  });
  let previousEnd = 0;
  for (let index = 0; index < section.listeningTimeline.length; index += 1) {
    const item = section.listeningTimeline[index]!;
    if (item.groupId !== section.groupIds[index]) throw new Error('Timeline group order mismatch');
    if (item.mediaKey !== EXPECTED_AUDIO_KEY) throw new Error('Timeline does not use canonical audio');
    if (
      item.startMs !== item.audioStartMs ||
      item.endMs !== item.audioEndMs ||
      item.startMs !== previousEnd ||
      item.endMs <= item.startMs ||
      item.gapAfterMs !== 0
    ) {
      throw new Error(`Invalid canonical timeline entry: ${item.groupId}`);
    }
    previousEnd = item.endMs;
  }
  if (previousEnd !== EXPECTED_AUDIO_DURATION_MS) {
    throw new Error(`Timeline ends at ${previousEnd}, expected ${EXPECTED_AUDIO_DURATION_MS}`);
  }
  return { groups, timeline: section.listeningTimeline };
}

async function loadCanonicalManifest(): Promise<{
  path: string;
  groups: CanonicalGroup[];
  timeline: TimelineEntry[];
}> {
  const source = await loadPinnedFile('N2_LISTENING_MANIFEST', EXPECTED_MANIFEST_SHA256);
  const parsed = JSON.parse(source.buffer.toString('utf8')) as CanonicalManifest;
  return { path: source.path, ...validateCanonicalManifest(parsed) };
}

function timelineUsesCanonicalAudio(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length === EXPECTED_NUMBERS.length &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        (item as Record<string, unknown>)['mediaKey'] === EXPECTED_AUDIO_KEY,
    )
  );
}

async function resolveTarget(sql: DbClientInstance['rawClient']): Promise<TargetState> {
  const sectionRows = await sql`
    select e.id as exam_id, es.id as section_id, es.duration_sec, es.listening_timeline
    from exams e
    join exam_sections es on es.exam_id=e.id and es.code='listening'
    where e.slug=${TARGET_EXAM_SLUG} and e.deleted_at is null
  `;
  const section = sectionRows[0];
  if (!section) throw new Error('Target listening section not found');
  const rows = await sql`
    select ei.order_index + 1 as question_number, q.id as question_id, q.group_id,
           qv.version as question_version, qv.status as question_status,
           gv.version as group_version, gv.status as group_status, gv.audio_sha256
    from exam_items ei
    join questions q on q.id=ei.question_id and q.deleted_at is null
    join lateral (
      select * from question_versions v where v.question_id=q.id order by v.version desc limit 1
    ) qv on true
    join lateral (
      select * from question_group_versions v where v.group_id=q.group_id order by v.version desc limit 1
    ) gv on true
    where ei.exam_id=${section.exam_id} and ei.section_id=${section.section_id}
    order by ei.order_index
  `;
  if (rows.length !== EXPECTED_NUMBERS.length) {
    throw new Error(`Expected 30 live listening questions, found ${rows.length}`);
  }
  const questions: LiveQuestion[] = (rows as LiveQuestionRow[]).map((row, index) => {
    if (row.question_number !== 72 + index) throw new Error('Unexpected live question order');
    if (row.question_status !== 'approved' || row.group_status !== 'approved') {
      throw new Error(`Latest live content is not approved at Q${row.question_number}`);
    }
    if (row.question_version !== row.group_version) {
      throw new Error(`Question/group versions are not aligned at Q${row.question_number}`);
    }
    return {
      questionNumber: row.question_number as number,
      questionId: row.question_id as string,
      groupId: row.group_id as string,
      sourceVersion: row.question_version as number,
      audioSha256: row.audio_sha256 as string | null,
    };
  });
  if (new Set(questions.map((item: LiveQuestion) => item.groupId)).size !== questions.length) {
    throw new Error('Expected one live question per listening group');
  }
  const [imageArtifact] = await sql`
    select exists (
      select 1 from import_artifacts
      where artifact_type='group_media'
        and storage_key=${questions[1]!.groupId + ':' + EXPECTED_IMAGE_KEY}
    ) as exists
  `;
  const audioStates = new Set(
    questions.map((item: LiveQuestion) => item.audioSha256 === EXPECTED_AUDIO_SHA256),
  );
  const timelineApplied = timelineUsesCanonicalAudio(section.listening_timeline);
  const imageApplied = imageArtifact?.exists === true;
  let state: 'pending' | 'applied';
  if (audioStates.size === 1 && audioStates.has(false) && !timelineApplied && !imageApplied) {
    state = 'pending';
  } else if (audioStates.size === 1 && audioStates.has(true) && timelineApplied && imageApplied) {
    state = 'applied';
  } else {
    throw new Error('Target listening content is in a mixed or unexpected state');
  }
  return {
    examId: section.exam_id as string,
    sectionId: section.section_id as string,
    durationSec: section.duration_sec as number,
    questions,
    state,
  };
}

async function requireBackup(): Promise<string> {
  const backupPath = process.env.N2_LISTENING_BACKUP;
  if (!backupPath) throw new Error('N2_LISTENING_BACKUP is required');
  const info = await stat(backupPath);
  if (!info.isFile() || info.size < 1024 * 1024) {
    throw new Error('Backup is missing or unexpectedly small: ' + backupPath);
  }
  return backupPath;
}

function replaceTranscript(content: unknown, transcript: unknown[], contentVersion: number): unknown {
  if (!content || typeof content !== 'object' || Array.isArray(content)) {
    throw new Error('Latest explanation content has an unexpected shape');
  }
  return {
    ...(content as Record<string, unknown>),
    contentVersion,
    origin: 'owner-supplied',
    transcript,
  };
}

async function versionListeningContent(
  sql: DbClientInstance['rawClient'],
  target: TargetState,
  canonicalGroups: CanonicalGroup[],
  canonicalTimeline: TimelineEntry[],
): Promise<void> {
  const [editor] = await sql`select id from users where role='editor' and blocked_at is null`;
  const [reviewer] = await sql`select id from users where role='reviewer' and blocked_at is null`;
  const [admin] = await sql`select id from users where role='admin' and blocked_at is null`;
  if (!editor || !reviewer || !admin || editor.id === reviewer.id) {
    throw new Error('Distinct active editor, reviewer, and admin users are required');
  }
  const mappedTimeline = canonicalTimeline.map((item, index) => ({
    ...item,
    groupId: target.questions[index]!.groupId,
  }));
  await sql.begin(async (tx: DbClientInstance['rawClient']) => {
    for (let index = 0; index < target.questions.length; index += 1) {
      const item = target.questions[index]!;
      const nextVersion = item.sourceVersion + 1;
      const [latest] = await tx`
        select version,status,audio_sha256 from question_group_versions
        where group_id=${item.groupId} order by version desc limit 1 for update
      `;
      if (
        latest?.version !== item.sourceVersion ||
        latest?.status !== 'approved' ||
        latest?.audio_sha256 === EXPECTED_AUDIO_SHA256
      ) {
        throw new Error(`Group changed after preflight at Q${item.questionNumber}`);
      }
      await tx`
        insert into question_group_versions
          (group_id,version,passage,audio_sha256,status,created_at)
        select group_id,${nextVersion},passage,${EXPECTED_AUDIO_SHA256},'approved',now()
        from question_group_versions
        where group_id=${item.groupId} and version=${item.sourceVersion}
      `;
      const questions = await tx`
        select id from questions where group_id=${item.groupId} and deleted_at is null
      `;
      for (const question of questions) {
        const [version] = await tx`
          select stem,explanation from question_versions
          where question_id=${question.id} and version=${item.sourceVersion}
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
        await tx`
          insert into answer_options (question_id,question_version,order_index,content)
          select question_id,${nextVersion},order_index,content
          from answer_options
          where question_id=${question.id} and question_version=${item.sourceVersion}
        `;
        await tx`
          insert into correct_answers
            (question_id,question_version,correct_option,explanation_notes)
          select question_id,${nextVersion},correct_option,explanation_notes
          from correct_answers
          where question_id=${question.id} and question_version=${item.sourceVersion}
        `;
        const [explanation] = await tx`
          select content,locale,author_id,ai_generated,status
          from explanation_versions
          where question_id=${question.id}
          order by version desc limit 1
        `;
        if (!explanation) throw new Error('Latest explanation not found: ' + question.id);
        await tx`
          insert into explanation_versions
            (id,question_id,version,content,locale,author_id,ai_generated,status,created_at)
          values (
            ${generateUuidV7()},${question.id},${nextVersion},
            ${JSON.stringify(
              replaceTranscript(explanation.content, canonicalGroups[index]!.transcript, nextVersion),
            )}::jsonb,
            ${explanation.locale},${explanation.author_id},${explanation.ai_generated},
            ${explanation.status},now()
          )
        `;
      }
      await tx`
        insert into content_reviews
          (id,target_type,target_id,target_version,reviewer_id,last_editor_id,status,comments,reviewed_at)
        values (
          ${generateUuidV7()},'group_version',${item.groupId},${nextVersion},
          ${reviewer.id},${editor.id},'approved',
          'Owner-supplied N2 12/2023 listening booklet, script, and audio',now()
        )
      `;
    }
    const [sourceArtifact] = await tx`
      select job_id from import_artifacts
      where artifact_type='group' and storage_key=${target.questions[1]!.groupId}
      order by created_at asc limit 1
    `;
    if (!sourceArtifact) throw new Error('Original Q73 group import artifact not found');
    await tx`
      insert into import_artifacts (id,job_id,artifact_type,storage_key,created_at)
      values (
        ${generateUuidV7()},${sourceArtifact.job_id},'group_media',
        ${target.questions[1]!.groupId + ':' + EXPECTED_IMAGE_KEY},now()
      )
    `;
    await tx`
      update exam_sections set listening_timeline=${JSON.stringify(mappedTimeline)}::jsonb
      where id=${target.sectionId}
    `;
    await tx`
      insert into operator_actions (id,operator_id,action,target_resource,details,timestamp)
      values (
        ${generateUuidV7()},${admin.id},'content.listening.restore',
        ${'exam:' + target.examId},
        ${JSON.stringify({
          source: 'owner-supplied-listening-folder',
          examSlug: TARGET_EXAM_SLUG,
          questionRange: [72, 101],
          audioSha256: EXPECTED_AUDIO_SHA256,
          audioDurationMs: EXPECTED_AUDIO_DURATION_MS,
          bookletSha256: EXPECTED_BOOKLET_SHA256,
          scriptSha256: EXPECTED_SCRIPT_SHA256,
          q73ImageSha256: EXPECTED_IMAGE_SHA256,
          timelineEntries: mappedTimeline.length,
        })}::jsonb,now()
      )
    `;
  });
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

export async function runN2ListeningSourceRestoration(argv = process.argv.slice(2)): Promise<void> {
  const apply = argv.includes('--apply');
  const [audio, booklet, script, image, manifest] = await Promise.all([
    loadPinnedFile('N2_LISTENING_AUDIO', EXPECTED_AUDIO_SHA256),
    loadPinnedFile('N2_LISTENING_BOOKLET', EXPECTED_BOOKLET_SHA256),
    loadPinnedFile('N2_LISTENING_SCRIPT', EXPECTED_SCRIPT_SHA256),
    loadPinnedFile('N2_LISTENING_Q73_IMAGE', EXPECTED_IMAGE_SHA256),
    loadCanonicalManifest(),
  ]);
  if (!booklet.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Booklet is not a PDF');
  if (!script.buffer.subarray(0, 5).equals(Buffer.from('%PDF-'))) throw new Error('Script is not a PDF');
  if (image.buffer[0] !== 0xff || image.buffer[1] !== 0xd8) throw new Error('Q73 image is not a JPEG');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const dbClient = app.get<DbClientInstance>(DB_CLIENT);
    const mediaService = app.get(MediaService);
    const examService = app.get(ExamService);
    let target = await resolveTarget(dbClient.rawClient);
    if (target.durationSec * 1000 < EXPECTED_AUDIO_DURATION_MS) {
      throw new Error('Canonical audio exceeds the listening section duration');
    }
    Logger.log(
      JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        state: target.state,
        listeningQuestions: target.questions.length,
        timelineEntries: manifest.timeline.length,
        audioPath: audio.path,
        bookletPath: booklet.path,
        scriptPath: script.path,
        imagePath: image.path,
        manifestPath: manifest.path,
      }),
      'N2ListeningSourceRestoration',
    );
    if (!apply || target.state === 'applied') return;
    const backupPath = await requireBackup();
    const audioAsset = await mediaService.uploadMedia(
      audio.buffer,
      'n2-2023-12-listening.mp3',
      'audio/mpeg',
    );
    if (
      audioAsset.sha256 !== EXPECTED_AUDIO_SHA256 ||
      audioAsset.key !== EXPECTED_AUDIO_KEY ||
      audioAsset.durationSec === null ||
      Math.abs(audioAsset.durationSec * 1000 - EXPECTED_AUDIO_DURATION_MS) > 5_000
    ) {
      throw new Error('Stored audio metadata does not match the canonical source');
    }
    const imageAsset = await mediaService.uploadMedia(
      image.buffer,
      'n2-2023-12-q73-seat-map.jpg',
      'image/jpeg',
    );
    if (
      imageAsset.sha256 !== EXPECTED_IMAGE_SHA256 ||
      imageAsset.key !== EXPECTED_IMAGE_KEY ||
      imageAsset.dimensions?.width !== EXPECTED_IMAGE_WIDTH ||
      imageAsset.dimensions?.height !== EXPECTED_IMAGE_HEIGHT
    ) {
      throw new Error('Stored Q73 image metadata does not match the canonical source');
    }
    await dbClient.rawClient`
      update media_assets set rights='owner-supplied'
      where sha256 in (${EXPECTED_AUDIO_SHA256},${EXPECTED_IMAGE_SHA256})
    `;
    await versionListeningContent(dbClient.rawClient, target, manifest.groups, manifest.timeline);
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
    Logger.log(
      JSON.stringify({
        state: target.state,
        examsPublished,
        backupPath,
        audioKey: EXPECTED_AUDIO_KEY,
        q73ImageKey: EXPECTED_IMAGE_KEY,
      }),
      'N2ListeningSourceRestoration',
    );
  } finally {
    await app.close();
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  runN2ListeningSourceRestoration().catch((error: unknown) => {
    const normalized = error instanceof Error ? error : new Error(String(error));
    Logger.error(normalized.message, normalized.stack, 'N2ListeningSourceRestoration');
    process.exitCode = 1;
  });
}
