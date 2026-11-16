# Roadmap · Ronda DC

> Estado al 15-11-2026 (v0.4.0): hechos los puntos 0, 1, 2 y 3, y en parte el 5; además, acciones en sala, niveles con tutor, glosario, turno corto y pruebas automáticas. Siguen el 4 (Demo), el selector ES/EN y los nuevos puntos 6 (escenarios propios cargables), 7 (desafíos) y 8 (editor de escenarios). Historial en [`CHANGELOG.md`](../CHANGELOG.md); contexto del código en [`.claude/CLAUDE.md`](../.claude/CLAUDE.md).

## 0. Cambio de nombre a Ronda DC ✅
- Reemplazar "Turno de Sala" por "Ronda DC" en el título, la cabecera, la portada, el informe Markdown, la clave de localStorage (`ronda-dc-ultimo`, migrando la anterior si existe), package.json y README.
- Crear un logotipo propio sencillo (SVG en línea) coherente con la nueva identidad visual del punto 2.
- Centralizar los textos de la interfaz en un diccionario (`src/i18n/es.js`) para preparar la versión en inglés.

Mejoras pedidas por Nicolás (15-11-2026), en orden sugerido.

## 1. Vista de detalle del rack (zoom a nivel de U) ✅
- Al hacer doble clic en un rack (o con el botón "Ver rack"), la cámara entra a una vista frontal y trasera del rack.
- Se muestran las 42 U, ocupadas y libres, con numeración visible.
- Cada equipo con sus LED por estado (encendido, actividad parpadeante, advertencia, falla, apagado), fuentes PSU1/PSU2 y a qué PDU van, y paneles ciegos (o el hueco donde faltan).
- Vista trasera: PDU-A/PDU-B verticales con carga, cables de energía por color según la rama, y la puerta trasera.
- Al hacer clic en un equipo: ficha con modelo ficticio, cliente, IPMI y estado.

## 2. Identidad visual propia + tema claro/oscuro ✅
- Hecho: tema Gris de sala (por defecto) y Alto rendimiento (ISA-101), cada uno claro/oscuro. Pendiente: dirección «Petróleo y cobre» como `src/themes/petroleo.theme.js`.
- Romper el parecido con el mockup de referencia: otra paleta (no el azul de acento con barras de colores sobre los racks), otra tipografía, otro estilo de rack y de piso, otro layout del panel lateral y de la cabecera.
- Interruptor claro/oscuro (y respetar `prefers-color-scheme`), aplicado también a la escena 3D (fondo, piso, iluminación y etiquetas).
- Mantener contraste WCAG AA y una buena lectura en proyector.

## 3. Checklist de ronda (además del turno) ✅
- Hecho en v0.4: 10 ítems con cinco hallazgos plantados, evidencia desde el inspector, ayudas por nivel, puntaje propio, informe Markdown y paso directo al turno con la misma sala.
- Modo o pestaña "Checklist de ronda": ronda de inicio de turno con ítems verificables en la sala (temperatura y humedad, alarmas de CRAC, estado de las UPS, puertas, paneles ciegos, piso técnico, extintores, VESDA, limpieza, control de acceso).
- Cada ítem se marca como OK, observación o falla, con evidencia tomada de la inspección 3D. Algunos ítems tienen hallazgos plantados.
- Se puede usar sola, como actividad corta de clase, o al inicio del turno, con puntaje propio y exportación.

## 4. Modo demo (funcionamiento automático)
- Reproducción automática del turno: la cámara recorre la sala, se disparan los eventos, un "operador fantasma" inspecciona, adjunta evidencia y cierra tickets con las respuestas correctas, con subtítulos que explican cada paso.
- Pensado para mostrar el simulador en ferias, clases o LinkedIn (modo kiosco con reinicio en bucle, se detiene al tocar).

## 5. Landing más cuidada (en parte ✅)
- Hecho: portada con escena 3D de fondo, tres tarjetas de modo, rutas por hash, briefing y ayuda «?». Pendiente: selector de idioma ES/EN.
- Portada con presentación (qué es, para quién, qué aprende), vista 3D animada de fondo o captura en vivo, botones "Comenzar turno", "Ver demo" y "Checklist de ronda", competencias que se trabajan, marco normativo, créditos y licencia.
- Selector de idioma ES/EN (el diccionario del punto 0 lo permite); traducir primero la interfaz y luego los escenarios.

## 6. Escenarios propios cargables
- Formato **JSON declarativo**, sin código ejecutable: la sala, los racks y equipos, los eventos (con su respuesta esperada, explicación y referencia), el tutor del nivel Guiado y las pistas se describen como datos que el simulador interpreta.
- **Esquema** publicado (JSON Schema) y un **validador** que se ejecuta al cargar, con mensajes claros en español que indiquen el campo y el problema (p. ej. «eventos[2].acciones: falta el tipo de acción»).
- **Documentación** del formato y un **escenario de ejemplo** completo en el repositorio, con todo ficticio.
- Cada escenario puede traer el nombre de la empresa, un **logo** (PNG o JPG; SVG solo si se sanea antes de mostrarlo), la sala, los racks, los eventos, el tutor y las pistas.
- Se carga **localmente desde un archivo**: nunca se sube a un servidor. Lo cargado puede guardarse en `localStorage` del navegador.
- **Marcas reales** solo en escenarios cargados por el usuario, bajo su responsabilidad; nunca en los escenarios incluidos ni en el repositorio.

## 7. Desafíos
- Escenarios complejos con **eventos encadenados**, donde una falla provoca o agrava otra (p. ej. una caída de red que deja la sala sin monitoreo mientras falla el generador en una prueba de corte).
- Cada desafío en versión **guiada** (con tutor que explica la relación entre los eventos) y **experta** (sin ayudas y con tiempos más cortos).
- Se construyen sobre el formato del punto 6, para que también puedan crearse como escenarios propios.

## 8. Editor de escenarios (más adelante)
- Editor visual dentro de la página para armar la sala, ubicar racks y equipos, y escribir eventos, tutor y pistas sin editar el JSON a mano.
- Exporta e importa el mismo formato del punto 6 y valida mientras se edita. Sigue siendo local: nada sale del navegador.

## Después
- Más turnos (semana completa), personalización por asignatura (AAY1107 Monitoreo de Redes, Comunicaciones Corporativas, etc.).
- ~~Repositorio público en GitHub con GitHub Pages y licencia~~ (v0.2) y ~~CI con Playwright~~ (v0.3). Pendiente: regenerar automáticamente las capturas de `docs/capturas/`.
- Hecho en v0.3 (fuera del orden original): acciones en sala, niveles Guiado/Normal/Experto con tutor, pistas y glosario.
