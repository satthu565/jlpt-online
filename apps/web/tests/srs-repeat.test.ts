import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DueFlashcard, ReviewSubmission } from '../features/learning/types';
import { newReviewId, isReviewUuid } from '../features/learning/services/srs-review-id';
import { practiceQueue, ratePractice, reviewedCards, undoPractice } from '../features/learning/services/srs-practice';
import { createStudyState, dailyProgress, markStudySaved, rateStudyCard, restoreStudyState } from '../features/learning/services/srs-study-session';
import { SrsSyncManager } from '../features/learning/services/srs-sync-manager';
import type { LearningClient } from '../features/learning/services/learning-client';

const now = Date.now();
const card = (id: string): DueFlashcard => ({
  cardId: id, notebookItemId: id, front: { term: id }, back: { meaning: id },
  state: 'review', repetitions: 2, intervalDays: 6, dueAt: new Date(now).toISOString(),
});
afterEach(() => vi.unstubAllGlobals());
describe('SRS extra practice', () => {
  it('rates a card selected by navigation without removing other practice cards', () => {
    const initial = { cards: [card('one'), card('two'), card('three')], ratings: [] };
    const selected = ratePractice(initial, 'two', 3);
    expect(practiceQueue(selected).map(card => card.cardId)).toEqual(['one', 'three']);
    const forgotten = ratePractice(selected, 'three', 1);
    expect(practiceQueue(forgotten).map(card => card.cardId)).toEqual(['one', 'three']);
    expect(undoPractice(forgotten)).toEqual(selected);
  });

  it('reviews only learned cards without changing daily progress or the original study session', () => {
    let study = createStudyState([card('one'), card('two'), { ...card('new'), state: 'new', repetitions: 0 }], now);
    study.settings.newPerDay = 0;
    study = rateStudyCard(study, 'one', 3, now, newReviewId());
    study = rateStudyCard(study, 'two', 3, now, newReviewId());
    const original = JSON.stringify(study);
    const deck = reviewedCards(study);
    expect(deck.map(entry => entry.cardId)).toEqual(['one', 'two']);
    let practice = { cards: deck, ratings: [] as Array<{ cardId: string; rating: 1 | 2 | 3 | 4 }> };
    practice = ratePractice(practice, 'one', 1);
    expect(practiceQueue(practice).map(entry => entry.cardId)).toEqual(['two', 'one']);
    practice = ratePractice(practice, 'two', 3);
    const before = practice;
    practice = ratePractice(practice, 'one', 3);
    expect(practiceQueue(practice)).toHaveLength(0);
    expect(undoPractice(practice)).toEqual(before);
    expect(JSON.stringify(study)).toBe(original);
    expect(dailyProgress(study, now).reviewed).toHaveLength(2);
  });
  it('keeps the last reviewed deck after saving and reloading with no due cards', () => {
    const state = rateStudyCard(createStudyState([card('one')], now), 'one', 3, now, newReviewId());
    const restored = restoreStudyState(JSON.stringify(markStudySaved(state)), [], now + 1000);
    expect(restored.session.cards).toEqual([]);
    expect(restored.lastReviewedCards?.map(entry => entry.cardId)).toEqual(['one']);
    expect(dailyProgress(restored, now).reviewed).toHaveLength(1);
  });
  it('produces valid UUID v4 review IDs on HTTP without randomUUID', () => {
    const values = Array.from({ length: 50 }, () => newReviewId());
    expect(values.every(value => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))).toBe(true);
    expect(new Set(values).size).toBe(50);
    expect(isReviewUuid('rev-old-invalid')).toBe(false);
  });
  it('recovers legacy failed review IDs with a durable server UUID reused after reload', async () => {
    const memory = new Map<string, string>();
    vi.stubGlobal('window', { addEventListener: () => {}, removeEventListener: () => {} });
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
    });
    const ids: string[] = [];
    let fail = true;
    const client = { submitReview: async (input: ReviewSubmission) => {
      expect(isReviewUuid(input.clientReviewId)).toBe(true);
      const persisted = JSON.parse(memory.get('test-sync')!) as Array<{ serverReviewId: string }>;
      expect(persisted[0]!.serverReviewId).toBe(input.clientReviewId);
      ids.push(input.clientReviewId);
      if (fail) throw new Error('offline');
      return { reviewedAt: input.reviewedAt };
    } } as unknown as LearningClient;
    const first = new SrsSyncManager(client, { storageKey: 'test-sync' });
    first.queueSubmission({ cardId: 'one', clientReviewId: 'rev-old-invalid', rating: 3, reviewedAt: new Date(now).toISOString(), timezone: 'Asia/Ho_Chi_Minh' });
    await first.processQueue();
    expect(first.getQueue()[0]!.id).toBe('rev-old-invalid');
    first.dispose();
    fail = false;
    const restored = new SrsSyncManager(client, { storageKey: 'test-sync' });
    await restored.processQueue();
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe(ids[1]);
    expect(restored.getSnapshot().pendingCount).toBe(0);
    restored.dispose();
  });
  it('does not send a legacy review if its UUID cannot first be persisted', async () => {
    const submitReview = vi.fn();
    const manager = new SrsSyncManager({ submitReview } as unknown as LearningClient);
    manager.queueSubmission({ cardId: 'one', clientReviewId: 'rev-old', rating: 3, reviewedAt: new Date(now).toISOString(), timezone: 'Asia/Ho_Chi_Minh' });
    vi.stubGlobal('window', { addEventListener: () => {}, removeEventListener: () => {} });
    vi.stubGlobal('localStorage', { setItem: () => { throw new Error('quota'); } });
    const result = await manager.processQueue();
    expect(result.failed).toBe(1);
    expect(submitReview).not.toHaveBeenCalled();
    expect(manager.getQueue()[0]!.serverReviewId).toBeUndefined();
  });
});
