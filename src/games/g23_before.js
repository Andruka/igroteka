/* 23. Что раньше? */
{
  const deck0 = makeDeck('before', DATA.before), deckH = makeDeck('beforehard', DATA.beforeHard);
  const yr = y => y < 0 ? (-y) + ' г. до н. э.' : y + ' г.';
  registerGame({
    id: 'before', title: 'Что раньше?', icon: '⏳', color: '#ffc233',
    cats: ['Викторины', 'Для компании', 'Командные', 'Для двоих'], teams: { min: 1, max: 8 }, mins: 15,
    tagline: 'Два события, какое из них случилось раньше? Проверьте чувство времени.',
    rules: '<ul><li>Команды ходят по очереди. На экране два события.</li><li>Нажмите то, что произошло раньше.</li><li>Верно: 2 очка. Ошиблись: соперники могут перехватить за 1 очко. После ответа показываем даты.</li></ul>',
    opts: [LEVEL_OPT, 
      { key: 'rounds', label: 'Вопросов у каждой команды', values: [4, 6, 10], def: 6 },
      { key: 'time', label: 'Время на ответ', values: [[0, 'Без таймера'], [15, '15 секунд'], [30, '30 секунд']], def: 0 }
    ],
    cards: () => DATA.before.length + DATA.beforeHard.length,
    start(api) {
      const deck = levelDeck(deck0, deckH, api.opts.level);
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const q = deck.draw(), early = q.ya < q.yb;
        choiceRound(api, {
          pic: Pics.of(q.a, { size: 'xl', fallback: '⏳' }), ti, kicker: 'Вопрос ' + k + ' из ' + total, title: 'Что произошло раньше?',
          items: shuffle([{ t: q.a, ok: early }, { t: q.b, ok: !early }]), pts: 2, stealPts: 1, time: api.opts.time,
          explain: q.a + ': ' + yr(q.ya) + '. ' + q.b + ': ' + yr(q.yb) + '.', last, next
        });
      });
    }
  });
}
