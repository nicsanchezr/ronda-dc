// Modo Demo: un operador automático juega el turno corto en Normal con la partida perfecta
// (src/perfect-run.js) usando la interfaz real: pestañas, inspector, acciones en sala, vista de
// detalle del rack, formulario de cierre y corrección. Subtítulos en el idioma activo (demo.* del
// diccionario) explican qué hace y por qué.
// Variantes: '' (#demo, con controles), 'kiosco' (#demo/kiosco: sin controles, en bucle, vuelve al
// inicio tras 60 s sin interacción) y 'grabar' (#demo/grabar: sin cursor ni controles, subtítulos grandes).
import { PERFECT } from './perfect-run.js';
import { t } from './i18n/index.js';
import { gl } from './glossary.js';

const ABORT = Symbol('demo-abort');
const IDLE_MS = 60_000; // kiosco: vuelve al inicio tras 60 s sin interacción
const LOOP_PAUSE_MS = 15_000; // kiosco: pausa en el fin de turno antes de reiniciar
const CLOCK_RATE = 4; // minutos de juego por segundo real mientras corre el reloj entre eventos (a 1×)

/**
 * api (desde main.js): S() estado · boot(level, duration) · enterRoom(done) · showLanding() · start()
 * select(kind, id) · focus(kind, id, ms) · openRackView(id) · exitRack() · scene · advance(min)
 * finishAct() · closeModal() · takeover(mode) · stop() · fast (pruebas: todo más rápido)
 */
export function createDemo(api) {
  const $ = (s) => document.querySelector(s);
  const D = { active: false, mode: '', paused: false, skip: false, abort: false, speed: 1, handed: false, finished: false, caption: null, askOpen: false, lastInput: Date.now(), runId: 0 };
  const F = api.fast ? 30 : 1; // multiplicador de pruebas

  // ---------- tiempo ------------------------------------------------------------------------------
  const tick = () => new Promise((r) => setTimeout(r, 40));
  const check = (id) => { if (D.abort || id !== D.runId) throw ABORT; };
  async function sleep(ms) {
    const id = D.runId;
    let left = ms;
    while (left > 0) {
      check(id);
      if (D.skip) { D.skip = false; return; }
      await tick();
      if (!D.paused) left -= 40 * D.speed * F;
    }
  }
  async function until(cond, maxMs = 30_000) {
    const id = D.runId, t0 = Date.now();
    while (!cond()) { check(id); if (Date.now() - t0 > maxMs * 3) throw new Error('demo: tiempo de espera agotado'); await tick(); }
  }
  /** Tiempo de lectura de un subtítulo (a 1×). */
  const readMs = (text) => Math.min(9500, Math.max(3600, 2400 + text.split(/\s+/).length * 230));
  const camMs = () => (api.fast ? 120 : Math.round(1700 / D.speed));

  // ---------- subtítulos y controles ----------------------------------------------------------------
  function caption(key, vars) {
    D.caption = key ? { key, vars } : null;
    const box = $('#demosub');
    if (!key) { box.hidden = true; return ''; }
    const text = t(key, vars);
    box.innerHTML = `<span class="dk">${t('demo.kicker')}</span><span class="dt">${gl(text)}</span>`;
    box.hidden = false;
    return text;
  }
  function renderControls() {
    const c = $('#democtl'); if (!c) return;
    c.innerHTML = `<button type="button" data-demo="pause" aria-label="${t(D.paused ? 'demo.ctl.play' : 'demo.ctl.pause')}" title="${t(D.paused ? 'demo.ctl.play' : 'demo.ctl.pause')}">${D.paused ? '▶' : '❚❚'}</button>`
      + `<button type="button" data-demo="next" aria-label="${t('demo.ctl.next')}" title="${t('demo.ctl.next')}" ${D.finished ? 'disabled' : ''}>⏭</button>`
      + `<span class="seg" role="group" aria-label="${t('demo.ctl.speed')}">${[1, 1.5, 2].map((s) => `<button type="button" data-demo="speed" data-v="${s}" class="${D.speed === s ? 'on' : ''}" aria-pressed="${D.speed === s}">${String(s).replace('.', t('demo.ctl.dec'))}×</button>`).join('')}</span>`
      + `<button type="button" data-demo="exit" aria-label="${t('demo.ctl.exit')}" title="${t('demo.ctl.exit')}">✕</button>`;
    c.setAttribute('aria-label', t('demo.ctl.label'));
  }
  function renderAsk() {
    const a = $('#demoask'); if (!a) return;
    a.innerHTML = `<b>${t('demo.ask.title')}</b><p>${t('demo.ask.text')}</p><div class="mf"><button type="button" class="btn ghost" data-demo="resume">${t('demo.ask.resume')}</button><button type="button" class="btn" data-demo="takeover">${t('demo.ask.takeover')}</button></div>`;
  }
  /** Vuelve a dibujar subtítulo, controles y diálogo en el idioma activo. */
  function relabel() {
    if (!D.active) return;
    if (D.caption) caption(D.caption.key, D.caption.vars);
    renderControls(); if (D.askOpen) renderAsk();
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
  function closeAsk() { D.askOpen = false; $('#demoask').hidden = true; }

  // ---------- acciones sobre la interfaz real -------------------------------------------------------
  /** Señala un elemento (anillo animado), espera y lo pulsa como lo haría el operador. */
  async function press(sel, wait = 700) {
    await until(() => $(sel), 8000);
    let el = $(sel);
    el.scrollIntoView({ block: 'nearest', behavior: api.fast ? 'auto' : 'smooth' });
    el.classList.add('demo-press');
    await sleep(wait);
    el.classList.remove('demo-press');
    el = $(sel) || el;
    el.click();
  }
  async function pressLabel(sel, wait = 520) {
    await until(() => $(sel), 8000);
    const inp = $(sel);
    if (inp.disabled || inp.checked) return;
    const lab = inp.closest('label') || inp;
    lab.scrollIntoView({ block: 'nearest', behavior: api.fast ? 'auto' : 'smooth' });
    lab.classList.add('demo-press');
    await sleep(wait);
    lab.classList.remove('demo-press');
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
    while (api.S().world.t < target && !api.S().ended) {
      check(id);
      await tick();
      if (D.paused) continue;
      const left = target - api.S().world.t;
      api.advance(Math.min(left + 0.01, CLOCK_RATE * 0.04 * D.speed * F));
    }
  }
  async function waitAct() {
    while (api.S().act) { if (api.fast) api.finishAct(); await sleep(120); }
  }

  async function doStep(incId, st) {
    const text = st.say ? caption(`demo.${incId}.${st.say}`) : '';
    const t0 = Date.now();
    const S = api.S();
    if (st.open) {
      const tk = ticketOf(incId);
      await press('.tabs button[data-tab="tickets"]', 500);
      await press(`.row.ticket[data-tk="${tk.id}"]`, 650);
      await sleep(camMs());
    } else if (st.tab) {
      await press(`.tabs button[data-tab="${st.tab}"]`, 650);
    } else if (st.inspect) {
      api.focus(st.inspect[0], st.inspect[1], camMs());
      api.select(st.inspect[0], st.inspect[1]);
      await sleep(camMs() + 300);
    } else if (st.attach) {
      await press(`[data-act="attach"][data-ev="${st.attach}"]`, 750);
    } else if (st.field) {
      const [kind, oid, fa] = st.field;
      const inDetail = api.scene.detail && S.sel && (S.sel.id === oid || String(S.sel.id).startsWith(oid + '/'));
      if (!(S.sel && S.sel.kind === kind && S.sel.id === oid) && !inDetail) {
        api.focus(kind, oid, camMs()); api.select(kind, oid);
        await sleep(camMs());
      }
      await press(`#inspector [data-act="fa"][data-fa="${fa}"]`, 800);
      await press(`#inspector [data-act="fa-ok"][data-fa="${fa}"]`, 900);
      await waitAct();
    } else if (st.rack !== undefined) {
      if (st.rack) api.openRackView(st.rack); else api.exitRack();
      await sleep(200);
      await until(() => !api.scene.busy);
    } else if (st.close) {
      await closeStep(incId, st.close);
    }
    if (text) await sleep(Math.max(0, readMs(text) - (Date.now() - t0) * D.speed * F));
    else await sleep(500);
  }

  async function closeStep(incId, c) {
    const tk = ticketOf(incId);
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
    const pts = Number($('#modalbox .score b').textContent);
    const txt = caption('demo.review', { pts });
    await sleep(readMs(txt) + 1200);
    await press('#modalbox .mf [data-act="close-modal"]', 600);
  }

  // ---------- guion -------------------------------------------------------------------------------------
  async function script() {
    D.finished = false; renderControls();
    if (D.mode === 'grabar' || D.mode === 'kiosco') { // portada como presentación
      api.showLanding();
      caption(null);
      await sleep(4500);
    }
    await new Promise((r) => api.enterRoom(r));
    api.start();
    const intro = caption('demo.intro');
    await sleep(readMs(intro));
    const S = api.S();
    const order = Object.keys(S.world.sched).sort((a, b) => S.world.sched[a] - S.world.sched[b]);
    for (const incId of order) {
      caption('demo.wait');
      await runClockTo(S.world.sched[incId] + 0.02);
      await sleep(900);
      for (const st of PERFECT[incId]) await doStep(incId, st);
    }
    caption('demo.wait');
    await runClockTo(S.shiftLen + 0.02);
    const total = S.tickets.reduce((s, x) => s + (x.result ? x.result.total : 0), 0);
    caption('demo.end', { pts: total, max: order.length * 100 });
    D.finished = true; renderControls();
    if (D.mode === 'kiosco') { await sleep(LOOP_PAUSE_MS); restart(); }
  }

  function run() {
    D.abort = false; D.skip = false; D.paused = false; D.handed = false;
    const id = ++D.runId;
    script().catch((e) => { if (e !== ABORT && id === D.runId) console.error(e); });
  }
  function restart() {
    if (!D.active) return;
    D.runId++; closeAsk();
    api.boot('normal', 'corto');
    $('#end').hidden = true;
    D.handed = false; document.body.dataset.demo = D.mode;
    $('#democtl').hidden = D.mode !== '';
    run();
  }

  // ---------- entrada y salida --------------------------------------------------------------------------
  function start(mode = '') {
    D.active = true; D.mode = mode; D.speed = 1; D.lastInput = Date.now();
    document.body.dataset.demo = mode;
    $('#democtl').hidden = mode !== '';
    renderControls(); closeAsk();
    if (mode === 'kiosco') requestFs();
    api.boot('normal', 'corto');
    run();
  }
  function stop() {
    if (!D.active) return;
    D.active = false; D.abort = true; D.runId++;
    closeAsk(); caption(null);
    $('#democtl').hidden = true;
    delete document.body.dataset.demo;
    document.querySelectorAll('.demo-press').forEach((el) => el.classList.remove('demo-press'));
  }
  /** «Jugar yo desde aquí»: el estudiante sigue la partida tal como está. */
  function takeover() {
    D.handed = true; D.abort = true; D.runId++;
    closeAsk(); caption(null);
    $('#democtl').hidden = true;
    document.querySelectorAll('.demo-press').forEach((el) => el.classList.remove('demo-press'));
    if (D.mode !== 'kiosco') { D.active = false; delete document.body.dataset.demo; }
    else document.body.dataset.demo = 'kiosco-libre';
    api.takeover(D.mode);
  }
  function requestFs() {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen().catch(() => { /* requiere un gesto del usuario */ });
  }

  // ---------- interacción del usuario ---------------------------------------------------------------
  const EXEMPT = '#democtl, #demoask, .langsel, .settings, #gltip';
  let swallow = false;
  function onUserInput(e) {
    if (!D.active || !e.isTrusted) return;
    D.lastInput = Date.now();
    if (D.mode === 'kiosco') requestFs();
    if (D.handed || D.mode === 'grabar') return;
    if (e.target.closest && e.target.closest(EXEMPT)) return;
    if (e.type === 'keydown') return;
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
    else if (e.key === 'Escape' && D.mode !== 'kiosco') { e.stopPropagation(); api.stop(); }
  }, true);
  document.addEventListener('click', (e) => {
    if (swallow && e.isTrusted) { swallow = false; if (!(e.target.closest && e.target.closest(EXEMPT))) { e.stopPropagation(); e.preventDefault(); return; } }
    const b = e.target.closest && e.target.closest('[data-demo]'); if (!b || !D.active) return;
    const act = b.dataset.demo;
    if (act === 'pause') setPaused(!D.paused);
    else if (act === 'next') { D.skip = true; if (D.paused) setPaused(false); }
    else if (act === 'speed') { D.speed = Number(b.dataset.v); renderControls(); }
    else if (act === 'exit') api.stop();
    else if (act === 'resume') { closeAsk(); setPaused(false); }
    else if (act === 'takeover') takeover();
  }, true);
  // kiosco: sin interacción durante 60 s (diálogo abierto o partida tomada) → vuelve al inicio
  setInterval(() => {
    if (D.active && D.mode === 'kiosco' && (D.handed || D.askOpen) && Date.now() - D.lastInput > IDLE_MS) restart();
  }, 1000);

  return {
    start, stop, restart, relabel,
    setSpeed(v) { D.speed = v; renderControls(); },
    get active() { return D.active; },
    get mode() { return D.mode; },
    state: () => ({ active: D.active, mode: D.mode, paused: D.paused, finished: D.finished, handed: D.handed, askOpen: D.askOpen, caption: D.caption && D.caption.key }),
  };
}
