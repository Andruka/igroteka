/* 6. Кино с подвохом — объясни фильм в странном стиле */
{
  const films = makeDeck('films', DATA.films), styles = makeDeck('styles', DATA.styles);
  registerGame({
    id: 'cinema', title: 'Кино с подвохом', icon: '🎞️', color: '#3aa0ff',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 8 }, mins: 25,
    tagline: 'Объясните название фильма в нелепом стиле — как диктор, пират или робот. Команда угадывает.',
    rules: '<ul><li>В свой ход один из команды становится рассказчиком. Он видит название и «стиль» — например, «как футбольный комментатор».</li><li>Задание видит только он: остальные отворачиваются. Потом название скрывается, а стиль виден всем.</li><li>Расскажите сюжет в этом стиле. <b>Нельзя</b> произносить слова из названия.</li><li>Угадали быстро — до 3 очков. Время вышло — соперники могут получить очко, если назовут фильм.</li><li>Можно пропустить задание (два раза за ход) или ненадолго подсмотреть его, зажав кнопку.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Ходов у каждой команды', values: [2, 3, 5], def: 3 },
      { key: 'time', label: 'Время на рассказ', values: [[45, '45 секунд'], [60, '60 секунд'], [90, '90 секунд']], def: 60 },
      { key: 'style', label: 'Стиль рассказа', values: [[1, 'С подвохом'], [0, 'Без стиля']], def: 1 }
    ],
    cards: () => DATA.films.length,
    start(api) {
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const name = api.teams[ti].name; let skips = 2, card;
        const fresh = () => card = { title: films.draw(), style: api.opts.style ? styles.draw() : null };
        fresh(); intro();
        function intro() {
          api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Ход ' + k + ' из ' + total),
            h('p', { class: 'mid-t' }, 'Выберите рассказчика. Остальные отвернитесь от экрана — задание увидит только он.'),
            btn('Показать задание рассказчику', reveal, 'big', { 'data-primary': true })), { turn: ti, mid: true, role: 'Выбирает рассказчика' });
        }
        function styleBox() { return card.style ? h('div', { class: 'ans' }, h('div', { class: 'kv' }, h('span', { class: 'badge' }, 'Стиль'), h('b', null, card.style.s)), h('div', { class: 'hint', style: { color: '#c7cdf5' } }, card.style.d)) : null; }
        function reveal() {
          api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Только для рассказчика'), Pics.of(card.title, { size: 'l', fallback: '🎞️' }), h('div', { class: 'big' }, card.title), styleBox(),
            h('p', { class: 'hint' }, 'Запомните название. Слова из названия произносить нельзя.')),
          h('div', { class: 'row' }, btn('Запомнил — поехали!', play, 'big', { 'data-primary': true }), skips > 0 ? btn('Другое задание (' + skips + ')', () => { skips--; fresh(); reveal(); }, 'paper') : null)], { turn: ti });
        }
        function play() {
          const timer = Timer(api.opts.time, { onEnd: () => timeUp() }); const total0 = api.opts.time; let done = false;
          const hold = peek(h('div', { class: 'card' }, h('div', { class: 'big' }, card.title)), 'Подсмотреть название (зажать)');
          api.show([
            h('div', { class: 'card accent withpic' }, Pics.of(card.style ? card.style.s + ' ' + card.style.d : '', { size: 'xl', fallback: '🎭' }), h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, 'Идёт рассказ · ' + name), h('div', { class: 'big' }, card.style ? card.style.s : 'Объясняйте как хотите'), card.style ? h('div', { class: 'mid-t' }, card.style.d) : null, timer.el)),
            hold,
            h('div', { class: 'row' }, btn('Угадали!', guessed, 'big good', { 'data-primary': true }), skips > 0 ? btn('Пропустить (' + skips + ')', () => { skips--; timer.stop(); fresh(); reveal(); }, 'paper') : null)
          ], { turn: ti, role: 'Объясняет без слов названия' });
          timer.start();
          function guessed() {
            if (done) return; done = true; const left = timer.left; timer.stop(); const p = left >= total0 * .66 ? 3 : left >= total0 * .33 ? 2 : 1;
            api.score(ti, p); sfx.ok(); finish('Угадали! ' + name + ': +' + pts(p) + '.');
          }
          function timeUp() {
            if (done) return; done = true; sfx.buzz();
            const who = api.n > 1 ? api.pickTeam('Время вышло. Кто из соперников назвал фильм?', w => { if (w >= 0) { api.score(w, 1); sfx.ok(); } finish(w >= 0 ? api.teams[w].name + ' угадали: +1 очко.' : 'Никто не угадал.'); }, { exclude: [ti], none: 'Никто' }) : null;
            api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Время вышло. Это был фильм:'), h('div', { class: 'big' }, card.title)), who || btn('Дальше', next, 'big', { 'data-primary': true })], api.n > 1 ? { turn: -1, role: 'Перехват: отмечаем, кто угадал', who: 'Соперники' } : { turn: ti });
          }
        }
        function finish(msg) {
          api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Это был фильм:'), h('div', { class: 'big' }, card.title), h('div', { class: 'mid-t' }, msg)), btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })], { turn: ti });
        }
      });
    }
  });
}
