import type { DueFlashcard, ReviewRating } from '../types';
import type { StudyState } from './srs-study-session';

export interface PracticeRating { cardId: string; rating: ReviewRating }
export interface PracticeSession { cards: DueFlashcard[]; ratings: PracticeRating[] }

/** Do not enroll deferred new cards into extra practice. */
export function reviewedCards(state: StudyState): DueFlashcard[] {
  const seen = new Set(state.session.events.map(event => event.cardId));
  return state.session.cards.filter(card => seen.has(card.cardId));
}
export function practiceQueue(session: PracticeSession): DueFlashcard[] {
  const queue = [...session.cards];
  for (const event of session.ratings) {
    if (queue[0]?.cardId !== event.cardId) continue;
    const card = queue.shift()!;
    if (event.rating === 1) queue.push(card);
  }
  return queue;
}
export function ratePractice(session: PracticeSession, cardId: string, rating: ReviewRating): PracticeSession {
  if (practiceQueue(session)[0]?.cardId !== cardId) return session;
  return { ...session, ratings: [...session.ratings, { cardId, rating }] };
}
export function undoPractice(session: PracticeSession): PracticeSession {
  return { ...session, ratings: session.ratings.slice(0, -1) };
}
