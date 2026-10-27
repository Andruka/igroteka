/* 28. Рисуем и угадываем — холст на общем экране */
{
  const deck = makeDeck('draw', DATA.draw);
  const COLORS = ['#141a46', '#e53b5b', '#ff9a3d', '#ffc233', '#2fd6a0', '#3a5bff', '#9a6bff', '#8b5a2b'];
  const SIZES = [[4, 'Тонкая'], [10, 'Средняя'], [22, 'Толстая']];
  function pad() {
    const W = 1200, H = 680, cv = h('canvas', { class: 'pad', width: W, height: H, 'aria-label': 'Холст для рисования' }), ctx = cv.getContext('2d');
    let strokes = [], cur = null, color = COLORS[0], size = 10, eraser = false;
    const redraw = () => {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const s of strokes) { ctx.strokeStyle = s.c; ctx.fillStyle = s.c; ctx.lineWidth = s.w; ctx.beginPath(); s.p.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (s.p.length === 1) { ctx.arc(s.p[0][0], s.p[0][1], s.w / 2, 0, 7); ctx.fill(); } else ctx.stroke(); }
    };
    const pos = e => { const r = cv.getBoundingClientRect(), bx = cv.clientLeft, by = cv.clientTop; return [(e.clientX - r.left - bx) * W / cv.clientWidth, (e.clientY - r.top - by) * H / cv.clientHeight]; };
    const setCursor = () => {
      const k = (cv.clientWidth || 800) / W, d = Math.max(8, Math.min(120, Math.round((eraser ? size * 1.8 : size) * k))), c = d / 2 + 2, n = d + 4;
      const svg = eraser ? '<svg xmlns="http://www.w3.org/2000/svg" width="' + n + '" height="' + n + '"><rect x="2" y="2" width="' + d + '" height="' + d + '" fill="rgba(255,255,255,.6)" stroke="#141a46" stroke-width="2" stroke-dasharray="4 3"/></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="' + n + '" height="' + n + '"><circle cx="' + c + '" cy="' + c + '" r="' + d / 2 + '" fill="' + color + '" fill-opacity=".85" stroke="#fff" stroke-width="2"/><circle cx="' + c + '" cy="' + c + '" r="' + (d / 2 + 1) + '" fill="none" stroke="#141a46" stroke-width="1"/></svg>';
      cv.style.cursor = 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '") ' + c + ' ' + c + ', crosshair';
    };
    cv.addEventListener('pointerdown', e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); cur = { c: eraser ? '#fff' : color, w: eraser ? size * 1.8 : size, p: [pos(e)] }; strokes.push(cur); redraw(); });
    cv.addEventListener('pointermove', e => { if (!cur) return; cur.p.push(pos(e)); redraw(); });
    const up = () => { cur = null; }; ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => cv.addEventListener(n, up));
    redraw();
    const colorBtns = COLORS.map(c => h('button', { class: 'sw', type: 'button', style: { background: c }, 'aria-label': 'Цвет ' + c, 'aria-pressed': c === color, onclick: () => { color = c; eraser = false; paint(); } }));
    const sizeBtns = SIZES.map(([s, l]) => h('button', { class: 'szb', type: 'button', 'aria-label': l + ' кисть', 'aria-pressed': s === size, onclick: () => { size = s; paint(); } }, h('i', { style: { width: Math.max(6, s) + 'px', height: Math.max(6, s) + 'px' } })));
    const er = h('button', { class: 'btn paper small', type: 'button', 'aria-pressed': false, onclick: () => { eraser = !eraser; paint(); } }, 'Ластик');
    const undo = btn('Отменить', () => { strokes.pop(); redraw(); }, 'paper small'), clear = btn('Очистить', () => { strokes = []; redraw(); }, 'paper small');
    function paint() { setCursor(); colorBtns.forEach((b, i) => b.setAttribute('aria-pressed', !eraser && COLORS[i] === color)); sizeBtns.forEach((b, i) => b.setAttribute('aria-pressed', SIZES[i][0] === size)); er.setAttribute('aria-pressed', eraser); }
    paint(); if (window.ResizeObserver) new ResizeObserver(setCursor).observe(cv);
    return { el: h('div', { class: 'padwrap' }, cv), tools: h('div', { class: 'padtools' }, h('div', { class: 'sws' }, colorBtns), h('div', { class: 'sws' }, sizeBtns), h('div', { class: 'sws' }, er, undo, clear)) };
  }
  registerGame({
    id: 'draw', title: 'Рисуем и угадываем', icon: '🖍️', color: '#ff7a45',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 6 }, mins: 25,
    tagline: 'Один рисует секретное слово прямо на общем экране — команда угадывает, пока не вышло время.',
    rules: '<ul><li>В свой ход команда выбирает художника. Он смотрит слово (остальные отворачиваются) и рисует его на экране мышкой, пальцем или стилусом.</li><li>Рисовать буквы и цифры, говорить и показывать жестами нельзя.</li><li>Команда угадывает вслух. Чем быстрее ответ, тем больше очков: до трёх.</li><li>Если время вышло, слово показывают всем, а очков никто не получает.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Рисунков у каждой команды', values: [2, 3, 5], def: 3 },
      { key: 'time', label: 'Время на рисунок', values: [[60, '60 секунд'], [90, '90 секунд'], [120, '2 минуты']], def: 90 },
      { key: 'level', label: 'Сложность слов', values: [[0, 'Все вперемешку'], [1, 'Лёгкие'], [2, 'Средние'], [3, 'Сложные']], def: 0 }
    ],
    cards: () => DATA.draw.length,
    start(api) {
      const lvl = api.opts.level, filt = x => !lvl || x.l === lvl;
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const name = api.teams[ti].name; let card = deck.draw(filt), skip = 1;
        intro();
        function intro() {
          api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Рисунок ' + k + ' из ' + total),
            h('p', { class: 'mid-t' }, 'Выберите художника. Все остальные отвернитесь от экрана: слово увидит только он.'),
            btn('Показать слово художнику', reveal, 'big', { 'data-primary': true })), { turn: ti, mid: true, role: 'Выбирает художника' });
        }
        function reveal() {
          api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Только для художника · ' + card.c), h('div', { class: 'big' }, card.w), h('p', { class: 'hint' }, 'Запомните слово. Буквы и цифры рисовать нельзя.')),
            h('div', { class: 'row' }, btn('Запомнил — рисую!', play, 'big', { 'data-primary': true }), skip > 0 ? btn('Другое слово', () => { skip--; card = deck.draw(filt); reveal(); }, 'paper') : null)], { turn: ti, mid: true, role: 'Запоминает слово' });
        }
        function play() {
          let over = false; const P = pad(), timer = Timer(api.opts.time, { onEnd: () => end(false) });
          const hold = peek(h('div', { class: 'big' }, card.w), 'Напомнить слово художнику');
          api.show(h('div', { class: 'drawlay' }, P.el, h('div', { class: 'drawside' }, timer.el, P.tools, h('div', { class: 'stack' }, btn('Угадали!', () => end(true), 'big good', { 'data-primary': true }), btn('Не угадали', () => end(false), 'big bad')), hold)), { turn: ti, role: 'Рисует, остальные угадывают', compact: true });
          timer.start();
          function end(ok) {
            if (over) return; over = true; const p = ok ? 1 + Math.round(timer.left / api.opts.time * 2) : 0; timer.stop();
            if (ok) { api.score(ti, p); sfx.ok(); } else sfx.buzz();
            const pic = P.el.querySelector('canvas');
            api.show([h('div', { class: 'cover' }, h('div', { class: 'kicker' }, ok ? 'Угадали!' : 'Не угадали'), h('div', { class: 'big' }, 'Слово: ' + card.w), h('p', { class: 'mid-t' }, ok ? name + ': +' + pts(p) + '.' : 'В этот раз без очков.')),
              h('div', { class: 'padwrap done' }, pic), h('div', { class: 'row center' }, btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true }))], { turn: ti, mid: true, role: 'Итог рисунка' });
          }
        }
      });
    }
  });
}
