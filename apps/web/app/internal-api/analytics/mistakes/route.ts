import { NextResponse, type NextRequest } from 'next/server';
import postgres from 'postgres';

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const dbUrl =
    process.env.DATABASE_URL ||
    'postgres://jlpt:311168c62385bd1fac12286debed8054@172.18.0.3:5432/jlpt_staging';

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
        count(*) FILTER (WHERE ua.is_correct = false)::int as wrong
      FROM user_answers ua
      JOIN exam_attempts ea ON ea.id = ua.attempt_id
      JOIN questions q ON q.id = ua.question_id
      WHERE ea.user_id = ${userId}
      GROUP BY q.level, q.skill
    `;

    const statsBySkillByLevel: Record<string, Record<string, { wrong: number; total: number }>> = {
      all: {
        grammar: { wrong: 0, total: 0 },
        reading: { wrong: 0, total: 0 },
        vocabulary: { wrong: 0, total: 0 },
        kanji: { wrong: 0, total: 0 },
        listening: { wrong: 0, total: 0 },
      },
    };

    for (const sr of skillRows) {
      const lvl = sr.level || 'N3';
      const sk = sr.skill || 'other';
      if (!statsBySkillByLevel[lvl]) {
        statsBySkillByLevel[lvl] = {
          grammar: { wrong: 0, total: 0 },
          reading: { wrong: 0, total: 0 },
          vocabulary: { wrong: 0, total: 0 },
          kanji: { wrong: 0, total: 0 },
          listening: { wrong: 0, total: 0 },
        };
      }
      statsBySkillByLevel[lvl][sk] = { wrong: sr.wrong, total: sr.total };
      const allStats = statsBySkillByLevel['all'];
      if (allStats && allStats[sk]) {
        allStats[sk].wrong += sr.wrong;
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
          ua.option_value as user_choice,
          count(*)::int as wrong_count,
          max(ea.submitted_at) as last_date,
          e.title as exam_title
        FROM user_answers ua
        JOIN exam_attempts ea ON ea.id = ua.attempt_id
        JOIN exams e ON e.id = ea.exam_id
        JOIN questions q ON q.id = ua.question_id
        LEFT JOIN question_versions qv ON qv.question_id = q.id
        WHERE ea.user_id = ${userId} AND ua.is_correct = false AND q.skill IN ${sql(cat.skills)}
        GROUP BY ua.question_id, q.skill, q.mondai_type, q.level, qv.stem, qv.explanation, ua.option_value, e.title
        ORDER BY wrong_count DESC
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

        const term = extractTargetTerm(rawStem, underline, r.skill, fullExp, correctText);

        let promptText = rawStem;
        if (opts.length > 0) {
          const formattedOpts = opts
            .map((o) => `[${o.order_index}] ${extractText(o.content)}`)
            .join('    ');
          promptText = rawStem ? `${rawStem}\n\nCác lựa chọn:\n${formattedOpts}` : formattedOpts;
        }

        list.push({
          term,
          meaning: meaning || 'Cần ôn tập kỹ dạng câu hỏi và phân tích đáp án chi tiết',
          wrong: r.wrong_count,
          total: r.wrong_count + 1,
          streak: r.wrong_count >= 3 ? 3 : r.wrong_count,
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
    });
  } catch (error) {
    await sql.end();
    console.error('Error fetching real mistakes:', error);
    return NextResponse.json({ error: 'Failed to fetch mistakes' }, { status: 500 });
  }
}
