// Admin "Kanji" level 2: an editor corrects the Hán Việt of one character in kanji_dataset.
// The row becomes source = manual, so re-importing the dataset file never overwrites it; the dataset's original
// han_viet is kept in data.han_viet_goc so the edit can be undone.
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { DbClientInstance } from '../../db/client.js';
import { kanjiDataset, operatorActions } from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LEN = 40;

type HanVietBlock = { chinh?: string; khac?: string[]; theo_am_on?: Record<string, string>; thieu_chuu?: string[] };
type DatasetData = { han_tu: string; han_viet?: HanVietBlock; han_viet_goc?: HanVietBlock; am_on?: Array<{ am: string }> };

export interface KanjiHanVietResult {
  kanji: string;
  hanViet: string;
  hanVietByOnyomi: Array<{ onyomi: string; hanViet: string }>;
  edited: boolean;
}

function normalizeHanViet(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new BadRequestException(`${field} phải là chuỗi`);
  const v = value.normalize('NFC').trim().replace(/\s+/g, ' ').toUpperCase();
  if (v.length > MAX_LEN) throw new BadRequestException(`${field} dài quá ${MAX_LEN} ký tự`);
  return v;
}

async function loadRow(dbClient: DbClientInstance, kanjiInput: string): Promise<{ kanji: string; data: DatasetData; source: string }> {
  const kanji = (kanjiInput ?? '').normalize('NFC');
  const rows: Array<{ kanji: string; data: unknown; source: string }> = await dbClient.db
    .select({ kanji: kanjiDataset.kanji, data: kanjiDataset.data, source: kanjiDataset.source })
    .from(kanjiDataset)
    .where(eq(kanjiDataset.kanji, kanji))
    .limit(1);
  const row = rows[0];
  if (!row) throw new NotFoundException(`Không tìm thấy chữ ${kanji} trong bộ dữ liệu kanji`);
  const data = (typeof row.data === 'string' ? JSON.parse(row.data) : row.data) as DatasetData;
  return { kanji: row.kanji, data, source: row.source };
}

function toResult(kanji: string, data: DatasetData, edited: boolean): KanjiHanVietResult {
  return {
    kanji,
    hanViet: data.han_viet?.chinh ?? '',
    hanVietByOnyomi: Object.entries(data.han_viet?.theo_am_on ?? {}).map(([onyomi, hanViet]) => ({ onyomi, hanViet })),
    edited,
  };
}

async function audit(dbClient: DbClientInstance, operatorId: string | undefined, action: string, kanji: string, details: unknown) {
  if (!operatorId || !UUID_RE.test(operatorId)) return;
  await dbClient.db.insert(operatorActions).values({
    id: generateUuidV7(),
    operatorId,
    action,
    targetResource: `kanji_dataset:${kanji}`,
    details,
    timestamp: new Date(),
  });
}

/**
 * Sets the main Hán Việt (empty is allowed, e.g. kokuji) and optionally the reading per on'yomi. The previous main
 * reading moves to han_viet.khac so search by the old reading still finds the character.
 */
export async function updateKanjiHanViet(
  dbClient: DbClientInstance,
  kanjiInput: string,
  body: { hanViet?: unknown; hanVietByOnyomi?: unknown },
  operatorId?: string,
): Promise<KanjiHanVietResult> {
  const { kanji, data } = await loadRow(dbClient, kanjiInput);
  const hanViet = normalizeHanViet(body?.hanViet, 'hanViet');

  const onyomiSet = new Set((data.am_on ?? []).map((x) => x.am));
  const byOnyomi: Record<string, string> = { ...(data.han_viet?.theo_am_on ?? {}) };
  if (body?.hanVietByOnyomi !== undefined) {
    if (!body.hanVietByOnyomi || typeof body.hanVietByOnyomi !== 'object' || Array.isArray(body.hanVietByOnyomi)) {
      throw new BadRequestException('hanVietByOnyomi phải là object { âm On: Hán Việt }');
    }
    for (const [on, value] of Object.entries(body.hanVietByOnyomi as Record<string, unknown>)) {
      if (!onyomiSet.has(on)) throw new BadRequestException(`${kanji} không có âm On "${on}"`);
      const hv = normalizeHanViet(value, `Hán Việt của ${on}`);
      if (hv) byOnyomi[on] = hv;
      else delete byOnyomi[on];
    }
  }

  const before = data.han_viet ?? {};
  const oldMain = before.chinh ?? '';
  const khac = [...new Set([oldMain, ...(before.khac ?? [])])].filter((x) => x && x !== hanViet);
  const next: DatasetData = {
    ...data,
    han_viet_goc: data.han_viet_goc ?? before,
    han_viet: { ...before, chinh: hanViet, khac, theo_am_on: byOnyomi },
  };
  await dbClient.db
    .update(kanjiDataset)
    .set({ data: next, hanViet: hanViet || null, source: 'manual', updatedAt: new Date() })
    .where(eq(kanjiDataset.kanji, kanji));
  await audit(dbClient, operatorId, 'kanji.hanviet.update', kanji, {
    before: { chinh: oldMain, theo_am_on: before.theo_am_on ?? {} },
    after: { chinh: hanViet, theo_am_on: byOnyomi },
  });
  return toResult(kanji, next, true);
}

/** Undoes manual edits: restores the dataset's Hán Việt and lets the next import update the row again. */
export async function resetKanjiHanViet(
  dbClient: DbClientInstance,
  kanjiInput: string,
  operatorId?: string,
): Promise<KanjiHanVietResult> {
  const { kanji, data, source } = await loadRow(dbClient, kanjiInput);
  if (source !== 'manual' || !data.han_viet_goc) throw new BadRequestException(`${kanji} chưa được sửa tay`);
  const { han_viet_goc: original, ...rest } = data;
  const next: DatasetData = { ...rest, han_viet: original };
  await dbClient.db
    .update(kanjiDataset)
    .set({ data: next, hanViet: original.chinh || null, source: 'dataset', updatedAt: new Date() })
    .where(eq(kanjiDataset.kanji, kanji));
  await audit(dbClient, operatorId, 'kanji.hanviet.reset', kanji, { restored: original.chinh ?? '' });
  return toResult(kanji, next, false);
}
