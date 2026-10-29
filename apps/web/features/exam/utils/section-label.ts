export type SectionLabelKey =
  | 'paperExam.sectionVocab'
  | 'paperExam.sectionGrammarReading'
  | 'paperExam.sectionListening';

export function getSectionLabelKey(title: string): SectionLabelKey | undefined {
  const normalized = title.toLowerCase();
  if (title.includes('聴解') || normalized.includes('nghe hiểu') || normalized.includes('listening')) return 'paperExam.sectionListening';
  if (title.includes('文法') || title.includes('読解') || normalized.includes('ngữ pháp') || normalized.includes('đọc hiểu') || normalized.includes('grammar') || normalized.includes('reading')) return 'paperExam.sectionGrammarReading';
  if (title.includes('文字') || title.includes('語彙') || normalized.includes('từ vựng') || normalized.includes('vocabulary')) return 'paperExam.sectionVocab';
  return undefined;
}
