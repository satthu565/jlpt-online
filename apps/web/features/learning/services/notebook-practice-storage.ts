import {
  DEFAULT_PRACTICE_SETTINGS, type PracticeQuestion, type PracticeSession, type PracticeSettings,
} from './notebook-practice';

export interface PracticeState {
  version: 1;
  settings: PracticeSettings;
  session: PracticeSession | null;
}
export const practiceStorageKey = (userId: string): string => 'jlpt_notebook_practice_v1:' + encodeURIComponent(userId);
export const emptyPracticeState = (): PracticeState => ({
  version: 1, settings: { ...DEFAULT_PRACTICE_SETTINGS }, session: null,
});
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function settingsValid(value: unknown): value is PracticeSettings {
  return record(value) && ['all', 'vocab', 'grammar', 'kanji'].includes(String(value.kind))
    && ['meaning', 'reading'].includes(String(value.mode))
    && ['all', 'N1', 'N2', 'N3', 'N4', 'N5'].includes(String(value.level))
    && typeof value.tag === 'string' && value.tag.length <= 200
    && ['all', 'unmastered', 'mastered'].includes(String(value.mastery))
    && [5, 10, 20].includes(Number(value.count)) && typeof value.count === 'number';
}
function questionValid(value: unknown): value is PracticeQuestion {
  if (!record(value)) return false;
  return typeof value.id === 'string' && typeof value.notebookItemId === 'string'
    && ['vocab', 'grammar', 'kanji'].includes(String(value.kind))
    && ['meaning', 'reading'].includes(String(value.mode))
    && ['term', 'meaning', 'stem'].every(key => typeof value[key] === 'string' && (value[key] as string).length > 0)
    && ['reading', 'example', 'notes', 'explanation'].every(key => value[key] === undefined || typeof value[key] === 'string')
    && Array.isArray(value.options) && value.options.length >= 2 && value.options.length <= 4
    && value.options.every(option => typeof option === 'string' && option.trim().length > 0)
    && new Set(value.options).size === value.options.length
    && Number.isInteger(value.correctOptionIndex) && Number(value.correctOptionIndex) >= 0
    && Number(value.correctOptionIndex) < value.options.length
    && Array.isArray(value.optionTerms) && value.optionTerms.length === value.options.length
    && value.optionTerms.every(term => typeof term === 'string');
}
function resultsValid(questions: unknown, answers: unknown): questions is PracticeQuestion[] {
  return Array.isArray(questions) && questions.length > 0 && questions.length <= 20 && questions.every(questionValid)
    && new Set(questions.map(question => question.id)).size === questions.length
    && Array.isArray(answers) && answers.length <= questions.length
    && answers.every((answer, index) => Number.isInteger(answer) && answer >= -1 && answer < questions[index]!.options.length);
}
function sessionValid(value: unknown): value is PracticeSession {
  if (!record(value) || !resultsValid(value.questions, value.answers) || !Array.isArray(value.answers)) return false;
  const cursor = Number(value.cursor);
  return typeof value.id === 'string' && ['initial', 'retry'].includes(String(value.round))
    && typeof value.cursor === 'number' && Number.isInteger(cursor) && cursor >= 0 && cursor <= value.questions.length
    && (value.answers.length === cursor || (cursor < value.questions.length && value.answers.length === cursor + 1))
    && (value.selection === null || (cursor < value.questions.length && value.answers.length === cursor
      && Number.isInteger(value.selection) && Number(value.selection) >= 0
      && Number(value.selection) < value.questions[cursor]!.options.length))
    && (value.round === 'initial' ? value.initial === undefined
      : record(value.initial) && resultsValid(value.initial.questions, value.initial.answers)
        && Array.isArray(value.initial.answers) && Array.isArray(value.initial.questions)
        && value.initial.answers.length === value.initial.questions.length);
}
export function restorePracticeState(raw: string | null): { state: PracticeState; recovered: boolean } {
  if (!raw) return { state: emptyPracticeState(), recovered: false };
  try {
    const value: unknown = JSON.parse(raw);
    if (record(value) && value.version === 1 && settingsValid(value.settings)
      && (value.session === null || sessionValid(value.session))) {
      return { state: value as unknown as PracticeState, recovered: false };
    }
  } catch { /* Unreadable drafts must never crash or manufacture a completed round. */ }
  return { state: emptyPracticeState(), recovered: true };
}
