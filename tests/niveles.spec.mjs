// Niveles de dificultad: Guiado, Normal y Experto.
import { test, expect } from '@playwright/test';
import { openGame, stepTo, state, openTicket, inspect, attach, doField, closeTicket, tab } from './helpers.mjs';

test('Experto: CRAC-2 falla durante la autoprueba de UPS-A y no hay pistas', async ({ page }) => {
  await openGame(page, { level: 'experto' });
  await expect(page.locator('#levelbadge')).toHaveText('Experto');
  await stepTo(page, 186);
  const s = await state(page);
  expect(s.level).toBe('experto');
  expect(s.tickets.map((x) => x.inc)).toEqual(expect.arrayContaining(['E5', 'E6']));
  await openTicket(page, 'E6');
  await expect(page.locator('.detail [data-act="hint"]')).toHaveCount(0);
});

test('Normal: cada pista cuesta 3 puntos (máximo 2)', async ({ page }) => {
  await openGame(page);
  await stepTo(page, 70.05);
  await openTicket(page, 'E3');
  await page.click('.detail [data-act="hint"]');
  await expect(page.locator('.detail .hints li')).toHaveCount(1);
  await page.click('.detail [data-act="hint"]');
  await expect(page.locator('.detail .hints li')).toHaveCount(2);
  await expect(page.locator('.detail [data-act="hint"]')).toHaveCount(0);
  await inspect(page, 'rack', 'R08');
  await attach(page, 'obs:r08-blank'); await attach(page, 'obs:r08-recirc');
  await doField(page, 'rack', 'R08', 'blank-install');
  await inspect(page, 'rack', 'R08');
  await tab(page, 'tickets'); await openTicket(page, 'E3');
  const pts = await closeTicket(page, { cls: 'vp', prio: 'P3', acts: ['a2'], esc: ['nadie'], note: 'Paneles ciegos instalados.' });
  expect(pts).toBe(94);
  await expect(page.locator('#modalbox')).toContainText('Pistas usadas: 2');
});

test('Guiado: el reloj espera con un ticket abierto y la sala no empeora', async ({ page }) => {
  await openGame(page, { level: 'guiado' });
  await stepTo(page, 70.05);
  const t0 = (await state(page)).t;
  await page.click('#pause'); // reanuda el reloj
  await page.waitForTimeout(1500);
  const t1 = (await state(page)).t;
  expect(t1).toBeCloseTo(t0, 5); // retenido: hay tickets abiertos
  await expect(page.locator('#clockwrap')).toHaveClass(/held/);
});
