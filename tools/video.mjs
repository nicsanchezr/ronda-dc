// Genera los videos de la demo (npm run video): videos/ronda-dc-demo-es.mp4 y videos/ronda-dc-demo-en.mp4.
// Captura cuadro por cuadro y de forma determinista: el reloj de la página es falso (page.clock: Date,
// setTimeout, setInterval, requestAnimationFrame y performance.now) y avanza exactamente 1/30 s por
// cuadro antes de cada captura, así que el video sale fluido aunque el computador sea lento.
// Las transiciones CSS se desactivan (no dependen de ese reloj). Los cuadros van directo a ffmpeg
// (MP4 H.264, 1920 × 1080, 30 fps). Usa Edge con GPU; con --ventana abre el navegador con ventana.
// Uso: node tools/video.mjs [es|en] [--ventana]
import { chromium } from '@playwright/test';
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const APP = pathToFileURL(path.resolve('dist/index.html')).href;
const OUT = 'videos';
const W = 1920, H = 1080, FPS = 30;
const args = process.argv.slice(2);
const langs = args.filter((a) => a === 'es' || a === 'en');
const headed = args.includes('--ventana');
const MAX_S = Number(process.env.VIDEO_MAX_S || 0); // pruebas rápidas: corta el video a N segundos

/** ffmpeg: variable FFMPEG, el PATH o la carpeta de paquetes de winget. */
function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg';
  const base = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  if (fs.existsSync(base)) {
    for (const d of fs.readdirSync(base).filter((x) => /ffmpeg/i.test(x))) {
      const stack = [path.join(base, d)];
      while (stack.length) {
        const p = stack.pop();
        for (const e of fs.readdirSync(p, { withFileTypes: true })) {
          const f = path.join(p, e.name);
          if (e.isDirectory()) stack.push(f); else if (e.name.toLowerCase() === 'ffmpeg.exe') return f;
        }
      }
    }
  }
  throw new Error('No encontré ffmpeg. Instálalo con «winget install Gyan.FFmpeg» o indica la ruta en FFMPEG.');
}

async function record(lang, ffmpeg) {
  const file = path.join(OUT, `ronda-dc-demo-${lang}.mp4`);
  const browser = await chromium.launch({ channel: 'msedge', headless: !headed, args: ['--ignore-gpu-blocklist', '--hide-scrollbars'] });
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
  await page.goto(`${APP}?test&video#demo/grabar`);

  const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-s', `${W}x${H}`, '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
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
  ff.stdin.end();
  await done;
  await browser.close();
  const mb = fs.statSync(file).size / 1024 / 1024;
  console.log(`✓ ${file} · ${(frame / FPS).toFixed(1)} s · ${mb.toFixed(1)} MB`);
}

const ffmpeg = findFfmpeg();
fs.mkdirSync(OUT, { recursive: true });
for (const lang of langs.length ? langs : ['es', 'en']) await record(lang, ffmpeg);
