import type { DueFlashcard, ReviewRating, ReviewSubmission } from '../types';

export const RELEARN_DELAY_MS = 10 * 60 * 1000;
export interface StudySettings { dailyGoal: number; newPerDay: number }
export interface StudyEvent extends ReviewSubmission { wasNew: boolean }
export interface StudySession { cards: DueFlashcard[]; events: StudyEvent[]; savedCount: number; startedAt: number }
export interface DailyRecord { reviewed: string[]; introduced: string[] }
export interface StudyState {
  version: 1;
  settings: StudySettings;
  days: Record<string, DailyRecord>;
  session: StudySession;
  lastReviewedCards?: DueFlashcard[];
}
export interface StudyEntry { card: DueFlashcard; availableAt: number }

export function studyDay(time: number): string {
  const date = new Date(time);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
export function isNewCard(card: DueFlashcard): boolean {
  return card.state === 'new' || (card.state === 'learning' && card.repetitions === 0);
}
export function createStudyState(cards: DueFlashcard[], now = Date.now()): StudyState {
  return { version: 1, settings: { dailyGoal: 20, newPerDay: 10 }, days: {},
    session: { cards, events: [], savedCount: 0, startedAt: now } };
}

/** Mirrors the currently deployed learning API progression; labels remain estimates. */
export function projectCard(card: DueFlashcard, rating: ReviewRating): DueFlashcard {
  let interval = card.intervalDays;
  let repetitions = card.repetitions;
  let ease = card.easeFactor ?? 250;
  if (rating === 1) { interval = 1; repetitions = 0; ease = Math.max(130, ease - 20); }
  if (rating === 2) { interval = Math.max(1, Math.round(interval * 1.2)); repetitions++; ease = Math.max(130, ease - 15); }
  if (rating === 3) { interval = repetitions === 0 ? 1 : repetitions === 1 ? 6 : Math.max(1, Math.round(interval * ease / 100)); repetitions++; }
  if (rating === 4) { interval = repetitions === 0 ? 4 : repetitions === 1 ? 10 : Math.max(1, Math.round(interval * ease / 100 * 1.3)); repetitions++; ease += 15; }
  return { ...card, intervalDays: interval, repetitions, easeFactor: ease, state: rating === 1 ? 'relearning' : 'review' };
}

export function studyQueue(session: StudySession): StudyEntry[] {
  // The due endpoint already selected these cards for immediate study. Only
  // explicit relearning events should delay a card; startedAt can be newer than
  // the runner's last clock tick when a session is created or restored.
  const queue = session.cards.map(card => ({ card, availableAt: 0 }))
    .sort((a, b) => Number(isNewCard(a.card)) - Number(isNewCard(b.card)));
  for (const event of session.events) {
    const index = queue.findIndex(entry => entry.card.cardId === event.cardId);
    if (index < 0) continue;
    const [entry] = queue.splice(index, 1);
    if (event.rating === 1) queue.push({
      card: projectCard(entry!.card, event.rating),
      availableAt: Date.parse(event.reviewedAt) + RELEARN_DELAY_MS,
    });
  }
  return queue;
}
export function dailyProgress(state: StudyState, now = Date.now()): DailyRecord {
  const day = studyDay(now);
  const stored = state.days[day] ?? { reviewed: [], introduced: [] };
  const reviewed = new Set(stored.reviewed);
  const introduced = new Set(stored.introduced);
  for (const event of state.session.events.slice(state.session.savedCount)) {
    if (studyDay(Date.parse(event.reviewedAt)) !== day) continue;
    reviewed.add(event.cardId);
    if (event.wasNew) introduced.add(event.cardId);
  }
  return { reviewed: [...reviewed], introduced: [...introduced] };
}
export function selectStudyQueue(state: StudyState, now = Date.now()): { entries: StudyEntry[]; deferredNew: number } {
  const progress = dailyProgress(state, now);
  const known = new Set(progress.introduced);
  const attempted = new Set(state.session.events.map(event => event.cardId));
  let allowance = Math.max(0, state.settings.newPerDay - known.size);
  let deferredNew = 0;
  const entries = studyQueue(state.session).filter(({ card }) => {
    if (!isNewCard(card) || known.has(card.cardId) || attempted.has(card.cardId)) return true;
    if (allowance > 0) { allowance--; return true; }
    deferredNew++; return false;
  });
  return { entries, deferredNew };
}
export function rateStudyCard(state: StudyState, cardId: string, rating: ReviewRating, now: number, id: string): StudyState {
  const entries = selectStudyQueue(state, now).entries;
  const active = entries.find(entry => entry.availableAt <= now);
  if (!active || active.card.cardId !== cardId) return state;
  const original = state.session.cards.find(card => card.cardId === cardId)!;
  const event: StudyEvent = {
    cardId, rating, clientReviewId: id, reviewedAt: new Date(now).toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
    wasNew: isNewCard(original) && !state.session.events.some(previous => previous.cardId === cardId),
  };
  return { ...state, session: { ...state.session, events: [...state.session.events, event] } };
}
export function undoStudyRating(state: StudyState): StudyState {
  if (state.session.events.length <= state.session.savedCount) return state;
  return { ...state, session: { ...state.session, events: state.session.events.slice(0, -1) } };
}
export function markStudySaved(state: StudyState): StudyState {
  const days = { ...state.days };
  for (const event of state.session.events.slice(state.session.savedCount)) {
    const key = studyDay(Date.parse(event.reviewedAt));
    const day = days[key] ?? { reviewed: [], introduced: [] };
    days[key] = {
      reviewed: [...new Set([...day.reviewed, event.cardId])],
      introduced: [...new Set([...day.introduced, ...(event.wasNew ? [event.cardId] : [])])],
    };
  }
  const recent = Object.fromEntries(Object.entries(days).sort(([a], [b]) => b.localeCompare(a)).slice(0, 35));
  const seen = new Set(state.session.events.map(event => event.cardId));
  const lastReviewedCards = seen.size ? state.session.cards.filter(card => seen.has(card.cardId)) : state.lastReviewedCards;
  return { ...state, lastReviewedCards, days: recent, session: { ...state.session, savedCount: state.session.events.length } };
}
export function studyStorageKey(userId: string): string { return `jlpt_srs_study_v1:${userId}`; }

export function restoreStudyState(raw: string, cards: DueFlashcard[], now = Date.now()): StudyState {
  const stored = JSON.parse(raw) as StudyState;
  if (stored.version !== 1 || !stored.session || !Array.isArray(stored.session.cards) ||
    !Array.isArray(stored.session.events) || !Number.isInteger(stored.session.savedCount) ||
    stored.session.savedCount < 0 || stored.session.savedCount > stored.session.events.length ||
    !Number.isFinite(stored.session.startedAt) ||
    ![5, 10, 20, 30, 50].includes(stored.settings?.dailyGoal) ||
    ![0, 5, 10, 20, 30, 50].includes(stored.settings?.newPerDay) ||
    !stored.days || typeof stored.days !== 'object') throw new Error('Invalid SRS study state');
  if (stored.lastReviewedCards !== undefined && !Array.isArray(stored.lastReviewedCards)) throw new Error('Invalid SRS archive');
  for (const card of [...stored.session.cards, ...(stored.lastReviewedCards ?? [])]) {
    if (!card || typeof card.cardId !== 'string' || !card.front || !card.back ||
      !Number.isFinite(card.intervalDays) || !Number.isFinite(card.repetitions)) throw new Error('Invalid SRS card');
  }
  for (const event of stored.session.events) {
    if (!event || typeof event.clientReviewId !== 'string' || ![1, 2, 3, 4].includes(event.rating) ||
      !Number.isFinite(Date.parse(event.reviewedAt)) ||
      !stored.session.cards.some(card => card.cardId === event.cardId)) throw new Error('Invalid SRS event');
  }
  for (const day of Object.values(stored.days)) {
    if (!day || !Array.isArray(day.reviewed) || !Array.isArray(day.introduced)) throw new Error('Invalid SRS day');
  }
  // Finished, saved sessions are refreshed from the API. Waiting relearning cards survive reloads.
  if (stored.session.events.length === 0 || (stored.session.savedCount === stored.session.events.length && studyQueue(stored.session).length === 0)) {
    const seen = new Set(stored.session.events.map(event => event.cardId));
    const lastReviewedCards = seen.size ? stored.session.cards.filter(card => seen.has(card.cardId)) : stored.lastReviewedCards;
    return { ...stored, lastReviewedCards, session: createStudyState(cards, now).session };
  }
  return stored;
}
