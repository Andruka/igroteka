/* 42. Японские кроссворды — нонограммы: числа у строк и столбцов подсказывают, какие клетки закрасить, чтобы проявилась картинка */
{
  const NG_PAL = { R: '#e8483f', B: '#3a8ee6', G: '#2fa866', Y: '#f5c211', N: '#8a5a3b', W: '#ffffff', K: '#2b2b3a', P: '#f27fb3', O: '#f28c28', T: '#d9a066', S: '#9aa3b5' };
  const NG_NS = 'http://www.w3.org/2000/svg';
  /* картинки: '.' — пусто, буква — цвет закрашенной клетки */
  const NG_PUZ = [
    [5, 'Сердце', ['.R.R.', 'RRRRR', 'RRRRR', '.RRR.', '..R..']],
    [5, 'Домик', ['..R..', '.RRR.', 'RRRRR', 'YWYWY', 'YYBYY']],
    [5, 'Ёлка', ['..G..', '.GGG.', 'GGGGG', '..N..', '..N..']],
    [5, 'Гриб', ['.RRR.', 'RWRWR', 'RRRRR', '.TTT.', '.TTT.']],
    [5, 'Звезда', ['..Y..', 'YYYYY', '.YYY.', '.Y.Y.', 'Y...Y']],
    [5, 'Цветок', ['.RRR.', 'RRYRR', '.RRR.', '..G..', '.GGG.']],
    [5, 'Колокольчик', ['..Y..', '.YYY.', '.YYY.', 'YYYYY', '..R..']],
    [5, 'Чашка', ['NNNN.', 'NNNNN', 'NNNNN', 'NNNN.', '.NN..']],
    [5, 'Парусник', ['..R..', '..RR.', 'RRRRR', 'NNNNN', '.NNN.']],
    [5, 'Бриллиант', ['..B..', '.BBB.', 'BBBBB', '.BBB.', '..B..']],
    [5, 'Полумесяц', ['.YYY.', 'YY...', 'YY...', 'YY...', '.YYY.']],
    [5, 'Ключ', ['YYY..', 'Y.Y..', 'YYYYY', '..Y.Y', '..Y..']],
    [5, 'Зонтик', ['.RRR.', 'RRRRR', 'R.R.R', '..N..', '.NN..']],
    [8, 'Рыба', ['...BB...', '..BBBBB.', 'B.BBBBBB', 'BBBBBWBB', 'BBBBBBBB', 'B.BBBBBB', '..BBBBB.', '........']],
    [8, 'Кот', ['NN....NN', 'NNN..NNN', 'NNNNNNNN', 'NWNNNNWN', 'NNNNNNNN', 'NNNRRNNN', '.NNNNNN.', '..NNNN..']],
    [8, 'Сердце', ['........', '.RR..RR.', 'RRRRRRRR', 'RRRRRRRR', 'RRRRRRRR', '.RRRRRR.', '..RRRR..', '...RR...']],
    [8, 'Ёлка', ['...GG...', '..GGGG..', '.GGGGGG.', '..GGGG..', '.GGGGGG.', 'GGGGGGGG', '...NN...', '...NN...']],
    [8, 'Дом', ['...RR...', '..RRRR..', '.RRRRRR.', 'RRRRRRRR', 'YYYYYYYY', 'YWWYYBBY', 'YWWYYBBY', 'YYYYYYYY']],
    [8, 'Бабочка', ['.N....N.', '..N..N..', 'PPPNNPPP', 'PPPNNPPP', '.PPNNPP.', 'OOONNOOO', 'OOONNOOO', '.OO..OO.']],
    [8, 'Кофе', ['.S..S...', '..S..S..', 'NNNNNN..', 'NNNNNNNN', 'NNNNNN.N', 'NNNNNNNN', '.NNNNN..', 'SSSSSSSS']],
    [8, 'Парусная лодка', ['...R....', '...RR...', '...RRR..', '..RRRRR.', '..RRRRRR', 'NNNNNNNN', '.NNNNNN.', 'BBBBBBBB']],
    [8, 'Ключ', ['..YYY...', '.YY.YY..', '.Y...Y..', '.YY.YY..', '..YYY...', '...Y....', '...YYY..', '...YY...']],
    [8, 'Гриб', ['..RRRR..', '.RWRRRR.', 'RRRRRWRR', 'RRRRRRRR', '..TTTT..', '..TTTT..', '..TTTT..', '.TTTTTT.']],
    [8, 'Звезда', ['...YY...', '...YY...', 'YYYYYYYY', '.YYYYYY.', '..YYYY..', '..YYYY..', '.YY..YY.', '.Y....Y.']],
    [8, 'Ракета', ['...RR...', '..RRRR..', '..RWWR..', '..RRRR..', '..RRRR..', '.RRRRRR.', 'RR.OO.RR', '...OO...']],
    [8, 'Тюльпан', ['.R.RR.R.', '.RRRRRR.', '.RRRRRR.', '..RRRR..', '...GG...', 'GG.GG...', '.GGGG...', '...GG...']],
    [8, 'Корона', ['Y..YY..Y', 'Y..YY..Y', 'YY.YY.YY', 'YYYYYYYY', 'YYRYYRYY', 'YYYYYYYY', '........', '........']],
    [8, 'Зонт', ['..RRRR..', '.RRRRRR.', 'RRRRRRRR', 'R.RR.RR.', '...N....', '...N....', '...N....', '..NN....']],
    [8, 'Яблоко', ['...NGG..', '.RRRNRR.', 'RRRRRRRR', 'RRRRRRRR', 'RRRRRRRR', '.RRRRRR.', '..RRRR..', '........']],
    [10, 'Сова', ['NN......NN', 'NNNNNNNNNN', 'NWWWNNWWWN', 'NWKWNNWKWN', 'NNWNYYNWNN', 'NNNNYYNNNN', 'NNNNNNNNNN', '.NNNNNNNN.', '..NNNNNN..', '..YY..YY..']],
    [10, 'Дуб', ['...GGGG...', '..GGGGGG..', '.GGGGGGGG.', '.GGRGGGRG.', 'GGGGGGGGGG', '.GGGGRGGG.', '..GGGGGG..', '....NN....', '....NN....', '...NNNN...']],
    [10, 'Крепость', ['G.G....G.G', 'GGGGGGGGGG', '.GGGGGGGG.', '.GGGGGGGG.', '.GGGGGGGG.', '.GGGBBGGG.', '.GGBBBBGG.', '.GGBBBBGG.', '.GGBBBBGG.', 'GGGGGGGGGG']],
    [10, 'Воздушный шар', ['..RRRRRR..', '.RRRRRRRR.', 'RRWWRRRRRR', 'RRWRRRRRRR', 'RRRRRRRRRR', '.RRRRRRRR.', '..RRRRRR..', '...RRRR...', '....NN....', '...NNNN...']],
    [10, 'Рыба', ['....BB....', '...BBBB...', 'B.BBBBBB..', 'BBBBBWBBB.', 'BBBBBBBBBB', 'BBBBBBBBB.', 'B.BBBBBB..', '...BBBB...', '....BB....', '..........']],
    [10, 'Кот', ['NN......NN', 'NNN....NNN', 'NNNNNNNNNN', 'NNWNNNNWNN', 'NNNNPPNNNN', '.NNNNNNNN.', '..NNNNNN..', '.NNNNNNNN.', 'NNNNNNNNNN', 'NN.NN..NN.']],
    [10, 'Самолёт', ['....BB....', '....BB....', '....BB....', 'BBBBBBBBBB', '.BBBBBBBB.', '....BB....', '....BB....', '..BBBBBB..', '....BB....', '...BBBB...']],
    [10, 'Корабль', ['...RR.RR..', '...RR.RR..', '..WWWWWWW.', '..WBWBWBW.', '..WWWWWWW.', 'NNNNNNNNNN', '.NNNNNNNN.', '..NNNNNN..', 'BBBBBBBBBB', '.BB.BB.BB.']],
    [10, 'Бабочка', ['.N......N.', '..N....N..', 'PPPPNNPPPP', 'PPPPNNPPPP', '.PPPNNPPP.', '..PPNNPP..', '.OOONNOOO.', 'OOOONNOOOO', 'OOO.NN.OOO', '.O..NN..O.']],
    [10, 'Домик', ['....RR....', '...RRRR...', '..RRRRRR..', '.RRRRRRRR.', 'RRRRRRRRRR', '.YYYYYYYY.', '.YWWBBWWY.', '.YWWBBWWY.', '.YYYBBYYY.', '.YYYBBYYY.']],
    [10, 'Ракета', ['....RR....', '...RRRR...', '..RRRRRR..', '..RRWWRR..', '..RRWWRR..', '..RRRRRR..', '..RRRRRR..', '.RRRRRRRR.', 'RR..OO..RR', '....OO....']],
    [10, 'Песочные часы', ['NNNNNNNNNN', '.NYYYYYYN.', '..NYYYYN..', '...NYYN...', '....NN....', '...N..N...', '..N.YY.N..', '.N.YYYY.N.', '.NYYYYYYN.', 'NNNNNNNNNN']],
    [10, 'Утка', ['...YY.....', '..YYYY....', '..YKYOO...', '..YYYY....', '...YY.....', '...YYY....', 'YYYYYYYYY.', '.YYYYYYYY.', '..YYYYYY..', 'BBBBBBBBBB']],
    [10, 'Кубок', ['YYYYYYYYYY', 'YYYYYYYYYY', 'Y.YYYYYY.Y', 'Y.YYYYYY.Y', '.YYYYYYYY.', '..YYYYYY..', '....YY....', '....YY....', '...YYYY...', '..YYYYYY..']],
    [10, 'Мороженое', ['...PPPP...', '..PPPPPP..', '.PPPPPPPP.', '.PPPPPPPP.', '.TTTTTTTT.', '..TT.TTT..', '...TTTT...', '....TT....', '....TT....', '....T.....']],
    [10, 'Новогодняя ёлка', ['....YY....', '....GG....', '...GGGG...', '..GGGGGG..', '...GGGG...', '..GGGGGG..', '.GGGGGGGG.', 'GGGGGGGGGG', '....NN....', '....NN....']]
  ];
  registerGame({
    id: 'nonogram', title: 'Японские кроссворды', icon: '🧩', color: '#f2b134', coop: true, noBoard: true, puzzles: NG_PUZ, palette: NG_PAL,
    cats: ['Загадки и истории', 'Для компании', 'Для двоих'], teams: { min: 1, max: 1 }, mins: 10,
    tagline: 'Числа у строк и столбцов подсказывают, какие клетки закрасить. Решите головоломку всей компанией, и проявится картинка.',
    rules: '<ul><li>Число у строки или столбца говорит, сколько закрашенных клеток идёт подряд. Несколько чисел означают несколько отрезков в этом порядке, между ними есть хотя бы одна пустая клетка.</li><li>Выберите режим <b>«Закрасить»</b> или <b>«Крестик»</b>. Крестик отмечает клетки, которые точно пустые. Он помогает думать и ни на что не влияет.</li><li>Можно вести пальцем или мышью: так закрашивается или стирается сразу несколько клеток.</li><li>Когда числа у линии сошлись, они гаснут. Если включены подсказки ошибок, неверная клетка подсвечивается красным.</li><li><b>Подсказка</b> открывает одну верную клетку, но добавляет 30 секунд к времени.</li><li>Все головоломки решаются логикой, угадывать не нужно. Когда картинка готова, она проявляется в цвете.</li></ul>',
    opts: [
      { key: 'size', label: 'Размер поля', values: [[5, '5×5 · лёгкое'], [8, '8×8 · среднее'], [10, '10×10 · сложное']], def: 8 },
      { key: 'err', label: 'Подсказывать ошибки', values: [[1, 'Да'], [0, 'Нет']], def: 1 }
    ],
    cards: () => 0,
    start(api) {
      const N = [5, 8, 10].includes(+api.opts.size) ? +api.opts.size : 8, showErr = +api.opts.err !== 0;
      const pool = NG_PUZ.filter(p => p[0] === N);
      const seenKey = 'ng.seen.' + N; let seen = store.get(seenKey, []);
      let fresh = pool.map((p, i) => i).filter(i => !seen.includes(i)); if (!fresh.length) { seen = []; fresh = pool.map((p, i) => i); }
      const pi = fresh[rnd(fresh.length)]; store.set(seenKey, seen.concat(pi));
      const pz = pool[pi], rows = pz[2], name = pz[1];
      const sol = []; rows.forEach(r => [...r].forEach(c => sol.push(c !== '.' ? 1 : 0)));
      const runs = a => { const o = []; let k = 0; a.forEach(v => { if (v === 1) k++; else if (k) { o.push(k); k = 0; } }); if (k) o.push(k); return o.length ? o : [0]; };
      const rowOf = (arr, r) => arr.slice(r * N, r * N + N), colOf = (arr, c) => Array.from({ length: N }, (_, r) => arr[r * N + c]);
      const rowClue = Array.from({ length: N }, (_, r) => runs(rowOf(sol, r))), colClue = Array.from({ length: N }, (_, c) => runs(colOf(sol, c)));
      const rc = Math.max(...rowClue.map(x => x.length)), cc = Math.max(...colClue.map(x => x.length));
      const st = Array(N * N).fill(0), locked = Array(N * N).fill(false), undo = [];
      let mode = 'fill', over = false, pen = 0, hints = 0, stroke = null, strokeAct = null, curR = -1, curC = -1;
      const t0 = performance.now();
      const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

      /* ---- разметка ---- */
      const cells = Array.from({ length: N * N }, (_, i) => h('div', { class: 'ng-c' + ((i % N) % 5 === 4 && (i % N) < N - 1 ? ' ngr' : '') + ((Math.floor(i / N)) % 5 === 4 && Math.floor(i / N) < N - 1 ? ' ngb' : ''), 'data-i': i }));
      const grid = h('div', { class: 'ng-grid', role: 'application', 'aria-label': 'Поле ' + N + ' на ' + N }, ...cells);
      const mkClue = nums => nums.map(n => h('span', null, n));
      const colEls = colClue.map((c, i) => h('div', { class: 'ng-cc' + ((i % 5 === 4 && i < N - 1) ? ' ngr' : '') }, ...mkClue(c)));
      const rowEls = rowClue.map((r, i) => h('div', { class: 'ng-rc' + ((i % 5 === 4 && i < N - 1) ? ' ngb' : '') }, ...mkClue(r)));
      const board = h('div', { class: 'ng-board', style: { '--n': N, '--rc': rc, '--cc': cc } },
        h('div', { class: 'ng-corner' }), h('div', { class: 'ng-cols' }, ...colEls), h('div', { class: 'ng-rows' }, ...rowEls), grid);
      const clock = h('b', { class: 'ng-clock' }, '0:00'), cnt = h('span', { class: 'ng-cnt' });
      const top = h('div', { class: 'ng-top' }, h('span', null, 'Время: ', clock), cnt);
      const mFill = h('button', { type: 'button', class: 'ng-m on', 'aria-pressed': 'true', onclick: () => setMode('fill') }, h('i', { class: 'ng-ico f' }), 'Закрасить');
      const mCross = h('button', { type: 'button', class: 'ng-m', 'aria-pressed': 'false', onclick: () => setMode('cross') }, h('i', { class: 'ng-ico x' }), 'Крестик');
      const bUndo = h('button', { type: 'button', class: 'ng-b', onclick: doUndo, disabled: true, 'aria-label': 'Отмена хода', title: 'Отмена хода' }, '↶');
      const bHint = h('button', { type: 'button', class: 'ng-b', onclick: doHint, 'aria-label': 'Подсказка: открыть клетку, штраф 30 секунд', title: 'Подсказка (+30 с к времени)' }, '💡 −30 с');
      const ctl = h('div', { class: 'ng-ctl' }, h('div', { class: 'ng-seg', role: 'group', 'aria-label': 'Режим' }, mFill, mCross), h('div', { class: 'ng-acts' }, bUndo, bHint));
      const root = h('div', { class: 'ng-wrap' }, top, board, ctl);

      function setMode(m) { mode = m; mFill.classList.toggle('on', m === 'fill'); mCross.classList.toggle('on', m === 'cross'); mFill.setAttribute('aria-pressed', String(m === 'fill')); mCross.setAttribute('aria-pressed', String(m === 'cross')); sfx.click(); }
      const elapsed = () => (performance.now() - t0) / 1000 + pen;
      const fmt = s => { s = Math.floor(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
      const tick = setInterval(() => { if (!root.isConnected) return clearInterval(tick); if (!over) clock.textContent = fmt(elapsed()); }, 250);
      function fit() {
        if (!root.isConnected) return;
        const rect = root.getBoundingClientRect(), pb = parseFloat(getComputedStyle(root.parentElement).paddingBottom) || 0;
        const availW = root.clientWidth - 18, availH = window.innerHeight - rect.top - top.offsetHeight - ctl.offsetHeight - 2 * 10 - pb - 22;
        const K = .6; /* размер клетки подсказки в долях клетки поля */
        const cs = Math.floor(Math.max(18, Math.min(availW / (N + rc * K), availH / (N + cc * K), 64)));
        board.style.setProperty('--cs', cs + 'px'); board.style.setProperty('--u', Math.floor(cs * K) + 'px'); board.style.setProperty('--fs', Math.max(11, Math.floor(cs * K * .82)) + 'px');
      }
      const onResize = () => { if (!root.isConnected) return window.removeEventListener('resize', onResize); fit(); };
      window.addEventListener('resize', onResize);

      /* ---- состояние ---- */
      function paint() {
        let wrong = 0;
        const fl = st.map(v => v === 1 ? 1 : 0);
        cells.forEach((c, i) => {
          const bad = showErr && ((st[i] === 1 && !sol[i]) || (st[i] === 2 && sol[i]));
          if (bad) wrong++;
          c.className = c.className.replace(/ ng-(f|x|bad|lk)\b/g, '') + (st[i] === 1 ? ' ng-f' : st[i] === 2 ? ' ng-x' : '') + (bad ? ' ng-bad' : '') + (locked[i] ? ' ng-lk' : '');
        });
        for (let r = 0; r < N; r++) rowEls[r].classList.toggle('ng-ok', same(runs(rowOf(fl, r)), rowClue[r]));
        for (let c = 0; c < N; c++) colEls[c].classList.toggle('ng-ok', same(runs(colOf(fl, c)), colClue[c]));
        const left = sol.filter((v, i) => v && st[i] !== 1).length;
        cnt.textContent = (showErr && wrong ? 'Ошибок: ' + wrong + ' · ' : '') + 'Осталось клеток: ' + left;
        cnt.classList.toggle('ng-warn', showErr && wrong > 0);
        bUndo.disabled = !undo.length;
        if (!over && st.every((v, i) => (v === 1) === !!sol[i])) win();
      }
      function paintCur() { rowEls.forEach((e, i) => e.classList.toggle('ng-cur', i === curR)); colEls.forEach((e, i) => e.classList.toggle('ng-cur', i === curC)); }
      const cellAt = (x, y) => { const e = document.elementFromPoint(x, y); const c = e && e.closest && e.closest('.ng-c'); return c && grid.contains(c) ? +c.dataset.i : -1; };
      function apply(i) {
        if (i < 0 || over || locked[i]) return;
        curR = Math.floor(i / N); curC = i % N; paintCur();
        if (strokeAct === 'erase') { if (st[i] === 0) return; stroke.push([i, st[i]]); st[i] = 0; paint(); return; }
        const want = strokeAct === 'fill' ? 1 : 2;
        if (st[i] !== 0) return; /* протяжка не перекрашивает другой знак */
        stroke.push([i, 0]); st[i] = want; paint();
      }
      grid.addEventListener('pointerdown', e => {
        if (over || stroke) return;
        e.preventDefault();
        const i = cellAt(e.clientX, e.clientY); if (i < 0) return;
        const m = e.pointerType === 'mouse' && e.button === 2 ? (mode === 'fill' ? 'cross' : 'fill') : mode; /* правая кнопка мыши — обратный режим */
        const want = m === 'fill' ? 1 : 2;
        strokeAct = (st[i] !== 0) ? 'erase' : m;
        if (st[i] === want) strokeAct = 'erase';
        stroke = [];
        try { grid.setPointerCapture(e.pointerId); } catch (x) { }
        apply(i);
      });
      grid.addEventListener('pointermove', e => { if (!stroke) return; const i = cellAt(e.clientX, e.clientY); if (i >= 0) apply(i); });
      const endStroke = () => { if (!stroke) return; if (stroke.length) { undo.push(stroke); sfx.click(); } stroke = null; strokeAct = null; paint(); };
      grid.addEventListener('pointerup', endStroke); grid.addEventListener('pointercancel', endStroke);
      grid.addEventListener('contextmenu', e => e.preventDefault());
      function doUndo() { if (!undo.length || over) return; undo.pop().reverse().forEach(([i, v]) => { st[i] = v; }); sfx.click(); paint(); }
      function doHint() {
        if (over) return;
        const miss = st.map((v, i) => (sol[i] && v !== 1) ? i : -1).filter(i => i >= 0);
        if (!miss.length) return;
        const i = miss[rnd(miss.length)]; st[i] = 1; locked[i] = true; hints++; pen += 30;
        undo.forEach(s => { for (let k = s.length - 1; k >= 0; k--) if (s[k][0] === i) s.splice(k, 1); });
        for (let k = undo.length - 1; k >= 0; k--) if (!undo[k].length) undo.splice(k, 1);
        sfx.ok(); clock.textContent = fmt(elapsed()); paint();
        try { fx.burst(cells[i], 5); } catch (x) { }
      }

      function pic(size) {
        const s = document.createElementNS(NG_NS, 'svg'); s.setAttribute('viewBox', '0 0 ' + N + ' ' + N); s.setAttribute('class', 'ng-pic'); s.style.width = size + 'px'; s.style.height = size + 'px'; s.setAttribute('role', 'img'); s.setAttribute('aria-label', name);
        rows.forEach((row, r) => [...row].forEach((ch, c) => { if (ch === '.') return; const q = document.createElementNS(NG_NS, 'rect'); q.setAttribute('x', c); q.setAttribute('y', r); q.setAttribute('width', 1.02); q.setAttribute('height', 1.02); q.setAttribute('fill', NG_PAL[ch] || '#333'); q.setAttribute('stroke', 'rgba(14,18,51,.35)'); q.setAttribute('stroke-width', '.04'); s.append(q); }));
        return s;
      }
      function win() {
        over = true; clearInterval(tick); sfx.win();
        const total = Math.round(elapsed()); clock.textContent = fmt(total);
        cells.forEach((c, i) => { c.classList.remove('ng-x'); if (sol[i]) { const ch = rows[Math.floor(i / N)][i % N]; c.style.setProperty('--fc', NG_PAL[ch] || '#333'); c.classList.add('ng-rev'); c.style.animationDelay = (Math.floor(i / N) * 60 + (i % N) * 25) + 'ms'; } });
        board.classList.add('ng-done'); cnt.textContent = 'Готово!'; bUndo.disabled = true; bHint.disabled = true; mFill.disabled = mCross.disabled = true;
        try { fx.burst(board, 12); } catch (x) { }
        setTimeout(() => {
          if (!root.isConnected) return;
          window.removeEventListener('resize', onResize);
          api.end({ win: true, custom: true, title: 'Это — ' + name.toLowerCase() + '!', sub: 'Кроссворд ' + N + '×' + N + ' решён за ' + fmt(total) + '.',
            art: h('div', { class: 'ng-art' }, pic(Math.round(Math.min(220, Math.max(140, window.innerHeight * .28))))),
            lines: [hints ? 'Подсказок: ' + hints + ' (штраф ' + hints * 30 + ' с уже в общем времени).' : 'Без единой подсказки. Отличная работа!'] });
        }, 2000);
      }

      api.show(root, { turn: -1, role: 'Решаем вместе', compact: true });
      paint(); fit(); requestAnimationFrame(fit); setTimeout(fit, 300);
    }
  });
}
