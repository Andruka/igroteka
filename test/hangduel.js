// Виселица, режим «Загадывают игроки»: полный раунд, скрытие слова, счёт, валидация. node test/hangduel.js
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  const open = async (p, score, rounds) => {
    await p.goto(file);
    await p.evaluate(([s, r]) => { store.set('o.hang.mode', 'duel'); store.set('o.hang.score', s); store.set('o.hang.drounds', r); store.set('n.hang', 2); store.set('rec.hang.duo', 0); Intro(G.games.find(g => g.id === 'hang')); }, [score, rounds]);
    await p.getByRole('button', { name: 'Играть', exact: true }).click(); await p.waitForTimeout(300);
  };
  const body = p => p.evaluate(() => document.body.innerText.toLowerCase());
  const ready = p => p.getByRole('button', { name: 'Я готов' }).click();
  const setWord = async (p, w, hint) => {
    await ready(p); await p.waitForTimeout(100);
    await p.getByLabel('Загаданное слово').fill(w); if (hint) await p.getByLabel('Подсказка-категория').fill(hint);
    await p.getByRole('button', { name: 'Далее' }).click();
    await p.getByRole('button', { name: 'Да, прячу' }).click(); await ready(p);
  };
  const key = (p, ch) => p.locator('.key', { hasText: new RegExp('^' + ch + '$', 'i') }).click();
  const scores = p => p.evaluate(() => [...document.querySelectorAll('.tchip .sc')].map(e => +e.textContent));
  for (const [w, h] of [[1280, 720], [375, 667]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await open(p, 'vs', 4);
    ok((await body(p)).includes('передайте устройство'), `${w}: заставка передачи`);
    await ready(p);
    await p.getByLabel('Загаданное слово').fill('ab'); await p.getByRole('button', { name: 'Далее' }).click();
    ok(await p.locator('.hd-err').innerText() !== '', `${w}: латиница отклонена`);
    await p.getByLabel('Загаданное слово').fill('кот-ик'); await p.getByRole('button', { name: 'Далее' }).click();
    ok(await p.locator('.hd-err').innerText() !== '', `${w}: дефис отклонён`);
    await p.getByLabel('Загаданное слово').fill('да'); await p.getByRole('button', { name: 'Далее' }).click();
    ok(/3 до 16/.test(await p.locator('.hd-err').innerText()), `${w}: короткое слово отклонено`);
    await p.getByLabel('Загаданное слово').fill('мышка'); await p.getByLabel('Подсказка-категория').fill('животное');
    await p.getByRole('button', { name: 'Далее' }).click();
    ok((await body(p)).includes('не опечатка'), `${w}: подтверждение слова`);
    await p.getByRole('button', { name: 'Исправить' }).click();
    ok(await p.getByLabel('Загаданное слово').inputValue() === 'мышка', `${w}: «исправить» сохраняет слово`);
    await p.getByRole('button', { name: 'Далее' }).click(); await p.getByRole('button', { name: 'Да, прячу' }).click(); await p.waitForTimeout(200);
    const t = await body(p);
    ok(t.includes('передайте устройство') && !t.includes('мышка') && !t.includes('животное'), `${w}: при передаче слово скрыто`);
    await ready(p); await p.waitForTimeout(200);
    const last = await p.locator('.key').last().boundingBox();
    ok(last && last.y + last.height <= h + 1, `${w}: клавиатура в окне`);
    ok(await p.locator('.hang-word .hl').count() === 5, `${w}: 5 клеток`);
    ok((await p.evaluate(() => document.querySelector('.hang-top').innerText.toLowerCase())).includes('животное'), `${w}: подсказка видна угадывающему`);
    await key(p, 'ж');
    for (const ch of 'мышка') await key(p, ch);
    await p.waitForTimeout(200);
    ok((await body(p)).includes('отгадано'), `${w}: слово отгадано`);
    ok(JSON.stringify(await scores(p)) === JSON.stringify([0, 7]), `${w}: угадавший: 1 ошибка, 6+1 = 7 (${await scores(p)})`);
    await p.getByRole('button', { name: 'Дальше' }).click();
    const first = await p.evaluate(() => document.querySelector('.tb-name').textContent);
    await setWord(p, 'Подъёмник', '');
    ok(first !== await p.evaluate(() => document.querySelector('.tb-name').textContent), `${w}: роли чередуются`);
    for (const ch of 'жзийлтфхцчш') { if (await p.getByText('Не отгадано').count()) break; const k = p.locator('.key', { hasText: new RegExp('^' + ch + '$', 'i') }); if (await k.isEnabled()) await k.click(); }
    ok((await body(p)).includes('не отгадано. слово: «подъемник»'), `${w}: проигрыш, ё=е`);
    ok(JSON.stringify(await scores(p)) === JSON.stringify([0, 9]), `${w}: загадавший 1 + бонус за 9 букв (${await scores(p)})`);
    await p.getByRole('button', { name: 'Дальше' }).click();
    await setWord(p, 'арбуз', '');
    await p.getByRole('button', { name: 'Назвать слово целиком' }).click(); await p.getByLabel('Слово целиком').fill('дыня'); await p.getByRole('button', { name: 'Проверить' }).click();
    ok((await body(p)).includes('неверное'), `${w}: неверное слово целиком`);
    await p.getByRole('button', { name: 'Назвать слово целиком' }).click(); await p.getByLabel('Слово целиком').fill('АРБУЗ'); await p.getByRole('button', { name: 'Проверить' }).click();
    ok((await body(p)).includes('отгадано'), `${w}: слово целиком`);
    await p.getByRole('button', { name: 'Дальше' }).click();
    await setWord(p, 'лес', '');
    for (const ch of 'лес') await key(p, ch);
    await p.getByRole('button', { name: 'Итоги' }).click(); await p.waitForTimeout(300);
    ok(await p.locator('text=Сыграть ещё раз').count() === 1, `${w}: итоги после 4 раундов`);
    ok(!errs.length, `${w}: без ошибок` + (errs[0] ? ': ' + errs[0] : '')); await p.close();
  }
  { // общий счёт и рекорд
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await open(p, 'team', 4);
    for (let i = 0; i < 4; i++) {
      await setWord(p, 'сад', '');
      for (const ch of 'сад') await key(p, ch);
      await p.getByRole('button', { name: i == 3 ? 'Итоги' : 'Дальше' }).click();
    }
    await p.waitForTimeout(300);
    const t = await body(p);
    ok(t.includes('общий счёт: 32') && t.includes('рекорд'), 'вместе: 4×8=32, рекорд');
    ok(await p.evaluate(() => store.get('rec.hang.duo', 0)) === 32, 'рекорд записан');
    ok(!errs.length, 'вместе: без ошибок' + (errs[0] ? ': ' + errs[0] : '')); await p.close();
  }
  await b.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
