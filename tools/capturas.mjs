// Regenera las capturas de docs/capturas/ a partir de dist/index.html (npm run build antes).
// Uso: node tools/capturas.mjs [nombre…]   (sin nombres: todas; p. ej. «node tools/capturas.mjs demo-gif»)
// Navegador: Edge en Windows y el Chromium de Playwright en macOS y Linux (tools/browser.mjs), con el
// renderizado normal del navegador: con SwiftShader el fondo de la escena sale negro. El GIF de la demo
// se arma con gifenc (sin dependencias nativas).
import { launchBrowser } from './browser.mjs';
import gifenc from 'gifenc'; // CommonJS
const { GIFEncoder, quantize, applyPalette } = gifenc;
import { PNG } from 'pngjs';
import fs from 'fs';
import { PERFECT } from '../src/perfect-run.js';
import { STEP_SHOTS, SHOT_TYPES, SHOT_TYPES_V } from '../src/demo.js';
import path from 'path';
import { pathToFileURL } from 'url';

const APP = pathToFileURL(path.resolve('dist/index.html')).href;
const OUT = 'docs/capturas';
const VIEW = { width: 1280, height: 800 };
const only = process.argv.slice(2);

const browser = await launchBrowser();
async function page(lang = 'es', viewport = VIEW) {
  const p = await browser.newPage({ viewport, locale: lang === 'es' ? 'es-CL' : 'en-US' });
  await p.addInitScript(([l]) => { localStorage.setItem('ronda-dc-idioma', l); localStorage.setItem('ronda-dc-tema', JSON.stringify({ theme: 'sala', mode: 'light' })); }, [lang]);
  return p;
}
const R = (p, fn, arg) => p.evaluate(fn, arg);
const step = (p, min) => R(p, (m) => window.__ronda.step(m), min);
const select = (p, kind, id) => R(p, ([k, i]) => window.__ronda.select(k, i), [kind, id]);
const idle = (p) => p.waitForFunction(() => !document.querySelector('#view3d').classList.contains('busy'));
async function game(p, route = 'turno/normal/completo') {
  await p.goto(`${APP}?test#${route}`);
  await p.click('#startbtn');
  if (!route.includes('guiado')) await p.click('#pause');
}
async function shot(p, name) { await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('✓', name); }

const JOBS = {
  async portada() {
    const p = await page();
    await p.goto(`${APP}?test`); await p.waitForTimeout(1500);
    await shot(p, 'portada'); await p.close();
  },
  async sala() {
    const p = await page();
    await game(p); await step(p, 120);
    await p.click('.tabs button[data-tab="monitoreo"]');
    await shot(p, 'sala'); await p.close();
  },
  async rack() {
    const p = await page();
    await game(p); await step(p, 120);
    await p.fill('#search', 'R06'); await p.press('#search', 'Enter');
    await p.click('[data-act="rack-detail"]'); await idle(p);
    await p.click('[data-side="rear"]'); await idle(p);
    await select(p, 'device', 'R06/k8s-n7');
    await shot(p, 'rack'); await p.close();
  },
  async acciones() {
    const p = await page();
    await game(p); await step(p, 70.05);
    await p.click('.tabs button[data-tab="tickets"]'); await p.click('.row.ticket >> nth=0');
    await select(p, 'rack', 'R08');
    await p.click('#inspector [data-act="fa"][data-fa="blank-install"]');
    await shot(p, 'acciones'); await p.close();
  },
  async glosario() {
    const p = await page();
    await game(p); await step(p, 70.05);
    await select(p, 'rack', 'R08');
    await p.hover('#inspector .gl[data-gl="ipmi"]');
    await shot(p, 'glosario'); await p.close();
  },
  async guiado() {
    const p = await page();
    await game(p, 'turno/guiado/corto');
    await p.click('#coach [data-act="coach-skip"]');
    await step(p, 10.05);
    await p.click('.tabs button[data-tab="tickets"]'); await p.click('.row.ticket >> nth=0');
    await p.click('.tabs button[data-tab="accesos"]');
    await p.click('[data-act="attach"][data-ev="acc:acc-0805"]');
    await p.click('#tutor [data-act="hint"]');
    await shot(p, 'guiado'); await p.close();
  },
  async checklist() {
    const p = await page();
    await p.goto(`${APP}?test#checklist/guiado`);
    await select(p, 'rack', 'R08');
    await p.click('[data-act="ritem"][data-item="blank"]');
    await p.click('[data-act="attach"][data-ev="obs:r08-blank"]');
    await p.click('[data-act="rstatus"][data-item="blank"][data-v="falla"]');
    await p.evaluate(() => document.querySelector('.ritem[data-item="blank"]').scrollIntoView({ block: 'center' }));
    await shot(p, 'checklist'); await p.close();
  },
  async correccion() {
    const p = await page();
    await game(p, 'turno/normal/corto'); await step(p, 10.05);
    await p.click('.tabs button[data-tab="tickets"]'); await p.click('.row.ticket >> nth=0');
    await p.click('.tabs button[data-tab="cambios"]'); await p.click('[data-act="attach"][data-ev="cal:CHG-1042"]');
    await p.click('.tabs button[data-tab="tickets"]'); await p.click('.row.ticket >> nth=0');
    await p.click('.detail [data-act="resolve"]');
    const f = p.locator('#resolveform');
    await f.locator('input[name=cls][value=benigno]').check(); await f.locator('input[name=prio][value=P4]').check();
    await f.locator('input[name=act][value=a1]').check(); await f.locator('input[name=esc][value=nadie]').check();
    await f.locator('textarea[name=note]').fill('Ingreso de Austral Storage Services verificado con CHG-1042.');
    await f.locator('#submitbtn').click();
    await shot(p, 'correccion'); await p.close();
  },
  // Nuevas en v0.5: versión en inglés y modo Demo
  async ingles() {
    const p = await page('en');
    await game(p, 'turno/normal/corto'); await step(p, 35.05);
    await p.click('.tabs button[data-tab="tickets"]'); await p.click('.row.ticket >> nth=0');
    await select(p, 'rack', 'R08');
    await shot(p, 'ingles'); await p.close();
  },
  async demo() {
    const p = await page();
    await p.goto(`${APP}?test#demo`);
    await R(p, () => window.__ronda.demoSpeed(2));
    await p.waitForFunction(() => window.__ronda.demo().caption === 'demo.E3.detail', null, { timeout: 240_000 });
    await idle(p); await p.waitForTimeout(1200);
    await shot(p, 'demo'); await p.close();
  },
  /**
   * Hoja de contactos de las tomas de cámara de la demo (docs/demo-tomas.png): la demo se detiene
   * en cada toma (?tomas) hasta tomar la captura. Cada cuadro lleva el número de paso del guion.
   */
  tomas: () => contactSheet(false),
  /** Igual, para el formato vertical 4:5 (#demo/grabar-vertical, con sus tarjetas): docs/demo-tomas-vertical.png. */
  'tomas-vertical': () => contactSheet(true),
  /** GIF corto de la demo: el evento E3 (paneles ciegos) completo, a 2×. */
  async 'demo-gif'() {
    const p = await page('es', { width: 1280, height: 720 });
    await p.goto(`${APP}?test#demo/grabar`);
    await R(p, () => window.__ronda.demoSpeed(2));
    await p.waitForFunction(() => window.__ronda.demo().caption === 'demo.E3.open', null, { timeout: 240_000 });
    const gif = GIFEncoder();
    let last = Date.now(), frames = 0, palette = null;
    for (;;) {
      const png = PNG.sync.read(await p.screenshot());
      const { data, w, h } = half(png);
      if (!palette || frames % 10 === 0) palette = quantize(data, 96, { format: 'rgb444' }); // paleta renovada cada pocos cuadros
      const now = Date.now();
      gif.writeFrame(applyPalette(data, palette, 'rgb444'), w, h, { palette, delay: Math.max(200, now - last) });
      last = now; frames++;
      const d = await R(p, () => window.__ronda.demo());
      if (d.caption === 'demo.wait' || frames > 120) break;
      await p.waitForTimeout(380); // ~2 cuadros por segundo: el GIF queda liviano para el README
    }
    gif.finish();
    fs.writeFileSync(`${OUT}/demo.gif`, gif.bytes());
    console.log('✓ demo.gif', frames, 'cuadros', (gif.bytes().length / 1024 / 1024).toFixed(1) + ' MB');
    await p.close();
  },
};

async function contactSheet(vertical) {
  const types = vertical ? SHOT_TYPES_V : SHOT_TYPES;
  const p = await page('es', vertical ? { width: 1080, height: 1350 } : { width: 1280, height: 800 });
  await p.goto(`${APP}?test&rapido&tomas#${vertical ? 'demo/grabar-vertical' : 'demo'}`);
  const order = ['E1', 'E3', 'E6', 'E7'];
  const stepNo = {}; let n = 0;
  for (const e of order) PERFECT[e].forEach((_, i) => { stepNo[`${e}:${i}`] = ++n; });
  const shots = [];
  while (shots.length < Object.keys(STEP_SHOTS).length) {
    await p.waitForFunction(() => window.__ronda.demo().waitingShot, null, { timeout: 120_000 });
    const d = await R(p, () => window.__ronda.demo());
    const key = d.waitingShot, info = d.shots.filter((x) => x.key === key).pop();
    const s = STEP_SHOTS[key];
    const img = (await p.screenshot({ type: 'jpeg', quality: 80 })).toString('base64');
    const how = s.detail ? 'vista de detalle del rack' : info && info.clear ? `ángulo ${info.cand + 1} de ${types[s.kind].cands.length} · línea de visión libre` : 'sin ángulo libre → vista de detalle';
    shots.push({ n: stepNo[key], key, label: `${s.kind} ${s.id}`, how, img, ok: s.detail || (info && info.clear) });
    console.log('·', stepNo[key], key, how);
    await R(p, () => window.__ronda.demoResumeShot());
  }
  await p.close();
  const sheet = await browser.newPage({ viewport: { width: 1500, height: 800 } });
  await sheet.setContent(`<!doctype html><meta charset="utf-8"><style>
    body{margin:0;padding:24px;background:#e9ebe8;font:15px system-ui,sans-serif;color:#1f2427}
    h1{font-size:22px;margin:0 0 4px}p{margin:0 0 18px;color:#555e65}
    .g{display:grid;grid-template-columns:repeat(${vertical ? 4 : 3},1fr);gap:16px}
    figure{margin:0;background:#fff;border:1px solid #cfd4ce;border-radius:8px;overflow:hidden}
    img{display:block;width:100%}figcaption{padding:8px 10px}b{font-size:17px}
    .ok{color:#1f6f3f}.bad{color:#b42318}</style>
    <h1>Ronda DC · tomas de cámara de la demo${vertical ? ' · formato vertical 4:5 (1080 × 1350)' : ''}</h1>
    <p>Turno corto en Normal. Cada cuadro: número de paso del guion (src/perfect-run.js), evento:índice, objetivo y ángulo usado. Las tomas se comprueban con raycasting antes de usarse.</p>
    <div class="g">${shots.map((x) => `<figure><img src="data:image/jpeg;base64,${x.img}"><figcaption><b>Paso ${x.n}</b> · ${x.key} · ${x.label}<br><span class="${x.ok ? 'ok' : 'bad'}">${x.how}</span></figcaption></figure>`).join('')}</div>`);
  const file = vertical ? 'docs/demo-tomas-vertical.png' : 'docs/demo-tomas.png';
  await sheet.screenshot({ path: file, fullPage: true });
  console.log('✓', file, shots.length, 'tomas');
  await sheet.close();
}

/** Reduce una imagen PNG a la mitad (promedio de 2×2 píxeles). */
function half(png) {
  const w = png.width >> 1, h = png.height >> 1, src = png.data, data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) {
      const i = ((2 * y) * png.width + 2 * x) * 4 + c;
      data[(y * w + x) * 4 + c] = (src[i] + src[i + 4] + src[i + png.width * 4] + src[i + png.width * 4 + 4]) >> 2;
    }
  }
  return { data, w, h };
}

for (const [name, job] of Object.entries(JOBS)) if (!only.length || only.includes(name)) await job();
await browser.close();
