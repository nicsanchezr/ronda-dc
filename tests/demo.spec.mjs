// Modo Demo: el operador automático juega el turno corto con la partida perfecta.
// ?rapido (solo junto con ?test) acelera esperas, subtítulos y cámara para la prueba.
import { test, expect } from '@playwright/test';
import { APP, state, trackErrors } from './helpers.mjs';

const demoState = (page) => page.evaluate(() => window.__ronda.demo());

async function runDemo(page, lang) {
  const errors = trackErrors(page);
  await page.addInitScript((l) => localStorage.setItem('ronda-dc-idioma', l), lang);
  await page.goto(`${APP}?test&rapido#demo`);
  await expect(page.locator('#demosub')).toBeVisible();
  await expect(page.locator('#democtl')).toBeVisible();
  await expect.poll(async () => (await demoState(page)).finished, { timeout: 150_000, intervals: [1000] }).toBe(true);
  const s = await state(page);
  expect(s.lang).toBe(lang);
  expect(s.duration).toBe('corto');
  expect(s.level).toBe('normal');
  expect(s.ended).toBe(true);
  expect(s.tickets.map((x) => x.inc)).toEqual(['E1', 'E3', 'E6', 'E7']);
  expect(s.tickets.every((x) => x.closed && x.total === 100)).toBe(true);
  expect(s.impacts).toEqual([]);
  await expect(page.locator('#endbox .kpi').first()).toContainText('400');
  const d = await demoState(page);
  expect(d.shots.length).toBeGreaterThan(8);
  expect(d.shots.filter((x) => !x.clear)).toEqual([]); // ninguna toma tapada
  expect(errors).toEqual([]);
  return s;
}

test('demo en español: 4 tickets cerrados con puntaje perfecto y subtítulos', async ({ page }) => {
  test.setTimeout(240_000);
  await runDemo(page, 'es');
  await expect(page.locator('#demosub')).toContainText('Fin del turno: 400 de 400 puntos');
});

test('demo en inglés: 4 tickets cerrados con puntaje perfecto y subtítulos', async ({ page }) => {
  test.setTimeout(240_000);
  await runDemo(page, 'en');
  await expect(page.locator('#demosub')).toContainText('End of shift: 400 out of 400 points');
  await expect(page.locator('#endbox h2')).toContainText('End of shift');
});

test('al tocar la sala la demo se pausa y ofrece seguir viendo o jugar desde ahí', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(`${APP}?test#demo`);
  await expect(page.locator('#demosub')).toContainText('Turno corto en nivel Normal');
  await page.mouse.click(300, 400); // clic en la sala
  await expect(page.locator('#demoask')).toBeVisible();
  expect((await demoState(page)).paused).toBe(true);
  await page.click('#demoask [data-demo="resume"]');
  await expect(page.locator('#demoask')).toBeHidden();
  expect((await demoState(page)).paused).toBe(false);
  // controles: pausa y velocidad
  await page.click('#democtl [data-demo="pause"]');
  expect((await demoState(page)).paused).toBe(true);
  await page.click('#democtl [data-demo="speed"][data-v="2"]');
  await expect(page.locator('#democtl [data-demo="speed"][data-v="2"]')).toHaveClass(/on/);
  // tomar el control
  await page.mouse.click(300, 400);
  await page.click('#demoask [data-demo="takeover"]');
  await expect(page.locator('#demosub')).toBeHidden();
  await expect(page.locator('#democtl')).toBeHidden();
  expect(page.url()).toContain('#turno/normal/corto');
  const d = await demoState(page);
  expect(d.active).toBe(false);
  await expect(page.locator('#clockwrap')).not.toHaveClass(/paused/); // el reloj corre: ahora juega el estudiante
  expect(errors).toEqual([]);
});

test('kiosco sin controles y grabación sin cursor ni controles', async ({ page }) => {
  await page.goto(`${APP}?test#demo/kiosco`);
  await expect(page.locator('body')).toHaveAttribute('data-demo', 'kiosco');
  await expect(page.locator('#democtl')).toBeHidden();
  await page.goto(`${APP}?test#demo/grabar`);
  await expect(page.locator('body')).toHaveAttribute('data-demo', 'grabar');
  await expect(page.locator('#democtl')).toBeHidden();
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('#stage')).cursor)).toBe('none');
  // salir con Esc vuelve a la portada
  await page.keyboard.press('Escape');
  await expect(page.locator('#landing')).toBeVisible();
  await expect.poll(async () => (await demoState(page)).active).toBe(false); // la grabación ya parte en la portada
  expect(page.url()).not.toContain('#demo');
});

/** Comprueba que no quede nada de la demo corriendo: guion, esperas, temporizadores, subtítulos ni reloj. */
async function expectFullyStopped(page) {
  await expect(page.locator('#landing')).toBeVisible();
  await expect.poll(async () => { const d = await demoState(page); return { active: d.active, running: d.running, pending: d.pending, idle: d.idle }; })
    .toEqual({ active: false, running: false, pending: 0, idle: false });
  await expect(page.locator('#demosub')).toBeHidden();
  await expect(page.locator('#democtl')).toBeHidden();
  await expect(page.locator('#demoask')).toBeHidden();
  await expect(page.locator('#demoboost')).toBeHidden();
  await expect(page.locator('.demo-press')).toHaveCount(0);
  const s0 = await state(page);
  await page.waitForTimeout(1500);
  const s1 = await state(page);
  expect(s1.t).toBe(s0.t); // el reloj del turno está detenido
  expect(s1.tickets).toEqual([]);
  expect(await page.evaluate(() => window.__ronda.running())).toBe(false);
  expect((await demoState(page)).caption).toBe(null);
}

test('Esc en pantalla completa solo sale de pantalla completa; Esc fuera de ella detiene la demo por completo', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(`${APP}?test#demo`);
  await expect(page.locator('#demosub')).toBeVisible();
  await page.click('#democtl [data-demo="fullscreen"]');
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
  await page.keyboard.press('Escape');
  // el navegador sale de pantalla completa con esa Esc (si la ventana de prueba no lo hace, lo hacemos como él)
  await page.evaluate(() => document.fullscreenElement && document.exitFullscreen());
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
  expect((await demoState(page)).active).toBe(true);
  await expect(page.locator('#demosub')).toBeVisible();
  expect(page.url()).toContain('#demo');
  await page.waitForTimeout(900); // pasada la ventana de 800 ms tras salir de pantalla completa
  await page.keyboard.press('Escape');
  await expectFullyStopped(page);
  expect(errors).toEqual([]);
});

test('el botón Salir a mitad de un paso detiene la demo, la cámara y el reloj', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(`${APP}?test#demo`);
  await page.waitForFunction(() => window.__ronda.demo().caption === 'demo.E1.open', null, { timeout: 60_000 });
  await page.click('#democtl [data-demo="exit"]');
  await expectFullyStopped(page);
  expect(errors).toEqual([]);
});

test('todas las tomas de la demo ven su objetivo sin obstáculos (raycasting)', async ({ page }) => {
  await page.goto(`${APP}?test#demo`);
  await expect(page.locator('#demosub')).toBeVisible();
  const shots = await page.evaluate(() => window.__ronda.demoCheckShots());
  expect(shots.length).toBeGreaterThan(8);
  expect(shots.filter((s) => !s.clear)).toEqual([]);
});
