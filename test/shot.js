// node test/shot.js <id|home> <out.png> [кликов-вперёд скрипт]
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const [, , id, out, clicks, w, hgt] = process.argv;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: +(w || 1280), height: +(hgt || 800) } })).newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto(file);
  if (id !== 'home') {
    await page.evaluate(id => Intro(G.games.find(g => g.id === id)), id);
    if (clicks !== 'intro') {
      await page.getByRole('button',{name:'Играть',exact:true}).click();
      for (const c of (clicks || '').split('|').filter(Boolean)) { await page.locator(c).first().click(); await page.waitForTimeout(150); }
    }
  }
  await page.waitForTimeout(300);
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
})();
