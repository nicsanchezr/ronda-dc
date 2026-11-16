// Partida perfecta: la solución de referencia de cada evento del turno, como datos.
// La ejecutan las pruebas (tests/helpers.mjs → playEvent) y el modo Demo (src/demo.js).
// Pasos:
//   open                         abre el ticket del evento
//   tab: 'accesos'               muestra una pestaña del panel
//   inspect: [kind, id]          inspecciona un objeto de la sala
//   attach: 'obs:…'              adjunta una evidencia visible
//   field: [kind, id, acción]    ejecuta una acción en sala
//   auth: [kind, id, acción]     solicita autorización al cliente
//   wait: minutos                deja correr el reloj
//   rack: id | null              (solo Demo) entra a la vista de detalle del rack o sale de ella
//   close: { cls, prio, acts, esc }  cierra el ticket; la nota es el texto demo.note.<evento>
// say: subtítulo de la Demo (clave demo.<evento>.<say> del diccionario), que explica el porqué.
// Las acciones «hechas en sala», las notas y las verificaciones se marcan solas en el formulario:
// acts solo lista las declarativas que faltan.
export const PERFECT = {
  E1: [
    { open: true, say: 'open' },
    { tab: 'accesos', say: 'access' },
    { attach: 'acc:acc-0805' },
    { tab: 'cambios', say: 'change' },
    { attach: 'cal:CHG-1042' },
    { field: ['rack', 'R07', 'tech-escort'], say: 'escort' },
    { close: { cls: 'benigno', prio: 'P4', acts: ['a1'], esc: ['nadie'] }, say: 'close' },
  ],
  E2: [
    { open: true },
    { inspect: ['rack', 'R04'] },
    { attach: 'obs:r04-sensor' },
    { attach: 'obs:r04-ipmi' },
    { field: ['rack', 'R04', 'sensor-fix'] },
    { close: { cls: 'fp', prio: 'P4', acts: ['a1'], esc: ['nadie'] } },
  ],
  E3: [
    { open: true, say: 'open' },
    { inspect: ['rack', 'R08'], say: 'look' },
    { rack: 'R08', say: 'detail' },
    { attach: 'obs:r08-blank', say: 'evidence' },
    { attach: 'obs:r08-recirc' },
    { field: ['rack', 'R08', 'blank-install'], say: 'fix' },
    { rack: null },
    { inspect: ['rack', 'R08'], say: 'verify' },
    { close: { cls: 'vp', prio: 'P3', acts: ['a2'], esc: ['nadie'] }, say: 'close' },
  ],
  E4: [
    { open: true },
    { inspect: ['rack', 'R06'] },
    { attach: 'obs:r06-psu' },
    { attach: 'obs:r06-pdu' },
    { tab: 'cambios' },
    { attach: 'cal:CHG-1045' },
    { auth: ['rack', 'R06', 'psu-move'] },
    { wait: 10.5 },
    { field: ['rack', 'R06', 'psu-move'] },
    { close: { cls: 'vp', prio: 'P2', acts: ['a1', 'a3'], esc: ['cliente'] } },
  ],
  E5: [
    { open: true },
    { tab: 'cambios' },
    { attach: 'cal:MNT-221' },
    { inspect: ['ups', 'UPS-A'] },
    { attach: 'obs:upsa-test' },
    { inspect: ['ups', 'UPS-B'] },
    { close: { cls: 'benigno', prio: 'P4', acts: ['a1', 'a2'], esc: ['nadie'] } },
  ],
  E6: [
    { open: true, say: 'open' },
    { inspect: ['crac', 'CRAC-2'], say: 'alarm' },
    { attach: 'obs:crac2-alarm' },
    { inspect: ['crac', 'CRAC-1'], say: 'margin' },
    { attach: 'obs:crac1-ok' },
    { field: ['crac', 'CRAC-1', 'crac1-boost'], say: 'boost' },
    { close: { cls: 'vp', prio: 'P1', acts: ['a2', 'a3'], esc: ['clima', 'jefe'] }, say: 'close' },
  ],
  E7: [
    { open: true, say: 'open' },
    { field: ['leak', 'LEAK-Z3', 'tile-lift'], say: 'lift' },
    { inspect: ['leak', 'LEAK-Z3'] },
    { attach: 'obs:leak-water', say: 'evidence' },
    { attach: 'obs:leak-cables' },
    { field: ['leak', 'LEAK-Z3', 'absorbent'], say: 'contain' },
    { field: ['leak', 'LEAK-Z3', 'photo-leak'], say: 'photo' },
    { close: { cls: 'vp', prio: 'P2', acts: [], esc: ['clima'] }, say: 'close' },
  ],
  E8: [
    { open: true },
    { inspect: ['rack', 'R02'] },
    { attach: 'obs:r02-door' },
    { attach: 'obs:r02-cable' },
    { tab: 'accesos' },
    { attach: 'acc:acc-1404' },
    { field: ['rack', 'R02', 'photo-r02'] },
    { field: ['rack', 'R02', 'door-secure'] },
    { close: { cls: 'vp', prio: 'P2', acts: ['a1', 'a2'], esc: ['seguridad', 'jefe'] } },
  ],
};
