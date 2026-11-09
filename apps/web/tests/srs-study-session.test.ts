import { describe, expect, it } from 'vitest';
import type { DueFlashcard } from '../features/learning/types';
import {
  createStudyState, dailyProgress, markStudySaved, projectCard, rateStudyCard, RELEARN_DELAY_MS,
  restoreStudyState, selectStudyQueue, studyQueue, studyStorageKey, undoStudyRating,
} from '../features/learning/services/srs-study-session';

const now = new Date(2026, 10, 10, 10, 0).getTime();
const card = (id: string, fresh = false): DueFlashcard => ({
  cardId: id, notebookItemId: id, front: { term: id }, back: { meaning: id },
  repetitions: fresh ? 0 : 3, easeFactor: 230, intervalDays: 4,
  state: fresh ? 'learning' : 'review', dueAt: new Date(now).toISOString(),
});
describe('SRS study session', () => {
  it('keeps a forgotten card waiting for ten minutes while other cards can continue', () => {
    const initial = createStudyState([card('one'), card('two')], now);
    const forgotten = rateStudyCard(initial, 'one', 1, now, 'r1');
    expect(selectStudyQueue(forgotten, now).entries.find(entry => entry.availableAt <= now)?.card.cardId).toBe('two');
    const afterSecond = rateStudyCard(forgotten, 'two', 3, now + 1000, 'r2');
    expect(selectStudyQueue(afterSecond, now + 1000).entries.every(entry => entry.availableAt > now + 1000)).toBe(true);
    const ready = selectStudyQueue(afterSecond, now + RELEARN_DELAY_MS).entries[0]!;
    expect(ready.card.cardId).toBe('one');
    expect(ready.availableAt).toBe(now + RELEARN_DELAY_MS);
    expect(ready.card.easeFactor).toBe(210);
    expect(studyQueue(rateStudyCard(afterSecond, 'one', 3, now + RELEARN_DELAY_MS, 'r3').session)).toHaveLength(0);
  });
  it('refuses early relearning and repeated submissions of the old active card', () => {
    const initial = createStudyState([card('one')], now);
    const forgotten = rateStudyCard(initial, 'one', 1, now, 'r1');
    expect(rateStudyCard(forgotten, 'one', 3, now + 500, 'r2')).toBe(forgotten);
    const success = rateStudyCard(initial, 'one', 3, now, 'r1');
    expect(rateStudyCard(success, 'one', 3, now, 'r2')).toBe(success);
  });
  it('undo restores a retry, the daily progress and the original queue exactly', () => {
    const initial = createStudyState([card('one', true)], now);
    const forgotten = rateStudyCard(initial, 'one', 1, now, 'r1');
    expect(dailyProgress(forgotten, now).introduced).toEqual(['one']);
    expect(undoStudyRating(forgotten)).toEqual(initial);
    const remembered = rateStudyCard(forgotten, 'one', 3, now + RELEARN_DELAY_MS, 'r2');
    expect(undoStudyRating(remembered)).toEqual(forgotten);
  });
  it('cannot undo a saved review, but can undo a later unsaved retry', () => {
    const forgotten = rateStudyCard(createStudyState([card('one')], now), 'one', 1, now, 'r1');
    const saved = markStudySaved(forgotten);
    expect(undoStudyRating(saved)).toBe(saved);
    const next = rateStudyCard(saved, 'one', 3, now + RELEARN_DELAY_MS, 'r2');
    expect(undoStudyRating(next)).toEqual(saved);
  });
  it('limits new cards while retaining due cards even after the daily goal is reached', () => {
    const initial = createStudyState([card('fresh', true), card('due')], now);
    initial.settings.newPerDay = 0;
    expect(selectStudyQueue(initial, now).entries.map(entry => entry.card.cardId)).toEqual(['due']);
    expect(selectStudyQueue(initial, now).deferredNew).toBe(1);
    initial.days = { '2026-11-10': { reviewed: Array.from({ length: 30 }, (_, index) => String(index)), introduced: [] } };
    expect(selectStudyQueue(initial, now).entries.map(entry => entry.card.cardId)).toEqual(['due']);
  });
  it('counts each new card once, keeps a retry when the limit is reduced, and resets on a new day', () => {
    const state = rateStudyCard(createStudyState([card('one', true), card('two', true)], now), 'one', 1, now, 'r1');
    state.settings.newPerDay = 0;
    expect(selectStudyQueue(state, now).entries.map(entry => entry.card.cardId)).toEqual(['one']);
    const saved = markStudySaved(state);
    expect(dailyProgress(saved, now).reviewed).toEqual(['one']);
    expect(dailyProgress(saved, now + 86400000).reviewed).toEqual([]);
    const retry = rateStudyCard(saved, 'one', 3, now + 86400000, 'r2');
    expect(dailyProgress(retry, now + 86400000).introduced).toEqual([]);
  });
  it('restores draft reviews and exact waiting times after reload, including with an empty API result', () => {
    const state = rateStudyCard(createStudyState([card('one')], now), 'one', 1, now, 'r1');
    const restored = restoreStudyState(JSON.stringify(state), [], now + 300000);
    expect(restored).toEqual(state);
    expect(studyQueue(restored.session)[0]!.availableAt).toBe(now + RELEARN_DELAY_MS);
    expect(studyStorageKey('a')).not.toBe(studyStorageKey('b'));
  });
  it('refreshes completed saved sessions without discarding preferences and daily progress', () => {
    const saved = markStudySaved(rateStudyCard(createStudyState([card('one')], now), 'one', 3, now, 'r1'));
    saved.settings.dailyGoal = 30;
    const restored = restoreStudyState(JSON.stringify(saved), [card('next')], now + 1000);
    expect(restored.session.cards[0]!.cardId).toBe('next');
    expect(restored.settings.dailyGoal).toBe(30);
    expect(dailyProgress(restored, now).reviewed).toEqual(['one']);
  });
  it('rejects invalid storage instead of treating it as a valid completed session', () => {
    expect(() => restoreStudyState('{"version":1}', [], now)).toThrow();
  });
  it('shows different interval estimates for different histories', () => {
    expect(projectCard(card('one'), 3).intervalDays).toBe(9);
    expect(projectCard(card('one', true), 3).intervalDays).toBe(1);
    expect(projectCard(card('one', true), 4).intervalDays).toBe(4);
  });
});
