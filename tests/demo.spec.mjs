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
