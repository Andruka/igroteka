/* 7. Горячая бомба — передавай дальше, пока не рванёт */
{
  const deck = makeDeck('bomb', DATA.bomb);
  registerGame({
    id: 'bomb', title: 'Горячая бомба', icon: '💣', color: '#ff6b57',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 8 }, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', mins: 15,
    tagline: 'Назовите слово по теме и передайте бомбу соседу. Кто держит её в момент взрыва, тот выбывает из раунда.',
    rules: '<ul><li>В начале раунда показывается тема, например «Назовите фрукты» или короткое задание.</li><li>Бомба стоит на экране и тикает. Никто не знает, когда она рванёт.</li><li>У кого бомба: вслух называет подходящее слово (или выполняет задание) и жмёт «Передать дальше» для следующего игрока.</li><li>Нельзя повторять уже названное. Если игрок затянул, повторился или назвал мимо темы, остальные кричат «взрыв!» и жмут красную кнопку.</li><li>Кто держит бомбу, когда она взорвалась, проигрывает раунд. Все остальные получают по очку.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Бомб', values: [3, 5, 8], def: 5 },
      { key: 'fuse', label: 'Длина запала', values: [[1, 'Короткий'], [2, 'Средний'], [3, 'Длинный']], def: 2 }
    ],
    cards: () => DATA.bomb.length,
    start(api) {
      let round = 0, first = Math.floor(Math.random() * api.n);
      const total = api.opts.rounds;
      const range0 = { 1: [8, 20], 2: [15, 35], 3: [25, 55] }[api.opts.fuse];
      next();
      function next() {
        if (round >= total) return api.end();
        round++;
        const card = deck.draw();
        const holder0 = (first + round - 1) % api.n;
        api.show([
          h('div', { class: 'card accent withpic' }, Pics.of(card.q, { size: 'xl', fallback: card.t === 'a' ? '🎬' : '💣' }), h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, 'Бомба ' + round + ' из ' + total + (card.t === 'a' ? ' · задание' : ' · тема')),
            h('div', { class: 'big' }, card.q), h('p', { class: 'mid-t muted' }, 'Первым бомбу получает ' + api.teams[holder0].name + '.'))),
          btn('Запустить бомбу', () => play(card, holder0), 'big', { 'data-primary': true })
        ], { turn: holder0, role: 'Первым получает бомбу' });
      }
      function play(card, start) {
        let holder = start, over = false, passes = 0;
        const fuse = (range0[0] + Math.random() * (range0[1] - range0[0])) * 1000;
        const t0 = Date.now();
        let tickTimer = null, boomTimer = null;
        const bomb = h('div', { class: 'bomb' }, '💣');
        const who = h('div', { class: 'big' });
        const sub = h('div', { class: 'kicker' });
        const stop = () => { clearTimeout(tickTimer); clearTimeout(boomTimer); };
        onLeave(stop);
        const tick = () => {
          if (over) return;
          const frac = Math.min(1, (Date.now() - t0) / fuse);
          sfx.tick();
          bomb.classList.remove('pulse'); void bomb.offsetWidth; bomb.classList.add('pulse');
          tickTimer = setTimeout(tick, Math.max(160, 800 - frac * 640));
        };
        const paint = () => {
          who.textContent = api.teams[holder].name;
          sub.textContent = 'Бомба у вас. Назовите и передайте.';
          api.setTurn(holder, 'Держит бомбу');
        };
        function explode(by) {
          if (over) return; over = true; stop();
          sfx.boom();
          const loser = holder;
          range(api.n).forEach(i => { if (i !== loser) api.score(i, 1); });
          api.show([
            h('div', { class: 'cover boom shake' }, h('div', { class: 'bomb-big' }, '💥'),
              h('div', { class: 'kicker' }, by === 'time' ? 'Бомба взорвалась' : 'Игрок не справился'),
              h('div', { class: 'big' }, api.teams[loser].name + ' выбывает из раунда'),
              h('p', { class: 'mid-t' }, 'Остальные получают по очку. Передач за раунд: ' + passes + '.'),
              btn(round >= total ? 'Итоги' : 'Следующая бомба', next, 'big', { 'data-primary': true }))
          ], { turn: loser, mid: true, role: 'Бомба взорвалась у игрока' });
        }
        api.show([
          h('div', { class: 'card accent withpic' }, Pics.of(card.q, { size: 'l', fallback: card.t === 'a' ? '🎬' : '💣' }), h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, card.t === 'a' ? 'Задание' : 'Тема'), h('div', { class: 'big' }, card.q))),
          h('div', { class: 'bombbox' }, bomb, who, sub),
          h('div', { class: 'row' },
            btn('Передать дальше', () => { passes++; sfx.click(); holder = (holder + 1) % api.n; paint(); }, 'huge', { 'data-primary': true }),
            btn('Повтор или мимо — взрыв!', () => explode('foul'), 'bad'))
        ], { turn: holder, role: 'Держит бомбу' });
        paint();
        tick();
        boomTimer = setTimeout(() => explode('time'), fuse);
      }
    }
  });
}
