/* ===================== Иллюстрации: подбор картинки по смыслу текста ===================== */
const Pics = (() => {
  let rules = null;
  const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е');
  function compile() {
    rules = [];
    DATA.pics.forEach(([e, stems]) => stems.trim().split(/\s+/).forEach(tok => {
      if (!tok) return;
      const tk0 = tok.replace(/_/g, " "); const whole = tok.endsWith('!'); const t = norm(tk0.replace(/!$/, '')).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
      rules.push({ e, re: new RegExp('(^|[^а-яa-z0-9])' + t + (whole ? '([^а-яa-z0-9]|$)' : '')), whole });
    }));
  }
  /* найти до max эмодзи по тексту, в порядке появления в тексте */
  function find(text, max = 2) {
    if (!rules) compile();
    const t = norm(text), hit = new Map();
    for (const r of rules) { const m = r.re.exec(t); if (m) { const i = m.index; if (!hit.has(r.e) || hit.get(r.e) > i) hit.set(r.e, i); } }
    return [...hit.entries()].sort((a, b) => a[1] - b[1]).slice(0, max).map(x => x[0]);
  }
  const hash = s => { let x = 7; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };
  /* Наклейка: большой эмодзи на цветной плитке и до двух малых рядом.
     o: size 's'|'m'|'l'|'xl', tone (цвет), fallback (эмодзи, если ничего не нашлось), key (для наклона), flat (без наклона) */
  function sticker(emojis, o = {}) {
    const list = (emojis && emojis.length ? emojis : [o.fallback || '✨']).slice(0, 3);
    const tilt = o.flat ? 0 : ((hash(o.key || list.join('')) % 7) - 3) * .9;
    const el = h('div', { class: 'stk stk-' + (o.size || 'l'), style: { '--tilt': tilt + 'deg', ...(o.tone ? { '--tone': o.tone } : {}) }, 'aria-hidden': 'true' },
      h('span', { class: 'stk-main' }, list[0]),
      ...list.slice(1).map((e, i) => h('span', { class: 'stk-sub s' + (i + 1) }, e)));
    return el;
  }
  /* по тексту сразу в наклейку */
  function of(text, o = {}) { return sticker(find(text, o.max || 2), { key: text, ...o }); }
  const parts = s => typeof Intl !== 'undefined' && Intl.Segmenter ? [...new Intl.Segmenter('ru', { granularity: 'grapheme' }).segment(s)].map(x => x.segment) : Array.from(s);
  /* иллюстрация Icons8 (SVG встроен в файл) */
  function ill(id, cls = '') { const el = h('div', { class: 'ill ' + cls, 'aria-hidden': 'true' }); el.innerHTML = (DATA.art && DATA.art[id]) || ''; return el; }
  return { find, sticker, of, hash, parts, ill };
})();
