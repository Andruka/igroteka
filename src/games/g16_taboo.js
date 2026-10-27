/* 16. Табу — объясни слово, не называя запретных */
{
  const deck = makeDeck('taboo', DATA.taboo);
  registerGame({
    id: 'taboo', title: 'Табу', icon: '🚫', color: '#ef4f6c',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 6 }, mins: 20,
    tagline: 'Объясните слово команде, но не произносите пять запретных слов. Соперники следят и жмут «Табу!».',
    rules: '<ul><li>В свой ход один игрок объясняет слово, остальные в команде угадывают.</li><li>Под словом на карточке — пять запретных. Их, однокоренные слова и жесты, заменяющие слова, использовать нельзя.</li><li>Соперники смотрят в экран и жмут «Табу!», если запретное слово прозвучало: минус очко.</li><li>Угадали — плюс очко. Слово можно пропустить (ограниченное число раз). Играйте, пока идёт время.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Ходов у каждой команды', values: [2, 3, 5], def: 3 },
      { key: 'time', label: 'Время хода', values: [[60, '60 секунд'], [90, '90 секунд'], [120, '2 минуты']], def: 90 }
    ],
    cards: () => DATA.taboo.length,
    start(api) {
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const name = api.teams[ti].name;
        api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Ход ' + k + ' из ' + total),
          h('p', { class: 'mid-t' }, 'Один из команды объясняет, остальные угадывают. Соперники следят за запретными словами и держат палец на «Табу!».'),
          btn('Начать раунд', play, 'big', { 'data-primary': true })), { turn: ti, mid: true, role: 'Объясняет слова' });
        function play() {
          let guessed = 0, fouls = 0, skipsLeft = 3, card = deck.draw(), over = false;
          const timer = Timer(api.opts.time, { onEnd: end });
          const stat = h('div', { class: 'ans' });
          const word = h('div', { class: 'big' }), chips = h('div', { class: 'chips' });
          const paint = () => { word.textContent = card.w; chips.replaceChildren(...card.f.map(f => h('span', { class: 'chip bad' }, f))); stat.textContent = 'Угадано: ' + guessed + ' · Табу: ' + fouls; skipB.textContent = 'Пропустить (' + skipsLeft + ')'; skipB.disabled = skipsLeft <= 0; };
          const skipB = btn('Пропустить', () => { if (skipsLeft > 0) { skipsLeft--; card = deck.draw(); paint(); } }, 'paper');
          api.show([
            h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Объясните слово'), word, h('div', { class: 'mid-t' }, 'Нельзя говорить:'), chips, timer.el),
            stat,
            h('div', { class: 'row' },
              btn('Угадали +1', () => { if (over) return; guessed++; sfx.ok(); card = deck.draw(); paint(); }, 'big good', { 'data-primary': true }),
              btn('Табу! −1', () => { if (over) return; fouls++; sfx.bad(); card = deck.draw(); paint(); }, 'big bad'), skipB)
          ], { turn: ti, role: 'Объясняет слово, не называя запретные' });
          paint(); timer.start();
          function end() {
            if (over) return; over = true; timer.stop(); sfx.buzz();
            const net = Math.max(0, guessed - fouls); api.score(ti, net);
            api.show([h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Время вышло'), h('div', { class: 'big' }, name + ': ' + pts(net)),
              h('p', { class: 'mid-t' }, 'Угадано ' + guessed + ', нарушений ' + fouls + '.'), btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true }))], { turn: ti, mid: true, role: 'Итог раунда' });
          }
        }
      });
    }
  });
}
