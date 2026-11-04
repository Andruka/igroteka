// Реверси: правила (перевороты, пропуск хода, конец), партии до конца, компьютер, помещение поля, тач. node test/reversi.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  const newPage = async (vp, ctxOpts) => {
    const ctx = await b.newContext({ viewport: vp, ...(ctxOpts || {}) }); const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); }); return p;
  };
  const open = async (p, size, teams, level) => {
    await p.goto(file);
    await p.evaluate(([s, n, l]) => { store.set('o.reversi.size', s); store.set('o.reversi.level', l); store.set('n.reversi', n); Intro(G.games.find(g => g.id === 'reversi')); }, [size, teams, level || 2]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(500);
  };
  const rv = (p, fn, arg) => p.evaluate(([f, a]) => { const r = document.querySelector('.rv-wrap').__rv; return (new Function('r', 'a', 'return (' + f + ')(r,a)'))(r, a); }, [fn.toString(), arg]);
  const domBoard = p => p.evaluate(() => [...document.querySelectorAll('.rv-disc')].map(d => d.classList.contains('rv-has') ? +d.dataset.s : -1));
  const finished = p => p.locator('text=Сыграть ещё раз').count();
  const playOut = async (p, maxMs, probe) => {
    const t0 = Date.now();
    while (Date.now() - t0 < maxMs) {
      if (await finished(p)) return true;
      if (probe) await probe().catch(() => { });
      const e = p.locator('.rv-cell.rv-ok'); const n = await e.count();
      if (n) await e.nth(Math.floor(Math.random() * n)).click({ timeout: 1500 }).catch(() => { });
      await p.waitForTimeout(150);
    }
    return !!(await finished(p));
  };

  // 1. начальная позиция и правила ходов 8x8
  { const p = await newPage({ width: 1280, height: 720 }); await open(p, 8, 2);
    ok(await p.locator('.rv-cell').count() === 64, '8x8: 64 клетки');
    const init = await rv(p, r => r.board);
    ok(init.filter(v => v === 0).length === 2 && init.filter(v => v === 1).length === 2 && init[27] === 1 && init[36] === 1 && init[28] === 0 && init[35] === 0, 'начальная расстановка 2+2 по центру');
    const mv = await rv(p, r => r.movesOf(r.board, 0));
    ok(JSON.stringify(mv) === '[19,26,37,44]', 'у чёрных 4 первых хода: ' + mv);
    ok(await p.locator('.rv-cell.rv-ok').count() === 4, 'подсвечены ровно 4 допустимых хода');
    ok(await p.locator('.rv-cell:not(.rv-ok)').first().isDisabled(), 'недопустимая клетка недоступна');
    await p.locator('.rv-cell').nth(19).click(); await p.waitForTimeout(1200);
    const b1 = await rv(p, r => r.board), d1 = await domBoard(p);
    ok(b1[19] === 0 && b1[27] === 0 && b1[28] === 0 && b1[35] === 0 && b1[36] === 1, 'ход на 19 перевернул только 27');
    ok(JSON.stringify(b1) === JSON.stringify(d1), 'DOM-поле совпадает с моделью (с фишками разных цветов)');
    ok(await rv(p, r => r.cur) === 1, 'ход перешёл к белым');
    const wm = await rv(p, r => r.movesOf(r.board, 1));
    ok(JSON.stringify(wm) === '[18,20,34]', 'у белых ходы 18,20,34: ' + wm);
    const sc = await p.locator('.rv-chip b').allInnerTexts(); ok(sc.join() === '4,1', 'счёт 4:1 (' + sc + ')');
    ok(await p.locator('.rv-f0').count() === 64 && await p.locator('.rv-f1').count() === 64, 'у фишек две грани (чёрная с точкой, белая с кольцом)');
    ok(!p.errs.length, 'без ошибок' + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.context().close(); }

  // 2. переворот в нескольких направлениях сразу и неперекрытые линии (6x6)
  { const p = await newPage({ width: 1280, height: 720 }); await open(p, 6, 2);
    const E = -1, B = 0, Wt = 1;
    // чёрный ставит на (2,2)=14: вправо W(2,3) B(2,4); вниз W(3,2) B(4,2); вниз-вправо W(3,3) B(4,4); влево W(2,1) пусто -> не переворачивается
    const bd = Array(36).fill(E); const S = (r, c, v) => bd[r * 6 + c] = v;
    S(2, 3, Wt); S(2, 4, B); S(3, 2, Wt); S(4, 2, B); S(3, 3, Wt); S(4, 4, B); S(2, 1, Wt); S(0, 5, Wt);
    const f = await rv(p, (r, a) => r.flipsAt(a, 14, 0).sort((x, y) => x - y), bd);
    ok(JSON.stringify(f) === JSON.stringify([15, 20, 21]), 'ход охватывает 3 направления: ' + f);
    ok((await rv(p, (r, a) => r.flipsAt(a, 14, 1), bd)).length === 0, 'белым на (2,2) ходить нельзя');
    await rv(p, (r, a) => r.load(a[0], 0), [bd]); await p.waitForTimeout(100);
    await p.locator('.rv-cell').nth(14).click(); await p.waitForTimeout(1500);
    const after = await rv(p, r => r.board);
    const exp = bd.slice(); [14, 15, 20, 21].forEach(i => exp[i] = 0);
    ok(JSON.stringify(after) === JSON.stringify(exp), 'перевернуты ровно фишки на линиях, лишнее не тронуто');
    ok(after[13] === 1 && after[5] === 1, 'фишки вне зажатых рядов остались белыми');
    ok(JSON.stringify(await domBoard(p)) === JSON.stringify(after), 'DOM совпадает с моделью');
    // зажатие без своей фишки на конце не считается
    const bd2 = Array(36).fill(E); bd2[1] = Wt; bd2[2] = Wt;
    ok((await rv(p, (r, a) => r.flipsAt(a, 0, 0), bd2)).length === 0, 'ряд белых без чёрной фишки на конце не зажат');
    ok(!p.errs.length, 'без ошибок'); await p.context().close(); }

  // 3. пропуск хода и конец игры
  { const p = await newPage({ width: 1280, height: 720 }); await open(p, 6, 2);
    const bd = Array(36).fill(-1); bd[0] = 0; bd[1] = 1; bd[30] = 1; bd[22] = 1; bd[23] = 0; // B(0,0) W(0,1) W(5,0) W(3,4) B(3,5)
    await rv(p, (r, a) => r.load(a, 0), bd); await p.waitForTimeout(100);
    ok(JSON.stringify(await rv(p, r => r.movesOf(r.board, 0))) === '[2,21]', 'у чёрных два хода: (0,2) и (3,3)');
    await p.locator('.rv-cell').nth(2).click(); await p.waitForTimeout(700);
    const m = await p.locator('.rv-msg').innerText();
    ok(/пропускает ход/.test(m) && /Белые|белые/.test(m), 'сообщение о пропуске хода белых: «' + m + '»');
    await p.waitForTimeout(2200);
    ok(await rv(p, r => r.cur) === 0, 'после пропуска снова ходят чёрные');
    ok((await p.locator('.tb-name').innerText()).includes('Команда 1'), 'в панели хода снова команда 1');
    ok(await p.locator('.rv-cell.rv-ok').count() === 1, 'доступен единственный ход');
    await p.locator('.rv-cell').nth(21).click();
    let fin = false; for (let i = 0; i < 40 && !fin; i++) { await p.waitForTimeout(300); fin = !!(await finished(p)); }
    ok(fin, 'когда ходов нет ни у кого, игра закончилась (итоги)');
    const sum = await p.evaluate(() => [...document.querySelectorAll('.prow .ps')].map(e => +e.textContent));
    ok(sum.length === 2 && sum[0] === 1 && sum[1] === 0 || sum[0] + sum[1] === 1, 'победителю засчитано очко (' + sum + ')');
    ok(!p.errs.length, 'без ошибок' + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.context().close(); }

  // 4. полные партии: 2 команды 8x8 и 6x6, фишки на поле сходятся со счётом
  for (const size of [6, 8]) {
    const p = await newPage({ width: 1280, height: 720 }); await open(p, size, 2);
    let mism = 0, seen = 0;
    const fin = await playOut(p, 120000, async () => {
      const d = await domBoard(p), ch = (await p.locator('.rv-chip b').allInnerTexts()).map(Number);
      if (ch.length !== 2) return; seen++;
      /* счёт обновляется сразу при ходе, фишки — тоже: расхождение допустимо только мгновенно, поэтому сверяем модель */
      const m = await rv(p, r => r.board); if (JSON.stringify(m) !== JSON.stringify(d)) mism++;
      if (ch[0] + ch[1] !== m.filter(v => v >= 0).length) mism++;
    });
    ok(fin, `${size}x${size}, 2 команды: партия дошла до итогов`);
    ok(seen > 10 && mism === 0, `${size}x${size}: счёт и DOM совпадают с моделью на протяжении партии (${seen} проверок, расхождений ${mism})`);
    ok(!p.errs.length, 'без ошибок' + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.context().close();
  }

  // 5. соло против компьютера на всех уровнях (6x6) + сильный на 8x8: ход компьютера не мгновенный и не долгий
  for (const lv of [1, 2, 3]) {
    const p = await newPage({ width: 1280, height: 720 }); await open(p, 6, 1, lv);
    ok(await p.locator('.rv-chip').count() === 2, `соло, уровень ${lv}: счёт видны`);
    const fin = await playOut(p, 120000); ok(fin, `соло, уровень ${lv}: партия дошла до итогов`);
    ok(await p.locator('h1.big').count() === 1, `соло, уровень ${lv}: заголовок итогов`);
    ok(!p.errs.length, 'без ошибок' + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.context().close();
  }
  { const p = await newPage({ width: 1280, height: 720 }); await open(p, 8, 1, 3);
    await p.locator('.rv-cell.rv-ok').first().click();
    const t0 = Date.now(); let moved = false;
    while (Date.now() - t0 < 6000) { if (await rv(p, r => r.cur) === 0 && (await rv(p, r => r.board)).filter(v => v >= 0).length === 6) { moved = true; break; } await p.waitForTimeout(25); }
    const dt = Date.now() - t0;
    ok(moved && dt >= 350 && dt < 3000, `сильный компьютер 8x8 ходит за ${dt} мс`);
    ok(!p.errs.length, 'без ошибок'); await p.context().close(); }
  // компьютер не ходит за игрока: клик в соло во время хода компьютера игнорируется
  { const p = await newPage({ width: 1280, height: 720 }); await open(p, 6, 1, 2);
    await p.locator('.rv-cell.rv-ok').first().click(); await p.waitForTimeout(100);
    ok(await p.locator('.rv-cell.rv-ok').count() === 0, 'во время хода компьютера подсветки нет');
    await p.context().close(); }

  // 6. помещение поля на разных экранах
  for (const [w, h] of [[375, 667], [768, 1024], [1280, 720], [1920, 1080]]) for (const size of [6, 8]) for (const teams of [2, 1]) {
    const p = await newPage({ width: w, height: h }); await open(p, size, teams); await p.waitForTimeout(500);
    const r = await p.locator('.rv-board').boundingBox(), sh = await p.evaluate(() => document.documentElement.scrollHeight), sw = await p.evaluate(() => document.documentElement.scrollWidth);
    const cell = await p.locator('.rv-cell').first().boundingBox();
    ok(r && r.y + r.height <= h && r.x >= 0 && r.x + r.width <= w && sh <= h + 1 && sw <= w, `${w}x${h} поле ${size}x${size}, ${teams} ком.: помещается (${Math.round(r.width)}px, клетка ${Math.round(cell.width)}px, низ ${Math.round(r.y + r.height)}/${h}, scrollH ${sh})`);
    if (w === 375 && size === 8) ok(cell.width >= 38, 'телефон 8x8: клетка достаточно крупная для пальца (' + Math.round(cell.width) + 'px)');
    await p.context().close();
  }

  // 7. тач: тап по клетке и отсутствие выделения
  { const p = await newPage({ width: 375, height: 667 }, { hasTouch: true, isMobile: true }); await open(p, 8, 2);
    const box = await p.locator('.rv-cell').nth(19).boundingBox();
    await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(1000);
    ok((await rv(p, r => r.board))[19] === 0, 'тач: тап по подсвеченной клетке ставит фишку');
    ok(await p.evaluate(() => String(getSelection()).length) === 0, 'тач: нет выделения');
    ok(!p.errs.length, 'тач: без ошибок'); await p.context().close(); }

  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
