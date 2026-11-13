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
      { key: 'theme', label: 'Тема для режима «Термины»', values: [['rand', 'Случайная']].concat(themes().map(t => [t, t])), def: 'rand', when: opts => opts.mode !== 'emoji' }
    ],
    cards: () => items.length,
    saveVersion: 1,
    validateSave(s, opts, teams) {
      const total = (GRIDS[opts.grid] || GRIDS['4x4']).reduce((a, b) => a * b), pairs = total / 2, check = SaveChecks;
      if (!s || !check.array(s.cards, total, c => c && check.int(c.id, 0, pairs - 1) && check.text(c.txt) && ['e', 'l', 'r'].includes(c.kind) && typeof c.done === 'boolean' && (c.owner === null || check.int(c.owner, 0, teams.length - 1)))) return false;
      if (!check.int(s.ti, 0, teams.length - 1) || !check.int(s.found, 0, pairs - 1) || !check.int(s.attempts, s.found, 1000000) || !check.number(s.wait, 0, 1700)) return false;
      if (!Array.isArray(s.open) || s.open.length > 2 || new Set(s.open).size !== s.open.length || !s.open.every(i => check.int(i, 0, total - 1) && !s.cards[i].done)) return false;
      if (s.open.length === 2 && s.attempts <= s.found) return false;
      if (!Array.isArray(s.entries) || (opts.mode === 'emoji' ? s.entries.length !== 0 : s.entries.length !== pairs)) return false;
      if (opts.mode === 'emoji' ? new Set(s.cards.map(c => c.txt)).size !== pairs : new Set(s.entries.map(itemKey)).size !== pairs) return false;
      const scores = teams.map(() => 0); let done = 0;
      for (let id = 0; id < pairs; id++) {
        const group = s.cards.filter(c => c.id === id);
        if (group.length !== 2 || group[0].done !== group[1].done || group[0].owner !== group[1].owner) return false;
        if (opts.mode === 'emoji') { if (!group.every(c => c.kind === 'e' && c.txt === group[0].txt && EMO.includes(c.txt))) return false; }
        else {
          const entry = s.entries[id];
          if (!entry || entry.t !== s.theme || !items.some(it => it.t === entry.t && it.l === entry.l && it.r === entry.r)) return false;
          if (!group.some(c => c.kind === 'l' && c.txt === entry.l) || !group.some(c => c.kind === 'r' && c.txt === entry.r)) return false;
        }
        if (group[0].done) { if (group[0].owner === null) return false; done++; scores[group[0].owner]++; }
      }
      return done === s.found && teams.every((team, i) => team.score === scores[i]);
    },
    start(api) {
      const saved = api.saved;
      const solo = api.n === 1;
      const o = api.opts, [C0, R0] = GRIDS[o.grid] || GRIDS['4x4'], total = C0 * R0, pairs = total / 2;
      const hidden = new Set(store.get('bad.memory', [])), available = t => items.filter(it => it.t === t && !hidden.has(itemKey(it))).length;
      const theme = saved ? saved.theme : o.mode === 'emoji' ? 'rand' : themes().includes(o.theme) ? o.theme : pick(themes().filter(t => available(t) >= pairs));
      if (!saved && o.mode !== 'emoji' && available(theme) < pairs) {
        api.show([h('h2', null, 'Недостаточно доступных пар'), h('p', { class: 'mid-t' }, 'Выберите другую тему или меньшее поле. Скрытые карточки можно вернуть в настройках.'), btn('В меню игры', () => Intro(api.game), 'big', { 'data-primary': true })], { turn: -1, flagCards: [] });
        return;
      }
      let cards, entries = [];
      if (saved) { cards = saved.cards.map(c => ({ ...c })); entries = saved.entries; }
      else if (o.mode === 'emoji') cards = sample(EMO, pairs).flatMap((e, id) => [{ id, txt: e, kind: 'e' }, { id, txt: e, kind: 'e' }]);
      else { entries = deck.drawN(pairs, it => it.t === theme); cards = entries.flatMap((it, id) => [{ id, txt: it.l, kind: 'l' }, { id, txt: it.r, kind: 'r' }]); }
      if (!saved) cards = shuffle(cards);
      const ROLE = 'Открывает две карточки';
      let ti = saved ? saved.ti : 0, open = saved ? saved.open : [], locked = open.length === 2, found = saved ? saved.found : 0, attempts = saved ? saved.attempts : 0, timer = null, fitRaf = 0;
      const els = [], info = h('div', { class: 'mem-info', 'aria-live': 'polite' }), grid = h('div', { class: 'mem-grid' }), wrap = h('div', { class: 'mem-wrap' }, grid);
      cards.forEach((c, i) => {
        const span = h('span', { class: 'mem-t' }, c.txt);
        const el = h('button', { class: 'mem-card k-' + c.kind + (o.mode === 'emoji' ? ' emo' : ''), type: 'button', 'aria-label': 'Карточка ' + (i + 1) + ', закрыта', onclick: () => flip(i) },
          h('span', { class: 'mem-in' }, h('span', { class: 'mem-back', 'aria-hidden': 'true' }, h('i', null, '?')), h('span', { class: 'mem-face' }, span)));
        c.el = el; c.span = span; els.push(el);
        if (c.done) { el.classList.add('done'); el.disabled = true; el.style.setProperty('--tc', api.teams[c.owner].color); label(i, 'done'); }
        else if (open.includes(i)) { el.classList.add('open'); label(i, 'open'); }
      });
      grid.append(...els);
      const status = () => 'Пар: ' + found + ' из ' + pairs + (solo ? ' · Попыток: ' + attempts : '');
      const say = t => { info.textContent = t; };
      function updateReports() {
        const visible = new Map();
        cards.forEach((c, i) => { if (entries[c.id] && (c.done || open.includes(i))) { if (!visible.has(c.id)) visible.set(c.id, []); visible.get(c.id).push(c.txt); } });
        api.setFlagCards([...visible].map(([id, text]) => ({ deck: 'memory', item: entries[id], label: text.join(' / ') })));
      }
      function label(i, state) { cards[i].el.setAttribute('aria-label', state === 'closed' ? 'Карточка ' + (i + 1) + ', закрыта' : 'Карточка ' + (i + 1) + ': ' + cards[i].txt + (state === 'done' ? ', пара найдена' : '')); }
      function flip(i) {
        const c = cards[i];
        if (locked || open.includes(i) || c.done) return;
        sfx.click(); open.push(i); c.el.classList.add('open'); label(i, 'open'); updateReports();
        if (open.length === 1) { say((solo ? 'Откройте вторую. ' : api.teams[ti].name + ': теперь откройте вторую. ') + status()); api.save(); return; }
        attempts++; settle(); api.save();
      }
      function settle(wait) {
        locked = true; const [a, b] = open;
        if (cards[a].id === cards[b].id) {
          timer = api.delay(() => {
            [a, b].forEach(k => { const e = cards[k]; e.done = true; e.owner = ti; e.el.classList.remove('open'); e.el.classList.add('done'); e.el.disabled = true; e.el.style.setProperty('--tc', api.teams[ti].color); label(k, 'done'); });
            found++; open = []; updateReports(); sfx.ok(); api.score(ti, 1);
            if (found >= pairs) { api.save(); say('Все пары найдены!'); timer = api.delay(() => api.end(solo ? { custom: true, win: true, title: 'Все пары найдены!', sub: 'Пар: ' + found + ' из ' + pairs + ' · Попыток: ' + attempts, lines: [] } : {}), 1100); return; }
            say((solo ? 'Пара! ' : 'Пара! ' + api.teams[ti].name + ' ходит ещё. ') + status()); locked = false; api.save();
          }, wait ?? 450);
        } else {
          sfx.bad(); say(solo ? 'Не пара. Запомните карточки. ' + status() : 'Не пара. Запомните! Ход переходит дальше.');
          timer = api.delay(() => {
            [a, b].forEach(k => { cards[k].el.classList.remove('open'); label(k, 'closed'); });
            open = []; updateReports();
            if (!solo) { ti = (ti + 1) % api.n; api.setTurn(ti, ROLE); const tb = document.querySelector('.turnbar'); if (tb) tb.classList.add('compact'); }
            say((solo ? 'Попробуйте ещё. ' : api.teams[ti].name + ': ваш ход. ') + status()); locked = false; fit(); api.save();
          }, wait ?? (o.mode === 'emoji' ? 1100 : 1700));
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
      api.show([info, wrap], { turn: ti, role: ROLE, compact: true, flagCards: [] });
      updateReports();
      if (open.length === 2) settle(saved.wait);
      else if (open.length === 1) say('Откройте вторую. ' + status());
      api.enableSave(() => found >= pairs ? null : ({ theme, entries, cards: cards.map(c => ({ id: c.id, txt: c.txt, kind: c.kind, done: !!c.done, owner: c.owner ?? null })), ti, open: open.slice(), found, attempts, wait: api.delayLeft(timer) }));
      window.addEventListener('resize', onResize);
      onLeave(() => { api.cancelDelay(timer); cancelAnimationFrame(fitRaf); window.removeEventListener('resize', onResize); });
      fit(); requestAnimationFrame(fit);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(onResize);
    }
  });
}
