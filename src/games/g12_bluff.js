/* 12. Верю — не верю — расскажи историю, правдивую или выдуманную */
{
  const deck = makeDeck('bluff', DATA.bluff);
  registerGame({
    id: 'bluff', title: 'Верю — не верю', icon: '🤥', color: '#ff7ab8',
    cats: ['Для компании', 'Для двоих', 'Командные'], teams: { min: 2, max: 8 }, unit: 'Игрок', unitOne: 'игрок', unitFew: 'игрока', unitMany: 'игроков', mins: 20,
    tagline: 'Расскажите историю, настоящую или выдуманную. Остальные задают вопросы и решают: верить или нет.',
    rules: '<ul><li>В свой ход рассказчик получает тему и тайную роль: <b>правда</b> или <b>выдумка</b>. Он зажимает кнопку, чтобы узнать роль, пока остальные не смотрят.</li><li>Рассказывает историю на заданную тему. Если роль «правда», то это случилось с ним. Если «выдумка», он сочиняет на ходу.</li><li>Затем остальные задают вопросы, а рассказчик отвечает уверенно. Время ограничено.</li><li>Каждый из слушателей говорит «верю» или «не верю». Правильно угадавший получает очко, а рассказчик получает очко за каждого обманутого слушателя.</li></ul>',
    opts: [
      { key: 'rounds', label: 'Ходов у каждого', values: [1, 2, 3], def: 2 },
      { key: 'ask', label: 'Время на вопросы', values: [[30, '30 секунд'], [60, '60 секунд'], [90, '90 секунд']], def: 60 }
    ],
    cards: () => DATA.bluff.length,
    start(api) {
      rotate(api, api.opts.rounds, (ti, k, total, next, last) => {
        const name = api.teams[ti].name, topic = deck.draw(), truth = Math.random() < .5;
        const voters = range(api.n).filter(i => i !== ti);
        handover(api, name, 'Ход ' + k + ' из ' + total + '. Остальные, отвернитесь от экрана: роль увидит только рассказчик.', secret, 'Показать роль', ti);
        function secret() {
          api.show([
            h('div', { class: 'card' }, h('div', { class: 'kicker' }, 'Только для рассказчика'), h('div', { class: 'mid-t' }, topic),
              peek(h('div', { class: 'big ' + (truth ? 'vgood' : 'vbad') }, truth ? 'Это правда: расскажите то, что было на самом деле.' : 'Это выдумка: сочиняйте на ходу.'), 'Зажмите, чтобы узнать роль')),
            btn('Запомнил — рассказываю', tell, 'big', { 'data-primary': true })
          ], { turn: ti, role: 'Читает свою роль' });
        }
        function tell() {
          api.show([
            h('div', { class: 'card accent withpic' }, Pics.of(topic, { size: 'xl', fallback: '💭' }), h('div', { class: 'qbody' }, h('div', { class: 'kicker' }, 'Рассказывает ' + name), h('div', { class: 'big' }, topic), h('p', { class: 'mid-t' }, 'Расскажите историю. Когда закончите, начнутся вопросы.'))),
            btn('Рассказ окончен — вопросы', ask, 'big', { 'data-primary': true })
          ], { turn: ti, role: 'Рассказывает историю' });
        }
        function ask() {
          const timer = Timer(api.opts.ask, { onEnd: () => { sfx.buzz(); vote(); } });
          api.show([
            h('div', { class: 'card accent' }, h('div', { class: 'kicker' }, 'Вопросы к ' + name), h('p', { class: 'mid-t' }, 'Задавайте любые уточняющие вопросы: где, когда, кто был рядом, что сказали. Рассказчик отвечает уверенно.'), timer.el),
            btn('К голосованию', () => { timer.stop(); vote(); }, 'big', { 'data-primary': true })
          ], { turn: ti, role: 'Отвечает на вопросы' });
          timer.start();
        }
        function vote() {
          const choice = new Map(voters.map(i => [i, null])); const box = h('div', { class: 'stack' });
          const go = btn('Показать правду', reveal, 'big', { 'data-primary': true, disabled: true });
          const paint = () => {
            box.replaceChildren(...voters.map(i => h('div', { class: 'vrow', style: { '--c': api.teams[i].color } }, h('b', null, api.teams[i].name),
              h('div', { class: 'row' }, btn('Верю', () => { choice.set(i, true); paint(); }, 'good' + (choice.get(i) === true ? '' : ' ghost')), btn('Не верю', () => { choice.set(i, false); paint(); }, 'bad' + (choice.get(i) === false ? '' : ' ghost'))))));
            go.disabled = [...choice.values()].some(v => v === null);
          };
          paint();
          api.show([h('div', { class: 'big' }, 'Голосуем'), h('p', { class: 'mid-t' }, 'Каждый слушатель решает: верит он рассказчику или нет.'), box, go], { turn: -1, role: 'Голосуют слушатели', who: 'Все, кроме рассказчика' });
          function reveal() {
            let fooled = 0, right = [];
            voters.forEach(i => { const ok = choice.get(i) === truth; if (ok) { api.score(i, 1); right.push(api.teams[i].name); } else fooled++; });
            if (fooled) api.score(ti, fooled);
            truth ? sfx.ok() : sfx.bad();
            api.show([
              h('div', { class: 'cover' }, h('div', { class: 'kicker' }, 'Это была'), h('div', { class: 'big' }, truth ? 'ПРАВДА' : 'ВЫДУМКА'),
                h('p', { class: 'mid-t' }, 'Угадали: ' + (right.length ? right.join(', ') : 'никто') + '.' + (fooled ? ' ' + name + ' получает ' + pts(fooled) + '.' : '')),
                btn(last ? 'Итоги' : 'Дальше', next, 'big', { 'data-primary': true }))
            ], { turn: ti, mid: true, role: 'Итог раунда' });
          }
        }
      });
    }
  });
}
