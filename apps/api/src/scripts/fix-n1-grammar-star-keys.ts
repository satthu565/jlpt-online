import { stat } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module.js';
import { DB_CLIENT } from '../common/database/database.module.js';
import { generateUuidV7 } from '../common/utils/uuid.js';
import type { DbClientInstance } from '../db/client.js';
import { ExamService } from '../modules/exam/exam.service.js';

type JsonRecord = Record<string, unknown>;

export const CORRECTION_ID = 'n1-grammar-star-keys-2026-11-06';

export interface GrammarFix {
  examSlug: string;
  /** Số câu trên web (exam_items.order_index + 1). */
  questionNumber: number;
  oldKey: number;
  newKey: number;
  /** Ô (1-4) mà dấu ★ phải đứng. Bỏ trống nếu giữ nguyên đề bài. */
  starSlot?: number;
  /** Ô ★ hiện tại trong DB, dùng để kiểm tra trước khi sửa. */
  oldStarSlot?: number;
  translationVi?: string;
  reason: string;
  wrongReasons: Readonly<Record<number, string>>;
}

const STAR_NOTE_2016_12 =
  '\nLưu ý về nguồn: bản PDF gốc in dấu ★ ở ô thứ hai cho cả năm câu 36–40, nhưng bảng đáp án chính thức chỉ khớp với trật tự ngữ pháp khi ★ ở ô thứ ba (câu 37, 38, 39). Vì vậy dấu ★ của năm câu này được đặt ở ô thứ ba.';

export const N1_GRAMMAR_FIXES: readonly GrammarFix[] = [
  {
    examSlug: 'n1-2012-07',
    questionNumber: 36,
    oldKey: 2,
    newKey: 3,
    reason:
      'Trật tự đúng là 4 → 2 → 3 → 1: 「どんな悪人であろうと、どこかに良心は残っているはずだ」(mẫu 「どんな〜であろうと」: dù là... đến đâu đi nữa). Dấu ★ ở ô thứ ba nên đáp án là [3] あろうと.\nLưu ý: bảng đáp án in kèm ghi [2], nhưng 悪人で nằm ở ô thứ hai, không phải ô ★. Đáp án đã được sửa theo trật tự ngữ pháp và vị trí ★ trên đề.',
    wrongReasons: {
      1: 'どこかに: ô thứ tư, bổ nghĩa cho 「良心は残っている」(lương tâm vẫn còn ở đâu đó).',
      2: '悪人で: ô thứ hai, nối 「どんな」 với 「あろうと」 thành 「どんな悪人であろうと」, nhưng không nằm ở ô ★.',
      4: 'どんな: ô thứ nhất, mở đầu cấu trúc 「どんな〜であろうと」.',
    },
  },
  {
    examSlug: 'n1-2013-12',
    questionNumber: 36,
    oldKey: 1,
    newKey: 4,
    reason:
      'Trật tự đúng là 3 → 1 → 4 → 2: 「単に木材の供給源として のみではなく、水や空気を育む 環境資源 と捉える」(không chỉ coi rừng là nguồn cung cấp gỗ mà còn là tài nguyên môi trường nuôi dưỡng nước và không khí). Dấu ★ ở ô thứ ba nên đáp án là [4] 水や空気を育む.\nLưu ý: bảng đáp án in kèm ghi [1], nhưng のみではなく nằm ở ô thứ hai. Đáp án đã được sửa theo trật tự ngữ pháp và vị trí ★ trên đề (ô thứ ba).',
    wrongReasons: {
      1: 'のみではなく: ô thứ hai, đi sau 「として」 tạo thành 「〜としてのみではなく」(không chỉ với tư cách là...), không nằm ở ô ★.',
      2: '環境資源: ô thứ tư, danh từ được 「水や空気を育む」 bổ nghĩa, đứng ngay trước 「と捉える」.',
      3: 'として: ô thứ nhất, đi ngay sau 「木材の供給源」.',
    },
  },
  {
    examSlug: 'n1-2023-07',
    questionNumber: 39,
    oldKey: 3,
    newKey: 2,
    reason:
      'Trật tự đúng là 1 → 3 → 2 → 4: 「今年の転職にあたり、少しも不安がなかったといえばうそになるが、新たなことに挑戦できてうれしいという気持ちのほうが大きかった」. Dấu ★ ở ô thứ ba nên đáp án là [2] うそになるが (cụm 「〜といえばうそになる」: nếu nói là... thì là nói dối).\nLưu ý: bảng đáp án in kèm ghi [3], nhưng 少しも不安がなかったといえば nằm ở ô thứ hai. Đáp án đã được sửa theo trật tự ngữ pháp và vị trí ★ trên đề.',
    wrongReasons: {
      1: '転職にあたり: ô thứ nhất, 「〜にあたり」 (nhân dịp, khi...) nối với 「今年の」.',
      3: '少しも不安がなかったといえば: ô thứ hai, vế điều kiện của 「〜といえばうそになる」, không nằm ở ô ★.',
      4: '新たなことに挑戦できてうれしいという: ô thứ tư, bổ nghĩa cho 「気持ち」.',
    },
  },
  {
    examSlug: 'n1-2023-07',
    questionNumber: 41,
    oldKey: 1,
    newKey: 2,
    translationVi:
      'Tôi chắc chắn không phải là người ái kỷ. Cũng chẳng phải là cuốn tiểu thuyết to tát đến mức đáng để đọc đi đọc lại. Đó chỉ là tình cảm của bậc cha mẹ luôn thấy con mình dễ thương hơn con nhà người khác.',
    reason:
      'Ngay trước đó tác giả phủ nhận mình là người ái kỷ (「まさかナルシストではない」). 「〜でもあるまい」 là cách nói phủ định phỏng đoán trong văn viết: 「復読に耐えるほどたいそうな小説でもあるまい」 nghĩa là "chắc cũng chẳng phải là cuốn tiểu thuyết to tát đến mức chịu được đọc đi đọc lại". Câu sau 「わが子はよその子よりもかわいいと思う親の情である」 giải thích lý do thật sự: đó là tình thương của cha mẹ dành cho con mình.\nLưu ý: bảng đáp án nguồn ghi [1], nhưng 「たいそうな小説であってもだ」 không thành câu hoàn chỉnh và không nối được với câu sau, nên đáp án đã được sửa thành [2].',
    wrongReasons: {
      1: 'nghĩa nhượng bộ ("dù là tiểu thuyết..."), câu bị bỏ lửng và không nối được với 「わが子は〜親の情である」.',
      3: 'câu hỏi tu từ, không ăn khớp với giọng phủ định của câu trước (「まさかナルシストではない」) và giọng khẳng định của câu sau (「〜親の情である」).',
      4: 'nghĩa "chẳng phải là tiểu thuyết (to tát) hay sao", ngược với ý khiêm tốn của tác giả.',
    },
  },
  {
    examSlug: 'n1-2023-07',
    questionNumber: 43,
    oldKey: 1,
    newKey: 3,
    translationVi:
      'Không phải vì tôi lười biếng, mà vì càng đọc tôi càng không thể phủ nhận con người mình của thời điểm viết ra những dòng chữ đó.',
    reason:
      'Câu sau giải thích: 「いくらか齢を食ったからといって、齢なりに懸命であったおのれの文章を滅ぼすことは忍びない」 — tác giả không nỡ sửa hay xóa bỏ văn cũ. Vì vậy 「読めば読むほどその文章を書いていたころの自分を否定できなくなるのだ」 (càng đọc càng không thể phủ nhận bản thân lúc ấy) mới khớp với việc không chịu viết lại.\nLưu ý: bảng đáp án nguồn ghi [1], nhưng 「否定せずにいられなくなる」 nghĩa là "không thể không phủ nhận", trái với mạch văn, nên đáp án đã được sửa thành [3].',
    wrongReasons: {
      1: 'không kìm được việc phủ nhận bản thân ngày trước, mâu thuẫn với việc tác giả không nỡ sửa văn cũ.',
      2: 'có xu hướng phủ nhận, cũng ngược với mạch văn.',
      4: 'dần dần phủ nhận, ngược với thái độ tôn trọng bản thân ngày trước của tác giả.',
    },
  },
  {
    examSlug: 'n1-2016-12',
    questionNumber: 36,
    oldKey: 2,
    newKey: 3,
    oldStarSlot: 2,
    starSlot: 3,
    reason:
      'Trật tự đúng là 2 → 4 → 3 → 1: 「アセビには有毒成分があり、馬が食べると酔ったような状態になることに由来するそうです」. Dấu ★ ở ô thứ ba nên đáp án là [3] 状態になることに (cụm 「〜ことに由来する」).\nLưu ý: bảng đáp án in kèm ghi [2], nhưng 有毒成分があり nằm ở ô thứ nhất. Đáp án đã được sửa theo trật tự ngữ pháp.' +
      STAR_NOTE_2016_12,
    wrongReasons: {
      1: '由来する: ô thứ tư, đứng ngay trước 「そうです」 tạo thành 「由来するそうです」.',
      2: '有毒成分があり: ô thứ nhất, nêu đặc tính của アセビ.',
      4: '馬が食べると酔ったような: ô thứ hai, bổ nghĩa cho 「状態」 ở ô thứ ba.',
    },
  },
  {
    examSlug: 'n1-2016-12',
    questionNumber: 37,
    oldKey: 1,
    newKey: 1,
    oldStarSlot: 2,
    starSlot: 3,
    reason:
      'Trật tự đúng là 3 → 2 → 1 → 4: 「家族の時間を大切にする夫は、つい仕事に夢中になりすぎる私に、本当に大切なものは何なのか気づかせてくれるありがたい存在です」. Dấu ★ ở ô thứ ba nên đáp án là [1] 本当に大切なものは何なのか.' +
      STAR_NOTE_2016_12,
    wrongReasons: {
      2: '私に: ô thứ hai, tân ngữ của 「気づかせてくれる」, đứng sau cụm định ngữ 「仕事に夢中になりすぎる」.',
      3: '仕事に夢中になりすぎる: ô thứ nhất, bổ nghĩa cho 「私」.',
      4: '気づかせてくれる: ô thứ tư, bổ nghĩa cho 「ありがたい存在」.',
    },
  },
  {
    examSlug: 'n1-2016-12',
    questionNumber: 38,
    oldKey: 4,
    newKey: 4,
    oldStarSlot: 2,
    starSlot: 3,
    reason:
      'Trật tự đúng là 2 → 3 → 4 → 1: 「脱税を行った疑いがあるなどと報じられたことに対し、事実とは全く異なり、名誉を傷つけられたとして、〜訴訟を起こした」. Dấu ★ ở ô thứ ba nên đáp án là [4] ことに対し.' +
      STAR_NOTE_2016_12,
    wrongReasons: {
      1: '事実とは全く: ô thứ tư, đi với 「異なり」 thành 「事実とは全く異なり」.',
      2: '疑いがあるなどと: ô thứ nhất, nội dung bị đưa tin.',
      3: '報じられた: ô thứ hai, bổ nghĩa cho 「こと」 ở ô thứ ba.',
    },
  },
  {
    examSlug: 'n1-2016-12',
    questionNumber: 39,
    oldKey: 3,
    newKey: 3,
    oldStarSlot: 2,
    starSlot: 3,
    reason:
      'Trật tự đúng là 4 → 2 → 3 → 1: 「経営努力だけでは対応しきれないと判断してのことだという」. Dấu ★ ở ô thứ ba nên đáp án là [3] ことだ (cụm 「〜してのことだ」 kết hợp 「という」 để truyền đạt thông tin).' +
      STAR_NOTE_2016_12,
    wrongReasons: {
      1: 'という: ô thứ tư, kết câu truyền đạt (nghe nói là...).',
      2: 'の: ô thứ hai, nối 「して」 với 「ことだ」 thành 「判断してのこと」.',
      4: 'して: ô thứ nhất, 「判断して」.',
    },
  },
  {
    examSlug: 'n1-2016-12',
    questionNumber: 40,
    oldKey: 2,
    newKey: 4,
    oldStarSlot: 2,
    starSlot: 3,
    reason:
      'Trật tự đúng là 1 → 3 → 4 → 2: 「資格を取っただけで希望の職につけるほど世間は甘くないらしい」(mẫu 「〜ほど〜ない」: không đến mức...). Dấu ★ ở ô thứ ba nên đáp án là [4] 希望の職につける.\nLưu ý: bảng đáp án in kèm ghi [2], nhưng ほど nằm ở ô thứ tư. Đáp án đã được sửa theo trật tự ngữ pháp.' +
      STAR_NOTE_2016_12,
    wrongReasons: {
      1: 'だけ: ô thứ nhất, 「取っただけ」.',
      2: 'ほど: ô thứ tư, đi sau 「希望の職につける」 để chỉ mức độ, không nằm ở ô ★.',
      3: 'で: ô thứ hai, 「〜だけで」.',
    },
  },
  {
    examSlug: 'n1-2015-07',
    questionNumber: 36,
    oldKey: 3,
    newKey: 3,
    oldStarSlot: 3,
    starSlot: 2,
    reason:
      'Trật tự đúng là 2 → 3 → 1 → 4: 「メールの書き方」「ひとつに」「しても」「そうで」(mẫu 「Nひとつにしても」: ngay cả chỉ một việc như N...). Theo bản in gốc, dấu ★ nằm ở ô thứ hai nên đáp án là [3] ひとつに.',
    wrongReasons: {
      1: 'しても: ô thứ ba, đi sau 「ひとつに」 tạo thành 「〜ひとつにしても」.',
      2: 'メールの書き方: ô thứ nhất, danh từ nêu ví dụ.',
      4: 'そうで: ô thứ tư, liên kết với vế 「現場だと…」 phía sau.',
    },
  },
  {
    examSlug: 'n1-2011-12',
    questionNumber: 39,
    oldKey: 3,
    newKey: 3,
    reason:
      'Trật tự đúng là 2 → 4 → 3 → 1: 「政府は増税を避けようのないものとして、手始めに自動車税の引き上げを主張している」(mẫu 「V-ようがない/V-ようのない」: không có cách nào để...). Dấu ★ ở ô thứ ba nên đáp án là [3] のない.',
    wrongReasons: {
      1: 'もの: ô thứ tư, đi sau 「避けようのない」 và đứng trước 「として」.',
      2: '増税を: ô thứ nhất, tân ngữ của 「避けよう」.',
      4: '避けよう: ô thứ hai, đứng sau 「増税を」 và trước 「のない」.',
    },
  },
  {
    examSlug: 'n1-2022-07',
    questionNumber: 40,
    oldKey: 4,
    newKey: 4,
    reason:
      'Trật tự đúng là 1 → 3 → 4 → 2: 「『未来のものづくりコンテスト』は、子供たちにものづくりの面白さを感じてもらおうと、YUUKI 社が創立50周年を機に始めたコンテストで、今年で20回目を迎える」. Ngữ pháp: 「〜を機に」 (nhân dịp...), 「〜ようと」 (với mục đích...). Dấu ★ ở ô thứ ba nên đáp án là [4] YUUKI 社が創立50周年を機に始めた.',
    wrongReasons: {
      1: '子供たちに: ô thứ nhất, đối tượng trong 「子供たちに…感じてもらおうと」.',
      2: 'コンテストで: ô thứ tư, danh từ kết thúc cụm định ngữ 「…始めたコンテストで」, nối với vế sau.',
      3: 'ものづくりの面白さを感じてもらおうと: ô thứ hai, chỉ mục đích.',
    },
  },
] as const;

export function fixId(fix: GrammarFix): string {
  return `${fix.examSlug}:Q${fix.questionNumber}`;
}

function asRecord(value: unknown): JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function flattenText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(flattenText).join('');
  if (value !== null && typeof value === 'object') {
    const record = value as JsonRecord;
    if (record.t === 'br') return '\n';
    if (typeof record.text === 'string') return record.text;
    if ('children' in record) return flattenText(record.children);
    if ('content' in record) return flattenText(record.content);
  }
  return '';
}

const isSlotToken = (token: unknown): boolean => {
  const t = asRecord(token).t;
  return t === 'blank' || t === 'star';
};

/** Vị trí (1-4) của ★ trong stem, hoặc null nếu stem không có đúng 4 ô. */
export function getStarSlot(stem: unknown): number | null {
  if (!Array.isArray(stem)) return null;
  const slots = stem.filter(isSlotToken);
  if (slots.length !== 4) return null;
  const index = slots.findIndex((token) => asRecord(token).t === 'star');
  return index === -1 ? null : index + 1;
}

/** Đặt ★ vào ô `slot` (1-4), các ô khác là ô trống; giữ nguyên chữ xung quanh. */
export function moveStar(stem: unknown, slot: number): unknown[] {
  if (!Array.isArray(stem) || stem.filter(isSlotToken).length !== 4) {
    throw new Error('Stem must contain exactly four answer slots');
  }
  if (slot < 1 || slot > 4) throw new Error('Star slot must be between 1 and 4');
  let seen = 0;
  return stem.map((token) => {
    if (!isSlotToken(token)) return token;
    seen += 1;
    return seen === slot ? { t: 'star' } : { t: 'blank' };
  });
}

export function buildExplanation(
  source: unknown,
  fix: GrammarFix,
  options: ReadonlyMap<number, string>,
  nextVersion: number,
): JsonRecord {
  const existing = asRecord(source);
  const keyText = options.get(fix.newKey) ?? `Phương án ${fix.newKey}`;
  const translationVi =
    fix.translationVi ?? (typeof existing.translationVi === 'string' ? existing.translationVi : '');
  const correctText = `Đáp án đúng: [${fix.newKey}] ${keyText}\n${fix.reason}`;

  const wrongReasonsByOption: Record<string, unknown> = {};
  const wrongLines: string[] = [];
  for (const [index, optionText] of options.entries()) {
    if (index === fix.newKey) continue;
    const reason = fix.wrongReasons[index];
    if (!reason) throw new Error(`${fixId(fix)}: missing wrong reason for option ${index}`);
    const line = `[${index}] ${reason.startsWith(optionText) ? reason : `${optionText}: ${reason}`}`;
    wrongLines.push(`- ${line}`);
    wrongReasonsByOption[String(index)] = [{ t: 'text', text: line }];
  }

  const blocks: unknown[] = [];
  if (translationVi) {
    blocks.push({
      type: 'paragraph',
      content: [{ t: 'text', text: `• Dịch nghĩa: ${translationVi}` }],
    });
  }
  blocks.push({
    type: 'paragraph',
    content: [
      { t: 'text', text: `• Đáp án đúng: [${fix.newKey}] ${keyText}` },
      ...fix.reason.split('\n').flatMap((line) => [{ t: 'br' }, { t: 'text', text: line }]),
    ],
  });
  blocks.push({
    type: 'paragraph',
    content: [
      { t: 'text', text: '• Phân tích các phương án còn lại:' },
      ...wrongLines.flatMap((line) => [{ t: 'br' }, { t: 'text', text: line }]),
    ],
  });

  return {
    ...existing,
    contentVersion: nextVersion,
    humanReviewed: true,
    correctionId: CORRECTION_ID,
    translationVi,
    translation: translationVi ? [{ t: 'text', text: translationVi }] : existing.translation,
    correctReason: [{ t: 'text', text: correctText }],
    wrongReasonsByOption,
    explanationMarkdown: [
      `**Lý do đúng**:\n${correctText}`,
      `**Phân tích các phương án còn lại**:\n${wrongLines.join('\n')}`,
    ].join('\n\n'),
    blocks,
  };
}

export type FixState = 'pending' | 'applied';

export function getFixState(
  fix: GrammarFix,
  currentKey: number,
  publishedKey: number,
  currentStarSlot: number | null,
  correctionId: unknown,
): FixState {
  const starOk = fix.starSlot === undefined || currentStarSlot === fix.starSlot;
  return currentKey === fix.newKey &&
    publishedKey === fix.newKey &&
    starOk &&
    correctionId === CORRECTION_ID
    ? 'applied'
    : 'pending';
}

interface ResolvedFix {
  fix: GrammarFix;
  examId: string;
  questionId: string;
  groupId: string;
  version: number;
  currentKey: number;
  publishedKey: number;
  stem: unknown;
  starSlot: number | null;
  options: ReadonlyMap<number, string>;
  explanationContent: unknown;
  state: FixState;
}

async function resolveFixes(sql: DbClientInstance['rawClient']): Promise<ResolvedFix[]> {
  const resolved: ResolvedFix[] = [];
  for (const fix of N1_GRAMMAR_FIXES) {
    const rows = await sql`
      select e.id as exam_id, q.id as question_id, q.group_id, q.skill,
             qv.version as question_version, qv.status as question_status, qv.stem,
             gv.version as group_version, gv.status as group_status,
             ca.correct_option as current_key, eak.keys[${fix.questionNumber}] as published_key
      from exams e
      join exam_items ei on ei.exam_id = e.id and ei.order_index = ${fix.questionNumber - 1}
      join questions q on q.id = ei.question_id and q.deleted_at is null
      join lateral (
        select * from question_versions v where v.question_id = q.id
        order by v.version desc limit 1
      ) qv on true
      join lateral (
        select * from question_group_versions v where v.group_id = q.group_id
        order by v.version desc limit 1
      ) gv on true
      join correct_answers ca on ca.question_id = q.id and ca.question_version = qv.version
      join exam_answer_keys eak on eak.exam_id = e.id and eak.version = e.published_version
      where e.slug = ${fix.examSlug} and e.deleted_at is null
    `;
    const row = rows[0];
    if (!row) throw new Error(`${fixId(fix)}: target question was not found`);
    if (row.skill !== 'grammar') throw new Error(`${fixId(fix)}: target is not a grammar question`);
    if (row.question_status !== 'approved' || row.group_status !== 'approved') {
      throw new Error(`${fixId(fix)}: latest question/group is not approved`);
    }
    if (row.question_version !== row.group_version) {
      throw new Error(`${fixId(fix)}: question/group versions are not aligned`);
    }

    const optionRows = await sql`
      select order_index, content from answer_options
      where question_id = ${row.question_id} and question_version = ${row.question_version}
      order by order_index
    `;
    const options = new Map<number, string>();
    for (const option of optionRows) {
      options.set(option.order_index, flattenText(option.content));
    }
    if (options.size !== 4) throw new Error(`${fixId(fix)}: expected exactly four options`);

    const explanationRows = await sql`
      select content from explanation_versions
      where question_id = ${row.question_id} and locale = 'vi'
      order by version desc limit 1
    `;
    const explanationContent = explanationRows[0]?.content;
    const starSlot = getStarSlot(row.stem);
    if (row.current_key !== fix.oldKey && row.current_key !== fix.newKey) {
      throw new Error(`${fixId(fix)}: unexpected current key ${row.current_key}`);
    }
    if (
      fix.starSlot !== undefined &&
      starSlot !== fix.starSlot &&
      starSlot !== (fix.oldStarSlot ?? null)
    ) {
      throw new Error(`${fixId(fix)}: unexpected star slot ${String(starSlot)}`);
    }

    resolved.push({
      fix,
      examId: row.exam_id,
      questionId: row.question_id,
      groupId: row.group_id,
      version: row.question_version,
      currentKey: row.current_key,
      publishedKey: row.published_key,
      stem: row.stem,
      starSlot,
      options,
      explanationContent,
      state: getFixState(
        fix,
        row.current_key,
        row.published_key,
        starSlot,
        asRecord(explanationContent).correctionId,
      ),
    });
  }
  return resolved;
}

async function requireBackup(): Promise<string> {
  const backupPath = process.env.N1_GRAMMAR_FIX_BACKUP;
  if (!backupPath) throw new Error('N1_GRAMMAR_FIX_BACKUP is required to apply fixes');
  const info = await stat(backupPath);
  if (!info.isFile() || info.size < 1024 * 1024) {
    throw new Error('Backup file is missing or smaller than 1 MiB: ' + backupPath);
  }
  return backupPath;
}

async function applyFixes(
  sql: DbClientInstance['rawClient'],
  resolved: ResolvedFix[],
): Promise<number> {
  const [editor] = await sql`select id from users where role = 'editor' and blocked_at is null`;
  const [reviewer] = await sql`select id from users where role = 'reviewer' and blocked_at is null`;
  const [admin] = await sql`select id from users where role = 'admin' and blocked_at is null`;
  if (!editor || !reviewer || !admin || editor.id === reviewer.id) {
    throw new Error('Distinct active editor, reviewer, and admin users are required');
  }

  const byGroup = new Map<string, ResolvedFix[]>();
  for (const item of resolved) {
    if (item.state === 'applied') continue;
    const list = byGroup.get(item.groupId) ?? [];
    list.push(item);
    byGroup.set(item.groupId, list);
  }

  let groupsVersioned = 0;
  await sql.begin(async (tx: DbClientInstance['rawClient']) => {
    for (const [groupId, groupFixes] of byGroup) {
      const sourceVersion = groupFixes[0]!.version;
      const nextVersion = sourceVersion + 1;

      const latest = await tx`
        select version, status from question_group_versions
        where group_id = ${groupId} order by version desc limit 1 for update
      `;
      if (latest[0]?.version !== sourceVersion || latest[0]?.status !== 'approved') {
        throw new Error('Group version changed after preflight: ' + groupId);
      }

      await tx`
        insert into question_group_versions
          (group_id, version, passage, audio_sha256, status, created_at)
        select group_id, ${nextVersion}, passage, audio_sha256, 'approved', now()
        from question_group_versions where group_id = ${groupId} and version = ${sourceVersion}
      `;

      const questions = await tx`
        select id from questions where group_id = ${groupId} and deleted_at is null order by id
      `;
      for (const question of questions) {
        const target = groupFixes.find((item) => item.questionId === question.id);
        const [source] = await tx`
          select stem, explanation from question_versions
          where question_id = ${question.id} and version = ${sourceVersion}
        `;
        if (!source) throw new Error('Source question version missing: ' + question.id);

        const stem =
          target?.fix.starSlot !== undefined ? moveStar(source.stem, target.fix.starSlot) : source.stem;
        let questionExplanation = source.explanation;
        if (target) {
          const rebuilt = buildExplanation(
            target.explanationContent,
            target.fix,
            target.options,
            nextVersion,
          );
          questionExplanation = { locale: 'vi', blocks: rebuilt.blocks };
        }

        await tx`
          insert into question_versions (question_id, version, stem, explanation, status, created_at)
          values (
            ${question.id}, ${nextVersion}, ${JSON.stringify(stem)}::jsonb,
            ${questionExplanation ? JSON.stringify(questionExplanation) : null}::jsonb,
            'approved', now()
          )
        `;
        await tx`
          insert into answer_options (question_id, question_version, order_index, content)
          select question_id, ${nextVersion}, order_index, content from answer_options
          where question_id = ${question.id} and question_version = ${sourceVersion}
        `;
        if (target) {
          await tx`
            insert into correct_answers
              (question_id, question_version, correct_option, explanation_notes)
            select question_id, ${nextVersion}, ${target.fix.newKey}, explanation_notes
            from correct_answers
            where question_id = ${question.id} and question_version = ${sourceVersion}
          `;
        } else {
          await tx`
            insert into correct_answers
              (question_id, question_version, correct_option, explanation_notes)
            select question_id, ${nextVersion}, correct_option, explanation_notes
            from correct_answers
            where question_id = ${question.id} and question_version = ${sourceVersion}
          `;
        }

        const explanationRows = await tx`
          select distinct on (locale) content, locale, author_id, ai_generated
          from explanation_versions where question_id = ${question.id}
          order by locale, version desc
        `;
        for (const explanation of explanationRows) {
          const rewrite = target && explanation.locale === 'vi';
          const content = rewrite
            ? buildExplanation(target.explanationContent, target.fix, target.options, nextVersion)
            : { ...asRecord(explanation.content), contentVersion: nextVersion };
          await tx`
            insert into explanation_versions
              (id, question_id, version, content, locale, author_id, ai_generated, status, created_at)
            values (
              ${generateUuidV7()}, ${question.id}, ${nextVersion}, ${JSON.stringify(content)}::jsonb,
              ${explanation.locale}, ${rewrite ? editor.id : explanation.author_id},
              ${rewrite ? false : explanation.ai_generated}, 'approved', now()
            )
          `;
        }
      }

      await tx`
        insert into content_reviews
          (id, target_type, target_id, target_version, reviewer_id, last_editor_id, status, comments, reviewed_at)
        values (
          ${generateUuidV7()}, 'group_version', ${groupId}, ${nextVersion}, ${reviewer.id}, ${editor.id},
          'approved', ${'Owner-authorized N1 grammar star/key correction: ' + groupFixes.map((x) => fixId(x.fix)).join(', ')}, now()
        )
      `;
      await tx`
        insert into operator_actions (id, operator_id, action, target_resource, details, timestamp)
        values (
          ${generateUuidV7()}, ${admin.id}, 'content.n1_grammar_star_key.fix',
          ${'question_group:' + groupId},
          ${JSON.stringify({
            source: CORRECTION_ID,
            version: nextVersion,
            fixes: groupFixes.map((item) => ({
              examSlug: item.fix.examSlug,
              questionNumber: item.fix.questionNumber,
              oldKey: item.currentKey,
              newKey: item.fix.newKey,
              starSlot: item.fix.starSlot ?? null,
            })),
          })}::jsonb, now()
        )
      `;
      groupsVersioned += 1;
    }
  });
  return groupsVersioned;
}

export async function runGrammarFix(argv = process.argv.slice(2)): Promise<void> {
  const apply = argv.includes('--apply');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    const dbClient = app.get<DbClientInstance>(DB_CLIENT);
    const examService = app.get(ExamService);
    let resolved = await resolveFixes(dbClient.rawClient);

    Logger.log(
      JSON.stringify({
        mode: apply ? 'apply' : 'dry-run',
        fixes: resolved.length,
        pending: resolved.filter((x) => x.state === 'pending').length,
        affectedExams: Array.from(new Set(resolved.map((x) => x.fix.examSlug))),
      }),
      'N1GrammarFix',
    );
    if (!apply) return;

    const backupPath = await requireBackup();
    const groupsVersioned = await applyFixes(dbClient.rawClient, resolved);

    const [admin] = await dbClient.rawClient`
      select id from users where role = 'admin' and blocked_at is null
    `;
    if (!admin) throw new Error('Active admin user is required');
    const pendingExamIds = new Set(
      resolved.filter((x) => x.state === 'pending').map((x) => x.examId),
    );
    for (const examId of pendingExamIds) {
      await examService.publishExam(examId, admin.id);
    }

    resolved = await resolveFixes(dbClient.rawClient);
    for (const item of resolved) {
      if (item.state !== 'applied') throw new Error(`${fixId(item.fix)}: verification failed`);
    }
    Logger.log(
      JSON.stringify({
        applied: true,
        groupsVersioned,
        examsRepublished: pendingExamIds.size,
        fixesVerified: resolved.length,
        backupPath,
      }),
      'N1GrammarFix',
    );
  } finally {
    await app.close();
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entryPoint === import.meta.url) {
  runGrammarFix().catch((error: unknown) => {
    Logger.error(error instanceof Error ? error.message : String(error), undefined, 'N1GrammarFix');
    process.exitCode = 1;
  });
}
