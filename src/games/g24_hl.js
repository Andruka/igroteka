/* 24. Больше или меньше */
{
  const deck = makeDeck('hl', DATA.hl);
  const CATE = [[/высот|выше/i, '⛰️'], [/река|длиннее/i, '🌊'], [/страна|площад/i, '🗺️'], [/тяжелее/i, '⚖️'], [/быстрее/i, '💨'], [/живёт/i, '⏳'], [/жител|мире/i, '👥'], [/диаметр|солнц/i, '🪐'], [/глубже/i, '🌊'], [/длиннее/i, '📏']];
  const vsPic = q => { const a = Pics.find(q.a, 1)[0], b = Pics.find(q.b, 1)[0], c = (CATE.find(x => x[0].test(q.q)) || [0, '📏'])[1]; return a && b ? [a, b] : a || b ? [a || b, c] : [c]; };
  const fmt = (v, u) => v.toLocaleString('ru-RU') + ' ' + u;
  registerGame({
    id: 'hl', title: 'Больше или меньше', icon: '📏', color: '#3aa0ff',
    cats: ['Викторины', 'Для компании', 'Командные', 'Для двоих'], teams: { min: 1, max: 8 }, mins: 15,
    tagline: 'Что выше, длиннее, тяжелее? Угадайте, у какого варианта значение больше.',
    rules: '<ul><li>Команды ходят по очереди. Читайте вопрос и два варианта.</li><li>Нажмите тот, у которого значение больше.</li><li>Верно: 2 очка. Ошиблись: соперники могут перехватить за 1 очко. После ответа показываем числа.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Вопросов у каждой команды', values: [4, 6, 10], def: 6 },
      { key: 'time', label: 'Время на ответ', values: [[0, 'Без таймера'], [15, '15 секунд'], [30, '30 секунд']], def: 0 }
    ],
    cards: () => DATA.hl.length,
    start(api) {
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const q = deck.draw(), aw = q.va > q.vb;
        choiceRound(api, {
          pic: Pics.sticker(vsPic(q), { size: 'xl', key: q.a + q.b }), ti, kicker: 'Вопрос ' + k + ' из ' + total, title: q.q,
          items: shuffle([{ t: q.a, ok: aw }, { t: q.b, ok: !aw }]), pts: 2, stealPts: 1, time: api.opts.time,
          explain: q.a + ': ' + fmt(q.va, q.u) + '. ' + q.b + ': ' + fmt(q.vb, q.u) + '.', last, next
        });
      });
    }
  });
}
