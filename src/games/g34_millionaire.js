/* 34. Миллионер — лестница из 15 вопросов, у каждой команды своя */
{
  const deck = makeDeck('millionaire', DATA.quiz);
  const PRIZE = [100, 200, 300, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000];
  const SAFE = [5, 10];
  const LV = [null, 'Лёгкий', 'Средний', 'Сложный', 'Эксперт', 'Гроссмейстер'];
  const lvOf = i => Math.floor(i / 3) + 1;
  const fmt = n => String(n).replace(/\B(?=(\d{3})+$)/g, ' ');
  const pc = n => fmt(n) + ' очк.';
  const safeSum = k => { const s = SAFE.filter(x => x <= k).pop(); return s ? PRIZE[s - 1] : 0; };   /* k = число верных ответов */
  const sumOf = k => k ? PRIZE[k - 1] : 0;
  /* шанс, что зал знает верный ответ, по уровню сложности */
  const CHANCE = [0, .85, .7, .55, .4, .3];
  function crowd(n, cnt, lvl) {
    const hit = Math.random() < CHANCE[lvl] + .08;
    let good = hit ? CHANCE[lvl] * 100 + 15 + rnd(20) : 10 + rnd(25);
    good = Math.max(8, Math.min(95, Math.round(good)));
    const w = Array(cnt).fill(0), wr = w.map((_, i) => i).filter(i => i !== n); let left = 100 - good;
    wr.forEach((i, j) => { const v = j === wr.length - 1 ? left : Math.min(left, rnd(Math.max(1, Math.round(left * (hit ? .6 : .9))) + 1)); w[i] = v; left -= v; });
    w[n] = good; return w;
  }
  registerGame({
    id: 'millionaire', title: 'Миллионер', icon: '💰', color: '#ffc233',
    cats: ['Викторины', 'Для компании', 'Командные'], teams: { min: 1, max: 8 }, mins: 25,
    tagline: 'Лестница из 15 вопросов: от лёгких до уровня «Гроссмейстер». Рискуйте ради миллиона или вовремя забирайте деньги.',
    rules: '<ul><li>Каждая команда проходит свою лестницу из 15 вопросов, сложность растёт: 1–3 лёгкие, 13–15 для гроссмейстеров.</li><li>Нажмите на вариант, затем нажмите ещё раз — это окончательный ответ.</li><li>Ошиблись — игра команды окончена, вы получаете последнюю <b>несгораемую сумму</b> (после 5-го и 10-го вопроса).</li><li>Между вопросами можно нажать «Забрать» и сохранить всё, что набрано.</li><li>Подсказки, по одной на команду: <b>50:50</b> убирает два неверных ответа, <b>Помощь зала</b> показывает мнение зала — оно не всегда верно, особенно в сложных вопросах.</li><li>Очки команды — сумма на момент остановки. Побеждает самая богатая команда.</li></ul>',
    opts: [
      { key: 'cats', label: 'Темы', multi: true, values: () => DATA.quizCats.map(c => [c.id, c.icon + ' ' + c.name]), def: [] },
      { key: 'time', label: 'Время на ответ', values: [[0, 'Без таймера'], [30, '30 секунд'], [60, '60 секунд']], def: 0 }
    ],
    cards: () => DATA.quiz.length,
    start(api) {
      const sel = api.opts.cats || [];
      const draw = lvl => deck.draw(x => x.l === lvl && (!sel.length || sel.includes(x.c))) || deck.draw(x => x.l === lvl);
      const help = api.teams.map(() => ({ f: true, a: true }));
      let ti = -1;
      const nextTeam = () => { ti++; if (ti >= api.n) return api.end(); intro(); };
      function intro() {
        const t = api.teams[ti];
        api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Лестница команды'), h('div', { class: 'big' }, t.name),
          h('p', { class: 'mid-t' }, '15 вопросов. Несгораемые суммы: ' + pc(PRIZE[4]) + ' и ' + pc(PRIZE[9]) + '.'),
          btn('Начать', () => ask(0), 'big', { 'data-primary': true })), { mid: true, turn: ti, role: 'Идёт к миллиону' });
      }
      function finish(k, kind, q) {
        const got = kind === 'take' ? sumOf(k) : kind === 'win' ? PRIZE[14] : safeSum(k);
        if (got) api.score(ti, got);
        const msg = kind === 'win' ? 'Миллион! Лестница пройдена.' : kind === 'take' ? 'Деньги забраны.' : (kind === 'time' ? 'Время вышло. ' : 'Неверно. ') + (got ? 'Несгораемая сумма сохранена.' : 'Несгораемой суммы не было.');
        const last = ti === api.n - 1;
        api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, api.teams[ti].name), h('div', { class: 'big' }, got ? '+' + pc(got) : 'Ничего'),
          h('p', { class: 'mid-t' }, msg + (q && kind !== 'take' && kind !== 'win' ? ' Верный ответ: ' + q.a[0] + '.' : '')),
          btn(last ? 'Итоги' : 'Дальше', nextTeam, 'big', { 'data-primary': true })), { mid: true, turn: ti, role: 'Лестница окончена' });
      }
      function ask(k) {
        const lvl = lvOf(k), q = draw(lvl), H = help[ti]; let done = false, picked = -1; const gone = new Set();
        const items = shuffle(q.a.map((t, i) => ({ t, ok: i === 0 })));
        const okI = items.findIndex(x => x.ok), letters = 'АБВГ';
        const info = h('div', { class: 'mil-info' }, '');
        const timer = api.opts.time ? Timer(api.opts.time, { onEnd: () => { if (!done) lose(-1, 'time'); } }) : null;
        const bs = items.map((it, i) => h('button', { class: 'opt', type: 'button', onclick: () => tap(i) }, h('b', null, letters[i]), h('span', null, it.t)));
        const lock = () => { bF.disabled = !H.f; bA.disabled = !H.a; };
        const unpick = () => { picked = -1; bs.forEach(b => b.classList.remove('picked')); info.textContent = ''; };
        const bF = btn('50:50', () => { if (done) return; H.f = false; const w = items.map((_, i) => i).filter(i => i !== okI && !gone.has(i)); shuffle(w).slice(0, 2).forEach(i => { gone.add(i); bs[i].classList.add('gone'); bs[i].disabled = true; }); if (picked >= 0 && gone.has(picked)) unpick(); lock(); }, '');
        const bA = btn('Помощь зала', () => {
          if (done) return; H.a = false; const alive = items.map((_, i) => i).filter(i => !gone.has(i)), w = crowd(okI, items.length, lvl);
          const rest = alive.reduce((s, i) => s + w[i], 0);
          alive.forEach(i => { const p = Math.round(w[i] / rest * 100); bs[i].append(h('i', { class: 'mil-bar', style: { width: p + '%' } }), h('em', { class: 'mil-pct' }, p + '%')); });
          info.textContent = 'Зал проголосовал.'; lock();
        }, '');
        const bT = k ? btn('Забрать ' + pc(sumOf(k)), () => { if (done) return; done = true; if (timer) timer.stop(); sfx.ok(); finish(k, 'take'); }, 'good') : null;
        const acts = h('div', { class: 'mil-actions' }, bF, bA, bT);
        lock();
        function tap(i) {
          if (done) return;
          if (picked !== i) { picked = i; bs.forEach((b, j) => b.classList.toggle('picked', j === i)); info.textContent = 'Нажмите ещё раз — окончательный ответ'; return; }
          if (i !== okI) return lose(i, 'wrong');
          done = true; if (timer) timer.stop(); bs.forEach(b => b.disabled = true);
          sfx.ok(); bs[i].classList.add('right', 'flash-good'); try { fx.burst(bs[i]); } catch (e) {}
          if (k === 14) return void api.delay(() => finish(15, 'win'), 700);
          info.textContent = 'Верно! Вы выиграли ' + pc(PRIZE[k]);
          const nb = btn('Дальше', () => ask(k + 1), 'big', { 'data-primary': true }); acts.replaceChildren(nb); nb.focus();
        }
        function lose(i, why) {
          done = true; if (timer) timer.stop(); sfx.bad();
          bs.forEach((b, j) => { b.disabled = true; b.classList.remove('picked'); b.classList.toggle('right', j === okI); if (j === i) b.classList.add('wrong', 'shake'); else if (j !== okI) b.classList.add('dim'); });
          info.textContent = why === 'time' ? 'Время вышло!' : 'Неверно!';
          const nb = btn('Дальше', () => finish(k, why, q), 'big', { 'data-primary': true }); acts.replaceChildren(nb); nb.focus();
        }
        api.show([
          h('div', { class: 'mil-ladder' }, PRIZE.map((_, i) => h('span', { class: (SAFE.includes(i + 1) ? 'safe ' : '') + (i < k ? 'done' : i === k ? 'cur' : '') }, i + 1))),
          h('div', { class: 'mil-prize' }, h('span', null, 'Вопрос ' + (k + 1) + ' из 15 · ' + LV[lvl]), h('b', null, pc(PRIZE[k])), h('small', null, 'Несгораемая: ' + (safeSum(k) ? pc(safeSum(k)) : 'нет'))),
          h('div', { class: 'card accent mil-q' }, h('div', { class: 'kicker' }, (DATA.quizCats.find(c => c.id === q.c) || {}).name || ''), h('div', { class: 'big', 'data-tts': q.q }, q.q), timer ? timer.el : null),
          h('div', { class: 'mil-opts', 'data-tts': items.map((it, i) => 'Вариант ' + letters[i] + '. ' + it.t).join('. ') }, bs), info, acts
        ], { turn: ti, role: 'Играет на ' + pc(PRIZE[k]) });
        if (timer) timer.start();
      }
      nextTeam();
    }
  });
}
