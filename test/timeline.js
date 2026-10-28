// Хронолента: проверка правил вставки и прохождение «оракулом». node test/timeline.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const file = 'file://' + path.resolve(__dirname, '../index.html');
  await p.goto(file);
  const u = await p.evaluate(() => {
    const L = [{ y: 1000 }, { y: 1500 }, { y: 1500 }, { y: 1900 }];
    const r = { a: tlFits(L, 0, 900), b: tlFits(L, 0, 1100), c: tlFits(L, 1, 1200), d: tlFits(L, 1, 1600), e: tlFits(L, 2, 1500), f: tlFits(L, 4, 2000), g: tlFits(L, 4, 1800), h: tlFits(L, 3, 1500) };
    const years = new Map(); const all = [];
    [DATA.before, DATA.beforeHard].forEach(a => a.forEach(x => { all.push([x.a, x.ya], [x.b, x.yb]); })); DATA.timelineExtra.forEach(x => all.push([x.e, x.y]));
    const conflicts = []; all.forEach(([e, y]) => { const k = e.toLowerCase(); if (years.has(k) && years.get(k) !== y) conflicts.push(e); years.set(k, y); });
    return { r, n: years.size, conflicts, bad: all.filter(([e, y]) => !e || !isFinite(y)).length };
  });
  ok(u.r.a && !u.r.b && u.r.c && !u.r.d && u.r.e && u.r.f && !u.r.g && u.r.h, 'правило вставки между соседями и по краям ' + JSON.stringify(u.r));
  ok(u.n >= 150 && u.conflicts.length === 0 && u.bad === 0, 'событий ' + u.n + ', противоречий годов нет ' + u.conflicts.join(';'));
  const yearOf = async txt => p.evaluate(t => { const all = []; [DATA.before, DATA.beforeHard].forEach(a => a.forEach(x => { all.push([x.a, x.ya], [x.b, x.yb]); })); DATA.timelineExtra.forEach(x => all.push([x.e, x.y])); const f = all.find(([e]) => e === t); return f ? f[1] : null; }, txt);
  for (const hard of [0, 1]) {
    await p.goto(file);
    await p.evaluate(h => { store.set('o.timeline.hard', h); store.set('o.timeline.rounds', 8); store.set('n.timeline', 2); Intro(G.games.find(g => g.id === 'timeline')); }, hard);
    await p.getByRole('button', { name: 'Играть', exact: true }).click();
    let good = 0, wrongDetected = 0, total = 0;
    for (let t = 0; t < 16; t++) {
      const card = (await p.locator('.tl-new .big').innerText()).trim();
      const y = await yearOf(card); if (y == null) { ok(false, 'год события не найден: ' + card); break; }
      const ys = await p.locator('.tl-card .tl-y').allInnerTexts();
      const line = ys.map(s => parseInt(s));
      const fits = i => (i === 0 || line[i - 1] <= y) && (i === line.length || y <= line[i]);
      const slots = await p.locator('.btn.slot').count();
      const wantWrong = t % 4 === 3; let idx = -1;
      for (let i = 0; i < slots; i++) if (fits(i) !== wantWrong) { idx = i; break; }
      if (idx < 0) idx = 0;
      await p.locator('.btn.slot').nth(idx).click();
      const msg = await p.locator('.mid-t').first().innerText(); total++;
      if (!wantWrong || fits(idx)) { if (/Верно/.test(msg)) good++; else ok(false, 'ожидалось «Верно»: ' + msg); }
      else { if (/Не туда/.test(msg)) wrongDetected++; else ok(false, 'ожидалось «Не туда»: ' + msg); }
      await p.getByRole('button', { name: /Дальше|Итоги/ }).click();
    }
    ok(good + wrongDetected === total, (hard ? 'трудный' : 'обычный') + ' режим: ' + total + ' ходов, верных ' + good + ', ошибок распознано ' + wrongDetected);
    const years = await p.evaluate(() => 1); // линия после игры недоступна
  }
  console.log(errs.length ? 'ERRORS ' + errs[0] : 'no errors', fail ? 'FAILED ' + fail : 'ALL OK');
  await b.close(); process.exit(fail ? 1 : 0);
})();
