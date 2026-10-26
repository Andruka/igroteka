/* 8. Ночное дело — совместное расследование со случайным преступником */
{
  registerGame({
    id: 'detective', title: 'Ночное дело', icon: '🔦', color: '#3aa0ff',
    cats: ['Загадки и истории', 'Для компании', 'Для двоих'], teams: { min: 1, max: 1 }, coop: true, noBoard: true, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', mins: 20,
    tagline: 'Совместное расследование. Каждый раз новое преступление, новые подозреваемые, другой виновный.',
    rules: '<ul><li>Вы — следователи. На месте происшествия пропала ценная вещь, подозреваемых несколько.</li><li>В досье видны <b>цвет одежды</b> и <b>рост</b> каждого. Остальные приметы (при себе, рука, привычка) скрыты: их узнаёте, допрашивая подозреваемого.</li><li>Каждое действие тратит одну «ночь». Можно <b>опросить свидетелей</b> (одежда, рост), <b>осмотреть место</b> (вещь, рука), <b>проверить записи камер</b> (привычка) или <b>допросить</b> подозреваемого.</li><li>Нажатием на карточку можно вычеркнуть подозреваемого, если улики ему противоречат.</li><li>Обвинить можно в любой момент. Ошиблись — преступник уходит.</li></ul>',
    opts: [{ key: 'nights', label: 'Сложность (ночей на расследование)', values: [[8, 'Лёгкая, 8'], [7, 'Средняя, 7'], [6, 'Сложная, 6']], def: 7 },
      { key: 'sus', label: 'Подозреваемых', values: [5, 6, 8], def: 6 }],
    start(api) {
      const D = DATA.det;
      const sc = pick(D.places), N = api.opts.sus;
      /* имена и профессии */
      const names = shuffle([...D.male, ...D.female]).slice(0, N), roles = shuffle(sc.roles).slice(0, N);
      const attr = (k, v) => v;
      /* преступник и «двойники» по видимым приметам */
      const culprit = { coat: pick(D.coat), height: pick(D.height), item: pick(D.item), hand: pick(D.hand), trait: pick(D.trait) };
      const sus = [];
      const sameVis = N >= 6 ? 2 : 1;
      const key = s => ['coat', 'height', 'item', 'hand', 'trait'].map(k => s[k].n).join('|');
      const mkOther = vis => {
        for (let t = 0; t < 200; t++) {
          const s = { coat: pick(D.coat), height: pick(D.height), item: pick(D.item), hand: pick(D.hand), trait: pick(D.trait) };
          const same = s.coat.n === culprit.coat.n && s.height.n === culprit.height.n;
          if (vis !== same) continue;
          if (vis) { /* двойник: отличается минимум двумя скрытыми, чтобы его можно было отличить */
            let d = 0; ['item', 'hand', 'trait'].forEach(k => { if (s[k].n !== culprit[k].n) d++; });
            if (d < 2) continue;
          }
          if (sus.some(o => key(o) === key(s)) || key(s) === key(culprit)) continue;
          return s;
        }
        return null;
      };
      sus.push(culprit);
      for (let i = 0; i < sameVis; i++) { const s = mkOther(true); if (s) sus.push(s); }
      while (sus.length < N) { const s = mkOther(false); if (!s) break; sus.push(s); }
      /* ещё нужен ли второй вариант при нехватке (маловероятно) */
      const order = shuffle(range(sus.length));
      const list = order.map((idx, i) => ({ ...sus[idx], name: names[i], role: roles[i], culprit: idx === 0, open: false, out: false }));
      const guilty = list.findIndex(s => s.culprit);
      /* очереди улик */
      const q = {
        wit: shuffle(['coat', 'height']),
        scene: shuffle(['item', 'hand']),
        cam: ['trait']
      };
      const notes = [];
      let left = api.opts.nights, flash = '', mode = 'main';
      const names2 = {
        wit: ['Опросить свидетелей', 'ask'], scene: ['Осмотреть место', 'search'], cam: ['Проверить записи камер', 'cam']
      };
      render();
      function use(src) {
        if (left <= 0) return;
        if (!q[src].length) { flash = 'Здесь больше нечего узнать.'; return render(); }
        const k = q[src].shift(); left--; notes.push(culprit[k].clue); sfx.ok(); flash = ''; render();
      }
      function ask(i) {
        const s = list[i]; if (left <= 0 && !s.open) return;
        if (!s.open) { s.open = true; left--; sfx.ok(); }
        mode = 'main'; flash = 'Допрос: ' + s.name + '. ' + pick(D.mood); render();
      }
      function accuse(i) {
        const s = list[i], right = i === guilty;
        mode = 'done';
        const used = api.opts.nights - left;
        api.end({
          win: right, title: right ? 'Дело раскрыто!' : 'Преступник ушёл',
          sub: right ? s.name + ' (' + s.role.toLowerCase() + ') задержан(а). Мотив: ' + pick(D.motive) : 'Вы обвинили ' + s.name + ', но настоящий преступник — ' + list[guilty].name + ' (' + list[guilty].role.toLowerCase() + ').',
          lines: [
            'Место: ' + sc.name + '. ' + sc.what,
            'У виновного: одежда — ' + culprit.coat.n + ', рост — ' + culprit.height.n + ', при себе — ' + culprit.item.n + ', ' + culprit.hand.n + ', ' + culprit.trait.n + '.',
            'Потрачено ночей: ' + used + ' из ' + api.opts.nights + '.'
          ]
        });
      }

      /* портрет подозреваемого: цвет одежды и рост видны сразу, предмет — после допроса */
      function avatar(s) {
        const hs = Pics.hash(s.name), skin = ['#f2c9a0', '#e0a878', '#c68b5c', '#8d5a3b', '#f6d7b8'][hs % 5], hair = ['#2b1d12', '#6b3f1d', '#c9a227', '#a33b1c', '#555', '#111'][(hs >> 3) % 6];
        const coat = { 'красный': '#e84a4a', 'синий': '#3a82e0', 'зелёный': '#2f9e6a', 'чёрный': '#262633', 'серый': '#8d93a6', 'жёлтый': '#f0b72f' }[s.coat.n];
        const sc = { 'высокий': 1, 'средний': .86, 'невысокий': .72 }[s.height.n];
        const long = (hs >> 5) % 2 === 0;
        let item = '';
        if (s.open) item = {
          'очки': '<g fill="none" stroke="#111" stroke-width="2"><circle cx="43" cy="62" r="6"/><circle cx="57" cy="62" r="6"/><path d="M49 62h2"/></g>',
          'шляпа': '<ellipse cx="50" cy="48" rx="28" ry="6" fill="#5b3a29"/><path d="M36 48c0-16 28-16 28 0z" fill="#7a4e36"/>',
          'перчатки': '<circle cx="19" cy="112" r="7" fill="#f5f5f5" stroke="#999"/><circle cx="81" cy="112" r="7" fill="#f5f5f5" stroke="#999"/>',
          'портфель': '<rect x="66" y="104" width="26" height="20" rx="3" fill="#8a5a2b"/><path d="M73 104v-4h12v4" fill="none" stroke="#5a3a1a" stroke-width="2"/>',
          'зонт': '<path d="M12 70v54" stroke="#222" stroke-width="3"/><path d="M-6 76a18 16 0 0 1 36 0z" fill="#d94b8b"/>',
          'шарф': '<path d="M36 80q14 10 28 0l4 10q-18 12-36 0z" fill="#e8d3a0" stroke="#b79a5a"/>'
        }[s.item.n] || '';
        return h('div', { class: 'avatar', html: '<svg viewBox="-10 0 120 140" role="img" aria-label="' + s.name + '"><g transform="translate(50 140) scale(' + sc + ') translate(-50 -140)">' +
          '<path d="M16 140V98q0-14 20-18h28q20 4 20 18v42z" fill="' + coat + '"/><path d="M40 80l10 14 10-14z" fill="#f5f5f5" opacity=".9"/>' +
          '<rect x="44" y="72" width="12" height="12" fill="' + skin + '"/>' +
          (long ? '<path d="M30 62c0-26 40-26 40 0v22h-8V66H38v18h-8z" fill="' + hair + '"/>' : '') +
          '<circle cx="50" cy="62" r="18" fill="' + skin + '"/>' +
          '<path d="M32 60c0-22 36-22 36 0c-6-8-30-8-36 0z" fill="' + hair + '"/>' +
          '<circle cx="43" cy="63" r="2.2" fill="#222"/><circle cx="57" cy="63" r="2.2" fill="#222"/><path d="M44 71q6 4 12 0" fill="none" stroke="#7a3b2e" stroke-width="2" stroke-linecap="round"/>' +
          item + '</g>' + (s.open ? '' : '<g><circle cx="94" cy="20" r="12" fill="#ffc233"/><text x="94" y="26" text-anchor="middle" font-size="16" font-weight="800" fill="#0e1233">?</text></g>') + '</svg>' });
      }
      function card(s, i, onclick, extra) {
        return h('button', { type: 'button', class: 'susp' + (s.out ? ' out' : '') + (extra || ''), onclick },
          avatar(s), h('b', null, s.name), h('i', null, s.role),
          h('span', null, 'Одежда: ' + s.coat.n), h('span', null, 'Рост: ' + s.height.n),
          s.open ? h('span', { class: 'open' }, 'При себе: ' + s.item.n) : h('span', { class: 'lock' }, 'При себе: ?'),
          s.open ? h('span', { class: 'open' }, 'Рука: ' + s.hand.n) : h('span', { class: 'lock' }, 'Рука: ?'),
          s.open ? h('span', { class: 'open' }, 'Привычка: ' + s.trait.n) : h('span', { class: 'lock' }, 'Привычка: ?'));
      }
      function render() {
        if (mode === 'done') return;
        if (mode === 'ask' || mode === 'accuse') {
          const isAsk = mode === 'ask';
          return api.show([
            h('div', { class: 'big' }, isAsk ? 'Кого допросить?' : 'Кого обвиняем?'),
            h('div', { class: 'suspgrid' }, list.map((s, i) => card(s, i, () => isAsk ? ask(i) : confirmBox('Обвинить: ' + s.name + '? Ошибка закончит расследование.', () => accuse(i), 'Обвинить', 'Подумаем ещё'), isAsk && s.open ? ' known' : ''))),
            btn('Назад', () => { mode = 'main'; render(); }, 'paper')
          ], { turn: -1 });
        }
        api.show([
          h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, sc.name), h('div', { class: 'mid-t' }, sc.what),
            h('div', { class: 'ans' }, 'Ночей осталось: ' + left)),
          flash ? h('div', { class: 'card' }, h('div', { class: 'mid-t' }, flash)) : null,
          notes.length ? h('div', { class: 'card' }, h('div', { class: 'kicker' }, 'Записная книжка'), h('ul', { class: 'notes' }, notes.map(n => h('li', null, n)))) : null,
          h('div', { class: 'kicker' }, 'Подозреваемые (нажмите, чтобы вычеркнуть)'),
          h('div', { class: 'suspgrid' }, list.map((s, i) => card(s, i, () => { s.out = !s.out; render(); }))),
          h('div', { class: 'row' },
            ...['wit', 'scene', 'cam'].map(src => withIco(btn(names2[src][0] + (q[src].length ? '' : ' (пусто)'), () => use(src), 'big sky', { disabled: left <= 0 || !q[src].length }), names2[src][1])),
            withIco(btn('Допросить', () => { mode = 'ask'; render(); }, 'big sky', { disabled: left <= 0 && list.every(s => s.open) }), 'ask'),
            withIco(btn('Обвинить', () => { mode = 'accuse'; render(); }, 'big bad', { 'data-primary': left <= 0 || undefined }), 'flag'))
        ], { turn: -1 });
      }
    }
  });
}
