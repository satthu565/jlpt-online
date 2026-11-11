// Offline check of the "dạng bẫy" rules (section 09 of /thong-ke).
// Classifies EVERY wrong option of every published question and writes counts + stratified samples
// for a human to read. Keep the classify() rules in sync with classifyTrap() in
// apps/web/app/internal-api/analytics/mistakes/route.ts.
//
//   DATABASE_URL=... node tools/analytics/eval-trap-rules.cjs [output.json]
const fs = require("fs");
const postgres = require(require.resolve("postgres", { paths: [process.cwd() + "/apps/web/"] }));
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

function text(n) { if (!n) return ""; if (typeof n === "string") return n; if (Array.isArray(n)) return n.map(text).join(""); if (n.text) return n.text; if (n.children) return text(n.children); return ""; }
function stemBlank(n) { if (!n) return ""; if (Array.isArray(n)) return n.map(stemBlank).join(""); if (n.t === "blank") return "（　）"; if (n.text) return n.text; if (n.children) return stemBlank(n.children); return ""; }
function expText(e) { if (!e) return ""; if (typeof e === "string") return e; if (e.blocks) return e.blocks.map(b => Array.isArray(b.content) ? b.content.map(c => c.text || "").join("") : "").join(" "); return ""; }

const NEGATION = /なかった|ませんでした|ません|ではない|じゃない|ずに|わけがない|とは限らない|(?<![少危汚]|きた|つまら|くだら)ない/;
function bigrams(t) { const s = new Set(); for (let i = 0; i < t.length - 1; i++) s.add(t.slice(i, i + 2)); return s; }
function overlap(a, b) { const x = bigrams(a), y = bigrams(b); if (!x.size || !y.size) return 0; let n = 0; x.forEach(v => { if (y.has(v)) n++; }); return n / Math.min(x.size, y.size); }
const PARTICLES = new Set(["は","が","を","に","で","と","も","の","へ","や","か","から","まで","より","ね","よ","ので","のに","けど"]);
const HON = /いらっしゃ|おっしゃ|なさ[いるっ]|くださ|ご覧|召し上が|いただ(?:き|く|け(?!あ)|こ)|申し|申す|参り|参る|伺|拝見|致し|存じ|[お御ご][一-龥]{1,3}(?:になり|になる|ください|します|する|いたし)/;
const PLACEHOLDER = /^(?:選択肢|絵)\s*[0-9０-９]+$|^[1-4１-４]$/;
function swap(a, b) { const n = t => t.replace(/[\s、。,.　]/g, ""); const x = n(a), y = n(b); if (x.length < 4 || x === y) return false; return [...x].sort().join("") === [...y].sort().join(""); }
function lev(a, b) { const x = [...a], y = [...b]; const d = Array.from({ length: x.length + 1 }, (_, i) => [i, ...Array(y.length).fill(0)]); for (let j = 1; j <= y.length; j++) d[0][j] = j; for (let i = 1; i <= x.length; i++) for (let j = 1; j <= y.length; j++) d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (x[i-1] === y[j-1] ? 0 : 1)); return d[x.length][y.length]; }
const stripNeg = t => t.replace(/なかった|ませんでした|ません|ない|ず|ぬ/g, "");
function classify(skill, mondai, stem, c, k) {
  c = c.trim(); k = k.trim();
  if (!c || !k || PLACEHOLDER.test(c) || PLACEHOLDER.test(k)) return null;
  if (skill === "kanji") {
    const dist = lev(c, k);
    if (mondai === "orthography") return dist <= 1 ? "kanjiLook" : "kanji";
    return dist <= 1 && Math.min([...c].length, [...k].length) >= 3 ? "kanjiSound" : "kanji";
  }
  if (swap(c, k)) return "swap";
  if (skill === "listening") return mondai === "quick_response" || mondai === "utterance" ? "reply" : "listenContent";
  if ((skill === "reading" || skill === "grammar") && [...c].length >= 8 && [...k].length >= 8 && NEGATION.test(c) !== NEGATION.test(k) && overlap(stripNeg(c), stripNeg(k)) >= 0.85) return "neg";
  if (skill === "vocabulary") return mondai === "usage" ? "vocabUsage" : mondai === "word_formation" ? "wordFormation" : mondai === "paraphrase" ? "vocabMeaning" : "vocabContext";
  if (skill === "grammar") {
    if (PARTICLES.has(c) && PARTICLES.has(k)) return "particle";
    if (HON.test(c) || HON.test(k)) return "keigo";
    if (mondai === "sentence_composition") return "compose";
    return "grammar";
  }
  if (skill === "reading") return overlap(c, k) >= 0.4 ? "readingClose" : "reading";
  return null;
}

(async () => {
  const qs = await sql`
    SELECT q.id, e.level, q.skill, q.mondai_type, qv.stem, qv.explanation
    FROM exam_items ei
    JOIN exams e ON e.id=ei.exam_id AND e.deleted_at IS NULL AND e.published_version IS NOT NULL
    JOIN questions q ON q.id=ei.question_id AND q.deleted_at IS NULL
    LEFT JOIN LATERAL (SELECT stem, explanation FROM question_versions WHERE question_id=q.id ORDER BY version DESC LIMIT 1) qv ON true`;
  const opts = await sql`
    SELECT ao.question_id, ao.order_index, ao.content, ca.correct_option
    FROM answer_options ao
    JOIN correct_answers ca ON ca.question_id=ao.question_id AND ca.question_version=ao.question_version
    JOIN (SELECT question_id, max(question_version) v FROM answer_options GROUP BY question_id) m ON m.question_id=ao.question_id AND m.v=ao.question_version`;
  const byQ = new Map();
  for (const o of opts) { const a = byQ.get(o.question_id) || { correct: o.correct_option, list: [] }; a.list.push({ i: o.order_index, t: text(o.content) }); byQ.set(o.question_id, a); }
  const counts = {}; const samples = {}; const dedupe = new Set();
  let total = 0;
  for (const q of qs) {
    const o = byQ.get(q.id); if (!o) continue;
    const stem = stemBlank(q.stem);
    const correct = o.list.find(x => x.i === o.correct)?.t ?? "";
    for (const w of o.list) {
      if (w.i === o.correct) continue;
      total++;
      const cls = classify(q.skill, q.mondai_type || "", stem, w.t, correct) || "NONE";
      const key = `${cls}`;
      (counts[key] ||= {}); counts[key][q.skill + "/" + (q.mondai_type || "")] = (counts[key][q.skill + "/" + (q.mondai_type || "")] || 0) + 1;
      const dk = q.id + "|" + w.i; if (dedupe.has(dk)) continue; dedupe.add(dk);
      (samples[key] ||= []).push({ level: q.level, skill: q.skill, mondai: q.mondai_type, stem: stem.slice(0, 80), chosen: w.t.slice(0, 50), correct: correct.slice(0, 50) });
    }
  }
  const summary = {}; for (const k of Object.keys(counts)) summary[k] = Object.values(counts[k]).reduce((a, b) => a + b, 0);
  console.log("TOTAL wrong options:", total); console.log(JSON.stringify(summary));
  // deterministic stratified sample: every n-th
  const out = {};
  for (const k of Object.keys(samples)) { const arr = samples[k]; const step = Math.max(1, Math.floor(arr.length / 10)); out[k] = arr.filter((_, i) => i % step === 0).slice(0, 10); }
  fs.writeFileSync(process.argv[2] || "trap-rules-samples.json", JSON.stringify({ summary, byMondai: counts, out }, null, 1));
  await sql.end();
})().catch(e => { console.log("ERR", e.message); process.exit(1); });
