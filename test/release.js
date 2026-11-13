// Первый выпуск после аудита: каталог, запуск, режимы, диалоги и жалобы.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const file = 'file://' + path.resolve(__dirname, '../index.html');

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const errors = [];
  const watch = p => p.on('pageerror', e => errors.push(e.message));
  const play = p => p.getByRole('button', { name: 'Играть', exact: true }).click();
  const intro = (p, id, settings = {}) => p.evaluate(([id, settings]) => Intro(G.games.find(g => g.id === id), settings), [id, settings]);
  try {
    const p = await browser.newPage({ viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true }); watch(p);
    await p.goto(file);
    const first = await p.locator('.gcard').first().boundingBox();
    assert.ok(first.y + 80 < 667, 'часть первой игры видна без прокрутки');
    assert.equal(await p.locator('.gcard').count(), 47);
    await p.getByRole('button', { name: 'Игроков: 1', exact: true }).click();
    assert.equal(await p.getByRole('heading', { name: 'Пары', exact: true }).count(), 1);
    assert.equal(await p.getByRole('heading', { name: 'Крокодил', exact: true }).count(), 0);
    await p.locator('.gcard').filter({ has: p.getByRole('heading', { name: 'Пары', exact: true }) }).click();
    assert.equal(await p.locator('.stepper b').innerText(), '1');
    await play(p);
    assert.match(await p.locator('.board').innerText(), /Игрок 1/);
    await p.evaluate(() => Home());
    await p.getByRole('button', { name: 'Игроков: 4', exact: true }).click();
    await p.locator('.gcard').filter({ has: p.getByRole('heading', { name: 'Кодовые имена', exact: true }) }).click();
    assert.equal(await p.getByRole('button', { name: 'Две команды', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await p.locator('.stepper b').innerText(), '2');
    await p.evaluate(() => Home());
    await p.getByRole('button', { name: 'Игроков: 2', exact: true }).click();
    await p.locator('.gcard').filter({ has: p.getByRole('heading', { name: 'Крокодил', exact: true }) }).click();
    assert.equal(await p.getByRole('button', { name: 'Дуэт (вдвоём)', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await p.getByRole('button', { name: 'Увеличить число участников', exact: true }).isDisabled(), true);
    assert.equal(await p.getByText('Ходов у каждой команды', { exact: true }).isVisible(), false);
    assert.equal(await p.getByText('Дуэт: счёт', { exact: true }).isVisible(), true);
    await p.getByRole('button', { name: 'Командная', exact: true }).click();
    assert.equal(await p.getByText('Дуэт: счёт', { exact: true }).isVisible(), false);
    await p.evaluate(() => Home());
    await p.getByRole('searchbox').fill('несуществующая игра');
    assert.equal(await p.locator('.gcard').count(), 0);
    assert.equal(await p.getByRole('button', { name: 'Случайная игра', exact: true }).isDisabled(), true);
    await p.getByRole('button', { name: 'Показать все игры', exact: true }).click();
    assert.equal(await p.locator('.gcard').count(), 47);
    assert.equal(await p.getByRole('searchbox').inputValue(), '');
    console.log('ok   каталог: первый экран, один игрок, люди и команды, дуэт, пустой поиск и сброс');

    // Новая сессия: в каждой игре кнопка запуска видна до подробных настроек.
    const ids = await p.evaluate(() => G.games.map(g => g.id));
    for (const id of ids) {
      await p.goto(file); await intro(p, id);
      const r = await p.getByRole('button', { name: 'Играть', exact: true }).boundingBox();
      assert.ok(r.y >= 0 && r.y + r.height <= 667, id + ': запуск на первом экране');
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), id + ': ширина настроек');
    }
    console.log('ok   все 47 игр: запуск на первом экране телефона');
    await p.goto(file); await intro(p, 'memory');
    const theme = p.getByRole('combobox', { name: 'Тема для режима «Термины»', exact: true });
    assert.equal(await theme.locator('option').count(), 50);
    await theme.selectOption({ label: 'Автор — произведение' });
    await p.getByRole('button', { name: 'Эмодзи', exact: true }).click();
    assert.equal(await theme.isVisible(), false);
    await p.getByRole('button', { name: 'Термин и определение', exact: true }).click();
    assert.equal(await theme.locator('option:checked').innerText(), 'Автор — произведение');
    await play(p);
    const flag = p.getByRole('button', { name: 'Сообщить об ошибке в карточке', exact: true });
    assert.equal(await flag.isDisabled(), true, 'закрытое поле не раскрывается через жалобу');
    const texts = await p.locator('.mem-t').allTextContents();
    await p.locator('.mem-card').first().click();
    assert.equal(await flag.isEnabled(), true);
    await flag.click();
    const dialog = p.getByRole('dialog');
    assert.ok((await dialog.innerText()).includes(texts[0]));
    assert.equal(await dialog.getByRole('combobox').count(), 0, 'одна открытая карточка без лишнего выбора');
    await p.keyboard.press('Escape');
    const pair = await p.evaluate(text => DATA.memory['Автор — произведение'].find(pair => pair.includes(text)), texts[0]);
    await p.locator('.mem-card').nth(texts.findIndex(text => !pair.includes(text))).click();
    await flag.click();
    await dialog.getByRole('combobox', { name: 'Карточка с ошибкой', exact: true }).selectOption('0');
    await dialog.getByRole('button', { name: 'Скрыть и пожаловаться', exact: true }).click();
    assert.equal(await p.evaluate(() => store.get('reports', []).at(-1).deck), 'memory');
    console.log('ok   Пары: компактный выбор темы, зависимые настройки, жалоба на открытую карточку');

    await p.goto(file); await intro(p, 'quiz'); await play(p);
    assert.equal(await flag.isDisabled(), true, 'на выборе темы нет старого вопроса');
    await p.locator('.tile .btn').first().click();
    const old = await p.evaluate(() => ({ deck: LAST.deck, item: LAST.item }));
    await flag.click();
    await p.evaluate(() => { LAST = { deck: 'wrong-deck', item: 'чужая карточка' }; });
    await dialog.getByRole('button', { name: 'Скрыть и пожаловаться', exact: true }).click();
    assert.equal(await p.evaluate(() => store.get('reports', []).at(-1).deck), old.deck, 'жалоба сохраняет снимок');
    await intro(p, 'connect'); await play(p);
    assert.equal(await flag.isDisabled(), true, 'прошлая игра не оставляет активную карточку');
    console.log('ok   жалобы: правильная колода, снимок карточки, очистка при переходах');

    await p.goto(file);
    await p.evaluate(() => { store.set('o.taboo.mode', 'team'); Intro(G.games.find(g => g.id === 'taboo')); });
    await play(p); await p.getByRole('button', { name: 'Начать раунд', exact: true }).click();
    const firstWord = await p.evaluate(() => LAST.item.w);
    await p.getByRole('button', { name: /^Пропустить/ }).click();
    const currentWord = await p.evaluate(() => LAST.item.w);
    assert.notEqual(currentWord, firstWord);
    await flag.click();
    assert.ok((await dialog.innerText()).includes(currentWord), 'виден актуальный текст после смены слова');
    await dialog.getByRole('button', { name: 'Скрыть и пожаловаться', exact: true }).click();
    assert.ok((await p.evaluate(() => store.get('reports', []).at(-1).text)).includes(currentWord), 'жалоба на новое слово, а не начало раунда');
    console.log('ok   Табу: жалоба отслеживает смену слова внутри раунда');

    await p.getByRole('button', { name: 'Выход', exact: true }).focus();
    await p.evaluate(() => openFlag([]));
    assert.equal(await dialog.getByRole('button', { name: 'Закрыть', exact: true }).count(), 1);
    assert.equal(await p.locator('#app').evaluate(el => el.inert), true);
    await p.keyboard.press('Tab');
    assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
    await p.keyboard.press('Shift+Tab');
    assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
    await p.keyboard.press('Escape');
    assert.equal(await dialog.count(), 0);
    assert.equal(await p.locator('#app').evaluate(el => el.inert), false);
    assert.equal(await p.getByRole('button', { name: 'Выход', exact: true }).evaluate(el => el === document.activeElement), true);
    await p.getByRole('button', { name: 'Выход', exact: true }).click();
    await p.keyboard.press('Escape');
    assert.equal(await p.locator('.frame').count(), 1, 'Escape отменяет выход, а не подтверждает его');
    await p.evaluate(() => { modal(h('h2', null, 'Первое окно'), []); modal(h('h2', null, 'Второе окно'), []); });
    await p.keyboard.press('Escape');
    assert.equal(await dialog.count(), 1);
    assert.equal(await p.locator('#app').evaluate(el => el.inert), true);
    await p.keyboard.press('Escape');
    assert.equal(await dialog.count(), 0);
    assert.equal(await p.locator('#app').evaluate(el => el.inert), false);
    console.log('ok   диалоги: кнопка закрытия, Escape, Tab, фокус, вложенные окна');

    for (const [width, height] of [[360, 640], [1440, 900]]) {
      await p.setViewportSize({ width, height }); await p.goto(file);
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await intro(p, 'memory');
      assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      const r = await p.getByRole('button', { name: 'Играть', exact: true }).boundingBox();
      assert.ok(r.y + r.height <= height, width + ': старт без прокрутки');
    }
    assert.deepEqual(errors, []);
    console.log('ALL OK');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
