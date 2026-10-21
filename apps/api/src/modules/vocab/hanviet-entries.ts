// H01: Hán Việt stored on every dictionary entry, plus the review/report operations H02 and H03 build on.
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { and, asc, count, eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import { computeHanViet, type HanVietPerKanji } from '@jlpt/content-tools';
import type { DbClientInstance } from '../../db/client.js';
import {
  entryMeanings,
  entryReadings,
  lexicalEntries,
  lexiconHanvietReports,
  operatorActions,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { setStoredHanViet } from './hanviet-store.js';

export type HanVietConfidence = 'high' | 'review' | 'kun';
export type HanVietSource = 'rule' | 'override' | 'manual';

export interface HanVietBackfillResult {
  total: number;
  updated: number;
  keptManual: number;
  keptReported: number;
  stats: Record<HanVietConfidence, number>;
}

export interface HanVietReviewItem {
  id: string;
  term: string;
  reading: string;
  meaning: string;
  hanViet: string;
  confidence: string;
  source: string;
  perKanji: HanVietPerKanji[];
  reportCount: number;
  updatedAt: string | null;
}

export interface HanVietReviewList {
  total: number;
  page: number;
  pageSize: number;
  items: HanVietReviewItem[];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Per-kanji breakdown for an entry; a manual value keeps the computed On readings but its own syllables. */
export function perKanjiFor(term: string, reading: string | undefined, hanViet: string | null, source: string | null): HanVietPerKanji[] {
  const computed = computeHanViet(term, reading);
  if (source !== 'manual' || !hanViet) return computed.perKanji;
  const syllables = hanViet.split(/\s+/).filter(Boolean);
  return computed.perKanji.map((p, i) => ({ ...p, hanViet: syllables[i] ?? p.hanViet }));
}

async function primaryReadings(db: DbClientInstance['db'], ids: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (ids.length === 0) return out;
  const rows: Array<{ entryId: string; reading: string; isPrimary: boolean }> = await db
    .select({ entryId: entryReadings.entryId, reading: entryReadings.reading, isPrimary: entryReadings.isPrimary })
    .from(entryReadings)
    .where(inArray(entryReadings.entryId, ids));
  for (const r of rows) {
    if (r.isPrimary || !out.has(r.entryId)) out.set(r.entryId, r.reading);
  }
  return out;
}

/**
 * Computes Hán Việt for every dictionary entry from its primary reading. Rows edited by hand (source manual)
 * and rows with an open learner report are left alone, so re-running gives the same result.
 */
export async function backfillHanViet(dbClient: DbClientInstance, batchSize = 2000): Promise<HanVietBackfillResult> {
  const db = dbClient.db;
  const reported: Array<{ entryId: string | null }> = await db
    .selectDistinct({ entryId: lexiconHanvietReports.entryId })
    .from(lexiconHanvietReports)
    .where(eq(lexiconHanvietReports.status, 'open'));
  const reportedIds = new Set(reported.map((r) => r.entryId).filter(Boolean) as string[]);

  const result: HanVietBackfillResult = { total: 0, updated: 0, keptManual: 0, keptReported: 0, stats: { high: 0, review: 0, kun: 0 } };
  let lastId = '';
  for (;;) {
    const rows: Array<{ id: string; term: string; hanViet: string | null; confidence: string | null; source: string | null }> = await db
      .select({
        id: lexicalEntries.id,
        term: lexicalEntries.term,
        hanViet: lexicalEntries.hanViet,
        confidence: lexicalEntries.hanVietConfidence,
        source: lexicalEntries.hanVietSource,
      })
      .from(lexicalEntries)
      .where(lastId ? sql`${lexicalEntries.id} > ${lastId}::uuid` : undefined)
      .orderBy(asc(lexicalEntries.id))
      .limit(batchSize);
    if (rows.length === 0) break;
    lastId = rows[rows.length - 1]!.id;
    const readings = await primaryReadings(db, rows.map((r) => r.id));
    const changes: Array<{ id: string; hanViet: string; confidence: string; source: string }> = [];
    for (const r of rows) {
      result.total += 1;
      if (r.source === 'manual') {
        result.keptManual += 1;
        result.stats[(r.confidence as HanVietConfidence) ?? 'high'] += 1;
        continue;
      }
      const c = computeHanViet(r.term, readings.get(r.id));
      let confidence: HanVietConfidence = c.confidence;
      if (reportedIds.has(r.id)) {
        result.keptReported += 1;
        confidence = 'review';
      }
      result.stats[confidence] += 1;
      if (r.hanViet === c.hanViet && r.confidence === confidence && r.source === c.source) continue;
      changes.push({ id: r.id, hanViet: c.hanViet, confidence, source: c.source });
    }
    if (changes.length > 0) {
      const values = sql.join(
        changes.map((c) => sql`(${c.id}::uuid, ${c.hanViet}, ${c.confidence}, ${c.source})`),
        sql`, `,
      );
      await db.execute(sql`
        update lexical_entries as e
           set han_viet = v.han_viet, han_viet_confidence = v.confidence, han_viet_source = v.source, han_viet_updated_at = now()
          from (values ${values}) as v(id, han_viet, confidence, source)
         where e.id = v.id`);
      result.updated += changes.length;
    }
  }
  await loadStoredHanViet(dbClient);
  return result;
}

/** Fills the in-memory cache used by getHanVietForWord(term); manual and high-confidence rows win for a shared headword. */
export async function loadStoredHanViet(dbClient: DbClientInstance): Promise<number> {
  const rows: Array<{ term: string; hanViet: string | null }> = await dbClient.db
    .select({ term: lexicalEntries.term, hanViet: lexicalEntries.hanViet })
    .from(lexicalEntries)
    .where(sql`${lexicalEntries.hanViet} is not null and ${lexicalEntries.hanViet} <> ''`)
    .orderBy(
      sql`case ${lexicalEntries.hanVietSource} when 'manual' then 0 when 'override' then 1 else 2 end desc`,
      sql`case ${lexicalEntries.hanVietConfidence} when 'high' then 0 when 'kun' then 1 else 2 end desc`,
    );
  // Later rows overwrite earlier ones, so the best row for a headword comes last.
  setStoredHanViet(rows, true);
  return rows.length;
}

export async function listHanVietForReview(
  dbClient: DbClientInstance,
  params: { confidence?: string; q?: string; page?: number; pageSize?: number },
): Promise<HanVietReviewList> {
  const db = dbClient.db;
  const pageSize = Math.min(Math.max(Number(params.pageSize) || 50, 1), 200);
  const page = Math.max(Number(params.page) || 1, 1);
  const conditions: SQL[] = [];
  const confidence = params.confidence?.trim();
  if (confidence) {
    if (!['high', 'review', 'kun'].includes(confidence)) throw new BadRequestException('confidence phải là high, review hoặc kun');
    conditions.push(eq(lexicalEntries.hanVietConfidence, confidence));
  }
  const q = params.q?.trim();
  if (q) {
    const like = `%${q}%`;
    conditions.push(
      or(
        ilike(lexicalEntries.term, like),
        ilike(lexicalEntries.hanViet, like),
        sql`exists (select 1 from entry_readings r where r.entry_id = ${lexicalEntries.id} and r.reading ilike ${like})`,
      )!,
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [{ value: total }] = await db.select({ value: count() }).from(lexicalEntries).where(where);
  const reportCount = sql<number>`(select count(*) from lexicon_hanviet_reports r where r.entry_id = "lexical_entries"."id" and r.status = 'open')`;
  const rows: Array<{
    id: string;
    term: string;
    hanViet: string | null;
    confidence: string | null;
    source: string | null;
    updatedAt: Date | null;
    reportCount: number;
  }> = await db
    .select({
      id: lexicalEntries.id,
      term: lexicalEntries.term,
      hanViet: lexicalEntries.hanViet,
      confidence: lexicalEntries.hanVietConfidence,
      source: lexicalEntries.hanVietSource,
      updatedAt: lexicalEntries.hanVietUpdatedAt,
      reportCount,
    })
    .from(lexicalEntries)
    .where(where)
    .orderBy(sql`${reportCount} desc`, asc(lexicalEntries.term))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const ids = rows.map((r) => r.id);
  const readings = await primaryReadings(db, ids);
  const meanings: Array<{ entryId: string; meaning: string }> = ids.length
    ? await db.select({ entryId: entryMeanings.entryId, meaning: entryMeanings.meaning }).from(entryMeanings).where(inArray(entryMeanings.entryId, ids))
    : [];
  return {
    total: Number(total),
    page,
    pageSize,
    items: rows.map((r) => {
      const reading = readings.get(r.id) ?? '';
      return {
        id: r.id,
        term: r.term,
        reading,
        meaning: meanings.find((m) => m.entryId === r.id)?.meaning ?? '',
        hanViet: r.hanViet ?? '',
        confidence: r.confidence ?? 'review',
        source: r.source ?? 'rule',
        perKanji: perKanjiFor(r.term, reading || undefined, r.hanViet, r.source),
        reportCount: Number(r.reportCount),
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
      };
    }),
  };
}

/** Editor sets an entry's Hán Việt by hand: source manual, confidence high, open reports resolved, audit logged. */
export async function updateEntryHanViet(
  dbClient: DbClientInstance,
  entryId: string,
  hanVietInput: unknown,
  operatorId?: string,
): Promise<{ id: string; term: string; hanViet: string; confidence: 'high'; source: 'manual' }> {
  if (!UUID_RE.test(entryId)) throw new NotFoundException('Không tìm thấy mục từ');
  if (typeof hanVietInput !== 'string') throw new BadRequestException('hanViet phải là chuỗi');
  const hanViet = hanVietInput.normalize('NFC').trim().replace(/\s+/g, ' ').toUpperCase();
  if (hanViet.length === 0 || hanViet.length > 100) throw new BadRequestException('hanViet phải có từ 1 đến 100 ký tự');
  const db = dbClient.db;
  const found: Array<{ id: string; term: string; hanViet: string | null }> = await db
    .select({ id: lexicalEntries.id, term: lexicalEntries.term, hanViet: lexicalEntries.hanViet })
    .from(lexicalEntries)
    .where(eq(lexicalEntries.id, entryId))
    .limit(1);
  const entry = found[0];
  if (!entry) throw new NotFoundException('Không tìm thấy mục từ');
  await db
    .update(lexicalEntries)
    .set({ hanViet, hanVietConfidence: 'high', hanVietSource: 'manual', hanVietUpdatedAt: new Date() })
    .where(eq(lexicalEntries.id, entryId));
  await db
    .update(lexiconHanvietReports)
    .set({ status: 'resolved' })
    .where(and(eq(lexiconHanvietReports.entryId, entryId), eq(lexiconHanvietReports.status, 'open')));
  if (operatorId && UUID_RE.test(operatorId)) {
    await db.insert(operatorActions).values({
      id: generateUuidV7(),
      operatorId,
      action: 'lexicon.hanviet.update',
      targetResource: `lexical_entries:${entryId}`,
      details: { term: entry.term, before: entry.hanViet, after: hanViet },
      timestamp: new Date(),
    });
  }
  setStoredHanViet([{ term: entry.term, hanViet }]);
  return { id: entryId, term: entry.term, hanViet, confidence: 'high', source: 'manual' };
}

/** A learner reports a wrong Hán Việt: the entry goes back to review and the report waits for H03. */
export async function reportHanViet(
  dbClient: DbClientInstance,
  body: { entry?: unknown; reading?: unknown; suggestion?: unknown; note?: unknown },
  userId?: string,
): Promise<{ id: string; entryId: string | null; status: 'open' }> {
  const text = (v: unknown, max: number, field: string): string | null => {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v !== 'string') throw new BadRequestException(`${field} phải là chuỗi`);
    const t = v.normalize('NFC').trim();
    if (t.length > max) throw new BadRequestException(`${field} dài quá ${max} ký tự`);
    return t || null;
  };
  const term = text(body.entry, 100, 'entry');
  if (!term) throw new BadRequestException('Thiếu từ cần báo (entry)');
  const reading = text(body.reading, 100, 'reading');
  const suggestion = text(body.suggestion, 100, 'suggestion');
  const note = text(body.note, 500, 'note');

  const db = dbClient.db;
  let entryId: string | null = null;
  if (reading) {
    const rows: Array<{ id: string }> = await db
      .select({ id: lexicalEntries.id })
      .from(lexicalEntries)
      .innerJoin(entryReadings, eq(entryReadings.entryId, lexicalEntries.id))
      .where(and(eq(lexicalEntries.term, term), eq(entryReadings.reading, reading)))
      .limit(1);
    entryId = rows[0]?.id ?? null;
  }
  if (!entryId) {
    const rows: Array<{ id: string }> = await db.select({ id: lexicalEntries.id }).from(lexicalEntries).where(eq(lexicalEntries.term, term)).limit(1);
    entryId = rows[0]?.id ?? null;
  }
  const id = generateUuidV7();
  await db.insert(lexiconHanvietReports).values({
    id,
    entryId,
    term,
    reading,
    suggestion: suggestion ? suggestion.toUpperCase() : null,
    note,
    userId: userId && UUID_RE.test(userId) ? userId : null,
    status: 'open',
  });
  if (entryId) {
    await db.update(lexicalEntries).set({ hanVietConfidence: 'review', hanVietUpdatedAt: new Date() }).where(eq(lexicalEntries.id, entryId));
  }
  return { id, entryId, status: 'open' };
}
