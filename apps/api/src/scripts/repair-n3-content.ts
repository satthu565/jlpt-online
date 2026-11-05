import crypto from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { DB_CLIENT, setTestDbClient } from '../common/database/database.module.js';
import { generateUuidV7 } from '../common/utils/uuid.js';
import { createDbClient, type DbClientInstance } from '../db/client.js';
import { ExamService } from '../modules/exam/exam.service.js';
import { MediaService } from '../modules/media/media.service.js';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Field = 'stem' | 'passage' | 'options' | 'explanation' | 'explanation_vi' | 'correct_option';
interface Patch { slug: string; num: number; field: Field; before: Json; after: Json; answerBefore: number; reason: string }
interface ImageSpec { slug: string; num: number; file: string; sha256: string; width: number; height: number; source: string; sourceSha256: string; page: number }
interface Plan { auditId: string; patches: Patch[]; images: ImageSpec[] }
interface Target {
  examId: string; questionId: string; groupId: string; sourceVersion: number;
  values: Record<Field, Json>; patches: Patch[];
}

// Object key ordering and contentVersion are not semantic content differences.
export function canonical(value: unknown): string {
  function normalize(v: unknown): unknown {
    if (Array.isArray(v)) return v.map(normalize);
    if (v !== null && typeof v === 'object') return Object.fromEntries(
      Object.entries(v).filter(([key]) => key !== 'contentVersion').sort(([a], [b]) => a.localeCompare(b)).map(([key, x]) => [key, normalize(x)]),
    );
    return v;
  }
  return JSON.stringify(normalize(value));
}
export function patchState(current: unknown, patch: Pick<Patch, 'before' | 'after'>): 'pending' | 'applied' {
  if (canonical(current) === canonical(patch.after)) return 'applied';
  if (canonical(current) === canonical(patch.before)) return 'pending';
  throw new Error('Content differs from both reviewed before and after values');
}
function imageKeys(v: Json): string[] {
  if (Array.isArray(v)) return v.flatMap(imageKeys);
  if (v !== null && typeof v === 'object') {
    const own = (v.type === 'image' || v.t === 'image') && typeof v.mediaKey === 'string' ? [v.mediaKey] : [];
    return own.concat(Object.values(v).flatMap(imageKeys));
  }
  return [];
}
export async function resolve(sql: DbClientInstance['rawClient'], plan: Plan): Promise<Target[]> {
  const targets: Target[] = [];
  const groups = new Map<string, Patch[]>();
  for (const patch of plan.patches) {
    const key = patch.slug + ':' + patch.num;
    groups.set(key, [...(groups.get(key) ?? []), patch]);
  }
  for (const patches of groups.values()) {
    const p = patches[0]!;
    const [row] = await sql`
      select e.id exam_id,q.id question_id,q.group_id,qv.version,qv.status,qv.stem,qv.explanation,
             gv.version group_version,gv.status group_status,gv.passage,ca.correct_option
      from exams e join exam_items ei on ei.exam_id=e.id and ei.order_index=${p.num - 1}
      join questions q on q.id=ei.question_id and q.deleted_at is null
      join lateral (select * from question_versions v where v.question_id=q.id order by version desc limit 1) qv on true
      join lateral (select * from question_group_versions v where v.group_id=q.group_id order by version desc limit 1) gv on true
      join correct_answers ca on ca.question_id=q.id and ca.question_version=qv.version
      where e.slug=${p.slug} and e.deleted_at is null
    `;
    if (!row || row.status !== 'approved' || row.group_status !== 'approved' || row.version !== row.group_version) throw new Error('Unapproved or unaligned target: ' + p.slug + ':' + p.num);
    const options = await sql`select order_index,content from answer_options where question_id=${row.question_id} and question_version=${row.version} order by order_index`;
    const [explanation] = await sql`select content from explanation_versions where question_id=${row.question_id} and locale='vi' order by version desc limit 1`;
    const values = { stem: row.stem, passage: row.passage, options: Array.from(options), explanation: row.explanation, explanation_vi: explanation?.content ?? null, correct_option: row.correct_option } as Record<Field, Json>;
    for (const patch of patches) {
      try { patchState(values[patch.field], patch); }
      catch { throw new Error('Preflight mismatch: ' + patch.slug + ':Q' + patch.num + ':' + patch.field); }
    }
    const answerPatch = patches.find((patch) => patch.field === 'correct_option');
    if (row.correct_option !== p.answerBefore && row.correct_option !== answerPatch?.after) throw new Error('Answer changed: ' + p.slug + ':' + p.num);
    targets.push({ examId: row.exam_id, questionId: row.question_id, groupId: row.group_id, sourceVersion: row.version, values, patches });
  }
  return targets;
}
export async function needsPublish(sql: DbClientInstance['rawClient'], examId: string): Promise<boolean> {
  const [row] = await sql`
    select exists (select 1 from exam_items ei join questions q on q.id=ei.question_id
      join lateral (select created_at from question_group_versions gv where gv.group_id=q.group_id order by version desc limit 1) gv on true
      join exams e on e.id=ei.exam_id join exam_versions ev on ev.exam_id=e.id and ev.version=e.published_version
      where ei.exam_id=${examId} and gv.created_at > ev.published_at) needed
  `;
  return row.needed;
}
export async function version(sql: DbClientInstance['rawClient'], targets: Target[], auditId: string, auditAction = 'content.n3.repair'): Promise<number> {
  const [editor] = await sql`select id from users where role='editor' and blocked_at is null`;
  const [reviewer] = await sql`select id from users where role='reviewer' and blocked_at is null`;
  const [admin] = await sql`select id from users where role='admin' and blocked_at is null`;
  if (!editor || !reviewer || !admin || editor.id === reviewer.id) throw new Error('Distinct active editor and reviewer required');
  const byGroup = new Map<string, Target[]>();
  for (const t of targets) byGroup.set(t.groupId, [...(byGroup.get(t.groupId) ?? []), t]);
  let changed = 0;
  await sql.begin(async (tx: DbClientInstance['rawClient']) => {
    for (const [groupId, items] of byGroup) {
      const pending = items.flatMap((t) => t.patches.filter((p) => patchState(t.values[p.field], p) === 'pending'));
      if (!pending.length) continue;
      const sourceVersion = items[0]!.sourceVersion;
      const [latest] = await tx`select version,status,passage from question_group_versions where group_id=${groupId} order by version desc limit 1 for update`;
      if (latest.version !== sourceVersion || latest.status !== 'approved') throw new Error('Group changed after preflight: ' + groupId);
      // Re-read content under the group lock to reject concurrent edits before writing.
      const fresh = await resolve(tx, { auditId, patches: items.flatMap((t) => t.patches), images: [] });
      if (fresh.some((t, i) => canonical(t.values) !== canonical(items[i]!.values))) throw new Error('Content changed after preflight');
      const [maxExplanation] = await tx`select max(ev.version) n from explanation_versions ev join questions q on q.id=ev.question_id where q.group_id=${groupId}`;
      const next = Math.max(sourceVersion, Number(maxExplanation.n ?? 0)) + 1;
      const passagePatch = pending.find((p) => p.field === 'passage');
      const passage = passagePatch?.after ?? latest.passage;
      await tx`insert into question_group_versions (group_id,version,passage,audio_sha256,status,created_at)
        select group_id,${next},${JSON.stringify(passage)}::jsonb,audio_sha256,'approved',now() from question_group_versions where group_id=${groupId} and version=${sourceVersion}`;
      const questions = await tx`select id from questions where group_id=${groupId} and deleted_at is null order by id`;
      for (const question of questions) {
        const target = items.find((t) => t.questionId === question.id);
        const desired = (field: Field, fallback: Json) => target?.patches.find((p) => p.field === field)?.after ?? fallback;
        const [qv] = await tx`select stem,explanation from question_versions where question_id=${question.id} and version=${sourceVersion}`;
        if (!qv) throw new Error('Sibling question version missing: ' + question.id);
        await tx`insert into question_versions (question_id,version,stem,explanation,status,created_at) values
          (${question.id},${next},${JSON.stringify(desired('stem', qv.stem))}::jsonb,${qv.explanation === null && !target?.patches.some((p) => p.field === 'explanation') ? null : JSON.stringify(desired('explanation', qv.explanation))}::jsonb,'approved',now())`;
        const oldOptions = await tx`select order_index,content from answer_options where question_id=${question.id} and question_version=${sourceVersion} order by order_index`;
        const options = desired('options', Array.from(oldOptions) as Json) as { order_index: number; content: Json }[];
        for (const option of options) await tx`insert into answer_options (question_id,question_version,order_index,content) values (${question.id},${next},${option.order_index},${JSON.stringify(option.content)}::jsonb)`;
        const [ca] = await tx`select correct_option,explanation_notes from correct_answers where question_id=${question.id} and question_version=${sourceVersion}`;
        await tx`insert into correct_answers (question_id,question_version,correct_option,explanation_notes) values (${question.id},${next},${desired('correct_option', ca.correct_option)},${ca.explanation_notes})`;
        const explanations = await tx`select distinct on (locale) content,locale,author_id,ai_generated from explanation_versions where question_id=${question.id} order by locale,version desc`;
        for (const ev of explanations) {
          const updated = ev.locale === 'vi' && target?.patches.some((p) => p.field === 'explanation_vi');
          const content = updated ? desired('explanation_vi', ev.content) : ev.content;
          const object = content as Record<string, Json>;
          const serialized = { ...object, contentVersion: next };
          await tx`insert into explanation_versions (id,question_id,version,content,locale,author_id,ai_generated,status,created_at) values
            (${generateUuidV7()},${question.id},${next},${JSON.stringify(serialized)}::jsonb,${ev.locale},${updated ? editor.id : ev.author_id},${updated ? false : ev.ai_generated},'approved',now())`;
        }
      }
      if (passagePatch) {
        // Replace only obsolete image associations; old immutable snapshots retain their own media keys.
        for (const key of imageKeys(passagePatch.before)) await tx`delete from import_artifacts where artifact_type='group_media' and storage_key=${groupId + ':' + key}`;
      }
      await tx`insert into content_reviews (id,target_type,target_id,target_version,reviewer_id,last_editor_id,status,comments,reviewed_at)
        values (${generateUuidV7()},'group_version',${groupId},${next},${reviewer.id},${editor.id},'approved',${'Owner-authorized source review: ' + auditId},now())`;
      await tx`insert into operator_actions (id,operator_id,action,target_resource,details,timestamp) values
        (${generateUuidV7()},${admin.id},${auditAction},${'question_group:' + groupId},${JSON.stringify({ auditId, version: next, patches: pending })}::jsonb,now())`;
      changed++;
    }
  });
  return changed;
}
export async function runN3ContentRepair(argv = process.argv.slice(2)): Promise<void> {
  const planPath = process.env.N3_REPAIR_PLAN;
  if (!planPath) throw new Error('N3_REPAIR_PLAN required');
  const planBuffer = (await readFile(planPath, 'utf8')).replace(/\r\n/g, '\n');
  if (crypto.createHash('sha256').update(planBuffer).digest('hex') !== 'fca6bb449b180fb9e9c7aae74849e04fff5f33ba46b5d3d7c0951b8b8b5d4217') throw new Error('Manifest integrity failure');
  const plan = JSON.parse(planBuffer) as Plan;
  if (plan.auditId !== 'n3-content-repair-2026-11-03' || plan.patches.length !== 91 || plan.images.length !== 18) throw new Error('Unexpected repair manifest');
  const buffers = new Map<string, Buffer>();
  for (const img of plan.images) {
    const data = await readFile(path.join(process.env.N3_REPAIR_MEDIA_DIR ?? '', img.file));
    if (crypto.createHash('sha256').update(data).digest('hex') !== img.sha256 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || data.readUInt32BE(16) !== img.width || data.readUInt32BE(20) !== img.height) throw new Error('Image integrity failure: ' + img.file);
    buffers.set(img.file, data);
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required; in-memory fallback is forbidden');
  setTestDbClient(await createDbClient());
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const sql = app.get<DbClientInstance>(DB_CLIENT).rawClient;
    let targets = await resolve(sql, plan);
    const pending = targets.flatMap((t) => t.patches.filter((p) => patchState(t.values[p.field], p) === 'pending'));
    Logger.warn(JSON.stringify({ mode: argv.includes('--apply') ? 'apply' : 'dry-run', patches: plan.patches.length, pending: pending.length, questions: targets.length, exams: new Set(targets.map((t) => t.examId)).size }), 'N3ContentRepair');
    if (!argv.includes('--apply')) return;
    const backup = process.env.N3_REPAIR_BACKUP;
    if (!backup || (await stat(backup)).size < 1024 * 1024) throw new Error('Verified database backup required');
    const media = app.get(MediaService);
    for (const img of plan.images) {
      const asset = await media.uploadMedia(buffers.get(img.file)!, img.file, 'image/png');
      if (asset.sha256 !== img.sha256 || asset.key !== 'media/' + img.sha256 + '.png') throw new Error('Stored image differs: ' + img.file);
      await sql`update media_assets set rights='owner-supplied' where sha256=${img.sha256}`;
    }
    const groupsVersioned = await version(sql, targets, plan.auditId);
    targets = await resolve(sql, plan);
    if (targets.some((t) => t.patches.some((p) => patchState(t.values[p.field], p) !== 'applied'))) throw new Error('Post-version content verification failed');
    const [admin] = await sql`select id from users where role='admin' and blocked_at is null`;
    let examsPublished = 0;
    const examIds = new Set(targets.map((t) => t.examId));
    for (const examId of examIds) if (await needsPublish(sql, examId)) {
      await app.get(ExamService).publishExam(examId, admin.id);
      examsPublished++;
    }
    for (const examId of examIds) if (await needsPublish(sql, examId)) throw new Error('Exam still needs publication: ' + examId);
    Logger.warn(JSON.stringify({ groupsVersioned, examsPublished, patchesVerified: plan.patches.length, imagesVerified: plan.images.length }), 'N3ContentRepair');
  } finally { await app.close(); }
}
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) runN3ContentRepair().catch((error: unknown) => {
  Logger.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
