/* 27. Виселица — угадываем слово по буквам */
{
  const items = []; for (const c in DATA.hang) DATA.hang[c].forEach(w => items.push({ c, w }));
  const deck = makeDeck('hang', items);
  const ABC = 'абвгдежзийклмнопрстуфхцчшщъыьэюя'.split('');
  const MAX = 7;
  const gallows = n => {
    const p = (k, d) => n >= k ? d : '';
    return h('div', { class: 'gallows', html: '<svg viewBox="0 0 200 220" role="img" aria-label="Виселица, ошибок: ' + n + ' из ' + MAX + '"><g fill="none" stroke="#141a46" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">'
      + '<path d="M20 205H110M50 205V25H135"/>' + p(1, '<path d="M50 55L80 25"/>') + p(2, '<path d="M135 25V55"/>')
      + p(3, '<circle cx="135" cy="75" r="20" fill="#ffd9a8"/>') + p(4, '<path d="M135 95V150"/>') + p(5, '<path d="M135 108L110 135M135 108L160 135"/>') + p(6, '<path d="M135 150L112 188M135 150L158 188"/>')
      + p(7, '<path d="M126 70l6 6M132 70l-6 6M138 70l6 6M144 70l-6 6" stroke-width="3"/>') + '</g></svg>' });
  };
  registerGame({
    id: 'hang', title: 'Виселица', icon: '🔤', color: '#22b8c9',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 6 }, mins: 20,
    tagline: 'Угадывайте слово по буквам, пока виселица не достроена. Каждая верная буква — очко, отгаданное слово — три.',
    rules: '<ul><li>На экране слово из чёрточек и подсказка — тема. Команды по очереди называют по одной букве, нажимая её на экране.</li><li>Верная буква открывается во всех местах и приносит очко за каждое. Команда с верной буквой называет следующую.</li><li>Ошибка достраивает виселицу и передаёт ход. После семи ошибок слово не отгадано.</li><li>Кто открыл последнюю букву или назвал слово целиком, получает бонус три очка.</li></ul>',
    opts: [{ key: 'rounds', label: 'Слов у каждой команды', values: [1, 2, 3], def: 2 }],
    cards: () => items.length,
    start(api) {
      rotate(api, api.opts.rounds, (ti0, k, total, next, last) => {
        const card = deck.draw(), word = card.w.toLowerCase();
        const used = new Set(); let miss = 0, ti = ti0, over = false;
        const wordEl = h('div', { class: 'hang-word' }), gal = h('div'), msg = h('div', { class: 'mid-t' }), kb = h('div', { class: 'keys' }), actions = h('div', { class: 'row' });
        const shown = () => [...word].map(ch => ch === ' ' ? ' ' : (used.has(ch) || over ? ch : '_'));
        const complete = () => [...word].every(ch => ch === ' ' || used.has(ch));
        function paint() {
          wordEl.replaceChildren(...[...word].map((ch, i) => h('span', { class: 'hl' + (ch === ' ' ? ' sp' : '') + (over && !used.has(ch) && ch !== ' ' ? ' lost' : '') }, ch === ' ' ? '' : (used.has(ch) || over ? ch.toUpperCase() : ''))));
          gal.replaceChildren(gallows(miss));
          kb.replaceChildren(...ABC.map(ch => h('button', { class: 'key' + (used.has(ch) ? (word.includes(ch) ? ' hit' : ' miss') : ''), type: 'button', disabled: used.has(ch) || over, onclick: () => pick(ch) }, ch.toUpperCase())));
        }
        function pick(ch) {
          if (over || used.has(ch)) return; used.add(ch);
          const c = [...word].filter(x => x === ch).length;
          if (c) { sfx.ok(); api.score(ti, c); msg.textContent = api.teams[ti].name + ': есть «' + ch.toUpperCase() + '», +' + c; if (complete()) return win(ti); }
          else { sfx.bad(); miss++; msg.textContent = 'Буквы «' + ch.toUpperCase() + '» нет. Ход переходит дальше.'; if (miss >= MAX) return lose(); ti = (ti + 1) % api.n; api.setTurn(ti, 'Называет букву'); }
          paint();
        }
        function win(who) { over = true; api.score(who, 3); sfx.ok(); paint(); finish(api.teams[who].name + ' открыла слово! +3 очка бонус.'); }
        function lose() { over = true; sfx.buzz(); paint(); finish('Виселица достроена. Слово не отгадано.'); }
        function finish(t) { msg.textContent = t; actions.replaceChildren(btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })); kb.querySelectorAll('button').forEach(b => b.disabled = true); }
        const whole = btn('Назвать слово целиком', () => {
          if (over) return; actions.replaceChildren(judgeRow(api, api.teams[ti].name + ' называет слово. Верно ли оно?', 'Верно', ok => { if (ok) { word.split('').forEach(ch => used.add(ch)); win(ti); } else { miss++; sfx.bad(); if (miss >= MAX) return lose(); ti = (ti + 1) % api.n; api.setTurn(ti, 'Называет букву'); msg.textContent = 'Слово неверное. Ход переходит дальше.'; actions.replaceChildren(whole); paint(); } }, 'Нет'));
        }, 'paper small');
        actions.replaceChildren(whole);
        api.show([h('div', { class: 'hang-top' }, gal, h('div', { class: 'hang-side' }, h('div', { class: 'kicker' }, 'Слово ' + k + ' из ' + total + ' · ' + card.c + ' · ' + word.replace(/ /g, '').length + ' букв'), wordEl, msg)), kb, actions], { turn: ti, role: 'Называет букву' });
        paint();
      });
    }
  });
}
