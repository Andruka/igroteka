// Пары: данные без дублей, сетка помещается на экране, ход/блокировка/победа по кнопкам. node test/memory.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  const errs = [];
  const watch = p => { p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); }); };

  // 1. данные
  {
    const p = await b.newPage(); watch(p); await p.goto(file);
    const r = await p.evaluate(() => {
      const out = { themes: 0, short: [], dup: [], empty: [] };
      for (const t in DATA.memory) {
        out.themes++; const L = new Set(), R = new Set(), P = DATA.memory[t];
        if (P.length < 18) out.short.push(t + ':' + P.length);
        P.forEach(([l, r]) => { if (!l || !r) out.empty.push(t); if (L.has(l)) out.dup.push(t + '/' + l); if (R.has(r)) out.dup.push(t + '/' + r); L.add(l); R.add(r); });
      }
      return out;
    });
    ok(r.themes >= 6, 'тем не меньше 6: ' + r.themes);
    ok(!r.short.length, 'в каждой теме 18+ (на поле 6×6 нужно 18) пар' + (r.short.length ? ': ' + r.short : ''));
    ok(!r.dup.length, 'нет дублей внутри тем' + (r.dup.length ? ': ' + r.dup : ''));
    ok(!r.empty.length, 'нет пустых значений');
    await p.close();
  }

  // 2. геймплей и вместимость сетки
  const sizes = [[375, 667], [768, 1024], [1280, 720], [1920, 1080]];
  const setup = async (p, grid, mode, theme, n = 2) => {
    await p.goto(file);
    await p.evaluate(([g, m, t, n]) => { store.set('n.memory', n); store.set('o.memory.grid', g); store.set('o.memory.mode', m); store.set('o.memory.theme', t); Intro(G.games.find(x => x.id === 'memory')); }, [grid, mode, theme, n]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(300);
  };
  for (const [w, h] of sizes) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); watch(p);
    for (const grid of ['4x4', '5x4', '6x6']) for (const [mode, theme] of [['terms', 'Автор — произведение'], ['terms', 'Страна — валюта'], ['emoji', 'rand']]) {
      await setup(p, grid, mode, theme);
      const r = await p.evaluate(() => {
        const cs = [...document.querySelectorAll('.mem-card')], rects = cs.map(c => c.getBoundingClientRect());
        const bottom = Math.max(...rects.map(r => r.bottom)), right = Math.max(...rects.map(r => r.right)), left = Math.min(...rects.map(r => r.left));
        const minW = Math.min(...rects.map(r => r.width)), minH = Math.min(...rects.map(r => r.height));
        let clip = 0; cs.forEach(c => { const s = c.querySelector('.mem-t'), f = c.querySelector('.mem-face'); if (s.scrollWidth > f.clientWidth || s.offsetHeight > f.clientHeight) clip++; });
        return { n: cs.length, bottom, right, left, vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight, minW, minH, clip };
      });
      const tag = `${w}x${h} ${grid} ${mode}${mode === 'terms' ? ' ' + theme : ''}`;
      ok(r.n === +grid[0] * +grid[2], tag + ': карточек ' + r.n);
      ok(r.bottom <= r.vh && r.sh <= r.vh + 1, tag + `: помещается по высоте (низ ${Math.round(r.bottom)} из ${r.vh}, документ ${r.sh})`);
      ok(r.right <= r.vw && r.left >= 0 && r.sw <= r.vw, tag + ': помещается по ширине');
      const mt = grid === '6x6' ? 36 : 44; ok(r.minW >= mt && r.minH >= mt, tag + `: цели касания ${Math.round(r.minW)}x${Math.round(r.minH)}`);
      ok(r.clip === 0, tag + ': текст умещается (обрезано ' + r.clip + ')');
    }
    await p.close();
  }

  // 3. игра по кнопкам: несовпадение блокирует клики, пара даёт очко, партия завершается
  {
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); watch(p);
    await setup(p, '4x4', 'emoji', 'rand');
    const ids = await p.evaluate(() => [...document.querySelectorAll('.mem-t')].map(s => s.textContent));
    const pos = e => ids.map((t, i) => t === e ? i : -1).filter(i => i >= 0);
    const cards = p.locator('.mem-card');
    // промах: две разные
    const first = ids[0], other = ids.findIndex(t => t !== first);
    await cards.nth(0).click(); await cards.nth(other).click();
    await cards.nth(1 === other ? 2 : 1).click({ force: true });
    ok(await p.locator('.mem-card.open').count() === 2, 'при открытой паре третья карточка не открывается');
    await p.waitForTimeout(2000);
    ok(await p.locator('.mem-card.open').count() === 0, 'непарные карточки закрылись');
    const turn = await p.locator('.turnbar').innerText();
    ok(/Команда 2/.test(turn), 'ход перешёл ко второй команде');
    // найти все пары
    const seen = [...new Set(ids)];
    for (const e of seen) { const [a, c] = pos(e); await cards.nth(a).click(); await cards.nth(c).click(); await p.waitForTimeout(600); }
    await p.waitForSelector('text=Сыграть ещё раз', { timeout: 5000 }).catch(() => { });
    ok(await p.locator('text=Сыграть ещё раз').count() > 0, 'партия завершилась итогами');
    await p.close();
  }

  // Одиночная партия: выбор участника, промах, счётчик попыток, итоги и повтор.
  for (const mode of ['emoji', 'terms']) {
    const p = await b.newPage({ viewport: { width: 375, height: 667 } }); watch(p);
    await setup(p, '4x4', mode, 'Автор — произведение');
    await p.evaluate(() => Intro(G.games.find(g => g.id === 'memory')));
    await p.getByRole('button', { name: '−', exact: true }).click();
    ok(await p.locator('.stepper b').innerText() === '1', mode + ': можно выбрать одного участника');
    await p.getByRole('button', { name: 'Играть', exact: true }).click();
    const pairs = await p.evaluate(mode => {
      const texts = [...document.querySelectorAll('.mem-t')].map(e => e.textContent);
      return mode === 'emoji'
        ? [...new Set(texts)].map(t => texts.flatMap((v, i) => v === t ? [i] : []))
        : DATA.memory['Автор — произведение'].map(([a, b]) => [texts.indexOf(a), texts.indexOf(b)]).filter(p => p.every(i => i >= 0));
    }, mode);
    const cards = p.locator('.mem-card'), info = p.locator('.mem-info');
    ok(await p.locator('.tchip').count() === 1, mode + ': один участник в партии');
    await cards.nth(pairs[0][0]).click();
    await cards.nth(pairs[0][0]).click();
    ok(/Попыток: 0/.test(await info.innerText()), mode + ': одна карточка и повторный клик не считаются попыткой');
    await cards.nth(pairs[1][0]).click();
    await cards.nth(pairs[2][0]).click({ force: true });
    ok(await p.locator('.mem-card.open').count() === 2, mode + ': третья карточка заблокирована');
    ok(!/Ход переходит/.test(await info.innerText()), mode + ': промах без передачи хода');
    await p.waitForTimeout(1900);
    ok(await p.locator('.mem-card.open').count() === 0 && /Попыток: 1/.test(await info.innerText()), mode + ': промах закрылся и учтён');
    const fits = await p.evaluate(() => {
      const r = document.querySelector('.mem-grid').getBoundingClientRect();
      return r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
    });
    ok(fits, mode + ': одиночное поле помещается на телефоне');
    for (const [a, c] of pairs) {
      await cards.nth(a).click(); await cards.nth(c).click(); await p.waitForTimeout(500);
    }
    await p.getByRole('button', { name: 'Сыграть ещё раз', exact: true }).waitFor();
    ok(await p.getByRole('heading', { name: 'Все пары найдены!', exact: true }).count() === 1, mode + ': одиночные итоги');
    ok(/Пар: 8 из 8 · Попыток: 9/.test(await p.locator('.stage').innerText()), mode + ': результат учитывает пары и промах');
    await p.getByRole('button', { name: 'Сыграть ещё раз', exact: true }).click();
    ok(await p.locator('.tchip').count() === 1 && /Пар: 0 из 8 · Попыток: 0/.test(await info.innerText()), mode + ': повтор сохраняет одиночный режим и сбрасывает счёт');
    await p.close();
  }

  // 4. reduced motion не ломает игру
  {
    const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, reducedMotion: 'reduce' }); const p = await ctx.newPage(); watch(p);
    await setup(p, '6x6', 'terms', 'Английский');
    const tr = await p.evaluate(() => getComputedStyle(document.querySelector('.mem-in')).transitionDuration);
    ok(/^0s/.test(tr), 'reduced-motion: переворот без анимации (' + tr + ')');
    await p.locator('.mem-card').first().click();
    ok(await p.locator('.mem-card.open').count() === 1, 'reduced-motion: карточка открывается');
    await ctx.close();
  }

  ok(!errs.length, 'без ошибок в консоли' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
