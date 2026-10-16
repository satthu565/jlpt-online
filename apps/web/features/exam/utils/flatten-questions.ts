import type { PublicExamSnapshot } from '@jlpt/schema';
import type { FlatQuestionItem } from '../types';

export function flattenExamQuestions(
  snapshot: PublicExamSnapshot,
  lockedSections: number[] = [],
): FlatQuestionItem[] {
  const items: FlatQuestionItem[] = [];
  let globalIndex = 0;

  for (let sIdx = 0; sIdx < snapshot.sections.length; sIdx++) {
    const section = snapshot.sections[sIdx];
    if (!section) continue;

    const isSectionLocked = lockedSections.includes(sIdx);

    for (let gIdx = 0; gIdx < section.groups.length; gIdx++) {
      const group = section.groups[gIdx];
      if (!group) continue;

      for (let qIdx = 0; qIdx < group.questions.length; qIdx++) {
        const question = group.questions[qIdx];
        if (!question) continue;

        items.push({
          globalIndex,
          sectionIndex: sIdx,
          sectionCode: section.code,
          sectionTitle: section.title,
          groupIndex: gIdx,
          groupId: group.groupId,
          mondaiType: group.mondaiType,
          instructions: group.instructions,
          passage: group.passage,
          questionId: question.questionId,
          number: question.number,
          stem: question.stem,
          options: question.options,
          isLocked: isSectionLocked,
        });

        globalIndex++;
      }
    }
  }

  return items;
}
