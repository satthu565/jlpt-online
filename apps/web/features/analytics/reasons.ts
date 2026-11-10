/** Reasons a learner can pick for a question they got wrong (stored by the learner, not guessed). */
export interface SelfReason {
  code: string;
  label: string;
  why: string;
  hint: string;
}

export const SELF_REASONS: SelfReason[] = [
  {
    code: 'knowledge',
    label: 'Thiếu kiến thức (từ / mẫu câu / chữ Hán)',
    why: 'Bạn chưa nắm kiến thức được kiểm tra trong câu này.',
    hint: 'Thêm kiến thức vào sổ tay và ôn bằng thẻ.',
  },
  {
    code: 'confused',
    label: 'Nhầm giữa các lựa chọn gần giống',
    why: 'Bạn biết kiến thức nhưng chọn nhầm phương án gần giống.',
    hint: 'Ôn theo cặp dễ nhầm, đối chiếu ví dụ của từng phương án.',
  },
  {
    code: 'misread',
    label: 'Đọc hoặc nghe sai yêu cầu của câu',
    why: 'Bạn hiểu sai câu hỏi đang hỏi gì (phủ định, "đúng / không đúng").',
    hint: 'Gạch chân từ phủ định và đọc kỹ câu hỏi trước khi chọn.',
  },
  {
    code: 'time',
    label: 'Không kịp thời gian',
    why: 'Bạn không đủ thời gian để làm câu này.',
    hint: 'Luyện làm đúng giờ theo từng phần thi.',
  },
  {
    code: 'careless',
    label: 'Bất cẩn (biết nhưng chọn nhầm)',
    why: 'Bạn biết đáp án nhưng chọn hoặc tô nhầm.',
    hint: 'Soát lại đáp án trước khi sang câu tiếp theo.',
  },
  {
    code: 'guess',
    label: 'Đoán mò',
    why: 'Bạn không chắc và đoán đáp án.',
    hint: 'Loại trừ các phương án chắc chắn sai trước khi đoán.',
  },
];

export const SELF_REASON_CODES: string[] = SELF_REASONS.map((r) => r.code);

export function selfReasonLabel(code: string): string {
  return SELF_REASONS.find((r) => r.code === code)?.label ?? code;
}
