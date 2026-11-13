/* 41. Гекс — соедините свои стороны ромбовидного поля цепочкой камней; ничьих не бывает */
{
  const HX_NS = 'http://www.w3.org/2000/svg';
  const hxSvg = (tag, attrs, ...kids) => { const e = document.createElementNS(HX_NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); kids.forEach(x => e.append(x)); return e; };
  const HX_D = [[0, 1], [0, -1], [1, 0], [-1, 0], [-1, 1], [1, -1]];
  /* кратчайшая «стоимость» соединения сторон: свой камень 0, пустая клетка 1, чужой — стена */
  const hxDist = (cells, N, side) => {
    const INF = 1e9, d = new Array(N * N).fill(INF), bk = [[]];
    const cost = i => cells[i] === side ? 0 : cells[i] < 0 ? 1 : INF;
    for (let k = 0; k < N; k++) { const i = side === 0 ? k * N : k, w = cost(i); if (w < INF) { d[i] = w; (bk[w] = bk[w] || []).push(i); } }
    for (let L = 0; L < bk.length; L++) {
      const q = bk[L]; if (!q) continue;
      for (let j = 0; j < q.length; j++) {
        const i = q[j]; if (d[i] !== L) continue;
        const r = (i / N) | 0, c = i % N;
        if ((side === 0 ? c : r) === N - 1) return L;
        for (const [dr, dc] of HX_D) {
          const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
          const t = rr * N + cc, w = cost(t); if (w >= INF) continue;
          if (L + w < d[t]) { d[t] = L + w; (bk[L + w] = bk[L + w] || []).push(t); }
        }
      }
    }
    return INF;
  };
  /* путь победителя: цепочка своих камней от своей стороны до противоположной или null */
  const hxPath = (cells, N, side) => {
    const par = new Array(N * N).fill(-2), q = [];
    for (let k = 0; k < N; k++) { const i = side === 0 ? k * N : k; if (cells[i] === side) { par[i] = -1; q.push(i); } }
    for (let j = 0; j < q.length; j++) {
      const i = q[j], r = (i / N) | 0, c = i % N;
      if ((side === 0 ? c : r) === N - 1) { const p = []; for (let x = i; x >= 0; x = par[x]) p.push(x); return p; }
      for (const [dr, dc] of HX_D) {
        const rr = r + dr, cc = c + dc; if (rr < 0 || cc < 0 || rr >= N || cc >= N) continue;
        const t = rr * N + cc; if (cells[t] === side && par[t] === -2) { par[t] = i; q.push(t); }
      }
    }
    return null;
  };
  registerGame({
    id: 'hex', title: 'Гекс', icon: '⬡', color: '#7a6cf0',
    cats: ['Командные', 'Для двоих'], teams: { min: 1, max: 2 }, mins: 15,
    tagline: 'Ставьте камни на шестиугольное поле и стройте непрерывную цепочку между своими сторонами. Ничьих не бывает: победит кто-то один.',
    rules: '<ul><li>Поле — ромб из шестиугольников. Первая команда (круги, ●) соединяет <b>левую и правую</b> стороны, вторая (ромбы, ◆) — <b>верхнюю и нижнюю</b>. Стороны окрашены в цвета игроков.</li><li>Команды по очереди ставят один камень в свободную клетку. Камни не двигаются и не снимаются.</li><li>Цепочка — это камни, соседние по грани. У каждой клетки до шести соседей.</li><li>Побеждает тот, кто первым замкнёт цепочку между своими сторонами; выигрышный путь подсветится. Ничьей быть не может.</li><li>Правило обмена (опция): после первого хода вторая команда может не ходить, а <b>поменяться местами</b> и забрать поставленный камень себе. Так первому невыгодно ходить в самый центр.</li><li>Если играет один участник, соперником станет компьютер.</li></ul>',
    opts: [
      { key: 'size', label: 'Размер поля', values: [[7, '7×7'], [9, '9×9'], [11, '11×11']], def: 9 },
      { key: 'pie', label: 'Правило обмена (pie rule)', values: [[0, 'Выключено'], [1, 'Включено']], def: 0 },
      { key: 'ai', label: 'Компьютер (если играет один)', values: [['easy', 'Лёгкий'], ['mid', 'Средний'], ['hard', 'Сильный']], def: 'mid' }
    ],
    cards: () => 0,
    start(api) {
      const N = [7, 9, 11].includes(+api.opts.size) ? +api.opts.size : 9, pie = +api.opts.pie === 1, solo = api.n === 1;
      const lvl = ['easy', 'mid', 'hard'].includes(api.opts.ai) ? api.opts.ai : 'mid';
      const tm = api.teams.slice(0, 2).map(t => ({ name: t.name, color: t.color }));
      if (solo) tm.push({ name: 'Компьютер', color: TEAM_COLORS[1] });
      const cpu = solo ? 1 : -1;            /* индекс команды-компьютера */
      let own = [0, 1];                      /* own[сторона] = команда: сторона 0 — лево/право (●), сторона 1 — верх/низ (◆) */
      const cells = new Array(N * N).fill(-1);
      let turn = 0, moves = 0, locked = false, over = false, last = -1, swapped = false;
      const col = s => tm[own[s]].color, nm = s => tm[own[s]].name;

      /* ---- геометрия (единица — радиус шестиугольника) ---- */
      const W = Math.sqrt(3), P = .75, X0 = -P, Y0 = -P;
      const VW = W * (N + (N - 1) / 2) + 2 * P, VH = 1.5 * (N - 1) + 2 + 2 * P;
      const cx = (r, c) => W * (c + .5 + r / 2), cy = r => 1 + 1.5 * r;
      const hexPts = (x, y, k) => [[0, -1], [W / 2, -.5], [W / 2, .5], [0, 1], [-W / 2, .5], [-W / 2, -.5]].map(([a, b]) => (x + a * k).toFixed(3) + ',' + (y + b * k).toFixed(3)).join(' ');
      const V = (x, y, k) => [x + [0, W / 2, W / 2, 0, -W / 2, -W / 2][k], y + [-1, -.5, .5, 1, .5, -.5][k]];
      const line = pts => pts.map(p => p.map(v => v.toFixed(3)).join(',')).join(' ');
      /* граница поля: side 0 — левая/правая, side 1 — верхняя/нижняя */
      const edgeSide = (side, far) => {
        const pts = [];
        for (let k = 0; k < N; k++) {
          if (side === 1) { const r = far ? N - 1 : 0, x = cx(r, k), y = cy(r); (far ? [4, 3, 2] : [5, 0, 1]).forEach((v, j) => { if (!(k > 0 && j === 0)) pts.push(V(x, y, v)); }); }
          else if (!far) { const x = cx(k, 0), y = cy(k); if (k === 0) pts.push(V(x, y, 5)); pts.push(V(x, y, 4), V(x, y, 3)); }
          else { const x = cx(k, N - 1), y = cy(k); if (k === 0) pts.push(V(x, y, 0)); pts.push(V(x, y, 1), V(x, y, 2)); }
        }
        return pts;
      };

      /* ---- SVG ---- */
      const gBase = hxSvg('g', {}), gEdge = hxSvg('g', {}), gStone = hxSvg('g', {}), gWin = hxSvg('g', {});
      const polys = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const p = hxSvg('polygon', { points: hexPts(cx(r, c), cy(r), .94), class: 'hx-cell' }); polys.push(p); gBase.append(p); }
      const edgeEls = [0, 1, 2, 3].map(() => { const e = hxSvg('polyline', { class: 'hx-edge', fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': .34 }); gEdge.append(e); return e; });
      const svg = hxSvg('svg', { viewBox: `${X0} ${Y0} ${VW} ${VH}`, class: 'hx-svg', 'aria-hidden': 'true', focusable: 'false' }, gBase, gEdge, gStone, gWin);
      const board = h('div', { class: 'hx-board' }, svg);
      const btns = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const x = cx(r, c), y = cy(r);
        const b = h('button', { class: 'hx-b', type: 'button', 'data-r': r, 'data-c': c, 'aria-label': 'Клетка: строка ' + (r + 1) + ', столбец ' + (c + 1), onclick: () => move(r * N + c, false), style: { left: ((x - W / 2 - X0) / VW * 100) + '%', top: ((y - 1 - Y0) / VH * 100) + '%', width: (W / VW * 100) + '%', height: (2 / VH * 100) + '%' } });
        btns.push(b); board.append(b);
      }
      const vs = h('div', { class: 'hx-vs' });
      const swapBtn = pie ? btn('⇄ Поменяться местами', () => doSwap(), 'sky small') : null;
      if (swapBtn) { swapBtn.classList.add('hx-swap'); swapBtn.hidden = true; }
      const root = h('div', { class: 'hx-wrap' }, vs, board, swapBtn);

      function paintVs() {
        vs.replaceChildren(...[0, 1].map(s => h('span', { class: 'hx-chip' + (turn === s && !over ? ' on' : ''), style: { '--c': col(s) } }, s === 0 ? '● ↔ ' : '◆ ↕ ', h('b', null, nm(s)))));
      }
      function paintEdges() {
        [[0, false], [0, true], [1, false], [1, true]].forEach(([s, far], k) => {
          edgeEls[k].setAttribute('points', line(edgeSide(s, far)));
          edgeEls[k].setAttribute('stroke', col(s));
        });
      }
      function paintStones() {
        gStone.replaceChildren();
        cells.forEach((v, i) => {
          if (v < 0) return;
          const r = (i / N) | 0, c = i % N, x = cx(r, c), y = cy(r);
          const g = hxSvg('g', { class: 'hx-st' + (i === last ? ' new' : '') });
          if (v === 0) g.append(hxSvg('circle', { cx: x, cy: y, r: .62, fill: col(0), class: 'hx-stone' }));
          else g.append(hxSvg('rect', { x: x - .53, y: y - .53, width: 1.06, height: 1.06, rx: .14, fill: col(1), class: 'hx-stone', transform: `rotate(45 ${x} ${y})` }));
          gStone.append(g);
        });
      }
      function paintBtns() {
        btns.forEach((b, i) => { b.disabled = cells[i] >= 0 || over; });
        board.style.setProperty('--c', col(turn));
        board.classList.toggle('hx-cpu', solo && own[turn] === cpu && !over);
      }
      function banner() { api.delay(fit, 60);
        const t = own[turn];
        if (t === cpu) api.setTurn(-1, 'Ход компьютера', 'Компьютер');
        else api.setTurn(t, turn === 0 ? 'Ставит камень ●' : 'Ставит камень ◆');
      }
      function refresh() { paintEdges(); paintStones(); paintVs(); paintBtns(); if (swapBtn) swapBtn.hidden = !(moves === 1 && !over && !swapped && own[turn] !== cpu); }
      function fit() {
        if (!root.isConnected) return;
        const st = root.parentElement, cs = getComputedStyle(st);
        const top = st.getBoundingClientRect().top + (parseFloat(cs.paddingTop) || 0) + vs.offsetHeight + (swapBtn ? 50 : 0) + 16;
        const availH = window.innerHeight - top - 12 - (parseFloat(cs.paddingBottom) || 0);
        const ratio = VW / VH;
        let w = Math.min(root.clientWidth, 1100), hh = w / ratio;
        if (hh > availH) { hh = Math.max(availH, 160); w = hh * ratio; }
        board.style.setProperty('--w', Math.floor(w) + 'px'); board.style.setProperty('--h', Math.floor(hh) + 'px');
      }
      const onResize = () => { if (!root.isConnected) return window.removeEventListener('resize', onResize); fit(); };
      window.addEventListener('resize', onResize);

      function doSwap() {
        if (locked || over || moves !== 1 || swapped) return;
        swapped = true; own = [own[1], own[0]]; sfx.ok();
        /* камень остаётся на месте и по-прежнему принадлежит стороне ●, но теперь её хозяин — вторая команда; ход стороны ◆ */
        turn = 1; refresh(); banner();
        if (own[1] === cpu) { locked = true; api.delay(ai, 600); }
      }
      function move(i, byAi) {
        if (locked || over || cells[i] >= 0) return;
        if (!byAi && own[turn] === cpu) return;
        cells[i] = turn; moves++; last = i; sfx.click();
        const p = hxPath(cells, N, turn);
        if (p) return finish(turn, p);
        turn = 1 - turn; refresh(); banner();
        if (own[turn] === cpu) {
          locked = true;
          if (pie && moves === 1 && aiShouldSwap()) api.delay(() => { locked = false; doSwap(); }, 650); else api.delay(ai, 450);
        }
      }
      function aiShouldSwap() {
        const r = (last / N) | 0, c = last % N, m = (N - 1) / 2;
        return Math.max(Math.abs(r - m), Math.abs(c - m)) <= N * (lvl === 'easy' ? .15 : .3);
      }
      /* ---- компьютер ---- */
      const winsAt = (i, side) => { cells[i] = side; const w = hxDist(cells, N, side) === 0; cells[i] = -1; return w; };
      function aiPick(side) {
        const free = []; cells.forEach((v, i) => { if (v < 0) free.push(i); });
        for (const i of free) if (winsAt(i, side) && (lvl !== 'easy' || Math.random() < .7)) return i;
        if (lvl !== 'easy') for (const i of free) if (winsAt(i, 1 - side)) return i;
        const m = (N - 1) / 2, cen = i => -(Math.abs(((i / N) | 0) - m) + Math.abs((i % N) - m)) * .05;
        const sc = free.map(i => { const t = cells.slice(); t[i] = side; return { i, s: hxDist(t, N, 1 - side) - hxDist(t, N, side) + cen(i) + Math.random() * (lvl === 'easy' ? 2.6 : .6) }; });
        return sc.sort((a, b) => b.s - a.s);
      }
      function ai() {
        locked = false; if (!root.isConnected || over) return;
        const side = turn, res = aiPick(side);
        if (typeof res === 'number') return move(res, true);
        if (lvl !== 'hard') { const k = lvl === 'easy' ? Math.max(3, Math.ceil(res.length * .3)) : 1; return move(res[rnd(Math.min(k, res.length))].i, true); }
        /* Монте-Карло с лимитом ~550 мс, кусками по ~14 мс, чтобы не вешать интерфейс */
        const cand = res.slice(0, Math.min(12, res.length)).map(o => ({ i: o.i, w: 0, n: 0 }));
        const empties = []; cells.forEach((v, i) => { if (v < 0) empties.push(i); });
        const t0 = api.now(); locked = true;
        const play = cd => {
          const e = empties.filter(x => x !== cd.i); for (let k = e.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0; [e[k], e[j]] = [e[j], e[k]]; }
          const t = cells.slice(); t[cd.i] = side; let who = 1 - side;
          for (const x of e) { t[x] = who; who = 1 - who; }
          cd.n++; if (hxPath(t, N, side)) cd.w++;
        };
        const step = () => {
          if (!root.isConnected || over) return;
          const s = performance.now();
          while (performance.now() - s < 14) for (const cd of cand) play(cd);
          if (api.now() - t0 < 550) return void api.delay(step, 0);
          locked = false; cand.sort((a, b) => b.w / b.n - a.w / a.n); move(cand[0].i, true);
        };
        api.delay(step, 0);
      }
      function finish(side, path) {
        over = true; locked = true; refresh();
        const xy = i => [cx((i / N) | 0, i % N), cy((i / N) | 0)];
        path.forEach(i => { polys[i].classList.add('hx-win'); const [x, y] = xy(i); gWin.append(hxSvg('circle', { cx: x, cy: y, r: .2, class: 'hx-dot' })); });
        for (let k = 1; k < path.length; k++) { const [x1, y1] = xy(path[k - 1]), [x2, y2] = xy(path[k]); gWin.append(hxSvg('line', { x1, y1, x2, y2, class: 'hx-link', 'stroke-width': .26, 'stroke-linecap': 'round' })); }
        board.classList.add('hx-over'); board.style.setProperty('--c', col(side));
        const t = own[side]; sfx.win(); try { fx.burst(board, 10); } catch (x) { }
        vs.replaceChildren(h('span', { class: 'hx-chip on', style: { '--c': col(side) } }, '🏆 ', h('b', null, tm[t].name + ': ' + (side === 0 ? 'лево и право соединены' : 'верх и низ соединены'))));
        if (swapBtn) swapBtn.hidden = true;
        if (t === cpu) api.setTurn(-1, 'Победа!', 'Компьютер'); else api.setTurn(t, 'Победа!');
        api.delay(() => {
          if (!root.isConnected) return;
          window.removeEventListener('resize', onResize);
          if (!solo) { api.score(t, 1); return api.end(); }
          const sub = tm[t].name + ' замкнул цепочку ' + (side === 0 ? '↔' : '↕');
          if (t === 0) api.end({ custom: true, title: tm[0].name + ' побеждает!', sub, lines: [], win: true });
          else api.end({ custom: true, title: 'Компьютер победил', sub, lines: ['Сыграйте ещё раз: реванш за вами.'], win: false });
        }, 1800);
      }

      api.show(root, { turn: 0, role: 'Ставит камень ●', compact: true });
      refresh(); fit(); requestAnimationFrame(fit); api.delay(fit, 400);
    }
  });
}
