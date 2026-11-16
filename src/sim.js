// Motor de simulación: estado de la sala, dinámica física simple,
// efectos de las decisiones e inspección de objetos.
import { RACKS, INCIDENTS, SHIFT, CLIENTS, modelOf, FIELD_ACTIONS } from './scenario.js';
import { t as tr, msg, num, pct, tm, fmtNum, fmtPct } from './i18n/index.js';

const BASE = { R01: 21.6, R02: 21.9, R03: 22.1, R04: 22.0, R05: 21.8, R06: 22.3, R07: 22.0, R08: 22.0, R09: 21.7, R10: 21.5 };
const ROW_B = ['R06', 'R07', 'R08', 'R09', 'R10'];

export const fmt1 = (n) => fmtNum(n, 1); // 22,4 (es) / 22.4 (en)
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

// Bitácora, impactos y alertas del sistema guardan mensajes (clave + valores), no texto:
// se traducen al mostrarlos (ver i18n/index.js → tm).
function impact(w, key, sev = 'high', v) {
  const m = msg('sim.impact.' + key, v);
  w.impacts.push({ t: w.t, m, sev });
  w.log.push({ t: w.t, kind: 'impacto', m });
}
function sys(w, sev, host, key, v) {
  w.sysAlerts.push({ t: w.t, sev, host, m: msg('sim.sys.' + key, v), id: 'S' + w.sysAlerts.length });
}
const logm = (w, key, v, t = w.t) => w.log.push({ t, kind: 'sala', m: msg('sim.log.' + key, v) });
/** Observación de la ronda: id, mensaje y si se resalta. text se traduce al leerla. */
const O = (id, key, v, warn = false) => ({ id, warn, m: msg('insp.obs.' + key, v), get text() { return tm(this.m); } });
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
  if (t0 < 98 && t >= 98) { w.flags.techInRoom = false; logm(w, 'techLeft', null, 98); }

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
      sys(w, 'disaster', 'PDU-R06-B', 'breaker');
      impact(w, 'breaker', 'disaster');
    }
  }

  // E5 autoprueba UPS-A
  const ua = w.ups.A;
  const u0 = w.sched.E5;
  if (t >= u0 && t < u0 + 15) { ua.mode = 'battery'; ua.batt = Math.max(90, 100 - (t - u0) * 0.5); }
  else if (t >= u0 + 15 && ua.mode === 'battery') { ua.mode = 'online'; logm(w, 'upsTestEnd'); }
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
    if (real >= 27 && !rk.warned27) { rk.warned27 = true; sys(w, 'warning', 'ENV-' + r + '-IN', 'over27', { rack: r }); }
    if (real < 26) rk.warned27 = false;
    if (real >= 32 && !rk.shutdown) {
      rk.shutdown = true;
      sys(w, 'disaster', 'ENV-' + r + '-IN', 'thermal', { rack: r, temp: num(real) });
      impact(w, 'thermal', 'disaster', { rack: r });
    }
    if (rk.shutdown && real < 26) { rk.shutdown = false; logm(w, 'rackBackOn', { rack: r }); }
  }

  // E7 fuga
  const lk = w.leak;
  if (lk.active) {
    if (!lk.contained && !w.freeze.E7) lk.radius = Math.min(1.2, lk.radius + 0.025 * dt);
    if (!lk.contained && !lk.reached && lk.radius >= 0.18 + 0.025 * 40) {
      lk.reached = true;
      impact(w, 'leakReached', 'disaster');
      sys(w, 'disaster', 'LEAK-Z3', 'leakCables');
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
      w.log.push({ t, kind: 'sala', m: msg(a.grant ? 'field.authYes' : 'field.authNo', { label: msg('sc.fa.' + id + '.label') }) });
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
  logm(w, 'authReq', { label: msg('sc.fa.' + fa.id + '.label') });
  return true;
}

/** Efecto de completar una acción en sala. Devuelve la foto creada, si corresponde. */
export function doField(w, fa) {
  const a = w.auth[fa.id];
  const authorized = !!(a && a.grant);
  w.done[fa.id] = { t: w.t, auth: authorized };
  const L = (key, v) => logm(w, key, v);
  const f = w.flags;
  switch (fa.id) {
    case 'tech-escort': L('escort'); break;
    case 'stg02-off': w.down['stg-02'] = w.t + 25; impact(w, 'stg02Off'); break;
    case 'sensor-fix': w.racks.R04.sensorLoose = false; L('sensorFixed', { temp: num(w.racks.R04.temp + 0.5) }); break;
    case 'r04-hosts-off': ['vm-host01', 'vm-host02', 'vm-host03', 'vm-host04'].forEach((n) => (w.down[n] = w.t + 30)); impact(w, 'r04HostsOff'); break;
    case 'crac-100': impact(w, 'crac100', 'warning'); break;
    case 'blank-install': w.racks.R08.gap = false; L('blanks'); break;
    case 'setpoint-16': impact(w, 'setpoint16', 'warning'); break;
    case 'aisle-open': f.aisleOpen = true; impact(w, 'aisleOpen', 'average'); break;
    case 'psu-move':
      f.n7psu = 'AB'; w.racks.R06.pduB = 47; w.racks.R06.pduA = 49;
      if (authorized) L('psuMoved', { load: pct(47) });
      else { w.down['k8s-n7'] = w.t + 6; impact(w, 'psuNoAuth'); }
      break;
    case 'n7-off': w.down['k8s-n7'] = Infinity; w.racks.R06.pduB = 70; impact(w, 'n7Off'); break;
    case 'ups-bypass': impact(w, 'upsBypass'); break;
    case 'crac1-boost': f.crac1Boost = true; w.crac[1].cap = 90; L('crac1Boost', { cap: pct(90) }); break;
    case 'crac2-reset': impact(w, 'crac2Reset'); break;
    case 'tile-lift': f.tileLifted = true; L('tileLifted'); break;
    case 'absorbent': w.leak.contained = true; L('absorbent'); break;
    case 'crac1-off': w.flags.crac1OffUntil = w.t + 30; w.crac[1].off = true; later(w, 30, (ww) => { ww.crac[1].off = false; }); impact(w, 'crac1Off'); break;
    case 'door-secure':
      w.racks.R02.rearOpen = false; f.r02Secured = true;
      L('doorSecured');
      break;
    case 'cable-unplug': f.cable = false; impact(w, 'cableUnplug', 'average'); break;
    case 'trash-remove': f.trash = false; L('trashRemoved'); break;
    case 'fw01-reboot': w.down['fw-01'] = w.t + 10; impact(w, 'fw01Reboot'); break;
    default: break;
  }
  if (fa.photo) {
    const photo = { id: 'foto:' + fa.id, m: msg('sim.photoLabel', { label: msg('sc.fa.' + fa.id + '.photo'), time: clock(w.t) }), t: w.t, inc: fa.inc };
    w.photos.push(photo);
    L('photo', { label: msg('sc.fa.' + fa.id + '.photo') });
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
      if (has('a4')) impact(w, 'chgInterrupted', 'average');
      break;
    case 'E5':
      if (has('a6')) impact(w, 'falseOutage', 'average');
      break;
    case 'E6': {
      let delay = esc('clima') ? 25 : 70;
      if (done(w, 'crac2-reset')) delay += 60;
      later(w, delay, (ww) => { ww.flags.crac2Down = false; ww.crac[2].status = 'ok'; logm(ww, 'crac2Fixed'); });
      break;
    }
    case 'E7':
      if (has('a6')) { w.flags.powerCutUntil = w.t + 20; impact(w, 'powerCut', 'disaster'); }
      if (esc('clima')) later(w, 12, (ww) => { ww.leak.active = false; ww.leak.contained = true; logm(ww, 'leakFixed'); });
      else later(w, 45, (ww) => { ww.leak.active = false; logm(ww, 'leakMaint'); });
      break;
    default: break;
  }
}

// --- Inspección de objetos en la sala ------------------------------------------
export function inspect(w, kind, id) {
  const t = w.t;
  const C = (n) => fmt1(n) + ' °C';
  const done = (titleM, subM, readings, obs, extra = {}) => ({ titleM, title: tm(titleM), sub: tm(subM), readings, obs, ...extra });
  if (kind === 'rack') {
    const def = RACKS.find((r) => r.id === id);
    const rk = w.racks[id];
    const top = readTop(w, id);
    const obs = [];
    const ipmiLo = rk.temp + 0.1, ipmiHi = rk.temp + 1.9;
    const tripped = w.flags.breaker && id === 'R06';
    const readings = [
      [tr('insp.rack.client'), CLIENTS[def.client]],
      [tr('insp.rack.inLow'), C(rk.temp - 0.4), cls(rk.temp - 0.4)],
      [tr('insp.rack.inMid'), C(rk.temp), cls(rk.temp)],
      [tr('insp.rack.inTop'), C(top), cls(top)],
      [tr('insp.rack.outlet'), C(rk.temp + 11.5 + rk.top * 0.3)],
      ['PDU-A', fmtPct(Math.round(rk.pduA)), rk.pduA >= 80 ? 'bad' : ''],
      ['PDU-B', tripped ? tr('pdu.tripped') : fmtPct(Math.round(rk.pduB)), (rk.pduB >= 80 || tripped) ? 'bad' : ''],
      [tr('insp.rack.rearDoor'), rk.rearOpen ? tr('insp.rack.open') : tr('insp.rack.closed'), rk.rearOpen ? 'bad' : ''],
      [tr('insp.rack.blanks'), rk.gap ? tr('insp.rack.blanksMissing') : tr('insp.rack.blanksOk'), rk.gap ? 'warn' : ''],
    ];
    obs.push(O('obs:' + id.toLowerCase() + '-ipmi', 'ipmi', { lo: num(ipmiLo), hi: num(ipmiHi) }));
    if (id === 'R04' && rk.sensorLoose) obs.push(O('obs:r04-sensor', 'r04Sensor', null, true));
    if (id === 'R08' && rk.gap) {
      obs.push(O('obs:r08-blank', 'r08Blank', null, true));
      if (t > 40) obs.push(O('obs:r08-recirc', 'r08Recirc', null, true));
    }
    if (id === 'R06') {
      obs.push(r06PduObs(w));
      if (w.flags.n7psu === 'BB') obs.push(O('obs:r06-psu', 'r06Psu', null, true));
      obs.push(O('obs:r06-label', 'r06Label'));
      if (w.flags.trash) obs.push(O('obs:r06-box', 'r06Box', null, true));
    }
    if (id === 'R07' && w.flags.techInRoom) obs.push(O('obs:r07-tech', 'r07Tech'));
    if (id === 'R02' && rk.rearOpen) obs.push(O('obs:r02-door', 'r02Door', null, true));
    if (id === 'R02' && w.flags.cable) obs.push(O('obs:r02-cable', 'r02Cable', null, true));
    if (obs.length === 1) obs.push(O('obs:' + id.toLowerCase() + '-ok', 'rackOk'));
    const devices = def.devices.map((d) => ({
      name: d.name, u: d.u, h: d.h, type: d.type,
      psu: psuBranches(w, id, d).join(' + ') || '—',
      state: deviceState(w, id, d),
    })).sort((a, b) => b.u - a.u);
    return done(msg('rackView.title', { id }), msg('rackView.sub', { row: def.row, client: CLIENTS[def.client] }), readings, obs, { devices });
  }
  if (kind === 'crac') {
    const n = id === 'CRAC-1' ? 1 : 2;
    const c = w.crac[n];
    const obs = [];
    const zone = tr(n === 1 ? 'insp.crac.rowA' : 'insp.crac.rowB');
    let readings;
    if (n === 2 && w.flags.crac2Down) {
      const sup = 18 + Math.min(10, (t - w.sched.E6) * 0.3);
      readings = [[tr('insp.crac.state'), tr('insp.crac.alarm'), 'bad'], [tr('insp.crac.fans'), tr('insp.crac.running')], [tr('insp.crac.supply'), C(sup), 'bad'], [tr('insp.crac.return'), C(31 + Math.min(5, (t - w.sched.E6) * 0.1))], [tr('insp.crac.zone'), zone]];
      obs.push(O('obs:crac2-alarm', 'crac2Alarm', null, true));
      obs.push(O('obs:crac2-supply', 'crac2Supply', { temp: num(sup), normal: num(18) }, true));
    } else if (n === 1 && c.off) {
      readings = [[tr('insp.crac.state'), tr('insp.crac.stopped'), 'bad'], [tr('insp.crac.zone'), zone]];
    } else {
      readings = [[tr('insp.crac.state'), tr('insp.crac.operating')], [tr('insp.crac.capacity'), fmtPct(c.cap)], [tr('insp.crac.supply'), C(18)], [tr('insp.crac.return'), C(30.5)], [tr('insp.crac.zone'), zone], [tr('insp.crac.alarms'), tr('insp.crac.none')]];
      if (n === 1) obs.push(O('obs:crac1-ok', c.cap < 90 ? 'crac1OkMargin' : 'crac1Ok', { cap: pct(c.cap) }));
      else obs.push(O('obs:crac2-ok', 'crac2Ok'));
    }
    if (n === 1 && w.leak.active) obs.push(O('obs:crac1-tray', 'crac1Tray', null, true));
    else if (n === 1 && !w.leak.contained && w.t < (w.sched.E7 ?? Infinity)) obs.push(O('obs:crac1-tray-high', 'crac1TrayHigh', null, true));
    return done(id, msg('insp.crac.sub'), readings, obs);
  }
  if (kind === 'ups') {
    const u = w.ups[id.slice(-1)];
    const testing = id === 'UPS-A' && u.mode === 'battery';
    const readings = [
      [tr('insp.ups.mode'), testing ? tr('insp.ups.battTest') : tr('insp.ups.online'), testing ? 'warn' : ''],
      [tr('insp.ups.input'), tr('insp.ups.inputVal')],
      [tr('insp.ups.load'), fmtPct(u.load)],
      [tr('insp.ups.batt'), fmtPct(Math.round(u.batt))],
      [tr('insp.ups.runtime'), testing ? '19 min' : '22 min'],
      [tr('insp.ups.feeds'), tr(id === 'UPS-A' ? 'insp.ups.allA' : 'insp.ups.allB')],
    ];
    const obs = [];
    if (testing) obs.push(O('obs:upsa-test', 'upsTest', null, true));
    else obs.push(O('obs:' + id.toLowerCase() + '-ok', 'upsOk', { id }));
    return done(id, msg('insp.ups.sub'), readings, obs);
  }
  if (kind === 'leak') {
    const a = w.leak.active;
    const readings = [[tr('insp.leak.sensor'), a ? tr('insp.leak.alarm') : tr('insp.leak.normal'), a ? 'bad' : ''], [tr('insp.leak.location'), tr('insp.leak.locationVal')]];
    const obs = [];
    if (a && w.flags.tileLifted) {
      obs.push(O('obs:leak-water', 'leakWater', null, true));
      obs.push(O('obs:leak-cables', 'leakCables', null, true));
      if (w.leak.contained) obs.push(O('obs:leak-contained', 'leakContained'));
    } else if (a) obs.push(O('obs:leak-closed', 'leakClosed', null, true));
    else obs.push(O('obs:leak-ok', 'leakOk'));
    return done(msg('insp.leak.title'), msg('insp.leak.sub'), readings, obs);
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
      readings.push([tr('device.inlet'), C(inlet + 0.6), cls(inlet + 0.6)]);
    }
    const obs = [];
    if (d.name === 'k8s-n7' && w.flags.n7psu === 'BB') obs.push(O('obs:r06-psu', 'r06Psu', null, true));
    if (d.name === 'fw-01' && w.flags.cable) obs.push(O('obs:r02-cable', 'r02Cable', null, true));
    if (d.name === 'stg-02' && w.flags.techInRoom) obs.push(O('obs:r07-tech', 'r07Tech'));
    return done(name, msg('device.sub', { rack: rackId, range }), readings, obs, { rack: rackId });
  }
  if (kind === 'pdu') {
    const [rackId, b] = id.split('/');
    const on = branchPowered(w, rackId, b);
    const load = pduLoad(w, rackId, b);
    const def = RACKS.find((r) => r.id === rackId);
    const fed = def.devices.filter((d) => psuBranches(w, rackId, d).includes(b)).map((d) => d.name);
    const readings = [
      [tr('pdu.state'), on ? tr('pdu.on') : tr('pdu.tripped'), on ? '' : 'bad'],
      [tr('pdu.load'), fmtPct(Math.round(load)), load >= 80 ? 'bad' : load >= 60 ? 'warn' : ''],
      [tr('pdu.feed'), b === 'A' ? 'UPS-A' : 'UPS-B'],
      [tr('pdu.devices'), fed.join(', ') || '—'],
    ];
    const obs = [];
    if (rackId === 'R06') obs.push(r06PduObs(w));
    return done(`PDU-${b} · ${rackId}`, msg('pdu.sub'), readings, obs, { rack: rackId });
  }
  if (kind === 'acs') {
    const readings = [[tr('insp.acs.reader'), tr('insp.acs.readerVal')], [tr('insp.acs.vesda'), tr('insp.acs.vesdaVal')], [tr('insp.acs.ext'), tr('insp.acs.extVal'), 'warn']];
    return done(msg('insp.acs.title'), msg('insp.acs.sub'), readings, [O('obs:fire-ext', 'fireExt', null, true), O('obs:vesda-ok', 'vesdaOk')], { link: 'accesos' });
  }
  return null;
}

/** Pantallas de las PDU de R06 (aparece en la ficha del rack y en la de cada PDU). */
function r06PduObs(w) {
  const r = w.racks.R06;
  return O('obs:r06-pdu', 'r06Pdu', { a: pct(Math.round(r.pduA)), b: w.flags.breaker ? msg('insp.obs.tripped') : pct(Math.round(r.pduB)) }, r.pduB >= 80);
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
