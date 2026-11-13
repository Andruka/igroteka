/* Программа из нескольких игр; очки этапов зависят от мест, а не шкалы игры. */
const Evening = {
  live: null, storageOK: true, invalid: false,
  title(id) { const game = G.games.find(game => game.id === id); return game ? game.title + (game.hidden ? ' · архив' : '') : (id === 'crop' ? 'Что за кадром? · архив' : 'Игра'); },
  pool: ['dilemma', 'emoji', 'memory', 'quiz', 'anagram', 'fake', 'odd', 'before', 'hl', 'codebreaker', 'estimate', 'timeline', 'charades', 'taboo', 'draw', 'changes', 'snapshot'],
  collections: [
    { id: 'mix', title: 'Разнообразный вечер', description: 'Чередуем вопросы, слова и задачи на логику.' },
    { id: 'quiz', title: 'Викторины', description: 'Кино, факты, числа и события.', games: ['emoji', 'quiz', 'fake', 'odd', 'before', 'hl', 'estimate', 'timeline'] },
    { id: 'words', title: 'Слова и общение', description: 'Собираем слова, объясняем и обсуждаем.', games: ['anagram', 'charades', 'taboo', 'draw', 'emoji', 'dilemma'] },
    { id: 'logic', title: 'На логику', description: 'Ищем закономерности, запоминаем и сравниваем.', games: ['memory', 'codebreaker', 'odd', 'before', 'hl', 'estimate', 'timeline', 'changes', 'snapshot'] },
    { id: 'media', title: 'Музыка и картинки', description: 'Узнаём рисунки и мелодии, ищем изменения и запоминаем детали.', games: ['changes', 'snapshot', 'memory', 'emoji', 'odd'] }
  ],
  formatPoints(value) { return Records.format(value, Number.isInteger(value) ? plural(value, 'балл', 'балла', 'баллов') : 'балла'); },
  points(scores) { return scores.map(score => scores.filter(other => other < score).length + (scores.filter(other => other === score).length - 1) / 2); },
  options(game, minutes, n, pack) {
    const opts = {};
    for (const option of game.opts || []) {
      const values = typeof option.values === 'function' ? option.values() : option.values;
      opts[option.key] = Array.isArray(option.def) ? option.def.slice() : option.def;
      const choices = values.map(v => Array.isArray(v) ? v[0] : v);
      if (option.key === 'rounds') opts.rounds = minutes === 20 || n > 4 ? choices[0] : minutes === 60 ? choices.filter(v => +v <= 5).at(-1) || choices[0] : choices.includes(option.def) ? option.def : choices[0];
      if (option.key === 'time') opts.time = choices.find(v => +v > 0) || 0;
    }
    if (game.id === 'memory') Object.assign(opts, { mode: 'emoji', grid: minutes === 60 ? '5x4' : '4x4', theme: 'rand' });
    if (game.id === 'codebreaker') Object.assign(opts, { lvl: 'classic', rounds: 1, time: 240 });
    if (game.id === 'anagram') opts.level = 'easy';
    if (['charades', 'taboo', 'draw'].includes(game.id)) Object.assign(opts, { mode: 'duet', score: 'versus', drounds: minutes === 20 ? 4 : minutes === 40 ? 6 : 10 });
    if (pack === 'kids' && game.id === 'quiz') opts.diff = 'easy';
    return opts;
  },
  eligible(n, pack) {
    return this.pool.map(id => G.games.find(g => g.id === id)).filter(game => {
      if (!game || game.hidden || game.coop || n < game.teams.min || n > game.teams.max || (game.id === 'codebreaker' && n > 2)) return false;
      if (['charades', 'taboo', 'draw'].includes(game.id) && n !== 2) return false;
      return pack !== 'kids' || game.familySafe || (game.decks || []).some(deck => DATA.themed && DATA.themed[deck] && DATA.themed[deck].kids && DATA.themed[deck].kids.length);
    });
  },
  generate(n, minutes, pack, collection = 'mix') {
    const recipe = this.collections.find(c => c.id === collection) || this.collections[0];
    const count = { 20: 3, 40: 4, 60: 5 }[minutes], available = this.eligible(n, pack).filter(g => !recipe.games || recipe.games.includes(g.id));
    if (available.length < count) return [];
    let games = shuffle(available);
    if (recipe.id === 'mix') {
      const groups = shuffle([
        ['dilemma', 'anagram', 'charades', 'taboo', 'draw'],
        ['emoji', 'quiz', 'fake', 'before', 'hl'],
        ['memory', 'codebreaker', 'odd', 'estimate', 'timeline', 'changes', 'snapshot']
      ]).map(ids => shuffle(available.filter(g => ids.includes(g.id))));
      games = [];
      while (groups.some(group => group.length)) for (const group of groups) if (group.length) games.push(group.pop());
    }
    return games.slice(0, count).map(game => ({ game: game.id, opts: this.options(game, minutes, n, pack), status: 'pending', result: null }));
  },
  editor(stages, n, minutes, pack, change) {
    const available = this.eligible(n, pack), list = h('ol', { class: 'evening-preview evening-editor' });
    list.replaceChildren(...stages.map((stage, index) => {
      const editable = stage.status === 'pending', title = this.title(stage.game);
      if (stage.game === 'crop' || G.games.find(game => game.id === stage.game)?.hidden) return h('li', null, h('b', null, title), h('small', null, 'Результат сохранён; игра сейчас недоступна.'));
      const select = h('select', { class: 'input', 'aria-label': 'Игра этапа ' + (index + 1), disabled: !editable, onchange: e => {
        const game = available.find(g => g.id === e.target.value);
        if (!game) return;
        change(stages.map((s, i) => i === index ? { game: game.id, opts: this.options(game, minutes, n, pack), status: 'pending', result: null } : s));
      } }, ...available.filter(g => g.id === stage.game || !stages.some(s => s.game === g.id)).map(g => h('option', { value: g.id, selected: g.id === stage.game }, g.title)));
      const move = offset => { const next = stages.slice(); [next[index], next[index + offset]] = [next[index + offset], next[index]]; change(next); };
      return h('li', null, select, h('div', { class: 'row evening-order' },
        btn('↑', () => move(-1), 'paper icon small', { disabled: !editable || index === 0 || stages[index - 1].status !== 'pending', 'aria-label': 'Выше: ' + title }),
        btn('↓', () => move(1), 'paper icon small', { disabled: !editable || index === stages.length - 1 || stages[index + 1].status !== 'pending', 'aria-label': 'Ниже: ' + title })));
    }));
    return list;
  },
  editRemaining() {
    const run = this.read(); if (!run) return;
    let draft = run.stages.slice();
    const body = h('div', null, h('h2', null, 'Оставшиеся игры'), h('p', null, 'Меняйте игры и порядок этапов, которые ещё не начались.'));
    const container = h('div'); body.append(container);
    const paint = () => container.replaceChildren(this.editor(draft, run.people.length, run.minutes, run.pack, next => { draft = next; paint(); }));
    paint();
    const dialog = modal(body, [btn('Сохранить программу', () => { run.stages = draft; this.write(run); dialog.close(); this.show(); }), btn('Отмена', () => dialog.close(), 'paper')]);
  },
  valid(run) {
    if (!run || run.version !== 1 || !/^[a-z0-9-]{1,64}$/.test(run.id) || ![20, 40, 60].includes(run.minutes) || !PACKS.some(p => p[0] === run.pack)) return false;
    const c = SaveChecks;
    if (!Array.isArray(run.people) || run.people.length < 1 || run.people.length > 8 || !run.people.every(p => p && c.text(p.name, 22) && TEAM_COLORS.includes(p.color))) return false;
    if (!Array.isArray(run.stages) || run.stages.length !== { 20: 3, 40: 4, 60: 5 }[run.minutes] || new Set(run.stages.map(s => s && s.game)).size !== run.stages.length) return false;
    const allowed = this.eligible(run.people.length, run.pack).map(g => g.id); let open = false, playing = false;
    for (const stage of run.stages) {
      const archived = stage && (stage.game === 'crop' || G.games.find(game => game.id === stage.game)?.hidden) && ['done','skipped'].includes(stage.status);
      if (!stage || (!archived && !allowed.includes(stage.game)) || !['pending', 'playing', 'done', 'skipped'].includes(stage.status)) return false;
      const game = G.games.find(g => g.id === stage.game) || { opts: [] };
      if (!stage.opts || typeof stage.opts !== 'object' || Array.isArray(stage.opts)) return false;
      for (const option of game.opts || []) {
        const values = (typeof option.values === 'function' ? option.values() : option.values).map(value => Array.isArray(value) ? value[0] : value);
        const value = stage.opts[option.key];
        if (option.multi ? !Array.isArray(value) || !value.every(v => values.includes(v)) : !values.includes(value)) return false;
      }
      if (stage.status === 'done' || stage.status === 'skipped') { if (open) return false; }
      else { if (stage.status === 'playing' && (open || playing)) return false; playing = stage.status === 'playing'; open = true; }
      if (stage.status === 'done') {
        if (!stage.result || !c.array(stage.result.raw, run.people.length, v => c.number(v, -1e9, 1e9))) return false;
        const points = this.points(stage.result.raw);
        if (!c.array(stage.result.points, points.length, (v, i) => v === points[i])) return false;
      } else if (stage.result !== null) return false;
    }
    return true;
  },
  read() {
    if (this.live && this.valid(this.live)) return this.live;
    let raw;
    try { raw = localStorage.getItem('igroteka.evening.v1'); if (raw == null) return null; if (raw.length > 50000) throw new Error('size'); const run = JSON.parse(raw);
      // В прежних программах ещё не было выбора репертуара и ввода фотоответа.
      if (run && Array.isArray(run.stages)) for (const stage of run.stages) {
        if (stage && (stage.game === 'crop' || G.games.find(game => game.id === stage.game)?.hidden) && ['pending','playing'].includes(stage.status)) {
          const replacement = this.eligible(run.people?.length, run.pack).find(game => !run.stages.some(other => other.game === game.id));
          if (replacement) Object.assign(stage, { game: replacement.id, opts: this.options(replacement, run.minutes, run.people.length, run.pack), status: 'pending', result: null });
        }
        if (!stage || !['changes','snapshot','melody'].includes(stage.game) || !stage.opts || typeof stage.opts !== 'object') continue;
        const game = G.games.find(g => g.id === stage.game);
        for (const option of game?.opts || []) if (!Object.hasOwn(stage.opts, option.key)) stage.opts[option.key] = option.def;
      }
      if (!this.valid(run)) throw new Error('invalid'); this.live = run; return run; }
    catch (e) { this.invalid = raw != null; return null; }
  },
  write(run) {
    this.live = run; this.invalid = false;
    try { localStorage.setItem('igroteka.evening.v1', JSON.stringify(run)); this.storageOK = true; } catch (e) { this.storageOK = false; }
  },
  context(run, index) { return { runId: run.id, index, pack: run.pack }; },
  open() { if (this.read()) this.show(); else this.setup(); },
  setup() {
    leaveSession(); Music.stop(); Voice.stop();
    let n = clamp(Math.round(+store.get('evening.people', 2)) || 2, 1, 8), minutes = 20, pack = PACKS.some(p => p[0] === curPack()) ? curPack() : 'all', collection = 'mix', plan = [];
    const names = range(8).map(i => 'Игрок ' + (i + 1)), roster = h('div'), preview = h('div'), message = h('p', { class: 'evening-message', 'aria-live': 'polite' }), recipeNote = h('p', { class: 'evening-message' });
    const launch = btn('Начать вечер', () => {
      const people = range(n).map(i => ({ name: names[i].trim() || 'Игрок ' + (i + 1), color: TEAM_COLORS[i] }));
      if (new Set(people.map(p => p.name.toLowerCase())).size !== n) { message.textContent = 'Укажите разные имена, чтобы различать участников в итогах.'; return; }
      if (!plan.length) return;
      const run = { version: 1, id: newRunId(), minutes, pack, people, stages: plan };
      const previous = this.read();
      store.set('evening.people', n); this.write(run);
      if (previous && this.storageOK) previous.stages.forEach((stage, i) => Saves.remove(stage.game, this.context(previous, i)));
      this.start(0);
    }, 'huge', { 'data-primary': true });
    const count = h('div', { class: 'stepper' });
    const length = h('div', { class: 'seg' });
    const paintPreview = () => preview.replaceChildren(this.editor(plan, n, minutes, pack, next => { plan = next; paintPreview(); }));
    const paint = () => {
      count.replaceChildren(btn('−', () => { if (n > 1) { n--; paint(); } }, 'paper icon', { disabled: n === 1, 'aria-label': 'Меньше игроков' }), h('b', null, n), btn('+', () => { if (n < 8) { n++; paint(); } }, 'paper icon', { disabled: n === 8, 'aria-label': 'Больше игроков' }), h('span', null, plural(n, 'человек', 'человека', 'человек')));
      length.replaceChildren(...[20, 40, 60].map(value => h('button', { type: 'button', 'aria-pressed': value === minutes, onclick: () => { minutes = value; paint(); } }, '≈' + value + ' мин · ' + ({ 20: 3, 40: 4, 60: 5 }[value]) + ' ' + plural(({ 20: 3, 40: 4, 60: 5 }[value]), 'игра', 'игры', 'игр'))));
      roster.replaceChildren(...range(n).map(i => h('label', { class: 'teamrow', style: { '--c': TEAM_COLORS[i] } }, h('span', { class: 'dot' }), h('input', { class: 'input', value: names[i], maxlength: 22, 'aria-label': 'Игрок ' + (i + 1), oninput: e => { names[i] = e.target.value; } }))));
      plan = this.generate(n, minutes, pack, collection);
      paintPreview();
      recipeNote.textContent = this.collections.find(c => c.id === collection).description;
      message.textContent = plan.length ? 'Замените любую игру или поменяйте порядок стрелками. Длительность ориентировочная.' : 'В этой подборке не хватает игр для выбранных условий. Выберите другую подборку, тему или более короткий вечер.';
      launch.disabled = !plan.length;
    };
    const theme = h('select', { class: 'input', 'aria-label': 'Тема игрового вечера', onchange: e => { pack = e.target.value; paint(); } }, ...PACKS.map(([id, label]) => h('option', { value: id, selected: id === pack }, label)));
    const recipes = h('select', { class: 'input', 'aria-label': 'Подборка игр', onchange: e => { collection = e.target.value; paint(); } }, ...this.collections.map(c => h('option', { value: c.id }, c.title)));
    paint();
    mount(h('div', { class: 'wrap progress-page evening-page' }, btn('Каталог', Home, 'ghost small'), h('h1', null, 'Игровой вечер'), h('p', null, 'От одного до восьми игроков. Одна программа, общие участники и итог нескольких игр.'),
      this.invalid ? h('p', { class: 'panel' }, 'Предыдущую программу не удалось прочитать. Можно составить новую.') : null,
      h('div', { class: 'evening-columns' }, h('section', { class: 'panel dark' }, h('h2', null, 'Кто играет'), count, roster, h('h2', null, 'Сколько времени'), length, h('label', null, 'Тема вечера', theme)),
        h('section', { class: 'panel' }, h('h2', null, 'Программа'), h('label', null, 'Подборка игр', recipes), recipeNote, preview, btn('Другая программа', paint, 'paper small'), message, launch))));
  },
  start(index) {
    const run = this.read(); if (!run || index !== run.stages.findIndex(s => s.status === 'pending' || s.status === 'playing')) return this.show();
    const stage = run.stages[index], game = G.games.find(g => g.id === stage.game), context = this.context(run, index);
    stage.status = 'playing'; this.write(run); keepAwake();
    if (Saves.read(game, context).status === 'ok') Saves.resume(game, context);
    else startSession(game, run.people, { ...stage.opts }, null, { evening: context });
  },
  finish(api) {
    if (!api.evening) return false;
    const run = this.read(), { runId, index } = api.evening;
    if (!run || run.id !== runId || !run.stages[index] || run.stages[index].game !== api.game.id || run.stages[index].status !== 'playing' || api.n !== run.people.length) return !!(run && run.id === runId && run.stages[index] && run.stages[index].result && run.stages[index].result.session === api.sessionId);
    const raw = api.teams.map(t => t.score);
    run.stages[index].result = { raw, points: this.points(raw), session: api.sessionId }; run.stages[index].status = 'done'; this.write(run); return true;
  },
  newEvening() {
    const run = this.read();
    if (run && run.stages.some(s => s.status === 'pending' || s.status === 'playing')) confirmBox('Начать новый вечер? Итоги текущей программы будут заменены.', () => this.setup(), 'Новый вечер');
    else this.setup();
  },
  show() {
    leaveSession(); Music.stop(); Voice.stop(); const run = this.read(); if (!run) return this.setup();
    const index = run.stages.findIndex(s => s.status === 'pending' || s.status === 'playing'), finished = index < 0;
    const totals = run.people.map((person, i) => ({ ...person, points: run.stages.reduce((sum, stage) => sum + (stage.result ? stage.result.points[i] : 0), 0), i })).sort((a, b) => b.points - a.points);
    const done = run.stages.filter(s => s.status === 'done').length;
    const best = totals[0].points, winners = totals.filter(p => p.points === best).map(p => p.name);
    const stage = finished ? null : run.stages[index], game = stage ? G.games.find(g => g.id === stage.game) : null;
    const saved = stage ? Saves.read(game, this.context(run, index)).status === 'ok' : false;
    mount(h('div', { class: 'wrap progress-page evening-page' }, btn('Каталог', Home, 'ghost small'), h('h1', null, finished ? 'Итоги вечера' : 'Игровой вечер'),
      h('p', null, run.people.length === 1 ? 'Завершено игр: ' + done + ' из ' + run.stages.length : finished && done ? (winners.length === 1 ? winners[0] + ' побеждает!' : 'Ничья: ' + winners.join(', ')) : 'Завершено этапов: ' + done + ' из ' + run.stages.length),
      this.storageOK ? null : h('p', { class: 'panel' }, 'Не удалось сохранить программу на устройстве. До закрытия страницы итоги доступны здесь.'),
      h('ol', { class: 'evening-stages' }, ...run.stages.map((s, i) => h('li', { class: 'panel', 'data-stage': i }, h('b', null, this.title(s.game)), h('p', null, s.status === 'done' ? 'Завершено' : s.status === 'skipped' ? 'Пропущено' : i === index ? 'Следующая игра' : 'Впереди'),
        s.result ? h('p', { class: 'stage-scores' }, run.people.map((p, k) => p.name + ': ' + s.result.raw[k] + (run.people.length > 1 ? ' → ' + this.formatPoints(s.result.points[k]) : '')).join(' · ')) : null))),
      run.people.length > 1 ? h('section', { class: 'panel' }, h('h2', null, 'Общий счёт'), ...totals.map(person => h('p', { class: 'evening-total' }, h('b', null, person.name), this.formatPoints(person.points))), h('p', null, 'За каждого участника ниже вас — 1 балл. При равенстве — по половине балла за соперника с тем же результатом.')) : null,
      stage ? h('section', { class: 'panel dark' }, h('h2', null, 'Этап ' + (index + 1) + ' из ' + run.stages.length + ' · ' + game.title),
        h('p', null, saved ? 'Сохранённую партию можно продолжить.' : stage.status === 'playing' ? 'Этот этап начнётся заново. Итоги предыдущих игр сохранены.' : 'Участники и настройки уже подготовлены.'),
        h('div', { class: 'row' }, btn(saved ? 'Продолжить этап' : stage.status === 'playing' ? 'Начать этап заново' : 'Начать этап', () => this.start(index), 'big', { 'data-primary': true }),
          btn('Пропустить этап', () => confirmBox('Пропустить эту игру без турнирных баллов?', () => { Saves.remove(game.id, this.context(run, index)); stage.status = 'skipped'; stage.result = null; this.write(run); this.show(); }, 'Пропустить'), 'paper'))) : null,
      run.stages.some(s => s.status === 'pending') ? btn('Изменить оставшиеся игры', () => this.editRemaining(), 'paper') : null,
      btn('Новый вечер', () => this.newEvening(), 'paper')));
  }
};
