// Сапёры: генерация мин, числа, волна нулей, очки, флажки, полная партия (в т.ч. с компьютером), помещение поля. node test/sapper.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  const open = async (p, level, teams) => {
    await p.goto(file);
    await p.evaluate(([s, n]) => { store.set('o.sapper.level', s); store.set('n.sapper', n); Intro(G.games.find(g => g.id === 'sapper')); }, [level, teams]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(500);
  };
  const errsOf = p => { const e = []; p.on('pageerror', x => e.push(x.message)); p.on('console', m => { if (m.type() === 'error') e.push(m.text()); }); return e; };
  const scores = p => p.evaluate(() => [...document.querySelectorAll('.tchip .sc')].map(e => +e.textContent));
  const cell = (p, i) => p.locator(`.sp-c[data-i="${i}"]`);
  const info = p => p.evaluate(() => { const s = window.__sapper; return { N: s.N, M: s.MINES, mine: s.mine.slice(), num: s.num.slice(), st: s.st.slice(), pts: s.pts.slice() }; });

  // 1-3. генерация, числа, волна, очки, флажки (лёгкое поле, 3 команды)
  { const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = errsOf(p);
    await open(p, 'easy', 3);
    ok(await p.locator('.sp-c').count() === 81, 'лёгкое: 81 клетка');
    const first = 4 * 9 + 4; await cell(p, first).click(); await p.waitForTimeout(600);
    let s = await info(p);
    ok(s.mine.filter(Boolean).length === 10, 'мин ровно 10');
    const near = [first]; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) near.push(first + dr * 9 + dc);
    ok(near.every(i => !s.mine[i]), 'первая клетка и соседи без мин');
    let numsOk = true;
    for (let i = 0; i < 81; i++) { const r = (i / 9) | 0, c = i % 9; let k = 0; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr, cc = c + dc; if ((dr || dc) && rr >= 0 && rr < 9 && cc >= 0 && cc < 9 && s.mine[rr * 9 + cc]) k++; } if (k !== s.num[i]) numsOk = false; }
    ok(numsOk, 'числа = количеству мин вокруг');
    const opened = s.st.filter(x => x === 1).length;
    ok(opened > 9, 'волна нулей раскрыла больше 9 клеток (' + opened + ')');
    let domOk = true;
    for (let i = 0; i < 81; i++) if (s.st[i] === 1) { const t = (await cell(p, i).innerText()).trim(); if ((s.num[i] ? String(s.num[i]) : '') !== t) domOk = false; }
    ok(domOk, 'числа на экране совпадают');
    let sc = await scores(p); ok(sc[0] === opened && sc[1] === 0, 'очки за волну = число открытых клеток (' + sc + ')');
    ok((await p.locator('.tb-name').innerText()).includes('Команда 2'), 'ход перешёл ко 2-й команде');
    // 2-я команда подрывается
    const mi = s.mine.indexOf(true); await cell(p, mi).click(); await p.waitForTimeout(100);
    sc = await scores(p); ok(sc[1] === -5, 'мина: -5 очков (' + sc[1] + ')');
    ok(await p.locator('.sp-boom').count() === 1, 'взорванная клетка помечена');
    // 3-я команда: флажок через переключатель на другой мине: +3
    await p.locator('.sp-m', { hasText: 'Флажок' }).click();
    const mi2 = s.mine.indexOf(true, mi + 1); await cell(p, mi2).click(); await p.waitForTimeout(100);
    sc = await scores(p); ok(sc[2] === 3, 'верный флажок: +3 (' + sc[2] + ')');
    ok(await p.locator('.sp-m[aria-pressed=true]', { hasText: 'Открыть' }).count() === 1, 'режим сбросился на «Открыть» после хода');
    // 1-я команда: флажок (правая кнопка) на пустой закрытой клетке: -2
    const safeHidden = s.st.findIndex((x, i) => x === 0 && !s.mine[i]);
    const before = (await scores(p))[0]; await cell(p, safeHidden).click({ button: 'right' }); await p.waitForTimeout(100);
    sc = await scores(p); ok(sc[0] === before - 2, 'неверный флажок: -2 (' + sc[0] + ')');
    ok(await p.locator('.sp-wrong').count() === 1, 'неверный флажок отмечен');
    ok(!errs.length, 'без ошибок' + (errs[0] ? ': ' + errs[0] : '')); await p.close(); }

  // 4. полная партия: 2 команды (случайные клики, часть правой кнопкой) и соло против компьютера
  for (const [lvl, teams] of [['easy', 2], ['easy', 1], ['mid', 4]]) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = errsOf(p);
    await open(p, lvl, teams); const solo = teams === 1; let fin = false;
    if (solo) ok(await p.locator('.sp-vs').count() === 1, 'соло: виден счёт с компьютером');
    for (let i = 0; i < 400 && !fin; i++) {
      if (await p.locator('text=Сыграть ещё раз').count()) { fin = true; break; }
      const e = p.locator('.sp-c:not([disabled])'), n = await e.count();
      if (!n || (solo && await p.locator('.sp-cpu').count())) { await p.waitForTimeout(solo ? 300 : 50); continue; }
      await e.nth(Math.floor(Math.random() * n)).click({ timeout: 1500, button: Math.random() < .2 ? 'right' : 'left' }).catch(() => { });
      await p.waitForTimeout(solo ? 30 : 5);
    }
    ok(fin, `${lvl}, ${teams} ком.: партия дошла до итогов`);
    const s = await info(p);
    ok(s.st.every(x => x !== 0), 'все клетки разрешены');
    ok(s.st.filter(x => x === 2 || x === 3).length === s.M, 'все мины найдены или взорваны');
    if (!solo) { const sum = await p.evaluate(() => [...document.querySelectorAll('.prow .ps')].reduce((a, e) => a + +e.textContent, 0)); ok(sum === s.pts.reduce((a, c) => a + c, 0), 'сумма очков в итогах совпадает с внутренней'); }
    else ok(await p.locator('h1.big').count() === 1, 'соло: заголовок итогов');
    ok(!errs.length, 'без ошибок' + (errs[0] ? ': ' + errs[0] : '')); await p.close();
  }

  // 5. помещение поля и размер клеток
  for (const [w, h] of [[375, 667], [768, 1024], [1280, 720], [1920, 1080]]) for (const lvl of ['easy', 'hard']) for (const teams of [2, 1]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); await open(p, lvl, teams);
    const r = await p.locator('.sp-board').boundingBox(), c = await cell(p, 0).boundingBox();
    const sh = await p.evaluate(() => document.documentElement.scrollHeight), sw = await p.evaluate(() => document.documentElement.scrollWidth);
    const small = w <= 400 && lvl === 'hard';
    ok(r && r.x >= 0 && r.x + r.width <= w && sw <= w && c.width >= 25.5 && (sh <= h + 1 || small && c.width < 27), `${w}x${h} ${lvl}, ${teams} ком.: поле ${Math.round(r.width)}px, клетка ${c.width.toFixed(1)}px, низ ${Math.round(r.y + r.height)}/${h}, scrollH ${sh}`);
    await p.close();
  }
  // 6. тач: тап
  { const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); const errs = errsOf(p);
    await open(p, 'mid', 2);
    const bx = await cell(p, 5 * 12 + 5).boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.waitForTimeout(500);
    ok(await p.locator('.sp-open').count() > 0, 'тач: тап открывает клетку');
    ok(await p.evaluate(() => String(getSelection()).length) === 0, 'тач: нет выделения');
    ok(!errs.length, 'тач: без ошибок'); await ctx.close(); }
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
