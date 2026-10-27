/* 20. Я никогда не… */
{
  const deck = makeDeck('never', DATA.never);
  registerGame({
    id: 'never', title: 'Я никогда не…', icon: '🙈', color: '#9a6bff',
    cats: ['Для компании', 'Для двоих'], teams: { min: 2, max: 8 }, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', mins: 15,
    tagline: 'Читаем «Я никогда не…». Кто это делал, признаётся и получает очко за честность.',
    rules: '<ul><li>На экране появляется фраза, например «Я никогда не… опаздывал на самолёт».</li><li>Ведущий читает её вслух. Кто это делал, поднимает руку.</li><li>Нажмите имена тех, кто признался, и подтвердите. Каждый честный получает очко.</li><li>Хотите рассказать историю? Самое время.</li></ul>',
    opts: [{ key: 'rounds', label: 'Фраз', values: [8, 12, 20], def: 12 }],
    cards: () => DATA.never.length,
    start(api) {
      let k = 0; const total = api.opts.rounds; next();
      function next() {
        if (k >= total) return api.end(); k++; const t = deck.draw(), sel = new Set();
        const row = h('div', { class: 'picks' }, api.teams.map((tm, i) => {
          const b = h('button', { class: 'btn big pick', type: 'button', 'aria-pressed': 'false', style: { '--c': tm.color }, onclick: () => { sfx.click(); sel.has(i) ? sel.delete(i) : sel.add(i); b.setAttribute('aria-pressed', sel.has(i)); b.classList.toggle('on', sel.has(i)); } }, tm.name); return b;
        }));
        api.show([
          h('div', { class: 'card accent withpic' }, Pics.of(t, { size: 'xl', fallback: '🙈' }), h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, 'Фраза ' + k + ' из ' + total), h('div', { class: 'big', 'data-tts': 'Я никогда ' + t }, 'Я никогда ' + t))),
          h('p', { class: 'mid-t' }, 'Кто это делал, поднимите руку. Нажмите на тех, кто признался.'),
          row,
          h('div', { class: 'row' }, btn(k >= total ? 'Итоги' : 'Дальше', () => { sel.forEach(i => api.score(i, 1)); sel.size ? sfx.ok() : 0; next(); }, 'big', { 'data-primary': true }))
        ], { turn: -1, role: 'Признаются, кто это делал', who: 'Все игроки' });
      }
    }
  });
}
