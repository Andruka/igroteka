#!/usr/bin/env python3
"""Читает work/out/{draw,taboo}_*.txt и work/out/memory*.js, убирает дубли с существующим, готовит work/chk/in для проверки codex."""
import re, json, glob, os, subprocess
here = os.path.dirname(os.path.abspath(__file__)); W = os.path.join(here, 'work')
n = lambda s: re.sub(r'[^0-9a-zа-я]+', ' ', s.lower().replace('ё', 'е')).strip()
def rd(f): return [l.strip() for l in open(f, encoding='utf-8') if l.strip()] if os.path.exists(f) else []
res = {}
ex = {n(l.split('|')[2]) for l in rd(f'{W}/existing_draw.txt')}; seen = set(ex); d = []
for f in sorted(glob.glob(f'{W}/out/draw_*.txt')):
    for l in rd(f):
        p = l.split('|')
        if len(p) != 3 or p[0] not in '123': continue
        k = n(p[2])
        if k in seen: continue
        seen.add(k); d.append({'l': int(p[0]), 'c': p[1].strip(), 'w': p[2].strip()})
res['draw'] = d
ex = {n(l.split('|')[0]) for l in rd(f'{W}/existing_taboo.txt')}; seen = set(ex); t = []
for f in sorted(glob.glob(f'{W}/out/taboo_*.txt')):
    for l in rd(f):
        p = l.split('|')
        if len(p) != 2: continue
        fw = [x.strip() for x in p[1].split(',') if x.strip()]; k = n(p[0])
        if len(fw) != 5 or k in seen or any(n(x) == k or (len(k) > 3 and k[:max(4, len(k) - 2)] in n(x)) for x in fw): continue
        seen.add(k); t.append({'w': p[0].strip(), 'f': fw})
res['taboo'] = t
mem = {}
for f in sorted(glob.glob(f'{W}/out/memory*.js')):
    out = subprocess.run(['node', '-e', "global.DATA={memory:{}};eval(require('fs').readFileSync(process.argv[1],'utf8'));console.log(JSON.stringify(DATA.memory))", f], capture_output=True, text=True).stdout
    try: mem.update(json.loads(out))
    except Exception: print('memory: ошибка в', f)
exm = {n(l.split('|')[0]) for l in rd(f'{W}/existing_memory.txt')}
res['memory'] = {k: v for k, v in mem.items() if n(k) not in exm}
json.dump(res, open(f'{W}/cand.json', 'w'), ensure_ascii=False)
print({k: (len(v) if k != 'memory' else {a: len(b) for a, b in v.items()}) for k, v in res.items()})
def line(k, i, o): return f"{i} | " + (f"{o['w']} | запреты: {', '.join(o['f'])}" if k == 'taboo' else f"{o['c']}: {o['w']}")
for k in ('taboo', 'draw'):
    for c in range(0, len(res[k]), 180):
        open(f'{W}/chk/in/{k}_{c // 180}.txt', 'w').write('\n'.join(line(k, i, o) for i, o in enumerate(res[k][c:c + 180], c)))
L = [(t, p) for t, v in res['memory'].items() for p in v]
for c in range(0, len(L), 180):
    open(f'{W}/chk/in/memory_{c // 180}.txt', 'w').write('\n'.join(f"{i} | {t} | {p[0]} — {p[1]}" for i, (t, p) in enumerate(L[c:c + 180], c)))
