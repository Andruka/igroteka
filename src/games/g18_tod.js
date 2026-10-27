/* 18. Правда или действие */
{
  const truths = makeDeck('truth', DATA.truths), dares = makeDeck('dare', DATA.dares);
  registerGame({
    id: 'tod', title: 'Правда или действие', icon: '🎲', color: '#ff8a3d',
    cats: ['Для компании', 'Для двоих'], teams: { min: 2, max: 8 }, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', mins: 20,
    tagline: 'Выберите: честно ответить на вопрос или выполнить смешное задание. Без неприличного и опасного.',
    rules: '<ul><li>В свой ход игрок выбирает «Правду» или «Действие». Или доверяет случаю.</li><li>Правда: отвечаете честно и вслух. Действие: выполняете задание.</li><li>Остальные решают, засчитать ли. Выполнили — одно очко. Можно сказать «Пас» — очков нет.</li><li>Уровень острости выбирается перед игрой. Любой может отказаться от того, что ему неприятно.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Ходов у каждого', values: [2, 3, 5], def: 3 },
      { key: 'level', label: 'Острота', values: [[1, 'Дружеская'], [2, 'Повеселее'], [3, 'Посмелее'], [0, 'Всё вперемешку']], def: 2 }
    ],
    cards: () => DATA.truths.length + DATA.dares.length,
    start(api) {
      const lvl = api.opts.level, filt = x => !lvl || x.l <= lvl;
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const name = api.teams[ti].name;
        api.show([
          h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Ход ' + k + ' из ' + total), h('div', { class: 'big' }, 'Правда или действие?')),
          h('div', { class: 'row' }, btn('Правда', () => card('t'), 'big sky', { 'data-primary': true }), btn('Действие', () => card('d'), 'big bad'), btn('Случайно', () => card(Math.random() < .5 ? 't' : 'd'), 'paper'))
        ], { turn: ti, role: 'Выбирает правду или действие' });
        function card(kind) {
          const c = (kind === 't' ? truths : dares).draw(filt) || (kind === 't' ? truths : dares).draw();
          api.show([
            h('div', { class: 'card accent withpic' }, Pics.of(c.t, { size: 'xl', fallback: kind === 't' ? '🗣️' : '🎭' }), h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, kind === 't' ? 'Правда' : 'Действие'), h('div', { class: 'big' }, c.t))),
            judgeRow(api, 'Остальные решают: засчитываем?', kind === 't' ? 'Ответил(а) честно (+1)' : 'Выполнил(а) (+1)', ok => { if (ok) { api.score(ti, 1); sfx.ok(); } else sfx.bad(); step(ok); }, 'Пас (0)')
          ], { turn: ti, role: kind === 't' ? 'Отвечает честно' : 'Выполняет задание' });
        }
        function step(ok) {
          api.show(h('div', { class: 'cover' }, h('div', { class: 'big' }, ok ? name + ': +1 очко' : 'Пас'), btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })), { turn: ti, mid: true, role: 'Итог хода' });
        }
      });
    }
  });
}
