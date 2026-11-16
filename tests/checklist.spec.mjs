// Checklist de ronda: ronda de inicio de turno con hallazgos plantados.
import { test, expect } from '@playwright/test';
import { APP, state, inspect, attach, tab, step, stepTo, trackErrors } from './helpers.mjs';

async function openRonda(page, level = 'normal') {
  await page.goto(`${APP}?test#checklist/${level}`);
  await expect(page.locator('.ritem').first()).toBeVisible();
}
const pick = (page, item) => page.click(`[data-act="ritem"][data-item="${item}"]`);
const mark = (page, item, v) => page.click(`[data-act="rstatus"][data-item="${item}"][data-v="${v}"]`);
async function rondaField(page, kind, id, fa) {
  await inspect(page, kind, id);
  await page.click(`#inspector [data-act="fa"][data-fa="${fa}"]`);
  await page.click(`#inspector [data-act="fa-ok"][data-fa="${fa}"]`);
  await expect.poll(async () => (await state(page)).done).toContain(fa);
}

test('ronda perfecta en Normal: 100 pts, correcciones e informe', async ({ page }) => {
  const errors = trackErrors(page);
  await openRonda(page);
  expect((await state(page)).mode2).toBe('ronda');

  await inspect(page, 'rack', 'R01'); await inspect(page, 'rack', 'R06');
  await mark(page, 'temp', 'ok'); await mark(page, 'doors', 'ok');

  await inspect(page, 'crac', 'CRAC-2'); await inspect(page, 'crac', 'CRAC-1');
  await pick(page, 'crac'); await attach(page, 'obs:crac1-tray-high'); await mark(page, 'crac', 'obs');

  await inspect(page, 'ups', 'UPS-A'); await inspect(page, 'ups', 'UPS-B'); await mark(page, 'ups', 'ok');

  await inspect(page, 'rack', 'R06');
  await pick(page, 'ab'); await attach(page, 'obs:r06-psu'); await mark(page, 'ab', 'falla');
  await page.click('#inspector [data-act="fa-auth"][data-fa="psu-move"]');

  await pick(page, 'clean'); await attach(page, 'obs:r06-box'); await mark(page, 'clean', 'obs');
  await rondaField(page, 'rack', 'R06', 'trash-remove');

  await inspect(page, 'rack', 'R08');
  await pick(page, 'blank'); await attach(page, 'obs:r08-blank'); await mark(page, 'blank', 'falla');
  await rondaField(page, 'rack', 'R08', 'blank-install');

  await inspect(page, 'acs', 'ACS');
  await pick(page, 'fire'); await attach(page, 'obs:fire-ext'); await mark(page, 'fire', 'obs');

  await tab(page, 'accesos'); await tab(page, 'ronda'); await mark(page, 'access', 'ok');
  await inspect(page, 'leak', 'LEAK-Z3'); await mark(page, 'floor', 'ok');

  await page.click('[data-act="rfinish"]');
  await expect(page.locator('#endbox')).toContainText('Checklist de ronda');
  const s = await state(page);
  expect(s.ronda.result).toEqual({ total: 100, bonus: 9 });
  await expect(page.locator('#endbox .kpi').first()).toContainText('100');
  const md = await page.evaluate(() => window.__ronda.rondaReport());
  expect(md).toContain('# Checklist de ronda');
  expect(md).toContain('Paneles ciegos');
  expect(md).toContain('Corregido en la sala');
  expect(errors).toEqual([]);
});

test('ayudas por nivel: Guiado explica qué revisar y por qué; Experto solo el título', async ({ page }) => {
  await openRonda(page, 'guiado');
  await expect(page.locator('.ritem[data-item="temp"] .rwhy')).toContainText('ASHRAE');
  await openRonda(page, 'experto');
  await expect(page.locator('.ritem .rwhy, .ritem .rwhere')).toHaveCount(0);
});

test('marcar un ítem sin revisarlo en la sala no suma el estado', async ({ page }) => {
  await openRonda(page);
  await mark(page, 'temp', 'ok');
  await page.click('[data-act="rfinish"]');
  await expect(page.locator('#endbox')).toContainText('Marcado sin revisar');
  expect((await state(page)).ronda.result.total).toBe(0);
});

test('la ronda continúa en un turno con la misma sala (paneles instalados → hallazgo proactivo)', async ({ page }) => {
  await openRonda(page);
  await inspect(page, 'rack', 'R08');
  await rondaField(page, 'rack', 'R08', 'blank-install');
  await page.click('[data-act="rfinish"]');
  await page.click('[data-act="rcontinue"]');
  await expect(page.locator('#briefing')).toBeVisible();
  await page.click('#startbtn');
  await page.click('#pause');
  const s0 = await state(page);
  expect(s0.mode2).toBe(null);
  await stepTo(page, 36); // turno corto (por defecto): E3 a las 08:35
  const tk = (await state(page)).tickets.find((x) => x.inc === 'E3');
  expect(tk.proactive).toBe(true);
});
