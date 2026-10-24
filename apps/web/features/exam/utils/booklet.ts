import type { PublicSection, RichText } from '@jlpt/schema';
import type { FlatQuestionItem } from '../types';

export function richTextContent(segments: RichText): string {
  return segments.map((segment) => {
    if ('text' in segment && segment.text) return segment.text;
    if ('children' in segment && segment.children) return richTextContent(segment.children);
    if (segment.t === 'star') return '★';
    if (segment.t === 'br') return '\n';
    return '';
  }).join('');
}

export function displayQuestionNumber(number: string): string {
  // Imported IDs such as V1/G1/R1 are not the number printed on the booklet.
  return number.replace(/^[VGRL](?=\d)/i, '');
}

export interface BookletGroup {
  id: string;
  instructions: RichText;
  questions: FlatQuestionItem[];
}

export function groupBookletQuestions(questions: FlatQuestionItem[]): BookletGroup[] {
  const groups: BookletGroup[] = [];
  for (const question of questions) {
    const previous = groups[groups.length - 1];
    const last = previous?.questions[previous.questions.length - 1];
    // Only collapse consecutive identical instructions with an explicit printed 問題 number.
    // Never infer a boundary from mondaiType alone or merge separate reading passages.
    const instruction = richTextContent(question.instructions);
    const samePrintedGroup = /問題\s*[0-9０-９一二三四五六七八九十]+/.test(instruction)
      && last?.sectionIndex === question.sectionIndex
      && JSON.stringify(previous?.instructions) === JSON.stringify(question.instructions);
    if (previous && (last?.groupId === question.groupId || samePrintedGroup)) {
      previous.questions.push(question);
    } else {
      groups.push({ id: question.groupId, instructions: question.instructions, questions: [question] });
    }
  }
  return groups;
}

export function nextReviewQuestion(
  questions: FlatQuestionItem[], currentIndex: number,
  answers: number[], flags: number[], filter: 'blank' | 'flagged', direction = 1,
): FlatQuestionItem | undefined {
  const eligible = questions.filter((q) => !q.isLocked);
  const start = eligible.findIndex((q) => q.globalIndex === currentIndex);
  for (let step = 1; step <= eligible.length; step++) {
    const question = eligible[((start + step * direction) % eligible.length + eligible.length) % eligible.length];
    if (question && (filter === 'blank' ? !answers[question.globalIndex] : flags[question.globalIndex] === 1)) return question;
  }
  return undefined;
}

export function answeredIn(questions: FlatQuestionItem[], answers: number[]): number {
  return questions.filter((q) => (answers[q.globalIndex] ?? 0) > 0 && answers[q.globalIndex]! <= q.options.length).length;
}

export function mediaUrl(value: string): string {
  // Use the same-origin API proxy in both standalone previews and Docker staging.
  // A /media rewrite baked at build time may point at the web container itself.
  if (/^\/?media\//i.test(value)) return `/api/v1/${value.replace(/^\//, '')}`;
  return /^(https?:\/\/|\/)/i.test(value) ? value : `/${value}`;
}

export function isListeningSection(section: PublicSection | undefined): boolean {
  return Boolean(section && (section.code.toLowerCase().includes('listen') || section.title.includes('聴解') || section.groups.some((group) => ['task_based', 'point', 'summary', 'utterance', 'quick_response', 'integrated_listening'].includes(group.mondaiType))));
}
