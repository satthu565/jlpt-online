import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { cards, cardReviews, cardSchedules, users } from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { RATE_LIMIT_KEY } from '../../common/decorators/rate-limit.decorator.js';
import { ROLES_KEY } from '../../common/decorators/roles.decorator.js';
import { SrsService } from './srs.service.js';
import { NotebookService } from './notebook.service.js';
import { FlashcardService } from './flashcard.service.js';
import { LearningController, ResetSrsCardsSchema } from './learning.controller.js';

describe('SRS remembered card reset', () => {
  let db: DbClientInstance;
  let srs: SrsService;
  let notebook: NotebookService;
  let flashcards: FlashcardService;
  const owner = generateUuidV7();
  const other = generateUuidV7();
  beforeEach(async () => {
    db = await createDbClient({ inMemory: true });
    await runMigrations(db);
    await db.db.insert(users).values([
      { id: owner, email: 'reset-owner@example.invalid', name: 'Owner', role: 'user' },
      { id: other, email: 'reset-other@example.invalid', name: 'Other', role: 'user' },
    ]);
    srs = new SrsService(db);
    notebook = new NotebookService(db);
    flashcards = new FlashcardService(db, srs);
  });
  afterEach(async () => { await db?.close(); });
  async function remembered(userId = owner, term = '学生') {
    const item = await notebook.createItem(userId, { kind: 'vocab', term, meaning: 'Học sinh', mastered: true });
    const card = await flashcards.generateCardForNotebookItem(userId, item.id);
    await srs.processReview(userId, { cardId: card.id, clientReviewId: generateUuidV7(), rating: 3 });
    return { card, item };
  }
  it('selects only the owner’s active remembered cards', async () => {
    const own = await remembered();
    await remembered(other);
    const fresh = await notebook.createItem(owner, { kind: 'vocab', term: '新', meaning: 'Mới' });
    await flashcards.generateCardForNotebookItem(owner, fresh.id);
    const forgotten = await remembered(owner, '忘');
    await srs.processReview(owner, { cardId: forgotten.card.id, clientReviewId: generateUuidV7(), rating: 1 });
    expect(await srs.getResetCandidates(owner)).toEqual({ cardIds: [own.card.id], count: 1 });
  });
  it('restarts schedules while preserving notebook content, mastery flags and review history', async () => {
    const { card, item } = await remembered();
    const before = await notebook.getItem(owner, item.id);
    const result = await srs.resetRememberedCards(owner, [card.id]);
    expect(result).toEqual({ resetCount: 1, alreadyReset: false });
    expect(await notebook.getItem(owner, item.id)).toEqual(before);
    const active = await db.db.select().from(cards).where(and(eq(cards.userId, owner), eq(cards.status, 'active')));
    expect(active).toHaveLength(1);
    expect(active[0].id).not.toBe(card.id);
    expect(active[0].front).toEqual(card.front);
    const schedules = await db.db.select().from(cardSchedules).where(eq(cardSchedules.cardId, active[0].id));
    expect(schedules[0]).toMatchObject({ state: 'new', repetitions: 0, intervalDays: 1, easeFactor: 250 });
    expect((await srs.getDueCards(owner)).items.map(entry => entry.cardId)).toEqual([active[0].id]);
    expect(await db.db.select().from(cardReviews).where(eq(cardReviews.cardId, card.id))).toHaveLength(1);
    expect((await flashcards.generateCardForNotebookItem(owner, item.id)).id).toBe(active[0].id);
  });
  it('does not reset twice when the same confirmed selection is retried', async () => {
    const { card } = await remembered();
    await srs.resetRememberedCards(owner, [card.id]);
    const first = (await srs.getDueCards(owner)).items[0]!.cardId;
    expect(await srs.resetRememberedCards(owner, [card.id])).toEqual({ resetCount: 0, alreadyReset: true });
    expect((await srs.getDueCards(owner)).items[0]!.cardId).toBe(first);
    await expect(srs.processReview(owner, { cardId: card.id, clientReviewId: generateUuidV7(), rating: 4 })).rejects.toBeInstanceOf(NotFoundException);
    const schedule = await db.db.select().from(cardSchedules).where(eq(cardSchedules.cardId, first));
    expect(schedule[0].repetitions).toBe(0);
  });
  it('rejects cross-account selections atomically', async () => {
    const own = await remembered();
    const foreign = await remembered(other);
    await expect(srs.resetRememberedCards(owner, [own.card.id, foreign.card.id])).rejects.toBeInstanceOf(NotFoundException);
    expect((await srs.getResetCandidates(owner)).cardIds).toEqual([own.card.id]);
    expect((await srs.getResetCandidates(other)).cardIds).toEqual([foreign.card.id]);
  });
  it('rejects stale confirmations without resetting any card', async () => {
    const one = await remembered();
    const two = await remembered(owner, '学校');
    await srs.processReview(owner, { cardId: two.card.id, clientReviewId: generateUuidV7(), rating: 1 });
    await expect(srs.resetRememberedCards(owner, [one.card.id, two.card.id])).rejects.toBeInstanceOf(ConflictException);
    const original = await db.db.select().from(cards).where(eq(cards.id, one.card.id));
    expect(original[0].status).toBe('active');
  });
  it('requires valid explicit confirmation, authenticated roles and rate limits', () => {
    const id = generateUuidV7();
    expect(ResetSrsCardsSchema.safeParse({ cardIds: [id], confirmed: true }).success).toBe(true);
    for (const body of [
      { cardIds: [id] }, { cardIds: [id], confirmed: false },
      { cardIds: [], confirmed: true }, { cardIds: [id, id], confirmed: true },
      { cardIds: ['invalid'], confirmed: true }, { cardIds: [id], confirmed: true, userId: other },
    ]) expect(ResetSrsCardsSchema.safeParse(body).success).toBe(false);
    for (const handler of [LearningController.prototype.getResetCandidates, LearningController.prototype.resetRememberedCards]) {
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toContain('student');
      expect(Reflect.getMetadata(RATE_LIMIT_KEY, handler)).toBeDefined();
    }
  });
});
