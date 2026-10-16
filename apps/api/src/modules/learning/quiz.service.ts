import { BadRequestException, Injectable } from '@nestjs/common';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type {
  NotebookQuizItemDto,
  NotebookQuizRequestDto,
  NotebookQuizResponseDto,
} from './learning.types.js';
import { NotebookService } from './notebook.service.js';

const FALLBACK_DISTRACTORS: Record<string, string[]> = {
  vocab: [
    'trường học',
    'bệnh viện',
    'sinh viên',
    'thầy cô giáo',
    'người lao động',
    'thời tiết',
    'du lịch',
    'mùa hè',
    'gia đình',
    'bạn bè',
  ],
  kanji: [
    'học tập, trường học',
    'sinh hoạt, cuộc sống',
    'y học, bác sĩ',
    'núi non, tự nhiên',
    'thủy, nước',
    'hỏa, lửa',
    'kim, vàng',
  ],
  grammar: [
    'biểu thị nguyên nhân, lý do khách quan',
    'biểu thị sự nhượng bộ, dù cho',
    'biểu thị thời điểm bắt đầu hành động',
    'biểu thị sự phỏng đoán chắc chắn',
    'biểu thị lời khuyên nên làm gì',
  ],
};

@Injectable()
export class QuizService {
  constructor(private readonly notebookService: NotebookService) {}

  /**
   * Generates a 4-choice quiz from the user's saved notebook items (VOC-14).
   */
  async generateNotebookQuiz(
    userId: string,
    dto: NotebookQuizRequestDto = {},
  ): Promise<NotebookQuizResponseDto> {
    const listResult = await this.notebookService.listItems(userId, {
      kind: dto.kind,
      tag: dto.tags?.[0],
      limit: 100,
    });

    const items = listResult.items.filter((item) => item.term && item.meaning);
    if (items.length < 2) {
      throw new BadRequestException(
        'At least 2 saved items with terms and meanings are required to generate a quiz',
      );
    }

    const count = Math.min(dto.count ?? 5, items.length);
    // Shuffle items
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    const questions: NotebookQuizItemDto[] = [];

    for (let i = 0; i < selected.length; i++) {
      const current = selected[i]!;
      const correctMeaning = current.meaning!;

      // Gather candidate distractors from other user items
      const candidateDistractors = items
        .filter((it) => it.id !== current.id && it.meaning && it.meaning !== correctMeaning)
        .map((it) => it.meaning!);

      // If not enough candidate distractors, supplement from fallback pool
      const pool = FALLBACK_DISTRACTORS[current.kind] ?? FALLBACK_DISTRACTORS.vocab!;
      for (const d of pool) {
        if (candidateDistractors.length >= 3) break;
        if (d !== correctMeaning && !candidateDistractors.includes(d)) {
          candidateDistractors.push(d);
        }
      }

      // Pick 3 distractors
      const distractors = candidateDistractors.slice(0, 3);
      while (distractors.length < 3) {
        distractors.push(`Ý nghĩa lựa chọn ${distractors.length + 1}`);
      }

      // Place correct answer at random position 0..3
      const correctIndex = Math.floor(Math.random() * 4);
      const options = [...distractors];
      options.splice(correctIndex, 0, correctMeaning);

      questions.push({
        id: generateUuidV7(),
        stem: `Nghĩa đúng của từ/cụm từ 「${current.term}」${current.reading ? ` (${current.reading})` : ''} là gì?`,
        options,
        correctOptionIndex: correctIndex,
        kind: current.kind,
        notebookItemId: current.id,
        explanation: `「${current.term}」${current.reading ? ` (${current.reading})` : ''}: ${correctMeaning}`,
      });
    }

    return {
      quizId: generateUuidV7(),
      questions,
      totalQuestions: questions.length,
      createdAt: new Date().toISOString(),
    };
  }
}
