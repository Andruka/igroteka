/* 3. Найди фейк — три факта настоящие, один выдуманный */
{
  const deck = makeDeck('fakes', DATA.fakes);
  registerGame({
    id: 'fake', title: 'Найди фейк', icon: '🕵️', color: '#2fd6a0',
    cats: ['Викторины', 'Для компании', 'Командные'], teams: { min: 1, max: 8 }, mins: 25,
    tagline: 'Четыре утверждения на одну тему. Три правдивы, одно — подделка. Найдите её.',
    rules: '<ul><li>В свой ход команда получает четыре утверждения. Три из них — правда, одно — фейк.</li><li>Обсудите и нажмите на то, которое считаете выдумкой. Угадали — <b>200 очков</b>.</li><li>Ошиблись — другая команда может попытаться найти фейк среди оставшихся и получить 100 очков.</li><li>После ответа на экране появится короткий разбор.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Раундов у каждой команды', values: [3, 5, 8], def: 5 },
      { key: 'time', label: 'Время на ответ', values: [[0, 'Без таймера'], [30, '30 секунд'], [60, '60 секунд']], def: 0 }
    ],
    cards: () => DATA.fakes.length,
    start(api) {
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const f = deck.draw();
        const items = shuffle([...f.t.map(t => ({ t, ok: false })), { t: f.fake, ok: true }]);
        choiceRound(api, {
          pic: Pics.of(f.topic, { size: 'xl', fallback: '🕵️' }), ti, kicker: '🕵️ Тема: ' + f.topic + ' · найдите фейк · ' + pts(200), title: 'Какое утверждение — фейк?',
          items, pts: 200, stealPts: 100, time: api.opts.time, explain: 'Фейк: «' + f.fake + '» ' + f.why, last, next
        });
      });
    }
  });
}
