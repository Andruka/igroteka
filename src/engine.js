/* ===================== Игротека: движок ===================== */
const DATA = {};
const G = { games: [] };

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
const curPack = () => store.get('pack', 'all');
let LAST = null, pendingDecks = [];
const itemKey = it => typeof it === 'string' ? it : JSON.stringify(it);
function describeItem(it) { if (it && typeof it === 'object' && !Array.isArray(it) && typeof it.q === 'string') return it.q + (Array.isArray(it.a) ? ' → ' + it.a[0] : typeof it.a === 'string' ? ' → ' + it.a : ''); if (it && it.fake) return it.topic + ': ' + it.fake; if (it && it.w) return it.w + (it.m ? ' = ' + it.m : '');
  const o = []; (function w(v) { if (v == null) return; if (Array.isArray(v)) v.forEach(w); else if (typeof v === 'object') Object.values(v).forEach(w); else o.push(String(v)); })(it); return o.join(' · '); }
function makeDeck(name, base) {
  const key = 'seen.' + name, bkey = 'bad.' + name; pendingDecks.push(name);
  const themed = (DATA.themed && DATA.themed[name]) || {};
  const items = base.slice(), tags = base.map(() => null);
  for (const p in themed) themed[p].forEach(it => { items.push(it); tags.push(p); });
  const ok = (i, flt, P, bad) => (!flt || flt(items[i])) && (P === 'all' ? !tags[i] : P === 'kids' ? tags[i] === 'kids' : (!tags[i] || tags[i] === P)) && !bad.has(itemKey(items[i]));
  const pool = (flt, P) => { const bad = new Set(store.get(bkey, [])), r = []; items.forEach((it, i) => { if (ok(i, flt, P, bad)) r.push(i); }); return r; };
  const deck = {
    name, items, themed,
    draw(filter) {
      let p = pool(filter, curPack()); if (!p.length) p = pool(filter, 'all'); if (!p.length) p = items.map((_, i) => i).filter(i => !filter || filter(items[i]));
      if (!p.length) return null;
      const seen = new Set(store.get(key, []));
      let fresh = p.filter(i => !seen.has(i));
      if (!fresh.length) { p.forEach(i => seen.delete(i)); fresh = p; }
      const P = curPack(); if (P !== 'all' && P !== 'kids') { const th = fresh.filter(j => tags[j] === P); if (th.length && Math.random() < .7) fresh = th; }
      const i = fresh[rnd(fresh.length)]; seen.add(i); store.set(key, [...seen]); LAST = { deck: name, item: items[i] };
      return items[i];
    },
    drawN(n, filter) { const r = []; for (let i = 0; i < n; i++) { const x = this.draw(filter); if (x != null) r.push(x); } return r; },
    has(filter) { return pool(filter, curPack()).length > 0; },
    count(filter) { return pool(filter, curPack()).length; },
    left(filter) { const seen = new Set(store.get(key, [])); return pool(filter, curPack()).filter(i => !seen.has(i)).length; }
  };
  return deck;
}
function registerGame(def) { def.decks = pendingDecks; pendingDecks = []; G.games.push(def); }

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
  let total = sec, left = sec, end = 0, id = null, running = false, last = -1;
  function paint() { num.textContent = fmtTime(left); bar.style.transform = 'scaleX(' + (total ? clamp(left / total, 0, 1) : 0) + ')'; el.classList.toggle('low', running && left <= (o.low ?? 5)); }
  function loop() {
    left = Math.max(0, (end - performance.now()) / 1000);
    const s = Math.ceil(left); if (s !== last) { last = s; if (running && s <= (o.low ?? 5) && s > 0 && !o.quiet) sfx.tick(); o.onSecond && o.onSecond(s); }
    paint(); if (left <= 0) { stop(); o.onEnd && o.onEnd(); }
  }
  function start() { if (running) return; end = performance.now() + left * 1000; running = true; id = setInterval(loop, 100); onLeave(stop); paint(); }
  function stop() { running = false; clearInterval(id); el.classList.remove('low'); }
  function reset(s) { stop(); total = s ?? total; left = total; last = -1; paint(); }
  function add(s) { left += s; total = Math.max(total, left); if (running) end += s * 1000; paint(); }
  paint();
  return { el, start, stop, reset, add, get left() { return left; }, get running() { return running; } };
}

/* ---------- UI-кирпичики ---------- */
const TEAM_COLORS = ['#ff6b57', '#3aa0ff', '#2fd6a0', '#ffc233', '#9a6bff', '#ff7ab8', '#19c2c9', '#b6e24b'];
function btn(label, onclick, cls = '', attrs = {}) {
  const b = h('button', { class: 'btn ' + cls, type: 'button', ...attrs }, label);
  b.addEventListener('click', e => { sfx.click(); onclick && onclick(e, b); });
  return b;
}
function modal(content, buttons) {
  const v = h('div', { class: 'veil', role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'panel' }, content, h('div', { class: 'row' }, buttons)));
  document.body.append(v); const f = v.querySelector('.btn'); f && f.focus();
  return { close() { v.remove(); } };
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
  const b = h('button', { class: 'btn ghost icon', type: 'button', title: 'На весь экран', 'aria-label': 'На весь экран', onclick: toggleFull }, ico(document.fullscreenElement ? 'exit' : 'full'));
  const sync = () => { if (b.isConnected) b.replaceChildren(ico(document.fullscreenElement ? 'exit' : 'full')); else document.removeEventListener('fullscreenchange', sync); };
  document.addEventListener('fullscreenchange', sync);
  return b;
}

/* ---------- каталог ---------- */
const CATS = ['Все', 'Викторины', 'Для компании', 'Командные', 'Для двоих', 'Загадки и истории'];
const gameArt = g => { const a = (DATA.gameArt && DATA.gameArt[g.id]) ? Pics.parts(DATA.gameArt[g.id]) : [g.icon]; return a.length < 3 ? [a[0], a[1] || '✨', a[2] || '⭐'] : a.slice(0, 3); };
function Home() {
  G.inSession = false; Music.stop(); Voice.stop();
  let cat = store.get('cat', 'Все'); if (!CATS.includes(cat)) cat = 'Все';
  const grid = h('div', { class: 'grid' }), chips = h('div', { class: 'filters' });
  const total = G.games.reduce((s, g) => s + (g.cards ? g.cards() : 0), 0);
  let np = store.get('np', 0); if (![0, 2, 3, 4, 5, 6].includes(np)) np = 0;
  const fits = g => { const t = g.teams || { min: 2, max: 8 }; return !np || g.coop || (np === 6 ? t.max >= 6 : np >= t.min && np <= t.max); };
  let pack = curPack(); if (!PACKS.some(p => p[0] === pack)) pack = 'all';
  const packHas = (g, p) => (g.decks || []).some(n => DATA.themed && DATA.themed[n] && DATA.themed[n][p] && DATA.themed[n][p].length);
  const packOk = g => pack !== 'kids' || !(g.decks || []).length || packHas(g, 'kids');
  const visible = () => G.games.filter(g => (cat === 'Все' || g.cats.includes(cat)) && fits(g) && packOk(g));
  const randomBtn = btn('Случайная игра', () => { const l = visible(); if (l.length) Intro(pick(l)); }, 'small paper');
  function paint() {
    chips.replaceChildren(h('span', { class: 'flabel' }, 'Тема вечера'), ...PACKS.map(([id, lab, em]) => h('button', { class: 'chipbtn pack', type: 'button', 'aria-pressed': id === pack, onclick: () => { pack = id; store.set('pack', id); paint(); } }, em + ' ' + lab)),
      h('span', { class: 'fsep', 'aria-hidden': 'true' }),
      ...CATS.map(c => h('button', { class: 'chipbtn', type: 'button', 'aria-pressed': c === cat, onclick: () => { cat = c; store.set('cat', c); paint(); } }, c)),
      h('span', { class: 'fsep', 'aria-hidden': 'true' }),
      h('span', { class: 'flabel' }, 'Сколько вас?'),
      ...[[0, 'Любо'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6+']].map(([n, l]) => h('button', { class: 'chipbtn num', type: 'button', 'aria-pressed': n === np, 'aria-label': n ? 'Игроков: ' + l : 'Любое число игроков', onclick: () => { np = n; store.set('np', n); paint(); } }, n ? l : 'Любое')),
      randomBtn);
    const list = visible();
    if (!list.length) { grid.replaceChildren(h('div', { class: 'empty' }, h('b', null, 'Для такой компании игр не нашлось.'), h('span', null, 'Выберите другой раздел или число игроков.'))); return; }
    grid.replaceChildren(...list.map((g, i) => h('button', { class: 'gcard', type: 'button', style: { '--c': g.color, '--rot': ((i % 3) - 1) * .8 + 'deg' }, onclick: () => { sfx.click(); Intro(g); } },
      h('div', { class: 'art' + (DATA.art && DATA.art[g.id] ? ' has-ill' : '') }, DATA.art && DATA.art[g.id] ? Pics.ill(g.id) : null, ...(DATA.art && DATA.art[g.id] ? [] : gameArt(g).map((e, k) => h('span', { class: 'a' + (k + 1) }, e)))),
      h('div', { class: 'body' }, h('h3', null, g.title), h('p', { class: 'tag' }, g.tagline),
        h('div', { class: 'meta' }, pack !== 'all' && packHas(g, pack) ? h('span', { class: 'pill hot' }, PACKS.find(p => p[0] === pack)[2] + ' есть наборы') : null, h('span', { class: 'pill' }, g.coop ? 'вся компания' : playersLabel(g)), h('span', { class: 'pill' }, '~' + g.mins + ' мин'))))));
  }
  paint();
  mount(h('div', { class: 'wrap' },
    h('div', { class: 'hero' },
      h('div', { class: 'hero-main' }, Pics.ill('hero', 'hero-ill'), h('div', null, h('h1', null, 'Игротека'), h('p', { style: { marginTop: '.6rem' } }, 'Игры для компании на одном экране. Поставьте ноутбук или телевизор на стол — телефоны и интернет не нужны.'))),
      h('div', { class: 'top' }, setBtn(), muteBtn(), fullBtn())),
    chips, grid,
    h('div', { class: 'foot' },
      h('span', null, 'В коробке ' + total + ' ' + plural(total, 'карточка', 'карточки', 'карточек') + '. Они не повторяются, пока не кончатся все.'),
      btn('Сбросить историю карточек', () => confirmBox('Все карточки снова станут «новыми». Сбросить?', () => { store.clearSeen(); Home(); }, 'Сбросить'), 'ghost small'))));
}
function playersLabel(g) { const t = g.teams || { min: 2, max: 8 }; return t.min === t.max ? t.min + ' ' + plural(t.min, 'участник', 'участника', 'участников') : t.min + '–' + t.max + ' ' + plural(t.max, 'участник', 'участника', 'участников'); }

/* ---------- вступление и настройка ---------- */
function Intro(g) {
  G.inSession = false; Music.stop(); Voice.stop();
  const t = g.teams || { min: 2, max: 8 };
  const unit = g.unit || 'Команда';
  let n = clamp(store.get('n.' + g.id, Math.max(t.min, Math.min(2, t.max))), t.min, t.max);
  const saved = store.get('names', []);
  const isDef = x => !x || /^(Команда|Игрок) \d$/.test(String(x).trim());
  const names = range(8).map(i => isDef(saved[i]) ? unit + ' ' + (i + 1) : saved[i]);
  const optVals = {};
  (g.opts || []).forEach(o => { optVals[o.key] = store.get('o.' + g.id + '.' + o.key, o.def); });
  const teamBox = h('div'), countBox = h('div', { class: 'stepper' });
  function paintTeams() {
    countBox.replaceChildren(btn('−', () => { if (n > t.min) { n--; paintTeams(); } }, 'paper icon'), h('b', null, n), btn('+', () => { if (n < t.max) { n++; paintTeams(); } }, 'paper icon'), h('span', null, plural(n, g.unitOne || 'участник', g.unitFew || 'участника', g.unitMany || 'участников')));
    const swap = (i, j) => { [names[i], names[j]] = [names[j], names[i]]; paintTeams(); };
    teamBox.replaceChildren(...range(n).map(i => h('div', { class: 'teamrow', style: { '--c': TEAM_COLORS[i] } }, h('span', { class: 'dot' }), h('input', { class: 'input', value: names[i], maxlength: 22, 'aria-label': 'Название ' + (i + 1), oninput: e => { names[i] = e.target.value; } }),
      n > 1 ? h('span', { class: 'mv' }, h('button', { class: 'btn paper icon small', type: 'button', disabled: i === 0, 'aria-label': 'Поднять выше: ходит раньше', title: 'Ходит раньше', onclick: () => { sfx.click(); swap(i, i - 1); } }, '↑'), h('button', { class: 'btn paper icon small', type: 'button', disabled: i === n - 1, 'aria-label': 'Опустить ниже: ходит позже', title: 'Ходит позже', onclick: () => { sfx.click(); swap(i, i + 1); } }, '↓')) : null)));
  }
  const optBox = (g.opts || []).map(o => {
    const seg = h('div', { class: 'seg' });
    if (o.multi) {
      if (!Array.isArray(optVals[o.key])) optVals[o.key] = [];
      const list = () => typeof o.values === 'function' ? o.values() : o.values;
      const paintM = () => { const cur = optVals[o.key]; seg.replaceChildren(h('button', { type: 'button', 'aria-pressed': !cur.length, onclick: () => { optVals[o.key] = []; paintM(); } }, 'Все'), ...list().map(v => { const val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : v; return h('button', { type: 'button', 'aria-pressed': cur.includes(val), onclick: () => { const i = cur.indexOf(val); if (i >= 0) cur.splice(i, 1); else cur.push(val); if (cur.length >= list().length) cur.length = 0; paintM(); } }, lab); })); };
      seg.classList.add('multi'); paintM(); return h('div', null, h('div', { class: 'label' }, o.label, h('small', { class: 'muted' }, ' можно выбрать несколько')), seg);
    }
    const paint = () => seg.replaceChildren(...o.values.map(v => { const val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : v; return h('button', { type: 'button', 'aria-pressed': optVals[o.key] === val, onclick: () => { optVals[o.key] = val; paint(); } }, lab); }));
    paint(); return h('div', null, h('div', { class: 'label' }, o.label), seg);
  });
  paintTeams();
  const start = () => {
    const list = range(g.coop ? 1 : n).map(i => ({ name: (g.coop ? (names[0] && names[0].trim() ? names[0] : 'Мы') : (names[i] || '').trim() || (unit + ' ' + (i + 1))), color: TEAM_COLORS[i] }));
    if (!g.coop) { store.set('n.' + g.id, n); store.set('names', names.map(x => (x || '').trim())); }
    for (const k in optVals) store.set('o.' + g.id + '.' + k, optVals[k]);
    keepAwake(); startSession(g, list, { ...optVals });
  };
  mount(h('div', { class: 'wrap room', style: { '--accent': g.color } },
    h('div', { class: 'row', style: { marginBottom: '1.2rem' } }, withIco(btn('Каталог', Home, 'ghost small'), 'home'), h('span', { class: 'grow' }), setBtn(), muteBtn(), fullBtn()),
    h('div', { class: 'intro' },
      h('div', null,
        h('div', { class: 'title-row' }, (DATA.art && DATA.art[g.id] ? h('div', { class: 'ill-badge', style: { '--c': g.color } }, Pics.ill(g.id)) : Pics.sticker(gameArt(g), { size: 'l', tone: g.color, flat: true })), h('h1', null, g.title)),
        h('p', { class: 'mid-t', style: { marginBottom: '1.2rem' } }, g.tagline),
        h('div', { class: 'panel' }, h('h2', null, 'Как играть'), h('div', { class: 'rules', html: g.rules }))),
      h('div', { class: 'panel dark' },
        g.coop ? h('div', null, h('h2', null, 'Играет вся компания'), h('p', { class: 'muted' }, 'Обсуждайте, спорьте и решайте вместе. Можно задать название команды.'), h('div', { class: 'teamrow', style: { '--c': TEAM_COLORS[0] } }, h('span', { class: 'dot' }), h('input', { class: 'input', value: names[0].startsWith(unit) ? 'Мы' : names[0], maxlength: 22, oninput: e => { names[0] = e.target.value; } })))
          : h('div', null, h('h2', null, t.min === t.max ? 'Участники' : (g.unitTitle || 'Кто играет')), countBox, n > 1 ? h('p', { class: 'muted', style: { marginTop: '.5rem' } }, 'Сверху вниз — порядок ходов. Стрелки меняют команды местами.') : null, h('div', { style: { marginTop: '.6rem' } }, teamBox)),
        optBox,
        h('div', { style: { marginTop: '1.4rem' } }, btn('Играть', start, 'huge', { 'data-primary': true, style: '' }))))));
}

/* ---------- сессия ---------- */
function startSession(game, teamList, opts) {
  const T = teamList.map(t => ({ name: t.name, color: t.color, score: 0 }));
  const board = h('div', { class: 'board' }), stage = h('main', { class: 'stage' }), turnbar = h('div', { class: 'turnbar', 'aria-live': 'polite' });
  let turn = -1, lastBar = '', streakN = 0, lastScorer = -1, ttsEl = null;
  G.inSession = true; G.mood = game.mood || MOOD_BY_GAME[game.id] || 'fun'; Voice.stop(); Music.start(G.mood); sfx.start();
  /* крупный баннер «кто сейчас действует»: o.turn — индекс команды, o.role — что делает, o.all — действуют все */
  function paintTurn(o) {
    const role = o.role || '';
    if (o.bar === false || (turn < 0 && !role)) { turnbar.className = 'turnbar off'; turnbar.replaceChildren(); lastBar = ''; return; }
    const t = turn >= 0 ? T[turn] : null, key = (t ? t.name : '*') + '|' + role;
    turnbar.className = 'turnbar' + (t ? '' : ' all') + (key !== lastBar && (t ? t.name : '*') !== lastBar.split('|')[0] ? ' swap' : '') + (o.compact ? ' compact' : '');
    turnbar.style.setProperty('--c', t ? t.color : 'var(--sun)');
    turnbar.replaceChildren(h('span', { class: 'tb-ico' }, ico(t ? 'user' : 'users')), h('div', { class: 'tb-txt' }, h('div', { class: 'tb-role' }, role || 'Сейчас ход'), h('div', { class: 'tb-name' }, t ? t.name : (o.who || 'Вся компания'))));
    lastBar = key;
  }
  function paintBoard(bumpIdx) {
    board.replaceChildren(...T.map((t, i) => h('div', { class: 'tchip' + (i === turn ? ' on' : '') + (i === bumpIdx ? ' bump' : ''), style: { '--c': t.color } }, h('span', null, t.name), game.noScore ? null : h('span', { class: 'sc' }, t.score))));
    board.style.display = (game.coop && game.noBoard) ? 'none' : '';
  }
  const api = {
    game, teams: T, opts, n: T.length, stage,
    show(content, o = {}) {
      runLeave(); stage.className = 'stage' + (o.mid ? ' mid' : ''); stage.replaceChildren(...[].concat(content).flat(Infinity).filter(Boolean));
      if (o.turn !== undefined) turn = o.turn; paintBoard(); paintTurn(o); window.scrollTo(0, 0);
      const p = stage.querySelector('[data-primary]'); if (p) p.focus({ preventScroll: true });
      const tt = stage.querySelector('[data-tts]'); if (ttsEl) ttsEl.disabled = !tt; if (tt && Settings.get('ttsAuto')) setTimeout(() => api.speakNow(), 350); else Voice.stop();
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
    flagCard() { openFlag(); },
    rules() { const m = modal(h('div', null, h('h2', { style: { marginBottom: '.6rem' } }, game.title), h('div', { class: 'rules', html: game.rules })), [btn('Понятно', () => m.close(), '')]); },
    exit() { confirmBox('Выйти из игры? Очки не сохранятся.', Home, 'Выйти', 'Остаться'); },
    /* выбор команды: cb(i) или cb(-1) для «никто» */
    pickTeam(label, cb, o = {}) {
      const ex = o.exclude || [];
      return h('div', { class: 'stack' }, label ? h('div', { class: 'mid-t' }, label) : null,
        h('div', { class: 'picks' }, T.map((t, i) => ex.includes(i) ? null : btn(t.name, () => cb(i), 'big pick', { style: { '--c': t.color } })), o.none ? btn(o.none, () => cb(-1), 'big paper') : null));
    },
    end(o = {}) { Results(api, o); },
    sorted() { return T.map((t, i) => ({ ...t, i })).sort((a, b) => b.score - a.score); }
  };
  const frame = h('div', { class: 'frame room', style: { '--accent': game.color } },
    h('div', { class: 'motif', 'aria-hidden': 'true' }, ...gameArt(game).concat(gameArt(game)).map(e => h('span', null, e))),
    h('header', { class: 'bar' },
      withIco(btn('Выход', () => api.exit(), 'ghost small'), 'back'),
      h('div', { class: 'bar-title' }, h('i', null, game.icon), game.title),
      withIco(btn('Правила', () => api.rules(), 'ghost small'), 'help'), (ttsEl = ttsBtn(api)), flagBtn(api), setBtn(), muteBtn(), fullBtn()),
    board, turnbar, stage);
  paintBoard(); mount(frame); game.start(api);
}

function Results(api, o) {
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
  api.show(h('div', { class: 'stack center', style: { alignItems: 'center', textAlign: 'center', paddingTop: '2vh' } },
    o.art || null, h('h1', { class: 'big', style: { fontSize: 'clamp(40px,8vw,96px)' } }, title), o.sub ? h('p', { class: 'mid-t muted' }, o.sub) : null, body,
    h('div', { class: 'row center', style: { marginTop: '1rem' } }, btn('Сыграть ещё раз', () => startSession(g, api.teams.map(t => ({ name: t.name, color: t.color })), api.opts), 'big', { 'data-primary': true }), btn('В каталог', Home, 'big paper'))), { turn: -1 });
}

/* ---------- запуск ---------- */
function boot() { Home(); }
