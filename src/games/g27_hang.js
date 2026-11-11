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
  const hdNorm = w => String(w || '').toLowerCase().replace(/ё/g, 'е');
  const hdBonus = len => len >= 11 ? 2 : len >= 8 ? 1 : 0;
  /* очки раунда: [угадавшему, загадавшему] */
  const hdPoints = (solved, miss, len) => solved ? [MAX - miss + 1, miss >= 4 ? hdBonus(len) : 0] : [0, 1 + hdBonus(len)];
  function duel(api) {
    const R = [4, 6, 10].includes(+api.opts.drounds) ? +api.opts.drounds : 6, together = api.opts.score === 'team';
    const REC = 'rec.hang.duo';
    let r = 0;
    function nextRound() {
      if (r >= R) return finish();
      const si = r % api.n, gi = (si + 1) % api.n; r++;
      const sn = api.teams[si].name, gn = api.teams[gi].name;
      handover(api, sn, 'Загадайте слово втайне. ' + gn + ', отвернитесь.', () => entry(si, gi, r, '', ''), 'Я готов', si);
    }
    function entry(si, gi, k, w0, hint0) {
      const err = h('div', { class: 'mid-t hd-err', role: 'alert' });
      const wi = h('input', { class: 'input hd-in', type: 'text', value: w0, maxlength: 24, placeholder: 'Слово: 3–16 букв', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': 'Загаданное слово', enterkeyhint: 'next' });
      const hi = h('input', { class: 'input hd-in', type: 'text', value: hint0, maxlength: 30, placeholder: 'Подсказка-категория (необязательно)', autocomplete: 'off', 'aria-label': 'Подсказка-категория', enterkeyhint: 'done' });
      const go = () => {
        const w = hdNorm(wi.value).trim();
        if (/[^а-я]/.test(w)) err.textContent = 'Только русские буквы, без дефиса, пробелов и цифр.';
        else if (w.length < 3 || w.length > 16) err.textContent = 'Нужно от 3 до 16 букв (сейчас ' + w.length + ').';
        else return confirm(si, gi, k, w, hi.value.trim().slice(0, 30));
        sfx.bad();
      };
      wi.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); hi.focus(); } });
      hi.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); go(); } });
      api.show(h('div', { class: 'stack hd-form' }, h('div', { class: 'kicker' }, 'Раунд ' + k + ' из ' + R), h('div', { class: 'mid-t' }, 'Введите слово. Ё считается как Е.'), wi, hi, err, btn('Далее', go, 'big', { 'data-primary': true })), { turn: si, role: 'Загадывает слово' });
      wi.focus();
    }
    function confirm(si, gi, k, w, hint) {
      api.show(h('div', { class: 'stack center hd-form' }, h('div', { class: 'kicker' }, 'Проверьте слово'), h('div', { class: 'big hd-conf' }, w.toUpperCase()), hint ? h('div', { class: 'mid-t' }, 'Подсказка: ' + hint) : null, h('div', { class: 'mid-t' }, 'Слово верно? Не опечатка?'),
        h('div', { class: 'row' }, btn('Да, прячу', () => handover(api, api.teams[gi].name, api.teams[si].name + ' загадал(а) слово. Ваша очередь угадывать.', () => play(si, gi, k, w, hint), 'Я готов', gi), 'big good', { 'data-primary': true }), btn('Исправить', () => entry(si, gi, k, w, hint), 'big paper'))), { turn: si, role: 'Проверяет слово' });
    }
    function play(si, gi, k, word, hint) {
      const used = new Set(); let miss = 0, over = false;
      const sn = api.teams[si].name, gn = api.teams[gi].name;
      const wordEl = h('div', { class: 'hang-word' }), gal = h('div'), msg = h('div', { class: 'mid-t' }, 'Называйте буквы.'), kb = h('div', { class: 'keys' }), actions = h('div', { class: 'row' });
      const complete = () => [...word].every(ch => used.has(ch));
      function paint() {
        wordEl.replaceChildren(...[...word].map(ch => h('span', { class: 'hl' + (over && !used.has(ch) ? ' lost' : '') }, used.has(ch) || over ? ch.toUpperCase() : '')));
        gal.replaceChildren(gallows(miss));
        kb.replaceChildren(...ABC.map(ch => h('button', { class: 'key' + (used.has(ch) ? (word.includes(ch) ? ' hit' : ' miss') : ''), type: 'button', disabled: used.has(ch) || over, onclick: () => pick(ch) }, ch.toUpperCase())));
      }
      function pick(ch) {
        if (over || used.has(ch)) return; used.add(ch);
        if (word.includes(ch)) { sfx.ok(); msg.textContent = 'Есть «' + ch.toUpperCase() + '»!'; if (complete()) return end(true); }
        else { sfx.bad(); miss++; msg.textContent = 'Буквы «' + ch.toUpperCase() + '» нет.'; if (miss >= MAX) return end(false); }
        paint();
      }
      function end(solved) {
        over = true; if (solved) { [...word].forEach(ch => used.add(ch)); sfx.ok(); } else sfx.buzz(); paint();
        const [g, s] = hdPoints(solved, miss, word.length);
        if (together) { if (g + s) api.teams.forEach((_, i) => api.score(i, g + s)); } else { if (g) api.score(gi, g); if (s) api.score(si, s); }
        msg.textContent = (solved ? 'Слово «' + word.toUpperCase() + '» отгадано, ошибок: ' + miss + '.' : 'Не отгадано. Слово: «' + word.toUpperCase() + '».')
          + (together ? ' Общий счёт +' + (g + s) + '.' : ' ' + gn + ': +' + g + (s ? ', ' + sn + ': +' + s : '') + '.');
        actions.replaceChildren(btn(r >= R ? 'Итоги' : 'Дальше', nextRound, 'big', { 'data-primary': true }));
      }
      function wholeRow() {
        const wi = h('input', { class: 'input hd-in', type: 'text', maxlength: 24, placeholder: 'Слово целиком', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': 'Слово целиком' });
        const chk = () => {
          if (over) return; const g = hdNorm(wi.value).trim(); if (!g) return;
          if (g === word) return end(true);
          sfx.bad(); miss++; if (miss >= MAX) return end(false);
          msg.textContent = 'Слово «' + g.toUpperCase() + '» неверное.'; actions.replaceChildren(whole); paint();
        };
        wi.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); chk(); } });
        actions.replaceChildren(wi, btn('Проверить', chk, 'small', { 'data-primary': true })); wi.focus();
      }
      const whole = btn('Назвать слово целиком', wholeRow, 'paper small');
      actions.replaceChildren(whole);
      api.show([h('div', { class: 'hang-top' }, gal, h('div', { class: 'hang-side' }, h('div', { class: 'kicker' }, 'Раунд ' + k + ' из ' + R + (hint ? ' · ' + hint : '') + ' · ' + word.length + ' букв'), wordEl, msg)), kb, actions], { turn: gi, role: 'Угадывает слово' });
      paint();
    }
    function finish() {
      if (!together) return api.end();
      const total = api.teams[0].score, rec = store.get(REC, 0), best = total > rec; if (best) store.set(REC, total);
      api.end({ custom: true, title: 'Общий счёт: ' + total, lines: [best ? 'Новый рекорд пары!' : 'Рекорд пары: ' + rec] });
    }
    nextRound();
  }
  registerGame({
    id: 'hang', title: 'Виселица', icon: '🔤', color: '#22b8c9',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 6 }, mins: 20,
    tagline: 'Угадывайте слово по буквам, пока виселица не достроена. Каждая верная буква — очко, отгаданное слово — три.',
    rules: '<ul><li>На экране слово из чёрточек и подсказка — тема. Команды по очереди называют по одной букве, нажимая её на экране.</li><li>Верная буква открывается во всех местах и приносит очко за каждое. Команда с верной буквой называет следующую.</li><li>Ошибка достраивает виселицу и передаёт ход. После семи ошибок слово не отгадано.</li><li>Кто открыл последнюю букву или назвал слово целиком, получает бонус три очка.</li></ul><p><b>Режим «Загадывают игроки».</b> Перед раундом один игрок тайно вводит слово (3–16 русских букв, без дефиса и пробелов; «ё» считается как «е»), по желанию добавляет подсказку-категорию. Следующий по кругу угадывает по буквам или называет слово целиком; роли чередуются.</p><ul><li>Угадавший получает очко за каждую оставшуюся ошибку и ещё одно очко за сам успех (от 1 до 8).</li><li>Загадавший получает очко, если слово не угадали. Длинное слово (8+ букв) даёт ещё +1, 11+ букв ещё +2; тот же бонус он получает, если слово всё же угадали, но не меньше чем с четырьмя ошибками.</li><li>«Вместе»: очки обоих идут в общий счёт, и вы бьёте рекорд пары. «Друг против друга»: у каждого свой счёт.</li></ul>',
    opts: [
      { key: 'mode', label: 'Режим', values: [['deck', 'Слова из колоды'], ['duel', 'Загадывают игроки']], def: 'deck' },
      { key: 'rounds', label: 'Слов у каждой команды (режим «из колоды»)', values: [1, 2, 3], def: 2 },
      { key: 'drounds', label: 'Раундов (режим «загадывают игроки»)', values: [4, 6, 10], def: 6 },
      { key: 'score', label: 'Счёт (режим «загадывают игроки»)', values: [['team', 'Вместе'], ['vs', 'Друг против друга']], def: 'vs' }
    ],
    cards: () => items.length,
    start(api) {
      if (api.opts.mode === 'duel') return duel(api);
      rotate(api, api.opts.rounds, (ti0, k, total, next, last) => {
        const card = deck.draw(), word = card.w.toLowerCase();
        const n = ch => ch === 'ё' ? 'е' : ch, nw = word.replace(/ё/g, 'е');
        const used = new Set(); let miss = 0, ti = ti0, over = false;
        const wordEl = h('div', { class: 'hang-word' }), gal = h('div'), msg = h('div', { class: 'mid-t' }), kb = h('div', { class: 'keys' }), actions = h('div', { class: 'row' });
        const shown = () => [...word].map(ch => ch === ' ' ? ' ' : (used.has(n(ch)) || over ? ch : '_'));
        const complete = () => [...word].every(ch => ch === ' ' || used.has(n(ch)));
        function paint() {
          wordEl.replaceChildren(...[...word].map((ch, i) => h('span', { class: 'hl' + (ch === ' ' ? ' sp' : '') + (over && !used.has(n(ch)) && ch !== ' ' ? ' lost' : '') }, ch === ' ' ? '' : (used.has(n(ch)) || over ? ch.toUpperCase() : ''))));
          gal.replaceChildren(gallows(miss));
          kb.replaceChildren(...ABC.map(ch => h('button', { class: 'key' + (used.has(ch) ? (nw.includes(ch) ? ' hit' : ' miss') : ''), type: 'button', disabled: used.has(ch) || over, onclick: () => pick(ch) }, ch.toUpperCase())));
        }
        function pick(ch) {
          if (over || used.has(ch)) return; used.add(ch);
          const c = [...nw].filter(x => x === ch).length;
          if (c) { sfx.ok(); api.score(ti, c); msg.textContent = api.teams[ti].name + ': есть «' + ch.toUpperCase() + '», +' + c; if (complete()) return win(ti); }
          else { sfx.bad(); miss++; msg.textContent = 'Буквы «' + ch.toUpperCase() + '» нет. Ход переходит дальше.'; if (miss >= MAX) return lose(); ti = (ti + 1) % api.n; api.setTurn(ti, 'Называет букву'); }
          paint();
        }
        function win(who) { over = true; api.score(who, 3); sfx.ok(); paint(); finish(api.teams[who].name + ' открыла слово! +3 очка бонус.'); }
        function lose() { over = true; sfx.buzz(); paint(); finish('Виселица достроена. Слово не отгадано.'); }
        function finish(t) { msg.textContent = t; actions.replaceChildren(btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })); kb.querySelectorAll('button').forEach(b => b.disabled = true); }
        const whole = btn('Назвать слово целиком', () => {
          if (over) return; actions.replaceChildren(judgeRow(api, api.teams[ti].name + ' называет слово. Верно ли оно?', 'Верно', ok => { if (ok) { [...nw].forEach(ch => used.add(ch)); win(ti); } else { miss++; sfx.bad(); if (miss >= MAX) return lose(); ti = (ti + 1) % api.n; api.setTurn(ti, 'Называет букву'); msg.textContent = 'Слово неверное. Ход переходит дальше.'; actions.replaceChildren(whole); paint(); } }, 'Нет'));
        }, 'paper small');
        actions.replaceChildren(whole);
        api.show([h('div', { class: 'hang-top' }, gal, h('div', { class: 'hang-side' }, h('div', { class: 'kicker' }, 'Слово ' + k + ' из ' + total + ' · ' + card.c + ' · ' + word.replace(/ /g, '').length + ' букв'), wordEl, msg)), kb, actions], { turn: ti, role: 'Называет букву' });
        paint();
      });
    }
  });
}
