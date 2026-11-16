// Escenario del turno: Cordillera Colo · Sala A (SCL-1)
// Datos de la sala, catálogos y los 8 eventos del turno.
// Los tiempos se expresan en minutos desde las 08:00.

export const SHIFT = { start: 8 * 60, length: 420 }; // 08:00 a 15:00

// Los colores de cada severidad están en los temas (src/themes, grupo sev).
export const SEV = {
  disaster: { label: 'Desastre', rank: 5 },
  high: { label: 'Alta', rank: 4 },
  average: { label: 'Promedio', rank: 3 },
  warning: { label: 'Advertencia', rank: 2 },
  info: { label: 'Información', rank: 1 },
  ok: { label: 'OK', rank: 0 },
};

export const CLIENTS = {
  retail: 'Retail Andino',
  fintech: 'Fintech Pehuén',
  logistica: 'Logística Austral',
};

// Equipos por rack: [nombre, U inferior, alto en U, tipo, fuentes]
const D = (name, u, h, type, psu = 'AB') => ({ name, u, h, type, psu });

export const RACKS = [
  { id: 'R01', client: 'retail', row: 'A', devices: [D('sw-acc-01', 40, 1, 'switch'), D('srv-web01', 34, 2, 'server'), D('srv-web02', 31, 2, 'server'), D('srv-web03', 28, 2, 'server'), D('srv-cache01', 24, 2, 'server')] },
  { id: 'R02', client: 'retail', row: 'A', devices: [D('sw-core-01', 40, 1, 'switch'), D('fw-01', 36, 1, 'firewall'), D('fw-02', 34, 1, 'firewall'), D('rtr-01', 31, 2, 'router'), D('srv-vpn01', 27, 2, 'server')] },
  { id: 'R03', client: 'retail', row: 'A', devices: [D('srv-db01', 34, 2, 'server'), D('srv-db02', 30, 2, 'server'), D('stg-01', 22, 4, 'storage'), D('srv-db03', 18, 2, 'server')] },
  { id: 'R04', client: 'fintech', row: 'A', devices: [D('vm-host01', 34, 2, 'server'), D('vm-host02', 31, 2, 'server'), D('vm-host03', 28, 2, 'server'), D('vm-host04', 25, 2, 'server'), D('sw-acc-04', 40, 1, 'switch')] },
  { id: 'R05', client: 'fintech', row: 'A', devices: [D('srv-log01', 34, 2, 'server'), D('bkp-01', 26, 4, 'storage'), D('srv-mon01', 22, 1, 'server'), D('sw-acc-05', 40, 1, 'switch')] },
  { id: 'R06', client: 'fintech', row: 'B', devices: [D('k8s-n1', 36, 1, 'server'), D('k8s-n2', 34, 1, 'server'), D('k8s-n3', 32, 1, 'server'), D('k8s-n4', 30, 1, 'server'), D('k8s-n5', 28, 1, 'server'), D('k8s-n6', 26, 1, 'server'), D('k8s-n7', 23, 2, 'server', 'BB'), D('sw-acc-06', 40, 1, 'switch')] },
  { id: 'R07', client: 'logistica', row: 'B', devices: [D('stg-02', 28, 4, 'storage'), D('srv-erp01', 24, 2, 'server'), D('srv-erp02', 21, 2, 'server'), D('sw-acc-07', 40, 1, 'switch')] },
  { id: 'R08', client: 'logistica', row: 'B', devices: [D('srv-app01', 38, 2, 'server'), D('srv-app02', 35, 2, 'server'), D('srv-app03', 26, 2, 'server'), D('srv-app04', 23, 2, 'server')], gap: [30, 34] },
  { id: 'R09', client: 'logistica', row: 'B', devices: [D('vm-host05', 34, 2, 'server'), D('vm-host06', 31, 2, 'server'), D('vm-host07', 28, 2, 'server'), D('sw-acc-09', 40, 1, 'switch')] },
  { id: 'R10', client: 'logistica', row: 'B', devices: [D('sw-dist-01', 40, 1, 'switch'), D('sw-dist-02', 38, 1, 'switch'), D('pp-01', 36, 1, 'patch'), D('pp-02', 35, 1, 'patch'), D('srv-dns01', 30, 1, 'server'), D('srv-ntp01', 28, 1, 'server')] },
];

// Modelos ficticios por tipo de equipo (ficha de la vista de detalle del rack).
// prof: profundidad en metros; mgmt: 'ipmi' (BMC del servidor), 'mgmt' (puerto de gestión) o null.
export const MODELS = {
  server1: { model: 'Cumbre R110 · servidor 1U', prof: 0.72, mgmt: 'ipmi' },
  server2: { model: 'Cumbre R220 · servidor 2U', prof: 0.76, mgmt: 'ipmi' },
  storage: { model: 'Glaciar S400 · almacenamiento 4U (24 discos)', prof: 0.8, mgmt: 'ipmi' },
  switch: { model: 'Nodo SW-48 · switch 48 × 10 GbE', prof: 0.45, mgmt: 'mgmt' },
  firewall: { model: 'Muralla F1 · firewall perimetral', prof: 0.5, mgmt: 'mgmt' },
  router: { model: 'Paso R2 · router de borde 2U', prof: 0.55, mgmt: 'mgmt' },
  patch: { model: 'Panel de parcheo 24 × RJ45 Cat 6A', prof: 0.12, mgmt: null },
};
export const modelOf = (d) => MODELS[d.type === 'server' ? (d.h >= 2 ? 'server2' : 'server1') : d.type] || MODELS.server1;

export const ESCALATIONS = [
  { id: 'nadie', label: 'No escalar: se resuelve en el turno' },
  { id: 'jefe', label: 'Jefe de turno' },
  { id: 'clima', label: 'Facilities · Climatización' },
  { id: 'elec', label: 'Facilities · Eléctrico' },
  { id: 'proveedor', label: 'Proveedor del equipo (soporte de hardware)' },
  { id: 'cliente', label: 'Cliente (NOC o contacto técnico)' },
  { id: 'seguridad', label: 'Seguridad física' },
];

export const CLASSES = [
  { id: 'vp', label: 'Verdadero positivo', hint: 'Hay un problema real que atender' },
  { id: 'fp', label: 'Falso positivo', hint: 'La alerta no refleja lo que ocurre en sala' },
  { id: 'benigno', label: 'Benigno', hint: 'Es real, pero esperado o autorizado' },
];

export const PRIORITIES = [
  { id: 'P1', label: 'P1 · Crítica', ack: 5, res: 25 },
  { id: 'P2', label: 'P2 · Alta', ack: 10, res: 45 },
  { id: 'P3', label: 'P3 · Media', ack: 30, res: 90 },
  { id: 'P4', label: 'P4 · Baja', ack: 60, res: 180 },
];

// Niveles del modo Turno. sched: cambios de horario respecto del escenario (minutos desde las 08:00).
export const LEVELS = [
  { id: 'guiado', sched: {} },
  { id: 'normal', sched: {} },
  { id: 'experto', sched: { E6: 185, E8: 340 } }, // CRAC-2 falla durante la autoprueba de UPS-A; la puerta de R02, con la fuga activa
];
// Duraciones del modo Turno. Corto: 4 eventos de 08:00 a 10:30 (unos 12 min reales a 1×),
// con uno benigno (E1), uno de flujo de aire con acción física (E3), uno crítico (E6) y la fuga (E7).
export const DURATIONS = [
  { id: 'corto', events: ['E1', 'E3', 'E6', 'E7'], length: 150, sched: { E1: 10, E3: 35, E6: 75, E7: 110 }, experto: { E6: 45 } },
  { id: 'completo', events: null, length: 420, sched: {}, experto: null },
];
export const durationOf = (id) => DURATIONS.find((d) => d.id === id) || DURATIONS[1];
/** Minuto de inicio de cada evento incluido según el nivel y la duración (los no incluidos no aparecen). */
export const schedFor = (level, duration = 'completo') => {
  const L = LEVELS.find((l) => l.id === level) || LEVELS[1];
  const D = durationOf(duration);
  const inc = INCIDENTS.filter((i) => !D.events || D.events.includes(i.id));
  const lvl = D.events ? (level === 'experto' && D.experto ? D.experto : {}) : L.sched;
  return Object.fromEntries(inc.map((i) => [i.id, lvl[i.id] ?? D.sched[i.id] ?? i.at]));
};

// Calendario de cambios y mantenimientos del día
export const CALENDAR = [
  { id: 'CHG-1042', at: '08:00–10:00', title: 'Reemplazo de disco 3 en stg-02 (R07)', who: 'Austral Storage Services · técnico en sitio', client: 'logistica', state: 'Aprobado', detail: 'Cambio de disco en caliente (RAID 6). No requiere apagar el equipo. Ingreso de un técnico, acompañado.' },
  { id: 'CHG-1045', at: '07:00–08:00', title: 'Instalación de nodo k8s-n7 en R06 (U23–U24)', who: 'Fintech Pehuén · personal del cliente', client: 'fintech', state: 'Ejecutado', detail: 'Montaje de un servidor 2U. Alimentación: PSU1 a PDU-A y PSU2 a PDU-B según plano de rack.' },
  { id: 'MNT-221', at: '11:00–11:15', title: 'Autoprueba mensual de baterías UPS-A', who: 'Proveedor UPS (contrato de mantenimiento)', client: null, state: 'Programado', detail: 'Prueba automática de descarga corta. UPS-A opera en batería durante la prueba; la carga se mantiene protegida.' },
  { id: 'CHG-1047', at: 'Mañana 09:00', title: 'Actualización de firmware en sw-dist-01 (R10)', who: 'Logística Austral · NOC', client: 'logistica', state: 'Aprobado', detail: 'Ventana de mañana. No hay trabajo físico en sala.' },
  { id: 'MNT-219', at: 'Ayer 16:00', title: 'Limpieza de filtros CRAC-1 y CRAC-2', who: 'Facilities · Climatización', client: null, state: 'Cerrado', detail: 'Sin observaciones.' },
];

// Registro de control de acceso (aparece a medida que avanza el reloj)
export const ACCESS = [
  { id: 'acc-0728', t: -32, who: 'Javiera Soto (Fintech Pehuén)', card: 'C-2231', door: 'Sala A', note: 'Cliente · CHG-1045' },
  { id: 'acc-0759', t: -1, who: 'Operador de turno (tú)', card: 'E-0107', door: 'Sala A', note: 'Personal interno' },
  { id: 'acc-0805', t: 5, who: 'Matías Rivas (Austral Storage Services)', card: 'P-0412', door: 'Sala A', note: 'Proveedor · CHG-1042' },
  { id: 'acc-0938', t: 98, who: 'Matías Rivas (Austral Storage Services)', card: 'P-0412', door: 'Salida', note: 'Proveedor · fin de CHG-1042' },
  { id: 'acc-1102', t: 182, who: 'Paula Fuentes (Facilities)', card: 'E-0033', door: 'Sala A', note: 'Personal interno · ronda' },
  { id: 'acc-1404', t: 364, who: 'Tarjeta de visita V-12', card: 'V-12', door: 'Sala A', note: 'Sin visita registrada para esta tarjeta' },
  { id: 'acc-1411', t: 371, who: 'Tarjeta de visita V-12', card: 'V-12', door: 'Salida', note: 'Sin visita registrada para esta tarjeta' },
];

// Alertas informativas de fondo (no generan ticket)
export const NOISE = [
  { t: 0, host: 'srv-ntp01', text: 'Sincronización NTP correcta' },
  { t: 22, host: 'bkp-01', text: 'Respaldo nocturno completado (4,2 TB)' },
  { t: 61, host: 'sw-dist-02', text: 'Interfaz Gi1/0/24 arriba (cambio de enlace del cliente)' },
  { t: 128, host: 'srv-mon01', text: 'Agente de monitoreo reiniciado por actualización' },
  { t: 205, host: 'GEN-01', text: 'Generador: prueba semanal sin carga OK' },
  { t: 290, host: 'srv-web02', text: 'Certificado TLS renovado' },
  { t: 345, host: 'ENV-SALA', text: 'Humedad relativa de la sala: 46 %' },
  { t: 400, host: 'bkp-01', text: 'Inicio de respaldo incremental' },
];

export const RUNBOOKS = [
  { id: 'RB-01', title: 'Alarma de climatización (CRAC)', steps: [
    'Confirmar la alarma en el equipo y en el monitoreo: ¿qué unidad falló y qué zona enfría?',
    'Si hay pérdida de capacidad, subir la capacidad de las unidades que siguen funcionando.',
    'Escalar de inmediato a Climatización y al jefe de turno. Las alarmas de compresor (alta presión) requieren técnico: no rearmar repetidamente.',
    'Mantener la contención (puertas del pasillo frío cerradas) y vigilar la temperatura de entrada cada 5 minutos.',
    'Avisar a los clientes afectados si la entrada supera 27 °C, el límite recomendado por ASHRAE.',
  ] },
  { id: 'RB-02', title: 'Carga de PDU y redundancia A+B', steps: [
    'Comparar la carga de las ramas A y B del rack: deberían estar parejas.',
    'Revisar en sala qué fuente (PSU) de cada equipo está conectada a qué PDU.',
    'Si un equipo tiene ambas fuentes en la misma rama, perdió la redundancia.',
    'Los equipos son del cliente: informar y coordinar la corrección con su autorización. No desconectar por cuenta propia.',
    'Monitorear la rama hasta corregir. Sobre el 80 % de la capacidad hay riesgo de disparo del interruptor.',
  ] },
  { id: 'RB-03', title: 'Acceso y seguridad física', steps: [
    'Contrastar el evento con el registro de accesos y los cambios aprobados.',
    'Si no hay trabajo autorizado, tratarlo como incidente de seguridad: avisar a Seguridad física y al jefe de turno.',
    'No manipular equipos ni retirar elementos encontrados: preservar la evidencia.',
    'Fotografiar y registrar el estado antes de asegurar la puerta.',
  ] },
  { id: 'RB-04', title: 'Detección de líquido bajo el piso técnico', steps: [
    'Ubicar la zona del sensor e inspeccionar levantando la baldosa, sin pisar el agua.',
    'Identificar el origen (condensado, cañería, filtración) y su distancia a la canalización eléctrica.',
    'Contener con material absorbente y escalar a Climatización o mantención según el origen.',
    'No cortar la energía de la sala ni apagar la climatización sin evaluación: el remedio puede ser peor.',
  ] },
  { id: 'RB-05', title: 'Verificación de alertas de temperatura', steps: [
    'Comparar el sensor con los vecinos y con las temperaturas internas de los servidores (IPMI).',
    'Revisar en sala la posición del sensor: debe medir en la toma de aire frontal.',
    'Buscar causas físicas comunes: paneles ciegos faltantes, cables que bloquean el flujo, baldosas mal ubicadas.',
    'Corregir la causa antes de tocar los setpoints de los CRAC.',
  ] },
  { id: 'RB-06', title: 'Trabajos de terceros y mantenimientos', steps: [
    'Todo ingreso de terceros debe tener un cambio aprobado y vigente.',
    'Acompañar al técnico mientras trabaja en equipos de clientes.',
    'Las pruebas programadas (UPS, generador) se verifican contra el calendario y se registran; no se interrumpen.',
    'Registrar inicio y fin de cada trabajo en la bitácora.',
  ] },
];

// ---------------------------------------------------------------------------
// Acciones en sala (se ejecutan desde el inspector o la ficha del objeto)
//   on: objetos donde aparece el botón · min: minutos de juego que toma
//   restricted: equipo de un cliente (requiere su autorización)
//   auth: respuesta del cliente a la solicitud { grant, after (min) }
//   inc: evento al que se asocia (para la bitácora, la evidencia y el escalamiento)
//   authWhy: explicación en la corrección si la solicitud cuenta como escalamiento de más
// La disponibilidad y el efecto de cada acción están en sim.js (fieldAvailable / doField).
// ---------------------------------------------------------------------------
export const FIELD_ACTIONS = [
  { id: 'tech-escort', inc: 'E1', on: [{ kind: 'rack', id: 'R07' }], label: 'Acompañar al técnico', verb: 'Acompañando al técnico', min: 5 },
  { id: 'stg02-off', inc: 'E1', on: [{ kind: 'device', id: 'R07/stg-02' }], label: 'Apagar stg-02', verb: 'Apagando stg-02', min: 2, restricted: true, auth: { grant: false, after: 5 },
    authWhy: 'Pediste autorización al cliente para apagar stg-02. Preguntar antes de intervenir un equipo de un cliente es la actitud correcta, y por eso el juego lo registra como escalamiento al cliente. Aquí descuenta porque apagar stg-02 no era necesario: CHG-1042 estaba aprobado y el cambio de disco es en caliente, así que no había nada que pedirle al cliente. Antes de solicitar una intervención, pregúntate si hace falta.' },
  { id: 'sensor-fix', inc: 'E2', on: [{ kind: 'rack', id: 'R04' }], label: 'Reubicar y fijar el sensor de entrada', verb: 'Reubicando el sensor', min: 3 },
  { id: 'r04-hosts-off', inc: 'E2', on: [{ kind: 'rack', id: 'R04' }], label: 'Apagar los hosts de virtualización de R04', verb: 'Apagando los hosts de R04', min: 3, restricted: true, auth: { grant: false, after: 5 },
    authWhy: 'Pediste autorización al cliente para apagar los hosts de R04. Preguntar antes de tocar equipos de un cliente está bien, y por eso cuenta como escalamiento al cliente; aquí descuenta porque no había un problema térmico real: era un sensor suelto. Antes de solicitar una intervención, confirma que el problema existe.' },
  { id: 'crac-100', inc: 'E2', on: [{ kind: 'crac', id: 'CRAC-1' }, { kind: 'crac', id: 'CRAC-2' }], label: 'Llevar CRAC-1 y CRAC-2 al 100 %', verb: 'Ajustando los CRAC', min: 1 },
  { id: 'blank-install', inc: 'E3', on: [{ kind: 'rack', id: 'R08' }], label: 'Instalar paneles ciegos en U30–U34', verb: 'Instalando paneles ciegos', min: 6 },
  { id: 'setpoint-16', inc: 'E3', on: [{ kind: 'crac', id: 'CRAC-1' }, { kind: 'crac', id: 'CRAC-2' }], label: 'Bajar el setpoint de ambos CRAC a 16 °C', verb: 'Cambiando el setpoint', min: 1 },
  { id: 'aisle-open', inc: 'E3', on: [{ kind: 'acs', id: 'ACS' }], label: 'Abrir la puerta del pasillo frío', verb: 'Abriendo el pasillo frío', min: 1 },
  { id: 'psu-move', inc: 'E4', on: [{ kind: 'device', id: 'R06/k8s-n7' }], label: 'Mover la PSU1 de k8s-n7 a PDU-A', verb: 'Moviendo la PSU1 a PDU-A', min: 5, restricted: true, auth: { grant: true, after: 10 } },
  { id: 'n7-off', inc: 'E4', on: [{ kind: 'device', id: 'R06/k8s-n7' }], label: 'Apagar k8s-n7', verb: 'Apagando k8s-n7', min: 2, restricted: true, auth: { grant: false, after: 5 } },
  { id: 'ups-bypass', inc: 'E5', on: [{ kind: 'ups', id: 'UPS-A' }], label: 'Pasar UPS-A a bypass', verb: 'Pasando UPS-A a bypass', min: 2 },
  { id: 'crac1-boost', inc: 'E6', on: [{ kind: 'crac', id: 'CRAC-1' }], label: 'Subir la capacidad de CRAC-1 al 90 %', verb: 'Subiendo la capacidad de CRAC-1', min: 1 },
  { id: 'crac2-reset', inc: 'E6', on: [{ kind: 'crac', id: 'CRAC-2' }], label: 'Rearmar el compresor de CRAC-2', verb: 'Rearmando CRAC-2', min: 2 },
  { id: 'tile-lift', inc: 'E7', on: [{ kind: 'leak', id: 'LEAK-Z3' }], label: 'Levantar la baldosa e inspeccionar', verb: 'Levantando la baldosa', min: 2 },
  { id: 'absorbent', inc: 'E7', on: [{ kind: 'leak', id: 'LEAK-Z3' }], label: 'Colocar material absorbente', verb: 'Colocando material absorbente', min: 4 },
  { id: 'photo-leak', inc: 'E7', on: [{ kind: 'leak', id: 'LEAK-Z3' }], label: 'Fotografiar', verb: 'Fotografiando', min: 1, photo: 'Foto · agua bajo la baldosa, zona 3' },
  { id: 'crac1-off', inc: 'E7', on: [{ kind: 'crac', id: 'CRAC-1' }], label: 'Apagar CRAC-1', verb: 'Apagando CRAC-1', min: 1 },
  { id: 'photo-r02', inc: 'E8', on: [{ kind: 'rack', id: 'R02' }], label: 'Fotografiar', verb: 'Fotografiando', min: 1, photo: 'Foto · puerta trasera de R02 y cable de consola' },
  { id: 'door-secure', inc: 'E8', on: [{ kind: 'rack', id: 'R02' }], label: 'Asegurar la puerta trasera', verb: 'Asegurando la puerta', min: 2 },
  { id: 'cable-unplug', inc: 'E8', on: [{ kind: 'device', id: 'R02/fw-01' }], label: 'Desconectar el cable de consola de fw-01', verb: 'Desconectando el cable', min: 1 },
  { id: 'trash-remove', inc: null, on: [{ kind: 'rack', id: 'R06' }], label: 'Retirar el embalaje del pasillo', verb: 'Retirando el embalaje', min: 2 },
  { id: 'fw01-reboot', inc: 'E8', on: [{ kind: 'device', id: 'R02/fw-01' }], label: 'Reiniciar fw-01', verb: 'Reiniciando fw-01', min: 2, restricted: true, auth: { grant: false, after: 5 } },
];

// ---------------------------------------------------------------------------
// Eventos del turno
// Cada evento define la alerta, la respuesta esperada, la explicación y las acciones.
// Tipo de cada acción (para la corrección):
//   field: 'id'      → se hace en la sala (FIELD_ACTIONS); declararla sin hacerla es un error
//   verify: [claves] → cuenta si se inspeccionó lo indicado ('tab:cambios', 'insp:rack:R04'…);
//                      after: 'id' exige inspeccionar después de esa acción
//   note: true       → cuenta si hay una nota en la bitácora sobre el ticket (o en el cierre)
//   abstain: [ids]   → «no hacer»: cuenta si no se ejecutó ninguna de esas acciones
//   seq: [ids]       → acciones en sala que deben hacerse en ese orden
//   authorized / unauthorized → la acción en sala cuenta solo con / sin autorización del cliente
//   (sin tipo)       → declarativa: se evalúa lo marcado en el formulario
// guided: tutor del nivel Guiado → steps [{ label, text, done }] (done: open · tab · ev · inspect (+after)
//         · field (+authorized) · auth · note · close), form { actions, esc } (opciones reducidas) y
//         reflect { q, options [{ t, ok, fb }] } (pregunta de reflexión antes de confirmar el cierre).
// hints: pistas de menos a más directas (Guiado usa 3, Normal 2, Experto ninguna).
// proactive: 'id' → si esa acción en sala se hizo antes de la alerta, la alerta no salta y el
//                  ticket se crea como «Hallazgo proactivo» (sin SLA y con bonificación).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Checklist de ronda (ronda de inicio de turno). Cada ítem:
//   look: grupos de lugares a revisar (en cada grupo basta uno: 'rack:R01', 'tab:accesos'…)
//   expected: 'ok' | 'obs' | 'falla' · evidence: observaciones que respaldan el hallazgo
//   fix: acciones en sala (o 'auth:<id>' = pedir autorización) que corrigen el hallazgo (bonificación)
//   why: qué revisar y por qué (nivel Guiado) · where: dónde mirar (Normal) · finding: qué había
// ---------------------------------------------------------------------------
export const ROUND_ITEMS = [
 {
  "id": "temp",
  "title": "Temperatura de entrada en ambas filas",
  "where": "Un rack de la fila A y uno de la fila B.",
  "look": [
   [
    "rack:R01",
    "rack:R02",
    "rack:R03",
    "rack:R04",
    "rack:R05"
   ],
   [
    "rack:R06",
    "rack:R07",
    "rack:R08",
    "rack:R09",
    "rack:R10"
   ]
  ],
  "expected": "ok",
  "evidence": [],
  "why": "Revisa la temperatura de entrada de un rack de cada fila: según ASHRAE debe estar entre 18 y 27 °C. Es el primer indicador de que la climatización llega a todos los equipos.",
  "finding": "Ambas filas están entre 21 y 23 °C: dentro del rango recomendado.",
  "ref": "ASHRAE TC 9.9"
 },
 {
  "id": "crac",
  "title": "Climatización (CRAC)",
  "where": "CRAC-1 y CRAC-2.",
  "look": [
   [
    "crac:CRAC-1"
   ],
   [
    "crac:CRAC-2"
   ]
  ],
  "expected": "obs",
  "evidence": [
   "obs:crac1-tray-high"
  ],
  "why": "Comprueba que los dos CRAC estén operando sin alarmas y mira su estado físico: bandejas de condensado, drenajes y filtros. Un problema menor hoy puede ser una falla o una fuga mañana.",
  "finding": "La bandeja de condensado de CRAC-1 está casi llena y el drenaje corre lento: es una observación para Climatización antes de que se convierta en una fuga.",
  "ref": "ASHRAE TC 9.9 · mantenimiento de climatización"
 },
 {
  "id": "ups",
  "title": "UPS y energía de la sala",
  "where": "UPS-A y UPS-B.",
  "look": [
   [
    "ups:UPS-A"
   ],
   [
    "ups:UPS-B"
   ]
  ],
  "expected": "ok",
  "evidence": [],
  "why": "Revisa que ambas UPS estén en línea, sin alarmas, con la batería cargada y una autonomía razonable. Son el respaldo de toda la sala ante un corte de red.",
  "finding": "Ambas UPS en línea, sin alarmas y con la batería al 100 %.",
  "ref": "IEEE 1188 · Uptime Institute Tiers"
 },
 {
  "id": "ab",
  "title": "Redundancia A/B de las fuentes",
  "where": "Los racks con equipos instalados recientemente (revisa el calendario de cambios).",
  "look": [
   [
    "rack:R06",
    "device:R06/k8s-n7"
   ]
  ],
  "expected": "falla",
  "evidence": [
   "obs:r06-psu"
  ],
  "fix": [
   "psu-move",
   "auth:psu-move"
  ],
  "why": "Cada equipo debe tener una fuente en la rama A y otra en la B. Revisa sobre todo los equipos instalados hace poco: el calendario de cambios te dice cuáles son.",
  "finding": "k8s-n7 (instalado hoy con CHG-1045) tiene las dos fuentes en PDU-B: perdió la redundancia. Como es un equipo del cliente, se corrige con su autorización.",
  "ref": "ANSI/TIA-942 · Uptime Institute Tiers"
 },
 {
  "id": "blank",
  "title": "Paneles ciegos",
  "where": "El frente de los racks con U libres.",
  "look": [
   [
    "rack:R08"
   ]
  ],
  "expected": "falla",
  "evidence": [
   "obs:r08-blank"
  ],
  "fix": [
   "blank-install"
  ],
  "why": "Las U libres del frente deben estar tapadas con paneles ciegos; si no, el aire caliente de atrás vuelve al frente y calienta los equipos. Revisa los racks que tienen espacios vacíos.",
  "finding": "En R08 faltan paneles ciegos entre U30 y U34: provocarán recirculación de aire caliente durante el turno.",
  "ref": "ASHRAE TC 9.9 · EU Code of Conduct"
 },
 {
  "id": "doors",
  "title": "Puertas y cerraduras de los racks",
  "where": "Las puertas traseras de un rack de cada fila.",
  "look": [
   [
    "rack:R01",
    "rack:R02",
    "rack:R03",
    "rack:R04",
    "rack:R05"
   ],
   [
    "rack:R06",
    "rack:R07",
    "rack:R08",
    "rack:R09",
    "rack:R10"
   ]
  ],
  "expected": "ok",
  "evidence": [],
  "why": "Las puertas de los racks deben estar cerradas y con llave: es un control físico básico que protege los equipos de los clientes.",
  "finding": "Todas las puertas cerradas al inicio del turno.",
  "ref": "ISO/IEC 27001:2022 A.7"
 },
 {
  "id": "fire",
  "title": "Detección y extinción de incendios",
  "where": "El panel junto a la puerta de la sala (lector de acceso).",
  "look": [
   [
    "acs:ACS"
   ]
  ],
  "expected": "obs",
  "evidence": [
   "obs:fire-ext"
  ],
  "why": "Verifica que el sistema de detección temprana de humo (VESDA) no tenga alarmas y que los extintores estén en su lugar, con la carga vigente.",
  "finding": "El extintor de CO₂ junto a la puerta tiene la carga vencida desde 09/2026: hay que pedir su recarga.",
  "ref": "NFPA 75 · NFPA 76"
 },
 {
  "id": "clean",
  "title": "Orden y limpieza",
  "where": "Los pasillos, sobre todo donde se instaló algo hace poco.",
  "look": [
   [
    "rack:R06"
   ]
  ],
  "expected": "obs",
  "evidence": [
   "obs:r06-box"
  ],
  "fix": [
   "trash-remove"
  ],
  "why": "La sala debe estar libre de cartón y embalajes: generan polvo, son combustibles y pueden obstruir el flujo de aire.",
  "finding": "Quedó una caja de embalaje del equipo instalado hoy junto a R06, en el pasillo caliente.",
  "ref": "ANSI/TIA-942 · buenas prácticas de operación"
 },
 {
  "id": "access",
  "title": "Control de acceso",
  "where": "El registro de accesos (pestaña Accesos).",
  "look": [
   [
    "tab:accesos"
   ]
  ],
  "expected": "ok",
  "evidence": [],
  "why": "Revisa los ingresos de la noche y del inicio del turno: cada uno debe tener un motivo (un cambio, una visita registrada o personal interno).",
  "finding": "Los ingresos de las 07:28 y 07:59 tienen motivo: el cambio CHG-1045 y el operador de turno.",
  "ref": "ISO/IEC 27001:2022 A.7"
 },
 {
  "id": "floor",
  "title": "Piso técnico y detección de fugas",
  "where": "La zona del sensor de fugas, junto a CRAC-1.",
  "look": [
   [
    "leak:LEAK-Z3"
   ]
  ],
  "expected": "ok",
  "evidence": [],
  "why": "Revisa que el sensor de fugas no tenga alarmas y que el piso técnico esté seco y con las baldosas en su lugar.",
  "finding": "El sensor de fugas está normal y el piso técnico seco.",
  "ref": "ANSI/TIA-942"
 }
];
export const ROUND_SCORE = { seen: 3, status: 5, evidence: 2, fix: 3 };

// Tutorial interactivo de la interfaz (nivel Guiado, antes del primer evento).
// until: 'run' (pulsa ▶) · 'next' (botón) · 'rack' (inspecciona un rack) · 'glossary' (abre un término) · 'done' (termina)
export const TUTORIAL = [{"target": "#clockwrap", "text": "Este es el reloj del turno. Pulsa ▶ para que avance; ⏭ adelanta al siguiente evento. En Guiado, el reloj espera mientras tengas un ticket abierto.", "until": "run"}, {"target": "#stage", "text": "Esta es la sala. Haz clic en un rack (prueba con R01): en el inspector verás lecturas, observaciones que puedes adjuntar como evidencia (📎) y acciones que puedes hacer en la sala.", "until": "rack"}, {"target": "#inspector", "text": "Las palabras con subrayado punteado tienen definición: pasa el mouse o toca una (por ejemplo, IPMI). Todas están en Consulta → Glosario.", "until": "glossary"}, {"target": "#helpbtn", "text": "El botón ? repite las instrucciones. Cuando llegue el primer evento, un tutor te acompañará paso a paso.", "until": "done"}];

export const INCIDENTS = [
  {
    id: 'E1', at: 10, rack: 'R07',
    alert: { sev: 'warning', host: 'ACS-SalaA', text: 'Ingreso a Sala A con credencial de proveedor externo (P-0412)' },
    title: 'Ingreso de proveedor a la sala',
    expected: { cls: 'benigno', prio: 'P4', esc: ['nadie'], escAllowed: [] },
    actions: [
      { id: 'a1', text: 'Verificar que el ingreso tenga un cambio aprobado y vigente', ok: true, verify: ['tab:cambios'] },
      { id: 'a2', text: 'Acompañar al técnico mientras trabaja en el rack del cliente', ok: true, field: 'tech-escort' },
      { id: 'a3', text: 'Registrar el ingreso y la salida en la bitácora', ok: true, note: true },
      { id: 'a4', text: 'Bloquear la credencial y pedir al técnico que salga de la sala' },
      { id: 'a5', text: 'Apagar stg-02 para que el técnico trabaje sin riesgo', critical: true, field: 'stg02-off' },
    ],
    evidence: ['cal:CHG-1042', 'acc:acc-0805'],
    why: 'El ingreso coincide con CHG-1042, aprobado para hoy de 08:00 a 10:00 sobre stg-02 (R07). Es trabajo autorizado: se verifica, se acompaña y se registra. El cambio de disco es en caliente; el operador no apaga ni manipula equipos del cliente.',
    ref: 'RB-06 · Gestión de cambios (ITIL / ISO/IEC 20000-1)',
    guided: {"steps": [{"label": "Abre el ticket", "text": "Haz clic en el aviso o en la pestaña Tickets.", "done": {"open": true}}, {"label": "Mira quién entró y cuándo", "text": "Un proveedor en la sala no siempre es un problema. Revisa la pestaña Accesos y adjunta (📎) el ingreso de las 08:05.", "done": {"tab": "accesos", "ev": ["acc:acc-0805"]}}, {"label": "Busca si hay un cambio aprobado", "text": "Todo trabajo en sala debe tener un cambio aprobado y vigente. Revisa la pestaña Cambios y adjunta el que corresponde.", "done": {"tab": "cambios", "ev": ["cal:CHG-1042"]}}, {"label": "Ve al rack donde trabaja", "text": "CHG-1042 dice «stg-02 (R07)». Haz clic en R07.", "done": {"inspect": ["rack:R07"]}}, {"label": "Acompaña al técnico", "text": "En el inspector de R07 tienes acciones. Elige la que corresponde mientras el técnico trabaja.", "done": {"field": "tech-escort"}}, {"label": "Registra en la bitácora", "text": "Escribe en la bitácora qué pasó y menciona el ticket (por ejemplo «TK-101»). También sirve la nota del cierre.", "done": {"note": true}}, {"label": "Cierra el ticket", "text": "Ya tienes lo necesario. Pulsa «Resolver y cerrar ticket».", "done": {"close": true}}], "form": {"actions": ["a1", "a2", "a3", "a5"], "esc": ["nadie", "jefe", "seguridad"]}, "reflect": {"q": "¿Qué hace que este ingreso sea benigno y no un incidente de seguridad?", "options": [{"t": "El técnico llevaba credencial de proveedor.", "ok": false, "fb": "La credencial solo dice quién es; lo que autoriza el trabajo es el cambio aprobado."}, {"t": "Coincide con un cambio aprobado y vigente sobre ese mismo equipo.", "ok": true, "fb": "Exacto: CHG-1042 autoriza el trabajo en stg-02 de 08:00 a 10:00. Por eso se acompaña y se registra, sin escalar."}, {"t": "Ocurrió en horario hábil.", "ok": false, "fb": "El horario no autoriza un ingreso: sin un cambio aprobado, sería un incidente aunque fuera de día."}]}},
    hints: [
      "Un proveedor en la sala no siempre es un problema. ¿Qué documento autoriza que alguien trabaje en la sala?",
      "Busca en la pestaña Cambios un trabajo de hoy sobre stg-02, en R07, y compáralo con el registro de Accesos.",
      "CHG-1042 está aprobado de 08:00 a 10:00: es trabajo autorizado. Se verifica, se acompaña al técnico en R07 y se registra; no se escala ni se apagan equipos.",
    ],
  },
  {
    id: 'E2', at: 35, rack: 'R04',
    alert: { sev: 'high', host: 'ENV-R04-IN', text: 'Temperatura de entrada alta en R04 (sensor superior): 34,2 °C' },
    title: 'Temperatura alta en R04',
    expected: { cls: 'fp', prio: 'P4', esc: ['nadie'], escAllowed: [] },
    actions: [
      { id: 'a1', text: 'Contrastar con los sensores vecinos y con la temperatura IPMI de los servidores', ok: true, verify: ['insp:rack:R04'] },
      { id: 'a2', text: 'Reubicar y fijar el sensor en la toma de aire frontal del rack', ok: true, field: 'sensor-fix' },
      { id: 'a3', text: 'Dejar registro para que mantenimiento revise la fijación del sensor', ok: true, note: true },
      { id: 'a4', text: 'Subir CRAC-1 y CRAC-2 al 100 % para bajar la temperatura', field: 'crac-100' },
      { id: 'a5', text: 'Apagar los hosts de virtualización de R04 para evitar daños', critical: true, field: 'r04-hosts-off' },
    ],
    evidence: ['obs:r04-sensor', 'obs:r04-ipmi'],
    why: 'Un solo sensor marca 34 °C, mientras R03 y R05 están cerca de 22 °C, la salida de R04 es normal y los servidores reportan 22–24 °C por IPMI. El sensor estaba suelto y colgaba hacia la parte trasera, donde sale el aire caliente. Es una medición errónea, no un problema térmico: se corrige el sensor sin escalar. La temperatura de entrada se mide en la toma de aire frontal.',
    ref: 'RB-05 · ASHRAE TC 9.9 (puntos de medición en la entrada)',
    guided: {"steps": [{"label": "Abre el ticket", "text": "Haz clic en el aviso o en la pestaña Tickets.", "done": {"open": true}}, {"label": "Revisa R04 en la sala", "text": "Haz clic en R04. Compara el sensor superior con las demás lecturas y con la temperatura IPMI de los servidores.", "done": {"inspect": ["rack:R04"]}}, {"label": "Adjunta lo que contradice la alerta", "text": "Adjunta (📎) la observación de IPMI y la del sensor suelto.", "done": {"ev": ["obs:r04-ipmi", "obs:r04-sensor"]}}, {"label": "Corrige el sensor", "text": "En las acciones de R04, reubica y fija el sensor en la toma de aire frontal.", "done": {"field": "sensor-fix"}}, {"label": "Deja registro", "text": "Escribe una nota que mencione el ticket para que mantenimiento revise la fijación (o usa la nota del cierre).", "done": {"note": true}}, {"label": "Cierra el ticket", "text": "Piensa en la clasificación: ¿la alerta reflejaba lo que pasaba en la sala?", "done": {"close": true}}], "form": {"actions": ["a1", "a2", "a3", "a5"], "esc": ["nadie", "jefe", "clima"]}, "reflect": {"q": "¿Por qué esta alerta es un falso positivo?", "options": [{"t": "Porque 34 °C está dentro del rango recomendado.", "ok": false, "fb": "No: 34 °C está muy sobre el rango recomendado (18–27 °C). El punto es que esa lectura no era real."}, {"t": "Porque las demás mediciones no la confirman y el sensor estaba mal ubicado.", "ok": true, "fb": "Exacto: una lectura aislada, que nada confirma y con una causa física a la vista, es un falso positivo."}, {"t": "Porque las alertas de un solo sensor siempre son falsas.", "ok": false, "fb": "No siempre: un solo sensor puede detectar un problema real. Lo que decide es contrastarlo con otras fuentes."}]}},
    hints: [
      "Antes de reaccionar a una lectura, pregúntate si el resto de la información la confirma.",
      "Compara el sensor con R03 y R05, con la salida de R04 y con la temperatura IPMI de los servidores. Luego mira dónde está el sensor.",
      "El sensor está suelto y mide el aire caliente de atrás: es un falso positivo. Reubícalo y fíjalo en la toma frontal, deja registro y no escales.",
    ],
  },
  {
    id: 'E3', at: 70, rack: 'R08', proactive: 'blank-install',
    alert: { sev: 'warning', host: 'ENV-R08-IN', text: 'Temperatura de entrada en aumento en R08 (sensor superior): 26,1 °C' },
    title: 'Temperatura en aumento en R08',
    expected: { cls: 'vp', prio: 'P3', esc: ['nadie'], escAllowed: ['cliente'] },
    actions: [
      { id: 'a1', text: 'Instalar paneles ciegos en los espacios vacíos U30–U34', ok: true, field: 'blank-install' },
      { id: 'a2', text: 'Verificar después que la temperatura de entrada vuelva a rango', ok: true, verify: ['insp:rack:R08'], after: 'blank-install' },
      { id: 'a3', text: 'Registrar el hallazgo en la bitácora', ok: true, note: true },
      { id: 'a4', text: 'Bajar el setpoint de ambos CRAC a 16 °C', field: 'setpoint-16' },
      { id: 'a5', text: 'Abrir la puerta del pasillo frío para ventilar', field: 'aisle-open' },
    ],
    evidence: ['obs:r08-blank', 'obs:r08-recirc'],
    why: 'Faltan paneles ciegos entre U30 y U34. El aire caliente de la parte trasera vuelve al frente por el hueco (recirculación) y calienta la entrada de los equipos superiores. Se corrige en sala, sin escalar: paneles ciegos y verificación. Bajar el setpoint gasta energía y no resuelve la causa; abrir el pasillo frío rompe la contención.',
    ref: 'RB-05 · ASHRAE TC 9.9 · EU Code of Conduct for Data Centres (gestión de flujo de aire)',
    guided: {"steps": [{"label": "Abre el ticket", "text": "Haz clic en el aviso o en la pestaña Tickets.", "done": {"open": true}}, {"label": "Mira el frente de R08", "text": "Haz clic en R08. La temperatura sube solo arriba: busca por dónde podría volver el aire caliente.", "done": {"inspect": ["rack:R08"]}}, {"label": "Adjunta el hallazgo", "text": "Adjunta (📎) la observación de los paneles ciegos faltantes y la de la recirculación.", "done": {"ev": ["obs:r08-blank", "obs:r08-recirc"]}}, {"label": "Corrige la causa", "text": "En las acciones de R08, instala los paneles ciegos en U30–U34.", "done": {"field": "blank-install"}}, {"label": "Verifica la temperatura", "text": "Vuelve a revisar R08 después de instalar los paneles.", "done": {"inspect": ["rack:R08"], "after": "blank-install"}}, {"label": "Registra en la bitácora", "text": "Deja una nota que mencione el ticket (o usa la nota del cierre).", "done": {"note": true}}, {"label": "Cierra el ticket", "text": "Pulsa «Resolver y cerrar ticket».", "done": {"close": true}}], "form": {"actions": ["a1", "a2", "a3", "a4"], "esc": ["nadie", "clima", "cliente"]}, "reflect": {"q": "¿Por qué instalar paneles ciegos en vez de bajar el setpoint de los CRAC?", "options": [{"t": "Porque bajar el setpoint está prohibido por norma.", "ok": false, "fb": "No hay una prohibición: simplemente no corrige la causa y gasta más energía."}, {"t": "Porque la causa es la recirculación por el hueco: el panel la corrige y el setpoint solo enfría más todo.", "ok": true, "fb": "Así es: se corrige la causa física. Tocar el setpoint gasta energía y deja el problema."}, {"t": "Porque los paneles ciegos son más baratos.", "ok": false, "fb": "El costo no es la razón: el problema es de flujo de aire, no de capacidad de frío."}]}},
    hints: [
      "La temperatura sube solo en la parte superior de R08. ¿Qué podría dejar pasar aire caliente hacia el frente?",
      "Mira el frente de R08 entre U30 y U34. El aire caliente de la parte trasera vuelve por los huecos.",
      "Faltan paneles ciegos en U30–U34. Instálalos desde el inspector de R08, verifica después la temperatura y registra el hallazgo. No toques los setpoints ni abras el pasillo frío.",
    ],
  },
  {
    id: 'E4', at: 110, rack: 'R06', proactive: 'psu-move',
    alert: { sev: 'average', host: 'PDU-R06-B', text: 'PDU-B de R06 sobre el umbral: 84 % de la capacidad de la rama' },
    title: 'Carga alta en PDU-B de R06',
    expected: { cls: 'vp', prio: 'P2', esc: ['cliente'], escAllowed: ['jefe', 'elec'] },
    actions: [
      { id: 'a1', text: 'Revisar en sala a qué PDU está conectada cada fuente de los equipos de R06', ok: true, verify: ['insp:rack:R06', 'insp:device:R06/k8s-n7'] },
      { id: 'a2', text: 'Informar al cliente y, con su autorización, mover una fuente de k8s-n7 a PDU-A', ok: true, field: 'psu-move', authorized: true },
      { id: 'a3', text: 'Monitorear la carga de PDU-B hasta la corrección', ok: true },
      { id: 'a4', text: 'Desconectar de inmediato la PSU1 de k8s-n7 y pasarla a PDU-A sin avisar', critical: true, field: 'psu-move', unauthorized: true },
      { id: 'a5', text: 'Subir el umbral de alerta de la PDU al 95 %' },
      { id: 'a6', text: 'Apagar k8s-n7 hasta que el cliente revise', critical: true, field: 'n7-off' },
    ],
    evidence: ['obs:r06-psu', 'obs:r06-pdu', 'cal:CHG-1045'],
    why: 'k8s-n7, instalado hoy por el cliente (CHG-1045), tiene las dos fuentes conectadas a PDU-B. La rama B sube y el equipo perdió la redundancia A+B: si la rama dispara, el nodo cae y los demás quedan sin respaldo. Como es un equipo del cliente, el operador no lo desconecta por su cuenta: informa, propone la corrección y la ejecuta con autorización. El cambio indicaba «PSU1 a PDU-A y PSU2 a PDU-B»: es un error de instalación.',
    ref: 'RB-02 · TIA-942 / Uptime Institute Tiers (alimentación redundante)',
    guided: {"steps": [{"label": "Abre el ticket", "text": "Haz clic en el aviso o en la pestaña Tickets.", "done": {"open": true}}, {"label": "Revisa las fuentes de R06", "text": "Haz clic en R06 (o en la ficha de k8s-n7) y mira a qué PDU va cada fuente.", "done": {"inspect": ["rack:R06", "device:R06/k8s-n7"]}}, {"label": "Adjunta lo que encontraste", "text": "Adjunta (📎) la observación de las fuentes de k8s-n7 y la lectura de las PDU.", "done": {"ev": ["obs:r06-psu", "obs:r06-pdu"]}}, {"label": "Revisa el cambio que instaló el equipo", "text": "En la pestaña Cambios, busca cómo debía conectarse k8s-n7 y adjunta ese cambio.", "done": {"tab": "cambios", "ev": ["cal:CHG-1045"]}}, {"label": "Pide autorización al cliente", "text": "k8s-n7 es un equipo del cliente. En sus acciones, pulsa «Solicitar autorización al cliente».", "done": {"auth": "psu-move"}}, {"label": "Mueve la PSU1 a PDU-A", "text": "Cuando el cliente autorice, mueve la PSU1 a PDU-A desde las acciones de R06 o de k8s-n7.", "done": {"field": "psu-move", "authorized": true}}, {"label": "Cierra el ticket", "text": "Pulsa «Resolver y cerrar ticket».", "done": {"close": true}}], "form": {"actions": ["a1", "a2", "a3", "a4"], "esc": ["nadie", "cliente", "elec", "jefe"]}, "reflect": {"q": "¿Por qué no mover la fuente apenas detectas el problema?", "options": [{"t": "Porque mover una fuente siempre apaga el equipo.", "ok": false, "fb": "No necesariamente. La razón es otra: el equipo es del cliente."}, {"t": "Porque es un equipo del cliente: se informa y se actúa con su autorización.", "ok": true, "fb": "Correcto: en un colocation el operador no interviene equipos de clientes sin autorización, aunque sepa cómo corregirlo."}, {"t": "Porque la carga de PDU-B todavía es baja.", "ok": false, "fb": "No: 84 % ya es alto y sigue subiendo. Hay que actuar, pero con autorización."}]}},
    hints: [
      "Una rama de PDU muy cargada y la otra liviana suele indicar un problema de conexión, no de consumo.",
      "Revisa en la ficha de R06 (o de k8s-n7) a qué PDU va cada fuente. Mira también el cambio CHG-1045.",
      "k8s-n7 tiene las dos fuentes en PDU-B. Es un equipo del cliente: solicita su autorización y, cuando la tengas, mueve la PSU1 a PDU-A. Sin autorización no se toca.",
    ],
  },
  {
    id: 'E5', at: 180, rack: null, object: 'UPS-A',
    alert: { sev: 'high', host: 'UPS-A', text: 'UPS-A operando en batería' },
    title: 'UPS-A en batería',
    expected: { cls: 'benigno', prio: 'P4', esc: ['nadie'], escAllowed: [] },
    actions: [
      { id: 'a1', text: 'Confirmar en el calendario la autoprueba programada (MNT-221)', ok: true, verify: ['tab:cambios'] },
      { id: 'a2', text: 'Verificar que la entrada de red y UPS-B estén normales', ok: true, verify: ['insp:ups:UPS-B'] },
      { id: 'a3', text: 'Registrar inicio y fin de la prueba en la bitácora', ok: true, note: true },
      { id: 'a4', text: 'Arrancar el generador manualmente por precaución' },
      { id: 'a5', text: 'Pasar UPS-A a bypass para cortar la prueba', critical: true, field: 'ups-bypass' },
      { id: 'a6', text: 'Avisar a todos los clientes de un corte de energía' },
    ],
    evidence: ['cal:MNT-221', 'obs:upsa-test'],
    why: 'MNT-221 programó la autoprueba mensual de baterías de UPS-A de 11:00 a 11:15. La entrada de red está normal y UPS-B opera sin novedad. Pasar a bypass dejaría la carga sin protección; arrancar el generador o avisar un corte que no existe solo genera ruido. Se verifica contra el calendario y se registra.',
    ref: 'RB-06 · IEEE 1188 (mantenimiento de baterías)',
    guided: {"steps": [{"label": "Abre el ticket", "text": "Haz clic en el aviso o en la pestaña Tickets.", "done": {"open": true}}, {"label": "Busca si la prueba estaba programada", "text": "Revisa la pestaña Cambios y adjunta el mantenimiento que explica lo que pasa.", "done": {"tab": "cambios", "ev": ["cal:MNT-221"]}}, {"label": "Mira la pantalla de UPS-A", "text": "Haz clic en UPS-A y adjunta lo que dice su pantalla.", "done": {"inspect": ["ups:UPS-A"], "ev": ["obs:upsa-test"]}}, {"label": "Verifica UPS-B", "text": "Haz clic en UPS-B para confirmar que opera normal.", "done": {"inspect": ["ups:UPS-B"]}}, {"label": "Registra en la bitácora", "text": "Deja una nota que mencione el ticket (o usa la nota del cierre).", "done": {"note": true}}, {"label": "Cierra el ticket", "text": "Pulsa «Resolver y cerrar ticket».", "done": {"close": true}}], "form": {"actions": ["a1", "a2", "a3", "a5"], "esc": ["nadie", "elec", "jefe"]}, "reflect": {"q": "¿Qué hace que una UPS en batería sea benigna en este caso?", "options": [{"t": "Que la batería esté sobre 90 %.", "ok": false, "fb": "La carga de la batería no decide: lo que decide es que la prueba estaba programada y la red está normal."}, {"t": "Que sea la autoprueba programada MNT-221, con la red y UPS-B normales.", "ok": true, "fb": "Exacto: es un evento real, esperado y autorizado."}, {"t": "Que dure menos de 15 minutos.", "ok": false, "fb": "La duración ayuda, pero sin el mantenimiento programado no sabrías que es una prueba."}]}},
    hints: [
      "¿Hay algo programado para esta hora que explique que la UPS esté en batería?",
      "Revisa la pestaña Cambios y la pantalla de UPS-A. Compara con UPS-B y la entrada de red.",
      "Es la autoprueba mensual MNT-221 (11:00–11:15). Verifica red y UPS-B, registra inicio y fin, y no interrumpas la prueba. No se escala.",
    ],
  },
  {
    id: 'E6', at: 255, rack: null, object: 'CRAC-2',
    alert: { sev: 'disaster', host: 'CRAC-2', text: 'CRAC-2: falla de compresor (alarma de alta presión HP1)' },
    title: 'Falla de CRAC-2',
    expected: { cls: 'vp', prio: 'P1', esc: ['clima', 'jefe'], escAllowed: ['cliente'] },
    actions: [
      { id: 'a1', text: 'Subir la capacidad de CRAC-1 para compensar', ok: true, field: 'crac1-boost' },
      { id: 'a2', text: 'Vigilar la temperatura de entrada de la fila B cada 5 minutos', ok: true },
      { id: 'a3', text: 'Mantener cerradas las puertas del pasillo frío', ok: true, abstain: ['aisle-open'] },
      { id: 'a4', text: 'Rearmar CRAC-2 varias veces hasta que el compresor arranque', critical: true, field: 'crac2-reset' },
      { id: 'a5', text: 'Abrir las puertas del pasillo frío y de la sala para ventilar', field: 'aisle-open' },
      { id: 'a6', text: 'Esperar a ver si la temperatura se estabiliza sola' },
    ],
    evidence: ['obs:crac2-alarm', 'obs:crac1-ok'],
    why: 'Con CRAC-2 detenido, la fila B pierde aire frío y la temperatura sube minuto a minuto: es crítico y se escala de inmediato a Climatización y al jefe de turno. Mientras llega el técnico, se compensa con CRAC-1 y se vigila la entrada de la fila B. Una alarma de alta presión no se rearma a la fuerza: insistir puede dañar el compresor.',
    ref: 'RB-01 · ASHRAE TC 9.9 (rango recomendado 18–27 °C)',
    guided: {"steps": [{"label": "Abre el ticket", "text": "Es una falla crítica: ábrelo de inmediato.", "done": {"open": true}}, {"label": "Mira la alarma de CRAC-2", "text": "Haz clic en CRAC-2 y adjunta la alarma que muestra.", "done": {"inspect": ["crac:CRAC-2"], "ev": ["obs:crac2-alarm"]}}, {"label": "Revisa el margen de CRAC-1", "text": "Haz clic en CRAC-1 y adjunta cuánta capacidad le queda.", "done": {"inspect": ["crac:CRAC-1"], "ev": ["obs:crac1-ok"]}}, {"label": "Compensa con CRAC-1", "text": "En las acciones de CRAC-1, sube su capacidad.", "done": {"field": "crac1-boost"}}, {"label": "Cierra y escala", "text": "Al cerrar, piensa a quién hay que avisar para que repare CRAC-2.", "done": {"close": true}}], "form": {"actions": ["a1", "a2", "a3", "a4"], "esc": ["nadie", "clima", "jefe", "cliente"]}, "reflect": {"q": "¿Por qué no rearmar CRAC-2 hasta que arranque?", "options": [{"t": "Porque el rearme solo se hace de noche.", "ok": false, "fb": "No tiene que ver con el horario."}, {"t": "Porque una alarma de alta presión indica una falla que necesita un técnico; insistir puede dañar el compresor.", "ok": true, "fb": "Así es: se compensa con CRAC-1, se vigila la fila B y se escala."}, {"t": "Porque CRAC-1 basta para toda la sala.", "ok": false, "fb": "CRAC-1 ayuda a compensar, pero no reemplaza a CRAC-2: la fila B sigue en riesgo hasta la reparación."}]}},
    hints: [
      "Una falla de climatización empeora minuto a minuto: piensa primero en contener el daño y en quién debe repararla.",
      "Revisa CRAC-2 (qué alarma tiene) y CRAC-1 (qué margen de capacidad le queda). Mira el runbook RB-01.",
      "Sube la capacidad de CRAC-1, mantén cerrado el pasillo frío, vigila la fila B y escala de inmediato a Climatización y al jefe de turno. No rearmes CRAC-2.",
    ],
  },
  {
    id: 'E7', at: 330, rack: null, object: 'LEAK',
    alert: { sev: 'high', host: 'LEAK-Z3', text: 'Detección de líquido bajo el piso técnico · Zona 3 (junto a CRAC-1)' },
    title: 'Líquido bajo el piso técnico',
    expected: { cls: 'vp', prio: 'P2', esc: ['clima'], escAllowed: ['jefe'] },
    actions: [
      { id: 'a1', text: 'Levantar la baldosa e inspeccionar el origen sin pisar el agua', ok: true, field: 'tile-lift' },
      { id: 'a2', text: 'Contener con material absorbente y alejar el agua de la canalización eléctrica', ok: true, field: 'absorbent' },
      { id: 'a3', text: 'Documentar con fotos el punto exacto y el origen', ok: true, field: 'photo-leak' },
      { id: 'a4', text: 'Apagar CRAC-1 de inmediato', critical: true, field: 'crac1-off' },
      { id: 'a5', text: 'Esperar al cambio de turno; es poca agua' },
      { id: 'a6', text: 'Cortar la energía del tablero de la sala', critical: true },
    ],
    evidence: ['obs:leak-water', 'obs:leak-cables'],
    why: 'El agua viene de la bandeja de condensado de CRAC-1 y está a 40 cm de la canalización eléctrica. Hay que contener y escalar a Climatización. Apagar CRAC-1 o cortar la energía de la sala provocaría un incidente mucho mayor que la fuga.',
    ref: 'RB-04 · TIA-942 (detección de fugas)',
    guided: {"steps": [{"label": "Abre el ticket", "text": "Haz clic en el aviso o en la pestaña Tickets.", "done": {"open": true}}, {"label": "Levanta la baldosa", "text": "Haz clic en la zona del sensor de fuga y, en sus acciones, levanta la baldosa para ver el origen.", "done": {"field": "tile-lift"}}, {"label": "Adjunta el origen y el riesgo", "text": "Adjunta (📎) de dónde viene el agua y qué tan cerca está de la canalización eléctrica.", "done": {"ev": ["obs:leak-water", "obs:leak-cables"]}}, {"label": "Contén el agua", "text": "Coloca material absorbente para que el agua no avance.", "done": {"field": "absorbent"}}, {"label": "Documenta con una foto", "text": "Fotografía el punto exacto y el origen.", "done": {"field": "photo-leak"}}, {"label": "Cierra y escala", "text": "Al cerrar, piensa quién debe reparar el origen de la fuga.", "done": {"close": true}}], "form": {"actions": ["a1", "a2", "a3", "a4"], "esc": ["nadie", "clima", "elec", "jefe"]}, "reflect": {"q": "¿Por qué no cortar la energía de la sala si hay agua cerca de la canalización?", "options": [{"t": "Porque cortar la energía es solo para incendios.", "ok": false, "fb": "No es por eso: cortar la energía puede justificarse en otras emergencias, pero aquí el riesgo se controla conteniendo."}, {"t": "Porque se puede contener el agua sin afectar el servicio; cortar la energía causaría un incidente mucho mayor.", "ok": true, "fb": "Correcto: el remedio no debe ser peor que el problema."}, {"t": "Porque el agua no conduce electricidad.", "ok": false, "fb": "Sí conduce: por eso hay que contenerla y alejarla de la canalización."}]}},
    hints: [
      "Con agua bajo el piso, lo primero es saber de dónde viene y qué tan cerca está de la energía.",
      "Levanta la baldosa de la zona 3 para ver el origen. Revisa el runbook RB-04.",
      "Levanta la baldosa, contén el agua con material absorbente, toma una foto y escala a Climatización. No apagues CRAC-1 ni cortes la energía.",
    ],
  },
  {
    id: 'E8', at: 380, rack: 'R02', proactive: 'door-secure',
    alert: { sev: 'average', host: 'DOOR-R02-REAR', text: 'Puerta trasera de R02 abierta sin trabajo programado' },
    title: 'Puerta de R02 abierta',
    expected: { cls: 'vp', prio: 'P2', esc: ['seguridad', 'jefe'], escAllowed: ['cliente'] },
    actions: [
      { id: 'a1', text: 'No manipular el equipo ni el cable encontrado: preservar la evidencia', ok: true, abstain: ['cable-unplug', 'fw01-reboot'] },
      { id: 'a2', text: 'Revisar el registro de accesos y las cámaras del periodo', ok: true, verify: ['tab:accesos'] },
      { id: 'a3', text: 'Fotografiar, registrar y luego asegurar la puerta', ok: true, seq: ['photo-r02', 'door-secure'] },
      { id: 'a4', text: 'Desconectar el cable de consola de fw-01', field: 'cable-unplug' },
      { id: 'a5', text: 'Cerrar la puerta y cerrar el ticket' },
      { id: 'a6', text: 'Reiniciar fw-01 por si fue manipulado', critical: true, field: 'fw01-reboot' },
    ],
    evidence: ['obs:r02-door', 'obs:r02-cable', 'acc:acc-1404'],
    why: 'La puerta se abrió sin cambio asociado, y a las 14:04 entró una tarjeta de visita (V-12) sin visita registrada. Hay un cable de consola conectado a fw-01 que no figura en el inventario. Es un posible acceso no autorizado: se avisa a Seguridad física y al jefe de turno, se preserva la evidencia y no se toca el equipo del cliente.',
    ref: 'RB-03 · ISO/IEC 27001:2022 A.7 (controles físicos)',
    guided: {"steps": [{"label": "Abre el ticket", "text": "Haz clic en el aviso o en la pestaña Tickets.", "done": {"open": true}}, {"label": "Mira R02 sin tocar nada", "text": "Haz clic en R02 y adjunta (📎) lo que ves en la puerta y en fw-01.", "done": {"inspect": ["rack:R02"], "ev": ["obs:r02-door", "obs:r02-cable"]}}, {"label": "Revisa quién entró", "text": "En la pestaña Accesos, busca el ingreso de las 14:04 y adjúntalo.", "done": {"tab": "accesos", "ev": ["acc:acc-1404"]}}, {"label": "Fotografía antes de tocar", "text": "En las acciones de R02, toma una foto de la puerta y del cable.", "done": {"field": "photo-r02"}}, {"label": "Asegura la puerta", "text": "Después de la foto, asegura la puerta trasera.", "done": {"field": "door-secure"}}, {"label": "Cierra y escala", "text": "Al cerrar, piensa a quién le corresponde investigar un posible acceso no autorizado.", "done": {"close": true}}], "form": {"actions": ["a1", "a2", "a3", "a4"], "esc": ["nadie", "seguridad", "jefe", "cliente"]}, "reflect": {"q": "¿Por qué no desconectar el cable de consola de fw-01?", "options": [{"t": "Porque el cable es del cliente.", "ok": false, "fb": "Puede ser, pero la razón principal es otra: el cable es evidencia."}, {"t": "Porque es evidencia de un posible acceso no autorizado: se fotografía y se deja para Seguridad.", "ok": true, "fb": "Exacto: preservar la evidencia permite investigar qué pasó."}, {"t": "Porque desconectarlo reinicia el firewall.", "ok": false, "fb": "No lo reinicia, pero alteraría la evidencia de un posible acceso no autorizado."}]}},
    hints: [
      "Una puerta abierta sin trabajo programado puede ser un acceso no autorizado: lo que encuentres es evidencia.",
      "Revisa el registro de Accesos alrededor de las 14:04 y mira la parte trasera de R02 sin tocar nada.",
      "Fotografía la puerta y el cable, revisa Accesos, asegura la puerta después de fotografiar y escala a Seguridad física y al jefe de turno. No desconectes el cable ni reinicies fw-01.",
    ],
  },
];
