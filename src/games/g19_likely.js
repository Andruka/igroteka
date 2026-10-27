/* 19. Кто скорее всего… — все показывают пальцем */
{
  const deck = makeDeck('likely', DATA.likely);
  registerGame({
    id: 'likely', title: 'Кто скорее всего…', icon: '👉', color: '#ff6b57',
    cats: ['Для компании'], teams: { min: 3, max: 8 }, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', mins: 15,
    tagline: 'Читаем фразу вслух, на счёт «три» все показывают на того, кто подходит лучше всех.',
    rules: '<ul><li>Появляется фраза: «Кто скорее всего…».</li><li>Ведущий читает её вслух и считает «раз, два, три». На «три» каждый одновременно показывает пальцем на одного человека (на себя тоже можно).</li><li>Кого выбрали больше всех, тот и «победил»: нажмите его имя. Он получает очко и рассказывает, правда ли это.</li><li>Если мнения разошлись поровну, нажмите «Ничья».</li></ul>',
    opts: [{ key: 'rounds', label: 'Фраз', values: [8, 12, 20], def: 12 }],
    cards: () => DATA.likely.length,
    start(api) {
      let k = 0; const total = api.opts.rounds; next();
      function next() {
        if (k >= total) return api.end(); k++; const t = deck.draw();
        api.show([
          h('div', { class: 'card accent withpic' }, Pics.of(t, { size: 'xl', fallback: '👉' }), h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, 'Фраза ' + k + ' из ' + total), h('div', { class: 'big', 'data-tts': 'Кто скорее всего ' + t + '?' }, 'Кто скорее всего ' + t + '?'))),
          h('p', { class: 'mid-t' }, 'Считайте «раз, два, три» и показывайте пальцем. Потом выберите того, на кого показали чаще всех.'),
          api.pickTeam('На кого показали чаще всех?', who => { if (who >= 0) { api.score(who, 1); sfx.ok(); } k >= total ? api.end() : next(); }, { none: 'Ничья' })
        ], { turn: -1, role: 'Показывают пальцем на того, кто подходит', who: 'Все игроки' });
      }
    }
  });
}
