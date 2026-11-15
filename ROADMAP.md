# Roadmap · Ronda DC v0.2

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

## 2. Identidad visual propia + tema claro/oscuro
- Romper el parecido con el mockup de referencia: otra paleta (no el azul de acento con barras de colores sobre los racks), otra tipografía, otro estilo de rack y de piso, otro layout del panel lateral y de la cabecera.
- Interruptor claro/oscuro (y respetar `prefers-color-scheme`), aplicado también a la escena 3D (fondo, piso, iluminación y etiquetas).
- Mantener contraste WCAG AA y una buena lectura en proyector.

## 3. Checklist de ronda (además del turno)
- Modo o pestaña "Checklist de ronda": ronda de inicio de turno con ítems verificables en la sala (temperatura y humedad, alarmas de CRAC, estado de las UPS, puertas, paneles ciegos, piso técnico, extintores, VESDA, limpieza, control de acceso).
- Cada ítem se marca como OK, observación o falla, con evidencia tomada de la inspección 3D. Algunos ítems tienen hallazgos plantados.
- Se puede usar sola, como actividad corta de clase, o al inicio del turno, con puntaje propio y exportación.

## 4. Modo demo (funcionamiento automático)
- Reproducción automática del turno: la cámara recorre la sala, se disparan los eventos, un "operador fantasma" inspecciona, adjunta evidencia y cierra tickets con las respuestas correctas, con subtítulos que explican cada paso.
- Pensado para mostrar el simulador en ferias, clases o LinkedIn (modo kiosco con reinicio en bucle, se detiene al tocar).

## 5. Landing más cuidada
- Portada con presentación (qué es, para quién, qué aprende), vista 3D animada de fondo o captura en vivo, botones "Comenzar turno", "Ver demo" y "Checklist de ronda", competencias que se trabajan, marco normativo, créditos y licencia.
- Selector de idioma ES/EN (el diccionario del punto 0 lo permite); traducir primero la interfaz y luego los escenarios.

## Después
- Más turnos (semana completa), escenarios en JSON para que otros docentes creen casos, personalización por asignatura (AAY1107 Monitoreo de Redes, Comunicaciones Corporativas, etc.).
- Repositorio público en GitHub (nicsanchezr) con GitHub Pages, CI con Playwright y licencia.
