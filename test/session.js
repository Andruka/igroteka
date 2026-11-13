// Пауза, продолжение партии, таймеры и восстановление после перезагрузки.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const file = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const errors = [];
  const start = async (id, opts = {}, n = 1) => {
    const p = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    p.on('pageerror', e => errors.push(e.message));
    await p.goto(file); await p.clock.install();
    await p.evaluate(([id, opts, n]) => {
      store.set('n.' + id, n);
      for (const [key, value] of Object.entries(opts)) store.set('o.' + id + '.' + key, value);
      Intro(G.games.find(g => g.id === id));
    }, [id, opts, n]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); return p;
  };
  const snapshot = (p, id) => p.evaluate(id => JSON.parse(localStorage.getItem(Saves.key(id))), id);
  const resume = async (p, title) => { await p.reload(); await p.getByRole('button', { name: 'Продолжить: ' + title, exact: true }).click(); };
  const close = p => p.keyboard.press('Escape');
  try {
    {
      const p = await start('anagram', { time: 30 }, 2);
      await p.clock.fastForward(3000);
      await p.getByRole('button', { name: 'Правила', exact: true }).click();
      const left = await p.locator('.tnum').innerText();
      await p.clock.fastForward(40000);
      assert.equal(await p.locator('.tnum').innerText(), left);
      assert.equal(await p.locator('.an-msg').innerText(), '');
      await p.evaluate(() => modal(h('p', null, 'Вложенное окно'), []));
      await close(p); await p.clock.fastForward(40000);
      assert.equal(await p.locator('.tnum').innerText(), left, 'закрытие вложенного окна не снимает паузу правил');
      await close(p); await p.clock.fastForward(1000);
      assert.ok(+await p.locator('.tnum').innerText() < +left);
      await p.getByRole('button', { name: 'Пауза', exact: true }).click();
      const manual = await p.locator('.tnum').innerText();
      await p.clock.fastForward(50000);
      assert.equal(await p.locator('.tnum').innerText(), manual);
      await p.getByRole('button', { name: 'Продолжить игру', exact: true }).click();
      await p.clock.fastForward(40000);
      assert.match(await p.locator('.an-msg').innerText(), /Время вышло/);
      console.log('ok   правила, вложенные окна и ручная пауза сохраняют время раунда'); await p.close();
    }
    {
      const p = await start('bomb', { fuse: 1, rounds: 3 }, 2);
      await p.getByRole('button', { name: 'Запустить бомбу', exact: true }).click();
      await p.getByRole('button', { name: 'Пауза', exact: true }).click();
      await p.clock.fastForward(120000);
      assert.equal(await p.locator('.cover.boom').count(), 0, 'собственный таймер бомбы тоже приостановлен');
      await close(p); await p.clock.fastForward(25000);
      assert.equal(await p.locator('.cover.boom').count(), 1);
      await p.evaluate(() => Home()); await p.clock.fastForward(120000);
      assert.equal(await p.locator('.frame').count(), 0, 'отложенные действия не возвращают старую игру');
      console.log('ok   бомба: собственный запал, пауза и отмена действий при уходе'); await p.close();
    }
    {
      const p = await start('connect', { level: 0 }, 1);
      await p.locator('.cn-col').first().click();
      await p.getByRole('button', { name: 'Пауза', exact: true }).click();
      await p.clock.fastForward(20000);
      assert.equal(await p.locator('.cn-disc').count(), 1, 'компьютер не ходит за диалогом');
      await close(p); await p.clock.fastForward(700); await p.clock.fastForward(1000);
      assert.equal(await p.locator('.cn-disc').count(), 2);
      await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
      const now = await p.evaluate(() => G.api.now()); await p.clock.fastForward(20000);
      assert.equal(await p.evaluate(() => G.api.now()), now);
      await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
      assert.equal(await p.locator('.pause-dialog').count(), 1, 'после возврата во вкладку нужна команда продолжить');
      await close(p); await p.clock.fastForward(1000);
      assert.ok(await p.evaluate(() => G.api.now()) > now);
      console.log('ok   пауза удерживает ход компьютера и время скрытой вкладки'); await p.close();
    }
    {
      const p = await start('memory', { mode: 'emoji', grid: '4x4' }, 2);
      const texts = await p.locator('.mem-t').allTextContents(), cards = p.locator('.mem-card');
      await cards.first().click();
      await resume(p, 'Пары');
      assert.deepEqual(await p.locator('.mem-t').allTextContents(), texts);
      assert.equal(await p.locator('.mem-card.open').count(), 1);
      assert.equal((await snapshot(p, 'memory')).state.attempts, 0);
      await cards.nth(texts.findIndex((v, i) => i > 0 && v === texts[0])).click(); await p.clock.fastForward(500);
      assert.equal(await p.locator('.mem-card.done').count(), 2);
      const a = texts.findIndex(v => v !== texts[0]), b = texts.findIndex(v => v !== texts[0] && v !== texts[a]);
      await cards.nth(a).click(); await cards.nth(b).click(); await p.clock.fastForward(100);
      const before = await snapshot(p, 'memory');
      await resume(p, 'Пары');
      assert.equal(await p.locator('.mem-card.done').count(), 2);
      assert.equal(await p.locator('.mem-card.open').count(), 2);
      assert.deepEqual(await p.locator('.tchip .sc').allTextContents(), ['1', '0']);
      await p.clock.fastForward(1300);
      assert.equal(await p.locator('.mem-card.open').count(), 0);
      assert.match(await p.locator('.turnbar').innerText(), /Команда 2/);
      assert.equal((await snapshot(p, 'memory')).state.attempts, before.state.attempts, 'восстановление не добавляет попытку');
      for (const text of [...new Set(texts)].filter(text => text !== texts[0])) {
        const indexes = texts.flatMap((value, i) => value === text ? [i] : []);
        await cards.nth(indexes[0]).click(); await cards.nth(indexes[1]).click(); await p.clock.fastForward(500);
      }
      await p.clock.fastForward(1200);
      assert.equal(await p.getByRole('button', { name: 'Сыграть ещё раз', exact: true }).count(), 1);
      assert.equal(await snapshot(p, 'memory'), null);
      console.log('ok   Пары: порядок поля, одна карточка, ожидание пары, очки, ход и завершение после восстановления'); await p.close();
    }
    {
      const p = await start('nonogram', { size: 8 });
      await p.locator('.ng-c').first().click();
      await p.getByRole('button', { name: 'Подсказка: открыть клетку, штраф 30 секунд', exact: true }).click();
      await p.getByRole('button', { name: 'Крестик', exact: true }).click();
      await p.clock.fastForward(5000);
      await p.getByRole('button', { name: 'Правила', exact: true }).click();
      const paused = await p.locator('.ng-clock').innerText();
      await p.clock.fastForward(30000);
      assert.equal(await p.locator('.ng-clock').innerText(), paused);
      await close(p);
      const before = await snapshot(p, 'nonogram');
      await resume(p, 'Японские кроссворды');
      const after = await snapshot(p, 'nonogram');
      for (const key of ['puzzle', 'st', 'locked', 'undo', 'mode', 'hints', 'pen']) assert.deepEqual(after.state[key], before.state[key], key);
      assert.ok(Math.abs(after.state.elapsed - before.state.elapsed) < 1);
      assert.equal(await p.getByRole('button', { name: 'Крестик', exact: true }).getAttribute('aria-pressed'), 'true');
      await p.getByRole('button', { name: 'Отмена хода', exact: true }).click();
      assert.equal((await snapshot(p, 'nonogram')).state.undo.length, 0);
      await p.getByRole('button', { name: 'Закрасить', exact: true }).click();
      const state = (await snapshot(p, 'nonogram')).state, sol = [...state.puzzle.replaceAll('/', '')].map(char => char !== '.');
      for (let i = 0; i < sol.length; i++) if (!sol[i] && state.st[i] === 1) await p.locator('.ng-c').nth(i).click();
      for (let i = 0; i < sol.length; i++) if (sol[i] && state.st[i] !== 1) await p.locator('.ng-c').nth(i).click();
      await p.clock.fastForward(2300);
      assert.equal(await p.locator('.ng-pic').count(), 1);
      assert.equal(await snapshot(p, 'nonogram'), null);
      console.log('ok   нонограмма: картинка, клетки, подсказки, штраф, время, отмена и победа после восстановления'); await p.close();
    }
    {
      const p = await start('codebreaker', { time: 240, rounds: 1, lvl: 'classic' }, 2);
      const initial = (await snapshot(p, 'codebreaker')).state;
      const fill = async values => { for (let i = 0; i < values.length; i++) { await p.locator('.mm-row.cur .mm-peg').nth(i).click(); await p.locator('.mm-pb').nth(values[i]).click(); } };
      const wrong = initial.secret.slice(); wrong[0] = (wrong[0] + 1) % 6;
      await fill(wrong); await p.getByRole('button', { name: 'Проверить', exact: true }).click();
      await fill([2, 3]); await p.clock.fastForward(25000);
      await p.getByRole('button', { name: 'Правила', exact: true }).click(); await p.clock.fastForward(90000); await close(p);
      const before = await snapshot(p, 'codebreaker');
      await p.reload();
      assert.doesNotMatch(await p.locator('.continue-list').innerText(), /красный|синий|зелёный|▲|■/);
      await p.getByRole('button', { name: 'Продолжить: Взлом кода', exact: true }).click();
      const restored = await snapshot(p, 'codebreaker');
      for (const key of ['secret', 'rows', 'cur', 'round', 'sel']) assert.deepEqual(restored.state[key], before.state[key]);
      assert.ok(Math.abs(restored.state.remaining - before.state.remaining) < 1);
      assert.equal(await p.locator('.mm-row.secret').count(), 0, 'код остаётся скрытым');
      await fill(initial.secret); await p.getByRole('button', { name: 'Проверить', exact: true }).click();
      const scores = await p.locator('.tchip .sc').allTextContents();
      assert.equal(scores[0], '9');
      await resume(p, 'Взлом кода');
      assert.deepEqual(await p.locator('.tchip .sc').allTextContents(), scores, 'победа не начисляется повторно');
      await p.getByRole('button', { name: 'Дальше', exact: true }).click();
      const second = (await snapshot(p, 'codebreaker')).state;
      assert.equal(second.round, 2); assert.match(await p.locator('.turnbar').innerText(), /Команда 2/);
      await resume(p, 'Взлом кода');
      assert.deepEqual((await snapshot(p, 'codebreaker')).state.secret, second.secret);
      await fill(second.secret); await p.getByRole('button', { name: 'Проверить', exact: true }).click();
      await p.getByRole('button', { name: 'Итоги', exact: true }).click();
      assert.equal(await snapshot(p, 'codebreaker'), null);
      console.log('ok   Взлом кода: секрет, попытки, частичный ввод, таймер, очки и следующие команды'); await p.close();
    }
    {
      const p = await start('memory', { mode: 'emoji', grid: '4x4' });
      const original = await snapshot(p, 'memory');
      await p.reload();
      await p.evaluate(() => { const save = JSON.parse(localStorage.getItem(Saves.key('memory'))); save.state.open = [999]; localStorage.setItem(Saves.key('memory'), JSON.stringify(save)); Intro(G.games.find(g => g.id === 'memory')); });
      assert.equal(await p.getByRole('button', { name: 'Продолжить', exact: true }).count(), 0);
      assert.equal(await p.getByText('Сохранение повреждено или создано другой версией игры.', { exact: true }).count(), 1);
      await p.evaluate(save => { save.version = 999; localStorage.setItem(Saves.key('memory'), JSON.stringify(save)); }, original);
      assert.equal(await p.evaluate(() => Saves.read(G.games.find(g => g.id === 'memory')).status), 'invalid', 'несовместимая версия не загружается');
      await p.getByRole('button', { name: 'Удалить сохранение', exact: true }).click();
      await p.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click();
      assert.equal(await snapshot(p, 'memory'), null);
      await p.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(key, value) { if (key.startsWith('igroteka.save.')) throw new DOMException('QuotaExceededError'); return original.call(this, key, value); }; });
      await p.getByRole('button', { name: 'Играть', exact: true }).click();
      await p.locator('.mem-card').first().click();
      assert.match(await p.locator('.save-status.failed').innerText(), /Не удалось сохранить/);
      console.log('ok   повреждённое сохранение и заполненное хранилище обрабатываются без сбоя'); await p.close();
    }
    {
      const p = await browser.newPage(); p.on('pageerror', e => errors.push(e.message)); await p.goto(file);
      await p.evaluate(() => {
        const theme = Object.keys(DATA.memory)[0];
        store.set('bad.memory', DATA.memory[theme].slice(7).map(([l, r]) => itemKey({ t: theme, l, r })));
        store.set('o.memory.mode', 'terms'); store.set('o.memory.theme', theme); store.set('o.memory.grid', '4x4');
        Intro(G.games.find(g => g.id === 'memory'));
      });
      await p.getByRole('button', { name: 'Играть', exact: true }).click();
      assert.equal(await p.getByRole('heading', { name: 'Недостаточно доступных пар', exact: true }).count(), 1);
      assert.equal(await p.locator('.mem-card').count(), 0, 'скрытые пары не заменяются повторяющимися');
      console.log('ok   недостаток доступных пар обрабатывается до построения поля'); await p.close();
    }
    assert.deepEqual(errors, []); console.log('ALL OK');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
