// Четыре в ряд: партии кликами (2 и 3 команды, соло), правила победы/ничьей, помещение поля, тач. node test/connect.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  const mk = async vp => {
    const p = await b.newPage({ viewport: vp || { width: 1280, height: 720 } }); p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
    return p;
  };
  const open = async (p, teams, size, level) => {
    await p.goto(file);
    await p.evaluate(([n, s, l]) => { store.set('o.connect.size', s); store.set('o.connect.level', l); store.set('n.connect', n); Intro(G.games.find(g => g.id === 'connect')); }, [teams, size, level]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(500);
  };
  const done = p => p.locator('text=Сыграть ещё раз').count();
  const col = async (p, c) => { await p.locator('.cn-col').nth(c).click({ timeout: 2000 }); await p.waitForTimeout(650); };
  const randomPlay = async (p, pause, max) => {
    for (let i = 0; i < max && !(await done(p)); i++) {
      const e = p.locator('.cn-col:not([disabled])'); const n = await e.count(); if (!n) { await p.waitForTimeout(300); continue; }
      await e.nth(Math.floor(Math.random() * n)).click({ timeout: 1500 }).catch(() => { }); await p.waitForTimeout(pause);
    }
    await p.waitForTimeout(2200);
  };
  // 1. вертикальная победа: A,B,A,B,A,B,A в столбцах 0,1,0,1,0,1,0
  { const p = await mk(); await open(p, 2, 0, 1);
    ok(await p.locator('.cn-col').count() === 7 && await p.locator('.cn-slot').count() === 42, 'классика: 7 столбцов, 42 ячейки');
    for (const c of [0, 1, 0, 1, 0, 1]) await col(p, c);
    ok(!(await done(p)) && await p.locator('.cn-win').count() === 0, 'до четвёртой фишки победы нет');
    await col(p, 0); await p.waitForTimeout(2200);
    ok(await done(p) === 1, 'вертикаль из 4: партия окончена');
    const sc = await p.evaluate(() => [...document.querySelectorAll('.prow .ps')].map(e => +e.textContent));
    ok(sc.reduce((a, c) => a + c, 0) === 1 && Math.max(...sc) === 1, 'ровно одно очко победителю (' + sc + ')');
    ok(!p.errs.length, 'без ошибок' + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.close(); }
  // 2. горизонталь
  { const p = await mk(); await open(p, 2, 0, 1);
    for (const c of [0, 0, 1, 1, 2, 2, 3]) await col(p, c);
    ok(await p.locator('.cn-win').count() === 4, 'горизонталь: подсвечены 4 фишки');
    await p.waitForTimeout(2000); ok(await done(p) === 1, 'горизонталь: итоги'); await p.close(); }
  // 3. диагональ: A0 B1 A1 B2 A3 B2 A2 B3 A6 B3 A3 -> A на (0,0),(1,1),(2,2),(3,3) по высотам
  { const p = await mk(); await open(p, 2, 0, 1);
    for (const c of [0, 1, 1, 2, 3, 2, 2, 3, 6, 3, 3]) await col(p, c);
    ok(await p.locator('.cn-win').count() >= 4, 'диагональ: подсвечена линия из 4');
    await p.close(); }
  // 4. ничья: подбираем последовательность на 42 хода без четвёрки (поиск в глубину)
  { const p = await mk(); await open(p, 2, 0, 1);
    const grid = Array.from({ length: 6 }, () => Array(7).fill(-1)), hh = Array(7).fill(0), fill = [];
    const has4 = (r, c, q) => [[0, 1], [1, 0], [1, 1], [1, -1]].some(([dr, dc]) => { let n = 1; for (const s of [1, -1]) for (let k = 1; k < 4; k++) { const rr = r + dr * k * s, cc = c + dc * k * s; if (rr < 0 || rr > 5 || cc < 0 || cc > 6 || grid[rr][cc] !== q) break; n++; } return n >= 4; });
    const dfs = n => { if (n === 42) return true; const pl = n % 2; for (let c = 0; c < 7; c++) { if (hh[c] >= 6) continue; const r = 5 - hh[c]; grid[r][c] = pl; if (!has4(r, c, pl)) { hh[c]++; fill.push(c); if (dfs(n + 1)) return true; fill.pop(); hh[c]--; } grid[r][c] = -1; } return false; };
    ok(dfs(0), 'найдена ничейная последовательность (' + fill.length + ' ходов)');
    for (const c of fill) { await p.locator('.cn-col').nth(c).click({ timeout: 2000 }); await p.waitForTimeout(600); }
    await p.waitForTimeout(600);
    ok(await done(p) === 1 && (await p.locator('h1.big').innerText()).includes('Ничья'), 'ничья: заголовок «Ничья»');
    ok(!p.errs.length, 'без ошибок' + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.close(); }
  // 5. 3 команды: поле 9x7, случайная партия
  { const p = await mk(); await open(p, 3, 0, 1);
    ok(await p.locator('.cn-col').count() === 9 && await p.locator('.cn-slot').count() === 63, '3 команды: поле 9x7');
    ok(await p.locator('.cn-chip').count() === 3, '3 команды: три значка-легенды');
    await randomPlay(p, 600, 80);
    ok(await done(p) === 1, '3 команды: партия дошла до итогов');
    ok(!p.errs.length, 'без ошибок' + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.close(); }
  // 6. соло: три уровня
  for (const lv of [0, 1, 2]) {
    const p = await mk(); await open(p, 1, lv === 2 ? 1 : 0, lv);
    ok(await p.locator('.cn-chip').count() === 2, `соло, уровень ${lv}: легенда с компьютером`);
    await randomPlay(p, 1600, 60);
    ok(await done(p) === 1, `соло, уровень ${lv}: партия дошла до итогов`);
    ok(!p.errs.length, `соло, уровень ${lv}: без ошибок` + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.close();
  }
  { const p = await mk(); await open(p, 1, 0, 2);
    await col(p, 0); await p.waitForTimeout(1300); await col(p, 0); await p.waitForTimeout(1300); await col(p, 0); await p.waitForTimeout(1300);
    ok(await p.locator('.cn-fill').count() === 6, 'соло: компьютер отвечает на каждый ход');
    const cx = await p.evaluate(() => [...document.querySelectorAll('.cn-fill')].filter(e => e.getAttribute('cx') === '50').length);
    ok(cx >= 4, 'соло, сильный: вертикаль игрока из трёх заблокирована (в столбце 0 фишек: ' + cx + ')');
    await p.close(); }
  // 7. помещение поля
  for (const [w, hh] of [[375, 667], [768, 1024], [1280, 720], [1920, 1080]]) for (const [teams, size] of [[2, 0], [1, 1], [4, 0]]) {
    const p = await mk({ width: w, height: hh }); await open(p, teams, size, 1); await p.waitForTimeout(500);
    const r = await p.locator('.cn-board').boundingBox(), sh = await p.evaluate(() => document.documentElement.scrollHeight), sw = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(r && r.y + r.height <= hh && r.x >= 0 && r.x + r.width <= w && sh <= hh + 1 && sw <= w, `${w}x${hh} ком.${teams} поле ${teams >= 3 || size ? '9x7' : '7x6'}: помещается (${Math.round(r.width)}x${Math.round(r.height)}, низ ${Math.round(r.y + r.height)}/${hh}, scrollH ${sh})`);
    await p.close();
  }
  // 8. тач
  { const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); await open(p, 2, 0, 1);
    const bx = await p.locator('.cn-col').nth(3).boundingBox();
    await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + 10); await p.waitForTimeout(500);
    ok(await p.locator('.cn-disc').count() === 1, 'тач: тап по столбцу бросает фишку');
    ok(bx.width >= 44, 'тач: ширина столбца ' + Math.round(bx.width) + ' px');
    ok((await p.evaluate(() => String(getSelection()))).length === 0 && !errs.length, 'тач: нет выделения и ошибок'); await ctx.close(); }
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
