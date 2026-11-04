// «Ва-банк»: партия по кнопкам, очки, финал, помещение на экран. node test/allin.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  for (const [w, h] of [[375, 667], [1280, 720], [768, 1024], [1920, 1080]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await p.goto(file);
    await p.evaluate(() => Intro(G.games.find(g => g.id === 'allin')));
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(200);
    const click = async name => { await p.getByRole('button', { name, exact: true }).first().click(); await p.waitForTimeout(40); };
    const has = async name => (await p.getByRole('button', { name, exact: true }).count()) > 0;
    let overflow = 0, rounds = 0, finalSeen = false, betPick = 0, guard = 0, ended = false;
    const fit = async () => { /* экран вопроса (длинный текст + 4 варианта) может прокручиваться, как в обычной викторине; кнопка «Ответить» закреплена */
      const isQ = await p.locator('.opt').count(); if (isQ) { const bb = await p.getByRole('button', { name: 'Ответить', exact: true }).boundingBox(); if (!bb || bb.y + bb.height > h + 1 || bb.y < 0) overflow = Math.max(overflow, 777); }
      const o = isQ ? 0 : await p.evaluate(() => document.documentElement.scrollHeight - innerHeight); if (o > 2) { overflow = Math.max(overflow, o); if (process.env.V) console.log('  overflow', o, await p.evaluate(() => document.querySelector('.stage').innerText.slice(0, 60).replace(/\n/g, '|'))); } const x = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (x > 1) overflow = Math.max(overflow, 999); };
    while (guard++ < 400) {
      if (await p.locator('.podium').count()) { ended = true; break; }
      await fit();
      if (await has('Делать ставки')) { rounds++; if (await p.locator('.ai-fin').count()) finalSeen = true; await click('Делать ставки'); }
      else if (await has('Выбрать ставку')) await click('Выбрать ставку');
      else if (await has('Ставка сделана')) { await click('Все очки'); await click('Ставка сделана'); }
      else if (await p.locator('.ai-stake:not([disabled])').count()) { const bs = p.locator('.ai-stake:not([disabled])'); await bs.nth(betPick++ % await bs.count()).click(); }
      else if (await has('Показать вопрос')) await click('Показать вопрос');
      else if (await has('Ответить')) { await p.locator('.opt').nth(guard % 4).click(); await fit(); await click('Ответить'); }
      else if (await has('Дальше')) { const t = await p.locator('.ai-row').count(); ok(t > 0, `${w}x${h}: таблица результатов`); await click('Дальше'); }
      else if (await has('Итоги')) await click('Итоги');
      else await p.waitForTimeout(50);
    }
    ok(ended, `${w}x${h}: партия дошла до итогов (раундов ${rounds})`);
    ok(rounds === 8 && finalSeen, `${w}x${h}: 8 раундов, последний — «Ва-банк»`);
    ok(overflow === 0, `${w}x${h}: экраны без лишней прокрутки` + (overflow ? ' (' + overflow + 'px)' : ''));
    ok(!errs.length, `${w}x${h}: без ошибок` + (errs.length ? ' ' + errs[0] : ''));
    await p.close();
  }
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
