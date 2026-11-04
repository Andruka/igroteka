// Виселица: все слова отгадываются клавиатурой, клавиатура помещается на экран, партия проходится
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  for (const [w, h] of [[1280, 720], [1366, 768], [375, 667], [768, 1024]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); await p.goto(file);
    if (w === 1280) {
      const miss = await p.evaluate(() => { const ABC = 'абвгдежзийклмнопрстуфхцчшщъыьэюя'; const n = ch => ch === 'ё' ? 'е' : ch; const r = []; for (const c in DATA.hang) DATA.hang[c].forEach(x => { if ([...x.toLowerCase()].some(ch => ch !== ' ' && !ABC.includes(n(ch)))) r.push(x); }); return r; });
      ok(!miss.length, 'все слова набираются клавиатурой' + (miss.length ? ': ' + miss.join(',') : ''));
    }
    await p.evaluate(() => Intro(G.games.find(g => g.id === 'hang'))); await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(300);
    const last = await p.locator('.key').last().boundingBox();
    ok(last && last.y + last.height <= h + 1, `${w}x${h}: клавиатура целиком в окне (низ ${Math.round(last.y + last.height)})`);
    ok(await p.locator('.hang-top .kicker').isVisible(), `${w}x${h}: подсказка-тема видна`);
    await p.getByRole('button', { name: 'Назвать слово целиком' }).click(); await p.getByRole('button', { name: 'Верно', exact: true }).click();
    ok(await p.locator('text=открыла слово').count() > 0, `${w}x${h}: слово целиком засчитывается`);
    ok(!errs.length, `${w}x${h}: без ошибок` + (errs.length ? ' ' + errs[0] : '')); await p.close();
  }
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
