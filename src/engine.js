/* ===================== Игротека: движок ===================== */
const DATA = {};
const G = { games: [], sessionSeen: new Set() };

/* ---------- утилиты ---------- */
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const sample = (a, k) => shuffle(a).slice(0, k);
const range = n => Array.from({ length: n }, (_, i) => i);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fmtTime = s => { s = Math.max(0, Math.ceil(s)); return s >= 60 ? Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') : String(s); };
const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, d = m % 10; return (m > 10 && m < 20) ? c : d === 1 ? a : (d >= 2 && d <= 4) ? b : c; };

function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') { for (const s in v) s.startsWith('--') ? el.style.setProperty(s, v[s]) : (el.style[s] = v[s]); }
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? (k.startsWith('aria-') ? 'true' : '') : v);
  }
  for (const kid of kids.flat(Infinity)) { if (kid == null || kid === false) continue; el.append(kid.nodeType ? kid : document.createTextNode(String(kid))); }
  return el;
}

/* ---------- хранилище ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('igroteka.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('igroteka.' + k, JSON.stringify(v)); } catch (e) { } },
  clearSeen() { try { Object.keys(localStorage).filter(k => k.startsWith('igroteka.seen.')).forEach(k => localStorage.removeItem(k)); } catch (e) { } }
};

/* ---------- колоды без повторов, темы вечера, скрытые карточки ---------- */
const PACKS = [['all', 'Обычный вечер', '🎲'], ['ny', 'Новый год', '🎄'], ['bday', 'День рождения', '🎂'], ['kids', 'Для детей', '🧸'], ['corp', 'Корпоратив', '💼'], ['friends', 'Для друзей', '🍻']];
const curPack = () => G.api && G.api.evening ? G.api.evening.pack : store.get('pack', 'all');
let LAST = null, pendingDecks = [];
const itemKey = it => typeof it === 'string' ? it : it && typeof it.id === 'string' ? 'id:' + it.id : JSON.stringify(it);
const legacyItemKey = it => it && typeof it.id === 'string' && Array.isArray(it.a) ? JSON.stringify({ c: it.c, l: it.l, q: it.q, a: it.a }) : itemKey(it);
function describeItem(it) { if (it && typeof it === 'object' && !Array.isArray(it) && typeof it.q === 'string') return it.q + (Array.isArray(it.a) ? ' → ' + it.a[0] : typeof it.a === 'string' ? ' → ' + it.a : ''); if (it && it.fake) return it.topic + ': ' + it.fake; if (it && it.w) return it.w + (it.m ? ' = ' + it.m : '');
  const o = []; (function w(v) { if (v == null) return; if (Array.isArray(v)) v.forEach(w); else if (typeof v === 'object') Object.values(v).forEach(w); else o.push(String(v)); })(it); return o.join(' · '); }
function makeDeck(name, base) {
  const key = 'seen.' + name, bkey = 'bad.' + name; pendingDecks.push(name);
  const themed = (DATA.themed && DATA.themed[name]) || {};
  const items = [], tags = [], dupKey = new Set();
  /* одинаковые слова (без учёта регистра и ё) в колоде не держим: иначе одно слово выпадет дважды за вечер */
  const wkey = it => { const w = typeof it === 'string' ? it : (it && typeof it.w === 'string' ? it.w : null); return w == null ? null : String(w).toLowerCase().replace(/ё/g, 'е').trim(); };
  const add = (it, tag) => { const k = wkey(it); if (k != null) { if (dupKey.has(k)) return; dupKey.add(k); } items.push(it); tags.push(tag); };
  base.forEach(it => add(it, null));
  for (const p in themed) themed[p].forEach(it => add(it, p));
  const ok = (i, flt, P, bad) => (!flt || flt(items[i])) && (P === 'all' ? !tags[i] : P === 'kids' ? tags[i] === 'kids' : (!tags[i] || tags[i] === P)) && !bad.has(itemKey(items[i])) && !bad.has(legacyItemKey(items[i]));
  const pool = (flt, P) => { const bad = new Set(store.get(bkey, [])), r = []; items.forEach((it, i) => { if (ok(i, flt, P, bad)) r.push(i); }); return r; };
  const deck = {
    name, items, themed,
    draw(filter) {
      let p = pool(filter, curPack()); if (!p.length) p = pool(filter, 'all'); if (!p.length) p = items.map((_, i) => i).filter(i => !filter || filter(items[i]));
      if (!p.length) return null;
      const seen = new Set(store.get(key, []).filter(value => typeof value === 'string')), ss = G.sessionSeen, sk = i => name + '|' + itemKey(items[i]);
      /* «свежее» = не выпадало ни раньше, ни в этой игровой сессии; когда кончилось — сначала сбрасываем старую историю, но не сессионную */
      let fresh = p.filter(i => !seen.has(itemKey(items[i])) && !ss.has(sk(i)));
      if (!fresh.length) { p.forEach(i => seen.delete(itemKey(items[i]))); fresh = p.filter(i => !ss.has(sk(i))); }
      if (!fresh.length) { p.forEach(i => ss.delete(sk(i))); fresh = p; }
      const P = curPack(); if (P !== 'all' && P !== 'kids') { const th = fresh.filter(j => tags[j] === P); if (th.length && Math.random() < .7) fresh = th; }
      const i = fresh[rnd(fresh.length)]; seen.add(itemKey(items[i])); ss.add(sk(i)); store.set(key, [...seen]); LAST = { deck: name, item: items[i] };
      return items[i];
    },
    drawN(n, filter) { const r = []; for (let i = 0; i < n; i++) { const x = this.draw(filter); if (x != null) r.push(x); } return r; },
    has(filter) { return pool(filter, curPack()).length > 0; },
    count(filter) { return pool(filter, curPack()).length; },
    left(filter) { const seen = new Set(store.get(key, [])); return pool(filter, curPack()).filter(i => !seen.has(itemKey(items[i]))).length; }
  };
  return deck;
}
function registerGame(def) {
  const teams = def.teams || { min: 2, max: 8 };
  // Число людей за экраном отличается от количества команд в партии.
  def.players = def.players || (def.coop ? { min: 1, max: null } : { min: teams.min, max: def.unit === 'Игрок' ? teams.max : null });
  def.decks = pendingDecks; pendingDecks = []; G.games.push(def);
}

/* ---------- звук ---------- */
const sfx = (() => {
  let ac = null, mute = store.get('mute', false);
  const ctx = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } } if (ac && ac.state === 'suspended') ac.resume(); return ac; };
  const on = () => !mute && Settings.get('sfx');
  function tone(f, d = .12, type = 'sine', vol = .12, delay = 0, slide) {
    if (!on()) return; const a = ctx(); if (!a) return; vol *= Settings.get('vol') * 1.25;
    const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + d + .03);
  }
  function noise(d = .8, vol = .3) {
    if (!on()) return; const a = ctx(); if (!a) return; vol *= Settings.get('vol') * 1.25;
    const len = Math.floor(a.sampleRate * d), buf = a.createBuffer(1, len, a.sampleRate), data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const s = a.createBufferSource(), g = a.createGain(); s.buffer = buf; g.gain.value = vol; s.connect(g); g.connect(a.destination); s.start();
  }
  return {
    get muted() { return mute; }, ctx, toggle() { mute = !mute; store.set('mute', mute); Music.sync(); if (mute) Music.stop(); else if (G.inSession) Music.start(G.mood); return mute; },
    click() { tone(520, .05, 'square', .04); }, ok() { tone(660, .1, 'triangle', .14); tone(880, .18, 'triangle', .14, .1); },
    bad() { tone(220, .3, 'sawtooth', .1, 0, 110); }, tick() { if (Settings.get('tick')) tone(900, .04, 'square', .05); },
    boom() { noise(1, .4); tone(90, .7, 'sawtooth', .25, 0, 35); }, buzz() { tone(140, .5, 'sawtooth', .12); },
    win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'triangle', .14, i * .12)); },
    fanfare() { [523, 523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i === 7 ? .6 : .16, 'triangle', .15, i * .13)); tone(262, .9, 'sine', .12, .9); },
    start() { [392, 523, 659].forEach((f, i) => tone(f, .14, 'triangle', .12, i * .09)); },
    streak() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, .12, 'triangle', .13, i * .07)); },
    ding() { tone(1200, .3, 'sine', .12); }
  };
})();

/* ---------- очистка при смене экрана ---------- */
const leaveFns = [];
const onLeave = f => leaveFns.push(f);
function runLeave() { while (leaveFns.length) { try { leaveFns.pop()(); } catch (e) { } } }

/* ---------- таймер ---------- */
function Timer(sec, o = {}) {
  const bar = h('i'), num = h('span', { class: 'tnum' }), el = h('div', { class: 'timer' }, h('div', { class: 'tbar' }, bar), num);
  let total = sec, left = o.left ?? sec, end = 0, id = null, running = false, last = -1;
  function paint() { num.textContent = fmtTime(left); bar.style.transform = 'scaleX(' + (total ? clamp(left / total, 0, 1) : 0) + ')'; el.classList.toggle('low', running && left <= (o.low ?? 5)); }
  function loop() {
    left = Math.max(0, (end - GameClock.now()) / 1000);
    const s = Math.ceil(left); if (s !== last) { last = s; if (running && s <= (o.low ?? 5) && s > 0 && !o.quiet) sfx.tick(); o.onSecond && o.onSecond(s); }
    paint(); if (left <= 0) { stop(); o.onEnd && o.onEnd(); }
  }
  function start() { if (running) return; end = GameClock.now() + left * 1000; running = true; id = setInterval(loop, 100); onLeave(stop); paint(); }
  function stop() { if (running) left = Math.max(0, (end - GameClock.now()) / 1000); running = false; clearInterval(id); el.classList.remove('low'); }
  function reset(s) { stop(); total = s ?? total; left = total; last = -1; paint(); }
  function add(s) { left += s; total = Math.max(total, left); if (running) end += s * 1000; paint(); }
  paint();
  return { el, start, stop, reset, add, get left() { return running ? Math.max(0, (end - GameClock.now()) / 1000) : left; }, get running() { return running; } };
}

/* ---------- UI-кирпичики ---------- */
const TEAM_COLORS = ['#ff6b57', '#3aa0ff', '#2fd6a0', '#ffc233', '#9a6bff', '#ff7ab8', '#19c2c9', '#b6e24b', '#ff9f43', '#7aa2ff', '#e56bff', '#8de0d0'];
function btn(label, onclick, cls = '', attrs = {}) {
  const b = h('button', { class: 'btn ' + cls, type: 'button', ...attrs }, label);
  b.addEventListener('click', e => { sfx.click(); onclick && onclick(e, b); });
  return b;
}
const modalStack = [];
let modalId = 0;
function modal(content, buttons = [], options = {}) {
  const releasePause = G.inSession ? GameClock.hold() : () => {};
  const previous = document.activeElement;
  const background = [root, ...document.querySelectorAll('body > .veil')].map(el => [el, el.inert]);
  const actions = h('div', { class: 'row' }, buttons);
  const v = h('div', { class: 'veil', role: 'dialog', 'aria-modal': 'true', tabindex: '-1' }, h('div', { class: 'panel' }, content, actions));
  let closed = false;
  const m = { close() {
    if (closed) return;
    while (modalStack.length && modalStack[modalStack.length - 1] !== m) modalStack[modalStack.length - 1].close();
    closed = true; modalStack.pop(); v.remove(); releasePause();
    background.forEach(([el, inert]) => { el.inert = inert; });
    options.onClose && options.onClose();
    const usable = el => el && el.isConnected && !el.disabled && !el.closest('[inert]') && el.getClientRects().length;
    const target = usable(previous) ? previous : document.querySelector('body > .veil:not([inert]) button:not(:disabled)') || root.querySelector('[data-primary], button:not(:disabled)');
    if (usable(target)) target.focus({ preventScroll: true });
  } };
  if (!actions.querySelector('button')) actions.append(btn('Закрыть', () => m.close()));
  const title = v.querySelector('h2');
  if (title) { title.id = title.id || 'dialog-' + (++modalId); v.setAttribute('aria-labelledby', title.id); }
  else v.setAttribute('aria-label', 'Сообщение');
  const focusable = () => [...v.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]')].filter(el => el.getClientRects().length);
  v.addEventListener('keydown', e => {
    if (modalStack[modalStack.length - 1] !== m) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); m.close(); }
    if (e.key === 'Tab') {
      const all = focusable(), first = all[0], last = all[all.length - 1];
      if (!first) { e.preventDefault(); v.focus(); }
      else if (e.shiftKey && (document.activeElement === first || document.activeElement === v)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (document.activeElement === last || document.activeElement === v)) { e.preventDefault(); first.focus(); }
    }
  });
  v.addEventListener('click', e => { if (e.target === v) m.close(); });
  background.forEach(([el]) => { el.inert = true; });
  modalStack.push(m); document.body.append(v); (focusable()[0] || v).focus({ preventScroll: true });
  return m;
}
function confirmBox(text, yes, yesLabel = 'Да', noLabel = 'Отмена', no) {
  const m = modal(h('p', { class: 'mid-t' }, text), [btn(yesLabel, () => { m.close(); yes(); }, 'bad'), btn(noLabel, () => { m.close(); no && no(); }, 'paper')]);
}
function confetti(n = 80) {
  const cols = TEAM_COLORS; n = fx.confettiAmount(n);
  for (let i = 0; i < n; i++) {
    const c = h('div', { class: 'conf', style: { left: rnd(100) + 'vw', background: pick(cols), animationDuration: (2 + Math.random() * 2.5) + 's', animationDelay: (Math.random() * .8) + 's', transform: 'rotate(' + rnd(360) + 'deg)' } });
    document.body.append(c); setTimeout(() => c.remove(), 5500);
  }
}
/* «зажмите, чтобы посмотреть» — тайная информация видна, пока держишь кнопку */
function peek(secret, label = 'Нажмите, чтобы посмотреть') {
  const hold = h('button', { class: 'btn big sky', type: 'button', style: { touchAction: 'none' } }, label);
  const body = h('div', { class: 'hidden' }, secret);
  const wrap = h('div', { class: 'stack center', style: { alignItems: 'center' } }, body, hold);
  let shown = false, t0 = 0;
  const show = () => { shown = true; body.classList.remove('hidden'); hold.textContent = 'Нажмите, чтобы спрятать'; };
  const hide = () => { shown = false; body.classList.add('hidden'); hold.textContent = label; };
  /* короткое нажатие переключает, долгое удержание работает как раньше */
  hold.addEventListener('pointerdown', ev => { ev.preventDefault(); t0 = performance.now(); if (!shown) show(); else { hide(); t0 = -1; } });
  hold.addEventListener('pointerup', () => { if (t0 > 0 && performance.now() - t0 > 450) hide(); });
  hold.addEventListener('keydown', ev => { if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); shown ? hide() : show(); } });
  hold.addEventListener('contextmenu', e => e.preventDefault());
  return wrap;
}

/* ---------- каркас приложения ---------- */
const root = document.getElementById('app');
function mount(node) { runLeave(); root.replaceChildren(node); window.scrollTo(0, 0); const p = root.querySelector('[data-primary]'); if (p) p.focus({ preventScroll: true }); }

async function keepAwake() { try { if (navigator.wakeLock) await navigator.wakeLock.request('screen'); } catch (e) { } }
function toggleFull() { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (e) { } }
/* Набор линейных иконок интерфейса: одна семья, штрих 2px, цвет от текста */
const ICO = {
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/>',
  speak: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 9a4 4 0 010 6"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  home: '<path d="M4 11l8-7 8 7M6 10v9h12v-9"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.6a2.5 2.5 0 114.6 1.3c-.8 1.1-2.2 1.4-2.2 3M12 17.4v.01"/>',
  on: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 010 7M19.2 5.8a9 9 0 010 12.4"/>',
  off: '<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9.5l5 5M22 9.5l-5 5"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.8a3.5 3.5 0 010 6.4M18 14.4c2.2.7 3.5 2.6 3.5 5.6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  cam: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5l5-3v9l-5-3"/>',
  ask: '<path d="M4 5h16v11H9l-5 4V5z"/>',
  flag: '<path d="M6 21V4M6 5h11l-2 4 2 4H6"/>',
  exit: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'
};
function ico(name) {
  const s = document.createElement('span'); s.className = 'ico'; s.setAttribute('aria-hidden', 'true');
  s.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + ICO[name] + '</svg>';
  return s;
}
const withIco = (b, name) => { b.prepend(ico(name)); return b; };
function muteBtn() {
  const b = h('button', { class: 'btn ghost icon', type: 'button', title: 'Звук', 'aria-label': 'Звук' }, ico(sfx.muted ? 'off' : 'on'));
  b.onclick = () => { b.replaceChildren(ico(sfx.toggle() ? 'off' : 'on')); sfx.click(); };
  return b;
}
function fullBtn() {
  if (!document.fullscreenEnabled && !document.webkitFullscreenEnabled) return null;
  const b = h('button', { class: 'btn ghost icon', type: 'button', title: 'На весь экран', 'aria-label': 'На весь экран', onclick: toggleFull }, ico(document.fullscreenElement ? 'exit' : 'full'));
  const sync = () => { if (b.isConnected) b.replaceChildren(ico(document.fullscreenElement ? 'exit' : 'full')); else document.removeEventListener('fullscreenchange', sync); };
  document.addEventListener('fullscreenchange', sync);
  return b;
}

/* ---------- каталог ---------- */
const CATS = ['Все', '★ Любимые', 'Викторины', 'Для компании', 'Командные', 'Для двоих', 'Загадки и истории'];
const favs = () => { const a = store.get('fav', []); return Array.isArray(a) ? a : []; };
const isFav = id => favs().includes(id);
function favStar(g, onChange) {
  const b = h('span', { class: 'favstar', role: 'button', tabindex: '0', 'aria-label': 'Любимая игра: ' + g.title });
  const sync = () => { const f = isFav(g.id); b.textContent = f ? '★' : '☆'; b.setAttribute('aria-pressed', f); b.title = f ? 'Убрать из любимых' : 'В любимые'; b.classList.toggle('on', f); };
  const tog = e => { e.stopPropagation(); e.preventDefault(); const a = favs(), i = a.indexOf(g.id); i < 0 ? a.push(g.id) : a.splice(i, 1); store.set('fav', a); sfx.click(); sync(); onChange && onChange(); };
  b.addEventListener('click', tog); b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') tog(e); });
  sync(); return b;
}
const gameArt = g => { const a = (DATA.gameArt && DATA.gameArt[g.id]) ? Pics.parts(DATA.gameArt[g.id]) : [g.icon]; return a.length < 3 ? [a[0], a[1] || '✨', a[2] || '⭐'] : a.slice(0, 3); };
function Home() {
  leaveSession(); LAST = null; Music.stop(); Voice.stop();
  let cat = store.get('cat', 'Все'); if (!CATS.includes(cat)) cat = 'Все';
  let np = store.get('np', 0); if (![0, 1, 2, 3, 4, 5, 6].includes(np)) np = 0;
  let pack = curPack(); if (!PACKS.some(p => p[0] === pack)) pack = 'all';
  let q = '';
  const grid = h('div', { class: 'grid' }), state = h('div', { class: 'filter-state', 'aria-live': 'polite' });
  const fits = g => { const p = g.players; return !np || (np === 6 ? p.max == null || p.max >= 6 : np >= p.min && (p.max == null || np <= p.max)); };
  const packHas = (g, p) => (g.decks || []).some(n => DATA.themed && DATA.themed[n] && DATA.themed[n][p] && DATA.themed[n][p].length);
  const packOk = g => pack !== 'kids' || !(g.decks || []).length || packHas(g, 'kids');
  const found = g => !q || (g.title + ' ' + g.tagline).toLowerCase().includes(q);
  const visible = () => G.games.filter(g => (cat === 'Все' || (cat === '★ Любимые' ? isFav(g.id) : g.cats.includes(cat))) && fits(g) && packOk(g) && found(g)).sort((a, b) => cat === 'Все' && !q ? isFav(b.id) - isFav(a.id) : 0);
  const open = g => Intro(g, { players: np });
  const search = h('input', { class: 'gsearch', type: 'search', placeholder: 'Найти игру…', 'aria-label': 'Найти игру по названию', autocomplete: 'off', oninput: e => { q = e.target.value.trim().toLowerCase(); paint(); } });
  const randomBtn = btn('Случайная игра', () => { const list = visible(); if (list.length) open(pick(list)); }, 'small paper');
  const people = h('div', { class: 'people-filters', role: 'group', 'aria-label': 'Сколько вас?' },
    ...[[0, 'Любое'], [1, 'Один'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6+']].map(([n, label]) => h('button', { class: 'chipbtn num', type: 'button', 'data-people': n, 'aria-label': n ? 'Игроков: ' + n + (n === 6 ? '+' : '') : 'Любое число игроков', onclick: () => { np = n; store.set('np', n); paint(); } }, label)));
  const catButton = c => h('button', { class: 'chipbtn', type: 'button', 'data-cat': c, onclick: () => { cat = c; store.set('cat', c); paint(); } }, c);
  const filters = h('details', { class: 'catalog-filters' }, h('summary', null, 'Темы и категории'),
    h('div', { class: 'filters' }, h('span', { class: 'flabel' }, 'Тема вечера'), ...PACKS.map(([id, label, em]) => h('button', { class: 'chipbtn pack', type: 'button', 'data-pack': id, onclick: () => { pack = id; store.set('pack', id); paint(); } }, em + ' ' + label)), h('span', { class: 'fsep' }), ...CATS.slice(2).map(catButton)));
  const quick = h('div', { class: 'catalog-quick' }, catButton('Все'), catButton('★ Любимые'), randomBtn);
  const clear = () => { cat = 'Все'; np = 0; pack = 'all'; q = ''; search.value = ''; store.set('cat', cat); store.set('np', np); store.set('pack', pack); paint(); };
  function paint() {
    people.querySelectorAll('[data-people]').forEach(el => el.setAttribute('aria-pressed', String(+el.dataset.people === np)));
    [...quick.querySelectorAll('[data-cat]'), ...filters.querySelectorAll('[data-cat]')].forEach(el => el.setAttribute('aria-pressed', String(el.dataset.cat === cat)));
    filters.querySelectorAll('[data-pack]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.pack === pack)));
    const labels = [cat !== 'Все' ? cat : '', pack !== 'all' ? PACKS.find(p => p[0] === pack)[1] : ''].filter(Boolean);
    state.replaceChildren(...(labels.length || np || q ? [h('span', null, labels.join(' · ') || (q ? 'Поиск: ' + search.value : np === 1 ? 'Для одного' : 'Игроков: ' + np + (np === 6 ? '+' : ''))), btn('Сбросить фильтры', clear, 'ghost small')] : []));
    state.hidden = !state.childNodes.length;
    const list = visible(); randomBtn.disabled = !list.length;
    if (!list.length) { grid.replaceChildren(h('div', { class: 'empty' }, h('b', null, cat === '★ Любимые' && !favs().length ? 'Пока нет любимых игр.' : 'По этим условиям игр не нашлось.'), h('span', null, cat === '★ Любимые' && !favs().length ? 'Нажмите ☆ на карточке игры, чтобы добавить её в любимые.' : 'Измените запрос или сбросьте фильтры.'), btn('Показать все игры', clear, 'paper'))); return; }
    grid.replaceChildren(...list.map((g, i) => h('button', { class: 'gcard', type: 'button', style: { '--c': g.color, '--rot': ((i % 3) - 1) * .8 + 'deg' }, onclick: () => { sfx.click(); open(g); } },
      h('div', { class: 'art' + (DATA.art && DATA.art[g.id] ? ' has-ill' : '') }, DATA.art && DATA.art[g.id] ? Pics.ill(g.id) : null, ...(DATA.art && DATA.art[g.id] ? [] : gameArt(g).map((e, k) => h('span', { class: 'a' + (k + 1) }, e)))),
      favStar(g, paint), h('div', { class: 'body' }, h('h3', null, g.title), h('p', { class: 'tag' }, g.tagline),
        h('div', { class: 'meta' }, pack !== 'all' && packHas(g, pack) ? h('span', { class: 'pill hot' }, PACKS.find(p => p[0] === pack)[2] + ' есть наборы') : null, h('span', { class: 'pill' }, playersLabel(g)), h('span', { class: 'pill' }, '~' + g.mins + ' мин'))))));
  }
  paint();
  mount(h('div', { class: 'wrap catalog-page' },
    h('div', { class: 'hero' }, h('div', { class: 'hero-main' }, h('div', null, h('h1', null, 'Игротека'), h('p', null, 'На одном экране — одному, вдвоём и компанией.'))), h('div', { class: 'top' }, setBtn(), muteBtn(), fullBtn())),
    search, people, quick, h('div', { class: 'catalog-features' }, btn('Игровой вечер', () => Evening.open(), 'paper small'), btn('Результаты', () => Records.show(), 'paper small')), filters, state,
    h('div', { class: 'continue-list' }, G.games.filter(game => Saves.read(game).status === 'ok').map(game => btn('Продолжить: ' + game.title, () => Saves.resume(game), 'paper small'))), grid,
    h('div', { class: 'foot' }, h('span', null, G.games.length + ' игр. В выбранной колоде карточки идут без повторов, пока не закончатся.'), btn('Сбросить историю карточек', () => confirmBox('Все карточки снова станут «новыми». Сбросить?', () => { store.clearSeen(); Home(); }, 'Сбросить'), 'ghost small'))));
}
function playersLabel(g) {
  const p = g.players;
  if (p.max == null) return 'От ' + p.min + (p.min === 1 ? ' игрока' : ' игроков');
  return (p.min === p.max ? p.min : p.min + '–' + p.max) + ' ' + plural(p.max, 'игрок', 'игрока', 'игроков');
}

/* ---------- вступление и настройка ---------- */
function Intro(g, setup = {}) {
  leaveSession(); LAST = null; Music.stop(); Voice.stop();
  const t = g.teams || { min: 2, max: 8 };
  let n = clamp(store.get('n.' + g.id, Math.max(t.min, Math.min(2, t.max))), t.min, t.max);
  const optVals = {};
  (g.opts || []).forEach(o => { const value = store.get('o.' + g.id + '.' + o.key, o.def); optVals[o.key] = Array.isArray(value) ? value.slice() : value; });
  if (setup.players && !g.coop) {
    n = clamp(g.unit === 'Игрок' ? setup.players : setup.players === 1 ? 1 : 2, t.min, t.max);
    const mode = (g.opts || []).find(o => o.key === 'mode');
    if (mode && mode.values.some(v => v[0] === 'duet')) {
      const team = mode.values.find(v => v[0] === 'team' || v[0] === 'teams');
      optVals.mode = setup.players === 2 ? 'duet' : team ? team[0] : mode.def;
    }
  }
  const unit = () => n === 1 || optVals.mode === 'duet' ? 'Игрок' : (g.unit || 'Команда');
  const isDef = x => !x || /^(Команда|Игрок) \d+$/.test(String(x).trim());
  const saved = store.get('names', []), names = range(12).map(i => isDef(saved[i]) ? unit() + ' ' + (i + 1) : saved[i]);
  const teamBox = h('div'), countBox = h('div', { class: 'stepper' });
  const teamDetails = h('details', { class: 'setup-details' }, h('summary', null, g.coop ? 'Название команды' : 'Имена и порядок ходов'), teamBox);
  const optionNodes = [];
  const refresh = () => {
    if (optVals.mode === 'duet') n = 2;
    optionNodes.forEach(({ option, node }) => { node.hidden = option.when ? !option.when(optVals, n) : false; });
    paintTeams();
  };
  function paintTeams() {
    const one = unit() === 'Игрок', fixed = optVals.mode === 'duet', min = fixed ? 2 : t.min, max = fixed ? 2 : t.max;
    names.forEach((name, i) => { if (isDef(name)) names[i] = unit() + ' ' + (i + 1); });
    countBox.replaceChildren(btn('−', () => { if (n > min) { n--; refresh(); } }, 'paper icon', { disabled: n <= min, 'aria-label': 'Уменьшить число участников' }), h('b', null, n), btn('+', () => { if (n < max) { n++; refresh(); } }, 'paper icon', { disabled: n >= max, 'aria-label': 'Увеличить число участников' }), h('span', null, one ? plural(n, 'игрок', 'игрока', 'игроков') : plural(n, 'команда', 'команды', 'команд')));
    const swap = (i, j) => { [names[i], names[j]] = [names[j], names[i]]; paintTeams(); };
    if (g.coop) {
      teamBox.replaceChildren(h('input', { class: 'input', value: isDef(names[0]) ? 'Мы' : names[0], maxlength: 22, 'aria-label': 'Название команды', oninput: e => { names[0] = e.target.value; } }));
      return;
    }
    teamBox.replaceChildren(...[n > 1 ? h('p', { class: 'muted' }, 'Сверху вниз — порядок ходов.') : null,
      ...range(n).map(i => h('div', { class: 'teamrow', style: { '--c': TEAM_COLORS[i] } }, h('span', { class: 'dot' }), h('input', { class: 'input', value: names[i], maxlength: 22, 'aria-label': 'Название ' + (i + 1), oninput: e => { names[i] = e.target.value; } }),
        n > 1 ? h('span', { class: 'mv' }, h('button', { class: 'btn paper icon small', type: 'button', disabled: i === 0, 'aria-label': 'Поднять выше: ходит раньше', onclick: () => { sfx.click(); swap(i, i - 1); } }, '↑'), h('button', { class: 'btn paper icon small', type: 'button', disabled: i === n - 1, 'aria-label': 'Опустить ниже: ходит позже', onclick: () => { sfx.click(); swap(i, i + 1); } }, '↓')) : null))].filter(Boolean));
  }
  const optBox = (g.opts || []).slice().sort((a, b) => (b.key === 'mode') - (a.key === 'mode')).map(o => {
    const values = () => typeof o.values === 'function' ? o.values() : o.values;
    const seg = h('div', { class: 'seg' });
    let control = seg;
    if (o.multi) {
      if (!Array.isArray(optVals[o.key])) optVals[o.key] = [];
      const paint = () => {
        const cur = optVals[o.key];
        seg.replaceChildren(h('button', { type: 'button', 'aria-pressed': !cur.length, onclick: () => { optVals[o.key] = []; paint(); refresh(); } }, 'Все'), ...values().map(v => {
          const val = Array.isArray(v) ? v[0] : v, label = Array.isArray(v) ? v[1] : v;
          return h('button', { type: 'button', 'aria-pressed': cur.includes(val), onclick: () => { const i = cur.indexOf(val); if (i >= 0) cur.splice(i, 1); else cur.push(val); if (cur.length >= values().length) cur.length = 0; paint(); refresh(); } }, label);
        }));
      };
      seg.classList.add('multi'); paint();
    } else if (values().length > 8) {
      control = h('select', { class: 'input option-select', 'aria-label': o.label, onchange: e => { const i = +e.target.value; const value = values()[i]; optVals[o.key] = Array.isArray(value) ? value[0] : value; refresh(); } },
        ...values().map((v, i) => h('option', { value: i, selected: optVals[o.key] === (Array.isArray(v) ? v[0] : v) }, Array.isArray(v) ? v[1] : v)));
    } else {
      const paint = () => seg.replaceChildren(...values().map(v => {
        const val = Array.isArray(v) ? v[0] : v, label = Array.isArray(v) ? v[1] : v;
        return h('button', { type: 'button', 'aria-pressed': optVals[o.key] === val, onclick: () => { optVals[o.key] = val; paint(); refresh(); } }, label);
      }));
      paint();
    }
    const node = h('div', { class: 'setup-option' }, h('div', { class: 'label' }, o.label, o.multi ? h('small', { class: 'muted' }, ' · можно несколько') : null), control);
    optionNodes.push({ option: o, node }); return node;
  });
  refresh();
  const start = () => {
    const list = range(g.coop ? 1 : n).map(i => ({ name: (g.coop ? (isDef(names[0]) ? 'Мы' : names[0].trim() || 'Мы') : (names[i] || '').trim() || (unit() + ' ' + (i + 1))), color: TEAM_COLORS[i] }));
    store.set('n.' + g.id, n);
    if (!g.coop) store.set('names', names.map(x => (x || '').trim()));
    else store.set('coop.name.' + g.id, list[0].name);
    for (const k in optVals) store.set('o.' + g.id + '.' + k, optVals[k]);
    keepAwake(); startSession(g, list, { ...optVals });
  };
  if (g.coop) { names[0] = store.get('coop.name.' + g.id, 'Мы'); paintTeams(); }
  mount(h('div', { class: 'wrap room intro-page', style: { '--accent': g.color } },
    h('div', { class: 'row intro-nav' }, withIco(btn('Каталог', Home, 'ghost small'), 'home'), h('span', { class: 'grow' }), setBtn(), muteBtn(), fullBtn()),
    h('div', { class: 'intro-heading' }, h('div', { class: 'title-row' }, h('h1', null, g.title), favStar(g)), h('p', { class: 'mid-t' }, g.tagline)),
    h('div', { class: 'intro' },
      h('div', { class: 'panel dark setup-panel' }, h('div', { class: 'quick-start' },
        g.coop ? h('p', null, 'Решайте вместе или играйте самостоятельно.') : countBox,
        btn('Играть', start, 'huge', { 'data-primary': true })),
        Saves.control(g, () => Intro(g)), optBox, teamDetails),
      h('details', { class: 'panel rules-panel' }, h('summary', null, 'Как играть'), h('div', { class: 'rules', html: g.rules })))));
}

/* ---------- сессия ---------- */
function startSession(game, teamList, opts, restored = null, context = {}) {
  leaveSession(); GameClock.start();
  LAST = null;
  if (!restored && game.saveVersion) Saves.remove(game.id, context.evening);
  const T = teamList.map(t => ({ name: t.name, color: t.color, score: restored ? t.score : 0 }));
  const board = h('div', { class: 'board' }), stage = h('main', { class: 'stage' }), turnbar = h('div', { class: 'turnbar', 'aria-live': 'polite' });
  let turn = -1, lastBar = '', streakN = 0, lastScorer = -1, ttsEl = null, flagEl = null, flagCards = [], getSave = null, saveTick = null;
  const setFlagCards = cards => { flagCards = cards.slice(); if (flagEl) flagEl.disabled = !flagCards.length; };
  G.sessionSeen = new Set(); G.inSession = true; G.mood = game.mood || MOOD_BY_GAME[game.id] || 'fun'; Voice.stop(); Music.start(G.mood); sfx.start();
  /* крупный баннер «кто сейчас действует»: o.turn — индекс команды, o.role — что делает, o.all — действуют все */
  function paintTurn(o) {
    const role = o.role || '';
    if (o.bar === false || api.finished) { turnbar.className = 'turnbar off'; turnbar.replaceChildren(); lastBar = ''; return; }
    if (turn < 0 && !role) { turnbar.className = 'turnbar pause-only'; turnbar.replaceChildren(btn('Пауза', () => api.pause(), 'ghost small')); return; }
    const t = turn >= 0 ? T[turn] : null, key = (t ? t.name : '*') + '|' + role;
    turnbar.className = 'turnbar' + (t ? '' : ' all') + (key !== lastBar && (t ? t.name : '*') !== lastBar.split('|')[0] ? ' swap' : '') + (o.compact ? ' compact' : '');
    turnbar.style.setProperty('--c', t ? t.color : 'var(--sun)');
    turnbar.replaceChildren(h('span', { class: 'tb-ico' }, ico(t ? 'user' : 'users')), h('div', { class: 'tb-txt' }, h('div', { class: 'tb-role' }, role || 'Сейчас ход'), h('div', { class: 'tb-name' }, t ? t.name : (o.who || 'Вся компания'))), btn('Пауза', () => api.pause(), 'ghost small tb-pause', { 'aria-label': 'Пауза' }));
    lastBar = key;
  }
  function paintBoard(bumpIdx) {
    board.replaceChildren(...T.map((t, i) => h('div', { class: 'tchip' + (i === turn ? ' on' : '') + (i === bumpIdx ? ' bump' : ''), style: { '--c': t.color } }, h('span', null, t.name), game.noScore ? null : h('span', { class: 'sc' }, t.score))));
    board.style.display = (game.coop && game.noBoard) ? 'none' : '';
  }
  const api = {
    game, teams: T, opts, n: T.length, stage, saved: restored, finished: false, evening: context.evening || null,
    sessionId: typeof context.sessionId === 'string' && /^[a-z0-9-]{1,64}$/.test(context.sessionId) ? context.sessionId : newRunId(),
    recorded: new Map(), recordResults: [],
    record(spec) { return Records.submit(api, spec); },
    now: () => GameClock.now(),
    delay(fn, ms) { if (G.api !== api || api.finished) return null; return GameClock.delay(() => { if (G.api === api && !api.finished) fn(); }, ms); },
    cancelDelay: job => GameClock.cancel(job),
    delayLeft: job => GameClock.remaining(job),
    enableSave(read) { getSave = read; clearInterval(saveTick); saveTick = setInterval(() => api.save(), 2000); api.save(); },
    save() {
      if (!getSave || api.finished) return false;
      const state = getSave();
      const ok = state == null ? Saves.remove(game.id, api.evening) : Saves.write(game, T, opts, state, { evening: api.evening, sessionId: api.sessionId });
      saveStatus.classList.toggle('failed', !ok);
      const message = ok ? 'Партия сохраняется на этом устройстве' : 'Не удалось сохранить партию на устройстве';
      if (saveStatus.textContent !== message) saveStatus.textContent = message;
      return ok;
    },
    pause() {
      if (api.finished || document.querySelector('.pause-dialog')) return;
      Voice.stop();
      const m = modal(h('div', { class: 'pause-dialog' }, h('h2', null, 'Пауза'), h('p', { class: 'mid-t' }, 'Время и ходы компьютера остановлены.')), [btn('Продолжить игру', () => m.close(), '', { 'data-primary': true }), btn(api.evening ? 'Программа вечера' : 'В меню игры', () => { m.close(); if (api.evening) Evening.show(); else Intro(game); }, 'paper')]);
    },
    show(content, o = {}) {
      runLeave(); stage.className = 'stage' + (o.mid ? ' mid' : ''); stage.replaceChildren(...[].concat(content).flat(Infinity).filter(Boolean));
      if (o.flagCards !== undefined) setFlagCards(o.flagCards);
      else { flagCards = null; if (flagEl) flagEl.disabled = !LAST; }
      if (o.turn !== undefined) turn = o.turn; paintBoard(); paintTurn(o); window.scrollTo(0, 0);
      const p = stage.querySelector('[data-primary]'); if (p) p.focus({ preventScroll: true });
      const tt = stage.querySelector('[data-tts]'); if (ttsEl) ttsEl.disabled = !tt; if (tt && Settings.get('ttsAuto')) api.delay(() => api.speakNow(), 350); else Voice.stop();
    },
    speakNow() { const t = [...stage.querySelectorAll('[data-tts]')].map(e => e.getAttribute('data-tts') || e.innerText.replace(/\s+/g, ' ')).join('. '); Voice.speak(t); },
    setTurn(i, role, who) { turn = i; paintBoard(); paintTurn({ role, who }); },
    score(i, d) {
      T[i].score += d; paintBoard(d ? i : undefined);
      if (d > 0) {
        streakN = lastScorer === i ? streakN + 1 : 1; lastScorer = i; const chip = board.children[i];
        fx.burst(chip, 10); fx.float(chip, '+' + d);
        if (streakN >= 3 && !game.noScore) { sfx.streak(); fx.float(chip, '🔥 серия ×' + streakN); fx.flash(chip, 'flash-streak'); }
      }
    },
    setFlagCards,
    flagCard() {
      // «Табу» меняет слова внутри экрана: снимок берём при нажатии на флажок.
      // Для закрытых полей игра задаёт доступные карточки через setFlagCards.
      const cards = flagCards === null ? (LAST ? [{ ...LAST, label: stage.innerText.trim().slice(0, 600) }] : []) : flagCards;
      openFlag(cards);
    },
    rules() { const m = modal(h('div', null, h('h2', { style: { marginBottom: '.6rem' } }, game.title), h('div', { class: 'rules', html: game.rules })), [btn('Понятно', () => m.close(), '')]); },
    exit() {
      const saved = api.save();
      const m = modal(h('div', null, h('h2', null, 'Выйти из игры?'), h('p', { class: 'mid-t' }, saved ? 'Партию можно будет продолжить на этом устройстве.' : api.evening ? (Evening.storageOK ? 'Итоги предыдущих этапов сохранены. Незавершённая игра начнётся заново.' : 'Итоги доступны до закрытия страницы. Незавершённая игра начнётся заново.') : 'Текущая партия завершится. Очки не сохранятся.')), [
        btn(api.evening ? 'К программе вечера' : 'В меню игры', () => { m.close(); if (api.evening) Evening.show(); else Intro(game); }),
        btn('В каталог', () => { m.close(); Home(); }, 'paper'),
        btn('Остаться', () => { m.close(); frame.querySelector('[aria-label="Выход"]').focus(); }, 'paper')
      ]);
    },
    /* выбор команды: cb(i) или cb(-1) для «никто» */
    pickTeam(label, cb, o = {}) {
      const ex = o.exclude || [];
      return h('div', { class: 'stack' }, label ? h('div', { class: 'mid-t' }, label) : null,
        h('div', { class: 'picks' }, T.map((t, i) => ex.includes(i) ? null : btn(t.name, () => cb(i), 'big pick', { style: { '--c': t.color } })), o.none ? btn(o.none, () => cb(-1), 'big paper') : null));
    },
    end(o = {}) { Results(api, o); },
    sorted() { return T.map((t, i) => ({ ...t, i })).sort((a, b) => b.score - a.score); }
  };
  const saveStatus = h('div', { class: 'save-status', 'aria-live': 'polite' });
  const frame = h('div', { class: 'frame room', style: { '--accent': game.color } },
    h('div', { class: 'motif', 'aria-hidden': 'true' }, ...gameArt(game).concat(gameArt(game)).map(e => h('span', null, e))),
    h('header', { class: 'bar' },
      withIco(btn(h('span', { class: 'lbl' }, 'Выход'), () => api.exit(), 'ghost small', { 'aria-label': 'Выход' }), 'back'),
      h('div', { class: 'bar-title' }, h('i', null, game.icon), game.title),
      withIco(btn(h('span', { class: 'lbl' }, 'Правила'), () => api.rules(), 'ghost small', { 'aria-label': 'Правила' }), 'help'), (ttsEl = ttsBtn(api)), (flagEl = flagBtn(api)), setBtn(), muteBtn(), fullBtn()),
    api.evening ? h('div', { class: 'evening-banner' }, 'Игровой вечер · Этап ' + (api.evening.index + 1) + ' из ' + (Evening.read()?.stages.length || '') + (Evening.storageOK ? '' : ' · Не удалось сохранить программу'), btn('Программа', () => api.exit(), 'ghost small')) : null, board, turnbar, stage, saveStatus);
  G.api = api;
  if (document.hidden) hiddenPause = GameClock.hold();
  // Сохранение живёт всю сессию, а onLeave очищается при смене игрового экрана.
  api.stopSave = () => { clearInterval(saveTick); getSave = null; saveStatus.textContent = ''; };
  paintBoard(); mount(frame); game.start(api);
}

function Results(api, o) {
  if (api.finished) return;
  api.finished = true; const eveningResult = Evening.finish(api);
  api.stopSave(); Saves.remove(api.game.id, api.evening); GameClock.stop();
  LAST = null;
  const g = api.game, T = api.sorted();
  const best = T[0] ? T[0].score : 0;
  const win = o.win;
  let body;
  if (g.coop || o.custom) {
    body = h('div', { class: 'stack center', style: { alignItems: 'center' } }, ...(o.lines || []).map(l => typeof l === 'string' ? h('p', { class: 'mid-t' }, l) : l));
  } else {
    body = h('div', { class: 'podium' }, T.map((t, k) => h('div', { class: 'prow' + (t.score === best ? ' first' : ''), style: { '--c': t.color } }, h('span', { class: 'pl' }, t.score === best ? '🏆' : (k + 1)), h('span', { class: 'pn' }, t.name), h('span', { class: 'ps' }, t.score))));
  }
  const title = o.title || (g.coop ? (win ? 'Победа!' : 'Не вышло') : (T.filter(t => t.score === best).length > 1 ? 'Ничья!' : T[0].name + ' побеждает!'));
  if (win !== false) { Music.stop(); sfx.fanfare(); confetti(); setTimeout(() => confetti(40), 1200); }
  const nextStage = eveningResult ? Evening.read().stages.findIndex(stage => stage.status === 'pending' || stage.status === 'playing') : -1;
  const actions = eveningResult ? [btn(nextStage < 0 ? 'Итоги вечера' : 'Следующая игра', () => nextStage < 0 ? Evening.show() : Evening.start(nextStage), 'big', { 'data-primary': true }), btn('Программа вечера', () => Evening.show(), 'big paper'), btn('В каталог', Home, 'big paper')]
    : [btn('Сыграть ещё раз', () => startSession(g, api.teams.map(t => ({ name: t.name, color: t.color })), api.opts), 'big', { 'data-primary': true }), btn('В меню игры', () => Intro(g), 'big paper'), btn('В каталог', Home, 'big paper')];
  api.show(h('div', { class: 'stack center', style: { alignItems: 'center', textAlign: 'center', paddingTop: '2vh' } },
    o.art || null, h('h1', { class: 'big', style: { fontSize: 'clamp(40px,8vw,96px)' } }, title), o.sub ? h('p', { class: 'mid-t muted' }, o.sub) : null, body,
    api.recordResults.map(result => Records.resultNode(result)),
    eveningResult && api.n > 1 ? h('div', { class: 'record-result' }, 'Баллы этапа: ' + Evening.read().stages[api.evening.index].result.points.map((value, i) => api.teams[i].name + ' ' + Records.format(value, '')).join(' · ')) : null,
    h('div', { class: 'row center', style: { marginTop: '1rem' } }, actions)), { turn: -1 });
}


/* защита от случайных выделений и контекстных меню при касаниях */
document.addEventListener('contextmenu', e => { if (!e.target.closest || !e.target.closest('input,textarea,.selectable')) e.preventDefault(); });
document.addEventListener('selectstart', e => { const t = e.target && (e.target.nodeType === 3 ? e.target.parentElement : e.target); if (!t || !t.closest || !t.closest('input,textarea,.selectable')) e.preventDefault(); });
document.addEventListener('dragstart', e => { if (!e.target.closest || !e.target.closest('input,textarea')) e.preventDefault(); });
/* ---------- запуск ---------- */
function boot() { Home(); }
