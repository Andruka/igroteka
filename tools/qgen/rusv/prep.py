import json,glob,os
rows=[]
for f in sorted(glob.glob('rus_new_*.jsonl')):
    for l in open(f,encoding='utf-8'):
        try:
            o=json.loads(l); assert len(o['w'])==3 and o['q'] and o['a']; rows.append(o)
        except Exception: pass
json.dump(rows,open('rusv/all.json','w'),ensure_ascii=False)
for k in range(0,len(rows),100):
    open(f'rusv/in/{k//100}.txt','w').write('\n'.join(f"{i} | {r['q']} | ВЕРНЫЙ: {r['a']} | неверные: {'; '.join(r['w'])}" for i,r in enumerate(rows[k:k+100],k)))
print(len(rows))
