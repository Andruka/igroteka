const assert = require('node:assert/strict');
const { loadData, validateData } = require('../tools/check_cards');
const { data, id, questionKey } = loadData();
assert.equal(validateData(data).ok, true, 'текущая база проходит проверку');
assert.equal(id('geo', 'Что это?'), id('geo', 'Что — это?'), 'пунктуация не меняет ID');
assert.notEqual(questionKey('Буква Ѳ'), questionKey('Буква Ѵ'), 'исторические буквы не исчезают при нормализации');
const fixture = () => ({ quizCats: [{ id: 'sci' }], quiz: [{ id: 'quiz-00000001', c: 'sci', l: 1, q: 'Температура?', a: ['0 °C', '10 °C', '−10 °C', '32 °C'] }], memory: { Test: Array.from({ length: 18 }, (_, i) => ['Термин ' + i, 'Определение ' + i]) } });
assert.equal(validateData(fixture()).ok, true, 'минус в числе имеет значение');
const stress = fixture(); stress.quiz[0].a = ['бухгАлтеров', 'бухгалтЕров', 'бухгалтерОв', 'бУхгалтеров'];
assert.equal(validateData(stress).ok, true, 'регистр может обозначать ударение');
for (const mutate of [
  f => { f.quiz.push({ ...f.quiz[0] }); },
  f => { f.quiz[0].a = ['a', 'a', 'b', 'c']; },
  f => { f.quiz[0].a = ['', 'a', 'b', 'c']; },
  f => { f.quiz[0].c = 'unknown'; },
  f => { f.quiz[0].l = 6; },
  f => { f.quiz[0].reviewed = true; },
  f => { f.quiz[0].checkedAt = '2026-02-31'; },
  f => { f.memory.Test = [['a', 'b']]; }
]) { const f = fixture(); mutate(f); assert.equal(validateData(f).ok, false, 'дефект карточки найден'); }
console.log('ALL OK: база, устойчивые ID, структура, источники, даты и смысловые символы');
