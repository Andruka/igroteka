/* 29. Ассоциации — цепочка слов на скорость */
{
  const deck = makeDeck('assoc', DATA.assocSeeds);
  registerGame({
    id: 'assoc', title: 'Ассоциации', icon: '🔗', color: '#e0508f',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 8 }, mins: 15,
    tagline: 'Цепочка слов: называйте то, что приходит в голову после предыдущего. Замешкался или повторился — выбываешь.',
    rules: '<ul><li>На экране появляется первое слово. Первая команда называет слово-ассоциацию к нему вслух, следующая — ассоциацию к ней, и так по кругу.</li><li>Повторять уже названное нельзя. Если команда не успела или повторилась, она теряет жизнь.</li><li>Нажимайте «Назвали» или «Не вышло» — решает вся компания. Последняя оставшаяся команда выигрывает раунд: 3 очка. Предпоследняя получает 1.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Раундов', values: [2, 3, 5], def: 3 },
      { key: 'time', label: 'Время на слово', values: [[6, '6 секунд'], [10, '10 секунд'], [15, '15 секунд']], def: 10 },
      { key: 'lives', label: 'Жизней у команды', values: [1, 2, 3], def: 2 }
    ],
    cards: () => DATA.assocSeeds.length,
    start(api) {
      let round = 0, first = 0;
      newRound();
      function newRound() {
        round++; if (round > api.opts.rounds) return api.end();
        const seed = deck.draw(), lives = range(api.n).map(() => api.opts.lives), out = [];
        let ti = first % api.n, count = 0; first++;
        const alive = () => range(api.n).filter(i => lives[i] > 0);
        const nextAlive = i => { for (let k = 1; k <= api.n; k++) { const j = (i + k) % api.n; if (lives[j] > 0) return j; } return i; };
        api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Раунд ' + round + ' из ' + api.opts.rounds), h('div', { class: 'kicker' }, 'Первое слово'), h('div', { class: 'big', 'data-tts': seed }, seed),
          h('p', { class: 'mid-t' }, api.teams[ti].name + ' начинает: назовите ассоциацию к этому слову.'), btn('Поехали', turn, 'big', { 'data-primary': true })), { turn: ti, mid: true, role: 'Начинает цепочку' });
        function turn() {
          const timer = Timer(api.opts.time, { onEnd: () => miss('Время вышло.') }), name = api.teams[ti].name;
          const livesEl = h('div', { class: 'lives' }, ...range(api.n).map(i => h('span', { class: 'lv' + (lives[i] > 0 ? '' : ' out'), style: { '--c': api.teams[i].color } }, api.teams[i].name + ' ' + (lives[i] > 0 ? '♥'.repeat(lives[i]) : '✕'))));
          api.show([h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Цепочка: ' + count + ' ' + plural(count, 'слово', 'слова', 'слов')), h('div', { class: 'big' }, count ? 'Ассоциация к последнему слову' : 'Ассоциация к слову «' + seed + '»'), timer.el), livesEl,
            h('div', { class: 'row' }, btn('Назвали', ok, 'big good', { 'data-primary': true }), btn('Не вышло', () => miss('Повтор или не нашли слово.'), 'big bad'))], { turn: ti, role: 'Называет ассоциацию' });
          timer.start();
          function ok() { timer.stop(); count++; sfx.ok(); ti = nextAlive(ti); turn(); }
          function miss(why) {
            timer.stop(); sfx.buzz(); const who = ti; lives[who]--;
            if (lives[who] <= 0) out.push(who);
            const left = alive();
            if (left.length <= 1) return endRound(left[0]);
            ti = nextAlive(who);
            api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, why), h('div', { class: 'big' }, name + (lives[who] > 0 ? ': осталось ' + '♥'.repeat(lives[who]) : ' выбывает')),
              btn('Дальше', turn, 'big', { 'data-primary': true })), { turn: ti, mid: true, role: 'Следующая команда' });
          }
        }
        function endRound(w) {
          const second = out[out.length - 1];
          if (w != null) api.score(w, 3); if (second != null && api.n > 2) api.score(second, 1);
          sfx.ok();
          api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Раунд окончен · цепочка из ' + count), h('div', { class: 'big' }, w != null ? api.teams[w].name + ' выигрывает: +3' : 'Ничья'), second != null && api.n > 2 ? h('p', { class: 'mid-t' }, api.teams[second].name + ': +1 за второе место.') : null, btn(round >= api.opts.rounds ? 'Итоги' : 'Следующий раунд', newRound, 'big', { 'data-primary': true })), { turn: -1, mid: true, role: 'Итог раунда' });
        }
      }
    }
  });
}
