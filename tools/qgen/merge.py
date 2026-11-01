#!/usr/bin/env python3
"""Сборка сырых вопросов raw/*.jsonl: проверка формата, дедупликация, отчёт.
Вывод: merged.jsonl со строками {"c":cat,"l":level,"q","a","w":[3]}.
Запуск: python3 tools/qgen/merge.py"""
import json, re, glob, os, sys

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(os.path.dirname(here))

def norm(s):
    return re.sub(r'[^0-9a-zа-яё]+', ' ', s.lower().replace('ё', 'е')).strip()

def toks(s):
    return set(w for w in norm(s).split() if len(w) > 2)

# существующие вопросы (для дедупа)
existing = []
for f in glob.glob(os.path.join(root, 'src/data/d_quiz*.js')):
    for m in re.finditer(r"Q\('(\w+)',\s*\d,\s*'((?:[^'\\]|\\.)*)'", open(f, encoding='utf-8').read()):
        existing.append(toks(m.group(2)))

seen_exact = set()
seen_toks = list(existing)
out, stats, dropped = [], {}, {}

def bad(reason):
    dropped[reason] = dropped.get(reason, 0) + 1

for f in sorted(glob.glob(os.path.join(here, 'raw/*_[1-5].jsonl'))):
    cat, lvl = os.path.basename(f)[:-6].split('_')
    for line in open(f, encoding='utf-8'):
        line = line.strip()
        if not line:
            continue
        try:
            o = json.loads(line)
            q, a, w = o['q'].strip(), str(o['a']).strip(), [str(x).strip() for x in o['w']]
        except Exception:
            bad('json'); continue
        if not q or not a or len(w) != 3 or any(not x for x in w):
            bad('shape'); continue
        opts = [a] + w
        if len({norm(x) for x in opts}) != 4:
            bad('dup-options'); continue
        if len(q) > 220 or any(len(x) > 70 for x in opts):
            bad('too-long'); continue
        k = norm(q)
        if k in seen_exact:
            bad('dup-exact'); continue
        t = toks(q)
        if t and any(len(t & e) / max(1, len(t | e)) > 0.8 for e in seen_toks[-4000:] + existing):
            bad('dup-similar'); continue
        seen_exact.add(k); seen_toks.append(t)
        out.append({'c': cat, 'l': int(lvl), 'q': q, 'a': a, 'w': w})
        stats[(cat, int(lvl))] = stats.get((cat, int(lvl)), 0) + 1

with open(os.path.join(here, 'merged.jsonl'), 'w', encoding='utf-8') as fh:
    for o in out:
        fh.write(json.dumps(o, ensure_ascii=False) + '\n')
print('вопросов:', len(out), 'отброшено:', dropped)
cats = sorted({c for c, _ in stats})
for c in cats:
    print(c, [stats.get((c, l), 0) for l in range(1, 6)])
