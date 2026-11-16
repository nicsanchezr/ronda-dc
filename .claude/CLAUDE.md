# Ronda DC · contexto del proyecto

Contexto para Claude Code y para cualquier persona que contribuya. Ronda DC es un simulador 3D público de un turno de operación en una sala de datacenter (operador N1): alertas, tickets, acciones en la sala, decisiones corregidas al momento e informe final. Inspirado en el enfoque de [Blue-Jr](https://heindall92.github.io/Blue-Jr/). Interfaz en español de Chile e inglés (selector ES | EN; el idioma inicial sale del navegador).

## Producto
- Nombre: **Ronda DC**. Subtítulo ES: *Simulador de operación de sala de datacenter* · EN: *Data center floor operations simulator*.
- Modos: **Turno** / *Shift* · **Checklist de ronda** / *Rounds checklist* · **Demo**.
- Repositorio: `nicsanchezr/ronda-dc` · GitHub Pages: `nicsanchezr.github.io/ronda-dc`.
- Historial en `CHANGELOG.md`; próximos pasos en `docs/ROADMAP.md`.

## El escenario
- Sala «Cordillera Colo · Sala A» (empresa ficticia), turno completo de 08:00 a 15:00 (8 eventos) o corto de 08:00 a 10:30 (E1, E3, E6 y E7), 10 racks (R01–R10) de tres clientes, CRAC-1/2, UPS-A/B, sensor de fugas y control de acceso.
- 8 eventos: 3 que no requieren escalar (proveedor con cambio aprobado, sensor suelto que es un falso positivo, autoprueba de la UPS) y 5 reales (paneles ciegos, PSU B+B en PDU-B, falla de CRAC-2, fuga de condensado, puerta de R02 con un cable de consola).
- Corrección por ticket: clasificación 25, prioridad 15, escalamiento 20, acciones 30, evidencia 10, menos SLA y pistas según el nivel; hallazgo proactivo +10 aparte (el porcentaje final no pasa del 100 %).
- Checklist de ronda: 10 ítems (`ROUND_ITEMS` en `scenario.js`) marcados OK / observación / falla con evidencia; 5 hallazgos plantados (bandeja de CRAC-1, PSU B+B, paneles de R08, extintor vencido, embalaje junto a R06). 10 pts por ítem (revisado 3, estado 5, evidencia 2) y +3 por hallazgo corregido. El reloj no avanza; al terminar se puede comenzar un turno con la misma sala.
- Dinámica: la temperatura sube si falla un CRAC (apagado térmico a 32 °C), la PDU dispara al 96 %, la fuga crece. 1 min de juego = 5 s reales a 1×.

## Estructura del código
- `src/scenario.js`: estructura de la sala (sin textos: se enlazan al diccionario como propiedades de solo lectura que devuelven el idioma activo), catálogos (severidades, escalamientos, prioridades/SLA), calendario de cambios, accesos, runbooks, `FIELD_ACTIONS` (acciones en sala), `LEVELS`, `DURATIONS` y `schedFor` (niveles y duraciones), `TUTORIAL` y los 8 eventos (respuesta esperada, explicación, referencia, `hints`, `guided`, `proactive`).
  - Tipos de acción de un evento: `field`, `verify` (+`after`), `note`, `abstain`, `seq`, `authorized`/`unauthorized`; sin tipo = declarativa.
- `src/sim.js`: estado del mundo, dinámica por minuto (`step`), acciones en sala (`fieldAvailable`, `doField`, `requestAuth`), efectos declarativos al cerrar (`applyClose`), inspección de objetos (`inspect`, incluye fichas `device` y `pdu`), ramas de PSU/PDU y datos ficticios de equipos. `w.sched` (calendario del nivel) y `w.freeze` (Guiado).
- `src/scoring.js`: corrección pura de un ticket (`scoreTicket`, `actionStatus`) y `LEVEL_RULES`.
- `src/scene3d.js`: escena Three.js 0.160 (racks, LED, CRAC, UPS, contención, agua, selección, cámara, portada en órbita). Las animaciones de cámara (`run()`) usan tiempo acumulado con pasos de cuadro de máximo 50 ms: no medir con el reloj absoluto.
- `src/rackview.js`: vista de detalle del rack dentro de la misma escena (42 U, LED, PSU y cables por rama hacia las PDU, paneles ciegos, puerta trasera). Transición con un progreso `p` que controla cámara, fundidos y atenuación de la sala (`fade.js`); clics bloqueados mientras `scene.busy`; con `prefers-reduced-motion`, solo un fundido corto.
- `src/main.js`: interfaz (portada y rutas, panel con pestañas, inspector y acciones, tutor y tutorial, formulario de cierre, corrección, fin de turno, informe Markdown).
- `src/themes/`: un archivo por tema (`sala.theme.js`, por defecto; `hmi.theme.js`, criterio ISA-101) con tokens para `light` y `dark`. `index.js` resuelve el modo y escribe las variables CSS; `three.js` adapta los tokens a la escena. **Para agregar un tema basta crear `src/themes/<id>.theme.js`** (`build.mjs` los descubre solo).
- `src/status.js`: lenguaje de estado común (sin color si está sano; contorno + ícono por prioridad: cuadrado, rombo, triángulo).
- `src/glossary.js` + `src/i18n/glosario.<idioma>.js`: marcado automático de términos (`gl(texto)`) y tooltip, un glosario por idioma con los mismos ids.
- `src/i18n/`: textos de la interfaz (`es.js`, `en.js`) y de los escenarios (`escenario.es.js`, `escenario.en.js`, grupo `sc`) con `t(clave, valores)` y `applyI18n()`. Lo que queda en el estado (bitácora, impactos, alertas del sistema, evidencia) se guarda como mensaje (`msg`, `num`, `pct`, `cat`) y se traduce al mostrarlo con `tm()`: así cambiar de idioma no reinicia la partida. Formatos: `fmtNum`, `fmtPct`, `fmtDate`. `tests/i18n.spec.mjs` falla si falta una clave, un elemento de lista o una `{variable}` en algún idioma.
- `src/perfect-run.js`: la partida perfecta como datos; la ejecutan las pruebas (`playEvent`/`playPerfect`) y el modo Demo.
- `template.html`: CSS y estructura (textos estáticos con `data-i18n*`). `build.mjs`: esbuild empaqueta todo en `dist/index.html` (un solo archivo, sin peticiones externas) y copia `docs/og.png`.
- `assets/fonts/`: tipografías woff2 incrustadas (licencias en `LICENCIAS.md`). `tools/contrast.mjs`: verificación WCAG AA.

## Rutas
- Sin hash: portada. `#turno/<nivel>/<duración>` (nivel: `guiado`, `normal`, `experto`; duración: `corto`, `completo`; sin duración = completo), `#checklist/<nivel>` (checklist de ronda), `#demo`.
- ⏭ adelanta al siguiente evento o al fin de la acción en curso; con tickets abiertos solo avisa (en Guiado la sala no empeora).

## Comandos
- `npm install`, `npm run build` (→ `dist/index.html`), `npm run contrast`, `npm test` (compila y corre Playwright).
- Con `?test` en la URL existe `window.__ronda` (`step`, `select`, `state`) para las pruebas; no usarla en la app. Las pruebas corren en GitHub Actions antes del deploy; si fallan, no se publica.
- Con `--use-gl=swiftshader` el fondo de la escena sale negro (defecto de SwiftShader): para revisar colores, usar el renderizado normal del navegador. Para ver las barras de desplazamiento de Windows en Playwright, usar `ignoreDefaultArgs: ['--hide-scrollbars']`.

## Convenciones
- Todo es ficticio (empresa, personas, clientes, equipos y modelos). No usar marcas reales en los escenarios incluidos ni en el repositorio.
- Ningún color escrito a mano fuera de `src/themes/`. Contraste WCAG AA en todos los temas (`npm run contrast`).
- Identidad propia: evitar racks negros con barra de color arriba, acento azul y fondo casi negro.
- Textos nuevos en `src/i18n/es.js` **y** `src/i18n/en.js` (o en `escenario.*.js` si son del escenario), con la terminología estándar del rubro en inglés; textos para el estudiante con `gl()` para marcar términos. Nada de texto fijo en `sim.js` ni en `scenario.js`.
- Sin barras de desplazamiento gruesas: las pestañas del panel deben caber o pasar a dos líneas.
- Un solo HTML local-first: lo que se guarda va en `localStorage` con try/catch, sin servidor.
- Los textos para el estudiante explican el porqué con una referencia (ASHRAE TC 9.9, TIA-942, Uptime Tiers, ISO/IEC 27001, ISO/IEC 20000, ITIL).
- Al cambiar la interfaz de forma visible: regenerar `docs/capturas/` y agregar la entrada en `CHANGELOG.md`.
