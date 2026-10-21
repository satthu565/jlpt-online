import type { MondaiType } from '@jlpt/schema';

/** Vietnamese names of the JLPT mondai types, shown to learners instead of the internal code. */
export const MONDAI_LABEL_VI: Record<MondaiType, string> = {
  kanji_reading: 'Đọc kanji',
  orthography: 'Cách viết kanji',
  word_formation: 'Cấu tạo từ',
  contextual: 'Từ theo ngữ cảnh',
  paraphrase: 'Từ gần nghĩa',
  usage: 'Cách dùng từ',
  grammar_form: 'Chọn ngữ pháp đúng',
  sentence_composition: 'Sắp xếp câu',
  text_grammar: 'Ngữ pháp đoạn văn',
  comprehension_short: 'Đọc hiểu đoạn ngắn',
  comprehension_mid: 'Đọc hiểu đoạn vừa',
  comprehension_long: 'Đọc hiểu đoạn dài',
  integrated_reading: 'Đọc hiểu tổng hợp',
  thematic: 'Đọc hiểu chủ đề',
  info_retrieval: 'Tìm thông tin',
  task_based: 'Nghe hiểu nhiệm vụ',
  point: 'Nghe hiểu điểm chính',
  summary: 'Nghe hiểu khái quát',
  utterance: 'Diễn đạt bằng lời',
  quick_response: 'Phản hồi nhanh',
  integrated_listening: 'Nghe hiểu tổng hợp',
};

export function mondaiLabel(type: string | null | undefined): string {
  if (!type) return '';
  return MONDAI_LABEL_VI[type as MondaiType] ?? '';
}
