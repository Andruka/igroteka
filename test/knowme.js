// Кто кого знает: партии до конца в обоих режимах, очки, handover (чужой ответ не виден). node test/knowme.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  const open = async (p, teams, mode, rounds) => {
    await p.goto(file);
    await p.evaluate(([n, m, r]) => { store.set('o.knowme.score', m); store.set('o.knowme.rounds', r); store.set('n.knowme', n); Intro(G.games.find(g => g.id === 'knowme')); }, [teams, mode, rounds]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(400);
  };
  const cover = p => p.locator('.cover').count();
  // один раунд: ответчик выбирает ansIdx, k-й угадывающий выбирает pick(k); останавливается на раскрытии
  async function round(p, ansIdx, pick) {
    let k = -1;
    for (let guard = 0; guard < 14; guard++) {
      if (await p.locator('.km-rev').count()) return;
      if (await cover(p)) { await p.locator('.cover .btn').click(); await p.waitForTimeout(60); continue; }
      const opts = p.locator('.km-opt:not(.km-rev)'); if (!(await opts.count())) { await p.waitForTimeout(80); continue; }
      const i = k < 0 ? ansIdx : pick(k); k++;
      await opts.nth(i).click();
      await p.locator('.km-act .btn').click(); await p.waitForTimeout(60);
    }
  }
  const scores = p => p.evaluate(() => [...document.querySelectorAll('.tchip .sc')].map(e => +e.textContent));
  // раскрытие хранит варианты в случайном порядке, поэтому выбираем «верный» по номеру кнопки: ответчик жмёт позицию a, угадавший — ту же позицию
  for (const mode of ['together', 'versus']) for (const teams of [2, 4]) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await open(p, teams, mode, 6);
    ok(await cover(p) === 1 && await p.locator('.km-opt').count() === 0, `${mode}/${teams}: сначала экран передачи без вариантов`);
    let hits = 0, tries = 0;
    for (let r = 0; r < 6; r++) {
      const a = r % 4;
      await round(p, a, k => (r % 2 === 0 && k === 0) ? a : (a + 1 + k) % 4);
      ok(await p.locator('.km-right').count() === 1, `раунд ${r + 1}: подсвечен один верный вариант`);
      ok(await p.locator('.km-chip').count() === teams - 1, `раунд ${r + 1}: в раскрытии видны все догадки`);
      const h = await p.locator('.km-right .km-chip').count();
      hits += h; tries += teams - 1;
      if (r % 2 === 0) ok(h >= 1, `раунд ${r + 1}: первый угадывающий попал`);
      await p.locator('.km-act .btn').click(); await p.waitForTimeout(150);
    }
    ok(await p.locator('h1.big').count() === 1, `${mode}/${teams}: дошли до итогов`);
    const body = await p.locator('body').innerText(), pct = Math.round(hits * 100 / tries);
    ok(body.includes(pct + '%') && body.includes('Угадано ' + hits + ' из ' + tries), `${mode}/${teams}: индекс ${pct}% (${hits}/${tries})`);
    ok(!errs.length, `${mode}/${teams}: без ошибок` + (errs[0] ? ': ' + errs[0] : '')); await p.close();
  }
  // очки за раунд (2 игрока)
  for (const [mode, want] of [['together', [1, 1]], ['versus', [0, 1]]]) {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await open(p, 2, mode, 6);
    await round(p, 2, () => 2); await p.waitForTimeout(500);
    const sc = await scores(p); ok(sc.join() === want.join(), `${mode}: очки после угадывания ${sc} (ожидали ${want})`);
    await p.locator('.km-act .btn').click(); await p.waitForTimeout(100);
    await round(p, 0, () => 1); await p.waitForTimeout(500);
    ok((await scores(p)).join() === sc.join(), `${mode}: промах очков не добавляет`);
    await p.close();
  }
  // handover
  { const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await open(p, 2, 'together', 6);
    await p.locator('.cover .btn').click(); await p.waitForTimeout(80);
    const secret = (await p.locator('.km-opt .km-t').nth(1).innerText()).trim();
    await p.locator('.km-opt').nth(1).click();
    ok(await p.locator('.km-opt[aria-pressed=true]').count() === 1, 'выбранный вариант отмечается');
    await p.locator('.km-act .btn').click(); await p.waitForTimeout(80);
    ok(await cover(p) === 1 && await p.locator('.km-opt').count() === 0, 'между игроками экран передачи без вариантов');
    ok(!(await p.locator('body').innerText()).includes(secret), 'на экране передачи нет ответа первого игрока');
    await p.locator('.cover .btn').click(); await p.waitForTimeout(80);
    ok(await p.locator('.km-opt[aria-pressed=true]').count() === 0, 'у второго игрока ничего не выбрано заранее');
    ok(await p.locator('.km-right, .km-tag').count() === 0, 'у второго игрока нет подсветки верного ответа');
    ok((await p.locator('.km-kick').innerText()).toLowerCase().includes('угадайте'), 'второй игрок видит режим угадывания');
    await p.close(); }
  // банк вопросов
  { const p = await b.newPage(); await p.goto(file);
    const n = await p.evaluate(() => G.games.find(g => g.id === 'knowme').cards());
    ok(n >= 200, 'вопросов в банке: ' + n); await p.close(); }
  // без повторов в партии на 16 раундов
  { const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); await open(p, 2, 'together', 16);
    const seen = new Set(); let dup = false;
    for (let r = 0; r < 16; r++) {
      await p.waitForTimeout(350); await p.locator('.cover .btn').click(); await p.waitForTimeout(60);
      const q = await p.locator('.km-q').innerText(); if (seen.has(q)) dup = true; seen.add(q);
      await round(p, 0, () => 0);
      await p.locator('.km-act .btn').click(); await p.waitForTimeout(80);
    }
    ok(!dup && seen.size === 16, 'вопросы не повторяются за 16 раундов');
    ok(await p.locator('h1.big').count() === 1, '16 раундов: итоги'); await p.close(); }
  // экраны
  for (const [w, h] of [[375, 667], [1280, 720]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); await open(p, 2, 'together', 6);
    await p.locator('.cover .btn').click(); await p.waitForTimeout(150);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    const hs = await p.locator('.km-opt').evaluateAll(es => es.map(e => e.getBoundingClientRect().height));
    ok(sw <= w && hs.length === 4 && hs.every(x => x >= 44), `${w}x${h}: нет горизонтального скролла, тапы >= 44px`);
    await p.close(); }
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
