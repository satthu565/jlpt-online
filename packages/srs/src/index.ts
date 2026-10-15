import { fsrs, createEmptyCard, Rating, type Card, type RecordLogItem, type Grade } from 'ts-fsrs';

export { Rating, type Card, type RecordLogItem, type Grade };

export function initializeFsrsCard(now: Date = new Date()): Card {
  return createEmptyCard(now);
}

export function scheduleReview(
  card: Card,
  grade: Grade,
  reviewTime: Date = new Date(),
): RecordLogItem {
  const f = fsrs();
  return f.next(card, reviewTime, grade);
}
