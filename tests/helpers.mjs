// Utilidades comunes de las pruebas: abren dist/index.html con ?test y manejan el turno
// con la interfaz real (pestañas, inspector, acciones y formulario de cierre).
// window.__ronda (solo con ?test) permite avanzar el reloj y leer el estado.
import { expect } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';

export const APP = pathToFileURL(path.resolve('dist/index.html')).href;

/** Registra errores de página y de consola para verificarlos al final. */
export function trackErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  return errors;
}

/** Abre el turno (nivel opcional) y lo deja en pausa a las 08:00. */
export async function openGame(page, { level = '', duration = '', theme } = {}) {
  if (theme) await page.addInitScript((th) => localStorage.setItem('ronda-dc-tema', JSON.stringify(th)), theme);
  const route = duration ? `/${level || 'normal'}/${duration}` : level ? '/' + level : '';
  await page.goto(`${APP}?test#turno${route}`);
  await expect(page.locator('#briefing')).toBeVisible();
  await page.click('#startbtn');
  if (level !== 'guiado') await page.click('#pause'); // en Guiado el turno empieza en pausa
  await expect(page.locator('#clockwrap')).toHaveClass(/paused/);
}

export const step = (page, min) => page.evaluate((m) => window.__ronda.step(m), min);
export const state = (page) => page.evaluate(() => window.__ronda.state());

/** Avanza hasta el minuto indicado (minutos desde las 08:00). */
export async function stepTo(page, minute) {
  const s = await state(page);
  if (minute > s.t) await step(page, minute - s.t);
}

export async function ticketFor(page, incId) {
  const s = await state(page);
  const tk = s.tickets.find((x) => x.inc === incId);
  expect(tk, `ticket de ${incId}`).toBeTruthy();
  return tk;
}

/** Abre el ticket de un evento desde la pestaña Tickets. */
export async function openTicket(page, incId) {
  const tk = await ticketFor(page, incId);
  await page.click('.tabs button[data-tab="tickets"]');
  await page.click(`.row.ticket[data-tk="${tk.id}"]`);
  await expect(page.locator('.detail')).toContainText(tk.id);
  return tk.id;
}

export async function tab(page, name) {
  await page.click(`.tabs button[data-tab="${name}"]`);
}

/** Adjunta una evidencia visible (pestaña o inspector) si aún no está adjunta. */
export async function attach(page, evId) {
  const b = page.locator(`[data-act="attach"][data-ev="${evId}"]`).first();
  await expect(b).toBeVisible();
  if (!(await b.evaluate((el) => el.classList.contains('on')))) await b.click();
  await expect(page.locator(`[data-act="attach"][data-ev="${evId}"]`).first()).toHaveClass(/on/);
}

/** Abre el inspector de un objeto (como un clic en la sala). */
export const inspect = (page, kind, id) => page.evaluate(([k, i]) => window.__ronda.select(k, i), [kind, id]);

/** Ejecuta una acción en sala desde el inspector del objeto y espera a que termine. */
export async function doField(page, kind, id, faId) {
  await inspect(page, kind, id);
  const btn = page.locator(`#inspector [data-act="fa"][data-fa="${faId}"]`);
  await expect(btn).toBeEnabled();
  await btn.click();
  await page.click(`#inspector [data-act="fa-ok"][data-fa="${faId}"]`);
  await expect.poll(async () => (await state(page)).act).toBe(faId);
  for (let i = 0; i < 20 && (await state(page)).act; i++) await step(page, 0.5);
  expect((await state(page)).done).toContain(faId);
}

export async function requestAuth(page, kind, id, faId) {
  await inspect(page, kind, id);
  await page.click(`#inspector [data-act="fa-auth"][data-fa="${faId}"]`);
}

/** Completa y envía el formulario de cierre del ticket abierto. Devuelve el puntaje. */
export async function closeTicket(page, { cls, prio, acts = [], esc = [], note = '', reflect }) {
  await page.click('.detail [data-act="resolve"]');
  const f = page.locator('#resolveform');
  await expect(f).toBeVisible();
  await f.locator(`input[name=cls][value=${cls}]`).check();
  await f.locator(`input[name=prio][value=${prio}]`).check();
  for (const a of acts) { const i = f.locator(`input[name=act][value=${a}]`); if (!(await i.isDisabled())) await i.check(); }
  for (const e of esc) { const i = f.locator(`input[name=esc][value=${e}]`); if (!(await i.isDisabled())) await i.check(); }
  if (note) await f.locator('textarea[name=note]').fill(note);
  if (reflect !== undefined) await f.locator('input[name=reflect]').nth(reflect).check();
  await f.locator('button.btn:not(.ghost)').last().click();
  const score = page.locator('#modalbox .score b');
  await expect(score).toBeVisible();
  const pts = Number(await score.textContent());
  return pts;
}

export async function continueShift(page) {
  await page.click('#modalbox [data-act="close-modal"] >> nth=-1');
  await expect(page.locator('#modal')).toBeHidden();
}

// ---------- Partida perfecta (src/perfect-run.js, la misma que ejecuta la Demo) ----------------
import { PERFECT } from '../src/perfect-run.js';
import { DICTS } from '../src/i18n/index.js';

/** Abre el turno en el idioma indicado (guardado en localStorage antes de cargar). */
export async function openGameIn(page, lang, opts = {}) {
  await page.addInitScript((l) => localStorage.setItem('ronda-dc-idioma', l), lang);
  await openGame(page, opts);
}

/** Resuelve un evento con la solución de referencia. Devuelve el puntaje del ticket. */
export async function playEvent(page, incId, lang = 'es') {
  let pts = null;
  for (const st of PERFECT[incId]) {
    if (st.open) await openTicket(page, incId);
    else if (st.tab) await tab(page, st.tab);
    else if (st.inspect) await inspect(page, ...st.inspect);
    else if (st.attach) await attach(page, st.attach);
    else if (st.field) await doField(page, ...st.field);
    else if (st.auth) await requestAuth(page, ...st.auth);
    else if (st.wait) await step(page, st.wait);
    else if (st.close) {
      await tab(page, 'tickets'); await openTicket(page, incId);
      pts = await closeTicket(page, { ...st.close, note: DICTS[lang].demo.note[incId] });
      await continueShift(page);
    }
    // st.rack: solo la Demo (vista de detalle del rack)
  }
  return pts;
}

/** Juega todos los eventos del turno abierto, cada uno apenas salta su alerta. */
export async function playPerfect(page, lang = 'es') {
  const { sched } = await state(page);
  const scores = {};
  for (const id of Object.keys(sched).sort((a, b) => sched[a] - sched[b])) {
    await stepTo(page, sched[id] + 0.05);
    scores[id] = await playEvent(page, id, lang);
  }
  return scores;
}
