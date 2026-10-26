/* 14. Обезвредить — бомба и инструкция, каждая игра с новыми правилами */
{
  const COL = [
    { id: 'red', n: 'красный', g: 'красных', f: 'красная', hex: '#ff4d4d' }, { id: 'blue', n: 'синий', g: 'синих', f: 'синяя', hex: '#3aa0ff' },
    { id: 'yellow', n: 'жёлтый', g: 'жёлтых', f: 'жёлтая', hex: '#ffd23a' }, { id: 'white', n: 'белый', g: 'белых', f: 'белая', hex: '#f2f2f2' },
    { id: 'black', n: 'чёрный', g: 'чёрных', f: 'чёрная', hex: '#1a1a22' }, { id: 'green', n: 'зелёный', g: 'зелёных', f: 'зелёная', hex: '#2fd68a' }
  ];
  const LABELS = ['СТОП', 'ЖМИ', 'ПУСК', 'ДЕРЖИ'];
  const BCOL = COL.filter(c => ['red', 'blue', 'yellow', 'white'].includes(c.id));
  const ORD = ['первый', 'второй', 'третий', 'четвёртый', 'пятый', 'шестой'];
  const ORDV = ['первый', 'второй', 'третий', 'четвёртый', 'пятый', 'шестой'];

  /* условия для проводов */
  const wireConds = () => {
    const c = pick(COL), c2 = pick(COL);
    return [
      { t: 'последняя цифра серийного номера нечётная', f: b => b.serialDigit % 2 === 1 },
      { t: 'последняя цифра серийного номера чётная', f: b => b.serialDigit % 2 === 0 },
      { t: 'батареек две и больше', f: b => b.bat >= 2 },
      { t: 'батареек нет', f: b => b.bat === 0 },
      { t: 'индикатор горит', f: b => b.lit },
      { t: 'индикатор не горит', f: b => !b.lit },
      { t: 'есть ' + c.n + ' провод', f: b => b.wires.some(w => w.id === c.id), col: c },
      { t: 'нет ' + c.g + ' проводов', f: b => !b.wires.some(w => w.id === c.id) },
      { t: 'последний провод ' + c2.n, f: b => b.wires[b.wires.length - 1].id === c2.id, col: c2 },
      { t: 'ровно один ' + c.n + ' провод', f: b => b.wires.filter(w => w.id === c.id).length === 1, col: c },
      { t: 'больше одного ' + c.n + ' провода', f: b => b.wires.filter(w => w.id === c.id).length > 1 }
    ];
  };
  function genWireRules(count) {
    const conds = shuffle(wireConds()).slice(0, 3);
    const used = new Set();
    const pool = [
      { k: 'last', t: 'последний провод', f: b => b.wires.length - 1 },
      { k: 'first', t: 'первый провод', f: () => 0 },
      { k: 'second', t: 'второй провод', f: () => 1 },
      { k: 'third', t: 'третий провод', f: () => 2 },
      { k: 'prelast', t: 'предпоследний провод', f: b => b.wires.length - 2 }
    ];
    const rules = conds.map(c => {
      let a;
      if (c.col && Math.random() < .5 && !/последний провод/.test(c.t) && !used.has('col' + c.col.id)) { used.add('col' + c.col.id); a = { t: 'первый ' + c.col.n + ' провод', f: b => b.wires.findIndex(w => w.id === c.col.id) }; }
      else { const opts = shuffle(pool.filter(x => !used.has(x.k))); a = opts[0]; used.add(a.k); }
      return { c, a };
    });
    const left = shuffle(pool.filter(x => !used.has(x.k)));
    const d = left[0] || pool[0];
    return { rules, def: d };
  }
  /* правила кнопки */
  function genButtonRules() {
    const lab = pick(LABELS), col = pick(BCOL), lab2 = pick(LABELS.filter(x => x !== lab));
    const conds = shuffle([
      { t: 'на кнопке «' + lab + '»', f: b => b.btn.label === lab },
      { t: 'кнопка ' + col.f, f: b => b.btn.col.id === col.id },
      { t: 'батареек две и больше', f: b => b.bat >= 2 },
      { t: 'индикатор горит', f: b => b.lit },
      { t: 'на кнопке «' + lab2 + '»', f: b => b.btn.label === lab2 }
    ]).slice(0, 3);
    const digs = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const rules = conds.map((c, i) => ({ c, a: i === 1 ? { t: 'сразу нажмите', f: () => null } : { t: 'нажмите, когда в секундах на таймере есть цифра ' + digs[i], f: () => digs[i] } }));
    return { rules, def: { t: 'нажмите, когда в секундах на таймере есть цифра ' + digs[3], f: () => digs[3] } };
  }
  function genBomb(modules) {
    const count = pick([4, 5, 6]);
    const wires = range(count).map(() => pick(COL));
    const serial = shuffle('ABCDEFGHJKLMNPRSTUVXZ'.split('')).slice(0, 3).join('') + (10 + rnd(90)) + pick('ABCDEFGHJKLMNPRSTUVXZ'.split('')) + (1 + rnd(9));
    return { wires, bat: rnd(5), lit: Math.random() < .5, serial, serialDigit: +serial.slice(-1), btn: { label: pick(LABELS), col: pick(BCOL) }, modules };
  }
  const solveWire = (b, rs) => { const r = rs[b.wires.length].rules.find(x => x.c.f(b)); return (r ? r.a : rs[b.wires.length].def).f(b); };
  const solveBtn = (b, bs) => { const r = bs.rules.find(x => x.c.f(b)); return (r ? r.a : bs.def).f(b); };

  registerGame({
    id: 'defuse', title: 'Обезвредить', icon: '✂️', color: '#ff7ab8',
    cats: ['Для компании', 'Командные', 'Для двоих', 'Загадки и истории'], teams: { min: 1, max: 1 }, coop: true, noBoard: true, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', mins: 15,
    tagline: 'Перед вами бомба, и у вас есть инструкция. Найдите правильный провод до взрыва. Правила новые каждую игру.',
    rules: '<ul><li>На экране две страницы: <b>«Бомба»</b> и <b>«Инструкция»</b>. Таймер идёт, пока вы читаете любую из них.</li><li>Бомбу видите вы все. Читайте приметы: серийный номер, батарейки, индикатор, цвета проводов, кнопку.</li><li>В инструкции написано, какой провод перерезать и когда нажимать кнопку. Правила проверяются сверху вниз: сработало первое подходящее.</li><li>Ошибка даёт <b>промах</b>. Два промаха или конец таймера — бомба взрывается.</li><li>Инструкция меняется с каждой новой игрой, так что запомнить её наизусть не получится.</li></ul>',
    opts: [
      { key: 'bombs', label: 'Бомб', values: [3, 5, 7], def: 5 },
      { key: 'mods', label: 'Модули', values: [[1, 'Только провода'], [2, 'Провода и кнопка']], def: 2 },
      { key: 'time', label: 'Время на бомбу', values: [[90, '90 секунд'], [120, '2 минуты'], [180, '3 минуты']], def: 120 }
    ],
    cards: () => 0,
    start(api) {
      const wr = { 4: genWireRules(4), 5: genWireRules(5), 6: genWireRules(6) }, br = genButtonRules();
      const total = api.opts.bombs; let n = 0, ok = 0, boom = 0;
      next();
      function next() {
        if (n >= total) return end();
        n++;
        const b = genBomb(api.opts.mods);
        api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Бомба ' + n + ' из ' + total), h('div', { class: 'big' }, 'К бомбе!'),
          h('p', { class: 'mid-t' }, 'Время: ' + fmtTime(api.opts.time) + '. Два промаха — и бабах. Инструкция всегда под рукой.'),
          btn('Приступить', () => play(b), 'big', { 'data-primary': true }), btn('Прочитать инструкцию без таймера', () => manualOnly(b), 'paper')), { turn: -1, mid: true });
      }
      function manualPage() {
        const sec = (title, rules, def, keyword) => h('div', { class: 'card' }, h('div', { class: 'kicker' }, title),
          h('ol', { class: 'man' }, rules.map(r => h('li', null, 'Если ' + r.c.t + ', ' + r.a.t + '.')), h('li', null, 'Иначе — ' + def.t + '.')));
        return h('div', { class: 'stack' },
          h('div', { class: 'ans' }, 'Считайте провода сверху вниз. Правила проверяйте по порядку, первое подходящее и выполняйте.'),
          h('div', { class: 'mangrid' },
            sec('Если на бомбе 4 провода, перережьте:', wr[4].rules, wr[4].def),
            sec('Если на бомбе 5 проводов, перережьте:', wr[5].rules, wr[5].def),
            sec('Если на бомбе 6 проводов, перережьте:', wr[6].rules, wr[6].def),
            api.opts.mods === 2 ? sec('Кнопка:', br.rules, br.def) : null));
      }
      function manualOnly(b) {
        api.show([manualPage(), btn('Всё прочитал — к бомбе', () => play(b), 'big', { 'data-primary': true })], { turn: -1 });
      }
      function play(b) {
        let strikes = 0, wireDone = false, btnDone = b.modules === 1, over = false, tab = 'bomb';
        const rightWire = solveWire(b, wr), rightBtn = b.modules === 2 ? solveBtn(b, br) : null;
        const cut = new Set();
        const timer = Timer(api.opts.time, { onEnd: () => explode('Время вышло'), low: 15 });
        const stage = h('div', { class: 'stack' }), tabs = h('div', { class: 'seg' });
        const secs = () => Math.max(0, Math.ceil(timer.left)) % 60;
        function paint() {
          tabs.replaceChildren(
            h('button', { type: 'button', 'aria-pressed': tab === 'bomb', onclick: () => { tab = 'bomb'; paint(); } }, 'Бомба'),
            h('button', { type: 'button', 'aria-pressed': tab === 'man', onclick: () => { tab = 'man'; paint(); } }, 'Инструкция'));
          if (tab === 'man') { stage.replaceChildren(manualPage()); return; }
          const wires = b.wires.map((w, i) => h('button', {
            type: 'button', class: 'wire' + (cut.has(i) ? ' cut' : ''), disabled: over || wireDone || cut.has(i), 'aria-label': 'Провод ' + (i + 1) + ', ' + w.n,
            onclick: () => pull(i)
          }, h('span', { class: 'wn' }, i + 1), h('span', { class: 'wl', style: { background: w.hex } })));
          const bt = b.modules === 2 ? h('div', { class: 'bmod' }, h('div', { class: 'kicker' }, 'Кнопка'),
            h('button', { type: 'button', class: 'bigbtn', disabled: over || btnDone, style: { background: b.btn.col.hex, color: b.btn.col.id === 'white' || b.btn.col.id === 'yellow' ? '#111' : '#fff' }, onclick: pressBtn }, b.btn.label)) : null;
          stage.replaceChildren(
            h('div', { class: 'bombface' },
              h('div', { class: 'binfo' }, h('div', null, h('span', { class: 'kicker' }, 'Серийный номер'), h('b', { class: 'serial' }, b.serial)),
                h('div', null, h('span', { class: 'kicker' }, 'Батарейки'), h('b', null, b.bat ? '🔋'.repeat(b.bat) : 'нет')),
                h('div', null, h('span', { class: 'kicker' }, 'Индикатор'), h('b', null, b.lit ? '💡 горит' : '⚫ не горит'))),
              h('div', { class: 'bmod' }, h('div', { class: 'kicker' }, 'Провода' + (wireDone ? ' · готово' : '')), h('div', { class: 'wires' }, wires)),
              bt, btnDone && b.modules === 2 ? h('div', { class: 'okline' }, 'Кнопка: готово') : null));
        }
        function strike(msg) {
          strikes++; sfx.bad();
          if (strikes >= 2) return explode('Второй промах');
          stage.classList.add('shake'); setTimeout(() => stage.classList.remove('shake'), 500);
          info.textContent = 'Промах! ' + msg + ' Остался один шанс.'; hearts();
        }
        function pull(i) {
          if (over || wireDone) return;
          cut.add(i);
          if (i === rightWire) { wireDone = true; sfx.ok(); info.textContent = 'Провод перерезан верно.'; check(); } else { strike('Не тот провод.'); }
          paint();
        }
        function pressBtn() {
          if (over || btnDone) return;
          const need = rightBtn;
          if (need == null || secs().toString().includes(String(need))) { btnDone = true; sfx.ok(); info.textContent = 'Кнопка нажата вовремя.'; check(); }
          else strike('Нажали не вовремя.');
          paint();
        }
        function check() { if (wireDone && btnDone) defused(); }
        const info = h('div', { class: 'ans' }, 'Читайте приметы бомбы и инструкцию.'), hr = h('div', { class: 'hearts' });
        function hearts() { hr.textContent = '❤️'.repeat(2 - strikes) + '🖤'.repeat(strikes); }
        function defused() {
          if (over) return; over = true; timer.stop(); ok++; sfx.win();
          api.show(h('div', { class: 'cover' }, h('div', { class: 'big' }, 'Бомба обезврежена'), h('p', { class: 'mid-t' }, 'Осталось времени: ' + fmtTime(Math.round(timer.left)) + '. Промахов: ' + strikes + '.'), btn(n >= total ? 'Итоги' : 'К следующей бомбе', next, 'big', { 'data-primary': true })), { turn: -1, mid: true });
        }
        function explode(why) {
          if (over) return; over = true; timer.stop(); boom++; sfx.boom();
          const wi = 'Нужно было перерезать провод ' + (rightWire + 1) + ' (' + b.wires[rightWire].n + ')' + (rightBtn != null ? '; кнопку нажимать при цифре ' + rightBtn + '.' : b.modules === 2 ? '; кнопку нажимать сразу.' : '.');
          api.show(h('div', { class: 'cover boom shake' }, h('div', { class: 'bomb-big' }, '💥'), h('div', { class: 'big' }, why), h('p', { class: 'mid-t' }, wi), btn(n >= total ? 'Итоги' : 'Следующая бомба', next, 'big', { 'data-primary': true })), { turn: -1, mid: true });
        }
        api.show([h('div', { class: 'row' }, timer.el, hr), tabs, info, stage], { turn: -1 });
        hearts(); paint(); timer.start();
        onLeave(() => { over = true; });
      }
      function end() {
        const win = ok * 2 >= total;
        api.end({ win, custom: true, title: win ? 'Город спасён!' : 'Бомбы взяли своё', sub: 'Обезврежено ' + ok + ' из ' + total + '.', lines: [boom ? 'Взрывов: ' + boom + '.' : 'Ни одного взрыва!', 'Следующая игра будет с другой инструкцией и другими бомбами.'] });
      }
    }
  });
}
