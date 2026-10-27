/* ===================== Общие заготовки для игр ===================== */

/* Ходы по кругу: каждая команда играет rounds раз. play(ti, номерХода, всего, next, последний) */
function rotate(api, rounds, play) {
  const total = api.n * rounds; let i = 0;
  const next = () => { if (i >= total) return api.end(); const ti = i % api.n; i++; play(ti, i, total, next, i === total); };
  next();
}

const pts = (n) => n + ' ' + plural(n, 'очко', 'очка', 'очков');

/* Вопрос с вариантами ответов, ошибка — перехват другой командой.
   c: { ti, kicker, title, items:[{t,ok}], pts, stealPts, time, explain, last, next, steal(true) } */
function choiceRound(api, c) {
  const items = c.items, full = c.pts, half = c.stealPts ?? Math.round(full / 2);
  let done = false, stealer = -1; const wrong = new Set();
  const letters = 'АБВГДЕ';
  const bs = items.map((it, i) => h('button', { class: 'opt', type: 'button', onclick: () => pickOpt(i) }, h('b', null, letters[i]), h('span', null, it.t)));
  const info = h('div', { class: 'ans hidden' }), exp = h('div', { class: 'card hidden' }), actions = h('div', { class: 'stack' });
  const timer = c.time ? Timer(c.time, { onEnd: timeUp }) : null;
  const say = t => { info.classList.remove('hidden'); info.textContent = t; };
  function reveal() {
    done = true; if (timer) timer.stop();
    bs.forEach((b, i) => { b.classList.toggle('right', items[i].ok); b.classList.toggle('dim', !items[i].ok && !wrong.has(i)); b.disabled = true; });
    if (c.explain) { exp.classList.remove('hidden'); exp.replaceChildren(h('div', { class: 'mid-t' }, c.explain)); }
    const nb = btn(c.last ? 'Итоги' : 'Дальше', c.next, 'big', { 'data-primary': true });
    actions.replaceChildren(nb); nb.focus();
  }
  function good(who, p) { sfx.ok(); try { const b = bs.find((_, i) => items[i].ok); if (b) { b.classList.add('flash-good'); fx.burst(b); } } catch (e) {} api.score(who, p); say(api.teams[who].name + ': +' + pts(p) + '.'); reveal(); }
  function fail(i) { sfx.bad(); if (i != null && i >= 0) { bs[i].classList.add('wrong', 'shake'); bs[i].disabled = true; wrong.add(i); } }
  function steal() {
    if (c.steal === false || api.n < 2) { say('Верный ответ подсвечен.'); return reveal(); }
    const go = who => {
      stealer = who; api.setTurn(who, 'Перехватывает вопрос'); actions.replaceChildren(); say(api.teams[who].name + ', ваш шанс: верный ответ даст ' + pts(half) + '.');
      if (timer) { timer.reset(c.time); timer.start(); }
    };
    if (api.n === 2) return go(1 - c.ti);
    api.setTurn(-1, 'Перехват за половину очков', 'Кто рискнёт?');
    say('Перехват за половину очков!');
    actions.replaceChildren(api.pickTeam('Кто перехватывает?', who => who < 0 ? (say('Никто не рискнул.'), reveal()) : go(who), { exclude: [c.ti], none: 'Никто' }));
  }
  function pickOpt(i) {
    if (done) return;
    if (stealer >= 0) { if (items[i].ok) return good(stealer, half); fail(i); say('И перехват не удался.'); return reveal(); }
    if (items[i].ok) return good(c.ti, full);
    fail(i); if (timer) timer.stop(); steal();
  }
  function timeUp() { if (done) return; sfx.buzz(); if (stealer >= 0) { say('Время вышло.'); return reveal(); } say('Время вышло!'); steal(); }
  api.show([
    h('div', { class: 'card accent' + (c.pic ? ' withpic' : '') }, c.pic || null, h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, c.kicker), typeof c.title === 'string' ? h('div', { class: 'big', 'data-tts': c.title }, c.title) : (c.title.setAttribute('data-tts', ''), c.title), timer ? timer.el : null)),
    h('div', { class: 'opts', 'data-tts': items.map((it, i) => 'Вариант ' + letters[i] + '. ' + it.t).join('. ') }, bs), info, exp, actions
  ], { turn: c.ti, role: c.role || 'Отвечает на вопрос' });
  if (timer) timer.start();
}

/* «Получилось?» — решение за столом. onDone(успех) */
function judgeRow(api, text, okLabel, onDone, badLabel = 'Не вышло') {
  return h('div', { class: 'stack' }, text ? h('div', { class: 'mid-t' }, text) : null,
    h('div', { class: 'row' }, btn(okLabel, () => onDone(true), 'big good', { 'data-primary': true }), btn(badLabel, () => onDone(false), 'big bad')));
}

/* Кнопка-заглушка «передайте устройство» */
function handover(api, who, text, go, label = 'Я готов', ti) {
  api.show(h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Передайте устройство'), h('div', { class: 'big' }, who), h('p', { class: 'mid-t' }, text), btn(label, go, 'big', { 'data-primary': true })), ti === undefined ? { mid: true } : { mid: true, turn: ti, role: 'Берёт устройство' });
}

/* Заголовок хода */
function turnHead(api, ti, sub) {
  /* имя игрока теперь показывает баннер хода; здесь остаётся только подсказка */
  return sub ? h('p', { class: 'mid-t turnsub' }, sub) : null;
}
