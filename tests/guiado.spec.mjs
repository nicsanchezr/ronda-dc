// Nivel Guiado: tutorial de la interfaz y TK-101 completo con el tutor.
import { test, expect } from '@playwright/test';
import { openGame, stepTo, state, openTicket, tab, attach, inspect, doField, closeTicket, continueShift, trackErrors } from './helpers.mjs';

test('TK-101 en Guiado: tutorial, pasos del tutor, pista, reflexión y corrección', async ({ page }) => {
  const errors = trackErrors(page);
  await openGame(page, { level: 'guiado' });
  const coach = page.locator('#coach');
  await expect(coach).toBeVisible();

  // Tutorial de la interfaz
  await expect(coach).toContainText('reloj');
  await page.click('#pause'); // ▶ reanuda (el reloj sigue retenido mientras dura el tutorial)
  await expect(coach).toContainText('alertas');
  await page.click('#coach [data-act="coach-next"]');
  await expect(coach).toContainText('R01');
  await inspect(page, 'rack', 'R01');
  await expect(coach).toContainText('📎');
  await page.click('#coach [data-act="coach-next"]');
  await expect(coach).toContainText('subrayado');
  await page.locator('#inspector .gl').first().hover();
  await expect(coach).toContainText('botón ?');
  await page.click('#coach [data-act="coach-next"]');
  await expect(coach).toBeHidden();
  await page.click('#pause'); // pausa para controlar el reloj en la prueba

  // Llega TK-101: el tutor muestra 7 pasos
  await stepTo(page, 10.05);
  const tutor = page.locator('#tutor');
  await expect(tutor).toBeVisible();
  await expect(tutor.locator('.tsteps li')).toHaveCount(7);
  const done = () => tutor.locator('.tsteps li.done').count();

  const tk = await openTicket(page, 'E1');
  await expect.poll(done).toBe(1);
  await page.click('#tutor [data-act="hint"]');
  await expect(tutor.locator('.thints li')).toHaveCount(1);
  await tab(page, 'accesos'); await attach(page, 'acc:acc-0805');
  await expect.poll(done).toBe(2);
  await tab(page, 'cambios'); await attach(page, 'cal:CHG-1042');
  await expect.poll(done).toBe(3);
  await inspect(page, 'rack', 'R07');
  await expect.poll(done).toBe(4);
  await doField(page, 'rack', 'R07', 'tech-escort');
  await expect.poll(done).toBe(5);
  await tab(page, 'bitacora');
  await page.fill('#noteinput', `${tk}: técnico de Austral Storage Services acompañado durante CHG-1042.`);
  await page.click('#noteform button');
  await expect.poll(done).toBe(6);

  // Formulario guiado: 4 acciones, 3 escalamientos y pregunta de reflexión obligatoria
  await tab(page, 'tickets'); await openTicket(page, 'E1');
  await page.click('.detail [data-act="resolve"]');
  const f = page.locator('#resolveform');
  await expect(f.locator('input[name=act]')).toHaveCount(4);
  await expect(f.locator('input[name=esc]')).toHaveCount(3);
  await expect(page.locator('#submitbtn')).toBeDisabled();
  await f.locator('input[name=reflect]').nth(0).check();
  await expect(page.locator('#rfb')).toContainText('credencial');
  await f.locator('input[name=reflect]').nth(1).check();
  await expect(page.locator('#rfb')).toContainText('CHG-1042');
  await page.click('[data-act="cancel-modal"]');
  const pts = await closeTicket(page, { cls: 'benigno', prio: 'P4', acts: ['a1'], esc: ['nadie'], reflect: 1 });
  expect(pts).toBe(100);
  await expect(page.locator('#modalbox')).toContainText('Nivel: Guiado · Pistas usadas: 1');
  await expect(page.locator('#modalbox')).toContainText('Pregunta de reflexión');
  await continueShift(page);
  expect((await state(page)).tickets.find((x) => x.inc === 'E1').total).toBe(100);

  // Fin del turno: el informe indica nivel y pistas
  await stepTo(page, 421);
  await expect(page.locator('#endbox')).toContainText('Nivel jugado: Guiado · Pistas usadas: 1');
  expect(errors).toEqual([]);
});
