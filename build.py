#!/usr/bin/env python3
import glob, os, re, sys
root = os.path.dirname(os.path.abspath(__file__))
def rd(p): return open(os.path.join(root, p), encoding='utf-8').read()
css = rd('src/fonts.css') + '\n' + rd('src/base.css') + '\n' + rd('src/games.css') + '\n' + rd('src/polish.css')
js = [rd('src/engine.js'), rd('src/kit.js'), rd('src/pics.js')]
for pat in ('src/data/*.js', 'src/games/*.js'):
    for f in sorted(glob.glob(os.path.join(root, pat))):
        js.append('/* ---- %s ---- */\n' % os.path.relpath(f, root) + open(f, encoding='utf-8').read())
js.append('boot();')
html = '''<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#1b2559">
<title>Игротека — игры для компании на одном экране</title>
<style>
%s
</style>
</head>
<body>
<div id="app"></div>
<noscript>Для игр нужен включённый JavaScript.</noscript>
<script>
'use strict';
%s
</script>
</body>
</html>
''' % (css, '\n'.join(js))
out = os.path.join(root, 'index.html')
open(out, 'w', encoding='utf-8').write(html)
print('built', out, len(html)//1024, 'KB')
