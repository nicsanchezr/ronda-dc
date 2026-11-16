# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versiones según [SemVer](https://semver.org/lang/es/).

## [0.4.0] · 2026-11-15

### Agregado
- **Duración de las partidas:** en la tarjeta Turno se elige **Corto** (4 eventos, de 08:00 a 10:30, unos 12 min reales a 1×: E1 benigno, E3 paneles ciegos, E6 falla crítica de CRAC-2 y E7 fuga) o **Completo** (los 8 eventos, unos 35 min a 1×). Rutas `#turno/<nivel>/<duración>`; sin duración, completo.
- **Checklist de ronda** (`#checklist/<nivel>`): ronda de inicio de turno con 10 ítems que se marcan OK, observación o falla, con evidencia adjuntada desde el inspector. Cinco hallazgos plantados: bandeja de condensado de CRAC-1 casi llena, k8s-n7 con las dos fuentes en PDU-B, paneles ciegos faltantes en R08, extintor de CO₂ vencido y una caja de embalaje junto a R06 (nueva acción «Retirar el embalaje»). Puntaje propio (revisado, estado y evidencia; marcar sin revisar no suma) con +3 por hallazgo corregido, resultado con el hallazgo y su referencia, e informe Markdown. Se juega sola (10 a 15 min) o antes de un turno: «Comenzar el turno con esta sala» conserva lo corregido. Disponible en los tres niveles: en Guiado cada ítem explica qué revisar y por qué.
- Panel junto a la puerta de la sala con el estado de la detección de humo (VESDA) y del extintor.
- Pruebas: turno corto, ⏭ con tickets abiertos y durante una acción, y cuatro pruebas del checklist.

### Cambiado
- **⏭ siempre disponible:** adelanta al siguiente evento o al fin de la acción en curso. Con tickets abiertos ya no se bloquea: avisa que la sala seguirá empeorando (en Guiado, que no empeora).
- **Tutorial de Guiado** en 4 pasos, con botón «Saltar tutorial».
- Créditos: «Creado por Nicolás Sánchez Rodríguez». `CLAUDE.md` pasa a `.claude/CLAUDE.md`, reescrito para quien contribuya.
- ROADMAP: nuevos puntos de escenarios propios cargables (JSON declarativo, local), desafíos con eventos encadenados y editor de escenarios.

### Corregido
- La recirculación de R08 y la carga de la PDU-B ya no dependen de horarios fijos: siguen el calendario de eventos del turno elegido.
- Fecha de la versión 0.3.0 (era el 15-11-2026).

## [0.3.0] · 2026-11-15

### Agregado
- **Acciones en sala** desde el inspector (22 acciones: reubicar el sensor de R04, instalar paneles ciegos, levantar la baldosa, colocar absorbente, fotografiar, asegurar la puerta, subir CRAC-1…), con confirmación neutra, reloj a 8× con indicador de progreso, animación 3D y registro en la bitácora. La dinámica de la sala responde a la acción real.
- **Acciones restringidas** sobre equipos de clientes, con «Solicitar autorización al cliente» y respuesta a los minutos (E4 autoriza, E1 niega); la solicitud marca «Cliente» en el escalamiento y la corrección explica el porqué cuando no correspondía.
- **Corrección de acciones** que distingue lo hecho en sala, lo verificado, lo declarado y lo **declarado sin hacer** (cuenta como error). La nota del cierre cuenta como registro en la bitácora.
- **Hallazgos proactivos** (E3, E4, E8): si se corrige antes de la alerta, la alerta no salta y el ticket suma +10, sin pasar del 100 % final.
- **Niveles Guiado, Normal y Experto**, elegibles en la portada y por ruta (`#turno/guiado`…), con penalizaciones propias. Guiado: tutor paso a paso en los 8 eventos, tutorial interactivo de la interfaz, pistas, formulario reducido y pregunta de reflexión, sin presión de tiempo. Experto: sin pistas ni resaltados, el reloj no se pausa al cerrar y hay eventos que coinciden.
- **Pistas** a pedido (3 por evento en Guiado, 2 con costo en Normal).
- **Glosario** de 36 términos con tooltip accesible (mouse, teclado y toque) y pestaña **Consulta** (Runbooks | Glosario).
- **Pruebas automáticas** con Playwright (`npm test`) que corren en GitHub Actions antes del deploy.
- **Portada propia** con la escena 3D girando de fondo: logotipo, nombre y subtítulo, tres tarjetas de modo (Turno disponible; Checklist de ronda y Demo próximamente) con descripción, duración estimada y botón; qué se aprende, marco de referencia, último puntaje guardado, créditos, licencia y enlace al repositorio. En claro y oscuro.
- **Rutas por hash**: `#turno`, `#checklist`, `#demo` (y la portada sin hash). El logotipo vuelve a la portada; volver a Turno continúa el turno en curso.
- **Entrada a la sala** sin modal: la cámara vuela desde la órbita de la portada hasta la sala mientras aparecen la cabecera y el panel.
- **Briefing** breve antes del turno y **panel de ayuda «?»** disponible en cualquier momento (pausa el reloj mientras está abierto).
- Botón «Volver a la portada» en el fin de turno.

### Corregido
- Las animaciones de cámara avanzan con pasos de cuadro acotados: si un cuadro se demora (por ejemplo, al compilar los shaders de la vista de detalle en un equipo lento), la transición ya no salta al final ni libera los clics antes de tiempo.
- El panel de Tema ya no queda tapado por el panel lateral después de entrar desde la portada.
- La cabecera no se parte en dos líneas a 1280 px con el tema Alto rendimiento.

## [0.2.1] · 2026-11-15

### Corregido
- Pestañas del panel lateral: las seis (Monitoreo, Tickets, Cambios, Accesos, Runbooks, Bitácora) caben en una línea a 1280, 1366, 1440 y 1920 px, en ambos temas; si no cupieran, pasan a dos líneas en vez de mostrar una barra de desplazamiento.
- Barras de desplazamiento delgadas con los colores del tema (claro y oscuro) en el inspector, la ficha de equipo, el panel de tickets y los modales, en lugar de la barra gruesa gris de Windows.

### Cambiado
- En pantallas de 1700 px o más, el panel lateral es un poco más ancho (480 px).
- Capturas del README e imagen Open Graph actualizadas.

## [0.2.0] · 2026-11-15

### Agregado
- **Vista de detalle del rack** (zoom a nivel de U): frente y trasera, 42 U numeradas, LED de encendido, actividad y estado por equipo, paneles ciegos (y el hueco donde faltan), fuentes PSU1/PSU2 con cables por rama hasta las PDU A y B verticales con carga en pantalla, puerta trasera y cable de consola.
- **Fichas de equipo y de PDU**: modelo ficticio, cliente, ubicación, serie, IPMI o IP de gestión, estado y a qué PDU va cada fuente.
- **Transición continua** entre la sala y el detalle en una sola escena: vuelo de cámara con arco sobre los racks, fundido del detalle, atenuación de la sala, frente ↔ trasera en arco y regreso a la posición previa. Paneles con deslizamiento y fundido. Respeta `prefers-reduced-motion`.
- **Temas como tokens de diseño** (`src/themes/`): *Gris de sala* (por defecto) y *Alto rendimiento* (criterio ISA-101), cada uno en claro y oscuro, aplicados a la interfaz y a la escena 3D. Selector de tema y modo (claro, oscuro, sistema) guardado en el navegador.
- **Lenguaje de estado común**: contorno + ícono con forma según prioridad (cuadrado, rombo, triángulo), para no depender solo del color.
- Tipografías incrustadas en el HTML (licencia SIL OFL 1.1).
- Textos de la interfaz centralizados en `src/i18n/es.js`, preparados para la versión en inglés.
- `npm run contrast`: verificación WCAG AA de cada tema y modo.
- Logotipo, README público, capturas, imagen Open Graph, licencia MIT y este registro de cambios.

### Cambiado
- Nombre del proyecto: **Turno de Sala → Ronda DC** (el último puntaje guardado se migra solo).
- Identidad visual propia: sin racks negros con barra de color ni acento azul.
- GitHub Pages con Node 24 y las versiones actuales de las acciones.
- `ROADMAP.md` pasa a `docs/ROADMAP.md`.

### Corregido
- Se quitaron las marcas reales de los textos del juego (proveedor ficticio *Austral Storage Services*).
- La cabecera ya no se parte en dos líneas en pantallas de 1280 px.

## [0.1.0] · 2026-11-15

### Agregado
- Primer MVP del simulador: un turno de 08:00 a 15:00 en *Cordillera Colo · Sala A* (empresa ficticia) con 10 racks de tres clientes, dos CRAC, dos UPS, sensor de fugas y control de acceso.
- Ocho eventos (tres que no requieren escalar y cinco reales) con tickets automáticos, evidencia adjuntable desde la sala, monitoreo, cambios y accesos.
- Corrección inmediata por ticket (clasificación, prioridad, escalamiento, acciones, evidencia y SLA) con la explicación y la referencia normativa.
- Dinámica de la sala: temperatura por falla de climatización, carga de PDU con disparo, fuga que crece; impactos por acciones críticas.
- Fin de turno con puntaje, MTTA, MTTR, disponibilidad e informe de relevo en Markdown.

[0.3.0]: https://github.com/nicsanchezr/ronda-dc/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/nicsanchezr/ronda-dc/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/nicsanchezr/ronda-dc/compare/11343d3...v0.2.0
[0.1.0]: https://github.com/nicsanchezr/ronda-dc/commit/11343d3
