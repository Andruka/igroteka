/* 21. Пять подсказок */
{
  const deck = makeDeck('clues', DATA.clues);
  registerGame({
    id: 'clues', title: 'Пять подсказок', icon: '🔎', color: '#19c2c9',
    cats: ['Викторины', 'Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 6 }, mins: 20,
    tagline: 'Угадайте загаданное по подсказкам: чем раньше угадали, тем больше очков. Подсказки ходят по командам по кругу.',
    rules: '<ul><li>Ведущий читает подсказку вслух. Первая подсказка самая трудная, последняя самая лёгкая.</li><li>Отвечать может только команда, чей сейчас ход. Она называет ответ вслух, ведущий проверяет по экрану.</li><li>Угадали по первой подсказке: 5 очков. По второй: 4. И так до одного очка.</li><li>Не угадали? Следующая подсказка достаётся следующей команде.</li></ul>',
    opts: [{ key: 'rounds', label: 'Загадок у каждой команды', values: [1, 2, 3], def: 2 }],
    cards: () => DATA.clues.length,
    start(api) {
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const q = deck.draw(); let step = 0;
        clue();
        function clue() {
          const who = (ti + step) % api.n;
          const lines = q.c.slice(0, step + 1).map((c, i) => h('li', { class: i === step ? 'newest' : '' }, c));
          api.show([
            h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Загадка ' + k + ' из ' + total + ' · ' + q.cat), h('ol', { class: 'cluelist' }, lines), h('div', { class: 'mid-t' }, 'Подсказка ' + (step + 1) + ' из ' + q.c.length + ' · за ответ ' + pts(q.c.length - step))),
            peek(h('div', { class: 'ans' }, 'Ответ: ' + q.a), 'Зажмите, чтобы ведущий проверил ответ'),
            judgeRow(api, 'Что ответила команда?', 'Угадали', ok => { if (ok) { api.score(who, q.c.length - step); sfx.ok(); done('Угадали: ' + api.teams[who].name + ' (+' + pts(q.c.length - step) + ').'); } else { sfx.bad(); step++; step >= q.c.length ? done('Подсказки закончились. Никто не угадал.') : clue(); } }, 'Мимо')
          ], { turn: who, role: 'Отвечает по подсказке ' + (step + 1) });
        }
        function done(msg) {
          api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Ответ'), Pics.of(q.a, { size: 'l', fallback: '🔎' }), h('div', { class: 'big' }, q.a), h('div', { class: 'mid-t' }, msg)),
            btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })], { turn: -1, role: 'Итог загадки', who: 'Все' });
        }
      });
    }
  });
}
