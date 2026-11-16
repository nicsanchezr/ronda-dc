// Corrección de un ticket (función pura: no toca la interfaz ni el estado global).
// Cada ticket vale 100: clasificación 25, prioridad 15, escalamiento 20, acciones 30, evidencia 10,
// menos las penalizaciones por SLA y pistas según el nivel; el hallazgo proactivo suma una bonificación aparte.
import { CLASSES, ESCALATIONS, PRIORITIES } from './scenario.js';

/** Reglas por nivel (aprobadas en el diseño). */
export const LEVEL_RULES = {
  guiado: { notDone: 5, wrong: 5, slaAck: 0, slaRes: 0, hint: 0, hints: 3 },
  normal: { notDone: 10, wrong: 10, slaAck: 5, slaRes: 5, hint: 3, hints: 2 },
  experto: { notDone: 15, wrong: 10, slaAck: 10, slaRes: 10, hint: 0, hints: 0 },
};
export const PROACTIVE_BONUS = 10;

/**
 * Estado de cada acción del evento:
 *   done       → hecha en la sala (cuenta)
 *   declared   → declarada (acción declarativa o verificación comprobada)
 *   notdone    → declarada, pero no se hizo en la sala (error)
 *   unverified → declarada sin haber inspeccionado lo necesario (no suma ni resta)
 *   false      → declarada, pero se hizo lo contrario (p. ej. «no tocar» y se tocó)
 *   missing    → correcta y no se hizo ni se declaró
 *   none       → incorrecta y no se hizo ni se declaró
 * ctx = { done, seen, incStart, hasNote, declared:Set }
 */
export function actionStatus(a, ctx) {
  const d = ctx.declared.has(a.id);
  const rec = a.field ? ctx.done[a.field] : null;
  const fieldDone = !!rec && (a.authorized ? rec.auth : a.unauthorized ? !rec.auth : true);
  if (a.field) return fieldDone ? 'done' : d ? 'notdone' : a.ok ? 'missing' : 'none';
  if (a.seq) {
    const t = a.seq.map((id) => (ctx.done[id] ? ctx.done[id].t : null));
    const inOrder = t.every((x) => x !== null) && t.every((x, i) => i === 0 || x >= t[i - 1]);
    if (inOrder) return 'done';
    return d || t.some((x) => x !== null) ? 'notdone' : 'missing';
  }
  if (a.note) return ctx.hasNote ? 'done' : d ? 'notdone' : 'missing';
  if (a.abstain) {
    const touched = a.abstain.some((id) => ctx.done[id]);
    if (!d) return a.ok ? 'missing' : 'none';
    return touched ? 'false' : 'declared';
  }
  if (a.verify) {
    if (!d) return 'missing';
    const since = a.after ? (ctx.done[a.after] ? ctx.done[a.after].t : Infinity) : ctx.incStart;
    return a.verify.some((k) => ctx.seen[k] !== undefined && ctx.seen[k] >= since) ? 'declared' : 'unverified';
  }
  return d ? 'declared' : a.ok ? 'missing' : 'none';
}

/**
 * inc: evento · ans: { cls, prio, actions[], esc[], note } · ctx: ver abajo
 * ctx = { level, done, seen, incStart, hasNote, escReq, evidenceIds, ackT, resT, hints, proactive, labels:{…}, fieldById }
 */
export function scoreTicket(inc, ans, ctx) {
  const R = LEVEL_RULES[ctx.level] || LEVEL_RULES.normal;
  const T = ctx.labels; // textos de la interfaz (i18n)
  const ex = inc.expected;
  const parts = [];
  const lbl = (arr, id) => (arr.find((x) => x.id === id) || {}).label || id;

  parts.push({ dim: T.dimCls, yours: lbl(CLASSES, ans.cls), exp: lbl(CLASSES, ex.cls), pts: ans.cls === ex.cls ? 25 : 0, max: 25 });

  const pi = (p) => Number(String(p).slice(1));
  const dp = Math.abs(pi(ans.prio) - pi(ex.prio));
  parts.push({ dim: T.dimPrio, yours: ans.prio, exp: ex.prio, pts: dp === 0 ? 15 : dp === 1 ? 7 : 0, max: 15 });

  // escalamiento (pedir autorización al cliente cuenta como escalar al cliente)
  const escAns = [...new Set([...ans.esc, ...(ctx.escReq ? ['cliente'] : [])])].filter((x) => !(x === 'nadie' && ctx.escReq));
  const E = ex.esc, A = ex.escAllowed || [];
  const hit = escAns.filter((x) => E.includes(x)).length;
  const extra = escAns.filter((x) => !E.includes(x) && !A.includes(x));
  const escPts = Math.max(0, Math.round(20 * (hit / E.length) - 7 * extra.length));
  const escNotes = [];
  if (ctx.escReq && extra.includes('cliente')) {
    const fa = (ctx.authFields || []).map((id) => ctx.fieldById(id)).find((f) => f && f.authWhy);
    if (fa) escNotes.push(fa.authWhy);
  }
  parts.push({ dim: T.dimEsc, yours: escAns.map((x) => lbl(ESCALATIONS, x)).join(', '), exp: E.map((x) => lbl(ESCALATIONS, x)).join(', ') + (A.length ? T.alsoValid(A.map((x) => lbl(ESCALATIONS, x)).join(', ')) : ''), pts: escPts, max: 20, notes: escNotes });

  // acciones: hechas en sala, verificadas, declaradas y declaradas sin hacer
  const sctx = { done: ctx.done, seen: ctx.seen, incStart: ctx.incStart, hasNote: ctx.hasNote, declared: new Set(ans.actions) };
  const items = inc.actions.map((a) => ({ a, st: actionStatus(a, sctx) }));
  const okIds = inc.actions.filter((a) => a.ok);
  const credited = items.filter((x) => x.a.ok && (x.st === 'done' || x.st === 'declared')).length;
  const crit = items.filter((x) => x.a.critical && (x.st === 'done' || x.st === 'declared'));
  const wrong = items.filter((x) => !x.a.ok && !x.a.critical && (x.st === 'done' || x.st === 'declared'));
  const notDone = items.filter((x) => x.st === 'notdone' || x.st === 'false');
  let actPts = Math.round(30 * (credited / okIds.length) - R.wrong * wrong.length - R.notDone * notDone.length);
  if (crit.length) actPts = 0;
  parts.push({
    dim: T.dimAct,
    pts: Math.max(0, actPts), max: 30,
    items: items.filter((x) => x.st !== 'none' && x.st !== 'missing').map((x) => ({ text: x.a.text, st: x.st, ok: !!x.a.ok, critical: !!x.a.critical })),
    exp: okIds.map((a) => a.text).join(' · '),
    yours: items.filter((x) => x.st !== 'none' && x.st !== 'missing').map((x) => x.a.text).join(' · '),
    crit: crit.map((x) => x.a.text), wrong: wrong.map((x) => x.a.text),
    notDone: notDone.map((x) => x.a.text), notDonePen: R.notDone,
    missingOk: items.filter((x) => x.a.ok && x.st === 'missing').map((x) => x.a.text),
    unverified: items.filter((x) => x.st === 'unverified').map((x) => x.a.text),
  });

  const got = inc.evidence.filter((e) => ctx.evidenceIds.includes(e));
  parts.push({ dim: T.dimEv, yours: T.evCount(got.length, inc.evidence.length), exp: inc.evidence.map(T.evLabel).join(' · '), pts: Math.round(10 * (got.length / inc.evidence.length)), max: 10, missing: inc.evidence.filter((e) => !ctx.evidenceIds.includes(e)).map(T.evLabel) });

  // tiempos (SLA según la prioridad esperada) y pistas
  const P = PRIORITIES.find((p) => p.id === ex.prio);
  let pen = 0; const notes = [];
  if (!ctx.proactive) {
    if (R.slaAck && ctx.ackT > P.ack) { pen += R.slaAck; notes.push(T.ackLate(Math.round(ctx.ackT), ex.prio, P.ack)); }
    if (R.slaRes && ctx.resT > P.res) { pen += R.slaRes; notes.push(T.resLate(Math.round(ctx.resT), ex.prio, P.res)); }
  }
  const hintPen = (ctx.hints || 0) * R.hint;
  const base = parts.reduce((s, p) => s + p.pts, 0);
  const total = Math.max(0, base - pen - hintPen);
  const bonus = ctx.proactive ? PROACTIVE_BONUS : 0;
  return { parts, total, bonus, pen, hintPen, hints: ctx.hints || 0, notes, ackT: ctx.ackT, resT: ctx.resT, critical: crit.length > 0, level: ctx.level || 'normal' };
}
