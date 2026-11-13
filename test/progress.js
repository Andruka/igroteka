// Программа вечера, общие результаты и одиночные анаграммы.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const errors = [];
  const page = async (mobile = false) => { const p = await browser.newPage(mobile ? { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } }); p.on('pageerror', e => errors.push(e.message)); await p.goto(file); await p.clock.install(); return p; };
  const play = p => p.getByRole('button', { name: 'Играть', exact: true }).click();
  const openAnagram = async (p, time = 30, hints = 3) => { await p.evaluate(([time, hints]) => { store.set('n.anagram', 1); store.set('o.anagram.level', 'easy'); store.set('o.anagram.rounds', 2); store.set('o.anagram.time', time); store.set('o.anagram.hints', hints); Intro(G.games.find(g => g.id === 'anagram')); }, [time, hints]); await play(p); };
  const answer = async p => { const word = await p.evaluate(() => LAST.item); await p.getByRole('textbox', { name: 'Ваш ответ', exact: true }).fill(' ' + word.toUpperCase().replaceAll('Е', 'Ё') + ' '); await p.getByRole('textbox', { name: 'Ваш ответ', exact: true }).press('Enter'); };
  const next = p => p.getByRole('button', { name: /^(Дальше|Итоги)$/, exact: true }).click();
  const firstGame = async (p, id) => {
    const selects = p.getByRole('combobox', { name: /^Игра этапа / });
    const values = await selects.evaluateAll(nodes => nodes.map(node => node.value));
    const index = values.indexOf(id);
    if (index < 0) await selects.first().selectOption(id);
    else for (let i = index; i > 0; i--) await p.getByRole('button', { name: 'Выше: ' + await p.evaluate(id => G.games.find(g => g.id === id).title, id), exact: true }).click();
  };
  try {
    {
      const p = await page(true); await p.getByRole('button', { name: 'Игровой вечер', exact: true }).click();
      const variation = await p.evaluate(() => {
        const original = Math.random, starts = new Set();
        for (let seed = 1; seed <= 30; seed++) {
          let state = seed; Math.random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
          starts.add(Evening.generate(1, 20, 'all')[0].game);
        }
        Math.random = original; return starts.size;
      }); assert.ok(variation > 1, 'первая игра не закреплена');
      await p.getByRole('combobox', { name: 'Подборка игр', exact: true }).selectOption('quiz');
      const selects = p.getByRole('combobox', { name: /^Игра этапа / });
      const quizIDs = await selects.evaluateAll(nodes => nodes.map(n => n.value));
      assert.equal(await p.evaluate(ids => ids.every(id => Evening.collections.find(c => c.id === 'quiz').games.includes(id)), quizIDs), true);
      await firstGame(p, 'memory');
      assert.equal(await selects.first().inputValue(), 'memory');
      assert.equal((await selects.evaluateAll(nodes => nodes.map(n => n.value))).length, 3);
      await p.getByRole('button', { name: 'Ниже: Пары', exact: true }).click();
      assert.equal(await selects.nth(1).inputValue(), 'memory');
      assert.equal(await selects.first().locator('option[value="memory"]').count(), 0, 'игры не повторяются');
      await firstGame(p, 'dilemma');
      await p.getByRole('button', { name: 'Начать вечер', exact: true }).click();
      await p.evaluate(() => { G.api.score(0, 5); G.api.end(); Evening.show(); });
      const original = await p.evaluate(() => Evening.read().stages);
      await p.getByRole('button', { name: 'Изменить оставшиеся игры', exact: true }).click();
      assert.equal(await selects.first().isDisabled(), true);
      const replacement = await selects.nth(1).locator('option').last().getAttribute('value');
      await selects.nth(1).selectOption(replacement);
      await p.getByRole('button', { name: 'Отмена', exact: true }).click();
      assert.deepEqual(await p.evaluate(() => Evening.read().stages), original);
      await p.getByRole('button', { name: 'Изменить оставшиеся игры', exact: true }).click();
      await selects.nth(1).selectOption(replacement);
      await p.getByRole('button', { name: 'Сохранить программу', exact: true }).click();
      assert.deepEqual(await p.evaluate(() => Evening.read().stages[0]), original[0]);
      await p.reload(); await p.getByRole('button', { name: 'Игровой вечер', exact: true }).click();
      assert.equal(await p.evaluate(() => Evening.read().stages[1].game), replacement);
      await p.getByRole('button', { name: 'Начать этап', exact: true }).click();
      assert.equal(await p.evaluate(() => G.api.game.id), replacement);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await p.evaluate(() => Evening.show());
      await p.getByRole('button', { name: 'Изменить оставшиеся игры', exact: true }).click();
      assert.equal(await selects.nth(1).isDisabled(), true, 'начатый этап не изменяется');
      await p.getByRole('button', { name: 'Отмена', exact: true }).click();
      await p.evaluate(() => Evening.setup());
      await p.getByRole('button', { name: 'Больше игроков', exact: true }).click();
      await p.getByRole('combobox', { name: 'Подборка игр', exact: true }).selectOption('words');
      await p.getByRole('button', { name: /≈60 мин/ }).click();
      assert.equal(await p.getByRole('button', { name: 'Начать вечер', exact: true }).isDisabled(), true);
      assert.match(await p.locator('.evening-message').last().innerText(), /не хватает игр/);
      console.log('ok   подборки, свободная первая игра, замена и порядок, редактирование будущих этапов и отмена'); await p.close();
    }
    {
      const p = await page(true); await openAnagram(p);
      assert.equal(await p.getByRole('button', { name: 'Угадали', exact: true }).count(), 0);
      await p.getByRole('textbox', { name: 'Ваш ответ', exact: true }).fill('неверно'); await p.getByRole('button', { name: 'Проверить', exact: true }).click();
      assert.equal(await p.locator('.tchip .sc').innerText(), '0'); assert.equal(await p.getByRole('textbox', { name: 'Ваш ответ' }).isEnabled(), true);
      await p.getByRole('button', { name: 'Подсказка (3)', exact: true }).click();
      assert.equal(await p.locator('.an-slot.on').count(), 1);
      await answer(p);
      assert.equal(await p.locator('.tchip .sc').innerText(), '4'); assert.equal(await p.getByRole('textbox', { name: 'Ваш ответ' }).isDisabled(), true);
      await p.evaluate(() => document.querySelector('.an-answer').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      assert.equal(await p.locator('.tchip .sc').innerText(), '4', 'повторная отправка не начисляет очки');
      await next(p); assert.equal(await p.getByRole('button', { name: 'Подсказка (2)', exact: true }).count(), 1);
      await answer(p); await next(p);
      assert.match(await p.locator('.stage').innerText(), /Лучшая серия: 2/);
      let rows = await p.evaluate(() => Object.values(Records.read()).filter(r => r.game === 'anagram'));
      assert.equal(rows.length, 1); assert.equal(rows[0].best, 9);
      await openAnagram(p); await answer(p); await next(p); await answer(p); await next(p);
      rows = await p.evaluate(() => Object.values(Records.read()).filter(r => r.game === 'anagram'));
      assert.equal(rows[0].best, 10); assert.equal(rows[0].plays, 2);
      assert.equal(await p.locator('[data-new-record=true]').count(), 1);
      await p.evaluate(() => G.api.end()); assert.equal(await p.evaluate(() => Object.values(Records.read())[0].plays), 2);
      await openAnagram(p, 45, 0); assert.equal(await p.getByRole('button', { name: 'Подсказка (0)', exact: true }).isDisabled(), true);
      await p.getByRole('button', { name: 'Пропуск', exact: true }).click(); await next(p); await p.clock.fastForward(46000); await next(p);
      rows = await p.evaluate(() => Object.values(Records.read()).filter(r => r.game === 'anagram'));
      assert.equal(rows.length, 2, 'другие настройки образуют отдельный рекорд');
      assert.equal(await p.evaluate(() => {
        const spec = { metric: 'test', settings: { time: 30 } }, ordinary = Records.key('anagram', spec);
        store.set('pack', 'kids'); const kids = Records.key('anagram', spec); store.set('pack', 'all'); return ordinary !== kids;
      }), true, 'разные темы вечера не объединяются в один рекорд');
      await p.reload(); await p.getByRole('button', { name: 'Результаты', exact: true }).click();
      assert.equal(await p.locator('.results-grid article').count(), 2);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      console.log('ok   одиночные анаграммы: ввод, Е/Ё, ошибки, подсказки, серии, рекорды и перезагрузка'); await p.close();
    }
    {
      const p = await page();
      await p.evaluate(() => { store.set('n.memory', 1); store.set('o.memory.mode', 'emoji'); store.set('o.memory.grid', '4x4'); });
      for (const wrong of [true, false]) {
        await p.evaluate(() => Intro(G.games.find(g => g.id === 'memory'))); await play(p);
        const texts = await p.locator('.mem-t').allTextContents(), cards = p.locator('.mem-card');
        if (wrong) { await cards.first().click(); await cards.nth(texts.findIndex(t => t !== texts[0])).click(); await p.clock.fastForward(1200); }
        for (const text of new Set(texts)) { const indexes = texts.flatMap((t, i) => t === text ? [i] : []); await cards.nth(indexes[0]).click(); await cards.nth(indexes[1]).click(); await p.clock.fastForward(500); }
        await p.clock.fastForward(1200);
      }
      const rows = await p.evaluate(() => Object.values(Records.read()).filter(r => r.game === 'memory'));
      assert.equal(rows.length, 1); assert.equal(rows[0].best, 8); assert.equal(rows[0].last, 8); assert.equal(rows[0].plays, 2);
      await p.evaluate(() => { store.set('duet.taboo.4', 99); Records.show(); });
      await p.getByText('Прежние результаты', { exact: true }).click();
      assert.match(await p.locator('.legacy-results').innerText(), /99/);
      assert.doesNotMatch(await p.locator('.legacy-results').innerText(), /duet\.taboo/);
      console.log('ok   минимальный рекорд Пар и отдельное отображение прежних результатов'); await p.close();
    }
    {
      const p = await page(true);
      const check = await p.evaluate(() => {
        const errors = [];
        for (let n = 1; n <= 8; n++) for (const minutes of [20, 40, 60]) for (const pack of ['all', 'kids']) {
          for (const game of Evening.eligible(n, pack)) {
            const opts = Evening.options(game, minutes, n, pack);
            for (const option of game.opts || []) {
              const values = (typeof option.values === 'function' ? option.values() : option.values).map(v => Array.isArray(v) ? v[0] : v), value = opts[option.key];
              if (option.multi ? !Array.isArray(value) || !value.every(v => values.includes(v)) : !values.includes(value)) errors.push([n, minutes, pack, game.id, option.key]);
            }
          }
          for (const collection of Evening.collections) {
            const stages = Evening.generate(n, minutes, pack, collection.id);
            if (!stages.length) continue;
            const run = { version: 1, id: 'test', minutes, pack, people: range(n).map(i => ({ name: 'Игрок ' + (i + 1), color: TEAM_COLORS[i] })), stages };
            if (!Evening.valid(run) || stages.some(s => collection.games && !collection.games.includes(s.game))) errors.push([n, minutes, pack, collection.id]);
          }
        }
        return errors;
      }); assert.deepEqual(check, []);
      await p.evaluate(() => { store.set('n.memory', 1); store.set('o.memory.mode', 'emoji'); Intro(G.games.find(g => g.id === 'memory')); }); await play(p); await p.locator('.mem-card').first().click();
      const old = await p.evaluate(() => JSON.parse(localStorage.getItem(Saves.key('memory'))).state);
      await p.evaluate(() => Home()); await p.getByRole('button', { name: 'Игровой вечер', exact: true }).click();
      await p.getByRole('button', { name: 'Меньше игроков', exact: true }).click();
      await p.getByRole('textbox', { name: 'Игрок 1', exact: true }).fill('Саша');
      await firstGame(p, 'memory');
      await p.getByRole('button', { name: 'Начать вечер', exact: true }).click();
      assert.equal(await p.locator('.evening-banner').count(), 1); assert.equal(await p.evaluate(() => G.api.game.id), 'memory');
      assert.equal(await p.locator('.tchip span').first().innerText(), 'Саша');
      assert.deepEqual(await p.evaluate(() => JSON.parse(localStorage.getItem(Saves.key('memory'))).state), old, 'вечер не перезаписывает отдельную партию');
      await p.locator('.mem-card').first().click(); await p.reload(); await p.getByRole('button', { name: 'Игровой вечер', exact: true }).click();
      await p.getByRole('button', { name: 'Продолжить этап', exact: true }).click();
      assert.equal(await p.locator('.mem-card.open').count(), 1);
      const texts = await p.locator('.mem-t').allTextContents(), cards = p.locator('.mem-card');
      for (const text of new Set(texts)) {
        const indexes = texts.flatMap((t, i) => t === text ? [i] : []);
        for (const i of indexes) if (!await cards.nth(i).evaluate(e => e.classList.contains('open'))) await cards.nth(i).click();
        await p.clock.fastForward(500);
      }
      await p.clock.fastForward(1200);
      assert.equal(await p.evaluate(() => Evening.read().stages[0].status), 'done');
      await p.getByRole('button', { name: 'Следующая игра', exact: true }).click();
      assert.equal(await p.locator('.tchip span').first().innerText(), 'Саша');
      await p.evaluate(() => { G.api.score(0, 7); G.api.end(); G.api.end(); });
      await p.getByRole('button', { name: 'Следующая игра', exact: true }).click();
      await p.evaluate(() => { G.api.score(0, 2); G.api.end(); });
      await p.getByRole('button', { name: 'Итоги вечера', exact: true }).click();
      assert.match(await p.locator('.evening-page').innerText(), /Завершено игр: 3 из 3/);
      assert.deepEqual(await p.evaluate(() => JSON.parse(localStorage.getItem(Saves.key('memory'))).state), old);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      console.log('ok   вечер: подбор, имена, отдельное сохранение, продолжение этапа, переходы и итог'); await p.close();
    }
    {
      const p = await page(); await p.getByRole('button', { name: 'Игровой вечер', exact: true }).click();
      await p.getByRole('button', { name: 'Больше игроков', exact: true }).click();
      for (const [i, name] of ['Аня', 'Борис', 'Вера'].entries()) await p.getByRole('textbox', { name: 'Игрок ' + (i + 1), exact: true }).fill(name);
      await firstGame(p, 'dilemma');
      await p.getByRole('button', { name: 'Начать вечер', exact: true }).click();
      await p.evaluate(() => { G.api.score(0, 50); });
      await p.getByRole('button', { name: 'Выход', exact: true }).click(); await p.getByRole('button', { name: 'К программе вечера', exact: true }).click();
      await p.getByRole('button', { name: 'Начать этап заново', exact: true }).click();
      assert.equal(await p.locator('.tchip .sc').first().innerText(), '0');
      const scores = [[100, 100, 0], [1, 0, 5], [0, 10, 10]];
      for (let step = 0; step < 3; step++) {
        await p.evaluate(values => { values.forEach((value, i) => G.api.score(i, value)); G.api.end(); G.api.end(); }, scores[step]);
        const result = await p.evaluate(step => Evening.read().stages[step].result, step);
        assert.deepEqual(result.raw, scores[step]);
        if (step === 0) { assert.deepEqual(result.points, [1.5, 1.5, 0]); await p.reload(); await p.getByRole('button', { name: 'Игровой вечер', exact: true }).click(); await p.getByRole('button', { name: 'Начать этап', exact: true }).click(); }
        else await p.getByRole('button', { name: step === 2 ? 'Итоги вечера' : 'Следующая игра', exact: true }).click();
      }
      assert.match(await p.locator('.evening-page').innerText(), /Вера побеждает/);
      const totals = await p.locator('.evening-total').allTextContents();
      assert.match(totals[0], /Вера.*3,5/);
      console.log('ok   общий итог: ничьи, разные шкалы очков, перезапуск этапа и сохранение мест');
      await p.evaluate(() => { Evening.live = null; localStorage.setItem('igroteka.evening.v1', '{bad'); Home(); });
      await p.getByRole('button', { name: 'Игровой вечер', exact: true }).click();
      assert.match(await p.locator('.evening-page').innerText(), /не удалось прочитать/);
      assert.equal(await p.getByRole('button', { name: 'Начать вечер', exact: true }).isEnabled(), true);
      await p.close();
    }
    {
      const p = await page(true);
      for (const id of ['charades', 'taboo', 'draw']) {
        await p.evaluate(id => {
          const run = { version: 1, id: 'duet-test-' + id, minutes: 20, pack: 'all', people: [{ name: 'Аня', color: TEAM_COLORS[0] }, { name: 'Борис', color: TEAM_COLORS[1] }], stages: [id, 'quiz', 'memory'].map(game => ({ game, opts: Evening.options(G.games.find(g => g.id === game), 20, 2, 'all'), status: 'pending', result: null })) };
          Evening.write(run); Evening.start(0);
        }, id);
        assert.equal(await p.locator('.du-role').count(), 2);
        assert.equal(await p.evaluate(() => G.api.opts.score), 'versus');
        assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      }
      console.log('ok   программа для двоих включает активные дуэты и сохраняет имена'); await p.close();
    }
    {
      const p = await page();
      await p.evaluate(() => {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function(key, value) { if (key === 'igroteka.evening.v1') throw new DOMException('Full', 'QuotaExceededError'); return original.call(this, key, value); };
        Evening.setup();
      });
      await p.getByRole('button', { name: 'Начать вечер', exact: true }).click();
      assert.match(await p.locator('.evening-banner').innerText(), /Не удалось сохранить программу/);
      await p.evaluate(() => { G.api.score(0, 3); G.api.end(); Evening.show(); });
      assert.match(await p.locator('.evening-page').innerText(), /До закрытия страницы/);
      await p.getByRole('button', { name: 'Пропустить этап', exact: true }).click();
      await p.getByRole('button', { name: 'Пропустить', exact: true }).click();
      assert.equal(await p.evaluate(() => Evening.read().stages[1].status), 'skipped');
      assert.equal(await p.evaluate(() => Evening.read().stages[1].result), null);
      await p.getByRole('button', { name: 'Начать этап', exact: true }).click();
      assert.equal(await p.evaluate(() => G.api.evening.index), 2);
      console.log('ok   ошибка записи не прерывает вечер; пропуск этапа не начисляет баллы'); await p.close();
    }
    assert.deepEqual(errors, []); console.log('ALL OK');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
