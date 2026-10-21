import { describe, it, expect } from 'vitest';
import { parseJmdict, parseKanjidic, datasetDate } from './parse.mjs';

const JMDICT = `<?xml version="1.0"?>
<!-- JMdict created: 2026-10-01 -->
<JMdict>
<entry><ent_seq>1</ent_seq>
<k_ele><keb>予約</keb><ke_pri>news1</ke_pri></k_ele>
<r_ele><reb>よやく</reb><re_pri>news1</re_pri></r_ele>
<sense><pos>&n;</pos><pos>&vs;</pos><gloss>reservation</gloss><gloss>booking</gloss></sense>
<sense><gloss>appointment &amp; promise</gloss></sense>
</entry>
<entry><ent_seq>2</ent_seq>
<r_ele><reb>まれなことば</reb></r_ele>
<sense><pos>&n;</pos><gloss>rare word</gloss></sense>
</entry>
</JMdict>`;

const KANJIDIC = `<kanjidic2><header><date_of_creation>2026-10-02</date_of_creation></header>
<character><literal>予</literal><misc><grade>3</grade><stroke_count>4</stroke_count><jlpt>3</jlpt></misc>
<reading_meaning><rmgroup><reading r_type="pinyin">yu</reading><reading r_type="ja_on">ヨ</reading><reading r_type="ja_kun">あらかじ.め</reading>
<meaning>in advance</meaning><meaning m_lang="fr">d'avance</meaning></rmgroup></reading_meaning></character>
<character><literal>龘</literal><misc><stroke_count>48</stroke_count></misc></character>
</kanjidic2>`;

describe('EDRDG parsers', () => {
  it('keeps common JMdict entries with readings, POS and meanings', () => {
    const entries = [...parseJmdict(JMDICT)];
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      term: '予約',
      readings: ['よやく'],
      pos: ['n', 'vs'],
      meanings: ['reservation; booking', 'appointment & promise'],
      senses: [
        { index: 0, pos: 'n,vs', meanings: ['reservation', 'booking'], gloss: 'reservation; booking' },
        { index: 1, pos: '', meanings: ['appointment & promise'], gloss: 'appointment & promise' },
      ],
      common: true,
    });
  });

  it('includes uncommon entries with commonOnly=false and uses the reading as term when there is no kanji', () => {
    const entries = [...parseJmdict(JMDICT, { commonOnly: false })];
    expect(entries.map((e) => e.term)).toEqual(['予約', 'まれなことば']);
  });

  it('parses jouyou/JLPT kanji with on/kun readings and English meanings only', () => {
    const kanji = [...parseKanjidic(KANJIDIC)];
    expect(kanji).toEqual([
      { kanji: '予', level: 'N4', strokeCount: 4, onyomi: ['ヨ'], kunyomi: ['あらかじ.め'], meanings: ['in advance'] },
    ]);
  });

  it('reads dataset dates from both file headers', () => {
    expect(datasetDate(JMDICT)).toBe('2026-10-01');
    expect(datasetDate(KANJIDIC)).toBe('2026-10-02');
  });
});
