// Lenguaje de estado común a todos los temas (criterio ISA-101):
// sin color si está sano; con alarma, contorno + ícono cuya forma indica la prioridad,
// para no depender solo del color.
//   prioridad 1 → cuadrado  (Desastre, Alta)
//   prioridad 2 → rombo     (Promedio, Advertencia)
//   prioridad 3 → triángulo (Información)
export const PRIORITY = { disaster: 1, high: 1, average: 2, warning: 2, info: 3 };
export const SHAPE = { 1: 'square', 2: 'diamond', 3: 'triangle' };
export const priorityOf = (sev) => PRIORITY[sev] || 0;

/** Ícono HTML del estado (forma + número de prioridad), coloreado con las variables del tema. */
export function statusIcon(sev, { label = '' } = {}) {
  const p = priorityOf(sev);
  if (!p) return `<i class="si ok" aria-hidden="true"></i>`;
  return `<i class="si p${p}" style="--c:var(--sev-${sev});--ci:var(--on-sev-${sev})" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><b>${p}</b></i>`;
}

/** Dibuja el ícono en un canvas 2D (para la escena 3D). */
export function drawStatusIcon(g, cx, cy, r, sev, fill, ink, edge) {
  const p = priorityOf(sev);
  if (!p) return;
  g.save();
  g.beginPath();
  if (p === 1) g.rect(cx - r, cy - r, 2 * r, 2 * r);
  else if (p === 2) { g.moveTo(cx, cy - r * 1.3); g.lineTo(cx + r * 1.3, cy); g.lineTo(cx, cy + r * 1.3); g.lineTo(cx - r * 1.3, cy); g.closePath(); }
  else { g.moveTo(cx, cy - r * 1.25); g.lineTo(cx + r * 1.3, cy + r * 0.95); g.lineTo(cx - r * 1.3, cy + r * 0.95); g.closePath(); }
  g.fillStyle = fill; g.fill();
  g.lineWidth = r * 0.14; g.strokeStyle = edge; g.stroke();
  g.fillStyle = ink; g.font = `700 ${Math.round(r * 1.15)}px ui-sans-serif, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(p), cx, cy + (p === 3 ? r * 0.28 : r * 0.05));
  g.restore();
}
