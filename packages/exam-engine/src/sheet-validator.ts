import type { SheetValidationResult } from './types.js';

export interface AnswerSheetValidationOptions {
  totalQuestions: number;
  optionCounts?: number[]; // Per-question option count (e.g. 3 or 4)
  allowedMaxOption?: number; // Default max option when optionCounts[i] is omitted (default 4)
}

/**
 * Validates an answer sheet against question count and per-question option limits (Acceptance 3)
 *
 * Rules:
 * - Must be an array of integers.
 * - Length must match totalQuestions.
 * - Value 0 is allowed (blank / unanswered).
 * - For each question, value must be between 0 and optionCounts[i] (3 or 4).
 *   Example: Answering 4 on a 3-choice question is rejected!
 * - Negative numbers, floats, NaN, or values > max allowed are rejected.
 */
export function validateAnswerSheet(
  answers: number[],
  options: AnswerSheetValidationOptions,
): SheetValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(answers)) {
    return { valid: false, errors: ['Phiếu trả lời phải là một mảng số nguyên.'] };
  }

  if (answers.length !== options.totalQuestions) {
    errors.push(
      `Độ dài phiếu trả lời (${answers.length}) không khớp với tổng số câu hỏi của đề (${options.totalQuestions}).`,
    );
  }

  const defaultMaxOption = options.allowedMaxOption ?? 4;

  for (let i = 0; i < answers.length; i++) {
    const val = answers[i];
    const maxForQuestion = options.optionCounts?.[i] ?? defaultMaxOption;

    if (val === undefined || typeof val !== 'number' || !Number.isInteger(val)) {
      errors.push(`Câu ${i + 1}: Lựa chọn phải là số nguyên (nhận được: ${String(val)}).`);
      continue;
    }

    if (val < 0) {
      errors.push(`Câu ${i + 1}: Lựa chọn không được âm (nhận được: ${val}).`);
      continue;
    }

    if (val > maxForQuestion) {
      errors.push(
        `Câu ${i + 1}: Lựa chọn ${val} vượt quá số phương án của câu hỏi (tối đa: ${maxForQuestion}).`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Asserts that an answer sheet is valid, throwing an error if validation fails
 */
export function assertValidAnswerSheet(
  answers: number[],
  options: AnswerSheetValidationOptions,
): void {
  const result = validateAnswerSheet(answers, options);
  if (!result.valid) {
    const error = new Error(`Phiếu trả lời không hợp lệ: ${result.errors.join('; ')}`);
    error.name = 'SheetValidationError';
    throw error;
  }
}

/**
 * Validates a single choice against a question's option count
 */
export function validateAnswerChoice(choice: number, optionCount: number = 4): boolean {
  if (!Number.isInteger(choice) || choice < 0) return false;
  return choice <= optionCount;
}
