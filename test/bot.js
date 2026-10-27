// Прогон игр случайным «игроком»: node test/bot.js [id игры] [шагов]
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
const only = process.argv[2] && process.argv[2] !== 'all' ? process.argv[2] : null;
const maxSteps = +(process.argv[3] || 400);
const SKIP = /^(Выход|Каталог|Правила|Сбросить историю карточек|В каталог)$/;
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto(file);
  const ids = await page.evaluate(() => G.games.map(g => g.id));
  let fails = 0;
  for (const id of ids) {
    if (only && id !== only) continue;
    errors.length = 0;
    await page.goto(file);
    if (process.env.PACK) await page.evaluate(p => store.set('pack', p), process.env.PACK);
    await page.evaluate(id => Intro(G.games.find(g => g.id === id)), id);
    const ngames = await page.evaluate(() => 0);
    await page.getByRole('button',{name:'Играть',exact:true}).click();
    let steps = 0, finished = false;
    for (; steps < maxSteps; steps++) {
      if (errors.length) break;
      if (await page.locator('text=Сыграть ещё раз').count()) { finished = true; break; }
      // заполнить текстовые поля случайным текстом (головоломки)
      const inputs = page.locator('.stage input[type=text]:visible');
      if (await inputs.count()) { await inputs.first().fill(Math.random() < .3 ? 'тест' : String(Math.floor(Math.random() * 900 + 100))); }
      const btns = await page.$$('button:visible:not([disabled])');
      const cand = [];
      for (const b of btns) { const t = (await b.innerText()).trim(); if (!SKIP.test(t)) cand.push(b); }
      if (!cand.length) { await page.waitForTimeout(150); continue; }
      const prim = await page.$('[data-primary]:visible');
      const b = prim && Math.random() < .5 ? prim : cand[Math.floor(Math.random() * cand.length)];
      try { await b.click({ timeout: 1500 }); } catch (e) { }
      await page.waitForTimeout(15);
    }
    const ok = !errors.length;
    if (!ok) fails++;
    console.log((ok ? 'OK  ' : 'FAIL') + ' ' + id + ' steps=' + steps + (finished ? ' finished' : ' (not finished)') + (ok ? '' : '\n   ' + errors.slice(0, 3).join('\n   ')));
  }
  await browser.close();
  process.exit(fails ? 1 : 0);
})();
