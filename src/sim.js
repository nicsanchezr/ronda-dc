// Motor de simulación: estado de la sala, dinámica física simple,
// efectos de las decisiones e inspección de objetos.
import { RACKS, INCIDENTS, SHIFT, CLIENTS, modelOf } from './scenario.js';
import { t as tr } from './i18n/index.js';

const BASE = { R01: 21.6, R02: 21.9, R03: 22.1, R04: 22.0, R05: 21.8, R06: 22.3, R07: 22.0, R08: 22.0, R09: 21.7, R10: 21.5 };
const ROW_B = ['R06', 'R07', 'R08', 'R09', 'R10'];

export const fmt1 = (n) => n.toFixed(1).replace('.', ',');
export const clock = (t) => {
  const m = Math.floor(SHIFT.start + t);
  return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
};

export function createWorld() {
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
    flags: { n7psu: 'BB', breaker: false, crac1Boost: false, crac2Down: false, cable: false, techInRoom: false, powerCutUntil: -1, crac1OffUntil: -1 },
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
  if (r8.gap && t > 40) r8.top = Math.min(7, 0.12 * (t - 40));
  else if (!r8.gap && r8.top > 0) r8.top = Math.max(0, r8.top - 0.3 * dt);

  // E4 carga de PDU-B en R06
  const r6 = w.racks.R06;
  if (w.flags.n7psu === 'BB' && !w.flags.breaker) {
    r6.pduB = t < 110 ? 77 + 0.06 * t : 84 + 0.17 * (t - 110);
    if (r6.pduB >= 96) {
      w.flags.breaker = true; r6.pduB = 0; r6.pduA = 54;
      w.down['k8s-n7'] = Infinity;
      sys(w, 'disaster', 'PDU-R06-B', 'Disparo del interruptor de PDU-B en R06: k8s-n7 sin energía');
      impact(w, 'Se disparó el interruptor de PDU-B en R06: k8s-n7 quedó sin energía y el resto del rack, sin respaldo.', 'disaster');
    }
  }

  // E5 autoprueba UPS-A
  const ua = w.ups.A;
  if (t >= 180 && t < 195) { ua.mode = 'battery'; ua.batt = Math.max(90, 100 - (t - 180) * 0.5); }
  else if (t >= 195 && ua.mode === 'battery') { ua.mode = 'online'; w.log.push({ t: 195, kind: 'sala', text: 'UPS-A terminó la autoprueba de baterías y volvió a operar en línea.' }); }
  else if (ua.mode === 'online' && ua.batt < 100) ua.batt = Math.min(100, ua.batt + 0.2 * dt);

  // E6 climatización
  const crac1Off = t < w.flags.crac1OffUntil;
  for (const r of Object.keys(w.racks)) {
    const rk = w.racks[r];
    let rate = 0;
    if (w.flags.crac2Down) rate += ROW_B.includes(r) ? 0.22 : 0.05;
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
    if (!lk.contained) lk.radius = Math.min(1.2, 0.18 + 0.025 * (t - 330));
    if (!lk.contained && !lk.reached && t >= 370) {
      lk.reached = true;
      impact(w, 'El agua alcanzó la canalización eléctrica bajo el piso técnico.', 'disaster');
      sys(w, 'disaster', 'LEAK-Z3', 'Líquido en contacto con la canalización eléctrica · Zona 3');
    }
  }

  // E8 puerta de R02
  if (t0 < 366 && t >= 366 && !w.flags.r02Secured) { w.racks.R02.rearOpen = true; w.flags.cable = true; }

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

// --- Efectos de cerrar un ticket ---------------------------------------------
export function applyClose(w, inc, ans) {
  const has = (a) => ans.actions.includes(a);
  const esc = (e) => ans.esc.includes(e);
  const L = (text) => w.log.push({ t: w.t, kind: 'sala', text });
  switch (inc.id) {
    case 'E1':
      if (has('a5')) { w.down['stg-02'] = w.t + 25; impact(w, 'Apagaste stg-02 (Logística Austral) sin autorización: 25 minutos fuera de servicio.'); }
      if (has('a4')) impact(w, 'Se interrumpió un cambio aprobado (CHG-1042): el proveedor deberá reprogramar la visita.', 'average');
      break;
    case 'E2':
      if (has('a2')) { w.racks.R04.sensorLoose = false; L('Sensor superior de entrada de R04 reubicado: marca ' + fmt1(w.racks.R04.temp + 0.5) + ' °C.'); }
      if (has('a5')) { ['vm-host01', 'vm-host02', 'vm-host03', 'vm-host04'].forEach((n) => (w.down[n] = w.t + 30)); impact(w, 'Apagaste los hosts de virtualización de R04 por una lectura errónea: 30 minutos de servicio caído para Fintech Pehuén.'); }
      if (has('a4')) impact(w, 'Los CRAC funcionaron al 100 % sin necesidad: mayor consumo de energía (peor PUE).', 'warning');
      break;
    case 'E3':
      if (has('a1')) { w.racks.R08.gap = false; L('Paneles ciegos instalados en R08 (U30–U34).'); }
      if (has('a5')) impact(w, 'Se abrió la contención del pasillo frío: mezcla de aire y pérdida de eficiencia.', 'warning');
      if (has('a4')) impact(w, 'Setpoint de los CRAC bajado a 16 °C sin necesidad: mayor consumo de energía.', 'warning');
      break;
    case 'E4':
      if (has('a4')) {
        w.flags.n7psu = 'AB'; w.racks.R06.pduB = 47; w.racks.R06.pduA = 49; w.down['k8s-n7'] = w.t + 6;
        impact(w, 'Desconectaste la PSU1 de k8s-n7 sin autorización: el nodo se reinició y el cliente presentó un reclamo.');
      } else if (has('a6')) {
        w.down['k8s-n7'] = Infinity; w.racks.R06.pduB = 70;
        impact(w, 'Apagaste k8s-n7, un equipo de producción del cliente, sin autorización.');
      } else if (has('a2') && esc('cliente')) {
        later(w, 15, (ww) => { if (!ww.flags.breaker) { ww.flags.n7psu = 'AB'; ww.racks.R06.pduB = 47; ww.racks.R06.pduA = 49; ww.log.push({ t: ww.t, kind: 'sala', text: 'Fintech Pehuén autorizó el cambio: PSU1 de k8s-n7 movida a PDU-A. Carga B: 47 %.' }); } });
      }
      break;
    case 'E5':
      if (has('a5')) impact(w, 'UPS-A quedó en bypass: la carga estuvo sin protección durante la prueba.');
      if (has('a6')) impact(w, 'Se avisó a todos los clientes de un corte inexistente: 14 llamadas a la mesa de servicio.', 'average');
      break;
    case 'E6': {
      if (has('a1')) { w.flags.crac1Boost = true; w.crac[1].cap = 90; L('CRAC-1 subido al 90 % de capacidad.'); }
      let delay = esc('clima') ? 25 : 70;
      if (has('a4')) { delay += 60; impact(w, 'Rearmaste CRAC-2 varias veces: el compresor se dañó y la reparación se retrasa.'); }
      if (has('a5')) impact(w, 'Se abrió la contención y la puerta de la sala: el aire caliente se mezcló con el frío.', 'average');
      later(w, delay, (ww) => { ww.flags.crac2Down = false; ww.crac[2].status = 'ok'; ww.log.push({ t: ww.t, kind: 'sala', text: 'Climatización reparó CRAC-2 (presostato y carga de refrigerante). Unidad operando.' }); });
      break;
    }
    case 'E7':
      if (has('a2')) w.leak.contained = true;
      if (has('a4')) { w.flags.crac1OffUntil = w.t + 30; w.crac[1].off = true; later(w, 30, (ww) => { ww.crac[1].off = false; }); impact(w, 'Apagaste CRAC-1: la sala quedó con menos climatización durante 30 minutos.'); }
      if (has('a6')) { w.flags.powerCutUntil = w.t + 20; impact(w, 'Cortaste la energía de la sala: todos los equipos se apagaron durante 20 minutos.', 'disaster'); }
      if (esc('clima')) later(w, 12, (ww) => { ww.leak.active = false; ww.leak.contained = true; ww.log.push({ t: ww.t, kind: 'sala', text: 'Climatización destapó el drenaje de condensado de CRAC-1 y secó la zona 3.' }); });
      else later(w, 45, (ww) => { ww.leak.active = false; ww.log.push({ t: ww.t, kind: 'sala', text: 'Mantención detectó la fuga en su ronda y la contuvo.' }); });
      break;
    case 'E8':
      if (has('a3')) { w.racks.R02.rearOpen = false; w.flags.r02Secured = true; L('Puerta trasera de R02 fotografiada y asegurada.'); }
      if (has('a4')) { w.flags.cable = false; impact(w, 'Desconectaste el cable de consola: se alteró evidencia de un posible acceso no autorizado.', 'average'); }
      if (has('a6')) { w.down['fw-01'] = w.t + 10; impact(w, 'Reiniciaste fw-01: Retail Andino perdió conectividad 10 minutos y se perdieron registros volátiles.'); }
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
      const sup = 18 + Math.min(10, (t - 255) * 0.3);
      readings = [['Estado', 'ALARMA · compresor detenido', 'bad'], ['Ventiladores', 'En marcha'], ['Impulsión', fmt1(sup) + ' °C', 'bad'], ['Retorno', fmt1(31 + Math.min(5, (t - 255) * 0.1)) + ' °C'], ['Zona que enfría', 'Fila B (R06–R10)']];
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
    if (a) {
      obs.push({ id: 'obs:leak-water', warn: true, text: 'Bajo la baldosa hay agua: viene de la bandeja de condensado de CRAC-1.' });
      obs.push({ id: 'obs:leak-cables', warn: true, text: 'La canalización de energía pasa a unos 40 cm del agua.' });
    } else obs.push({ id: 'obs:leak-ok', text: 'Piso técnico seco.' });
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
    return { title: 'Lector de acceso · Sala A', sub: 'Control de acceso con tarjeta', readings: [['Estado', 'Operando']], obs: [], link: 'accesos' };
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
