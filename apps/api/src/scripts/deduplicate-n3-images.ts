import crypto from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module.js';
import { DB_CLIENT, setTestDbClient } from '../common/database/database.module.js';
import { createDbClient, type DbClientInstance } from '../db/client.js';
import { generateUuidV7 } from '../common/utils/uuid.js';
import { ExamService } from '../modules/exam/exam.service.js';
import { resolve, version, needsPublish, patchState } from './repair-n3-content.js';

type RepairPlan = Parameters<typeof resolve>[1];
export function singleDisplayPlan(source: RepairPlan): RepairPlan {
  const patches = source.patches.filter((p) => p.field === 'passage' && source.images.some((i) => i.slug === p.slug && i.num === p.num)).map((p) => ({ ...p, before: p.after, after: [], reason: 'Single image display: move the reviewed image from inline passage to group_media; preserve all text and answer keys' }));
  if (patches.length !== 18 || patches.some((p) => !Array.isArray(p.before) || p.before.length !== 1 || typeof p.before[0] !== 'object' || p.before[0] === null || Array.isArray(p.before[0]) || p.before[0].type !== 'image')) throw new Error('Expected exactly 18 reviewed image-only passages');
  return { ...source, auditId: 'n3-single-image-display-2026-11-03', patches };
}
export async function run(argv = process.argv.slice(2)): Promise<void> {
  const file = process.env.N3_REPAIR_PLAN;
  if (!file || !process.env.DATABASE_URL) throw new Error('N3_REPAIR_PLAN and DATABASE_URL required');
  const text = (await readFile(file, 'utf8')).replace(/\r\n/g, '\n');
  const expectedHash = 'fca6bb449b180fb9e9c7aae74849e04fff5f33ba46b5d3d7c0951b8b8b5d4217';
  if (crypto.createHash('sha256').update(text).digest('hex') !== expectedHash) throw new Error('Reviewed manifest hash differs');
  const source = JSON.parse(text) as RepairPlan;
  const plan = singleDisplayPlan(source);
  setTestDbClient(await createDbClient());
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const sql = app.get<DbClientInstance>(DB_CLIENT).rawClient;
    let targets = await resolve(sql, plan);
    const pending = targets.filter((t) => t.patches.some((p) => patchState(t.values[p.field], p) === 'pending')).length;
    let missingLinks = 0;
    for (const target of targets) {
      const img = source.images.find((i) => i.slug === target.patches[0]!.slug && i.num === target.patches[0]!.num)!;
      const key = `media/${img.sha256}.png`;
      const [asset] = await sql`select key,mime from media_assets where sha256=${img.sha256}`;
      if (!asset || asset.key !== key || asset.mime !== 'image/png') throw new Error('Reviewed image asset missing');
      const [link] = await sql`select id from import_artifacts where artifact_type='group_media' and storage_key=${target.groupId + ':' + key} limit 1`;
      if (!link) missingLinks++;
    }
    Logger.warn(JSON.stringify({mode:argv.includes('--apply')?'apply':'dry-run',images:18,pendingPassages:pending,missingLinks}), 'N3SingleImageDisplay');
    if (!argv.includes('--apply')) return;
    const backup = process.env.N3_REPAIR_BACKUP;
    if (!backup || (await stat(backup)).size < 1024 * 1024) throw new Error('Database backup required');
    const groupsVersioned = await version(sql, targets, plan.auditId);
    const [admin] = await sql`select id from users where role='admin' and blocked_at is null`;
    // Resume safely after a crash between content versioning and media linkage/publication.
    await sql.begin(async (tx: DbClientInstance['rawClient']) => {
      for (const target of targets) {
        const img = source.images.find((i) => i.slug === target.patches[0]!.slug && i.num === target.patches[0]!.num)!;
        const key = `${target.groupId}:media/${img.sha256}.png`;
        const [existing] = await tx`select id from import_artifacts where artifact_type='group_media' and storage_key=${key} limit 1`;
        if (existing) continue;
        const [origin] = await tx`select job_id from import_artifacts where artifact_type='group' and storage_key=${target.groupId} order by created_at limit 1`;
        if (!origin) throw new Error('Group import provenance missing');
        await tx`insert into import_artifacts (id,job_id,artifact_type,storage_key,created_at) values (${generateUuidV7()},${origin.job_id},'group_media',${key},now())`;
        await tx`insert into operator_actions (id,operator_id,action,target_resource,details,timestamp) values (${generateUuidV7()},${admin.id},'content.n3.media_link',${'question_group:'+target.groupId},${JSON.stringify({auditId:plan.auditId,imageSha256:img.sha256})}::jsonb,now())`;
      }
    });
    const exams = new Set(targets.map((t) => t.examId));
    let examsPublished = 0;
    for (const id of exams) if (await needsPublish(sql, id)) { await app.get(ExamService).publishExam(id,admin.id); examsPublished++; }
    targets = await resolve(sql, plan);
    if (targets.some((t) => t.patches.some((p) => patchState(t.values[p.field], p) !== 'applied'))) throw new Error('Inline image remains');
    for (const id of exams) if (await needsPublish(sql, id)) throw new Error('Publication incomplete');
    // Verify every expected image still has its one media link after publication.
    for (const t of targets) {
      const img=source.images.find((i)=>i.slug===t.patches[0]!.slug&&i.num===t.patches[0]!.num)!;
      const [row]=await sql`select count(*)::int n from import_artifacts where artifact_type='group_media' and storage_key=${t.groupId+':media/'+img.sha256+'.png'}`;
      if (row.n!==1) throw new Error('Expected one group media link');
    }
    Logger.warn(JSON.stringify({groupsVersioned,examsPublished,imagesVerified:18}), 'N3SingleImageDisplay');
  } finally { await app.close(); }
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)run().catch((e:unknown)=>{Logger.error(e instanceof Error?e.stack:String(e));process.exitCode=1;});
