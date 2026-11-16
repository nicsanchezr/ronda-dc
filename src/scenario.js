// Escenario del turno: Cordillera Colo · Sala A (SCL-1)
// Datos de la sala, catálogos y los 8 eventos del turno.
// Los tiempos se expresan en minutos desde las 08:00.
// Aquí solo va la estructura (ids, tiempos, respuestas esperadas). Los textos están en el
// diccionario de cada idioma (src/i18n/escenario.<idioma>.js, grupo «sc») y se enlazan al final
// de este archivo como propiedades de solo lectura: inc.title, fa.label, etc. siempre devuelven
// el texto del idioma activo, así que cambiar de idioma no reinicia el estado.
import { t } from './i18n/index.js';

export const SHIFT = { start: 8 * 60, length: 420 }; // 08:00 a 15:00

// Los colores de cada severidad están en los temas (src/themes, grupo sev).
export const SEV = {
  disaster: { rank: 5 },
  high: { rank: 4 },
  average: { rank: 3 },
  warning: { rank: 2 },
  info: { rank: 1 },
  ok: { rank: 0 },
};

// Empresas ficticias: el nombre no se traduce.
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
// El nombre del modelo (model) está en el diccionario (sc.models).
export const MODELS = {
  server1: { prof: 0.72, mgmt: 'ipmi' },
  server2: { prof: 0.76, mgmt: 'ipmi' },
  storage: { prof: 0.8, mgmt: 'ipmi' },
  switch: { prof: 0.45, mgmt: 'mgmt' },
  firewall: { prof: 0.5, mgmt: 'mgmt' },
  router: { prof: 0.55, mgmt: 'mgmt' },
  patch: { prof: 0.12, mgmt: null },
};
export const modelOf = (d) => MODELS[d.type === 'server' ? (d.h >= 2 ? 'server2' : 'server1') : d.type] || MODELS.server1;

export const ESCALATIONS = [{ id: 'nadie' }, { id: 'jefe' }, { id: 'clima' }, { id: 'elec' }, { id: 'proveedor' }, { id: 'cliente' }, { id: 'seguridad' }];

export const CLASSES = [{ id: 'vp' }, { id: 'fp' }, { id: 'benigno' }];

export const PRIORITIES = [
  { id: 'P1', ack: 5, res: 25 },
  { id: 'P2', ack: 10, res: 45 },
  { id: 'P3', ack: 30, res: 90 },
  { id: 'P4', ack: 60, res: 180 },
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

// Calendario de cambios y mantenimientos del día (textos: sc.cal.<id> → at, title, who, state, detail)
export const CALENDAR = [
  { id: 'CHG-1042', client: 'logistica' },
  { id: 'CHG-1045', client: 'fintech' },
  { id: 'MNT-221', client: null },
  { id: 'CHG-1047', client: 'logistica' },
  { id: 'MNT-219', client: null },
];

// Registro de control de acceso (aparece a medida que avanza el reloj; textos: sc.acc.<id> → who, door, note)
export const ACCESS = [
  { id: 'acc-0728', t: -32, card: 'C-2231' },
  { id: 'acc-0759', t: -1, card: 'E-0107' },
  { id: 'acc-0805', t: 5, card: 'P-0412' },
  { id: 'acc-0938', t: 98, card: 'P-0412' },
  { id: 'acc-1102', t: 182, card: 'E-0033' },
  { id: 'acc-1404', t: 364, card: 'V-12' },
  { id: 'acc-1411', t: 371, card: 'V-12' },
];

// Alertas informativas de fondo (no generan ticket; textos: sc.noise.n<t>)
export const NOISE = [
  { t: 0, host: 'srv-ntp01' },
  { t: 22, host: 'bkp-01' },
  { t: 61, host: 'sw-dist-02' },
  { t: 128, host: 'srv-mon01' },
  { t: 205, host: 'GEN-01' },
  { t: 290, host: 'srv-web02' },
  { t: 345, host: 'ENV-SALA' },
  { t: 400, host: 'bkp-01' },
];

// Runbooks (textos: sc.rb.<id> → title, steps)
export const RUNBOOKS = [{ id: 'RB-01' }, { id: 'RB-02' }, { id: 'RB-03' }, { id: 'RB-04' }, { id: 'RB-05' }, { id: 'RB-06' }];

// ---------------------------------------------------------------------------
// Acciones en sala (se ejecutan desde el inspector o la ficha del objeto)
//   on: objetos donde aparece el botón · min: minutos de juego que toma
//   restricted: equipo de un cliente (requiere su autorización)
//   auth: respuesta del cliente a la solicitud { grant, after (min) }
//   inc: evento al que se asocia (para la bitácora, la evidencia y el escalamiento)
//   photo: la acción genera una foto que se adjunta como evidencia
// Textos (sc.fa.<id>): label, verb, photo (rótulo de la foto) y authWhy (explicación en la
// corrección si la solicitud de autorización cuenta como escalamiento de más).
// La disponibilidad y el efecto de cada acción están en sim.js (fieldAvailable / doField).
// ---------------------------------------------------------------------------
export const FIELD_ACTIONS = [
  { id: 'tech-escort', inc: 'E1', on: [{ kind: 'rack', id: 'R07' }], min: 5 },
  { id: 'stg02-off', inc: 'E1', on: [{ kind: 'device', id: 'R07/stg-02' }], min: 2, restricted: true, auth: { grant: false, after: 5 }, authWhy: true },
  { id: 'sensor-fix', inc: 'E2', on: [{ kind: 'rack', id: 'R04' }], min: 3 },
  { id: 'r04-hosts-off', inc: 'E2', on: [{ kind: 'rack', id: 'R04' }], min: 3, restricted: true, auth: { grant: false, after: 5 }, authWhy: true },
  { id: 'crac-100', inc: 'E2', on: [{ kind: 'crac', id: 'CRAC-1' }, { kind: 'crac', id: 'CRAC-2' }], min: 1 },
  { id: 'blank-install', inc: 'E3', on: [{ kind: 'rack', id: 'R08' }], min: 6 },
  { id: 'setpoint-16', inc: 'E3', on: [{ kind: 'crac', id: 'CRAC-1' }, { kind: 'crac', id: 'CRAC-2' }], min: 1 },
  { id: 'aisle-open', inc: 'E3', on: [{ kind: 'acs', id: 'ACS' }], min: 1 },
  { id: 'psu-move', inc: 'E4', on: [{ kind: 'device', id: 'R06/k8s-n7' }], min: 5, restricted: true, auth: { grant: true, after: 10 } },
  { id: 'n7-off', inc: 'E4', on: [{ kind: 'device', id: 'R06/k8s-n7' }], min: 2, restricted: true, auth: { grant: false, after: 5 } },
  { id: 'ups-bypass', inc: 'E5', on: [{ kind: 'ups', id: 'UPS-A' }], min: 2 },
  { id: 'crac1-boost', inc: 'E6', on: [{ kind: 'crac', id: 'CRAC-1' }], min: 1 },
  { id: 'crac2-reset', inc: 'E6', on: [{ kind: 'crac', id: 'CRAC-2' }], min: 2 },
  { id: 'tile-lift', inc: 'E7', on: [{ kind: 'leak', id: 'LEAK-Z3' }], min: 2 },
  { id: 'absorbent', inc: 'E7', on: [{ kind: 'leak', id: 'LEAK-Z3' }], min: 4 },
  { id: 'photo-leak', inc: 'E7', on: [{ kind: 'leak', id: 'LEAK-Z3' }], min: 1, photo: true },
  { id: 'crac1-off', inc: 'E7', on: [{ kind: 'crac', id: 'CRAC-1' }], min: 1 },
  { id: 'photo-r02', inc: 'E8', on: [{ kind: 'rack', id: 'R02' }], min: 1, photo: true },
  { id: 'door-secure', inc: 'E8', on: [{ kind: 'rack', id: 'R02' }], min: 2 },
  { id: 'cable-unplug', inc: 'E8', on: [{ kind: 'device', id: 'R02/fw-01' }], min: 1 },
  { id: 'trash-remove', inc: null, on: [{ kind: 'rack', id: 'R06' }], min: 2 },
  { id: 'fw01-reboot', inc: 'E8', on: [{ kind: 'device', id: 'R02/fw-01' }], min: 2, restricted: true, auth: { grant: false, after: 5 } },
];

// ---------------------------------------------------------------------------
// Checklist de ronda (ronda de inicio de turno). Cada ítem:
//   look: grupos de lugares a revisar (en cada grupo basta uno: 'rack:R01', 'tab:accesos'…)
//   expected: 'ok' | 'obs' | 'falla' · evidence: observaciones que respaldan el hallazgo
//   fix: acciones en sala (o 'auth:<id>' = pedir autorización) que corrigen el hallazgo (bonificación)
// Textos (sc.round.<id>): title, why (qué revisar y por qué, nivel Guiado), where (dónde mirar,
// Normal), finding (qué había) y ref.
// ---------------------------------------------------------------------------
const ROW_A = ['rack:R01', 'rack:R02', 'rack:R03', 'rack:R04', 'rack:R05'];
const ROW_B = ['rack:R06', 'rack:R07', 'rack:R08', 'rack:R09', 'rack:R10'];
export const ROUND_ITEMS = [
  { id: 'temp', look: [ROW_A, ROW_B], expected: 'ok', evidence: [] },
  { id: 'crac', look: [['crac:CRAC-1'], ['crac:CRAC-2']], expected: 'obs', evidence: ['obs:crac1-tray-high'] },
  { id: 'ups', look: [['ups:UPS-A'], ['ups:UPS-B']], expected: 'ok', evidence: [] },
  { id: 'ab', look: [['rack:R06', 'device:R06/k8s-n7']], expected: 'falla', evidence: ['obs:r06-psu'], fix: ['psu-move', 'auth:psu-move'] },
  { id: 'blank', look: [['rack:R08']], expected: 'falla', evidence: ['obs:r08-blank'], fix: ['blank-install'] },
  { id: 'doors', look: [ROW_A, ROW_B], expected: 'ok', evidence: [] },
  { id: 'fire', look: [['acs:ACS']], expected: 'obs', evidence: ['obs:fire-ext'] },
  { id: 'clean', look: [['rack:R06']], expected: 'obs', evidence: ['obs:r06-box'], fix: ['trash-remove'] },
  { id: 'access', look: [['tab:accesos']], expected: 'ok', evidence: [] },
  { id: 'floor', look: [['leak:LEAK-Z3']], expected: 'ok', evidence: [] },
];
export const ROUND_SCORE = { seen: 3, status: 5, evidence: 2, fix: 3 };

// Tutorial interactivo de la interfaz (nivel Guiado, antes del primer evento; textos: sc.tut[i]).
// until: 'run' (pulsa ▶) · 'next' (botón) · 'rack' (inspecciona un rack) · 'glossary' (abre un término) · 'done' (termina)
export const TUTORIAL = [
  { target: '#clockwrap', until: 'run' },
  { target: '#stage', until: 'rack' },
  { target: '#inspector', until: 'glossary' },
  { target: '#helpbtn', until: 'done' },
];

// ---------------------------------------------------------------------------
// Eventos del turno
// Cada evento define la alerta, la respuesta esperada y las acciones. Textos (sc.inc.<id>):
// title, alert, why, ref, actions.<id>, hints, steps[i] { label, text } y reflect { q, options[i] { t, fb } }.
// Tipo de cada acción (para la corrección):
//   field: 'id'      → se hace en la sala (FIELD_ACTIONS); declararla sin hacerla es un error
//   verify: [claves] → cuenta si se inspeccionó lo indicado ('tab:cambios', 'insp:rack:R04'…);
//                      after: 'id' exige inspeccionar después de esa acción
//   note: true       → cuenta si hay una nota en la bitácora sobre el ticket (o en el cierre)
//   abstain: [ids]   → «no hacer»: cuenta si no se ejecutó ninguna de esas acciones
//   seq: [ids]       → acciones en sala que deben hacerse en ese orden
//   authorized / unauthorized → la acción en sala cuenta solo con / sin autorización del cliente
//   (sin tipo)       → declarativa: se evalúa lo marcado en el formulario
// guided: tutor del nivel Guiado → steps (condición de cada paso; done: open · tab · ev · inspect (+after)
//         · field (+authorized) · auth · note · close), form { actions, esc } (opciones reducidas) y
//         reflect (cuál opción de la pregunta de reflexión es la correcta).
// hints: pistas de menos a más directas (Guiado usa 3, Normal 2, Experto ninguna).
// proactive: 'id' → si esa acción en sala se hizo antes de la alerta, la alerta no salta y el
//                  ticket se crea como «Hallazgo proactivo» (sin SLA y con bonificación).
// ---------------------------------------------------------------------------
export const INCIDENTS = [
  {
    id: 'E1', at: 10, rack: 'R07',
    alert: { sev: 'warning', host: 'ACS-SalaA' },
    expected: { cls: 'benigno', prio: 'P4', esc: ['nadie'], escAllowed: [] },
    actions: [
      { id: 'a1', ok: true, verify: ['tab:cambios'] },
      { id: 'a2', ok: true, field: 'tech-escort' },
      { id: 'a3', ok: true, note: true },
      { id: 'a4' },
      { id: 'a5', critical: true, field: 'stg02-off' },
    ],
    evidence: ['cal:CHG-1042', 'acc:acc-0805'],
    guided: { steps: [{ open: true }, { tab: 'accesos', ev: ['acc:acc-0805'] }, { tab: 'cambios', ev: ['cal:CHG-1042'] }, { inspect: ['rack:R07'] }, { field: 'tech-escort' }, { note: true }, { close: true }], form: { actions: ['a1', 'a2', 'a3', 'a5'], esc: ['nadie', 'jefe', 'seguridad'] }, reflect: [false, true, false] },
  },
  {
    id: 'E2', at: 35, rack: 'R04',
    alert: { sev: 'high', host: 'ENV-R04-IN' },
    expected: { cls: 'fp', prio: 'P4', esc: ['nadie'], escAllowed: [] },
    actions: [
      { id: 'a1', ok: true, verify: ['insp:rack:R04'] },
      { id: 'a2', ok: true, field: 'sensor-fix' },
      { id: 'a3', ok: true, note: true },
      { id: 'a4', field: 'crac-100' },
      { id: 'a5', critical: true, field: 'r04-hosts-off' },
    ],
    evidence: ['obs:r04-sensor', 'obs:r04-ipmi'],
    guided: { steps: [{ open: true }, { inspect: ['rack:R04'] }, { ev: ['obs:r04-ipmi', 'obs:r04-sensor'] }, { field: 'sensor-fix' }, { note: true }, { close: true }], form: { actions: ['a1', 'a2', 'a3', 'a5'], esc: ['nadie', 'jefe', 'clima'] }, reflect: [false, true, false] },
  },
  {
    id: 'E3', at: 70, rack: 'R08', proactive: 'blank-install',
    alert: { sev: 'warning', host: 'ENV-R08-IN' },
    expected: { cls: 'vp', prio: 'P3', esc: ['nadie'], escAllowed: ['cliente'] },
    actions: [
      { id: 'a1', ok: true, field: 'blank-install' },
      { id: 'a2', ok: true, verify: ['insp:rack:R08'], after: 'blank-install' },
      { id: 'a3', ok: true, note: true },
      { id: 'a4', field: 'setpoint-16' },
      { id: 'a5', field: 'aisle-open' },
    ],
    evidence: ['obs:r08-blank', 'obs:r08-recirc'],
    guided: { steps: [{ open: true }, { inspect: ['rack:R08'] }, { ev: ['obs:r08-blank', 'obs:r08-recirc'] }, { field: 'blank-install' }, { inspect: ['rack:R08'], after: 'blank-install' }, { note: true }, { close: true }], form: { actions: ['a1', 'a2', 'a3', 'a4'], esc: ['nadie', 'clima', 'cliente'] }, reflect: [false, true, false] },
  },
  {
    id: 'E4', at: 110, rack: 'R06', proactive: 'psu-move',
    alert: { sev: 'average', host: 'PDU-R06-B' },
    expected: { cls: 'vp', prio: 'P2', esc: ['cliente'], escAllowed: ['jefe', 'elec'] },
    actions: [
      { id: 'a1', ok: true, verify: ['insp:rack:R06', 'insp:device:R06/k8s-n7'] },
      { id: 'a2', ok: true, field: 'psu-move', authorized: true },
      { id: 'a3', ok: true },
      { id: 'a4', critical: true, field: 'psu-move', unauthorized: true },
      { id: 'a5' },
      { id: 'a6', critical: true, field: 'n7-off' },
    ],
    evidence: ['obs:r06-psu', 'obs:r06-pdu', 'cal:CHG-1045'],
    guided: { steps: [{ open: true }, { inspect: ['rack:R06', 'device:R06/k8s-n7'] }, { ev: ['obs:r06-psu', 'obs:r06-pdu'] }, { tab: 'cambios', ev: ['cal:CHG-1045'] }, { auth: 'psu-move' }, { field: 'psu-move', authorized: true }, { close: true }], form: { actions: ['a1', 'a2', 'a3', 'a4'], esc: ['nadie', 'cliente', 'elec', 'jefe'] }, reflect: [false, true, false] },
  },
  {
    id: 'E5', at: 180, rack: null, object: 'UPS-A',
    alert: { sev: 'high', host: 'UPS-A' },
    expected: { cls: 'benigno', prio: 'P4', esc: ['nadie'], escAllowed: [] },
    actions: [
      { id: 'a1', ok: true, verify: ['tab:cambios'] },
      { id: 'a2', ok: true, verify: ['insp:ups:UPS-B'] },
      { id: 'a3', ok: true, note: true },
      { id: 'a4' },
      { id: 'a5', critical: true, field: 'ups-bypass' },
      { id: 'a6' },
    ],
    evidence: ['cal:MNT-221', 'obs:upsa-test'],
    guided: { steps: [{ open: true }, { tab: 'cambios', ev: ['cal:MNT-221'] }, { inspect: ['ups:UPS-A'], ev: ['obs:upsa-test'] }, { inspect: ['ups:UPS-B'] }, { note: true }, { close: true }], form: { actions: ['a1', 'a2', 'a3', 'a5'], esc: ['nadie', 'elec', 'jefe'] }, reflect: [false, true, false] },
  },
  {
    id: 'E6', at: 255, rack: null, object: 'CRAC-2',
    alert: { sev: 'disaster', host: 'CRAC-2' },
    expected: { cls: 'vp', prio: 'P1', esc: ['clima', 'jefe'], escAllowed: ['cliente'] },
    actions: [
      { id: 'a1', ok: true, field: 'crac1-boost' },
      { id: 'a2', ok: true },
      { id: 'a3', ok: true, abstain: ['aisle-open'] },
      { id: 'a4', critical: true, field: 'crac2-reset' },
      { id: 'a5', field: 'aisle-open' },
      { id: 'a6' },
    ],
    evidence: ['obs:crac2-alarm', 'obs:crac1-ok'],
    guided: { steps: [{ open: true }, { inspect: ['crac:CRAC-2'], ev: ['obs:crac2-alarm'] }, { inspect: ['crac:CRAC-1'], ev: ['obs:crac1-ok'] }, { field: 'crac1-boost' }, { close: true }], form: { actions: ['a1', 'a2', 'a3', 'a4'], esc: ['nadie', 'clima', 'jefe', 'cliente'] }, reflect: [false, true, false] },
  },
  {
    id: 'E7', at: 330, rack: null, object: 'LEAK',
    alert: { sev: 'high', host: 'LEAK-Z3' },
    expected: { cls: 'vp', prio: 'P2', esc: ['clima'], escAllowed: ['jefe'] },
    actions: [
      { id: 'a1', ok: true, field: 'tile-lift' },
      { id: 'a2', ok: true, field: 'absorbent' },
      { id: 'a3', ok: true, field: 'photo-leak' },
      { id: 'a4', critical: true, field: 'crac1-off' },
      { id: 'a5' },
      { id: 'a6', critical: true },
    ],
    evidence: ['obs:leak-water', 'obs:leak-cables'],
    guided: { steps: [{ open: true }, { field: 'tile-lift' }, { ev: ['obs:leak-water', 'obs:leak-cables'] }, { field: 'absorbent' }, { field: 'photo-leak' }, { close: true }], form: { actions: ['a1', 'a2', 'a3', 'a4'], esc: ['nadie', 'clima', 'elec', 'jefe'] }, reflect: [false, true, false] },
  },
  {
    id: 'E8', at: 380, rack: 'R02', proactive: 'door-secure',
    alert: { sev: 'average', host: 'DOOR-R02-REAR' },
    expected: { cls: 'vp', prio: 'P2', esc: ['seguridad', 'jefe'], escAllowed: ['cliente'] },
    actions: [
      { id: 'a1', ok: true, abstain: ['cable-unplug', 'fw01-reboot'] },
      { id: 'a2', ok: true, verify: ['tab:accesos'] },
      { id: 'a3', ok: true, seq: ['photo-r02', 'door-secure'] },
      { id: 'a4', field: 'cable-unplug' },
      { id: 'a5' },
      { id: 'a6', critical: true, field: 'fw01-reboot' },
    ],
    evidence: ['obs:r02-door', 'obs:r02-cable', 'acc:acc-1404'],
    guided: { steps: [{ open: true }, { inspect: ['rack:R02'], ev: ['obs:r02-door', 'obs:r02-cable'] }, { tab: 'accesos', ev: ['acc:acc-1404'] }, { field: 'photo-r02' }, { field: 'door-secure' }, { close: true }], form: { actions: ['a1', 'a2', 'a3', 'a4'], esc: ['nadie', 'seguridad', 'jefe', 'cliente'] }, reflect: [false, true, false] },
  },
];

// ---------------------------------------------------------------------------
// Enlace de los textos del diccionario (idioma activo) a los datos de arriba.
// ---------------------------------------------------------------------------
/** Define obj[field] como propiedad de solo lectura que devuelve t(key). */
function text(obj, field, key) {
  Object.defineProperty(obj, field, { get: () => t(key), enumerable: true, configurable: true });
}
const texts = (obj, base, fields) => fields.forEach((f) => text(obj, f, base + '.' + f));

for (const k in SEV) text(SEV[k], 'label', 'sc.sev.' + k);
ESCALATIONS.forEach((e) => text(e, 'label', 'sc.esc.' + e.id));
CLASSES.forEach((c) => texts(c, 'sc.cls.' + c.id, ['label', 'hint']));
PRIORITIES.forEach((p) => text(p, 'label', 'sc.prio.' + p.id));
for (const k in MODELS) text(MODELS[k], 'model', 'sc.models.' + k);
CALENDAR.forEach((c) => texts(c, 'sc.cal.' + c.id, ['at', 'title', 'who', 'state', 'detail']));
ACCESS.forEach((a) => texts(a, 'sc.acc.' + a.id, ['who', 'door', 'note']));
NOISE.forEach((n) => text(n, 'text', 'sc.noise.n' + n.t));
RUNBOOKS.forEach((r) => texts(r, 'sc.rb.' + r.id, ['title', 'steps']));
FIELD_ACTIONS.forEach((f) => {
  texts(f, 'sc.fa.' + f.id, ['label', 'verb']);
  if (f.photo) text(f, 'photo', `sc.fa.${f.id}.photo`);
  if (f.authWhy) text(f, 'authWhy', `sc.fa.${f.id}.authWhy`);
});
ROUND_ITEMS.forEach((r) => texts(r, 'sc.round.' + r.id, ['title', 'where', 'why', 'finding', 'ref']));
TUTORIAL.forEach((x, i) => text(x, 'text', 'sc.tut.' + i));
INCIDENTS.forEach((inc) => {
  const B = 'sc.inc.' + inc.id;
  texts(inc, B, ['title', 'why', 'ref', 'hints']);
  text(inc.alert, 'text', B + '.alert');
  inc.actions.forEach((a) => text(a, 'text', `${B}.actions.${a.id}`));
  inc.guided.steps = inc.guided.steps.map((done, i) => { const s = { done }; texts(s, `${B}.steps.${i}`, ['label', 'text']); return s; });
  const oks = inc.guided.reflect;
  inc.guided.reflect = { options: oks.map((ok, i) => { const o = { ok }; text(o, 't', `${B}.reflect.options.${i}.t`); text(o, 'fb', `${B}.reflect.options.${i}.fb`); return o; }) };
  text(inc.guided.reflect, 'q', B + '.reflect.q');
});
