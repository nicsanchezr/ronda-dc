// Partidas completas del modo Turno.
import { test, expect } from '@playwright/test';
import { openGame, stepTo, state, openTicket, tab, inspect, doField, closeTicket, trackErrors, playPerfect } from './helpers.mjs';

test('partida perfecta en Normal: 8 tickets, 800 pts, sin impactos', async ({ page }) => {
  const errors = trackErrors(page);
  await openGame(page);
  const scores = await playPerfect(page); // src/perfect-run.js (la misma solución que juega la Demo)
  await stepTo(page, 421);
  const s = await state(page);
  expect(scores).toEqual({ E1: 100, E2: 100, E3: 100, E4: 100, E5: 100, E6: 100, E7: 100, E8: 100 });
  expect(s.impacts).toEqual([]);
  expect(s.ended).toBe(true);
  await expect(page.locator('#endbox .kpi').first()).toContainText('800');
  expect(errors).toEqual([]);
});

test('partida con impactos: disparo de PDU, acción crítica y apagado térmico', async ({ page }) => {
  await openGame(page);
  await stepTo(page, 200);
  await doField(page, 'ups', 'UPS-A', 'ups-bypass'); // acción crítica
  await stepTo(page, 320);
  const { impacts } = await state(page);
  expect(impacts.some((i) => /PDU-B/.test(i) && /dispar/i.test(i))).toBe(true);
  expect(impacts.some((i) => /bypass/.test(i))).toBe(true);
  expect(impacts.some((i) => /protección térmica/.test(i))).toBe(true);
});

test('acción declarada sin hacer: cuenta como error en la corrección', async ({ page }) => {
  await openGame(page);
  await stepTo(page, 70.05);
  await openTicket(page, 'E3');
  const pts = await closeTicket(page, { cls: 'vp', prio: 'P3', acts: ['a1'], esc: ['nadie'] }); // declara los paneles sin instalarlos
  await expect(page.locator('#modalbox .acti .st-notdone')).toContainText('no se hizo en la sala');
  expect(pts).toBe(60); // 25 + 15 + 20; acciones 0 (0/3 − 10); evidencia 0
});

test('hallazgo proactivo en E3: la alerta no salta y suma bonificación', async ({ page }) => {
  await openGame(page);
  await stepTo(page, 20);
  await inspect(page, 'rack', 'R08');               // lo ve en la ronda
  await doField(page, 'rack', 'R08', 'blank-install'); // y lo corrige antes de las 09:10
  await stepTo(page, 72);
  const s = await state(page);
  const tk = s.tickets.find((x) => x.inc === 'E3');
  expect(tk.proactive).toBe(true);
  expect(tk.evidence).toEqual(expect.arrayContaining(['obs:r08-blank']));
  await tab(page, 'monitoreo');
  await expect(page.locator('#pane')).not.toContainText('ENV-R08-IN'); // la alerta no se produjo
  await openTicket(page, 'E3');
  await inspect(page, 'rack', 'R08');               // verificación posterior
  const pts = await closeTicket(page, { cls: 'vp', prio: 'P3', acts: ['a2'], esc: ['nadie'], note: 'Paneles ciegos instalados en la ronda (hallazgo proactivo).' });
  expect(pts).toBe(100);
  await expect(page.locator('#modalbox .score .bonus')).toContainText('+10');
  expect((await state(page)).tickets.find((x) => x.inc === 'E3').bonus).toBe(10);
});
