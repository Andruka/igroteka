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
    cats: ['Для компании', 'Командные'], teams: { min: 1, max: 6 }, mins: 15,
    tagline: 'Соберите слово из перемешанных букв. Играйте компанией вслух или введите ответ в одиночном режиме.',
    rules: '<ul><li>Команда по очереди получает слово: на экране перемешанные буквы и тема. Время идёт.</li><li>В одиночном режиме введите ответ и нажмите «Проверить». Регистр и различие Е/Ё не влияют на проверку. Запас ручных подсказок общий на всю партию, каждая открывает букву и уменьшает цену ответа.</li><li>Называйте слово вслух. Следящая команда нажимает «Угадали», если слово названо верно.</li><li>За слово можно получить до 5 очков. Каждые несколько секунд на своём месте открывается одна буква, и очки за слово падают: 5, 4, 3, 2, 1.</li><li>Не успели или пропустили: слово покажем, очков нет.</li></ul>',
    opts: [
      { key: 'level', label: 'Длина слов', values: [['easy', 'Лёгкие, 5–6 букв'], ['mid', 'Средние, 7–8 букв'], ['hard', 'Сложные, 9–11 букв']], def: 'mid' },
      { key: 'hints', label: 'Подсказок на одиночную партию', values: [[0, 'Без подсказок'], [1, 'Одна'], [3, 'Три']], def: 3, when: (opts, n) => n === 1 },
      { key: 'rounds', label: 'Слов у каждого участника', values: [2, 3, 5], def: 3 },
      { key: 'time', label: 'Время на слово', values: [[30, '30 секунд'], [45, '45 секунд'], [60, '60 секунд']], def: 45 }
    ],
    cards: () => A.easy.length + A.mid.length + A.hard.length,
    start(api) {
      const deck = decks[api.opts.level] || decks.mid, TIME = api.opts.time, STEP = TIME / 5, solo = api.n === 1;
      let hintsLeft = api.opts.hints ?? 3, solved = 0, streak = 0, bestStreak = 0;
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const word = deck.draw(), theme = TH[word] || '', letters = scramble(word);
        const judge = api.teams[(ti + 1) % api.n].name;
        let shown = 0, over = false;
        /* порядок открытия: первая буква, последняя, потом случайные */
        const mid = shuffle([...word].map((_, i) => i).slice(1, -1)), order = [0, word.length - 1, ...mid];
        const tiles = h('div', { class: 'an-tiles', style: '--n:' + word.length, role: 'img', 'aria-label': 'Буквы: ' + letters.join(', ') }, letters.map(c => h('span', { class: 'an-tile' }, c.toUpperCase())));
        const slots = h('div', { class: 'an-slots', style: '--n:' + word.length, 'aria-hidden': 'true' });
        const worth = h('div', { class: 'an-worth' });
        const msg = h('div', { class: 'mid-t an-msg', 'aria-live': 'polite' }), actions = h('div', { class: 'an-actions' }), stats = h('div', { class: 'an-solo-stat' });
        const input = solo ? h('input', { class: 'input', type: 'text', maxlength: 30, 'aria-label': 'Ваш ответ', placeholder: 'Введите слово', autocomplete: 'off', spellcheck: 'false', 'data-primary': true }) : null;
        const checkButton = h('button', { class: 'btn good', type: 'submit' }, 'Проверить');
        const hintButton = btn('Подсказка', () => { if (over || hintsLeft <= 0 || shown >= 4) return; shown++; hintsLeft--; sfx.ding(); paint(); }, 'paper small');
        const form = solo ? h('form', { class: 'an-answer', onsubmit: e => {
          e.preventDefault(); if (over) return;
          const normalize = value => value.normalize('NFC').trim().toLowerCase().replace(/ё/g, 'е');
          if (!input.value.trim()) { msg.textContent = 'Введите слово.'; return; }
          if (normalize(input.value) === normalize(word)) done(true);
          else { sfx.bad(); msg.textContent = 'Пока не подходит. Попробуйте ещё.'; input.select(); }
        } }, input, checkButton) : null;
        const pts = () => Math.max(1, 5 - shown);
        function paint() {
          const open = new Set(order.slice(0, shown));
          slots.replaceChildren(...[...word].map((c, i) => h('span', { class: 'an-slot' + (open.has(i) || over ? ' on' : '') + (over && !open.has(i) ? ' lost' : '') }, open.has(i) || over ? c.toUpperCase() : '')));
          worth.textContent = over ? '' : 'За слово: ' + pts() + ' ' + plural(pts(), 'очко', 'очка', 'очков');
          if (solo) {
            hintButton.textContent = 'Подсказка (' + hintsLeft + ')'; hintButton.disabled = over || hintsLeft <= 0 || shown >= 4;
            stats.textContent = 'Угадано: ' + solved + ' · Серия: ' + streak + ' · Лучшая: ' + bestStreak;
          }
        }
        const timer = Timer(TIME, {
          onSecond: s => { const n = Math.min(4, Math.floor((TIME - s) / STEP)); if (!over && n > shown) { shown = n; sfx.tick(); paint(); } },
          onEnd: () => { if (over) return; streak = 0; sfx.buzz(); finish('Время вышло! Слово: ' + word.toUpperCase() + '.'); }
        });
        function finish(text) {
          over = true; timer.stop(); paint(); msg.textContent = text;
          if (solo) { input.disabled = true; checkButton.disabled = true; }
          if (solo && last) api.record({ metric: 'solo-score', label: 'Очки', value: api.teams[0].score, unit: '', settings: { level: api.opts.level, time: TIME, rounds: api.opts.rounds, hints: api.opts.hints ?? 3 }, description: 'Один игрок · ' + ({ easy: '5–6 букв', mid: '7–8 букв', hard: '9–11 букв' }[api.opts.level]) + ' · ' + api.opts.rounds + ' ' + plural(api.opts.rounds, 'слово', 'слова', 'слов') + ' · ' + TIME + ' с · Подсказок: ' + (api.opts.hints ?? 3) });
          actions.replaceChildren(btn(last ? 'Итоги' : 'Дальше', solo && last ? () => api.end({ custom: true, win: solved > 0, title: 'Анаграммы завершены', sub: 'Угадано: ' + solved + ' из ' + total + ' · Лучшая серия: ' + bestStreak, lines: [] }) : next, 'big', { 'data-primary': true }));
        }
        function done(ok) {
          if (over) return;
          if (ok) { const p = pts(); solved++; streak++; bestStreak = Math.max(bestStreak, streak); sfx.ok(); api.score(ti, p); finish(api.teams[ti].name + ': ' + word.toUpperCase() + ', +' + p + ' ' + plural(p, 'очко', 'очка', 'очков') + '.'); }
          else { streak = 0; sfx.bad(); finish('Пропуск. Слово: ' + word.toUpperCase() + '.'); }
        }
        actions.replaceChildren(solo ? h('div', { class: 'row' }, hintButton, btn('Пропуск', () => done(false), 'paper')) : judgeRow(api, '', 'Угадали', done, 'Пропуск'));
        api.show(h('div', { class: 'an-box' },
          h('div', { class: 'an-head' }, h('div', { class: 'kicker' }, 'Слово ' + k + ' из ' + total + ' · ' + theme + ' · ' + word.length + ' букв'), solo ? null : h('div', { class: 'an-judge' }, 'Следит: ' + judge), worth),
          tiles, slots, timer.el, form, solo ? stats : null, msg, actions
        ), { turn: ti, role: 'Собирает слово' });
        paint(); timer.start();
      });
    }
  });
}
