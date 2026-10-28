/* 33. Мафия — приложение ведёт игру: роли, ночь и утро. Ведущий не нужен */
/* победитель по числу живых: 'mafia' | 'town' | null */
function mfWinner(players) {
  const alive = players.filter(p => p.alive), m = alive.filter(p => p.role === 'mafia').length, o = alive.length - m;
  if (m === 0) return 'town'; if (m >= o) return 'mafia'; return null;
}
/* распределение ролей: число мафиози и особые роли */
function mfRoles(n, special) {
  const m = n <= 6 ? 1 : n <= 9 ? 2 : 3;
  const roles = Array(m).fill('mafia'); if (special >= 1) roles.push('sheriff'); if (special >= 2 && n >= 6) roles.push('doctor');
  while (roles.length < n) roles.push('civ');
  return shuffle(roles);
}
/* жертва ночи: среди самых частых выборов мафии случайный; null — если никто не выбрал */
function mfPickVictim(votes) {
  if (!votes.length) return null; const c = {}; votes.forEach(v => { c[v] = (c[v] || 0) + 1; }); const mx = Math.max(...Object.values(c));
  const top = Object.keys(c).filter(k => c[k] === mx).map(Number); return top[rnd(top.length)];
}
{
  const ROLE = {
    mafia: { n: 'Мафия', ico: '🔪', d: 'Ночью вы вместе с остальной мафией выбираете жертву. Днём изображайте мирного и не выдайте себя.' },
    sheriff: { n: 'Комиссар', ico: '🕵️', d: 'Каждую ночь вы проверяете одного игрока и узнаёте, мафия он или нет. Днём аккуратно используйте знания.' },
    doctor: { n: 'Доктор', ico: '🩺', d: 'Каждую ночь вы лечите одного игрока. Если мафия выберет его, он выживет. Нельзя лечить одного и того же два раза подряд.' },
    civ: { n: 'Мирный житель', ico: '🙂', d: 'Ночью вы спите. Днём вычисляйте мафию и голосуйте.' }
  };
  registerGame({
    id: 'mafia', title: 'Мафия', icon: '🌙', color: '#8a7dff',
    cats: ['Для компании', 'Загадки и истории'], teams: { min: 5, max: 12 }, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', mins: 45,
    tagline: 'Город засыпает — просыпается мафия. Приложение само раздаёт роли, ведёт ночь и объявляет утро, ведущий не нужен.',
    rules: '<ul><li>Каждый втайне получает роль: <b>мафия</b>, <b>комиссар</b>, <b>доктор</b> или <b>мирный житель</b>. Мафия знает друг друга.</li><li><b>Ночью</b> устройство идёт по кругу: каждый живой игрок берёт его и делает выбор. У всех экран выглядит одинаково, поэтому по поведению роль не узнать. Мафия выбирает жертву, комиссар проверяет игрока, доктор лечит, мирные нажимают на любого — ничего не меняется.</li><li><b>Утром</b> приложение объявляет, кто погиб. Если доктор спас жертву, никто не погибает.</li><li><b>Днём</b> все обсуждают и голосуют вслух: кого изгнать. Приложение записывает решение.</li><li>Мирные побеждают, когда вся мафия изгнана. Мафия побеждает, когда её не меньше, чем остальных.</li></ul>',
    opts: [
      { key: 'special', label: 'Особые роли', values: [[2, 'Комиссар и доктор'], [1, 'Только комиссар'], [0, 'Только мафия и мирные']], def: 2 },
      { key: 'reveal', label: 'Роль выбывшего', values: [[1, 'Открывать'], [0, 'Скрывать']], def: 1 },
      { key: 'time', label: 'Обсуждение днём', values: [[120, '2 минуты'], [180, '3 минуты'], [300, '5 минут'], [0, 'Без таймера']], def: 180 }
    ],
    cards: () => 0,
    start(api) {
      const n = api.n, special = +api.opts.special, reveal = +api.opts.reveal === 1;
      const roles = mfRoles(n, special), P = api.teams.map((t, i) => ({ i, name: t.name, role: roles[i], alive: true }));
      let night = 0, lastSaved = -1;
      const alive = () => P.filter(p => p.alive), nm = i => P[i].name;
      const grid = (list, onPick, o = {}) => h('div', { class: 'mf-grid' }, list.map(p => h('button', { class: 'mf-pick', type: 'button', style: { '--c': api.teams[p.i].color }, disabled: o.disabled && o.disabled(p) ? true : null, onclick: () => onPick(p) }, h('span', { class: 'dot' }), p.name, o.mark && o.mark(p) ? h('i', null, o.mark(p)) : null)));
      /* 1. раздача ролей */
      deal(0);
      function deal(k) {
        if (k >= n) return nightIntro();
        handover(api, nm(k), 'Раздача ролей: возьмите устройство и посмотрите свою роль. Остальные не смотрят на экран.', () => {
          const me = P[k], mates = P.filter(p => p.role === 'mafia' && p.i !== k);
          api.show([
            h('div', { class: 'card center mf-role' }, h('div', { class: 'kicker' }, 'Ваша роль'), h('div', { class: 'mf-ico' }, ROLE[me.role].ico), h('div', { class: 'big' }, ROLE[me.role].n), h('p', { class: 'mid-t' }, ROLE[me.role].d),
              me.role === 'mafia' && mates.length ? h('p', { class: 'mid-t' }, 'Ваши сообщники: ' + mates.map(p => p.name).join(', ') + '.') : null),
            btn(k === n - 1 ? 'Запомнил — начинаем' : 'Запомнил — передать дальше', () => deal(k + 1), 'big', { 'data-primary': true })
          ], { turn: k, role: 'Смотрит роль' });
        }, 'Я готов', k);
      }
      /* 2. ночь */
      function nightIntro() {
        night++;
        api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Ночь ' + night), h('div', { class: 'big' }, 'Город засыпает'), h('p', { class: 'mid-t' }, 'Все закрыли глаза и опустили головы. Устройство пойдёт по кругу: каждый живой игрок берёт его, делает выбор и передаёт следующему. Говорить нельзя.'),
          btn('Начать ночь', () => nightTurn(0, { votes: [], heal: -1 }), 'big', { 'data-primary': true })), { mid: true, turn: -1, role: 'Ночь', who: 'Все спят' });
      }
      function nightTurn(k, st) {
        const order = alive(); if (k >= order.length) return morning(st);
        const me = order[k];
        handover(api, me.name, 'Ночь ' + night + '. Возьмите устройство: все остальные не смотрят.', () => {
          let target = -1; const done = h('div'), body = h('div', { class: 'stack' }), msg = h('div', { class: 'mid-t' });
          const prompt = me.role === 'mafia' ? 'Выберите жертву. Если мафиози выбрали разных, жертву определит жребий.' : me.role === 'sheriff' ? 'Выберите игрока, которого проверяете: вы узнаете, мафия он или нет.' : me.role === 'doctor' ? 'Выберите, кого лечить этой ночью.' + (lastSaved >= 0 && P[lastSaved].alive ? ' Игрока «' + nm(lastSaved) + '» вы лечили в прошлую ночь, повторно нельзя.' : '') : 'Вы спите. Выберите, кому вы доверяете: ничего не изменится, но так все экраны выглядят одинаково.';
          const list = order.filter(p => me.role === 'doctor' ? true : p.i !== me.i);
          const can = p => me.role === 'mafia' ? p.role === 'mafia' : me.role === 'doctor' ? p.i === lastSaved : false;
          const paintPick = () => {
            body.replaceChildren(h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Ночной выбор'), h('div', { class: 'big' }, 'Выберите игрока'), h('p', { class: 'mid-t' }, prompt)),
              grid(list, p => { target = p.i; paintConfirm(); }, { disabled: can, mark: p => me.role === 'mafia' && p.role === 'mafia' ? '🔪' : '' }));
          };
          const paintConfirm = () => {
            body.replaceChildren(h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Ночной выбор'), h('div', { class: 'big' }, nm(target)), h('p', { class: 'mid-t' }, 'Подтвердить выбор?')),
              h('div', { class: 'row center' }, btn('Подтвердить', () => finish(), 'big', { 'data-primary': true }), btn('Изменить', paintPick, 'paper')));
          };
          const finish = () => {
            if (me.role === 'mafia') st.votes.push(target); else if (me.role === 'doctor') st.heal = target;
            const res = me.role === 'sheriff' ? h('div', { class: 'card accent center' }, h('div', { class: 'kicker' }, 'Результат проверки'), h('div', { class: 'big' }, nm(target)), h('p', { class: 'mid-t' }, P[target].role === 'mafia' ? 'Это МАФИЯ.' : 'Это не мафия.')) : h('div', { class: 'card accent center' }, h('div', { class: 'kicker' }, 'Ночной выбор'), h('div', { class: 'big' }, 'Выбор принят'), h('p', { class: 'mid-t' }, 'Теперь закройте экран и передайте устройство дальше.'));
            api.show([res, btn(k === order.length - 1 ? 'Передать — наступает утро' : 'Скрыть и передать дальше', () => nightTurn(k + 1, st), 'big', { 'data-primary': true })], { turn: me.i, role: 'Ночной выбор' });
          };
          paintPick();
          api.show([body], { turn: me.i, role: 'Ночной выбор' });
        }, 'Я готов', me.i);
      }
      /* 3. утро */
      function morning(st) {
        const v = mfPickVictim(st.votes); let text, died = null;
        if (v === null) text = 'Мафия этой ночью никого не выбрала.';
        else if (v === st.heal) text = 'Мафия выбрала жертву, но доктор спас её. Этой ночью никто не погиб.';
        else { died = P[v]; died.alive = false; text = 'Этой ночью был убит игрок «' + died.name + '».' + (reveal ? ' Его роль: ' + ROLE[died.role].n + '.' : ''); }
        lastSaved = st.heal >= 0 && P.some(p => p.alive && p.role === 'doctor') ? st.heal : -1;
        sfx.ok(); if (died) sfx.bad();
        const w = mfWinner(P);
        api.show([h('div', { class: 'card accent center' }, h('div', { class: 'kicker' }, 'Утро ' + night), h('div', { class: 'big', 'data-tts': text }, text)), w ? h('p', { class: 'mid-t' }, 'Игра окончена.') : aliveBox(), btn(w ? 'Итоги' : 'К обсуждению', () => w ? finishGame(w) : day(), 'big', { 'data-primary': true })], { turn: -1, role: 'Утро', who: 'Город просыпается' });
      }
      const aliveBox = () => h('div', { class: 'mf-alive' }, h('div', { class: 'kicker' }, 'В игре: ' + alive().length + ' из ' + n), h('div', { class: 'mf-chips' }, P.map(p => h('span', { class: 'mf-chip' + (p.alive ? '' : ' dead'), style: { '--c': api.teams[p.i].color } }, p.alive ? '' : '✕ ', p.name))));
      /* 4. день и голосование */
      function day() {
        let timer = null;
        if (+api.opts.time) timer = Timer(+api.opts.time, { onEnd: () => { sfx.buzz(); } });
        api.show([h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'День ' + night), h('div', { class: 'big' }, 'Обсуждение'), h('p', { class: 'mid-t' }, 'Спорьте, задавайте вопросы, ищите мафию. Потом проголосуйте вслух.'), timer ? timer.el : null), aliveBox(), btn('К голосованию', () => { if (timer) timer.stop(); vote(); }, 'big', { 'data-primary': true })], { turn: -1, role: 'Обсуждение', who: 'Весь город' });
        if (timer) timer.start();
      }
      function vote() {
        let target = -2;
        const body = h('div', { class: 'stack' });
        const paintPick = () => body.replaceChildren(h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Голосование'), h('div', { class: 'big' }, 'Кого изгоняем?'), h('p', { class: 'mid-t' }, 'Проголосуйте вслух. Выберите того, за кого больше всего рук.')),
          grid(alive(), p => { target = p.i; paintConfirm(); }), btn('Никого не изгонять', () => { target = -1; paintConfirm(); }, 'paper'));
        const paintConfirm = () => body.replaceChildren(h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Подтвердите'), h('div', { class: 'big' }, target < 0 ? 'Никого не изгонять' : 'Изгнать: ' + nm(target))), h('div', { class: 'row center' }, btn('Подтвердить', outcome, 'big', { 'data-primary': true }), btn('Изменить', paintPick, 'paper')));
        function outcome() {
          let text; if (target < 0) text = 'Город не пришёл к решению: сегодня никто не изгнан.';
          else { P[target].alive = false; text = 'Город изгнал игрока «' + nm(target) + '».' + (reveal ? ' Его роль: ' + ROLE[P[target].role].n + '.' : ''); sfx.bad(); }
          const w = mfWinner(P);
          api.show([h('div', { class: 'card accent center' }, h('div', { class: 'kicker' }, 'Итог голосования'), h('div', { class: 'big', 'data-tts': text }, text)), w ? null : aliveBox(), btn(w ? 'Итоги' : 'Наступает ночь', () => w ? finishGame(w) : nightIntro(), 'big', { 'data-primary': true })], { turn: -1, role: 'Итог голосования', who: 'Весь город' });
        }
        paintPick(); api.show([body], { turn: -1, role: 'Голосование', who: 'Весь город' });
      }
      function finishGame(w) {
        const win = w === 'town'; P.filter(p => (p.role === 'mafia') === !win).forEach(p => api.score(p.i, 1));
        api.end({ custom: true, win: true, title: win ? 'Победа мирных жителей!' : 'Победа мафии!', sub: win ? 'Вся мафия найдена и изгнана.' : 'Мафии стало не меньше, чем остальных.',
          lines: [h('div', { class: 'mf-final' }, P.map(p => h('div', { class: 'mf-row' + (p.alive ? '' : ' dead'), style: { '--c': api.teams[p.i].color } }, h('span', { class: 'pn' }, p.name), h('span', { class: 'pr' }, ROLE[p.role].ico + ' ' + ROLE[p.role].n), h('span', { class: 'ps' }, p.alive ? 'жив' : 'выбыл'))))] });
      }
    }
  });
}
