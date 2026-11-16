// Partidas completas del modo Turno.
import { test, expect } from '@playwright/test';
import { openGame, step, stepTo, state, openTicket, tab, attach, inspect, doField, requestAuth, closeTicket, continueShift, trackErrors } from './helpers.mjs';

test('partida perfecta en Normal: 8 tickets, 800 pts, sin impactos', async ({ page }) => {
  const errors = trackErrors(page);
  await openGame(page);
  const scores = {};

  // E1 · proveedor con cambio aprobado
  await stepTo(page, 10.05);
  let tk = await openTicket(page, 'E1');
  await tab(page, 'accesos'); await attach(page, 'acc:acc-0805');
  await tab(page, 'cambios'); await attach(page, 'cal:CHG-1042');
  await doField(page, 'rack', 'R07', 'tech-escort');
  await tab(page, 'tickets'); await openTicket(page, 'E1');
  scores.E1 = await closeTicket(page, { cls: 'benigno', prio: 'P4', acts: ['a1'], esc: ['nadie'], note: `Ingreso de Austral Storage Services acompañado (CHG-1042).` });
  await continueShift(page);

  // E2 · sensor suelto en R04 (falso positivo)
  await stepTo(page, 35.05);
  await openTicket(page, 'E2');
  await inspect(page, 'rack', 'R04');
  await attach(page, 'obs:r04-sensor'); await attach(page, 'obs:r04-ipmi');
  await doField(page, 'rack', 'R04', 'sensor-fix');
  await tab(page, 'tickets'); await openTicket(page, 'E2');
  scores.E2 = await closeTicket(page, { cls: 'fp', prio: 'P4', acts: ['a1'], esc: ['nadie'], note: 'Sensor de R04 reubicado; mantenimiento debe revisar la fijación.' });
  await continueShift(page);

  // E3 · paneles ciegos en R08
  await stepTo(page, 70.05);
  await openTicket(page, 'E3');
  await inspect(page, 'rack', 'R08');
  await attach(page, 'obs:r08-blank'); await attach(page, 'obs:r08-recirc');
  await doField(page, 'rack', 'R08', 'blank-install');
  await inspect(page, 'rack', 'R08'); // verificación posterior
  await tab(page, 'tickets'); await openTicket(page, 'E3');
  scores.E3 = await closeTicket(page, { cls: 'vp', prio: 'P3', acts: ['a2'], esc: ['nadie'], note: 'Paneles ciegos instalados en R08 U30–U34.' });
  await continueShift(page);

  // E4 · PSU B+B en R06, con autorización del cliente
  await stepTo(page, 110.05);
  await openTicket(page, 'E4');
  await inspect(page, 'rack', 'R06');
  await attach(page, 'obs:r06-psu'); await attach(page, 'obs:r06-pdu');
  await tab(page, 'cambios'); await attach(page, 'cal:CHG-1045');
  await requestAuth(page, 'rack', 'R06', 'psu-move');
  await step(page, 10.5);
  await doField(page, 'rack', 'R06', 'psu-move');
  await tab(page, 'tickets'); await openTicket(page, 'E4');
  scores.E4 = await closeTicket(page, { cls: 'vp', prio: 'P2', acts: ['a1', 'a3'], esc: ['cliente'], note: 'PSU1 de k8s-n7 movida a PDU-A con autorización.' });
  await continueShift(page);

  // E5 · autoprueba de UPS-A
  await stepTo(page, 180.05);
  await openTicket(page, 'E5');
  await tab(page, 'cambios'); await attach(page, 'cal:MNT-221');
  await inspect(page, 'ups', 'UPS-A'); await attach(page, 'obs:upsa-test');
  await inspect(page, 'ups', 'UPS-B');
  await tab(page, 'tickets'); await openTicket(page, 'E5');
  scores.E5 = await closeTicket(page, { cls: 'benigno', prio: 'P4', acts: ['a1', 'a2'], esc: ['nadie'], note: 'Autoprueba MNT-221 en curso; red y UPS-B normales.' });
  await continueShift(page);

  // E6 · falla de CRAC-2
  await stepTo(page, 255.05);
  await openTicket(page, 'E6');
  await inspect(page, 'crac', 'CRAC-2'); await attach(page, 'obs:crac2-alarm');
  await inspect(page, 'crac', 'CRAC-1'); await attach(page, 'obs:crac1-ok');
  await doField(page, 'crac', 'CRAC-1', 'crac1-boost');
  await tab(page, 'tickets'); await openTicket(page, 'E6');
  scores.E6 = await closeTicket(page, { cls: 'vp', prio: 'P1', acts: ['a2', 'a3'], esc: ['clima', 'jefe'], note: 'CRAC-1 al 90 %; se vigila la fila B.' });
  await continueShift(page);

  // E7 · fuga de condensado
  await stepTo(page, 330.05);
  await openTicket(page, 'E7');
  await doField(page, 'leak', 'LEAK-Z3', 'tile-lift');
  await inspect(page, 'leak', 'LEAK-Z3'); await attach(page, 'obs:leak-water'); await attach(page, 'obs:leak-cables');
  await doField(page, 'leak', 'LEAK-Z3', 'absorbent');
  await doField(page, 'leak', 'LEAK-Z3', 'photo-leak');
  await tab(page, 'tickets'); await openTicket(page, 'E7');
  scores.E7 = await closeTicket(page, { cls: 'vp', prio: 'P2', esc: ['clima'], note: 'Fuga contenida con absorbente; origen: bandeja de CRAC-1.' });
  await continueShift(page);

  // E8 · puerta de R02 abierta
  await stepTo(page, 380.05);
  await openTicket(page, 'E8');
  await inspect(page, 'rack', 'R02'); await attach(page, 'obs:r02-door'); await attach(page, 'obs:r02-cable');
  await tab(page, 'accesos'); await attach(page, 'acc:acc-1404');
  await doField(page, 'rack', 'R02', 'photo-r02');
  await doField(page, 'rack', 'R02', 'door-secure');
  await tab(page, 'tickets'); await openTicket(page, 'E8');
  scores.E8 = await closeTicket(page, { cls: 'vp', prio: 'P2', acts: ['a1', 'a2'], esc: ['seguridad', 'jefe'], note: 'Puerta fotografiada y asegurada; cable sin tocar.' });
  await continueShift(page);

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
