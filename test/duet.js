// Дуэт (Табу, Рисуй и угадывай, Крокодил): чередование ролей, очки, рекорд, без ошибок. node test/duet.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  const GAMES = {
    taboo: { start: 'Начать раунд', ok: 'Угадали', time: 2 },
    draw: { start: 'Показать слово художнику', reveal: 'Запомнил — рисую!', ok: 'Угадал(а)!', fail: 'Не угадал(а)', time: 60 },
    charades: { start: 'Показать слово', reveal: 'Запомнил — поехали!', ok: 'Угадал(а)!', time: 2 }
  };
  const click = (p, name) => p.getByRole('button', { name, exact: true }).first().click({ timeout: 8000 });
  const scores = p => p.evaluate(() => [...document.querySelectorAll('.tchip .sc')].map(e => +e.textContent));
  const next = async p => { await p.locator('button:has-text("Дальше"), button:has-text("Итоги")').first().click({ timeout: 8000 }); };
  async function run(id, score, record) {
    const G_ = GAMES[id], p = await b.newPage({ viewport: { width: 1280, height: 720 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(file);
    await p.evaluate(([id, sc, rec, t]) => {
      store.set('n.' + id, 2); store.set('o.' + id + '.mode', 'duet'); store.set('o.' + id + '.score', sc); store.set('o.' + id + '.drounds', 4); store.set('o.' + id + '.time', t);
      if (rec != null) store.set('duet.' + id + '.4', rec); else localStorage.removeItem('igroteka.duet.' + id + '.4');
      Intro(G.games.find(g => g.id === id));
    }, [id, score, record, G_.time]);
    await click(p, 'Играть'); await p.waitForTimeout(400);
    const firsts = [], tag = `${id}/${score}`;
    for (let r = 1; r <= 4; r++) {
      await p.waitForSelector('.du-role', { timeout: 8000 });
      firsts.push(await p.locator('.du-role b').first().innerText());
      ok((await p.locator('.kicker').first().innerText()).includes('Раунд ' + r + ' из 4'), `${tag}: раунд ${r} из 4`);
      await click(p, G_.start); if (G_.reveal) await click(p, G_.reveal);
      const win = r % 2 === 1; // в нечётных раундах угадывают
      if (id === 'taboo') {
        if (win) {
          if (r === 1) {
            ok(await p.locator('.du-taboo').count() === 1, `${tag}: у угадывающего кнопка «Табу!» в ряду кнопок`);
            const sw = await p.evaluate(() => document.documentElement.scrollWidth); ok(sw <= 1280, `${tag}: нет горизонтальной прокрутки`);
          }
          await click(p, 'Угадали'); await p.waitForTimeout(60); await click(p, 'Табу!'); await p.waitForTimeout(60);
        }
        await next(p);
      } else if (id === 'draw') {
        await click(p, win ? G_.ok : G_.fail); await next(p);
      } else {
        if (win) { await click(p, G_.ok); } else { await p.waitForSelector('text=Время вышло', { timeout: 8000 }); }
        await next(p);
      }
      await p.waitForTimeout(150);
    }
    await p.waitForSelector('.du-result', { timeout: 8000 });
    ok(firsts[0] !== firsts[1] && firsts[0] === firsts[2] && firsts[1] === firsts[3], `${tag}: роли чередуются (${firsts.join(' > ')})`);
    const res = await p.locator('.du-result').first();
    const sc = await scores(p), title = await p.locator('h1.big').innerText();
    if (score === 'versus') {
      const exp = id === 'taboo' ? [0, 4] : [2, 4]; // A: объясняет в 1 и 3 раундах
      ok(sc.length === 2 && sc[0] === exp[0] && sc[1] === exp[1], `${tag}: очки друг против друга ${sc} (ожидалось ${exp})`);
      ok(title.includes('побеждает') && title.includes(firsts[1]), `${tag}: победитель «${title}»`);
      ok((await res.getAttribute('data-score')) === exp.join(':'), `${tag}: итоговая строка счёта`);
    } else {
      const exp = id === 'taboo' ? 2 : 4;
      ok(sc[0] === exp && sc[1] === exp, `${tag}: общий счёт у обоих ${sc} (ожидалось ${exp})`);
      ok(+(await res.getAttribute('data-shared')) === exp, `${tag}: итоговое «Мы»`);
      const isNew = +(await res.getAttribute('data-record')) === 1, stored = await p.evaluate(id => store.get('duet.' + id + '.4', 0), id);
      if (record == null) ok(isNew && stored === exp && title.includes('Новый рекорд'), `${tag}: новый рекорд записан (${stored})`);
      else ok(!isNew && stored === record && !title.includes('Новый рекорд'), `${tag}: рекорд ${record} не побит, не перезаписан`);
    }
    ok(!errs.length, `${tag}: без ошибок` + (errs[0] ? ': ' + errs[0] : ''));
    await p.close();
  }
  for (const id of Object.keys(GAMES)) { await run(id, 'versus'); await run(id, 'together'); await run(id, 'together', 99); }
  // командный режим остаётся по умолчанию; в дуэте при 3+ командах берутся первые две
  { const p = await b.newPage({ viewport: { width: 375, height: 667 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(file);
    await p.evaluate(() => { localStorage.clear(); store.set('n.taboo', 3); Intro(G.games.find(g => g.id === 'taboo')); });
    ok(await p.locator('.seg button[aria-pressed="true"]:has-text("Командная")').count() === 1, 'по умолчанию режим «Командная»');
    await p.evaluate(() => { store.set('o.taboo.mode', 'duet'); store.set('o.taboo.time', 5); Intro(G.games.find(g => g.id === 'taboo')); });
    await click(p, 'Играть'); await p.waitForSelector('.du-role');
    ok(await p.locator('.tchip').count() === 2, 'дуэт при трёх командах: играют двое');
    await click(p, 'Начать раунд'); await p.waitForTimeout(300);
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, tb: document.querySelector('.du-taboo').getBoundingClientRect().height, ok: [...document.querySelectorAll('.du-ex .btn')].map(e => e.getBoundingClientRect().height) }));
    ok(m.sw <= 375 && m.tb >= 44 && m.ok.every(x => x >= 44), `375px: без горизонтальной прокрутки, тапы >=44px (${Math.round(m.tb)})`);
    ok(!errs.length, 'мобильный: без ошибок'); await p.close(); }
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
