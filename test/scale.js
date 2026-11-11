// Шкала: юнит подсчёта очков, партии до конца в обоих режимах, перетаскивание стрелки. node test/scale.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  const open = async (p, mode, rounds, teams) => {
    await p.goto(file);
    await p.evaluate(([m, r, n]) => { store.set('o.scale.mode', m); store.set('o.scale.rounds', r); store.set('n.scale', n); Intro(G.games.find(g => g.id === 'scale')); }, [mode, rounds, teams]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(300);
  };
  const click = async (p, name) => { await p.getByRole('button', { name, exact: true }).click(); await p.waitForTimeout(40); };
  // 1. юнит: зоны 4/3/2/0 и границы
  { const p = await b.newPage(); await p.goto(file);
    const r = await p.evaluate(() => [[50, 50], [50, 53], [50, 47], [50, 54], [50, 58], [50, 42], [50, 59], [50, 64], [50, 36], [50, 65], [50, 35], [10, 90], [86, 86]].map(([t, g]) => __scalePts(t, g)));
    ok(JSON.stringify(r) === JSON.stringify([4, 4, 4, 3, 3, 3, 2, 2, 2, 0, 0, 0, 4]), 'подсчёт очков по зонам и границам: ' + r);
    const gm = await p.evaluate(() => { const g = G.games.find(x => x.id === 'scale'); return [g.cards(), g.decks.length]; });
    ok(gm[0] >= 120, 'шкал не меньше 120: ' + gm[0]);
    const uniq = await p.evaluate(() => { const d = G.games.find(x => x.id === 'scale'); return 0; }); await p.close(); }
  // 2. полные партии
  for (const [mode, rounds, teams] of [['coop', 5, 2], ['vs', 5, 2], ['vs', 5, 3], ['coop', 5, 4]]) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await open(p, mode, rounds, teams);
    const seen = [];
    for (let r = 0; r < rounds; r++) {
      await click(p, 'Показать цель');
      const pair = await p.locator('.sc-ends').innerText(); seen.push(pair.replace(/\s+/g, '|'));
      ok(await p.locator('.sc-zone').count() === 3, `${mode}/${teams} р.${r + 1}: у подсказчика видны 3 зоны цели`);
      await click(p, 'Подсказка сказана'); await click(p, 'Поставить стрелку');
      ok(await p.locator('.sc-zone').count() === 0, `${mode}/${teams} р.${r + 1}: у угадывающего цель скрыта`);
      const v0 = +await p.locator('.sc-dial').getAttribute('aria-valuenow');
      await click(p, 'Чуть вправо'); await click(p, 'Сильно вправо');
      const v1 = +await p.locator('.sc-dial').getAttribute('aria-valuenow');
      ok(v1 === v0 + 6, `${mode}/${teams} р.${r + 1}: кнопки двигают стрелку (${v0} -> ${v1})`);
      await click(p, 'Зафиксировать'); await p.waitForTimeout(100);
      ok(await p.locator('.sc-zone').count() === 3 && await p.locator('.sc-res').count() === 1, `${mode}/${teams} р.${r + 1}: цель раскрыта, показан результат`);
      await click(p, r === rounds - 1 ? 'Итоги' : 'Дальше');
    }
    ok(await p.locator('text=Сыграть ещё раз').count() === 1, `${mode}/${teams}: партия дошла до итогов`);
    ok(new Set(seen).size === seen.length, `${mode}/${teams}: шкалы не повторяются`);
    if (mode === 'coop') ok(await p.locator('h1.big').count() === 1 && /Счёт: \d+ из 20/.test(await p.locator('.stack.center').first().innerText()), 'coop: оценка и счёт в итогах');
    else { const sc = await p.evaluate(() => [...document.querySelectorAll('.prow .ps')].map(e => +e.textContent)); ok(sc.every(x => x % 1 === 0) && sc.length === teams, 'vs: очки команд ' + sc); }
    ok(!errs.length, `${mode}/${teams}: без ошибок` + (errs[0] ? ': ' + errs[0] : '')); await p.close();
  }
  // 3. перетаскивание мышью и касанием; границы
  for (const touch of [false, true]) {
    const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, hasTouch: touch, isMobile: touch }); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await open(p, 'coop', 5, 2); await click(p, 'Показать цель'); await click(p, 'Подсказка сказана'); await click(p, 'Поставить стрелку');
    const r = await p.locator('.sc-svg').boundingBox(), k = r.width / 200, cx = r.x + 100 * k, cy = r.y + 104 * k;
    const val = async () => +await p.locator('.sc-dial').getAttribute('aria-valuenow');
    const at = pct => { const a = Math.PI * (1 - pct / 100); return [cx + 70 * k * Math.cos(a), cy - 70 * k * Math.sin(a)]; };
    if (!touch) {
      const [x1, y1] = at(20), [x2, y2] = at(80);
      await p.mouse.move(x1, y1); await p.mouse.down(); await p.mouse.move(x2, y2, { steps: 6 }); await p.mouse.up();
      ok(Math.abs(await val() - 80) <= 2, 'мышь: перетаскивание ставит стрелку на 80 (' + await val() + ')');
      await p.mouse.move(cx - 60 * k, cy + 6 * k); await p.mouse.down(); await p.mouse.up();
      ok(await val() === 0, 'мышь: клик ниже горизонта слева прижимает к 0');
    } else {
      const [x, y] = at(25); await p.touchscreen.tap(x, y); await p.waitForTimeout(100);
      ok(Math.abs(await val() - 25) <= 2, 'тач: касание ставит стрелку на 25 (' + await val() + ')');
    }
    const bt = await p.locator('.sc-step').first().boundingBox(); ok(bt.height >= 44 && bt.width >= 44, 'кнопки шкалы >= 44px');
    ok(await p.evaluate(() => String(getSelection()).length) === 0, 'нет выделения');
    for (let i = 0; i < 25; i++) await p.keyboard.press('Shift+ArrowRight', {});
    await p.locator('.sc-dial').focus(); for (let i = 0; i < 30; i++) await p.keyboard.press('Shift+ArrowRight');
    ok(await val() === 100, 'клавиатура: стрелка не выходит за 100');
    ok(!errs.length, 'drag: без ошибок'); await ctx.close();
  }
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
