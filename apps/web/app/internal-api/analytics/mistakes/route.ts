import { NextResponse, type NextRequest } from 'next/server';
import postgres from 'postgres';
import { getAnalyticsDbUrl, resolveSessionUserId } from '../_db';

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

/** Grammar point named by the explanation ("Mẫu câu 「N にとって」", "Trợ từ 「で」", ...). */
function extractGrammarPattern(explanationText: string): string | null {
  const beforeAnalysis = explanationText.split('Phân tích')[0] ?? explanationText;
  const afterAnswer = beforeAnalysis.split('Đáp án đúng:')[1] ?? beforeAnalysis;
  const m = afterAnswer.match(/(Mẫu câu|Cấu trúc|Kính ngữ|Trợ từ)?\s*「([^」]{1,24})」/);
  if (!m || !m[2]) return null;
  const quoted = m[2].trim();
  if (m[1] === 'Trợ từ') return `Trợ từ 「${quoted}」`;
  return quoted;
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

const PATTERNS_BY_LEVEL: Record<string, Array<{ pattern: string; regex: RegExp; why: string; hint: string }>> = {
  N1: [
    { pattern: '～ずにはいられない', regex: /ずにはいられない|ないではいられない/i, why: 'Không thể kìm nén được cảm xúc, hành động bột phát.', hint: 'Hành động mang tính tâm lý bản năng.' },
    { pattern: '～を皮切りに', regex: /皮切り/i, why: 'Khởi đầu, mở màn cho chuỗi sự kiện lan tỏa tiếp theo.', hint: 'Vế sau là các hành động cùng chiều phát triển với quy mô lớn hơn.' },
    { pattern: '～に至っては', regex: /至って/i, why: 'Đến cả trường hợp cực đoan như thế này thì.', hint: 'Dẫn ra ví dụ tột cùng làm tiêu biểu.' },
    { pattern: '～ならでは', regex: /ならでは/i, why: 'Chỉ có ở, đặc trưng độc đáo duy nhất của.', hint: 'Đánh giá cao nét độc đáo chỉ đối tượng đó mới có.' },
    { pattern: '～といえども', regex: /といえども/i, why: 'Dù là... đi chăng nữa thì cũng không ngoại lệ.', hint: 'Vế sau là nghĩa vụ hoặc sự thật khách quan.' },
    { pattern: '～を余儀なくされる', regex: /余儀なく/i, why: 'Đành phải / bị ép buộc rơi vào tình thế bất khả kháng.', hint: 'Chịu tác động từ hoàn cảnh khách quan.' },
    { pattern: '～極まりない', regex: /極まりない|極まる/i, why: 'Vô cùng, hết sức (mức độ tột đỉnh).', hint: 'Đi với tính từ biểu thị thái độ cảm xúc mạnh.' },
  ],
  N2: [
    { pattern: '～に際して', regex: /に際して|にあたって/i, why: 'Nhân dịp, khi chuẩn bị bước vào sự kiện đặc biệt.', hint: 'Dùng trong các văn cảnh trang trọng.' },
    { pattern: '～をはじめ', regex: /をはじめ/i, why: 'Trước hết phải kể đến ~, dẫn đầu là ~.', hint: 'Đưa ra ví dụ tiêu biểu hàng đầu trong một nhóm.' },
    { pattern: '～に基づいて', regex: /に基づいて/i, why: 'Dựa trên cơ sở, dữ liệu hoặc nguyên tắc chuẩn.', hint: 'Căn cứ vào dữ liệu nghiên cứu, pháp luật.' },
    { pattern: '～をめぐって', regex: /をめぐって/i, why: 'Xoay quanh tranh luận, ý kiến đối lập về chủ đề.', hint: 'Chủ thể là số đông có quan điểm khác nhau.' },
    { pattern: '～わけにはいかない', regex: /わけにはいかない/i, why: 'Không thể làm vì lương tâm, đạo đức, quy tắc.', hint: 'Phân biệt với khả năng thể chất.' },
    { pattern: '～ざるを得ない', regex: /ざるを得ない/i, why: 'Đành phải làm, không còn cách nào khác.', hint: 'Dù không muốn nhưng tình thế bắt buộc.' },
    { pattern: '～にほかならない', regex: /にほかならない/i, why: 'Chính là, không gì khác ngoài (nhấn mạnh lý do).', hint: 'Khẳng định mạnh mẽ nguyên nhân cốt lõi.' },
    { pattern: '～にもかかわらず', regex: /にもかかわらず/i, why: 'Mặc dù thực tế như vậy nhưng vế sau trái ngược.', hint: 'Biểu thị sự ngạc nhiên, trái với dự đoán.' },
  ],
  N3: [
    { pattern: 'Thể sai khiến / Bị động', regex: /せる|させる|られる|される/i, why: 'Hành vi tác động (bắt/cho phép) hoặc bị tác động.', hint: 'Xác định trợ từ に và を tương ứng với vai trò nhân vật.' },
    { pattern: 'Kính ngữ giao tiếp', regex: /お目にかかる|いただく|くださる|なさる|参る|申す/i, why: 'Kính ngữ trong giao tiếp công sở, khách hàng.', hint: 'Xác định chủ ngữ: mình (khiêm nhường) hay đối tác (tôn kính).' },
    { pattern: '～ようにする', regex: /ようにする|ようにして/i, why: 'Cố gắng thực hiện / tạo thói quen tốt.', hint: 'Phân biệt với ～ことになる và ～ようになる.' },
    { pattern: '～ないといけない', regex: /ないといけない|なければならない/i, why: 'Nghĩa vụ, việc bắt buộc phải thực hiện.', hint: 'Thể hiện tính cấp thiết hoặc quy tắc bắt buộc.' },
    { pattern: '～うちに', regex: /うちに/i, why: 'Trong khi / nhân lúc (trước khi trạng thái thay đổi).', hint: 'Nhân lúc còn nóng, trước khi trời mưa.' },
    { pattern: '～はずだ', regex: /はずだ|はずがない/i, why: 'Chắc chắn là / không thể nào (phán đoán có căn cứ).', hint: 'Khẳng định phán đoán dựa trên lý lẽ chắc chắn.' },
    { pattern: '～ために', regex: /ために|ための/i, why: 'Mục đích hành động hoặc nguyên nhân khách quan.', hint: 'Đi với thể từ điển V-る (mục đích) hoặc thể quá khứ (nguyên nhân).' },
    { pattern: '～ばかり', regex: /ばかり/i, why: 'Chỉ toàn / vừa mới làm xong (tùy cấu trúc đi kèm).', hint: '～てばかりいる (chỉ toàn làm) vs ～たばかり (vừa mới làm xong).' },
    { pattern: '～ことになる', regex: /ことになる|ことになった/i, why: 'Kết quả được quyết định / sắp đặt khách quan.', hint: 'Phân biệt với ～ことにする (tự quyết định).' },
    { pattern: '～わけではない', regex: /わけではない|わけじゃない/i, why: 'Phủ định một phần (không hẳn là...).', hint: 'Phân biệt với ～わけがない (không thể nào).' },
  ],
  N4: [
    { pattern: '～たところ', regex: /たところ/i, why: 'Vừa mới hoàn thành xong tức thì.', hint: 'V-た + ところ thể hiện việc vừa dứt điểm.' },
    { pattern: 'Cho nhận (あげる / もらう / くれる)', regex: /あげる|もらう|くれる/i, why: 'Quan hệ cho và nhận hành động giúp đỡ.', hint: 'Xác định người thực hiện và người thụ hưởng.' },
    { pattern: '～やすい / ～にくい', regex: /やすい|にくい/i, why: 'Dễ làm gì / khó làm gì.', hint: 'V-masu bỏ masu + やすい / にくい.' },
    { pattern: '～しか（ない）', regex: /しか/i, why: 'Chỉ có, không còn lựa chọn nào khác.', hint: 'Luôn đi kèm với đuôi phủ định ない.' },
    { pattern: '～てしまう', regex: /てしまう|ちゃった|じゃった/i, why: 'Lỡ làm việc ngoài ý muốn hoặc hoàn tất triệt để.', hint: 'Biểu thị sự tiếc nuối hoặc xong xuôi.' },
    { pattern: '～すぎます', regex: /すぎ/i, why: 'Quá mức độ bình thường.', hint: 'Tính từ bỏ い/な hoặc V-masu + すぎる.' },
  ],
  N5: [
    { pattern: '～たい', regex: /たい/i, why: 'Mong muốn làm gì của bản thân người nói.', hint: 'V-masu bỏ masu + たい.' },
    { pattern: '～てください', regex: /てください/i, why: 'Nhờ vả, đề nghị lịch sự.', hint: 'Động từ chia thể て + ください.' },
    { pattern: '～てから', regex: /てから/i, why: 'Sau khi làm xong A thì làm B.', hint: 'Nhấn mạnh trật tự thời gian trước sau.' },
    { pattern: '～あとで', regex: /あとで/i, why: 'Sau khi làm việc gì.', hint: 'Đi với động từ thể quá khứ V-た hoặc Danh từ + の.' },
    { pattern: '～まえに', regex: /まえに/i, why: 'Trước khi làm việc gì.', hint: 'Đi với động từ nguyên mẫu thể từ điển V-る.' },
  ],
};

const NEGATION = /ない|ません|ぬ|ず(?:に)?|ではない|わけがない|とは限らない|ありません/;
const CONJUNCTION = /しかし|だが|ところが|けれども|ただし|一方|それでも|にもかかわらず/;

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

type TrapId = 'near' | 'neg' | 'distract' | 'partial' | 'order' | 'kanji' | 'grammar';

/** Rule-based trap type of an answered-but-wrong question, from the real option texts. */
function classifyTrap(
  skill: string,
  mondai: string,
  stem: string,
  chosen: string,
  correct: string,
): TrapId | null {
  if (skill === 'kanji') return 'kanji';
  if (skill === 'listening') return 'distract';
  const reading = skill === 'reading' || mondai === 'text_grammar' || mondai === 'sentence_composition';
  if (reading && CONJUNCTION.test(stem)) return 'order';
  if (chosen && correct && NEGATION.test(chosen) !== NEGATION.test(correct)) return 'neg';
  if (skill === 'reading' && chosen && correct && overlapRatio(chosen, correct) >= 0.3) return 'partial';
  if (skill === 'vocabulary') return 'near';
  if (skill === 'grammar') return 'grammar';
  if (skill === 'reading') return 'partial';
  return null;
}

const TRAP_INFO: Record<TrapId, { name: string; why: string; hint: string }> = {
  near: {
    name: 'Đáp án gần nghĩa',
    why: 'Hai lựa chọn gần nghĩa nhưng khác cấu trúc kết hợp hoặc sắc thái biểu đạt.',
    hint: 'Đọc kỹ từ đi kèm ngữ cảnh thay vì chỉ dịch nghĩa thô sang tiếng Việt.',
  },
  neg: {
    name: 'Phủ định kép / một phần',
    why: 'Đáp án đúng và đáp án bạn chọn khác nhau ở chỗ có / không có phủ định.',
    hint: 'Gạch chân từ phủ định và xác định phạm vi mà nó bao trùm trước khi chọn.',
  },
  distract: {
    name: 'Thông tin gây nhiễu',
    why: 'Bị phân tâm bởi thông tin nhiễu trước đáp án hoặc quyết định bị đổi ở cuối.',
    hint: 'Ghi chú quyết định cuối cùng, đặc biệt sau các từ nối chuyển hướng.',
  },
  partial: {
    name: 'Đáp án đúng một phần',
    why: 'Phương án đã chọn có nhiều chi tiết trùng với đáp án đúng nhưng thiếu hoặc sai ý chính.',
    hint: 'Tìm câu kết luận của tác giả thay vì chọn ngay chi tiết xuất hiện ở đoạn đầu.',
  },
  order: {
    name: 'Từ nối chuyển ý / đảo thứ tự',
    why: 'Đề có từ nối chuyển ý (しかし, ところが...) làm đổi chiều ý, dễ chọn theo vế đầu.',
    hint: 'Khoanh các từ nối chuyển ý và đọc kỹ vế phía sau chúng.',
  },
  kanji: {
    name: 'Chữ Hán / âm đọc tương tự',
    why: 'Nhầm âm On/Kun hoặc mặt chữ có cấu tạo bộ thủ tương tự.',
    hint: 'Ôn ngắt quãng theo từ ghép thường gặp, không chỉ nhớ chữ đứng đơn lẻ.',
  },
  grammar: {
    name: 'Mẫu ngữ pháp tương tự',
    why: 'Chọn mẫu câu có hình thức hoặc nghĩa gần với đáp án đúng.',
    hint: 'Học các cặp dễ nhầm theo ví dụ đối chiếu và dấu hiệu nhận biết.',
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

    // 3. Real knowledge coverage by level from user exams
    const userExamQuestions = await sql`
      SELECT DISTINCT q.level, q.id, qv.explanation
      FROM exam_attempts ea
      JOIN exam_items ei ON ei.exam_id = ea.exam_id
      JOIN questions q ON q.id = ei.question_id
      LEFT JOIN question_versions qv ON qv.question_id = q.id
      WHERE ea.user_id = ${userId}
    `;

    const bankQuestions = await sql`
      SELECT DISTINCT q.level, q.id, qv.explanation
      FROM questions q
      LEFT JOIN question_versions qv ON qv.question_id = q.id
      WHERE q.level IN ('N2', 'N4', 'N5') AND q.skill = 'grammar'
      LIMIT 300
    `;

    const coverageByLevel: Record<string, Array<{
      id: string;
      name: string;
      value: number;
      unit: string;
      why: string;
      hint: string;
      isUserExams: boolean;
    }>> = {};

    for (const lvl of ['N1', 'N2', 'N3', 'N4', 'N5']) {
      const userQuestionsForLvl = userExamQuestions.filter((q) => q.level === lvl);
      const isUserExams = userQuestionsForLvl.length > 0;
      const targetQuestions = isUserExams ? userQuestionsForLvl : bankQuestions.filter((q) => q.level === lvl);
      const patterns = PATTERNS_BY_LEVEL[lvl] || [];
      const list = [];

      for (const p of patterns) {
        let count = 0;
        for (const q of targetQuestions) {
          const exp = extractExplanation(q.explanation);
          if (p.regex.test(exp)) {
            count += 1;
          }
        }
        if (count > 0) {
          list.push({
            id: `cov-${lvl}-${p.pattern}`,
            name: p.pattern,
            value: count,
            unit: 'câu',
            why: p.why,
            hint: p.hint,
            isUserExams,
          });
        }
      }

      list.sort((a, b) => b.value - a.value);
      coverageByLevel[lvl] = list;
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
        SELECT stem FROM question_versions
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
    };
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

      for (const lvl of [(r.level as string) || 'N3', 'all']) {
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
          (array_agg(e.title ORDER BY coalesce(ea.submitted_at, ea.started_at) DESC))[1] as exam_title
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
        ORDER BY wrong_count DESC, last_date DESC
        LIMIT 8
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
