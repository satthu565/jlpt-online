import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import { cards, cardSchedules, notebookItems } from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type { CardDto, CardScheduleDto, GenerateCardsDto } from './learning.types.js';
import { SrsService } from './srs.service.js';

@Injectable()
export class FlashcardService {
  constructor(
    @Inject(DB_CLIENT) private readonly dbClient: DbClientInstance,
    private readonly srsService: SrsService,
  ) {}

  /**
   * Generates or retrieves an existing flashcard for a notebook item (VOC-10).
   */
  async generateCardForNotebookItem(
    userId: string,
    notebookItemId: string,
    dto: GenerateCardsDto = {},
  ): Promise<CardDto> {
    const items = await this.dbClient.db
      .select()
      .from(notebookItems)
      .where(and(eq(notebookItems.id, notebookItemId), eq(notebookItems.userId, userId)))
      .limit(1);

    if (items.length === 0) {
      throw new NotFoundException(`Notebook item '${notebookItemId}' not found`);
    }

    const item = items[0]!;
    const tags: string[] = item.tags ?? [];
    const template = dto.template ?? (item.kind === 'kanji' ? 'kanji_to_reading' : 'term_to_meaning');

    // 1. Idempotency: Check if card already exists for this notebook item
    const existingCards = await this.dbClient.db
      .select()
      .from(cards)
      .where(and(eq(cards.notebookItemId, notebookItemId), eq(cards.userId, userId)))
      .limit(1);

    if (existingCards.length > 0) {
      const card = existingCards[0]!;
      const schedule = await this.srsService.initializeSchedule(card.id);
      return {
        id: card.id,
        userId: card.userId,
        notebookItemId: card.notebookItemId,
        front: card.front as Record<string, unknown>,
        back: card.back as Record<string, unknown>,
        status: card.status,
        createdAt: card.createdAt.toISOString(),
        schedule,
      };
    }

    // 2. Build front and back payload based on template and item content
    let front: Record<string, unknown>;
    let back: Record<string, unknown>;

    switch (template) {
      case 'meaning_to_term':
        front = {
          prompt: 'Từ/cụm từ tiếng Nhật mang ý nghĩa:',
          meaning: tags.find((t: string) => t.startsWith('meaning:'))?.replace('meaning:', '') ?? '',
          partOfSpeech: tags.find((t: string) => t.startsWith('pos:'))?.replace('pos:', '') ?? '',
          kind: item.kind,
        };
        back = {
          term: tags.find((t: string) => t.startsWith('term:'))?.replace('term:', '') ?? '',
          reading: tags.find((t: string) => t.startsWith('reading:'))?.replace('reading:', '') ?? '',
          examples: tags.filter((t: string) => t.startsWith('example:')).map((t: string) => t.replace('example:', '')),
        };
        break;

      case 'kanji_to_reading':
        front = {
          kanji: tags.find((t: string) => t.startsWith('term:'))?.replace('term:', '') ?? '',
          strokeCount: Number(tags.find((t: string) => t.startsWith('stroke:'))?.replace('stroke:', '') ?? '0'),
          kind: 'kanji',
        };
        back = {
          reading: tags.find((t: string) => t.startsWith('reading:'))?.replace('reading:', '') ?? '',
          meaning: tags.find((t: string) => t.startsWith('meaning:'))?.replace('meaning:', '') ?? '',
          onyomi: tags.filter((t: string) => t.startsWith('onyomi:')).map((t: string) => t.replace('onyomi:', '')),
          kunyomi: tags.filter((t: string) => t.startsWith('kunyomi:')).map((t: string) => t.replace('kunyomi:', '')),
        };
        break;

      case 'grammar_pattern':
        front = {
          pattern: tags.find((t: string) => t.startsWith('term:'))?.replace('term:', '') ?? '',
          kind: 'grammar',
        };
        back = {
          meaning: tags.find((t: string) => t.startsWith('meaning:'))?.replace('meaning:', '') ?? '',
          explanation: tags.find((t: string) => t.startsWith('explanation:'))?.replace('explanation:', '') ?? '',
          examples: tags.filter((t: string) => t.startsWith('example:')).map((t: string) => t.replace('example:', '')),
        };
        break;

      case 'term_to_meaning':
      default:
        front = {
          term: tags.find((t: string) => t.startsWith('term:'))?.replace('term:', '') ?? '',
          reading: tags.find((t: string) => t.startsWith('reading:'))?.replace('reading:', '') ?? '',
          kind: item.kind,
        };
        back = {
          meaning: tags.find((t: string) => t.startsWith('meaning:'))?.replace('meaning:', '') ?? '',
          partOfSpeech: tags.find((t: string) => t.startsWith('pos:'))?.replace('pos:', '') ?? '',
          examples: tags.filter((t: string) => t.startsWith('example:')).map((t: string) => t.replace('example:', '')),
        };
        break;
    }

    const newCardId = generateUuidV7();
    const now = new Date();

    await this.dbClient.db.insert(cards).values({
      id: newCardId,
      userId,
      notebookItemId,
      front,
      back,
      status: 'active',
      createdAt: now,
    });

    const schedule = await this.srsService.initializeSchedule(newCardId, now);

    return {
      id: newCardId,
      userId,
      notebookItemId,
      front,
      back,
      status: 'active',
      createdAt: now.toISOString(),
      schedule,
    };
  }

  /**
   * Retrieves card by ID.
   */
  async getCard(userId: string, cardId: string): Promise<CardDto> {
    const cardRows = await this.dbClient.db
      .select()
      .from(cards)
      .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
      .limit(1);

    if (cardRows.length === 0) {
      throw new NotFoundException(`Card '${cardId}' not found`);
    }

    const card = cardRows[0]!;
    const schedRows = await this.dbClient.db
      .select()
      .from(cardSchedules)
      .where(eq(cardSchedules.cardId, cardId))
      .limit(1);

    let schedule: CardScheduleDto | undefined = undefined;
    if (schedRows.length > 0) {
      const s = schedRows[0]!;
      schedule = {
        cardId: s.cardId,
        dueAt: s.dueAt.toISOString(),
        intervalDays: s.intervalDays,
        easeFactor: s.easeFactor,
        repetitions: s.repetitions,
        state: s.state as CardScheduleDto['state'],
      };
    }

    return {
      id: card.id,
      userId: card.userId,
      notebookItemId: card.notebookItemId,
      front: card.front as Record<string, unknown>,
      back: card.back as Record<string, unknown>,
      status: card.status,
      createdAt: card.createdAt.toISOString(),
      schedule,
    };
  }
}
