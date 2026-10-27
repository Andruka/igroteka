/* 13. Дословно — объясните выражение «буквально», команда угадывает и разгадывает смысл */
{
  const deck = makeDeck('idioms', DATA.idioms);
  const art = (c, size) => Pics.sticker(DATA.idiomArt[c.w] ? Pics.parts(DATA.idiomArt[c.w]) : Pics.find(c.w + ' ' + c.m), { size, key: c.w, fallback: '🗣️' });
  registerGame({
    id: 'literal', title: 'Дословно', icon: '🗣️', color: '#b6e24b',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 8 }, mins: 20,
    tagline: 'Опишите картинку, которая стоит за выражением, но не называйте его слов. Угадайте выражение и объясните смысл.',
    rules: '<ul><li>В свой ход рассказчик видит выражение, например «бить баклуши», и его смысл.</li><li>Он описывает <b>буквальную картинку</b> простыми словами: кто что делает. Слова из самого выражения называть нельзя.</li><li>Остальные угадывают выражение. Чем быстрее, тем больше очков: до 3.</li><li>Если угадала команда рассказчика, очки получает она. Если угадал соперник, очки получает он, а рассказчик получает одно очко.</li><li>Когда выражение угадано, объясните его настоящий смысл. Верно — ещё очко.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Ходов у каждой команды', values: [2, 3, 5], def: 3 },
      { key: 'time', label: 'Время на описание', values: [[30, '30 секунд'], [45, '45 секунд'], [60, '60 секунд']], def: 45 }
    ],
    cards: () => DATA.idioms.length,
    start(api) {
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const name = api.teams[ti].name; let skips = 2, card = deck.draw();
        intro();
        function intro() {
          api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Ход ' + k + ' из ' + total),
            h('p', { class: 'mid-t' }, 'Выберите рассказчика. Остальные отвернитесь от экрана: выражение увидит только он.'),
            btn('Показать рассказчику', reveal, 'big', { 'data-primary': true })), { turn: ti, mid: true, role: 'Выбирает рассказчика' });
        }
        function reveal() {
          api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Только для рассказчика'), art(card, 'xl'), h('div', { class: 'big' }, card.w), h('p', { class: 'hint' }, 'Смысл: ' + card.m + '.'),
            h('p', { class: 'hint' }, 'Опишите буквальную картинку. Слова выражения называть нельзя.')),
          h('div', { class: 'row' }, btn('Запомнил — поехали!', play, 'big', { 'data-primary': true }), skips > 0 ? btn('Другое выражение (' + skips + ')', () => { skips--; card = deck.draw(); reveal(); }, 'paper') : null)], { turn: ti });
        }
        function play() {
          const total0 = api.opts.time; let done = false;
          const timer = Timer(total0, { onEnd: timeUp });
          const hold = peek(h('div', { class: 'card withpic' }, art(card, 'l'), h('div', { class: 'qbody' }, h('div', { class: 'big' }, card.w))), 'Подсмотреть выражение');
          api.show([
            h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Описывает ' + name), h('div', { class: 'mid-t' }, 'Расскажите, что происходит «на самом деле», как будто выражение понимается дословно.'), timer.el),
            hold,
            h('div', { class: 'row' }, btn('Угадали!', guessed, 'big good', { 'data-primary': true }), skips > 0 ? btn('Пропустить (' + skips + ')', () => { skips--; timer.stop(); card = deck.draw(); reveal(); }, 'paper') : null)
          ], { turn: ti, role: 'Описывает картинку, не называя слов' });
          timer.start();
          function guessed() {
            if (done) return; done = true; const left = timer.left; timer.stop();
            const p = left >= total0 * .66 ? 3 : left >= total0 * .33 ? 2 : 1;
            if (api.n === 2) { who(0, p, true); return; }
            api.show([h('div', { class: 'big' }, 'Кто угадал?'), api.pickTeam('Выберите команду, которая назвала выражение:', w => who(w, p), {})], { turn: -1, role: 'Отмечаем, кто угадал', who: 'Все команды' });
          }
          function who(w, p, two) {
            if (two) {
              return api.show([h('div', { class: 'big' }, 'Кто угадал?'), api.pickTeam('Кто назвал выражение?', w2 => who2(w2, p), {})], { turn: -1, role: 'Отмечаем, кто угадал', who: 'Все команды' });
            }
            who2(w, p);
          }
          function who2(w, p) {
            if (w === ti) api.score(ti, p); else { api.score(w, p); api.score(ti, 1); }
            sfx.ok();
            api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Выражение'), art(card, 'l'), h('div', { class: 'big' }, card.w)),
              h('div', { class: 'ans' }, 'Баллы: ' + api.teams[w].name + ' +' + p + (w === ti ? '' : ', ' + name + ' +1') + '.'),
              judgeRow(api, 'Теперь объясните, что это значит. Получилось?', 'Объяснили верно (+1)', ok => { if (ok) { api.score(w, 1); sfx.ok(); } else sfx.bad(); show(); }, 'Не смогли')], { turn: ti });
            function show() {
              api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, card.w), h('div', { class: 'big' }, card.m), btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })), { turn: ti, mid: true });
            }
          }
          function timeUp() {
            if (done) return; done = true; sfx.buzz();
            const q = api.pickTeam('Время вышло. Кто из соперников всё-таки назвал выражение?', w => { if (w >= 0) { api.score(w, 1); sfx.ok(); } show2(w >= 0 ? api.teams[w].name + ' угадали: +1 очко.' : 'Никто не угадал.'); }, { exclude: [ti], none: 'Никто' });
            api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Время вышло. Это было:'), art(card, 'l'), h('div', { class: 'big' }, card.w)), q], { turn: api.n > 1 ? -1 : ti, role: 'Перехват: отмечаем, кто угадал', who: 'Соперники' });
          }
          function show2(msg) {
            api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, card.w), h('div', { class: 'big' }, card.m), h('p', { class: 'mid-t' }, msg), btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })), { turn: ti, mid: true });
          }
        }
      });
    }
  });
}
