/* 26. Своя игра — табло с темами и ценами */
{
  const deck = makeDeck('jeopardy', DATA.jeopardy), deckH = makeDeck('jeopardyhard', DATA.jeopardyHard);
  registerGame({
    id: 'jeopardy', title: 'Своя игра', icon: '🧠', color: '#6fa8ff',
    cats: ['Викторины', 'Для компании', 'Командные'], teams: { min: 2, max: 6 }, mins: 30,
    tagline: 'Табло с темами и ценами, как на телевидении. Выбирайте вопросы подороже и забирайте очки у соперников.',
    rules: '<ul><li>На экране табло: пять тем и пять цен от 100 до 500. Команда выбирает клетку и отвечает вслух.</li><li>Нажмите «Показать ответ» — и решите вместе, верно ли ответила команда. Верный ответ приносит столько очков, сколько стоит вопрос. Тот, кто ответил верно, выбирает следующий вопрос.</li><li>Если ответ неверный, другая команда может перехватить вопрос за половину цены.</li><li>Игра заканчивается, когда открыты все клетки.</li></ul>',
    opts: [{ key: 'level', label: 'Сложность', values: [['norm', 'Обычная'], ['mix', 'Смешанная'], ['hard', 'Для знатоков']], def: 'norm' }, { key: 'themes', label: 'Тем на табло', values: [[3, '3 темы'], [4, '4 темы'], [5, '5 тем']], def: 4 }],
    cards: () => (DATA.jeopardy.length + DATA.jeopardyHard.length) * 5,
    start(api) {
      const n = api.opts.themes, lv = api.opts.level;
      const themes = lv === 'hard' ? deckH.drawN(n) : lv === 'mix' ? shuffle([...deckH.drawN(Math.ceil(n / 2)), ...deck.drawN(Math.floor(n / 2))]) : deck.drawN(n);
      const done = themes.map(() => [false, false, false, false, false]);
      let left = themes.length * 5, ti = 0;
      board();
      function board() {
        if (!left) return api.end();
        const cols = h('div', { class: 'jp', style: { '--cols': themes.length } },
          ...themes.map((t, c) => h('div', { class: 'jp-col' }, h('div', { class: 'jp-head' }, h('span', null, t.icon), t.t),
            ...t.q.map((q, r) => done[c][r] ? h('div', { class: 'jp-cell used' }) : h('button', { class: 'jp-cell', type: 'button', 'aria-label': t.t + ', ' + q[0], onclick: () => { sfx.click(); open(c, r); } }, q[0])))));
        api.show([cols], { turn: ti, role: 'Выбирает вопрос', compact: true });
      }
      function open(c, r) {
        const t = themes[c], q = t.q[r], val = q[0];
        done[c][r] = true; left--;
        const ans = h('div', { class: 'ans hidden' }), actions = h('div', { class: 'stack' });
        const finish = (who, p) => { api.score(who, p); if (who >= 0) { sfx.ok(); ti = who; } else ti = (ti + 1) % api.n; };
        const fin = (msg, label) => { ans.classList.remove('hidden'); actions.replaceChildren(btn(label || (left ? 'К табло' : 'Итоги'), board, 'big', { 'data-primary': true })); if (msg) ans.append(h('div', null, msg)); };
        const reveal = () => {
          ans.classList.remove('hidden'); ans.replaceChildren(h('div', { class: 'kv' }, h('span', { class: 'badge' }, 'Ответ'), h('span', { class: 'big' }, q[2])));
          actions.replaceChildren(judgeRow(api, api.teams[ti].name + ' ответила верно?', 'Верно +' + val, ok => {
            if (ok) { finish(ti, val); ans.append(h('div', { class: 'mid-t' }, api.teams[ti].name + ': +' + pts(val))); fin(); return; }
            sfx.bad();
            if (api.n < 2) { fin(); return; }
            actions.replaceChildren(h('div', { class: 'mid-t' }, 'Перехват за половину: +' + pts(Math.round(val / 2))), api.pickTeam('Кто ответил верно?', who => {
              if (who < 0) { ti = (ti + 1) % api.n; fin(); } else { finish(who, Math.round(val / 2)); fin(); }
            }, { exclude: [ti], none: 'Никто' }));
          }, 'Неверно'));
        };
        api.show([
          h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, t.icon + ' ' + t.t + ' · ' + pts(val)), h('div', { class: 'big', 'data-tts': q[1] }, q[1])),
          h('div', { class: 'stack' }, btn('Показать ответ', () => { reveal(); }, 'big', { 'data-primary': true })), ans, actions
        ], { turn: ti, role: 'Отвечает на вопрос' });
      }
    }
  });
}
