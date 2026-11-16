// Versión ES/EN: diccionarios completos, idioma inicial, cambio en vivo y partida perfecta en inglés.
import { test, expect } from '@playwright/test';
import { DICTS, LANGS } from '../src/i18n/index.js';
import { GLOSSARIES } from '../src/glossary.js';
import { APP, openGame, openGameIn, playPerfect, stepTo, state, openTicket, tab, attach, inspect, closeTicket, trackErrors } from './helpers.mjs';

/** Aplana un diccionario: { 'grupo.clave': valor }. Las listas cuentan como hojas (se compara su largo). */
function flatten(o, pre = '', out = {}) {
  for (const k of Object.keys(o)) {
    const v = o[k], key = pre ? pre + '.' + k : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}
const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
/** Recorre listas de objetos (pasos, opciones…) para comparar también sus claves internas. */
function deep(v, pre, out) {
  if (Array.isArray(v)) v.forEach((x, i) => deep(x, pre + '[' + i + ']', out));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) deep(v[k], pre + '.' + k, out);
  else out[pre] = v;
  return out;
}

test('ningún idioma tiene claves faltantes, listas de otro largo ni variables distintas', () => {
  const [base, ...others] = LANGS;
  const A = deep(DICTS[base], '', {});
  for (const lang of others) {
    const B = deep(DICTS[lang], '', {});
    const missingInB = Object.keys(A).filter((k) => !(k in B));
    const missingInA = Object.keys(B).filter((k) => !(k in A));
    expect(missingInB, `claves de «${base}» que faltan en «${lang}»`).toEqual([]);
    expect(missingInA, `claves de «${lang}» que faltan en «${base}»`).toEqual([]);
    const badVars = Object.keys(A).filter((k) => typeof A[k] === 'string' && vars(A[k]) !== vars(B[k]));
    expect(badVars, `variables {…} distintas entre «${base}» y «${lang}»`).toEqual([]);
    const empty = Object.keys(B).filter((k) => typeof B[k] === 'string' && !B[k].trim() && A[k].trim());
    expect(empty, `textos vacíos en «${lang}»`).toEqual([]);
  }
  // también a nivel de grupo: cada lista con el mismo número de elementos
  const FA = flatten(DICTS[base]);
  for (const lang of others) {
    const FB = flatten(DICTS[lang]);
    for (const k of Object.keys(FA)) if (Array.isArray(FA[k])) expect(FB[k]?.length, `largo de ${k} en «${lang}»`).toBe(FA[k].length);
  }
});

test('el glosario tiene los mismos términos en todos los idiomas', () => {
  const ids = (l) => GLOSSARIES[l].map((g) => g.id).sort();
  for (const l of LANGS) {
    expect(ids(l)).toEqual(ids('es'));
    for (const g of GLOSSARIES[l]) for (const f of ['term', 'def', 'example', 'ref']) expect(g[f], `${l}: ${g.id}.${f}`).toBeTruthy();
  }
});

test('idioma inicial según el navegador y elección guardada', async ({ browser }) => {
  const en = await browser.newContext({ locale: 'en-US' });
  const p1 = await en.newPage();
  await p1.goto(`${APP}?test`);
  await expect(p1.locator('html')).toHaveAttribute('lang', 'en');
  await expect(p1.locator('#turnobtn')).toHaveText('Start shift');
  await expect(p1.locator('.langsel [data-lang="en"]')).toHaveClass(/on/);
  // la elección se guarda: al recargar sigue en español aunque el navegador esté en inglés
  await p1.click('.langsel [data-lang="es"]');
  await expect(p1.locator('#turnobtn')).toHaveText('Comenzar turno');
  await p1.reload();
  await expect(p1.locator('html')).toHaveAttribute('lang', 'es');
  await en.close();

  const es = await browser.newContext({ locale: 'es-CL' });
  const p2 = await es.newPage();
  await p2.goto(`${APP}?test`);
  await expect(p2.locator('html')).toHaveAttribute('lang', 'es');
  await es.close();
});

test('cambiar de idioma a mitad del turno no reinicia: ticket, bitácora, evidencia y corrección cambian', async ({ page }) => {
  const errors = trackErrors(page);
  await openGame(page);
  await stepTo(page, 10.05);
  await openTicket(page, 'E1');
  await tab(page, 'accesos'); await attach(page, 'acc:acc-0805');
  await inspect(page, 'rack', 'R04');
  await tab(page, 'bitacora');
  await page.fill('#noteinput', 'TK-101: nota escrita a mano');
  await page.press('#noteinput', 'Enter');
  const before = await state(page);

  // a inglés (selector de la cabecera)
  await page.click('header .langsel [data-lang="en"]');
  const after = await state(page);
  expect(after.t).toBe(before.t);
  expect(after.tickets).toEqual(before.tickets);
  expect(after.lang).toBe('en');
  await expect(page.locator('#pane')).toContainText('Shift started');
  await expect(page.locator('#pane')).toContainText('TK-101: nota escrita a mano'); // lo escrito no se traduce
  await expect(page.locator('#endbtn')).toHaveText('End shift');
  await expect(page.locator('#inspector')).toContainText('Inlet, middle');
  await expect(page.locator('#inspector')).toContainText(/\d\.\d °C/); // decimales con punto
  await tab(page, 'tickets'); await openTicket(page, 'E1');
  await expect(page.locator('.detail')).toContainText('Vendor entering the data hall');
  await expect(page.locator('.detail .evl')).toContainText('Vendor · CHG-1042'); // evidencia adjunta en español, ahora en inglés
  await tab(page, 'monitoreo');
  await expect(page.locator('#pane')).toContainText('Entry to Data Hall A with an external vendor badge');

  // cierre y corrección en inglés; de vuelta a español con la corrección abierta
  await tab(page, 'tickets'); await openTicket(page, 'E1');
  const pts = await closeTicket(page, { cls: 'benigno', prio: 'P4', acts: ['a1'], esc: ['nadie'], note: 'Escorted.' });
  await expect(page.locator('#modalbox .rev')).toContainText('Classification');
  await expect(page.locator('#modalbox .rev')).toContainText('Benign');
  await expect(page.locator('#modalbox .why')).toContainText('The entry matches CHG-1042');
  await page.evaluate(() => document.querySelector('.langsel [data-lang="es"]').click()); // el modal tapa la cabecera
  await expect(page.locator('#modalbox .rev')).toContainText('Clasificación');
  await expect(page.locator('#modalbox .rev')).toContainText('Benigno');
  await expect(page.locator('#modalbox .why')).toContainText('El ingreso coincide con CHG-1042');
  await expect(page.locator('#modalbox .score b')).toHaveText(String(pts)); // el puntaje no cambia con el idioma
  expect(errors).toEqual([]);
});

test('partida perfecta en inglés: 8 tickets, 800 pts, informe y formatos en inglés', async ({ page }) => {
  const errors = trackErrors(page);
  await openGameIn(page, 'en');
  await expect(page.locator('#levelbadge')).toHaveText('Normal');
  const scores = await playPerfect(page, 'en');
  await stepTo(page, 421);
  const s = await state(page);
  expect(scores).toEqual({ E1: 100, E2: 100, E3: 100, E4: 100, E5: 100, E6: 100, E7: 100, E8: 100 });
  expect(s.impacts).toEqual([]);
  expect(s.ended).toBe(true);
  await expect(page.locator('#endbox h2')).toContainText('End of shift');
  await expect(page.locator('#endbox .kpi').first()).toContainText('of 800 pts · 100%');
  await expect(page.locator('#endbox')).toContainText('No operational impact');
  await expect(page.locator('#endbox')).toContainText('100.00%');
  const report = await page.evaluate(() => window.__ronda.report());
  expect(report).toContain('# Shift report · Ronda DC');
  expect(report).toContain('**Score:** 800 / 800');
  expect(report).toMatch(/[A-Z][a-z]+ \d{1,2}, \d{4}/); // fecha en inglés (November 15, 2026)
  expect(report).toContain('Rising temperature in R08');
  expect(report).toContain('Blanking panels installed in R08 (U30–U34).');
  expect(report).not.toMatch(/Paneles ciegos|Bitácora|Puntaje/);
  expect(errors).toEqual([]);
});
