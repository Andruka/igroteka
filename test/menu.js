// Возврат в меню текущей игры: node test/menu.js
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const errors = [];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(file);
    const ids = await page.evaluate(() => G.games.map(g => g.id));
    for (const id of ids) {
      await page.goto(file);
      const title = await page.evaluate(id => {
        const game = G.games.find(g => g.id === id);
        const start = game.start;
        game.start = function (api) { window.testApi = api; return start.call(this, api); };
        Intro(game);
        return game.title;
      }, id);
      await page.getByRole('button', { name: 'Играть', exact: true }).click();
      await page.getByRole('button', { name: 'Выход', exact: true }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'В меню игры', exact: true }).click();
      assert.equal(await page.getByRole('heading', { name: title, exact: true }).count(), 1, id + ': меню той же игры');
      assert.equal(await page.getByRole('dialog').count(), 0, id + ': окно выхода закрыто');
      await page.getByRole('button', { name: 'Играть', exact: true }).click();
      await page.evaluate(() => window.testApi.end({ custom: true, title: 'Проверка итогов', win: false }));
      await page.locator('.stage').getByRole('button', { name: 'В меню игры', exact: true }).click();
      assert.equal(await page.getByRole('heading', { name: title, exact: true }).count(), 1, id + ': меню из итогов');
      console.log('ok   ' + id + ': возврат из партии и из итогов, повторный запуск');
    }

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(file);
    await page.evaluate(() => {
      store.set('n.memory', 1);
      store.set('o.memory.grid', '5x4');
      store.set('o.memory.mode', 'emoji');
      Intro(G.games.find(g => g.id === 'memory'));
    });
    await page.locator('.teamrow input').fill('Андрей');
    await page.getByRole('button', { name: 'Играть', exact: true }).click();
    await page.locator('.mem-card').first().click();
    await page.getByRole('button', { name: 'Выход', exact: true }).click();
    const dialog = page.getByRole('dialog');
    const fits = await dialog.evaluate(el => {
      const r = el.querySelector('.panel').getBoundingClientRect();
      return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
    });
    assert.ok(fits, 'окно выхода помещается на телефоне');
    await dialog.getByRole('button', { name: 'Остаться', exact: true }).click();
    assert.equal(await page.locator('.mem-card.open').count(), 1, 'отмена сохраняет открытую карточку');
    assert.equal(await page.getByRole('button', { name: 'Выход', exact: true }).evaluate(el => el === document.activeElement), true, 'фокус возвращается на кнопку выхода');
    // Возвращаемся в меню, пока ещё работает задержка после промаха.
    const other = await page.locator('.mem-t').evaluateAll(els => els.findIndex(el => el.textContent !== els[0].textContent));
    await page.locator('.mem-card').nth(other).click();
    await page.getByRole('button', { name: 'Выход', exact: true }).click();
    await dialog.getByRole('button', { name: 'В меню игры', exact: true }).click();
    assert.equal(await page.locator('.stepper b').innerText(), '1', 'сохранено число участников');
    assert.equal(await page.locator('.teamrow input').inputValue(), 'Андрей', 'сохранено имя');
    for (const label of ['5×4', 'Эмодзи']) {
      assert.equal(await page.getByRole('button', { name: label, exact: true }).getAttribute('aria-pressed'), 'true', 'сохранена настройка ' + label);
    }
    await page.getByRole('button', { name: 'Играть', exact: true }).click();
    await page.waitForTimeout(1800);
    assert.equal(await page.locator('.mem-card').count(), 20, 'новое поле с выбранными настройками');
    assert.equal(await page.locator('.mem-card.open, .mem-card.done').count(), 0, 'карточки сброшены');
    assert.match(await page.locator('.mem-info').innerText(), /Пар: 0 из 10 · Попыток: 0/, 'попытки сброшены, старый таймер не влияет на партию');
    assert.equal(await page.locator('.tchip .sc').innerText(), '0', 'очки сброшены');
    await page.getByRole('button', { name: 'Выход', exact: true }).click();
    await dialog.getByRole('button', { name: 'В каталог', exact: true }).click();
    assert.equal(await page.getByRole('searchbox', { name: 'Найти игру по названию' }).count(), 1, 'выход в каталог доступен');
    assert.deepEqual(errors, [], 'нет ошибок JavaScript');
    console.log('ok   телефон: отмена, настройки, имя, перезапуск, очистка таймера, каталог');
    console.log('ALL OK');
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
