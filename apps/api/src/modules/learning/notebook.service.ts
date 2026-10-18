import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import { notebookItems, questions, questionVersions } from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type {
  CreateNotebookItemDto,
  NotebookItemDto,
  NotebookQueryDto,
  QuestionExampleDto,
  UpdateNotebookItemDto,
} from './learning.types.js';
import { getHanVietForWord } from '@jlpt/content-tools';

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
    const rows = await this.dbClient.db
      .select({
        id: questions.id,
        level: questions.level,
        skill: questions.skill,
        stem: questionVersions.stem,
      })
      .from(questions)
      .innerJoin(questionVersions, eq(questions.id, questionVersions.questionId))
      .limit(20);

    const matched = rows.filter((r: (typeof rows)[number]) => {
      const stemStr = typeof r.stem === 'string' ? r.stem : JSON.stringify(r.stem);
      return stemStr.includes(trimmed);
    });

    return matched.slice(0, 5).map((q: (typeof matched)[number]) => {
      const stemText =
        typeof q.stem === 'string'
          ? q.stem
          : (q.stem as { text?: string })?.text ?? JSON.stringify(q.stem);
      return {
        questionId: q.id,
        level: q.level,
        skill: q.skill,
        stem: stemText,
        matchedTerm: trimmed,
      };
    });
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
