// Motor de simulación: estado de la sala, dinámica física simple,
// efectos de las decisiones e inspección de objetos.
import { RACKS, INCIDENTS, SHIFT, CLIENTS, modelOf, FIELD_ACTIONS } from './scenario.js';
import { t as tr } from './i18n/index.js';

const BASE = { R01: 21.6, R02: 21.9, R03: 22.1, R04: 22.0, R05: 21.8, R06: 22.3, R07: 22.0, R08: 22.0, R09: 21.7, R10: 21.5 };
const ROW_B = ['R06', 'R07', 'R08', 'R09', 'R10'];

export const fmt1 = (n) => n.toFixed(1).replace('.', ',');
export const clock = (t) => {
  const m = Math.floor(SHIFT.start + t);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};

/** sched: minuto de inicio de cada evento (por defecto, el del escenario). */
export function createWorld(sched) {
  const racks = {};
  for (const r of RACKS) {
    racks[r.id] = { temp: BASE[r.id], top: 0, pduA: 30 + (r.id.charCodeAt(2) % 5) * 3, pduB: 29 + (r.id.charCodeAt(2) % 4) * 3, rearOpen: false, gap: !!r.gap, sensorLoose: false, shutdown: false, warned27: false, warned32: false };
  }
  racks.R06.pduA = 31; racks.R06.pduB = 77;
  return {
    t: 0,
    racks,
    crac: { 1: { status: 'ok', cap: 55, off: false }, 2: { status: 'ok', cap: 55 } },
    ups: { A: { mode: 'online', load: 38, batt: 100 }, B: { mode: 'online', load: 41, batt: 100 } },
    leak: { active: false, radius: 0, contained: false, reached: false },
    flags: { n7psu: 'BB', breaker: false, crac1Boost: false, crac2Down: false, cable: false, techInRoom: false, powerCutUntil: -1, crac1OffUntil: -1, aisleOpen: false, tileLifted: false, trash: true },
    sched: sched || Object.fromEntries(INCIDENTS.map((i) => [i.id, i.at])),
    freeze: {}, // evento → true: no empeora (nivel Guiado con su ticket abierto)
    done: {}, // acción en sala → { t, auth }
    auth: {}, // acción restringida → { req, at, grant }
    authEvents: [], // respuestas del cliente pendientes de mostrar
    escReq: {}, // evento → true si se pidió autorización al cliente
    photos: [], // { id, label, t, inc }
    down: {}, // nombre de equipo -> minuto hasta el que está apagado (Infinity = indefinido)
    timers: [],
    impacts: [],
    sysAlerts: [], // alertas generadas por la dinámica (sin ticket)
    log: [],
    downMinutes: 0,
    maxTemp: 22.3,
  };
}

const TOTAL_DEVICES = RACKS.reduce((n, r) => n + r.devices.filter((d) => d.type !== 'patch').length, 0);
export { TOTAL_DEVICES };

function impact(w, text, sev = 'high') {
  w.impacts.push({ t: w.t, text, sev });
  w.log.push({ t: w.t, kind: 'impacto', text });
}
function sys(w, sev, host, text) {
  w.sysAlerts.push({ t: w.t, sev, host, text, id: 'S' + w.sysAlerts.length });
}
function later(w, delay, fn) {
  w.timers.push({ at: w.t + delay, fn });
}

export function readTop(w, id) {
  const r = w.racks[id];
  if (id === 'R04' && r.sensorLoose) return 34.2;
  return r.temp + 0.5 + r.top;
}
export function rackMaxInlet(w, id) {
  const r = w.racks[id];
  return r.temp + 0.5 + r.top; // temperatura real (no la del sensor suelto)
}

// --- Inicio de cada evento --------------------------------------------------
export function startIncident(w, inc) {
  switch (inc.id) {
    case 'E1': w.flags.techInRoom = true; break;
    case 'E2': w.racks.R04.sensorLoose = true; break;
    case 'E6': w.crac[2].status = 'alarm'; w.flags.crac2Down = true; break;
    case 'E7': w.leak.active = true; w.leak.radius = 0.18; break;
    default: break;
  }
}

// --- Dinámica por minuto de juego -----------------------------------------------
export function step(w, dt) {
  const t0 = w.t;
  w.t += dt;
  const t = w.t;

  // temporizadores
  const due = w.timers.filter((x) => x.at <= t);
  w.timers = w.timers.filter((x) => x.at > t);
  due.forEach((x) => x.fn(w));

  // E1: técnico del proveedor y disco degradado
  if (t0 < 98 && t >= 98) { w.flags.techInRoom = false; w.log.push({ t: 98, kind: 'sala', text: 'El técnico de Austral Storage Services terminó el reemplazo del disco de stg-02 y salió de la sala.' }); }

  // E2 sensor suelto: sin dinámica

  // E3 paneles ciegos faltantes en R08 → recirculación
  const r8 = w.racks.R08;
  const r8start = (w.sched.E3 ?? 70) - 30; // la recirculación empieza 30 min antes de la alerta
  if (r8.gap && t > r8start && !w.freeze.E3) r8.top = Math.min(7, Math.max(r8.top, 0.12 * (t - r8start)));
  else if (!r8.gap && r8.top > 0) r8.top = Math.max(0, r8.top - 0.3 * dt);

  // E4 carga de PDU-B en R06
  const r6 = w.racks.R06;
  if (w.sched.E4 !== undefined && w.flags.n7psu === 'BB' && !w.flags.breaker && !w.freeze.E4) { // sin E4 en el turno, la carga no cambia
    const e4 = w.sched.E4;
    r6.pduB = Math.max(r6.pduB, t < e4 ? 77 + 0.06 * t * (110 / e4) : 84 + 0.17 * (t - e4));
    if (r6.pduB >= 96) {
      w.flags.breaker = true; r6.pduB = 0; r6.pduA = 54;
      w.down['k8s-n7'] = Infinity;
      sys(w, 'disaster', 'PDU-R06-B', 'Disparo del interruptor de PDU-B en R06: k8s-n7 sin energía');
      impact(w, 'Se disparó el interruptor de PDU-B en R06: k8s-n7 quedó sin energía y el resto del rack, sin respaldo.', 'disaster');
    }
  }

  // E5 autoprueba UPS-A
  const ua = w.ups.A;
  const u0 = w.sched.E5;
  if (t >= u0 && t < u0 + 15) { ua.mode = 'battery'; ua.batt = Math.max(90, 100 - (t - u0) * 0.5); }
  else if (t >= u0 + 15 && ua.mode === 'battery') { ua.mode = 'online'; w.log.push({ t, kind: 'sala', text: 'UPS-A terminó la autoprueba de baterías y volvió a operar en línea.' }); }
  else if (ua.mode === 'online' && ua.batt < 100) ua.batt = Math.min(100, ua.batt + 0.2 * dt);

  // E6 climatización
  const crac1Off = t < w.flags.crac1OffUntil;
  for (const r of Object.keys(w.racks)) {
    const rk = w.racks[r];
    let rate = 0;
    if (w.flags.crac2Down && !w.freeze.E6) rate += ROW_B.includes(r) ? 0.22 : 0.05;
    if (crac1Off) rate += ROW_B.includes(r) ? 0.05 : 0.22;
    if (rate > 0 && w.flags.crac1Boost && !crac1Off) rate *= 0.45;
    if (rate > 0) rk.temp += rate * dt;
    else if (rk.temp > BASE[r]) rk.temp = Math.max(BASE[r], rk.temp - 0.18 * dt);
    const real = rackMaxInlet(w, r);
    w.maxTemp = Math.max(w.maxTemp, real);
    if (real >= 27 && !rk.warned27) { rk.warned27 = true; sys(w, 'warning', 'ENV-' + r + '-IN', `Temperatura de entrada sobre 27 °C en ${r}`); }
    if (real < 26) rk.warned27 = false;
    if (real >= 32 && !rk.shutdown) {
      rk.shutdown = true;
      sys(w, 'disaster', 'ENV-' + r + '-IN', `Apagado térmico de equipos en ${r} (entrada ${fmt1(real)} °C)`);
      impact(w, `Los equipos de ${r} se apagaron por protección térmica (entrada sobre 32 °C).`, 'disaster');
    }
    if (rk.shutdown && real < 26) { rk.shutdown = false; w.log.push({ t, kind: 'sala', text: `Los equipos de ${r} volvieron a encender tras normalizarse la temperatura.` }); }
  }

  // E7 fuga
  const lk = w.leak;
  if (lk.active) {
    if (!lk.contained && !w.freeze.E7) lk.radius = Math.min(1.2, lk.radius + 0.025 * dt);
    if (!lk.contained && !lk.reached && lk.radius >= 0.18 + 0.025 * 40) {
      lk.reached = true;
      impact(w, 'El agua alcanzó la canalización eléctrica bajo el piso técnico.', 'disaster');
      sys(w, 'disaster', 'LEAK-Z3', 'Líquido en contacto con la canalización eléctrica · Zona 3');
    }
  }

  // E8 puerta de R02
  const d0 = w.sched.E8 - 14; // la puerta se abre 14 min antes de la alerta
  if (t0 < d0 && t >= d0 && !w.flags.r02Secured) { w.racks.R02.rearOpen = true; w.flags.cable = true; }

  // respuestas del cliente a las solicitudes de autorización
  for (const id in w.auth) {
    const a = w.auth[id];
    if (a.grant === null && t >= a.at) {
      const fa = FIELD_ACTIONS.find((f) => f.id === id);
      a.grant = !!fa.auth.grant;
      w.authEvents.push({ id, grant: a.grant, t });
      w.log.push({ t, kind: 'sala', text: (a.grant ? 'El cliente autorizó: ' : 'El cliente no autorizó: ') + fa.label.toLowerCase() + '.' });
    }
  }

  // disponibilidad
  let down = 0;
  for (const r of RACKS) for (const d of r.devices) if (d.type !== 'patch' && deviceState(w, r.id, d) === 'down') down++;
  w.downMinutes += down * dt;
}

export function deviceState(w, rackId, d) {
  if (w.t < w.flags.powerCutUntil) return 'down';
  const rk = w.racks[rackId];
  if (rk.shutdown && d.type !== 'patch') return 'down';
  const until = w.down[d.name];
  if (until !== undefined && w.t < until) return 'down';
  if (d.type === 'patch') return 'off';
  const real = rackMaxInlet(w, rackId);
  const isTop = d.u >= 32;
  const temp = isTop ? real : w.racks[rackId].temp;
  if (temp >= 30) return 'crit';
  if (d.name === 'stg-02' && w.t < 98) return 'warn';
  if (temp >= 27) return 'warn';
  if (d.name === 'k8s-n7' && w.flags.n7psu === 'BB' && w.flags.breaker) return 'down';
  return 'ok';
}

// --- Fuentes, PDU y datos de cada equipo ----------------------------------------
/** Rama de PDU a la que va cada fuente del equipo: ['A','B'], ['B','B'] o [] (sin fuentes). */
export function psuBranches(w, rackId, d) {
  if (d.type === 'patch') return [];
  if (d.name === 'k8s-n7') return w.flags.n7psu === 'BB' ? ['B', 'B'] : ['A', 'B'];
  return d.psu === 'BB' ? ['B', 'B'] : ['A', 'B'];
}
/** ¿Hay energía en esa rama de PDU del rack? */
export function branchPowered(w, rackId, branch) {
  if (w.t < w.flags.powerCutUntil) return false;
  if (branch === 'B' && rackId === 'R06' && w.flags.breaker) return false;
  return true;
}
export function pduLoad(w, rackId, branch) {
  const rk = w.racks[rackId];
  if (!branchPowered(w, rackId, branch)) return 0;
  return branch === 'A' ? rk.pduA : rk.pduB;
}
/** Datos fijos (ficticios) de un equipo: modelo, serie y dirección de gestión. */
export function deviceInfo(rackId, d) {
  const m = modelOf(d);
  const n = Number(rackId.slice(1));
  return {
    model: m.model, prof: m.prof, mgmt: m.mgmt,
    serial: 'CC' + String(n).padStart(2, '0') + '-' + String(d.u).padStart(2, '0') + d.name.length + 'K' + ((n * 7 + d.u * 3) % 10),
    ip: m.mgmt ? `10.40.${n}.${10 + d.u}` : null,
  };
}
export function findDevice(rackId, name) {
  const def = RACKS.find((r) => r.id === rackId);
  return def ? def.devices.find((d) => d.name === name) : null;
}

// --- Acciones en sala -------------------------------------------------------------------
export const fieldById = (id) => FIELD_ACTIONS.find((f) => f.id === id);
const done = (w, id) => !!w.done[id];

/** ¿Se puede ejecutar ahora la acción en sala? (según el estado de la sala) */
export function fieldAvailable(w, fa) {
  const f = w.flags, r = w.racks;
  switch (fa.id) {
    case 'tech-escort': return f.techInRoom && !done(w, fa.id);
    case 'stg02-off': return !done(w, fa.id) && f.techInRoom;
    case 'sensor-fix': return r.R04.sensorLoose;
    case 'r04-hosts-off': return !done(w, fa.id) && r.R04.sensorLoose;
    case 'crac-100': return !done(w, fa.id);
    case 'blank-install': return r.R08.gap;
    case 'setpoint-16': return !done(w, fa.id);
    case 'aisle-open': return !f.aisleOpen;
    case 'psu-move': return f.n7psu === 'BB' && !f.breaker;
    case 'n7-off': return !done(w, fa.id) && !(w.down['k8s-n7'] > w.t);
    case 'ups-bypass': return !done(w, fa.id);
    case 'crac1-boost': return !f.crac1Boost && !w.crac[1].off;
    case 'crac2-reset': return f.crac2Down && !done(w, fa.id);
    case 'tile-lift': return w.leak.active && !f.tileLifted;
    case 'absorbent': return w.leak.active && !w.leak.contained;
    case 'photo-leak': return w.leak.active && f.tileLifted && !done(w, fa.id);
    case 'crac1-off': return !w.crac[1].off && !done(w, fa.id);
    case 'photo-r02': return (r.R02.rearOpen || f.cable) && !done(w, fa.id);
    case 'door-secure': return r.R02.rearOpen;
    case 'cable-unplug': return f.cable;
    case 'fw01-reboot': return f.cable && !done(w, fa.id);
    case 'trash-remove': return f.trash;
    default: return false;
  }
}
/** Lista de acciones en sala de un objeto (kind/id del inspector). En la ficha de un rack
 *  aparecen también las de sus equipos. */
export function fieldActionsFor(kind, id) {
  return FIELD_ACTIONS.filter((fa) => fa.on.some((o) => (o.kind === kind && o.id === id) || (kind === 'rack' && o.kind === 'device' && o.id.startsWith(id + '/'))));
}
export function authState(w, id) { return w.auth[id] || null; }
export function requestAuth(w, fa) {
  if (w.auth[fa.id]) return false;
  w.auth[fa.id] = { req: w.t, at: w.t + fa.auth.after, grant: null };
  w.escReq[fa.inc] = true;
  w.log.push({ t: w.t, kind: 'sala', text: 'Solicitud de autorización al cliente: ' + fa.label.toLowerCase() + '.' });
  return true;
}

/** Efecto de completar una acción en sala. Devuelve la foto creada, si corresponde. */
export function doField(w, fa) {
  const a = w.auth[fa.id];
  const authorized = !!(a && a.grant);
  w.done[fa.id] = { t: w.t, auth: authorized };
  const L = (text) => w.log.push({ t: w.t, kind: 'sala', text });
  const f = w.flags;
  switch (fa.id) {
    case 'tech-escort': L('Acompañaste al técnico de Austral Storage Services en R07 durante el reemplazo del disco.'); break;
    case 'stg02-off': w.down['stg-02'] = w.t + 25; impact(w, 'Apagaste stg-02 (Logística Austral) sin autorización: 25 minutos fuera de servicio.'); break;
    case 'sensor-fix': w.racks.R04.sensorLoose = false; L('Sensor superior de entrada de R04 reubicado y fijado: marca ' + fmt1(w.racks.R04.temp + 0.5) + ' °C.'); break;
    case 'r04-hosts-off': ['vm-host01', 'vm-host02', 'vm-host03', 'vm-host04'].forEach((n) => (w.down[n] = w.t + 30)); impact(w, 'Apagaste los hosts de virtualización de R04 por una lectura errónea: 30 minutos de servicio caído para Fintech Pehuén.'); break;
    case 'crac-100': impact(w, 'Los CRAC funcionaron al 100 % sin necesidad: mayor consumo de energía (peor PUE).', 'warning'); break;
    case 'blank-install': w.racks.R08.gap = false; L('Paneles ciegos instalados en R08 (U30–U34).'); break;
    case 'setpoint-16': impact(w, 'Setpoint de los CRAC bajado a 16 °C sin necesidad: mayor consumo de energía.', 'warning'); break;
    case 'aisle-open': f.aisleOpen = true; impact(w, 'Se abrió la contención del pasillo frío: mezcla de aire y pérdida de eficiencia.', 'average'); break;
    case 'psu-move':
      f.n7psu = 'AB'; w.racks.R06.pduB = 47; w.racks.R06.pduA = 49;
      if (authorized) L('Con autorización de Fintech Pehuén, PSU1 de k8s-n7 movida a PDU-A. Carga B: 47 %.');
      else { w.down['k8s-n7'] = w.t + 6; impact(w, 'Desconectaste la PSU1 de k8s-n7 sin autorización: el nodo se reinició y el cliente presentó un reclamo.'); }
      break;
    case 'n7-off': w.down['k8s-n7'] = Infinity; w.racks.R06.pduB = 70; impact(w, 'Apagaste k8s-n7, un equipo de producción del cliente, sin autorización.'); break;
    case 'ups-bypass': impact(w, 'UPS-A quedó en bypass: la carga estuvo sin protección durante la prueba.'); break;
    case 'crac1-boost': f.crac1Boost = true; w.crac[1].cap = 90; L('CRAC-1 subido al 90 % de capacidad.'); break;
    case 'crac2-reset': impact(w, 'Rearmaste el compresor de CRAC-2: con una alarma de alta presión, insistir lo daña y la reparación se retrasa.'); break;
    case 'tile-lift': f.tileLifted = true; L('Baldosa de la zona 3 levantada: hay agua de la bandeja de condensado de CRAC-1.'); break;
    case 'absorbent': w.leak.contained = true; L('Material absorbente colocado en la zona 3: el agua dejó de avanzar.'); break;
    case 'crac1-off': w.flags.crac1OffUntil = w.t + 30; w.crac[1].off = true; later(w, 30, (ww) => { ww.crac[1].off = false; }); impact(w, 'Apagaste CRAC-1: la sala quedó con menos climatización durante 30 minutos.'); break;
    case 'door-secure':
      w.racks.R02.rearOpen = false; f.r02Secured = true;
      L('Puerta trasera de R02 asegurada.');
      break;
    case 'cable-unplug': f.cable = false; impact(w, 'Desconectaste el cable de consola: se alteró evidencia de un posible acceso no autorizado.', 'average'); break;
    case 'trash-remove': f.trash = false; L('Embalaje retirado del pasillo caliente, junto a R06.'); break;
    case 'fw01-reboot': w.down['fw-01'] = w.t + 10; impact(w, 'Reiniciaste fw-01 sin autorización: Retail Andino perdió conectividad 10 minutos y se perdieron registros volátiles.'); break;
    default: break;
  }
  if (fa.photo) {
    const photo = { id: 'foto:' + fa.id, label: fa.photo + ' (' + clock(w.t) + ')', t: w.t, inc: fa.inc };
    w.photos.push(photo);
    L(fa.photo + '.');
    return photo;
  }
  return null;
}

// --- Efectos de cerrar un ticket (solo lo declarativo: lo físico ocurrió en la sala) --------
export function applyClose(w, inc, ans) {
  const has = (a) => ans.actions.includes(a);
  const esc = (e) => ans.esc.includes(e);
  switch (inc.id) {
    case 'E1':
      if (has('a4')) impact(w, 'Se interrumpió un cambio aprobado (CHG-1042): el proveedor deberá reprogramar la visita.', 'average');
      break;
    case 'E5':
      if (has('a6')) impact(w, 'Se avisó a todos los clientes de un corte inexistente: 14 llamadas a la mesa de servicio.', 'average');
      break;
    case 'E6': {
      let delay = esc('clima') ? 25 : 70;
      if (done(w, 'crac2-reset')) delay += 60;
      later(w, delay, (ww) => { ww.flags.crac2Down = false; ww.crac[2].status = 'ok'; ww.log.push({ t: ww.t, kind: 'sala', text: 'Climatización reparó CRAC-2 (presostato y carga de refrigerante). Unidad operando.' }); });
      break;
    }
    case 'E7':
      if (has('a6')) { w.flags.powerCutUntil = w.t + 20; impact(w, 'Cortaste la energía de la sala: todos los equipos se apagaron durante 20 minutos.', 'disaster'); }
      if (esc('clima')) later(w, 12, (ww) => { ww.leak.active = false; ww.leak.contained = true; ww.log.push({ t: ww.t, kind: 'sala', text: 'Climatización destapó el drenaje de condensado de CRAC-1 y secó la zona 3.' }); });
      else later(w, 45, (ww) => { ww.leak.active = false; ww.log.push({ t: ww.t, kind: 'sala', text: 'Mantención detectó la fuga en su ronda y la contuvo.' }); });
      break;
    default: break;
  }
}

// --- Inspección de objetos en la sala ------------------------------------------
export function inspect(w, kind, id) {
  const t = w.t;
  if (kind === 'rack') {
    const def = RACKS.find((r) => r.id === id);
    const rk = w.racks[id];
    const top = readTop(w, id);
    const obs = [];
    const ipmiLo = rk.temp + 0.1, ipmiHi = rk.temp + 1.9;
    const readings = [
      ['Cliente', CLIENTS[def.client]],
      ['Entrada inferior', fmt1(rk.temp - 0.4) + ' °C', cls(rk.temp - 0.4)],
      ['Entrada media', fmt1(rk.temp) + ' °C', cls(rk.temp)],
      ['Entrada superior (sensor)', fmt1(top) + ' °C', cls(top)],
      ['Salida (trasera)', fmt1(rk.temp + 11.5 + rk.top * 0.3) + ' °C'],
      ['PDU-A', Math.round(rk.pduA) + ' %', rk.pduA >= 80 ? 'bad' : ''],
      ['PDU-B', w.flags.breaker && id === 'R06' ? 'DISPARADA' : Math.round(rk.pduB) + ' %', (rk.pduB >= 80 || (w.flags.breaker && id === 'R06')) ? 'bad' : ''],
      ['Puerta trasera', rk.rearOpen ? 'ABIERTA' : 'Cerrada', rk.rearOpen ? 'bad' : ''],
      ['Paneles ciegos', rk.gap ? 'Faltan U30–U34' : 'Completos', rk.gap ? 'warn' : ''],
    ];
    obs.push({ id: 'obs:' + id.toLowerCase() + '-ipmi', text: `Temperatura de entrada informada por IPMI de los servidores: ${fmt1(ipmiLo)}–${fmt1(ipmiHi)} °C.` });
    if (id === 'R04' && rk.sensorLoose) obs.push({ id: 'obs:r04-sensor', warn: true, text: 'El sensor superior de entrada está suelto: cuelga por el costado, hacia la parte trasera del rack.' });
    if (id === 'R08' && rk.gap) {
      obs.push({ id: 'obs:r08-blank', warn: true, text: 'Faltan paneles ciegos entre U30 y U34 en el frente del rack.' });
      if (t > 40) obs.push({ id: 'obs:r08-recirc', warn: true, text: 'Frente al hueco se siente aire tibio que viene desde la parte trasera.' });
    }
    if (id === 'R06') {
      obs.push({ id: 'obs:r06-pdu', warn: rk.pduB >= 80, text: `Pantallas de las PDU: A ${Math.round(rk.pduA)} % · B ${w.flags.breaker ? 'disparada' : Math.round(rk.pduB) + ' %'}.` });
      if (w.flags.n7psu === 'BB') obs.push({ id: 'obs:r06-psu', warn: true, text: 'k8s-n7 (U23–U24): PSU1 → PDU-B y PSU2 → PDU-B.' });
      obs.push({ id: 'obs:r06-label', text: 'Etiqueta en k8s-n7: «Instalado hoy 07:30 · CHG-1045».' });
      if (w.flags.trash) obs.push({ id: 'obs:r06-box', warn: true, text: 'Junto a R06, en el pasillo caliente, quedó una caja de cartón con el embalaje del equipo instalado hoy.' });
    }
    if (id === 'R07' && w.flags.techInRoom) obs.push({ id: 'obs:r07-tech', text: 'Técnico de Austral Storage Services (credencial P-0412) reemplazando el disco 3 de stg-02. El equipo sigue encendido.' });
    if (id === 'R02' && rk.rearOpen) obs.push({ id: 'obs:r02-door', warn: true, text: 'Puerta trasera abierta; la cerradura no muestra daños.' });
    if (id === 'R02' && w.flags.cable) obs.push({ id: 'obs:r02-cable', warn: true, text: 'Cable de consola azul conectado al puerto de consola de fw-01; no figura en el inventario del rack.' });
    if (obs.length === 1) obs.push({ id: 'obs:' + id.toLowerCase() + '-ok', text: 'Sin novedades visibles en la ronda.' });
    const devices = def.devices.map((d) => ({
      name: d.name, u: d.u, h: d.h, type: d.type,
      psu: psuBranches(w, id, d).join(' + ') || '—',
      state: deviceState(w, id, d),
    })).sort((a, b) => b.u - a.u);
    return { title: 'Rack ' + id, sub: 'Fila ' + def.row + ' · ' + CLIENTS[def.client], readings, obs, devices };
  }
  if (kind === 'crac') {
    const n = id === 'CRAC-1' ? 1 : 2;
    const c = w.crac[n];
    const obs = [];
    let readings;
    if (n === 2 && w.flags.crac2Down) {
      const sup = 18 + Math.min(10, (t - w.sched.E6) * 0.3);
      readings = [['Estado', 'ALARMA · compresor detenido', 'bad'], ['Ventiladores', 'En marcha'], ['Impulsión', fmt1(sup) + ' °C', 'bad'], ['Retorno', fmt1(31 + Math.min(5, (t - w.sched.E6) * 0.1)) + ' °C'], ['Zona que enfría', 'Fila B (R06–R10)']];
      obs.push({ id: 'obs:crac2-alarm', warn: true, text: 'Pantalla: «HP1 – High pressure compressor 1». Ventiladores en marcha, compresor detenido.' });
      obs.push({ id: 'obs:crac2-supply', warn: true, text: `Aire de impulsión a ${fmt1(sup)} °C (normal: 18 °C).` });
    } else if (n === 1 && c.off) {
      readings = [['Estado', 'DETENIDO', 'bad'], ['Zona que enfría', 'Fila A (R01–R05)']];
    } else {
      readings = [['Estado', 'Operando'], ['Capacidad', c.cap + ' %'], ['Impulsión', '18,0 °C'], ['Retorno', '30,5 °C'], ['Zona que enfría', n === 1 ? 'Fila A (R01–R05)' : 'Fila B (R06–R10)'], ['Alarmas', 'Ninguna']];
      if (n === 1) obs.push({ id: 'obs:crac1-ok', text: `CRAC-1 operando al ${c.cap} % de capacidad${c.cap < 90 ? ': tiene margen para subir' : ''}.` });
      else obs.push({ id: 'obs:crac2-ok', text: 'CRAC-2 operando sin alarmas.' });
    }
    if (n === 1 && w.leak.active) obs.push({ id: 'obs:crac1-tray', warn: true, text: 'La bandeja de condensado de CRAC-1 está llena hasta el borde.' });
    else if (n === 1 && !w.leak.contained && w.t < (w.sched.E7 ?? Infinity)) obs.push({ id: 'obs:crac1-tray-high', warn: true, text: 'La bandeja de condensado de CRAC-1 está casi llena y el drenaje corre lento.' });
    return { title: id, sub: 'Unidad de climatización de precisión', readings, obs };
  }
  if (kind === 'ups') {
    const u = w.ups[id.slice(-1)];
    const testing = id === 'UPS-A' && u.mode === 'battery';
    const readings = [
      ['Modo', testing ? 'EN BATERÍA (prueba)' : 'En línea', testing ? 'warn' : ''],
      ['Entrada de red', '221 V · normal'],
      ['Carga', u.load + ' %'],
      ['Batería', Math.round(u.batt) + ' %'],
      ['Autonomía estimada', testing ? '19 min' : '22 min'],
      ['Alimenta', id === 'UPS-A' ? 'Todas las PDU-A' : 'Todas las PDU-B'],
    ];
    const obs = [];
    if (testing) obs.push({ id: 'obs:upsa-test', warn: true, text: 'Pantalla: «Battery test in progress». Entrada de red: 221 V, normal.' });
    else obs.push({ id: 'obs:' + id.toLowerCase() + '-ok', text: `${id} en línea, sin alarmas.` });
    return { title: id, sub: 'Sistema de alimentación ininterrumpida', readings, obs };
  }
  if (kind === 'leak') {
    const a = w.leak.active;
    const readings = [['Sensor de fuga · Zona 3', a ? 'ALARMA' : 'Normal', a ? 'bad' : ''], ['Ubicación', 'Bajo el piso, junto a CRAC-1']];
    const obs = [];
    if (a && w.flags.tileLifted) {
      obs.push({ id: 'obs:leak-water', warn: true, text: 'Bajo la baldosa hay agua: viene de la bandeja de condensado de CRAC-1.' });
      obs.push({ id: 'obs:leak-cables', warn: true, text: 'La canalización de energía pasa a unos 40 cm del agua.' });
      if (w.leak.contained) obs.push({ id: 'obs:leak-contained', text: 'Material absorbente colocado: el agua ya no avanza.' });
    } else if (a) obs.push({ id: 'obs:leak-closed', warn: true, text: 'El sensor marca líquido, pero desde arriba no se ve: hay que levantar la baldosa para ver el origen.' });
    else obs.push({ id: 'obs:leak-ok', text: 'Piso técnico seco.' });
    return { title: 'Detección de fugas', sub: 'Cable sensor bajo el piso técnico', readings, obs };
  }
  if (kind === 'device') {
    const [rackId, name] = id.split('/');
    const def = RACKS.find((r) => r.id === rackId);
    const d = findDevice(rackId, name);
    if (!d) return null;
    const info = deviceInfo(rackId, d);
    const st = deviceState(w, rackId, d);
    const rk = w.racks[rackId];
    const stCls = { ok: '', warn: 'warn', crit: 'bad', down: 'bad', off: '' }[st];
    const range = d.h > 1 ? `U${d.u}–U${d.u + d.h - 1}` : `U${d.u}`;
    const readings = [
      [tr('device.model'), info.model],
      [tr('device.client'), CLIENTS[def.client]],
      [tr('device.location'), tr('device.locationVal', { rack: rackId, range })],
      [tr('device.serial'), info.serial],
    ];
    if (info.mgmt) readings.push([tr(info.mgmt === 'ipmi' ? 'device.ipmi' : 'device.mgmtIp'), info.ip]);
    readings.push([tr('device.state'), tr('device.st.' + st), stCls]);
    psuBranches(w, rackId, d).forEach((b, i) => {
      const ok = branchPowered(w, rackId, b);
      readings.push([tr('device.psu', { n: i + 1 }), tr(ok ? 'device.psuOk' : 'device.psuNoInput', { pdu: 'PDU-' + b }), ok ? '' : 'bad']);
    });
    if (info.mgmt === 'ipmi' && st !== 'down') {
      const inlet = d.u >= 32 ? rackMaxInlet(w, rackId) : rk.temp;
      readings.push([tr('device.inlet'), fmt1(inlet + 0.6) + ' °C', cls(inlet + 0.6)]);
    }
    const obs = [];
    if (d.name === 'k8s-n7' && w.flags.n7psu === 'BB') obs.push({ id: 'obs:r06-psu', warn: true, text: 'k8s-n7 (U23–U24): PSU1 → PDU-B y PSU2 → PDU-B.' });
    if (d.name === 'fw-01' && w.flags.cable) obs.push({ id: 'obs:r02-cable', warn: true, text: 'Cable de consola azul conectado al puerto de consola de fw-01; no figura en el inventario del rack.' });
    if (d.name === 'stg-02' && w.flags.techInRoom) obs.push({ id: 'obs:r07-tech', text: 'Técnico de Austral Storage Services (credencial P-0412) reemplazando el disco 3 de stg-02. El equipo sigue encendido.' });
    return { title: name, sub: tr('device.sub', { rack: rackId, range }), readings, obs, rack: rackId };
  }
  if (kind === 'pdu') {
    const [rackId, b] = id.split('/');
    const on = branchPowered(w, rackId, b);
    const load = pduLoad(w, rackId, b);
    const def = RACKS.find((r) => r.id === rackId);
    const fed = def.devices.filter((d) => psuBranches(w, rackId, d).includes(b)).map((d) => d.name);
    const readings = [
      [tr('pdu.state'), on ? tr('pdu.on') : tr('pdu.tripped'), on ? '' : 'bad'],
      [tr('pdu.load'), Math.round(load) + ' %', load >= 80 ? 'bad' : load >= 60 ? 'warn' : ''],
      [tr('pdu.feed'), b === 'A' ? 'UPS-A' : 'UPS-B'],
      [tr('pdu.devices'), fed.join(', ') || '—'],
    ];
    const obs = [];
    if (rackId === 'R06') obs.push({ id: 'obs:r06-pdu', warn: w.racks.R06.pduB >= 80, text: `Pantallas de las PDU: A ${Math.round(w.racks.R06.pduA)} % · B ${w.flags.breaker ? 'disparada' : Math.round(w.racks.R06.pduB) + ' %'}.` });
    return { title: `PDU-${b} · ${rackId}`, sub: tr('pdu.sub'), readings, obs, rack: rackId };
  }
  if (kind === 'acs') {
    return { title: 'Lector de acceso · Sala A', sub: 'Control de acceso, detección de humo y extintores junto a la puerta', readings: [['Lector de acceso', 'Operando'], ['VESDA (detección de humo)', 'Normal · sin alarmas'], ['Extintor de CO₂', 'Carga vencida (09/2026)', 'warn']], obs: [{ id: 'obs:fire-ext', warn: true, text: 'El extintor de CO₂ junto a la puerta tiene la carga vencida desde 09/2026.' }, { id: 'obs:vesda-ok', text: 'Panel VESDA en estado normal, sin alarmas ni fallas de flujo.' }], link: 'accesos' };
  }
  return null;
}

function cls(v) { return v >= 30 ? 'bad' : v >= 27 ? 'warn' : ''; }

export function rackSeverity(w, id, openIncidents) {
  let worst = 'ok';
  const rank = { ok: 0, info: 1, warning: 2, average: 3, high: 4, disaster: 5 };
  const bump = (s) => { if (rank[s] > rank[worst]) worst = s; };
  for (const inc of openIncidents) if (inc.rack === id) bump(inc.alert.sev);
  const real = rackMaxInlet(w, id);
  if (real >= 32 || w.racks[id].shutdown) bump('disaster');
  else if (real >= 27) bump('warning');
  if (id === 'R06' && w.flags.breaker) bump('disaster');
  return worst;
}

export { INCIDENTS };
