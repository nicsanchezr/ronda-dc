// Regenera las capturas de docs/capturas/ a partir de dist/index.html (npm run build antes).
// Uso: node tools/capturas.mjs [nombre…]   (sin nombres: todas; p. ej. «node tools/capturas.mjs demo-gif»)
// Usa Microsoft Edge instalado (Windows) con el renderizado normal del navegador: con SwiftShader
// el fondo de la escena sale negro. El GIF de la demo se arma con gifenc (sin dependencias nativas).
import { chromium } from '@playwright/test';
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { PNG } from 'pngjs';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const APP = pathToFileURL(path.resolve('dist/index.html')).href;
const OUT = 'docs/capturas';
const VIEW = { width: 1280, height: 800 };
const only = process.argv.slice(2);

const browser = await chromium.launch({ channel: process.env.CI ? undefined : 'msedge' });
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
      if (!palette || frames % 12 === 0) palette = quantize(data, 256); // paleta renovada cada pocos cuadros
      const now = Date.now();
      gif.writeFrame(applyPalette(data, palette), w, h, { palette, delay: Math.max(120, now - last) });
      last = now; frames++;
      const d = await R(p, () => window.__ronda.demo());
      if (d.caption === 'demo.wait' || frames > 160) break;
      await p.waitForTimeout(150);
    }
    gif.finish();
    fs.writeFileSync(`${OUT}/demo.gif`, gif.bytes());
    console.log('✓ demo.gif', frames, 'cuadros', (gif.bytes().length / 1024 / 1024).toFixed(1) + ' MB');
    await p.close();
  },
};

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
