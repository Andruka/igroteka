/* 32. Кодовые имена — капитаны подсказывают одним словом, команды ищут свои слова на поле */
/* раскладка поля: size клеток, у первой команды first слов, у второй — на одно меньше, остальные нейтральные, одна — убийца */
function cnLayout(size, startTeam) {
  const a = Math.round(size * 0.36), b = a - 1, kinds = [];
  for (let i = 0; i < a; i++) kinds.push(startTeam === 0 ? 'a' : 'b');
  for (let i = 0; i < b; i++) kinds.push(startTeam === 0 ? 'b' : 'a');
  kinds.push('x'); while (kinds.length < size) kinds.push('n');
  return shuffle(kinds);
}
/* «Дуэт»: два игрока, ключи (a — первого, b — второго): 'g' агент, 'n' прохожий, 'x' убийца.
   Пересечения как в Codenames Duet: ГГ×3, Г/Н×5, Н/Г×5, Г/У×1, У/Г×1, У/У×1, У/Н×1, Н/У×1, Н/Н×7 */
function cnDuetKeys() {
  const P = [];
  const add = (a, b, c) => { for (let i = 0; i < c; i++) P.push([a, b]); };
  add('g', 'g', 3); add('g', 'n', 5); add('n', 'g', 5); add('g', 'x', 1); add('x', 'g', 1); add('x', 'x', 1); add('x', 'n', 1); add('n', 'x', 1); add('n', 'n', 7);
  const q = shuffle(P); return { a: q.map(x => x[0]), b: q.map(x => x[1]) };
}
{
  const deck = makeDeck('codenames', DATA.codenames);
  const SYM = { a: '●', b: '■', n: '○', x: '☠' };
  function cnDuet(api) {
    const N = 25, T0 = [9, 11, 13].includes(+api.opts.turns) ? +api.opts.turns : 9;
    const words = deck.drawN(N), keys = cnDuetKeys(), K = [keys.a, keys.b];
    const found = Array(N).fill(false), seen = [Array(N).fill(false), Array(N).fill(false)];
    const NAMES = { g: 'агент', n: 'нейтральное слово', x: 'убийца' };
    let tokens = T0, giver = rnd(2), sel = -1, guesses = 0, over = false, note = '';
    const nm = i => api.teams[i].name;
    const remain = p => range(N).filter(i => K[p][i] === 'g' && !found[i]).length;
    const nFound = () => found.filter(Boolean).length;
    const hud = () => h('div', { class: 'cd-hud', role: 'status', 'aria-label': 'Жетонов времени осталось ' + tokens + ' из ' + T0 + ', найдено агентов ' + nFound() + ' из 15' },
      h('span', { class: 'cd-tok' }, range(T0).map(i => h('i', { class: i < tokens ? 'on' : '' }))), h('b', null, 'Жетонов: ' + tokens), h('span', { class: 'cd-agents' }, 'Агентов: ' + nFound() + ' / 15'));
    const guesser = () => 1 - giver;
    /* 1. передача подсказчику */
    function round() {
      sel = -1; guesses = 0;
      if (remain(giver) === 0) giver = 1 - giver;
      handover(api, nm(giver), 'Вы даёте подсказку. ' + nm(guesser()) + ', отвернитесь и не смотрите на экран. Жетонов осталось: ' + tokens + '.' + (note ? ' ' + note : ''), showKey, 'Показать мой ключ', giver);
    }
    /* 2. ключ подсказчика */
    function showKey() {
      const cells = range(N).map(i => {
        const k = K[giver][i], f = found[i];
        return h('div', { class: 'cn-cell cd-key-cell cd-k-' + k + (f ? ' cd-was' : ''), 'aria-label': words[i] + ', ' + NAMES[k] + (f ? ', уже найден' : '') },
          h('span', null, words[i]), h('i', { class: 'cn-sym cd-sym' }, k === 'g' ? '●' : k === 'x' ? '☠' : '○'), f ? h('i', { class: 'cd-ok' }, '✓') : null);
      });
      api.show([h('div', { class: 'cd-keywrap' }, h('div', { class: 'mid-t' }, 'Ваш ключ, ' + nm(giver) + '. Придумайте слово и число, затем нажмите «Скрыть».'),
        h('div', { class: 'cd-legend' }, h('span', { class: 'cd-lg g' }, '● агент (' + remain(giver) + ' осталось)'), h('span', { class: 'cd-lg n' }, '○ нейтральное'), h('span', { class: 'cd-lg x' }, '☠ убийца')),
        h('div', { class: 'cn-grid cd-grid cd-key' }, cells), btn('Скрыть', hideKey, 'big', { 'data-primary': true }))], { turn: giver, role: 'Смотрит свой ключ', compact: true });
    }
    function hideKey() {
      handover(api, nm(guesser()), 'Ключ скрыт. ' + nm(giver) + ' говорит вслух подсказку: слово и число. Затем ' + nm(guesser()) + ' выбирает слова.', guessScreen, 'Я готов', guesser());
    }
    /* 3. угадывание */
    const gridEl = h('div', { class: 'cn-grid cd-grid' }), bar = h('div', { class: 'row center' }), infoEl = h('div', { class: 'mid-t cd-info' }), hudEl = h('div');
    const clickable = i => !found[i] && !seen[giver][i];
    function paint() {
      hudEl.replaceChildren(hud());
      gridEl.replaceChildren(...range(N).map(i => {
        const f = found[i], m = !f && (seen[0][i] || seen[1][i]);
        const e = h('button', { type: 'button', class: 'cn-cell cd-cell' + (f ? ' cd-found' : '') + (m ? ' cd-miss' : '') + (sel === i ? ' sel' : ''), disabled: !clickable(i) || over ? true : null, 'aria-label': words[i] + (f ? ', агент найден' : m ? ', нейтральное слово' : '') },
          h('span', null, words[i]), f ? h('i', { class: 'cn-sym cd-sym' }, '●') : m ? h('i', { class: 'cn-sym cd-sym' }, '○') : null);
        e.onclick = () => { if (over) return; sfx.click(); sel = sel === i ? -1 : i; paint(); };
        return e;
      }));
      const canStop = guesses > 0 || !range(N).some(clickable);
      bar.replaceChildren(...(over ? [] : sel >= 0
        ? [btn('Открыть «' + words[sel] + '»', () => reveal(sel), 'big', { 'data-primary': true }), btn('Отмена', () => { sel = -1; paint(); }, 'paper')]
        : [canStop ? btn('Закончить ход', () => endRound('Остановились.'), 'paper') : h('span', { class: 'muted cd-hint' }, 'Нужно выбрать хотя бы одно слово')]));
    }
    function guessScreen() {
      infoEl.textContent = nm(guesser()) + ', выберите слово, связанное с подсказкой.';
      api.show([hudEl, infoEl, gridEl, bar], { turn: guesser(), role: 'Угадывает', compact: true }); paint();
    }
    function reveal(i) {
      if (over || !clickable(i)) return; const k = K[giver][i]; sel = -1; guesses++;
      if (k === 'x') { sfx.buzz(); return finish(false, '«' + words[i] + '» — убийца на ключе игрока ' + nm(giver) + '.'); }
      if (k === 'g') {
        found[i] = true; api.score(guesser(), 1); sfx.ok();
        if (nFound() === 15) return finish(true, 'Все 15 агентов найдены. Жетонов осталось: ' + tokens + '.');
        infoEl.textContent = 'Верно: «' + words[i] + '» — агент. Продолжайте или закончите ход.'; return paint();
      }
      seen[giver][i] = true; sfx.bad(); endRound('«' + words[i] + '» — нейтральное слово.');
    }
    function endRound(msg) {
      tokens--; sel = -1;
      if (tokens <= 0) return finish(false, 'Жетоны времени кончились. Найдено агентов: ' + nFound() + ' из 15.');
      const nxt = 1 - giver; giver = remain(nxt) > 0 ? nxt : giver;
      note = msg; round();
    }
    function finish(win, why) {
      over = true;
      const left = range(N).filter(i => !found[i] && (K[0][i] === 'g' || K[1][i] === 'g'));
      api.end({ custom: true, win, title: win ? 'Победа! Все агенты найдены' : 'Задание провалено', sub: why,
        lines: [h('div', { class: 'cn-grid cd-grid cd-final' }, range(N).map(i => h('div', { class: 'cn-cell cd-key-cell' + (found[i] ? ' cd-found' : ''), style: { minHeight: '40px', fontSize: '.8rem' } }, h('span', null, words[i])))),
          left.length ? h('p', { class: 'muted' }, 'Не найдены: ' + left.map(i => words[i]).join(', ')) : null] });
    }
    round();
  }
  registerGame({
    id: 'codenames', title: 'Кодовые имена', icon: '🗝️', color: '#e07a5f',
    cats: ['Командные', 'Для компании', 'Загадки и истории'], teams: { min: 2, max: 2 }, mins: 30,
    tagline: 'Два капитана знают, какие слова чьи. Они подсказывают одним словом, а команды ищут свои слова на поле и обходят слово-убийцу.',
    rules: '<ul><li>На поле 25 слов. Каждая команда выбирает капитана. Капитаны вместе смотрят «Карту капитанов» — там видно, какие слова принадлежат какой команде, какие нейтральные и какое — <b>убийца</b>. Остальные в это время отворачиваются.</li><li>В свой ход капитан даёт подсказку: <b>одно слово и число</b> — сколько слов поля с ним связано. Подсказка не может быть словом с поля. Говорит вслух, а не показывает на экран.</li><li>Команда обсуждает и выбирает слова на экране. Слово своей команды — можно продолжать (до числа плюс одно). Нейтральное слово — ход переходит. Слово соперников — оно засчитывается им, ход переходит. <b>Убийца — мгновенное поражение.</b></li><li>Побеждает команда, первой открывшая все свои слова.</li></ul><h3>Режим «Дуэт» (для двоих)</h3><ul><li>Двое играют <b>вместе</b> против времени. У каждого своя тайная карта-ключ: 9 агентов, 3 убийцы, остальные слова нейтральные. Три агента общие.</li><li>Ход: один подсказывает — берёт устройство, смотрит свой ключ (партнёр отвернулся), нажимает «Скрыть» и вслух говорит слово и число. Второй угадывает на экране: слова открываются по ключу <b>подсказчика</b>.</li><li>Агент — слово открыто, можно продолжать. Нейтральное слово — ход кончается. <b>Убийца — общее поражение.</b> Остановиться можно после первой попытки.</li><li>Каждый закончившийся ход (остановка или промах) тратит один жетон. Нужно найти все 15 агентов (9 + 9 − 3) до конца жетонов. Затем роли меняются.</li></ul>',
    opts: [
      { key: 'mode', label: 'Режим', values: [['teams', 'Две команды'], ['duet', 'Дуэт: вдвоём вместе']], def: 'teams' },
      { key: 'turns', label: 'Дуэт: жетонов времени (ходов)', values: [[9, '9 — сложно'], [11, '11'], [13, '13 — проще']], def: 9 },
      { key: 'time', label: 'Две команды: время на ход', values: [[0, 'Без таймера'], [90, '90 секунд'], [150, '150 секунд']], def: 0 }
    ],
    cards: () => DATA.codenames.length,
    start(api) {
      if (api.opts.mode === 'duet') return cnDuet(api);
      const first = rnd(2), N = 25;
      const words = deck.drawN(N), kinds = cnLayout(N, first), open = Array(N).fill(false);
      const left = k => kinds.filter((x, i) => x === k && !open[i]).length;
      const total = { a: kinds.filter(x => x === 'a').length, b: kinds.filter(x => x === 'b').length };
      let ti = first, sel = -1, found = 0, timer = null, over = false;
      const gridEl = h('div', { class: 'cn-grid' }), info = h('div', { class: 'mid-t' }), bar = h('div', { class: 'row center' });
      const colorOf = k => k === 'a' ? api.teams[0].color : k === 'b' ? api.teams[1].color : null;
      function cell(i, forKey) {
        const k = kinds[i], shown = open[i] || forKey;
        const el = h(forKey ? 'div' : 'button', { class: 'cn-cell' + (shown ? ' open k-' + k : '') + (sel === i ? ' sel' : '') + (open[i] ? ' done' : ''), type: forKey ? null : 'button', style: shown && colorOf(k) ? { '--c': colorOf(k) } : null, disabled: !forKey && (open[i] || over) ? true : null, 'aria-label': words[i] + (shown ? ', ' + (k === 'x' ? 'убийца' : k === 'n' ? 'нейтральное' : api.teams[k === 'a' ? 0 : 1].name) : '') },
          h('span', null, words[i]), shown ? h('i', { class: 'cn-sym' }, SYM[k]) : null);
        if (!forKey) el.onclick = () => { if (open[i] || over) return; sfx.click(); sel = sel === i ? -1 : i; paint(); };
        return el;
      }
      function paint() {
        gridEl.replaceChildren(...range(N).map(i => cell(i, false)));
        const sc = h('div', { class: 'cn-left' }, [0, 1].map(t => { const k = t === 0 ? 'a' : 'b'; return h('span', { style: { '--c': api.teams[t].color }, class: ti === t ? 'on' : '' }, api.teams[t].name + ': осталось ' + left(k)); }));
        bar.replaceChildren(...(over ? [] : sel >= 0
          ? [btn('Открыть «' + words[sel] + '»', () => reveal(sel), 'big', { 'data-primary': true }), btn('Отмена', () => { sel = -1; paint(); }, 'paper')]
          : [btn('Карта капитанов', keyMap, 'sky'), btn('Закончить ход', () => endTurn('Ход передан.'), 'paper')]));
        cnLeft.replaceChildren(...sc.childNodes);
      }
      const cnLeft = h('div', { class: 'cn-left' });
      function keyMap() {
        const m = modal(h('div', null, h('h2', null, 'Карта капитанов'), h('p', { class: 'muted', style: { margin: '.4rem 0 .8rem' } }, 'Смотрят только капитаны. Остальные отвернулись. ● — ' + api.teams[0].name + ', ■ — ' + api.teams[1].name + ', ○ — нейтральные, ☠ — убийца.'), h('div', { class: 'cn-grid key' }, range(N).map(i => cell(i, true)))), [btn('Спрятать', () => m.close(), '')]);
      }
      function setTurn() {
        api.setTurn(ti, 'Ход команды');
        info.textContent = api.teams[ti].name + ': капитан даёт подсказку вслух (слово и число), команда выбирает слова.';
        found = 0; sel = -1; if (timer) timer.reset(api.opts.time), timer.start();
      }
      function endTurn(msg) { ti = 1 - ti; sfx.click(); setTurn(); if (msg) info.textContent = msg + ' ' + info.textContent; paint(); }
      function win(t, why) {
        over = true; if (timer) timer.stop(); paint();
        api.end({ custom: true, win: true, title: 'Побеждает ' + api.teams[t].name + '!', sub: why, lines: [h('div', { class: 'cn-grid key small' }, range(N).map(i => cell(i, true)))] });
      }
      function reveal(i) {
        if (over || open[i]) return; open[i] = true; sel = -1; const k = kinds[i];
        const mine = ti === 0 ? 'a' : 'b';
        if (k === 'x') { sfx.buzz(); return win(1 - ti, 'Команда «' + api.teams[ti].name + '» открыла слово-убийцу.'); }
        if (k === 'a' || k === 'b') { api.score(k === 'a' ? 0 : 1, 1); }
        if (left('a') === 0) return win(0, 'Все слова команды открыты.');
        if (left('b') === 0) return win(1, 'Все слова команды открыты.');
        if (k === mine) { sfx.ok(); found++; info.textContent = 'Верно: «' + words[i] + '» — слово вашей команды. Можно продолжать или закончить ход.'; paint(); }
        else if (k === 'n') { sfx.bad(); endTurn('«' + words[i] + '» — нейтральное слово.'); }
        else { sfx.bad(); endTurn('«' + words[i] + '» — слово соперников.'); }
      }
      if (api.opts.time) timer = Timer(api.opts.time, { onEnd: () => { if (!over) { sfx.buzz(); endTurn('Время вышло.'); } } });
      api.show([h('div', { class: 'cn-top' }, cnLeft, timer ? timer.el : null), info, gridEl, bar], { turn: ti, role: 'Ход команды', compact: true });
      setTurn(); paint();
    }
  });
}
