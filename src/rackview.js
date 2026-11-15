// Vista de detalle de un rack (zoom a nivel de U): frente y trasera,
// 42 U numeradas, equipos con LED, fuentes, PDU verticales, cables por rama,
// paneles ciegos (o el hueco donde faltan) y puerta trasera.
import * as THREE from 'three';
import { RACKS } from './scenario.js';
import { deviceState, psuBranches, branchPowered, pduLoad, deviceInfo } from './sim.js';

export const U = 0.0445;
const RW = 0.6, RH = 2.0, RD = 1.1;
const Y0 = 0.06; // altura del borde inferior de U1
const MOUNT_W = 0.44; // ancho de un equipo de 19"
const FRONT_Z = RD / 2 - 0.06; // cara frontal de los equipos
const PDU_X = 0.272, PDU_Z = -RD / 2 + 0.075;
export const CORD = { A: 0x3b82f6, B: 0xf97316 };
const LEDC = { on: 0x30c48d, warn: 0xf5c518, crit: 0xe5484d, off: 0x1a1d24, act: 0x7ee2a8, noin: 0xf59e0b };

const uy = (u) => Y0 + (u - 1) * U; // borde inferior de la U
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

// ---------- Texturas --------------------------------------------------------------
function railTexture(rear) {
  const per = 40, [c, g] = canvas(64, 42 * per);
  g.fillStyle = '#1d222c'; g.fillRect(0, 0, 64, c.height);
  for (let u = 1; u <= 42; u++) {
    const y = c.height - u * per;
    g.fillStyle = '#2a303c'; g.fillRect(0, y, 64, 1);
    g.fillStyle = '#0c0e12';
    for (const k of [0.2, 0.5, 0.8]) g.fillRect(rear ? 40 : 6, y + per * k - 3, 14, 6);
    g.fillStyle = u % 5 === 0 ? '#e8ecf4' : '#a3adbf';
    g.font = `${u % 5 === 0 ? 700 : 500} 22px ui-monospace, Consolas, monospace`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(u), rear ? 22 : 42, y + per / 2);
  }
  return tex(c);
}

function frontTexture(d) {
  const h = d.h, W = 640, H = 64 * h, [c, g] = canvas(W, H);
  const base = { server: '#2b313d', storage: '#323b4d', switch: '#23272f', firewall: '#2a2530', router: '#262d2a', patch: '#15171c' }[d.type] || '#2b313d';
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, W - 3, H - 3);
  // orejas de montaje con tornillos
  g.fillStyle = '#3a4150'; g.fillRect(0, 0, 18, H); g.fillRect(W - 18, 0, 18, H);
  g.fillStyle = '#0d0f13';
  for (let i = 0; i < h; i++) { g.beginPath(); g.arc(9, 64 * i + 32, 4, 0, 7); g.fill(); g.beginPath(); g.arc(W - 9, 64 * i + 32, 4, 0, 7); g.fill(); }
  const label = (x, y, size = 22) => { g.fillStyle = '#e6eaf2'; g.font = `600 ${size}px ui-monospace, Consolas, monospace`; g.textBaseline = 'middle'; g.fillText(d.name, x, y); };
  if (d.type === 'server' || d.type === 'storage') {
    const cols = d.type === 'storage' ? 6 : h >= 2 ? 8 : 4, rows = d.type === 'storage' ? 4 : h >= 2 ? 2 : 1;
    const x0 = 170, bw = (d.type === 'storage' ? 340 : 300) / cols, bh = (H - 16) / rows;
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const x = x0 + k * bw, y = 8 + r * bh;
      g.fillStyle = '#171a21'; g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      g.fillStyle = '#4a5468'; g.fillRect(x + 5, y + bh / 2 - 2, bw - 18, 4);
      g.fillStyle = '#1f8f63'; g.fillRect(x + bw - 11, y + 5, 4, 4);
    }
    // rejilla de ventilación (arriba) y nombre del equipo (abajo)
    if (h >= 2) { g.fillStyle = '#1a1e26'; for (let x = 26; x < 160; x += 9) g.fillRect(x, 8, 4, H - 44); }
    label(28, h >= 2 ? H - 18 : H / 2, h >= 2 ? 22 : 18);
  } else if (d.type === 'switch' || d.type === 'patch') {
    const n = 24, rows = d.type === 'patch' ? 1 : 2;
    const x0 = 150, pw = 13;
    for (let r = 0; r < rows; r++) for (let k = 0; k < n; k++) {
      const x = x0 + k * pw + Math.floor(k / 6) * 6, y = rows === 1 ? 20 : 8 + r * 26;
      g.fillStyle = '#07080a'; g.fillRect(x, y, pw - 3, rows === 1 ? 24 : 20);
      if (d.type === 'patch') { g.fillStyle = '#6b7385'; g.font = '9px ui-monospace, monospace'; g.fillText(String(k + 1), x + 1, 56); }
    }
    if (d.type === 'switch') { g.fillStyle = '#0a0b0e'; for (let k = 0; k < 2; k++) g.fillRect(490 + k * 22, 18, 18, 28); }
    label(26, 32, 18);
  } else {
    // firewall / router
    const ports = d.type === 'router' ? 8 : 6;
    for (let k = 0; k < ports; k++) { g.fillStyle = '#07080a'; g.fillRect(250 + k * 24, H / 2 - 12, 20, 24); }
    g.fillStyle = '#0a0b0e'; g.fillRect(470, H / 2 - 10, 28, 20); // consola
    g.fillStyle = '#7d879a'; g.font = '10px ui-monospace, monospace'; g.fillText('CON', 470, H / 2 + 20);
    if (d.type === 'router') { g.fillStyle = '#1b1f27'; g.fillRect(150, 10, 80, H - 20); }
    label(26, H / 2, 20);
  }
  return tex(c);
}

function rearTexture(d) {
  const h = d.h, W = 640, H = 64 * h, [c, g] = canvas(W, H);
  g.fillStyle = '#1b1f27'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#121419';
  // ventiladores
  if (d.type !== 'patch') for (let k = 0; k < (h >= 2 ? 3 : 2); k++) { const cx = 260 + k * 70; g.beginPath(); g.arc(cx, H / 2, Math.min(28, H / 2 - 6), 0, 7); g.fill(); g.strokeStyle = '#2a2f3a'; g.lineWidth = 2; g.stroke(); }
  // puertos de red
  g.fillStyle = '#07080a';
  for (let k = 0; k < (d.type === 'patch' ? 24 : 4); k++) g.fillRect(d.type === 'patch' ? 130 + k * 15 : 470 + k * 26, H / 2 - 9, 12, 18);
  return tex(c);
}

function blankTexture() {
  const [c, g] = canvas(512, 64);
  g.fillStyle = '#20242c'; g.fillRect(0, 0, 512, 64);
  g.fillStyle = '#262b35'; g.fillRect(20, 6, 472, 52);
  g.fillStyle = '#14171c'; g.fillRect(0, 62, 512, 2);
  g.fillStyle = '#0d0f13'; g.beginPath(); g.arc(9, 32, 4, 0, 7); g.fill(); g.beginPath(); g.arc(503, 32, 4, 0, 7); g.fill();
  const t = tex(c); t.wrapT = THREE.RepeatWrapping; return t;
}

function perforatedDoorTexture() {
  const [c, g] = canvas(128, 128);
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = 'rgba(40,46,58,1)'; g.fillRect(0, 0, 128, 128);
  g.globalCompositeOperation = 'destination-out';
  for (let y = 4; y < 128; y += 8) for (let x = 4; x < 128; x += 8) { g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); }
  const t = tex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 20); return t;
}

function pduTexture(b) {
  const [c, g] = canvas(64, 1024);
  g.fillStyle = '#16191f'; g.fillRect(0, 0, 64, 1024);
  g.fillStyle = b === 'A' ? '#3b82f6' : '#f97316'; g.fillRect(0, 0, 6, 1024); g.fillRect(58, 0, 6, 1024);
  for (let y = 40; y < 1000; y += 38) { g.fillStyle = '#050608'; g.fillRect(18, y, 28, 24); g.fillStyle = '#2b303a'; g.fillRect(26, y + 6, 4, 10); g.fillRect(34, y + 6, 4, 10); }
  return tex(c);
}

// ---------- Construcción -----------------------------------------------------------
export function createRackView() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1c2129);
  scene.fog = new THREE.Fog(0x1c2129, 6, 12);
  scene.add(new THREE.HemisphereLight(0xdfe6ff, 0x30353f, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(1.5, 3, 4); scene.add(key);
  const back = new THREE.DirectionalLight(0xffffff, 1.5); back.position.set(-1.5, 3, -4); scene.add(back);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshStandardMaterial({ color: 0x232833, roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const grid = new THREE.GridHelper(6, 10, 0x2f3542, 0x2a2f3a); grid.position.y = 0.001; scene.add(grid);

  const shared = { railF: railTexture(false), railR: railTexture(true), blank: blankTexture(), door: perforatedDoorTexture(), pduA: pduTexture('A'), pduB: pduTexture('B') };

  let root = null, R = null; // R: estado de la construcción actual
  const pickables = [];

  function clear() {
    if (!root) return;
    scene.remove(root);
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) [].concat(o.material).forEach((m) => { if (m.map && !Object.values(shared).includes(m.map)) m.map.dispose(); m.dispose(); });
    });
    root = null; R = null; pickables.length = 0;
  }

  function build(rackId, world) {
    clear();
    const def = RACKS.find((r) => r.id === rackId);
    root = new THREE.Group(); scene.add(root);
    const tagRack = { kind: 'rack', id: rackId };
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1a1f29, roughness: 0.55, metalness: 0.4, side: THREE.DoubleSide });
    // estructura: postes, techo, zócalo y laterales
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.03, RH, 0.03), frameMat);
      p.position.set(sx * (RW / 2 - 0.015), RH / 2, sz * (RD / 2 - 0.015)); root.add(p);
    }
    const top = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.03, RD), frameMat); top.position.y = RH - 0.015; root.add(top);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.05, RD), frameMat); plinth.position.y = 0.025; root.add(plinth);
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x161a22, roughness: 0.7, metalness: 0.3, side: THREE.DoubleSide });
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
      const side = new THREE.MeshStandardMaterial({ color: 0x272c36, roughness: 0.6, metalness: 0.35 });
      const mats = [side, side, side, side, new THREE.MeshStandardMaterial({ map: frontTexture(d), roughness: 0.55, metalness: 0.2 }), new THREE.MeshStandardMaterial({ map: rearTexture(d), roughness: 0.6 })];
      const box = new THREE.Mesh(new THREE.BoxGeometry(MOUNT_W, hgt, depth), mats);
      const yc = uy(d.u) + (d.h * U) / 2;
      box.position.set(0, yc, FRONT_Z - depth / 2); box.userData = tag; root.add(box); pickables.push(box);
      // LED: encendido, actividad, estado
      const leds = {};
      if (d.type !== 'patch') {
        ['pwr', 'act', 'st'].forEach((k, i) => {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.004), new THREE.MeshBasicMaterial({ color: LEDC.on }));
          m.position.set(MOUNT_W / 2 - 0.05 + i * 0.012, uy(d.u) + d.h * U - 0.012, FRONT_Z + 0.002);
          m.userData = tag; root.add(m); pickables.push(m); leds[k] = m;
        });
      }
      // fuentes (PSU1 lado A, PSU2 lado B) en la trasera
      const psus = [];
      if (d.type !== 'patch') {
        [-1, 1].forEach((sx, i) => {
          const p = new THREE.Mesh(new THREE.BoxGeometry(0.07, Math.min(0.038, hgt - 0.004), 0.02), new THREE.MeshStandardMaterial({ color: 0x2f3542, roughness: 0.5, metalness: 0.5 }));
          const px = sx * 0.15, pz = FRONT_Z - depth - 0.01;
          p.position.set(px, uy(d.u) + 0.022, pz); p.userData = tag; root.add(p); pickables.push(p);
          const led = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.003), new THREE.MeshBasicMaterial({ color: LEDC.on }));
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
      gapGlow = new THREE.Mesh(new THREE.PlaneGeometry(MOUNT_W, n * U), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
      gapGlow.position.set(0, uy(a) + (n * U) / 2, -0.2); root.add(gapGlow);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(MOUNT_W, n * U)), new THREE.LineDashedMaterial({ color: 0xff9f43, dashSize: 0.015, gapSize: 0.01 }));
      edges.computeLineDistances(); edges.position.set(0, uy(a) + (n * U) / 2, FRONT_Z + 0.001); root.add(edges);
      gapGlow.userData.edges = edges;
    }

    // PDU verticales (A a la izquierda mirando el frente, B a la derecha)
    const pdus = {};
    ['A', 'B'].forEach((b) => {
      const sx = b === 'A' ? -1 : 1;
      const tag = { kind: 'pdu', id: rackId + '/' + b };
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.72, 0.045), [0, 0, 0, 0, 0, 1].map((k) => (k ? new THREE.MeshStandardMaterial({ map: b === 'A' ? shared.pduA : shared.pduB, roughness: 0.6 }) : new THREE.MeshStandardMaterial({ color: 0x16191f, roughness: 0.6 }))));
      body.position.set(sx * PDU_X, 0.98, PDU_Z); body.userData = tag; root.add(body); pickables.push(body);
      const [c, g] = canvas(256, 128); const t = tex(c);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.025), new THREE.MeshBasicMaterial({ map: t }));
      screen.rotation.y = Math.PI; screen.position.set(sx * PDU_X, 1.79, PDU_Z - 0.0235); screen.userData = tag; root.add(screen); pickables.push(screen);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.06, 0.05), new THREE.MeshStandardMaterial({ color: b === 'A' ? CORD.A : CORD.B, roughness: 0.5 }));
      head.position.set(sx * PDU_X, 1.79, PDU_Z + 0.004); head.userData = tag; root.add(head); pickables.push(head);
      screen.renderOrder = 2;
      pdus[b] = { body, screen, c, g, t, last: '' };
    });

    // puerta trasera perforada con bisagra (semitransparente para ver el interior)
    const hinge = new THREE.Group(); hinge.position.set(RW / 2, RH / 2, -RD / 2 - 0.012); root.add(hinge);
    const door = new THREE.Mesh(new THREE.BoxGeometry(RW, RH - 0.04, 0.012), new THREE.MeshStandardMaterial({ map: shared.door, transparent: true, alphaTest: 0.02, opacity: 0.4, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide, depthWrite: false }));
    door.position.x = -RW / 2; hinge.add(door);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.16, 0.03), new THREE.MeshStandardMaterial({ color: 0x9aa4b8, metalness: 0.7, roughness: 0.3 }));
    handle.position.set(-RW + 0.05, 0, -0.02); hinge.add(handle);

    // sensor de entrada superior (R04 puede estar suelto)
    const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.02), new THREE.MeshStandardMaterial({ color: 0xe9eef7, emissive: 0x334455 }));
    sensor.userData = tagRack; root.add(sensor);

    // cable de consola de fw-01 (R02)
    let consoleCable = null;
    if (rackId === 'R02') {
      const fw = def.devices.find((d) => d.name === 'fw-01');
      const y = uy(fw.u) + U / 2, z = FRONT_Z - deviceInfo(rackId, fw).prof;
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.05, y, z - 0.005), new THREE.Vector3(0.08, y - 0.05, z - 0.12), new THREE.Vector3(0.12, 1.0, -RD / 2 - 0.12), new THREE.Vector3(0.1, 0.3, -RD / 2 - 0.35), new THREE.Vector3(0.0, 0.01, -RD / 2 - 0.6)]);
      consoleCable = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.004, 6), new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x13306a }));
      consoleCable.userData = { kind: 'device', id: 'R02/fw-01' }; root.add(consoleCable); pickables.push(consoleCable);
    }

    R = { rackId, def, devs, blanks, gapPanel, gapGlow, pdus, hinge, sensor, consoleCable, selBox: null };
    const sel = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)), 0x6b9bff); sel.visible = false; root.add(sel); R.selBox = sel;
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
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.0042, 6), new THREE.MeshStandardMaterial({ color: CORD[branch], roughness: 0.6 }));
    return m;
  }

  function drawPdu(P, b, load, on) {
    const key = on ? b + Math.round(load) : b + 'X';
    if (P.last === key) return;
    P.last = key;
    const g = P.g;
    g.fillStyle = '#050608'; g.fillRect(0, 0, 256, 128);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (!on) { g.fillStyle = '#ff5a52'; g.font = '700 46px ui-monospace, monospace'; g.fillText('TRIP', 128, 64); }
    else {
      g.fillStyle = load >= 80 ? '#ff5a52' : load >= 60 ? '#f5c518' : '#7ee2a8';
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
        D.leds.pwr.material.color.setHex(st === 'down' ? LEDC.off : LEDC.on);
        D.leds.st.material.color.setHex(st === 'down' ? LEDC.off : st === 'crit' ? LEDC.crit : st === 'warn' ? LEDC.warn : LEDC.on);
      }
      const br = psuBranches(world, R.rackId, d);
      const key = br.join('');
      if (key !== D.cordKey) {
        if (D.cords) { D.cords.forEach((c) => { root.remove(c); c.geometry.dispose(); c.material.dispose(); }); }
        D.cords = D.psus.map((p, i) => { const c = cordMesh(p, br[i]); c.userData = { kind: 'device', id: R.rackId + '/' + name }; root.add(c); return c; });
        D.cordKey = key;
      }
      D.psus.forEach((p, i) => p.led.material.color.setHex(branchPowered(world, R.rackId, br[i]) ? LEDC.on : (world.t < world.flags.powerCutUntil ? LEDC.off : LEDC.noin)));
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
      if (D.state === 'down') { D.leds.act.material.color.setHex(LEDC.off); continue; }
      const on = Math.sin(now / (90 / D.speed) + D.phase) + Math.sin(now / (37 / D.speed) + D.phase * 2) > 0.3;
      D.leds.act.material.color.setHex(on ? LEDC.act : LEDC.off);
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

  // posición de cámara para mirar un equipo
  function deviceCenter(name) {
    if (!R || !R.devs[name]) return null;
    return R.devs[name].box.position.clone();
  }

  return { scene, pickables, build, clear, sync, animate, select, deviceCenter, get rackId() { return R ? R.rackId : null; } };
}
