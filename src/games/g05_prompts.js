/* 5. Без концовки — остроумные ответы на задания, голосование */
{
  const deck = makeDeck('prompts', DATA.prompts);
  const PTYPE = { 'Закончи фразу': '✍️', 'Придумайте название': '🏷️', 'Рекламный слоган': '📣', 'Оправдание': '🙇', 'Новое правило': '📜', 'Отзыв': '⭐', 'Совет': '💡', 'Подпись к ситуации': '🖼️' };
  registerGame({
    id: 'nofinish', title: 'Без концовки', icon: '✍️', color: '#ffb938',
    cats: ['Для компании', 'Для двоих'], teams: { min: 2, max: 8 }, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', mins: 25,
    tagline: 'Получите задание — закончить фразу, придумать название или оправдание. Победит самый смешной ответ.',
    rules: '<ul><li>На экране появляется задание. У всех есть время придумать ответ (он остаётся в голове).</li><li>Затем все по очереди зачитывают свои ответы вслух.</li><li>Голосование: игроки выбирают самый смешной чужой ответ. За себя голосовать нельзя. Каждый голос — очко автору.</li><li>Если играют двое, победителя выбирает «зрительский голос»: вы вдвоём решаете, чей ответ лучше, или объявляете ничью.</li><li>Иногда к заданию добавляется <b>усложнение</b>: например, ответ ровно из пяти слов.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Заданий', values: [3, 5, 8], def: 5 },
      { key: 'prep', label: 'Время на придумывание', values: [[0, 'Без таймера'], [20, '20 секунд'], [40, '40 секунд']], def: 20 },
      { key: 'twist', label: 'Усложнения', values: [[0, 'Нет'], [1, 'Иногда'], [2, 'Всегда']], def: 1 }
    ],
    cards: () => DATA.prompts.length,
    start(api) {
      let round = 0; const total = api.opts.rounds;
      next();
      function next() {
        if (round >= total) return api.end();
        round++; const p = deck.draw();
        const twist = (api.opts.twist === 2 || (api.opts.twist === 1 && Math.random() < .35)) ? pick(DATA.twists) : null;
        const timer = api.opts.prep ? Timer(api.opts.prep, { onEnd: () => sfx.buzz() }) : null;
        api.show([
          h('div', { class: 'card accent withpic' }, Pics.of(p.q, { size: 'xl', fallback: PTYPE[p.t] || '✍️' }), h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, 'Задание ' + round + ' из ' + total + ' · ' + p.t), h('div', { class: 'big' }, p.q),
            twist ? h('div', { class: 'ans' }, 'Усложнение: ' + twist) : null, timer ? timer.el : null)),
          h('p', { class: 'mid-t muted' }, 'Придумайте ответ и запомните его. Когда все готовы — читаем по очереди.'),
          btn('Читаем ответы', () => read(0), 'big', { 'data-primary': true })
        ], { turn: -1 });
        if (timer) timer.start();
      }
      function read(i) {
        if (i >= api.n) return vote();
        api.show([
          h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Отвечает'), h('div', { class: 'big' }, api.teams[i].name),
            h('p', { class: 'mid-t' }, 'Прочитайте свой ответ вслух.'), btn(i === api.n - 1 ? 'Все прочитали' : 'Дальше', () => read(i + 1), 'big', { 'data-primary': true }))
        ], { turn: i, mid: true });
      }
      function vote() {
        if (api.n === 2) {
          return api.show([h('div', { class: 'big' }, 'Чей ответ был смешнее?'), api.pickTeam('Решаете вдвоём:', who => { if (who < 0) { api.score(0, 1); api.score(1, 1); } else api.score(who, 2); sfx.ok(); after(who < 0 ? 'Ничья: по одному очку.' : api.teams[who].name + ' берёт раунд.'); }, { none: 'Ничья' })], { turn: -1 });
        }
        const votes = new Array(api.n).fill(0);
        const ask = j => {
          if (j >= api.n) { votes.forEach((v, i) => v && api.score(i, v)); const best = Math.max(...votes); const winners = votes.map((v, i) => v === best ? api.teams[i].name : null).filter(Boolean); sfx.ok(); return after(best ? 'Больше всего голосов: ' + winners.join(', ') + ' — ' + best + '.' : 'Никто не получил голосов.'); }
          api.show([h('div', { class: 'big' }, api.teams[j].name + ', ваш голос'), api.pickTeam('Чей чужой ответ был самым смешным?', who => { if (who >= 0) votes[who]++; ask(j + 1); }, { exclude: [j], none: 'Никто' })], { turn: j });
        };
        ask(0);
      }
      function after(msg) {
        api.show([h('div', { class: 'cover' }, h('div', { class: 'big' }, msg), btn(round >= total ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true }))], { turn: -1, mid: true });
      }
    }
  });
}
