/* 2. Эмодзи-кино — угадать фильм, мультфильм или сериал по смайликам */
{
  const deck = makeDeck('emoji', DATA.emoji);
  const pattern = n => n.split(' ').map(w => w[0] + w.slice(1).replace(/[А-Яа-яЁёA-Za-z0-9]/g, '_')).join('  ');
  registerGame({
    id: 'emoji', title: 'Эмодзи-кино', icon: '🎬', color: '#ff7ab8',
    cats: ['Викторины', 'Для компании', 'Для двоих'], teams: { min: 1, max: 8 }, mins: 25,
    tagline: 'Смайлики зашифровали название фильма, мультфильма или сериала. Кто угадает быстрее?',
    rules: '<ul><li>Команда видит цепочку смайликов и угадывает название. Достаточно назвать его близко к оригиналу.</li><li>Чем меньше подсказок, тем больше очков: <b>3</b> без подсказки, <b>2</b> с первой, <b>1</b> со второй.</li><li>Отвечает только команда, чей сейчас ход. Когда время вышло или она готова ответить, нажмите «Показать ответ» и отметьте, угадала ли она.</li><li>Если не угадала, остальные команды могут перехватить загадку: та, что назвала верно, получает 1 очко.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Загадок у каждой команды', values: [3, 5, 8], def: 5 },
      { key: 'level', label: 'Сложность', values: [[0, 'Любая'], [1, 'Лёгкая'], [2, 'Средняя'], [3, 'Сложная']], def: 0 },
      { key: 'time', label: 'Время на загадку', values: [[30, '30 секунд'], [45, '45 секунд'], [60, '60 секунд']], def: 45 }
    ],
    cards: () => DATA.emoji.length,
    start(api) {
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const lvl = api.opts.level; const c = deck.draw(x => !lvl || x.l === lvl);
        let hints = 0, revealed = false;
        const timer = Timer(api.opts.time, { onEnd: () => reveal() });
        const hintBox = h('div', { class: 'mid-t' }), actions = h('div', { class: 'row' }), after = h('div', { class: 'stack' });
        const hintBtn = btn('Подсказка (−1 очко)', () => {
          hints++; sfx.ding();
          hintBox.replaceChildren(h('div', null, c.t + ', слов в названии: ' + c.n.split(' ').length), hints > 1 ? h('div', { class: 'big', style: { letterSpacing: '.08em' } }, pattern(c.n)) : null);
          if (hints >= 2) hintBtn.disabled = true;
          kick.textContent = 'Угадайте название · ' + points() + ' ' + plural(points(), 'очко', 'очка', 'очков');
        }, 'paper');
        const points = () => Math.max(1, 3 - hints);
        const kick = h('div', { class: 'kicker' }, 'Угадайте название · 3 очка');
        function reveal() {
          if (revealed) return; revealed = true; timer.stop(); sfx.ding();
          actions.replaceChildren(); hintBtn.disabled = true;
          const p = points();
          after.replaceChildren(
            h('div', { class: 'ans' }, h('div', { class: 'kv' }, h('span', { class: 'badge' }, c.t), h('span', { class: 'big' }, c.n))),
            h('div', { class: 'stack' }, h('div', { class: 'mid-t' }, api.teams[ti].name + ' назвала название верно?'),
              h('div', { class: 'row' }, btn('Да, +' + pts(p), () => done(ti, p), 'big good', { 'data-primary': true }), btn('Нет', miss, 'big bad'))));
          api.setTurn(ti, 'Проверка ответа');
        }
        function done(who, p) {
          if (who >= 0) { api.score(who, p); sfx.ok(); } else sfx.bad();
          after.replaceChildren(btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })); after.firstChild.focus();
        }
        function miss() {
          sfx.bad();
          if (api.n < 2) return done(-1, 0);
          api.setTurn(-1, 'Перехват за 1 очко', 'Остальные команды');
          after.replaceChildren(h('div', { class: 'ans' }, h('div', { class: 'kv' }, h('span', { class: 'badge' }, c.t), h('span', { class: 'big' }, c.n))),
            api.pickTeam('Перехват: кто из остальных назвал название верно? (+1 очко)', who => done(who, 1), { exclude: [ti], none: 'Никто не угадал' }));
        }
        actions.append(btn('Показать ответ', reveal, 'big', { 'data-primary': true }), hintBtn);
        api.show([
          turnHead(api, ti, 'Загадка ' + k + ' из ' + total),
          h('div', { class: 'card center' }, kick, h('p', { class: 'hint' }, 'Отвечает ' + api.teams[ti].name + '. Остальные молчат: если она не угадает, будет перехват.'), h('div', { class: 'emoji-big' }, c.e), timer.el, hintBox),
          actions, after
        ], { turn: ti, role: 'Угадывает фильм по эмодзи' });
        timer.start();
      });
    }
  });
}
