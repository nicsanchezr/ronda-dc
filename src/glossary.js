// Glosario: marcado automático de términos en textos y tooltip accesible (mouse, teclado y toque).
import GLOSARIO from './i18n/glosario.es.js';
import { t } from './i18n/index.js';

export const GLOSSARY = GLOSARIO;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Siglas en mayúsculas (U, PDU, P1…) se comparan respetando mayúsculas; el resto, sin distinguirlas.
const forms = [];
for (const g of GLOSARIO) for (const f of [g.term, ...(g.aliases || [])]) {
  const acronym = /[A-Z]/.test(f) && f === f.toUpperCase();
  forms.push({ f, id: g.id, acronym });
}
forms.sort((a, b) => b.f.length - a.f.length);
const build = (list, flags) => list.length ? new RegExp(`(?<![\\p{L}\\p{N}])(${list.map((x) => reEsc(x.f)).join('|')})(?![\\p{L}\\p{N}])`, flags) : null;
const RE_CS = build(forms.filter((x) => x.acronym), 'gu');
const RE_CI = build(forms.filter((x) => !x.acronym), 'giu');
const idOf = (m) => {
  const exact = forms.find((x) => x.acronym && x.f === m);
  if (exact) return exact.id;
  const lower = m.toLocaleLowerCase('es');
  const hit = forms.find((x) => !x.acronym && x.f.toLocaleLowerCase('es') === lower);
  return hit ? hit.id : null;
};

/** Marca la primera aparición de cada término en un texto ya escapado (sin etiquetas). */
export function linkify(escaped) {
  if (!escaped) return escaped;
  const seen = new Set();
  const spans = [];
  for (const re of [RE_CS, RE_CI]) {
    if (!re) continue;
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(escaped))) {
      const id = idOf(m[1]);
      if (!id || seen.has(id)) continue;
      const a = m.index, b = a + m[1].length;
      if (spans.some((s) => a < s.b && b > s.a)) continue;
      seen.add(id); spans.push({ a, b, id });
    }
  }
  spans.sort((x, y) => y.a - x.a);
  let out = escaped;
  for (const s of spans) out = out.slice(0, s.a) + `<span class="gl" tabindex="0" role="button" data-gl="${s.id}">${out.slice(s.a, s.b)}</span>` + out.slice(s.b);
  return out;
}
export const gl = (text) => linkify(esc(text));

/** Tooltip único del glosario. onOpenEntry(id) abre la entrada en la pestaña Consulta. */
export function initGlossaryTip(onOpenEntry) {
  const tip = document.createElement('div');
  tip.id = 'gltip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
  document.body.appendChild(tip);
  let current = null, hideT = null, pinned = false;
  const show = (el, pin = false) => {
    const g = GLOSARIO.find((x) => x.id === el.dataset.gl); if (!g) return;
    clearTimeout(hideT);
    current = el; pinned = pin;
    tip.innerHTML = `<b>${esc(g.term)}</b><p>${esc(g.def)}</p><p class="ex"><span>${t('glossary.example')}</span> ${esc(g.example)}</p><p class="ref">${esc(g.ref)}</p><button type="button" class="link" data-glopen="${g.id}">${t('glossary.open')}</button>`;
    tip.hidden = false;
    const r = el.getBoundingClientRect(), w = Math.min(320, window.innerWidth - 16);
    tip.style.width = w + 'px';
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
    const below = r.bottom + 8 + tip.offsetHeight < window.innerHeight;
    tip.style.left = left + 'px';
    tip.style.top = (below ? r.bottom + 8 : Math.max(8, r.top - tip.offsetHeight - 8)) + 'px';
    el.setAttribute('aria-describedby', 'gltip');
  };
  const hide = (now) => {
    clearTimeout(hideT);
    const go = () => { tip.hidden = true; if (current) current.removeAttribute('aria-describedby'); current = null; pinned = false; };
    if (now) go(); else hideT = setTimeout(go, 180);
  };
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('.gl');
    if (el) { if (!pinned || el !== current) show(el); }
    else if (e.target.closest('#gltip')) clearTimeout(hideT);
  });
  document.addEventListener('mouseout', (e) => {
    if (pinned) return;
    if (e.target.closest('.gl') || e.target.closest('#gltip')) hide(false);
  });
  document.addEventListener('focusin', (e) => { const el = e.target.closest && e.target.closest('.gl'); if (el) show(el); });
  document.addEventListener('focusout', (e) => { if (e.target.closest && e.target.closest('.gl') && !pinned) hide(false); });
  // toque o clic: fija el tooltip; otro toque fuera lo cierra
  document.addEventListener('click', (e) => {
    const open = e.target.closest('[data-glopen]');
    if (open) { hide(true); onOpenEntry(open.dataset.glopen); return; }
    const el = e.target.closest('.gl');
    if (el) { e.stopPropagation(); if (current === el && pinned) hide(true); else show(el, true); return; }
    if (!e.target.closest('#gltip') && !tip.hidden) hide(true);
  }, true);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !tip.hidden) { hide(true); }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.closest && e.target.closest('.gl')) { e.preventDefault(); show(e.target.closest('.gl'), true); }
  });
}
