// Выгружает текущие словари из собранного index.html в work/existing_*.txt (для дедупликации и подсказки агентам)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] }); const p = await b.newPage();
  await p.goto('file://' + path.resolve(__dirname, '../../index.html'));
  const d = await p.evaluate(() => ({
    draw: DATA.draw.map(x => x.l + '|' + x.c + '|' + x.w), taboo: DATA.taboo.map(x => x.w + '|' + x.f.join(',')),
    memory: Object.entries(DATA.memory).flatMap(([t, a]) => a.map(x => t + '|' + x[0] + '|' + x[1]))
  }));
  for (const k in d) fs.writeFileSync(path.join(__dirname, 'work/existing_' + k + '.txt'), d[k].join('\n'));
  await b.close();
})();
