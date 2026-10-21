import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  lemmatize,
  normalizeJapaneseTextNFC,
  tokenizeJapaneseText,
  tokenizeRichBlocks,
  tokenizeRichText,
  type WordToken,
} from './nlp/index.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { DEFAULT_CORPUS_DATASET_ID } from './corpus.service.js';

// Common Japanese particles to strictly filter out
const PARTICLES = new Set([
  'は', 'が', 'を', 'に', 'で', 'と', 'へ', 'から', 'まで', 'より', 'も',
  'ね', 'よ', 'の', 'か', 'ば', 'や', 'わ', 'ぜ', 'ぞ', 'な', 'さ',
]);

const PUNCTUATION_REGEX = /^[\s\t\n\r、。！？「」『』（）()[\]・★…\-_:;—～・,.!?0-9a-zA-Z／／"'`+*/=<>]+$/;
const SINGLE_KANA_REGEX = /^[\u3040-\u309f\u30a0-\u30ff]$/;
const JAPANESE_CHAR_REGEX = /[\u4e00-\u9faf\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff]/;

/**
 * Validates whether a token term should be included in the corpus.
 * Drops particles, punctuation, whitespace, non-Japanese text, and single kana.
 */
export function shouldIncludeCorpusTerm(term: string, partOfSpeech?: string): boolean {
  if (!term || typeof term !== 'string') return false;
  const trimmed = term.trim();
  if (trimmed.length === 0) return false;
  // Discard single kana
  if (SINGLE_KANA_REGEX.test(trimmed)) return false;
  // Discard particles
  if (partOfSpeech === 'particle' || PARTICLES.has(trimmed)) return false;
  // Discard punctuation / symbols / digits / ASCII
  if (PUNCTUATION_REGEX.test(trimmed)) return false;
  // Must contain at least one Japanese character (Kanji or Kana)
  if (!JAPANESE_CHAR_REGEX.test(trimmed)) return false;
  return true;
}

function parseContentIfNeeded(content: unknown): unknown {
  if (typeof content === 'string') {
    const trimmed = content.trim();
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return content;
      }
    }
  }
  return content;
}

function extractTokensFromContent(
  rawContent: unknown,
  role: 'stem' | 'option' | 'passage' | 'instruction' | 'transcript',
): WordToken[] {
  const content = parseContentIfNeeded(rawContent);
  if (!content) return [];
  if (typeof content === 'string') {
    return tokenizeJapaneseText(content, role);
  }
  if (Array.isArray(content)) {
    if (content.length === 0) return [];
    const first = content[0];
    if (first && typeof first === 'object' && 'type' in first) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return tokenizeRichBlocks(content as any, role);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return tokenizeRichText(content as any, role);
  }
  return [];
}

/**
 * Extracts and indexes all vocabulary terms from an exam into corpus_terms.
 * Supports running within an existing database transaction (txClient).
 */
export async function indexExamForCorpus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbClient: any,
  examId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  txClient?: any,
): Promise<{ indexedTerms: number; uniqueTerms: number }> {
  const db = txClient ?? dbClient.db ?? dbClient;

  // 1. Fetch exam
  const examRows = await db
    .select()
    .from(schema.exams)
    .where(eq(schema.exams.id, examId))
    .limit(1);

  if (examRows.length === 0) {
    return { indexedTerms: 0, uniqueTerms: 0 };
  }

  const exam = examRows[0]!;
  const level = exam.level || 'N5';

  // 2. Ensure default dataset exists
  const datasetRows = await db
    .select({ id: schema.datasets.id })
    .from(schema.datasets)
    .where(eq(schema.datasets.id, DEFAULT_CORPUS_DATASET_ID))
    .limit(1);

  if (datasetRows.length === 0) {
    await db
      .insert(schema.datasets)
      .values({
        id: DEFAULT_CORPUS_DATASET_ID,
        slug: 'jlpt-official',
        name: 'Tập ngữ liệu đề thi JLPT N1–N5',
        version: '1.0.0',
      })
      .onConflictDoNothing();
  }
  const datasetId = DEFAULT_CORPUS_DATASET_ID;

  // 3. Fetch sections
  const sections = await db
    .select()
    .from(schema.examSections)
    .where(eq(schema.examSections.examId, examId))
    .orderBy(schema.examSections.orderIndex);

  // 4. Fetch exam items and questions
  const items = await db
    .select()
    .from(schema.examItems)
    .where(eq(schema.examItems.examId, examId))
    .orderBy(schema.examItems.orderIndex);

  const questionIds = items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((i: any) => i.questionId)
    .filter((qid: unknown): qid is string => Boolean(qid));

  const questions =
    questionIds.length > 0
      ? await db
          .select()
          .from(schema.questions)
          .where(inArray(schema.questions.id, questionIds))
      : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const questionMap = new Map<string, any>(questions.map((q: any) => [q.id, q]));

  // Term aggregation map: key = `${term}:::${questionId || 'passage'}`
  const termMap = new Map<
    string,
    {
      term: string;
      reading?: string;
      level: string;
      examId: string;
      questionId: string | null;
      section?: string;
      skill?: string;
      count: number;
    }
  >();

  const addTokens = (
    tokens: WordToken[],
    questionId: string | null,
    secTitle: string | undefined,
    defaultSkill: string | undefined,
  ) => {
    for (const t of tokens) {
      const normalized = normalizeJapaneseTextNFC(t.baseForm || t.surface);
      const lemma = lemmatize(normalized);
      const dictTerm = lemma.baseForm || normalized;

      if (!shouldIncludeCorpusTerm(dictTerm, lemma.partOfSpeech || t.partOfSpeech)) {
        continue;
      }

      const key = `${dictTerm}:::${questionId ?? 'passage'}`;
      const existing = termMap.get(key);
      if (existing) {
        existing.count += 1;
        if (!existing.reading && t.reading) {
          existing.reading = t.reading;
        }
      } else {
        termMap.set(key, {
          term: dictTerm,
          reading: t.reading || undefined,
          level,
          examId,
          questionId,
          section: secTitle,
          skill: defaultSkill,
          count: 1,
        });
      }
    }
  };

  // Process each section, groups, and questions
  for (const sec of sections) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const secItems = items.filter((i: any) => i.sectionId === sec.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const secQIds = secItems.map((i: any) => i.questionId);

    // Group items by groupId
    const groupMap = new Map<string, string[]>();
    for (const qid of secQIds) {
      const q = questionMap.get(qid);
      const gid = q?.groupId || 'default';
      if (!groupMap.has(gid)) {
        groupMap.set(gid, []);
      }
      groupMap.get(gid)!.push(qid);
    }

    // Process listening timeline transcripts if any
    if (sec.listeningTimeline && Array.isArray(sec.listeningTimeline)) {
      for (const item of sec.listeningTimeline) {
        if (item && item.transcript) {
          const tokens = extractTokensFromContent(item.transcript, 'transcript');
          addTokens(tokens, null, sec.title, 'listening');
        }
      }
    }

    for (const [gid, qIds] of groupMap.entries()) {
      if (gid !== 'default') {
        const gvRows = await db
          .select()
          .from(schema.questionGroupVersions)
          .where(eq(schema.questionGroupVersions.groupId, gid))
          .orderBy(desc(schema.questionGroupVersions.version))
          .limit(1);

        const gvRow = gvRows[0];
        if (gvRow) {
          // Passage
          if (gvRow.passage) {
            const tokens = extractTokensFromContent(gvRow.passage, 'passage');
            addTokens(tokens, null, sec.title, 'reading');
          }
          // Instructions
          if (gvRow.instructions) {
            const tokens = extractTokensFromContent(gvRow.instructions, 'instruction');
            addTokens(tokens, null, sec.title, 'reading');
          }
        }
      }

      // Process questions in this group
      for (const qid of qIds) {
        const qObj = questionMap.get(qid);
        const qvRows = await db
          .select()
          .from(schema.questionVersions)
          .where(eq(schema.questionVersions.questionId, qid))
          .orderBy(desc(schema.questionVersions.version))
          .limit(1);

        const qvRow = qvRows[0];
        if (qvRow) {
          // Stem
          if (qvRow.stem) {
            const tokens = extractTokensFromContent(qvRow.stem, 'stem');
            addTokens(tokens, qid, sec.title, qObj?.skill || 'vocabulary');
          }

          // Options (all options, never looking at correct answers)
          const options = await db
            .select()
            .from(schema.answerOptions)
            .where(
              and(
                eq(schema.answerOptions.questionId, qid),
                eq(schema.answerOptions.questionVersion, qvRow.version),
              ),
            );

          for (const opt of options) {
            if (opt.content) {
              const tokens = extractTokensFromContent(opt.content, 'option');
              addTokens(tokens, qid, sec.title, qObj?.skill || 'vocabulary');
            }
          }
        }
      }
    }
  }

  // 5. Delete prior terms for this exam (ensuring idempotent re-runs)
  await db.delete(schema.corpusTerms).where(eq(schema.corpusTerms.examId, examId));

  // 6. Insert new terms
  const rowsToInsert = Array.from(termMap.values()).map((t) => ({
    id: generateUuidV7(),
    datasetId,
    term: t.term,
    reading: t.reading ?? null,
    level: t.level,
    examId: t.examId,
    questionId: t.questionId,
    section: t.section ?? null,
    skill: t.skill ?? null,
    count: t.count,
  }));

  const BATCH_SIZE = 100;
  for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
    const chunk = rowsToInsert.slice(i, i + BATCH_SIZE);
    if (chunk.length > 0) {
      await db.insert(schema.corpusTerms).values(chunk).onConflictDoNothing();
    }
  }

  const uniqueTerms = new Set(rowsToInsert.map((r) => r.term)).size;
  return { indexedTerms: rowsToInsert.length, uniqueTerms };
}

/**
 * Removes all indexed vocabulary for an exam from corpus_terms (e.g. on unpublish).
 */
export async function removeExamFromCorpus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dbClient: any,
  examId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  txClient?: any,
): Promise<void> {
  const db = txClient ?? dbClient.db ?? dbClient;
  await db.delete(schema.corpusTerms).where(eq(schema.corpusTerms.examId, examId));
}
