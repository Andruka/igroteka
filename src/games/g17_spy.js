/* 17. Шпион — найдите чужака, который не знает, где вы */
{
  const places = makeDeck('spy', DATA.spyPlaces);
  registerGame({
    id: 'spy', title: 'Шпион', icon: '🕵️', color: '#6d5ef0',
    cats: ['Для компании', 'Загадки и истории'], teams: { min: 3, max: 8 }, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', mins: 20,
    tagline: 'Все знают, где находятся, кроме шпиона. Задавайте друг другу вопросы и вычислите его, не выдав место.',
    rules: '<ul><li>Устройство идёт по кругу: каждый втайне смотрит свою карточку. Все видят одно место и свою роль в нём, шпион — только слово «Шпион».</li><li>Потом по очереди задаёте друг другу вопросы про это место. Отвечать нужно так, чтобы шпион не догадался, но не выдать место посторонним.</li><li>В любой момент можно проголосовать за подозреваемого. Если шпиона вычислили, у него есть шанс угадать место.</li><li>Шпион может сам раскрыться и назвать место. Угадал — он побеждает.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Раундов', values: [1, 2, 3, 5], def: 2 },
      { key: 'time', label: 'Время на допрос', values: [[240, '4 минуты'], [360, '6 минут'], [480, '8 минут']], def: 360 }
    ],
    cards: () => DATA.spyPlaces.length,
    start(api) {
      let round = 0;
      nextRound();
      function nextRound() {
        if (round >= api.opts.rounds) return api.end();
        round++;
        const place = places.draw(), roles = shuffle(place[1].split(',')), spy = rnd(api.n), first = rnd(api.n);
        const role = i => roles[i % roles.length];
        deal(0);
        function deal(i) {
          if (i >= api.n) return party();
          handover(api, api.teams[i].name, 'Раунд ' + round + ' из ' + api.opts.rounds + '. Возьмите устройство, остальные не смотрите на экран.', () => {
            api.show([
              h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Секретно'),
                i === spy ? h('div', null, h('div', { class: 'big' }, 'Вы — шпион'), h('p', { class: 'mid-t' }, 'Вы не знаете, где находитесь. Слушайте, задавайте вопросы и постарайтесь понять место.'))
                  : h('div', null, h('div', { class: 'kicker' }, 'Место'), h('div', { class: 'big' }, place[0]), h('p', { class: 'mid-t' }, 'Ваша роль: ' + role(i)))),
              btn(i === api.n - 1 ? 'Запомнил — к допросу' : 'Запомнил — передать дальше', () => deal(i + 1), 'big', { 'data-primary': true })
            ], { turn: i, role: 'Смотрит свою роль' });
          }, 'Показать карточку', i);
        }
        function party() {
          const timer = Timer(api.opts.time, { onEnd: () => { sfx.buzz(); vote(); } });
          api.show([
            h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Допрос · раунд ' + round), h('div', { class: 'mid-t' }, 'Первым задаёт вопрос ' + api.teams[first].name + '. Затем спрашивает тот, кому ответили.'), timer.el),
            h('div', { class: 'row' }, btn('Голосуем за шпиона', () => { timer.stop(); vote(); }, 'big', { 'data-primary': true }), btn('Я шпион — называю место', () => { timer.stop(); spyGuess('own'); }, 'paper'))
          ], { turn: -1, role: 'Задавайте друг другу вопросы', who: 'Все игроки' });
          timer.start();
        }
        function vote() {
          api.show([h('p', { class: 'mid-t' }, 'Обсудите и договоритесь, кого подозреваете.'), api.pickTeam('Кто, по-вашему, шпион?', who => who === spy ? spyGuess('caught') : result(false, 'Не тот. Шпионом был ' + api.teams[spy].name + '.', true))], { turn: -1, role: 'Общее голосование', who: 'Все игроки' });
        }
        function spyGuess(how) {
          const opts = shuffle(DATA.spyPlaces.map(p => p[0]));
          api.show([
            h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, how === 'own' ? 'Шпион раскрылся' : 'Шпиона вычислили'), h('div', { class: 'big' }, api.teams[spy].name + ', где вы были?'), h('p', { class: 'mid-t' }, 'Назовите место. Угадаете — победа ваша.')),
            h('div', { class: 'picks' }, opts.map(p => btn(p, () => result(p === place[0], p === place[0] ? 'Шпион угадал место.' : 'Шпион ошибся, место: ' + place[0] + '.', false), 'pick')))
          ], { turn: spy, role: 'Шпион называет место' });
        }
        function result(spyWins, msg) {
          if (spyWins) api.score(spy, 2); else range(api.n).forEach(i => { if (i !== spy) api.score(i, 1); });
          spyWins ? sfx.bad() : sfx.ok();
          api.show([h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Раунд ' + round + ' из ' + api.opts.rounds), h('div', { class: 'big' }, spyWins ? 'Шпион победил' : 'Шпиона нашли'),
            h('p', { class: 'mid-t' }, msg + ' Место: ' + place[0] + '. Шпион: ' + api.teams[spy].name + '.'),
            h('p', { class: 'mid-t' }, spyWins ? api.teams[spy].name + ' получает 2 очка.' : 'Остальные получают по очку.'),
            btn(round >= api.opts.rounds ? 'Итоги' : 'Следующий раунд', nextRound, 'big', { 'data-primary': true }))], { turn: -1, mid: true, role: 'Итог раунда', who: 'Все игроки' });
        }
      }
    }
  });
}
