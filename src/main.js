import { INCIDENTS, NOISE, ACCESS, CALENDAR, RUNBOOKS, ESCALATIONS, CLASSES, PRIORITIES, SEV, SHIFT, RACKS, CLIENTS } from './scenario.js';
import { createWorld, step, startIncident, applyClose, inspect, rackSeverity, clock, fmt1, TOTAL_DEVICES, rackMaxInlet } from './sim.js';
import { createScene } from './scene3d.js';

const SEC_PER_MIN = 5; // segundos reales por minuto de juego a velocidad 1×
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let S;
function freshState() {
  return {
    world: createWorld(), running: false, speed: 1, mode: 'estado', tab: 'monitoreo',
    tickets: [], active: null, started: new Set(), sel: null, ended: false, modal: false,
    notes: [], lastMinute: -1, seenSys: 0,
  };
}

// ---------- Escena -----------------------------------------------------------
const scene = createScene($('#view3d'), {
  onPick(kind, id) { S.sel = { kind, id }; renderInspector(); },
  onHover(u, e) {
    const tip = $('#tip');
    if (!u) { tip.hidden = true; return; }
    const names = { rack: 'Rack ' + u.id, crac: u.id, ups: u.id, leak: 'Sensor de fuga · Zona 3', acs: 'Lector de acceso · Sala A' };
    tip.textContent = names[u.kind] || u.id;
    const r = $('#view3d').getBoundingClientRect();
    tip.style.left = e.clientX - r.left + 14 + 'px'; tip.style.top = e.clientY - r.top + 10 + 'px';
    tip.hidden = false;
  },
});

// ---------- Utilidades de estado ------------------------------------------------
const openTickets = () => S.tickets.filter((t) => t.closedAt == null);
const openIncidents = () => openTickets().map((t) => t.inc);
function sevMap() { const m = {}; RACKS.forEach((r) => (m[r.id] = rackSeverity(S.world, r.id, openIncidents()))); return m; }

function allAlerts() {
  const w = S.world, list = [];
  for (const inc of INCIDENTS) if (S.started.has(inc.id)) list.push({ t: inc.at, sev: inc.alert.sev, host: inc.alert.host, text: inc.alert.text, inc: inc.id, id: 'alert:' + inc.id });
  for (const n of NOISE) if (n.t <= w.t) list.push({ t: n.t, sev: 'info', host: n.host, text: n.text, id: 'alert:N' + n.t });
  for (const a of w.sysAlerts) list.push({ ...a, id: 'alert:' + a.id });
  return list.sort((a, b) => b.t - a.t);
}

function toast(html, sev = 'info', onClick) {
  const el = document.createElement('div');
  el.className = 'toast'; el.style.setProperty('--c', SEV[sev] ? SEV[sev].color : '#6b9bff');
  el.innerHTML = html;
  if (onClick) { el.style.cursor = 'pointer'; el.onclick = () => { onClick(); el.remove(); }; }
  $('#toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 5200);
  setTimeout(() => el.remove(), 5800);
}

// ---------- Bucle de tiempo -------------------------------------------------------
function advance(dt) {
  const w = S.world;
  let left = dt;
  while (left > 0) {
    const d = Math.min(0.25, left);
    step(w, d); left -= d;
    for (const inc of INCIDENTS) {
      if (!S.started.has(inc.id) && w.t >= inc.at) {
        S.started.add(inc.id);
        startIncident(w, inc);
        const tk = { id: 'TK-' + (101 + S.tickets.length), inc, openedAt: inc.at, ackAt: null, closedAt: null, evidence: [], answer: null, result: null };
        S.tickets.push(tk);
        w.log.push({ t: inc.at, kind: 'alerta', text: `${SEV[inc.alert.sev].label}: ${inc.alert.text} → ${tk.id}` });
        toast(`<b>${esc(SEV[inc.alert.sev].label)}</b> · ${esc(inc.alert.host)}<br>${esc(inc.alert.text)}<small>${tk.id} creado · clic para abrir</small>`, inc.alert.sev, () => openTicket(tk.id));
      }
    }
    while (S.seenSys < w.sysAlerts.length) {
      const a = w.sysAlerts[S.seenSys++];
      toast(`<b>${esc(SEV[a.sev].label)}</b> · ${esc(a.host)}<br>${esc(a.text)}`, a.sev);
    }
    if (w.t >= SHIFT.length) { endShift(); return; }
  }
}

let lastTs = performance.now();
setInterval(() => {
  const now = performance.now(); const real = (now - lastTs) / 1000; lastTs = now;
  if (!S.running || S.modal || S.ended) return;
  advance((real * S.speed) / SEC_PER_MIN);
  tickUI();
}, 100);

function tickUI() {
  const w = S.world;
  $('#clock').textContent = clock(w.t);
  $('#shiftbar i').style.width = Math.min(100, (w.t / SHIFT.length) * 100) + '%';
  scene.update(w, S.mode, sevMap());
  const m = Math.floor(w.t);
  if (m !== S.lastMinute) { S.lastMinute = m; renderPanel(); renderInspector(); renderSummary(); }
}

function skipToNext() {
  if (openTickets().length) { toast('Hay tickets abiertos: resuélvelos antes de adelantar el reloj.', 'warning'); return; }
  const next = INCIDENTS.find((i) => !S.started.has(i.id));
  const target = next ? next.at : SHIFT.length;
  const dt = Math.max(0, target - S.world.t);
  if (dt <= 0) return;
  advance(dt + 0.01);
  tickUI(); S.lastMinute = -1; tickUI();
}

// ---------- Panel lateral -------------------------------------------------------------
function attachBtn(id, label) {
  const tk = S.tickets.find((t) => t.id === S.active);
  const on = tk && !tk.closedAt && tk.evidence.some((e) => e.id === id);
  return `<button class="att ${on ? 'on' : ''}" data-act="attach" data-ev="${esc(id)}" data-label="${esc(label)}" title="${on ? 'Adjuntada al ticket activo' : 'Adjuntar al ticket activo'}" aria-label="Adjuntar como evidencia">${on ? '✓' : '📎'}</button>`;
}

function renderSummary() {
  const counts = { disaster: 0, high: 0, average: 0, warning: 0, info: 0 };
  openIncidents().forEach((i) => counts[i.alert.sev]++);
  const sev = sevMap();
  const affected = Object.values(sev).filter((s) => s !== 'ok').length;
  $('#summary').innerHTML = `
    <div class="big"><b>${TOTAL_DEVICES}</b> equipos monitoreados · <b>${RACKS.length}</b> racks</div>
    <div class="sevrow">${['disaster', 'high', 'average', 'warning', 'info'].map((k) => `<span><i style="background:${SEV[k].color}"></i>${SEV[k].label} <b>${counts[k]}</b></span>`).join('')}<span><i style="background:${SEV.ok.color}"></i>Racks OK <b>${RACKS.length - affected}</b></span></div>`;
}

function renderPanel() {
  const w = S.world, tab = S.tab;
  const nOpen = openTickets().length;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $('#tkbadge').textContent = nOpen || '';
  $('#tkbadge').hidden = !nOpen;
  const tk = S.tickets.find((t) => t.id === S.active);
  $('#activebar').innerHTML = tk && !tk.closedAt
    ? `Ticket activo: <b>${tk.id}</b> · ${esc(tk.inc.title)} · <span class="muted">adjunta evidencia con 📎</span>`
    : `<span class="muted">Sin ticket activo. Abre un ticket para adjuntar evidencia.</span>`;
  let h = '';
  if (tab === 'monitoreo') {
    const list = allAlerts();
    h = list.length ? list.map((a) => `
      <div class="row alert" style="--c:${SEV[a.sev].color}">
        <div class="when">${clock(a.t)}</div>
        <div class="body"><div class="host">${esc(a.host)} <span class="sev">${SEV[a.sev].label}</span></div><div>${esc(a.text)}</div>
        ${a.inc ? `<button class="link" data-act="open-inc" data-inc="${a.inc}">Ver ticket</button>` : ''}</div>
        ${attachBtn(a.id, clock(a.t) + ' · ' + a.host + ' · ' + a.text)}
      </div>`).join('') : '<p class="empty">Sin alertas todavía. Haz una ronda por la sala mientras tanto.</p>';
  } else if (tab === 'tickets') {
    h = S.tickets.length ? S.tickets.slice().reverse().map((t) => {
      const st = t.closedAt != null ? 'Cerrado' : t.ackAt != null ? 'En curso' : 'Nuevo';
      const age = Math.floor((t.closedAt ?? w.t) - t.openedAt);
      return `<div class="row ticket ${t.id === S.active ? 'sel' : ''}" data-act="open" data-tk="${t.id}" style="--c:${SEV[t.inc.alert.sev].color}" tabindex="0">
        <div class="when">${t.id}</div>
        <div class="body"><div class="host">${esc(t.inc.title)} <span class="chip ${st === 'Cerrado' ? 'done' : st === 'Nuevo' ? 'new' : ''}">${st}</span></div>
        <div class="muted">${esc(t.inc.alert.host)} · ${clock(t.openedAt)} · ${st === 'Cerrado' ? 'resuelto en ' + age + ' min · ' + t.result.total + ' pts' : 'abierto hace ' + age + ' min'}</div></div>
      </div>`;
    }).join('') : '<p class="empty">No hay tickets. Las alertas de Advertencia o superiores crean un ticket automáticamente.</p>';
    if (tk) h = ticketDetail(tk) + h;
  } else if (tab === 'cambios') {
    h = '<p class="hint">Cambios y mantenimientos registrados para la sala. Todo trabajo en sala debe tener uno aprobado y vigente.</p>' + CALENDAR.map((c) => `
      <div class="row cal"><div class="when mono">${esc(c.id)}</div><div class="body">
        <div class="host">${esc(c.title)} <span class="chip">${esc(c.state)}</span></div>
        <div class="muted">${esc(c.at)} · ${esc(c.who)}</div><div class="small">${esc(c.detail)}</div></div>
        ${attachBtn('cal:' + c.id, c.id + ' · ' + c.title)}</div>`).join('');
  } else if (tab === 'accesos') {
    const list = ACCESS.filter((a) => a.t <= w.t).sort((a, b) => b.t - a.t);
    h = '<p class="hint">Registro del control de acceso de Sala A.</p>' + list.map((a) => `
      <div class="row acc"><div class="when">${clock(a.t)}</div><div class="body">
        <div class="host">${esc(a.who)}</div><div class="muted">Tarjeta ${esc(a.card)} · ${esc(a.door)} · ${esc(a.note)}</div></div>
        ${attachBtn('acc:' + a.id, clock(a.t) + ' · ' + a.who + ' · ' + a.card + ' · ' + a.note)}</div>`).join('');
  } else if (tab === 'runbooks') {
    h = RUNBOOKS.map((r) => `<details class="rb"><summary><b>${r.id}</b> ${esc(r.title)}</summary><ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>`).join('');
  } else if (tab === 'bitacora') {
    const entries = [...w.log, ...S.notes].sort((a, b) => b.t - a.t);
    h = `<form id="noteform" class="noteform"><input id="noteinput" placeholder="Escribe una nota en la bitácora…" autocomplete="off"><button>Agregar</button></form>` +
      (entries.length ? entries.map((e) => `<div class="row log ${e.kind}"><div class="when">${clock(e.t)}</div><div class="body">${e.kind === 'impacto' ? '<b>Impacto:</b> ' : e.kind === 'nota' ? '<b>Nota:</b> ' : ''}${esc(e.text)}</div></div>`).join('') : '<p class="empty">La bitácora está vacía.</p>');
  }
  const pane = $('#pane');
  const keep = pane.scrollTop;
  const focusNote = document.activeElement && document.activeElement.id === 'noteinput';
  const noteVal = focusNote ? document.activeElement.value : '';
  if (pane.dataset.tab === tab && pane._html === h) return;
  pane.dataset.tab = tab; pane._html = h;
  pane.innerHTML = h;
  pane.scrollTop = keep;
  if (focusNote) { const ni = $('#noteinput'); ni.value = noteVal; ni.focus(); }
}

function ticketDetail(tk) {
  const closed = tk.closedAt != null;
  return `<div class="detail" style="--c:${SEV[tk.inc.alert.sev].color}">
    <div class="dh"><span><b>${tk.id}</b> · ${esc(tk.inc.title)}</span><button class="x" data-act="close-detail" aria-label="Cerrar detalle">×</button></div>
    <div class="muted">${clock(tk.openedAt)} · ${esc(tk.inc.alert.host)} · ${SEV[tk.inc.alert.sev].label}</div>
    <p>${esc(tk.inc.alert.text)}</p>
    <div class="evh">Evidencia adjunta (${tk.evidence.length})</div>
    ${tk.evidence.length ? `<ul class="evl">${tk.evidence.map((e) => `<li>${esc(e.label)}${closed ? '' : ` <button class="link" data-act="detach" data-ev="${esc(e.id)}">quitar</button>`}</li>`).join('')}</ul>` : '<p class="muted small">Aún no adjuntas evidencia. Inspecciona la sala (clic en racks, CRAC, UPS, piso) y revisa Monitoreo, Cambios y Accesos.</p>'}
    ${closed ? `<button class="btn ghost" data-act="review" data-tk="${tk.id}">Ver corrección (${tk.result.total} pts)</button>` : `<button class="btn" data-act="resolve" data-tk="${tk.id}">Resolver y cerrar ticket…</button>`}
  </div>`;
}

function openTicket(id) {
  const tk = S.tickets.find((t) => t.id === id); if (!tk) return;
  if (tk.ackAt == null) tk.ackAt = S.world.t;
  S.active = id; S.tab = 'tickets';
  if (tk.inc.rack) { scene.focus('rack', tk.inc.rack); }
  else if (tk.inc.object === 'CRAC-2') scene.focus('crac', 'CRAC-2');
  else if (tk.inc.object === 'UPS-A') scene.focus('ups', 'UPS-A');
  else if (tk.inc.object === 'LEAK') scene.focus('leak', 'LEAK-Z3');
  renderPanel(); $('#pane').scrollTop = 0;
}

// ---------- Inspector -------------------------------------------------------------------
function renderInspector() {
  const box = $('#inspector');
  if (!S.sel) { box.hidden = true; return; }
  const d = inspect(S.world, S.sel.kind, S.sel.id);
  if (!d) { box.hidden = true; return; }
  box.hidden = false;
  const LED = { ok: '#30c48d', warn: '#f5c518', crit: '#e5484d', down: '#3a3f4a', off: '#3a3f4a' };
  const STL = { ok: 'OK', warn: 'Advertencia', crit: 'Crítico', down: 'Apagado', off: '—' };
  const keep = box.querySelector('.ib') ? box.querySelector('.ib').scrollTop : 0;
  const html = `<div class="ih"><div><b>${esc(d.title)}</b><div class="muted small">${esc(d.sub)}</div></div><button class="x" data-act="close-insp" aria-label="Cerrar inspector">×</button></div>
  <div class="ib">
    <table class="rd">${d.readings.map(([k, v, c]) => `<tr><td>${esc(k)}</td><td class="${c || ''}">${esc(v)}</td></tr>`).join('')}</table>
    ${d.obs.length ? `<div class="evh">Observaciones de la ronda</div>${d.obs.map((o) => `<div class="obs ${o.warn ? 'w' : ''}"><span>${esc(o.text)}</span>${attachBtn(o.id, d.title + ': ' + o.text)}</div>`).join('')}` : ''}
    ${d.devices ? `<div class="evh">Equipos (frente)</div><table class="dv"><tr><th>U</th><th>Equipo</th><th>Fuentes</th><th>Estado</th></tr>${d.devices.map((x) => `<tr><td class="mono">${x.u}${x.h > 1 ? '–' + (x.u + x.h - 1) : ''}</td><td>${esc(x.name)}</td><td class="mono ${x.psu === 'B + B' ? 'warn' : ''}">${x.psu}</td><td><i class="dot" style="background:${LED[x.state]}"></i>${STL[x.state]}</td></tr>`).join('')}</table>` : ''}
    ${d.link ? `<button class="btn ghost" data-act="tab" data-tab="${d.link}">Ver registro de accesos</button>` : ''}
  </div>`;
  if (box._html === html) return;
  box._html = html; box.innerHTML = html;
  if (box.querySelector('.ib')) box.querySelector('.ib').scrollTop = keep;
}

// ---------- Resolución y corrección ---------------------------------------------------------
function shuffleSeeded(arr, seed) {
  const a = arr.slice(); let s = seed;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 9301 + 49297) % 233280; const j = Math.floor((s / 233280) * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function openResolve(tkId) {
  const tk = S.tickets.find((t) => t.id === tkId);
  const inc = tk.inc;
  S.modal = true;
  const acts = shuffleSeeded(inc.actions, inc.at + 7);
  $('#modal').hidden = false;
  $('#modalbox').innerHTML = `<form id="resolveform">
    <div class="mh"><div><div class="muted small">${tk.id} · ${clock(tk.openedAt)} · ${esc(inc.alert.host)}</div><h2>${esc(inc.title)}</h2></div><button type="button" class="x" data-act="cancel-modal" aria-label="Cancelar">×</button></div>
    <p class="muted small">El reloj se detiene mientras completas el cierre. Evidencia adjunta: ${tk.evidence.length}.</p>
    <fieldset><legend>1. Clasificación</legend><div class="opts">${CLASSES.map((c) => `<label class="opt"><input type="radio" name="cls" value="${c.id}" required><span><b>${c.label}</b><small>${c.hint}</small></span></label>`).join('')}</div></fieldset>
    <fieldset><legend>2. Prioridad</legend><div class="opts four">${PRIORITIES.map((p) => `<label class="opt"><input type="radio" name="prio" value="${p.id}" required><span><b>${p.label}</b></span></label>`).join('')}</div></fieldset>
    <fieldset><legend>3. Acciones que realizas <small>(marca todas las que correspondan)</small></legend><div class="opts col">${acts.map((a) => `<label class="opt"><input type="checkbox" name="act" value="${a.id}"><span>${esc(a.text)}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>4. Escalamiento</legend><div class="opts col">${ESCALATIONS.map((e) => `<label class="opt"><input type="checkbox" name="esc" value="${e.id}"><span>${esc(e.label)}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>5. Nota para la bitácora <small>(opcional)</small></legend><textarea name="note" rows="2" placeholder="Qué viste, qué hiciste y qué queda pendiente"></textarea></fieldset>
    <div class="err" id="formerr"></div>
    <div class="mf"><button type="button" class="btn ghost" data-act="cancel-modal">Volver a investigar</button><button class="btn">Cerrar ticket</button></div>
  </form>`;
  const f = $('#resolveform');
  f.addEventListener('change', (e) => {
    if (e.target.name === 'esc') {
      const nadie = f.querySelector('input[name=esc][value=nadie]');
      if (e.target.value === 'nadie' && e.target.checked) f.querySelectorAll('input[name=esc]').forEach((i) => { if (i !== nadie) i.checked = false; });
      else if (e.target.checked) nadie.checked = false;
    }
  });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const ans = { cls: fd.get('cls'), prio: fd.get('prio'), actions: fd.getAll('act'), esc: fd.getAll('esc'), note: (fd.get('note') || '').trim() };
    if (!ans.actions.length) { $('#formerr').textContent = 'Marca al menos una acción.'; return; }
    if (!ans.esc.length) { $('#formerr').textContent = 'Indica el escalamiento (o «No escalar»).'; return; }
    closeTicket(tk, ans);
  });
}

function scoreTicket(tk, ans) {
  const inc = tk.inc, ex = inc.expected;
  const parts = [];
  const lbl = (arr, id) => (arr.find((x) => x.id === id) || {}).label || id;
  // clasificación
  parts.push({ dim: 'Clasificación', yours: lbl(CLASSES, ans.cls), exp: lbl(CLASSES, ex.cls), pts: ans.cls === ex.cls ? 25 : 0, max: 25 });
  // prioridad
  const pi = (p) => Number(p.slice(1));
  const dp = Math.abs(pi(ans.prio) - pi(ex.prio));
  parts.push({ dim: 'Prioridad', yours: ans.prio, exp: ex.prio, pts: dp === 0 ? 15 : dp === 1 ? 7 : 0, max: 15 });
  // escalamiento
  const E = ex.esc, A = ex.escAllowed || [];
  const hit = ans.esc.filter((x) => E.includes(x)).length;
  const extra = ans.esc.filter((x) => !E.includes(x) && !A.includes(x)).length;
  const escPts = Math.max(0, Math.round(20 * (hit / E.length) - 7 * extra));
  parts.push({ dim: 'Escalamiento', yours: ans.esc.map((x) => lbl(ESCALATIONS, x)).join(', '), exp: E.map((x) => lbl(ESCALATIONS, x)).join(', ') + (A.length ? ` (también válido: ${A.map((x) => lbl(ESCALATIONS, x)).join(', ')})` : ''), pts: escPts, max: 20 });
  // acciones
  const K = inc.actions.filter((a) => a.ok).map((a) => a.id);
  const chosen = inc.actions.filter((a) => ans.actions.includes(a.id));
  const crit = chosen.filter((a) => a.critical);
  const wrong = chosen.filter((a) => !a.ok && !a.critical);
  let actPts = Math.round(30 * (chosen.filter((a) => a.ok).length / K.length) - 10 * wrong.length);
  if (crit.length) actPts = 0;
  parts.push({ dim: 'Acciones', yours: chosen.map((a) => a.text).join(' · '), exp: inc.actions.filter((a) => a.ok).map((a) => a.text).join(' · '), pts: Math.max(0, actPts), max: 30, crit: crit.map((a) => a.text), wrong: wrong.map((a) => a.text) });
  // evidencia
  const evIds = tk.evidence.map((e) => e.id);
  const got = inc.evidence.filter((e) => evIds.includes(e));
  parts.push({ dim: 'Evidencia', yours: `${got.length} de ${inc.evidence.length} clave`, exp: inc.evidence.map(evLabel).join(' · '), pts: Math.round(10 * (got.length / inc.evidence.length)), max: 10, missing: inc.evidence.filter((e) => !evIds.includes(e)).map(evLabel) });
  // tiempos (SLA según la prioridad esperada)
  const P = PRIORITIES.find((p) => p.id === ex.prio);
  const ackT = (tk.ackAt ?? S.world.t) - tk.openedAt, resT = S.world.t - tk.openedAt;
  let pen = 0; const notes = [];
  if (ackT > P.ack) { pen += 5; notes.push(`Tomaste el ticket a los ${Math.round(ackT)} min (SLA ${ex.prio}: ${P.ack} min).`); }
  if (resT > P.res) { pen += 5; notes.push(`Lo cerraste a los ${Math.round(resT)} min (SLA ${ex.prio}: ${P.res} min).`); }
  const total = Math.max(0, parts.reduce((s, p) => s + p.pts, 0) - pen);
  return { parts, total, pen, notes, ackT, resT, critical: crit.length > 0 };
}

function evLabel(id) {
  if (id.startsWith('cal:')) { const c = CALENDAR.find((x) => 'cal:' + x.id === id); return c ? `${c.id} (calendario)` : id; }
  if (id.startsWith('acc:')) { const a = ACCESS.find((x) => 'acc:' + x.id === id); return a ? `Acceso ${clock(a.t)} · ${a.card}` : id; }
  const map = { 'obs:r04-sensor': 'Sensor suelto en R04', 'obs:r04-ipmi': 'Temperaturas IPMI de R04', 'obs:r08-blank': 'Paneles ciegos faltantes en R08', 'obs:r08-recirc': 'Recirculación en R08', 'obs:r06-psu': 'Fuentes de k8s-n7 en PDU-B', 'obs:r06-pdu': 'Lectura de PDU en R06', 'obs:upsa-test': 'Pantalla de UPS-A', 'obs:crac2-alarm': 'Alarma en CRAC-2', 'obs:crac1-ok': 'Capacidad disponible en CRAC-1', 'obs:leak-water': 'Origen del agua', 'obs:leak-cables': 'Distancia a la canalización eléctrica', 'obs:r02-door': 'Puerta de R02', 'obs:r02-cable': 'Cable de consola en fw-01' };
  return map[id] || id;
}

function closeTicket(tk, ans) {
  const res = scoreTicket(tk, ans);
  tk.answer = ans; tk.result = res; tk.closedAt = S.world.t;
  if (tk.ackAt == null) tk.ackAt = S.world.t;
  applyClose(S.world, tk.inc, ans);
  S.world.log.push({ t: S.world.t, kind: 'ticket', text: `${tk.id} cerrado (${tk.inc.title}): ${CLASSES.find((c) => c.id === ans.cls).label}, ${ans.prio}.` });
  if (ans.note) S.notes.push({ t: S.world.t, kind: 'nota', text: `${tk.id}: ${ans.note}` });
  showReview(tk);
}

function showReview(tk) {
  const r = tk.result, inc = tk.inc;
  S.modal = true;
  $('#modal').hidden = false;
  $('#modalbox').innerHTML = `<div class="mh"><div><div class="muted small">${tk.id} · corrección</div><h2>${esc(inc.title)}</h2></div><button type="button" class="x" data-act="close-modal" aria-label="Cerrar">×</button></div>
    <div class="score ${r.total >= 80 ? 'good' : r.total >= 50 ? 'mid' : 'bad'}"><b>${r.total}</b><span>/ 100</span>${r.critical ? '<em>Acción crítica</em>' : ''}</div>
    <table class="rev"><tr><th>Dimensión</th><th>Tu respuesta</th><th>Esperado</th><th>Pts</th></tr>
    ${r.parts.map((p) => `<tr><td>${p.dim}</td><td>${esc(p.yours || '—')}${p.crit && p.crit.length ? `<div class="bad small">Crítica: ${esc(p.crit.join(' · '))}</div>` : ''}${p.wrong && p.wrong.length ? `<div class="warn small">Incorrecta: ${esc(p.wrong.join(' · '))}</div>` : ''}${p.missing && p.missing.length ? `<div class="muted small">Faltó: ${esc(p.missing.join(' · '))}</div>` : ''}</td><td>${esc(p.exp)}</td><td class="mono">${p.pts}/${p.max}</td></tr>`).join('')}
    ${r.pen ? `<tr><td>Tiempos</td><td colspan="2">${esc(r.notes.join(' '))}</td><td class="mono">−${r.pen}</td></tr>` : ''}
    </table>
    <div class="why"><b>Por qué</b><p>${esc(inc.why)}</p><p class="muted small">Referencia: ${esc(inc.ref)}</p></div>
    <div class="mf"><button class="btn" data-act="close-modal">Continuar el turno</button></div>`;
}

function closeModal() { $('#modal').hidden = true; S.modal = false; lastTs = performance.now(); renderPanel(); renderInspector(); renderSummary(); scene.update(S.world, S.mode, sevMap()); }

// ---------- Fin de turno ---------------------------------------------------------------------
function metrics() {
  const closed = S.tickets.filter((t) => t.closedAt != null);
  const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const pts = INCIDENTS.reduce((s, inc) => { const t = S.tickets.find((x) => x.inc.id === inc.id); return s + (t && t.result ? t.result.total : 0); }, 0);
  const avail = 1 - S.world.downMinutes / (TOTAL_DEVICES * SHIFT.length);
  const slaOk = closed.filter((t) => !t.result.pen).length;
  return { closed: closed.length, total: INCIDENTS.length, pts, max: INCIDENTS.length * 100, mtta: avg(closed.map((t) => t.result.ackT)), mttr: avg(closed.map((t) => t.result.resT)), avail, slaOk, maxTemp: S.world.maxTemp, impacts: S.world.impacts };
}

function endShift() {
  if (S.ended) return;
  S.ended = true; S.running = false;
  const m = metrics();
  try { localStorage.setItem('turno-sala-ultimo', JSON.stringify({ pts: m.pts, max: m.max, fecha: new Date().toISOString().slice(0, 10) })); } catch (e) { /* sin almacenamiento */ }
  const pct = Math.round((m.pts / m.max) * 100);
  const nivel = pct >= 85 ? 'Listo para operar sala' : pct >= 65 ? 'Buen turno, con detalles por pulir' : pct >= 40 ? 'Necesita acompañamiento' : 'Turno complicado: repasa los runbooks';
  $('#endbox').innerHTML = `<h2>Fin del turno · ${clock(S.world.t)}</h2>
    <div class="endgrid">
      <div class="kpi"><b>${m.pts}</b><span>de ${m.max} pts · ${pct} %</span><em>${nivel}</em></div>
      <div class="kpi"><b>${m.closed}/${m.total}</b><span>tickets cerrados</span></div>
      <div class="kpi"><b>${m.slaOk}/${m.closed || 0}</b><span>dentro de SLA</span></div>
      <div class="kpi"><b>${Math.round(m.mtta)} min</b><span>MTTA (tiempo en tomar)</span></div>
      <div class="kpi"><b>${Math.round(m.mttr)} min</b><span>MTTR (tiempo en resolver)</span></div>
      <div class="kpi"><b>${(m.avail * 100).toFixed(2).replace('.', ',')} %</b><span>disponibilidad de equipos</span></div>
      <div class="kpi"><b>${fmt1(m.maxTemp)} °C</b><span>entrada máxima (ASHRAE: ≤ 27 °C)</span></div>
      <div class="kpi"><b>${m.impacts.length}</b><span>impactos en la operación</span></div>
    </div>
    ${m.impacts.length ? `<h3>Impactos</h3><ul class="imp">${m.impacts.map((i) => `<li><span class="mono">${clock(i.t)}</span> ${esc(i.text)}</li>`).join('')}</ul>` : '<p class="good">Sin impactos en la operación. Bien hecho.</p>'}
    <h3>Tickets</h3>
    <table class="rev">${INCIDENTS.map((inc) => { const t = S.tickets.find((x) => x.inc.id === inc.id); return `<tr><td class="mono">${t ? t.id : '—'}</td><td>${esc(inc.title)}</td><td>${!t ? 'No ocurrió' : t.result ? t.result.total + ' pts' : '<span class="bad">Sin cerrar</span>'}</td><td>${t && t.result ? `<button class="link" data-act="review" data-tk="${t.id}">corrección</button>` : ''}</td></tr>`; }).join('')}</table>
    <h3>Relevo de turno</h3>
    <p class="muted small">Escribe lo que el turno siguiente necesita saber: qué quedó abierto, qué vigilar, a quién se escaló.</p>
    <textarea id="relevo" rows="4" placeholder="Ej.: CRAC-2 reparado a las 13:05; vigilar temperatura de la fila B. Seguridad revisa el acceso de la tarjeta V-12…"></textarea>
    <div class="mf"><button class="btn ghost" data-act="restart">Repetir el turno</button><button class="btn ghost" id="dlbtn" data-act="download">Descargar informe (.md)</button><button class="btn" data-act="copy">Copiar informe</button></div>
    <p class="muted small" id="copymsg"></p>`;
  if (window.self !== window.top) $('#dlbtn').hidden = true;
  $('#end').hidden = false;
}

function report() {
  const m = metrics();
  const L = [];
  L.push('# Informe de turno · Turno de Sala', '', `Cordillera Colo · Sala A (SCL-1) · Operador N1 · ${new Date().toLocaleDateString('es-CL')}`, '');
  L.push(`**Puntaje:** ${m.pts} / ${m.max}  `, `**Tickets cerrados:** ${m.closed}/${m.total} · **Dentro de SLA:** ${m.slaOk}  `, `**MTTA:** ${Math.round(m.mtta)} min · **MTTR:** ${Math.round(m.mttr)} min  `, `**Disponibilidad de equipos:** ${(m.avail * 100).toFixed(2)} % · **Entrada máxima:** ${fmt1(m.maxTemp)} °C`, '');
  L.push('## Tickets', '');
  for (const t of S.tickets) {
    L.push(`### ${t.id} · ${t.inc.title} (${clock(t.openedAt)})`, '', `Alerta: ${t.inc.alert.host}: ${t.inc.alert.text}`, '');
    if (!t.result) { L.push('_Sin cerrar al terminar el turno._', ''); continue; }
    for (const p of t.result.parts) L.push(`- **${p.dim}** (${p.pts}/${p.max}): ${p.yours || '—'}`);
    if (t.evidence.length) L.push(`- **Evidencia adjunta:** ${t.evidence.map((e) => e.label).join(' | ')}`);
    if (t.answer.note) L.push(`- **Nota:** ${t.answer.note}`);
    L.push(`- **Total:** ${t.result.total}/100`, '', `> ${t.inc.why}`, '');
  }
  if (m.impacts.length) { L.push('## Impactos', ''); m.impacts.forEach((i) => L.push(`- ${clock(i.t)} · ${i.text}`)); L.push(''); }
  L.push('## Bitácora', '');
  [...S.world.log, ...S.notes].sort((a, b) => a.t - b.t).forEach((e) => L.push(`- ${clock(e.t)} · ${e.text}`));
  const rel = ($('#relevo') && $('#relevo').value.trim()) || '(sin relevo)';
  L.push('', '## Relevo de turno', '', rel, '');
  return L.join('\n');
}

// ---------- Eventos globales ------------------------------------------------------------------
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act;
  if (act === 'attach') {
    const tk = S.tickets.find((t) => t.id === S.active);
    if (!tk || tk.closedAt != null) { toast('Abre un ticket en la pestaña Tickets para adjuntar evidencia.', 'info'); return; }
    const id = b.dataset.ev;
    const i = tk.evidence.findIndex((x) => x.id === id);
    if (i >= 0) tk.evidence.splice(i, 1); else tk.evidence.push({ id, label: b.dataset.label });
    renderPanel(); renderInspector();
  } else if (act === 'detach') {
    const tk = S.tickets.find((t) => t.id === S.active); tk.evidence = tk.evidence.filter((x) => x.id !== b.dataset.ev); renderPanel(); renderInspector();
  } else if (act === 'open') openTicket(b.dataset.tk);
  else if (act === 'open-inc') { const tk = S.tickets.find((t) => t.inc.id === b.dataset.inc); if (tk) openTicket(tk.id); }
  else if (act === 'close-detail') { S.active = null; renderPanel(); }
  else if (act === 'resolve') openResolve(b.dataset.tk);
  else if (act === 'review') { const tk = S.tickets.find((t) => t.id === b.dataset.tk); if (S.ended) { $('#end').hidden = true; } showReview(tk); }
  else if (act === 'cancel-modal') closeModal();
  else if (act === 'close-modal') { closeModal(); if (S.ended) $('#end').hidden = false; }
  else if (act === 'close-insp') { S.sel = null; scene.select(null); renderInspector(); }
  else if (act === 'tab') { S.tab = b.dataset.tab; renderPanel(); }
  else if (act === 'restart') { location.hash = ''; boot(); $('#end').hidden = true; start(); }
  else if (act === 'copy') {
    try { await navigator.clipboard.writeText(report()); $('#copymsg').textContent = 'Informe copiado en Markdown.'; }
    catch (err) { $('#copymsg').textContent = 'No se pudo copiar automáticamente. Selecciona el texto del relevo y cópialo a mano.'; }
  } else if (act === 'download') {
    try { const blob = new Blob([report()], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'informe-turno-sala.md'; a.click(); } catch (err) { /* bloqueado */ }
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('.row.ticket')) openTicket(e.target.dataset.tk);
  if (e.key === 'Escape' && !$('#modal').hidden && $('#resolveform')) closeModal();
});
document.addEventListener('submit', (e) => {
  if (e.target.id === 'noteform') {
    e.preventDefault(); const v = $('#noteinput').value.trim(); if (!v) return;
    S.notes.push({ t: S.world.t, kind: 'nota', text: v }); $('#noteinput').value = ''; renderPanel(); $('#noteinput').focus();
  }
});
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { S.tab = b.dataset.tab; renderPanel(); $('#pane').scrollTop = 0; }));
document.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
  S.mode = b.dataset.mode; document.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', x === b));
  $('#legend').hidden = S.mode !== 'calor'; scene.update(S.world, S.mode, sevMap());
}));
document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => {
  S.speed = Number(b.dataset.speed); S.running = true; updateSpeedUI();
}));
$('#pause').addEventListener('click', () => { S.running = !S.running; updateSpeedUI(); });
$('#skip').addEventListener('click', skipToNext);
$('#endbtn').addEventListener('click', () => { if (S.ended) { $('#end').hidden = false; return; } const n = openTickets().length; if (n && !$('#endbtn').dataset.confirm) { $('#endbtn').dataset.confirm = '1'; $('#endbtn').textContent = `¿Terminar con ${n} abiertos?`; setTimeout(() => { $('#endbtn').textContent = 'Terminar turno'; delete $('#endbtn').dataset.confirm; }, 3000); return; } endShift(); });
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => scene.setView(b.dataset.view)));
$('#zin').addEventListener('click', () => scene.zoom(0.8));
$('#zout').addEventListener('click', () => scene.zoom(1.25));
$('#rot').addEventListener('click', () => $('#rot').classList.toggle('on', scene.toggleRotate()));
$('#search').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  const q = e.target.value.trim().toLowerCase(); if (!q) return;
  const r = RACKS.find((r) => r.id.toLowerCase() === q || r.devices.some((d) => d.name.includes(q)));
  if (r) { scene.focus('rack', r.id); S.sel = { kind: 'rack', id: r.id }; renderInspector(); }
  else if (q.startsWith('crac')) { const id = q.includes('2') ? 'CRAC-2' : 'CRAC-1'; scene.focus('crac', id); S.sel = { kind: 'crac', id }; renderInspector(); }
  else if (q.startsWith('ups')) { const id = q.includes('b') ? 'UPS-B' : 'UPS-A'; scene.focus('ups', id); S.sel = { kind: 'ups', id }; renderInspector(); }
  else toast('No encontré «' + esc(q) + '» en la sala.', 'info');
});

function updateSpeedUI() {
  document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('on', S.running && Number(b.dataset.speed) === S.speed));
  $('#pause').textContent = S.running ? '❚❚' : '▶';
  $('#pause').setAttribute('aria-label', S.running ? 'Pausar' : 'Reanudar');
  $('#clockwrap').classList.toggle('paused', !S.running);
}

function boot() {
  S = freshState();
  S.lastMinute = -1;
  $('#clock').textContent = clock(0);
  scene.update(S.world, S.mode, sevMap());
  renderPanel(); renderSummary(); renderInspector(); updateSpeedUI();
}

function start() {
  $('#intro').hidden = true;
  S.running = true; lastTs = performance.now(); updateSpeedUI();
  S.world.log.push({ t: 0, kind: 'sala', text: 'Inicio de turno. Relevo recibido sin pendientes.' });
  advance(0.01); tickUI();
}

$('#startbtn').addEventListener('click', start);
try { const last = JSON.parse(localStorage.getItem('turno-sala-ultimo') || 'null'); if (last) $('#lastrun').textContent = `Tu último turno: ${last.pts} de ${last.max} pts (${last.fecha}).`; } catch (e) { /* sin almacenamiento */ }
boot();
