# Cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/). Versiones según [SemVer](https://semver.org/lang/es/).

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

[0.2.1]: https://github.com/nicsanchezr/ronda-dc/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/nicsanchezr/ronda-dc/compare/11343d3...v0.2.0
[0.1.0]: https://github.com/nicsanchezr/ronda-dc/commit/11343d3
