// Navegador y ffmpeg para las herramientas (capturas y videos), en Windows, macOS y Linux.
// Navegador: variable RONDA_BROWSER (msedge, chrome o chromium); si no, Edge en Windows y el
// Chromium de Playwright en macOS y Linux (npx playwright install chromium). Siempre con la GPU
// del equipo: con SwiftShader el fondo de la escena sale negro.
import { chromium } from '@playwright/test';
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const WIN = process.platform === 'win32', MAC = process.platform === 'darwin';

export function browserChannel() {
  const b = (process.env.RONDA_BROWSER || '').toLowerCase();
  if (b === 'chromium') return undefined;
  if (b) return b; // msedge, chrome…
  if (process.env.CI) return undefined;
  return WIN ? 'msedge' : undefined;
}

export async function launchBrowser({ headless = true, args = [] } = {}) {
  const channel = browserChannel();
  // macOS: WebGL por Metal (ANGLE); en Windows y Linux, el valor por omisión de Chromium.
  const gl = MAC ? ['--use-angle=metal'] : [];
  try {
    return await chromium.launch({ channel, headless, args: ['--ignore-gpu-blocklist', ...gl, ...args] });
  } catch (e) {
    if (!channel) throw new Error(`No pude abrir el Chromium de Playwright. Instálalo con «npx playwright install chromium».\n${e.message}`);
    console.warn(`· No pude abrir ${channel}; uso el Chromium de Playwright.`);
    return chromium.launch({ headless, args: ['--ignore-gpu-blocklist', ...gl, ...args] });
  }
}

/** ffmpeg: variable FFMPEG, el PATH, Homebrew (macOS) o la carpeta de paquetes de winget (Windows). */
export function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  if (spawnSync('ffmpeg', ['-version']).status === 0) return 'ffmpeg';
  for (const f of ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/usr/bin/ffmpeg']) if (!WIN && fs.existsSync(f)) return f;
  const base = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
  if (WIN && fs.existsSync(base)) {
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
  const how = WIN ? '«winget install Gyan.FFmpeg»' : MAC ? '«brew install ffmpeg»' : 'el gestor de paquetes (p. ej. «sudo apt install ffmpeg»)';
  throw new Error(`No encontré ffmpeg. Instálalo con ${how} o indica la ruta en FFMPEG.`);
}
