/* 38. Точки и квадраты — настольная классика: проводите линии, замыкайте квадраты, забирайте их себе */
{
  const DT_NS = 'http://www.w3.org/2000/svg';
  const dtSvg = (tag, attrs, ...kids) => { const e = document.createElementNS(DT_NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); kids.forEach(x => e.append(x)); return e; };
  registerGame({
    id: 'dots', title: 'Точки и квадраты', icon: '🔳', color: '#46c9b8',
    cats: ['Командные', 'Для двоих'], teams: { min: 1, max: 4 }, mins: 15,
    tagline: 'Проведите линию между соседними точками. Замкнули квадрат — он ваш, и вы ходите ещё раз. У кого больше квадратов, тот и победил.',
    rules: '<ul><li>Команды по очереди проводят одну линию между двумя соседними точками: достаточно коснуться нужного отрезка.</li><li>Если ваша линия замкнула квадрат, он закрашивается вашим цветом и приносит <b>1 очко</b>. После этого вы <b>ходите снова</b>.</li><li>Не торопитесь добавлять третью сторону квадрата: следующий игрок замкнёт его и заберёт себе.</li><li>Партия кончается, когда проведены все линии. Побеждает команда с наибольшим числом квадратов.</li><li>Если играет один участник, соперником станет компьютер.</li></ul>',
    opts: [{ key: 'size', label: 'Размер поля', values: [[4, '4×4 точки · 9 квадратов'], [5, '5×5 точек · 16 квадратов'], [6, '6×6 точек · 25 квадратов']], def: 5 }],
    cards: () => 0,
    start(api) {
      const N = [4, 5, 6].includes(+api.opts.size) ? +api.opts.size : 5, B = N - 1, solo = api.n === 1;
      const sides = api.teams.map(t => ({ name: t.name, color: t.color }));
      if (solo) sides.push({ name: 'Компьютер', color: TEAM_COLORS[1] });
      const S = sides.length, got = sides.map(() => 0), total = 2 * N * B;
      const M = 7, step = (100 - 2 * M) / B, pos = i => M + i * step, R = 14 / (N + 3), LW = R * 1.25;
      /* линии: H[r][c] (r: 0..B, c: 0..B-1), V[r][c] (r: 0..B-1, c: 0..B); значение — кто провёл или -1 */
      const H = Array.from({ length: N }, () => Array(B).fill(-1)), V = Array.from({ length: B }, () => Array(N).fill(-1));
      const owner = Array.from({ length: B }, () => Array(B).fill(-1));
      const sidesOf = (br, bc) => (H[br][bc] >= 0) + (H[br + 1][bc] >= 0) + (V[br][bc] >= 0) + (V[br][bc + 1] >= 0);
      const adj = e => (e.t === 'h' ? [[e.r - 1, e.c], [e.r, e.c]] : [[e.r, e.c - 1], [e.r, e.c]]).filter(([a, b]) => a >= 0 && a < B && b >= 0 && b < B);
      const edges = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < B; c++) edges.push({ t: 'h', r, c });
      for (let r = 0; r < B; r++) for (let c = 0; c < N; c++) edges.push({ t: 'v', r, c });
      const isDrawn = e => (e.t === 'h' ? H : V)[e.r][e.c] >= 0;
      const xy = e => e.t === 'h' ? [pos(e.c), pos(e.r), pos(e.c + 1), pos(e.r)] : [pos(e.c), pos(e.r), pos(e.c), pos(e.r + 1)];
      let cur = 0, drawn = 0, locked = false, over = false;

      /* ---- SVG ---- */
      const gBox = dtSvg('g', {}), gGrid = dtSvg('g', {}), gLines = dtSvg('g', {}), gDots = dtSvg('g', {}), gTxt = dtSvg('g', {});
      const halo = dtSvg('line', { class: 'dt-halo', 'stroke-width': LW * 2.6, 'stroke-linecap': 'round', visibility: 'hidden' });
      edges.forEach(e => { const [a, b, c, d] = xy(e); gGrid.append(dtSvg('line', { x1: a, y1: b, x2: c, y2: d, class: 'dt-ghost', 'stroke-width': LW * .28 })); });
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) gDots.append(dtSvg('circle', { cx: pos(c), cy: pos(r), r: R, class: 'dt-dot' }));
      const svg = dtSvg('svg', { viewBox: '0 0 100 100', class: 'dt-svg', 'aria-hidden': 'true', focusable: 'false' }, gBox, gGrid, gLines, halo, gDots, gTxt);

      /* ---- HTML: поле, зоны касания (настоящие кнопки), счёт ---- */
      const board = h('div', { class: 'dt-board', style: { '--k': (LW / 100).toFixed(4) } }, svg);
      const btns = new Map();
      edges.forEach(e => {
        const w = e.t === 'h' ? [pos(e.c) + step * .2, pos(e.r) - step * .25, step * .6, step * .5] : [pos(e.c) - step * .25, pos(e.r) + step * .2, step * .5, step * .6];
        const b = h('button', { class: 'dt-e ' + e.t, type: 'button', 'aria-label': 'Линия: строка ' + (e.r + 1) + ', столбец ' + (e.c + 1) + (e.t === 'h' ? ', горизонтальная' : ', вертикальная'), style: { left: w[0] + '%', top: w[1] + '%', width: w[2] + '%', height: w[3] + '%' }, onclick: () => move(e, false) });
        btns.set(e, b); board.append(b);
      });
      const vs = solo ? h('div', { class: 'dt-vs' }) : null;
      const root = h('div', { class: 'dt-wrap' }, vs, board);
      function paintVs() { if (vs) vs.replaceChildren(h('span', { style: { '--c': sides[0].color } }, sides[0].name + ': ', h('b', null, got[0])), h('span', { class: 'dt-colon' }, '·'), h('span', { style: { '--c': sides[1].color } }, 'Компьютер: ', h('b', null, got[1]))); }
      function fit() {
        if (!root.isConnected) return;
        const top = root.getBoundingClientRect().top + (vs ? vs.offsetHeight + 8 : 0);
        const s = Math.max(180, Math.min(root.clientWidth, window.innerHeight - top - 12 - (parseFloat(getComputedStyle(root.parentElement).paddingBottom) || 0), 1000));
        board.style.setProperty('--s', Math.floor(s) + 'px');
      }
      const onResize = () => { if (!root.isConnected) return window.removeEventListener('resize', onResize); fit(); };
      window.addEventListener('resize', onResize);

      function lineEl(e, who) {
        const [a, b, c, d] = xy(e), len = Math.hypot(c - a, d - b);
        return dtSvg('line', { x1: a, y1: b, x2: c, y2: d, class: 'dt-line', stroke: sides[who].color, 'stroke-width': LW, 'stroke-linecap': 'round', style: '--len:' + len });
      }
      function fillBox(br, bc, who) {
        owner[br][bc] = who; got[who]++;
        gBox.append(dtSvg('rect', { x: pos(bc) + LW * .2, y: pos(br) + LW * .2, width: step - LW * .4, height: step - LW * .4, rx: 1.4, fill: sides[who].color, class: 'dt-box' }));
        const t = dtSvg('text', { x: pos(bc) + step / 2, y: pos(br) + step / 2, class: 'dt-lbl', 'font-size': step * .42 });
        t.textContent = solo && who === 1 ? 'К' : String(who + 1); gTxt.append(t);
      }
      function banner(bonus) {
        if (solo && cur === 1) api.setTurn(-1, 'Ход компьютера', 'Компьютер');
        else api.setTurn(cur, bonus ? 'Квадрат! Ходит ещё раз' : 'Проводит линию');
      }
      function paintTurnUI() { board.style.setProperty('--c', sides[cur].color); board.classList.toggle('dt-cpu', solo && cur === 1); }

      function move(e, byAi) {
        if (locked || over || isDrawn(e)) return;
        if (!byAi && solo && cur === 1) return;
        const who = cur; (e.t === 'h' ? H : V)[e.r][e.c] = who; drawn++;
        gLines.append(lineEl(e, who));
        const [a, b, c, d] = xy(e);
        halo.setAttribute('x1', a); halo.setAttribute('y1', b); halo.setAttribute('x2', c); halo.setAttribute('y2', d); halo.setAttribute('visibility', 'visible');
        halo.style.animation = 'none'; void halo.getBoundingClientRect(); halo.style.animation = '';
        const b0 = btns.get(e); b0.disabled = true;
        let k = 0; adj(e).forEach(([br, bc]) => { if (owner[br][bc] < 0 && sidesOf(br, bc) === 4) { fillBox(br, bc, who); k++; } });
        if (k) {
          sfx.ok(); if (solo && who === 1) { /* очки компьютера не идут в общий счёт */ } else api.score(who, k);
          paintVs(); try { fx.burst(board, 8); } catch (x) { }
        } else { sfx.click(); cur = (cur + 1) % S; }
        if (drawn >= total) return finish();
        paintTurnUI(); banner(!!k);
        if (solo && cur === 1) { locked = true; setTimeout(ai, k ? 750 : 650); }
      }
      function ai() {
        locked = false; if (!root.isConnected || over) return;
        const free = edges.filter(e => !isDrawn(e)); if (!free.length) return;
        const closes = free.filter(e => adj(e).some(([br, bc]) => owner[br][bc] < 0 && sidesOf(br, bc) === 3));
        let pickE;
        if (closes.length) pickE = closes[rnd(closes.length)];
        else {
          /* не дарим сопернику квадрат: избегаем линии, делающей у соседней клетки третью сторону */
          const cost = e => adj(e).filter(([br, bc]) => sidesOf(br, bc) === 2).length;
          const safe = free.filter(e => cost(e) === 0);
          if (safe.length) pickE = safe[rnd(safe.length)];
          else { const best = Math.min(...free.map(cost)); const l = free.filter(e => cost(e) === best); pickE = l[rnd(l.length)]; }
        }
        move(pickE, true);
      }
      function finish() {
        over = true; locked = true; paintTurnUI(); board.classList.add('dt-over');
        const best = Math.max(...got), win = got.indexOf(best), tie = got.filter(x => x === best).length > 1;
        sfx.win();
        setTimeout(() => {
          if (!root.isConnected) return;
          window.removeEventListener('resize', onResize);
          if (!solo) return api.end();
          const sub = sides[0].name + ': ' + got[0] + ' · Компьютер: ' + got[1];
          if (tie) api.end({ custom: true, title: 'Ничья!', sub, lines: [], win: true });
          else if (win === 0) api.end({ custom: true, title: sides[0].name + ' побеждает!', sub, lines: [], win: true });
          else api.end({ custom: true, title: 'Компьютер победил', sub, lines: ['Сыграйте ещё раз: реванш за вами.'], win: false });
        }, 1300);
      }

      api.show(root, { turn: 0, role: 'Проводит линию', compact: true });
      paintTurnUI(); paintVs(); fit(); requestAnimationFrame(fit); setTimeout(fit, 400);
    }
  });
}
