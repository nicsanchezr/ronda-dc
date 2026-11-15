# Ronda DC · contexto para Claude Code

## Nombre y marca (decidido el 15-11-2026)
- Nombre: **Ronda DC** (antes "Turno de Sala"; ese nombre debe desaparecer de la interfaz, el título y el informe).
- Subtítulo ES: *Simulador de operación de sala de datacenter* · EN: *Data center floor operations simulator*.
- Modos dentro del producto: **Turno** / *Shift* · **Checklist de ronda** / *Rounds checklist* · **Demo**.
- Repositorio: `nicsanchezr/ronda-dc` · GitHub Pages: `nicsanchezr.github.io/ronda-dc`.
- La interfaz debe quedar preparada para ES/EN (textos centralizados para poder traducirlos), con el español como idioma inicial.


Ronda DC es un simulador 3D público de un turno de operación en una sala de datacenter (operador N1), inspirado en el enfoque de Blue-Jr (https://heindall92.github.io/Blue-Jr/): turno con alertas, tickets, decisiones corregidas al momento e informe final. Autor: Nicolás Sánchez Rodríguez (docente DUOC UC / INACAP). Idioma de la interfaz: español de Chile.

## Estado actual (MVP v0.1)
- Un turno de 08:00 a 15:00 en "Cordillera Colo · Sala A" (empresa ficticia), 10 racks (R01–R10) de tres clientes, CRAC-1/2, UPS-A/B, sensor de fugas, control de acceso.
- 8 eventos: 3 que no requieren escalar (proveedor con cambio aprobado, sensor suelto que es un falso positivo, autoprueba de la UPS) y 5 reales (paneles ciegos, PSU B+B en PDU-B, falla de CRAC-2, fuga de condensado, puerta de R02 con un cable de consola).
- Corrección por ticket: clasificación 25, prioridad 15, escalamiento 20, acciones 30, evidencia 10, menos penalizaciones por SLA. Las acciones críticas dejan las acciones en 0 y producen impactos en la sala.
- Dinámica: la temperatura sube si falla un CRAC (apagado térmico a 32 °C), la PDU dispara al 96 %, la fuga crece. El reloj se pausa al cerrar un ticket. 1 min de juego = 5 s reales a 1×.

## Estructura
- `src/scenario.js`: datos de la sala, catálogos (severidades estilo Zabbix, escalamientos, prioridades/SLA), calendario de cambios, accesos, runbooks y los 8 eventos (respuesta esperada, explicación, referencia).
- `src/sim.js`: estado del mundo, dinámica por minuto (`step`), efectos de cerrar un ticket (`applyClose`), inspección de objetos (`inspect`, incluye fichas `device` y `pdu`), ramas de PSU/PDU (`psuBranches`, `branchPowered`, `pduLoad`) y datos ficticios de equipos (`deviceInfo`, modelos en `MODELS` de `scenario.js`).
- `src/scene3d.js`: escena Three.js 0.160 (racks, LEDs por equipo, CRAC, UPS, contención, agua, selección, vistas de cámara).
- `src/rackview.js`: vista de detalle del rack, construida dentro de la misma escena en la posición del rack: 42 U numeradas, equipos con LED de encendido/actividad/estado, PSU y cables por rama (colores `cord.A`/`cord.B` del tema) hacia PDU verticales, paneles ciegos o hueco, puerta trasera, cable de consola. Se abre con doble clic en un rack o con «Ver rack en detalle»; Esc vuelve a la sala.
- Transición sala ↔ detalle (`scene3d.js`): un progreso `p` (0 sala, 1 detalle) controla el vuelo de la cámara (~950 ms, con arco sobre los racks), el fundido del detalle, la atenuación de la sala (opacidad + niebla) y la ocultación de lo que tapa el rack (`fade.js`). Frente/trasera rodea el rack en arco. Clics bloqueados mientras `scene.busy`. Con `prefers-reduced-motion`, solo un fundido corto. Los paneles usan `panelShow`/`panelHide` (clases `.entering`/`.leaving`).
- `src/main.js`: UI (panel con pestañas, inspector, modal de cierre, corrección, fin de turno, informe Markdown).
- `src/themes/`: un archivo por tema (`sala.theme.js` = Gris de sala, por defecto; `hmi.theme.js` = Alto rendimiento, criterio ISA-101), con tokens para `light` y `dark`: `ui` (variables CSS), `sev`/`onSev`, `led`, `cord`, `heat` y `scene` (materiales, luces y texturas 3D; `scene.rv` = vista de detalle). `base.js` tiene lo común. `index.js` registra los temas, resuelve el modo (claro/oscuro/sistema), lo guarda en localStorage (`ronda-dc-tema`) y escribe las variables CSS. `three.js` es el adaptador para Three.js (`TB.color`, `TB.canvas`, `TB.on`). **Para agregar un tema basta crear `src/themes/<id>.theme.js`**: `build.mjs` descubre los `*.theme.js` solo (módulo `virtual:themes`).
- **Ningún color escrito a mano fuera de `src/themes/`**: la interfaz usa `var(--…)` y la escena lee los tokens.
- `src/status.js`: lenguaje de estado común a todos los temas: sin color si está sano; con alarma, contorno + ícono de prioridad (1 cuadrado: Desastre/Alta · 2 rombo: Promedio/Advertencia · 3 triángulo: Información). El halo en el piso es un refuerzo opcional por tema (`scene.halo`).
- `assets/fonts/`: tipografías woff2 incrustadas en el HTML por `build.mjs` (nombre `Familia-Peso.woff2`, licencias en `LICENCIAS.md`).
- `tools/contrast.mjs` (`npm run contrast`): verifica WCAG AA de cada tema y modo.
- `src/i18n/`: textos de la interfaz (`es.js`, idioma inicial) y `t(clave, valores)` / `applyI18n()` en `index.js`. Los textos nuevos de la interfaz van al diccionario, no en duro en el código. Los textos de los escenarios (`scenario.js`, `sim.js`) aún no están centralizados.
- `template.html`: CSS y estructura (los textos estáticos llevan `data-i18n`, `data-i18n-html`, `data-i18n-list` o `data-i18n-attr`). `build.mjs`: esbuild empaqueta todo en `dist/index.html` (un solo archivo, sin peticiones externas).

## Comandos
- `npm install` y luego `node build.mjs` → `dist/index.html`
- Las pruebas se hicieron con Playwright + Chrome/Edge recorriendo los 8 tickets. Ojo: con `--use-gl=swiftshader` el fondo de la escena sale negro (defecto de SwiftShader); para revisar colores, usar el renderizado normal del navegador.
- `npm run contrast` antes de tocar colores de un tema.

## Convenciones
- Todo debe ser ficticio (empresa, personas, clientes). No usar marcas reales en el diseño propio.
- El diseño actual se parece demasiado a un mockup de LinkedIn ("LAKA Soluciones Tecnológicas", widget 3D para Zabbix): hay que diferenciarlo (ver ROADMAP).
- Funcionar como un solo HTML local-first (progreso en localStorage con try/catch).
- Los textos para el estudiante deben ser claros y explicar el porqué con una referencia normativa (ASHRAE TC 9.9, TIA-942, Uptime Tiers, ISO/IEC 27001, ISO/IEC 20000, ITIL).
