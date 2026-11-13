/* 39. Четыре в ряд — классика: бросайте фишки в столбцы и собирайте четыре своих в линию */
{
  const CN_NS = 'http://www.w3.org/2000/svg';
  const cnSvg = (tag, attrs, ...kids) => { const e = document.createElementNS(CN_NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); kids.forEach(x => e.append(x)); return e; };
  /* символ игрока на фишке: кольцо, треугольник, квадрат, ромб (для различения без цвета) */
  const cnSym = (k, cx, cy, r) => {
    const a = { fill: 'none', stroke: '#1b1b2f', 'stroke-width': r * .26, 'stroke-linejoin': 'round', class: 'cn-sym' };
    if (k === 0) return cnSvg('circle', { ...a, cx, cy, r: r * .62 });
    if (k === 1) return cnSvg('polygon', { ...a, points: `${cx},${cy - r * .72} ${cx + r * .74},${cy + r * .55} ${cx - r * .74},${cy + r * .55}` });
    if (k === 2) return cnSvg('rect', { ...a, x: cx - r * .55, y: cy - r * .55, width: r * 1.1, height: r * 1.1, rx: r * .08 });
    return cnSvg('polygon', { ...a, points: `${cx},${cy - r * .78} ${cx + r * .7},${cy} ${cx},${cy + r * .78} ${cx - r * .7},${cy}` });
  };
  const cnDirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  registerGame({
    id: 'connect', title: 'Четыре в ряд', icon: '🔴', color: '#ff7a59',
    cats: ['Командные', 'Для двоих'], teams: { min: 1, max: 4 }, mins: 10,
    tagline: 'Бросайте фишки в столбцы: они падают до самого низа. Соберите четыре своих в ряд: по горизонтали, вертикали или диагонали.',
    rules: '<ul><li>Команды по очереди выбирают столбец: касанием по нему. Фишка падает на самое нижнее свободное место.</li><li>Побеждает тот, кто первым выстроил <b>четыре своих фишки в линию</b>: по горизонтали, вертикали или по диагонали.</li><li>Фишки игроков различаются цветом и значком: кольцо, треугольник, квадрат, ромб.</li><li>Если поле заполнено, а линии нет, партия заканчивается <b>ничьей</b>.</li><li>Если играет один участник, соперником станет компьютер: уровень выбирается в настройках.</li><li>Три и четыре команды играют на увеличенном поле 9×7.</li></ul>',
    opts: [
      { key: 'size', label: 'Поле', values: [[0, 'Классика 7×6'], [1, 'Побольше 9×7 (3–4 команды: всегда)']], def: 0 },
      { key: 'level', label: 'Компьютер (при одном участнике)', values: [[0, 'Лёгкий'], [1, 'Средний'], [2, 'Сильный']], def: 1, when: (opts, n) => n === 1 }
    ],
    cards: () => 0,
    start(api) {
      const solo = api.n === 1, big = api.n >= 3 || +api.opts.size === 1;
      const C = big ? 9 : 7, R = big ? 7 : 6, level = [0, 1, 2].includes(+api.opts.level) ? +api.opts.level : 1;
      const sides = api.teams.map(t => ({ name: t.name, color: t.color }));
      if (solo) sides.push({ name: 'Компьютер', color: TEAM_COLORS[1] });
      const S = sides.length;
      const g = Array(C * R).fill(-1);
      let cur = 0, placed = 0, locked = false, over = false;
      const rowOf = c => { for (let r = R - 1; r >= 0; r--) if (g[r * C + c] < 0) return r; return -1; };

      /* линия из 4+ фишек игрока p через клетку (r,c): список клеток или null */
      function lineAt(gr, r, c, p) {
        for (const [dr, dc] of cnDirs) {
          const cells = [[r, c]];
          for (const s of [1, -1]) for (let k = 1; k < R + C; k++) { const rr = r + dr * k * s, cc = c + dc * k * s; if (rr < 0 || rr >= R || cc < 0 || cc >= C || gr[rr * C + cc] !== p) break; cells.push([rr, cc]); }
          if (cells.length >= 4) return cells;
        }
        return null;
      }

      /* ---- SVG: фишки под доской, доска с дырками сверху ---- */
      const gDisc = cnSvg('g', {}), gHi = cnSvg('g', {});
      let hole = `M0 0H${C * 100}V${R * 100}H0Z`;
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) { const x = c * 100 + 50, y = r * 100 + 50; hole += `M${x - 40} ${y}a40 40 0 1 0 80 0a40 40 0 1 0 -80 0Z`; }
      const slots = cnSvg('g', {});
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) slots.append(cnSvg('circle', { cx: c * 100 + 50, cy: r * 100 + 50, r: 40, class: 'cn-slot' }));
      const svg = cnSvg('svg', { viewBox: `0 0 ${C * 100} ${R * 100}`, class: 'cn-svg', 'aria-hidden': 'true', focusable: 'false' }, slots, gDisc, cnSvg('path', { d: hole, 'fill-rule': 'evenodd', class: 'cn-frame' }), gHi);

      const board = h('div', { class: 'cn-board' }, svg);
      const cols = [];
      for (let c = 0; c < C; c++) {
        const b = h('button', { class: 'cn-col', type: 'button', 'aria-label': 'Столбец ' + (c + 1), style: { left: (c * 100 / C) + '%', width: (100 / C) + '%' }, onclick: () => drop(c, false) });
        cols.push(b); board.append(b);
      }
      const chips = sides.map((s, k) => {
        const ic = cnSvg('svg', { viewBox: '0 0 20 20', class: 'cn-ci', 'aria-hidden': 'true' }, cnSvg('circle', { cx: 10, cy: 10, r: 9.2, fill: s.color, stroke: '#1b1b2f', 'stroke-width': 1.2 }), cnSym(k, 10, 10, 9));
        return h('span', { class: 'cn-chip', style: { '--c': s.color } }, ic, s.name);
      });
      const leg = h('div', { class: 'cn-leg' }, ...chips);
      const root = h('div', { class: 'cn-wrap' }, leg, board);
      function fit() {
        if (!root.isConnected) return;
        const top = root.getBoundingClientRect().top + leg.offsetHeight + 8;
        const availH = window.innerHeight - top - 14 - (parseFloat(getComputedStyle(root.parentElement).paddingBottom) || 0);
        const w = Math.max(200, Math.min(root.clientWidth, availH * C / R, 900));
        board.style.setProperty('--w', Math.floor(w) + 'px'); board.style.setProperty('--h', Math.floor(w * R / C) + 'px');
      }
      const onResize = () => { if (!root.isConnected) return window.removeEventListener('resize', onResize); fit(); };
      window.addEventListener('resize', onResize);

      function paintTurn() {
        requestAnimationFrame(fit);
        board.style.setProperty('--c', sides[cur].color);
        chips.forEach((c, k) => c.classList.toggle('on', !over && k === cur));
        board.classList.toggle('cn-cpu', solo && cur === 1);
        cols.forEach((b, c) => b.disabled = over || rowOf(c) < 0);
      }
      function banner() {
        if (solo && cur === 1) api.setTurn(-1, 'Ход компьютера', 'Компьютер');
        else api.setTurn(cur, 'Бросает фишку');
      }

      function drop(c, byAi) {
        if (locked || over) return;
        if (!byAi && solo && cur === 1) return;
        const r = rowOf(c); if (r < 0) return;
        const who = cur; g[r * C + c] = who; placed++;
        const d = cnSvg('g', { class: 'cn-disc', style: `--from:${-(r + 1.3) * 100}px;--t:${(.24 + .04 * r).toFixed(2)}s` },
          cnSvg('circle', { cx: c * 100 + 50, cy: r * 100 + 50, r: 41, fill: sides[who].color, class: 'cn-fill' }),
          cnSvg('circle', { cx: c * 100 + 50, cy: r * 100 + 50, r: 29, fill: 'none', stroke: '#fff', 'stroke-opacity': .35, 'stroke-width': 3 }),
          cnSym(who, c * 100 + 50, r * 100 + 50, 40));
        gDisc.append(d);
        locked = true;
        const line = lineAt(g, r, c, who), full = placed >= R * C;
        api.delay(() => {
          if (!root.isConnected) return;
          sfx.click();
          if (line) return win(who, line);
          if (full) return finish(-1);
          cur = (cur + 1) % S; locked = false; paintTurn(); banner();
          if (solo && cur === 1) { locked = true; api.delay(ai, 400 + rnd(300)); }
        }, 300 + 40 * r);
      }

      /* ---- компьютер: минимакс с альфа-бета отсечением ---- */
      function evalPos(gr, me) {
        let sc = 0;
        for (let r = 0; r < R; r++) { const v = gr[r * C + (C >> 1)]; if (v >= 0) sc += v === me ? 3 : -3; }
        for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) for (const [dr, dc] of cnDirs) {
          const er = r + dr * 3, ec = c + dc * 3; if (er < 0 || er >= R || ec < 0 || ec >= C) continue;
          let m = 0, o = 0;
          for (let k = 0; k < 4; k++) { const v = gr[(r + dr * k) * C + c + dc * k]; if (v === me) m++; else if (v >= 0) o++; }
          if (m && o) continue;
          if (m) sc += [1, 5, 25][m - 1] || 0; else if (o) sc -= [1, 5, 40][o - 1] || 0;
        }
        return sc;
      }
      const order = Array.from({ length: C }, (_, i) => i).sort((a, b) => Math.abs(a - (C - 1) / 2) - Math.abs(b - (C - 1) / 2));
      function search(gr, depth, a, b, p, me, last) {
        /* last = [r,c,кто] — последний ход; победа предыдущего игрока */
        if (last && lineAt(gr, last[0], last[1], last[2])) return last[2] === me ? 100000 + depth : -100000 - depth;
        if (depth === 0) return evalPos(gr, me);
        let any = false, best = p === me ? -Infinity : Infinity;
        for (const c of order) {
          let r = -1; for (let q = R - 1; q >= 0; q--) if (gr[q * C + c] < 0) { r = q; break; }
          if (r < 0) continue; any = true;
          gr[r * C + c] = p;
          const v = search(gr, depth - 1, a, b, 1 - p, me, [r, c, p]);
          gr[r * C + c] = -1;
          if (p === me) { if (v > best) best = v; if (best > a) a = best; } else { if (v < best) best = v; if (best < b) b = best; }
          if (a >= b) break;
        }
        return any ? best : 0;
      }
      function ai() {
        locked = false; if (!root.isConnected || over) return;
        const legal = order.filter(c => rowOf(c) >= 0); if (!legal.length) return;
        const depth = [2, 4, big ? 5 : 6][level];
        let pick;
        if (level === 0 && Math.random() < .3) pick = legal[rnd(legal.length)];
        else {
          const gr = g.slice(); let best = -Infinity, bl = [];
          for (const c of legal) {
            const r = rowOf(c); gr[r * C + c] = 1;
            const v = search(gr, depth - 1, -Infinity, Infinity, 0, 1, [r, c, 1]);
            gr[r * C + c] = -1;
            if (v > best) { best = v; bl = [c]; } else if (v === best) bl.push(c);
          }
          pick = bl[rnd(bl.length)];
        }
        drop(pick, true);
      }

      function win(who, line) {
        over = true; locked = true; paintTurn();
        line.forEach(([r, c]) => gHi.append(cnSvg('circle', { cx: c * 100 + 50, cy: r * 100 + 50, r: 46, class: 'cn-win', fill: 'none' })));
        sfx.win(); try { fx.burst(board, 10); } catch (x) { }
        board.classList.add('cn-over');
        api.delay(() => finish(who), 1700);
      }
      function finish(who) {
        over = true; locked = true; paintTurn();
        if (!root.isConnected) return;
        window.removeEventListener('resize', onResize);
        if (who < 0) return api.end({ custom: true, title: 'Ничья!', sub: 'Поле заполнено, линии нет', lines: [], win: true });
        if (!solo) { api.score(who, 1); return api.end(); }
        if (who === 0) { api.score(0, 1); api.end({ custom: true, title: sides[0].name + ' побеждает!', sub: 'Четыре в ряд!', lines: [], win: true }); }
        else api.end({ custom: true, title: 'Компьютер победил', sub: 'Четыре в ряд у компьютера', lines: ['Сыграйте ещё раз: реванш за вами.'], win: false });
      }

      api.show(root, { turn: 0, role: 'Бросает фишку', compact: true });
      paintTurn(); fit(); requestAnimationFrame(fit); api.delay(fit, 400);
    }
  });
}
