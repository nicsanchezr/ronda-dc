// Mini sistema de traducción: diccionarios por idioma, t(clave, valores), mensajes diferidos y formatos.
// Cada idioma = textos de la interfaz (<idioma>.js) + textos de los escenarios (escenario.<idioma>.js, grupo «sc»).
// El idioma inicial sale del navegador (navigator.language) y la elección se guarda en localStorage.
import es from './es.js';
import en from './en.js';
import scEs from './escenario.es.js';
import scEn from './escenario.en.js';

export const DICTS = { es: { ...es, sc: scEs }, en: { ...en, sc: scEn } };
export const LANGS = ['es', 'en'];
const LOCALES = { es: 'es-CL', en: 'en-US' };
const KEY = 'ronda-dc-idioma';

function initialLang() {
  if (typeof window !== 'undefined') { try { const s = localStorage.getItem(KEY); if (LANGS.includes(s)) return s; } catch (e) { /* sin almacenamiento */ } }
  const nav = typeof navigator !== 'undefined' ? (navigator.languages && navigator.languages[0]) || navigator.language || '' : '';
  return /^es\b/i.test(nav) ? 'es' : nav ? 'en' : 'es';
}

export let lang = initialLang();
let dict = DICTS[lang];
const listeners = new Set();

const lookup = (d, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);

/** Devuelve el texto de la clave ('grupo.clave'), reemplazando {nombre} por vars.nombre. */
export function t(key, vars) {
  let s = lookup(dict, key);
  if (s === undefined) s = lookup(DICTS.es, key);
  if (s === undefined) return key;
  if (typeof s !== 'string') return s; // listas u objetos (p. ej. intro.how)
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)) : s;
}

export const locale = () => LOCALES[lang];

// ---------- Formatos según el idioma -------------------------------------------------------------
/** Número con d decimales: 22,4 (es) / 22.4 (en). */
export const fmtNum = (n, d = 1) => {
  const s = Number(n).toFixed(d);
  return lang === 'es' ? s.replace('.', ',') : s;
};
/** Porcentaje: «84 %» (es, con espacio) / «84%» (en). */
export const fmtPct = (n, d = 0) => fmtNum(n, d) + (lang === 'es' ? ' %' : '%');
/** Fecha larga: «15 de noviembre de 2026» / «November 15, 2026». Acepta Date o 'AAAA-MM-DD'. */
export function fmtDate(d = new Date()) {
  const date = typeof d === 'string' ? new Date(d + 'T12:00:00') : d;
  if (isNaN(date)) return String(d);
  return date.toLocaleDateString(LOCALES[lang], { day: 'numeric', month: 'long', year: 'numeric' });
}

// ---------- Mensajes diferidos ---------------------------------------------------------------------
// Lo que queda guardado en el estado (bitácora, impactos, evidencia, alertas del sistema) se guarda
// como mensaje y se traduce al mostrarlo: así cambia de idioma sin reiniciar la partida.
//   'texto'              → literal (p. ej. una nota escrita por el estudiante)
//   msg(clave, valores)  → t(clave, valores), con valores que también pueden ser mensajes
//   num(n, d) / pct(n)   → número o porcentaje formateado según el idioma
//   cat([a, b], ' · ')   → mensajes unidos con un separador
export const msg = (k, v) => ({ k, v });
export const num = (n, d = 1) => ({ n, d });
export const pct = (n, d = 0) => ({ n, d, p: true });
export const cat = (j, s = ' · ') => ({ j, s });
/** El mismo mensaje con la primera letra en minúscula (para insertarlo a mitad de frase). */
export const lcf = (m) => ({ ...m, lc: true });
export function tm(m) {
  if (m == null) return '';
  if (typeof m === 'string' || typeof m === 'number') return String(m);
  if (m.j) return m.j.map(tm).filter(Boolean).join(m.s);
  if (m.n !== undefined) return m.p ? fmtPct(m.n, m.d) : fmtNum(m.n, m.d);
  if (m.k) {
    let out;
    if (!m.v) out = t(m.k);
    else { const v = {}; for (const x in m.v) v[x] = tm(m.v[x]); out = t(m.k, v); }
    return m.lc && typeof out === 'string' ? out.charAt(0).toLocaleLowerCase() + out.slice(1) : out;
  }
  return '';
}

// ---------- Cambio de idioma -------------------------------------------------------------------------
export function setLang(code, { save = true } = {}) {
  if (!DICTS[code]) return false;
  lang = code; dict = DICTS[code];
  if (save && typeof window !== 'undefined') { try { localStorage.setItem(KEY, code); } catch (e) { /* sin almacenamiento */ } }
  if (typeof document !== 'undefined') { document.documentElement.lang = code; applyI18n(); }
  listeners.forEach((fn) => fn(code));
  return true;
}
/** Suscribe una función que se llama cada vez que cambia el idioma. */
export function onLangChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/**
 * Aplica el diccionario al HTML estático:
 *  data-i18n="clave"          → textContent
 *  data-i18n-html="clave"     → innerHTML (solo textos propios, nunca datos del usuario)
 *  data-i18n-list="clave"     → <li> por cada elemento de la lista
 *  data-i18n-attr="title:clave;aria-label:clave"
 */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
  root.querySelectorAll('[data-i18n-list]').forEach((el) => {
    const items = t(el.dataset.i18nList);
    if (Array.isArray(items)) el.innerHTML = items.map((x) => '<li>' + x + '</li>').join('');
  });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    el.dataset.i18nAttr.split(';').forEach((pair) => {
      const [attr, key] = pair.split(':').map((x) => x.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    });
  });
  if (root === document) { document.title = t('app.docTitle'); document.documentElement.lang = lang; }
}
