// Genera los videos de la demo.
//   npm run video           → videos/ronda-dc-demo-es.mp4 y -en.mp4 (16:9, 1920 × 1080, #demo/grabar)
//   npm run video:vertical  → videos/ronda-dc-demo-es-4x5.mp4 y -en-4x5.mp4 (4:5, 1080 × 1350,
//                             #demo/grabar-vertical: feed de LinkedIn en el celular)
// Captura cuadro por cuadro y de forma determinista: el reloj de la página es falso (page.clock: Date,
// setTimeout, setInterval, requestAnimationFrame y performance.now) y avanza exactamente 1/30 s por
// cuadro antes de cada captura, así que el video sale fluido aunque el computador sea lento.
// Las transiciones CSS se desactivan (no dependen de ese reloj). Los cuadros van directo a ffmpeg
// (MP4 H.264, 30 fps). Navegador: Edge en Windows, el Chromium de Playwright en macOS y Linux
// (o RONDA_BROWSER=msedge|chrome|chromium), siempre con GPU; con --ventana abre el navegador con ventana.
// Uso: node tools/video.mjs [es|en] [--vertical] [--ventana]
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { launchBrowser, findFfmpeg } from './browser.mjs';

const APP = pathToFileURL(path.resolve('dist/index.html')).href;
const OUT = 'videos';
const args = process.argv.slice(2);
const vertical = args.includes('--vertical');
const W = vertical ? 1080 : 1920, H = vertical ? 1350 : 1080, FPS = 30;
const ROUTE = vertical ? 'demo/grabar-vertical' : 'demo/grabar';
const SUFFIX = vertical ? '-4x5' : '';
const MAX_VIDEO_S = vertical ? 90 : 240; // el vertical es para el feed: 60–90 s
const langs = args.filter((a) => a === 'es' || a === 'en');
const headed = args.includes('--ventana');
const MAX_S = Number(process.env.VIDEO_MAX_S || 0); // pruebas rápidas: corta el video a N segundos

async function record(lang, ffmpeg) {
  const file = path.join(OUT, `ronda-dc-demo-${lang}${SUFFIX}.mp4`);
  const browser = await launchBrowser({ headless: !headed, args: ['--hide-scrollbars'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1, locale: lang === 'es' ? 'es-CL' : 'en-US' });
  await page.addInitScript(([l]) => {
    localStorage.setItem('ronda-dc-idioma', l);
    localStorage.setItem('ronda-dc-tema', JSON.stringify({ theme: 'sala', mode: 'light' }));
    // sin transiciones ni animaciones CSS: cada cuadro depende solo del reloj falso
    document.addEventListener('DOMContentLoaded', () => {
      const st = document.createElement('style');
      st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}';
      document.head.appendChild(st);
    });
  }, [lang]);
  const T0 = new Date('2026-11-16T12:00:00Z').getTime();
  await page.clock.install({ time: T0 });
  await page.clock.pauseAt(T0 + 10);
  await page.goto(`${APP}?test&video#${ROUTE}`);

  const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    // JPEG (rango completo) → yuv420p de rango limitado, el estándar de H.264 que esperan LinkedIn y los reproductores
    '-vf', `scale=${W}:${H}:in_range=pc:out_range=tv,format=yuv420p`, '-color_range', 'tv',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-r', String(FPS), '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg terminó con código ' + c)))));
  const write = (buf) => new Promise((res) => { if (ff.stdin.write(buf)) res(); else ff.stdin.once('drain', res); });

  let frame = 0, tail = -1;
  const t0 = Date.now();
  for (;;) {
    const ms = Math.round(((frame + 1) * 1000) / FPS) - Math.round((frame * 1000) / FPS); // 33/34 ms: 1/30 s exacto en promedio
    await page.clock.runFor(ms);
    await write(await page.screenshot({ type: 'jpeg', quality: 92 }));
    frame++;
    if (tail < 0 && frame % 15 === 0 && (await page.evaluate(() => window.__ronda.demo().videoDone))) tail = 10; // cierre limpio
    if (tail >= 0 && tail-- === 0) break;
    if (MAX_S && frame >= MAX_S * FPS) break;
    if (frame % (FPS * 10) === 0) console.log(`  ${lang}: ${frame / FPS} s de video (${Math.round((Date.now() - t0) / 1000)} s reales)`);
    if (frame > FPS * 240) throw new Error('el video supera los 4 minutos: algo no terminó');
  }
  if (frame > FPS * MAX_VIDEO_S && !MAX_S) console.warn(`  ⚠ ${lang}: ${(frame / FPS).toFixed(1)} s, más de ${MAX_VIDEO_S} s`);
  ff.stdin.end();
  await done;
  await browser.close();
  const mb = fs.statSync(file).size / 1024 / 1024;
  console.log(`✓ ${file} · ${(frame / FPS).toFixed(1)} s · ${mb.toFixed(1)} MB`);
}

const ffmpeg = findFfmpeg();
fs.mkdirSync(OUT, { recursive: true });
for (const lang of langs.length ? langs : ['es', 'en']) await record(lang, ffmpeg);
