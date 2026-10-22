"""Prepare compact batches for writing `cach_dung` (and `nghia` where missing) from the built dataset.

  py -3 -I tools/kanji-dataset/prepare_batches.py data/kanji/kanji_chuan_v1.json <out_dir> [batch_size]

Each batch file lists, per kanji: Hán Việt, Vietnamese/English meaning, Thiều Chửu senses and up to 14 real
example words (word, reading, Vietnamese meaning or English gloss). Kanji that already have `cach_dung`
from the owner's data, or already have a generated file, are skipped.
"""
import json, os, sys

sys.stdout.reconfigure(encoding='utf-8')
src, out = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 40
gen_dir = os.path.join(os.path.dirname(src), 'generated')
done = set()
if os.path.isdir(gen_dir):
    for f in os.listdir(gen_dir):
        if f.endswith('.json'):
            done |= set(json.load(open(os.path.join(gen_dir, f), encoding='utf-8')))
doc = json.load(open(src, encoding='utf-8'))
todo = [k for k in doc['kanji'] if not k['cach_dung'] and k['han_tu'] not in done]
os.makedirs(out, exist_ok=True)


def examples(k):
    seen, ex = set(), []
    pools = [k['vi_du_pho_bien'], k['vi_du']] + list(k['vi_du_am_on'].values()) + list(k['vi_du_am_kun'].values())
    for pool in pools:
        for e in pool:
            if e['tu'] in seen or not e['tu']:
                continue
            seen.add(e['tu'])
            ex.append(e)
    ex.sort(key=lambda e: (not e['nghia_vi'], not e['thong_dung'], len(e['tu'])))
    return ex[:11]


for i in range(0, len(todo), size):
    lines = []
    for k in todo[i:i + size]:
        senses = ' / '.join(s['noi_dung'] for s in k['giai_nghia_thieu_chuu'][:6])
        ex = '; '.join(f"{e['tu']}({e['doc']})={e['nghia_vi'] or 'EN:' + e['nghia_en']}" for e in examples(k))
        lines.append(f"{k['han_tu']}|HV={k['han_viet']['chinh']}|cap={k['cap_do']['chinh']}|nghia={k['nghia'] or '(THIẾU)'}"
                     f"|en={'; '.join(k['nghia_en'][:5])}|tc={senses[:220]}|vd={ex}")
    with open(os.path.join(out, f'batch_{i // size + 1:03d}.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')
print('kanji to write:', len(todo), '| batches:', (len(todo) + size - 1) // size, '| already done:', len(done))
