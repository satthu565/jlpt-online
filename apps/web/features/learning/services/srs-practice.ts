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
    const index = queue.findIndex(card => card.cardId === event.cardId);
    if (index < 0) continue;
    const [card] = queue.splice(index, 1);
    if (event.rating === 1) queue.push(card!);
  }
  return queue;
}
export function ratePractice(session: PracticeSession, cardId: string, rating: ReviewRating): PracticeSession {
  if (!practiceQueue(session).some(card => card.cardId === cardId)) return session;
  return { ...session, ratings: [...session.ratings, { cardId, rating }] };
}
export function undoPractice(session: PracticeSession): PracticeSession {
  return { ...session, ratings: session.ratings.slice(0, -1) };
}
