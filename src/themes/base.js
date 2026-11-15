// Valores comunes a todos los temas. Cada tema (*.theme.js) los sobrescribe
// parcial o totalmente para cada modo (light / dark).
// Grupos de tokens:
//   ui     → variables CSS de la interfaz (--bg, --panel, --txt…; camelCase → kebab-case)
//   sev    → colores de severidad (fondo del ícono de estado); onSev → texto sobre ese color
//   led    → LED de los equipos (interfaz y escena 3D)
//   cord   → cables de energía por rama (A, B)
//   heat   → escala de temperatura de entrada 18 · 24 · 30 · 36 · 42 °C
//   scene  → materiales, luces y texturas de la escena 3D (adaptador en three.js)
//   scene.rv → texturas y materiales de la vista de detalle del rack
export default {
  fonts: {
    sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    head: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  },
  shared: {
    heat: ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444'],
    mask: '#ffffff', // máscaras de degradado (el color real lo pone el material)
  },
};
