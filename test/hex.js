// Гекс: победитель (в т.ч. по краям и диагоналям), правило обмена, компьютер, помещение поля, тач. node test/hex.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  const mk = async (opts = {}, teams = 2, vp = { width: 1280, height: 720 }, ctxo = {}) => {
    const ctx = await b.newContext({ viewport: vp, ...ctxo }); const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
    await p.goto(file);
    await p.evaluate(([o, n]) => { store.set('o.hex.size', o.size || 7); store.set('o.hex.pie', o.pie || 0); store.set('o.hex.ai', o.ai || 'mid'); store.set('n.hex', n); Intro(G.games.find(g => g.id === 'hex')); }, [opts, teams]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(400);
    p.ctx = ctx; return p;
  };
  const cell = (p, r, c) => p.locator(`.hx-b[data-r="${r}"][data-c="${c}"]`);
  const click = async (p, r, c) => { await cell(p, r, c).click({ timeout: 2000 }); await p.waitForTimeout(40); };
  const done = p => p.locator('text=Сыграть ещё раз').count();
  const waitEnd = async (p, ms = 6000) => { for (let t = 0; t < ms; t += 100) { if (await done(p)) return true; await p.waitForTimeout(100); } return false; };
  const overCnt = p => p.locator('.hx-board.hx-over').count();
  // ходы по очереди: нечётные — ● (лево-право, Команда 1), чётные — ◆ (верх-низ, Команда 2)
  const run = async (name, size, seq, who) => {
    const p = await mk({ size }, 2); let early = false;
    for (let i = 0; i < seq.length; i++) { await click(p, ...seq[i]); if (i < seq.length - 1 && await overCnt(p)) { early = true; break; } }
    await p.waitForTimeout(200);
    const over = await overCnt(p), wc = await p.locator('.hx-cell.hx-win').count();
    ok(!early, name + ': нет преждевременной победы');
    if (who) {
      ok(!!over, `${name}: победа определена`);
      ok(wc >= size, `${name}: путь подсвечен (${wc} клеток)`);
      const t = await p.locator('.hx-vs').innerText(); ok(t.includes(who), `${name}: победитель ${who} (${t.replace(/\n/g, ' ')})`);
      ok(await waitEnd(p), `${name}: итоги показаны`);
      const sc = await p.evaluate(() => [...document.querySelectorAll('.prow')].map(e => e.querySelector('.pn').textContent + '=' + e.querySelector('.ps').textContent).join(','));
      ok(sc.includes(who + '=1'), `${name}: очко победителю (${sc})`);
    } else ok(!over, `${name}: победа не объявлена`);
    ok(!p.errs.length, name + ': без ошибок' + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.ctx.close();
  };
  const il = (a, b2) => { const o = []; for (let i = 0; i < Math.max(a.length, b2.length); i++) { if (a[i]) o.push(a[i]); if (b2[i]) o.push(b2[i]); } return o; };
  const row = (r, n) => Array.from({ length: n }, (_, c) => [r, c]), col = (c, n) => Array.from({ length: n }, (_, r) => [r, c]);
  // 1. ● по верхней строке (граничный путь)
  await run('● строка 0 вдоль края', 7, il(row(0, 7), [[6, 0], [6, 2], [6, 4], [6, 6], [5, 0], [5, 2]]), 'Команда 1');
  // 2. ◆ по антидиагонали (r, 6-r): соседство (r+1, c-1)
  await run('◆ антидиагональ (r, 6-r)', 7, il(col(0, 6).concat([[6, 1]]), Array.from({ length: 7 }, (_, r) => [r, 6 - r])), 'Команда 2');
  // 3. ◆ по главной диагонали (r, r): клетки НЕ соседние — победы нет
  await run('◆ главная диагональ (r, r) не соединена', 7, il([[0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 3], [6, 2]], Array.from({ length: 7 }, (_, r) => [r, r])), null);
  // 4. ● по диагонали (6-c, c): от левого до правого края
  await run('● диагональ (6-c, c)', 7, il(Array.from({ length: 7 }, (_, c) => [6 - c, c]), [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]]), 'Команда 1');
  // 5. ◆ по левому краю сверху вниз (граничный столбец), поле 9
  await run('◆ левый край сверху вниз (9x9)', 9, il(col(8, 9), col(0, 9)), 'Команда 2');
  // 6. ● победа в 11x11 по строке 10 (нижний край)
  await run('● нижний край (11x11)', 11, il(row(10, 11), [[0, 0], [0, 2], [0, 4], [0, 6], [0, 8], [2, 0], [2, 3], [2, 6], [2, 9], [4, 4]]), 'Команда 1');
  // 7. случайные партии
  for (const size of [7, 9, 11]) {
    const p = await mk({ size }, 2); let fin = false;
    for (let i = 0; i < size * size && !fin; i++) {
      const e = p.locator('.hx-b:not([disabled])'), n = await e.count(); if (!n) break;
      await e.nth(Math.floor(Math.random() * n)).click({ timeout: 2000 }).catch(() => { }); await p.waitForTimeout(10);
      if (await overCnt(p)) fin = true;
    }
    ok(fin && await waitEnd(p), `случайная партия ${size}x${size}: дошла до победителя`);
    const sum = await p.evaluate(() => [...document.querySelectorAll('.prow .ps')].map(e => +e.textContent).sort().join(','));
    ok(sum === '0,1', `случайная партия ${size}x${size}: ровно одна победа (${sum})`);
    ok(!p.errs.length, 'без ошибок' + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.ctx.close();
  }
  // 8. правило обмена
  { const p = await mk({ size: 7, pie: 1 }, 2);
    ok(await p.locator('.hx-swap:visible').count() === 0, 'обмен: кнопки нет до первого хода');
    await click(p, 3, 3);
    ok(await p.locator('.hx-swap:visible').count() === 1, 'обмен: после первого хода кнопка видна');
    const before = await p.locator('.hx-vs .hx-chip b').allInnerTexts();
    await p.locator('.hx-swap').click(); await p.waitForTimeout(200);
    const after = await p.locator('.hx-vs .hx-chip b').allInnerTexts();
    ok(before[0] === 'Команда 1' && after[0] === 'Команда 2' && after[1] === 'Команда 1', `обмен: стороны поменялись (${before} -> ${after})`);
    ok(await p.locator('.hx-swap:visible').count() === 0, 'обмен: кнопка исчезла');
    ok(await p.locator('.hx-st').count() === 1, 'обмен: камень остался на поле');
    ok((await p.locator('.tb-name').innerText()).includes('Команда 1'), 'обмен: ходит Команда 1 (теперь ◆)');
    await click(p, 0, 0); ok(await p.locator('.hx-st').count() === 2, 'обмен: игра продолжается');
    ok(!p.errs.length, 'обмен: без ошибок'); await p.ctx.close(); }
  { const p = await mk({ size: 7, pie: 1 }, 2); await click(p, 0, 0); await click(p, 1, 1);
    ok(await p.locator('.hx-swap:visible').count() === 0, 'обмен: после обычного хода кнопка скрыта'); await p.ctx.close(); }
  // 9. компьютер: ходит с задержкой, не зависает, все уровни; партия до конца
  for (const ai of ['easy', 'mid', 'hard']) {
    const p = await mk({ size: 7, ai, pie: ai === 'mid' ? 1 : 0 }, 1);
    ok(await p.locator('.hx-vs .hx-chip').count() === 2, `${ai}: плашки сторон`);
    await click(p, 0, 0); const t0 = Date.now(); let n = 1;
    while (Date.now() - t0 < 3000) { n = await p.locator('.hx-st').count(); if (n >= 2) break; await p.waitForTimeout(50); }
    const dt = Date.now() - t0;
    ok(n >= 2 && dt >= 300 && dt < 1500, `${ai}: компьютер ответил ходом за ${dt} мс`);
    let fin = false; const tt = Date.now();
    while (Date.now() - tt < 120000 && !fin) {
      if (await done(p)) { fin = true; break; }
      if (await p.locator('.hx-board.hx-cpu').count()) { await p.waitForTimeout(100); continue; }
      const e = p.locator('.hx-b:not([disabled])'), c = await e.count(); if (!c) { await p.waitForTimeout(100); continue; }
      await e.nth(Math.floor(Math.random() * c)).click({ timeout: 1500 }).catch(() => { }); await p.waitForTimeout(60);
    }
    ok(fin, `${ai}: партия с компьютером дошла до итогов`);
    ok(await p.locator('h1.big').count() === 1, `${ai}: заголовок итогов`);
    ok(!p.errs.length, `${ai}: без ошибок` + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.ctx.close();
  }
  // 10. сильный компьютер завершает цепочку из шести камней и не зависает на 11x11
  { const p = await mk({ size: 11, ai: 'hard' }, 1);
    await click(p, 5, 5); const t0 = Date.now();
    while (Date.now() - t0 < 3000 && await p.locator('.hx-st').count() < 2) await p.waitForTimeout(50);
    const dt = Date.now() - t0; ok(dt < 1500 && await p.locator('.hx-st').count() === 2, `11x11 сильный: ответ за ${dt} мс`);
    const fr = await p.evaluate(() => new Promise(r => { let k = 0, t = performance.now(); const f = () => { k++; if (performance.now() - t > 300) r(k); else requestAnimationFrame(f); }; requestAnimationFrame(f); }));
    ok(fr > 3, 'интерфейс жив');
    ok(!p.errs.length, '11x11: без ошибок'); await p.ctx.close(); }
  // 11. помещение поля
  for (const [w, h] of [[375, 667], [768, 1024], [1280, 720], [1920, 1080]]) for (const size of [7, 11]) for (const [teams, pie] of [[2, 0], [2, 1]]) {
    const p = await mk({ size, pie }, teams, { width: w, height: h });
    await click(p, 0, 0); await p.waitForTimeout(500);
    const r = await p.locator('.hx-board').boundingBox(), sh = await p.evaluate(() => document.documentElement.scrollHeight), sw = await p.evaluate(() => document.documentElement.scrollWidth);
    const bb = await p.locator('.hx-b').first().boundingBox();
    ok(r && r.y + r.height <= h && r.x >= 0 && r.x + r.width <= w && sh <= h + 1 && sw <= w, `${w}x${h} поле ${size}, обмен ${pie}: помещается (${Math.round(r.width)}x${Math.round(r.height)}, низ ${Math.round(r.y + r.height)}/${h}, scrollH ${sh}, клетка ${Math.round(bb.width)}px)`);
    await p.ctx.close();
  }
  // 12. тач
  { const p = await mk({ size: 7 }, 2, { width: 375, height: 667 }, { hasTouch: true, isMobile: true });
    const bb = await cell(p, 3, 3).boundingBox();
    await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(250);
    ok(await p.locator('.hx-st').count() === 1, 'тач: тап ставит камень');
    ok(await p.evaluate(() => String(getSelection()).length) === 0, 'тач: нет выделения');
    ok(bb.width >= 30, 'тач: клетка 7x7 на телефоне ' + Math.round(bb.width) + 'px'); ok(!p.errs.length, 'тач: без ошибок'); await p.ctx.close(); }
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
