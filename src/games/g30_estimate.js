/* 30. Оценщик — угадайте число как можно точнее */
function estErr(q, g) { return q.t === 'y' ? Math.abs(g - q.v) : Math.abs(g - q.v) / q.v; }
function estPoints(q, e) { /* оценка одиночной команды */
  if (q.t === 'y') return e === 0 ? 5 : e <= 2 ? 3 : e <= 5 ? 2 : e <= 15 ? 1 : 0;
  return e <= .02 ? 5 : e <= .05 ? 3 : e <= .15 ? 2 : e <= .4 ? 1 : 0;
}
{
  const deck = makeDeck('estimate', DATA.estimate);
  const fmt = (v, q) => q.t === 'y' ? String(v) : Number(v).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  registerGame({
    id: 'estimate', title: 'Оценщик', icon: '📏', color: '#ffb347',
    cats: ['Викторины', 'Для компании', 'Командные', 'Для двоих'], teams: { min: 1, max: 6 }, mins: 20,
    tagline: 'Вопросы, на которые нужно ответить числом. Побеждает тот, кто ближе всех к истине: годы, высоты, расстояния и скорости.',
    rules: '<ul><li>На экране вопрос с числовым ответом: год, высота, расстояние. Никаких вариантов, только ваша оценка.</li><li>Команды по очереди тайно набирают своё число. Устройство передаётся по кругу, остальные не смотрят.</li><li>Когда все ответили, показывается верный ответ. <b>Ближе всех — 3 очка</b>, вторая по точности команда (если играет три и больше) — 1 очко. Попали почти в точку (в год — ровно, в число — с ошибкой до 2%) — ещё <b>+1 очко</b>.</li><li>Если играет одна команда, очки зависят от точности: чем ближе, тем больше.</li></ul>',
    opts: [
      { key: 'lvl', label: 'Сложность', values: [['all', 'Любая'], [1, 'Попроще'], [2, 'Средняя'], [3, 'Для знатоков']], def: 'all' },
      { key: 'rounds', label: 'Вопросов', values: [4, 6, 10], def: 6 }
    ],
    cards: () => DATA.estimate.length,
    start(api) {
      let k = 0;
      const lv = api.opts.lvl, filt = lv === 'all' ? null : (x => x.l === +lv);
      next();
      function next() {
        if (k >= api.opts.rounds) return api.end();
        k++; const q = deck.draw(filt) || deck.draw(); ask(q, 0, []);
      }
      function ask(q, i, answers) {
        if (i >= api.n) return reveal(q, answers);
        if (api.n > 1) return handover(api, api.teams[i].name, 'Вопрос ' + k + ' из ' + api.opts.rounds + '. Возьмите устройство: ответ набирается тайно.', () => enter(q, i, answers), 'Я готов', i);
        enter(q, i, answers);
      }
      function enter(q, i, answers) {
        let s = '';
        const out = h('div', { class: 'est-out', 'aria-live': 'polite' }), ok = btn('Ответить', () => { const v = parseFloat(s.replace(',', '.')); if (!isFinite(v)) return; answers.push({ i, v }); sfx.click(); ask(q, i + 1, answers); }, 'big', { 'data-primary': true, disabled: true });
        const paint = () => { out.textContent = s ? (q.t === 'y' ? s : (s.split(',')[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (s.includes(',') ? ',' + s.split(',')[1] : ''))) : '—'; ok.disabled = !s || s === ','; out.classList.toggle('dim', !s); };
        const press = d => { if (d === 'del') s = s.slice(0, -1); else if (d === ',') { if (q.t !== 'y' && !s.includes(',') && s) s += ','; } else if (s.replace(',', '').length < 10) s = (s === '0' ? '' : s) + d; sfx.click(); paint(); };
        const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', q.t === 'y' ? '' : ',', '0', 'del'].map(d => d === '' ? h('span') : h('button', { class: 'est-key' + (d === 'del' ? ' del' : ''), type: 'button', 'aria-label': d === 'del' ? 'Стереть' : d, onclick: () => press(d) }, d === 'del' ? '⌫' : d));
        api.show([
          h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Вопрос ' + k + ' из ' + api.opts.rounds + (q.u ? ' · ответ в единицах: ' + q.u : '')), h('div', { class: 'big', 'data-tts': q.q }, q.q)),
          h('div', { class: 'est-pad' }, out, h('div', { class: 'est-keys' }, keys), ok)
        ], { turn: i, role: 'Называет число', compact: true });
        paint();
      }
      function reveal(q, answers) {
        const rows = answers.map(a => ({ ...a, e: estErr(q, a.v) })).sort((a, b) => a.e - b.e);
        const best = rows[0].e, sec = rows.find(r => r.e > best);
        const pts_ = {};
        if (api.n === 1) pts_[rows[0].i] = estPoints(q, rows[0].e);
        else {
          rows.forEach(r => { pts_[r.i] = 0; });
          rows.filter(r => r.e === best).forEach(r => { pts_[r.i] += 3; });
          if (api.n >= 3 && sec) rows.filter(r => r.e === sec.e).forEach(r => { pts_[r.i] += 1; });
          rows.forEach(r => { if (q.t === 'y' ? r.e === 0 : r.e <= .02) pts_[r.i] += 1; });
        }
        const diff = r => { const d = r.v - q.v; if (d === 0) return 'точно в цель'; if (q.t === 'y') return Math.abs(d) + ' ' + plural(Math.abs(d), 'год', 'года', 'лет') + (d > 0 ? ' позже' : ' раньше'); return 'ошибка ' + (r.e * 100 < 10 ? (r.e * 100).toFixed(1).replace('.', ',') : Math.round(r.e * 100)) + '%, ' + (d > 0 ? 'больше' : 'меньше'); };
        rows.forEach(r => { if (pts_[r.i] > 0) api.score(r.i, pts_[r.i]); });
        sfx.ok();
        api.show([
          h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Верный ответ'), h('div', { class: 'big' }, fmt(q.v, q) + (q.u ? ' ' + q.u : '')), q.note ? h('p', { class: 'mid-t' }, q.note) : null),
          h('div', { class: 'est-res' }, rows.map((r, j) => h('div', { class: 'est-row' + (j === 0 ? ' best' : ''), style: { '--c': api.teams[r.i].color } }, h('span', { class: 'pn' }, api.teams[r.i].name), h('span', { class: 'pv' }, fmt(r.v, q)), h('span', { class: 'pd' }, diff(r)), h('b', { class: 'pp' }, pts_[r.i] ? '+' + pts_[r.i] : '0')))),
          btn(k >= api.opts.rounds ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true })
        ], { turn: -1, role: 'Верный ответ', compact: true });
      }
    }
  });
}
