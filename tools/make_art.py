# Собирает src/data/d_art.js из art/*.svg (Icons8 Ouch, Bouncy)
import re, json, glob, os
out = {}
for p in sorted(glob.glob('art/*.svg')):
    k = os.path.basename(p)[:-4]
    s = open(p, encoding='utf8').read().strip()
    s = re.sub(r'<\?xml[^>]*\?>', '', s).strip()
    m = re.match(r'<svg([^>]*)>', s)
    attrs = m.group(1)
    vb = re.search(r'viewBox="([^"]+)"', attrs)
    if not vb:
        w = re.search(r'width="([\d.]+)', attrs); h = re.search(r'height="([\d.]+)', attrs)
        vbv = f'0 0 {w.group(1)} {h.group(1)}'
    else:
        vbv = vb.group(1)
    s = f'<svg preserveAspectRatio="xMidYMid meet" focusable="false" viewBox="{vbv}" xmlns="http://www.w3.org/2000/svg">' + s[m.end():]
    out[k] = s
open('src/data/d_art.js', 'w', encoding='utf8').write('/* Иллюстрации Icons8 Ouch, стиль Bouncy (бесплатное распространение) */\nDATA.art = ' + json.dumps(out, ensure_ascii=False) + ';\n')
print(len(out), 'illustrations')
