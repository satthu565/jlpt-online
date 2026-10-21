import { and, isNotNull, isNull } from 'drizzle-orm';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';
import { indexExamForCorpus } from './corpus-indexer.js';

export interface BackfillCorpusResult {
  publishedExamsCount: number;
  totalTerms: number;
  uniqueTerms: number;
  byLevel: Record<string, number>;
}

/**
 * Iterates through all currently published exams in the database and indexes their vocabulary terms into corpus_terms.
 * Fully idempotent: running multiple times produces identical results.
 */
export async function backfillCorpus(dbClient: DbClientInstance): Promise<BackfillCorpusResult> {
  const db = dbClient.db;

  const publishedExams = await db
    .select({
      id: schema.exams.id,
      slug: schema.exams.slug,
      title: schema.exams.title,
      level: schema.exams.level,
      publishedVersion: schema.exams.publishedVersion,
    })
    .from(schema.exams)
    .where(
      and(
        isNotNull(schema.exams.publishedVersion),
        isNull(schema.exams.deletedAt),
      ),
    );

  let totalTerms = 0;
  for (const exam of publishedExams) {
    const res = await indexExamForCorpus(dbClient, exam.id);
    totalTerms += res.indexedTerms;
  }

  const terms = await db
    .select({
      term: schema.corpusTerms.term,
      level: schema.corpusTerms.level,
      count: schema.corpusTerms.count,
    })
    .from(schema.corpusTerms);

  const uniqueTerms = new Set(terms.map((t: { term: string }) => t.term)).size;
  const byLevel: Record<string, number> = { N1: 0, N2: 0, N3: 0, N4: 0, N5: 0 };
  for (const t of terms) {
    if (byLevel[t.level] !== undefined) {
      byLevel[t.level] += t.count;
    }
  }

  return {
    publishedExamsCount: publishedExams.length,
    totalTerms,
    uniqueTerms,
    byLevel,
  };
}
