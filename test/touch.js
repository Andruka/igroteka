// Тач-проверка: протягивание пальца не выделяет текст, рисование работает, кнопки не «залипают». node test/touch.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  const cdp = await ctx.newCDPSession(p);
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const drag = async (pts) => { await touch('touchStart', pts[0][0], pts[0][1]); for (const [x, y] of pts.slice(1)) await touch('touchMove', x, y); await touch('touchEnd'); };
  const sel = () => p.evaluate(() => (getSelection().toString() || '').length);
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  await p.goto('file://' + path.resolve(process.env.FILE || path.join(__dirname, '../index.html')));
  // 1. каталог: протягиваем по заголовку и карточкам
  await drag([[20, 60], [200, 70], [380, 80], [380, 300], [20, 320]]);
  ok(await sel() === 0, 'каталог: выделение после протягивания = 0');
  // двойной тап по тексту
  await p.touchscreen.tap(100, 80); await p.touchscreen.tap(100, 80);
  ok(await sel() === 0, 'каталог: двойной тап не выделяет слово');
  // программная попытка выделить всё (долгое нажатие/выделить всё)
  await p.evaluate(() => document.execCommand('selectAll'));
  ok(await sel() === 0, 'selectAll не выделяет интерфейс');
  // 2. игра: рисование
  await p.evaluate(() => Intro(G.games.find(g => g.id === 'draw')));
  await p.getByRole('button', { name: 'Играть', exact: true }).click();
  await p.waitForTimeout(500);
  await p.getByRole('button', { name: /Показать слово/ }).click().catch(async () => { await p.getByRole('button', { name: /Художник/ }).first().click().catch(() => { }); });
  await p.waitForTimeout(300);
  const clicked = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Показать слово/.test(x.textContent)); if (b) { b.click(); return true; } return false; });
  await p.waitForTimeout(300);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Запомнил/.test(x.textContent)); b && b.click(); });
  await p.waitForTimeout(400);
  const cv = await p.$('canvas.pad'); ok(!!cv, 'холст рисования появился');
  if (cv) {
    await cv.scrollIntoViewIfNeeded();
    const bb = await cv.boundingBox();
    const pts = []; for (let i = 0; i < 25; i++) pts.push([bb.x + 30 + i * (bb.width - 60) / 25, bb.y + bb.height / 2 + Math.sin(i / 3) * 50]);
    const scrollBefore = await p.evaluate(() => scrollY);
    await drag(pts);
    const ink = await p.evaluate(() => { const c = document.querySelector('canvas.pad'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 200 || d[i + 1] < 200) n++; return n; });
    ok(ink > 300, 'пальцем нарисована линия (пикселей: ' + ink + ')');
    ok(await sel() === 0, 'рисование: выделения нет');
    ok(await p.evaluate(() => scrollY) === scrollBefore, 'рисование не прокручивает страницу');
    // протяжка по тексту рядом с холстом
    await drag([[20, 200], [380, 220], [380, 500], [20, 520]]);
    ok(await sel() === 0, 'экран игры: выделения нет после протягивания по тексту');
  }
  console.log(errs.length ? 'ERRORS ' + errs[0] : 'no errors', fail ? 'FAILED ' + fail : 'ALL OK');
  await b.close(); process.exit(fail ? 1 : 0);
})();
