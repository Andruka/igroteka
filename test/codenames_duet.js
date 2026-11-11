// Кодовые имена, режим «Дуэт»: ключи, партии до победы и поражения, handover. node test/codenames_duet.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const file = 'file://' + path.resolve(__dirname, '../index.html');
  await p.goto(file);
  // 0. юнит: генерация ключей
  const bad = await p.evaluate(() => {
    const cnt = (a, v) => a.filter(x => x === v).length, errs = [];
    for (let t = 0; t < 500; t++) {
      const { a, b } = cnDuetKeys(), pr = (x, y) => a.filter((v, i) => v === x && b[i] === y).length;
      if (a.length !== 25 || b.length !== 25) errs.push('len');
      for (const k of [a, b]) if (cnt(k, 'g') !== 9 || cnt(k, 'x') !== 3 || cnt(k, 'n') !== 13) errs.push('counts');
      if (pr('g', 'g') !== 3) errs.push('shared agents');
      const exp = { gn: 5, ng: 5, gx: 1, xg: 1, xx: 1, xn: 1, nx: 1, nn: 7 };
      for (const k in exp) if (pr(k[0], k[1]) !== exp[k]) errs.push('pair ' + k);
      /* убийца одного не может быть общим агентом и т.п.: нет пары ГГ с убийцей */
      if (a.filter((v, i) => (v === 'g' || b[i] === 'g') && (v === 'x' || b[i] === 'x') && !((v === 'g' && b[i] === 'x') || (v === 'x' && b[i] === 'g'))).length) errs.push('inconsistent');
      if (new Set(a.map((v, i) => i)).size !== 25) errs.push('idx');
      if (a.join() === b.join()) errs.push('same keys');
    }
    return [...new Set(errs)];
  });
  ok(bad.length === 0, 'ключи: по 9 агентов, 3 убийцы, 3 общих агента, пересечения как в Duet (500 раскладок)' + (bad.length ? ': ' + bad : ''));
  const start = async (turns) => {
    await p.goto(file);
    await p.evaluate(t => { store.set('o.codenames.mode', 'duet'); store.set('o.codenames.turns', t); store.set('n.codenames', 2); Intro(G.games.find(g => g.id === 'codenames')); }, turns);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(300);
  };
  const tokens = async () => +(await p.locator('.cd-hud b').innerText()).replace(/\D/g, '');
  const readKey = async () => {
    await p.getByRole('button', { name: 'Показать мой ключ' }).click();
    const cells = await p.locator('.cd-key-cell').evaluateAll(els => els.map(e => ({ w: e.querySelector('span').textContent, k: [...e.classList].find(c => c.startsWith('cd-k-')).slice(5), was: e.classList.contains('cd-was') })));
    return cells;
  };
  const hide = async () => { await p.getByRole('button', { name: 'Скрыть' }).click(); await p.getByRole('button', { name: 'Я готов' }).click(); };
  const tap = async w => { await p.locator('button.cd-cell', { hasText: new RegExp('^' + w + '$') }).first().click(); await p.getByRole('button', { name: /^Открыть/ }).click(); };
  const ended = async () => (await p.locator('text=Сыграть ещё раз').count()) > 0;
  // 1. handover
  await start(9);
  ok(await p.locator('.cn-cell').count() === 0 && await p.locator('.cover').count() === 1, 'сначала экран «передайте устройство», ключа нет');
  ok(/Передайте устройство/.test(await p.locator('.cover').innerText()), 'заставка передачи');
  let key = await readKey();
  ok(key.length === 25 && new Set(key.map(c => c.w)).size === 25, 'экран ключа: 25 разных слов');
  ok(key.filter(c => c.k === 'g').length === 9 && key.filter(c => c.k === 'x').length === 3 && key.filter(c => c.k === 'n').length === 13, 'экран ключа: 9 агентов, 3 убийцы, 13 нейтральных');
  ok(await p.locator('.cd-sym').count() === 25, 'у каждой клетки ключа есть значок');
  await p.getByRole('button', { name: 'Скрыть' }).click();
  ok(await p.locator('.cd-key-cell').count() === 0 && await p.locator('[class*="cd-k-"]').count() === 0, 'после «Скрыть» ключ не виден');
  ok(await p.locator('.cover').count() === 1, 'после «Скрыть» — заставка передачи партнёру');
  await p.getByRole('button', { name: 'Я готов' }).click();
  ok(await p.locator('[class*="cd-k-"]').count() === 0 && await p.locator('button.cd-cell').count() === 25, 'у угадывающего нет ключа, 25 кнопок');
  ok((await tokens()) === 9, 'жетонов 9');
  ok(await p.getByRole('button', { name: 'Закончить ход' }).count() === 0, 'нельзя остановиться без попыток');
  // 2. остановка после верного слова: жетон тратится, роли меняются
  const g1 = key.find(c => c.k === 'g'); await tap(g1.w);
  ok(await p.locator('.cd-found').count() === 1, 'агент открыт зелёным');
  await p.getByRole('button', { name: 'Закончить ход' }).click();
  ok(await p.locator('.cover').count() === 1, 'после остановки — передача следующему подсказчику');
  key = await readKey(); ok(key.find(c => c.w === g1.w).was, 'на ключе следующего подсказчика найденный агент помечен');
  await hide(); ok((await tokens()) === 8, 'жетон потрачен: 8');
  // 3. победа: каждый подсказчик открывает все свои оставшиеся агенты
  await start(9);
  let rounds = 0;
  while (!(await ended()) && rounds < 9) {
    key = await readKey(); await hide();
    for (const c of key.filter(c => c.k === 'g' && !c.was)) { if (await ended()) break; await tap(c.w); }
    if (!(await ended())) await p.getByRole('button', { name: 'Закончить ход' }).click();
    rounds++;
  }
  ok(await ended() && /Победа/.test(await p.locator('h1').first().innerText()), 'победа: найдены все 15 агентов за ' + rounds + ' хода');
  ok(/15/.test(await p.locator('.mid-t.muted').first().innerText()), 'итог упоминает 15 агентов');
  // 4. поражение по жетонам (11 ходов: промахи по нейтральным)
  await start(11);
  const used = [new Set(), new Set()]; rounds = 0;
  while (!(await ended()) && rounds < 20) {
    key = await readKey(); await hide();
    ok((await tokens()) === 11 - rounds && (rounds || await p.locator('.cd-tok i').count() === 11), 'жетонов ' + (11 - rounds));
    const n = key.find(c => c.k === 'n' && !used.some(s => s.has(c.w)));
    used[0].add(n.w); await tap(n.w);
    rounds++;
  }
  ok(rounds === 11 && /провален/.test(await p.locator('h1').first().innerText()), 'поражение: жетоны кончились после 11 ходов');
  // 5. поражение от убийцы
  await start(13);
  key = await readKey(); await hide(); await tap(key.find(c => c.k === 'x').w);
  ok(/провален/.test(await p.locator('h1').first().innerText()) && await p.locator('.mid-t.muted').count() > 0, 'убийца: мгновенное поражение');
  // 6. режим «Две команды» остался по умолчанию
  await p.goto(file);
  await p.evaluate(() => { store.set('o.codenames.mode', 'teams'); store.set('n.codenames', 2); Intro(G.games.find(g => g.id === 'codenames')); });
  await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(300);
  ok(await p.getByRole('button', { name: 'Карта капитанов' }).count() === 1, 'режим «Две команды» работает');
  console.log(errs.length ? 'ERRORS ' + errs[0] : 'no errors', fail || errs.length ? 'FAILED ' + fail : 'ALL OK');
  await b.close(); process.exit(fail || errs.length ? 1 : 0);
})();
