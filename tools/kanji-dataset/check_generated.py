"""Check written `cach_dung` / `nghia` files against the dataset.

  py -3 -I tools/kanji-dataset/check_generated.py data/kanji/kanji_chuan_v1.json data/kanji/generated

Every example word must be one of the kanji's own example words (no invented words) and contain the kanji;
each kanji needs 1-6 meaning groups with 1-4 examples. Prints problems and exits 1 when any is found.
"""
import json, os, sys

sys.stdout.reconfigure(encoding='utf-8')
doc = json.load(open(sys.argv[1], encoding='utf-8'))
by = {k['han_tu']: k for k in doc['kanji']}
problems, n_kanji, n_ex = [], 0, 0
for f in sorted(os.listdir(sys.argv[2])):
    if not f.endswith('.json'):
        continue
    data = json.load(open(os.path.join(sys.argv[2], f), encoding='utf-8'))
    for ch, v in data.items():
        n_kanji += 1
        k = by.get(ch)
        if not k:
            problems.append(f'{f}: {ch} không có trong bộ dữ liệu')
            continue
        known = {}
        for pool in [k['vi_du_pho_bien'], k['vi_du']] + list(k['vi_du_am_on'].values()) + list(k['vi_du_am_kun'].values()):
            for e in pool:
                known.setdefault(e['tu'], e['doc'])
        groups = v.get('cach_dung') or []
        if not 1 <= len(groups) <= 6:
            problems.append(f'{f}: {ch} có {len(groups)} nhóm nghĩa')
        for g in groups:
            # Radicals and kanji with no example word at all may describe usage without examples.
            if not g.get('y_nghia') or not (1 if known else 0) <= len(g.get('vi_du') or []) <= 4:
                problems.append(f'{f}: {ch} nhóm "{g.get("y_nghia")}" sai số ví dụ')
            for e in g.get('vi_du') or []:
                n_ex += 1
                if e['tu'] not in known:
                    problems.append(f'{f}: {ch} ví dụ không có trong danh sách: {e["tu"]}')
                elif ch not in e['tu']:
                    problems.append(f'{f}: {ch} ví dụ không chứa chữ: {e["tu"]}')
                if not e.get('doc') or not e.get('nghia'):
                    problems.append(f'{f}: {ch} ví dụ thiếu cách đọc/nghĩa: {e["tu"]}')
        if not k['nghia'] and not v.get('nghia'):
            problems.append(f'{f}: {ch} thiếu nghĩa tiếng Việt')
print(f'{n_kanji} chữ, {n_ex} ví dụ, {len(problems)} lỗi')
for p in problems[:80]:
    print(' -', p)
sys.exit(1 if problems else 0)
