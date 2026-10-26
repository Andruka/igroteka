// node test/contrast.js <game id> [клики через |]  — контраст видимого текста (плоские фоны)
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path');
(async () => {
  const [, , id, clicks] = process.argv;
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await p.goto('file://' + path.resolve(__dirname, '../index.html'));
  if (id !== 'home') {
    await p.evaluate(id => Intro(G.games.find(g => g.id === id)), id);
    await p.getByRole('button', { name: 'Играть', exact: true }).click();
    for (const c of (clicks || '').split('|').filter(Boolean)) { await p.locator(c).first().click(); await p.waitForTimeout(200); }
  }
  await p.waitForTimeout(700);
  const res = await p.evaluate(() => {
    const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(',').map(x => parseFloat(x)); return { r: a[0], g: a[1], b: a[2], a: a[3] === undefined ? 1 : a[3] }; };
    const over = (f, bg) => ({ r: f.r * f.a + bg.r * (1 - f.a), g: f.g * f.a + bg.g * (1 - f.a), b: f.b * f.a + bg.b * (1 - f.a), a: 1 });
    const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
    const bgOf = el => { const chain = []; for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e); const c = parse(cs.backgroundColor); if (cs.backgroundImage !== 'none') chain.push('IMG'); if (c && c.a > 0) { chain.push(c); if (c.a === 1) break; } } let base = { r: 20, g: 26, b: 70, a: 1 }; for (const c of chain.reverse()) if (c !== 'IMG') base = over(c, base); return { base, img: chain.includes('IMG') }; };
    const out = [], seen = new Set();
    document.querySelectorAll('.stage *, .bar *, .board *').forEach(el => {
      const t = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim();
      if (!t || !el.offsetParent || seen.has(el.className + t)) return; seen.add(el.className + t);
      const cs = getComputedStyle(el); const fg = parse(cs.color); const { base, img } = bgOf(el); const f = over(fg, base);
      const L1 = lum(f), L2 = lum(base); const r = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
      const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
      out.push({ t: t.slice(0, 34), cls: String(el.className).slice(0, 22), r: +r.toFixed(2), need: big ? 3 : 4.5, img, ok: r >= (big ? 3 : 4.5) });
    });
    return out;
  });
  res.filter(x => !x.ok).forEach(x => console.log('LOW', JSON.stringify(x)));
  console.log(id, 'checked', res.length, 'low', res.filter(x => !x.ok).length);
  await b.close();
})();
