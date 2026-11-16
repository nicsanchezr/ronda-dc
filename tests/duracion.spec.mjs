// Duración de las partidas y botón ⏭.
import { test, expect } from '@playwright/test';
import { openGame, stepTo, state, inspect, trackErrors } from './helpers.mjs';

test('turno corto: 4 eventos (E1, E3, E6, E7) y fin a las 10:30', async ({ page }) => {
  const errors = trackErrors(page);
  await openGame(page, { duration: 'corto' });
  let s = await state(page);
  expect(s.duration).toBe('corto');
  expect(s.shiftLen).toBe(150);
  await stepTo(page, 151);
  s = await state(page);
  expect(s.ended).toBe(true);
  expect(s.tickets.map((x) => x.inc)).toEqual(['E1', 'E3', 'E6', 'E7']);
  await expect(page.locator('#endbox .kpi').first()).toContainText('de 400 pts');
  expect(errors).toEqual([]);
});

test('⏭ con tickets abiertos: avisa que la sala sigue empeorando y adelanta igual', async ({ page }) => {
  await openGame(page, { duration: 'corto' });
  await stepTo(page, 10.05); // TK-101 abierto (sin resolver)
  await page.click('#skip');
  await expect(page.locator('#toasts')).toContainText('seguirá empeorando');
  const s = await state(page);
  expect(s.t).toBeGreaterThanOrEqual(35);
  expect(s.tickets.map((x) => x.inc)).toContain('E3');
});

test('⏭ durante una acción en sala: adelanta hasta que termina', async ({ page }) => {
  await openGame(page, { duration: 'corto' });
  await stepTo(page, 36);
  await page.click('#pause'); await page.click('#pause'); // asegura el reloj en pausa
  await inspect(page, 'rack', 'R08');
  await page.click('#inspector [data-act="fa"][data-fa="blank-install"]');
  await page.click('#inspector [data-act="fa-ok"]');
  await page.click('#skip');
  await expect.poll(async () => (await state(page)).act).toBe(null);
  expect((await state(page)).done).toContain('blank-install');
});

test('⏭ en Guiado: avisa que la sala no empeora', async ({ page }) => {
  await openGame(page, { level: 'guiado', duration: 'corto' });
  await page.click('#coach [data-act="coach-skip"]');
  await stepTo(page, 10.05);
  await page.click('#skip');
  await expect(page.locator('#toasts')).toContainText('no empeora');
});
