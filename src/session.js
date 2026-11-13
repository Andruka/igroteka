/* Время партии: пауза останавливает отсчёт и отложенные игровые действия. */
const GameClock = (() => {
  let active = false, origin = 0, pausedAt = 0, epoch = 0;
  const holds = new Set(), jobs = new Set();
  const now = () => active ? (holds.size ? pausedAt : performance.now()) - origin : performance.now();
  const schedule = job => {
    clearTimeout(job.timer);
    if (!active || holds.size || !jobs.has(job)) return;
    job.timer = setTimeout(() => {
      if (!active || holds.size || !jobs.delete(job)) return;
      job.fn();
    }, Math.max(0, job.due - now()));
  };
  const stop = () => { active = false; holds.clear(); jobs.forEach(job => clearTimeout(job.timer)); jobs.clear(); epoch++; };
  return {
    start() { stop(); active = true; origin = performance.now(); }, stop, now,
    hold() {
      if (!active) return () => {};
      const token = {}, generation = epoch;
      if (!holds.size) { pausedAt = performance.now(); jobs.forEach(job => clearTimeout(job.timer)); }
      holds.add(token);
      return () => {
        if (generation !== epoch || !holds.delete(token)) return;
        if (!holds.size) { origin += performance.now() - pausedAt; jobs.forEach(schedule); }
      };
    },
    delay(fn, ms = 0) { const job = { fn, due: now() + Math.max(0, ms), timer: null }; jobs.add(job); schedule(job); return job; },
    cancel(job) { if (job) { jobs.delete(job); clearTimeout(job.timer); } },
    remaining(job) { return job && jobs.has(job) ? Math.max(0, job.due - now()) : 0; },
    get paused() { return holds.size > 0; }
  };
})();

const SaveChecks = {
  int: (value, min, max) => Number.isInteger(value) && value >= min && value <= max,
  number: (value, min, max) => Number.isFinite(value) && value >= min && value <= max,
  array: (value, length, check) => Array.isArray(value) && value.length === length && value.every(check),
  text: (value, max = 1000) => typeof value === 'string' && value.length > 0 && value.length <= max
};
const Saves = {
  key: id => 'igroteka.save.' + id,
  read(game) {
    if (!game.saveVersion) return { status: 'none' };
    let raw;
    try {
      raw = localStorage.getItem(this.key(game.id));
      if (raw == null) return { status: 'none' };
      if (raw.length > 500000) return { status: 'invalid' };
      const save = JSON.parse(raw), t = game.teams || { min: 2, max: 8 };
      if (!save || save.version !== 1 || save.game !== game.id || save.gameVersion !== game.saveVersion || !save.opts || !save.state) return { status: 'invalid' };
      if (!Array.isArray(save.teams) || save.teams.length < (game.coop ? 1 : t.min) || save.teams.length > (game.coop ? 1 : t.max)) return { status: 'invalid' };
      if (!save.teams.every(team => team && SaveChecks.text(team.name, 22) && TEAM_COLORS.includes(team.color) && SaveChecks.number(team.score, -1e9, 1e9))) return { status: 'invalid' };
      for (const option of game.opts || []) {
        const values = (typeof option.values === 'function' ? option.values() : option.values).map(v => Array.isArray(v) ? v[0] : v);
        const value = save.opts[option.key];
        if (option.multi ? !Array.isArray(value) || !value.every(v => values.includes(v)) : !values.includes(value)) return { status: 'invalid' };
      }
      if (!game.validateSave(save.state, save.opts, save.teams)) return { status: 'invalid' };
      return { status: 'ok', data: save };
    } catch (e) { return { status: raw == null ? 'none' : 'invalid' }; }
  },
  write(game, teams, opts, state) {
    try {
      localStorage.setItem(this.key(game.id), JSON.stringify({ version: 1, game: game.id, gameVersion: game.saveVersion, at: Date.now(), teams, opts, state }));
      return true;
    } catch (e) { return false; }
  },
  remove(id) { try { localStorage.removeItem(this.key(id)); return true; } catch (e) { return false; } },
  resume(game) {
    const saved = this.read(game);
    if (saved.status === 'ok') { keepAwake(); startSession(game, saved.data.teams, saved.data.opts, saved.data.state); }
    else { const m = modal(h('p', { class: 'mid-t' }, 'Не удалось прочитать сохранение. Начните новую партию в меню игры.'), [btn('В меню игры', () => { m.close(); Intro(game); })]); }
  },
  control(game, onDelete) {
    const saved = this.read(game);
    if (saved.status === 'none') return null;
    return h('div', { class: 'save-entry' },
      h('span', null, saved.status === 'ok' ? 'Есть незавершённая партия' : 'Сохранение повреждено или создано другой версией игры.'),
      h('div', { class: 'row' }, saved.status === 'ok' ? btn('Продолжить', () => this.resume(game), 'good') : null,
        btn('Удалить сохранение', () => confirmBox('Удалить сохранённую партию?', () => { this.remove(game.id); onDelete(); }, 'Удалить'), 'paper small')),
      saved.status === 'ok' ? h('small', null, 'Кнопка «Играть» начнёт новую партию.') : null);
  }
};

function leaveSession() {
  if (G.api) { G.api.save(); G.api.stopSave(); }
  G.api = null; G.inSession = false; GameClock.stop(); hiddenPause = null;
}
let hiddenPause = null;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenPause = hiddenPause || GameClock.hold(); if (G.api) G.api.save(); }
  else if (hiddenPause) { if (G.inSession && G.api && !G.api.finished) G.api.pause(); hiddenPause(); hiddenPause = null; }
});
window.addEventListener('pagehide', () => { if (G.api) G.api.save(); });
