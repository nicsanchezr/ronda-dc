// Pruebas de extremo a extremo sobre dist/index.html (un solo archivo, sin servidor).
// Local (Windows): usa Microsoft Edge instalado. CI: Chromium de Playwright con WebGL por software.
import { defineConfig } from '@playwright/test';

const CI = !!process.env.CI;
export default defineConfig({
  testDir: 'tests',
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: CI ? 1 : 0,
  reporter: CI ? [['list'], ['github']] : 'list',
  use: {
    viewport: { width: 1440, height: 900 },
    locale: 'es-CL', // idioma inicial de la app = el del navegador; las pruebas en inglés lo cambian
    ...(CI
      ? { launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] } }
      : { channel: 'msedge' }),
    trace: 'retain-on-failure',
  },
});
