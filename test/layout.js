// Проверка вёрстки: горизонтальный скролл и вылезающие элементы на разных размерах. node test/layout.js [id] [w] [h]
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const only = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2] : null;
  const W = +(process.argv[3] || 390), H = +(process.argv[4] || 844);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: W, height: H } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  const ids = await p.evaluate(() => G.games.map(g => g.id));
  const SKIP = /^(Выход|Каталог|Правила|Сбросить историю карточек|В каталог)$/;
  let bad = 0;
  const check = async (id, tag) => {
    const r = await p.evaluate(() => {
      const de = document.documentElement; const over = [];
      if (de.scrollWidth > innerWidth + 1) document.querySelectorAll('.stage *, .board *, .turnbar *, .bar *, .wrap *').forEach(e => { const r = e.getBoundingClientRect(); if (r.width && r.right > innerWidth + 2 && getComputedStyle(e).position !== 'fixed') over.push((e.className || e.tagName).toString().slice(0, 30)); });
      return { sw: de.scrollWidth, over: [...new Set(over)].slice(0, 4) };
    });
    if (r.sw > W + 1) { bad++; console.log('OVERFLOW', id, tag, r.sw, '>', W, r.over.join(',')); }
  };
  await check('home', 'home');
  for (const id of ids) {
    if (only && id !== only) continue;
    await p.goto('file://' + path.resolve(__dirname, '../index.html'));
    await p.evaluate(id => Intro(G.games.find(g => g.id === id)), id);
    await check(id, 'intro');
    await p.getByRole('button', { name: 'Играть', exact: true }).click();
    for (let s = 0; s < 14; s++) {
      await p.waitForTimeout(40); await check(id, 's' + s);
      const btns = await p.$$('button:visible:not([disabled])'); const c = [];
      for (const x of btns) { const t = (await x.innerText()).trim(); if (!SKIP.test(t)) c.push(x); }
      if (!c.length) break;
      const prim = await p.$('[data-primary]:visible'); const x = prim && Math.random() < .6 ? prim : c[Math.floor(Math.random() * c.length)];
      try { await x.click({ timeout: 1000 }); } catch (e) { }
    }
  }
  console.log(bad ? 'LAYOUT ISSUES: ' + bad : 'layout OK', W + 'x' + H, errs.length ? 'ERRORS ' + errs[0] : '');
  await b.close();
})();
