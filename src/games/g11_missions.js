/* 11. Секретные задания — открытые испытания и тайные миссии на весь вечер */
{
  const MTAG = { 'Ловкость': '🤹', 'Голос и слова': '🎤', 'Тело и движение': '🕺', 'Творчество': '🎨', 'Память и внимание': '🧠', 'Команда': '🤝', 'Юмор': '😜', 'Логика': '🧩' };
  const open = makeDeck('missions', DATA.missions), secrets = makeDeck('secrets', DATA.secrets);
  registerGame({
    id: 'missions', title: 'Секретные задания', icon: '🕶️', color: '#2fd6a0',
    cats: ['Для компании', 'Командные', 'Для двоих'], teams: { min: 2, max: 8 }, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', mins: 20,
    tagline: 'Открытые испытания с таймером или тайные миссии, которые нужно выполнить незаметно для остальных.',
    rules: '<ul><li><b>Открытые испытания.</b> Игрок получает задание и таймер. Остальные судят, получилось или нет. Выполнено — 2 очка. Задание можно один раз заменить.</li><li><b>Тайные миссии.</b> Каждый по очереди смотрит своё задание (зажав кнопку, пока другие не смотрят). Затем начинается обычное общение. Всем нужно выполнить свою миссию так, чтобы никто не понял.</li><li>Когда время выйдет, каждый признаётся в своей миссии, а остальные решают, засчитать ли её. Миссия — 3 очка.</li></ul>',
    opts: [
      { key: 'mode', label: 'Режим', values: [['open', 'Открытые испытания'], ['secret', 'Тайные миссии']], def: 'open' },
      { key: 'rounds', label: 'Испытаний у каждого (открытые)', values: [2, 3, 5], def: 3 },
      { key: 'mins', label: 'Время вечера (тайные)', values: [[5, '5 минут'], [10, '10 минут'], [20, '20 минут']], def: 10 }
    ],
    cards: () => DATA.missions.length + DATA.secrets.length,
    start(api) { api.opts.mode === 'secret' ? secretMode(api) : openMode(api); }
  });

  function openMode(api) {
    rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
      const name = api.teams[ti].name; let swapped = false, card = open.draw();
      announce();
      function announce() {
        api.show([
          h('div', { class: 'card accent withpic' }, Pics.of(card.q, { size: 'xl', fallback: MTAG[card.t] || '🎯' }), h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, 'Ход ' + k + ' из ' + total + ' · ' + card.t), h('div', { class: 'big' }, name), h('div', { class: 'mid-t' }, card.q), h('div', { class: 'ans' }, 'На выполнение: ' + card.s + ' с'))),
          h('div', { class: 'row' }, btn('Старт!', go, 'big', { 'data-primary': true }), swapped ? null : btn('Заменить задание', () => { swapped = true; card = open.draw(); announce(); }, 'paper'))
        ], { turn: ti });
      }
      function go() {
        const timer = Timer(card.s, { onEnd: () => { sfx.buzz(); } });
        api.show([
          h('div', { class: 'card accent withpic' }, Pics.of(card.q, { size: 'l', fallback: MTAG[card.t] || '🎯' }), h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, name + ' · ' + card.t), h('div', { class: 'mid-t' }, card.q), timer.el)),
          judgeRow(api, 'Остальные решают: получилось?', 'Получилось (+2)', ok => { timer.stop(); if (ok) { api.score(ti, 2); sfx.ok(); } else sfx.bad(); after(ok); }, 'Не вышло')
        ], { turn: ti });
        timer.start();
      }
      function after(ok) {
        api.show(h('div', { class: 'cover' }, h('div', { class: 'big' }, ok ? name + ': +2 очка' : 'В этот раз не вышло'), btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })), { turn: ti, mid: true });
      }
    });
  }

  function secretMode(api) {
    const mis = range(api.n).map(() => secrets.draw());
    deal(0);
    function deal(i) {
      if (i >= api.n) return party();
      handover(api, api.teams[i].name, 'Возьмите устройство и отвернитесь от остальных. Прочитайте миссию и запомните её.', () => {
        api.show([
          h('div', { class: 'card' }, h('div', { class: 'kicker' }, 'Секретная миссия · ' + api.teams[i].name), peek(h('div', { class: 'card withpic' }, Pics.of(mis[i], { size: 'l', fallback: '🕶️' }), h('div', { class: 'qbody' }, h('div', { class: 'big' }, mis[i]))), 'Зажмите, чтобы прочитать')),
          btn(i === api.n - 1 ? 'Запомнил — к вечеру' : 'Запомнил — передать дальше', () => deal(i + 1), 'big', { 'data-primary': true })
        ], { turn: i });
      }, 'Показать миссию');
    }
    function party() {
      const timer = Timer(api.opts.mins * 60, { onEnd: () => { sfx.buzz(); reveal(0); }, quiet: true });
      api.show([
        h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Идёт вечер'), h('div', { class: 'big' }, 'Общайтесь как обычно'),
          h('p', { class: 'mid-t' }, 'Тихо выполняйте свои миссии. Не раскрывайте их и не просите прямо. Когда таймер закончится, признавайтесь.'), timer.el),
        btn('Закончить досрочно', () => { timer.stop(); reveal(0); }, 'paper')
      ], { turn: -1 });
      timer.start();
    }
    function reveal(i) {
      if (i >= api.n) return api.end();
      api.show([
        h('div', { class: 'card accent withpic' }, Pics.of(mis[i], { size: 'l', fallback: '🕶️' }), h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, 'Признание'), h('div', { class: 'big' }, api.teams[i].name), h('div', { class: 'mid-t' }, 'Миссия: ' + mis[i]))),
        judgeRow(api, 'Остальные решают: миссия выполнена и осталась незамеченной?', 'Засчитать (+3)', ok => { if (ok) { api.score(i, 3); sfx.ok(); } else sfx.bad(); reveal(i + 1); }, 'Не засчитывать')
      ], { turn: i });
    }
  }
}
