import type { NotebookItem, NotebookItemKind, NotebookQuizQuestion } from '../types';
import { newReviewId } from './srs-review-id';

export interface PracticeSettings {
  kind: 'all' | NotebookItemKind;
  mode: 'meaning' | 'reading';
  level: string;
  tag: string;
  mastery: 'all' | 'unmastered' | 'mastered';
  count: 5 | 10 | 20;
}
export const DEFAULT_PRACTICE_SETTINGS: PracticeSettings = {
  kind: 'all', mode: 'meaning', level: 'all', tag: 'all', mastery: 'all', count: 10,
};
export interface PracticeQuestion extends NotebookQuizQuestion {
  term: string;
  reading?: string;
  meaning: string;
  example?: string;
  notes?: string;
  mode: PracticeSettings['mode'];
  optionTerms: string[];
}
export interface PracticeSession {
  id: string;
  questions: PracticeQuestion[];
  answers: number[];
  cursor: number;
  selection: number | null;
  round: 'initial' | 'retry';
  initial?: { questions: PracticeQuestion[]; answers: number[] };
}
export function visiblePracticeTags(item: NotebookItem): string[] {
  return (item.tags ?? []).map(tag => tag.replace(/^#+/, '').trim())
    .filter(tag => tag && !/^(source_|term:|reading:|meaning:|pos:|stroke:|hanviet:|example:|explanation:|level:)/.test(tag)
      && !['grammar', 'vocab', 'kanji'].includes(tag));
}
/** The same source-exam level shown by the notebook; never infer a word's level. */
export function practiceSourceLevel(item: NotebookItem): string | undefined {
  const source = item.sourceExam?.trim() || (item.tags ?? []).map(tag => tag.replace(/^#+/, '').trim())
    .find(tag => tag.startsWith('source_exam:'))?.slice('source_exam:'.length).trim();
  return source?.match(/(?:^|[^a-z0-9])(N[1-5])(?=$|[^a-z0-9])/i)?.[1]?.toUpperCase();
}
const normalized = (text: string): string => text.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
const aliases = (text: string): string[] => text.split(/[,;；、/]/).map(normalized).filter(Boolean);
function overlaps(first: string, second: string): boolean {
  const keys = aliases(first);
  return aliases(second).some(key => keys.includes(key));
}
export function shufflePractice<T>(values: readonly T[], random: () => number = Math.random): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
/** Questions and all distractors come exclusively from the user's real notebook.
 * Filtered-out items may supply distractors of the same kind; they are never tested. */
export function buildPracticePool(items: NotebookItem[], settings: PracticeSettings, random: () => number = Math.random): PracticeQuestion[] {
  const answerOf = (item: NotebookItem) => (settings.mode === 'reading' ? item.reading : item.meaning)?.trim() ?? '';
  const groups = new Map<string, NotebookItem[]>();
  for (const item of items) {
    if (!item.term?.trim() || !item.meaning?.trim() || !answerOf(item)) continue;
    const key = item.kind + ':' + normalized(item.term);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  // Identical prompts with conflicting answers cannot form an unambiguous question.
  const validGroups = [...groups.values()].filter(group => new Set(group.map(item => normalized(answerOf(item)))).size === 1);
  const unique = validGroups.map(group => group[0]!);
  const matches = (item: NotebookItem) =>
    (settings.kind === 'all' || item.kind === settings.kind)
    && (settings.level === 'all' || practiceSourceLevel(item) === settings.level)
    && (settings.tag === 'all' || visiblePracticeTags(item).includes(settings.tag))
    && (settings.mastery === 'all' || item.mastered === (settings.mastery === 'mastered'))
    && (settings.mode !== 'reading' || (item.kind !== 'grammar' && normalized(item.term) !== normalized(answerOf(item))))
  ;
  const filtered = validGroups.flatMap(group => {
    const match = group.find(matches);
    return match ? [match] : [];
  });
  return shufflePractice(filtered, random).flatMap(item => {
    const correct = answerOf(item);
    const chosen: NotebookItem[] = [];
    const candidates = shufflePractice(unique.filter(other => other.kind === item.kind && normalized(other.term) !== normalized(item.term)), random);
    for (const other of candidates) {
      if (overlaps(correct, answerOf(other)) || chosen.some(existing => overlaps(answerOf(existing), answerOf(other)))) continue;
      chosen.push(other);
      if (chosen.length === 3) break;
    }
    // Two real choices are more honest than invented fallback answers.
    if (!chosen.length) return [];
    const ordered = shufflePractice([item, ...chosen], random);
    return [{
      id: item.id + ':' + settings.mode, notebookItemId: item.id, kind: item.kind,
      stem: item.term, term: item.term, reading: item.reading, meaning: item.meaning,
      mode: settings.mode, options: ordered.map(answerOf),
      optionTerms: ordered.map(other => other.term),
      correctOptionIndex: ordered.findIndex(other => other.id === item.id),
      example: item.examples?.find(example => example.trim()) || item.sourceSentence,
      notes: item.notes?.trim() || undefined,
    }];
  });
}
export function newPracticeSession(questions: PracticeQuestion[]): PracticeSession {
  return { id: newReviewId(), questions, answers: [], cursor: 0, selection: null, round: 'initial' };
}
export function answerPractice(session: PracticeSession, selection: number): PracticeSession {
  const question = session.questions[session.cursor];
  if (!question || session.answers.length !== session.cursor || !Number.isInteger(selection)
    || selection < -1 || selection >= question.options.length) return session;
  return { ...session, answers: [...session.answers, selection], selection: null };
}
export function advancePractice(session: PracticeSession): PracticeSession {
  if (session.answers.length <= session.cursor || session.cursor >= session.questions.length) return session;
  return { ...session, cursor: session.cursor + 1, selection: null };
}
export function practiceScore(questions: PracticeQuestion[], answers: number[]): number {
  return questions.filter((question, index) => answers[index] === question.correctOptionIndex).length;
}
export function retryPractice(session: PracticeSession): PracticeSession | null {
  if (session.cursor < session.questions.length) return null;
  const wrong = session.questions.filter((question, index) => session.answers[index] !== question.correctOptionIndex);
  if (!wrong.length) return null;
  const next = newPracticeSession(shufflePractice(wrong));
  return { ...next, round: 'retry', initial: session.initial ?? { questions: session.questions, answers: session.answers } };
}
