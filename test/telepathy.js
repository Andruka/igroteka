// Телепатия: партия до конца, подсчёт совпадений, раскрытие, handover не показывает чужой выбор. node test/telepathy.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  const open = async (p, o, n) => {
    await p.goto(file);
    await p.evaluate(([o, n]) => { for (const k in o) store.set('o.telepathy.' + k, o[k]); store.set('n.telepathy', n); Intro(G.games.find(g => g.id === 'telepathy')); }, [o, n]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(400);
  };
  const mk = async () => { const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); }); return p; };
  const ready = p => p.getByRole('button', { name: 'Я готов', exact: true }).click();

  // 1. юнит: подсчёт совпадений
  { const p = await mk(); await p.goto(file);
    const u = await p.evaluate(() => {
      const T = window.TP, r = [];
      r.push(T.round(['а', 'а'], 'together').full, T.round(['а', 'б'], 'together').full);
      r.push(T.round(['Ёж', 'еж '], 'together').full);
      r.push(JSON.stringify(T.round(['а', 'а', 'б'], 'compete').hit), JSON.stringify(T.round(['а', 'б', 'в'], 'compete').hit), JSON.stringify(T.round(['а', 'а', 'б', 'б'], 'compete').hit));
      r.push(JSON.stringify(T.round(['а', 'а', 'б'], 'together').hit), T.round(['а', 'а', 'б'], 'together').agree);
      r.push([1, 2, 3, 4, 5, 6].map(T.mult).join(','));
      const t = T.topics; r.push(t.length, t.every(x => x.split('|').length === 7), new Set(t.map(x => x.split('|')[0])).size === t.length, t.every(x => new Set(x.split('|').slice(1)).size === 6));
      return r; });
    ok(u[0] === true && u[1] === false, 'юнит: совпадение двух'); ok(u[2] === true, 'юнит: регистр/ё/пробелы не мешают');
    ok(u[3] === '[true,true,false]' && u[4] === '[false,false,false]' && u[5] === '[true,true,true,true]', 'юнит: compete — совпавшие с наибольшей группой');
    ok(u[6] === '[false,false,false]' && u[7] === 0.5, 'юнит: together — не все совпали, agree 0.5');
    ok(u[8] === '1,1,2,2,3,3', 'юнит: множитель серии (' + u[8] + ')');
    ok(u[9] >= 150, 'тем не меньше 150 (' + u[9] + ')'); ok(u[10], 'у каждой темы ровно 6 вариантов'); ok(u[11], 'темы уникальны'); ok(u[12], 'варианты внутри темы уникальны');
    ok(!p.errs.length, 'юнит: без ошибок'); await p.close(); }

  // 2. партия вдвоём «Вместе», все выбирают первый вариант в порядке показа -> 100%; handover без чужого выбора
  for (const [n, R] of [[2, 8], [3, 8], [4, 8]]) {
    const p = await mk(); await open(p, { mode: 'together', rounds: R, custom: 0 }, n);
    let leak = 0, reveals = 0, firstPick = '';
    for (let r = 0; r < R; r++) {
      for (let i = 0; i < n; i++) {
        const cover = await p.locator('.cover').innerText();
        if (i > 0 && firstPick && cover.includes(firstPick)) leak++;
        await ready(p); await p.waitForTimeout(80);
        const topic = await p.locator('.tp-card .big').innerText();
        if (i > 0) { const body = await p.locator('.stage').innerText(); if (firstPick && !body.includes(topic)) leak++; }
        const first = p.locator('.tp-opt').first(); const txt = (await first.innerText()).trim(); if (i === 0) firstPick = txt;
        await first.click(); await p.waitForTimeout(220);
      }
      // раскрытие
      reveals += (await p.locator('.tp-rc').count()) === n ? 1 : 0;
      await p.waitForTimeout(100);
      await p.locator('[data-primary]').click(); await p.waitForTimeout(80);
      firstPick = '';
    }
    ok(reveals === R, `${n} игр.: раскрытие показало ${n} карточек в каждом раунде (${reveals}/${R})`);
    ok(leak === 0, `${n} игр.: handover/экран выбора не показывают чужой выбор`);
    // порядок вариантов разный у игроков? неважно; здесь первые варианты совпадают только если порядок общий
    const title = await p.locator('h1.big').innerText();
    ok(/Телепатия: 100%/.test(title), `${n} игр.: итог «${title}» (ожидалось 100%, порядок общий для раунда)`);
    ok(await p.locator('text=Рекорд').count() > 0, `${n} игр.: рекорд показан`);
    const rec = await p.evaluate(() => Object.values(Records.read()).find(row => row.game === 'telepathy').best); ok(rec === 100, `${n} игр.: рекорд сохранён в store`);
    ok(!p.errs.length, `${n} игр.: без ошибок` + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.close();
  }

  // 3. «Каждый за себя», 3 игрока, разные ответы: очков нет; затем совпадение
  { const p = await mk(); await open(p, { mode: 'compete', rounds: 8, custom: 0 }, 3);
    const total = async () => p.evaluate(() => [...document.querySelectorAll('.tchip .sc')].map(e => +e.textContent));
    for (let r = 0; r < 8; r++) {
      for (let i = 0; i < 3; i++) { await ready(p); await p.waitForTimeout(60); await p.locator('.tp-opt').nth(r % 2 === 0 ? i : 0).click(); await p.waitForTimeout(220); }
      await p.waitForTimeout(80);
      if (r === 0) { const sc = await total(); ok(sc.every(x => x === 0), 'compete: все выбрали разное — очков нет (' + sc + ')'); }
      if (r === 1) { const sc = await total(); ok(sc.every(x => x === 1), 'compete: совпали все — по очку (' + sc + ')'); }
      await p.locator('[data-primary]').click(); await p.waitForTimeout(60);
    }
    ok(await p.locator('.prow').count() === 3, 'compete: итоговый подиум'); ok(!p.errs.length, 'compete: без ошибок' + (p.errs[0] ? ': ' + p.errs[0] : '')); await p.close(); }

  // 4. свой ответ: совпадение по нормализации
  { const p = await mk(); await open(p, { mode: 'together', rounds: 8, custom: 1 }, 2);
    for (let i = 0; i < 2; i++) { await ready(p); await p.waitForTimeout(60); await p.locator('.tp-inp').fill(i ? '  ЁЖИК ' : 'ёжик'); await p.getByRole('button', { name: 'Ответить', exact: true }).click(); await p.waitForTimeout(220); }
    ok(await p.locator('.tp-hit').count() === 2, 'свой ответ: ёжик = ЁЖИК, обе карточки совпали');
    ok(!p.errs.length, 'свой ответ: без ошибок'); await p.close(); }

  // 5. помещение на экране (выбор) на разных размерах
  for (const [w, hh] of [[375, 667], [1280, 720]]) {
    const p = await b.newPage({ viewport: { width: w, height: hh } }); await open(p, { mode: 'together', rounds: 8, custom: 1 }, 2);
    await ready(p); await p.waitForTimeout(300);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    const small = await p.evaluate(() => [...document.querySelectorAll('.tp-opt,.tp-go')].filter(e => e.getBoundingClientRect().height < 44).length);
    ok(sw <= w && small === 0, `${w}x${hh}: без гор. скролла, тапы >=44px`); await p.close();
  }
  await b.close(); console.log(bad ? bad + ' FAIL' : 'ВСЁ ОК'); process.exit(bad ? 1 : 0);
})();
