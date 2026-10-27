/* 22. Найди лишнее */
{
  const deck = makeDeck('odd', DATA.odd);
  registerGame({
    id: 'odd', title: 'Найди лишнее', icon: '🧩', color: '#2fd6a0',
    cats: ['Викторины', 'Для компании', 'Командные', 'Для двоих'], teams: { min: 1, max: 8 }, mins: 15,
    tagline: 'Четыре слова, одно из них не подходит. Найдите его быстрее соперников.',
    rules: '<ul><li>Команды ходят по очереди. На экране четыре слова.</li><li>Три из них объединяет общий признак, четвёртое лишнее. Нажмите его.</li><li>Верно: 2 очка. Ошиблись: соперники могут перехватить за 1 очко.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Вопросов у каждой команды', values: [4, 6, 10], def: 6 },
      { key: 'time', label: 'Время на ответ', values: [[0, 'Без таймера'], [15, '15 секунд'], [30, '30 секунд']], def: 0 }
    ],
    cards: () => DATA.odd.length,
    start(api) {
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const q = deck.draw();
        choiceRound(api, {
          pic: Pics.of(q.odd, { size: 'xl', fallback: '🧩' }), ti, kicker: 'Вопрос ' + k + ' из ' + total, title: 'Что здесь лишнее?',
          items: shuffle([...q.ok.map(t => ({ t, ok: false })), { t: q.odd, ok: true }]), pts: 2, stealPts: 1, time: api.opts.time, explain: q.why, last, next
        });
      });
    }
  });
}
