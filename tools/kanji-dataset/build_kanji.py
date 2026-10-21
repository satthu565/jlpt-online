"""Build the standard kanji dataset (data/kanji/kanji_chuan_v1.json).

Merges, field by field (docs: Thi JLPT/thong_tin_du_an/NGUON_DU_LIEU_TUNG_TRUONG.md):
  CDA   owner dump kanji_YYYYMMDD.json (tiengnhatdongian.com)   -- Vietnamese content, levels, examples, images
  KD2   KANJIDIC2 (EDRDG)                                       -- readings, strokes, grade, freq, radical, EN meanings
  KRAD  KRADFILE / RADKFILE (EDRDG)                             -- components, kanji containing a component
  KVG   KanjiVG                                                 -- stroke order, component structure
  JMD   JMdict (EDRDG)                                          -- example words, part of speech, commonness
  JOYO  Jōyō table 2010 (Japanese Wikipedia wikitext)           -- official readings, old forms
  HVD   Thiều Chửu entries saved from hvdic.thivien.net         -- Thiều Chửu text for kanji missing it
  H01   repo Hán Việt tables (tools/import-data/data)           -- fallback Hán Việt per On reading

Usage (standard library only):
  py -3 -I tools/kanji-dataset/build_kanji.py --sources "<Thi JLPT/data/kanji>" --scope <kanji_entries.tsv> \
      --out data/kanji/kanji_chuan_v1.json [--url-map data/kanji/url_anh.tsv] [--only 日明]
"""
import argparse, collections, datetime, gzip, html, json, os, re, struct, sys, unicodedata
import xml.etree.ElementTree as ET

sys.stdout.reconfigure(encoding='utf-8')
VERSION = '1.0.0'
KANJI_RE = re.compile(r'[㐀-䶿一-鿿豈-﫿\U00020000-\U0003134f]')
TONES = '̣̀́̃̉'


# ---------------------------------------------------------------- normalisation helpers

def nfc(s):
    return unicodedata.normalize('NFC', s or '').strip()


def kata(s):
    return ''.join(chr(ord(c) + 0x60) if 'ぁ' <= c <= 'ゖ' else c for c in s)


def hira(s):
    return ''.join(chr(ord(c) - 0x60) if 'ァ' <= c <= 'ヶ' else c for c in s)


_SYL = re.compile(r'(?<![A-Z̀-ͯ])([B-DF-HJ-NP-TV-XZĐ]*)([OU])([AEY])([' + TONES + r'])(?![A-Z̀-ͯ])')
_IY = re.compile(r'(?<![A-ZĐ̀-ͯ])([HKLMT])I([' + TONES + r']?)(?![A-Z̀-ͯ])')


def hv_syllable_style(text):
    """Upper case, NFC, one tone placement (HÒA, THỦY) and Y spelling (LÝ, KỲ, MỸ, HY, TỶ)."""
    s = unicodedata.normalize('NFD', (text or '').upper())
    s = _SYL.sub(lambda m: m.group(0) if m.group(1).endswith('Q') else m.group(1) + m.group(2) + m.group(4) + m.group(3), s)
    s = _IY.sub(lambda m: m.group(1) + 'Y' + m.group(2), s)
    return unicodedata.normalize('NFC', re.sub(r'\s+', ' ', s)).strip()


# Regional/older variants mapped to the common modern reading, per character (decision 2a).
REGIONAL = {'正': {'CHÁNH': 'CHÍNH'}, '政': {'CHÁNH': 'CHÍNH'}, '症': {'CHỨNG': 'CHỨNG'}, '本': {'BỔN': 'BẢN'},
            '時': {'THÌ': 'THỜI'}, '日': {'NHỰT': 'NHẬT'}, '一': {'NHỨT': 'NHẤT'}, '仁': {'NHƠN': 'NHÂN'},
            '人': {'NHƠN': 'NHÂN'}, '真': {'CHƠN': 'CHÂN'}, '生': {'SANH': 'SINH'}, '命': {'MẠNG': 'MỆNH'},
            '平': {'BÌNH': 'BÌNH'}, '聖': {'THÁNH': 'THÁNH'}, '定': {'ĐỊNH': 'ĐỊNH'}}


def regional(ch, syl):
    return REGIONAL.get(ch, {}).get(syl, syl)


def word_hv(word, hv):
    """Normalise a word's Hán Việt: style + per-kanji regional variants when syllables align with kanji."""
    hv = hv_syllable_style(hv)
    if not hv:
        return ''
    syl = hv.split(' ')
    ks = KANJI_RE.findall(word)
    if len(ks) == len(syl):
        syl = [regional(k, s) for k, s in zip(ks, syl)]
    return ' '.join(syl)


def split_list(s, seps=r'[,、，/;]'):
    return [x.strip() for x in re.split(seps, s or '') if x.strip()]


def chars(s):
    return [c for c in dict.fromkeys(KANJI_RE.findall(s or ''))]


def html_to_md(s):
    if not s:
        return ''
    s = re.sub(r'<\s*br\s*/?>', '\n', s, flags=re.I)
    s = re.sub(r'</?(strong|b)(\s[^>]*)?>', '**', s, flags=re.I)
    s = re.sub(r'<li[^>]*>', '\n- ', s, flags=re.I)
    s = re.sub(r'</(p|div|li|ul|ol|h\d)>', '\n', s, flags=re.I)
    s = html.unescape(re.sub(r'<[^>]+>', '', s))
    s = s.replace('****', '')
    s = re.sub(r'[ \t]+', ' ', s)
    lines = [l.strip() for l in s.replace('\r', '').split('\n')]
    out = '\n'.join(l for l in lines if l)
    return nfc(out)


def table_rows(fragment):
    rows = []
    for row in re.findall(r'<tr[^>]*>(.*?)</tr>', fragment or '', re.S):
        cells = [nfc(html.unescape(re.sub(r'<[^>]+>', '', c))) for c in re.findall(r'<td[^>]*>(.*?)</td>', row, re.S)]
        if cells and any(cells):
            rows.append(cells)
    return rows


def sections(fragment, kind):
    """vi_du_am_on / vi_du_am_kun HTML -> {reading: [rows]} in page order."""
    out = collections.OrderedDict()
    parts = re.split(r'<div class="key-word[^"]*">', fragment or '')
    for part in parts[1:]:
        m = re.search(r'key-%s[^>]*>([^<]+)<' % kind, part)
        if not m:
            continue
        out.setdefault(nfc(m.group(1)), []).extend(table_rows(part))
    return out


# ---------------------------------------------------------------- source loaders

def load_cda(path):
    recs = json.load(open(path, encoding='utf-8'))
    return {nfc(r['han_tu']): r for r in recs}


def decode_jis(var_type, value):
    try:
        if var_type == 'ucs':
            return chr(int(value, 16))
        plane, row, cell = (int(x) for x in value.split('-'))
        if var_type == 'jis208':
            return bytes([0xA0 + row, 0xA0 + cell]).decode('euc_jp')
        if var_type == 'jis212':
            return bytes([0x8F, 0xA0 + row, 0xA0 + cell]).decode('euc_jp')
        if var_type == 'jis213':
            b = bytes([0xA0 + row, 0xA0 + cell]) if plane == 1 else bytes([0x8F, 0xA0 + row, 0xA0 + cell])
            return b.decode('euc_jis_2004')
    except Exception:
        return None
    return None


def load_kd2(path):
    out = {}
    with gzip.open(path) as f:
        for _, el in ET.iterparse(f):
            if el.tag != 'character':
                continue
            lit = el.findtext('literal')
            misc = el.find('misc')
            rm = el.find('reading_meaning')
            d = {
                'grade': int(misc.findtext('grade')) if misc is not None and misc.findtext('grade') else None,
                'strokes': [int(x.text) for x in misc.findall('stroke_count')] if misc is not None else [],
                'freq': int(misc.findtext('freq')) if misc is not None and misc.findtext('freq') else None,
                'jlpt': int(misc.findtext('jlpt')) if misc is not None and misc.findtext('jlpt') else None,
                'rad_name': [x.text for x in misc.findall('rad_name')] if misc is not None else [],
                'variants': [(v.get('var_type'), v.text) for v in misc.findall('variant')] if misc is not None else [],
                'radical': None, 'on': [], 'kun': [], 'viet': [], 'nanori': [], 'meaning_en': [],
            }
            for rv in el.findall('radical/rad_value'):
                if rv.get('rad_type') == 'classical':
                    d['radical'] = int(rv.text)
            if rm is not None:
                for g in rm.findall('rmgroup'):
                    for r in g.findall('reading'):
                        t = r.get('r_type')
                        if t == 'ja_on':
                            d['on'].append(r.text)
                        elif t == 'ja_kun':
                            d['kun'].append(r.text)
                        elif t == 'vietnam':
                            d['viet'].append(r.text)
                    d['meaning_en'] += [m.text for m in g.findall('meaning') if m.get('m_lang') is None]
                d['nanori'] = [n.text for n in rm.findall('nanori')]
            out[lit] = d
            el.clear()
    return out


def load_joyo(path):
    """Jōyō table rows: kanji, old form, strokes, grade, readings (on katakana / kun hiragana, '-' okurigana)."""
    out = {}
    for line in open(path, encoding='utf-8'):
        if not re.match(r'\| (\{\{0[^}]*\}\})?\d+ \|\|', line):
            continue
        cols = [c.strip() for c in line.split('||')]
        m = re.search(r'\[\[wikt:([^|\]]+)\|', cols[1]) if len(cols) > 1 else None
        if not m:
            continue
        k = m.group(1)
        old = re.search(r'\[\[wikt:([^|\]]+)\|', cols[2]) if len(cols) > 2 else None
        reads = re.sub(r'<[^>]+>', '', cols[-1])
        on, kun = [], []
        for r in split_list(reads, r'[、,]'):
            r = r.strip('（）() ')
            if not r:
                continue
            (on if re.fullmatch(r'[゠-ヿー]+', r) else kun).append(r.replace('-', '.'))
        out[k] = {'old': old.group(1) if old else None, 'on': on, 'kun': kun}
    return out


def load_krad(dirpath):
    krad, radk = {}, collections.defaultdict(list)
    for name in ('kradfile', 'kradfile2'):
        p = os.path.join(dirpath, name)
        if os.path.exists(p):
            for line in open(p, encoding='euc_jp', errors='replace'):
                if line.startswith('#') or ' : ' not in line:
                    continue
                k, parts = line.rstrip('\n').split(' : ', 1)
                krad[k] = parts.split()
    p = os.path.join(dirpath, 'radkfilex' if os.path.exists(os.path.join(dirpath, 'radkfilex')) else 'radkfile')
    cur = None
    for line in open(p, encoding='euc_jp', errors='replace'):
        if line.startswith('#'):
            continue
        if line.startswith('$'):
            cur = line.split()[1]
            continue
        if cur:
            radk[cur].extend(c for c in line.strip())
    return krad, radk


def load_kvg(path):
    out = {}
    text = gzip.open(path).read().decode('utf-8')
    for m in re.finditer(r'<kanji id="kvg:kanji_([0-9a-f]+)">(.*?)</kanji>', text, re.S):
        ch = chr(int(m.group(1), 16))
        body = m.group(2)
        strokes = [{'stt': i + 1, 'loai': p[0] or '', 'duong': p[1]}
                   for i, p in enumerate(re.findall(r'<path id="[^"]*-s\d+"(?: kvg:type="([^"]*)")? d="([^"]*)"', body))]
        # component tree
        root, stack = None, []
        for tok in re.finditer(r'<g ([^>]*)>|</g>', body):
            if tok.group(0) == '</g>':
                if stack:
                    node = stack.pop()
                    if not stack:
                        root = node
                continue
            attrs = dict(re.findall(r'(kvg:\w+)="([^"]*)"', tok.group(1)))
            node = {'phan': attrs.get('kvg:element') or '', 'vi_tri': attrs.get('kvg:position') or '',
                    'la_bo_thu': 'kvg:radical' in attrs, 'con': []}
            if stack:
                stack[-1]['con'].append(node)
            stack.append(node)
        out[ch] = {'strokes': strokes, 'tree': prune(root) if root else None}
    return out


def prune(node):
    """Drop unnamed grouping levels; keep named components and their positions."""
    kids = []
    for c in node['con']:
        c = prune(c)
        if c['phan']:
            kids.append(c)
        else:
            kids.extend(c['con'])
    node['con'] = kids
    return node


def load_jmdict(path, wanted):
    """kanji -> list of words containing it: {tu, doc, nghia_en, tu_loai, thong_dung, seq}."""
    idx = collections.defaultdict(list)
    with gzip.open(path) as f:
        for _, el in ET.iterparse(f):
            if el.tag != 'entry':
                continue
            seq = el.findtext('ent_seq')
            kebs = [(k.findtext('keb'), [p.text for p in k.findall('ke_pri')]) for k in el.findall('k_ele')]
            rebs = [(r.findtext('reb'), [p.text for p in r.findall('re_pri')]) for r in el.findall('r_ele')]
            senses = el.findall('sense')
            pos = [p.text for p in senses[0].findall('pos')] if senses else []
            gl = [g.text for g in senses[0].findall('gloss')][:3] if senses else []
            for keb, kp in kebs:
                ks = set(KANJI_RE.findall(keb)) & wanted
                if not ks:
                    continue
                common = bool(set(kp) & {'news1', 'ichi1', 'spec1', 'spec2', 'gai1'})
                rd = rebs[0][0] if rebs else ''
                w = {'tu': keb, 'doc': rd, 'nghia_en': '; '.join(gl), 'tu_loai': pos, 'thong_dung': common, 'jmdict_id': seq}
                for k in ks:
                    idx[k].append(w)
            el.clear()
    for k in idx:
        idx[k].sort(key=lambda w: (not w['thong_dung'], len(w['tu'])))
    return idx


def load_hvdic(path):
    out = {}
    if os.path.exists(path):
        for line in open(path, encoding='utf-8'):
            r = json.loads(line)
            out[r['han_tu']] = r
    return out


def load_h01(repo):
    on, prim = collections.defaultdict(dict), {}
    base = os.path.join(repo, 'tools/import-data/data')
    for l in open(os.path.join(base, 'hanviet-onyomi.tsv'), encoding='utf-8'):
        p = l.rstrip('\n').split('\t')
        if len(p) >= 3 and p[1] != '-' and p[2]:
            on[p[0]][p[1]] = p[2]
    for l in open(os.path.join(base, 'hanviet-primary.tsv'), encoding='utf-8'):
        p = l.rstrip('\n').split('\t')
        if len(p) >= 2 and p[1]:
            prim[p[0]] = p[1]
    return on, prim


def image_size(path):
    try:
        with open(path, 'rb') as f:
            head = f.read(26)
            if head[:8] == b'\x89PNG\r\n\x1a\n':
                w, h = struct.unpack('>II', head[16:24])
                return w, h, 'png'
            if head[:2] == b'\xff\xd8':
                f.seek(2)
                while True:
                    m = f.read(4)
                    if len(m) < 4:
                        break
                    marker, ln = m[1], struct.unpack('>H', m[2:4])[0]
                    if marker in (0xC0, 0xC1, 0xC2):
                        _, h, w = struct.unpack('>BHH', f.read(5))
                        return w, h, 'jpeg'
                    f.seek(ln - 2, 1)
    except OSError:
        pass
    return None, None, None


# ---------------------------------------------------------------- field builders

def thieu_chuu_senses(text_lines):
    senses = []
    for i, line in enumerate(text_lines):
        line = nfc(re.sub(r'^[①-⑳㉑-㉟\d]+[.:：\s]*', '', line))
        if not line:
            continue
        tu = []
        for m in re.finditer(r'([a-zà-ỹđ]+(?: [a-zà-ỹđ]+)*)\s*\[?(' + KANJI_RE.pattern + r'{2,})\]?', line):
            words, hz = m.group(1).split(), m.group(2)
            n = len(KANJI_RE.findall(hz))
            if len(words) >= n:
                tu.append({'chu': hz, 'han_viet': hv_syllable_style(' '.join(words[-n:]))})
        senses.append({'stt': len(senses) + 1, 'noi_dung': line, 'tu_ghep': tu})
    return senses


WORD_HV = {}  # (word, reading) and word -> Hán Việt, from every CDA example table


def example(word, reading, hv, meaning, jm_by_word, special=False, nguon='cda'):
    w = re.sub(r'\s+', '', word.lstrip('*'))
    j = jm_by_word.get((w, hira(reading))) or jm_by_word.get((w, None))
    hv = hv or WORD_HV.get((w, hira(nfc(reading)))) or WORD_HV.get(w) or ''
    return {'tu': w, 'doc': hira(nfc(reading)), 'han_viet': word_hv(w, hv) if hv else '', 'nghia_vi': nfc(meaning),
            'nghia_en': j['nghia_en'] if j else '', 'tu_loai': j['tu_loai'] if j else [],
            'thong_dung': j['thong_dung'] if j else False, 'dac_biet': special or word.startswith('*'),
            'jmdict_id': j['jmdict_id'] if j else None, 'am_thanh': None, 'nguon': nguon}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sources', required=True)
    ap.add_argument('--cda', default=None)
    ap.add_argument('--scope', required=True, help='TSV whose first column is the kanji already in kanji_entries (KANJIDIC2 subset)')
    ap.add_argument('--repo', default=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    ap.add_argument('--out', required=True)
    ap.add_argument('--url-map', default=None)
    ap.add_argument('--only', default='')
    ap.add_argument('--generated', default=None, help='folder of written cach_dung/nghia files (default: <out dir>/generated)')
    a = ap.parse_args()
    S = a.sources
    cda_path = a.cda or sorted(p for p in os.listdir(S) if re.fullmatch(r'kanji_\d{8}\.json', p))[-1]
    cda_path = cda_path if os.path.isabs(cda_path) else os.path.join(S, cda_path)
    print('loading sources...', flush=True)
    cda = load_cda(cda_path)
    for rec in cda.values():
        for field, kind in (('vi_du_am_on', 'on'), ('vi_du_am_kun', 'kun')):
            for rows in sections(rec.get(field, ''), kind).values():
                for row in rows:
                    if len(row) >= 3 and row[2]:
                        w = re.sub(r'\s+', '', row[0].lstrip('*'))
                        WORD_HV.setdefault((w, hira(row[1])), row[2])
                        WORD_HV.setdefault(w, row[2])
    kd2 = load_kd2(os.path.join(S, 'sources/edrdg/kanjidic2.xml.gz'))
    joyo = load_joyo(os.path.join(S, 'sources/joyo/joyo_wikipedia_ja.wikitext'))
    krad, radk = load_krad(os.path.join(S, 'sources/edrdg'))
    kvg_file = sorted(f for f in os.listdir(os.path.join(S, 'sources/kanjivg')) if f.endswith('.xml.gz'))[-1]
    kvg = load_kvg(os.path.join(S, 'sources/kanjivg', kvg_file))
    hvd = load_hvdic(os.path.join(S, 'sources/hvdic/thieuchuu.jsonl'))
    h01_on, h01_prim = load_h01(a.repo)
    scope_db = [l.split('\t')[0] for l in open(a.scope, encoding='utf-8') if l.strip()]
    scope = list(dict.fromkeys(list(cda) + scope_db + list(joyo)))
    if a.only:
        scope = [c for c in scope if c in a.only]
    wanted = set(scope)
    jm = load_jmdict(os.path.join(S, 'sources/edrdg/JMdict_e.gz'), wanted)
    jm_by_word = {}
    for lst in jm.values():
        for w in lst:
            jm_by_word.setdefault((w['tu'], w['doc']), w)
            jm_by_word.setdefault((w['tu'], None), w)
    url_map = {}
    if a.url_map and os.path.exists(a.url_map):
        for l in open(a.url_map, encoding='utf-8'):
            p = l.rstrip('\n').split('\t')
            if len(p) >= 2:
                url_map[p[0]] = p[1]
    gen = {}
    gen_dir = a.generated or os.path.join(os.path.dirname(os.path.abspath(a.out)), 'generated')
    if os.path.isdir(gen_dir):
        for fn in sorted(os.listdir(gen_dir)):
            if fn.endswith('.json'):
                gen.update(json.load(open(os.path.join(gen_dir, fn), encoding='utf-8')))
    print('generated entries', len(gen))
    print('scope', len(scope), 'cda', len(cda), 'kd2', len(kd2), 'joyo', len(joyo), 'kvg', len(kvg), flush=True)

    # Final primary Hán Việt per kanji (for radicals, derived example readings).
    def primary_hv(k):
        r = cda.get(k)
        if r and r['han_viet'].strip():
            return regional(k, hv_syllable_style(split_list(r['han_viet'])[0]))
        if k in hvd and hvd[k].get('am_han_viet_hvdic'):
            return hv_syllable_style(split_list(hvd[k]['am_han_viet_hvdic'])[0])
        if kd2.get(k, {}).get('viet'):
            return hv_syllable_style(kd2[k]['viet'][0])
        return hv_syllable_style(h01_prim.get(k, ''))

    level_rank = {'N5': 5, 'N4': 4, 'N3': 3, 'N2': 2, 'N1': 1}
    old_jlpt = {4: 'N5', 3: 'N4', 2: 'N2', 1: 'N1'}
    out_list = []
    now = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat().replace('+00:00', 'Z')
    images_dir = os.path.join(S, 'images')

    for k in scope:
        r = cda.get(k) or {}
        d = kd2.get(k) or {'grade': None, 'strokes': [], 'freq': None, 'jlpt': None, 'rad_name': [], 'variants': [], 'radical': None,
                           'on': [], 'kun': [], 'viet': [], 'nanori': [], 'meaning_en': []}
        jy = joyo.get(k)
        src = {}

        def mark(field, nguon, trang_thai):
            src[field] = {'nguon': nguon, 'trang_thai': trang_thai}

        # 2 bien_the
        bt = []
        if jy and jy['old'] and jy['old'] != k:
            bt.append({'chu': jy['old'], 'loai': 'cuu_tu_the'})
        for vt, val in d['variants']:
            c = decode_jis(vt, val)
            if c and c != k and c not in [x['chu'] for x in bt]:
                bt.append({'chu': c, 'loai': 'di_the'})
        for a1, b1 in (('剥', '剝'), ('叱', '𠮟'), ('填', '塡'), ('頬', '頰'), ('遡', '遡')):
            if k in (a1, b1):
                o = b1 if k == a1 else a1
                if o != k and o not in [x['chu'] for x in bt]:
                    bt.append({'chu': o, 'loai': 'dung_thay'})
        mark('bien_the', 'kd2+joyo', 'bo_sung')

        # 3 jlpt_joyo
        jj = {'joyo': jy is not None, 'lop': d['grade'] if d['grade'] in (1, 2, 3, 4, 5, 6, 8) else None,
              'jinmeiyo': d['grade'] in (9, 10)}
        mark('jlpt_joyo', 'joyo+kd2', 'bo_sung')

        # 4 cap_do
        lv = re.findall(r'N[1-5]', r.get('cap_do', ''))
        lv = list(dict.fromkeys(lv))
        if lv:
            cap = {'chinh': max(lv, key=lambda x: level_rank[x]), 'tat_ca': lv, 'cap_cu': d['jlpt']}
            mark('cap_do', 'cda', 'chuan_hoa')
        elif d['jlpt']:
            cap = {'chinh': old_jlpt[d['jlpt']], 'tat_ca': [old_jlpt[d['jlpt']]], 'cap_cu': d['jlpt']}
            mark('cap_do', 'kd2', 'bo_sung')
        else:
            cap = {'chinh': None, 'tat_ca': [], 'cap_cu': None}
            mark('cap_do', '', 'thieu')

        # 6/7 strokes
        kvg_strokes = kvg.get(k, {}).get('strokes', [])
        so_net = d['strokes'][0] if d['strokes'] else (r.get('so_net') if isinstance(r.get('so_net'), int) else (len(kvg_strokes) or None))
        mark('so_net', 'kd2' if d['strokes'] else 'cda', 'bo_sung' if d['strokes'] else 'goc')

        # 8/9/10 readings: KD2 merged with CDA
        jy_on = set(jy['on']) if jy else set()
        jy_kun = {x.replace('.', '') for x in jy['kun']} if jy else set()
        on = collections.OrderedDict()
        for x in d['on']:
            on.setdefault(x, set()).add('kd2')
        for x in split_list(r.get('am_on', '')):
            on.setdefault(kata(x), set()).add('cda')
        am_on = [{'am': x, 'joyo': x in jy_on, 'nguon': 'ca_hai' if len(s) == 2 else s.pop()} for x, s in on.items()]
        kun = collections.OrderedDict()
        keymap = {}
        for x in d['kun']:
            keymap[x.replace('.', '')] = x
            kun.setdefault(x, set()).add('kd2')
        for x in split_list(r.get('am_kun', '')):
            x = x.replace('~', '-').replace('〜', '-')
            key = x.replace('.', '')
            kun.setdefault(keymap.get(key, x), set()).add('cda')
        am_kun = [{'am': x, 'joyo': x.replace('.', '').replace('-', '') in {j.replace('-', '') for j in jy_kun},
                   'nguon': 'ca_hai' if len(s) == 2 else next(iter(s))} for x, s in kun.items()]
        nanori = list(dict.fromkeys(d['nanori'] + split_list(r.get('nanori', ''))))
        mark('am_on', 'kd2+cda', 'chuan_hoa')
        mark('am_kun', 'kd2+cda', 'chuan_hoa')
        mark('nanori', 'kd2+cda', 'chuan_hoa')

        # 11 han_viet
        hv_list = []
        if r.get('han_viet', '').strip():
            hv_list = [regional(k, hv_syllable_style(x)) for x in split_list(r['han_viet'])]
            mark('han_viet', 'cda', 'chuan_hoa')
        elif k in hvd and hvd[k].get('am_han_viet_hvdic'):
            hv_list = [hv_syllable_style(x) for x in split_list(hvd[k]['am_han_viet_hvdic'])]
            mark('han_viet', 'hvdic_thieu_chuu', 'bo_sung')
        elif d['viet']:
            hv_list = [hv_syllable_style(x) for x in d['viet']]
            mark('han_viet', 'kd2', 'bo_sung')
        else:
            mark('han_viet', '', 'thieu')
        hv_list = list(dict.fromkeys(hv_list))
        on_sec = sections(r.get('vi_du_am_on', ''), 'on')
        theo_on = {}
        for on_key, rows in on_sec.items():
            votes = collections.Counter()
            for row in rows:
                if len(row) >= 3:
                    w = re.sub(r'\s+', '', row[0].lstrip('*'))
                    ks, syl = KANJI_RE.findall(w), hv_syllable_style(row[2]).split()
                    if len(ks) == len(syl) and k in ks:
                        votes[regional(k, syl[ks.index(k)])] += 1
            if votes:
                theo_on[kata(on_key)] = votes.most_common(1)[0][0]
        for x in am_on:
            if x['am'] not in theo_on and x['am'] in h01_on.get(k, {}):
                theo_on[x['am']] = hv_syllable_style(h01_on[k][x['am']])
        tc_hv = [hv_syllable_style(x) for x in split_list(hvd.get(k, {}).get('am_han_viet_hvdic', ''))]
        han_viet = {'chinh': hv_list[0] if hv_list else '', 'khac': hv_list[1:], 'theo_am_on': theo_on, 'thieu_chuu': tc_hv}

        # 13/14 meanings
        nghia = nfc(r.get('nghia', ''))
        if nghia:
            mark('nghia', 'cda', 'goc')
        elif hvd.get(k, {}).get('thieu_chuu'):
            nghia = nfc(re.sub(r'^[①-⑳\d.\s]+', '', hvd[k]['thieu_chuu'][0])).rstrip('.')
            mark('nghia', 'hvdic_thieu_chuu', 'bo_sung')
        elif gen.get(k, {}).get('nghia'):
            nghia = nfc(gen[k]['nghia'])
            mark('nghia', 'claude', 'can_duyet')
        else:
            mark('nghia', '', 'thieu')
        mark('nghia_en', 'kd2', 'bo_sung')

        # 15/16 explanations (CDA text is Thiều Chửu)
        gn = nfc(r.get('giai_nghia_chi_tiet', '').replace('\r', ''))
        tc_lines = hvd.get(k, {}).get('thieu_chuu') or []
        if gn:
            mark('giai_nghia_chi_tiet', 'cda', 'goc')
        elif tc_lines:
            gn = '\n'.join(nfc(re.sub(r'^[①-⑳]\s*', '', x)) for x in tc_lines)
            mark('giai_nghia_chi_tiet', 'hvdic_thieu_chuu', 'bo_sung')
        else:
            mark('giai_nghia_chi_tiet', '', 'thieu')
        senses = thieu_chuu_senses(tc_lines if tc_lines else gn.split('\n') if gn else [])
        mark('giai_nghia_thieu_chuu', 'hvdic_thieu_chuu' if tc_lines else ('cda' if gn else ''), 'goc' if senses else 'thieu')
        tu_ghep = list({t['chu']: t for s in senses for t in s['tu_ghep']}.values())
        mark('tu_ghep_thieu_chuu', src['giai_nghia_thieu_chuu']['nguon'], 'suy_ra' if tu_ghep else 'thieu')

        # 17 radical
        bo_thu = None
        if d['radical']:
            rc = unicodedata.normalize('NFKC', chr(0x2F00 + d['radical'] - 1))
            bo_thu = {'chu': rc, 'so': d['radical'], 'ten': primary_hv(rc)}
        mark('bo_thu', 'kd2', 'bo_sung' if bo_thu else 'thieu')

        # 18/19/20 composition, structure, strokes
        lines = [l.strip() for l in (r.get('bo_phan_cau_thanh') or '').replace('\r', '').split('\n') if l.strip()]
        if lines and lines[0] == k:
            lines = lines[1:]
        bpct = {'cda': [list(l) for l in lines], 'kradfile': krad.get(k, [])}
        mark('bo_phan_cau_thanh', 'cda+kradfile', 'chuan_hoa')
        cau_truc = kvg.get(k, {}).get('tree')
        mark('cau_truc', 'kanjivg', 'bo_sung' if cau_truc else 'thieu')
        if kvg_strokes:
            ttn = {'so_net': len(kvg_strokes), 'net': kvg_strokes, 'nguon': 'kanjivg'}
            mark('thu_tu_net', 'kanjivg', 'bo_sung')
        else:
            paths = [p for p in re.findall(r'<path ([^>]*)>', r.get('kanji_svg', '')) if 'dasharray' not in p]
            net = [{'stt': i + 1, 'loai': '', 'duong': m.group(1)} for i, p in enumerate(paths) for m in [re.search(r'\bd="([^"]+)"', p)] if m]
            ttn = {'so_net': len(net), 'net': net, 'nguon': 'cda_svg'} if net else None
            mark('thu_tu_net', 'cda_svg' if net else '', 'chuan_hoa' if net else 'thieu')

        # 21-25 related kanji
        dong_am = [c for c in chars(r.get('dong_am', '')) if c != k]
        if dong_am:
            mark('dong_am', 'cda', 'goc')
        elif am_on:
            ons = {x['am'] for x in am_on}
            cand = [c for c in scope if c != k and ons & set(kd2.get(c, {}).get('on', []))]
            cand.sort(key=lambda c: (kd2.get(c, {}).get('freq') or 9999))
            dong_am = cand[:10]
            mark('dong_am', 'suy_ra', 'suy_ra' if dong_am else 'thieu')
        else:
            mark('dong_am', '', 'thieu')
        dong_nghia = [c for c in chars(r.get('dong_nghia', '')) if c != k]
        trai_nghia = [c for c in chars(r.get('trai_nghia', '')) if c != k]
        mark('dong_nghia', 'cda', 'goc' if dong_nghia else 'thieu')
        mark('trai_nghia', 'cda', 'goc' if trai_nghia else 'thieu')
        tuong_tu = [c for c in chars(r.get('tuong_tu', '')) if c != k]
        if tuong_tu:
            mark('tuong_tu', 'cda', 'goc')
        else:
            mine = set(krad.get(k, []))
            cand = []
            for c in scope:
                if c == k or not krad.get(c):
                    continue
                other = set(krad[c])
                if mine and len(mine & other) >= max(1, len(mine) - 1) and abs((kd2.get(c, {}).get('strokes') or [0])[0] - (so_net or 0)) <= 2:
                    cand.append(c)
            cand.sort(key=lambda c: (kd2.get(c, {}).get('freq') or 9999))
            tuong_tu = cand[:10]
            mark('tuong_tu', 'suy_ra_kradfile', 'suy_ra' if tuong_tu else 'thieu')
        contains = [c for c in radk.get(k, []) if c in wanted and c != k]
        contains.sort(key=lambda c: (kd2.get(c, {}).get('freq') or 9999))
        mark('chu_chua_chu_nay', 'radkfile', 'bo_sung' if contains else 'thieu')

        # 26-30 learning aids
        cach_nho = html_to_md(r.get('cach_nho', ''))
        mark('cach_nho', 'cda', 'chuan_hoa' if cach_nho else 'thieu')
        cach_dung = []
        for li in re.findall(r'<li>\s*<p>(.*?)</p>\s*<ul>(.*?)</ul>\s*</li>', r.get('cach_dung', ''), re.S):
            ex = []
            for e in re.findall(r'<li>(.*?)</li>', li[1], re.S):
                t = nfc(html.unescape(re.sub(r'<[^>]+>', '', e)))
                m = re.match(r'(.+?)\s*\(([^)]*)\)\s*:\s*(.*)', t)
                ex.append({'tu': m.group(1), 'doc_romaji': m.group(2), 'nghia': m.group(3)} if m else {'tu': t, 'doc_romaji': '', 'nghia': ''})
            cach_dung.append({'y_nghia': nfc(html.unescape(re.sub(r'<[^>]+>', '', li[0]))).rstrip(':'), 'vi_du': ex})
        if cach_dung:
            mark('cach_dung', 'cda', 'chuan_hoa')
        elif gen.get(k, {}).get('cach_dung'):
            cach_dung = [{'y_nghia': nfc(g['y_nghia']), 'vi_du': [{'tu': e['tu'], 'doc': hira(e['doc']), 'nghia': nfc(e['nghia'])} for e in g['vi_du']]}
                         for g in gen[k]['cach_dung']]
            mark('cach_dung', 'claude', 'can_duyet')
        else:
            mark('cach_dung', '', 'thieu')
        anh = None
        img_rel = r.get('image')
        if img_rel:
            w, h, fmt = image_size(os.path.join(S, img_rel))
            anh = {'file': img_rel, 'rong': w, 'cao': h, 'dinh_dang': fmt}
        mark('anh', 'cda', 'goc' if anh else 'thieu')
        url_anh = url_map.get(img_rel) if img_rel else None
        mark('url_anh', 'media_server' if url_anh else '', 'bo_sung' if url_anh else 'thieu')
        am_thanh = None
        mark('am_thanh', '', 'thieu')

        # 31-34 examples
        def rows_to_examples(rows, with_hv):
            ex = []
            for row in rows:
                if len(row) >= (4 if with_hv else 3) and row[0]:
                    ex.append(example(row[0], row[1], row[2] if with_hv else '', row[3] if with_hv else row[2], jm_by_word))
            return ex

        def jm_examples(n, reading_filter=None):
            ex = []
            for w in jm.get(k, []):
                if reading_filter and not reading_filter(w):
                    continue
                ks = KANJI_RE.findall(w['tu'])
                hv = ' '.join(primary_hv(c) for c in ks)
                ex.append({'tu': w['tu'], 'doc': w['doc'], 'han_viet': hv, 'nghia_vi': '', 'nghia_en': w['nghia_en'],
                           'tu_loai': w['tu_loai'], 'thong_dung': w['thong_dung'], 'dac_biet': False,
                           'jmdict_id': w['jmdict_id'], 'am_thanh': None, 'nguon': 'jmdict'})
                if len(ex) >= n:
                    break
            return ex

        vpb = []
        for line in (r.get('vi_du_pho_bien') or '').replace('\r', '').split('\n'):
            m = re.match(r'\s*(\*?)(.+?)（(.+?)）\s*\|\s*(.*)', line)
            if m:
                vpb.append(example(m.group(2), m.group(3), '', m.group(4), jm_by_word, special=bool(m.group(1))))
        if vpb:
            mark('vi_du_pho_bien', 'cda', 'chuan_hoa')
        else:
            vpb = jm_examples(8, lambda w: w['thong_dung'])
            mark('vi_du_pho_bien', 'jmdict', 'suy_ra' if vpb else 'thieu')
        vd = rows_to_examples(table_rows(r.get('vi_du', '')), False)
        if vd:
            mark('vi_du', 'cda', 'chuan_hoa')
        else:
            vd = jm_examples(15)
            mark('vi_du', 'jmdict', 'bo_sung' if vd else 'thieu')
        vdo = collections.OrderedDict((kata(key), rows_to_examples(rows, True)) for key, rows in on_sec.items())
        vdk = collections.OrderedDict((key.replace('~', '-'), rows_to_examples(rows, True))
                                      for key, rows in sections(r.get('vi_du_am_kun', ''), 'kun').items())
        on_added = kun_added = False
        for x in am_on:
            if x['am'] not in vdo:
                h = hira(x['am'])
                ex = jm_examples(6, lambda w, h=h: h in w['doc'])
                if ex:
                    vdo[x['am']] = ex
                    on_added = True
        for x in am_kun:
            if x['am'] not in vdk:
                stem = x['am'].split('.')[0].strip('-')
                ex = jm_examples(6, lambda w, s=stem: w['doc'].startswith(s) or s in w['doc'])
                if ex and stem:
                    vdk[x['am']] = ex
                    kun_added = True
        mark('vi_du_am_on', 'cda' + ('+jmdict' if on_added else ''), 'chuan_hoa' if vdo else 'thieu')
        mark('vi_du_am_kun', 'cda' + ('+jmdict' if kun_added else ''), 'chuan_hoa' if vdk else 'thieu')

        # 36 _goc
        goc = {'tieu_de': nfc(html.unescape(r.get('title', ''))), 'trich_dan': nfc(r.get('content', '')), 'url_anh_goc': r.get('url_anh') or None}
        mark('han_tu', 'cda' if r else 'kd2', 'goc')
        for f_, n_ in (('tan_suat', 'kd2'), ('so_net_hay_dem_sai', 'kd2'), ('ten_bo_thu', 'kd2')):
            mark(f_, n_, 'bo_sung')

        item = collections.OrderedDict([
            ('han_tu', k), ('bien_the', bt), ('jlpt_joyo', jj), ('cap_do', cap), ('tan_suat', d['freq']),
            ('so_net', so_net), ('so_net_hay_dem_sai', d['strokes'][1:]), ('am_on', am_on), ('am_kun', am_kun),
            ('nanori', nanori), ('han_viet', han_viet), ('ten_bo_thu', d['rad_name']), ('nghia', nghia),
            ('nghia_en', d['meaning_en']), ('giai_nghia_chi_tiet', gn), ('giai_nghia_thieu_chuu', senses),
            ('bo_thu', bo_thu), ('bo_phan_cau_thanh', bpct), ('cau_truc', cau_truc), ('thu_tu_net', ttn),
            ('dong_am', dong_am), ('dong_nghia', dong_nghia), ('trai_nghia', trai_nghia), ('tuong_tu', tuong_tu),
            ('chu_chua_chu_nay', contains[:40]), ('cach_nho', cach_nho), ('cach_dung', cach_dung), ('anh', anh),
            ('url_anh', url_anh), ('am_thanh', am_thanh), ('vi_du_pho_bien', vpb), ('vi_du', vd),
            ('vi_du_am_on', vdo), ('vi_du_am_kun', vdk), ('tu_ghep_thieu_chuu', tu_ghep), ('_goc', goc),
        ])
        # Fields legitimately empty for many kanji do not make an entry incomplete.
        optional = {'bien_the', 'tan_suat', 'so_net_hay_dem_sai', 'ten_bo_thu', 'nanori', 'trai_nghia', 'dong_nghia',
                    'chu_chua_chu_nay', 'am_thanh', 'anh', 'url_anh', 'tu_ghep_thieu_chuu', 'am_kun'}
        thieu = [f_ for f_, v in item.items() if not f_.startswith('_') and v in (None, '', [], {})]
        required_missing = [f_ for f_ in thieu if f_ not in optional]
        can_duyet = [f_ for f_, s in src.items() if s['trang_thai'] == 'can_duyet']
        total = len([f_ for f_ in item if not f_.startswith('_')])
        item['_nguon'] = src
        item['_kiem_tra'] = {'du': not required_missing, 'thieu': thieu, 'thieu_bat_buoc': required_missing,
                             'can_duyet': can_duyet, 'diem_day_du': round(100 * (total - len(thieu)) / total)}
        item['_phien_ban'] = {'bo_du_lieu': VERSION, 'ngay_tao': now}
        out_list.append(item)

    level_order = {'N5': 0, 'N4': 1, 'N3': 2, 'N2': 3, 'N1': 4, None: 5}
    out_list.sort(key=lambda x: (level_order[x['cap_do']['chinh']], x['tan_suat'] or 9999, x['han_tu']))
    doc = collections.OrderedDict([
        ('phien_ban', VERSION), ('ngay_tao', now), ('so_kanji', len(out_list)),
        ('nguon', [
            {'ma': 'cda', 'ten': 'tiengnhatdongian.com', 'tep': os.path.basename(cda_path)},
            {'ma': 'kd2', 'ten': 'KANJIDIC2 – EDRDG', 'giay_phep': 'CC BY-SA 4.0'},
            {'ma': 'kradfile', 'ten': 'KRADFILE/RADKFILE – EDRDG', 'giay_phep': 'CC BY-SA 4.0'},
            {'ma': 'kanjivg', 'ten': 'KanjiVG', 'giay_phep': 'CC BY-SA 3.0', 'tep': kvg_file},
            {'ma': 'jmdict', 'ten': 'JMdict – EDRDG', 'giay_phep': 'CC BY-SA 4.0'},
            {'ma': 'joyo', 'ten': 'Bảng Jōyō 2010 (qua Wikipedia tiếng Nhật)', 'giay_phep': 'CC BY-SA 4.0'},
            {'ma': 'hvdic_thieu_chuu', 'ten': 'Hán Việt tự điển – Thiều Chửu (mục trên hvdic.thivien.net)'},
        ]),
        ('kanji', out_list),
    ])
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(doc, f, ensure_ascii=False, separators=(',', ':'))
    stats = collections.Counter()
    for it in out_list:
        for f_ in it:
            if not f_.startswith('_') and it[f_] not in (None, '', [], {}):
                stats[f_] += 1
    print('written', a.out, os.path.getsize(a.out) // 1024, 'KB;', len(out_list), 'kanji;', sum(1 for x in out_list if x['_kiem_tra']['du']), 'complete')
    for f_ in out_list[0]:
        if not f_.startswith('_'):
            print(f'  {f_:24} {stats[f_]:5} ({100 * stats[f_] // len(out_list)}%)')


if __name__ == '__main__':
    main()
