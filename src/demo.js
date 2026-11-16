// Modo Demo: un operador automático juega el turno corto en Normal con la partida perfecta
// (src/perfect-run.js) usando la interfaz real: pestañas, inspector, acciones en sala, vista de
// detalle del rack, formulario de cierre y corrección. Subtítulos en el idioma activo (demo.* del
// diccionario) explican qué hace y por qué.
// Variantes: '' (#demo, con controles), 'kiosco' (#demo/kiosco: sin controles, en bucle, vuelve al
// inicio tras 60 s sin interacción) y 'grabar' (#demo/grabar: sin cursor ni controles, subtítulos grandes).
// Con ?test&video (tools/video.mjs): tarjetas de inicio y fin, menos subtítulos y tramos de espera a ×8.
import { PERFECT } from './perfect-run.js';
import { t } from './i18n/index.js';
import { gl } from './glossary.js';

const ABORT = Symbol('demo-abort');
const IDLE_MS = 60_000; // kiosco: vuelve al inicio tras 60 s sin interacción
const LOOP_PAUSE_MS = 15_000; // kiosco: pausa en el fin de turno antes de reiniciar
const CLOCK_RATE = 4; // minutos de juego por segundo real mientras corre el reloj entre eventos (a 1×)
const BOOST = 8; // video: tramos de espera (reloj, acciones en curso, pasos sin subtítulo) a ×8
const FRAME_PX = 176; // corre el encuadre a la derecha: el objetivo queda centrado fuera del inspector

// ---------- Tomas de cámara ---------------------------------------------------------------------------
// Coordenadas relativas al objetivo, en ejes de su frente: [lado, alto, frente] (metros).
// look: punto a mirar; cands: posiciones de cámara en orden de preferencia. Antes de usar una toma,
// scene.resolveShot comprueba con raycasting que el objetivo se vea sin obstáculos y, si una
// posición está tapada, prueba la siguiente. Si todas lo están, un rack se muestra en su vista de detalle.
export const SHOT_TYPES = {
  // Rack: desde el otro lado del pasillo frío (la fila de enfrente está a 1,75 m del centro), casi de
  // frente y a la altura de la mitad superior (paneles, sensor, LED); luego desde arriba de la fila de enfrente.
  rack: { look: [0, 0.3, 0.55], cands: [[1.15, 0.5, 1.66], [-1.15, 0.5, 1.66], [0.7, 1.75, 2.35], [-0.7, 1.75, 2.35], [1.9, 0.45, 1.15]] },
  // CRAC: frente y luz de estado, desde un costado de la sala (sobre los racks si hace falta)
  crac: { look: [0.35, 0.3, 0.43], cands: [[2.2, 1.6, 2.6], [-2.2, 1.6, 2.6], [2.8, 0.6, 1.3], [-2.8, 0.6, 1.3], [1.2, 1.9, 2.0]] },
  // Zona de fugas: a lo largo del pasillo entre CRAC-1 y la fila A, desde arriba
  leak: { look: [-0.3, 0, 0], cands: [[2.6, 1.3, 0.1], [-2.6, 1.3, 0.1], [2.0, 2.2, 0.3], [0.5, 2.6, 1.5]] },
};
/**
 * Toma de cada paso de la demo que mueve la cámara: '<evento>:<índice del paso en PERFECT>'.
 * rack: true = la toma es la vista de detalle del rack (el propio paso entra a ella).
 */
export const STEP_SHOTS = {
  'E1:0': { kind: 'rack', id: 'R07' }, // abre el ticket: rack donde trabaja el técnico
  'E1:5': { kind: 'rack', id: 'R07' }, // acompaña al técnico
  'E3:0': { kind: 'rack', id: 'R08' }, // abre el ticket de R08
  'E3:1': { kind: 'rack', id: 'R08' }, // inspecciona R08
  'E3:2': { kind: 'rack', id: 'R08', detail: true }, // vista de detalle: el hueco U30–U34
  'E3:7': { kind: 'rack', id: 'R08' }, // verifica después de instalar los paneles
  'E6:0': { kind: 'crac', id: 'CRAC-2' }, // abre el ticket de CRAC-2
  'E6:1': { kind: 'crac', id: 'CRAC-2' }, // alarma HP1
  'E6:3': { kind: 'crac', id: 'CRAC-1' }, // margen de CRAC-1
  'E6:5': { kind: 'crac', id: 'CRAC-1' }, // sube CRAC-1
  'E7:0': { kind: 'leak', id: 'LEAK-Z3' }, // abre el ticket de la fuga
  'E7:1': { kind: 'leak', id: 'LEAK-Z3' }, // levanta la baldosa
  'E7:2': { kind: 'leak', id: 'LEAK-Z3' }, // revisa el agua y la canalización
};
const shotOf = (s) => ({ kind: s.kind, id: s.id, ...SHOT_TYPES[s.kind] });

// Video: subtítulos que se mantienen (el resto de los pasos pasa a ×8)
const VIDEO_SAY = new Set(['E1.open', 'E1.change', 'E1.close', 'E3.open', 'E3.detail', 'E3.fix', 'E3.close', 'E6.open', 'E6.alarm', 'E6.boost', 'E6.close', 'E7.open', 'E7.lift', 'E7.contain', 'E7.close']);

/**
 * api (desde main.js): S() estado · boot(level, duration) · enterRoom(done) · showLanding() · start()
 * select(kind, id) · scene · openRackView(id) · exitRack() · advance(min) · finishAct() · resetClock()
 * setBoost(n) · takeover(mode) · stop() · fast (pruebas: todo más rápido) · video · shotPause
 */
export function createDemo(api) {
  const $ = (s) => document.querySelector(s);
  const D = { active: false, mode: '', paused: false, skip: false, speed: 1, boost: 1, handed: false, finished: false, caption: null, askOpen: false, lastInput: Date.now(), runId: 0, scripts: 0, pending: 0, shot: null, waitingShot: null, shots: [], idleTimer: null, fsExitAt: 0 };
  const F = api.fast ? 30 : 1; // multiplicador de pruebas

  // ---------- tiempo ------------------------------------------------------------------------------
  // Toda espera pasa por aquí: se cancela al salir (runId cambia) y cuenta en D.pending.
  const tick = () => new Promise((r) => setTimeout(r, 40));
  const check = (id) => { if (id !== D.runId) throw ABORT; };
  const rate = () => D.speed * D.boost * F;
  async function sleep(ms) {
    const id = D.runId;
    D.pending++;
    try {
      let left = ms;
      while (left > 0) {
        check(id);
        if (D.skip) { D.skip = false; return; }
        await tick();
        check(id);
        if (!D.paused) left -= 40 * rate();
      }
    } finally { D.pending--; }
  }
  async function until(cond, maxMs = 30_000) {
    const id = D.runId, t0 = Date.now();
    D.pending++;
    try {
      while (!cond()) { check(id); if (Date.now() - t0 > maxMs * 3) throw new Error('demo: tiempo de espera agotado'); await tick(); }
      check(id);
    } finally { D.pending--; }
  }
  /** Ejecuta fn a ×8 (video), con el indicador en pantalla. */
  let boostDepth = 0;
  async function boosted(fn) {
    if (!api.video) return fn();
    boostDepth++; setBoost(BOOST);
    try { return await fn(); } finally { if (--boostDepth === 0) setBoost(1); }
  }
  function setBoost(n) {
    D.boost = n; api.setBoost(n);
    const b = $('#demoboost'); if (b) { b.textContent = '×' + n; b.hidden = n <= 1; }
  }
  /** Tiempo de lectura de un subtítulo (a 1×). */
  const readMs = (text) => {
    const words = text.split(/\s+/).length;
    return api.video ? Math.min(5200, Math.max(2800, 1600 + words * 140)) : Math.min(9500, Math.max(3600, 2400 + words * 230));
  };
  const camMs = () => (api.fast ? 120 : Math.round(1700 / D.speed));

  // ---------- subtítulos, controles y tarjetas ------------------------------------------------------
  function caption(key, vars) {
    D.caption = key ? { key, vars } : null;
    const box = $('#demosub');
    if (!key) { box.hidden = true; box.innerHTML = ''; return ''; }
    const text = t(key, vars);
    box.innerHTML = `<span class="dk">${t('demo.kicker')}</span><span class="dt">${gl(text)}</span>`;
    box.hidden = false;
    return text;
  }
  function card(kind) {
    const c = $('#democard'); if (!c) return;
    if (!kind) { c.hidden = true; c.innerHTML = ''; return; }
    const logo = document.querySelector('.lbar .logo svg');
    c.innerHTML = kind === 'start'
      ? `<div class="cc">${logo ? logo.outerHTML : ''}<h1>Ronda DC</h1><p>${t('app.tagline')}</p></div>`
      : `<div class="cc">${logo ? logo.outerHTML : ''}<h1>Ronda DC</h1><p>${t('demo.card.play')}</p><p class="url">nicsanchezr.github.io/ronda-dc</p><p>${t('demo.card.code')}</p><p class="url">github.com/nicsanchezr/ronda-dc</p></div>`;
    c.dataset.kind = kind; c.hidden = false;
  }
  function renderControls() {
    const c = $('#democtl'); if (!c) return;
    const fs = !!document.fullscreenElement;
    c.innerHTML = `<button type="button" data-demo="pause" aria-label="${t(D.paused ? 'demo.ctl.play' : 'demo.ctl.pause')}" title="${t(D.paused ? 'demo.ctl.play' : 'demo.ctl.pause')}">${D.paused ? '▶' : '❚❚'}</button>`
      + `<button type="button" data-demo="next" aria-label="${t('demo.ctl.next')}" title="${t('demo.ctl.next')}" ${D.finished ? 'disabled' : ''}>⏭</button>`
      + `<span class="seg" role="group" aria-label="${t('demo.ctl.speed')}">${[1, 1.5, 2].map((s) => `<button type="button" data-demo="speed" data-v="${s}" class="${D.speed === s ? 'on' : ''}" aria-pressed="${D.speed === s}">${String(s).replace('.', t('demo.ctl.dec'))}×</button>`).join('')}</span>`
      + `<button type="button" data-demo="fullscreen" aria-label="${t(fs ? 'demo.ctl.fsExit' : 'demo.ctl.fs')}" title="${t(fs ? 'demo.ctl.fsExit' : 'demo.ctl.fs')}">⛶</button>`
      + `<button type="button" data-demo="exit" aria-label="${t('demo.ctl.exit')}" title="${t('demo.ctl.exit')}">✕</button>`;
    c.setAttribute('aria-label', t('demo.ctl.label'));
  }
  function renderAsk() {
    const a = $('#demoask'); if (!a) return;
    a.innerHTML = `<b>${t('demo.ask.title')}</b><p>${t('demo.ask.text')}</p><div class="mf"><button type="button" class="btn ghost" data-demo="resume">${t('demo.ask.resume')}</button><button type="button" class="btn" data-demo="takeover">${t('demo.ask.takeover')}</button></div>`;
  }
  /** Vuelve a dibujar subtítulo, controles, diálogo y tarjeta en el idioma activo. */
  function relabel() {
    if (!D.active) return;
    if (D.caption) caption(D.caption.key, D.caption.vars);
    renderControls(); if (D.askOpen) renderAsk();
    const c = $('#democard'); if (c && !c.hidden) card(c.dataset.kind);
  }

  function setPaused(p) {
    D.paused = p;
    const S = api.S();
    if (S.act) { S.running = !p; api.resetClock(); }
    renderControls();
  }
  function openAsk() {
    if (D.askOpen) return;
    D.askOpen = true; setPaused(true); renderAsk();
    $('#demoask').hidden = false;
    $('#demoask [data-demo="resume"]').focus();
  }
  function closeAsk() { D.askOpen = false; const a = $('#demoask'); a.hidden = true; a.innerHTML = ''; }

  // ---------- cámara ------------------------------------------------------------------------------------
  /** Aplica la toma de un paso: comprueba la línea de visión y, si todo está tapado, usa el detalle del rack. */
  async function applyShot(key, s, ms) {
    D.shot = key;
    if (s.detail) return; // el propio paso entra a la vista de detalle
    const res = api.scene.resolveShot(shotOf(s));
    if (res) {
      api.scene.flyShot(res, s.kind, s.id, ms);
      api.select(s.kind, s.id);
      D.shots.push({ key, kind: s.kind, id: s.id, cand: res.index, clear: true });
    } else if (s.kind === 'rack') { // sin ángulo libre: vista de detalle del rack
      D.shots.push({ key, kind: s.kind, id: s.id, cand: -1, clear: false });
      api.openRackView(s.id);
      await sleep(200); await until(() => !api.scene.busy);
    } else {
      D.shots.push({ key, kind: s.kind, id: s.id, cand: -1, clear: false });
      api.scene.focus(s.kind, s.id, ms); api.select(s.kind, s.id);
    }
    await sleep(ms + 250);
  }
  /** Solo para la hoja de contactos (?tomas): espera a que tools/capturas.mjs tome la captura. */
  async function shotPause(key) {
    if (!api.shotPause) return;
    await until(() => !api.scene.busy && !api.scene.animating);
    await new Promise((r) => setTimeout(r, 400)); // un par de cuadros ya quietos
    D.waitingShot = key;
    await until(() => D.waitingShot === null, 120_000);
  }

  // ---------- acciones sobre la interfaz real -------------------------------------------------------
  /** Señala un elemento (anillo animado), espera y lo pulsa como lo haría el operador. */
  async function press(sel, wait = 700) {
    await until(() => $(sel), 8000);
    let el = $(sel);
    el.scrollIntoView({ block: 'nearest', behavior: api.fast || api.video ? 'auto' : 'smooth' });
    el.classList.add('demo-press');
    try { await sleep(wait); } finally { el.classList.remove('demo-press'); }
    el = $(sel) || el;
    el.click();
  }
  async function pressLabel(sel, wait = 520) {
    await until(() => $(sel), 8000);
    const inp = $(sel);
    if (inp.disabled || inp.checked) return;
    const lab = inp.closest('label') || inp;
    lab.scrollIntoView({ block: 'nearest', behavior: api.fast || api.video ? 'auto' : 'smooth' });
    lab.classList.add('demo-press');
    try { await sleep(wait); } finally { lab.classList.remove('demo-press'); }
    inp.click();
  }
  async function type(sel, text) {
    const el = $(sel); el.focus();
    for (let i = 1; i <= text.length; i++) { el.value = text.slice(0, i); await sleep(28); }
    el.blur();
  }
  const ticketOf = (incId) => api.S().tickets.find((x) => x.inc.id === incId);

  /** Deja correr el reloj hasta el minuto indicado (o hasta que termine el turno). */
  async function runClockTo(target) {
    const id = D.runId;
    D.pending++;
    try {
      while (api.S().world.t < target && !api.S().ended) {
        check(id);
        await tick();
        check(id);
        if (D.paused) continue;
        const left = target - api.S().world.t;
        api.advance(Math.min(left + 0.01, CLOCK_RATE * 0.04 * rate()));
      }
    } finally { D.pending--; }
  }
  async function waitAct() {
    await boosted(async () => { while (api.S().act) { if (api.fast) api.finishAct(); await sleep(120); } });
  }

  async function doStep(incId, st, i) {
    const sayKey = st.say ? `${incId}.${st.say}` : null;
    const shown = sayKey && (!api.video || VIDEO_SAY.has(sayKey));
    const run = async () => {
      const text = shown ? caption(`demo.${sayKey}`) : '';
      const t0 = Date.now(), r0 = rate();
      const S = api.S();
      const shot = STEP_SHOTS[`${incId}:${i}`];
      if (st.open) {
        const tk = ticketOf(incId);
        await press('.tabs button[data-tab="tickets"]', 500);
        await press(`.row.ticket[data-tk="${tk.id}"]`, 650);
        if (shot) await applyShot(`${incId}:${i}`, shot, camMs());
      } else if (st.tab) {
        await press(`.tabs button[data-tab="${st.tab}"]`, 650);
      } else if (st.inspect) {
        if (shot) await applyShot(`${incId}:${i}`, shot, camMs());
        else { api.select(st.inspect[0], st.inspect[1]); await sleep(400); }
      } else if (st.attach) {
        await press(`[data-act="attach"][data-ev="${st.attach}"]`, 750);
      } else if (st.field) {
        const [kind, oid, fa] = st.field;
        const inDetail = api.scene.detail && S.sel && (S.sel.id === oid || String(S.sel.id).startsWith(oid + '/'));
        if (shot && !inDetail) await applyShot(`${incId}:${i}`, shot, camMs());
        else if (!(S.sel && S.sel.kind === kind && S.sel.id === oid) && !inDetail) { api.select(kind, oid); await sleep(400); }
        await press(`#inspector [data-act="fa"][data-fa="${fa}"]`, 800);
        await press(`#inspector [data-act="fa-ok"][data-fa="${fa}"]`, 900);
        await waitAct();
      } else if (st.rack !== undefined) {
        if (st.rack) { D.shot = `${incId}:${i}`; api.openRackView(st.rack); } else api.exitRack();
        await sleep(200);
        await until(() => !api.scene.busy);
      } else if (st.close) {
        await closeStep(incId, st.close);
      }
      if (shot) await shotPause(`${incId}:${i}`);
      const spent = (Date.now() - t0) * r0;
      if (text) { if (!boostDepth) setBoost(1); await sleep(Math.max(0, readMs(text) - spent)); }
      else await sleep(500);
    };
    // En el video, los pasos sin subtítulo pasan a ×8
    if (api.video && !shown) await boosted(run); else await run();
  }

  async function closeStep(incId, c) {
    const tk = ticketOf(incId);
    await boosted(async () => {
      await press('.tabs button[data-tab="tickets"]', 350);
      if (!$('.detail [data-act="resolve"]')) await press(`.row.ticket[data-tk="${tk.id}"]`, 400);
      await press('.detail [data-act="resolve"]', 800);
      await until(() => $('#resolveform'));
      await pressLabel(`#resolveform input[name=cls][value=${c.cls}]`);
      await pressLabel(`#resolveform input[name=prio][value=${c.prio}]`);
      for (const a of c.acts) await pressLabel(`#resolveform input[name=act][value=${a}]`);
      for (const e of c.esc) await pressLabel(`#resolveform input[name=esc][value=${e}]`);
      await type('#resolveform textarea[name=note]', t('demo.note.' + incId));
      await press('#submitbtn', 700);
      await until(() => $('#modalbox .score b'));
    });
    const pts = Number($('#modalbox .score b').textContent);
    if (api.video) await sleep(1800); // el video muestra la corrección sin subtítulo
    else { const txt = caption('demo.review', { pts }); await sleep(readMs(txt) + 1200); }
    await boosted(() => press('#modalbox .mf [data-act="close-modal"]', 600));
  }

  // ---------- guion -------------------------------------------------------------------------------------
  async function script(id) {
    D.finished = false; D.shots = []; renderControls();
    api.scene.setFrameOffset(0);
    if (api.video) { // tarjeta de inicio sobre la portada
      api.showLanding(); caption(null); card('start');
      await sleep(2800);
      card(null);
    } else if (D.mode === 'grabar' || D.mode === 'kiosco') { // portada como presentación
      api.showLanding();
      caption(null);
      await sleep(4500);
    }
    await new Promise((r) => api.enterRoom(r));
    check(id); // si se salió durante el vuelo de entrada, no se empieza el turno
    api.start();
    api.scene.setFrameOffset(FRAME_PX);
    const intro = caption('demo.intro');
    await sleep(readMs(intro));
    const S = api.S();
    const order = Object.keys(S.world.sched).sort((a, b) => S.world.sched[a] - S.world.sched[b]);
    for (const incId of order) {
      caption(api.video ? null : 'demo.wait');
      await boosted(() => runClockTo(S.world.sched[incId] + 0.02));
      await sleep(api.video ? 300 : 900);
      for (let i = 0; i < PERFECT[incId].length; i++) await doStep(incId, PERFECT[incId][i], i);
    }
    caption(api.video ? null : 'demo.wait');
    await boosted(() => runClockTo(S.shiftLen + 0.02));
    const total = S.tickets.reduce((s, x) => s + (x.result ? x.result.total : 0), 0);
    const endTxt = caption('demo.end', { pts: total, max: order.length * 100 });
    D.finished = true; renderControls();
    if (api.video) { await sleep(readMs(endTxt)); caption(null); card('end'); await sleep(3000); D.videoDone = true; }
    if (D.mode === 'kiosco') { await sleep(LOOP_PAUSE_MS); restart(); }
  }

  function run() {
    D.skip = false; D.paused = false; D.handed = false; D.videoDone = false;
    const id = ++D.runId;
    D.scripts++;
    script(id).catch((e) => { if (e !== ABORT && id === D.runId) console.error(e); })
      .finally(() => { D.scripts--; });
  }
  function restart() {
    if (!D.active) return;
    D.runId++; boostDepth = 0; closeAsk(); card(null); setBoost(1);
    api.scene.cancel();
    api.boot('normal', 'corto');
    D.handed = false; document.body.dataset.demo = D.mode;
    $('#democtl').hidden = D.mode !== '';
    run();
  }

  // ---------- entrada y salida --------------------------------------------------------------------------
  function start(mode = '') {
    D.active = true; D.mode = mode; D.speed = 1; D.lastInput = Date.now();
    document.body.dataset.demo = mode;
    document.body.classList.toggle('demo-video', !!api.video);
    $('#democtl').hidden = mode !== '';
    renderControls(); closeAsk();
    if (mode === 'kiosco') {
      requestFs();
      // sin interacción durante 60 s (diálogo abierto o partida tomada) → vuelve al inicio
      D.idleTimer = setInterval(() => { if (D.active && (D.handed || D.askOpen) && Date.now() - D.lastInput > IDLE_MS) restart(); }, 1000);
    }
    api.boot('normal', 'corto');
    run();
  }
  /** Limpia todo lo de la demo: guion, esperas, subtítulos, controles, tarjetas y cámara. */
  function teardown() {
    D.runId++; // cancela el guion y toda espera en curso (sleep, until, reloj)
    boostDepth = 0;
    D.paused = false; D.skip = false; D.waitingShot = null;
    clearInterval(D.idleTimer); D.idleTimer = null;
    closeAsk(); caption(null); card(null); setBoost(1);
    $('#democtl').hidden = true; $('#democtl').innerHTML = '';
    document.querySelectorAll('.demo-press').forEach((el) => el.classList.remove('demo-press'));
    api.scene.cancel();
    api.scene.setFrameOffset(0);
  }
  function stop() {
    if (!D.active) return;
    D.active = false;
    teardown();
    delete document.body.dataset.demo;
  }
  /** «Jugar yo desde aquí»: el estudiante sigue la partida tal como está. */
  function takeover() {
    const kiosk = D.mode === 'kiosco';
    D.handed = true;
    D.runId++; closeAsk(); caption(null); card(null); setBoost(1);
    $('#democtl').hidden = true;
    document.querySelectorAll('.demo-press').forEach((el) => el.classList.remove('demo-press'));
    api.scene.setFrameOffset(0); api.scene.restoreOrbit();
    if (!kiosk) { D.active = false; delete document.body.dataset.demo; }
    else document.body.dataset.demo = 'kiosco-libre';
    api.takeover(D.mode);
  }
  function requestFs() {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => { /* requiere un gesto del usuario */ });
  }
  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else requestFs();
  }

  // ---------- interacción del usuario ---------------------------------------------------------------
  // Esc en pantalla completa: el navegador sale de pantalla completa y la demo sigue. Solo una Esc
  // fuera de pantalla completa (y no inmediatamente después de salir de ella) sale de la demo.
  // fullscreenchange solo registra la hora y actualiza el botón: nunca detiene la demo.
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) D.fsExitAt = Date.now();
    if (D.active) renderControls();
  });
  const inBrowserFullscreen = () => !!document.fullscreenElement || (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches);
  const EXEMPT = '#democtl, #demoask, .langsel, .settings, #gltip';
  let swallow = false;
  function onUserInput(e) {
    if (!D.active || !e.isTrusted) return;
    D.lastInput = Date.now();
    if (D.mode === 'kiosco') requestFs();
    if (D.handed || D.mode === 'grabar') return;
    if (e.target.closest && e.target.closest(EXEMPT)) return;
    e.stopPropagation(); e.preventDefault();
    swallow = e.type === 'pointerdown';
    openAsk();
  }
  document.addEventListener('pointerdown', onUserInput, true);
  document.addEventListener('wheel', onUserInput, { capture: true, passive: false });
  document.addEventListener('keydown', (e) => {
    if (!D.active || !e.isTrusted) return;
    D.lastInput = Date.now();
    if (D.handed || e.target.matches('input, textarea')) return;
    if (e.key === ' ' && D.mode !== 'kiosco') { e.preventDefault(); if (D.askOpen) closeAsk(); setPaused(!D.paused); }
    else if (e.key === 'ArrowRight' && D.mode !== 'kiosco') D.skip = true;
    else if (e.key === 'Escape') {
      e.stopImmediatePropagation(); // ni la vista de detalle ni otros atajos reaccionan durante la demo
      if (D.mode === 'kiosco') return;
      if (inBrowserFullscreen() || Date.now() - D.fsExitAt < 800) return; // esta Esc es para salir de pantalla completa
      if (D.askOpen) { closeAsk(); setPaused(false); return; }
      api.stop();
    }
  }, true);
  document.addEventListener('click', (e) => {
    if (swallow && e.isTrusted) { swallow = false; if (!(e.target.closest && e.target.closest(EXEMPT))) { e.stopPropagation(); e.preventDefault(); return; } }
    const b = e.target.closest && e.target.closest('[data-demo]'); if (!b || !D.active) return;
    const act = b.dataset.demo;
    if (act === 'pause') setPaused(!D.paused);
    else if (act === 'next') { D.skip = true; if (D.paused) setPaused(false); }
    else if (act === 'speed') { D.speed = Number(b.dataset.v); renderControls(); }
    else if (act === 'fullscreen') toggleFs();
    else if (act === 'exit') api.stop();
    else if (act === 'resume') { closeAsk(); setPaused(false); }
    else if (act === 'takeover') takeover();
  }, true);

  return {
    start, stop, restart, relabel,
    setSpeed(v) { D.speed = v; renderControls(); },
    resumeShot() { D.waitingShot = null; },
    /** Comprueba todas las tomas con la sala tal como está (para pruebas). */
    checkShots: () => Object.entries(STEP_SHOTS).filter(([, s]) => !s.detail).map(([key, s]) => { const r = api.scene.resolveShot(shotOf(s)); return { key, clear: !!r, cand: r ? r.index : -1 }; }),
    get active() { return D.active; },
    get mode() { return D.mode; },
    state: () => ({ active: D.active, mode: D.mode, paused: D.paused, finished: D.finished, handed: D.handed, askOpen: D.askOpen, caption: D.caption && D.caption.key, running: D.scripts > 0, pending: D.pending, shot: D.shot, waitingShot: D.waitingShot, shots: D.shots.slice(), boost: D.boost, videoDone: !!D.videoDone, idle: !!D.idleTimer }),
  };
}
