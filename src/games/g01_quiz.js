/* 1. Выбери тему — викторина по категориям */
{
  const deck = makeDeck('quiz', DATA.quiz);
  const LV = [null, 'Лёгкий', 'Средний', 'Сложный', 'Эксперт', 'Гроссмейстер'];
  const DIFF = { all: [1, 2, 3, 4, 5], easy: [1, 2], hard: [3, 4, 5], expert: [4, 5] };
  registerGame({
    id: 'quiz', title: 'Выбери тему', icon: '🎯', color: '#ffc233',
    cats: ['Викторины', 'Для компании', 'Командные'], teams: { min: 1, max: 8 }, mins: 30,
    tagline: 'Выберите тему и сложность — от простых вопросов до уровня «Гроссмейстер». Ошиблись — соперники могут перехватить очки.',
    rules: '<ul><li>Команды ходят по очереди. В свой ход команда выбирает тему и сложность: от 100 очков (лёгкий) до 500 (гроссмейстер).</li><li>На экране появится вопрос и четыре варианта. Обсудите и нажмите на ответ.</li><li>Верно — очки ваши. Ошиблись — соперники могут <b>перехватить</b> вопрос и получить половину очков.</li><li>Можно включить таймер: если время вышло, ответ считается неверным.</li><li>Вопросы не повторяются, пока вы не пройдёте их все.</li></ul>',
    opts: [
      { key: 'cats', label: 'Темы', multi: true, values: () => DATA.quizCats.map(c => [c.id, c.icon + ' ' + c.name]), def: [] },
      { key: 'diff', label: 'Сложность', values: [['all', 'Любая: 100–500'], ['easy', 'Попроще: 100–200'], ['hard', 'Для знатоков: 300–500'], ['expert', 'Только эксперт: 400–500']], def: 'all' },
      { key: 'rounds', label: 'Вопросов у каждой команды', values: [3, 5, 8], def: 5 },
      { key: 'time', label: 'Время на ответ', values: [[0, 'Без таймера'], [20, '20 секунд'], [40, '40 секунд']], def: 0 }
    ],
    cards: () => DATA.quiz.length,
    start(api) {
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const sel = api.opts.cats || [], lvls = DIFF[api.opts.diff] || DIFF.all, has = (c, l) => lvls.includes(l) && deck.has(x => x.c === c.id && x.l === l);
        const tiles = DATA.quizCats.filter(c => (!sel.length || sel.includes(c.id)) && lvls.some(l => has(c, l))).map(c => h('div', { class: 'tile' },
          h('h3', null, h('span', null, c.icon), c.name),
          h('div', { class: 'lv' }, lvls.filter(l => has(c, l)).map(l => btn(String(l * 100), () => ask(c, l), 'small lv' + l, { title: LV[l] })))));
        api.show([
          turnHead(api, ti, 'Вопрос ' + k + ' из ' + total + '. Выберите тему и очки.'),
          h('div', { class: 'grid', style: { gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,230px),1fr))' } }, tiles)
        ], { turn: ti, role: 'Выбирает тему и очки' });
        function ask(cat, lvl) {
          const q = deck.draw(x => x.c === cat.id && x.l === lvl);
          choiceRound(api, {
            pic: Pics.of(q.q, { size: 'xl', fallback: cat.icon }), ti, kicker: cat.icon + ' ' + cat.name + ' · ' + LV[lvl] + ' · ' + pts(lvl * 100), title: q.q,
            items: shuffle(q.a.map((t, i) => ({ t, ok: i === 0 }))), pts: lvl * 100, time: api.opts.time, last, next
          });
        }
      });
    }
  });
}
