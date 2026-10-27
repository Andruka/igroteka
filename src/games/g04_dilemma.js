/* 4. Дилеммы — угадай, что выберет другой игрок */
{
  const deck = makeDeck('dilemma', DATA.dilemmas);
  registerGame({
    id: 'dilemma', title: 'Дилеммы', icon: '⚖️', color: '#9a6bff',
    cats: ['Для двоих', 'Для компании'], teams: { min: 2, max: 8 }, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', unitTitle: 'Кто играет', mins: 20,
    tagline: 'Выбор из двух вариантов. Один отвечает по-настоящему, остальные угадывают, что он выберет.',
    rules: '<ul><li>В каждом раунде один игрок «в центре». Ему показывают дилемму: вариант А или вариант Б.</li><li>Остальные <b>угадывают</b> его выбор: на счёт «три» показывают пальцами 1 (А) или 2 (Б).</li><li>Затем игрок в центре нажимает свой настоящий выбор, а вы отмечаете, кто угадал.</li><li>Угадавшие получают по очку. Игрок в центре тоже получает очки за тех, кто ошибся: до двух.</li><li>В конце — по желанию — объясните свой выбор. Спорить можно и нужно.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Раз в центре у каждого', values: [2, 3, 5], def: 3 },
      { key: 'kind', label: 'Какие дилеммы', values: [['', 'Любые'], ['f', 'Весёлые'], ['h', 'Сложный выбор']], def: '' }
    ],
    cards: () => DATA.dilemmas.length,
    start(api) {
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const d = deck.draw(x => !api.opts.kind || x.k === api.opts.kind);
        const flip = Math.random() < .5, A = flip ? d.b : d.a, B = flip ? d.a : d.b;
        const name = api.teams[ti].name;
        const vs = (onPick, sel) => {
          /* у двух вариантов не должно быть одной и той же главной картинки */
          const fa = Pics.find(A, 3), fb = Pics.find(B, 3), shared = fa.filter(e => fb.includes(e));
          const order = (l, o) => l.filter(e => !shared.includes(e)).concat(l.filter(e => shared.includes(e)));
          let ea = order(fa), eb = order(fb);
          if (ea[0] && ea[0] === eb[0]) eb = ['💭', ...eb.slice(0, 1)];
          const pics = { 'А': ea, 'Б': eb };
          const mk = (cls, letter, text) => {
            const pic = Pics.sticker(pics[letter].slice(0, 2), { size: 'l', flat: true, key: text, fallback: letter === 'А' ? '💭' : '🤔' });
            return onPick
              ? h('button', { class: 'vsopt ' + cls, type: 'button', onclick: () => onPick(letter) }, h('b', null, letter), pic, h('span', { class: 'vt' }, text))
              : h('div', { class: 'vsopt ' + cls + (sel && sel !== letter ? ' dim' : '') + (sel === letter ? ' sel' : '') }, h('b', null, letter), pic, h('span', { class: 'vt' }, text));
          };
          return h('div', { class: 'vs', 'data-tts': 'Вариант А. ' + A + '. Или вариант Б. ' + B }, mk('a', 'А', A), h('div', { class: 'vs-or' }, 'или'), mk('b', 'Б', B));
        };
        const others = range(api.n).filter(i => i !== ti);
        step1();
        function step1() {
          api.show([
            turnHead(api, ti, 'Раунд ' + k + ' из ' + total + '. Что выберет ' + name + '?'),
            vs(),
            h('p', { class: 'mid-t' }, (others.length === 1 ? api.teams[others[0]].name + ', на' : 'Остальные, на') + ' счёт «три» покажите пальцами: 1 — вариант А, 2 — вариант Б.'),
            btn('Угадали — показываем выбор', step2, 'big', { 'data-primary': true })
          ], { turn: ti, role: 'Остальные угадывают выбор игрока' });
        }
        function step2() {
          api.show([
            turnHead(api, ti, name + ', каков ваш настоящий выбор?'),
            vs(letter => step3(letter))
          ], { turn: ti, role: 'Делает настоящий выбор' });
        }
        function step3(choice) {
          const right = new Set();
          const picks = h('div', { class: 'picks' });
          const paint = () => picks.replaceChildren(...others.map(i => {
            const on = right.has(i);
            const pb = btn(api.teams[i].name, () => { on ? right.delete(i) : right.add(i); paint(); }, 'big pick', { style: { '--c': api.teams[i].color, opacity: on ? 1 : .55 } }); if (on) pb.prepend(ico('check')); return pb;
          }));
          paint();
          api.show([
            turnHead(api, ti, name + ' выбрал(а) вариант ' + choice + '.'),
            vs(null, choice),
            h('div', { class: 'stack' }, h('div', { class: 'mid-t' }, 'Кто угадал? Нажмите на тех, кто показал такой же вариант.'), picks),
            btn('Готово', () => done(choice, right), 'big', { 'data-primary': true })
          ], { turn: ti, role: 'Сделал(а) выбор — проверяем догадки' });
        }
        function done(choice, right) {
          right.forEach(i => api.score(i, 1));
          const wrong = others.length - right.size, bonus = Math.min(2, wrong);
          if (bonus) api.score(ti, bonus);
          sfx.ok();
          api.show([
            turnHead(api, ti, 'Угадали: ' + right.size + ' из ' + others.length + (bonus ? '. ' + name + ' получает ' + pts(bonus) + ' за тех, кто ошибся.' : '.')),
            vs(null, choice),
            h('div', { class: 'card' }, h('div', { class: 'mid-t' }, 'А теперь объясните свой выбор. Остальные могут задать по одному вопросу.')),
            btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })
          ], { turn: ti, role: 'Объясняет свой выбор' });
        }
      });
    }
  });
}
