import postgres from 'postgres';
import { getAnalyticsDbUrl } from './_db';

/** What the published exams actually test: words, kanji and grammar points, counted from the exam content. */
export interface ContentItem {
  term: string;
  /** Questions that test it. */
  count: number;
  /** Distinct exams that test it. */
  exams: number;
  /** Questions per exam year. */
  years: Record<string, number>;
  /** Lowest level whose exams already test it ("new at this level" when equal to the level). */
  firstLevel: string;
  meaning?: string;
  hanViet?: string;
  /** Real question that tests it. */
  example?: { stem: string; correct?: string };
  why?: string;
}

export interface LevelContent {
  examsByYear: Record<string, number>;
  vocab: ContentItem[];
  kanji: ContentItem[];
  grammar: ContentItem[];
}

export interface BankContent {
  generatedAt: string;
  levels: Record<string, LevelContent>;
}

const LEVEL_ORDER = ['N5', 'N4', 'N3', 'N2', 'N1'];
const TOP_N = 60;
const CACHE_TTL_MS = 30 * 60 * 1000;
let cache: { at: number; body: BankContent } | null = null;

type Node = unknown;

export function plainText(node: Node): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(plainText).join('');
  const n = node as { text?: string; children?: Node };
  if (n.text) return n.text;
  if (n.children) return plainText(n.children);
  return '';
}

/** Stem text with the blank shown as a full-width blank, without doubling parentheses already in the text. */
function stemWithBlank(node: Node): string {
  return stemWithBlankRaw(node).replace(/（\s*（\u3000）\s*）/g, '（　）');
}

function stemWithBlankRaw(node: Node): string {
  if (!node) return '';
  if (Array.isArray(node)) return node.map(stemWithBlankRaw).join('');
  const n = node as { t?: string; text?: string; children?: Node };
  if (n.t === 'blank') return '（　）';
  if (n.text) return n.text;
  if (n.children) return stemWithBlankRaw(n.children);
  return '';
}

function underlineText(node: Node): string | null {
  if (!node) return null;
  if (Array.isArray(node)) {
    for (const x of node) {
      const u = underlineText(x);
      if (u) return u;
    }
    return null;
  }
  const n = node as { t?: string; children?: Node };
  if (n.t === 'underline' && n.children) return plainText(n.children);
  if (n.children) return underlineText(n.children);
  return null;
}

export function explanationText(exp: unknown): string {
  if (!exp) return '';
  if (typeof exp === 'string') return exp;
  const blocks = (exp as { blocks?: Array<{ content?: Array<{ text?: string }> }> }).blocks;
  if (Array.isArray(blocks)) {
    return blocks
      .map((b) => (Array.isArray(b.content) ? b.content.map((c) => c.text || '').join('') : ''))
      .join(' ');
  }
  return '';
}

/** Grammar point named by the explanation ("Mẫu câu 「N にとって」", "Trợ từ 「で」", ...). */
export function extractGrammarPattern(explanation: string): string | null {
  const beforeAnalysis = explanation.split('Phân tích')[0] ?? explanation;
  const afterAnswer = beforeAnalysis.split('Đáp án đúng:')[1] ?? beforeAnalysis;
  const m = afterAnswer.match(/(Mẫu câu|Cấu trúc|Kính ngữ|Trợ từ)?\s*「([^」]{1,24})」/);
  if (!m || !m[2]) return null;
  const quoted = m[2].trim();
  return m[1] === 'Trợ từ' ? `Trợ từ 「${quoted}」` : quoted;
}

/** Same grammar point written differently ("V-る + たびに", "～たびに") counts once. */
export function normalizePattern(pattern: string): string {
  return pattern
    .replace(/^[VNAaいな][^\s+＋]*\s*[+＋]\s*/, '')
    .replace(/^[VN]\s+/, '')
    .replace(/^[～〜~]+/, '')
    .replace(/\s+/g, '')
    .trim();
}

/** Sentence that explains the grammar point, taken from the explanation after the quoted pattern. */
export function patternWhy(explanation: string): string | undefined {
  const afterAnswer = (explanation.split('Phân tích')[0] ?? explanation).split('Đáp án đúng:')[1];
  if (!afterAnswer) return undefined;
  const m = afterAnswer.match(/」([^•]*)/);
  const sentence = (m ? (m[1] ?? '') : (afterAnswer.split('•')[0] ?? '')).replace(/^[）)\s]+/, '').trim();
  return sentence ? sentence.slice(0, 170) : undefined;
}

const KANJI = /[一-鿿]/g;

interface Row {
  level: string;
  year: number | null;
  exam_id: string;
  skill: string;
  mondai_type: string | null;
  stem: unknown;
  explanation: unknown;
  correct_content: unknown;
}

interface Acc {
  count: number;
  exams: Set<string>;
  years: Record<string, number>;
  levels: Set<string>;
  example?: { stem: string; correct?: string };
  why?: string;
}

function bump(map: Map<string, Acc>, term: string, row: Row, example?: { stem: string; correct?: string }, why?: string) {
  const acc = map.get(term) ?? { count: 0, exams: new Set<string>(), years: {}, levels: new Set<string>() };
  acc.count += 1;
  acc.exams.add(row.exam_id);
  const y = String(row.year ?? '');
  if (y) acc.years[y] = (acc.years[y] || 0) + 1;
  acc.levels.add(row.level);
  if (!acc.example && example) acc.example = example;
  if (!acc.why && why) acc.why = why;
  map.set(term, acc);
}

export async function loadBankContent(): Promise<BankContent> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.body;

  const sql = postgres(getAnalyticsDbUrl(), { max: 2, idle_timeout: 10 });
  try {
    const rows = (await sql`
      SELECT e.level, e.year, e.id AS exam_id, q.skill, q.mondai_type, qv.stem, qv.explanation, co.content AS correct_content
      FROM exam_items ei
      JOIN exams e ON e.id = ei.exam_id AND e.deleted_at IS NULL AND e.published_version IS NOT NULL
      JOIN questions q ON q.id = ei.question_id AND q.deleted_at IS NULL
      LEFT JOIN LATERAL (
        SELECT stem, explanation FROM question_versions WHERE question_id = q.id ORDER BY version DESC LIMIT 1
      ) qv ON true
      LEFT JOIN LATERAL (
        SELECT ao.content FROM correct_answers ca
        JOIN answer_options ao ON ao.question_id = ca.question_id AND ao.question_version = ca.question_version
          AND ao.order_index = ca.correct_option
        WHERE ca.question_id = q.id ORDER BY ca.question_version DESC LIMIT 1
      ) co ON true`) as unknown as Row[];

    const examYears = (await sql`
      SELECT level, year, count(*)::int AS n FROM exams
      WHERE deleted_at IS NULL AND published_version IS NOT NULL GROUP BY level, year`) as unknown as Array<{
      level: string;
      year: number;
      n: number;
    }>;

    const vocab: Record<string, Map<string, Acc>> = {};
    const kanji: Record<string, Map<string, Acc>> = {};
    const grammar: Record<string, Map<string, Acc>> = {};
    for (const l of LEVEL_ORDER) {
      vocab[l] = new Map();
      kanji[l] = new Map();
      grammar[l] = new Map();
    }

    for (const r of rows) {
      const lvl = r.level;
      if (!vocab[lvl]) continue;
      const mt = r.mondai_type ?? '';

      if (r.skill === 'grammar') {
        const exp = explanationText(r.explanation);
        const raw = extractGrammarPattern(exp);
        const term = raw ? normalizePattern(raw) : '';
        if (term) {
          bump(
            grammar[lvl]!,
            term,
            r,
            { stem: stemWithBlank(r.stem).slice(0, 120), correct: plainText(r.correct_content) || undefined },
            patternWhy(exp),
          );
        }
      } else if (r.skill === 'vocabulary' || r.skill === 'kanji') {
        // Only the part the question tests: underlined word, or the correct option
        let target: string | null = null;
        if (mt === 'kanji_reading' || mt === 'paraphrase') target = underlineText(r.stem);
        else if (mt === 'orthography' || mt === 'contextual' || mt === 'word_formation') target = plainText(r.correct_content);
        else if (mt === 'usage') target = plainText(r.stem);
        target = target ? target.trim() : null;
        if (target) {
          const example = { stem: stemWithBlank(r.stem).slice(0, 120) };
          bump(vocab[lvl]!, target, r, example);
          for (const ch of target.match(KANJI) ?? []) bump(kanji[lvl]!, ch, r, example);
        }
      }
    }

    const firstLevelOf = (term: string, pick: Record<string, Map<string, Acc>>): string => {
      for (const l of LEVEL_ORDER) if (pick[l]?.has(term)) return l;
      return '';
    };

    const rank = (map: Map<string, Acc>, pick: Record<string, Map<string, Acc>>): ContentItem[] =>
      Array.from(map.entries())
        .map(([term, a]) => ({
          term,
          count: a.count,
          exams: a.exams.size,
          years: a.years,
          firstLevel: firstLevelOf(term, pick),
          example: a.example,
          why: a.why,
        }))
        .sort((x, y) => y.exams - x.exams || y.count - x.count || x.term.localeCompare(y.term))
        .slice(0, TOP_N);

    const levels: Record<string, LevelContent> = {};
    for (const l of LEVEL_ORDER) {
      const examsByYear: Record<string, number> = {};
      for (const e of examYears) if (e.level === l) examsByYear[String(e.year)] = (examsByYear[String(e.year)] || 0) + e.n;
      levels[l] = {
        examsByYear,
        vocab: rank(vocab[l]!, vocab),
        kanji: rank(kanji[l]!, kanji),
        grammar: rank(grammar[l]!, grammar),
      };
    }

    // Vietnamese meaning and Sino-Vietnamese reading from the lexicon, where the term is a dictionary entry
    const terms = new Set<string>();
    for (const l of LEVEL_ORDER) {
      for (const it of [...levels[l]!.vocab, ...levels[l]!.kanji]) terms.add(it.term);
    }
    const termList = Array.from(terms);
    if (termList.length > 0) {
      const entries = (await sql`
        SELECT id, term, han_viet FROM lexical_entries WHERE term IN ${sql(termList)}`) as unknown as Array<{
        id: string;
        term: string;
        han_viet: string | null;
      }>;
      const byTerm = new Map<string, { id: string; hanViet: string | null }>();
      for (const e of entries) if (!byTerm.has(e.term)) byTerm.set(e.term, { id: e.id, hanViet: e.han_viet });
      const ids = Array.from(byTerm.values()).map((v) => v.id);
      const meaningById = new Map<string, string>();
      if (ids.length > 0) {
        const ms = (await sql`
          SELECT entry_id, meaning FROM entry_meanings
          WHERE entry_id IN ${sql(ids)} AND locale = 'vi'
          ORDER BY entry_id, sense_index, gloss_order`) as unknown as Array<{ entry_id: string; meaning: string }>;
        for (const m of ms) if (!meaningById.has(m.entry_id)) meaningById.set(m.entry_id, m.meaning);
      }
      for (const l of LEVEL_ORDER) {
        for (const it of [...levels[l]!.vocab, ...levels[l]!.kanji]) {
          const e = byTerm.get(it.term);
          if (!e) continue;
          it.hanViet = e.hanViet ?? undefined;
          it.meaning = meaningById.get(e.id);
        }
      }
    }

    const body: BankContent = { generatedAt: new Date().toISOString(), levels };
    cache = { at: Date.now(), body };
    return body;
  } finally {
    await sql.end();
  }
}
