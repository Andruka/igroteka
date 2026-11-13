/* Результаты на устройстве. В одном рекорде сравниваются одинаковые условия. */
const Records = {
  canonical(value) {
    if (Array.isArray(value)) return value.map(v => this.canonical(v));
    if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, this.canonical(value[key])]));
    return value;
  },
  key(game, spec) { return JSON.stringify([game, spec.metric, spec.direction || 'max', curPack(), this.canonical(spec.settings || {})]); },
  read() {
    const raw = store.get('records.v1', {}), out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const [key, row] of Object.entries(raw).slice(0, 1000)) {
      if (key.length > 1600 || !row || !G.games.some(game => game.id === row.game) || !['min', 'max'].includes(row.direction)) continue;
      if (![row.best, row.last].every(v => SaveChecks.number(v, 0, 1e9)) || !SaveChecks.int(row.plays, 1, 1000000) || !SaveChecks.text(row.label, 160) || !SaveChecks.text(row.description, 300)) continue;
      if (typeof row.unit !== 'string' || row.unit.length > 40 || !SaveChecks.number(row.at, 0, 1e15)) continue;
      out[key] = row;
    }
    return out;
  },
  format(value, unit) { return unit === 'seconds' ? Math.floor(Math.round(value) / 60) + ':' + String(Math.round(value) % 60).padStart(2, '0') : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value) + (unit ? ' ' + unit : ''); },
  submit(api, spec) {
    if (api.finished || !spec || !SaveChecks.number(spec.value, 0, 1e9) || !SaveChecks.text(spec.metric, 80) || !SaveChecks.text(spec.label, 160) || !SaveChecks.text(spec.description, 300) || !['min', 'max'].includes(spec.direction || 'max')) return null;
    const key = this.key(api.game.id, spec);
    if (key.length > 1600) return null;
    if (api.recorded.has(key)) return api.recorded.get(key);
    const all = this.read(), previous = all[key], direction = spec.direction || 'max';
    const sameRun = previous && previous.lastRun === api.sessionId;
    const improved = !previous || (direction === 'min' ? spec.value < previous.best : spec.value > previous.best);
    const packLabel = (PACKS.find(p => p[0] === curPack()) || PACKS[0])[1];
    const row = { game: api.game.id, label: spec.label, description: (spec.description + ' · ' + packLabel).slice(0, 300), direction, unit: spec.unit || '', best: improved ? spec.value : previous.best, last: spec.value, plays: sameRun ? previous.plays : Math.min(1000000, (previous ? previous.plays : 0) + 1), at: Date.now(), lastRun: api.sessionId };
    all[key] = row;
    const limited = Object.fromEntries(Object.entries(all).sort((a, b) => b[1].at - a[1].at).slice(0, 1000));
    let stored = true;
    try { localStorage.setItem('igroteka.records.v1', JSON.stringify(limited)); } catch (e) { stored = false; }
    const result = { row, value: spec.value, first: !previous, improved: !!previous && improved, previous: previous ? previous.last : null, previousBest: previous ? previous.best : null, stored };
    api.recorded.set(key, result); api.recordResults.push(result); return result;
  },
  resultNode(result) {
    const { row, value } = result;
    const delta = result.previous == null ? 0 : (row.direction === 'min' ? result.previous - value : value - result.previous);
    return h('div', { class: 'record-result', 'data-new-record': result.improved ? 'true' : 'false' },
      h('b', null, result.first ? 'Первый результат' : result.improved ? 'Новый рекорд!' : 'Результат партии'),
      h('p', null, row.label + ': ' + this.format(value, row.unit) + ' · Лучший: ' + this.format(row.best, row.unit)),
      h('small', null, row.description),
      result.previous == null ? null : h('p', null, 'Прошлая партия: ' + this.format(result.previous, row.unit) + (delta > 0 ? ' · Лучше на ' + this.format(delta, row.unit) : delta === 0 ? ' · Тот же результат' : '')),
      result.stored ? null : h('p', null, 'Не удалось записать результат на устройстве.'));
  },
  legacy() {
    const list = [];
    try {
      for (const key of Object.keys(localStorage)) {
        const short = key.replace(/^igroteka\./, ''), match = short.match(/^(duet\.([a-z]+)\.\d+|scale\.best\.\d+|tp\.rec\.\d+\.\d+\.[cf])$/);
        if (!match) continue;
        const value = JSON.parse(localStorage.getItem(key)); if (!SaveChecks.number(value, 0, 1e9)) continue;
        const game = G.games.find(game => game.id === (match[2] || (short.startsWith('scale') ? 'scale' : 'telepathy')));
        if (game) { const parts = short.split('.'); list.push(game.title + ': ' + value + (short.startsWith('tp.') ? '% · Игроков: ' + parts[2] + ' · Раундов: ' + parts[3] : ' · Раундов: ' + parts.at(-1))); }
      }
      const knowme = store.get('knowme.rec', {});
      if (knowme && typeof knowme === 'object') for (const [party, value] of Object.entries(knowme).slice(0, 50)) if (SaveChecks.number(value, 0, 100)) list.push('Кто кого знает: ' + value + '% · ' + party.slice(0, 160).replace('#', ' · Раундов: ').replaceAll('+', ', '));
    } catch (e) { }
    return list.slice(0, 100);
  },
  show() {
    leaveSession(); Music.stop(); Voice.stop();
    const all = Object.values(this.read()).filter(row => !G.games.find(game => game.id === row.game)?.hidden).sort((a, b) => b.at - a.at), list = h('div', { class: 'results-grid' });
    let limit = 20;
    const more = btn('Показать ещё', () => { limit += 20; paint(); }, 'paper');
    const select = h('select', { class: 'input', 'aria-label': 'Игра в результатах', onchange: () => { limit = 20; paint(); } }, h('option', { value: '' }, 'Все игры'), ...G.games.filter(game => all.some(row => row.game === game.id)).map(game => h('option', { value: game.id }, game.title)));
    const paint = () => {
      const rows = all.filter(row => !select.value || row.game === select.value);
      more.hidden = rows.length <= limit;
      list.replaceChildren(...(rows.length ? rows.slice(0, limit).map(row => h('article', { class: 'panel' }, h('h2', null, G.games.find(game => game.id === row.game).title), h('p', { class: 'result-best' }, row.label + ': ' + this.format(row.best, row.unit)), h('p', null, row.description), h('small', null, 'Последний: ' + this.format(row.last, row.unit) + ' · Партий: ' + row.plays))) : [h('div', { class: 'panel' }, 'Здесь появятся результаты одиночных головоломок и совместных режимов. Завершите партию, чтобы записать первый результат.')]));
    };
    const legacy = this.legacy(); paint();
    mount(h('div', { class: 'wrap progress-page' }, btn('Каталог', Home, 'ghost small'), h('h1', null, 'Результаты'), h('p', null, 'Лучшие и последние партии на этом устройстве. Рекорды сравниваются при одинаковых условиях.'), select, list, more,
      legacy.length ? h('details', { class: 'panel legacy-results' }, h('summary', null, 'Прежние результаты'), h('p', null, 'Они сохранены отдельно: часть условий в старой версии не записывалась.'), ...legacy.map(text => h('p', null, text))) : null));
  }
};
