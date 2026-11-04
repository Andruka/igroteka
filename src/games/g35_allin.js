/* 35. Ва-банк — викторина со ставками */
{
  const deck = makeDeck('quiz', DATA.quiz);
  DATA.gameArt = DATA.gameArt || {}; DATA.gameArt.allin = '🎰💰🔥';
  const LV = [null, 'Лёгкий', 'Средний', 'Сложный', 'Эксперт', 'Гроссмейстер'];
  const STAKES = [0, 100, 200, 500], START = 500, MINBET = 100;
  const DIFF = { ramp: null, all: [1, 2, 3, 4, 5], easy: [1, 2, 3], hard: [3, 4, 5] };
  const L = 'АБВГ';
  registerGame({
    id: 'allin', title: 'Ва-банк', icon: '🎰', color: '#ff6b57',
    cats: ['Викторины', 'Для компании', 'Командные'], teams: { min: 2, max: 6 }, mins: 25,
    tagline: 'Видите только тему и сложность — и тайно ставите очки. Уверены — рискуйте, сомневаетесь — ставьте поменьше. В финале ставка до всех очков.',
    rules: '<ul><li>У каждой команды в начале по <b>500 очков</b>.</li><li>В раунде все видят только тему и сложность. Команды по очереди, передавая устройство, <b>тайно</b> выбирают ставку: пас, 100, 200 или 500 очков (не больше, чем у вас есть; ставка 100 доступна всегда).</li><li>Затем каждая команда по очереди видит вопрос и отвечает за всех. Варианты у каждой команды перемешаны по-своему.</li><li>После ответов всех команд открываются результаты. Верно: <b>+ставка</b>. Неверно: <b>−ставка</b> (ниже нуля не уйти).</li><li>Последний раунд — <b>«Ва-банк»</b>: ставка любая, хоть все очки.</li></ul>',
    opts: [
      { key: 'cats', label: 'Темы', multi: true, values: () => DATA.quizCats.map(c => [c.id, c.icon + ' ' + c.name]), def: [] },
      { key: 'rounds', label: 'Раундов', values: [5, 8, 12], def: 8 },
      { key: 'diff', label: 'Сложность', values: [['ramp', 'Нарастающая'], ['all', 'Любая'], ['easy', 'Попроще'], ['hard', 'Для знатоков']], def: 'ramp' }
    ],
    cards: () => DATA.quiz.length,
    start(api) {
      const total = api.opts.rounds, sel = api.opts.cats || [], n = api.n;
      const cats = DATA.quizCats.filter(c => !sel.length || sel.includes(c.id));
      let lastCat = null;
      api.teams.forEach((t, i) => api.score(i, START));
      const nameOf = i => api.teams[i].name;
      const levelFor = k => { const d = DIFF[api.opts.diff]; if (!d) return total < 2 ? 3 : 1 + Math.round((k - 1) * 4 / (total - 1)); return d[rnd(d.length)]; };
      function pickCat(lv) {
        const okc = cats.filter(c => deck.has(x => x.c === c.id && x.l === lv));
        let pool = okc.filter(c => c.id !== lastCat); if (!pool.length) pool = okc;
        if (pool.length) return { cat: pool[rnd(pool.length)], lv };
        for (let l = 1; l <= 5; l++) { const o2 = cats.filter(c => deck.has(x => x.c === c.id && x.l === l)); if (o2.length) return { cat: o2[rnd(o2.length)], lv: l }; }
        return { cat: DATA.quizCats[0], lv: 1 };
      }
      function round(k) {
        if (k > total) return api.end();
        const fin = k === total, { cat, lv } = pickCat(levelFor(k)); lastCat = cat.id;
        const q = deck.draw(x => x.c === cat.id && x.l === lv) || deck.draw(x => x.c === cat.id);
        const bets = [], ans = [];
        const head = () => h('div', { class: 'card accent ai-head' + (fin ? ' ai-fin' : '') },
          h('div', { class: 'kicker' }, fin ? 'Финал · «Ва-банк»' : 'Раунд ' + k + ' из ' + total),
          h('div', { class: 'ai-cat' }, h('span', { class: 'ai-ico' }, cat.icon), h('span', null, cat.name)),
          h('div', { class: 'ai-lv ai-lv' + lv }, LV[lv]));
        const cap = ti => Math.max(MINBET, api.teams[ti].score);
        function betStage(ti) {
          if (ti >= n) return answerStage(0);
          handover(api, nameOf(ti), 'Тайно выберите ставку. Остальные не смотрят.', () => bet(ti), 'Выбрать ставку', ti);
        }
        function bet(ti) {
          const sc = api.teams[ti].score, mx = cap(ti);
          const set = v => { bets[ti] = v; betStage(ti + 1); };
          let body;
          if (!fin) {
            body = h('div', { class: 'ai-stakes' }, STAKES.map(v => btn(v ? String(v) : 'Пас', () => set(v), 'big ai-stake' + (v ? '' : ' paper'), v > mx ? { disabled: true } : {})));
          } else {
            let v = Math.min(mx, Math.max(0, Math.round(sc / 2 / 50) * 50)); const val = h('div', { class: 'ai-val' }), step = d => { v = Math.max(0, Math.min(mx, v + d)); val.textContent = v; };
            val.textContent = v;
            body = h('div', { class: 'stack ai-final' }, val,
              h('div', { class: 'ai-steps' }, btn('−100', () => step(-100), 'big paper'), btn('+100', () => step(100), 'big paper'), btn('Все очки', () => { v = mx; val.textContent = v; }, 'big ai-all'),
                btn('Ставка сделана', () => set(v), 'big', { 'data-primary': true })));
          }
          api.show([head(), h('div', { class: 'ai-me mid-t' }, nameOf(ti) + ': у вас ' + pts(sc) + '. ' + (fin ? 'Ставка любая, до всех очков.' : 'Сколько ставите?')), body], { turn: ti, role: 'Тайно делает ставку' });
        }
        function answerStage(ti) {
          if (ti >= n) return reveal();
          handover(api, nameOf(ti), 'Сейчас покажем вопрос. Вы отвечаете за всю команду.', () => ask(ti), 'Показать вопрос', ti);
        }
        function ask(ti) {
          const items = shuffle(q.a.map((t, i) => ({ t, ok: i === 0 }))); let chosen = -1;
          const bs = items.map((it, i) => h('button', { class: 'opt ai-opt', type: 'button', onclick: () => { chosen = i; bs.forEach((b, j) => b.classList.toggle('ai-sel', j === i)); go.disabled = false; go.setAttribute('data-primary', ''); } }, h('b', null, L[i]), h('span', null, it.t)));
          const go = btn('Ответить', () => { ans[ti] = items[chosen].ok; answerStage(ti + 1); }, 'big', { disabled: true });
          api.show([h('div', { class: 'card accent ai-q' }, h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, cat.icon + ' ' + cat.name + ' · ' + LV[lv]), h('div', { class: 'big', 'data-tts': q.q }, q.q))),
            h('div', { class: 'opts' }, bs), h('div', { class: 'ai-pad' }), h('div', { class: 'ai-go ai-sticky' }, go)], { turn: ti, role: 'Отвечает на вопрос' });
        }
        function reveal() {
          const rows = api.teams.map((t, i) => { const good = ans[i], st = bets[i]; return { i, good, st, d: good ? st : -Math.min(st, t.score) }; });
          rows.some(r => r.good) ? sfx.ok() : sfx.bad();
          rows.forEach(r => { if (r.d) api.score(r.i, r.d); });
          api.show([h('div', { class: 'card accent ai-q ai-ans' }, h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, 'Верный ответ'), h('div', { class: 'big' }, q.a[0]))),
            h('div', { class: 'ai-res' }, rows.map(r => h('div', { class: 'ai-row ' + (r.good ? 'good' : 'bad'), style: { '--c': api.teams[r.i].color } },
              h('span', { class: 'ai-rn' }, nameOf(r.i)), h('span', { class: 'ai-rb' }, 'ставка ' + r.st), h('span', { class: 'ai-rm' }, r.good ? '✓' : '✗'), h('span', { class: 'ai-rd' }, (r.d > 0 ? '+' : r.d < 0 ? '−' : '') + Math.abs(r.d))))),
            h('div', { class: 'ai-go' }, btn(fin ? 'Итоги' : 'Дальше', () => round(k + 1), 'big', { 'data-primary': true }))], { turn: -1, role: 'Результаты раунда' });
        }
        api.show([head(), h('div', { class: 'mid-t ai-me' }, 'Сначала ставки: команды по очереди выбирают тайно.'), h('div', { class: 'ai-go' }, btn('Делать ставки', () => betStage(0), 'big', { 'data-primary': true }))], { turn: -1, role: fin ? 'Финал: ва-банк' : 'Новый раунд' });
      }
      round(1);
    }
  });
}
