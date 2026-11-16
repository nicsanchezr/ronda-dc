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
// proactive: 'id' → si esa acción en sala se hizo antes de la alerta, la alerta no salta y el
//                  ticket se crea como «Hallazgo proactivo» (sin SLA y con bonificación).
// ---------------------------------------------------------------------------

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
  },
];
