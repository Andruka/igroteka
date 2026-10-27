/* 15. Крокодил — покажи слово без слов */
{
  const items = [];
  const _seen = new Set(); for (const l in DATA.charades) for (const c in DATA.charades[l]) DATA.charades[l][c].split(',').forEach(w => { w = w.trim(); if (w && !_seen.has(w.toLowerCase())) { _seen.add(w.toLowerCase()); items.push({ l: +l, c, w }); } });
  const deck = makeDeck('charades', items);
  registerGame({
    id: 'charades', title: 'Крокодил', icon: '🐊', color: '#22c58b',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 6 }, mins: 20,
    tagline: 'Покажите слово жестами и мимикой, не произнося ни звука. Команда угадывает, пока не вышло время.',
    rules: '<ul><li>В свой ход один из команды становится актёром. Остальные в команде — угадывающие, соперники следят за честностью.</li><li>Актёр видит слово на экране, пока остальные отвернулись. Затем включается таймер.</li><li>Показывать можно жестами, мимикой и движениями. Говорить, издавать звуки и показывать на предметы с буквами нельзя.</li><li>Чем быстрее угадали, тем больше очков: от 1 до 3. Слово можно сменить два раза за ход.</li></ul>',
    opts: [
      { key: 'cats', label: 'Категории слов', multi: true, values: () => [...new Set(items.map(x => x.c))], def: [] },
      { key: 'rounds', label: 'Ходов у каждой команды', values: [2, 3, 5], def: 3 },
      { key: 'time', label: 'Время на показ', values: [[45, '45 секунд'], [60, '60 секунд'], [90, '90 секунд']], def: 60 },
      { key: 'level', label: 'Сложность слов', values: [[1, 'Лёгкие'], [2, 'Средние'], [3, 'Сложные'], [0, 'Все вперемешку']], def: 2 }
    ],
    cards: () => items.length,
    start(api) {
      const lvl = api.opts.level, cs = api.opts.cats || [], filt = x => (!lvl || x.l === lvl) && (!cs.length || cs.includes(x.c));
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const name = api.teams[ti].name; let skips = 2, card = deck.draw(filt);
        intro();
        function intro() {
          api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Ход ' + k + ' из ' + total),
            h('p', { class: 'mid-t' }, 'Выберите актёра. Все остальные отвернитесь от экрана: слово увидит только он.'),
            btn('Показать слово актёру', reveal, 'big', { 'data-primary': true })), { turn: ti, mid: true, role: 'Выбирает актёра' });
        }
        function reveal() {
          api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Только для актёра · ' + card.c), Pics.of(card.w, { size: 'l', fallback: '🎭' }), h('div', { class: 'big' }, card.w),
            h('p', { class: 'hint' }, 'Запомните слово. Говорить и издавать звуки нельзя.')),
          h('div', { class: 'row' }, btn('Запомнил — поехали!', play, 'big', { 'data-primary': true }), skips > 0 ? btn('Другое слово (' + skips + ')', () => { skips--; card = deck.draw(filt); reveal(); }, 'paper') : null)], { turn: ti, role: 'Актёр запоминает слово' });
        }
        function play() {
          const total0 = api.opts.time; let done = false; const timer = Timer(total0, { onEnd: timeUp });
          const hold = peek(h('div', { class: 'card' }, h('div', { class: 'big' }, card.w)), 'Подсмотреть слово (зажать)');
          api.show([
            h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, card.c), h('div', { class: 'mid-t' }, 'Показывайте слово без звуков. Команда угадывает вслух.'), timer.el),
            hold,
            h('div', { class: 'row' }, btn('Угадали!', guessed, 'big good', { 'data-primary': true }), skips > 0 ? btn('Пропустить (' + skips + ')', () => { skips--; timer.stop(); card = deck.draw(filt); reveal(); }, 'paper') : null)
          ], { turn: ti, role: 'Показывает слово без звуков' });
          timer.start();
          function guessed() {
            if (done) return; done = true; const left = timer.left; timer.stop();
            const p = left >= total0 * .66 ? 3 : left >= total0 * .33 ? 2 : 1; api.score(ti, p); sfx.ok(); finish('Угадали! ' + name + ': +' + pts(p) + '.');
          }
          function timeUp() { if (done) return; done = true; sfx.buzz(); finish('Время вышло. Очков нет.'); }
        }
        function finish(msg) {
          api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Слово было'), Pics.of(card.w, { size: 'l', fallback: '🎭' }), h('div', { class: 'big' }, card.w), h('div', { class: 'mid-t' }, msg)),
            btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })], { turn: ti, role: 'Итог хода' });
        }
      });
    }
  });
}
