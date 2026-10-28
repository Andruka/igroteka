/* 32. Кодовые имена — капитаны подсказывают одним словом, команды ищут свои слова на поле */
/* раскладка поля: size клеток, у первой команды first слов, у второй — на одно меньше, остальные нейтральные, одна — убийца */
function cnLayout(size, startTeam) {
  const a = Math.round(size * 0.36), b = a - 1, kinds = [];
  for (let i = 0; i < a; i++) kinds.push(startTeam === 0 ? 'a' : 'b');
  for (let i = 0; i < b; i++) kinds.push(startTeam === 0 ? 'b' : 'a');
  kinds.push('x'); while (kinds.length < size) kinds.push('n');
  return shuffle(kinds);
}
{
  const deck = makeDeck('codenames', DATA.codenames);
  const SYM = { a: '●', b: '■', n: '○', x: '☠' };
  registerGame({
    id: 'codenames', title: 'Кодовые имена', icon: '🗝️', color: '#e07a5f',
    cats: ['Командные', 'Для компании', 'Загадки и истории'], teams: { min: 2, max: 2 }, mins: 30,
    tagline: 'Два капитана знают, какие слова чьи. Они подсказывают одним словом, а команды ищут свои слова на поле и обходят слово-убийцу.',
    rules: '<ul><li>На поле 25 слов. Каждая команда выбирает капитана. Капитаны вместе смотрят «Карту капитанов» — там видно, какие слова принадлежат какой команде, какие нейтральные и какое — <b>убийца</b>. Остальные в это время отворачиваются.</li><li>В свой ход капитан даёт подсказку: <b>одно слово и число</b> — сколько слов поля с ним связано. Подсказка не может быть словом с поля. Говорит вслух, а не показывает на экран.</li><li>Команда обсуждает и выбирает слова на экране. Слово своей команды — можно продолжать (до числа плюс одно). Нейтральное слово — ход переходит. Слово соперников — оно засчитывается им, ход переходит. <b>Убийца — мгновенное поражение.</b></li><li>Побеждает команда, первой открывшая все свои слова.</li></ul>',
    opts: [
      { key: 'time', label: 'Время на ход', values: [[0, 'Без таймера'], [90, '90 секунд'], [150, '150 секунд']], def: 0 }
    ],
    cards: () => DATA.codenames.length,
    start(api) {
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
