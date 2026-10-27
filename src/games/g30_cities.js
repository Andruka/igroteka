/* 30. Города — цепочка городов по последней букве */
{
  const CITIES = [...new Set(DATA.cities)], norm = s => s.toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z]/g, '');
  const SET = new Set(CITIES.map(norm));
  const tail = c => { const t = norm(c).replace(/[ьъый]+$/, ''); return t[t.length - 1]; };
  const head = c => norm(c)[0];
  const byLetter = {}; CITIES.forEach(c => { (byLetter[head(c)] = byLetter[head(c)] || []).push(c); });
  const STARTS = 'авкмнпрсбтчелдгоуш'.split('').filter(l => byLetter[l] && byLetter[l].length > 4);
  registerGame({
    id: 'cities', title: 'Города', icon: '🏙️', color: '#4f9d4c',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 6 }, mins: 15,
    tagline: 'Называйте города по цепочке: каждый следующий начинается с последней буквы предыдущего.',
    rules: '<ul><li>Первая команда называет город на заданную букву. Следующая — город на последнюю букву предыдущего. Буквы «ь», «ъ», «ы», «й» в конце пропускаются.</li><li>Город нужно ввести на клавиатуре. Если такого города нет в базе, компания решает, засчитывать ли его.</li><li>Повторять города нельзя. Не успели или не знаете — команда выбывает. Последняя оставшаяся выигрывает раунд: 3 очка, плюс очко за каждый названный город.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Раундов', values: [1, 2, 3], def: 2 },
      { key: 'time', label: 'Время на ход', values: [[20, '20 секунд'], [30, '30 секунд'], [45, '45 секунд']], def: 30 }
    ],
    cards: () => CITIES.length,
    start(api) {
      let round = 0, first = 0;
      newRound();
      function newRound() {
        round++; if (round > api.opts.rounds) return api.end();
        let ti = first % api.n; first++;
        const used = new Set(), chain = [], out = []; let need = pick(STARTS);
        const alive = () => range(api.n).filter(i => !out.includes(i));
        const nextAlive = i => { for (let k = 1; k <= api.n; k++) { const j = (i + k) % api.n; if (!out.includes(j)) return j; } return i; };
        api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Раунд ' + round + ' из ' + api.opts.rounds), h('div', { class: 'big' }, 'Первая буква: ' + need.toUpperCase()), h('p', { class: 'mid-t' }, api.teams[ti].name + ' начинает. Введите город и нажмите Enter.'), btn('Поехали', turn, 'big', { 'data-primary': true })), { turn: ti, mid: true, role: 'Начинает цепочку' });
        function turn() {
          const name = api.teams[ti].name, timer = Timer(api.opts.time, { onEnd: () => drop('Время вышло.') });
          const inp = h('input', { class: 'input city-in', type: 'text', placeholder: 'Город на «' + need.toUpperCase() + '»', 'aria-label': 'Город', autocomplete: 'off', enterkeyhint: 'done' });
          const msg = h('div', { class: 'mid-t' }), chips = h('div', { class: 'chips' }, ...chain.slice(-6).map(c => h('span', { class: 'chip' }, c)));
          const submit = () => {
            const raw = inp.value.trim(), n = norm(raw); if (!n) return;
            if (head(raw) !== need) { sfx.bad(); msg.textContent = 'Город должен начинаться на «' + need.toUpperCase() + '».'; return; }
            if (used.has(n)) { sfx.bad(); msg.textContent = 'Этот город уже называли.'; return; }
            const pretty = CITIES.find(c => norm(c) === n) || raw[0].toUpperCase() + raw.slice(1);
            if (SET.has(n)) return accept(pretty);
            timer.stop(); confirmBox('Города «' + raw + '» нет в базе игры. Он существует и вы засчитываете его?', () => accept(pretty), 'Засчитать', 'Не засчитывать', () => { timer.start(); msg.textContent = 'Назовите другой город.'; inp.select(); });
          };
          inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
          api.show([h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Город на букву'), h('div', { class: 'big' }, need.toUpperCase()), timer.el, chips),
            h('div', { class: 'row' }, inp, btn('Ответить', submit, 'big', { 'data-primary': true })), msg,
            h('div', { class: 'row' }, btn('Не знаем город', () => drop('Команда сдаётся.'), 'paper'))], { turn: ti, role: 'Называет город' });
          timer.start(); setTimeout(() => inp.focus(), 50);
          function accept(city) { timer.stop(); used.add(norm(city)); chain.push(city); api.score(ti, 1); sfx.ok(); need = tail(city); ti = nextAlive(ti); turn(); }
          function drop(why) {
            timer.stop(); sfx.buzz(); const who = ti; out.push(who);
            const left = alive(); if (left.length <= 1) return endRound(left[0]);
            ti = nextAlive(who);
            api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, why), h('div', { class: 'big' }, name + ' выбывает'), h('p', { class: 'mid-t' }, 'Нужна буква «' + need.toUpperCase() + '». Следующий ход: ' + api.teams[ti].name + '.'), btn('Дальше', turn, 'big', { 'data-primary': true })), { turn: ti, mid: true, role: 'Следующая команда' });
          }
        }
        function endRound(w) {
          if (w != null) api.score(w, 3); sfx.ok();
          api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Раунд окончен · названо городов: ' + chain.length), h('div', { class: 'big' }, w != null ? api.teams[w].name + ' выигрывает: +3' : 'Ничья'),
            btn(round >= api.opts.rounds ? 'Итоги' : 'Следующий раунд', newRound, 'big', { 'data-primary': true })), { turn: -1, mid: true, role: 'Итог раунда' });
        }
      }
    }
  });
}
