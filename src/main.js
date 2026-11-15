import { INCIDENTS, NOISE, ACCESS, CALENDAR, RUNBOOKS, ESCALATIONS, CLASSES, PRIORITIES, SEV, SHIFT, RACKS, CLIENTS } from './scenario.js';
import { createWorld, step, startIncident, applyClose, inspect, rackSeverity, clock, fmt1, TOTAL_DEVICES, rackMaxInlet } from './sim.js';
import { createScene } from './scene3d.js';
import { t, applyI18n } from './i18n/index.js';

const SEC_PER_MIN = 5; // segundos reales por minuto de juego a velocidad 1×
const STORE_KEY = 'ronda-dc-ultimo';
const OLD_STORE_KEY = 'turno-sala-ultimo'; // nombre anterior del proyecto
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
  onOpenRack(id) { openRackView(id); },
  onDetail(id) { renderRackUI(id); },
  onHover(u, e) {
    const tip = $('#tip');
    if (!u) { tip.hidden = true; return; }
    const [rk, part] = String(u.id).split('/');
    const names = { rack: t('hover.rack', { id: u.id }), crac: u.id, ups: u.id, leak: t('hover.leak'), acs: t('hover.acs'), device: part, pdu: t('hover.pdu', { b: part, rack: rk }) };
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
        toast(`<b>${esc(SEV[inc.alert.sev].label)}</b> · ${esc(inc.alert.host)}<br>${esc(inc.alert.text)}<small>${t('ticket.created', { id: tk.id })}</small>`, inc.alert.sev, () => openTicket(tk.id));
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
  if (openTickets().length) { toast(t('ticket.openFirst'), 'warning'); return; }
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
  return `<button class="att ${on ? 'on' : ''}" data-act="attach" data-ev="${esc(id)}" data-label="${esc(label)}" title="${on ? t('ticket.attachOn') : t('ticket.attachOff')}" aria-label="${t('ticket.attachAria')}">${on ? '✓' : '📎'}</button>`;
}

function renderSummary() {
  const counts = { disaster: 0, high: 0, average: 0, warning: 0, info: 0 };
  openIncidents().forEach((i) => counts[i.alert.sev]++);
  const sev = sevMap();
  const affected = Object.values(sev).filter((s) => s !== 'ok').length;
  $('#summary').innerHTML = `
    <div class="big">${t('summary.devices', { devices: TOTAL_DEVICES, racks: RACKS.length })}</div>
    <div class="sevrow">${['disaster', 'high', 'average', 'warning', 'info'].map((k) => `<span><i style="background:${SEV[k].color}"></i>${SEV[k].label} <b>${counts[k]}</b></span>`).join('')}<span><i style="background:${SEV.ok.color}"></i>${t('summary.racksOk')} <b>${RACKS.length - affected}</b></span></div>`;
}

function renderPanel() {
  const w = S.world, tab = S.tab;
  const nOpen = openTickets().length;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  $('#tkbadge').textContent = nOpen || '';
  $('#tkbadge').hidden = !nOpen;
  const tk = S.tickets.find((t) => t.id === S.active);
  $('#activebar').innerHTML = tk && !tk.closedAt
    ? t('panel.activeTicket', { id: tk.id, title: esc(tk.inc.title) })
    : `<span class="muted">${t('panel.noActive')}</span>`;
  let h = '';
  if (tab === 'monitoreo') {
    const list = allAlerts();
    h = list.length ? list.map((a) => `
      <div class="row alert" style="--c:${SEV[a.sev].color}">
        <div class="when">${clock(a.t)}</div>
        <div class="body"><div class="host">${esc(a.host)} <span class="sev">${SEV[a.sev].label}</span></div><div>${esc(a.text)}</div>
        ${a.inc ? `<button class="link" data-act="open-inc" data-inc="${a.inc}">${t('panel.viewTicket')}</button>` : ''}</div>
        ${attachBtn(a.id, clock(a.t) + ' · ' + a.host + ' · ' + a.text)}
      </div>`).join('') : `<p class="empty">${t('panel.noAlerts')}</p>`;
  } else if (tab === 'tickets') {
    h = S.tickets.length ? S.tickets.slice().reverse().map((x) => {
      const st = x.closedAt != null ? 'closed' : x.ackAt != null ? 'open' : 'new';
      const stLabel = t({ closed: 'ticket.stClosed', open: 'ticket.stOpen', new: 'ticket.stNew' }[st]);
      const age = Math.floor((x.closedAt ?? w.t) - x.openedAt);
      return `<div class="row ticket ${x.id === S.active ? 'sel' : ''}" data-act="open" data-tk="${x.id}" style="--c:${SEV[x.inc.alert.sev].color}" tabindex="0">
        <div class="when">${x.id}</div>
        <div class="body"><div class="host">${esc(x.inc.title)} <span class="chip ${st === 'closed' ? 'done' : st === 'new' ? 'new' : ''}">${stLabel}</span></div>
        <div class="muted">${esc(x.inc.alert.host)} · ${clock(x.openedAt)} · ${st === 'closed' ? t('ticket.resolvedIn', { min: age, pts: x.result.total }) : t('ticket.openFor', { min: age })}</div></div>
      </div>`;
    }).join('') : `<p class="empty">${t('panel.noTickets')}</p>`;
    if (tk) h = ticketDetail(tk) + h;
  } else if (tab === 'cambios') {
    h = `<p class="hint">${t('panel.changesHint')}</p>` + CALENDAR.map((c) => `
      <div class="row cal"><div class="when mono">${esc(c.id)}</div><div class="body">
        <div class="host">${esc(c.title)} <span class="chip">${esc(c.state)}</span></div>
        <div class="muted">${esc(c.at)} · ${esc(c.who)}</div><div class="small">${esc(c.detail)}</div></div>
        ${attachBtn('cal:' + c.id, c.id + ' · ' + c.title)}</div>`).join('');
  } else if (tab === 'accesos') {
    const list = ACCESS.filter((a) => a.t <= w.t).sort((a, b) => b.t - a.t);
    h = `<p class="hint">${t('panel.accessHint')}</p>` + list.map((a) => `
      <div class="row acc"><div class="when">${clock(a.t)}</div><div class="body">
        <div class="host">${esc(a.who)}</div><div class="muted">${t('panel.accessRow', { card: esc(a.card), door: esc(a.door), note: esc(a.note) })}</div></div>
        ${attachBtn('acc:' + a.id, clock(a.t) + ' · ' + a.who + ' · ' + a.card + ' · ' + a.note)}</div>`).join('');
  } else if (tab === 'runbooks') {
    h = RUNBOOKS.map((r) => `<details class="rb"><summary><b>${r.id}</b> ${esc(r.title)}</summary><ol>${r.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol></details>`).join('');
  } else if (tab === 'bitacora') {
    const entries = [...w.log, ...S.notes].sort((a, b) => b.t - a.t);
    h = `<form id="noteform" class="noteform"><input id="noteinput" placeholder="${t('panel.notePlaceholder')}" autocomplete="off"><button>${t('panel.noteAdd')}</button></form>` +
      (entries.length ? entries.map((e) => `<div class="row log ${e.kind}"><div class="when">${clock(e.t)}</div><div class="body">${e.kind === 'impacto' ? `<b>${t('panel.logImpact')}</b> ` : e.kind === 'nota' ? `<b>${t('panel.logNote')}</b> ` : ''}${esc(e.text)}</div></div>`).join('') : `<p class="empty">${t('panel.logEmpty')}</p>`);
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
    <div class="dh"><span><b>${tk.id}</b> · ${esc(tk.inc.title)}</span><button class="x" data-act="close-detail" aria-label="${t('ticket.closeDetail')}">×</button></div>
    <div class="muted">${clock(tk.openedAt)} · ${esc(tk.inc.alert.host)} · ${SEV[tk.inc.alert.sev].label}</div>
    <p>${esc(tk.inc.alert.text)}</p>
    <div class="evh">${t('ticket.evidence', { n: tk.evidence.length })}</div>
    ${tk.evidence.length ? `<ul class="evl">${tk.evidence.map((e) => `<li>${esc(e.label)}${closed ? '' : ` <button class="link" data-act="detach" data-ev="${esc(e.id)}">${t('ticket.remove')}</button>`}</li>`).join('')}</ul>` : `<p class="muted small">${t('ticket.noEvidence')}</p>`}
    ${closed ? `<button class="btn ghost" data-act="review" data-tk="${tk.id}">${t('ticket.review', { pts: tk.result.total })}</button>` : `<button class="btn" data-act="resolve" data-tk="${tk.id}">${t('ticket.resolve')}</button>`}
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

// ---------- Vista de detalle del rack ------------------------------------------------------
// Paneles: entran deslizándose con fundido y salen igual (CSS .entering / .leaving).
// key identifica el contenido: si cambia, el panel vuelve a entrar en vez de cambiar de golpe.
function panelShow(el, key = '') {
  clearTimeout(el._t);
  const wasHidden = el.hidden || el.classList.contains('leaving');
  el.classList.remove('leaving');
  el.hidden = false;
  if (wasHidden || el._key !== key) {
    el._key = key;
    el.classList.remove('entering'); void el.offsetWidth; el.classList.add('entering');
  }
}
function panelHide(el) {
  if (el.hidden || el.classList.contains('leaving')) return;
  el._key = null;
  el.classList.remove('entering'); el.classList.add('leaving');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.hidden = true; el.classList.remove('leaving'); }, 230);
}

function openRackView(id, deviceName) {
  if (scene.busy) return;
  const sel = deviceName ? { kind: 'device', id: id + '/' + deviceName } : { kind: 'rack', id };
  const ok = scene.enterRack(id, () => {
    scene.select(sel.kind, sel.id);
    if (deviceName) scene.focusDevice(deviceName);
  });
  if (!ok) return;
  S.sel = sel;
  renderInspector();
}
function renderRackUI(id) {
  if (id) { panelShow($('#rackbar'), id); panelShow($('#rackleg'), 'leg'); panelHide($('.hintbar')); panelHide($('#legend')); }
  else { panelHide($('#rackbar')); panelHide($('#rackleg')); panelShow($('.hintbar'), 'hint'); if (S.mode === 'calor') panelShow($('#legend'), 'leg'); }
  if (id) {
    const def = RACKS.find((r) => r.id === id);
    $('#racktitle').textContent = t('rackView.title', { id });
    $('#racksub').textContent = t('rackView.sub', { row: def.row, client: CLIENTS[def.client] });
    document.querySelectorAll('[data-side]').forEach((b) => b.classList.toggle('on', b.dataset.side === 'front'));
    if (S.sel && S.sel.kind !== 'rack' && !String(S.sel.id).startsWith(id + '/')) S.sel = { kind: 'rack', id };
  } else if (S.sel && (S.sel.kind === 'device' || S.sel.kind === 'pdu')) {
    S.sel = { kind: 'rack', id: S.sel.id.split('/')[0] };
  }
  renderInspector();
}

// ---------- Inspector -------------------------------------------------------------------
function renderInspector() {
  const box = $('#inspector');
  if (!S.sel) { panelHide(box); return; }
  const d = inspect(S.world, S.sel.kind, S.sel.id);
  if (!d) { panelHide(box); return; }
  panelShow(box, S.sel.kind + ':' + S.sel.id);
  const LED = { ok: '#30c48d', warn: '#f5c518', crit: '#e5484d', down: '#3a3f4a', off: '#3a3f4a' };
  const STL = t('inspector.state');
  const keep = box.querySelector('.ib') ? box.querySelector('.ib').scrollTop : 0;
  const html = `<div class="ih"><div><b>${esc(d.title)}</b><div class="muted small">${esc(d.sub)}</div></div><button class="x" data-act="close-insp" aria-label="${t('inspector.close')}">×</button></div>
  <div class="ib">
    <table class="rd">${d.readings.map(([k, v, c]) => `<tr><td>${esc(k)}</td><td class="${c || ''}">${esc(v)}</td></tr>`).join('')}</table>
    ${d.obs.length ? `<div class="evh">${t('inspector.roundObs')}</div>${d.obs.map((o) => `<div class="obs ${o.warn ? 'w' : ''}"><span>${esc(o.text)}</span>${attachBtn(o.id, d.title + ': ' + o.text)}</div>`).join('')}` : ''}
    ${d.devices ? `<div class="evh">${t('inspector.devicesFront')}</div><table class="dv"><tr><th>${t('inspector.colU')}</th><th>${t('inspector.colDevice')}</th><th>${t('inspector.colPsu')}</th><th>${t('inspector.colState')}</th></tr>${d.devices.map((x) => `<tr class="pick" data-act="pick-device" data-rack="${esc(S.sel.id)}" data-dev="${esc(x.name)}" title="${esc(t('inspector.pickDevice', { name: x.name }))}"><td class="mono">${x.u}${x.h > 1 ? '–' + (x.u + x.h - 1) : ''}</td><td>${esc(x.name)}</td><td class="mono ${x.psu === 'B + B' ? 'warn' : ''}">${x.psu}</td><td><i class="dot" style="background:${LED[x.state]}"></i>${STL[x.state]}</td></tr>`).join('')}</table>` : ''}
    ${d.link ? `<button class="btn ghost" data-act="tab" data-tab="${d.link}">${t('inspector.viewAccess')}</button>` : ''}
    ${S.sel.kind === 'rack' && scene.detail !== S.sel.id ? `<div class="ibtns"><button class="btn ghost" data-act="rack-detail" data-rack="${esc(S.sel.id)}">${t('inspector.viewRack')}</button></div>` : ''}
    ${d.rack ? `<div class="ibtns"><button class="btn ghost" data-act="insp-rack" data-rack="${esc(d.rack)}">${t('inspector.rackCard', { id: d.rack })}</button>${scene.detail !== d.rack ? `<button class="btn ghost" data-act="rack-detail" data-rack="${esc(d.rack)}">${t('inspector.viewRackOf', { id: d.rack })}</button>` : ''}</div>` : ''}
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
    <div class="mh"><div><div class="muted small">${tk.id} · ${clock(tk.openedAt)} · ${esc(inc.alert.host)}</div><h2>${esc(inc.title)}</h2></div><button type="button" class="x" data-act="cancel-modal" aria-label="${t('resolve.cancel')}">×</button></div>
    <p class="muted small">${t('resolve.clockStopped', { n: tk.evidence.length })}</p>
    <fieldset><legend>${t('resolve.q1')}</legend><div class="opts">${CLASSES.map((c) => `<label class="opt"><input type="radio" name="cls" value="${c.id}" required><span><b>${c.label}</b><small>${c.hint}</small></span></label>`).join('')}</div></fieldset>
    <fieldset><legend>${t('resolve.q2')}</legend><div class="opts four">${PRIORITIES.map((p) => `<label class="opt"><input type="radio" name="prio" value="${p.id}" required><span><b>${p.label}</b></span></label>`).join('')}</div></fieldset>
    <fieldset><legend>${t('resolve.q3')} <small>${t('resolve.q3hint')}</small></legend><div class="opts col">${acts.map((a) => `<label class="opt"><input type="checkbox" name="act" value="${a.id}"><span>${esc(a.text)}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>${t('resolve.q4')}</legend><div class="opts col">${ESCALATIONS.map((e) => `<label class="opt"><input type="checkbox" name="esc" value="${e.id}"><span>${esc(e.label)}</span></label>`).join('')}</div></fieldset>
    <fieldset><legend>${t('resolve.q5')} <small>${t('resolve.q5hint')}</small></legend><textarea name="note" rows="2" placeholder="${t('resolve.notePh')}"></textarea></fieldset>
    <div class="err" id="formerr"></div>
    <div class="mf"><button type="button" class="btn ghost" data-act="cancel-modal">${t('resolve.back')}</button><button class="btn">${t('resolve.submit')}</button></div>
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
    if (!ans.actions.length) { $('#formerr').textContent = t('resolve.errAction'); return; }
    if (!ans.esc.length) { $('#formerr').textContent = t('resolve.errEsc'); return; }
    closeTicket(tk, ans);
  });
}

function scoreTicket(tk, ans) {
  const inc = tk.inc, ex = inc.expected;
  const parts = [];
  const lbl = (arr, id) => (arr.find((x) => x.id === id) || {}).label || id;
  // clasificación
  parts.push({ dim: t('review.dimCls'), yours: lbl(CLASSES, ans.cls), exp: lbl(CLASSES, ex.cls), pts: ans.cls === ex.cls ? 25 : 0, max: 25 });
  // prioridad
  const pi = (p) => Number(p.slice(1));
  const dp = Math.abs(pi(ans.prio) - pi(ex.prio));
  parts.push({ dim: t('review.dimPrio'), yours: ans.prio, exp: ex.prio, pts: dp === 0 ? 15 : dp === 1 ? 7 : 0, max: 15 });
  // escalamiento
  const E = ex.esc, A = ex.escAllowed || [];
  const hit = ans.esc.filter((x) => E.includes(x)).length;
  const extra = ans.esc.filter((x) => !E.includes(x) && !A.includes(x)).length;
  const escPts = Math.max(0, Math.round(20 * (hit / E.length) - 7 * extra));
  parts.push({ dim: t('review.dimEsc'), yours: ans.esc.map((x) => lbl(ESCALATIONS, x)).join(', '), exp: E.map((x) => lbl(ESCALATIONS, x)).join(', ') + (A.length ? t('review.alsoValid', { list: A.map((x) => lbl(ESCALATIONS, x)).join(', ') }) : ''), pts: escPts, max: 20 });
  // acciones
  const K = inc.actions.filter((a) => a.ok).map((a) => a.id);
  const chosen = inc.actions.filter((a) => ans.actions.includes(a.id));
  const crit = chosen.filter((a) => a.critical);
  const wrong = chosen.filter((a) => !a.ok && !a.critical);
  let actPts = Math.round(30 * (chosen.filter((a) => a.ok).length / K.length) - 10 * wrong.length);
  if (crit.length) actPts = 0;
  parts.push({ dim: t('review.dimAct'), yours: chosen.map((a) => a.text).join(' · '), exp: inc.actions.filter((a) => a.ok).map((a) => a.text).join(' · '), pts: Math.max(0, actPts), max: 30, crit: crit.map((a) => a.text), wrong: wrong.map((a) => a.text) });
  // evidencia
  const evIds = tk.evidence.map((e) => e.id);
  const got = inc.evidence.filter((e) => evIds.includes(e));
  parts.push({ dim: t('review.dimEv'), yours: t('review.evCount', { got: got.length, n: inc.evidence.length }), exp: inc.evidence.map(evLabel).join(' · '), pts: Math.round(10 * (got.length / inc.evidence.length)), max: 10, missing: inc.evidence.filter((e) => !evIds.includes(e)).map(evLabel) });
  // tiempos (SLA según la prioridad esperada)
  const P = PRIORITIES.find((p) => p.id === ex.prio);
  const ackT = (tk.ackAt ?? S.world.t) - tk.openedAt, resT = S.world.t - tk.openedAt;
  let pen = 0; const notes = [];
  if (ackT > P.ack) { pen += 5; notes.push(t('review.ackLate', { min: Math.round(ackT), prio: ex.prio, sla: P.ack })); }
  if (resT > P.res) { pen += 5; notes.push(t('review.resLate', { min: Math.round(resT), prio: ex.prio, sla: P.res })); }
  const total = Math.max(0, parts.reduce((s, p) => s + p.pts, 0) - pen);
  return { parts, total, pen, notes, ackT, resT, critical: crit.length > 0 };
}

function evLabel(id) {
  if (id.startsWith('cal:')) { const c = CALENDAR.find((x) => 'cal:' + x.id === id); return c ? t('ev.calendar', { id: c.id }) : id; }
  if (id.startsWith('acc:')) { const a = ACCESS.find((x) => 'acc:' + x.id === id); return a ? t('ev.access', { time: clock(a.t), card: a.card }) : id; }
  const label = t('ev')[id];
  return label || id;
}

function closeTicket(tk, ans) {
  const res = scoreTicket(tk, ans);
  tk.answer = ans; tk.result = res; tk.closedAt = S.world.t;
  if (tk.ackAt == null) tk.ackAt = S.world.t;
  applyClose(S.world, tk.inc, ans);
  S.world.log.push({ t: S.world.t, kind: 'ticket', text: t('ticket.logClosed', { id: tk.id, title: tk.inc.title, cls: CLASSES.find((c) => c.id === ans.cls).label, prio: ans.prio }) });
  if (ans.note) S.notes.push({ t: S.world.t, kind: 'nota', text: `${tk.id}: ${ans.note}` });
  showReview(tk);
}

function showReview(tk) {
  const r = tk.result, inc = tk.inc;
  S.modal = true;
  $('#modal').hidden = false;
  $('#modalbox').innerHTML = `<div class="mh"><div><div class="muted small">${t('review.title', { id: tk.id })}</div><h2>${esc(inc.title)}</h2></div><button type="button" class="x" data-act="close-modal" aria-label="${t('review.close')}">×</button></div>
    <div class="score ${r.total >= 80 ? 'good' : r.total >= 50 ? 'mid' : 'bad'}"><b>${r.total}</b><span>/ 100</span>${r.critical ? `<em>${t('review.critical')}</em>` : ''}</div>
    <table class="rev"><tr><th>${t('review.colDim')}</th><th>${t('review.colYours')}</th><th>${t('review.colExp')}</th><th>${t('review.colPts')}</th></tr>
    ${r.parts.map((p) => `<tr><td>${p.dim}</td><td>${esc(p.yours || '—')}${p.crit && p.crit.length ? `<div class="bad small">${t('review.critLabel')} ${esc(p.crit.join(' · '))}</div>` : ''}${p.wrong && p.wrong.length ? `<div class="warn small">${t('review.wrongLabel')} ${esc(p.wrong.join(' · '))}</div>` : ''}${p.missing && p.missing.length ? `<div class="muted small">${t('review.missingLabel')} ${esc(p.missing.join(' · '))}</div>` : ''}</td><td>${esc(p.exp)}</td><td class="mono">${p.pts}/${p.max}</td></tr>`).join('')}
    ${r.pen ? `<tr><td>${t('review.dimTime')}</td><td colspan="2">${esc(r.notes.join(' '))}</td><td class="mono">−${r.pen}</td></tr>` : ''}
    </table>
    <div class="why"><b>${t('review.why')}</b><p>${esc(inc.why)}</p><p class="muted small">${esc(t('review.ref', { ref: inc.ref }))}</p></div>
    <div class="mf"><button class="btn" data-act="close-modal">${t('review.cont')}</button></div>`;
}

function closeModal() { $('#modal').hidden = true; S.modal = false; lastTs = performance.now(); renderPanel(); renderInspector(); renderSummary(); scene.update(S.world, S.mode, sevMap()); }

// ---------- Fin de turno ---------------------------------------------------------------------
function metrics() {
  const closed = S.tickets.filter((x) => x.closedAt != null);
  const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
  const pts = INCIDENTS.reduce((s, inc) => { const x = S.tickets.find((k) => k.inc.id === inc.id); return s + (x && x.result ? x.result.total : 0); }, 0);
  const avail = 1 - S.world.downMinutes / (TOTAL_DEVICES * SHIFT.length);
  const slaOk = closed.filter((x) => !x.result.pen).length;
  return { closed: closed.length, total: INCIDENTS.length, pts, max: INCIDENTS.length * 100, mtta: avg(closed.map((x) => x.result.ackT)), mttr: avg(closed.map((x) => x.result.resT)), avail, slaOk, maxTemp: S.world.maxTemp, impacts: S.world.impacts };
}

function saveLastRun(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); localStorage.removeItem(OLD_STORE_KEY); } catch (e) { /* sin almacenamiento */ }
}
function loadLastRun() {
  try {
    let raw = localStorage.getItem(STORE_KEY);
    if (!raw) {
      raw = localStorage.getItem(OLD_STORE_KEY); // migración desde "Turno de Sala"
      if (raw) { localStorage.setItem(STORE_KEY, raw); localStorage.removeItem(OLD_STORE_KEY); }
    }
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

function endShift() {
  if (S.ended) return;
  S.ended = true; S.running = false;
  const m = metrics();
  saveLastRun({ pts: m.pts, max: m.max, fecha: new Date().toISOString().slice(0, 10) });
  const pct = Math.round((m.pts / m.max) * 100);
  const levels = t('end.levels');
  const nivel = levels[pct >= 85 ? 0 : pct >= 65 ? 1 : pct >= 40 ? 2 : 3];
  $('#endbox').innerHTML = `<h2>${t('end.title', { time: clock(S.world.t) })}</h2>
    <div class="endgrid">
      <div class="kpi"><b>${m.pts}</b><span>${t('end.ptsOf', { max: m.max, pct })}</span><em>${nivel}</em></div>
      <div class="kpi"><b>${m.closed}/${m.total}</b><span>${t('end.closed')}</span></div>
      <div class="kpi"><b>${m.slaOk}/${m.closed || 0}</b><span>${t('end.inSla')}</span></div>
      <div class="kpi"><b>${Math.round(m.mtta)} min</b><span>${t('end.mtta')}</span></div>
      <div class="kpi"><b>${Math.round(m.mttr)} min</b><span>${t('end.mttr')}</span></div>
      <div class="kpi"><b>${(m.avail * 100).toFixed(2).replace('.', ',')} %</b><span>${t('end.avail')}</span></div>
      <div class="kpi"><b>${fmt1(m.maxTemp)} °C</b><span>${t('end.maxTemp')}</span></div>
      <div class="kpi"><b>${m.impacts.length}</b><span>${t('end.impacts')}</span></div>
    </div>
    ${m.impacts.length ? `<h3>${t('end.impactsTitle')}</h3><ul class="imp">${m.impacts.map((i) => `<li><span class="mono">${clock(i.t)}</span> ${esc(i.text)}</li>`).join('')}</ul>` : `<p class="good">${t('end.noImpacts')}</p>`}
    <h3>${t('end.tickets')}</h3>
    <table class="rev">${INCIDENTS.map((inc) => { const x = S.tickets.find((k) => k.inc.id === inc.id); return `<tr><td class="mono">${x ? x.id : '—'}</td><td>${esc(inc.title)}</td><td>${!x ? t('end.notHappened') : x.result ? x.result.total + ' pts' : `<span class="bad">${t('end.notClosed')}</span>`}</td><td>${x && x.result ? `<button class="link" data-act="review" data-tk="${x.id}">${t('end.reviewLink')}</button>` : ''}</td></tr>`; }).join('')}</table>
    <h3>${t('end.handover')}</h3>
    <p class="muted small">${t('end.handoverHint')}</p>
    <textarea id="relevo" rows="4" placeholder="${t('end.handoverPh')}"></textarea>
    <div class="mf"><button class="btn ghost" data-act="restart">${t('end.restart')}</button><button class="btn ghost" id="dlbtn" data-act="download">${t('end.download')}</button><button class="btn" data-act="copy">${t('end.copy')}</button></div>
    <p class="muted small" id="copymsg"></p>`;
  if (window.self !== window.top) $('#dlbtn').hidden = true;
  $('#end').hidden = false;
}

function report() {
  const m = metrics();
  const L = [];
  L.push(t('report.title'), '', `${t('app.siteFull')} · ${t('app.role')} · ${new Date().toLocaleDateString('es-CL')}`, '');
  L.push(t('report.score', { pts: m.pts, max: m.max }), t('report.tickets', { closed: m.closed, total: m.total, sla: m.slaOk }), t('report.times', { mtta: Math.round(m.mtta), mttr: Math.round(m.mttr) }), t('report.avail', { avail: (m.avail * 100).toFixed(2), temp: fmt1(m.maxTemp) }), '');
  L.push(t('report.ticketsH'), '');
  for (const x of S.tickets) {
    L.push(`### ${x.id} · ${x.inc.title} (${clock(x.openedAt)})`, '', t('report.alert', { host: x.inc.alert.host, text: x.inc.alert.text }), '');
    if (!x.result) { L.push(t('report.notClosed'), ''); continue; }
    for (const p of x.result.parts) L.push(`- **${p.dim}** (${p.pts}/${p.max}): ${p.yours || '—'}`);
    if (x.evidence.length) L.push(t('report.evidence', { list: x.evidence.map((e) => e.label).join(' | ') }));
    if (x.answer.note) L.push(t('report.note', { note: x.answer.note }));
    L.push(t('report.total', { total: x.result.total }), '', `> ${x.inc.why}`, '');
  }
  if (m.impacts.length) { L.push(t('report.impactsH'), ''); m.impacts.forEach((i) => L.push(`- ${clock(i.t)} · ${i.text}`)); L.push(''); }
  L.push(t('report.logH'), '');
  [...S.world.log, ...S.notes].sort((a, b) => a.t - b.t).forEach((e) => L.push(`- ${clock(e.t)} · ${e.text}`));
  const rel = ($('#relevo') && $('#relevo').value.trim()) || t('report.noHandover');
  L.push('', t('report.handoverH'), '', rel, '');
  return L.join('\n');
}

// ---------- Eventos globales ------------------------------------------------------------------
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const act = b.dataset.act;
  if (act === 'attach') {
    const tk = S.tickets.find((x) => x.id === S.active);
    if (!tk || tk.closedAt != null) { toast(t('ticket.needTicket'), 'info'); return; }
    const id = b.dataset.ev;
    const i = tk.evidence.findIndex((x) => x.id === id);
    if (i >= 0) tk.evidence.splice(i, 1); else tk.evidence.push({ id, label: b.dataset.label });
    renderPanel(); renderInspector();
  } else if (act === 'detach') {
    const tk = S.tickets.find((x) => x.id === S.active); tk.evidence = tk.evidence.filter((x) => x.id !== b.dataset.ev); renderPanel(); renderInspector();
  } else if (act === 'open') openTicket(b.dataset.tk);
  else if (act === 'open-inc') { const tk = S.tickets.find((x) => x.inc.id === b.dataset.inc); if (tk) openTicket(tk.id); }
  else if (act === 'close-detail') { S.active = null; renderPanel(); }
  else if (act === 'resolve') openResolve(b.dataset.tk);
  else if (act === 'review') { const tk = S.tickets.find((x) => x.id === b.dataset.tk); if (S.ended) { $('#end').hidden = true; } showReview(tk); }
  else if (act === 'cancel-modal') closeModal();
  else if (act === 'close-modal') { closeModal(); if (S.ended) $('#end').hidden = false; }
  else if (act === 'close-insp') { S.sel = null; scene.select(null); renderInspector(); }
  else if (scene.busy && (act === 'rack-detail' || act === 'pick-device' || act === 'insp-rack')) return;
  else if (act === 'tab') { S.tab = b.dataset.tab; renderPanel(); }
  else if (act === 'rack-detail') openRackView(b.dataset.rack);
  else if (act === 'pick-device') openRackView(b.dataset.rack, b.dataset.dev);
  else if (act === 'insp-rack') { S.sel = { kind: 'rack', id: b.dataset.rack }; scene.select('rack', b.dataset.rack); renderInspector(); }
  else if (act === 'restart') { location.hash = ''; boot(); $('#end').hidden = true; start(); }
  else if (act === 'copy') {
    try { await navigator.clipboard.writeText(report()); $('#copymsg').textContent = t('end.copied'); }
    catch (err) { $('#copymsg').textContent = t('end.copyFail'); }
  } else if (act === 'download') {
    try { const blob = new Blob([report()], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = t('report.file'); a.click(); } catch (err) { /* bloqueado */ }
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('.row.ticket')) openTicket(e.target.dataset.tk);
  if (e.key === 'Escape' && !$('#modal').hidden && $('#resolveform')) closeModal();
  else if (e.key === 'Escape' && $('#modal').hidden && $('#end').hidden && $('#intro').hidden && scene.detail && !scene.busy && !e.target.matches('input, textarea')) scene.exitRack();
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
  if (S.mode === 'calor' && !scene.detail) panelShow($('#legend'), 'leg'); else panelHide($('#legend'));
  scene.update(S.world, S.mode, sevMap());
}));
document.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => {
  S.speed = Number(b.dataset.speed); S.running = true; updateSpeedUI();
}));
$('#pause').addEventListener('click', () => { S.running = !S.running; updateSpeedUI(); });
$('#skip').addEventListener('click', skipToNext);
$('#endbtn').addEventListener('click', () => { if (S.ended) { $('#end').hidden = false; return; } const n = openTickets().length; if (n && !$('#endbtn').dataset.confirm) { $('#endbtn').dataset.confirm = '1'; $('#endbtn').textContent = t('header.endConfirm', { n }); setTimeout(() => { $('#endbtn').textContent = t('header.end'); delete $('#endbtn').dataset.confirm; }, 3000); return; } endShift(); });
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => scene.setView(b.dataset.view)));
$('#rackback').addEventListener('click', () => { if (!scene.busy) scene.exitRack(); });
document.querySelectorAll('[data-side]').forEach((b) => b.addEventListener('click', () => {
  if (b.classList.contains('on') || !scene.rackSide(b.dataset.side)) return;
  document.querySelectorAll('[data-side]').forEach((x) => x.classList.toggle('on', x === b));
}));
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
  else toast(esc(t('sim.notFound', { q })), 'info');
});

function updateSpeedUI() {
  document.querySelectorAll('[data-speed]').forEach((b) => b.classList.toggle('on', S.running && Number(b.dataset.speed) === S.speed));
  $('#pause').textContent = S.running ? '❚❚' : '▶';
  $('#pause').setAttribute('aria-label', S.running ? t('header.pause') : t('header.resume'));
  $('#clockwrap').classList.toggle('paused', !S.running);
}

function boot() {
  if (scene.detail) scene.exitRack();
  S = freshState();
  S.lastMinute = -1;
  $('#clock').textContent = clock(0);
  scene.update(S.world, S.mode, sevMap());
  renderPanel(); renderSummary(); renderInspector(); updateSpeedUI();
}

function start() {
  $('#intro').hidden = true;
  S.running = true; lastTs = performance.now(); updateSpeedUI();
  S.world.log.push({ t: 0, kind: 'sala', text: t('sim.shiftStart') });
  advance(0.01); tickUI();
}

applyI18n();
$('#startbtn').addEventListener('click', start);
const last = loadLastRun();
if (last) $('#lastrun').textContent = t('intro.lastRun', { pts: last.pts, max: last.max, date: last.fecha });
boot();
