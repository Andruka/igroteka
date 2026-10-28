const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1366, height: 800 } })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const file = 'file://' + path.resolve(__dirname, '../index.html');
  const go = async id => { await page.goto(file); await page.evaluate(id => Intro(G.games.find(g => g.id === id)), id); await page.getByRole('button', { name: 'Играть', exact: true }).click(); };
  // draw
  await go('draw'); await page.getByRole('button', { name: /Показать слово/ }).click(); await page.getByRole('button', { name: /Запомнил/ }).click();
  const cv = page.locator('canvas.pad'); const b = await cv.boundingBox();
  await page.mouse.move(b.x + 100, b.y + 100); await page.mouse.down(); for (let i = 0; i < 20; i++) await page.mouse.move(b.x + 100 + i * 15, b.y + 100 + Math.sin(i / 2) * 60); await page.mouse.up();
  await page.screenshot({ path: '/tmp/draw.png' });
  await page.getByRole('button', { name: 'Угадали!' }).click(); await page.waitForTimeout(200); await page.screenshot({ path: '/tmp/draw2.png' });
  // hang
  await go('hang'); await page.locator('.key').nth(5).click(); await page.locator('.key').nth(12).click(); await page.locator('.key').nth(20).click(); await page.screenshot({ path: '/tmp/hang.png' });
  // jeopardy
  await go('jeopardy'); await page.waitForTimeout(900); await page.screenshot({ path: '/tmp/jp.png' }); await page.locator('.jp-cell').nth(7).click(); await page.screenshot({ path: '/tmp/jp2.png' });
  // home with pack
  await page.goto(file); await page.evaluate(() => store.set('pack', 'kids')); await page.goto(file); await page.screenshot({ path: '/tmp/home_kids.png', fullPage: false });
  console.log('errors', errs);
  await browser.close();
})();
