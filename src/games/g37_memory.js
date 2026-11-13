/* 37. Пары — мемори для одного игрока и команд */
{
  const EMO = ['🍕', '🍋', '🚲', '🎸', '🌵', '🦊', '🐙', '🚀', '⚓', '🎲', '🔑', '🍄', '🌻', '⛄', '🦉', '🍩', '🎈', '🔔', '🧲', '🪁', '🍇', '🦋', '🏀', '🎩', '🍒', '🐢', '🧀', '🎻', '🧭', '🌶️'];
  const items = []; for (const t in DATA.memory) DATA.memory[t].forEach(p => items.push({ t, l: p[0], r: p[1] }));
  const deck = makeDeck('memory', items);
  const GRIDS = { '4x4': [4, 4], '5x4': [5, 4], '6x6': [6, 6] };
  const themes = () => Object.keys(DATA.memory);
  registerGame({
    id: 'memory', title: 'Пары', icon: '🃏', color: '#ff7ab8',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 1, max: 6 }, mins: 15,
    tagline: 'Играйте в одиночку или компанией. Открывайте по две карточки и находите пары: одинаковые эмодзи или термин с определением.',
    rules: '<ul><li>Все карточки лежат рубашкой вверх. Команда по очереди открывает две.</li><li>Нашли пару — она остаётся открытой, команда получает очко и ходит снова.</li><li>Не совпало — карточки закроются, ход переходит дальше. Запоминайте, где что лежит!</li><li>В режиме «Термины» пара — это страна и столица, автор и произведение, год и событие и так далее. Тему выбирают перед игрой.</li><li>Выигрывает команда, нашедшая больше пар.</li><li>Чтобы играть одному, выберите одного участника. Соберите все пары за как можно меньше попыток. Одна попытка — две открытые карточки.</li></ul>',
    opts: [
      { key: 'grid', label: 'Поле', values: [['4x4', '4×4'], ['5x4', '5×4'], ['6x6', '6×6']], def: '4x4' },
      { key: 'mode', label: 'Карточки', values: [['terms', 'Термин и определение'], ['emoji', 'Эмодзи']], def: 'terms' },
      { key: 'theme', label: 'Тема для режима «Термины»', values: [['rand', 'Случайная']].concat(themes().map(t => [t, t])), def: 'rand' }
    ],
    cards: () => items.length,
    start(api) {
      const solo = api.n === 1;
      const o = api.opts, [C0, R0] = GRIDS[o.grid] || GRIDS['4x4'], total = C0 * R0, pairs = total / 2;
      const theme = themes().includes(o.theme) ? o.theme : pick(themes());
      let cards;
      if (o.mode === 'emoji') cards = sample(EMO, pairs).flatMap((e, id) => [{ id, txt: e, kind: 'e' }, { id, txt: e, kind: 'e' }]);
      else cards = deck.drawN(pairs, it => it.t === theme).flatMap((it, id) => [{ id, txt: it.l, kind: 'l' }, { id, txt: it.r, kind: 'r' }]);
      cards = shuffle(cards);
      const ROLE = 'Открывает две карточки';
      let ti = 0, open = [], locked = false, found = 0, attempts = 0, timer = 0, fitRaf = 0;
      const els = [], info = h('div', { class: 'mem-info', 'aria-live': 'polite' }), grid = h('div', { class: 'mem-grid' }), wrap = h('div', { class: 'mem-wrap' }, grid);
      cards.forEach((c, i) => {
        const span = h('span', { class: 'mem-t' }, c.txt);
        const el = h('button', { class: 'mem-card k-' + c.kind + (o.mode === 'emoji' ? ' emo' : ''), type: 'button', 'aria-label': 'Карточка ' + (i + 1) + ', закрыта', onclick: () => flip(i) },
          h('span', { class: 'mem-in' }, h('span', { class: 'mem-back', 'aria-hidden': 'true' }, h('i', null, '?')), h('span', { class: 'mem-face' }, span)));
        c.el = el; c.span = span; els.push(el);
      });
      grid.append(...els);
      const status = () => 'Пар: ' + found + ' из ' + pairs + (solo ? ' · Попыток: ' + attempts : '');
      const say = t => { info.textContent = t; };
      function label(i, state) { cards[i].el.setAttribute('aria-label', state === 'closed' ? 'Карточка ' + (i + 1) + ', закрыта' : 'Карточка ' + (i + 1) + ': ' + cards[i].txt + (state === 'done' ? ', пара найдена' : '')); }
      function flip(i) {
        const c = cards[i];
        if (locked || open.includes(i) || c.done) return;
        sfx.click(); open.push(i); c.el.classList.add('open'); label(i, 'open');
        if (open.length === 1) return say((solo ? 'Откройте вторую. ' : api.teams[ti].name + ': теперь откройте вторую. ') + status());
        locked = true; attempts++; const [a, b] = open;
        if (cards[a].id === cards[b].id) {
          timer = setTimeout(() => {
            [a, b].forEach(k => { const e = cards[k]; e.done = true; e.el.classList.remove('open'); e.el.classList.add('done'); e.el.disabled = true; e.el.style.setProperty('--tc', api.teams[ti].color); label(k, 'done'); });
            found++; open = []; sfx.ok(); api.score(ti, 1);
            if (found >= pairs) { say('Все пары найдены!'); timer = setTimeout(() => api.end(solo ? { custom: true, win: true, title: 'Все пары найдены!', sub: 'Пар: ' + found + ' из ' + pairs + ' · Попыток: ' + attempts, lines: [] } : {}), 1100); return; }
            say((solo ? 'Пара! ' : 'Пара! ' + api.teams[ti].name + ' ходит ещё. ') + status()); locked = false;
          }, 450);
        } else {
          sfx.bad(); say(solo ? 'Не пара. Запомните карточки. ' + status() : 'Не пара. Запомните! Ход переходит дальше.');
          timer = setTimeout(() => {
            [a, b].forEach(k => { cards[k].el.classList.remove('open'); label(k, 'closed'); });
            open = [];
            if (!solo) { ti = (ti + 1) % api.n; api.setTurn(ti, ROLE); const tb = document.querySelector('.turnbar'); if (tb) tb.classList.add('compact'); }
            say((solo ? 'Попробуйте ещё. ' : api.teams[ti].name + ': ваш ход. ') + status()); locked = false; fit();
          }, o.mode === 'emoji' ? 1100 : 1700);
        }
      }
      /* подгонка карточек под доступную высоту и ширину */
      function fit() {
        if (!wrap.isConnected) return;
        const top = wrap.getBoundingClientRect().top + window.scrollY, W = wrap.clientWidth, H = Math.max(120, window.innerHeight - top - (parseFloat(getComputedStyle(api.stage).paddingBottom) || 0) - 6);
        const gap = Math.round(clamp(Math.min(W, H) / 70, 4, 12));
        let best = null; const em = o.mode === 'emoji', amax = em ? 1.2 : 2;
        const tries = []; for (let c = 4; c <= total / 4; c++) if (total % c === 0) tries.push([c, total / c]);
        for (const [c, r] of tries) {
          let w = (W - gap * (c - 1)) / c, hh = (H - gap * (r - 1)) / r;
          w = Math.min(w, hh * amax, 230); hh = Math.min(hh, w * 1.5, 230);
          const sc = em ? w * hh : w * Math.sqrt(hh); if (!best || sc > best.sc) best = { c, r, sc, w: Math.floor(w), h: Math.floor(hh) };
        }
        grid.style.cssText = 'grid-template-columns:repeat(' + best.c + ',' + best.w + 'px);grid-auto-rows:' + best.h + 'px;gap:' + gap + 'px';
        const min = Math.min(best.w, best.h), pad = Math.max(4, Math.round(min * .07)), aw = best.w - 2 * pad - 8, ah = best.h - 2 * pad - 8;
        grid.style.setProperty('--mem-r', Math.max(8, Math.round(min * .12)) + 'px');
        cards.forEach(c => {
          const s = c.span;
          s.style.width = aw + 'px'; s.parentElement.style.padding = pad + 'px';
          let fs = em ? Math.floor(min * .55) : Math.floor(Math.min(min * .3, c.kind === 'l' ? best.h * .26 : best.h * .22));
          s.style.fontSize = fs + 'px';
          if (!em) while (fs > 8 && (s.scrollWidth > aw + 1 || s.offsetHeight > ah)) { fs--; s.style.fontSize = fs + 'px'; }
          c.el.style.setProperty('--bf', Math.floor(min * .4) + 'px');
        });
      }
      const onResize = () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fit); };
      say((solo ? 'Откройте карточку. ' : api.teams[ti].name + ': откройте карточку. ') + status());
      api.show([info, wrap], { turn: ti, role: ROLE, compact: true });
      window.addEventListener('resize', onResize);
      onLeave(() => { clearTimeout(timer); cancelAnimationFrame(fitRaf); window.removeEventListener('resize', onResize); });
      fit(); requestAnimationFrame(fit);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
    }
  });
}
