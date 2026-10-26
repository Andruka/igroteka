/* 10. Комната на время — квест-комната: шифры, числа, коды. Каждый раз новые задачи */
{
  const wordDeck = makeDeck('escwords', DATA.escWords);
  const riddleDeck = makeDeck('riddles', DATA.riddles);
  const ABC = 'абвгдежзийклмнопрстуфхцчшщъыьэюя';
  const MORSE = { а: '.-', б: '-...', в: '.--', г: '--.', д: '-..', е: '.', ж: '...-', з: '--..', и: '..', й: '.---', к: '-.-', л: '.-..', м: '--', н: '-.', о: '---', п: '.--.', р: '.-.', с: '...', т: '-', у: '..-', ф: '..-.', х: '....', ц: '-.-.', ч: '---.', ш: '----', щ: '--.-', ы: '-.--', ь: '-..-', э: '..-..', ю: '..--', я: '.-.-' };
  const norm = s => String(s).toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9]/g, '');
  const shift = (w, k) => [...w].map(c => { const i = ABC.indexOf(c); return i < 0 ? c : ABC[(i + k + 32) % 32]; }).join('');
  const where = {
    caesar: ['Записка за картиной', 'Шифровка на двери', 'Письмо в бутылке'], alpha: ['Табличка на стене', 'Номера на сейфе', 'Билет без слов'],
    morse: ['Стук в трубе', 'Телеграмма', 'Мигающая лампа'], anagram: ['Рассыпанные буквы', 'Перепутанная надпись', 'Кубики на полу'],
    rev: ['Надпись в зеркале', 'Отражение в воде', 'Записка наоборот'], seq: ['Цифры на стене', 'Числовой замок', 'Панель с цифрами'],
    code: ['Кодовый замок', 'Сейф с тремя цифрами', 'Шкатулка на кодовом замке'], riddle: ['Загадка стража', 'Надпись на арке', 'Вопрос сфинкса']
  };
  const mk = {
    caesar() { const w = wordDeck.draw(x => x.length <= 8), k = 1 + rnd(5); return { type: 'caesar', body: ['Каждая буква шифровки сдвинута в алфавите на несколько шагов вперёд.', h('div', { class: 'cipher' }, shift(w, k).toUpperCase())], ans: [w], hint: 'Сдвиг равен ' + k + '. Верните каждую букву на ' + k + ' назад.' }; },
    alpha() { const w = wordDeck.draw(x => x.length <= 7); return { type: 'alpha', body: ['Каждое число — номер буквы в алфавите (А = 1, Б = 2, … Я = 32; Ё не считаем).', h('div', { class: 'cipher' }, [...w].map(c => ABC.indexOf(c) + 1).join(' · '))], ans: [w], hint: 'Первая буква слова: «' + w[0].toUpperCase() + '».' }; },
    morse() { const w = wordDeck.draw(x => x.length <= 5 && [...x].every(c => MORSE[c])); const used = [...new Set(w)].sort(); return { type: 'morse', body: ['Азбука Морзе: буквы разделены пробелом.', h('div', { class: 'cipher' }, [...w].map(c => MORSE[c]).join('   ')), h('div', { class: 'legend' }, used.map(c => h('span', null, h('b', null, c.toUpperCase()), ' ' + MORSE[c]))), h('div', { class: 'muted' }, 'В таблице — только нужные буквы, порядок другой.')], ans: [w], hint: 'В слове ' + w.length + ' ' + plural(w.length, 'буква', 'буквы', 'букв') + '.' }; },
    anagram() { const w = wordDeck.draw(x => x.length >= 5 && x.length <= 8); let s = w; for (let i = 0; i < 20 && s === w; i++) s = shuffle([...w]).join(''); return { type: 'anagram', body: ['Буквы перемешаны. Соберите слово.', h('div', { class: 'cipher' }, s.toUpperCase())], ans: [w], hint: 'Слово начинается на «' + w[0].toUpperCase() + '».' }; },
    rev() { const w = wordDeck.draw(x => x.length >= 4 && x.length <= 8); return { type: 'rev', body: ['Слово прочитано справа налево.', h('div', { class: 'cipher' }, [...w].reverse().join('').toUpperCase())], ans: [w], hint: 'Слово заканчивается на «' + w[w.length - 1].toUpperCase() + '».' }; },
    seq() {
      const kind = pick(['arith', 'geom', 'sq', 'fib', 'grow', 'alt']); let a = [], hint = '';
      if (kind === 'arith') { const s = 2 + rnd(9), d = 2 + rnd(8); a = range(6).map(i => s + d * i); hint = 'Прибавляйте одно и то же число.'; }
      else if (kind === 'geom') { const s = 1 + rnd(3), r = 2 + rnd(2); a = range(6).map(i => s * Math.pow(r, i)); hint = 'Каждое число умножается на одно и то же.'; }
      else if (kind === 'sq') { const k = rnd(6); a = range(6).map(i => (i + 1) * (i + 1) + k); hint = 'Это квадраты чисел 1, 2, 3… плюс одно число.'; }
      else if (kind === 'fib') { let x = 1 + rnd(4), y = 2 + rnd(4); a = [x, y]; for (let i = 0; i < 4; i++) { a.push(a[a.length - 1] + a[a.length - 2]); } hint = 'Каждое число — сумма двух предыдущих.'; }
      else if (kind === 'grow') { let x = 1 + rnd(5); a = [x]; for (let i = 1; i < 6; i++) { x += i; a.push(x); } hint = 'Разница растёт: +1, +2, +3…'; }
      else { const s = 10 + rnd(10), p = 3 + rnd(5), m = 1 + rnd(3); a = [s]; for (let i = 1; i < 6; i++) a.push(a[i - 1] + (i % 2 ? p : -m)); hint = 'Через раз прибавляется одно число, а потом вычитается другое.'; }
      const ans = a[5];
      return { type: 'seq', body: ['Продолжите ряд: какое число следующее?', h('div', { class: 'cipher' }, a.slice(0, 5).join(' · ') + ' · ?')], ans: [String(ans)], hint, digits: true };
    },
    code() {
      const all = []; for (let a = 0; a < 10; a++)for (let b = 0; b < 10; b++)for (let c = 0; c < 10; c++) if (a !== b && b !== c && a !== c) all.push([a, b, c]);
      const secret = pick(all);
      const score = (g, s) => { let p = 0, w = 0; g.forEach((d, i) => { if (s[i] === d) p++; else if (s.includes(d)) w++; }); return [p, w]; };
      let cands = all, clues = [];
      for (let t = 0; t < 40 && cands.length > 1; t++) {
        const g = pick(all); if (clues.some(c => c.g.join('') === g.join(''))) continue;
        const [p, w] = score(g, secret); const next = cands.filter(s => { const r = score(g, s); return r[0] === p && r[1] === w; });
        if (next.length < cands.length) { clues.push({ g, p, w }); cands = next; }
      }
      /* убрать лишние подсказки */
      for (let i = clues.length - 1; i >= 0 && clues.length > 2; i--) {
        const rest = clues.filter((_, j) => j !== i); const ok = all.filter(s => rest.every(c => { const r = score(c.g, s); return r[0] === c.p && r[1] === c.w; })).length === 1;
        if (ok) clues = rest;
      }
      const txt = c => (c.p === 0 && c.w === 0) ? 'ни одной верной цифры' : [c.p ? 'на своём месте: ' + c.p : '', c.w ? 'верные, но не на месте: ' + c.w : ''].filter(Boolean).join('; ');
      return { type: 'code', body: ['Код из трёх разных цифр. Перед вами старые попытки:', h('div', { class: 'codes' }, clues.map(c => h('div', null, h('b', null, c.g.join('')), ' — ' + txt(c))))], ans: [secret.join('')], hint: 'Первая цифра кода — ' + secret[0] + '.', digits: true };
    },
    riddle() { const r = riddleDeck.draw(); return { type: 'riddle', body: [h('div', { class: 'big' }, r.q)], ans: r.a, hint: 'Ответ начинается на «' + r.a[0][0].toUpperCase() + '».' }; }
  };
  G.escGen = mk;
  registerGame({
    id: 'escape', title: 'Комната на время', icon: '🗝️', color: '#ffc233',
    cats: ['Загадки и истории', 'Для компании', 'Для двоих'], teams: { min: 1, max: 1 }, coop: true, noBoard: true, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', mins: 15,
    tagline: 'Вы заперты в комнате. Расшифруйте записки, цифры и коды, пока не вышло время. Каждый раз новые задачи.',
    rules: '<ul><li>Вы все вместе заперты в комнате. На выход — несколько замков, и у каждого своя загадка.</li><li>Решайте сообща: шифры Цезаря, азбука Морзе, ряды чисел, анаграммы, кодовые замки и загадки.</li><li>Ответ вводите в поле на экране. Регистр и буква «ё» не важны.</li><li>Подсказка стоит 30 секунд. Загадку можно пропустить и вернуться к ней позже.</li><li>Откройте все замки до конца таймера — и вы на свободе.</li></ul>',
    opts: [
      { key: 'mins', label: 'Время', values: [[10, '10 минут'], [15, '15 минут'], [25, '25 минут']], def: 15 },
      { key: 'locks', label: 'Замков', values: [5, 7, 9], def: 7 }
    ],
    cards: () => DATA.escWords.length + DATA.riddles.length,
    start(api) {
      const types = Object.keys(mk), queue = [];
      let last = '';
      for (let i = 0; i < api.opts.locks; i++) {
        let t, g = 0; do { t = pick(types); } while ((t === last || (t === 'riddle' && queue.filter(q => q === 'riddle').length >= 2)) && ++g < 20);
        queue.push(t); last = t;
      }
      const puzzles = queue.map(t => ({ t, p: null }));
      let solved = 0, hints = 0, over = false;
      const timer = Timer(api.opts.mins * 60, { onEnd: () => finish(false), low: 20 });
      timer.start();
      let cur = 0;
      const order = puzzles.map((_, i) => i);
      show();
      function show() {
        if (over) return;
        if (!order.length) return finish(true);
        const idx = order[0], pz = puzzles[idx];
        if (!pz.p) pz.p = mk[pz.t]();
        const p = pz.p, num = puzzles.length - order.length + 1;
        const input = h('input', { class: 'input', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: p.digits ? 'Введите число' : 'Введите ответ', inputmode: p.digits ? 'numeric' : 'text', 'aria-label': 'Ответ' });
        const msg = h('div', { class: 'muted' });
        const hintBox = h('div', { class: 'ans hidden' });
        if (pz.hinted) { hintBox.classList.remove('hidden'); hintBox.textContent = 'Подсказка: ' + p.hint; }
        const check = () => {
          const v = norm(input.value); if (!v) return;
          if (p.ans.some(a => norm(a) === v)) { sfx.ok(); solved++; order.shift(); msg.textContent = 'Замок открыт.'; show(); }
          else { sfx.bad(); input.classList.add('shake'); setTimeout(() => input.classList.remove('shake'), 500); msg.textContent = 'Не подходит. Подумайте ещё.'; input.select(); }
        };
        input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
        const hintBtn = btn(pz.hinted ? 'Подсказка уже открыта' : 'Подсказка (−30 с)', () => { if (pz.hinted) return; pz.hinted = true; hints++; timer.add(-30); hintBox.classList.remove('hidden'); hintBox.textContent = 'Подсказка: ' + p.hint; hintBtn.textContent = 'Подсказка уже открыта'; hintBtn.disabled = true; if (timer.left <= 0) finish(false); }, 'paper small');
        if (pz.hinted) hintBtn.disabled = true;
        api.show([
          h('div', { class: 'row' }, timer.el),
          h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Замок ' + num + ' из ' + puzzles.length + ' · ' + pick(where[p.type])), ...p.body),
          hintBox,
          h('div', { class: 'row' }, input, btn('Открыть', check, 'big', { 'data-primary': true })),
          msg,
          h('div', { class: 'row' }, hintBtn, btn('Пропустить', () => { order.push(order.shift()); show(); }, 'paper small', { disabled: order.length < 2 }))
        ], { turn: -1 });
        setTimeout(() => input.focus(), 30);
      }
      function finish(win) {
        if (over) return; over = true; timer.stop();
        const left = Math.max(0, Math.round(timer.left));
        api.end(win ? {
          win: true, title: 'Вы на свободе!', custom: true, sub: 'Все замки открыты.',
          lines: ['Осталось времени: ' + fmtTime(left) + '.', 'Подсказок использовано: ' + hints + '.', left > api.opts.mins * 30 ? 'Отличный результат: даже половина времени ещё не прошла.' : 'Успели в последний момент.']
        } : {
          win: false, title: 'Время вышло', custom: true, sub: 'Открыто замков: ' + solved + ' из ' + puzzles.length + '.',
          lines: ['Дверь так и осталась запертой. Попробуйте ещё раз: задачи будут другими.']
        });
      }
    }
  });
}
