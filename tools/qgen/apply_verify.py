#!/usr/bin/env python3
"""Применяет verify/out/*.jsonl к merged.jsonl: убирает ok=0, ставит уровень по оценке p (единые пороги для всех категорий).
Пишет merged_final.jsonl и печатает сводку. to_js.py читает merged_final.jsonl, если он есть."""
import json, glob, os, collections
here = os.path.dirname(os.path.abspath(__file__))
rows = json.load(open(os.path.join(here, 'verify/all.json'), encoding='utf-8'))
v = {}
for f in glob.glob(os.path.join(here, 'verify/out/*.jsonl')):
    for line in open(f, encoding='utf-8'):
        try:
            o = json.loads(line); v[o['i']] = o
        except Exception: pass
# пороги по p: ≥80 → 1, ≥55 → 2, ≥32 → 3, ≥14 → 4, иначе 5
def lvl(p): return 1 if p >= 80 else 2 if p >= 55 else 3 if p >= 32 else 4 if p >= 14 else 5
out, bad, unk = [], 0, 0
shift = collections.Counter()
for r in rows:
    o = v.get(r['id'])
    if o is None: unk += 1; out.append(r); continue   # не проверен — оставляем как есть
    if not o.get('ok'): bad += 1; continue
    n = lvl(float(o.get('p', 50)))
    # сдвигаем максимум на ±1 от заявленного уровня, чтобы не ломать структуру
    n = max(r['l'] - 1, min(r['l'] + 1, n))
    shift[n - r['l']] += 1; r['l'] = n; out.append(r)
with open(os.path.join(here, 'merged_final.jsonl'), 'w', encoding='utf-8') as f:
    for r in out: f.write(json.dumps({k: r[k] for k in ('c','l','q','a','w')}, ensure_ascii=False) + '\n')
print('проверено', len(v), 'из', len(rows), '| отброшено ok=0:', bad, '| не проверено:', unk, '| итого', len(out), '| сдвиги уровня', dict(shift))
t = collections.defaultdict(lambda: [0]*6)
for r in out: t[r['c']][r['l']] += 1
for c, a in sorted(t.items()): print(c, a[1:])
