import crypto from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { DB_CLIENT, setTestDbClient } from '../common/database/database.module.js';
import { createDbClient, type DbClientInstance } from '../db/client.js';
import { ExamService } from '../modules/exam/exam.service.js';
import { MediaService } from '../modules/media/media.service.js';
import { canonical, needsPublish, patchState, resolve, version } from './repair-n3-content.js';

type Plan = Parameters<typeof resolve>[1] & {
  patches: (Parameters<typeof resolve>[1]['patches'][number] & { questionId: string; groupId: string })[];
};
const MANIFEST_SHA256 = '9f8f4bed3529826fe268fadcf17758c046b9bc50c8ed743444e042e90c2cfa6b';
export function parsePlan(raw: string): Plan {
  const buffer = raw.replace(/\r\n/g, '\n');
  if (crypto.createHash('sha256').update(buffer).digest('hex') !== MANIFEST_SHA256) throw new Error('Manifest integrity failure');
  const plan = JSON.parse(buffer) as Plan;
  if (plan.auditId !== 'n5-ocr-dot1-2026-11-05' || plan.patches.length !== 49 || plan.images.length !== 1) throw new Error('Unexpected manifest');
  return plan;
}
export async function run(argv = process.argv.slice(2)): Promise<void> {
  const plan = parsePlan(await readFile(process.env.N5_OCR_PLAN ?? new URL('./n5-ocr-dot1-plan.json', import.meta.url), 'utf8'));
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required; in-memory fallback forbidden');
  setTestDbClient(await createDbClient());
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['warn', 'error'] });
  try {
    const sql = app.get<DbClientInstance>(DB_CLIENT).rawClient;
    let targets = await resolve(sql, plan);
    for (const p of plan.patches) {
      const target = targets.find((t) => t.patches.some((x) => x === p));
      if (target?.questionId !== p.questionId || target.groupId !== p.groupId) throw new Error('Question identity changed: ' + p.slug + ':' + p.num);
    }
    const pending = targets.flatMap((t) => t.patches.filter((p) => patchState(t.values[p.field], p) === 'pending'));
    const buffers = new Map<string, Buffer>();
    for (const image of plan.images) {
      const bytes = await readFile(path.join(process.env.N5_OCR_MEDIA_DIR ?? '', image.file));
      if (crypto.createHash('sha256').update(bytes).digest('hex') !== image.sha256 || bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.readUInt32BE(16) !== image.width || bytes.readUInt32BE(20) !== image.height) throw new Error('Image integrity failure');
      buffers.set(image.file, bytes);
    }
    Logger.warn(JSON.stringify({ mode: argv.includes('--apply') ? 'apply' : 'dry-run', patches: plan.patches.length, pending: pending.length, questions: targets.length, exams: new Set(targets.map((t) => t.examId)).size }), 'N5OCR');
    if (!argv.includes('--apply')) return;
    const backup = process.env.N5_OCR_BACKUP;
    if (!backup || !(await stat(backup)).isFile() || (await stat(backup)).size < 1024 * 1024) throw new Error('Database backup required');
    for (const image of plan.images) {
      const asset = await app.get(MediaService).uploadMedia(buffers.get(image.file)!, image.file, 'image/png');
      if (asset.sha256 !== image.sha256 || asset.key !== 'media/' + image.sha256 + '.png') throw new Error('Stored media differs');
      await sql`update media_assets set rights='owner-supplied' where sha256=${image.sha256}`;
    }
    const groupsVersioned = await version(sql, targets, plan.auditId, 'content.n5.ocr_dot1');
    targets = await resolve(sql, plan);
    if (targets.some((t) => t.patches.some((p) => patchState(t.values[p.field], p) !== 'applied'))) throw new Error('Version verification failed');
    const [admin] = await sql`select id from users where role='admin' and blocked_at is null`;
    const examIds = new Set(targets.map((t) => t.examId));
    let examsPublished = 0;
    for (const id of examIds) if (await needsPublish(sql, id)) {
      await app.get(ExamService).publishExam(id, admin.id);
      examsPublished++;
    }
    // Check the immutable published snapshot, not only the latest authoring rows.
    for (const id of examIds) {
      if (await needsPublish(sql, id)) throw new Error('Exam still needs publication');
      const [exam] = await sql`select published_version from exams where id=${id}`;
      if (!exam?.published_version) throw new Error('Missing published version');
    }
    Logger.warn(JSON.stringify({ groupsVersioned, examsPublished, patchesVerified: plan.patches.length }), 'N5OCR');
  } finally { await app.close(); }
}
export { canonical, patchState };
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) run().catch((error: unknown) => {
  Logger.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
