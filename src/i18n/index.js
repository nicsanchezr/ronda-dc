// Mini sistema de traducción: diccionarios por idioma y t(clave, valores).
import es from './es.js';

const DICTS = { es };
let dict = es;
export let lang = 'es';

const lookup = (d, key) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), d);

/** Devuelve el texto de la clave ('grupo.clave'), reemplazando {nombre} por vars.nombre. */
export function t(key, vars) {
  let s = lookup(dict, key);
  if (s === undefined) s = lookup(es, key);
  if (s === undefined) return key;
  if (typeof s !== 'string') return s; // listas u objetos (p. ej. intro.how)
  return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined ? vars[k] : m)) : s;
}

export function setLang(code) {
  if (!DICTS[code]) return false;
  lang = code; dict = DICTS[code];
  document.documentElement.lang = code;
  applyI18n();
  return true;
}

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
  if (root === document) document.title = t('app.docTitle');
}
