import { NextResponse, type NextRequest } from 'next/server';
import postgres from 'postgres';
import { getAnalyticsDbUrl, resolveSessionUserId } from '../_db';
import { explanationText, extractGrammarPattern, loadBankContent, normalizePattern } from '../_content';
import { SELF_REASONS } from '../../../../features/analytics/reasons';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function extractText(stem: unknown): string {
  if (!stem) return '';
  if (typeof stem === 'string') return stem;
  if (Array.isArray(stem)) {
    return stem
      .map((item) => {
        if (!item) return '';
        if (typeof item === 'string') return item;
        if (item.text) return item.text;
        if (item.children) return extractText(item.children);
        if (item.t === 'underline' && item.children) return `【${extractText(item.children)}】`;
        if (item.t === 'blank') return `（ ${item.label || '___'} ）`;
        return '';
      })
      .join('');
  }
  return '';
}

function extractUnderline(stem: unknown): string | null {
  if (!stem || !Array.isArray(stem)) return null;
  for (const item of stem) {
    if (item.t === 'underline' && item.children) {
      return extractText(item.children);
    }
    if (item.children) {
      const sub = extractUnderline(item.children);
      if (sub) return sub;
    }
  }
  return null;
}

function extractExplanation(exp: unknown): string {
  if (!exp) return '';
  if (typeof exp === 'string') return exp;
  if (exp && typeof exp === 'object' && 'blocks' in exp && Array.isArray((exp as { blocks: unknown[] }).blocks)) {
    return (exp as { blocks: Array<{ content?: Array<{ text?: string }> }> }).blocks
      .map((b) => {
        if (b.content && Array.isArray(b.content)) {
          return b.content.map((c) => c.text || '').join('');
        }
        return '';
      })
      .join(' ');
  }
  return '';
}

function extractMeaningSummary(explanationText: string): string {
  if (!explanationText) return '';
  const match = explanationText.match(/Dịch nghĩa:\s*([^•\n]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  const firstSentence = explanationText.split(/[.•\n]/)[0];
  return (firstSentence || explanationText).slice(0, 120).trim();
}

function extractTargetTerm(
  rawStem: string,
  underline: string | null,
  _skill: string,
  explanationText: string,
  correctText: string,
): string {
  if (underline) {
    return underline;
  }
  const trimmed = rawStem.trim();
  if (trimmed.length > 0 && trimmed.length <= 10 && !trimmed.includes('（') && !trimmed.includes(' ')) {
    return trimmed;
  }
  const patternMatch =
    explanationText.match(/Mẫu câu\s*「([^」]+)」/i) || explanationText.match(/Cấu trúc\s*「([^」]+)」/i);
  if (patternMatch && patternMatch[1]) {
    return patternMatch[1];
  }
  if (correctText && correctText.length <= 15 && !correctText.includes('[')) {
    return correctText;
  }
  return trimmed.slice(0, 35) + (trimmed.length > 35 ? '...' : '');
}

// Negation words; adjectives that merely end in ない (少ない, きたない...) are not negation.
const NEGATION = /なかった|ませんでした|ません|ではない|じゃない|ずに|わけがない|とは限らない|(?<![少危汚]|きた|つまら|くだら)ない/;
const HONORIFIC = /いらっしゃ|おっしゃ|なさ[いるっ]|くださ|ご覧|召し上が|いただ(?:き|く|け(?!あ)|こ)|申し|申す|参り|参る|伺|拝見|致し|存じ|[お御ご][一-龥]{1,3}(?:になり|になる|ください|します|する|いたし)/;
const PLACEHOLDER = /^(?:選択肢|絵)\s*[0-9０-９]+$|^[1-4１-４]$/;
const PARTICLES = new Set(['は', 'が', 'を', 'に', 'で', 'と', 'も', 'の', 'へ', 'や', 'か', 'から', 'まで', 'より', 'ね', 'よ', 'ので', 'のに', 'けど']);

function bigrams(text: string): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i < text.length - 1; i++) out.add(text.slice(i, i + 2));
  return out;
}

function overlapRatio(a: string, b: string): number {
  const x = bigrams(a);
  const y = bigrams(b);
  if (x.size === 0 || y.size === 0) return 0;
  let n = 0;
  x.forEach((v) => {
    if (y.has(v)) n += 1;
  });
  return n / Math.min(x.size, y.size);
}

/** Edit distance between two strings, counted in characters. */
function editDistance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  const d: number[][] = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array<number>(y.length).fill(0)]);
  for (let j = 1; j <= y.length; j++) d[0]![j] = j;
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
  }
  return d[x.length]![y.length]!;
}

/** Same characters in a different order: the learner swapped pieces of information (time, room, person...). */
function sameCharsDifferentOrder(a: string, b: string): boolean {
  const norm = (t: string): string => t.replace(/[\s、。,.　]/g, '');
  const x = norm(a);
  const y = norm(b);
  if (x.length < 4 || x === y) return false;
  return [...x].sort().join('') === [...y].sort().join('');
}

const stripNegation = (t: string): string => t.replace(/なかった|ませんでした|ません|ない|ず|ぬ/g, '');

type TrapId =
  | 'kanjiSound'
  | 'kanjiLook'
  | 'kanji'
  | 'vocabContext'
  | 'vocabMeaning'
  | 'vocabUsage'
  | 'wordFormation'
  | 'particle'
  | 'keigo'
  | 'grammar'
  | 'compose'
  | 'readingClose'
  | 'reading'
  | 'reply'
  | 'listenContent'
  | 'swap'
  | 'neg';

/**
 * Rule-based trap type of an answered-but-wrong question, from the real option texts.
 * Rules were checked offline against every wrong option of every published question (33k cases).
 * Returns null when the options carry no text to compare (listening placeholders such as 選択肢3).
 */
function classifyTrap(
  skill: string,
  mondai: string,
  _stem: string,
  chosen: string,
  correct: string,
): TrapId | null {
  const c = chosen.trim();
  const k = correct.trim();
  if (!c || !k || PLACEHOLDER.test(c) || PLACEHOLDER.test(k)) return null;

  if (skill === 'kanji') {
    const dist = editDistance(c, k);
    if (mondai === 'orthography') return dist <= 1 ? 'kanjiLook' : 'kanji';
    return dist <= 1 && Math.min([...c].length, [...k].length) >= 3 ? 'kanjiSound' : 'kanji';
  }
  if (sameCharsDifferentOrder(c, k)) return 'swap';
  if (skill === 'listening') return mondai === 'quick_response' || mondai === 'utterance' ? 'reply' : 'listenContent';
  // negation only counts for long options that are otherwise the same sentence
  if (
    (skill === 'reading' || skill === 'grammar') &&
    [...c].length >= 8 &&
    [...k].length >= 8 &&
    NEGATION.test(c) !== NEGATION.test(k) &&
    overlapRatio(stripNegation(c), stripNegation(k)) >= 0.85
  ) {
    return 'neg';
  }
  if (skill === 'vocabulary') {
    if (mondai === 'usage') return 'vocabUsage';
    if (mondai === 'word_formation') return 'wordFormation';
    return mondai === 'paraphrase' ? 'vocabMeaning' : 'vocabContext';
  }
  if (skill === 'grammar') {
    if (PARTICLES.has(c) && PARTICLES.has(k)) return 'particle';
    if (HONORIFIC.test(c) || HONORIFIC.test(k)) return 'keigo';
    return mondai === 'sentence_composition' ? 'compose' : 'grammar';
  }
  if (skill === 'reading') return overlapRatio(c, k) >= 0.4 ? 'readingClose' : 'reading';
  return null;
}

const TRAP_INFO: Record<TrapId, { name: string; why: string; hint: string }> = {
  kanjiSound: {
    name: 'Nhầm âm đọc (lệch một âm)',
    why: 'Cách đọc bạn chọn chỉ lệch một âm so với đáp án đúng (âm đục, trường âm, âm ngắt...).',
    hint: 'Đọc to từ đó và chú ý trường âm, âm ngắt, âm đục; ôn theo các cặp âm hay lẫn (おう / お, つ / づ, ち / じ).',
  },
  kanjiLook: {
    name: 'Nhầm một chữ Hán trong từ',
    why: 'Từ bạn chọn chỉ khác đáp án đúng một chữ Hán (giống mặt chữ hoặc cùng âm đọc).',
    hint: 'Ôn bộ thủ của các chữ hay lẫn và viết lại cả từ ghép thay vì từng chữ đơn lẻ.',
  },
  kanji: {
    name: 'Chọn cách đọc / từ khác hẳn (chữ Hán)',
    why: 'Phương án bạn chọn khác hẳn đáp án đúng, thường do chưa nhớ từ hoặc nhớ nhầm sang từ khác.',
    hint: 'Ôn từ trong câu ví dụ; với số đếm và từ đọc đặc biệt (ここのつ, 今年...) học thuộc riêng.',
  },
  vocabContext: {
    name: 'Chọn từ không hợp ngữ cảnh',
    why: 'Từ bạn chọn cùng loại với đáp án đúng nhưng không hợp với ý của câu.',
    hint: 'Đọc cả vế trước và vế sau chỗ trống để xác định từ cần mang nghĩa gì, rồi loại các từ không khớp.',
  },
  vocabMeaning: {
    name: 'Hiểu sai nghĩa / từ đồng nghĩa',
    why: 'Bạn chọn cách nói có nghĩa khác với từ được gạch chân.',
    hint: 'Học từ kèm nghĩa tiếng Nhật đơn giản và ví dụ, so các từ gần nghĩa theo cặp.',
  },
  vocabUsage: {
    name: 'Sai cách dùng từ',
    why: 'Hiểu nghĩa từ nhưng chọn câu dùng sai ngữ cảnh hoặc sai từ đi kèm.',
    hint: 'Học từ kèm câu ví dụ và các từ hay đi cùng (collocation), không chỉ nhớ nghĩa tiếng Việt.',
  },
  wordFormation: {
    name: 'Nhầm tiền tố / hậu tố (cấu tạo từ)',
    why: 'Chọn chữ ghép thêm vào từ (諸, 再, 未, 前...) không đúng với nghĩa cần có.',
    hint: 'Học các tiền tố, hậu tố hay gặp theo nhóm nghĩa (số nhiều, lại, chưa, trước đây...).',
  },
  particle: {
    name: 'Nhầm trợ từ',
    why: 'Chọn trợ từ sai vai trò trong câu (chủ thể, đối tượng, địa điểm, phương tiện...).',
    hint: 'Xác định động từ đòi trợ từ nào và vai trò của danh từ đứng trước chỗ trống.',
  },
  keigo: {
    name: 'Nhầm kính ngữ / cách nói lịch sự',
    why: 'Chọn dạng tôn kính, khiêm nhường hoặc cách nhờ vả không đúng với người nói và người nghe.',
    hint: 'Xác định hành động của ai (mình hay đối phương) trước khi chọn tôn kính ngữ hay khiêm nhường ngữ.',
  },
  grammar: {
    name: 'Nhầm mẫu câu / hình thức ngữ pháp',
    why: 'Chọn mẫu câu có hình thức hoặc nghĩa gần với đáp án đúng (đang làm so với từng làm...).',
    hint: 'Học các cặp mẫu câu dễ nhầm theo ví dụ đối chiếu và dấu hiệu nhận biết.',
  },
  compose: {
    name: 'Sắp xếp câu sai (★)',
    why: 'Cụm bạn chọn không khớp vị trí trong câu cần sắp xếp.',
    hint: 'Tìm cụm đứng đầu và cuối câu trước, rồi nối các cụm có liên kết ngữ pháp cố định.',
  },
  readingClose: {
    name: 'Phương án gần giống đáp án (đọc hiểu)',
    why: 'Phương án bạn chọn gần giống đáp án đúng, chỉ khác ở một chi tiết (số, ngày, đối tượng).',
    hint: 'Đối chiếu từng chi tiết (số, ngày, ai / cái gì) với văn bản trước khi chọn.',
  },
  reading: {
    name: 'Chọn nhầm ý (đọc hiểu)',
    why: 'Phương án bạn chọn nghe hợp lý nhưng không đúng với điều câu hỏi hỏi (thường là chi tiết khác, hoặc nói ngược lại).',
    hint: 'Gạch dưới từ khóa của câu hỏi và tìm đúng đoạn trả lời trước khi đọc các phương án.',
  },
  reply: {
    name: 'Nhầm câu đáp / câu nói theo tình huống (nghe)',
    why: 'Chọn câu đáp hoặc câu nói không hợp tình huống, vai người nói hoặc mức lịch sự.',
    hint: 'Xác định người nói và mục đích câu nói (mời, nhờ, xin lỗi, cảm ơn...) trước khi chọn.',
  },
  listenContent: {
    name: 'Chọn nhầm nội dung (nghe)',
    why: 'Phương án bạn chọn không phải điều câu hỏi yêu cầu (việc làm trước, ý phụ, hoặc thông tin của người khác).',
    hint: 'Ghi nhanh từ khóa và quyết định cuối cùng của từng người, nhất là sau các từ nối chuyển hướng.',
  },
  swap: {
    name: 'Đảo vị trí / đảo vai',
    why: 'Hai phương án có cùng thành phần nhưng đảo thứ tự hoặc đảo vai (trước / sau, trái / phải, người này / người kia).',
    hint: 'Ghi từng cặp thông tin (ai – ở đâu – lúc nào) rồi đối chiếu từng cặp với phương án.',
  },
  neg: {
    name: 'Phủ định / không phủ định',
    why: 'Đáp án đúng và phương án bạn chọn là cùng một câu, chỉ khác ở chỗ có hoặc không có phủ định.',
    hint: 'Gạch chân từ phủ định và xác định phạm vi mà nó bao trùm trước khi chọn.',
  },
};

const REASON_BY_SKILL: Record<string, { name: string; why: string; hint: string }> = {
  grammar: {
    name: 'Nhầm mẫu câu & cấu trúc ngữ pháp',
    why: 'Chọn mẫu câu có hình thức gần giống hoặc sai quy tắc kết hợp.',
    hint: 'Ôn các cặp mẫu câu dễ nhầm theo ví dụ đối chiếu.',
  },
  reading: {
    name: 'Thiếu thời gian & áp lực đọc hiểu',
    why: 'Câu đọc hiểu trả lời sai: thường do đọc không kịp hoặc bỏ sót từ khóa then chốt.',
    hint: 'Đọc câu hỏi trước, xác định từ khóa và giới hạn thời gian cho mỗi bài.',
  },
  vocabulary: {
    name: 'Hiểu sai ngữ cảnh từ vựng',
    why: 'Nhầm các từ có nghĩa gần nhau hoặc sai sắc thái trong ngữ cảnh.',
    hint: 'Ôn từ vựng kèm câu ví dụ thay vì chỉ nhớ nghĩa tiếng Việt đơn lẻ.',
  },
  kanji: {
    name: 'Chưa nhớ âm đọc & chữ Hán',
    why: 'Nhầm âm On/Kun hoặc mặt chữ có cấu tạo bộ thủ tương tự.',
    hint: 'Ôn ngắt quãng theo từ ghép thường gặp, không chỉ nhớ chữ đứng đơn lẻ.',
  },
  listening: {
    name: 'Bẫy thông tin nghe hiểu',
    why: 'Bị phân tâm bởi thông tin nhiễu hoặc quyết định bị đổi ở cuối đoạn hội thoại.',
    hint: 'Ghi chú quyết định cuối cùng, đặc biệt sau các từ nối chuyển hướng.',
  },
};

const TIMED_GROUPS: Array<{ key: string; name: string; types: string[]; skills?: string[]; why: string; tip: string }> = [
  {
    key: 'reading_long',
    name: 'Đọc hiểu đoạn dài',
    types: ['comprehension_long', 'comprehension_mid', 'thematic', 'integrated_reading'],
    why: 'Đọc đi đọc lại nhiều lần nhưng vẫn bỏ sót luận điểm và ý chuyển đoạn.',
    tip: 'Đọc câu hỏi trước, xác định từ khóa và giới hạn tối đa 6-8 phút cho mỗi bài.',
  },
  {
    key: 'reading_short',
    name: 'Đọc hiểu ngắn & tìm thông tin',
    types: ['comprehension_short', 'info_retrieval'],
    why: 'Mất thời gian dò lại bảng, thông báo để tìm điều kiện phù hợp.',
    tip: 'Gạch điều kiện trong câu hỏi trước rồi mới đối chiếu với bảng.',
  },
  {
    key: 'order',
    name: 'Sắp xếp câu',
    types: ['sentence_composition'],
    why: 'Tốn nhiều thời gian thử ghép nhiều tổ hợp ngữ pháp sai trật tự.',
    tip: 'Ghép các cặp từ liên kết cố định và mệnh đề bổ nghĩa trước khi điền dấu sao.',
  },
  {
    key: 'grammar',
    name: 'Ngữ pháp ngữ cảnh',
    types: ['text_grammar', 'grammar_form'],
    why: 'Mất thời gian phân vân giữa các mẫu câu có nghĩa gần tương đương.',
    tip: 'Học các cặp dễ nhầm theo ví dụ đối chiếu và phản xạ dấu hiệu nhận biết.',
  },
  {
    key: 'vocab',
    name: 'Từ vựng',
    types: ['contextual', 'usage', 'paraphrase', 'word_formation'],
    why: 'Chưa nhớ chính xác sắc thái kết hợp từ (collocation) trong ngữ cảnh.',
    tip: 'Ôn tập từ vựng kèm câu văn ví dụ cụ thể thay vì chỉ nhớ nghĩa tiếng Việt đơn lẻ.',
  },
  {
    key: 'kanji',
    name: 'Kanji',
    types: ['kanji_reading', 'orthography'],
    why: 'Chần chừ khi quyết định âm On/Kun và các từ có âm đọc đặc biệt.',
    tip: 'Ôn theo từ ghép hai chữ Hán thường gặp để ghi nhớ phản xạ phát âm.',
  },
  {
    key: 'listening',
    name: 'Nghe hiểu',
    types: ['task_based', 'point', 'summary', 'utterance', 'quick_response', 'integrated_listening'],
    why: 'Dành nhiều thời gian cho câu nghe nhưng vẫn bỏ sót thông tin chốt ở cuối.',
    tip: 'Ghi nhanh từ khóa và quyết định cuối cùng trong lúc nghe.',
  },
];

function leadingWrongStreak(recentCorrect: boolean[]): number {
  let n = 0;
  for (const ok of recentCorrect) {
    if (ok) break;
    n += 1;
  }
  return n;
}

export async function GET(request: NextRequest) {
  const userId = await resolveSessionUserId(request);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbUrl = getAnalyticsDbUrl();

  const sql = postgres(dbUrl, { max: 3, idle_timeout: 10 });

  try {
    // 1. Total wrong count
    const [totRow] = await sql`
      SELECT count(*)::int as wrong_count
      FROM user_answers ua
      JOIN exam_attempts ea ON ea.id = ua.attempt_id
      WHERE ea.user_id = ${userId} AND ua.is_correct = false
    `;
    const totalWrongCount = totRow?.wrong_count || 0;

    // 2. Real stats by skill and level
    const skillRows = await sql`
      SELECT 
        q.level,
        q.skill,
        count(*)::int as total,
        count(*) FILTER (WHERE ua.is_correct = false)::int as wrong,
        count(*) FILTER (WHERE ua.is_correct = false AND ua.option_value = 0)::int as blank
      FROM user_answers ua
      JOIN exam_attempts ea ON ea.id = ua.attempt_id
      JOIN questions q ON q.id = ua.question_id
      WHERE ea.user_id = ${userId}
      GROUP BY q.level, q.skill
    `;

    const statsBySkillByLevel: Record<string, Record<string, { wrong: number; total: number; blank: number }>> = {
      all: {
        grammar: { wrong: 0, total: 0, blank: 0 },
        reading: { wrong: 0, total: 0, blank: 0 },
        vocabulary: { wrong: 0, total: 0, blank: 0 },
        kanji: { wrong: 0, total: 0, blank: 0 },
        listening: { wrong: 0, total: 0, blank: 0 },
      },
    };

    for (const sr of skillRows) {
      const lvl = sr.level || 'N3';
      const sk = sr.skill || 'other';
      if (!statsBySkillByLevel[lvl]) {
        statsBySkillByLevel[lvl] = {
          grammar: { wrong: 0, total: 0, blank: 0 },
          reading: { wrong: 0, total: 0, blank: 0 },
          vocabulary: { wrong: 0, total: 0, blank: 0 },
          kanji: { wrong: 0, total: 0, blank: 0 },
          listening: { wrong: 0, total: 0, blank: 0 },
        };
      }
      statsBySkillByLevel[lvl][sk] = { wrong: sr.wrong, total: sr.total, blank: sr.blank };
      const allStats = statsBySkillByLevel['all'];
      if (allStats && allStats[sk]) {
        allStats[sk].wrong += sr.wrong;
        allStats[sk].blank += sr.blank;
        allStats[sk].total += sr.total;
      }
    }

    // 4. Real per-mondai stats (answered / wrong) by level
    const mondaiRows = await sql`
      SELECT
        q.level,
        q.mondai_type,
        count(*)::int as total,
        count(*) FILTER (WHERE ua.is_correct = false)::int as wrong,
        count(*) FILTER (WHERE ua.is_correct = false AND ua.option_value = 0)::int as blank
      FROM user_answers ua
      JOIN exam_attempts ea ON ea.id = ua.attempt_id
      JOIN questions q ON q.id = ua.question_id
      WHERE ea.user_id = ${userId}
      GROUP BY q.level, q.mondai_type
    `;

    const mondaiStatsByLevel: Record<string, Record<string, { wrong: number; total: number; blank: number }>> = { all: {} };
    for (const mr of mondaiRows) {
      const lvl = mr.level || 'N3';
      const key = mr.mondai_type || 'other';
      const lvlMap = (mondaiStatsByLevel[lvl] ||= {});
      lvlMap[key] = { wrong: mr.wrong, total: mr.total, blank: mr.blank };
      const allMap = mondaiStatsByLevel['all']!;
      const prev = allMap[key] || { wrong: 0, total: 0, blank: 0 };
      allMap[key] = { wrong: prev.wrong + mr.wrong, total: prev.total + mr.total, blank: prev.blank + mr.blank };
    }

    // 5. Confused pairs by level: (correct answer <-> option the learner actually chose)
    const pairRows = await sql`
      SELECT
        q.level,
        q.skill,
        ua.question_id,
        ua.option_value,
        ca.correct_option,
        qv.stem,
        qv.explanation
      FROM user_answers ua
      JOIN exam_attempts ea ON ea.id = ua.attempt_id
      JOIN questions q ON q.id = ua.question_id
      JOIN LATERAL (
        SELECT correct_option FROM correct_answers
        WHERE question_id = q.id ORDER BY question_version DESC LIMIT 1
      ) ca ON true
      LEFT JOIN LATERAL (
        SELECT stem, explanation FROM question_versions
        WHERE question_id = q.id ORDER BY version DESC LIMIT 1
      ) qv ON true
      WHERE ea.user_id = ${userId}
        AND ua.is_correct = false
        AND ua.option_value > 0
        AND q.skill IN ('grammar', 'vocabulary', 'kanji')
    `;
    const pairQuestionIds = Array.from(new Set(pairRows.map((r) => r.question_id as string)));
    const pairOptions = pairQuestionIds.length > 0
      ? await sql`
          SELECT ao.question_id, ao.order_index, ao.content
          FROM answer_options ao
          WHERE ao.question_id IN ${sql(pairQuestionIds)}
            AND ao.question_version = (
              SELECT COALESCE(max(question_version), 1) FROM answer_options WHERE question_id = ao.question_id
            )
        `
      : [];
    const optionText = new Map<string, string>();
    for (const o of pairOptions) optionText.set(`${o.question_id}:${o.order_index}`, extractText(o.content));

    type PairAgg = {
      kind: 'grammar' | 'vocab' | 'kanji';
      a: string;
      b: string;
      n: number;
      ex: string;
      selected: string;
      correct: string;
      diff: string;
      tip: string;
    };
    const pairAgg: Record<string, Map<string, PairAgg>> = {};
    for (const r of pairRows) {
      const correctText = optionText.get(`${r.question_id}:${r.correct_option}`);
      const chosenText = optionText.get(`${r.question_id}:${r.option_value}`);
      if (!correctText || !chosenText || correctText === chosenText) continue;
      const kind = r.skill === 'grammar' ? 'grammar' : r.skill === 'kanji' ? 'kanji' : 'vocab';
      const explanation = extractExplanation(r.explanation);
      for (const lvl of [r.level || 'N3', 'all']) {
        const map = (pairAgg[lvl] ||= new Map());
        const key = `${kind}|${correctText}|${chosenText}`;
        const cur = map.get(key);
        if (cur) {
          cur.n += 1;
        } else {
          map.set(key, {
            kind,
            a: correctText,
            b: chosenText,
            n: 1,
            ex: extractText(r.stem).slice(0, 120),
            selected: chosenText,
            correct: correctText,
            diff: extractMeaningSummary(explanation) || explanation.replace(/[•\n]+/g, ' ').slice(0, 160) || 'Chưa có giải thích cho câu này.',
            tip: 'Xem lại lời giải của câu hỏi để phân biệt hai lựa chọn.',
          });
        }
      }
    }
    const pairsByLevel: Record<string, PairAgg[]> = {};
    for (const [lvl, map] of Object.entries(pairAgg)) {
      pairsByLevel[lvl] = Array.from(map.values()).sort((x, y) => y.n - x.n).slice(0, 8);
    }

    // 5b. Reasons, trap types and time lost: all from the learner's real wrong answers
    const wrongRows = await sql`
      SELECT
        q.level,
        q.skill,
        q.mondai_type,
        ua.question_id,
        ua.option_value,
        ca.correct_option,
        qv.stem,
        qv.explanation,
        s.time_spent_ms[ua.question_index + 1] AS ms
      FROM user_answers ua
      JOIN exam_attempts ea ON ea.id = ua.attempt_id
      JOIN questions q ON q.id = ua.question_id
      LEFT JOIN attempt_answer_sheets s ON s.attempt_id = ea.id
      LEFT JOIN LATERAL (
        SELECT correct_option FROM correct_answers
        WHERE question_id = q.id ORDER BY question_version DESC LIMIT 1
      ) ca ON true
      LEFT JOIN LATERAL (
        SELECT stem, explanation FROM question_versions
        WHERE question_id = q.id ORDER BY version DESC LIMIT 1
      ) qv ON true
      WHERE ea.user_id = ${userId} AND ua.is_correct = false
      ORDER BY coalesce(ea.submitted_at, ea.started_at) DESC
    `;
    const wrongIds = Array.from(new Set(wrongRows.map((r) => r.question_id as string)));
    const wrongOptions = wrongIds.length > 0
      ? await sql`
          SELECT ao.question_id, ao.order_index, ao.content
          FROM answer_options ao
          WHERE ao.question_id IN ${sql(wrongIds)}
            AND ao.question_version = (
              SELECT COALESCE(max(question_version), 1) FROM answer_options WHERE question_id = ao.question_id
            )
        `
      : [];
    const wrongOptText = new Map<string, string>();
    for (const o of wrongOptions) wrongOptText.set(`${o.question_id}:${o.order_index}`, extractText(o.content));

    type IntelItem = {
      id: string;
      name: string;
      value: number;
      unit: string;
      why: string;
      example?: string;
      chosen?: string;
      correct?: string;
      hint?: string;
      userWrong?: number;
    };
    // Reasons the learner chose themselves (table is created on the first save)
    const selfByQuestion = new Map<string, string>();
    try {
      const selfRows = await sql`SELECT question_id, reason FROM user_wrong_reasons WHERE user_id = ${userId}`;
      for (const sr of selfRows) selfByQuestion.set(sr.question_id as string, sr.reason as string);
    } catch {
      // no table yet: nobody has tagged a question
    }
    const selfAgg: Record<string, Map<string, number>> = {};
    const userWrongPattern: Record<string, Map<string, number>> = {};
    const reasonAgg: Record<string, Map<string, IntelItem>> = {};
    const trapAgg: Record<string, Map<string, IntelItem>> = {};
    const timedAgg: Record<string, Map<string, { ms: number; wrong: number }>> = {};
    const longReading: Record<string, { ms: number; n: number }> = {};

    const bump = (store: Record<string, Map<string, IntelItem>>, lvl: string, id: string, make: () => IntelItem) => {
      const map = (store[lvl] ||= new Map());
      const cur = map.get(id);
      if (cur) cur.value += 1;
      else map.set(id, make());
    };

    for (const r of wrongRows) {
      const skill = (r.skill as string) || 'other';
      const mondai = (r.mondai_type as string) || '';
      const stem = extractText(r.stem);
      const chosenText = r.option_value > 0 ? wrongOptText.get(`${r.question_id}:${r.option_value}`) : undefined;
      const correctText = wrongOptText.get(`${r.question_id}:${r.correct_option}`);
      const example = stem.slice(0, 90) || undefined;
      const wrongPattern =
        skill === 'grammar' ? normalizePattern(extractGrammarPattern(explanationText(r.explanation)) ?? '') : '';
      const selfCode = selfByQuestion.get(r.question_id as string);

      for (const lvl of [(r.level as string) || 'N3', 'all']) {
        if (wrongPattern) {
          const m = (userWrongPattern[lvl] ||= new Map());
          m.set(wrongPattern, (m.get(wrongPattern) ?? 0) + 1);
        }
        if (selfCode) {
          const m = (selfAgg[lvl] ||= new Map());
          m.set(selfCode, (m.get(selfCode) ?? 0) + 1);
        }
        if (r.option_value === 0) {
          bump(reasonAgg, lvl, 'r-blank', () => ({
            id: 'r-blank',
            name: 'Bỏ trống / chưa kịp trả lời',
            value: 1,
            unit: 'lượt',
            why: 'Câu bị bỏ trống hoặc hết giờ trước khi chọn đáp án.',
            example,
            chosen: 'Chưa chọn đáp án',
            correct: correctText,
            hint: 'Ưu tiên chọn đáp án có khả năng cao nhất rồi quay lại sau, thay vì để trống.',
          }));
        } else {
          const info = REASON_BY_SKILL[skill];
          if (info) {
            bump(reasonAgg, lvl, `r-${skill}`, () => ({
              id: `r-${skill}`,
              name: info.name,
              value: 1,
              unit: 'lượt',
              why: info.why,
              example,
              chosen: chosenText,
              correct: correctText,
              hint: info.hint,
            }));
          }
          const trap = classifyTrap(skill, mondai, stem, chosenText ?? '', correctText ?? '');
          if (trap) {
            const t = TRAP_INFO[trap];
            bump(trapAgg, lvl, `t-${trap}`, () => ({
              id: `t-${trap}`,
              name: t.name,
              value: 1,
              unit: 'lượt',
              why: t.why,
              example,
              chosen: chosenText,
              correct: correctText,
              hint: t.hint,
            }));
          }
        }

        const ms = typeof r.ms === 'number' ? r.ms : 0;
        if (ms > 0) {
          const group = TIMED_GROUPS.find((g) => g.types.includes(mondai));
          if (group) {
            const map = (timedAgg[lvl] ||= new Map());
            const cur = map.get(group.key) || { ms: 0, wrong: 0 };
            cur.ms += ms;
            cur.wrong += 1;
            map.set(group.key, cur);
          }
          if (mondai === 'comprehension_long') {
            const lr = (longReading[lvl] ||= { ms: 0, n: 0 });
            lr.ms += ms;
            lr.n += 1;
          }
        }
      }
    }

    // Coverage: grammar points the level's exams test most, with how often the learner got them wrong
    const content = await loadBankContent().catch(() => null);
    const coverageByLevel: Record<string, IntelItem[]> = {};
    if (content) {
      for (const [lvl, lc] of Object.entries(content.levels)) {
        coverageByLevel[lvl] = lc.grammar.slice(0, 10).map((g) => {
          const userWrong = userWrongPattern[lvl]?.get(g.term) ?? 0;
          return {
            id: `cov-${lvl}-${g.term}`,
            name: g.term,
            value: g.count,
            unit: 'câu',
            why: g.why ?? 'Mẫu ngữ pháp / từ chức năng được kiểm tra trong đề.',
            example: g.example?.stem,
            correct: g.example?.correct,
            hint: userWrong > 0 ? `Bạn đã sai ${userWrong} câu dùng kiến thức này.` : 'Bạn chưa sai câu nào dùng kiến thức này.',
            userWrong,
          };
        });
      }
    }

    const selfReasonsByLevel: Record<string, IntelItem[]> = {};
    for (const [lvl, m] of Object.entries(selfAgg)) {
      selfReasonsByLevel[lvl] = Array.from(m.entries())
        .map(([code, value]) => {
          const info = SELF_REASONS.find((x) => x.code === code);
          return {
            id: `self-${code}`,
            name: info?.label ?? code,
            value,
            unit: 'lượt',
            why: info?.why ?? '',
            hint: info?.hint,
          };
        })
        .sort((x, y) => y.value - x.value);
    }

    const sortItems = (m: Map<string, IntelItem> | undefined): IntelItem[] =>
      m ? Array.from(m.values()).sort((x, y) => y.value - x.value) : [];
    const reasonsByLevel: Record<string, IntelItem[]> = {};
    const trapsByLevel: Record<string, IntelItem[]> = {};
    for (const lvl of Object.keys(reasonAgg)) reasonsByLevel[lvl] = sortItems(reasonAgg[lvl]);
    for (const lvl of Object.keys(trapAgg)) trapsByLevel[lvl] = sortItems(trapAgg[lvl]);

    const timedWeaknessByLevel: Record<string, {
      totalLostMinutes: number;
      totalTimedWrongs: number;
      avgMinutesPerLongReading: number;
      items: Array<{ name: string; min: number; wrong: number; why: string; tip: string }>;
    }> = {};
    for (const [lvl, map] of Object.entries(timedAgg)) {
      const items = TIMED_GROUPS.filter((g) => map.has(g.key))
        .map((g) => {
          const v = map.get(g.key)!;
          return { name: g.name, min: Math.round(v.ms / 6000) / 10, wrong: v.wrong, why: g.why, tip: g.tip };
        })
        .sort((x, y) => y.min - x.min);
      const lr = longReading[lvl];
      timedWeaknessByLevel[lvl] = {
        totalLostMinutes: Math.round(items.reduce((sum, x) => sum + x.min, 0) * 10) / 10,
        totalTimedWrongs: items.reduce((sum, x) => sum + x.wrong, 0),
        avgMinutesPerLongReading: lr && lr.n > 0 ? Math.round((lr.ms / lr.n / 60000) * 10) / 10 : 0,
        items,
      };
    }

    // 6. Mastery by level
    const bankCountsByLevel = await sql`
      SELECT level, count(distinct id)::int as count FROM questions GROUP BY level
    `;
    const bankCountMap: Record<string, number> = {};
    for (const b of bankCountsByLevel) {
      if (b.level) bankCountMap[b.level] = b.count;
    }

    const userQuestionCounts = await sql`
      SELECT 
        q.level,
        count(distinct q.id)::int as encountered,
        count(distinct q.id) FILTER (WHERE ua.is_correct = false)::int as unstable,
        count(distinct q.id) FILTER (WHERE ua.is_correct = true)::int as mastered
      FROM user_answers ua
      JOIN exam_attempts ea ON ea.id = ua.attempt_id
      JOIN questions q ON q.id = ua.question_id
      WHERE ea.user_id = ${userId}
      GROUP BY q.level
    `;
    const userCountsMap: Record<string, { encountered: number; unstable: number; mastered: number }> = {};
    for (const u of userQuestionCounts) {
      if (u.level) {
        userCountsMap[u.level] = {
          encountered: u.encountered,
          unstable: u.unstable,
          mastered: u.mastered,
        };
      }
    }

    const masteryByLevel: Record<string, {
      unlearned: number;
      encountered: number;
      unstable: number;
      mastered: number;
      items: Array<{
        name: string;
        status: string;
        seen: number;
        right: number;
        newRight: number;
        why: string;
        tip: string;
      }>;
    }> = {};

    for (const lvl of ['N1', 'N2', 'N3', 'N4', 'N5', 'all']) {
      const uStats = userCountsMap[lvl];
      const hasUserData = Boolean(uStats && uStats.encountered > 0);
      const bankTotal = bankCountMap[lvl] || 0;

      let unlearned = 0;
      let encountered = 0;
      let unstable = 0;
      let mastered = 0;
      const items: Array<{
        name: string;
        status: string;
        seen: number;
        right: number;
        newRight: number;
        why: string;
        tip: string;
      }> = [];

      if (hasUserData && uStats) {
        encountered = uStats.encountered;
        unstable = uStats.unstable;
        mastered = uStats.mastered;
        unlearned = Math.max(0, bankTotal - encountered);

        const realQuestions = await sql`
          SELECT 
            ua.question_id,
            q.skill,
            q.mondai_type,
            qv.stem,
            qv.explanation,
            count(*)::int as times_seen,
            count(*) FILTER (WHERE ua.is_correct = true)::int as times_right,
            count(*) FILTER (WHERE ua.is_correct = false)::int as times_wrong
          FROM user_answers ua
          JOIN exam_attempts ea ON ea.id = ua.attempt_id
          JOIN questions q ON q.id = ua.question_id
          JOIN question_versions qv ON qv.question_id = q.id
          WHERE ea.user_id = ${userId} 
            AND q.level = ${lvl} 
            AND q.skill IN ('grammar', 'vocabulary', 'kanji')
            AND q.mondai_type NOT IN ('text_grammar', 'comprehension_short', 'comprehension_mid', 'comprehension_long', 'info_retrieval')
          GROUP BY ua.question_id, q.skill, q.mondai_type, qv.stem, qv.explanation
          ORDER BY times_seen DESC, times_wrong DESC
          LIMIT 6
        `;

        for (const r of realQuestions) {
          const underline = extractUnderline(r.stem);
          const rawStem = extractText(r.stem);
          const fullExp = extractExplanation(r.explanation);

          const [ca] = await sql`
            SELECT correct_option FROM correct_answers WHERE question_id = ${r.question_id} LIMIT 1
          `;
          let correctText = '';
          if (ca) {
            const [opt] = await sql`
              SELECT content FROM answer_options WHERE question_id = ${r.question_id} AND order_index = ${ca.correct_option} LIMIT 1
            `;
            if (opt) correctText = extractText(opt.content);
          }

          let name = underline;
          if (!name) {
            const patternMatch = fullExp.match(/Mẫu câu\s*「([^」]+)」/i) || fullExp.match(/Cấu trúc\s*「([^」]+)」/i);
            if (patternMatch && patternMatch[1]) {
              name = patternMatch[1];
            } else if (correctText && correctText.length <= 15) {
              name = correctText;
            } else {
              name = rawStem.slice(0, 18);
            }
          }

          let why = '';
          const meaningMatch = fullExp.match(/Dịch nghĩa:\s*([^.•\n]+)/i);
          if (meaningMatch && meaningMatch[1]) {
            why = meaningMatch[1].trim();
          } else {
            why = fullExp.slice(0, 80).trim() || `Kiến thức ${r.mondai_type || r.skill} cần củng cố`;
          }

          const tip = fullExp.includes('•')
            ? fullExp.split('•').slice(1).join('; ').slice(0, 120).trim()
            : 'Xem lại bài giảng và phương pháp làm bài chi tiết.';

          const acc = r.times_right / r.times_seen;
          const status = acc >= 0.7 ? 'Thành thạo' : acc >= 0.4 ? 'Đang hình thành' : 'Chưa ổn định';

          items.push({
            name,
            status,
            seen: r.times_seen,
            right: r.times_right,
            newRight: Math.min(r.times_right, 1),
            why,
            tip,
          });
        }
      }

      if (!hasUserData && lvl !== 'all') continue;
      if (lvl === 'all') {
        for (const v of Object.values(userCountsMap)) {
          encountered += v.encountered;
          unstable += v.unstable;
          mastered += v.mastered;
        }
        unlearned = Math.max(0, Object.values(bankCountMap).reduce((x, y) => x + y, 0) - encountered);
        if (encountered === 0) continue;
      }

      masteryByLevel[lvl] = {
        unlearned,
        encountered,
        unstable,
        mastered,
        items,
      };
    }

    // 4. Mistake library categories
    const categories = [
      { key: 'grammar', skills: ['grammar'] },
      { key: 'vocab', skills: ['vocabulary'] },
      { key: 'kanji', skills: ['kanji'] },
      { key: 'question', skills: ['reading', 'listening'] },
    ];

    const results: Record<string, unknown[]> = {
      grammar: [],
      vocab: [],
      kanji: [],
      question: [],
    };

    for (const cat of categories) {
      const rows = await sql`
        SELECT * FROM (
        SELECT
          ua.question_id,
          q.skill,
          q.mondai_type,
          q.level,
          qv.stem,
          qv.explanation,
          count(*)::int as total_count,
          count(*) FILTER (WHERE ua.is_correct = false)::int as wrong_count,
          max(coalesce(ea.submitted_at, ea.started_at)) FILTER (WHERE ua.is_correct = false) as last_date,
          (array_agg(ua.option_value ORDER BY coalesce(ea.submitted_at, ea.started_at) DESC)
            FILTER (WHERE ua.is_correct = false))[1] as user_choice,
          array_agg(ua.is_correct ORDER BY coalesce(ea.submitted_at, ea.started_at) DESC) as recent_correct,
          (array_agg(e.title ORDER BY coalesce(ea.submitted_at, ea.started_at) DESC))[1] as exam_title,
          row_number() OVER (
            PARTITION BY q.level
            ORDER BY count(*) FILTER (WHERE ua.is_correct = false) DESC,
                     max(coalesce(ea.submitted_at, ea.started_at)) FILTER (WHERE ua.is_correct = false) DESC NULLS LAST
          ) AS rn
        FROM user_answers ua
        JOIN exam_attempts ea ON ea.id = ua.attempt_id
        JOIN exams e ON e.id = ea.exam_id
        JOIN questions q ON q.id = ua.question_id
        LEFT JOIN LATERAL (
          SELECT stem, explanation FROM question_versions
          WHERE question_id = q.id ORDER BY version DESC LIMIT 1
        ) qv ON true
        WHERE ea.user_id = ${userId} AND q.skill IN ${sql(cat.skills)}
        GROUP BY ua.question_id, q.skill, q.mondai_type, q.level, qv.stem, qv.explanation
        HAVING count(*) FILTER (WHERE ua.is_correct = false) > 0
        ) ranked
        WHERE rn <= 8
        ORDER BY wrong_count DESC, last_date DESC
      `;

      const list = results[cat.key] || [];

      for (const r of rows) {
        const rawStem = extractText(r.stem);
        const underline = extractUnderline(r.stem);
        const fullExp = extractExplanation(r.explanation);
        const meaning = extractMeaningSummary(fullExp);

        const [ca] = await sql`
          SELECT correct_option 
          FROM correct_answers 
          WHERE question_id = ${r.question_id} 
          ORDER BY question_version DESC 
          LIMIT 1
        `;
        const opts = await sql`
          SELECT order_index, content 
          FROM answer_options 
          WHERE question_id = ${r.question_id} 
            AND question_version = (
              SELECT COALESCE(max(question_version), 1) 
              FROM answer_options 
              WHERE question_id = ${r.question_id}
            )
          ORDER BY order_index
        `;

        const correctOptIndex = ca?.correct_option;
        const correctOptObj = opts.find((o) => o.order_index === correctOptIndex);
        const correctText = correctOptObj ? extractText(correctOptObj.content) : `Đáp án ${correctOptIndex}`;

        const userChoiceIndex = Number(r.user_choice);
        const userChoiceObj = opts.find((o) => o.order_index === userChoiceIndex);
        const userChoiceText = userChoiceObj
          ? extractText(userChoiceObj.content)
          : (userChoiceIndex === 0 ? 'Chưa chọn / Hết giờ (Phương án 0)' : `Lựa chọn ${r.user_choice}`);

        const grammarPattern = cat.key === 'grammar' ? extractGrammarPattern(fullExp) : null;
        const term = grammarPattern ?? extractTargetTerm(rawStem, underline, r.skill, fullExp, correctText);

        let promptText = rawStem;
        if (opts.length > 0) {
          const formattedOpts = opts
            .map((o) => `[${o.order_index}] ${extractText(o.content)}`)
            .join('    ');
          promptText = rawStem ? `${rawStem}\n\nCác lựa chọn:\n${formattedOpts}` : formattedOpts;
        }

        list.push({
          term,
          questionId: r.question_id,
          selfReason: selfByQuestion.get(r.question_id as string),
          // a passage question whose stem is only numbered blanks has no sentence worth showing
          stem: /[\u3040-\u30ff\u4e00-\u9fff]/.test(rawStem) ? rawStem : '',
          level: r.level,
          skill: r.skill,
          mondaiType: r.mondai_type,
          meaning: meaning || 'Cần ôn tập kỹ dạng câu hỏi và phân tích đáp án chi tiết',
          wrong: r.wrong_count,
          total: r.total_count,
          streak: leadingWrongStreak(r.recent_correct as boolean[]),
          last: new Date(r.last_date).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }),
          source: `${r.level} · ${r.exam_title ? r.exam_title.slice(0, 22) : 'Đề thi JLPT'}`,
          reason: `Thường nhầm dạng bài: ${r.mondai_type || r.skill}`,
          prompt: promptText,
          selected: userChoiceText,
          correct: correctText,
          explain: fullExp || 'Xem lại bài giảng và phương pháp làm bài chi tiết.',
        });
      }
      results[cat.key] = list;
    }

    await sql.end();

    return NextResponse.json({
      totalWrongCount,
      mistakes: results,
      statsBySkillByLevel,
      coverageByLevel,
      mondaiStatsByLevel,
      reasonsByLevel,
      selfReasonsByLevel,
      trapsByLevel,
      timedWeaknessByLevel,
      pairsByLevel,
      masteryByLevel,
    });
  } catch (error) {
    await sql.end();
    console.error('Error fetching real mistakes:', error);
    return NextResponse.json({ error: 'Failed to fetch mistakes' }, { status: 500 });
  }
}
