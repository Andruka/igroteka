// Кодовые имена: раскладка, ходы, убийца, победа. node test/codenames.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const file = 'file://' + path.resolve(__dirname, '../index.html');
  await p.goto(file);
  const lay = await p.evaluate(() => { const r = []; for (let t = 0; t < 200; t++) { const k = cnLayout(25, t % 2); r.push({ s: t % 2, a: k.filter(x => x === 'a').length, b: k.filter(x => x === 'b').length, n: k.filter(x => x === 'n').length, x: k.filter(x => x === 'x').length, len: k.length }); } return r; });
  ok(lay.every(l => l.len === 25 && l.x === 1 && l.n === 7 && (l.s === 0 ? l.a === 9 && l.b === 8 : l.b === 9 && l.a === 8)), 'раскладка: 9+8+7+1 убийца, больше слов у начинающей (200 раскладок)');
  const start = async () => { await p.goto(file); await p.evaluate(() => { store.set('o.codenames.time', 0); store.set('n.codenames', 2); Intro(G.games.find(g => g.id === 'codenames')); }); await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(300); };
  const readKey = async () => {
    await p.getByRole('button', { name: 'Карта капитанов' }).click();
    const cells = await p.locator('.veil .cn-cell').evaluateAll(els => els.map(e => ({ w: e.querySelector('span').textContent, k: [...e.classList].find(c => c.startsWith('k-')).slice(2) })));
    await p.getByRole('button', { name: 'Спрятать' }).click(); return cells;
  };
  const cur = async () => (await p.locator('.turnbar .tb-name').innerText()).trim();
  const tap = async w => { await p.locator('button.cn-cell', { hasText: new RegExp('^' + w) }).first().click(); await p.getByRole('button', { name: /^Открыть/ }).click(); };
  // 1. все слова одной команды подряд — победа
  await start(); let key = await readKey(); ok(key.length === 25 && new Set(key.map(c => c.w)).size === 25, 'на поле 25 разных слов');
  let t0 = await cur(); const myK = t0 === 'Команда 1' ? 'a' : 'b', mine = key.filter(c => c.k === myK);
  ok(mine.length === 9, 'у начинающей команды 9 слов (' + t0 + ')');
  for (let i = 0; i < mine.length; i++) { await tap(mine[i].w); if (i < mine.length - 1) ok((await cur()) === t0, 'после верного слова ход остаётся'); }
  ok(/Побеждает/.test(await p.locator('h1').first().innerText()), 'победа после открытия всех слов');
  // 2. нейтральное слово передаёт ход, слово соперника засчитывается им
  await start(); key = await readKey(); t0 = await cur(); const my2 = t0 === 'Команда 1' ? 'a' : 'b', other = my2 === 'a' ? 'b' : 'a';
  const neutral = key.find(c => c.k === 'n'); await tap(neutral.w);
  ok((await cur()) !== t0, 'нейтральное слово: ход перешёл');
  const t1 = await cur(); const oppWord = key.find(c => c.k === (t1 === 'Команда 1' ? 'b' : 'a')); await tap(oppWord.w);
  ok((await cur()) === t0, 'слово соперников: ход перешёл обратно');
  const sc = await p.locator('.tchip .sc').allInnerTexts(); ok(sc.join() === (t0 === 'Команда 1' ? '1,0' : '0,1'), 'слово соперников засчитано им: ' + sc.join());
  // 3. убийца
  await start(); key = await readKey(); t0 = await cur(); const killer = key.find(c => c.k === 'x'); await tap(killer.w);
  const title = await p.locator('h1').first().innerText(); ok(/Побеждает/.test(title) && !title.includes(t0), 'убийца: побеждает другая команда («' + title + '»)');
  // 4. «Закончить ход»
  await start(); t0 = await cur(); await p.getByRole('button', { name: 'Закончить ход' }).click(); ok((await cur()) !== t0, 'кнопка «Закончить ход» передаёт ход');
  // 5. отмена выбора
  await p.locator('button.cn-cell').first().click(); ok(await p.getByRole('button', { name: 'Отмена' }).count() === 1, 'выбор слова показывает «Открыть/Отмена»'); await p.getByRole('button', { name: 'Отмена' }).click();
  ok(await p.locator('.cn-cell.sel').count() === 0, 'отмена снимает выбор');
  console.log(errs.length ? 'ERRORS ' + errs[0] : 'no errors', fail ? 'FAILED ' + fail : 'ALL OK');
  await b.close(); process.exit(fail ? 1 : 0);
})();
