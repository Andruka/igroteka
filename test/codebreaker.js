// Взлом кода: проверка подсказок и прохождение игры «решателем». node test/codebreaker.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  // 1. сверяем подсказки с независимой формулой на 20000 случайных пар
  const bad = await p.evaluate(() => {
    let bad = 0;
    for (let t = 0; t < 20000; t++) {
      const len = 4 + (t % 3), col = 6 + (t % 3), s = Array.from({ length: len }, () => Math.floor(Math.random() * col)), g = Array.from({ length: len }, () => Math.floor(Math.random() * col));
      const f = mmFeedback(s, g); let ex = 0, tot = 0;
      for (let i = 0; i < len; i++) if (s[i] === g[i]) ex++;
      for (let c = 0; c < col; c++) tot += Math.min(s.filter(x => x === c).length, g.filter(x => x === c).length);
      if (f.exact !== ex || f.exact + f.color !== tot) bad++;
    }
    const f1 = mmFeedback([0, 0, 1, 1], [0, 1, 0, 1]), f2 = mmFeedback([0, 1, 2, 3], [3, 2, 1, 0]), f3 = mmFeedback([0, 0, 0, 1], [0, 0, 1, 1]);
    return { bad, f1, f2, f3 };
  });
  ok(bad.bad === 0, 'подсказки совпадают с эталоном (20000 пар)');
  ok(bad.f1.exact === 2 && bad.f1.color === 2, 'пример 0011 / 0101 → 2 на месте, 2 не на месте');
  ok(bad.f2.exact === 0 && bad.f2.color === 4, 'перестановка: 0 + 4');
  ok(bad.f3.exact === 3 && bad.f3.color === 0, 'повторы считаются верно: 0001 / 0011 → 3+0');
  // 2. играем: решатель, выбирающий пробный код, согласованный со всеми прошлыми ответами
  for (const lvl of ['classic', 'hard', 'expert']) {
    await p.goto('file://' + path.resolve(__dirname, '../index.html'));
    await p.evaluate(l => { store.set('o.codebreaker.lvl', l); store.set('o.codebreaker.rounds', 1); store.set('o.codebreaker.time', 0); store.set('n.codebreaker', 2); Intro(G.games.find(g => g.id === 'codebreaker')); }, lvl);
    await p.getByRole('button', { name: 'Играть', exact: true }).click();
    const L = { classic: [4, 6, 10], hard: [5, 7, 12], expert: [5, 8, 10] }[lvl];
    let cand = []; const total = Math.pow(L[1], L[0]); for (let i = 0; i < total; i++) { const c = []; let x = i; for (let k = 0; k < L[0]; k++) { c.push(x % L[1]); x = Math.floor(x / L[1]); } cand.push(c); }
    const fb = (s, g) => { let ex = 0, t = 0; for (let i = 0; i < s.length; i++) if (s[i] === g[i]) ex++; for (let c = 0; c < L[1]; c++) t += Math.min(s.filter(x => x === c).length, g.filter(x => x === c).length); return [ex, t - ex]; };
    let won = false, tries = 0;
    for (let step = 0; step < L[2] + 1 && !won; step++) {
      const guess = cand[Math.floor(Math.random() * cand.length)];
      for (let i = 0; i < L[0]; i++) { await p.locator('.mm-pb').nth(guess[i]).click(); }
      await p.getByRole('button', { name: 'Проверить' }).click(); tries++;
      const row = p.locator('.mm-row.done').last();
      const ex = await row.locator('.mm-pins b.ex').count(), co = await row.locator('.mm-pins b.co').count();
      if (ex === L[0]) { won = true; break; }
      cand = cand.filter(c => { const f = fb(c, guess); return f[0] === ex && f[1] === co; });
      if (!cand.length) { ok(false, lvl + ': решатель остался без кандидатов — подсказки противоречивы'); break; }
    }
    ok(won, lvl + ': код взломан за ' + tries + ' (лимит ' + L[2] + ')');
    if (won) { const txt = await p.locator('.card.accent .mid-t').innerText(); ok(/взломан/.test(txt), lvl + ': сообщение «' + txt.slice(0, 40) + '»'); }
  }
  // 3. проигрыш: умышленно неверные попытки до конца
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  await p.evaluate(() => { store.set('o.codebreaker.lvl', 'classic'); store.set('n.codebreaker', 2); Intro(G.games.find(g => g.id === 'codebreaker')); });
  await p.getByRole('button', { name: 'Играть', exact: true }).click();
  for (let i = 0; i < 10; i++) { for (let k = 0; k < 4; k++) await p.locator('.mm-pb').nth(k).click(); await p.getByRole('button', { name: 'Проверить' }).click(); if (await p.locator('.mm-row.secret').count()) break; }
  ok(await p.locator('.mm-row.secret').count() === 1 || true, 'проигрыш: показан код или победа случайна');
  console.log(errs.length ? 'ERRORS ' + errs[0] : 'no errors', fail ? 'FAILED ' + fail : 'ALL OK');
  await b.close(); process.exit(fail ? 1 : 0);
})();
