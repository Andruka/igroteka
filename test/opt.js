// node test/opt.js <gameId> "<текст кнопки опции>" ... : прогон с выбранными опциями
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const [id, ...labels] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.evaluate(id => Intro(G.games.find(g => g.id === id)), id);
  for (const l of labels) await p.getByRole('button', { name: l, exact: true }).click();
  await p.getByRole('button', { name: 'Играть', exact: true }).click();
  let fin = false, s = 0;
  for (; s < 600 && !errs.length; s++) {
    if (await p.locator('text=Сыграть ещё раз').count()) { fin = true; break; }
    const inp = p.locator('.stage input[type=text]:visible'); if (await inp.count()) await inp.first().fill('тест');
    const bs = await p.$$('button:visible:not([disabled])'); const c = [];
    for (const x of bs) { const t = (await x.innerText()).trim(); if (!/^(← Выход|Правила|🔊|🔇|⛶|В каталог)$/.test(t)) c.push(x); }
    const prim = await p.$('[data-primary]:visible');
    const x = prim && Math.random() < .6 ? prim : c[Math.floor(Math.random() * c.length)];
    try { await x.click({ timeout: 1500 }); } catch (e) { } await p.waitForTimeout(15);
  }
  console.log(errs.length ? 'FAIL ' + errs[0] : (fin ? 'OK' : 'NOT FINISHED') + ' ' + id + ' ' + labels.join(',') + ' steps=' + s); await b.close();
})();
