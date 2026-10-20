// Streaming-free parsers for the EDRDG dictionary files (JMdict_e, KANJIDIC2).
// The files are large but flat: each record is one <entry>/<character> block, so a regex pass is enough
// and avoids adding an XML dependency. Entity references (&n;, &v5k;) are kept as their names.

/** JMdict priority tags that EDRDG documents as marking "common" words. */
export const COMMON_PRIORITIES = new Set(['news1', 'ichi1', 'spec1', 'spec2', 'gai1']);

const decode = (s) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const all = (block, tag) => [...block.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1]);

/** Iterates <entry> records of JMdict as { term, readings, pos, meanings, common }. */
export function* parseJmdict(xml, { commonOnly = true } = {}) {
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const block = m[1];
    const kanjiEls = all(block, 'k_ele');
    const readingEls = all(block, 'r_ele');
    const priorities = [...block.matchAll(/<(?:ke|re)_pri>([^<]+)<\/(?:ke|re)_pri>/g)].map((p) => p[1]);
    const common = priorities.some((p) => COMMON_PRIORITIES.has(p));
    if (commonOnly && !common) continue;
    const kebs = kanjiEls.flatMap((k) => all(k, 'keb')).map(decode);
    const rebs = readingEls.flatMap((r) => all(r, 'reb')).map(decode);
    if (rebs.length === 0) continue;
    const senses = all(block, 'sense');
    const pos = [...new Set(senses.flatMap((s) => [...s.matchAll(/<pos>&([\w-]+);<\/pos>/g)].map((p) => p[1])))];
    const meanings = senses
      .map((s) => all(s, 'gloss').map(decode).join('; '))
      .filter(Boolean);
    if (meanings.length === 0) continue;
    yield { term: kebs[0] ?? rebs[0], readings: rebs, pos, meanings, common };
  }
}

/** Maps the KANJIDIC2 <jlpt> value (pre-2010 levels 4..1) to the closest current level; old level 2 spans N3 and N2. */
const OLD_JLPT = { 4: 'N5', 3: 'N4', 2: null, 1: 'N1' };

/** Iterates <character> records of KANJIDIC2 with a JLPT level or a school grade (jouyou kanji). */
export function* parseKanjidic(xml) {
  for (const m of xml.matchAll(/<character>([\s\S]*?)<\/character>/g)) {
    const block = m[1];
    const literal = all(block, 'literal')[0];
    if (!literal) continue;
    const jlpt = all(block, 'jlpt')[0];
    const grade = all(block, 'grade')[0];
    if (!jlpt && !grade) continue;
    const readings = [...block.matchAll(/<reading r_type="(ja_on|ja_kun)">([^<]+)<\/reading>/g)];
    yield {
      kanji: literal,
      level: jlpt ? OLD_JLPT[Number(jlpt)] ?? null : null,
      strokeCount: Number(all(block, 'stroke_count')[0] ?? 0) || null,
      onyomi: readings.filter((r) => r[1] === 'ja_on').map((r) => r[2]),
      kunyomi: readings.filter((r) => r[1] === 'ja_kun').map((r) => r[2]),
      // English meanings carry no m_lang attribute.
      meanings: [...block.matchAll(/<meaning>([^<]+)<\/meaning>/g)].map((x) => decode(x[1])),
    };
  }
}

/** Reads the dataset date EDRDG writes in the file header comment ("JMdict created: 2026-10-01"). */
export function datasetDate(xml) {
  // The header sits after the inline DTD, a few hundred KB into the file.
  const head = xml.slice(0, 1_000_000);
  return head.match(/JMdict created:\s*(\d{4}-\d{2}-\d{2})/)?.[1] ?? head.match(/<date_of_creation>([^<]+)</)?.[1] ?? null;
}
