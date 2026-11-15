// Registro de temas, modo claro/oscuro/sistema y aplicación como variables CSS.
// Los temas se descubren solos: build.mjs empaqueta todos los src/themes/*.theme.js
// en el módulo virtual 'virtual:themes'. Para agregar un tema basta un archivo nuevo.
import THEMES from 'virtual:themes';
import base from './base.js';

const KEY = 'ronda-dc-tema';
export const MODES = ['light', 'dark', 'system'];
const list = THEMES.slice().sort((a, b) => (a.order || 99) - (b.order || 99));
const mq = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

let state = load();
let tokens = null;
const listeners = new Set();

function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* sin almacenamiento */ }
  const theme = s && list.some((t) => t.id === s.theme) ? s.theme : list[0].id;
  const mode = s && MODES.includes(s.mode) ? s.mode : 'system';
  return { theme, mode };
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sin almacenamiento */ } }

const kebab = (k) => k.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase());
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
function merge(a, b) {
  const out = { ...a };
  for (const k in b) out[k] = isObj(a[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k];
  return out;
}

export function resolvedMode() { return state.mode === 'system' ? (mq && mq.matches ? 'dark' : 'light') : state.mode; }

function resolve() {
  const th = list.find((t) => t.id === state.theme) || list[0];
  const mode = resolvedMode();
  const m = th.modes[mode] || th.modes.light;
  return merge({ ...base.shared, fonts: base.fonts }, { ...m, fonts: { ...base.fonts, ...(th.fonts || {}) }, id: th.id, mode });
}

/** Escribe los tokens como variables CSS en <html>. */
function applyCss(T) {
  const root = document.documentElement;
  const set = (k, v) => root.style.setProperty(k, v);
  for (const k in T.ui) set('--' + kebab(k), T.ui[k]);
  for (const k in T.sev) set('--sev-' + k, T.sev[k]);
  for (const k in T.onSev) set('--on-sev-' + k, T.onSev[k]);
  for (const k in T.led) set('--led-' + k, T.led[k]);
  for (const k in T.cord) set('--cord-' + k.toLowerCase(), T.cord[k]);
  T.heat.forEach((c, i) => set('--heat-' + i, c));
  set('--sans', T.fonts.sans); set('--head', T.fonts.head); set('--mono', T.fonts.mono);
  root.dataset.theme = T.mode; root.dataset.themeId = T.id;
  root.style.colorScheme = T.mode;
}

function apply() {
  tokens = resolve();
  if (typeof document !== 'undefined') applyCss(tokens);
  listeners.forEach((fn) => fn(tokens));
}

export const themes = () => list.map((t) => ({ id: t.id, name: t.name, description: t.description }));
export const getState = () => ({ ...state });
export const getTokens = () => tokens || (tokens = resolve());
export function setTheme(id) { if (!list.some((t) => t.id === id) || id === state.theme) return; state.theme = id; save(); apply(); }
export function setMode(m) { if (!MODES.includes(m) || m === state.mode) return; state.mode = m; save(); apply(); }
/** Suscribe una función que recibe los tokens cada vez que cambia el tema o el modo. */
export function onThemeChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function initThemes() {
  if (mq) mq.addEventListener('change', () => { if (state.mode === 'system') apply(); });
  apply();
}

/** Color de severidad como variable CSS (para estilos en línea). */
export const sevVar = (sev) => `var(--sev-${sev})`;
