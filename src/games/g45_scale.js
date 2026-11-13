/* 45. Шкала — по мотивам Wavelength: один видит цель на шкале и даёт подсказку, остальные ставят стрелку туда же */
{
  const SC_NS = 'http://www.w3.org/2000/svg';
  const scSvg = (tag, attrs, ...kids) => { const e = document.createElementNS(SC_NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); kids.forEach(x => e.append(x)); return e; };
  /* зоны вокруг центра цели (шкала 0..100): [полуширина, очки] */
  const SC_ZONES = [[3, 4], [8, 3], [14, 2]];
  const scPts = (target, guess) => { const d = Math.abs(target - guess); for (const [w, p] of SC_ZONES) if (d <= w) return p; return 0; };
  window.__scalePts = scPts;
  const SC_PAIRS = [
    ['горячо', 'холодно'], ['просто', 'сложно'], ['полезно', 'вредно'], ['скучно', 'захватывающе'], ['дёшево', 'дорого'], ['быстро', 'медленно'],
    ['безопасно', 'опасно'], ['романтично', 'неромантично'], ['взрослое занятие', 'детское занятие'], ['переоценено', 'недооценено'], ['тихо', 'громко'], ['сладкое', 'солёное'],
    ['здоровая еда', 'вредная еда'], ['завтрак', 'ужин'], ['редкость', 'обыденность'], ['модно', 'старомодно'], ['уютно', 'неуютно'], ['честно', 'нечестно'],
    ['смешно', 'грустно'], ['страшно', 'не страшно'], ['лёгкая работа', 'тяжёлая работа'], ['хороший фильм', 'плохой фильм'], ['умно', 'глупо'], ['для сна', 'для бодрости'],
    ['утро', 'ночь'], ['необходимость', 'роскошь'], ['мягкое', 'твёрдое'], ['острое', 'пресное'], ['горькое', 'сладкое'], ['свежее', 'залежавшееся'],
    ['хороший совет', 'плохой совет'], ['хорошая привычка', 'плохая привычка'], ['успех', 'провал'], ['скромность', 'тщеславие'], ['доверие', 'подозрение'], ['спонтанно', 'запланировано'],
    ['свидание', 'встреча по делам'], ['подарок для неё', 'подарок для него'], ['уместно на первом свидании', 'неуместно на первом свидании'], ['флирт', 'дружба'], ['ревность', 'равнодушие'], ['семейный ужин', 'ужин при свечах'],
    ['мелочь', 'катастрофа'], ['обычный день', 'особенный день'], ['маленький город', 'мегаполис'], ['жить на даче', 'жить в центре'], ['дом', 'работа'], ['отпуск', 'будни'],
    ['пляж', 'горы'], ['активный отдых', 'ленивый отдых'], ['бюджетная поездка', 'роскошная поездка'], ['безопасный район', 'опасный район'], ['туристическое место', 'место для своих'], ['лето', 'зима'],
    ['важный навык', 'бесполезный навык'], ['офисная работа', 'работа руками'], ['работа мечты', 'работа-кошмар'], ['начальник-тиран', 'начальник-друг'], ['совещание нужно', 'хватило бы письма'], ['дедлайн далеко', 'дедлайн горит'],
    ['богатство', 'бедность'], ['разумная трата', 'глупая трата'], ['инвестиция', 'расход'], ['копить', 'тратить'], ['скидка', 'наценка'], ['надёжная вещь', 'хлипкая вещь'],
    ['есть руками', 'есть вилкой'], ['сытное блюдо', 'лёгкая закуска'], ['домашняя еда', 'ресторанная еда'], ['пицца', 'салат'], ['кофе', 'чай'], ['вкусно', 'невкусно'],
    ['жирное', 'постное'], ['деликатес', 'простая еда'], ['сыр', 'колбаса'], ['хлеб', 'пирожное'], ['холодное блюдо', 'горячее блюдо'], ['повседневная еда', 'праздничная еда'],
    ['комедия', 'драма'], ['блокбастер', 'артхаус'], ['сериал', 'полнометражный фильм'], ['предсказуемый сюжет', 'неожиданный сюжет'], ['хэппи-энд', 'трагичный финал'], ['фильм для раздумий', 'фильм для отдыха'],
    ['герой', 'злодей'], ['книга лучше фильма', 'фильм лучше книги'], ['культовое кино', 'забытое кино'], ['смотреть одному', 'смотреть вместе'], ['громкая музыка', 'тихая музыка'], ['песня для вечеринки', 'песня для грусти'],
    ['рано вставать', 'поздно ложиться'], ['жаворонок', 'сова'], ['спорт', 'диван'], ['дисциплина', 'лень'], ['откладывать на потом', 'сделать сразу'], ['порядок', 'хаос'],
    ['экстраверт', 'интроверт'], ['оптимист', 'пессимист'], ['осторожность', 'риск'], ['импульсивность', 'расчётливость'], ['смелость', 'трусость'],
    ['разговорчивый', 'молчаливый'], ['гибкость', 'упрямство'], ['правда', 'ложь'], ['прощать', 'помнить обиду'], ['откровенность', 'тайна'], ['невинная ложь', 'серьёзная ложь'],
    ['время летит', 'время тянется'], ['прошлое', 'будущее'], ['свобода', 'порядок'], ['реальность', 'фантазия'], ['случайность', 'закономерность'], ['счастье', 'печаль'],
    ['простое решение', 'сложное решение'], ['маленькая победа', 'большая победа'], ['вдохновляет', 'раздражает'], ['одиночество', 'толпа'], ['мудрость', 'наивность'], ['смысл', 'бессмыслица'],
    ['технологии', 'природа'], ['телефон полезен', 'телефон мешает'], ['соцсети объединяют', 'соцсети разобщают'], ['онлайн', 'офлайн'], ['старый телефон', 'новый телефон'], ['умный дом', 'простой дом'],
    ['собака', 'кошка'], ['дикое животное', 'домашнее животное'], ['милое', 'страшное'], ['пушистое', 'колючее'], ['крупное', 'мелкое'], ['хищник', 'травоядное'],
    ['красиво', 'уродливо'], ['дорогой подарок', 'подарок от сердца'], ['праздник шумный', 'праздник тихий'], ['вечеринка до утра', 'вечер дома'], ['модный бренд', 'вещь без бренда'], ['удобно', 'красиво'],
    ['море', 'река'], ['дождь', 'солнце'], ['жара', 'мороз'], ['весна', 'осень'], ['рассвет', 'закат'], ['тёплое', 'прохладное']
  ];
  const SC_LCOL = '#2f9bff', SC_MCOL = '#9b6bff', SC_RCOL = '#ff5c7a';
  const scAng = p => Math.PI * (1 - p / 100); /* 0 -> слева, 100 -> справа */
  const scPt = (cx, cy, r, p) => [cx + r * Math.cos(scAng(p)), cy - r * Math.sin(scAng(p))];
  const scSector = (cx, cy, r1, r2, a, b) => { /* кольцевой сектор от p=a до p=b */
    const f = v => v.toFixed(2), [x1, y1] = scPt(cx, cy, r2, a), [x2, y2] = scPt(cx, cy, r2, b), [x3, y3] = scPt(cx, cy, r1, b), [x4, y4] = scPt(cx, cy, r1, a);
    return `M${f(x1)} ${f(y1)}A${r2} ${r2} 0 0 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${r1} ${r1} 0 0 0 ${f(x4)} ${f(y4)}Z`;
  };
  const SC_ZCOL = { 4: '#2fd6a0', 3: '#ffc233', 2: '#ff9a4a' };
  /* циферблат: target — число 0..100 (рисуем сектор-цель) или null; interactive — стрелку можно двигать */
  function scDial(target, interactive, onChange) {
    const cx = 100, cy = 104, R2 = 92, R1 = 52;
    const gid = 'scg' + Math.random().toString(36).slice(2, 7);
    const defs = scSvg('defs', {}, scSvg('linearGradient', { id: gid, x1: 0, y1: 0, x2: 1, y2: 0 },
      scSvg('stop', { offset: '0', 'stop-color': SC_LCOL }), scSvg('stop', { offset: '.5', 'stop-color': SC_MCOL }), scSvg('stop', { offset: '1', 'stop-color': SC_RCOL })));
    const band = scSvg('path', { d: scSector(cx, cy, R1, R2, 0, 100), fill: `url(#${gid})`, class: 'sc-band' });
    const zones = scSvg('g', { class: 'sc-zones' });
    if (target != null) {
      SC_ZONES.slice().reverse().forEach(([w, p]) => {
        zones.append(scSvg('path', { d: scSector(cx, cy, R1 - 2, R2 + 3, Math.max(0, target - w), Math.min(100, target + w)), fill: SC_ZCOL[p], class: 'sc-zone z' + p, stroke: '#0e1233', 'stroke-width': 1.2 }));
      });
    }
    const ticks = scSvg('g', { class: 'sc-ticks' });
    for (let i = 0; i <= 10; i++) { const [a, b] = scPt(cx, cy, R2 + 3, i * 10), [c, d] = scPt(cx, cy, R2 + (i % 5 ? 6 : 9), i * 10); ticks.append(scSvg('line', { x1: a, y1: b, x2: c, y2: d, stroke: '#0e1233', 'stroke-width': i % 5 ? 1 : 1.8, 'stroke-linecap': 'round', opacity: '.55' })); }
    const needle = scSvg('g', { class: 'sc-needle' }, scSvg('line', { x1: cx, y1: cy, x2: cx - (R2 + 4), y2: cy, class: 'sc-nl' }), scSvg('circle', { cx: cx - (R2 + 4), cy, r: 4.2, class: 'sc-nt' }));
    const hub = scSvg('g', {}, scSvg('circle', { cx, cy, r: 12, class: 'sc-hub' }), scSvg('circle', { cx, cy, r: 4, fill: '#fff' }));
    const svg = scSvg('svg', { viewBox: '0 0 200 116', class: 'sc-svg', 'aria-hidden': 'true', focusable: 'false' }, defs, band, zones, ticks, needle, hub);
    const wrap = h('div', { class: 'sc-dial' + (interactive ? ' sc-live' : ''), tabindex: interactive ? '0' : null, role: interactive ? 'slider' : 'img', 'aria-valuemin': interactive ? '0' : null, 'aria-valuemax': interactive ? '100' : null, 'aria-label': interactive ? 'Стрелка шкалы' : 'Шкала' }, svg);
    let guess = 50;
    const setGuess = (v, anim = true) => {
      guess = clamp(Math.round(v), 0, 100);
      needle.style.transition = anim ? '' : 'none';
      needle.style.transformOrigin = `${cx}px ${cy}px`;
      needle.style.transform = `rotate(${(guess * 1.8).toFixed(2)}deg)`; /* линия смотрит влево (0) и по часовой стрелке к правому краю (100) */
      if (interactive) wrap.setAttribute('aria-valuenow', guess);
      if (onChange) onChange(guess);
    };
    if (interactive) {
      const fromEvent = e => {
        const r = svg.getBoundingClientRect(), k = r.width / 200;
        const x = (e.clientX - r.left) / k - cx, y = (e.clientY - r.top) / k - cy;
        let a = Math.atan2(-y, x);
        if (a < 0) a = x < 0 ? Math.PI : 0; /* ниже горизонта прижимаем к ближайшему краю */
        return clamp(100 * (1 - a / Math.PI), 0, 100);
      };
      let drag = false;
      wrap.addEventListener('pointerdown', e => { drag = true; try { wrap.setPointerCapture(e.pointerId); } catch (x) { } wrap.classList.add('sc-drag'); setGuess(fromEvent(e), false); e.preventDefault(); });
      wrap.addEventListener('pointermove', e => { if (drag) setGuess(fromEvent(e), false); });
      const up = () => { drag = false; wrap.classList.remove('sc-drag'); };
      wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
      wrap.addEventListener('keydown', e => { const k = e.key, d = k === 'ArrowLeft' || k === 'ArrowDown' ? -1 : k === 'ArrowRight' || k === 'ArrowUp' ? 1 : 0; if (d) { setGuess(guess + d * (e.shiftKey ? 5 : 1)); e.preventDefault(); } });
    }
    setGuess(50, false);
    return { el: wrap, setGuess, getGuess: () => guess };
  }

  const scDeck = makeDeck('scale', SC_PAIRS);
  registerGame({
    id: 'scale', title: 'Шкала', icon: '🎚️', color: '#8f7cf5',
    cats: ['Для двоих', 'Для компании', 'Командные'], teams: { min: 2, max: 6 }, mins: 15,
    tagline: 'Один тайно видит цель на шкале между двумя крайностями и даёт одну подсказку. Остальные должны поставить стрелку точно в цель.',
    rules: '<ul><li>Под циферблатом написаны две крайности, например «горячо — холодно». На шкале спрятан цветной сектор-цель.</li><li><b>Подсказчик</b> берёт устройство, тайно смотрит на цель и говорит вслух <b>одно слово или короткую фразу</b>, которая указывает на положение цели между крайностями. Числа и позиции на шкале называть нельзя.</li><li>Затем устройство получает <b>угадывающий</b> (в режиме «Вместе» — все остальные вместе). Он поворачивает стрелку пальцем, мышью или кнопками ←/→ и жмёт «Зафиксировать».</li><li>Цель раскрывается: центр даёт <b>4 очка</b>, средняя зона <b>3</b>, внешняя <b>2</b>, мимо — 0.</li><li><b>Вместе:</b> очки копятся в общий счёт, в конце оценка вашей телепатии и рекорд. <b>Друг против друга:</b> очки получают и подсказчик, и угадавший; побеждает набравший больше.</li><li>Роли подсказчика чередуются от раунда к раунду. Вдвоём играйте без команд: просто поменяйтесь местами.</li></ul>',
    opts: [
      { key: 'mode', label: 'Режим', values: [['coop', 'Вместе'], ['vs', 'Друг против друга']], def: 'coop' },
      { key: 'rounds', label: 'Раундов', values: [[5, '5'], [8, '8'], [12, '12']], def: 8 }
    ],
    cards: () => SC_PAIRS.length,
    start(api) {
      const coop = api.opts.mode !== 'vs', N = [5, 8, 12].includes(+api.opts.rounds) ? +api.opts.rounds : 8, n = api.n;
      api.game.noScore = coop; /* в «Вместе» счёт общий и показывается на экране игры */
      let round = 0, total = 0;
      const nm = i => api.teams[i].name;
      const giverOf = r => r % n;
      const guesserOf = r => n === 2 ? 1 - giverOf(r) : (giverOf(r) + 1 + (Math.floor(r / n) % (n - 1))) % n;
      const hud = () => h('div', { class: 'sc-hud' }, h('span', null, 'Раунд ', h('b', null, round + 1), ' из ', N), coop ? h('span', { class: 'sc-total' }, 'Общий счёт: ', h('b', null, total)) : null);
      const ends = pair => h('div', { class: 'sc-ends' }, h('span', { class: 'sc-l' }, pair[0]), h('span', { class: 'sc-r' }, pair[1]));

      function next() {
        if (round >= N) return finish();
        const pair = scDeck.draw(), P = Math.random() < .5 ? [pair[1], pair[0]] : pair;
        const tg = 14 + rnd(73); /* 14..86: сектор целиком на шкале */
        const g = giverOf(round), gs = guesserOf(round);
        const gsLabel = coop ? (n === 2 ? nm(gs) : 'Все, кроме ' + nm(g)) : nm(gs);
        handover(api, nm(g), 'Подсказчик, возьмите устройство: остальные отворачиваются. Сейчас вы увидите цель на шкале.', () => giverScreen(P, tg, g, gs, gsLabel), 'Показать цель', g);
      }
      function giverScreen(P, tg, g, gs, gsLabel) {
        const d = scDial(tg, false);
        api.show(h('div', { class: 'sc-stage' }, hud(),
          h('div', { class: 'sc-card' }, d.el, ends(P)),
          h('p', { class: 'mid-t sc-hint' }, 'Цель — цветной сектор. Придумайте ОДНО слово или короткую фразу, которая укажет на неё между крайностями, и скажите вслух. Числа называть нельзя.'),
          h('div', { class: 'row center' }, btn('Подсказка сказана', () => handover(api, gsLabel, 'Угадывающие, возьмите устройство. Подсказчик ничего не показывает и не говорит.', () => guessScreen(P, tg, g, gs, gsLabel), 'Поставить стрелку', coop ? undefined : gs), 'big', { 'data-primary': true }))),
          { turn: g, role: 'Подсказчик: смотрит цель' });
      }
      function guessScreen(P, tg, g, gs, gsLabel) {
        let fixed = false;
        const d = scDial(null, true);
        const mk = (label, k, aria) => h('button', { class: 'btn sc-step', type: 'button', 'aria-label': aria, onclick: () => { if (!fixed) d.setGuess(d.getGuess() + k); } }, label);
        const fix = btn('Зафиксировать', () => { if (fixed) return; fixed = true; sfx.click(); revealScreen(P, tg, d.getGuess(), g, gs); }, 'big', { 'data-primary': true });
        api.show(h('div', { class: 'sc-stage' }, hud(),
          h('div', { class: 'sc-card' }, d.el, ends(P)),
          h('p', { class: 'mid-t sc-hint' }, 'Тяните стрелку по циферблату или подстройте кнопками.'),
          h('div', { class: 'sc-steps' }, mk('«', -5, 'Сильно влево'), mk('←', -1, 'Чуть влево'), mk('→', 1, 'Чуть вправо'), mk('»', 5, 'Сильно вправо')),
          h('div', { class: 'row center' }, fix)),
          coop ? { turn: n === 2 ? gs : -1, role: 'Угадывают', who: gsLabel } : { turn: gs, role: 'Угадывает' });
      }
      function revealScreen(P, tg, guess, g, gs) {
        const pts = scPts(tg, guess);
        const d = scDial(tg, false); d.setGuess(guess, false);
        d.el.classList.add('sc-reveal');
        const verdict = pts === 4 ? 'В яблочко!' : pts === 3 ? 'Очень близко!' : pts === 2 ? 'Рядом' : 'Мимо';
        if (coop) total += pts; else { api.score(g, pts); api.score(gs, pts); }
        if (pts === 4) sfx.win(); else if (pts) sfx.ok(); else sfx.bad();
        const last = round + 1 >= N;
        const msg = h('div', { class: 'sc-res p' + pts }, h('div', { class: 'sc-verdict' }, verdict), h('div', { class: 'sc-pts' }, pts ? '+' + pts : '0', ' ', plural(pts, 'очко', 'очка', 'очков')),
          !coop && pts ? h('div', { class: 'sc-who' }, nm(g) + ' и ' + nm(gs) + ' получают по ' + pts) : null);
        api.show(h('div', { class: 'sc-stage' }, hud(),
          h('div', { class: 'sc-card' }, d.el, ends(P)), msg,
          h('div', { class: 'row center' }, btn(last ? 'Итоги' : 'Дальше', () => { round++; next(); }, 'big', { 'data-primary': true }))),
          coop ? { turn: -1, role: 'Результат', who: 'Все вместе' } : { turn: gs, role: 'Результат' });
        if (pts >= 3) { try { fx.burst(d.el, pts === 4 ? 14 : 8); } catch (x) { } }
      }
      function finish() {
        if (!coop) return api.end({ win: true });
        const max = 4 * N, ratio = total / max;
        const record = api.record({ metric: 'together-score', label: 'Общий счёт', value: total, settings: { rounds: N, players: n }, description: 'Вместе · Раундов: ' + N + ' · Игроков: ' + n });
        const prev = record && !record.first ? record.previousBest : 0, rec = record ? record.first || record.improved : false;
        const title = ratio >= .7 ? 'Телепаты!' : ratio >= .5 ? 'Отлично!' : ratio >= .3 ? 'Хорошо!' : 'Ещё потренируйтесь';
        const lines = ['Счёт: ' + total + ' из ' + max + '.', rec ? (prev ? 'Новый рекорд! Прошлый: ' + prev + '.' : 'Рекорд установлен!') : 'Рекорд при ' + N + ' раундах: ' + prev + '.'];
        api.end({ custom: true, title, sub: '', lines, win: ratio >= .3 });
      }
      next();
    }
  });
}
