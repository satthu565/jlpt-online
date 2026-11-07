import type { PublicExamSnapshot, RichText } from '@jlpt/schema';
import type { FlatQuestionItem } from '../types';
import { mediaUrl } from './exam-media';

function collectInlineImages(segments: RichText, images: Set<string>): void {
  for (const segment of segments) {
    if (segment.t === 'image') {
      if (segment.mediaKey) images.add(mediaUrl(segment.mediaKey));
      if (segment.url) images.add(mediaUrl(segment.url));
    } else if ('children' in segment && segment.children) {
      collectInlineImages(segment.children, images);
    }
  }
}

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

      const inlineImages = new Set<string>();
      for (const block of group.passage || []) {
        if (block.type === 'image') inlineImages.add(mediaUrl(block.mediaKey));
        else if (block.type === 'paragraph') collectInlineImages(block.content, inlineImages);
        else if (block.type === 'table') {
          for (const row of block.rows) {
            for (const cell of row) collectInlineImages(cell, inlineImages);
          }
        }
      }
      for (const question of group.questions) {
        collectInlineImages(question.stem, inlineImages);
        for (const option of question.options) collectInlineImages(option.content, inlineImages);
      }
      const illustrations = (group.media || []).filter(src => !inlineImages.has(mediaUrl(src)));

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
          media: illustrations,
          isLocked: isSectionLocked,
        });

        globalIndex++;
      }
    }
  }

  return items;
}
