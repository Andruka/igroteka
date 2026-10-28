// Мафия: правила победы, роли и полный ход игры. node test/mafia.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const file = 'file://' + path.resolve(__dirname, '../index.html');
  await p.goto(file);
  // --- юнит-проверки ---
  const u = await p.evaluate(() => {
    const mk = (...r) => r.map((role, i) => ({ role, alive: true, i }));
    const rolesOk = []; for (let n = 5; n <= 12; n++) for (const sp of [0, 1, 2]) { const r = mfRoles(n, sp), c = k => r.filter(x => x === k).length; rolesOk.push({ n, sp, len: r.length, m: c('mafia'), s: c('sheriff'), d: c('doctor'), civ: c('civ') }); }
    const w1 = mfWinner(mk('mafia', 'civ', 'civ')), w2 = mfWinner(mk('mafia', 'civ')), w3 = mfWinner(mk('civ', 'civ')), w4 = mfWinner(mk('mafia', 'mafia', 'civ', 'civ', 'civ'));
    const p5 = mk('mafia', 'civ', 'civ'); p5[1].alive = false; const w5 = mfWinner(p5);
    const votes = {}; for (let t = 0; t < 3000; t++) { const v = mfPickVictim([1, 1, 2]); votes[v] = (votes[v] || 0) + 1; }
    const tie = {}; for (let t = 0; t < 3000; t++) { const v = mfPickVictim([3, 4]); tie[v] = (tie[v] || 0) + 1; }
    return { rolesOk, w1, w2, w3, w4, w5, votes, tie, none: mfPickVictim([]) };
  });
  ok(u.rolesOk.every(r => r.len === r.n && r.m >= 1 && r.m < r.n / 2 && r.civ >= 2 && (r.sp === 0 ? r.s === 0 && r.d === 0 : r.s === 1) && (r.sp === 2 && r.n >= 6 ? r.d === 1 : r.d === 0)), 'роли: число мафии меньше половины, особые роли по настройке (5–12 игроков)');
  ok(u.w1 === null && u.w2 === 'mafia' && u.w3 === 'town' && u.w4 === null && u.w5 === 'mafia', 'победа: ' + [u.w1, u.w2, u.w3, u.w4, u.w5].join(','));
  ok(u.votes[1] === 3000 && !u.votes[2], 'жертва — самый частый выбор мафии');
  ok(u.tie[3] > 1200 && u.tie[4] > 1200 && u.none === null, 'ничья выбора решается жребием; без выбора жертвы нет');
  // --- сквозные сценарии ---
  const setup = async (n, special) => { await p.goto(file); await p.evaluate(([n, s]) => { store.set('o.mafia.special', s); store.set('o.mafia.reveal', 1); store.set('o.mafia.time', 0); store.set('n.mafia', n); Intro(G.games.find(g => g.id === 'mafia')); }, [n, special]); await p.getByRole('button', { name: 'Играть', exact: true }).click(); };
  const ready = async () => { await p.getByRole('button', { name: 'Я готов' }).click(); };
  const dealAll = async n => { const roles = []; for (let k = 0; k < n; k++) { await ready(); roles.push((await p.locator('.mf-role .big').innerText()).trim()); await p.getByRole('button', { name: /Запомнил/ }).click(); } return roles; };
  const names = n => Array.from({ length: n }, (_, i) => 'Игрок ' + (i + 1));
  const pickBtn = nm => p.locator('.mf-pick', { hasText: new RegExp('^\\s*' + nm + '\\s*') }).first();
  // сценарий A: 6 игроков, доктор спасает жертву, комиссар находит мафию, мирные изгоняют мафию
  await setup(6, 2);
  const rolesA = await dealAll(6); const R = { 'Мафия': 'mafia', 'Комиссар': 'sheriff', 'Доктор': 'doctor', 'Мирный житель': 'civ' };
  const rk = rolesA.map(r => R[r]); ok(rk.filter(x => x === 'mafia').length === 1 && rk.includes('sheriff') && rk.includes('doctor'), 'раздача: 1 мафия, комиссар, доктор: ' + rolesA.join(', '));
  const mafia = rk.indexOf('mafia'), victim = rk.findIndex(x => x === 'civ');
  await p.getByRole('button', { name: 'Начать ночь' }).click();
  let sheriffMsg = '';
  for (let k = 0; k < 6; k++) {
    await ready(); const role = rk[k];
    const tgt = role === 'mafia' ? victim : role === 'sheriff' ? mafia : role === 'doctor' ? victim : (k === 0 ? 1 : 0);
    if (role === 'doctor' || role === 'civ') { /* может быть выбран любой */ }
    await p.locator('.mf-pick').filter({ hasText: 'Игрок ' + (tgt + 1) }).first().click(); await p.getByRole('button', { name: 'Подтвердить' }).click();
    if (role === 'sheriff') sheriffMsg = await p.locator('.card.accent .mid-t').innerText();
    await p.getByRole('button', { name: /передать/i }).click();
  }
  ok(/МАФИЯ/.test(sheriffMsg), 'комиссар узнал мафию: ' + sheriffMsg);
  const morn = await p.locator('.big').first().innerText(); ok(/доктор спас/.test(morn), 'доктор спас жертву: «' + morn + '»');
  await p.getByRole('button', { name: 'К обсуждению' }).click(); await p.getByRole('button', { name: 'К голосованию' }).click();
  await p.locator('.mf-pick').filter({ hasText: 'Игрок ' + (mafia + 1) }).first().click(); await p.getByRole('button', { name: 'Подтвердить' }).click();
  ok(/Мафия/.test(await p.locator('.card .big').first().innerText()), 'изгнанный: роль открыта');
  await p.getByRole('button', { name: 'Итоги' }).click(); ok(/Победа мирных/.test(await p.locator('h1').first().innerText()), 'победа мирных после изгнания мафии');
  ok(await p.locator('.mf-row').count() === 6, 'в итогах показаны роли всех 6 игроков');
  // сценарий B: 5 игроков без особых ролей — мафия убивает каждую ночь и побеждает
  await setup(5, 0); const rolesB = (await dealAll(5)).map(r => R[r]); const mB = rolesB.indexOf('mafia'); ok(rolesB.filter(x => x === 'mafia').length === 1, 'сценарий B: одна мафия');
  let winner = null, nights = 0;
  const alive = Array.from({ length: 5 }, (_, i) => i);
  for (let night = 1; night <= 4 && !winner; night++) {
    nights++; await p.getByRole('button', { name: 'Начать ночь' }).click();
    const victimB = alive.find(i => i !== mB);
    for (const k of alive.slice()) { await ready(); const tgt = rolesB[k] === 'mafia' ? victimB : alive.find(i => i !== k); await p.locator('.mf-pick').filter({ hasText: 'Игрок ' + (tgt + 1) }).first().click(); await p.getByRole('button', { name: 'Подтвердить' }).click(); await p.getByRole('button', { name: /передать/i }).click(); }
    alive.splice(alive.indexOf(victimB), 1);
    const text = await p.locator('.big').first().innerText(); ok(new RegExp('Игрок ' + (victimB + 1) + '»').test(text), 'ночь ' + night + ': убит игрок ' + (victimB + 1));
    const aliveN = alive.length, mafiaWins = 1 >= aliveN - 1;
    if (mafiaWins) { await p.getByRole('button', { name: 'Итоги' }).click(); winner = await p.locator('h1').first().innerText(); break; }
    await p.getByRole('button', { name: 'К обсуждению' }).click(); await p.getByRole('button', { name: 'К голосованию' }).click(); await p.getByRole('button', { name: 'Никого не изгонять' }).click(); await p.getByRole('button', { name: 'Подтвердить' }).click(); await p.getByRole('button', { name: 'Наступает ночь' }).click();
  }
  ok(/Победа мафии/.test(winner || ''), 'сценарий B: мафия победила на ночи ' + nights + ' (' + winner + ')');
  // сценарий C: у мафии 2 игрока — сообщник недоступен для выбора и виден при раздаче
  await setup(7, 1); const rolesC = []; const mates = [];
  for (let k = 0; k < 7; k++) { await ready(); rolesC.push((await p.locator('.mf-role .big').innerText()).trim()); mates.push(await p.locator('.mf-role .mid-t').last().innerText()); await p.getByRole('button', { name: /Запомнил/ }).click(); }
  const mafC = rolesC.map((r, i) => r === 'Мафия' ? i : -1).filter(i => i >= 0); ok(mafC.length === 2, 'при 7 игроках — две мафии');
  ok(mafC.every(i => mates[i].includes('Игрок ' + (mafC.find(j => j !== i) + 1))), 'мафия видит сообщника при раздаче');
  await p.getByRole('button', { name: 'Начать ночь' }).click();
  for (let k = 0; k < mafC[0]; k++) { await ready(); await p.locator('.mf-pick:not([disabled])').first().click(); await p.getByRole('button', { name: 'Подтвердить' }).click(); await p.getByRole('button', { name: /передать/i }).click(); }
  await ready(); const dis = await p.locator('.mf-pick[disabled]').allInnerTexts(); ok(dis.length === 1 && dis[0].includes('Игрок ' + (mafC[1] + 1)), 'экран мафиози: сообщник заблокирован (' + dis.join(',').replace(/\n/g, '') + ')');
  const labels = await p.locator('.mf-pick').count(); ok(labels === 6, 'в списке жертв нет самого игрока (7 − 1): ' + labels);
  console.log(errs.length ? 'ERRORS ' + errs[0] : 'no errors', fail ? 'FAILED ' + fail : 'ALL OK');
  await b.close(); process.exit(fail ? 1 : 0);
})();
