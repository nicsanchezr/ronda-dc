// Glosario: términos marcados, tooltip (mouse y toque) y pestaña Consulta.
import { test, expect } from '@playwright/test';
import { openGame, stepTo, tab } from './helpers.mjs';

const REQUIRED = ['rack', 'u', 'panel-ciego', 'pasillo-frio', 'pasillo-caliente', 'contencion', 'crac', 'setpoint', 'impulsion', 'retorno', 'pdu', 'rama', 'redundancia', 'psu', 'ups', 'bypass', 'autonomia', 'generador', 'ipmi', 'piso-tecnico', 'vesda', 'colocation', 'remote-hands', 'cambio', 'sla', 'mtta', 'mttr', 'prioridad', 'vp', 'fp', 'benigno', 'escalamiento', 'bitacora', 'relevo'];

test('términos marcados en alertas, tooltip y entrada en Consulta', async ({ page }) => {
  await openGame(page);
  await stepTo(page, 110.05); // alerta de PDU-B en R06
  await tab(page, 'monitoreo');
  const term = page.locator('#pane .gl[data-gl="pdu"]').first();
  await expect(term).toBeVisible();
  await term.hover();
  await expect(page.locator('#gltip')).toBeVisible();
  await expect(page.locator('#gltip')).toContainText('Regleta de distribución');
  // toque: fija el tooltip y abre la entrada en el glosario
  await page.mouse.move(5, 5);
  await term.click();
  await expect(page.locator('#gltip')).toBeVisible();
  await page.click('#gltip [data-glopen]');
  await expect(page.locator('#gl-pdu')).toHaveClass(/focus/);
  await expect(page.locator('.tabs button[data-tab="consulta"]')).toHaveClass(/on/);
});

test('la pestaña Consulta tiene runbooks, glosario con al menos 36 términos y buscador', async ({ page }) => {
  await openGame(page);
  await tab(page, 'consulta');
  await expect(page.locator('#pane details.rb')).toHaveCount(6);
  await page.click('[data-cons="glosario"]');
  expect(await page.locator('.gle').count()).toBeGreaterThanOrEqual(36);
  for (const id of REQUIRED) await expect(page.locator(`#gl-${id}`)).toHaveCount(1);
  await page.fill('#glsearch', 'bypass');
  await expect(page.locator('.gle:not([hidden])')).toHaveCount(1);
  // los runbooks también marcan términos
  await page.click('[data-cons="runbooks"]');
  await expect(page.locator('#pane details.rb .gl').first()).toBeAttached();
});
