// Любимые игры: звезда на карточке, фильтр, поднятие наверх, сохранение
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  await page.goto(file); await page.evaluate(() => localStorage.clear()); await page.reload();
  const titles = () => page.$$eval('.gcard h3', a => a.map(x => x.textContent));
  const t0 = await titles();
  await page.locator('.gcard').nth(5).locator('.favstar').click();
  ok(!await page.locator('.intro, .title-row').count(), 'клик по звезде не открывает игру');
  const t1 = await titles();
  ok(t1[0] === t0[5], 'любимая поднялась наверх');
  await page.reload();
  ok((await titles())[0] === t0[5], 'сохраняется после перезагрузки');
  await page.getByRole('button', { name: '★ Любимые', exact: true }).click();
  ok((await titles()).length === 1, 'фильтр «Любимые» показывает одну игру');
  await page.locator('.gcard .favstar').click();
  ok(await page.locator('.empty').count() === 1, 'пустое состояние после снятия звезды');
  await page.getByRole('button', { name: 'Все', exact: true }).click();
  await page.locator('.gcard').first().click();
  ok(await page.locator('.title-row .favstar').count() === 1, 'звезда на экране игры');
  ok(!errs.length, 'нет ошибок: ' + errs.join(';'));
  await browser.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
