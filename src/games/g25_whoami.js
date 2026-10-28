/* 25. Кто я? — задавайте вопросы, на которые отвечают «да» или «нет» */
{
  const items = [];
  const _seen = new Set(); for (const c in DATA.whoami) DATA.whoami[c].split(',').forEach(w => { w = w.trim(); if (w && !_seen.has(w.toLowerCase())) { _seen.add(w.toLowerCase()); items.push({ c, w }); } });
  const itemsH = []; for (const c in DATA.whoamiHard) DATA.whoamiHard[c].split(',').forEach(w => { w = w.trim(); if (w) itemsH.push({ c, w }); });
  const deck0 = makeDeck('whoami', items), deckH = makeDeck('whoamihard', itemsH);
  registerGame({
    id: 'whoami', title: 'Кто я?', icon: '🎭', color: '#ff7ab8',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 8 }, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', mins: 20,
    tagline: 'Вам загадали персонажа или предмет. Задавайте остальным вопросы, на которые можно ответить «да» или «нет».',
    rules: '<ul><li>Угадывающий отворачивается от экрана. Остальные видят загаданное слово.</li><li>Угадывающий задаёт вопросы, на которые можно ответить только «да» или «нет»: «Я живой?», «Я из мультфильма?».</li><li>Время ограничено. Угадал: 3, 2 или 1 очко в зависимости от скорости.</li><li>Слово можно сменить один раз за ход, если оно оказалось совсем незнакомым.</li></ul>',
    opts: [
      LEVEL_OPT,
      { key: 'cats', label: 'Категории', multi: true, values: () => [...new Set(items.concat(itemsH).map(x => x.c))], def: [] },
      { key: 'rounds', label: 'Ходов у каждого', values: [1, 2, 3], def: 2 },
      { key: 'time', label: 'Время на вопросы', values: [[60, '60 секунд'], [90, '90 секунд'], [120, '2 минуты']], def: 90 }
    ],
    cards: () => items.length + itemsH.length,
    start(api) {
      const deck = levelDeck(deck0, deckH, api.opts.level);
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const name = api.teams[ti].name; const cs = api.opts.cats || [], filt = x => !cs.length || cs.includes(x.c); let card = deck.draw(filt), swapped = false;
        api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Ход ' + k + ' из ' + total), h('div', { class: 'big' }, name + ' угадывает'),
          h('p', { class: 'mid-t' }, name + ', отвернитесь от экрана. Остальные, запомните слово и отвечайте только «да» или «нет».'),
          btn('Показать слово остальным', show, 'big', { 'data-primary': true })), { turn: ti, mid: true, role: 'Отворачивается и угадывает' });
        function show() {
          api.show([
            h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Только для остальных · ' + card.c), Pics.of(card.w, { size: 'l', fallback: '🎭' }), h('div', { class: 'big' }, card.w)),
            h('div', { class: 'row' }, btn('Запомнили — начинаем', play, 'big', { 'data-primary': true }), !swapped ? btn('Другое слово', () => { swapped = true; card = deck.draw(filt); show(); }, 'paper') : null)
          ], { turn: ti, role: 'Угадывающий не смотрит' });
        }
        function play() {
          const total0 = api.opts.time; let done = false, asked = 0;
          const timer = Timer(total0, { onEnd: () => { if (done) return; done = true; sfx.buzz(); finish(false); } });
          const cnt = h('span', null, '0');
          api.show([
            h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, name + ' задаёт вопросы'), h('div', { class: 'mid-t' }, 'Вопросов задано: ', cnt), timer.el),
            peek(h('div', { class: 'ans' }, 'Загадано: ' + card.w), 'Нажмите, чтобы напомнить слово остальным'),
            h('div', { class: 'row' }, btn('Вопрос задан', () => { asked++; cnt.textContent = asked; sfx.click(); }, 'paper'), btn('Угадал!', () => { if (done) return; done = true; const left = timer.left; timer.stop(); const p = left >= total0 * .6 ? 3 : left >= total0 * .3 ? 2 : 1; api.score(ti, p); sfx.ok(); finish(true, p); }, 'big good', { 'data-primary': true }))
          ], { turn: ti, role: 'Задаёт вопросы «да» или «нет»' });
          timer.start();
        }
        function finish(ok, p) {
          api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Загадано'), Pics.of(card.w, { size: 'l', fallback: '🎭' }), h('div', { class: 'big' }, card.w), h('div', { class: 'mid-t' }, ok ? name + ' угадал(а): +' + pts(p) + '.' : 'Время вышло. Очков нет.')),
            btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })], { turn: ti, role: 'Итог хода' });
        }
      });
    }
  });
}
