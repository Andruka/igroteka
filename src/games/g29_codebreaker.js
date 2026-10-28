/* 29. Взлом кода — Мастермайнд: подберите секретную комбинацию по подсказкам */
const MM_PEGS = [
  { c: '#ff5a4d', s: '▲', n: 'красный' }, { c: '#3aa0ff', s: '■', n: 'синий' }, { c: '#2fd6a0', s: '●', n: 'зелёный' }, { c: '#ffc233', s: '◆', n: 'жёлтый' },
  { c: '#9a6bff', s: '★', n: 'фиолетовый' }, { c: '#ff9f43', s: '✚', n: 'оранжевый' }, { c: '#eef1ff', s: '▼', n: 'белый' }, { c: '#2a2f6a', s: '⬢', n: 'тёмный' }
];
/* подсказка: exact — верный цвет на верном месте, color — верный цвет не на своём месте */
function mmFeedback(secret, guess) {
  let exact = 0; const s = [], g = [];
  secret.forEach((v, i) => { if (guess[i] === v) exact++; else { s.push(v); g.push(guess[i]); } });
  let color = 0; g.forEach(v => { const k = s.indexOf(v); if (k >= 0) { color++; s.splice(k, 1); } });
  return { exact, color };
}
{
  const LEVELS = { classic: { len: 4, colors: 6, tries: 10 }, hard: { len: 5, colors: 7, tries: 12 }, expert: { len: 5, colors: 8, tries: 10 } };
  registerGame({
    id: 'codebreaker', title: 'Взлом кода', icon: '🔐', color: '#7a8cff',
    cats: ['Командные', 'Для компании', 'Для двоих', 'Загадки и истории'], teams: { min: 1, max: 6 }, mins: 25,
    tagline: 'Приложение загадало цветную комбинацию. Подбирайте её по подсказкам — чем меньше попыток, тем больше очков.',
    rules: '<ul><li>У каждой команды свой секретный код из цветных фишек. Цвета могут повторяться.</li><li>Соберите попытку и нажмите «Проверить». Рядом появятся подсказки: <b>зелёная точка</b> — цвет верный и стоит на своём месте, <b>белое колечко</b> — такой цвет в коде есть, но место другое. Какая именно фишка угадана — не говорится.</li><li>Рассуждайте логически: каждая подсказка отсекает часть вариантов.</li><li>Взломали код — получите очки за каждую неиспользованную попытку и ещё одно. Не уложились — ноль, а код будет показан.</li></ul>',
    opts: [
      { key: 'lvl', label: 'Сложность', values: [['classic', 'Классика: 4 фишки, 6 цветов'], ['hard', 'Сложнее: 5 фишек, 7 цветов'], ['expert', 'Эксперт: 5 фишек, 8 цветов']], def: 'classic' },
      { key: 'rounds', label: 'Кодов у каждой команды', values: [1, 2, 3], def: 1 },
      { key: 'time', label: 'Время на код', values: [[0, 'Без таймера'], [240, '4 минуты'], [420, '7 минут']], def: 0 }
    ],
    cards: () => 0,
    start(api) {
      const L = LEVELS[api.opts.lvl] || LEVELS.classic;
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const secret = range(L.len).map(() => rnd(L.colors));
        const rows = []; let cur = Array(L.len).fill(-1), sel = 0, over = false, timer = null;
        const board = h('div', { class: 'mm-board' }), pal = h('div', { class: 'mm-pal' }), bar = h('div', { class: 'row' }), msg = h('div', { class: 'mid-t' });
        const peg = (v, cls = '') => h('span', { class: 'mm-peg ' + cls + (v < 0 ? ' blank' : ''), style: v >= 0 ? { '--c': MM_PEGS[v].c, '--g': v === 7 ? '#eef1ff' : '#0e1233' } : null, 'aria-label': v >= 0 ? MM_PEGS[v].n : 'пусто' }, v >= 0 ? h('i', null, MM_PEGS[v].s) : null);
        const pins = fb => h('span', { class: 'mm-pins', 'aria-label': 'на месте: ' + fb.exact + ', не на месте: ' + fb.color }, ...range(L.len).map(i => h('b', { class: i < fb.exact ? 'ex' : i < fb.exact + fb.color ? 'co' : '' })));
        function paint() {
          board.replaceChildren(...rows.map((r, i) => h('div', { class: 'mm-row done', 'data-row': i }, h('span', { class: 'mm-n' }, i + 1), h('span', { class: 'mm-pegs' }, ...r.g.map(v => peg(v))), pins(r.fb))));
          if (!over) board.append(h('div', { class: 'mm-row cur' }, h('span', { class: 'mm-n' }, rows.length + 1), h('span', { class: 'mm-pegs' }, ...cur.map((v, i) => { const e = peg(v, i === sel ? 'sel' : ''); e.setAttribute('role', 'button'); e.tabIndex = 0; e.onclick = () => { sel = i; paint(); }; e.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); sel = i; paint(); } }; return e; })), h('span', { class: 'mm-pins ph' })));
          else board.append(h('div', { class: 'mm-row secret' }, h('span', { class: 'mm-n' }, '🔑'), h('span', { class: 'mm-pegs' }, ...secret.map(v => peg(v))), h('span', { class: 'mm-pins ph' })));
          pal.replaceChildren(...range(L.colors).map(v => h('button', { class: 'mm-pb', type: 'button', style: { '--c': MM_PEGS[v].c }, disabled: over, 'aria-label': MM_PEGS[v].n, onclick: () => put(v) }, h('i', null, MM_PEGS[v].s))));
          const full = cur.every(v => v >= 0);
          bar.replaceChildren(...(over ? [] : [btn('Стереть', () => erase(), 'paper', { disabled: cur.every(v => v < 0) }), btn('Проверить', check, 'big', { 'data-primary': full ? true : null, disabled: !full })]));
          const lastRow = board.querySelector('.mm-row.cur'); if (lastRow) lastRow.scrollIntoView({ block: 'nearest' });
        }
        function put(v) { if (over) return; cur[sel] = v; sfx.click(); const nx = cur.findIndex((x, i) => x < 0 && i !== sel); sel = nx >= 0 ? nx : sel; paint(); }
        function erase() { const i = cur.some((v, j) => v >= 0 && j === sel) ? sel : cur.map((v, j) => v >= 0 ? j : -1).filter(j => j >= 0).pop(); if (i >= 0 && i !== undefined) { cur[i] = -1; sel = i; } paint(); }
        function check() {
          if (over || !cur.every(v => v >= 0)) return;
          const fb = mmFeedback(secret, cur); rows.push({ g: cur.slice(), fb }); cur = Array(L.len).fill(-1); sel = 0;
          if (fb.exact === L.len) return finish(true);
          if (rows.length >= L.tries) return finish(false);
          sfx.click(); msg.textContent = fb.exact || fb.color ? 'На месте: ' + fb.exact + ', не на месте: ' + fb.color + '.' : 'Ни одного совпадения: эти цвета можно исключить.'; paint();
        }
        function finish(win, timeUp) {
          over = true; if (timer) timer.stop();
          const p = win ? L.tries - rows.length + 1 : 0;
          if (win) { sfx.ok(); api.score(ti, p); msg.textContent = 'Код взломан за ' + rows.length + ' ' + plural(rows.length, 'попытку', 'попытки', 'попыток') + '! +' + pts(p) + '.'; }
          else { sfx.buzz(); msg.textContent = timeUp ? 'Время вышло. Вот секретный код.' : 'Попытки кончились. Вот секретный код.'; }
          paint(); bar.replaceChildren(btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true }));
        }
        if (api.opts.time) timer = Timer(api.opts.time, { onEnd: () => { if (!over) finish(false, true); } });
        msg.textContent = 'Попыток: ' + L.tries + '. Выберите цвета и нажмите «Проверить».';
        api.show([
          h('div', { class: 'card accent mm-card' }, h('div', { class: 'kicker' }, 'Код ' + k + ' из ' + total + ' · ' + L.len + ' фишек, ' + L.colors + ' цветов'), msg, timer ? timer.el : null),
          h('div', { class: 'mm-play' }, board, h('div', { class: 'mm-side' }, pal, bar))
        ], { turn: ti, role: 'Взламывает код', compact: true });
        if (timer) timer.start();
        paint();
      });
    }
  });
}
