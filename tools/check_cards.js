// Проверка данных без браузера: node tools/check_cards.js [--json].
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadData() {
  const context = vm.createContext({ DATA: {} });
  const dir = path.resolve(__dirname, '../src/data');
  for (const name of fs.readdirSync(dir).filter(name => name.endsWith('.js')).sort()) {
    vm.runInContext(fs.readFileSync(path.join(dir, name), 'utf8'), context, { filename: name });
  }
  return { data: context.DATA, id: vm.runInContext('quizCardId', context), questionKey: vm.runInContext('quizQuestionKey', context) };
}

function validateData(data) {
  const errors = [], ids = new Set(), text = value => typeof value === 'string' && value.trim().length > 0;
  const exact = value => value.normalize('NFC').trim();
  const categories = new Set((data.quizCats || []).map(cat => cat.id));
  let reviewed = 0;
  if (!Array.isArray(data.quiz) || !data.quiz.length) errors.push('Пустая база викторины');
  for (const card of data.quiz || []) {
    const label = card.id || card.q || 'Без названия';
    const error = reason => errors.push(label + ': ' + reason);
    if (!/^quiz-[a-f0-9]{8}$/.test(card.id || '')) error('нет устойчивого ID');
    if (ids.has(card.id)) error('повтор ID: проверьте совпадающие формулировки');
    ids.add(card.id);
    if (!categories.has(card.c)) error('неизвестная тема');
    if (!Number.isInteger(card.l) || card.l < 1 || card.l > 5) error('сложность вне диапазона 1–5');
    if (!text(card.q)) error('пустой вопрос');
    if (!Array.isArray(card.a) || card.a.length !== 4 || !card.a.every(text)) error('нужно четыре непустых ответа');
    else if (new Set(card.a.map(exact)).size !== 4) error('одинаковые варианты ответа');
    if (card.source !== undefined) {
      try { if (new URL(card.source).protocol !== 'https:') error('источник должен использовать HTTPS'); } catch { error('неверная ссылка на источник'); }
    }
    if (card.checkedAt !== undefined && (!/^\d{4}-\d{2}-\d{2}$/.test(card.checkedAt) || !Number.isFinite(Date.parse(card.checkedAt)) || new Date(card.checkedAt).toISOString().slice(0, 10) !== card.checkedAt)) error('неверная дата проверки');
    if (card.reviewed !== undefined && typeof card.reviewed !== 'boolean') error('статус проверки должен быть true или false');
    if (card.reviewed === true) { if (!card.source || !card.checkedAt) error('для проверенной карточки нужны источник и дата'); else reviewed++; }
  }
  let memoryPairs = 0;
  if (!data.memory || !Object.keys(data.memory).length) errors.push('Пустая база «Пар»');
  for (const [theme, pairs] of Object.entries(data.memory || {})) {
    if (!Array.isArray(pairs) || pairs.length < 18) { errors.push('Пары / ' + theme + ': нужно минимум 18 пар'); continue; }
    const left = new Set(), right = new Set(); memoryPairs += pairs.length;
    for (const pair of pairs) {
      if (!Array.isArray(pair) || pair.length !== 2 || !pair.every(text)) { errors.push('Пары / ' + theme + ': пустая или неверная пара'); continue; }
      const l = exact(pair[0]).toLowerCase(), r = exact(pair[1]).toLowerCase();
      if (left.has(l) || right.has(r)) errors.push('Пары / ' + theme + ': повтор ' + pair.join(' — '));
      left.add(l); right.add(r);
    }
  }
  return { ok: !errors.length, quiz: (data.quiz || []).length, reviewed, pendingReview: (data.quiz || []).length - reviewed, memoryThemes: Object.keys(data.memory || {}).length, memoryPairs, errors };
}

if (require.main === module) {
  const result = validateData(loadData().data);
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    console.log(`Викторина: ${result.quiz}; с источником и датой проверки: ${result.reviewed}; без полного редакторского статуса: ${result.pendingReview}`);
    console.log(`Пары: ${result.memoryThemes} тем, ${result.memoryPairs} пар`);
    result.errors.forEach(error => console.error('FAIL ' + error));
    console.log(result.ok ? 'ALL OK' : 'FAILED');
  }
  process.exitCode = result.ok ? 0 : 1;
}
module.exports = { loadData, validateData };
