/* Дуэт — общий каркас режима для двоих (Крокодил, Табу, Рисуй и угадывай): роли чередуются, счёт «Вместе» (рекорд пары) или «Друг против друга» */
const DUET_OPTS = () => [
  { key: 'mode', label: 'Режим', values: [['team', 'Командная'], ['duet', 'Дуэт (вдвоём)']], def: 'team' },
  { key: 'score', label: 'Дуэт: счёт', values: [['together', 'Вместе (рекорд пары)'], ['versus', 'Друг против друга']], def: 'together' },
  { key: 'drounds', label: 'Дуэт: раундов', values: [4, 6, 10], def: 6 }
];
const duetOn = api => api.opts.mode === 'duet';
function duetRun(api, id, playRound) {
  if (api.n !== 2) { startSession(api.game, api.teams.slice(0, 2).map(t => ({ name: t.name, color: t.color })), api.opts); return; }
  const total = [4, 6, 10].includes(api.opts.drounds) ? api.opts.drounds : 6, together = api.opts.score !== 'versus';
  const key = 'duet.' + id + '.' + total, record = +store.get(key, 0) || 0, names = [api.teams[0].name, api.teams[1].name];
  let shared = 0, k = 0; const strips = [];
  const sync = () => strips.forEach(el => { el.replaceChildren('Мы: ', h('b', null, shared), record ? ' · Рекорд пары: ' + record : ' · рекорда пока нет'); });
  const D = {
    api, total, together, names, record,
    get shared() { return shared; },
    /* очки за угаданное слово; fast — угадали быстро (+1 угадавшему) */
    award(gu, ex, fast) {
      const p = 1 + (fast ? 1 : 0);
      if (together) { shared += p; api.score(0, p); api.score(1, p); sync(); return { g: p, e: p, text: 'Общий счёт: +' + p }; }
      api.score(gu, p); api.score(ex, 1); return { g: p, e: 1, text: names[gu] + ': +' + p + ', ' + names[ex] + ': +1' };
    },
    penalty(ex) {
      if (together) { if (shared <= 0) return false; shared--; api.score(0, -1); api.score(1, -1); sync(); return true; }
      if (api.teams[ex].score <= 0) return false; api.score(ex, -1); return true;
    },
    strip() { if (!together) return null; const el = h('div', { class: 'du-strip' }); strips.push(el); sync(); return el; },
    intro(r, exVerb, guVerb, text, label, go) {
      api.show(h('div', { class: 'cover du-intro' }, h('div', { class: 'kicker' }, 'Раунд ' + r.k + ' из ' + total),
        h('div', { class: 'du-roles' },
          h('div', { class: 'du-role', style: { '--c': api.teams[r.ex].color } }, h('small', null, exVerb), h('b', null, names[r.ex])),
          h('div', { class: 'du-role', style: { '--c': api.teams[r.gu].color } }, h('small', null, guVerb), h('b', null, names[r.gu]))),
        h('p', { class: 'mid-t' }, text), D.strip(), btn(label, go, 'big', { 'data-primary': true })), { turn: r.ex, mid: true, role: exVerb });
    },
    finish() {
      if (together) {
        const nr = shared > record; if (nr) store.set(key, shared);
        api.end({ custom: true, win: shared > 0, title: nr ? 'Новый рекорд!' : shared === record && shared > 0 ? 'Повторили рекорд!' : 'Хорошая игра!',
          sub: 'Раундов: ' + total, lines: [h('p', { class: 'mid-t du-result', 'data-record': nr ? 1 : 0, 'data-shared': shared }, 'Мы: ' + pts(shared)), h('p', { class: 'mid-t muted' }, nr ? (record ? 'Прошлый рекорд пары: ' + record + '.' : 'Это первый рекорд пары.') : 'Рекорд пары: ' + record + '.')] });
      } else {
        const a = api.teams[0].score, b = api.teams[1].score, tie = a === b, w = a > b ? 0 : 1;
        api.end({ custom: true, title: tie ? 'Ничья!' : names[w] + ' побеждает!', sub: 'Раундов: ' + total,
          lines: [h('p', { class: 'mid-t du-result', 'data-score': a + ':' + b }, names[0] + ' ' + a + ' : ' + b + ' ' + names[1])] });
      }
    }
  };
  const step = () => {
    if (k >= total) return D.finish();
    const ex = k % 2, gu = 1 - ex; k++;
    playRound(D, { k, ex, gu, last: k === total, next: step });
  };
  step();
}

/* 15. Крокодил — покажи слово без слов */
{
  const items = [];
  const _seen = new Set(); for (const l in DATA.charades) for (const c in DATA.charades[l]) DATA.charades[l][c].split(',').forEach(w => { w = w.trim(); if (w && !_seen.has(w.toLowerCase())) { _seen.add(w.toLowerCase()); items.push({ l: +l, c, w }); } });
  const deck = makeDeck('charades', items);
  registerGame({
    id: 'charades', title: 'Крокодил', icon: '🐊', color: '#22c58b',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 6 }, mins: 20,
    tagline: 'Покажите слово жестами и мимикой, не произнося ни звука. Команда угадывает, пока не вышло время.',
    rules: '<ul><li>В свой ход один из команды становится актёром. Остальные в команде — угадывающие, соперники следят за честностью.</li><li>Актёр видит слово на экране, пока остальные отвернулись. Затем включается таймер.</li><li>Показывать можно жестами, мимикой и движениями. Говорить, издавать звуки и показывать на предметы с буквами нельзя.</li><li>Чем быстрее угадали, тем больше очков: от 1 до 3. Слово можно сменить два раза за ход.</li></ul><p><b>Дуэт (вдвоём):</b> роли чередуются, один показывает, второй угадывает. «Вместе» — общий счёт, цель побить рекорд пары. «Друг против друга» — угадавший получает 1 очко (+1, если угадал быстрее половины времени), показывавший 1 очко за угаданное слово. Играют первые две команды из списка.</p>',
    opts: [
      { key: 'cats', label: 'Категории слов', multi: true, values: () => [...new Set(items.map(x => x.c))], def: [] },
      { key: 'rounds', label: 'Ходов у каждой команды', values: [2, 3, 5], def: 3 },
      { key: 'time', label: 'Время на показ', values: [[45, '45 секунд'], [60, '60 секунд'], [90, '90 секунд']], def: 60 },
      { key: 'level', label: 'Сложность слов', values: [[1, 'Лёгкие'], [2, 'Средние'], [3, 'Сложные'], [0, 'Все вперемешку']], def: 2 },
      ...DUET_OPTS()
    ],
    cards: () => items.length,
    start(api) {
      const lvl = api.opts.level, cs = api.opts.cats || [], filt = x => (!lvl || x.l === lvl) && (!cs.length || cs.includes(x.c));
      if (duetOn(api)) return duetRun(api, 'charades', (D, r) => {
        const ex = r.ex, gu = r.gu; let skips = 2, card = deck.draw(filt);
        D.intro(r, 'Показывает', 'Угадывает', 'Угадывающий отворачивается от экрана: слово увидит только показывающий. Затем включится таймер, показывать нужно без звуков.', 'Показать слово', reveal);
        function reveal() {
          api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Только для ' + D.names[ex] + ' · ' + card.c), Pics.of(card.w, { size: 'l', fallback: '🎭' }), h('div', { class: 'big' }, card.w),
            h('p', { class: 'hint' }, 'Запомните слово. Говорить и издавать звуки нельзя.')),
          h('div', { class: 'row' }, btn('Запомнил — поехали!', play, 'big', { 'data-primary': true }), skips > 0 ? btn('Другое слово (' + skips + ')', () => { skips--; card = deck.draw(filt); reveal(); }, 'paper') : null)], { turn: ex, role: D.names[ex] + ' запоминает слово' });
        }
        function play() {
          const t0 = api.opts.time; let done = false; const timer = Timer(t0, { onEnd: timeUp });
          const hold = peek(h('div', { class: 'card' }, h('div', { class: 'big' }, card.w)), 'Подсмотреть слово');
          api.show([
            h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, card.c), h('div', { class: 'mid-t' }, D.names[ex] + ' показывает без звуков, ' + D.names[gu] + ' угадывает вслух.'), timer.el), D.strip(), hold,
            h('div', { class: 'row' }, btn('Угадал(а)!', guessed, 'big good', { 'data-primary': true }), skips > 0 ? btn('Пропустить (' + skips + ')', () => { skips--; timer.stop(); card = deck.draw(filt); reveal(); }, 'paper') : null)
          ], { turn: ex, role: 'Показывает слово без звуков' });
          timer.start();
          function guessed() { if (done) return; done = true; const fast = timer.left >= t0 / 2; timer.stop(); const res = D.award(gu, ex, fast); sfx.ok(); finish('Угадали! ' + res.text + '.'); }
          function timeUp() { if (done) return; done = true; sfx.buzz(); finish('Время вышло. Очков нет.'); }
        }
        function finish(msg) {
          api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Слово было'), Pics.of(card.w, { size: 'l', fallback: '🎭' }), h('div', { class: 'big' }, card.w), h('div', { class: 'mid-t' }, msg)), D.strip(),
            btn(r.last ? 'Итоги' : 'Дальше', r.next, 'big', { 'data-primary': true })], { turn: ex, role: 'Итог раунда' });
        }
      });
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const name = api.teams[ti].name; let skips = 2, card = deck.draw(filt);
        intro();
        function intro() {
          api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Ход ' + k + ' из ' + total),
            h('p', { class: 'mid-t' }, 'Выберите актёра. Все остальные отвернитесь от экрана: слово увидит только он.'),
            btn('Показать слово актёру', reveal, 'big', { 'data-primary': true })), { turn: ti, mid: true, role: 'Выбирает актёра' });
        }
        function reveal() {
          api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Только для актёра · ' + card.c), Pics.of(card.w, { size: 'l', fallback: '🎭' }), h('div', { class: 'big' }, card.w),
            h('p', { class: 'hint' }, 'Запомните слово. Говорить и издавать звуки нельзя.')),
          h('div', { class: 'row' }, btn('Запомнил — поехали!', play, 'big', { 'data-primary': true }), skips > 0 ? btn('Другое слово (' + skips + ')', () => { skips--; card = deck.draw(filt); reveal(); }, 'paper') : null)], { turn: ti, role: 'Актёр запоминает слово' });
        }
        function play() {
          const total0 = api.opts.time; let done = false; const timer = Timer(total0, { onEnd: timeUp });
          const hold = peek(h('div', { class: 'card' }, h('div', { class: 'big' }, card.w)), 'Подсмотреть слово');
          api.show([
            h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, card.c), h('div', { class: 'mid-t' }, 'Показывайте слово без звуков. Команда угадывает вслух.'), timer.el),
            hold,
            h('div', { class: 'row' }, btn('Угадали!', guessed, 'big good', { 'data-primary': true }), skips > 0 ? btn('Пропустить (' + skips + ')', () => { skips--; timer.stop(); card = deck.draw(filt); reveal(); }, 'paper') : null)
          ], { turn: ti, role: 'Показывает слово без звуков' });
          timer.start();
          function guessed() {
            if (done) return; done = true; const left = timer.left; timer.stop();
            const p = left >= total0 * .66 ? 3 : left >= total0 * .33 ? 2 : 1; api.score(ti, p); sfx.ok(); finish('Угадали! ' + name + ': +' + pts(p) + '.');
          }
          function timeUp() { if (done) return; done = true; sfx.buzz(); finish('Время вышло. Очков нет.'); }
        }
        function finish(msg) {
          api.show([h('div', { class: 'card center' }, h('div', { class: 'kicker' }, 'Слово было'), Pics.of(card.w, { size: 'l', fallback: '🎭' }), h('div', { class: 'big' }, card.w), h('div', { class: 'mid-t' }, msg)),
            btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })], { turn: ti, role: 'Итог хода' });
        }
      });
    }
  });
}
