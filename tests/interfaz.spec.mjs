// Portada, cambio de tema y transiciones sin errores en consola.
import { test, expect } from '@playwright/test';
import { APP, trackErrors, openGame } from './helpers.mjs';

test('portada → turno, cambio de tema y transiciones sin errores', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto(`${APP}?test`);
  await expect(page.locator('#landing')).toBeVisible();
  await page.click('#turnobtn');
  await expect(page.locator('#briefing')).toBeVisible();
  await page.click('#startbtn');
  await page.click('#pause');

  for (const theme of ['hmi', 'sala']) {
    await page.click('#setbtn');
    await page.check(`input[name="theme"][value="${theme}"]`);
    await page.click(`[data-scheme="${theme === 'hmi' ? 'dark' : 'light'}"]`);
    await page.keyboard.press('Escape');
    await expect(page.locator('html')).toHaveAttribute('data-theme-id', theme);

    await page.fill('#search', 'R06'); await page.press('#search', 'Enter');
    await page.locator('[data-act="rack-detail"]').click();
    await expect(page.locator('#rackbar')).toBeVisible();
    await page.waitForFunction(() => !document.querySelector('#view3d').classList.contains('busy'));
    await page.click('[data-side="rear"]');
    await page.waitForFunction(() => document.querySelector('[data-side="rear"]').classList.contains('on') && !document.querySelector('#view3d').classList.contains('busy'));
    await page.click('#rackback');
    await expect(page.locator('#rackbar')).toBeHidden();
    await page.waitForFunction(() => !document.querySelector('#view3d').classList.contains('busy'));
  }
  expect(errors).toEqual([]);
});

test('rutas por hash: #checklist muestra el aviso y #turno abre el briefing', async ({ page }) => {
  await page.goto(`${APP}?test#checklist`);
  await expect(page.locator('#soonnote')).toBeVisible();
  await page.goto(`${APP}?test#turno`);
  await expect(page.locator('#briefing')).toBeVisible();
});
