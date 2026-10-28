// Уровни сложности: проверка данных и запуск игр на каждом уровне. node test/levels.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1100, height: 800 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
  const file = 'file://' + path.resolve(__dirname, '../index.html');
  await p.goto(file);
  const d = await p.evaluate(() => {
    const r = {};
    const q = DATA.quiz; r.quizN = q.length; r.byL = [1, 2, 3, 4, 5].map(l => q.filter(x => x.l === l).length);
    r.badOpts = q.filter(x => new Set(x.a.map(s => s.trim().toLowerCase())).size !== 4 || x.a.some(s => !s || s.length > 120)).map(x => x.q);
    const seenQ = {}; r.dupQ = []; q.forEach(x => { const k = x.q.toLowerCase(); if (seenQ[k]) r.dupQ.push(x.q); seenQ[k] = 1; });
    r.catLv = []; DATA.quizCats.forEach(c => [1, 2, 3, 4, 5].forEach(l => { const n = q.filter(x => x.c === c.id && x.l === l).length; if (n < 6) r.catLv.push(c.id + l + ':' + n); }));
    r.jh = DATA.jeopardyHard.map(t => t.q.length).every(n => n === 5) && DATA.jeopardyHard.length;
    r.jhBad = DATA.jeopardyHard.flatMap(t => t.q.filter(x => !x[1] || !x[2]).map(x => t.t));
    r.odd = DATA.oddHard.length; r.oddBad = DATA.oddHard.filter(o => o.ok.length !== 3 || new Set([...o.ok, o.odd]).size !== 4 || !o.why).map(o => o.odd);
    r.bef = DATA.beforeHard.length; r.hl = DATA.hlHard.length; r.hlBad = DATA.hlHard.filter(x => x.va === x.vb || !x.u && x.u !== '' || !x.q).length;
    r.cl = DATA.cluesHard.length; r.clBad = DATA.cluesHard.filter(c => c.c.length !== 5 || !c.a).map(c => c.a);
    r.wh = Object.values(DATA.whoamiHard).join(',').split(',').length;
    return r;
  });
  console.log(JSON.stringify(d.byL), 'квиз', d.quizN);
  ok(d.byL.every(n => n >= 100), 'вопросов на каждом из 5 уровней не меньше 100: ' + d.byL.join('/'));
  ok(d.badOpts.length === 0, 'у вопросов 4 разных непустых варианта ' + d.badOpts.slice(0, 3));
  ok(d.dupQ.length <= 12, 'повторов формулировок: ' + d.dupQ.length + ' ' + d.dupQ.slice(0, 5).join(' | '));
  ok(d.catLv.length === 0, 'в каждой теме по ≥6 вопросов на уровне: ' + d.catLv.join(','));
  ok(d.jh >= 10 && d.jhBad.length === 0, 'Своя игра для знатоков: ' + d.jh + ' тем по 5 вопросов');
  ok(d.odd >= 20 && d.oddBad.length === 0, 'найди лишнее (трудное): ' + d.odd + ' ' + d.oddBad);
  ok(d.bef >= 20 && d.hl >= 20 && d.cl >= 10 && d.wh >= 100 && !d.clBad.length && d.hlBad === 0, 'трудные «Что раньше» ' + d.bef + ', «Больше/меньше» ' + d.hl + ', «Подсказки» ' + d.cl + ', «Кто я» ' + d.wh);
  // запуск игр на каждом уровне
  const games = [['odd', 'level', ['norm', 'mix', 'hard']], ['before', 'level', ['norm', 'mix', 'hard']], ['hl', 'level', ['norm', 'mix', 'hard']], ['clues', 'level', ['norm', 'mix', 'hard']], ['whoami', 'level', ['norm', 'mix', 'hard']], ['jeopardy', 'level', ['norm', 'mix', 'hard']], ['quiz', 'diff', ['all', 'easy', 'hard', 'expert']]];
  for (const [id, key, vals] of games) for (const v of vals) {
    await p.goto(file);
    await p.evaluate(([id, key, v]) => { store.set('o.' + id + '.' + key, v); Intro(G.games.find(g => g.id === id)); }, [id, key, v]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click();
    let steps = 0, e0 = errs.length;
    for (let s = 0; s < 25; s++) {
      await p.waitForTimeout(30);
      const btns = await p.$$('button:visible:not([disabled])'); const c = [];
      for (const x of btns) { const t = (await x.innerText()).trim(); if (!/^(Выход|Каталог|Правила|В каталог)$/.test(t) && t !== '') c.push(x); }
      if (!c.length) break; const prim = await p.$('[data-primary]:visible'); const x = prim && Math.random() < .6 ? prim : c[Math.floor(Math.random() * c.length)];
      try { await x.click({ timeout: 800 }); steps++; } catch (e) { }
    }
    ok(errs.length === e0 && steps > 5, id + ' / ' + v + ': ' + steps + ' шагов без ошибок');
  }
  // квиз «для знатоков» действительно предлагает только 300–500, «эксперт» только 400–500
  for (const [v, allowed] of [['hard', [300, 400, 500]], ['expert', [400, 500]], ['easy', [100, 200]]]) {
    await p.goto(file); await p.evaluate(v => { store.set('o.quiz.diff', v); Intro(G.games.find(g => g.id === 'quiz')); }, v);
    await p.getByRole('button', { name: 'Играть', exact: true }).click();
    const vals = [...new Set((await p.locator('.tile .lv .btn').allInnerTexts()).map(Number))].sort();
    ok(vals.length === allowed.length && vals.every(x => allowed.includes(x)), 'квиз, сложность «' + v + '»: кнопки ' + vals.join('/'));
  }
  console.log(errs.length ? 'ERRORS ' + errs.slice(0, 2) : 'no errors', fail ? 'FAILED ' + fail : 'ALL OK');
  await b.close(); process.exit(fail ? 1 : 0);
})();
