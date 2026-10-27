/* ===================== Настройки, музыка, озвучка, эффекты ===================== */
const SET_DEF = { vol: .8, sfx: true, tick: true, music: true, musicVol: .5, mood: 'auto', tts: true, ttsAuto: false, ttsRate: 1, ttsVoice: '', fx: 'full' };
const Settings = {
  get(k) { const v = store.get('set.' + k, SET_DEF[k]); return v === undefined ? SET_DEF[k] : v; },
  set(k, v) { store.set('set.' + k, v); if (k === 'musicVol' || k === 'vol' || k === 'music') Music.sync(); }
};

/* ---------- музыка: короткие зацикленные синтезированные мелодии ---------- */
const Music = (() => {
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI -> Гц
  const MOODS = {
    fun:   { bpm: 116, root: 60, scale: [0, 2, 4, 7, 9], bass: [0, 0, 7, 5], lead: 'triangle', hat: true, name: 'Весёлая' },
    party: { bpm: 126, root: 62, scale: [0, 2, 4, 5, 7, 9], bass: [0, 5, 7, 5], lead: 'square', hat: true, name: 'Вечеринка' },
    calm:  { bpm: 78,  root: 57, scale: [0, 2, 4, 7, 9], bass: [0, 0, 5, 7], lead: 'sine', hat: false, name: 'Спокойная' },
    tense: { bpm: 132, root: 57, scale: [0, 3, 5, 6, 7, 10], bass: [0, 0, 3, 1], lead: 'sawtooth', hat: true, name: 'Напряжённая' }
  };
  let cur = null, timer = null, step = 0, nextT = 0, master = null, noiseBuf = null, melody = [], mood = null, ducked = false;
  const ac = () => sfx.ctx();
  function level() { return sfx.muted || !Settings.get('music') ? 0 : Settings.get('musicVol') * Settings.get('vol') * .16 * (ducked ? .25 : 1); }
  function sync() { if (master) master.gain.setTargetAtTime(level(), ac().currentTime, .08); }
  function voice(f, t, d, type, vol, filt) {
    const a = ac(), o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    let out = g; o.connect(g);
    if (filt) { const bq = a.createBiquadFilter(); bq.type = 'lowpass'; bq.frequency.value = filt; g.connect(bq); out = bq; }
    out.connect(master); o.start(t); o.stop(t + d + .05);
  }
  function hat(t, vol = .35) {
    const a = ac(); if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * .05, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length); }
    const s = a.createBufferSource(), g = a.createGain(), hp = a.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000; s.buffer = noiseBuf; g.gain.value = vol; s.connect(hp); hp.connect(g); g.connect(master); s.start(t);
  }
  function makeMelody(m) { // 2 такта по 8 шагов: случайная, но «правильная» по звукоряду
    const sc = m.scale, len = 16; const out = []; let deg = rnd(sc.length);
    for (let i = 0; i < len; i++) { if (Math.random() < .28 && i % 4 !== 0) { out.push(null); continue; } deg = clamp(deg + pick([-2, -1, -1, 0, 1, 1, 2]), 0, sc.length * 2 - 1); const oct = deg >= sc.length ? 12 : 0; out.push(m.root + 12 + oct + sc[deg % sc.length]); }
    return out;
  }
  function schedule() {
    const a = ac(), m = cur; if (!m) return; const dur = 60 / m.bpm / 2; // восьмая
    while (nextT < a.currentTime + .35) {
      const s = step % 32, bar = Math.floor(s / 8) % 4, beat = s % 8;
      if (s === 0 && step > 0 && Math.random() < .5) melody = makeMelody(m);
      const mel = melody[s % melody.length];
      if (mel && beat % 1 === 0) voice(N(mel), nextT, dur * 1.6, m.lead, m.lead === 'sine' ? .5 : .22, 2600);
      if (beat === 0 || (beat === 4 && m !== MOODS.calm)) voice(N(m.root - 24 + m.bass[bar]), nextT, dur * 3, 'sine', .9);
      if (m.hat && beat % 2 === 1) hat(nextT, .3);
      if (m === MOODS.calm && beat === 0) { [0, 2, 4].forEach(k => voice(N(m.root - 12 + m.scale[k]), nextT, dur * 7, 'sine', .16)); }
      nextT += dur; step++;
    }
  }
  function start(name) {
    if (!Settings.get('music') || sfx.muted) { cur = null; return; }
    const key = Settings.get('mood') !== 'auto' ? Settings.get('mood') : name; const m = MOODS[key] || MOODS.fun;
    if (cur === m && timer) return; stop(true);
    const a = ac(); if (!a) return; master = a.createGain(); master.gain.value = 0; master.connect(a.destination); cur = m; mood = key; step = 0; melody = makeMelody(m); nextT = a.currentTime + .1;
    master.gain.setTargetAtTime(level(), a.currentTime, .6); timer = setInterval(schedule, 120); schedule();
  }
  function stop(quick) {
    clearInterval(timer); timer = null; cur = null;
    if (master) { const g = master, a = ac(); g.gain.setTargetAtTime(0, a.currentTime, quick ? .02 : .25); setTimeout(() => { try { g.disconnect(); } catch (e) { } }, 900); master = null; }
  }
  function duck(on) { ducked = on; sync(); }
  return { start, stop, sync, duck, MOODS, get playing() { return !!timer; } };
})();

/* ---------- озвучка вопросов (встроенный синтез речи браузера) ---------- */
const Voice = (() => {
  const ok = () => typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
  const voices = () => { try { return speechSynthesis.getVoices().filter(v => /^ru/i.test(v.lang)); } catch (e) { return []; } };
  function speak(text) {
    if (!ok() || !text || !Settings.get('tts')) return false;
    try {
      speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(String(text).replace(/[_•]+/g, ' ')); u.lang = 'ru-RU'; u.rate = Settings.get('ttsRate');
      const want = Settings.get('ttsVoice'), vs = voices(); const v = vs.find(x => x.name === want) || vs[0]; if (v) u.voice = v;
      u.volume = clamp(Settings.get('vol') + .2, 0, 1); u.onstart = () => Music.duck(true); u.onend = u.onerror = () => Music.duck(false);
      speechSynthesis.speak(u); return true;
    } catch (e) { return false; }
  }
  const stop = () => { try { speechSynthesis.cancel(); Music.duck(false); } catch (e) { } };
  return { ok, voices, speak, stop };
})();

/* ---------- мини-эффекты ---------- */
const fx = (() => {
  const lvl = () => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'off' : Settings.get('fx');
  function burst(el, n = 14, cols = ['#ffc233', '#2fd6a0', '#3aa0ff', '#ff7ab8']) {
    if (lvl() === 'off' || !el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (lvl() === 'light') n = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 80;
      const p = h('i', { class: 'spark', style: { left: cx + 'px', top: cy + 'px', background: pick(cols), '--dx': Math.cos(a) * d + 'px', '--dy': Math.sin(a) * d - 30 + 'px' } });
      document.body.append(p); setTimeout(() => p.remove(), 900);
    }
  }
  function flash(el, cls = 'flash-good') { if (lvl() === 'off' || !el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 800); }
  function float(el, text) { if (lvl() === 'off' || !el) return; const r = el.getBoundingClientRect(); const t = h('b', { class: 'floater', style: { left: r.left + r.width / 2 + 'px', top: r.top + 'px' } }, text); document.body.append(t); setTimeout(() => t.remove(), 1200); }
  function confettiAmount(n) { const l = lvl(); return l === 'off' ? 0 : l === 'light' ? Math.round(n * .35) : n; }
  return { burst, flash, float, confettiAmount, lvl };
})();

/* ---------- окно настроек ---------- */
function openSettings() {
  const body = h('div', { class: 'settings' });
  const row = (label, ctl, hint) => h('div', { class: 'srow' }, h('div', { class: 'sl' }, h('b', null, label), hint ? h('small', null, hint) : null), ctl);
  const toggle = (k, onChange) => { const b = h('button', { class: 'tgl', type: 'button', role: 'switch', 'aria-checked': String(!!Settings.get(k)) }, h('i')); b.onclick = () => { Settings.set(k, !Settings.get(k)); b.setAttribute('aria-checked', String(!!Settings.get(k))); sfx.click(); onChange && onChange(); }; return b; };
  const range = (k, min, max, step, onInput) => h('input', { class: 'rng', type: 'range', min, max, step, value: Settings.get(k), 'aria-label': k, oninput: e => { Settings.set(k, +e.target.value); onInput && onInput(); } });
  const seg = (k, vals, cb) => { const w = h('div', { class: 'seg' }); const paint = () => w.replaceChildren(...vals.map(([v, l]) => h('button', { type: 'button', 'aria-pressed': Settings.get(k) === v, onclick: () => { Settings.set(k, v); sfx.click(); paint(); cb && cb(); } }, l))); paint(); return w; };
  const voiceSel = () => { const vs = Voice.voices(); if (!vs.length) return h('small', { class: 'muted' }, Voice.ok() ? 'Русский голос не найден в этом браузере' : 'Озвучка не поддерживается'); const s = h('select', { class: 'input', 'aria-label': 'Голос', onchange: e => Settings.set('ttsVoice', e.target.value) }, ...vs.map(v => h('option', { value: v.name, selected: v.name === Settings.get('ttsVoice') }, v.name))); return s; };
  body.append(
    h('h2', null, 'Настройки'),
    h('h3', null, 'Звук'),
    row('Общая громкость', range('vol', 0, 1, .05, () => sfx.ding())),
    row('Звуки игры', toggle('sfx'), 'Клики, верно и неверно, взрыв'),
    row('Звук таймера', toggle('tick'), 'Тиканье в последние секунды'),
    h('h3', null, 'Музыка'),
    row('Фоновая музыка', toggle('music', () => { Settings.get('music') ? Music.start('fun') : Music.stop(); }), 'Играет во время игры, без слов'),
    row('Громкость музыки', range('musicVol', 0, 1, .05)),
    row('Стиль', seg('mood', [['auto', 'Под игру'], ['fun', 'Весёлая'], ['party', 'Вечеринка'], ['calm', 'Спокойная'], ['tense', 'Напряжённая']], () => Music.start(G.mood || 'fun')), 'Выберите, чтобы услышать'),
    h('h3', null, 'Озвучка вопросов'),
    row('Кнопка «Озвучить»', toggle('tts'), Voice.ok() ? 'Читает вслух вопрос на экране' : 'В этом браузере нет синтеза речи'),
    row('Читать автоматически', toggle('ttsAuto'), 'Каждый новый вопрос зачитывается сам'),
    row('Голос', voiceSel()),
    row('Скорость речи', range('ttsRate', .6, 1.4, .1, () => { })),
    row('Проверить', btn('Озвучить пример', () => Voice.speak('Какой океан самый большой на Земле?'), 'small paper')),
    h('h3', null, 'Анимации'),
    row('Эффекты при ответах', seg('fx', [['full', 'Полные'], ['light', 'Лёгкие'], ['off', 'Выключены']]), 'Для телевизора лучше «Лёгкие»'),
    h('h3', null, 'Карточки'),
    row('Замечания к карточкам', btn('Открыть список', () => { m.close(); openReports(); }, 'small paper'), 'Скрытые карточки и экспорт для проверки')
  );
  const m = modal(body, [btn('Готово', () => { Voice.stop(); m.close(); if (!G.inSession) Music.stop(); }, '', { 'data-primary': true })]);
  return m;
}
function setBtn() { const b = h('button', { class: 'btn ghost icon', type: 'button', title: 'Настройки', 'aria-label': 'Настройки звука и озвучки' }, ico('gear')); b.onclick = () => { sfx.click(); openSettings(); }; return b; }

/* ---------- настроение музыки по играм ---------- */
const MOOD_BY_GAME = { bomb: 'tense', defuse: 'tense', escape: 'tense', spy: 'tense', detective: 'calm', radio: 'calm', bluff: 'calm', dilemma: 'calm', hang: 'calm', charades: 'party', taboo: 'party', tod: 'party', likely: 'party', never: 'party', missions: 'party', literal: 'party', cinema: 'party', nofinish: 'party', whoami: 'party', draw: 'party', assoc: 'party', jeopardy: 'fun', cities: 'calm' };

/* ---------- кнопки в шапке игры ---------- */
function ttsBtn(api) {
  const b = h('button', { class: 'btn ghost icon', type: 'button', title: 'Озвучить вопрос', 'aria-label': 'Озвучить вопрос', disabled: true }, ico('speak'));
  b.onclick = () => { sfx.click(); api.speakNow(); };
  if (!Voice.ok() || !Settings.get('tts')) b.style.display = 'none';
  return b;
}
function flagBtn(api) { const b = h('button', { class: 'btn ghost icon', type: 'button', title: 'Сообщить об ошибке в карточке', 'aria-label': 'Сообщить об ошибке в карточке' }, ico('flag')); b.onclick = () => { sfx.click(); openFlag(); }; return b; }

/* ---------- ошибки в карточках ---------- */
function openFlag() {
  if (!LAST) { modal(h('p', { class: 'mid-t' }, 'Пока нет карточки, на которую можно пожаловаться. Откройте вопрос или задание.'), []); return; }
  const m = modal(h('div', null, h('h2', null, 'Ошибка в карточке?'), h('p', { class: 'mid-t', style: { margin: '.6rem 0' } }, describeItem(LAST.item)),
    h('p', { class: 'muted' }, 'Карточка скроется и больше не выпадет. Её можно найти в настройках и отправить на проверку.')),
    [btn('Скрыть и пожаловаться', () => { const bk = 'bad.' + LAST.deck, l = store.get(bk, []); l.push(itemKey(LAST.item)); store.set(bk, l); const r = store.get('reports', []); r.push({ deck: LAST.deck, text: describeItem(LAST.item), at: new Date().toISOString().slice(0, 10) }); store.set('reports', r); m.close(); }, 'bad'), btn('Отмена', () => m.close(), 'paper')]);
}
function openReports() {
  const list = store.get('reports', []);
  const copy = () => { const txt = list.map(r => '[' + r.deck + '] ' + r.text).join('\n'); try { navigator.clipboard.writeText(txt); } catch (e) { const a = h('a', { href: 'data:text/plain;charset=utf-8,' + encodeURIComponent(txt), download: 'igroteka-reports.txt' }); document.body.append(a); a.click(); a.remove(); } };
  const m = modal(h('div', null, h('h2', null, 'Замечания к карточкам'), list.length ? h('div', { class: 'reports' }, list.map(r => h('div', { class: 'rep' }, h('b', null, r.deck), h('span', null, r.text)))) : h('p', { class: 'muted', style: { marginTop: '.6rem' } }, 'Пока нет замечаний. Нажмите флажок в шапке игры, если заметили ошибку.')),
    [list.length ? btn('Скопировать список', copy, 'paper') : null, list.length ? btn('Вернуть скрытые', () => { Object.keys(localStorage).filter(k => k.startsWith('igroteka.bad.') || k === 'igroteka.reports').forEach(k => localStorage.removeItem(k)); m.close(); }, 'paper') : null, btn('Закрыть', () => m.close(), '')].filter(Boolean));
}
