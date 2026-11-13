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
    saveVersion: 1,
    validateSave(s, opts, teams) {
      const level = LEVELS[opts.lvl], c = SaveChecks;
      if (!s || !c.int(s.round, 1, teams.length * opts.rounds) || !c.array(s.secret, level.len, v => c.int(v, 0, level.colors - 1))) return false;
      if (!c.array(s.cur, level.len, v => c.int(v, -1, level.colors - 1)) || !c.int(s.sel, 0, level.len - 1)) return false;
      if (!Array.isArray(s.rows) || s.rows.length > level.tries || !s.rows.every(row => c.array(row, level.len, v => c.int(v, 0, level.colors - 1)))) return false;
      if (![null, 'win', 'loss', 'time'].includes(s.outcome) || (opts.time ? !c.number(s.remaining, 0, opts.time) : s.remaining !== null)) return false;
      const wins = s.rows.map(row => mmFeedback(s.secret, row).exact === level.len);
      if (wins.slice(0, -1).some(Boolean)) return false;
      if (s.outcome === 'win') return wins.at(-1) === true;
      if (wins.some(Boolean)) return false;
      if (s.outcome === 'loss') return s.rows.length === level.tries;
      if (s.outcome === 'time') return opts.time > 0 && s.remaining === 0;
      return s.rows.length < level.tries;
    },
    start(api) {
      const L = LEVELS[api.opts.lvl] || LEVELS.classic, total = api.n * api.opts.rounds;
      let initial = api.saved, k = initial ? initial.round : 1;
      play();
      function play() {
        if (k > total) {
          if (api.n === 1) api.record({ metric: 'solo-score', label: 'Очки', value: api.teams[0].score, settings: { lvl: api.opts.lvl, rounds: api.opts.rounds, time: api.opts.time }, description: ({ classic: 'Классика', hard: 'Сложнее', expert: 'Эксперт' }[api.opts.lvl]) + ' · Кодов: ' + api.opts.rounds + ' · ' + (api.opts.time ? api.opts.time + ' с на код' : 'Без таймера') });
          return api.end();
        }
        const saved = initial; initial = null;
        const ti = (k - 1) % api.n, last = k === total, next = () => { k++; play(); };
        const secret = saved ? saved.secret : range(L.len).map(() => rnd(L.colors));
        const rows = saved ? saved.rows.map(g => ({ g, fb: mmFeedback(secret, g) })) : [];
        let cur = saved ? saved.cur : Array(L.len).fill(-1), sel = saved ? saved.sel : 0, outcome = saved ? saved.outcome : null, over = outcome !== null, timer = null;
        const board = h('div', { class: 'mm-board' }), pal = h('div', { class: 'mm-pal' }), bar = h('div', { class: 'row' }), msg = h('div', { class: 'mid-t' });
        const peg = (v, cls = '') => h('span', { class: 'mm-peg ' + cls + (v < 0 ? ' blank' : ''), style: v >= 0 ? { '--c': MM_PEGS[v].c, '--g': v === 7 ? '#eef1ff' : '#0e1233' } : null, 'aria-label': v >= 0 ? MM_PEGS[v].n : 'пусто' }, v >= 0 ? h('i', null, MM_PEGS[v].s) : null);
        const pins = fb => h('span', { class: 'mm-pins', 'aria-label': 'на месте: ' + fb.exact + ', не на месте: ' + fb.color }, ...range(L.len).map(i => h('b', { class: i < fb.exact ? 'ex' : i < fb.exact + fb.color ? 'co' : '' })));
        function message() {
          if (outcome === 'win') return 'Код взломан за ' + rows.length + ' ' + plural(rows.length, 'попытку', 'попытки', 'попыток') + '! +' + pts(L.tries - rows.length + 1) + '.';
          if (outcome === 'time') return 'Время вышло. Вот секретный код.';
          if (outcome === 'loss') return 'Попытки кончились. Вот секретный код.';
          const fb = rows.length ? rows[rows.length - 1].fb : null;
          return fb ? (fb.exact || fb.color ? 'На месте: ' + fb.exact + ', не на месте: ' + fb.color + '.' : 'Ни одного совпадения: эти цвета можно исключить.') : 'Попыток: ' + L.tries + '. Выберите цвета и нажмите «Проверить».';
        }
        function paint() {
          msg.textContent = message();
          board.replaceChildren(...rows.map((r, i) => h('div', { class: 'mm-row done', 'data-row': i }, h('span', { class: 'mm-n' }, i + 1), h('span', { class: 'mm-pegs' }, ...r.g.map(v => peg(v))), pins(r.fb))));
          if (!over) board.append(h('div', { class: 'mm-row cur' }, h('span', { class: 'mm-n' }, rows.length + 1), h('span', { class: 'mm-pegs' }, ...cur.map((v, i) => { const e = peg(v, i === sel ? 'sel' : ''); e.setAttribute('role', 'button'); e.tabIndex = 0; e.onclick = () => { sel = i; paint(); api.save(); }; e.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); sel = i; paint(); api.save(); } }; return e; })), h('span', { class: 'mm-pins ph' })));
          else board.append(h('div', { class: 'mm-row secret' }, h('span', { class: 'mm-n' }, '🔑'), h('span', { class: 'mm-pegs' }, ...secret.map(v => peg(v))), h('span', { class: 'mm-pins ph' })));
          pal.replaceChildren(...range(L.colors).map(v => h('button', { class: 'mm-pb', type: 'button', style: { '--c': MM_PEGS[v].c }, disabled: over, 'aria-label': MM_PEGS[v].n, onclick: () => put(v) }, h('i', null, MM_PEGS[v].s))));
          const full = cur.every(v => v >= 0);
          bar.replaceChildren(...(over ? [btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })] : [btn('Стереть', () => erase(), 'paper', { disabled: cur.every(v => v < 0) }), btn('Проверить', check, 'big', { 'data-primary': full ? true : null, disabled: !full })]));
          const lastRow = board.querySelector('.mm-row.cur'); if (lastRow) lastRow.scrollIntoView({ block: 'nearest' });
        }
        function put(v) { if (over) return; cur[sel] = v; sfx.click(); const nx = cur.findIndex((x, i) => x < 0 && i !== sel); sel = nx >= 0 ? nx : sel; paint(); api.save(); }
        function erase() { const i = cur.some((v, j) => v >= 0 && j === sel) ? sel : cur.map((v, j) => v >= 0 ? j : -1).filter(j => j >= 0).pop(); if (i >= 0 && i !== undefined) { cur[i] = -1; sel = i; } paint(); api.save(); }
        function check() {
          if (over || !cur.every(v => v >= 0)) return;
          const fb = mmFeedback(secret, cur); rows.push({ g: cur.slice(), fb }); cur = Array(L.len).fill(-1); sel = 0;
          if (fb.exact === L.len) return finish('win');
          if (rows.length >= L.tries) return finish('loss');
          sfx.click(); paint(); api.save();
        }
        function finish(result) {
          if (over) return;
          over = true; outcome = result; if (timer) timer.stop();
          if (outcome === 'win') { sfx.ok(); api.score(ti, L.tries - rows.length + 1); } else sfx.buzz();
          paint(); api.save();
        }
        if (api.opts.time) { timer = Timer(api.opts.time, { left: saved ? saved.remaining : api.opts.time, onEnd: () => finish('time') }); }
        api.show([
          h('div', { class: 'card accent mm-card' }, h('div', { class: 'kicker' }, 'Код ' + k + ' из ' + total + ' · ' + L.len + ' фишек, ' + L.colors + ' цветов'), msg, timer ? timer.el : null),
          h('div', { class: 'mm-play' }, board, h('div', { class: 'mm-side' }, pal, bar))
        ], { turn: ti, role: 'Взламывает код', compact: true });
        if (timer && !over) timer.start();
        paint();
        api.enableSave(() => ({ round: k, secret: secret.slice(), rows: rows.map(r => r.g.slice()), cur: cur.slice(), sel, outcome, remaining: timer ? timer.left : null }));
      }
    }
  });
}
