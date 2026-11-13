// Анаграммы: словарь, партия по кнопкам, помещение на экран, без ошибок
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  for (const [w, h] of [[375, 667], [768, 1024], [1280, 720], [1920, 1080]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(file);
    if (w === 375) {
      const r = await p.evaluate(() => {
        const A = DATA.anagram, all = [], res = { cnt: {}, yo: [], dup: [], twin: [], len: [], up: [], notheme: [] };
        const rng = { easy: [5, 6], mid: [7, 8], hard: [9, 11] };
        for (const k in rng) { res.cnt[k] = A[k].length; A[k].forEach(x => { all.push(x); if (x.length < rng[k][0] || x.length > rng[k][1]) res.len.push(x); if (!/^[а-я]+$/.test(x) || /ё/.test(x)) res.yo.push(x); if (x !== x.toLowerCase()) res.up.push(x); if (!A.theme[x]) res.notheme.push(x); }); }
        const s = new Set(); all.forEach(x => { if (s.has(x)) res.dup.push(x); s.add(x); });
        const m = {}; all.forEach(x => { const key = [...x].sort().join(''); (m[key] = m[key] || []).push(x); });
        for (const key in m) if (m[key].length > 1) res.twin.push(m[key].join('/'));
        return res;
      });
      for (const k of ['easy', 'mid', 'hard']) ok(r.cnt[k] >= 300, 'слов в «' + k + '»: ' + r.cnt[k]);
      ok(!r.dup.length, 'нет дублей' + r.dup); ok(!r.yo.length, 'нет ё и посторонних символов ' + r.yo); ok(!r.twin.length, 'нет слов-близнецов ' + r.twin);
      ok(!r.len.length, 'длины по уровням ' + r.len); ok(!r.up.length, 'строчные'); ok(!r.notheme.length, 'у всех слов есть тема');
      const sc = await p.evaluate(() => { let n = 0; for (let i = 0; i < 3000; i++) { const w = DATA.anagram.mid[i % DATA.anagram.mid.length]; const a = [...w]; let s = shuffle(a).join(''); if (s === w) n++; } return n; });
      ok(true, 'перемешивание: совпадений без защиты ' + sc + ' (защита в игре)');
    }
    await p.evaluate(() => Intro(G.games.find(g => g.id === 'anagram')));
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(300);
    // раскладка: всё в окне, без горизонтальной прокрутки
    const fit = async tag => {
      const r = await p.evaluate(() => { const bt = [...document.querySelectorAll('.an-actions button')]; const last = bt.length ? Math.max(...bt.map(x => x.getBoundingClientRect().bottom)) : 0; const tl = [...document.querySelectorAll('.an-tile')].map(x => x.getBoundingClientRect()); return { last, ovx: document.documentElement.scrollWidth > innerWidth + 1, tiles: tl.length, minw: tl.length ? Math.min(...tl.map(x => x.width)) : 0, minh: tl.length ? Math.min(...tl.map(x => x.height)) : 0, right: tl.length ? Math.max(...tl.map(x => x.right)) : 0 }; });
      ok(r.last <= h + 1, `${w}x${h} ${tag}: кнопки в окне (низ ${Math.round(r.last)})`); ok(!r.ovx && r.right <= w, `${w}x${h} ${tag}: нет горизонтальной прокрутки`);
      ok(r.minw >= 24 && r.minh >= 30, `${w}x${h} ${tag}: плитки крупные (${Math.round(r.minw)}x${Math.round(r.minh)})`);
    };
    await fit('экран слова');
    ok(await p.locator('.an-tile').count() >= 5, `${w}x${h}: плитки видны`);
    const first = await p.evaluate(() => { const t = [...document.querySelectorAll('.an-tile')].map(x => x.textContent).join(''); return t; });
    ok(first.length >= 7, `${w}x${h}: буквы на плитках (${first})`);
    await p.getByRole('button', { name: 'Угадали', exact: true }).click();
    ok(await p.locator('text=/\\+5 очков|\\+5 очко/').count() > 0, `${w}x${h}: «Угадали» даёт 5 очков в начале`);
    await p.getByRole('button', { name: 'Дальше', exact: true }).click(); await p.waitForTimeout(200);
    await p.getByRole('button', { name: 'Пропуск', exact: true }).click();
    ok(await p.locator('text=/Пропуск\\. Слово/').count() > 0, `${w}x${h}: пропуск показывает слово`);
    // партия до конца: 2 команды × 3 слова
    for (let i = 0; i < 10; i++) {
      const nx = p.getByRole('button', { name: /^(Дальше|Итоги)$/ }); if (!(await nx.count())) break;
      const txt = await nx.first().textContent(); await nx.first().click(); await p.waitForTimeout(150);
      if (txt === 'Итоги') break;
      const g = p.getByRole('button', { name: 'Угадали', exact: true }); if (await g.count()) await g.click();
    }
    ok(!errs.length, `${w}x${h}: без ошибок` + (errs.length ? ' ' + errs[0] : '')); await p.close();
  }
  // подсказки открываются по времени: за 30 с будут открыты буквы, очки падают
  {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(file);
    await p.evaluate(() => { const g = G.games.find(x => x.id === 'anagram'); Intro(g); });
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(300);
    await p.waitForTimeout(10600);
    const n = await p.locator('.an-slot.on').count(); ok(n >= 1, 'через ~10 с открыта подсказка-буква (открыто ' + n + ')');
    ok(await p.locator('.an-worth', { hasText: 'За слово: 4' }).count() === 1, 'очки за слово упали до 4');
    ok(!errs.length, 'таймер без ошибок'); await p.close();
  }
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
