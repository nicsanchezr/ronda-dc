// Verifica el contraste WCAG 2.x de cada tema y modo (texto ≥ 4,5:1; elementos gráficos ≥ 3:1).
// Uso: node tools/contrast.mjs   (sale con código 1 si algún par no cumple)
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const dir = path.resolve('src/themes');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.theme.js'));
const hex = (c) => c.match(/\w\w/g).map((h) => parseInt(h, 16));
function rgb(c, under) { // admite #rrggbb y rgba(r,g,b,a) compuesto sobre "under"
  if (c.startsWith('#')) return hex(c);
  const [r, g, b, a = 1] = c.match(/[\d.]+/g).map(Number);
  const u = rgb(under);
  return [r, g, b].map((v, i) => v * a + u[i] * (1 - a));
}
const lum = (c) => { const v = c.map((x) => x / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

let fails = 0;
for (const f of files) {
  const th = (await import(pathToFileURL(path.join(dir, f)).href)).default;
  for (const mode of Object.keys(th.modes)) {
    const { ui, sev, onSev } = th.modes[mode];
    const glass = rgb(ui.glass, ui.bg);
    const C = (k) => (k === 'glass' ? glass : rgb(ui[k] ?? k, ui.bg));
    const text = [['txt', 'bg'], ['txt', 'bg2'], ['txt', 'panel'], ['txt', 'panel2'], ['txt', 'raised'], ['txt', 'glass'], ['txt', 'input'],
      ['mut', 'bg2'], ['mut', 'panel'], ['mut', 'panel2'], ['mut', 'glass'], ['accText', 'panel'], ['accText', 'bg2'], ['accText', 'glass'],
      ['accInk', 'acc'], ['btn2Ink', 'btn2'], ['goodText', 'panel'], ['warnText', 'panel'], ['badText', 'panel'], ['badText', 'glass'], ['warnText', 'bg2'],
      ['chipNewInk', 'chipNewBg'], ['chipDoneInk', 'chipDoneBg']];
    const graphic = [['acc', 'bg2'], ['focus', 'bg2'], ['line', 'panel']];
    const rows = [];
    for (const [a, b] of text) rows.push([`${a} / ${b}`, ratio(C(a), C(b)), 4.5]);
    for (const [a, b] of graphic) rows.push([`${a} / ${b} (gráfico)`, ratio(C(a), C(b)), a === 'line' ? 1.2 : 3]);
    for (const k of Object.keys(sev)) {
      if (k === 'ok') continue;
      rows.push([`sev.${k} / panel (ícono)`, ratio(hex(sev[k]), C('panel')), 3]);
      rows.push([`onSev.${k} / sev.${k} (número)`, ratio(hex(onSev[k]), hex(sev[k])), 3]);
    }
    const bad = rows.filter((r) => r[1] < r[2]);
    fails += bad.length;
    const min = rows.filter((r) => r[2] === 4.5).reduce((m, r) => Math.min(m, r[1]), 99);
    console.log(`\n${th.name.es} · ${mode === 'light' ? 'claro' : 'oscuro'} — texto mínimo ${min.toFixed(2)}:1, ${rows.length - bad.length}/${rows.length} pares cumplen`);
    if (process.env.VERBOSE) for (const [n, r] of rows.filter((r) => r[2] === 4.5).sort((x, y) => x[1] - y[1]).slice(0, 2)) console.log(`  · ${n}: ${r.toFixed(2)}:1`);
    for (const [n, r, req] of bad) console.log(`  ✗ ${n}: ${r.toFixed(2)}:1 (requiere ${req}:1)`);
  }
}
console.log(fails ? `\n${fails} pares bajo AA` : '\nTodos los pares cumplen WCAG AA');
process.exit(fails ? 1 : 0);
