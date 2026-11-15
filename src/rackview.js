// Vista de detalle de un rack (zoom a nivel de U): frente y trasera,
// 42 U numeradas, equipos con LED, fuentes, PDU verticales, cables por rama,
// paneles ciegos (o el hueco donde faltan) y puerta trasera.
import * as THREE from 'three';
import { RACKS } from './scenario.js';
import { deviceState, psuBranches, branchPowered, pduLoad, deviceInfo } from './sim.js';
import { fadeRecord, setFade, collectMaterials } from './fade.js';
import { getTokens } from './themes/index.js';

export const U = 0.0445;
const RW = 0.6, RH = 2.0, RD = 1.1;
const Y0 = 0.06; // altura del borde inferior de U1
const MOUNT_W = 0.44; // ancho de un equipo de 19"
const FRONT_Z = RD / 2 - 0.06; // cara frontal de los equipos
const PDU_X = 0.272, PDU_Z = -RD / 2 + 0.075;
// Colores: todos desde el tema activo (T.scene.rv, T.scene.dev, T.led, T.cord). Al cambiar de tema se reconstruye.

const uy = (u) => Y0 + (u - 1) * U; // borde inferior de la U
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

// ---------- Texturas --------------------------------------------------------------
function railTexture(rear, T) {
  const V = T.scene.rv;
  const per = 40, [c, g] = canvas(64, 42 * per);
  g.fillStyle = V.railBg; g.fillRect(0, 0, 64, c.height);
  for (let u = 1; u <= 42; u++) {
    const y = c.height - u * per;
    g.fillStyle = V.railLine; g.fillRect(0, y, 64, 1);
    g.fillStyle = V.railHole;
    for (const k of [0.2, 0.5, 0.8]) g.fillRect(rear ? 40 : 6, y + per * k - 3, 14, 6);
    g.fillStyle = u % 5 === 0 ? V.railNumMajor : V.railNum;
    g.font = `${u % 5 === 0 ? 700 : 500} 22px ${T.fonts.mono}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(u), rear ? 22 : 42, y + per / 2);
  }
  return tex(c);
}

function frontTexture(d, T) {
  const V = T.scene.rv;
  const h = d.h, W = 640, H = 64 * h, [c, g] = canvas(W, H);
  const base = T.scene.dev[d.type] || T.scene.dev.server;
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  g.strokeStyle = V.bezelEdge; g.lineWidth = 3; g.strokeRect(1.5, 1.5, W - 3, H - 3);
  // orejas de montaje con tornillos
  g.fillStyle = V.ear; g.fillRect(0, 0, 18, H); g.fillRect(W - 18, 0, 18, H);
  g.fillStyle = V.screw;
  for (let i = 0; i < h; i++) { g.beginPath(); g.arc(9, 64 * i + 32, 4, 0, 7); g.fill(); g.beginPath(); g.arc(W - 9, 64 * i + 32, 4, 0, 7); g.fill(); }
  const label = (x, y, size = 22) => { g.fillStyle = V.label; g.font = `600 ${size}px ${T.fonts.mono}`; g.textBaseline = 'middle'; g.fillText(d.name, x, y); };
  if (d.type === 'server' || d.type === 'storage') {
    const cols = d.type === 'storage' ? 6 : h >= 2 ? 8 : 4, rows = d.type === 'storage' ? 4 : h >= 2 ? 2 : 1;
    const x0 = 170, bw = (d.type === 'storage' ? 340 : 300) / cols, bh = (H - 16) / rows;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const x = x0 + k * bw, y = 8 + r * bh;
      g.fillStyle = V.bay; g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      g.fillStyle = V.bayBar; g.fillRect(x + 5, y + bh / 2 - 2, bw - 18, 4);
      g.fillStyle = V.bayLed; g.fillRect(x + bw - 11, y + 5, 4, 4);
    }
    // rejilla de ventilación (arriba) y nombre del equipo (abajo)
    if (h >= 2) { g.fillStyle = V.vent; for (let x = 26; x < 160; x += 9) g.fillRect(x, 8, 4, H - 44); }
    label(28, h >= 2 ? H - 18 : H / 2, h >= 2 ? 22 : 18);
  } else if (d.type === 'switch' || d.type === 'patch') {
    const n = 24, rows = d.type === 'patch' ? 1 : 2;
    const x0 = 150, pw = 13;
    for (let r = 0; r < rows; r++) for (let k = 0; k < n; k++) {
      const x = x0 + k * pw + Math.floor(k / 6) * 6, y = rows === 1 ? 20 : 8 + r * 26;
      g.fillStyle = V.port; g.fillRect(x, y, pw - 3, rows === 1 ? 24 : 20);
      if (d.type === 'patch') { g.fillStyle = V.portNum; g.font = `9px ${T.fonts.mono}`; g.fillText(String(k + 1), x + 1, 56); }
    }
    if (d.type === 'switch') { g.fillStyle = V.port; for (let k = 0; k < 2; k++) g.fillRect(490 + k * 22, 18, 18, 28); }
    label(26, 32, 18);
  } else {
    // firewall / router
    const ports = d.type === 'router' ? 8 : 6;
    for (let k = 0; k < ports; k++) { g.fillStyle = V.port; g.fillRect(250 + k * 24, H / 2 - 12, 20, 24); }
    g.fillStyle = V.port; g.fillRect(470, H / 2 - 10, 28, 20); // consola
    g.fillStyle = V.portNum; g.font = `10px ${T.fonts.mono}`; g.fillText('CON', 470, H / 2 + 20);
    if (d.type === 'router') { g.fillStyle = V.vent; g.fillRect(150, 10, 80, H - 20); }
    label(26, H / 2, 20);
  }
  return tex(c);
}

function rearTexture(d, T) {
  const V = T.scene.rv;
  const h = d.h, W = 640, H = 64 * h, [c, g] = canvas(W, H);
  g.fillStyle = V.devRear; g.fillRect(0, 0, W, H);
  g.fillStyle = V.fan;
  // ventiladores
  if (d.type !== 'patch') for (let k = 0; k < (h >= 2 ? 3 : 2); k++) { const cx = 260 + k * 70; g.beginPath(); g.arc(cx, H / 2, Math.min(28, H / 2 - 6), 0, 7); g.fill(); g.strokeStyle = V.fanRing; g.lineWidth = 2; g.stroke(); }
  // puertos de red
  g.fillStyle = V.port;
  for (let k = 0; k < (d.type === 'patch' ? 24 : 4); k++) g.fillRect(d.type === 'patch' ? 130 + k * 15 : 470 + k * 26, H / 2 - 9, 12, 18);
  return tex(c);
}

function blankTexture(T) {
  const V = T.scene.rv;
  const [c, g] = canvas(512, 64);
  g.fillStyle = V.blank; g.fillRect(0, 0, 512, 64);
  g.fillStyle = V.blankFace; g.fillRect(20, 6, 472, 52);
  g.fillStyle = V.blankEdge; g.fillRect(0, 62, 512, 2);
  g.fillStyle = V.screw; g.beginPath(); g.arc(9, 32, 4, 0, 7); g.fill(); g.beginPath(); g.arc(503, 32, 4, 0, 7); g.fill();
  const t = tex(c); t.wrapT = THREE.RepeatWrapping; return t;
}

function perforatedDoorTexture(T) {
  const [c, g] = canvas(128, 128);
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = T.scene.rv.door; g.fillRect(0, 0, 128, 128);
  g.globalCompositeOperation = 'destination-out';
  for (let y = 4; y < 128; y += 8) for (let x = 4; x < 128; x += 8) { g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 20); return t;
}

function pduTexture(b, T) {
  const V = T.scene.rv;
  const [c, g] = canvas(64, 1024);
  g.fillStyle = V.pduBody; g.fillRect(0, 0, 64, 1024);
  g.fillStyle = T.cord[b]; g.fillRect(0, 0, 6, 1024); g.fillRect(58, 0, 6, 1024);
  for (let y = 40; y < 1000; y += 38) { g.fillStyle = V.pduOutlet; g.fillRect(18, y, 28, 24); g.fillStyle = V.pduPin; g.fillRect(26, y + 6, 4, 10); g.fillRect(34, y + 6, 4, 10); }
  return tex(c);
}

// ---------- Construcción -----------------------------------------------------------
// Se construye dentro de la escena de la sala, en la misma posición del rack,
// y aparece con un fundido (setFade) mientras la cámara se acerca.
export function createRackView(scene) {

  let shared = null; // texturas comunes de la construcción actual (dependen del tema)

  let root = null, R = null; // R: estado de la construcción actual
  const pickables = [];
  let fade = 0, recs = new Map(); // material -> registro de fundido

  function track(obj) {
    collectMaterials(obj).forEach((m) => { if (!recs.has(m)) { const r = fadeRecord(m); recs.set(m, r); r.f = 1; setFade(r, fade); } });
  }
  function untrack(obj) { collectMaterials(obj).forEach((m) => recs.delete(m)); }
  function setOpacity(f) {
    fade = f;
    recs.forEach((r) => setFade(r, f));
    if (R) { R.selBox.material.opacity = f; R.selBox.material.transparent = f < 1; }
  }

  function clear() {
    if (!root) return;
    scene.remove(root);
    if (R && R.selBox) { scene.remove(R.selBox); R.selBox.geometry.dispose(); R.selBox.material.dispose(); }
    recs = new Map();
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
    });
    root = null; R = null; pickables.length = 0;
  }

  function build(rackId, world, xf) {
    clear();
    const def = RACKS.find((r) => r.id === rackId);
    const T = getTokens(), V = T.scene.rv;
    shared = { railF: railTexture(false, T), railR: railTexture(true, T), blank: blankTexture(T), door: perforatedDoorTexture(T), pduA: pduTexture('A', T), pduB: pduTexture('B', T) };
    root = new THREE.Group(); scene.add(root);
    root.position.copy(xf.position); root.quaternion.copy(xf.quaternion); root.updateMatrixWorld(true);
    const tagRack = { kind: 'rack', id: rackId };
    const frameMat = new THREE.MeshStandardMaterial({ color: V.frame, roughness: 0.55, metalness: 0.35, side: THREE.DoubleSide });
    // estructura: postes, techo, zócalo y laterales
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, RH, 0.03), frameMat);
      p.position.set(sx * (RW / 2 - 0.015), RH / 2, sz * (RD / 2 - 0.015)); root.add(p);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.03, RD), frameMat); top.position.y = RH - 0.015; root.add(top);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.05, RD), frameMat); plinth.position.y = 0.025; root.add(plinth);
    const sideMat = new THREE.MeshStandardMaterial({ color: V.side, roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide });
    for (const sx of [-1, 1]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(RD - 0.03, RH - 0.06), sideMat);
      s.rotation.y = Math.PI / 2; s.position.set(sx * (RW / 2 - 0.002), RH / 2, 0); root.add(s);
    }
    // rieles numerados (frente y trasera)
    const railH = 42 * U;
    for (const sx of [-1, 1]) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(0.034, railH), new THREE.MeshStandardMaterial({ map: shared.railF, roughness: 0.8 }));
      f.position.set(sx * (MOUNT_W / 2 + 0.017), Y0 + railH / 2, FRONT_Z + 0.001); root.add(f);
      const r = new THREE.Mesh(new THREE.PlaneGeometry(0.034, railH), new THREE.MeshStandardMaterial({ map: shared.railR, roughness: 0.8 }));
      r.rotation.y = Math.PI; r.position.set(sx * (MOUNT_W / 2 + 0.017), Y0 + railH / 2, -RD / 2 + 0.16); root.add(r);
    }

    // equipos
    const devs = {};
    const used = new Set();
    def.devices.forEach((d) => {
      for (let k = 0; k < d.h; k++) used.add(d.u + k);
      const info = deviceInfo(rackId, d);
      const tag = { kind: 'device', id: rackId + '/' + d.name };
      const hgt = d.h * U - 0.003, depth = info.prof;
      const side = new THREE.MeshStandardMaterial({ color: T.scene.dev.side, roughness: 0.6, metalness: 0.35 });
      const mats = [side, side, side, side, new THREE.MeshStandardMaterial({ map: frontTexture(d, T), roughness: 0.55, metalness: 0.2 }), new THREE.MeshStandardMaterial({ map: rearTexture(d, T), roughness: 0.6 })];
      const box = new THREE.Mesh(new THREE.BoxGeometry(MOUNT_W, hgt, depth), mats);
      const yc = uy(d.u) + (d.h * U) / 2;
      box.position.set(0, yc, FRONT_Z - depth / 2); box.userData = tag; root.add(box); pickables.push(box);
      // LED: encendido, actividad, estado
      const leds = {};
      if (d.type !== 'patch') {
        ['pwr', 'act', 'st'].forEach((k, i) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.004), new THREE.MeshBasicMaterial({ color: T.led.on }));
          m.position.set(MOUNT_W / 2 - 0.05 + i * 0.012, uy(d.u) + d.h * U - 0.012, FRONT_Z + 0.002);
          m.userData = tag; root.add(m); pickables.push(m); leds[k] = m;
        });
      }
      // fuentes (PSU1 lado A, PSU2 lado B) en la trasera
      const psus = [];
      if (d.type !== 'patch') {
        [-1, 1].forEach((sx, i) => {
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, Math.min(0.038, hgt - 0.004), 0.02), new THREE.MeshStandardMaterial({ color: V.psu, roughness: 0.5, metalness: 0.5 }));
          const px = sx * 0.15, pz = FRONT_Z - depth - 0.01;
          p.position.set(px, uy(d.u) + 0.022, pz); p.userData = tag; root.add(p); pickables.push(p);
          const led = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.003), new THREE.MeshBasicMaterial({ color: T.led.on }));
          led.position.set(px - sx * 0.022, uy(d.u) + 0.022, pz - 0.011); root.add(led);
          psus.push({ mesh: p, led, x: px, y: uy(d.u) + 0.022, z: pz - 0.01, label: 'PSU' + (i + 1) });
        });
      }
      devs[d.name] = { def: d, box, leds, psus, cords: null, cordKey: '', phase: Math.random() * 10, speed: 0.6 + Math.random() * 1.4 };
    });

    // paneles ciegos (huecos libres) y el hueco donde faltan
    const gap = def.gap ? new Set(Array.from({ length: def.gap[1] - def.gap[0] + 1 }, (_, i) => def.gap[0] + i)) : new Set();
    const blanks = [];
    let runStart = null;
    const flush = (end) => {
      if (runStart == null) return;
      const n = end - runStart + 1;
      const t = shared.blank.clone(); t.needsUpdate = true; t.repeat.set(1, n);
      const m = new THREE.Mesh(new THREE.BoxGeometry(MOUNT_W, n * U - 0.002, 0.004), [0, 0, 0, 0, 1, 1].map((k) => (k ? new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, metalness: 0.2 }) : frameMat)));
      m.position.set(0, uy(runStart) + (n * U) / 2, FRONT_Z - 0.002); m.userData = tagRack; root.add(m);
      blanks.push({ mesh: m, from: runStart, to: end, gap: [...gap].some((u) => u >= runStart && u <= end) });
      runStart = null;
    };
    for (let u = 1; u <= 43; u++) {
      const free = u <= 42 && !used.has(u);
      const isGap = gap.has(u);
      if (free && !isGap) { if (runStart == null) runStart = u; } else flush(u - 1);
    }
    // paneles del hueco: existen pero se ocultan mientras falten
    let gapPanel = null, gapGlow = null;
    if (def.gap) {
      const [a, b] = def.gap, n = b - a + 1;
      const t = shared.blank.clone(); t.needsUpdate = true; t.repeat.set(1, n);
      gapPanel = new THREE.Mesh(new THREE.BoxGeometry(MOUNT_W, n * U - 0.002, 0.004), new THREE.MeshStandardMaterial({ map: t, roughness: 0.75 }));
      gapPanel.position.set(0, uy(a) + (n * U) / 2, FRONT_Z - 0.002); gapPanel.userData = tagRack; root.add(gapPanel);
      gapGlow = new THREE.Mesh(new THREE.PlaneGeometry(MOUNT_W, n * U), new THREE.MeshBasicMaterial({ color: T.scene.gapGlow, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      gapGlow.position.set(0, uy(a) + (n * U) / 2, -0.2); root.add(gapGlow);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(MOUNT_W, n * U)), new THREE.LineDashedMaterial({ color: V.gapEdge, dashSize: 0.015, gapSize: 0.01 }));
      edges.computeLineDistances(); edges.position.set(0, uy(a) + (n * U) / 2, FRONT_Z + 0.001); root.add(edges);
      gapGlow.userData.edges = edges;
    }

    // PDU verticales (A a la izquierda mirando el frente, B a la derecha)
    const pdus = {};
    ['A', 'B'].forEach((b) => {
      const sx = b === 'A' ? -1 : 1;
      const tag = { kind: 'pdu', id: rackId + '/' + b };
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.72, 0.045), [0, 0, 0, 0, 0, 1].map((k) => (k ? new THREE.MeshStandardMaterial({ map: b === 'A' ? shared.pduA : shared.pduB, roughness: 0.6 }) : new THREE.MeshStandardMaterial({ color: V.pduBody, roughness: 0.6 }))));
      body.position.set(sx * PDU_X, 0.98, PDU_Z); body.userData = tag; root.add(body); pickables.push(body);
      const [c, g] = canvas(256, 128); const t = tex(c);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.025), new THREE.MeshBasicMaterial({ map: t }));
      screen.rotation.y = Math.PI; screen.position.set(sx * PDU_X, 1.79, PDU_Z - 0.0235); screen.userData = tag; root.add(screen); pickables.push(screen);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.06, 0.05), new THREE.MeshStandardMaterial({ color: T.cord[b], roughness: 0.5 }));
      head.position.set(sx * PDU_X, 1.79, PDU_Z + 0.004); head.userData = tag; root.add(head); pickables.push(head);
      screen.renderOrder = 2;
      pdus[b] = { body, screen, c, g, t, last: '' };
    });

    // puerta trasera perforada con bisagra (semitransparente para ver el interior)
    const hinge = new THREE.Group(); hinge.position.set(RW / 2, RH / 2, -RD / 2 - 0.012); root.add(hinge);
    const door = new THREE.Mesh(new THREE.BoxGeometry(RW, RH - 0.04, 0.012), new THREE.MeshStandardMaterial({ map: shared.door, transparent: true, alphaTest: 0.02, opacity: 0.4, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide, depthWrite: false }));
    door.position.x = -RW / 2; hinge.add(door);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.03), new THREE.MeshStandardMaterial({ color: V.handle, metalness: 0.7, roughness: 0.3 }));
    handle.position.set(-RW + 0.05, 0, -0.02); hinge.add(handle);

    // sensor de entrada superior (R04 puede estar suelto)
    const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.02), new THREE.MeshStandardMaterial({ color: T.scene.sensor, emissive: T.scene.sensorGlow }));
    sensor.userData = tagRack; root.add(sensor);

    // cable de consola de fw-01 (R02)
    let consoleCable = null;
    if (rackId === 'R02') {
      const fw = def.devices.find((d) => d.name === 'fw-01');
      const y = uy(fw.u) + U / 2, z = FRONT_Z - deviceInfo(rackId, fw).prof;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, y, z - 0.005), new THREE.Vector3(0.08, y - 0.05, z - 0.12), new THREE.Vector3(0.12, 1.0, -RD / 2 - 0.12), new THREE.Vector3(0.1, 0.3, -RD / 2 - 0.35), new THREE.Vector3(0.0, 0.01, -RD / 2 - 0.6)]);
      consoleCable = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.004, 6), new THREE.MeshStandardMaterial({ color: T.scene.cable, emissive: T.scene.cableGlow }));
      consoleCable.userData = { kind: 'device', id: 'R02/fw-01' }; root.add(consoleCable); pickables.push(consoleCable);
    }

    R = { rackId, T, def, devs, blanks, gapPanel, gapGlow, pdus, hinge, sensor, consoleCable, selBox: null };
    // el recuadro de selección va en coordenadas de mundo, directo en la escena
    const sel = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)), T.scene.select); sel.visible = false; scene.add(sel); R.selBox = sel;
    fade = 0;
    track(root);
    sync(world);
  }

  // cable de energía desde una PSU hasta la PDU de su rama
  function cordMesh(p, branch) {
    const sx = branch === 'A' ? -1 : 1;
    const tx = sx * PDU_X - sx * 0.026;
    const ty = Math.min(1.8, Math.max(0.16, p.y - 0.03));
    const crosses = Math.sign(p.x) !== sx;
    const midZ = (p.z + PDU_Z) / 2;
    const pts = [
      new THREE.Vector3(p.x, p.y, p.z),
      new THREE.Vector3(p.x, p.y - 0.015, p.z - 0.04),
      new THREE.Vector3(crosses ? 0 : (p.x + tx) / 2, p.y - (crosses ? 0.07 : 0.035), midZ - 0.02),
      new THREE.Vector3(tx, ty - 0.01, PDU_Z + 0.03),
      new THREE.Vector3(tx + sx * 0.004, ty, PDU_Z - 0.0),
    ];
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0042, 6), new THREE.MeshStandardMaterial({ color: R.T.cord[branch], roughness: 0.6 }));
    return m;
  }

  function drawPdu(P, b, load, on) {
    const key = on ? b + Math.round(load) : b + 'X';
    if (P.last === key) return;
    P.last = key;
    const g = P.g;
    const TT = R.T;
    g.fillStyle = TT.scene.rv.pduScreen; g.fillRect(0, 0, 256, 128);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (!on) { g.fillStyle = TT.led.crit; g.font = `700 46px ${TT.fonts.mono}`; g.fillText('TRIP', 128, 64); }
    else {
      g.fillStyle = load >= 80 ? TT.led.crit : load >= 60 ? TT.led.warn : TT.led.act;
      g.font = '700 60px ui-monospace, monospace'; g.fillText(Math.round(load) + '%', 128, 66);
    }
    P.t.needsUpdate = true;
  }

  function sync(world) {
    if (!R || !world) return;
    const rk = world.racks[R.rackId];
    for (const name in R.devs) {
      const D = R.devs[name], d = D.def;
      const st = deviceState(world, R.rackId, d);
      D.state = st;
      if (D.leds.pwr) {
        D.leds.pwr.material.color.set(st === 'down' ? R.T.led.off : R.T.led.on);
        D.leds.st.material.color.set(st === 'down' ? R.T.led.off : st === 'crit' ? R.T.led.crit : st === 'warn' ? R.T.led.warn : R.T.led.on);
      }
      const br = psuBranches(world, R.rackId, d);
      const key = br.join('');
      if (key !== D.cordKey) {
        if (D.cords) { D.cords.forEach((c) => { untrack(c); root.remove(c); c.geometry.dispose(); c.material.dispose(); }); }
        D.cords = D.psus.map((p, i) => { const c = cordMesh(p, br[i]); c.userData = { kind: 'device', id: R.rackId + '/' + name }; root.add(c); track(c); return c; });
        D.cordKey = key;
      }
      D.psus.forEach((p, i) => p.led.material.color.set(branchPowered(world, R.rackId, br[i]) ? R.T.led.on : (world.t < world.flags.powerCutUntil ? R.T.led.off : R.T.led.noin)));
    }
    for (const b of ['A', 'B']) drawPdu(R.pdus[b], b, pduLoad(world, R.rackId, b), branchPowered(world, R.rackId, b));
    if (R.gapPanel) { R.gapPanel.visible = !rk.gap; R.gapGlow.visible = rk.gap; R.gapGlow.userData.edges.visible = rk.gap; }
    R.hinge.rotation.y = rk.rearOpen ? -1.75 : 0;
    if (R.consoleCable) R.consoleCable.visible = !!world.flags.cable;
    if (R.rackId === 'R04' && rk.sensorLoose) { R.sensor.position.set(RW / 2 + 0.03, 1.35, -0.25); R.sensor.rotation.z = 0.5; }
    else { R.sensor.position.set(RW / 2 - 0.06, 1.86, RD / 2 + 0.01); R.sensor.rotation.z = 0; }
  }

  function animate(now) {
    if (!R) return;
    for (const name in R.devs) {
      const D = R.devs[name];
      if (!D.leds.act) continue;
      if (D.state === 'down') { D.leds.act.material.color.set(R.T.led.off); continue; }
      const on = Math.sin(now / (90 / D.speed) + D.phase) + Math.sin(now / (37 / D.speed) + D.phase * 2) > 0.3;
      D.leds.act.material.color.set(on ? R.T.led.act : R.T.led.off);
    }
    if (R.selBox.visible && R.selTarget) R.selBox.setFromObject(R.selTarget);
  }

  function select(kind, id) {
    if (!R) return;
    let o = null;
    if (kind === 'device') { const D = R.devs[id.split('/')[1]]; o = D ? D.box : null; }
    else if (kind === 'pdu') { const P = R.pdus[id.split('/')[1]]; o = P ? P.body : null; }
    R.selTarget = o;
    R.selBox.visible = !!o;
    if (o) R.selBox.setFromObject(o);
  }

  // centro del equipo en coordenadas locales del rack
  function deviceCenter(name) {
    if (!R || !R.devs[name]) return null;
    return R.devs[name].box.position.clone();
  }

  return { pickables, build, clear, sync, animate, select, deviceCenter, setOpacity, get root() { return root; }, get rackId() { return R ? R.rackId : null; } };
}
