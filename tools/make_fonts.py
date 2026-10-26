# Делает src/fonts.css: подмножества Inter (кириллица + латиница) в base64 woff
import base64, io
from fontTools import subset
from fontTools.ttLib import TTFont
SRC = '/usr/share/fonts/opentype/inter/'
FONTS = [('IgroDisplay', 'InterDisplay-Black.otf', 900), ('IgroText', 'Inter-ExtraBold.otf', 800), ('IgroText', 'Inter-SemiBold.otf', 600), ('IgroText', 'Inter-Medium.otf', 500)]
U = list(range(0x20, 0x7f)) + list(range(0xa0, 0x100)) + list(range(0x400, 0x460)) + [0x2010,0x2011,0x2012,0x2013,0x2014,0x2018,0x2019,0x201a,0x201c,0x201d,0x201e,0x2022,0x2026,0x2116,0x2212,0x2190,0x2191,0x2192,0x2193,0x2713,0x00d7,0x2212,0x2248]
out = []
for fam, fn, w in FONTS:
    opts = subset.Options(); opts.flavor = 'woff'; opts.layout_features = ['kern', 'tnum', 'case', 'calt']; opts.hinting = False; opts.desubroutinize = True
    f = TTFont(SRC + fn)
    s = subset.Subsetter(opts); s.populate(unicodes=U); s.subset(f)
    buf = io.BytesIO(); f.flavor = 'woff'; f.save(buf)
    b = base64.b64encode(buf.getvalue()).decode()
    print(fn, len(buf.getvalue()) // 1024, 'KB')
    out.append("@font-face{font-family:'%s';font-weight:%d;font-style:normal;font-display:swap;src:url(data:font/woff;base64,%s) format('woff')}" % (fam, w, b))
open('src/fonts.css', 'w').write('\n'.join(out))
