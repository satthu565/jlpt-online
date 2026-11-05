import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, sql } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import { answerOptions, exams, examItems, notebookItems, questions, questionVersions } from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type {
  CreateNotebookItemDto,
  NotebookItemDto,
  NotebookQueryDto,
  QuestionExampleDto,
  QuestionOptionDto,
  UpdateNotebookItemDto,
} from './learning.types.js';
import { getHanVietForWord } from '../vocab/hanviet-store.js';
import { extractPlainTextFromBlocks, extractPlainTextFromRichText } from '../import/explanation-parser.js';

@Injectable()
export class NotebookService {
  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  /**
   * Helper to parse stored tags back into rich properties for client presentation.
   */
  private mapRowToDto(r: typeof notebookItems.$inferSelect): NotebookItemDto {
    const tags: string[] = r.tags ?? [];
    const term = tags.find((t: string) => t.startsWith('term:'))?.replace('term:', '');
    const reading = tags.find((t: string) => t.startsWith('reading:'))?.replace('reading:', '');
    const meaning = tags.find((t: string) => t.startsWith('meaning:'))?.replace('meaning:', '');
    const partOfSpeech = tags.find((t: string) => t.startsWith('pos:'))?.replace('pos:', '');
    const strokeStr = tags.find((t: string) => t.startsWith('stroke:'))?.replace('stroke:', '');
    const strokeCount = strokeStr ? Number(strokeStr) : undefined;
    const hanVietTag = tags.find((t: string) => t.startsWith('hanviet:'))?.replace('hanviet:', '');
    const hanViet = hanVietTag || (term ? getHanVietForWord(term) : undefined);
    const examples = tags
      .filter((t: string) => t.startsWith('example:'))
      .map((t: string) => t.replace('example:', ''));

    const sourceExam = tags.find((t: string) => t.startsWith('source_exam:'))?.replace('source_exam:', '');
    const sourceQnum = tags.find((t: string) => t.startsWith('source_qnum:'))?.replace('source_qnum:', '');
    const sourceQid = tags.find((t: string) => t.startsWith('source_qid:'))?.replace('source_qid:', '');
    const sourceSentence = tags.find((t: string) => t.startsWith('source_sentence:'))?.replace('source_sentence:', '');

    // Filter out internal metadata tags when presenting user tags
    const userTags = tags.filter(
      (t: string) =>
        !t.startsWith('term:') &&
        !t.startsWith('reading:') &&
        !t.startsWith('meaning:') &&
        !t.startsWith('pos:') &&
        !t.startsWith('stroke:') &&
        !t.startsWith('hanviet:') &&
        !t.startsWith('example:') &&
        !t.startsWith('source_') &&
        !t.startsWith('explanation:'),
    );

    return {
      id: r.id,
      userId: r.userId,
      kind: r.kind as NotebookItemDto['kind'],
      entryId: r.entryId,
      term,
      reading,
      meaning,
      hanViet: hanViet || undefined,
      partOfSpeech,
      examples,
      strokeCount,
      mastered: r.mastered,
      tags: userTags,
      sourceExam,
      sourceQnum,
      sourceQid,
      sourceSentence,
      version: r.version,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  /**
   * Saves a vocabulary, kanji, or grammar item to the user's notebook (VOC-06, VOC-07, VOC-08, VOC-13).
   */
  async createItem(userId: string, dto: CreateNotebookItemDto): Promise<NotebookItemDto> {
    if (!dto.kind || !['vocab', 'grammar', 'kanji'].includes(dto.kind)) {
      throw new BadRequestException("Item kind must be 'vocab', 'grammar', or 'kanji'");
    }

    const entryId = dto.entryId ?? generateUuidV7();
    const itemId = generateUuidV7();
    const now = new Date();

    // Encode rich information into tags array
    const storedTags: string[] = [...(dto.tags ?? [])];
    if (dto.term) storedTags.push(`term:${dto.term.trim()}`);
    if (dto.reading) storedTags.push(`reading:${dto.reading.trim()}`);
    if (dto.meaning) storedTags.push(`meaning:${dto.meaning.trim()}`);
    const hanViet = dto.hanViet?.trim() || (dto.term ? getHanVietForWord(dto.term) : undefined);
    if (hanViet) storedTags.push(`hanviet:${hanViet}`);
    if (dto.partOfSpeech) storedTags.push(`pos:${dto.partOfSpeech.trim()}`);
    if (dto.strokeCount !== undefined) storedTags.push(`stroke:${dto.strokeCount}`);
    if (dto.examples && dto.examples.length > 0) {
      for (const ex of dto.examples) {
        storedTags.push(`example:${ex.trim()}`);
      }
    }

    await this.dbClient.db.insert(notebookItems).values({
      id: itemId,
      userId,
      kind: dto.kind,
      entryId,
      mastered: dto.mastered ?? false,
      tags: storedTags,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });

    const created = await this.dbClient.db
      .select()
      .from(notebookItems)
      .where(eq(notebookItems.id, itemId))
      .limit(1);

    return this.mapRowToDto(created[0]!);
  }

  /**
   * Retrieves list of notebook items with filtering and search (VOC-12, VOC-13).
   */
  async listItems(userId: string, query: NotebookQueryDto = {}): Promise<{ items: NotebookItemDto[]; total: number }> {
    const rows = await this.dbClient.db
      .select()
      .from(notebookItems)
      .where(eq(notebookItems.userId, userId))
      .orderBy(desc(notebookItems.createdAt));

    let filtered = rows;

    if (query.kind) {
      filtered = filtered.filter((r: typeof notebookItems.$inferSelect) => r.kind === query.kind);
    }

    if (query.mastered !== undefined) {
      filtered = filtered.filter((r: typeof notebookItems.$inferSelect) => r.mastered === query.mastered);
    }

    if (query.tag) {
      filtered = filtered.filter((r: typeof notebookItems.$inferSelect) => (r.tags ?? []).includes(query.tag!));
    }

    if (query.search && query.search.trim().length > 0) {
      const q = query.search.trim().toLowerCase();
      filtered = filtered.filter((r: typeof notebookItems.$inferSelect) =>
        (r.tags ?? []).some((t: string) => t.toLowerCase().includes(q)),
      );
    }

    const total = filtered.length;
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;
    const paged = filtered.slice(offset, offset + limit);

    return {
      items: paged.map((r: typeof notebookItems.$inferSelect) => this.mapRowToDto(r)),
      total,
    };
  }

  /**
   * Retrieves a single notebook item by ID.
   */
  async getItem(userId: string, itemId: string): Promise<NotebookItemDto> {
    const rows = await this.dbClient.db
      .select()
      .from(notebookItems)
      .where(and(eq(notebookItems.id, itemId), eq(notebookItems.userId, userId)))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Notebook item '${itemId}' not found`);
    }

    return this.mapRowToDto(rows[0]!);
  }

  /**
   * Updates notebook item with optimistic versioning (VOC-09, VOC-18).
   */
  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateNotebookItemDto,
  ): Promise<NotebookItemDto> {
    const existing = await this.dbClient.db
      .select()
      .from(notebookItems)
      .where(and(eq(notebookItems.id, itemId), eq(notebookItems.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException(`Notebook item '${itemId}' not found`);
    }

    const item = existing[0]!;

    // Optimistic concurrency check
    if (dto.expectedVersion !== undefined && item.version !== dto.expectedVersion) {
      throw new ConflictException(
        `Version conflict: item has version ${item.version}, expected ${dto.expectedVersion}`,
      );
    }

    const now = new Date();
    const newVersion = item.version + 1;

    let updatedTags: string[] = item.tags ?? [];
    if (dto.tags) {
      // Preserve internal metadata tags
      const metaTags = (item.tags ?? []).filter(
        (t: string) =>
          t.startsWith('term:') ||
          t.startsWith('reading:') ||
          t.startsWith('meaning:') ||
          t.startsWith('pos:') ||
          t.startsWith('stroke:') ||
          t.startsWith('example:') ||
          t.startsWith('explanation:'),
      );
      updatedTags = [...metaTags, ...dto.tags];
    }

    await this.dbClient.db
      .update(notebookItems)
      .set({
        mastered: dto.mastered !== undefined ? dto.mastered : item.mastered,
        tags: updatedTags,
        version: newVersion,
        updatedAt: now,
      })
      .where(eq(notebookItems.id, itemId));

    const updated = await this.dbClient.db
      .select()
      .from(notebookItems)
      .where(eq(notebookItems.id, itemId))
      .limit(1);

    return this.mapRowToDto(updated[0]!);
  }

  /**
   * Deletes a notebook item.
   */
  async deleteItem(userId: string, itemId: string): Promise<{ success: boolean; id: string }> {
    const existing = await this.dbClient.db
      .select()
      .from(notebookItems)
      .where(and(eq(notebookItems.id, itemId), eq(notebookItems.userId, userId)))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException(`Notebook item '${itemId}' not found`);
    }

    await this.dbClient.db.delete(notebookItems).where(eq(notebookItems.id, itemId));
    return { success: true, id: itemId };
  }

  /**
   * Finds example questions in the question bank containing the target word or grammar (VOC-17).
   */
  async findQuestionExamples(userId: string, itemId: string): Promise<QuestionExampleDto[]> {
    const item = await this.getItem(userId, itemId);
    const searchTerm = item.term;
    if (!searchTerm || searchTerm.trim().length === 0) {
      return [];
    }

    const trimmed = searchTerm.trim();
    const results: QuestionExampleDto[] = [];

    // 1. If this item was saved from a specific question in an exam, return that exact question!
    if (item.sourceQid) {
      try {
        const rows = await this.dbClient.db
          .select({
            id: questions.id,
            level: questions.level,
            skill: questions.skill,
            stem: questionVersions.stem,
            explanation: questionVersions.explanation,
            examTitle: exams.title,
            orderIndex: examItems.orderIndex,
          })
          .from(questions)
          .innerJoin(questionVersions, eq(questions.id, questionVersions.questionId))
          .leftJoin(examItems, eq(questions.id, examItems.questionId))
          .leftJoin(exams, eq(examItems.examId, exams.id))
          .where(eq(questions.id, item.sourceQid))
          .limit(1);

        if (rows.length > 0) {
          const q = rows[0]!;
          const plainStem =
            typeof q.stem === 'string'
              ? q.stem
              : extractPlainTextFromRichText(q.stem) ||
                (q.stem as { text?: string })?.text ||
                item.sourceSentence ||
                JSON.stringify(q.stem);

          // Fetch options
          const optRows = await this.dbClient.db
            .select({
              orderIndex: answerOptions.orderIndex,
              content: answerOptions.content,
            })
            .from(answerOptions)
            .where(eq(answerOptions.questionId, q.id))
            .orderBy(answerOptions.orderIndex);

          const options: QuestionOptionDto[] = optRows.map((o: (typeof optRows)[number]) => ({
            orderIndex: o.orderIndex,
            text: extractPlainTextFromRichText(o.content) || (typeof o.content === 'string' ? o.content : JSON.stringify(o.content)),
          }));

          // Parse explanation text & correct answer
          let explanationText: string | undefined;
          let correctOptionIndex: number | undefined;

          if (q.explanation && typeof q.explanation === 'object') {
            const explObj = q.explanation as { blocks?: unknown[] };
            if (Array.isArray(explObj.blocks)) {
              explanationText = extractPlainTextFromBlocks(explObj.blocks);
            } else {
              explanationText = extractPlainTextFromRichText(q.explanation);
            }
          }

          if (explanationText) {
            const match = explanationText.match(/Đáp án đúng:\s*\[?([1-4])\]?/i);
            if (match && match[1]) {
              correctOptionIndex = parseInt(match[1], 10);
            }
          }

          results.push({
            questionId: q.id,
            level: q.level,
            skill: q.skill,
            stem: plainStem,
            matchedTerm: trimmed,
            isSavedSource: true,
            examTitle: q.examTitle || item.sourceExam,
            questionNumber: q.orderIndex != null ? q.orderIndex : item.sourceQnum,
            options: options.length > 0 ? options : undefined,
            correctOptionIndex,
            explanationText,
          });
          return results;
        }
      } catch {
        // Fallback to item metadata below
      }
    }

    if (item.sourceSentence || item.sourceExam) {
      results.push({
        questionId: item.sourceQid || 'saved-source',
        level: 'JLPT',
        skill: 'vocabulary',
        stem: item.sourceSentence || (item.examples && item.examples[0]) || '',
        matchedTerm: trimmed,
        isSavedSource: true,
        examTitle: item.sourceExam,
        questionNumber: item.sourceQnum,
      });
      return results;
    }

    // 2. Otherwise (user added manually without exam reference), search question bank
    try {
      const rows = await this.dbClient.db
        .select({
          id: questions.id,
          level: questions.level,
          skill: questions.skill,
          stem: questionVersions.stem,
          examTitle: exams.title,
          orderIndex: examItems.orderIndex,
        })
        .from(questions)
        .innerJoin(questionVersions, eq(questions.id, questionVersions.questionId))
        .leftJoin(examItems, eq(questions.id, examItems.questionId))
        .leftJoin(exams, eq(examItems.examId, exams.id))
        .where(sql`cast(${questionVersions.stem} as text) ILIKE ${'%' + trimmed + '%'}`)
        .limit(5);

      return rows.map((q: (typeof rows)[number]) => {
        const plainStem =
          typeof q.stem === 'string'
            ? q.stem
            : extractPlainTextFromRichText(q.stem) ||
              (q.stem as { text?: string })?.text ||
              JSON.stringify(q.stem);

        return {
          questionId: q.id,
          level: q.level,
          skill: q.skill,
          stem: plainStem,
          matchedTerm: trimmed,
          isSavedSource: false,
          examTitle: q.examTitle || undefined,
          questionNumber: q.orderIndex != null ? q.orderIndex : undefined,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Returns frequent-not-mastered items (dataset gaps) for targeted study.
   */
  async getDatasetGaps(userId: string): Promise<NotebookItemDto[]> {
    const rows = await this.dbClient.db
      .select()
      .from(notebookItems)
      .where(and(eq(notebookItems.userId, userId), eq(notebookItems.mastered, false)))
      .limit(20);

    return rows.map((r: typeof notebookItems.$inferSelect) => this.mapRowToDto(r));
  }
}
