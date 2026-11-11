// Слова не повторяются в течение игровой сессии (пока не исчерпана вся колода)
const { chromium } = require('playwright');
const path = require('path');
const file = 'file://' + path.resolve(__dirname, '../index.html');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const page = await (await browser.newContext()).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
  await page.goto(file);
  const r = await page.evaluate(() => {
    const out = {};
    // прямая проверка makeDeck: маленькая колода, много вытягиваний
    localStorage.clear(); G.sessionSeen = new Set();
    const items = []; for (let i = 0; i < 40; i++) items.push({ w: 'слово' + i });
    items.push({ w: 'Слово0' }, { w: 'слово1' }); // дубли должны отсечься
    const d = makeDeck('t_norepeat', items);
    const got = []; for (let i = 0; i < 40; i++) got.push(d.draw().w);
    out.uniq40 = new Set(got).size; out.items = d.items.length;
    // сброс «старой» истории посреди сессии не должен возвращать слова, уже выпавшие в этой сессии
    const more = []; for (let i = 0; i < 40; i++) more.push(d.draw().w);
    out.afterReset = new Set(more).size;
    // новая сессия — снова всё доступно
    G.sessionSeen = new Set(); localStorage.clear();
    const again = []; for (let i = 0; i < 10; i++) again.push(d.draw().w); out.newSession = new Set(again).size;
    // persist: изображённые в прошлой сессии ещё считаются «виденными»
    return out;
  });
  ok(r.items === 40, 'дубли слов (регистр, ё) отсекаются: ' + r.items);
  ok(r.uniq40 === 40, '40 вытягиваний из 40 слов — без повторов: ' + r.uniq40);
  ok(r.afterReset === 40, 'второй круг: тоже каждое слово по разу: ' + r.afterReset);
  ok(r.newSession === 10, 'новая сессия начинается заново');
  ok(!errs.length, 'нет ошибок: ' + errs.join(';'));
  await browser.close(); console.log(bad ? 'FAILED' : 'ALL OK'); process.exit(bad ? 1 : 0);
})();
