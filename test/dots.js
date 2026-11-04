// Точки и квадраты: полная партия кликами, помещение поля, тач, соло против компьютера. node test/dots.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  const open = async (p, size, teams) => {
    await p.goto(file);
    await p.evaluate(([s, n]) => { store.set('o.dots.size', s); store.set('n.dots', n); Intro(G.games.find(g => g.id === 'dots')); }, [size, teams]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(500);
  };
  const play = async (p, mk) => { /* кликает любую свободную линию, пока не появятся итоги */
    for (let i = 0; i < 200; i++) {
      if (await p.locator('text=Сыграть ещё раз').count()) return true;
      const e = p.locator('.dt-e:not([disabled])');
      const n = await e.count(); if (!n) { await p.waitForTimeout(200); continue; }
      await (mk ? mk(e.nth(Math.floor(Math.random() * n))) : e.nth(Math.floor(Math.random() * n)).click({ timeout: 1500 }).catch(() => { }));
      await p.waitForTimeout(solo ? 900 : 10);
    }
    return !!(await p.locator('text=Сыграть ещё раз').count());
  };
  let solo = false;
  // 1. полная партия на 4x4, 2 и 3 команды
  for (const teams of [2, 3]) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await open(p, 4, teams); solo = false;
    ok(await p.locator('.dt-e').count() === 24, `4x4 (${teams} ком.): 24 линии`);
    const fin = await play(p);
    ok(fin, `4x4 (${teams} ком.): партия дошла до итогов`);
    const sum = await p.evaluate(() => [...document.querySelectorAll('.prow .ps')].reduce((s, e) => s + +e.textContent, 0));
    ok(sum === 9, `4x4 (${teams} ком.): всего 9 квадратов (получено ${sum})`);
    ok(!errs.length, 'без ошибок' + (errs[0] ? ': ' + errs[0] : '')); await p.close();
  }
  // 2. соло против компьютера
  { const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await open(p, 4, 1); solo = true;
    ok(await p.locator('.dt-vs').count() === 1, 'соло: виден счёт с компьютером');
    const fin = await play(p);
    ok(fin, 'соло: партия дошла до итогов (ходы компьютера, нет зависаний)');
    ok(await p.locator('h1.big').count() === 1, 'соло: заголовок итогов');
    ok(!errs.length, 'соло: без ошибок' + (errs[0] ? ': ' + errs[0] : '')); await p.close(); solo = false; }
  // 3. помещение поля на 3+ размерах экрана
  for (const [w, h] of [[375, 667], [768, 1024], [1280, 720], [1920, 1080]]) for (const size of [4, 6]) for (const teams of [2, 1]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); await open(p, size, teams); await p.waitForTimeout(500);
    const r = await p.locator('.dt-board').boundingBox(), sh = await p.evaluate(() => document.documentElement.scrollHeight), sw = await p.evaluate(() => document.documentElement.scrollWidth);
    ok(r && r.y + r.height <= h && r.x >= 0 && r.x + r.width <= w && sh <= h + 1 && sw <= w, `${w}x${h} поле ${size}x${size}, ${teams} ком.: помещается (${Math.round(r.width)}px, низ ${Math.round(r.y + r.height)}/${h}, scrollH ${sh})`);
    await p.close();
  }
  // 4. тач-эмуляция: тап по линии, без выделения
  { const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); await open(p, 5, 2);
    const box = await p.locator('.dt-e.h').nth(5).boundingBox();
    await p.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(300);
    ok(await p.locator('.dt-line').count() === 1, 'тач: тап по зоне линии проводит линию');
    const b2 = await p.locator('.dt-e.v').nth(7).boundingBox();
    await p.touchscreen.tap(b2.x + b2.width / 2, b2.y + 4); await p.waitForTimeout(300); // у края зоны
    ok(await p.locator('.dt-line').count() === 2, 'тач: тап у края зоны тоже работает');
    ok(box.height >= 24 && b2.width >= 24, `тач: размеры зон ${Math.round(box.height)}x${Math.round(box.width)} px`);
    const sel = await p.evaluate(() => String(getSelection()).length); ok(sel === 0, 'тач: нет выделения');
    ok(!errs.length, 'тач: без ошибок'); await ctx.close(); }
  // 5. логика замыкания: бонусный ход и счёт
  { const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await open(p, 4, 2);
    const click = async s => { await p.locator(s).click(); await p.waitForTimeout(30); };
    // первая клетка: h(0,0)[0], v(0,0)[0], h(1,0)[4]... индексы кнопок: h r*3+c ; v 12 + r*4 + c
    const idx = i => p.locator('.dt-e').nth(i).click();
    await idx(0); await idx(12); await idx(3); await idx(13); // команды чередуются: 1,2,1,2 -> четыре стороны клетки (0,0): h0, v(0,0)=12, h(1,0)=3, v(0,1)=13
    await p.waitForTimeout(300);
    ok(await p.locator('.dt-box').count() === 1, 'клетка замкнута и закрашена');
    const sc = await p.evaluate(() => [...document.querySelectorAll('.tchip .sc')].map(e => +e.textContent));
    ok(sc[1] === 1 && sc[0] === 0, 'очко у замкнувшей команды (' + sc + ')');
    ok((await p.locator('.tb-name').innerText()).includes('Команда 2'), 'после квадрата та же команда ходит снова');
    await p.close(); }
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
