// Миллионер: полная лестница, несгораемая сумма, «Забрать», подсказки, помещение на экран. node test/millionaire.js
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
    const tag = `${w}x${h}`;
    // правильный вариант по тексту вопроса и номер кнопки
    const right = () => p.evaluate(() => { const t = document.querySelector('.mil-q .big').textContent; const q = DATA.quiz.find(x => x.q === t); return [...document.querySelectorAll('.mil-opts .opt')].findIndex(o => o.querySelector('span').textContent === q.a[0]); });
    const wrong = async () => { const r = await right(); return r === 0 ? 1 : 0; };
    const tapTwice = async i => { const o = p.locator('.mil-opts .opt').nth(i); await o.click(); await o.click(); };
    const fits = async m => { const r = await p.evaluate(() => { const a = document.querySelector('.mil-actions'); const bb = a.getBoundingClientRect(); return { bottom: bb.bottom, sh: document.documentElement.scrollHeight, ih: innerHeight, sw: document.documentElement.scrollWidth, iw: innerWidth }; }); ok(r.sw <= r.iw + 1, `${tag} ${m}: нет горизонтальной прокрутки`); ok(r.bottom <= r.ih + 1, `${tag} ${m}: кнопки в окне (низ ${Math.round(r.bottom)} из ${r.ih})`); };
    await p.evaluate(() => Intro(G.games.find(g => g.id === 'millionaire'))); await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(300);
    // команда 1: 6 верных, затем ошибка -> 1000 (несгораемая)
    await p.getByRole('button', { name: 'Начать', exact: true }).click();
    for (let k = 0; k < 6; k++) {
      await p.waitForSelector('.mil-opts');
      if (k === 0) {
        await fits('вопрос 1');
        await p.getByRole('button', { name: '50:50' }).click();
        ok(await p.locator('.mil-opts .opt.gone').count() === 2, `${tag}: 50:50 убирает два варианта`);
        await p.getByRole('button', { name: 'Помощь зала' }).click();
        ok(await p.locator('.mil-pct').count() === 2, `${tag}: помощь зала показывает проценты`);
        ok(await p.getByRole('button', { name: '50:50' }).isDisabled(), `${tag}: подсказка 50:50 одноразовая`);
      }
      await tapTwice(await right()); await p.getByRole('button', { name: 'Дальше', exact: true }).click();
    }
    await fits('вопрос 7');
    await tapTwice(await wrong());
    ok(await p.locator('.mil-opts .opt.right').count() === 1, `${tag}: верный ответ подсвечен после ошибки`);
    await p.getByRole('button', { name: 'Дальше', exact: true }).click();
    ok(await p.locator('text=/\\+1.000.очк/').count() > 0, `${tag}: после ошибки сохранена несгораемая сумма 1000`);
    await p.getByRole('button', { name: 'Дальше', exact: true }).click();
    // команда 2: 2 верных и «Забрать» -> 200
    await p.getByRole('button', { name: 'Начать', exact: true }).click();
    for (let k = 0; k < 2; k++) { await tapTwice(await right()); await p.getByRole('button', { name: 'Дальше', exact: true }).click(); }
    await p.getByRole('button', { name: /^Забрать/ }).click();
    ok(await p.locator('text=/\\+200.очк/').count() > 0, `${tag}: «Забрать» даёт сумму 200`);
    const ends = await p.getByRole('button', { name: 'Итоги', exact: true }).count();
    if (ends) await p.getByRole('button', { name: 'Итоги', exact: true }).click(); else await p.getByRole('button', { name: 'Дальше', exact: true }).click();
    await p.waitForTimeout(300);
    ok(await p.locator('text=Сыграть ещё раз').count() > 0, `${tag}: игра завершилась итогами`);
    ok(!errs.length, `${tag}: без ошибок` + (errs.length ? ' ' + errs[0] : '')); await p.close();
  }
  // полная лестница до миллиона и проверка уровней вопросов
  {
    const p = await b.newPage({ viewport: { width: 375, height: 667 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(file);
    await p.evaluate(() => Intro(G.games.find(g => g.id === 'millionaire'))); await p.getByRole('button', { name: 'Играть', exact: true }).click();
    await p.getByRole('button', { name: 'Начать', exact: true }).click();
    const lv = [];
    for (let k = 0; k < 15; k++) {
      await p.waitForSelector('.mil-opts');
      const [r, l] = await p.evaluate(() => { const t = document.querySelector('.mil-q .big').textContent; const q = DATA.quiz.find(x => x.q === t); return [[...document.querySelectorAll('.mil-opts .opt')].findIndex(o => o.querySelector('span').textContent === q.a[0]), q.l]; });
      lv.push(l); const o = p.locator('.mil-opts .opt').nth(r); await o.click(); await o.click();
      if (k < 14) await p.getByRole('button', { name: 'Дальше', exact: true }).click();
    }
    ok(lv.join() === '1,1,1,2,2,2,3,3,3,4,4,4,5,5,5', 'уровни вопросов растут 1-5 по три: ' + lv.join(''));
    await p.waitForSelector('text=Миллион!'); ok(await p.locator('text=/1.000.000/').count() > 0, 'за 15 верных — 1 000 000');
    ok(!errs.length, 'лестница: без ошибок'); await p.close();
  }
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
