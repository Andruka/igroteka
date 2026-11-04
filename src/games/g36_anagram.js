/* 36. Анаграммы — собери слово из перемешанных букв */
{
  const A = DATA.anagram, TH = A.theme;
  const decks = { easy: makeDeck('anagram_easy', A.easy), mid: makeDeck('anagram_mid', A.mid), hard: makeDeck('anagram_hard', A.hard) };
  const scramble = w => {
    const a = [...w];
    for (let i = 0; i < 50; i++) { const s = shuffle(a); if (s.join('') !== w) return s; }
    return a.reverse();
  };
  registerGame({
    id: 'anagram', title: 'Анаграммы', icon: '🔠', color: '#8e5be8',
    cats: ['Для компании', 'Командные'], teams: { min: 2, max: 6 }, mins: 15,
    tagline: 'Буквы слова перемешаны. Успейте собрать его в уме, пока не открылись подсказки: чем позже, тем больше очков.',
    rules: '<ul><li>Команда по очереди получает слово: на экране перемешанные буквы и тема. Время идёт.</li><li>Называйте слово вслух. Следящая команда нажимает «Угадали», если слово названо верно.</li><li>За слово можно получить до 5 очков. Каждые несколько секунд на своём месте открывается одна буква, и очки за слово падают: 5, 4, 3, 2, 1.</li><li>Не успели или пропустили: слово покажем, очков нет.</li></ul>',
    opts: [
      { key: 'level', label: 'Длина слов', values: [['easy', 'Лёгкие, 5–6 букв'], ['mid', 'Средние, 7–8 букв'], ['hard', 'Сложные, 9–11 букв']], def: 'mid' },
      { key: 'rounds', label: 'Слов у каждой команды', values: [2, 3, 5], def: 3 },
      { key: 'time', label: 'Время на слово', values: [[30, '30 секунд'], [45, '45 секунд'], [60, '60 секунд']], def: 45 }
    ],
    cards: () => A.easy.length + A.mid.length + A.hard.length,
    start(api) {
      const deck = decks[api.opts.level] || decks.mid, TIME = api.opts.time, STEP = TIME / 5;
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const word = deck.draw(), theme = TH[word] || '', letters = scramble(word);
        const judge = api.teams[(ti + 1) % api.n].name;
        let shown = 0, over = false;
        /* порядок открытия: первая буква, последняя, потом случайные */
        const mid = shuffle([...word].map((_, i) => i).slice(1, -1)), order = [0, word.length - 1, ...mid];
        const tiles = h('div', { class: 'an-tiles', style: '--n:' + word.length, role: 'img', 'aria-label': 'Буквы: ' + letters.join(', ') }, letters.map(c => h('span', { class: 'an-tile' }, c.toUpperCase())));
        const slots = h('div', { class: 'an-slots', style: '--n:' + word.length, 'aria-hidden': 'true' });
        const worth = h('div', { class: 'an-worth' });
        const msg = h('div', { class: 'mid-t an-msg' }), actions = h('div', { class: 'an-actions' });
        const pts = () => Math.max(1, 5 - shown);
        function paint() {
          const open = new Set(order.slice(0, shown));
          slots.replaceChildren(...[...word].map((c, i) => h('span', { class: 'an-slot' + (open.has(i) || over ? ' on' : '') + (over && !open.has(i) ? ' lost' : '') }, open.has(i) || over ? c.toUpperCase() : '')));
          worth.textContent = over ? '' : 'За слово: ' + pts() + ' ' + plural(pts(), 'очко', 'очка', 'очков');
        }
        const timer = Timer(TIME, {
          onSecond: s => { const n = Math.min(4, Math.floor((TIME - s) / STEP)); if (!over && n > shown) { shown = n; sfx.tick(); paint(); } },
          onEnd: () => { if (over) return; sfx.buzz(); finish('Время вышло! Слово: ' + word.toUpperCase() + '.'); }
        });
        function finish(text) {
          over = true; timer.stop(); paint(); msg.textContent = text;
          actions.replaceChildren(btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true }));
        }
        function done(ok) {
          if (over) return;
          if (ok) { const p = pts(); sfx.ok(); api.score(ti, p); finish(api.teams[ti].name + ': ' + word.toUpperCase() + ', +' + p + ' ' + plural(p, 'очко', 'очка', 'очков') + '.'); }
          else { sfx.bad(); finish('Пропуск. Слово: ' + word.toUpperCase() + '.'); }
        }
        actions.replaceChildren(judgeRow(api, '', 'Угадали', done, 'Пропуск'));
        api.show(h('div', { class: 'an-box' },
          h('div', { class: 'an-head' }, h('div', { class: 'kicker' }, 'Слово ' + k + ' из ' + total + ' · ' + theme + ' · ' + word.length + ' букв'), h('div', { class: 'an-judge' }, 'Следит: ' + judge), worth),
          tiles, slots, timer.el, msg, actions
        ), { turn: ti, role: 'Собирает слово' });
        paint(); timer.start();
      });
    }
  });
}
