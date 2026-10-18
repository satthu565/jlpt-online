import type {
  Blueprint,
  BlueprintSection,
  Level,
  MondaiType,
  PaceStatus,
  PacingEvaluation,
  PacingMilestone,
  SectionPacingModel,
} from '@jlpt/schema';

/**
 * Recommended time in seconds per question for each MondaiType across JLPT levels.
 * Calibrated against official exam section durations and standard test-taking strategies.
 */
export const RECOMMENDED_MONDAI_PACE: Record<Level, Partial<Record<MondaiType, number>>> = {
  N1: {
    // Language Knowledge (Vocab)
    kanji_reading: 35,
    contextual: 55,
    paraphrase: 60,
    usage: 80,
    // Language Knowledge (Grammar)
    grammar_form: 50,
    sentence_composition: 75,
    text_grammar: 90,
    // Reading
    comprehension_short: 150, // 2.5 min per passage (1 question)
    comprehension_mid: 150, // 7.5 min per passage (3 questions)
    comprehension_long: 180, // ~12 min per passage (4 questions)
    integrated_reading: 180, // ~9 min for comparison (3 questions)
    thematic: 180, // ~9 min for opinion (3 questions)
    info_retrieval: 210, // ~7 min for scan & search (2 questions)
    // Listening
    task_based: 130,
    point: 130,
    summary: 140,
    quick_response: 40,
    integrated_listening: 180,
  },
  N2: {
    // Vocab
    kanji_reading: 35,
    orthography: 35,
    word_formation: 45,
    contextual: 55,
    paraphrase: 60,
    usage: 75,
    // Grammar
    grammar_form: 50,
    sentence_composition: 75,
    text_grammar: 90,
    // Reading
    comprehension_short: 150,
    comprehension_mid: 150,
    integrated_reading: 180,
    comprehension_long: 180,
    info_retrieval: 180,
    // Listening
    task_based: 130,
    point: 130,
    summary: 140,
    quick_response: 40,
    integrated_listening: 105,
  },
  N3: {
    // Vocab
    kanji_reading: 40,
    orthography: 40,
    contextual: 55,
    paraphrase: 60,
    usage: 75,
    // Grammar
    grammar_form: 50,
    sentence_composition: 75,
    text_grammar: 90,
    // Reading
    comprehension_short: 160,
    comprehension_mid: 170,
    comprehension_long: 190,
    info_retrieval: 200,
    // Listening
    task_based: 120,
    point: 120,
    summary: 130,
    utterance: 60,
    quick_response: 40,
  },
  N4: {
    // Vocab
    kanji_reading: 40,
    orthography: 40,
    contextual: 50,
    paraphrase: 55,
    usage: 65,
    // Grammar
    grammar_form: 45,
    sentence_composition: 65,
    text_grammar: 85,
    // Reading
    comprehension_short: 160,
    comprehension_mid: 180,
    info_retrieval: 180,
    // Listening
    task_based: 110,
    point: 110,
    utterance: 55,
    quick_response: 40,
  },
  N5: {
    // Vocab
    kanji_reading: 40,
    orthography: 40,
    contextual: 50,
    paraphrase: 55,
    // Grammar
    grammar_form: 45,
    sentence_composition: 60,
    text_grammar: 80,
    // Reading
    comprehension_short: 150,
    comprehension_mid: 170,
    info_retrieval: 180,
    // Listening
    task_based: 100,
    point: 100,
    utterance: 50,
    quick_response: 35,
  },
};

/**
 * Vietnamese human-readable names for Mondai types.
 */
export const MONDAI_TYPE_NAMES: Record<MondaiType, string> = {
  kanji_reading: 'Cách đọc Hán tự (漢字読み)',
  orthography: 'Cách viết chữ Hán (表記)',
  word_formation: 'Cấu tạo từ (語形成)',
  contextual: 'Ngữ cảnh sử dụng (文脈規定)',
  paraphrase: 'Từ đồng nghĩa / Cách nói tương đương (言い換え類義)',
  usage: 'Cách dùng từ trong câu (用法)',
  grammar_form: 'Hình thức ngữ pháp (文法形式の判断)',
  sentence_composition: 'Sắp xếp câu sao (文の組み立て)',
  text_grammar: 'Ngữ pháp trong đoạn văn (文章の文法)',
  comprehension_short: 'Đọc hiểu đoạn ngắn (短文読解)',
  comprehension_mid: 'Đọc hiểu đoạn trung (中文読解)',
  comprehension_long: 'Đọc hiểu đoạn dài (長文読解)',
  integrated_reading: 'Đọc hiểu tổng hợp / so sánh (統合理解)',
  thematic: 'Đọc hiểu chủ đề / quan điểm (主張理解)',
  info_retrieval: 'Tìm kiếm thông tin (情報検索)',
  task_based: 'Nghe hiểu nhiệm vụ (課題理解)',
  point: 'Nghe hiểu điểm then chốt (ポイント理解)',
  summary: 'Nghe hiểu khái quát (概要理解)',
  utterance: 'Phát ngôn biểu đạt ngữ cảnh (発話表現)',
  quick_response: 'Phản xạ nhanh (即時応答)',
  integrated_listening: 'Nghe hiểu tích hợp (統合理解)',
};

/**
 * Fallback recommended seconds per question if not found in table.
 */
export const DEFAULT_QUESTION_PACE_SEC = 60;

/**
 * Standard JLPT Pacing Models across N1–N5.
 */
export const STANDARD_PACING_MODELS: Record<Level, SectionPacingModel[]> = {
  N1: [
    {
      level: 'N1',
      sectionCode: 'language_reading',
      sectionTitle: '言語知識（文字・語彙・文法）・読解',
      totalDurationSec: 6600, // 110 minutes
      bufferSec: 270, // 4.5 minutes buffer at end
      totalQuestions: 70,
      mondaiPacing: [
        { mondaiType: 'kanji_reading', name: MONDAI_TYPE_NAMES.kanji_reading, questionCount: 6, recommendedSecPerQuestion: 35, recommendedTotalSec: 210 },
        { mondaiType: 'contextual', name: MONDAI_TYPE_NAMES.contextual, questionCount: 7, recommendedSecPerQuestion: 55, recommendedTotalSec: 385 },
        { mondaiType: 'paraphrase', name: MONDAI_TYPE_NAMES.paraphrase, questionCount: 6, recommendedSecPerQuestion: 60, recommendedTotalSec: 360 },
        { mondaiType: 'usage', name: MONDAI_TYPE_NAMES.usage, questionCount: 6, recommendedSecPerQuestion: 80, recommendedTotalSec: 480 },
        { mondaiType: 'grammar_form', name: MONDAI_TYPE_NAMES.grammar_form, questionCount: 10, recommendedSecPerQuestion: 50, recommendedTotalSec: 500 },
        { mondaiType: 'sentence_composition', name: MONDAI_TYPE_NAMES.sentence_composition, questionCount: 5, recommendedSecPerQuestion: 75, recommendedTotalSec: 375 },
        { mondaiType: 'text_grammar', name: MONDAI_TYPE_NAMES.text_grammar, questionCount: 5, recommendedSecPerQuestion: 90, recommendedTotalSec: 450 },
        { mondaiType: 'comprehension_short', name: MONDAI_TYPE_NAMES.comprehension_short, questionCount: 4, recommendedSecPerQuestion: 150, recommendedTotalSec: 600 },
        { mondaiType: 'comprehension_mid', name: MONDAI_TYPE_NAMES.comprehension_mid, questionCount: 9, recommendedSecPerQuestion: 150, recommendedTotalSec: 1350 },
        { mondaiType: 'comprehension_long', name: MONDAI_TYPE_NAMES.comprehension_long, questionCount: 4, recommendedSecPerQuestion: 180, recommendedTotalSec: 720 },
        { mondaiType: 'integrated_reading', name: MONDAI_TYPE_NAMES.integrated_reading, questionCount: 3, recommendedSecPerQuestion: 180, recommendedTotalSec: 540 },
        { mondaiType: 'thematic', name: MONDAI_TYPE_NAMES.thematic, questionCount: 3, recommendedSecPerQuestion: 180, recommendedTotalSec: 540 },
        { mondaiType: 'info_retrieval', name: MONDAI_TYPE_NAMES.info_retrieval, questionCount: 2, recommendedSecPerQuestion: 210, recommendedTotalSec: 420 },
      ],
      milestones: [
        { id: 'n1_s1_m1', label: 'Hoàn thành phần Từ vựng (Mondai 1–4)', targetMondaiIndex: 3, targetQuestionIndex: 25, targetElapsedSec: 1435, targetRemainingSec: 5165, cumulativePercent: 22 },
        { id: 'n1_s1_m2', label: 'Hoàn thành phần Ngữ pháp (Mondai 5–7)', targetMondaiIndex: 6, targetQuestionIndex: 45, targetElapsedSec: 2760, targetRemainingSec: 3840, cumulativePercent: 42 },
        { id: 'n1_s1_m3', label: 'Hoàn thành Đọc hiểu ngắn (Mondai 8)', targetMondaiIndex: 7, targetQuestionIndex: 49, targetElapsedSec: 3360, targetRemainingSec: 3240, cumulativePercent: 51 },
        { id: 'n1_s1_m4', label: 'Hoàn thành Đọc hiểu trung (Mondai 9)', targetMondaiIndex: 8, targetQuestionIndex: 58, targetElapsedSec: 4710, targetRemainingSec: 1890, cumulativePercent: 71 },
        { id: 'n1_s1_m5', label: 'Hoàn thành Đọc hiểu dài, So sánh & Chủ đề (Mondai 10–12)', targetMondaiIndex: 11, targetQuestionIndex: 68, targetElapsedSec: 6510, targetRemainingSec: 90, cumulativePercent: 99 },
        { id: 'n1_s1_m6', label: 'Hoàn thành Tìm kiếm thông tin & Rà soát bài (Mondai 13 + Buffer)', targetMondaiIndex: 12, targetQuestionIndex: 70, targetElapsedSec: 6600, targetRemainingSec: 0, cumulativePercent: 100 },
      ],
    },
    {
      level: 'N1',
      sectionCode: 'listening',
      sectionTitle: '聴解',
      totalDurationSec: 3600, // 60 minutes
      bufferSec: 0,
      totalQuestions: 35,
      mondaiPacing: [
        { mondaiType: 'task_based', name: MONDAI_TYPE_NAMES.task_based, questionCount: 6, recommendedSecPerQuestion: 130, recommendedTotalSec: 780 },
        { mondaiType: 'point', name: MONDAI_TYPE_NAMES.point, questionCount: 7, recommendedSecPerQuestion: 130, recommendedTotalSec: 910 },
        { mondaiType: 'summary', name: MONDAI_TYPE_NAMES.summary, questionCount: 6, recommendedSecPerQuestion: 140, recommendedTotalSec: 840 },
        { mondaiType: 'quick_response', name: MONDAI_TYPE_NAMES.quick_response, questionCount: 13, recommendedSecPerQuestion: 40, recommendedTotalSec: 520 },
        { mondaiType: 'integrated_listening', name: MONDAI_TYPE_NAMES.integrated_listening, questionCount: 3, recommendedSecPerQuestion: 180, recommendedTotalSec: 540 },
      ],
      milestones: [
        { id: 'n1_s2_m1', label: 'Hoàn thành Mondai 1 (Hiểu nhiệm vụ)', targetMondaiIndex: 0, targetQuestionIndex: 6, targetElapsedSec: 780, targetRemainingSec: 2820, cumulativePercent: 22 },
        { id: 'n1_s2_m2', label: 'Hoàn thành Mondai 2 (Hiểu điểm cốt lõi)', targetMondaiIndex: 1, targetQuestionIndex: 13, targetElapsedSec: 1690, targetRemainingSec: 1910, cumulativePercent: 47 },
        { id: 'n1_s2_m3', label: 'Hoàn thành Mondai 3 (Hiểu khái quát)', targetMondaiIndex: 2, targetQuestionIndex: 19, targetElapsedSec: 2530, targetRemainingSec: 1070, cumulativePercent: 70 },
        { id: 'n1_s2_m4', label: 'Hoàn thành Mondai 4 (Ứng đáp nhanh)', targetMondaiIndex: 3, targetQuestionIndex: 32, targetElapsedSec: 3050, targetRemainingSec: 550, cumulativePercent: 85 },
        { id: 'n1_s2_m5', label: 'Hoàn thành Mondai 5 (Nghe hiểu tích hợp)', targetMondaiIndex: 4, targetQuestionIndex: 35, targetElapsedSec: 3600, targetRemainingSec: 0, cumulativePercent: 100 },
      ],
    },
  ],
  N2: [
    {
      level: 'N2',
      sectionCode: 'language_reading',
      sectionTitle: '言語知識（文字・語彙・文法）・読解',
      totalDurationSec: 6300, // 105 minutes
      bufferSec: 250,
      totalQuestions: 75,
      mondaiPacing: [
        { mondaiType: 'kanji_reading', name: MONDAI_TYPE_NAMES.kanji_reading, questionCount: 5, recommendedSecPerQuestion: 35, recommendedTotalSec: 175 },
        { mondaiType: 'orthography', name: MONDAI_TYPE_NAMES.orthography, questionCount: 5, recommendedSecPerQuestion: 35, recommendedTotalSec: 175 },
        { mondaiType: 'word_formation', name: MONDAI_TYPE_NAMES.word_formation, questionCount: 5, recommendedSecPerQuestion: 45, recommendedTotalSec: 225 },
        { mondaiType: 'contextual', name: MONDAI_TYPE_NAMES.contextual, questionCount: 7, recommendedSecPerQuestion: 55, recommendedTotalSec: 385 },
        { mondaiType: 'paraphrase', name: MONDAI_TYPE_NAMES.paraphrase, questionCount: 5, recommendedSecPerQuestion: 60, recommendedTotalSec: 300 },
        { mondaiType: 'usage', name: MONDAI_TYPE_NAMES.usage, questionCount: 5, recommendedSecPerQuestion: 75, recommendedTotalSec: 375 },
        { mondaiType: 'grammar_form', name: MONDAI_TYPE_NAMES.grammar_form, questionCount: 12, recommendedSecPerQuestion: 50, recommendedTotalSec: 600 },
        { mondaiType: 'sentence_composition', name: MONDAI_TYPE_NAMES.sentence_composition, questionCount: 5, recommendedSecPerQuestion: 75, recommendedTotalSec: 375 },
        { mondaiType: 'text_grammar', name: MONDAI_TYPE_NAMES.text_grammar, questionCount: 5, recommendedSecPerQuestion: 90, recommendedTotalSec: 450 },
        { mondaiType: 'comprehension_short', name: MONDAI_TYPE_NAMES.comprehension_short, questionCount: 5, recommendedSecPerQuestion: 150, recommendedTotalSec: 750 },
        { mondaiType: 'comprehension_mid', name: MONDAI_TYPE_NAMES.comprehension_mid, questionCount: 9, recommendedSecPerQuestion: 150, recommendedTotalSec: 1350 },
        { mondaiType: 'integrated_reading', name: MONDAI_TYPE_NAMES.integrated_reading, questionCount: 2, recommendedSecPerQuestion: 180, recommendedTotalSec: 360 },
        { mondaiType: 'comprehension_long', name: MONDAI_TYPE_NAMES.comprehension_long, questionCount: 3, recommendedSecPerQuestion: 180, recommendedTotalSec: 540 },
        { mondaiType: 'info_retrieval', name: MONDAI_TYPE_NAMES.info_retrieval, questionCount: 2, recommendedSecPerQuestion: 180, recommendedTotalSec: 360 },
      ],
      milestones: [
        { id: 'n2_s1_m1', label: 'Hoàn thành phần Từ vựng (Mondai 1–6)', targetMondaiIndex: 5, targetQuestionIndex: 32, targetElapsedSec: 1635, targetRemainingSec: 4665, cumulativePercent: 26 },
        { id: 'n2_s1_m2', label: 'Hoàn thành phần Ngữ pháp (Mondai 7–9)', targetMondaiIndex: 8, targetQuestionIndex: 54, targetElapsedSec: 3060, targetRemainingSec: 3240, cumulativePercent: 49 },
        { id: 'n2_s1_m3', label: 'Hoàn thành Đọc hiểu ngắn (Mondai 10)', targetMondaiIndex: 9, targetQuestionIndex: 59, targetElapsedSec: 3810, targetRemainingSec: 2490, cumulativePercent: 60 },
        { id: 'n2_s1_m4', label: 'Hoàn thành Đọc hiểu trung (Mondai 11)', targetMondaiIndex: 10, targetQuestionIndex: 68, targetElapsedSec: 5160, targetRemainingSec: 1140, cumulativePercent: 82 },
        { id: 'n2_s1_m5', label: 'Hoàn thành Đọc hiểu tổng hợp & dài (Mondai 12–13)', targetMondaiIndex: 12, targetQuestionIndex: 73, targetElapsedSec: 6060, targetRemainingSec: 240, cumulativePercent: 96 },
        { id: 'n2_s1_m6', label: 'Hoàn thành Tìm kiếm thông tin & Rà soát (Mondai 14 + Buffer)', targetMondaiIndex: 13, targetQuestionIndex: 75, targetElapsedSec: 6300, targetRemainingSec: 0, cumulativePercent: 100 },
      ],
    },
    {
      level: 'N2',
      sectionCode: 'listening',
      sectionTitle: '聴解',
      totalDurationSec: 3000, // 50 minutes
      bufferSec: 0,
      totalQuestions: 31,
      mondaiPacing: [
        { mondaiType: 'task_based', name: MONDAI_TYPE_NAMES.task_based, questionCount: 5, recommendedSecPerQuestion: 130, recommendedTotalSec: 650 },
        { mondaiType: 'point', name: MONDAI_TYPE_NAMES.point, questionCount: 6, recommendedSecPerQuestion: 130, recommendedTotalSec: 780 },
        { mondaiType: 'summary', name: MONDAI_TYPE_NAMES.summary, questionCount: 5, recommendedSecPerQuestion: 140, recommendedTotalSec: 700 },
        { mondaiType: 'quick_response', name: MONDAI_TYPE_NAMES.quick_response, questionCount: 11, recommendedSecPerQuestion: 40, recommendedTotalSec: 440 },
        { mondaiType: 'integrated_listening', name: MONDAI_TYPE_NAMES.integrated_listening, questionCount: 4, recommendedSecPerQuestion: 105, recommendedTotalSec: 420 },
      ],
      milestones: [
        { id: 'n2_s2_m1', label: 'Hoàn thành Mondai 1 (Hiểu nhiệm vụ)', targetMondaiIndex: 0, targetQuestionIndex: 5, targetElapsedSec: 650, targetRemainingSec: 2350, cumulativePercent: 22 },
        { id: 'n2_s2_m2', label: 'Hoàn thành Mondai 2 (Hiểu điểm cốt lõi)', targetMondaiIndex: 1, targetQuestionIndex: 11, targetElapsedSec: 1430, targetRemainingSec: 1570, cumulativePercent: 48 },
        { id: 'n2_s2_m3', label: 'Hoàn thành Mondai 3 (Hiểu khái quát)', targetMondaiIndex: 2, targetQuestionIndex: 16, targetElapsedSec: 2130, targetRemainingSec: 870, cumulativePercent: 71 },
        { id: 'n2_s2_m4', label: 'Hoàn thành Mondai 4 (Ứng đáp nhanh)', targetMondaiIndex: 3, targetQuestionIndex: 27, targetElapsedSec: 2570, targetRemainingSec: 430, cumulativePercent: 86 },
        { id: 'n2_s2_m5', label: 'Hoàn thành Mondai 5 (Nghe hiểu tích hợp)', targetMondaiIndex: 4, targetQuestionIndex: 31, targetElapsedSec: 3000, targetRemainingSec: 0, cumulativePercent: 100 },
      ],
    },
  ],
  N3: [
    {
      level: 'N3',
      sectionCode: 'language_vocab',
      sectionTitle: '言語知識（文字・語彙）',
      totalDurationSec: 1800, // 30 minutes
      bufferSec: 120,
      totalQuestions: 33,
      mondaiPacing: [
        { mondaiType: 'kanji_reading', name: MONDAI_TYPE_NAMES.kanji_reading, questionCount: 8, recommendedSecPerQuestion: 40, recommendedTotalSec: 320 },
        { mondaiType: 'orthography', name: MONDAI_TYPE_NAMES.orthography, questionCount: 6, recommendedSecPerQuestion: 40, recommendedTotalSec: 240 },
        { mondaiType: 'contextual', name: MONDAI_TYPE_NAMES.contextual, questionCount: 11, recommendedSecPerQuestion: 55, recommendedTotalSec: 605 },
        { mondaiType: 'paraphrase', name: MONDAI_TYPE_NAMES.paraphrase, questionCount: 4, recommendedSecPerQuestion: 60, recommendedTotalSec: 240 },
        { mondaiType: 'usage', name: MONDAI_TYPE_NAMES.usage, questionCount: 4, recommendedSecPerQuestion: 75, recommendedTotalSec: 300 },
      ],
      milestones: [
        { id: 'n3_s1_m1', label: 'Hoàn thành Cách đọc & Viết Kanji (Mondai 1–2)', targetMondaiIndex: 1, targetQuestionIndex: 14, targetElapsedSec: 560, targetRemainingSec: 1240, cumulativePercent: 31 },
        { id: 'n3_s1_m2', label: 'Hoàn thành Ngữ cảnh từ vựng (Mondai 3)', targetMondaiIndex: 2, targetQuestionIndex: 25, targetElapsedSec: 1165, targetRemainingSec: 635, cumulativePercent: 65 },
        { id: 'n3_s1_m3', label: 'Hoàn thành Từ đồng nghĩa & Cách dùng (Mondai 4–5 + Buffer)', targetMondaiIndex: 4, targetQuestionIndex: 33, targetElapsedSec: 1800, targetRemainingSec: 0, cumulativePercent: 100 },
      ],
    },
    {
      level: 'N3',
      sectionCode: 'language_grammar_reading',
      sectionTitle: '言語知識（文法）・読解',
      totalDurationSec: 4200, // 70 minutes
      bufferSec: 180,
      totalQuestions: 39,
      mondaiPacing: [
        { mondaiType: 'grammar_form', name: MONDAI_TYPE_NAMES.grammar_form, questionCount: 13, recommendedSecPerQuestion: 50, recommendedTotalSec: 650 },
        { mondaiType: 'sentence_composition', name: MONDAI_TYPE_NAMES.sentence_composition, questionCount: 5, recommendedSecPerQuestion: 75, recommendedTotalSec: 375 },
        { mondaiType: 'text_grammar', name: MONDAI_TYPE_NAMES.text_grammar, questionCount: 5, recommendedSecPerQuestion: 90, recommendedTotalSec: 450 },
        { mondaiType: 'comprehension_short', name: MONDAI_TYPE_NAMES.comprehension_short, questionCount: 4, recommendedSecPerQuestion: 160, recommendedTotalSec: 640 },
        { mondaiType: 'comprehension_mid', name: MONDAI_TYPE_NAMES.comprehension_mid, questionCount: 6, recommendedSecPerQuestion: 170, recommendedTotalSec: 1020 },
        { mondaiType: 'comprehension_long', name: MONDAI_TYPE_NAMES.comprehension_long, questionCount: 4, recommendedSecPerQuestion: 190, recommendedTotalSec: 760 },
        { mondaiType: 'info_retrieval', name: MONDAI_TYPE_NAMES.info_retrieval, questionCount: 2, recommendedSecPerQuestion: 200, recommendedTotalSec: 400 },
      ],
      milestones: [
        { id: 'n3_s2_m1', label: 'Hoàn thành phần Ngữ pháp (Mondai 1–3)', targetMondaiIndex: 2, targetQuestionIndex: 23, targetElapsedSec: 1475, targetRemainingSec: 2725, cumulativePercent: 35 },
        { id: 'n3_s2_m2', label: 'Hoàn thành Đọc hiểu ngắn (Mondai 4)', targetMondaiIndex: 3, targetQuestionIndex: 27, targetElapsedSec: 2115, targetRemainingSec: 2085, cumulativePercent: 50 },
        { id: 'n3_s2_m3', label: 'Hoàn thành Đọc hiểu trung (Mondai 5)', targetMondaiIndex: 4, targetQuestionIndex: 33, targetElapsedSec: 3135, targetRemainingSec: 1065, cumulativePercent: 75 },
        { id: 'n3_s2_m4', label: 'Hoàn thành Đọc hiểu dài & Tìm kiếm thông tin (Mondai 6–7 + Buffer)', targetMondaiIndex: 6, targetQuestionIndex: 39, targetElapsedSec: 4200, targetRemainingSec: 0, cumulativePercent: 100 },
      ],
    },
    {
      level: 'N3',
      sectionCode: 'listening',
      sectionTitle: '聴解',
      totalDurationSec: 2400, // 40 minutes
      bufferSec: 0,
      totalQuestions: 28,
      mondaiPacing: [
        { mondaiType: 'task_based', name: MONDAI_TYPE_NAMES.task_based, questionCount: 6, recommendedSecPerQuestion: 120, recommendedTotalSec: 720 },
        { mondaiType: 'point', name: MONDAI_TYPE_NAMES.point, questionCount: 6, recommendedSecPerQuestion: 120, recommendedTotalSec: 720 },
        { mondaiType: 'summary', name: MONDAI_TYPE_NAMES.summary, questionCount: 3, recommendedSecPerQuestion: 130, recommendedTotalSec: 390 },
        { mondaiType: 'utterance', name: MONDAI_TYPE_NAMES.utterance, questionCount: 4, recommendedSecPerQuestion: 60, recommendedTotalSec: 240 },
        { mondaiType: 'quick_response', name: MONDAI_TYPE_NAMES.quick_response, questionCount: 9, recommendedSecPerQuestion: 40, recommendedTotalSec: 360 },
      ],
      milestones: [
        { id: 'n3_s3_m1', label: 'Hoàn thành Mondai 1 (Hiểu nhiệm vụ)', targetMondaiIndex: 0, targetQuestionIndex: 6, targetElapsedSec: 720, targetRemainingSec: 1680, cumulativePercent: 30 },
        { id: 'n3_s3_m2', label: 'Hoàn thành Mondai 2 (Hiểu điểm cốt lõi)', targetMondaiIndex: 1, targetQuestionIndex: 12, targetElapsedSec: 1440, targetRemainingSec: 960, cumulativePercent: 60 },
        { id: 'n3_s3_m3', label: 'Hoàn thành Mondai 3 (Hiểu khái quát)', targetMondaiIndex: 2, targetQuestionIndex: 15, targetElapsedSec: 1830, targetRemainingSec: 570, cumulativePercent: 76 },
        { id: 'n3_s3_m4', label: 'Hoàn thành Mondai 4–5 (Phát ngôn & Phản xạ nhanh)', targetMondaiIndex: 4, targetQuestionIndex: 28, targetElapsedSec: 2400, targetRemainingSec: 0, cumulativePercent: 100 },
      ],
    },
  ],
  N4: [
    {
      level: 'N4',
      sectionCode: 'language_vocab',
      sectionTitle: '言語知識（文字・語彙）',
      totalDurationSec: 1500, // 25 minutes (2020 revision)
      bufferSec: 100,
      totalQuestions: 30,
      mondaiPacing: [
        { mondaiType: 'kanji_reading', name: MONDAI_TYPE_NAMES.kanji_reading, questionCount: 9, recommendedSecPerQuestion: 40, recommendedTotalSec: 360 },
        { mondaiType: 'orthography', name: MONDAI_TYPE_NAMES.orthography, questionCount: 6, recommendedSecPerQuestion: 40, recommendedTotalSec: 240 },
        { mondaiType: 'contextual', name: MONDAI_TYPE_NAMES.contextual, questionCount: 10, recommendedSecPerQuestion: 50, recommendedTotalSec: 500 },
        { mondaiType: 'paraphrase', name: MONDAI_TYPE_NAMES.paraphrase, questionCount: 5, recommendedSecPerQuestion: 55, recommendedTotalSec: 275 },
      ],
      milestones: [
        { id: 'n4_s1_m1', label: 'Hoàn thành Đọc & Viết Kanji (Mondai 1–2)', targetMondaiIndex: 1, targetQuestionIndex: 15, targetElapsedSec: 600, targetRemainingSec: 900, cumulativePercent: 40 },
        { id: 'n4_s1_m2', label: 'Hoàn thành Ngữ cảnh từ vựng (Mondai 3)', targetMondaiIndex: 2, targetQuestionIndex: 25, targetElapsedSec: 1100, targetRemainingSec: 400, cumulativePercent: 73 },
        { id: 'n4_s1_m3', label: 'Hoàn thành Từ đồng nghĩa & Rà soát (Mondai 4 + Buffer)', targetMondaiIndex: 3, targetQuestionIndex: 30, targetElapsedSec: 1500, targetRemainingSec: 0, cumulativePercent: 100 },
      ],
    },
    {
      level: 'N4',
      sectionCode: 'language_grammar_reading',
      sectionTitle: '言語知識（文法）・読解',
      totalDurationSec: 3300, // 55 minutes
      bufferSec: 150,
      totalQuestions: 35,
      mondaiPacing: [
        { mondaiType: 'grammar_form', name: MONDAI_TYPE_NAMES.grammar_form, questionCount: 15, recommendedSecPerQuestion: 45, recommendedTotalSec: 675 },
        { mondaiType: 'sentence_composition', name: MONDAI_TYPE_NAMES.sentence_composition, questionCount: 5, recommendedSecPerQuestion: 65, recommendedTotalSec: 325 },
        { mondaiType: 'text_grammar', name: MONDAI_TYPE_NAMES.text_grammar, questionCount: 5, recommendedSecPerQuestion: 85, recommendedTotalSec: 425 },
        { mondaiType: 'comprehension_short', name: MONDAI_TYPE_NAMES.comprehension_short, questionCount: 4, recommendedSecPerQuestion: 160, recommendedTotalSec: 640 },
        { mondaiType: 'comprehension_mid', name: MONDAI_TYPE_NAMES.comprehension_mid, questionCount: 4, recommendedSecPerQuestion: 180, recommendedTotalSec: 720 },
        { mondaiType: 'info_retrieval', name: MONDAI_TYPE_NAMES.info_retrieval, questionCount: 2, recommendedSecPerQuestion: 180, recommendedTotalSec: 360 },
      ],
      milestones: [
        { id: 'n4_s2_m1', label: 'Hoàn thành phần Ngữ pháp (Mondai 1–3)', targetMondaiIndex: 2, targetQuestionIndex: 25, targetElapsedSec: 1425, targetRemainingSec: 1875, cumulativePercent: 43 },
        { id: 'n4_s2_m2', label: 'Hoàn thành Đọc hiểu ngắn (Mondai 4)', targetMondaiIndex: 3, targetQuestionIndex: 29, targetElapsedSec: 2065, targetRemainingSec: 1235, cumulativePercent: 63 },
        { id: 'n4_s2_m3', label: 'Hoàn thành Đọc hiểu trung (Mondai 5)', targetMondaiIndex: 4, targetQuestionIndex: 33, targetElapsedSec: 2785, targetRemainingSec: 515, cumulativePercent: 84 },
        { id: 'n4_s2_m4', label: 'Hoàn thành Tìm kiếm thông tin & Rà soát (Mondai 6 + Buffer)', targetMondaiIndex: 5, targetQuestionIndex: 35, targetElapsedSec: 3300, targetRemainingSec: 0, cumulativePercent: 100 },
      ],
    },
    {
      level: 'N4',
      sectionCode: 'listening',
      sectionTitle: '聴解',
      totalDurationSec: 2100, // 35 minutes
      bufferSec: 0,
      totalQuestions: 28,
      mondaiPacing: [
        { mondaiType: 'task_based', name: MONDAI_TYPE_NAMES.task_based, questionCount: 8, recommendedSecPerQuestion: 110, recommendedTotalSec: 880 },
        { mondaiType: 'point', name: MONDAI_TYPE_NAMES.point, questionCount: 7, recommendedSecPerQuestion: 110, recommendedTotalSec: 770 },
        { mondaiType: 'utterance', name: MONDAI_TYPE_NAMES.utterance, questionCount: 5, recommendedSecPerQuestion: 55, recommendedTotalSec: 275 },
        { mondaiType: 'quick_response', name: MONDAI_TYPE_NAMES.quick_response, questionCount: 8, recommendedSecPerQuestion: 40, recommendedTotalSec: 320 },
      ],
      milestones: [
        { id: 'n4_s3_m1', label: 'Hoàn thành Mondai 1 (Hiểu nhiệm vụ)', targetMondaiIndex: 0, targetQuestionIndex: 8, targetElapsedSec: 880, targetRemainingSec: 1220, cumulativePercent: 42 },
        { id: 'n4_s3_m2', label: 'Hoàn thành Mondai 2 (Hiểu điểm then chốt)', targetMondaiIndex: 1, targetQuestionIndex: 15, targetElapsedSec: 1650, targetRemainingSec: 450, cumulativePercent: 79 },
        { id: 'n4_s3_m3', label: 'Hoàn thành Mondai 3–4 (Phát ngôn & Phản xạ nhanh)', targetMondaiIndex: 3, targetQuestionIndex: 28, targetElapsedSec: 2100, targetRemainingSec: 0, cumulativePercent: 100 },
      ],
    },
  ],
  N5: [
    {
      level: 'N5',
      sectionCode: 'language_vocab',
      sectionTitle: '言語知識（文字・語彙）',
      totalDurationSec: 1200, // 20 minutes (2020 revision)
      bufferSec: 90,
      totalQuestions: 25,
      mondaiPacing: [
        { mondaiType: 'kanji_reading', name: MONDAI_TYPE_NAMES.kanji_reading, questionCount: 12, recommendedSecPerQuestion: 40, recommendedTotalSec: 480 },
        { mondaiType: 'orthography', name: MONDAI_TYPE_NAMES.orthography, questionCount: 8, recommendedSecPerQuestion: 40, recommendedTotalSec: 320 },
        { mondaiType: 'contextual', name: MONDAI_TYPE_NAMES.contextual, questionCount: 5, recommendedSecPerQuestion: 50, recommendedTotalSec: 250 },
      ],
      milestones: [
        { id: 'n5_s1_m1', label: 'Hoàn thành Cách đọc Hán tự (Mondai 1)', targetMondaiIndex: 0, targetQuestionIndex: 12, targetElapsedSec: 480, targetRemainingSec: 720, cumulativePercent: 40 },
        { id: 'n5_s1_m2', label: 'Hoàn thành Cách viết Hán tự (Mondai 2)', targetMondaiIndex: 1, targetQuestionIndex: 20, targetElapsedSec: 800, targetRemainingSec: 400, cumulativePercent: 67 },
        { id: 'n5_s1_m3', label: 'Hoàn thành Ngữ cảnh từ vựng & Rà soát (Mondai 3 + Buffer)', targetMondaiIndex: 2, targetQuestionIndex: 25, targetElapsedSec: 1200, targetRemainingSec: 0, cumulativePercent: 100 },
      ],
    },
    {
      level: 'N5',
      sectionCode: 'language_grammar_reading',
      sectionTitle: '言語知識（文法）・読解',
      totalDurationSec: 2400, // 40 minutes (2020 revision)
      bufferSec: 120,
      totalQuestions: 32,
      mondaiPacing: [
        { mondaiType: 'grammar_form', name: MONDAI_TYPE_NAMES.grammar_form, questionCount: 16, recommendedSecPerQuestion: 45, recommendedTotalSec: 720 },
        { mondaiType: 'sentence_composition', name: MONDAI_TYPE_NAMES.sentence_composition, questionCount: 5, recommendedSecPerQuestion: 60, recommendedTotalSec: 300 },
        { mondaiType: 'text_grammar', name: MONDAI_TYPE_NAMES.text_grammar, questionCount: 5, recommendedSecPerQuestion: 80, recommendedTotalSec: 400 },
        { mondaiType: 'comprehension_short', name: MONDAI_TYPE_NAMES.comprehension_short, questionCount: 3, recommendedSecPerQuestion: 150, recommendedTotalSec: 450 },
        { mondaiType: 'comprehension_mid', name: MONDAI_TYPE_NAMES.comprehension_mid, questionCount: 2, recommendedSecPerQuestion: 170, recommendedTotalSec: 340 },
        { mondaiType: 'info_retrieval', name: MONDAI_TYPE_NAMES.info_retrieval, questionCount: 1, recommendedSecPerQuestion: 180, recommendedTotalSec: 180 },
      ],
      milestones: [
        { id: 'n5_s2_m1', label: 'Hoàn thành Ngữ pháp câu & Điền sao (Mondai 1–2)', targetMondaiIndex: 1, targetQuestionIndex: 21, targetElapsedSec: 1020, targetRemainingSec: 1380, cumulativePercent: 43 },
        { id: 'n5_s2_m2', label: 'Hoàn thành Ngữ pháp đoạn văn (Mondai 3)', targetMondaiIndex: 2, targetQuestionIndex: 26, targetElapsedSec: 1420, targetRemainingSec: 980, cumulativePercent: 59 },
        { id: 'n5_s2_m3', label: 'Hoàn thành Đọc hiểu ngắn, trung & Thông tin (Mondai 4–6 + Buffer)', targetMondaiIndex: 5, targetQuestionIndex: 32, targetElapsedSec: 2400, targetRemainingSec: 0, cumulativePercent: 100 },
      ],
    },
    {
      level: 'N5',
      sectionCode: 'listening',
      sectionTitle: '聴解',
      totalDurationSec: 1800, // 30 minutes (2020 revision)
      bufferSec: 0,
      totalQuestions: 24,
      mondaiPacing: [
        { mondaiType: 'task_based', name: MONDAI_TYPE_NAMES.task_based, questionCount: 7, recommendedSecPerQuestion: 100, recommendedTotalSec: 700 },
        { mondaiType: 'point', name: MONDAI_TYPE_NAMES.point, questionCount: 6, recommendedSecPerQuestion: 100, recommendedTotalSec: 600 },
        { mondaiType: 'utterance', name: MONDAI_TYPE_NAMES.utterance, questionCount: 5, recommendedSecPerQuestion: 50, recommendedTotalSec: 250 },
        { mondaiType: 'quick_response', name: MONDAI_TYPE_NAMES.quick_response, questionCount: 6, recommendedSecPerQuestion: 35, recommendedTotalSec: 210 },
      ],
      milestones: [
        { id: 'n5_s3_m1', label: 'Hoàn thành Mondai 1 (Hiểu nhiệm vụ)', targetMondaiIndex: 0, targetQuestionIndex: 7, targetElapsedSec: 700, targetRemainingSec: 1100, cumulativePercent: 39 },
        { id: 'n5_s3_m2', label: 'Hoàn thành Mondai 2 (Hiểu điểm then chốt)', targetMondaiIndex: 1, targetQuestionIndex: 13, targetElapsedSec: 1300, targetRemainingSec: 500, cumulativePercent: 72 },
        { id: 'n5_s3_m3', label: 'Hoàn thành Mondai 3–4 (Phát ngôn & Phản xạ nhanh)', targetMondaiIndex: 3, targetQuestionIndex: 24, targetElapsedSec: 1800, targetRemainingSec: 0, cumulativePercent: 100 },
      ],
    },
  ],
};

/**
 * Normalizes section code for pacing lookups.
 */
function normalizePacingSectionCode(code: string): string {
  const lower = code.toLowerCase().trim();
  if (lower === 'language' || lower === 'vocab' || lower === 'vocabulary') {
    return 'language_vocab';
  }
  if (lower === 'grammar_reading' || lower === 'reading') {
    return 'language_grammar_reading';
  }
  return lower;
}

/**
 * Returns all pacing models for a JLPT level.
 */
export function getAllPacingModels(level: Level): SectionPacingModel[] {
  const models = STANDARD_PACING_MODELS[level];
  if (!models || models.length === 0) {
    throw new Error(`Không tìm thấy mô hình nhịp làm bài cho cấp độ ${level}.`);
  }
  return models;
}

/**
 * Returns the recommended pacing model for a specific JLPT level and section.
 */
export function getPacingModel(level: Level, sectionCode?: string): SectionPacingModel {
  const models = getAllPacingModels(level);
  if (!sectionCode) {
    return models[0]!;
  }
  const norm = normalizePacingSectionCode(sectionCode);
  const found = models.find(
    (m) =>
      m.sectionCode === sectionCode ||
      normalizePacingSectionCode(m.sectionCode) === norm ||
      m.sectionCode.toLowerCase().includes(norm) ||
      norm.includes(m.sectionCode.toLowerCase()),
  );
  if (!found) {
    return models[0]!;
  }
  return found;
}

export interface EvaluatePacingParams {
  level: Level;
  sectionCode?: string;
  currentQuestionIndex: number; // 1-based current question index
  elapsedSec: number; // seconds elapsed in this section
  totalDurationSec?: number;
  model?: SectionPacingModel;
}

/**
 * Pure function: Evaluates an examinee's current pacing against the recommended schedule.
 * Determines ahead / on-track / behind / critical status, and provides remaining pace advisory.
 */
export function evaluatePacing(params: EvaluatePacingParams): PacingEvaluation {
  const {
    level,
    sectionCode,
    currentQuestionIndex,
    elapsedSec,
    totalDurationSec: overrideDuration,
    model: overrideModel,
  } = params;

  const model = overrideModel ?? getPacingModel(level, sectionCode);
  const totalDurationSec = overrideDuration ?? model.totalDurationSec;
  const totalQuestions = model.totalQuestions;

  // Build cumulative question & time timeline
  let cumulativeQ = 0;
  let cumulativeTime = 0;
  const questionTiming: Array<{ qIndex: number; targetSec: number }> = [];

  for (const mondai of model.mondaiPacing) {
    const secPerQ = mondai.recommendedSecPerQuestion;
    for (let q = 1; q <= mondai.questionCount; q++) {
      cumulativeQ += 1;
      cumulativeTime += secPerQ;
      questionTiming.push({ qIndex: cumulativeQ, targetSec: cumulativeTime });
    }
  }

  // Find expected question index at elapsedSec
  let expectedQuestionIndex = 1;
  for (let i = 0; i < questionTiming.length; i++) {
    if (elapsedSec >= questionTiming[i]!.targetSec) {
      expectedQuestionIndex = Math.min(totalQuestions, questionTiming[i]!.qIndex + 1);
    } else {
      break;
    }
  }

  // Find expected elapsed time for current question
  const currentTiming = questionTiming.find((t) => t.qIndex === currentQuestionIndex);
  const expectedElapsedSec = currentTiming ? currentTiming.targetSec : totalDurationSec;

  const diffQuestions = currentQuestionIndex - expectedQuestionIndex;
  const diffSec = expectedElapsedSec - elapsedSec; // positive = ahead, negative = behind

  const remainingSec = Math.max(0, totalDurationSec - elapsedSec);
  const remainingQuestions = Math.max(0, totalQuestions - currentQuestionIndex);

  const recommendedPacePerRemainingQuestionSec =
    remainingQuestions > 0 ? Math.round(remainingSec / remainingQuestions) : 0;

  // Find nearest upcoming milestone
  const currentMilestone =
    model.milestones.find((m) => m.targetQuestionIndex >= currentQuestionIndex) ??
    model.milestones[model.milestones.length - 1];

  let paceStatus: PaceStatus;
  let message: string;

  if (diffQuestions >= 2 || diffSec >= 90) {
    paceStatus = 'AHEAD';
    message = `Bạn đang nhanh hơn nhịp khuyến nghị ${diffQuestions > 0 ? diffQuestions : 1} câu (${Math.abs(Math.round(diffSec / 60))} phút dự phòng). Duy trì sự cẩn thận khi đọc bài.`;
  } else if (Math.abs(diffQuestions) <= 1 && Math.abs(diffSec) <= 60) {
    paceStatus = 'ON_TRACK';
    message = `Nhịp làm bài đúng chuẩn. Bạn còn trung bình ${recommendedPacePerRemainingQuestionSec}s cho mỗi câu còn lại.`;
  } else if (diffQuestions < -3 || (remainingSec < remainingQuestions * 25 && remainingQuestions > 0)) {
    paceStatus = 'CRITICAL';
    message = `Cảnh báo nhịp chậm nghiêm trọng: Chậm hơn ${Math.abs(diffQuestions)} câu. Thời gian còn lại chỉ đủ ${recommendedPacePerRemainingQuestionSec}s/câu. Cần tăng tốc hoặc bỏ qua câu khó để giữ điểm sàn.`;
  } else {
    paceStatus = 'BEHIND';
    message = `Bạn đang chậm hơn tiến độ khuyến nghị ${Math.abs(diffQuestions)} câu. Hãy tăng tốc, mục tiêu ${recommendedPacePerRemainingQuestionSec}s/câu cho các câu còn lại.`;
  }

  return {
    paceStatus,
    currentQuestionIndex,
    expectedQuestionIndex,
    diffQuestions,
    elapsedSec,
    expectedElapsedSec,
    diffSec,
    remainingSec,
    recommendedPacePerRemainingQuestionSec,
    currentMilestone,
    message,
  };
}

/**
 * Pure function: Calculates dynamic pacing model from a BlueprintSection or full Blueprint.
 */
export function calculateBlueprintPacing(
  sectionOrBlueprint: BlueprintSection | Blueprint,
  level: Level = 'N1',
): SectionPacingModel {
  let section: BlueprintSection;
  let effectiveLevel = level;

  if ('sections' in sectionOrBlueprint) {
    const bp = sectionOrBlueprint as Blueprint;
    section = bp.sections[0]!;
    effectiveLevel = bp.level;
  } else {
    section = sectionOrBlueprint as BlueprintSection;
  }

  const levelPaceTable = RECOMMENDED_MONDAI_PACE[effectiveLevel] ?? RECOMMENDED_MONDAI_PACE.N1;
  const mondaiPacing = section.mondai.map((m) => {
    const recommendedSec = levelPaceTable[m.type] ?? DEFAULT_QUESTION_PACE_SEC;
    return {
      mondaiType: m.type,
      name: MONDAI_TYPE_NAMES[m.type] ?? m.type,
      questionCount: m.questionCount,
      recommendedSecPerQuestion: recommendedSec,
      recommendedTotalSec: recommendedSec * m.questionCount,
    };
  });

  const totalRawSec = mondaiPacing.reduce((sum, m) => sum + m.recommendedTotalSec, 0);
  const totalDurationSec = section.durationSec;
  const bufferSec = Math.max(0, totalDurationSec - totalRawSec);
  const totalQuestions = mondaiPacing.reduce((sum, m) => sum + m.questionCount, 0);

  // Generate milestones at key mondai boundaries
  let cumulativeQuestions = 0;
  let cumulativeElapsed = 0;
  const milestones: PacingMilestone[] = [];

  for (let idx = 0; idx < mondaiPacing.length; idx++) {
    const item = mondaiPacing[idx]!;
    cumulativeQuestions += item.questionCount;
    cumulativeElapsed += item.recommendedTotalSec;

    // Add milestone if it's every 2-3 mondais or at the end
    const isStep =
      idx === 0 ||
      idx === Math.floor(mondaiPacing.length / 2) ||
      idx === mondaiPacing.length - 1 ||
      item.mondaiType.startsWith('comprehension') ||
      item.mondaiType === 'task_based';

    if (isStep) {
      const remaining = Math.max(0, totalDurationSec - cumulativeElapsed);
      const percent = Math.min(100, Math.round((cumulativeElapsed / totalDurationSec) * 100));
      milestones.push({
        id: `ms_${section.code}_${idx + 1}`,
        label: `Hoàn thành ${item.name} (${cumulativeQuestions}/${totalQuestions} câu)`,
        targetMondaiIndex: idx,
        targetQuestionIndex: cumulativeQuestions,
        targetElapsedSec: cumulativeElapsed,
        targetRemainingSec: remaining,
        cumulativePercent: percent,
      });
    }
  }

  return {
    level: effectiveLevel,
    sectionCode: section.code,
    sectionTitle: section.title,
    totalDurationSec,
    bufferSec,
    totalQuestions,
    mondaiPacing,
    milestones,
  };
}
