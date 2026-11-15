// Fundidos por opacidad de materiales (transición sala ↔ detalle del rack).
// Cada registro guarda la opacidad, transparencia y depthWrite originales,
// para poder volver exactamente al estado inicial cuando f = 1.

export function fadeRecord(m) {
  return { m, o: m.opacity, t: m.transparent, dw: m.depthWrite, f: 1 };
}

/** Aplica el factor f (0 = invisible, 1 = original) a un registro. */
export function setFade(rec, f) {
  if (Math.abs(rec.f - f) < 0.001) return;
  rec.f = f;
  const m = rec.m;
  const wantT = rec.t || f < 0.999;
  if (m.transparent !== wantT) { m.transparent = wantT; m.needsUpdate = true; }
  m.opacity = rec.o * f;
  m.depthWrite = rec.dw && f > 0.98;
}

/** Materiales (únicos) de un objeto y sus hijos, salvo los marcados con userData.noFade. */
export function collectMaterials(obj, out = new Set()) {
  obj.traverse((o) => {
    if (!o.material || (o.userData && o.userData.noFade)) return;
    [].concat(o.material).forEach((m) => { if (m && typeof m === 'object') out.add(m); });
  });
  return out;
}

export const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
export const smoothstep = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
