/* 44. Захват территории — «Flood-It» для нескольких команд: перекрашивайте свою область и поглощайте соседние клетки */
{
  const FL_COL = [['#e5484d', '●'], ['#f5b700', '▲'], ['#2fa84f', '■'], ['#2f7de1', '◆'], ['#8e4ec6', '★'], ['#ec6fa8', '✚']];
  const FL_NAME = ['красный', 'жёлтый', 'зелёный', 'синий', 'фиолетовый', 'розовый'];
  registerGame({
    id: 'flood', title: 'Захват территории', icon: '🎨', color: '#2fb8d6',
    cats: ['Командные', 'Для двоих'], teams: { min: 1, max: 4 }, mins: 15,
    tagline: 'Выберите цвет: вся ваша область перекрасится в него и поглотит соседние клетки этого цвета. Захватите больше половины поля.',
    rules: '<ul><li>Каждая команда начинает с угловой клетки. Цвета различаются ещё и значками.</li><li>На своём ходу выберите цвет внизу: вся ваша область станет этого цвета и присоединит соседние клетки такого же цвета. Число на кнопке показывает прирост.</li><li>Нельзя выбрать свой текущий цвет, цвет, которым сейчас владеют все команды, а также цвет, который ничего не присоединит. Такие кнопки затемнены.</li><li>Если у команды нет ни одного хода с приростом, ход переходит дальше.</li><li>Побеждает тот, кто захватил <b>больше половины поля</b>. Если поле разобрано раньше, выигрывает владеющий большей областью.</li><li>Если играет один участник, соперником станет компьютер.</li></ul>',
    opts: [
      { key: 'size', label: 'Размер поля', values: [[10, '10×10'], [14, '14×14'], [18, '18×18']], def: 14 },
      { key: 'ai', label: 'Компьютер (если играет один)', values: [[1, 'Лёгкий'], [2, 'Средний'], [3, 'Сильный']], def: 2 }
    ],
    cards: () => 0,
    start(api) {
      const N = [10, 14, 18].includes(+api.opts.size) ? +api.opts.size : 14, solo = api.n === 1;
      const lvl = [1, 2, 3].includes(+api.opts.ai) ? +api.opts.ai : 2;
      const sides = api.teams.map(t => ({ name: t.name, color: t.color }));
      if (solo) sides.push({ name: 'Компьютер', color: TEAM_COLORS[1] });
      const S = sides.length, NC = S >= 4 ? 6 : 5, T = N * N;
      const col = Array(T).fill(0), own = Array(T).fill(-1), pc = Array(S).fill(-1), cnt = Array(S).fill(0);
      const starts = [0, T - 1, N - 1, T - N].slice(0, S);
      for (let i = 0; i < T; i++) col[i] = rnd(NC);
      starts.forEach((s, p) => { let c; do { c = rnd(NC); } while (pc.includes(c)); col[s] = c; pc[p] = c; own[s] = p; cnt[p] = 1; });
      const nb = i => { const r = (i / N) | 0, c = i % N, a = []; if (r) a.push(i - N); if (r < N - 1) a.push(i + N); if (c) a.push(i - 1); if (c < N - 1) a.push(i + 1); return a; };
      const NB = Array.from({ length: T }, (_, i) => nb(i));
      /* какие клетки присоединит игрок p, выбрав цвет c: [клетка, расстояние волны]; O/C — владельцы и цвета (копии при симуляции) */
      function grab(p, c, O, C) {
        const seen = new Set(), res = []; let q = [];
        for (let i = 0; i < T; i++) if (O[i] === p) { seen.add(i); q.push(i); }
        let d = 0;
        while (q.length) { const nx = []; d++; for (const i of q) for (const j of NB[i]) if (!seen.has(j) && O[j] < 0 && C[j] === c) { seen.add(j); res.push([j, d]); nx.push(j); } q = nx; }
        return res;
      }
      const legalColors = p => { const a = []; for (let c = 0; c < NC; c++) if (c !== pc[p] && !pc.every(x => x === c)) a.push(c); return a; };
      const gains = p => legalColors(p).map(c => ({ c, g: grab(p, c, own, col).length })).filter(x => x.g > 0);
      let cur = 0, locked = false, over = false, wave = false;

      /* ---- DOM ---- */
      const cells = [], grid = h('div', { class: 'fl-grid', style: { '--n': N } });
      for (let i = 0; i < T; i++) { const e = h('div', { class: 'fl-c' }); cells.push(e); grid.append(e); }
      const board = h('div', { class: 'fl-board' }, grid);
      const bar = h('div', { class: 'fl-bar' });
      const pal = h('div', { class: 'fl-pal' });
      const palBtns = [];
      for (let c = 0; c < NC; c++) {
        const lbl = h('i', { class: 'fl-g' });
        const b = h('button', { type: 'button', class: 'fl-btn', style: { '--k': FL_COL[c][0] }, 'aria-label': FL_NAME[c], onclick: () => move(c, false) }, h('span', { class: 'fl-sym' }, FL_COL[c][1]), lbl);
        b._g = lbl; palBtns.push(b); pal.append(b);
      }
      const mid = h('div', { class: 'fl-mid' }, board, pal), root = h('div', { class: 'fl-wrap' }, bar, mid);

      function paintCells(only) {
        const list = only || cells.keys();
        for (const i of list) {
          const e = cells[i], o = own[i], sym = FL_COL[col[i]][1];
          e.style.background = FL_COL[col[i]][0]; e.dataset.c = col[i]; e.dataset.o = o;
          if (e._s !== sym) { e.textContent = sym; e._s = sym; }
          e.classList.toggle('fl-own', o >= 0);
          e.dataset.t = o >= 0 ? (solo && o === 1 ? 'К' : o + 1) : '';
        }
      }
      function paintEdges() {
        for (let i = 0; i < T; i++) {
          const o = own[i], e = cells[i];
          if (o < 0) { if (e._e) { e.style.boxShadow = ''; e._e = ''; } continue; }
          const r = (i / N) | 0, c = i % N, same = (rr, cc) => rr >= 0 && rr < N && cc >= 0 && cc < N && own[rr * N + cc] === o;
          const k = sides[o].color, sh = [];
          if (!same(r - 1, c)) sh.push(`inset 0 3px 0 0 ${k}`, 'inset 0 4px 0 0 #000b');
          if (!same(r + 1, c)) sh.push(`inset 0 -3px 0 0 ${k}`, 'inset 0 -4px 0 0 #000b');
          if (!same(r, c - 1)) sh.push(`inset 3px 0 0 0 ${k}`, 'inset 4px 0 0 0 #000b');
          if (!same(r, c + 1)) sh.push(`inset -3px 0 0 0 ${k}`, 'inset -4px 0 0 0 #000b');
          const s = sh.join(','); if (e._e !== s) { e.style.boxShadow = s; e._e = s; }
        }
      }
      function paintBar() {
        bar.replaceChildren(...sides.map((s, p) => h('span', { class: 'fl-pl' + (p === cur && !over ? ' on' : ''), style: { '--c': s.color } },
          h('em', null, solo && p === 1 ? 'К' : p + 1), S > 2 ? ' ' : ' ' + (solo && p === 1 ? 'Компьютер' : s.name) + ': ', h('b', null, cnt[p]), h('small', null, ' ' + Math.round(cnt[p] * 100 / T) + '%'))));
      }
      function paintPal() {
        const g = gains(cur), m = new Map(g.map(x => [x.c, x.g])), human = !(solo && cur === 1) && !over && !wave;
        palBtns.forEach((b, c) => {
          const ok = m.has(c); b._g.textContent = ok ? '+' + m.get(c) : '';
          b.classList.toggle('fl-off', !ok); b.disabled = !ok || !human || locked;
          b.title = ok ? '' : (c === pc[cur] ? 'Это ваш цвет' : 'Ничего не присоединит');
        });
      }
      function fit() {
        if (!root.isConnected) return;
        const cs = getComputedStyle(root.parentElement), pb = parseFloat(cs.paddingBottom) || 0;
        const side = root.clientWidth > innerHeight * 1.25;
        root.classList.toggle('fl-side', side);
        const top = root.getBoundingClientRect().top + bar.offsetHeight + 8 + (side ? 0 : pal.offsetHeight + 8);
        const avail = innerHeight - top - 12 - pb, wide = side ? root.clientWidth - 110 : root.clientWidth;
        const s = Math.max(180, Math.min(wide, avail, 900));
        board.style.setProperty('--s', Math.floor(s) + 'px');
        board.classList.toggle('fl-sm', s / N < 26);
      }
      const onResize = () => { if (!root.isConnected) return removeEventListener('resize', onResize); fit(); };
      addEventListener('resize', onResize);

      function banner(extra) {
        if (solo && cur === 1) api.setTurn(-1, 'Ход компьютера', 'Компьютер');
        else api.setTurn(cur, extra || 'Выбирает цвет');
      }
      function nextPlayer() { /* следующий, у кого есть ход с приростом; -1 — ни у кого */
        for (let k = 1; k <= S; k++) { const p = (cur + k) % S; if (gains(p).length) return p; }
        return -1;
      }
      function move(c, byAi) {
        if (locked || over || wave) return;
        if (!byAi && solo && cur === 1) return;
        if (!gains(cur).some(x => x.c === c)) return;
        const p = cur, got = grab(p, c, own, col), ch = [];
        for (let i = 0; i < T; i++) if (own[i] === p) { col[i] = c; ch.push(i); }
        let md = 0;
        got.forEach(([i, d]) => { own[i] = p; col[i] = c; md = Math.max(md, d); cells[i].style.transitionDelay = (d * 40) + 'ms'; cells[i].style.animationDelay = (d * 40) + 'ms'; });
        pc[p] = c; cnt[p] += got.length; if (p < api.n) api.score(p, got.length);
        paintCells(ch.concat(got.map(x => x[0]))); paintEdges(); paintBar();
        got.forEach(([i]) => { cells[i].classList.remove('fl-pop'); void cells[i].offsetWidth; cells[i].classList.add('fl-pop'); });
        sfx.click(); wave = true; paintPal();
        const wait = Math.min(900, md * 40 + 280);
        api.delay(() => {
          wave = false; got.forEach(([i]) => { cells[i].style.transitionDelay = ''; cells[i].style.animationDelay = ''; cells[i].classList.remove('fl-pop'); });
          if (!root.isConnected) return;
          if (cnt[p] * 2 > T) { try { fx.burst(board, 8); } catch (x) { } return finish(); }
          const q = nextPlayer();
          if (q < 0) return finish();
          const skipped = q !== (p + 1) % S;
          cur = q; paintBar(); paintPal(); banner(skipped ? 'Соперники без хода, ходит вне очереди' : null);
          if (solo && cur === 1) { locked = true; api.delay(ai, 400 + rnd(300)); }
        }, wait);
      }
      function ai() {
        locked = false; if (!root.isConnected || over) return;
        const g = gains(cur); if (!g.length) return;
        let pick;
        if (lvl === 1) pick = g[rnd(g.length)];
        else if (lvl === 2) { const m = Math.max(...g.map(x => x.g)); const l = g.filter(x => x.g === m); pick = l[rnd(l.length)]; }
        else {
          /* прогноз на 2 хода: прирост сейчас + лучший прирост следующим ходом */
          let bestV = -1;
          for (const x of g) {
            const O = own.slice(), C = col.slice(), got = grab(cur, x.c, O, C);
            for (let i = 0; i < T; i++) if (O[i] === cur) C[i] = x.c;
            got.forEach(([i]) => { O[i] = cur; C[i] = x.c; });
            let b2 = 0; for (let c2 = 0; c2 < NC; c2++) if (c2 !== x.c) b2 = Math.max(b2, grab(cur, c2, O, C).length);
            const v = x.g + b2 + Math.random() * .5;
            if (v > bestV) { bestV = v; pick = x; }
          }
        }
        move(pick.c, true);
      }
      function finish() {
        over = true; locked = true; paintBar(); paintPal(); board.classList.add('fl-over'); sfx.win();
        const best = Math.max(...cnt), win = cnt.indexOf(best), tie = cnt.filter(x => x === best).length > 1;
        api.delay(() => {
          if (!root.isConnected) return;
          removeEventListener('resize', onResize);
          if (!solo) return api.end();
          const sub = sides[0].name + ': ' + cnt[0] + ' · Компьютер: ' + cnt[1];
          if (tie) api.end({ custom: true, title: 'Ничья!', sub, lines: [], win: true });
          else if (win === 0) api.end({ custom: true, title: sides[0].name + ' побеждает!', sub, lines: [], win: true });
          else api.end({ custom: true, title: 'Компьютер победил', sub, lines: ['Сыграйте ещё раз: реванш за вами.'], win: false });
        }, 1300);
      }

      api.show(root, { turn: 0, role: 'Выбирает цвет', compact: true });
      /* стартовые области: поглощаем одноцветных соседей */
      starts.forEach((s, p) => { const g = grab(p, pc[p], own, col); g.forEach(([i]) => { own[i] = p; }); cnt[p] += g.length; });
      cnt.forEach((v, p) => { if (p < api.n) api.score(p, v); });
      paintCells(); paintEdges(); paintBar();
      if (!gains(0).length) { const q = nextPlayer(); if (q < 0) { finish(); return; } cur = q; }
      paintBar(); paintPal(); banner(); fit(); requestAnimationFrame(fit); api.delay(fit, 400);
      if (solo && cur === 1) { locked = true; api.delay(ai, 600); }
    }
  });
}
