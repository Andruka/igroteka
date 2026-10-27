const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const file = 'file://' + path.resolve(__dirname, '../index.html');
  await page.goto(file);
  // квиз: пак «для детей» → только детские вопросы
  await page.evaluate(() => store.set('pack', 'kids'));
  const r = await page.evaluate(() => { const d = makeDeck('quiz', DATA.quiz); const kids = new Set(DATA.themed.quiz.kids.map(x => x.q)); let ok = 0; for (let i = 0; i < 60; i++) { const q = d.draw(); if (kids.has(q.q)) ok++; } return ok; });
  console.log('kids quiz draws from kids pool: ', r, '/60');
  await page.evaluate(() => store.set('pack', 'all'));
  const r2 = await page.evaluate(() => { const d = makeDeck('quiz', DATA.quiz); const t = new Set(Object.values(DATA.themed.quiz).flat().map(x => x.q)); let n = 0; for (let i = 0; i < 80; i++) if (t.has(d.draw().q)) n++; return n; });
  console.log('all pack leaks themed: ', r2);
  await page.evaluate(() => store.set('pack', 'ny'));
  const r3 = await page.evaluate(() => { const d = makeDeck('quiz', DATA.quiz); const t = new Set(DATA.themed.quiz.ny.map(x => x.q)); const o = new Set(Object.entries(DATA.themed.quiz).filter(([k]) => k !== 'ny').flatMap(([, v]) => v.map(x => x.q))); let ny = 0, bad = 0; for (let i = 0; i < 120; i++) { const q = d.draw().q; if (t.has(q)) ny++; if (o.has(q)) bad++; } return [ny, bad]; });
  console.log('ny pack: ny cards, foreign cards =', r3);
  await page.evaluate(() => store.set('pack', 'all'));
  // флажок и скрытие
  await page.evaluate(() => Intro(G.games.find(g => g.id === 'quiz')));
  await page.getByRole('button', { name: 'Играть', exact: true }).click();
  await page.locator('.tile .btn').first().click(); await page.waitForTimeout(200);
  await page.locator('button[aria-label*="шибк"], button[title*="шибк"]').first().click().catch(() => console.log('flag button not found'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: '/tmp/flag.png' });
  await page.getByRole('button', { name: /Скрыть и пожаловаться/ }).click();
  console.log('reports', await page.evaluate(() => JSON.stringify(store.get('reports', [])).slice(0, 120)));
  // озвучка
  console.log('voice api', await page.evaluate(() => ({ ok: Voice.ok(), tts: !!window.speechSynthesis })));
  // настройки сохраняются
  await page.evaluate(() => { Settings.set('vol', .3); Settings.set('fx', 'lite'); });
  await page.reload(); console.log('settings persisted', await page.evaluate(() => [Settings.get('vol'), Settings.get('fx')]));
  console.log('errors', errs);
  await browser.close();
})();
