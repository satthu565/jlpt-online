import { BadRequestException, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { DbClientInstance } from '../../db/client.js';
import { entryMeanings, lexicalEntries } from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { AuditService } from '../audit/audit.service.js';
import type { DbTx } from '../outbox/outbox.service.js';

export interface MeaningRow {
  meaning: string;
  locale: string;
  senseIndex: number;
  glossOrder?: number;
  contentType?: MeaningContentType;
  pos: string | null;
}

export type MeaningContentType = 'summary' | 'gloss' | 'explanation';

type StoredMeaningRow = MeaningRow & {
  id: string;
  entryId: string;
  glossOrder: number;
  contentType: MeaningContentType;
};

export interface LexiconMeaningSense {
  senseIndex: number;
  english: string[];
  vietnamese: string[];
  summary: string | null;
  explanation: string | null;
  partOfSpeech: string | null;
}

export interface LocalizedMeaningSection {
  senseIndex: number;
  summary?: string;
  meanings: string[];
  explanation?: string;
}

function contentTypeOf(row: MeaningRow): MeaningContentType {
  return row.contentType ?? 'gloss';
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/** Prefer the requested language per sense, retaining English for untranslated senses. */
export function localizedMeanings<T extends MeaningRow>(rows: T[], locale: string): T[] {
  const indices = [...new Set(rows.map((row) => row.senseIndex))].sort((a, b) => a - b);
  return indices.flatMap((index) => {
    const group = rows.filter((row) => row.senseIndex === index);
    const translated = group.filter((row) => row.locale === locale && contentTypeOf(row) !== 'explanation');
    const english = group.filter((row) => row.locale === 'en' && contentTypeOf(row) !== 'explanation');
    return translated.length ? translated : english.length ? english : group;
  });
}

/** Build structured sections without treating explanatory prose as a synonym or independent sense. */
export function localizedMeaningSections(rows: MeaningRow[], locale: string): LocalizedMeaningSection[] {
  const indices = [...new Set(rows.map((row) => row.senseIndex))].sort((a, b) => a - b);
  return indices.map((senseIndex) => {
    const group = rows.filter((row) => row.senseIndex === senseIndex);
    const requested = group.filter((row) => row.locale === locale);
    const fallback = group.filter((row) => row.locale === 'en');
    const requestedDisplay = requested.filter((row) => contentTypeOf(row) !== 'explanation');
    const display = requestedDisplay.length ? requested : fallback;
    const summary = requested.find((row) => contentTypeOf(row) === 'summary')?.meaning;
    const explanation = requested.find((row) => contentTypeOf(row) === 'explanation')?.meaning;
    return {
      senseIndex,
      ...(summary ? { summary } : {}),
      meanings: unique(display.filter((row) => contentTypeOf(row) === 'gloss').map((row) => row.meaning)),
      ...(explanation ? { explanation } : {}),
    };
  });
}

export function groupMeaningSenses(rows: MeaningRow[], fallbackPos: string | null): LexiconMeaningSense[] {
  const groups = new Map<number, LexiconMeaningSense>();
  for (const row of rows) {
    if (row.locale !== 'en' && row.locale !== 'vi') continue;
    const group = groups.get(row.senseIndex) ?? {
      senseIndex: row.senseIndex,
      english: [],
      vietnamese: [],
      summary: null,
      explanation: null,
      partOfSpeech: row.pos ?? fallbackPos,
    };
    const contentType = contentTypeOf(row);
    if (row.locale === 'en') {
      if (contentType !== 'explanation') group.english.push(row.meaning);
    } else if (contentType === 'summary') {
      group.summary ??= row.meaning;
    } else if (contentType === 'explanation') {
      group.explanation ??= row.meaning;
    } else {
      group.vietnamese.push(row.meaning);
    }
    groups.set(row.senseIndex, group);
  }
  return [...groups.values()].sort((a, b) => a.senseIndex - b.senseIndex);
}

const inputSchema = z
  .object({
    senses: z
      .array(
        z
          .object({
            senseIndex: z.number().int().min(0),
            meanings: z.array(z.string().trim().min(1).max(2000)).max(30),
            summary: z.string().trim().max(2000).optional().default(''),
            explanation: z.string().trim().max(5000).optional().default(''),
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
  .refine((input) => new Set(input.senses.map((s) => s.senseIndex)).size === input.senses.length, 'Duplicate sense index');

export async function updateVietnameseMeanings(dbClient: DbClientInstance, entryId: string, body: unknown, operatorId: string) {
  if (!z.string().uuid().safeParse(entryId).success) throw new BadRequestException('Mã mục từ không hợp lệ.');
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) throw new BadRequestException('Nghĩa tiếng Việt không hợp lệ: mỗi nhóm nghĩa cần chỉ số duy nhất và các nghĩa không rỗng.');
  const totalLength = parsed.data.senses.reduce((sum, sense) => sum + sense.summary.length + sense.explanation.length + sense.meanings.join('').length, 0);
  if (totalLength > 50000) throw new BadRequestException('Nội dung nghĩa tiếng Việt quá dài.');
  return dbClient.db.transaction(async (tx: DbTx) => {
    const [entry] = await tx.select().from(lexicalEntries).where(eq(lexicalEntries.id, entryId)).for('update');
    if (!entry) throw new NotFoundException('Không tìm thấy mục từ.');
    const rows = await tx
      .select()
      .from(entryMeanings)
      .where(eq(entryMeanings.entryId, entryId))
      .orderBy(entryMeanings.senseIndex, entryMeanings.glossOrder, entryMeanings.id);
    const groups = groupMeaningSenses(rows, entry.partOfSpeech);
    if (!groups.length)
      groups.push({
        senseIndex: 0,
        english: [],
        vietnamese: [],
        summary: null,
        explanation: null,
        partOfSpeech: entry.partOfSpeech,
      });
    const byIndex = new Map(groups.map((s) => [s.senseIndex, s]));
    for (const sense of parsed.data.senses) {
      if (!byIndex.has(sense.senseIndex)) throw new BadRequestException('Nhóm nghĩa không tồn tại trong mục từ.');
    }
    const next = parsed.data.senses
      .sort((a, b) => a.senseIndex - b.senseIndex)
      .flatMap((s) => {
        const pos = byIndex.get(s.senseIndex)!.partOfSpeech;
        const summary = s.summary.normalize('NFC');
        const explanation = s.explanation.normalize('NFC');
        const meanings = [...new Set(s.meanings.map((m) => m.normalize('NFC')))];
        const result: StoredMeaningRow[] = [];
        if (summary)
          result.push({
            id: generateUuidV7(),
            entryId,
            locale: 'vi',
            meaning: summary,
            senseIndex: s.senseIndex,
            glossOrder: 0,
            contentType: 'summary',
            pos,
          });
        result.push(
          ...meanings.map((meaning, index) => ({
            id: generateUuidV7(),
            entryId,
            locale: 'vi',
            meaning,
            senseIndex: s.senseIndex,
            glossOrder: index + (summary ? 1 : 0),
            contentType: 'gloss' as const,
            pos,
          })),
        );
        if (explanation)
          result.push({
            id: generateUuidV7(),
            entryId,
            locale: 'vi',
            meaning: explanation,
            senseIndex: s.senseIndex,
            glossOrder: meanings.length + (summary ? 1 : 0),
            contentType: 'explanation',
            pos,
          });
        return result;
      });
    await tx.delete(entryMeanings).where(and(eq(entryMeanings.entryId, entryId), eq(entryMeanings.locale, 'vi')));
    if (next.length) await tx.insert(entryMeanings).values(next);
    await new AuditService({ ...dbClient, db: tx }).recordAction({
      operatorId,
      action: 'lexicon.vietnamese.update',
      targetResource: `lexical_entries:${entryId}`,
      details: { before: rows.filter((r) => r.locale === 'vi'), after: next },
    });
    return {
      id: entryId,
      meaningsVi: next.filter((r) => r.contentType !== 'explanation').map((r) => r.meaning),
      meaningSenses: groupMeaningSenses([...rows.filter((r) => r.locale !== 'vi'), ...next], entry.partOfSpeech),
    };
  });
}
