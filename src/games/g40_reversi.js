/* 40. Реверси — классический Отелло: зажмите фишки соперника между своими, и они перевернутся */
{
  registerGame({
    id: 'reversi', title: 'Реверси', icon: '⚫', color: '#3aa86b',
    cats: ['Командные', 'Для двоих'], teams: { min: 1, max: 2 }, mins: 15,
    tagline: 'Ставьте фишку так, чтобы зажать ряд фишек соперника, и они станут вашими. У кого в конце больше фишек, тот и победил.',
    rules: '<ul><li>Играют две стороны: <b>чёрные</b> (с точкой в центре) и <b>белые</b> (с кольцом). Первыми ходят чёрные.</li><li>Ход: поставьте фишку на пустую клетку, подсвеченную точкой. Ход допустим, если по прямой (по горизонтали, вертикали или диагонали) между новой фишкой и вашей старой окажется ряд фишек соперника. Все они <b>переворачиваются</b>.</li><li>Если допустимых ходов нет, ход автоматически переходит к сопернику.</li><li>Партия кончается, когда поле заполнено или никто не может сходить. Побеждает тот, у кого больше фишек.</li><li>Углы забрать выгодно: их нельзя перевернуть.</li><li>Если играет один участник, соперником станет компьютер: вы играете чёрными.</li></ul>',
    opts: [
      { key: 'size', label: 'Размер поля', values: [[6, '6×6 · быстрая партия'], [8, '8×8 · классика']], def: 8 },
      { key: 'level', label: 'Сила компьютера (при одном игроке)', values: [[1, 'Лёгкий'], [2, 'Средний'], [3, 'Сильный']], def: 2 }
    ],
    cards: () => 0,
    start(api) {
      const N = +api.opts.size === 6 ? 6 : 8, LV = [1, 2, 3].includes(+api.opts.level) ? +api.opts.level : 2, solo = api.n === 1;
      const sides = [{ name: api.teams[0].name }, { name: solo ? 'Компьютер' : api.teams[1].name }];
      const MARK = ['Чёрные', 'Белые'];
      const DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
      /* ---- чистая логика: b — массив N*N (-1 пусто, 0 чёрные, 1 белые) ---- */
      const flipsAt = (b, i, p) => {
        if (b[i] !== -1) return [];
        const r = (i / N) | 0, c = i % N, out = [];
        for (const [dr, dc] of DIRS) {
          const line = []; let y = r + dr, x = c + dc;
          while (y >= 0 && y < N && x >= 0 && x < N && b[y * N + x] === 1 - p) { line.push(y * N + x); y += dr; x += dc; }
          if (line.length && y >= 0 && y < N && x >= 0 && x < N && b[y * N + x] === p) out.push(...line);
        }
        return out;
      };
      const movesOf = (b, p) => { const m = []; for (let i = 0; i < N * N; i++) if (b[i] === -1) { const f = flipsAt(b, i, p); if (f.length) m.push({ i, f }); } return m; };
      const applyMove = (b, mv, p) => { const nb = b.slice(); nb[mv.i] = p; mv.f.forEach(k => nb[k] = p); return nb; };
      const count = b => { let a = 0, w = 0; b.forEach(v => { if (v === 0) a++; else if (v === 1) w++; }); return [a, w]; };
      const startBoard = () => { const b = Array(N * N).fill(-1), q = N / 2; b[(q - 1) * N + q - 1] = 1; b[q * N + q] = 1; b[(q - 1) * N + q] = 0; b[q * N + q - 1] = 0; return b; };
      /* позиционные веса: углы дороги, клетки рядом с углами опасны */
      const W = Array.from({ length: N * N }, (_, i) => {
        const r = (i / N) | 0, c = i % N, er = Math.min(r, N - 1 - r), ec = Math.min(c, N - 1 - c);
        if (er === 0 && ec === 0) return 100;
        if (er === 1 && ec === 1) return -40; /* X-клетки */
        if (er + ec === 1) return -20; /* C-клетки */
        if (er === 0 || ec === 0) return 6;
        return er === 1 || ec === 1 ? -3 : 1;
      });
      const evalPos = (b, p) => {
        let s = 0; for (let i = 0; i < N * N; i++) if (b[i] === p) s += W[i]; else if (b[i] === 1 - p) s -= W[i];
        return s + 4 * (movesOf(b, p).length - movesOf(b, 1 - p).length);
      };
      const search = (b, p, d, a, bt) => { /* негамакс с альфа-бета; значение с точки зрения p */
        const mv = movesOf(b, p);
        if (!mv.length) {
          if (!movesOf(b, 1 - p).length) { const [x, y] = count(b); return (p === 0 ? x - y : y - x) * 1000; }
          return d === 0 ? evalPos(b, p) : -search(b, 1 - p, d - 1, -bt, -a);
        }
        if (d === 0) return evalPos(b, p);
        mv.sort((m, n) => W[n.i] - W[m.i]);
        let best = -1e9;
        for (const m of mv) { const v = -search(applyMove(b, m, p), 1 - p, d - 1, -bt, -a); if (v > best) best = v; if (v > a) a = v; if (a >= bt) break; }
        return best;
      };
      const pickAi = (b, p, mv) => {
        let pool;
        if (LV === 1) { const mx = Math.max(...mv.map(m => m.f.length)); pool = mv.filter(m => m.f.length === mx); }
        else if (LV === 2) { const mx = Math.max(...mv.map(m => W[m.i])); pool = mv.filter(m => W[m.i] === mx); }
        else {
          const depth = N === 6 ? 5 : 4; let best = -1e9; pool = [];
          for (const m of mv) { const v = -search(applyMove(b, m, p), 1 - p, depth - 1, -1e9, 1e9); if (v > best) { best = v; pool = [m]; } else if (v === best) pool.push(m); }
        }
        return pool[rnd(pool.length)];
      };

      /* ---- состояние ---- */
      let board = startBoard(), cur = 0, locked = false, over = false, last = -1;
      const cells = [], discs = [];
      const boardEl = h('div', { class: 'rv-board', style: { '--n': N } });
      for (let i = 0; i < N * N; i++) {
        const r = (i / N) | 0, c = i % N;
        const cell = h('button', { class: 'rv-cell', type: 'button', 'aria-label': 'Клетка ' + 'абвгдежз'[c] + (r + 1), onclick: () => tap(i) });
        const disc = h('span', { class: 'rv-disc' }, h('span', { class: 'rv-f rv-f0' }), h('span', { class: 'rv-f rv-f1' }));
        cell.append(disc, h('span', { class: 'rv-hint' })); cells.push(cell); discs.push(disc); boardEl.append(cell);
      }
      const msg = h('div', { class: 'rv-msg', role: 'status', 'aria-live': 'polite' });
      const chips = [0, 1].map(k => h('span', { class: 'rv-chip rv-s' + k }));
      const vs = h('div', { class: 'rv-vs' }, chips[0], h('span', { class: 'rv-colon' }, '·'), chips[1]);
      const root = h('div', { class: 'rv-wrap' }, vs, msg, boardEl);
      const paintChips = () => {
        const cnt = count(board);
        cnt.forEach((n, k) => { chips[k].replaceChildren(h('i', { class: 'rv-mini rv-mini' + k }), sides[k].name + ' ', h('b', null, n)); chips[k].classList.toggle('rv-on', !over && cur === k); });
      };
      function fit() {
        if (!root.isConnected) return;
        const top = vs.getBoundingClientRect().bottom + msg.offsetHeight + 16;
        const s = Math.max(200, Math.min(root.clientWidth, window.innerHeight - top - 12 - (parseFloat(getComputedStyle(root.parentElement).paddingBottom) || 0), 900));
        boardEl.style.setProperty('--s', Math.floor(s) + 'px');
      }
      const onResize = () => { if (!root.isConnected) return window.removeEventListener('resize', onResize); fit(); };
      window.addEventListener('resize', onResize);

      function paint(delays) {
        for (let i = 0; i < N * N; i++) {
          const v = board[i], d = discs[i];
          d.dataset.s = v < 0 ? '' : v;
          d.style.transitionDelay = delays && delays.has(i) ? delays.get(i) + 'ms' : '';
          d.classList.toggle('rv-has', v >= 0);
          d.classList.toggle('rv-new', i === last);
          cells[i].classList.toggle('rv-last', i === last);
        }
        paintHints();
      }
      function paintHints() {
        const mine = !over && !locked ? new Set(movesOf(board, cur).map(m => m.i)) : new Set();
        for (let i = 0; i < N * N; i++) {
          const on = mine.has(i) && !(solo && cur === 1);
          cells[i].classList.toggle('rv-ok', on); cells[i].classList.toggle('rv-p1', on && cur === 1); cells[i].classList.toggle('rv-p0', on && cur === 0);
          cells[i].disabled = !on;
        }
      }
      function banner() {
        paintChips();
        if (solo && cur === 1) api.setTurn(-1, 'Ход компьютера', 'Компьютер');
        else api.setTurn(cur, MARK[cur]);
      }
      function say(t) { msg.textContent = t || ''; msg.classList.toggle('rv-show', !!t); }

      function tap(i) {
        if (locked || over || (solo && cur === 1)) return;
        const f = flipsAt(board, i, cur); if (!f.length) return;
        place({ i, f });
      }
      function place(mv) {
        locked = true; const who = cur, delays = new Map();
        board = applyMove(board, mv, who); last = mv.i;
        const r0 = (mv.i / N) | 0, c0 = mv.i % N;
        mv.f.forEach(k => delays.set(k, 110 * Math.max(Math.abs(((k / N) | 0) - r0), Math.abs(k % N - c0))));
        say(''); paint(delays); paintChips(); sfx.click();
        const wait = 400 + Math.max(0, ...delays.values());
        try { if (mv.f.length > 3) fx.burst(cells[mv.i], 6); } catch (x) { }
        setTimeout(() => { if (root.isConnected) next(who); }, wait);
      }
      function next(who) {
        const p = 1 - who;
        if (!movesOf(board, p).length) {
          if (!movesOf(board, who).length) return finish();
          say(sides[p].name + ' (' + MARK[p].toLowerCase() + ') пропускает ход: нет допустимых ходов');
          paintChips(); sfx.bad && sfx.bad();
          setTimeout(() => { if (!root.isConnected) return; cur = who; say(''); turn(); }, 1700);
          return;
        }
        cur = p; turn();
      }
      function turn() {
        locked = false; banner(); paintHints();
        if (solo && cur === 1) { locked = true; paintHints(); setTimeout(ai, 450 + rnd(250)); }
      }
      function ai() {
        if (!root.isConnected || over) return;
        const mv = movesOf(board, 1); if (!mv.length) return;
        place(pickAi(board, 1, mv));
      }
      function finish() {
        over = true; locked = true; paintHints(); banner();
        const [a, w] = count(board), win = a > w ? 0 : w > a ? 1 : -1;
        say(win < 0 ? 'Ничья: ' + a + ':' + w : sides[win].name + ' побеждает: ' + Math.max(a, w) + ':' + Math.min(a, w));
        sfx.win();
        setTimeout(() => {
          if (!root.isConnected) return;
          window.removeEventListener('resize', onResize);
          const sub = sides[0].name + ': ' + a + ' · ' + sides[1].name + ': ' + w;
          if (!solo) { if (win >= 0) api.score(win, 1); return api.end(); }
          if (win < 0) api.end({ custom: true, title: 'Ничья!', sub, lines: [], win: true });
          else if (win === 0) { api.score(0, 1); api.end({ custom: true, title: sides[0].name + ' побеждает!', sub, lines: [], win: true }); }
          else api.end({ custom: true, title: 'Компьютер победил', sub, lines: ['Сыграйте ещё раз: реванш за вами.'], win: false });
        }, 1500);
      }

      /* отладочный доступ для тестов */
      root.__rv = {
        N, flipsAt: (b, i, p) => flipsAt(b, i, p), movesOf: (b, p) => movesOf(b, p).map(m => m.i), get board() { return board.slice(); }, get cur() { return cur; },
        load(b, p) { board = b.slice(); cur = p; locked = false; over = false; last = -1; paint(); banner(); if (solo && cur === 1) { locked = true; paintHints(); setTimeout(ai, 500); } },
        settle() { next(1 - cur); }
      };
      api.show(root, { turn: 0, role: MARK[0], compact: true });
      paint(); banner(); fit(); requestAnimationFrame(fit); setTimeout(fit, 400);
    }
  });
}
