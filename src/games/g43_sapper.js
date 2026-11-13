/* 43. Сапёры — соревновательный «Сапёр» на общем поле: открывайте клетки, ставьте флажки, не подрывайтесь */
{
  registerGame({
    id: 'sapper', title: 'Сапёры', icon: '💣', color: '#e8564f',
    cats: ['Командные', 'Логика'], teams: { min: 1, max: 4 }, mins: 15,
    tagline: 'Одно минное поле на всех. Открывайте безопасные клетки, ставьте флажки на мины и не подрывайтесь: подрыв стоит очков.',
    rules: '<ul><li>Команды по очереди делают <b>один ход</b>: открывают клетку или ставят флажок. Переключатель «Открыть / Флажок» над полем.</li><li>Безопасная клетка приносит <b>очко за каждую открытую клетку</b>. Число в клетке показывает, сколько мин вокруг; «пустой» участок раскрывается волной, и все очки достаются вам.</li><li>Мина: <b>−5 очков</b>, клетка закрашивается цветом вашей команды, игра идёт дальше.</li><li>Флажок на мине: <b>+3</b>, на пустой клетке: <b>−2</b> (клетка при этом открывается). Флажок тоже занимает ход.</li><li>Первая клетка и все вокруг неё без мин.</li><li>Партия кончается, когда на поле не остаётся закрытых клеток. Побеждает команда с наибольшим счётом.</li><li>Если играет один участник, соперником станет компьютер.</li></ul>',
    opts: [{ key: 'level', label: 'Поле', values: [['easy', 'Лёгкое · 9×9, 10 мин'], ['mid', 'Среднее · 12×12, 25 мин'], ['hard', 'Сложное · 14×14, 40 мин']], def: 'easy' }],
    cards: () => 0,
    start(api) {
      const LV = { easy: [9, 10], mid: [12, 25], hard: [14, 40] }, [N, MINES] = LV[api.opts.level] || LV.easy, solo = api.n === 1;
      const sides = api.teams.map(t => ({ name: t.name, color: t.color }));
      if (solo) sides.push({ name: 'Компьютер', color: TEAM_COLORS[1] });
      const S = sides.length, pts = sides.map(() => 0), CELLS = N * N;
      const lab = i => (solo && i === 1 ? 'К' : String(i + 1));
      /* состояние: 0 закрыта, 1 открыта, 2 флажок на мине, 3 взорвана */
      const st = Array(CELLS).fill(0), mine = Array(CELLS).fill(false), num = Array(CELLS).fill(0), by = Array(CELLS).fill(-1), wrong = Array(CELLS).fill(false);
      let placed = false, resolved = 0, flaggedMines = 0, cur = 0, locked = false, over = false, mode = 'open';
      const nb = i => { const r = (i / N) | 0, c = i % N, o = []; for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { if (!dr && !dc) continue; const rr = r + dr, cc = c + dc; if (rr >= 0 && rr < N && cc >= 0 && cc < N) o.push(rr * N + cc); } return o; };
      const foundMines = () => flaggedMines + st.filter(x => x === 3).length;
      function place(first) {
        const ban = new Set([first, ...nb(first)]), pool = shuffle([...Array(CELLS).keys()].filter(i => !ban.has(i)));
        pool.slice(0, MINES).forEach(i => { mine[i] = true; });
        for (let i = 0; i < CELLS; i++) num[i] = nb(i).filter(j => mine[j]).length;
        placed = true;
      }

      /* ---- DOM ---- */
      const cells = [], board = h('div', { class: 'sp-board', role: 'grid', 'aria-label': 'Минное поле' });
      for (let i = 0; i < CELLS; i++) {
        const b = h('button', { class: 'sp-c', type: 'button', 'data-i': i, 'aria-label': 'Клетка ' + ((i / N | 0) + 1) + '-' + (i % N + 1), onclick: () => act(i, mode, false), oncontextmenu: ev => { ev.preventDefault(); act(i, 'flag', false); } });
        cells.push(b); board.append(b);
      }
      const bOpen = h('button', { class: 'sp-m', type: 'button', onclick: () => setMode('open') }, '👆 Открыть'), bFlag = h('button', { class: 'sp-m', type: 'button', onclick: () => setMode('flag') }, '🚩 Флажок');
      const info = h('div', { class: 'sp-info', title: 'Мин осталось найти' });
      const modes = h('div', { class: 'sp-modes', role: 'group', 'aria-label': 'Действие' }, bOpen, bFlag, info);
      const vs = solo ? h('div', { class: 'sp-vs' }) : null;
      const root = h('div', { class: 'sp-wrap' }, h('div', { class: 'sp-top' }, vs, modes), board);
      function setMode(m) { if (locked || over) return; mode = m; paintMode(); sfx.click(); }
      function paintMode() { bOpen.setAttribute('aria-pressed', mode === 'open'); bFlag.setAttribute('aria-pressed', mode === 'flag'); board.classList.toggle('sp-flagmode', mode === 'flag'); }
      function paintInfo() { info.textContent = '💣 ' + Math.max(0, MINES - foundMines()); }
      function paintVs() { if (vs) vs.replaceChildren(...[0, 1].flatMap(k => [k ? h('span', { class: 'sp-colon' }, '·') : null, h('span', { style: { '--c': sides[k].color } }, sides[k].name + ': ', h('b', null, pts[k]))])); }
      function fit() {
        if (!root.isConnected) return;
        const padB = parseFloat(getComputedStyle(root.parentElement).paddingBottom) || 0;
        const avW = Math.min(root.clientWidth, window.innerWidth) - 8;
        const avH = window.innerHeight - board.getBoundingClientRect().top - 8 - 14 - padB - 6 - 6;
        const cs = Math.max(26, Math.min(Math.floor(avW / N), Math.floor(avH / N), 56));
        board.style.setProperty('--cs', cs + 'px'); board.style.setProperty('--n', N);
      }
      const onResize = () => { if (!root.isConnected) return window.removeEventListener('resize', onResize); fit(); };
      window.addEventListener('resize', onResize);

      function paintCell(i, delay) {
        const b = cells[i]; b.className = 'sp-c'; b.disabled = st[i] !== 0; b.textContent = '';
        b.style.removeProperty('--c'); b.style.removeProperty('--d');
        if (delay) b.style.setProperty('--d', delay + 'ms');
        if (st[i] === 1) {
          b.classList.add('sp-open');
          if (wrong[i]) { b.classList.add('sp-wrong'); b.append(h('i', { class: 'sp-w' }, '🚩')); b.setAttribute('aria-label', 'Ошибочный флажок'); }
          if (num[i]) { b.classList.add('sp-n' + num[i]); b.append(h('span', null, num[i])); }
        } else if (st[i] >= 2) {
          b.classList.add(st[i] === 2 ? 'sp-flag' : 'sp-boom'); b.style.setProperty('--c', sides[by[i]].color);
          b.append(st[i] === 2 ? '🚩' : '💣', h('sub', null, lab(by[i])));
        }
      }
      function score(who, d) { pts[who] += d; if (!(solo && who === 1)) api.score(who, d); paintVs(); }
      function reveal(i) { /* открыть клетку (и волну нулей), вернуть число открытых */
        const q = [i], seen = new Set([i]); let k = 0;
        while (q.length) {
          const x = q.shift(); st[x] = 1; resolved++; paintCell(x, Math.min(k, 40) * 18); k++;
          if (num[x] === 0) nb(x).forEach(j => { if (!seen.has(j) && st[j] === 0 && !mine[j]) { seen.add(j); q.push(j); } });
        }
        return k;
      }
      function banner() { if (solo && cur === 1) api.setTurn(-1, 'Ход компьютера', 'Компьютер'); else api.setTurn(cur, 'Открывает или ставит флажок'); }
      function paintTurnUI() { board.style.setProperty('--tc', sides[cur].color); board.classList.toggle('sp-cpu', solo && cur === 1); }

      function act(i, how, byAi) {
        if (locked || over || st[i] !== 0) return;
        if (!byAi && solo && cur === 1) return;
        if (!placed) place(i);
        const who = cur;
        if (how === 'flag') {
          by[i] = who; resolved++;
          if (mine[i]) { st[i] = 2; flaggedMines++; score(who, 3); sfx.ok(); }
          else { st[i] = 1; wrong[i] = true; score(who, -2); sfx.bad(); }
          paintCell(i);
        } else if (mine[i]) {
          by[i] = who; st[i] = 3; resolved++; score(who, -5); sfx.bad(); paintCell(i);
        } else {
          const k = reveal(i); score(who, k); k > 1 ? sfx.ok() : sfx.click();
          try { if (k > 4) fx.burst(board, 6); } catch (x) { }
        }
        paintInfo();
        if (resolved >= CELLS) return finish();
        cur = (cur + 1) % S; mode = 'open'; paintMode(); paintTurnUI(); banner();
        if (solo && cur === 1) { locked = true; api.delay(ai, 400 + rnd(300)); }
      }

      /* компьютер: логика «сапёра» по видимым числам, иначе минимальный риск; иногда ошибается */
      function ai() {
        locked = false; if (!root.isConnected || over) return;
        const hidden = []; for (let i = 0; i < CELLS; i++) if (st[i] === 0) hidden.push(i);
        if (!hidden.length) return;
        if (!placed) return act((N >> 1) * N + (N >> 1), 'open', true);
        const safe = new Set(), bomb = new Set(), risk = new Map();
        for (let i = 0; i < CELLS; i++) {
          if (st[i] !== 1) continue;
          const ns = nb(i), unk = ns.filter(j => st[j] === 0), known = ns.filter(j => st[j] === 2 || st[j] === 3).length;
          if (!unk.length) continue;
          const rem = num[i] - known;
          if (rem <= 0) unk.forEach(j => safe.add(j));
          else if (rem === unk.length) unk.forEach(j => bomb.add(j));
          else unk.forEach(j => risk.set(j, Math.max(risk.get(j) || 0, rem / unk.length)));
        }
        const pick = a => a[rnd(a.length)];
        const sa = [...safe].filter(j => !bomb.has(j)), ba = [...bomb];
        if (Math.random() < .12) return act(pick(hidden), 'open', true);
        if (ba.length && (!sa.length || Math.random() < .45)) return act(pick(ba), 'flag', true);
        if (sa.length) return act(pick(sa), 'open', true);
        const base = Math.max(0, MINES - foundMines()) / hidden.length;
        const rk = j => risk.has(j) ? risk.get(j) : base;
        const best = Math.min(...hidden.map(rk)), c = hidden.filter(j => rk(j) <= best + .001);
        act(pick(c), 'open', true);
      }
      function finish() {
        over = true; locked = true; paintTurnUI(); board.classList.add('sp-over'); cells.forEach(b => { b.disabled = true; });
        const best = Math.max(...pts), win = pts.indexOf(best), tie = pts.filter(x => x === best).length > 1;
        sfx.win();
        api.delay(() => {
          if (!root.isConnected) return;
          window.removeEventListener('resize', onResize);
          if (!solo) return api.end();
          const sub = sides[0].name + ': ' + pts[0] + ' · Компьютер: ' + pts[1];
          if (tie) api.end({ custom: true, title: 'Ничья!', sub, lines: [], win: true });
          else if (win === 0) api.end({ custom: true, title: sides[0].name + ' побеждает!', sub, lines: [], win: true });
          else api.end({ custom: true, title: 'Компьютер победил', sub, lines: ['Сыграйте ещё раз: реванш за вами.'], win: false });
        }, 1300);
      }

      for (let i = 0; i < CELLS; i++) paintCell(i);
      window.__sapper = { N, MINES, mine, num, st, pts, wrong }; /* для тестов */
      api.show(root, { turn: 0, role: 'Открывает или ставит флажок', compact: true });
      paintMode(); paintTurnUI(); paintVs(); paintInfo(); fit(); requestAnimationFrame(fit); api.delay(fit, 400);
    }
  });
}
