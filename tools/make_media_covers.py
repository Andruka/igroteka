"""Составные обложки из уже используемых Icons8 Ouch / Bouncy, без генерации."""
from pathlib import Path
import re

def layer(name, x, y, width, height):
    text=Path('art/'+name+'.svg').read_text()
    text=re.sub(r'<\?xml[^>]*\?>','',text).strip()
    match=re.match(r'<svg([^>]*)>',text)
    attrs=match.group(1)
    vb=re.search(r'viewBox="([^"]+)"',attrs)
    if vb: view=vb.group(1)
    else:
        w=re.search(r'width="([\d.]+)',attrs).group(1)
        h=re.search(r'height="([\d.]+)',attrs).group(1)
        view='0 0 '+w+' '+h
    return f'<svg x="{x}" y="{y}" width="{width}" height="{height}" viewBox="{view}">'+text[match.end():]

covers={
 'changes':layer('emoji',6,32,172,128)+layer('detective',124,76,108,96),
 'snapshot':layer('emoji',18,44,170,126)+layer('quiz',148,4,75,100),
 'melody':layer('radio',33,9,170,162),
}
for name,body in covers.items():
    Path('art/'+name+'.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 180">'+body+'</svg>\n')
