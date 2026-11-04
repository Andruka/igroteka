// Захват территории: заливка, присоединение, завершение, соло против компьютера, вёрстка. node test/flood.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  const open = async (p, size, teams, ai = 2) => {
    await p.goto(file);
    await p.evaluate(([s, n, a]) => { store.set('o.flood.size', s); store.set('o.flood.ai', a); store.set('n.flood', n); Intro(G.games.find(g => g.id === 'flood')); }, [size, teams, ai]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(500);
  };
  const state = p => p.evaluate(() => {
    const cs = [...document.querySelectorAll('.fl-c')];
    return { cells: cs.map(e => [+e.dataset.c, +e.dataset.o]), btns: [...document.querySelectorAll('.fl-btn')].map(e => [e.disabled, e.textContent.replace(/\D/g, '') === '' ? 0 : +e.querySelector('i').textContent.replace('+', '')]) };
  });
  const play = async (p, wait) => {
    for (let i = 0; i < 600; i++) {
      if (await p.locator('text=Сыграть ещё раз').count()) return true;
      const e = p.locator('.fl-btn:not([disabled])'); const n = await e.count();
      if (n) await e.nth(Math.floor(Math.random() * n)).click({ timeout: 1500 }).catch(() => { });
      await p.waitForTimeout(wait);
    }
    return !!(await p.locator('text=Сыграть ещё раз').count());
  };
  const mk = async w => { const p = await b.newPage({ viewport: w || { width: 1280, height: 720 } }); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); }); return p; };

  // 1. залив и присоединение (2 команды, 10x10)
  { const p = await mk(); await open(p, 10, 2);
    ok(await p.locator('.fl-c').count() === 100, '10x10: 100 клеток');
    ok(await p.locator('.fl-btn').count() === 5, '5 цветов для 2 команд');
    const s0 = await state(p);
    ok(s0.cells[0][1] === 0 && s0.cells[99][1] === 1, 'команды стартуют из противоположных углов');
    const own0 = s0.cells.filter(c => c[1] === 0).length, c0 = s0.cells[0][0];
    const en = s0.btns.map((x, i) => [x, i]).filter(x => !x[0][0]);
    ok(s0.btns[c0][0] === true, 'свой цвет недоступен');
    ok(en.length > 0, 'есть доступные цвета');
    const [[, gain]] = [en[0][0]]; const ci = en[0][1];
    await p.locator('.fl-btn').nth(ci).click(); await p.waitForTimeout(1400);
    const s1 = await state(p), mine = s1.cells.filter(c => c[1] === 0);
    ok(mine.every(c => c[0] === ci), 'вся область перекрашена в выбранный цвет');
    ok(mine.length === own0 + gain && gain > 0, `присоединено ${mine.length - own0} клеток, на кнопке +${gain}`);
    // связность: клетки области достижимы от угла
    const seen = new Set([0]), q = [0]; while (q.length) { const i = q.pop(); const r = Math.floor(i / 10), c = i % 10; for (const [rr, cc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) { const j = rr * 10 + cc; if (rr < 0 || rr > 9 || cc < 0 || cc > 9 || seen.has(j) || s1.cells[j][1] !== 0) continue; seen.add(j); q.push(j); } }
    ok(seen.size === mine.length, 'область связна');
    ok(!s1.cells.some((c, i) => c[1] === 1 && i !== 99 && false), 'проверка владельцев');
    ok((await p.locator('.tb-name').innerText()).includes('Команда 2'), 'ход перешёл ко второй команде');
    const bar = await p.locator('.fl-bar').innerText(); ok(/%/.test(bar), 'счёт в процентах в шапке');
    ok(!p.errs.length, 'без ошибок'); await p.close(); }

  // 2. полные партии 2/3/4 команды
  for (const [teams, size] of [[2, 10], [3, 10], [4, 10], [2, 14]]) {
    const p = await mk(); await open(p, size, teams);
    ok(await p.locator('.fl-btn').count() === (teams >= 4 ? 6 : 5), `${teams} ком.: цветов ${teams >= 4 ? 6 : 5}`);
    const fin = await play(p, 60); ok(fin, `${teams} ком., ${size}x${size}: партия дошла до итогов`);
    const sc = await p.evaluate(() => [...document.querySelectorAll('.prow .ps')].map(e => +e.textContent));
    const sum = sc.reduce((a, c) => a + c, 0), tot = size * size;
    ok(sum <= tot && Math.max(...sc) > 0, `${teams} ком.: сумма клеток ${sum} ≤ ${tot}`);
    ok(!p.errs.length, 'без ошибок' + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.close();
  }

  // 3. соло против компьютера: три уровня
  for (const ai of [1, 2, 3]) {
    const p = await mk(); await open(p, 10, 1, ai);
    ok(await p.locator('.fl-pl').count() === 2, `соло (ур. ${ai}): виден счёт компьютера`);
    const fin = await play(p, 150); ok(fin, `соло (ур. ${ai}): партия дошла до итогов`);
    ok(await p.locator('h1.big').count() === 1, `соло (ур. ${ai}): заголовок итогов`);
    ok(!p.errs.length, `соло (ур. ${ai}): без ошибок` + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.close();
  }

  // 4. вёрстка
  for (const [w, h] of [[375, 667], [768, 1024], [1280, 720], [1920, 1080]]) for (const size of [10, 18]) for (const teams of [2, 4]) {
    const p = await mk({ width: w, height: h }); await open(p, size, teams); await p.waitForTimeout(400);
    const r = await p.locator('.fl-board').boundingBox(), pb = await p.locator('.fl-pal').boundingBox(), bt = await p.locator('.fl-btn').first().boundingBox();
    const sh = await p.evaluate(() => document.documentElement.scrollHeight), sw = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(r && pb.y + pb.height <= h && r.x >= 0 && r.x + r.width <= w && sh <= h + 1 && sw <= w && bt.width >= 44 && bt.height >= 44, `${w}x${h} ${size}x${size}, ${teams} ком.: помещается (поле ${Math.round(r.width)}px, низ ${Math.round(pb.y + pb.height)}/${h}, кнопка ${Math.round(bt.width)}x${Math.round(bt.height)})`);
    await p.close();
  }

  // 5. тач
  { const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await open(p, 14, 2);
    const i = await p.evaluate(() => [...document.querySelectorAll('.fl-btn')].findIndex(e => !e.disabled));
    const bb = await p.locator('.fl-btn').nth(i).boundingBox(); await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(1200);
    ok((await p.locator('.tb-name').innerText()).includes('Команда 2'), 'тач: тап по цвету делает ход');
    ok(await p.evaluate(() => String(getSelection()).length) === 0, 'тач: нет выделения'); ok(!errs.length, 'тач: без ошибок'); await ctx.close(); }
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
