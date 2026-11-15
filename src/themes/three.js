// Adaptador de temas para Three.js: los materiales, luces y texturas se registran
// con una función que lee los tokens; al cambiar de tema se vuelven a aplicar todas.
import * as THREE from 'three';
import { getTokens, onThemeChange } from './index.js';

export function createThemeBinder() {
  const binds = [];
  const run = (fn) => fn(getTokens());
  onThemeChange((T) => binds.forEach((fn) => fn(T)));
  return {
    /** Registra fn(T) y la ejecuta ahora y en cada cambio de tema. */
    on(fn) { binds.push(fn); run(fn); return fn; },
    /** Color de un material (o luz) tomado de los tokens: pick(T) → '#rrggbb'. */
    color(obj, pick, prop = 'color') { return this.on((T) => obj[prop].set(pick(T))); },
    /** Textura de canvas que se redibuja con draw(g, T, canvas) al cambiar el tema. */
    canvas(w, h, draw, setup) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      if (setup) setup(t);
      this.on((T) => { draw(c.getContext('2d'), T, c); t.needsUpdate = true; });
      return t;
    },
  };
}

/** Escala de calor (18 → 42 °C) a partir de los tokens. */
export function heatColor(T, t) {
  const temps = [18, 24, 30, 36, 42];
  const stops = T.heat;
  if (t <= temps[0]) return new THREE.Color(stops[0]);
  for (let i = 1; i < temps.length; i++) {
    if (t <= temps[i]) return new THREE.Color(stops[i - 1]).lerp(new THREE.Color(stops[i]), (t - temps[i - 1]) / (temps[i] - temps[i - 1]));
  }
  return new THREE.Color(stops[stops.length - 1]);
}
