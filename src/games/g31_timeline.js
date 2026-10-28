/* 31. Хронолента — вставьте событие в правильное место на линии времени */
/* ставится ли событие с годом y между соседями: прежний год <= y <= следующий */
function tlFits(line, pos, y) { const a = line[pos - 1], b = line[pos]; return (!a || a.y <= y) && (!b || y <= b.y); }
{
  const pool = []; const seen = new Set();
  const add = (e, y) => { const k = e.toLowerCase().replace(/\s+/g, ' '); if (!seen.has(k) && isFinite(y)) { seen.add(k); pool.push({ e, y }); } };
  [DATA.before, DATA.beforeHard].forEach(arr => (arr || []).forEach(x => { add(x.a, x.ya); add(x.b, x.yb); }));
  DATA.timelineExtra.forEach(x => add(x.e, x.y));
  const deck = makeDeck('timeline', pool);
  const yr = y => y < 0 ? (-y) + ' г. до н. э.' : y + ' г.';
  registerGame({
    id: 'timeline', title: 'Хронолента', icon: '🏛️', color: '#e5b25d',
    cats: ['Викторины', 'Для компании', 'Командные', 'Для двоих'], teams: { min: 1, max: 6 }, mins: 20,
    tagline: 'Строим общую линию времени: вставьте событие на своё место, не зная его года. Чутьё на историю против хитрых карточек.',
    rules: '<ul><li>На экране линия времени: события с годами, от древних к новым. В начале на ней одно событие.</li><li>Команда получает новое событие <b>без года</b> и решает, куда его вставить: раньше, позже или между какими двумя.</li><li>Угадали место — событие остаётся на линии, а команда получает очко. Ошиблись — событие уходит, но линия показывает его настоящий год.</li><li>В трудном режиме попадаются события, близкие по времени к уже лежащим на линии: приходится знать точнее.</li></ul>',
    opts: [
      { key: 'hard', label: 'Сложность', values: [[0, 'Обычная'], [1, 'Трудная: события рядом по датам']], def: 0 },
      { key: 'rounds', label: 'Событий у каждой команды', values: [4, 6, 8], def: 5 }
    ],
    cards: () => pool.length,
    start(api) {
      const first = deck.draw(); let line = [first];
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        let card;
        if (api.opts.hard) { const near = x => line.some(l => Math.abs(l.y - x.y) <= (x.y < 1500 ? 60 : 12)) && !line.some(l => l.e === x.e); card = deck.draw(near); }
        card = card && !line.some(l => l.e === card.e) ? card : deck.draw(x => !line.some(l => l.e === x.e));
        function view(resultPos, verdict) {
          const kids = [];
          const slot = i => btn(i === 0 ? 'Раньше всего' : i === line.length ? 'Позже всего' : 'Вставить сюда', () => place(i), 'small slot', { 'aria-label': i === 0 ? 'Поставить в самое начало' : i === line.length ? 'Поставить в самый конец' : 'Поставить между «' + line[i - 1].e + '» и «' + line[i].e + '»' });
          line.forEach((x, i) => {
            if (!verdict) kids.push(slot(i));
            kids.push(h('div', { class: 'tl-card' + (resultPos === i ? ' new' : '') }, h('b', { class: 'tl-y' }, yr(x.y)), h('span', null, x.e)));
          });
          if (!verdict) kids.push(slot(line.length));
          return h('div', { class: 'tl-line' }, kids);
        }
        const msg = h('div', { class: 'mid-t' }), actions = h('div', { class: 'row' });
        const holder = h('div'); holder.append(view());
        function place(pos) {
          const ok = tlFits(line, pos, card.y); let showPos = -1;
          if (ok) { line.splice(pos, 0, card); showPos = pos; sfx.ok(); api.score(ti, api.opts.hard ? 2 : 1); msg.textContent = 'Верно! ' + yr(card.y) + ': событие встало на своё место.' + (api.opts.hard ? ' +2 очка.' : ' +1 очко.'); }
          else { sfx.bad(); const right = line.findIndex(x => x.y > card.y); const rp = right < 0 ? line.length : right; const a = line[rp - 1], b = line[rp]; msg.textContent = 'Не туда. Событие произошло в ' + yr(card.y) + (a || b ? ': ' + (a && b ? 'между «' + a.e + '» и «' + b.e + '»' : a ? 'после «' + a.e + '»' : 'до «' + b.e + '»') : '') + '.'; }
          holder.replaceChildren(view(showPos, true)); cardBox.classList.add(ok ? 'good' : 'bad'); yearEl.textContent = yr(card.y); yearEl.classList.remove('hidden');
          actions.replaceChildren(btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true }));
        }
        const yearEl = h('div', { class: 'tl-year hidden' }), cardBox = h('div', { class: 'card accent tl-new' }, h('div', { class: 'kicker' }, 'Событие ' + k + ' из ' + total + ' · куда его вставить?'), h('div', { class: 'big', 'data-tts': card.e }, card.e), yearEl);
        api.show([cardBox, msg, holder, actions], { turn: ti, role: 'Ставит событие на линию' });
      });
    }
  });
}
