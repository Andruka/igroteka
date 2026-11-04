#!/usr/bin/env python3
"""merged.jsonl -> src/data/d_quiz9.js (запускать после merge.py)"""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
rows = [json.loads(l) for l in open(os.path.join(here, 'merged_final.jsonl' if os.path.exists(os.path.join(here,'merged_final.jsonl')) else 'merged.jsonl'), encoding='utf-8')]
drop = set(json.load(open(os.path.join(here, 'med/drop.json'), encoding='utf-8'))) if os.path.exists(os.path.join(here, 'med/drop.json')) else set()
rows = [r for r in rows if r['q'] not in drop]
ex = os.path.join(here, 'extra_final.jsonl')   # добавочные вопросы, прошедшие проверку (напр. трудные по русскому)
if os.path.exists(ex): rows += [json.loads(l) for l in open(ex, encoding='utf-8') if l.strip()]
data = [[r['c'], r['l'], r['q'], r['a'], *r['w']] for r in rows]
out = os.path.join(here, '../../src/data/d_quiz9.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write('/* Сгенерировано tools/qgen/to_js.py — не править вручную. [кат, уровень, вопрос, верный, неверный×3] */\n')
    f.write('(' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ').forEach(r => Q(r[0], r[1], r[2], r[3], r[4], r[5], r[6]));\n')
print(len(data), os.path.getsize(out) // 1024, 'KB')
