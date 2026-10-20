import { and, eq } from 'drizzle-orm';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { extractSafeZip } from '../media/zip-security.js';
import { toDeterministicUuid } from '../blueprint/blueprint.service.js';

interface PackageTimelineEntry {
  groupId: string;
  mediaKey: string;
  startMs: number;
  endMs: number;
  audioStartMs: number;
  audioEndMs: number;
  gapAfterMs: number;
}

interface PackageJson {
  packageId: string;
  revision: number;
  exam: { slug: string; sections: { code: string; listeningTimeline?: PackageTimelineEntry[] }[] };
  groups: { id: string; mediaKeys?: string[] }[];
  media: { path: string; sha256: string }[];
}

export interface BackfillResult {
  examSlug: string;
  sections: number;
  groupsAudioFixed: number;
}

/**
 * Restores what imports made before migration 0006 dropped: the section listening timeline and the group
 * audio (an image of the group could be stored as its audio). Reads the original package zip; safe to re-run.
 * The exam must be republished afterwards so the student snapshot carries the timeline.
 */
export async function backfillListeningTimeline(
  dbClient: DbClientInstance,
  zipBuffer: Buffer,
): Promise<BackfillResult> {
  const files = extractSafeZip(zipBuffer);
  const raw = files['import.json'];
  if (!raw) throw new Error('Gói nhập thiếu import.json');
  const pkg = JSON.parse(Buffer.from(raw).toString('utf8')) as PackageJson;

  const exam = (
    await dbClient.db.select().from(schema.exams).where(eq(schema.exams.slug, pkg.exam.slug)).limit(1)
  )[0];
  if (!exam) throw new Error(`Chưa có đề ${pkg.exam.slug} trong cơ sở dữ liệu`);

  let sections = 0;
  for (const section of pkg.exam.sections) {
    if (!section.listeningTimeline || section.listeningTimeline.length === 0) continue;
    const listeningTimeline = section.listeningTimeline.map((t) => ({
      ...t,
      groupId: toDeterministicUuid(`${pkg.packageId}:group:${t.groupId}`),
    }));
    const updated = await dbClient.db
      .update(schema.examSections)
      .set({ listeningTimeline })
      .where(and(eq(schema.examSections.examId, exam.id), eq(schema.examSections.code, section.code)))
      .returning({ id: schema.examSections.id });
    sections += updated.length;
  }

  let groupsAudioFixed = 0;
  for (const group of pkg.groups) {
    const audioKey = group.mediaKeys?.find((k) => k.endsWith('.wav') || k.endsWith('.mp3'));
    const audioSha256 = audioKey ? (pkg.media.find((m) => m.path === audioKey)?.sha256 ?? null) : null;
    const groupId = toDeterministicUuid(`${pkg.packageId}:group:${group.id}`);
    const versions = await dbClient.db
      .select()
      .from(schema.questionGroupVersions)
      .where(eq(schema.questionGroupVersions.groupId, groupId));
    for (const v of versions) {
      if (v.audioSha256 === audioSha256) continue;
      await dbClient.db
        .update(schema.questionGroupVersions)
        .set({ audioSha256 })
        .where(
          and(
            eq(schema.questionGroupVersions.groupId, groupId),
            eq(schema.questionGroupVersions.version, v.version),
          ),
        );
      groupsAudioFixed++;
    }
  }

  return { examSlug: pkg.exam.slug, sections, groupsAudioFixed };
}
