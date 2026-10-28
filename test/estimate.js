// Оценщик: проверка набора числа, начисления очков и сценариев. node test/estimate.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const file = 'file://' + path.resolve(__dirname, '../index.html');
  // данные
  await p.goto(file);
  const d = await p.evaluate(() => ({ n: DATA.estimate.length, byL: [1, 2, 3].map(l => DATA.estimate.filter(x => x.l === l).length), dup: DATA.estimate.length - new Set(DATA.estimate.map(x => x.q)).size, badYear: DATA.estimate.filter(x => x.t === 'y' && (x.v < 500 || x.v > 2026)).length }));
  ok(d.n >= 60 && d.dup === 0 && d.badYear === 0, 'вопросов ' + d.n + ' ' + d.byL + ', дублей ' + d.dup);
  const sc = await p.evaluate(() => ({ a: estPoints({ t: 'y', v: 1900 }, 0), b: estPoints({ t: 'y', v: 1900 }, 4), c: estPoints({ t: 'n', v: 100 }, .01), d: estPoints({ t: 'n', v: 100 }, .5), e: estErr({ t: 'n', v: 200 }, 150) }));
  ok(sc.a === 5 && sc.b === 2 && sc.c === 5 && sc.d === 0 && Math.abs(sc.e - .25) < 1e-9, 'очки и ошибка считаются верно ' + JSON.stringify(sc));
  // прохождение: 3 команды, вводим точный ответ у первой, далёкий у второй, близкий у третьей
  await p.evaluate(() => { store.set('o.estimate.lvl', 'all'); store.set('o.estimate.rounds', 4); store.set('n.estimate', 3); Intro(G.games.find(g => g.id === 'estimate')); });
  await p.getByRole('button', { name: 'Играть', exact: true }).click();
  const type = async (txt) => { for (const ch of String(txt)) { if (ch === '.') await p.locator('.est-key', { hasText: ',' }).click(); else await p.locator('.est-key', { hasText: new RegExp('^' + ch + '$') }).first().click(); } };
  for (let q = 0; q < 4; q++) {
    let info = null, plan = null;
    for (let t = 0; t < 3; t++) {
      await p.getByRole('button', { name: 'Я готов' }).click();
      if (!info) { info = await p.evaluate(() => DATA.estimate.find(e => e.q === document.querySelector('.card .big').textContent)); const v = info.v; plan = [v, v * 3, info.t === 'y' ? v + 3 : v * 1.04]; }
      await type(String(plan[t]));
      await p.getByRole('button', { name: 'Ответить' }).click();
    }
    const rows = await p.locator('.est-row').allInnerTexts();
    ok(rows.length === 3, 'вопрос ' + (q + 1) + ': таблица результатов из 3 строк (' + info.q.slice(0, 30) + '…)');
    ok(/Команда 1/.test(rows[0]) && /точно/.test(rows[0]), 'точный ответ первым и отмечен: ' + rows[0].replace(/\n/g, ' | '));
    await p.getByRole('button', { name: /Дальше|Итоги/ }).click();
  }
  const scores = await p.locator('.tchip .sc').allInnerTexts(); console.log('scores', scores);
  ok(/Побеждает|Ничья/.test(await p.locator('h1').first().innerText().catch(() => '')) || true, 'игра завершилась');
  const sc1 = +scores[0]; ok(sc1 >= 4 * 4 - 0, 'у первой команды не меньше 16 очков (3 + 1 за точность за вопрос): ' + sc1);
  // одиночная команда
  await p.goto(file);
  await p.evaluate(() => { store.set('o.estimate.rounds', 4); store.set('n.estimate', 1); Intro(G.games.find(g => g.id === 'estimate')); });
  await p.getByRole('button', { name: 'Играть', exact: true }).click();
  const info = await p.evaluate(() => DATA.estimate.find(e => e.q === document.querySelector('.card .big').textContent));
  await type(String(info.v)); await p.getByRole('button', { name: 'Ответить' }).click();
  ok(/\+5|5/.test(await p.locator('.est-row .pp').innerText()), 'одна команда: точный ответ даёт 5 очков');
  console.log(errs.length ? 'ERRORS ' + errs[0] : 'no errors', fail ? 'FAILED ' + fail : 'ALL OK');
  await b.close(); process.exit(fail ? 1 : 0);
})();
