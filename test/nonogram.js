// Японские кроссворды: решаемость всех картинок логикой, полная партия, протяжка, отмена, ошибки, подсказка, вёрстка, тач. node test/nonogram.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');

/* ---- решатель: построчная логика (линейное решение до неподвижной точки) ---- */
const runs = a => { const o = []; let k = 0; a.forEach(v => { if (v) k++; else if (k) { o.push(k); k = 0; } }); if (k) o.push(k); return o; };
function lineSolve(cl, line) {
  const n = line.length, poss = [];
  if (!cl.length) return line.some(v => v === 1) ? null : new Array(n).fill(0);
  (function rec(pos, k, cur) {
    if (k === cl.length) { for (let i = pos; i < n; i++) if (line[i] === 1) return; const a = cur.slice(); for (let i = pos; i < n; i++) a[i] = 0; poss.push(a); return; }
    const rest = cl.slice(k + 1).reduce((s, x) => s + x + 1, 0);
    for (let s = pos; s + cl[k] + rest <= n; s++) {
      let ok = true; for (let i = pos; i < s; i++) if (line[i] === 1) { ok = false; break; }
      if (!ok) break;
      for (let i = s; i < s + cl[k]; i++) if (line[i] === 0) { ok = false; break; }
      if (!ok) continue;
      const e = s + cl[k]; if (e < n && line[e] === 1) continue;
      const a = cur.slice(); for (let i = pos; i < s; i++) a[i] = 0; for (let i = s; i < e; i++) a[i] = 1; if (e < n) a[e] = 0;
      rec(Math.min(n, e + 1), k + 1, a);
    }
  })(0, 0, new Array(n).fill(0));
  if (!poss.length) return null;
  return line.map((v, i) => { const s = new Set(poss.map(p => p[i])); return s.size === 1 ? [...s][0] : -1; });
}
function lineSolveAll(N, rc, cc) {
  const grid = new Array(N * N).fill(-1); let ch = true;
  while (ch) {
    ch = false;
    for (let r = 0; r < N; r++) { const l = grid.slice(r * N, r * N + N), x = lineSolve(rc[r], l); if (!x) return null; x.forEach((v, i) => { if (v !== l[i]) { grid[r * N + i] = v; ch = true; } }); }
    for (let c = 0; c < N; c++) { const l = Array.from({ length: N }, (_, r) => grid[r * N + c]), x = lineSolve(cc[c], l); if (!x) return null; x.forEach((v, r) => { if (v !== l[r]) { grid[r * N + c] = v; ch = true; } }); }
  }
  return grid;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  const open = async (p, size, err, ctxOpts) => {
    await p.goto(file);
    await p.evaluate(([s, e]) => { store.set('o.nonogram.size', s); store.set('o.nonogram.err', e); store.set('ng.seen.' + s, []); Intro(G.games.find(g => g.id === 'nonogram')); }, [size, err]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(500);
  };
  const withErrs = async (fn, vp, ctxOpts) => {
    const ctx = await b.newContext({ viewport: vp || { width: 1280, height: 720 }, ...(ctxOpts || {}) }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await fn(p); ok(!errs.length, 'без ошибок в консоли' + (errs[0] ? ': ' + errs[0] : '')); await ctx.close();
  };
  const center = async (p, i) => { const bb = await p.locator('.ng-c').nth(i).boundingBox(); return [bb.x + bb.width / 2, bb.y + bb.height / 2]; };
  const solutionOf = p => p.evaluate(() => {
    const g = G.games.find(x => x.id === 'nonogram');
    const clue = sel => [...document.querySelectorAll(sel)].map(e => [...e.children].map(s => +s.textContent).filter(x => x > 0).join(','));
    const rc = clue('.ng-rc'), cc = clue('.ng-cc'), N = rc.length;
    const runs = a => { const o = []; let k = 0; a.forEach(v => { if (v) k++; else if (k) { o.push(k); k = 0; } }); if (k) o.push(k); return o.join(','); };
    for (const [n, name, rows] of g.puzzles) {
      if (n !== N) continue;
      const m = rows.map(r => [...r].map(c => c !== '.'));
      if (m.every((r, i) => runs(r) === rc[i]) && Array.from({ length: N }, (_, c) => runs(m.map(r => r[c]))).every((s, c) => s === cc[c])) return { name, sol: m.flat() };
    }
    return null;
  });

  // 1. все картинки: размеры, число, решаются логикой без перебора
  { const p = await b.newPage(); await p.goto(file);
    const puz = await p.evaluate(() => G.games.find(x => x.id === 'nonogram').puzzles); const pal = await p.evaluate(() => G.games.find(x => x.id === 'nonogram').palette);
    ok(puz.length >= 30, 'картинок не меньше 30 (' + puz.length + ')');
    for (const s of [5, 8, 10]) ok(puz.filter(x => x[0] === s).length >= 8, `размер ${s}: картинок ${puz.filter(x => x[0] === s).length}`);
    let fails = [], shape = [], names = new Set();
    for (const [N, name, rows] of puz) {
      if (rows.length !== N || rows.some(r => r.length !== N) || rows.some(r => [...r].some(c => c !== '.' && !pal[c]))) shape.push(N + ' ' + name);
      if (!name) shape.push('без подписи ' + N);
      const sol = []; rows.forEach(r => [...r].forEach(c => sol.push(c !== '.' ? 1 : 0)));
      const rc = [], cc = []; for (let r = 0; r < N; r++) rc.push(runs(sol.slice(r * N, r * N + N))); for (let c = 0; c < N; c++) cc.push(runs(sol.filter((_, i) => i % N === c)));
      const g = lineSolveAll(N, rc, cc);
      if (!g || g.some((v, i) => v !== sol[i])) fails.push(N + ' ' + name);
      if (sol.every(v => v === 0)) fails.push('пустая ' + name);
    }
    { /* худший случай для телефона: больше всего чисел у строки/столбца на 10×10 */
      let mr = 0, mc = 0;
      for (const [N, , rows] of puz) if (N === 10) {
        const m = rows.map(r => [...r].map(c => c !== '.'));
        mr = Math.max(mr, ...m.map(r => runs(r).length)); mc = Math.max(mc, ...Array.from({ length: N }, (_, c) => runs(m.map(r => r[c])).length));
      }
      ok((347 - 18) / (10 + mr * .6) >= 26 && mc <= 4, `10×10 на 375px: при ${mr} числах у строки и ${mc} у столбца клетка >= 26px (${((347 - 18) / (10 + mr * .6)).toFixed(1)})`);
    }
    ok(!shape.length, 'форма и палитра всех картинок верны' + (shape.length ? ': ' + shape.join(', ') : ''));
    ok(!fails.length, 'каждая картинка решается логикой по строкам и столбцам, решение единственное' + (fails.length ? ': ' + fails.join(', ') : ''));
    await p.close(); }

  // 2. управление: протяжка, крестик, отмена, ошибки, подсказка
  await withErrs(async p => {
    await open(p, 8, 1);
    const info = await solutionOf(p); ok(!!info, 'головоломка опознана по числам');
    const N = 8;
    ok(await p.locator('.ng-c').count() === 64, '8×8: 64 клетки');
    // протяжка по первой строке: закрашивает все пустые клетки
    const [x0, y0] = await center(p, 0), [x1, y1] = await center(p, 7);
    await p.mouse.move(x0, y0); await p.mouse.down(); await p.mouse.move((x0 + x1) / 2, y0, { steps: 5 }); await p.mouse.move(x1, y1, { steps: 5 }); await p.mouse.up();
    ok(await p.locator('.ng-c.ng-f').count() === 8, 'протяжка закрасила строку (8 клеток)');
    // отмена стирает весь мазок целиком
    await p.getByRole('button', { name: /Отмена/ }).click(); await p.waitForTimeout(50);
    ok(await p.locator('.ng-c.ng-f').count() === 0, 'отмена убрала весь мазок');
    ok(await p.getByRole('button', { name: /Отмена/ }).isDisabled(), 'после отмены кнопка неактивна');
    // крестик
    await p.getByRole('button', { name: /Крестик/ }).click();
    ok(await p.getByRole('button', { name: /Крестик/ }).getAttribute('aria-pressed') === 'true', 'режим «Крестик» включён');
    const [cx, cy] = await center(p, 9); await p.mouse.click(cx, cy);
    ok(await p.locator('.ng-c.ng-x, .ng-c.ng-bad.ng-x').count() === 1, 'крестик ставится');
    await p.mouse.click(cx, cy); ok(await p.locator('.ng-c.ng-x').count() === 0, 'повторное нажатие снимает крестик');
    await p.getByRole('button', { name: /Закрасить/ }).click();
    // ошибка: закрашиваем заведомо пустую клетку
    const emptyIdx = info.sol.findIndex(v => !v), fullIdx = info.sol.findIndex(v => v);
    const [ex, ey] = await center(p, emptyIdx); await p.mouse.click(ex, ey);
    ok(await p.locator('.ng-c.ng-bad').count() === 1, 'лишняя клетка подсвечена как ошибка');
    ok(/Ошибок: 1/.test(await p.locator('.ng-cnt').innerText()), 'счётчик ошибок показан');
    await p.mouse.click(ex, ey); ok(await p.locator('.ng-c.ng-bad').count() === 0, 'повторный клик стирает ошибку');
    // подсказка
    const t0 = await p.locator('.ng-clock').innerText();
    await p.getByRole('button', { name: /Подсказка/ }).click(); await p.waitForTimeout(300);
    ok(await p.locator('.ng-c.ng-lk').count() === 1, 'подсказка открыла одну клетку');
    const tl = await p.locator('.ng-clock').innerText(); const sec = s => { const [m, x] = s.includes(':') ? s.split(':') : [0, s]; return +m * 60 + +x; };
    ok(sec(tl) - sec(t0) >= 29, `штраф к времени (${t0} -> ${tl})`);
    const lk = await p.locator('.ng-c').evaluateAll(a => a.findIndex(e => e.classList.contains('ng-lk')));
    const [lx, ly] = await center(p, lk); await p.mouse.click(lx, ly);
    ok(await p.locator('.ng-c.ng-lk').count() === 1 && info.sol[lk], 'открытую подсказкой клетку нельзя стереть');
    // решаем остальное кликами, смешивая протяжку и клики
    for (let i = 0; i < N * N; i++) {
      if (!info.sol[i]) continue;
      if (await p.locator('.ng-c').nth(i).evaluate(e => e.classList.contains('ng-f'))) continue;
      const [x, y] = await center(p, i); await p.mouse.click(x, y);
    }
    await p.waitForTimeout(300);
    ok(await p.locator('.ng-clock').count() === 1, 'поле ещё на экране до показа результата');
    await p.waitForSelector('text=Сыграть ещё раз', { timeout: 6000 });
    ok(await p.locator('h1.big').innerText().then(t => t.toLowerCase().includes(info.name.toLowerCase())), 'в заголовке итога отгадка «' + info.name + '»');
    ok(await p.locator('.ng-pic').count() === 1 && await p.locator('.ng-pic rect').count() === info.sol.filter(Boolean).length, 'цветная картинка проявилась, клеток столько же, сколько в решении');
    ok(/за \d+:\d\d/.test(await p.locator('p.muted').first().innerText()), 'итог показывает время');
  });

  // 3. «Подсказывать ошибки: нет» не подсвечивает; победа только при верной картинке; решение кликами целой партии на 5 и 10
  for (const size of [5, 10]) await withErrs(async p => {
    await open(p, size, 0);
    const info = await solutionOf(p); const N = size;
    const emptyIdx = info.sol.findIndex(v => !v);
    const [ex, ey] = await center(p, emptyIdx); await p.mouse.click(ex, ey);
    ok(await p.locator('.ng-c.ng-bad').count() === 0, `${size}×${size}: при выключенных подсказках ошибка не подсвечивается`);
    ok(await p.locator('.ng-c.ng-f').count() === 1, `${size}×${size}: клетка всё же закрашена`);
    for (let i = 0; i < N * N; i++) { if (!info.sol[i]) continue; const [x, y] = await center(p, i); await p.mouse.click(x, y); }
    await p.waitForTimeout(500);
    ok(await p.locator('.ng-clock').count() === 1, `${size}×${size}: с лишней клеткой победы нет`);
    await p.mouse.click(ex, ey); await p.waitForTimeout(200);
    // подсвеченные числа: после выполнения строки числа гаснут
    ok(await p.locator('.ng-rc.ng-ok').count() === N && await p.locator('.ng-cc.ng-ok').count() === N, `${size}×${size}: все числа погашены`);
    await p.waitForSelector('text=Сыграть ещё раз', { timeout: 6000 });
    ok(await p.locator('.ng-pic').count() === 1, `${size}×${size}: победа и картинка`);
  });

  // 4. помещение на экране, размеры клеток и читаемость чисел
  await withErrs(async p => {
    for (const [w, h] of [[375, 667], [768, 1024], [1280, 720], [1920, 1080]]) for (const size of [5, 8, 10]) {
      await p.setViewportSize({ width: w, height: h }); await open(p, size, 1); await p.waitForTimeout(300);
      const r = await p.evaluate(() => { const g = document.querySelector('.ng-grid').getBoundingClientRect(), bd = document.querySelector('.ng-board').getBoundingClientRect(), c = document.querySelector('.ng-ctl').getBoundingClientRect(); const bs = [...document.querySelectorAll('.ng-m,.ng-b')].map(e => e.getBoundingClientRect()); const sp = document.querySelector('.ng-rc span'); return { cs: g.width / G_N(), bw: bd.right, bl: bd.left, bb: bd.bottom, cb: c.bottom, sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, minBtn: Math.min(...bs.map(x => x.height)), fs: parseFloat(getComputedStyle(sp).fontSize) }; function G_N() { return document.querySelectorAll('.ng-rc').length; } });
      ok(r.bl >= 0 && r.bw <= w && r.cb <= h && r.sh <= h + 1 && r.sw <= w, `${w}x${h} ${size}×${size}: помещается (клетка ${Math.round(r.cs)}px, низ ${Math.round(r.cb)}/${h}, scrollH ${r.sh})`);
      ok(r.minBtn >= 44, `${w}x${h} ${size}×${size}: кнопки не ниже 44px (${Math.round(r.minBtn)})`);
      if (w === 375 && size === 10) { ok(r.cs >= 26, `375px 10×10: клетка не менее 26px (${r.cs.toFixed(1)})`); ok(r.fs >= 11, `375px 10×10: шрифт чисел не менее 11px (${r.fs})`); }
    }
  });

  // 5. тач: протяжка пальцем, без выделения
  await withErrs(async p => {
    await open(p, 8, 1);
    const info = await solutionOf(p);
    const bb = await p.locator('.ng-c').nth(0).boundingBox(), bb2 = await p.locator('.ng-c').nth(7).boundingBox();
    await p.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.waitForTimeout(100);
    ok(await p.locator('.ng-c.ng-f').count() === 1, 'тач: тап закрашивает клетку');
    // протяжка через CDP-касания
    const cdp = await p.context().newCDPSession(p); const y = bb.y + bb.height * 1.5 + bb.height; // третья строка
    const pt = x => [{ x, y, id: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(bb.x + 4) });
    for (let x = bb.x + 4; x <= bb2.x + bb2.width - 4; x += 6) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(x) });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(150);
    ok(await p.locator('.ng-c.ng-f').count() === 9, 'тач: протяжка пальцем закрасила всю строку (' + await p.locator('.ng-c.ng-f').count() + ' клеток всего)');
    const sel = await p.evaluate(() => String(getSelection()).length); ok(sel === 0, 'тач: нет выделения текста');
  }, { width: 375, height: 667 }, { hasTouch: true, isMobile: true });

  console.log(bad ? 'ПРОВАЛОВ: ' + bad : 'nonogram OK'); await b.close(); process.exit(bad ? 1 : 0);
})();
