import type { NotebookItem, QuestionExample } from '../types';
import { cleanStemText } from '../../corpus/utils/rich-text-helpers';
import { defaultLearningClient, type LearningClient } from './learning-client';

export async function loadMoreNotebookExamples(
  item: NotebookItem,
  client: LearningClient = defaultLearningClient,
): Promise<QuestionExample[]> {
  const sourceQid = item.sourceQid || item.tags
    .map((tag) => tag.replace(/^#+/, ''))
    .find((tag) => tag.startsWith('source_qid:'))?.slice('source_qid:'.length);
  const terms = [...new Set(item.term.trim().split(/[/|]/)
    .map((term) => term.replace(/^[〜~.\s]+|[〜~.\s]+$/g, '').trim()).filter(Boolean))];
  const results: QuestionExample[] = [];
  for (const term of terms) {
    // Propagate blocked/failed requests: an error does not mean there are no matches.
    const questions = await client.getWordQuestionExamples(term);
    for (const question of questions) {
      if (question.id === sourceQid || results.some((result) => result.questionId === question.id)) continue;
      results.push({
        questionId: question.id,
        level: question.level,
        skill: question.skill,
        stem: cleanStemText(question.stemText || question.stem),
        matchedTerm: term,
        isSavedSource: false,
        examTitle: question.examTitle,
        options: question.options?.map((option, index) => ({
          orderIndex: index + 1,
          text: cleanStemText(typeof option === 'string' ? option : option.content || option.text),
        })),
      });
    }
    if (results.length >= 5) break;
  }
  if (results.length > 0) return results;
  const response = await client.getQuestionExamples(item.id);
  return response.examples.filter((example) => !example.isSavedSource && example.questionId !== sourceQid);
}
