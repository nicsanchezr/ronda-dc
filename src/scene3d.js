// Escena 3D de la sala con Three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RACKS, SEV } from './scenario.js';
import { deviceState, rackMaxInlet, fmt1 } from './sim.js';
import { createRackView } from './rackview.js';

const U = 0.0445;
const RW = 0.6, RD = 1.1, RH = 2.0;
const PITCH = 0.62;

export function heatColor(t) {
  const stops = [[18, 0x3b82f6], [24, 0x22c55e], [30, 0xeab308], [36, 0xf97316], [42, 0xef4444]];
  if (t <= stops[0][0]) return new THREE.Color(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    if (t <= stops[i][0]) {
      const [t0, c0] = stops[i - 1], [t1, c1] = stops[i];
      return new THREE.Color(c0).lerp(new THREE.Color(c1), (t - t0) / (t1 - t0));
    }
  }
  return new THREE.Color(stops[stops.length - 1][1]);
}

function labelSprite(text, opts = {}) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const s = new THREE.Sprite(mat);
  s.scale.set(opts.w || 0.5, (opts.w || 0.5) * 0.375, 1);
  s.renderOrder = 10;
  s.userData.draw = (txt, sub) => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 96);
    g.fillStyle = 'rgba(14,17,24,0.82)';
    const r = 18; const w = 236, h = sub ? 84 : 56, x = 10, y = sub ? 6 : 20;
    g.beginPath(); g.roundRect(x, y, w, h, r); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#e8ecf4'; g.font = '600 38px ui-sans-serif, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 128, sub ? 36 : 48);
    if (sub) { g.fillStyle = '#9aa4b8'; g.font = '500 28px ui-monospace, monospace'; g.fillText(sub, 128, 70); }
    tex.needsUpdate = true;
  };
  s.userData.draw(text);
  return s;
}

function perforatedTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#3d6fb0'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#2a4f86'; g.lineWidth = 6; g.strokeRect(0, 0, 128, 128);
  g.fillStyle = '#2b5288';
  for (let y = 14; y < 120; y += 12) for (let x = 14; x < 120; x += 12) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function tileTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#2a303c'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#1c2029'; g.lineWidth = 4; g.strokeRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function grilleTexture(label) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 280;
  const g = c.getContext('2d');
  g.fillStyle = '#2e3646'; g.fillRect(0, 0, 256, 280);
  g.fillStyle = '#232a37';
  for (let y = 70; y < 270; y += 10) g.fillRect(16, y, 224, 5);
  g.fillStyle = '#121620'; g.fillRect(16, 14, 110, 40);
  g.fillStyle = '#cfd6e4'; g.font = '600 26px ui-sans-serif, system-ui'; g.fillText(label, 140, 44);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createScene(container, handlers) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x161a22);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x161a22, 14, 26);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const CENTER = new THREE.Vector3(1.24, 0.7, 0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(CENTER);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 2.2; controls.maxDistance = 16;

  scene.add(new THREE.HemisphereLight(0xcfd8ff, 0x20242e, 1.1));
  const dir = new THREE.DirectionalLight(0xffffff, 1.4); dir.position.set(4, 8, 5); scene.add(dir);
  const dir2 = new THREE.DirectionalLight(0x8fb3ff, 0.5); dir2.position.set(-5, 4, -6); scene.add(dir2);

  // Piso técnico
  const tt = tileTexture(); tt.repeat.set(16, 13);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 7.8), new THREE.MeshStandardMaterial({ map: tt, roughness: 0.9 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(1.24, 0, 0); scene.add(floor);
  const perf = new THREE.MeshStandardMaterial({ map: perforatedTexture(), roughness: 0.7, emissive: 0x0b2346, emissiveIntensity: 0.6 });
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.58), perf);
    p.rotation.x = -Math.PI / 2; p.position.set(i * PITCH, 0.003, -0.3 + j * 0.6); scene.add(p);
  }

  const pickables = [];
  const racks = {};

  // Racks
  RACKS.forEach((def) => {
    const idx = Number(def.id.slice(1));
    const g = new THREE.Group();
    if (def.row === 'A') { g.position.set((idx - 1) * PITCH, 0, -(0.6 + RD / 2)); }
    else { g.position.set((10 - idx) * PITCH, 0, 0.6 + RD / 2); g.rotation.y = Math.PI; }
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1b202b, roughness: 0.55, metalness: 0.35, emissive: 0x000000 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RD), bodyMat);
    body.position.y = RH / 2; g.add(body);
    // marco frontal
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(RW - 0.08, 42 * U), new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 1 }));
    inner.position.set(0, 0.06 + 21 * U, RD / 2 + 0.002); g.add(inner);
    const devs = {};
    def.devices.forEach((d) => {
      const h = d.h * U - 0.004;
      const m = new THREE.Mesh(new THREE.BoxGeometry(RW - 0.1, h, 0.02), new THREE.MeshStandardMaterial({ color: d.type === 'patch' ? 0x20242d : d.type === 'storage' ? 0x313a4c : 0x2a3140, roughness: 0.6, metalness: 0.3 }));
      const y = 0.06 + (d.u - 1) * U + (d.h * U) / 2;
      m.position.set(0, y, RD / 2 + 0.012); g.add(m);
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.035, Math.min(0.022, h * 0.6), 0.008), new THREE.MeshBasicMaterial({ color: 0x30c48d }));
      led.position.set(RW / 2 - 0.09, y, RD / 2 + 0.024); g.add(led);
      const led2 = led.clone(); led2.material = led.material; led2.position.x = -RW / 2 + 0.09; g.add(led2);
      devs[d.name] = { led, def: d };
    });
    // panel ciego faltante (hueco con brillo)
    let gapGlow = null;
    if (def.gap) {
      const [a, b] = def.gap;
      gapGlow = new THREE.Mesh(new THREE.PlaneGeometry(RW - 0.1, (b - a + 1) * U), new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0 }));
      gapGlow.position.set(0, 0.06 + (a - 1) * U + ((b - a + 1) * U) / 2, RD / 2 + 0.004); g.add(gapGlow);
    }
    // barra de estado superior frontal
    const bar = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.035, 0.035), new THREE.MeshBasicMaterial({ color: 0x30c48d }));
    bar.position.set(0, RH + 0.02, RD / 2 - 0.02); g.add(bar);
    // puerta trasera con bisagra
    const hinge = new THREE.Group(); hinge.position.set(RW / 2, RH / 2, -RD / 2 - 0.012); g.add(hinge);
    const door = new THREE.Mesh(new THREE.BoxGeometry(RW, RH - 0.04, 0.02), new THREE.MeshStandardMaterial({ color: 0x232936, roughness: 0.5, metalness: 0.4 }));
    door.position.x = -RW / 2; hinge.add(door);
    // sensor de entrada superior
    const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.02), new THREE.MeshStandardMaterial({ color: 0xe9eef7, emissive: 0x334455 }));
    sensor.position.set(RW / 2 - 0.06, 1.86, RD / 2 + 0.03); g.add(sensor);
    // cable de consola (R02)
    let cable = null;
    if (def.id === 'R02') {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.12, 0.06 + 35.5 * U, -RD / 2 + 0.05), new THREE.Vector3(0.2, 1.2, -RD / 2 - 0.15), new THREE.Vector3(0.1, 0.35, -RD / 2 - 0.35), new THREE.Vector3(0.0, 0.01, -RD / 2 - 0.55)]);
      cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.008, 6), new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x13306a }));
      cable.visible = false; g.add(cable);
    }
    // logotipo en el costado de los extremos
    const label = labelSprite(def.id, { w: 0.55 });
    label.position.set(0, RH + 0.26, RD / 2 - 0.1); g.add(label);

    body.userData = { kind: 'rack', id: def.id };
    pickables.push(body);
    g.traverse((o) => { if (o.isMesh && o !== body) o.userData = { kind: 'rack', id: def.id }; if (o.isMesh && o !== label) pickables.push(o); });
    scene.add(g);
    racks[def.id] = { g, bodyMat, bar, hinge, sensor, devs, gapGlow, label, cable, lastLabel: '' };
  });

  // CRAC
  const cracs = {};
  [['CRAC-1', -3.05], ['CRAC-2', 3.05]].forEach(([id, z]) => {
    const tex = grilleTexture(id);
    const mats = [0, 0, 0, 0, 0, 0].map(() => new THREE.MeshStandardMaterial({ color: 0x2e3646, roughness: 0.6, metalness: 0.3 }));
    const front = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, metalness: 0.2, emissive: 0x000000 });
    if (z < 0) mats[4] = front; else mats[5] = front;
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.95, 0.85), mats);
    m.position.set(1.24, 0.975, z); scene.add(m);
    m.userData = { kind: 'crac', id };
    pickables.push(m);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.02), new THREE.MeshBasicMaterial({ color: 0x30c48d }));
    lamp.position.set(1.24 + 0.75, 1.75, z + (z < 0 ? 0.43 : -0.43)); scene.add(lamp);
    lamp.userData = m.userData; pickables.push(lamp);
    const lbl = labelSprite(id, { w: 0.7 }); lbl.position.set(1.24, 2.25, z); scene.add(lbl);
    cracs[id] = { m, lamp, front };
  });

  // UPS
  const upss = {};
  [['UPS-A', -1.15], ['UPS-B', 1.15]].forEach(([id, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.9, 1.0), new THREE.MeshStandardMaterial({ color: 0x283142, roughness: 0.55, metalness: 0.35 }));
    m.position.set(-1.55, 0.95, z); scene.add(m);
    m.userData = { kind: 'ups', id }; pickables.push(m);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.16), new THREE.MeshBasicMaterial({ color: 0x30c48d }));
    scr.position.set(-1.55 + 0.401, 1.5, z); scr.rotation.y = Math.PI / 2; scene.add(scr);
    scr.userData = m.userData; pickables.push(scr);
    const lbl = labelSprite(id, { w: 0.6 }); lbl.position.set(-1.55, 2.2, z); scene.add(lbl);
    upss[id] = { m, scr };
  });

  // Contención del pasillo frío (puertas de vidrio) y lector de acceso
  const glass = new THREE.MeshStandardMaterial({ color: 0x9fc1ff, transparent: true, opacity: 0.12, roughness: 0.1, metalness: 0.1, depthWrite: false });
  [-0.33, 4 * PITCH + 0.33].forEach((x) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.02, RH, 1.2), glass);
    p.position.set(x, RH / 2, 0); scene.add(p);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.2), new THREE.MeshStandardMaterial({ color: 0x5d6779 }));
    fr.position.set(x, RH, 0); scene.add(fr);
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4 * PITCH + 0.66, 0.02, 1.2), glass);
  roof.position.set(2 * PITCH, RH + 0.01, 0); scene.add(roof);
  const acs = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.1), new THREE.MeshStandardMaterial({ color: 0x1e2430, emissive: 0x0a3d2a }));
  acs.position.set(4 * PITCH + 0.36, 1.25, 0.66); scene.add(acs);
  acs.userData = { kind: 'acs', id: 'ACS' }; pickables.push(acs);
  const acsLed = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: 0x30c48d }));
  acsLed.position.set(4 * PITCH + 0.385, 1.3, 0.66); scene.add(acsLed);

  // Zona de detección de fugas (junto a CRAC-1)
  const leakZone = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.6), new THREE.MeshBasicMaterial({ color: 0xf5c518, transparent: true, opacity: 0.0, depthWrite: false }));
  leakZone.rotation.x = -Math.PI / 2; leakZone.position.set(1.24, 0.004, -2.33); scene.add(leakZone);
  leakZone.userData = { kind: 'leak', id: 'LEAK-Z3' }; pickables.push(leakZone);
  const rope = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.006, 0.012), new THREE.MeshBasicMaterial({ color: 0xc9a227 }));
  rope.position.set(1.24, 0.006, -2.45); scene.add(rope);
  rope.userData = leakZone.userData; pickables.push(rope);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshStandardMaterial({ color: 0x4aa3ff, transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2, depthWrite: false }));
  water.rotation.x = -Math.PI / 2; water.position.set(0.7, 0.007, -2.42); water.visible = false; scene.add(water);
  water.userData = leakZone.userData; pickables.push(water);

  // Selección
  const selBox = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)), 0x6b9bff);
  selBox.visible = false; scene.add(selBox);
  let selected = null;

  // Interacción
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let downPos = null;
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(detail ? RV.pickables : pickables, false).find((h) => h.object.visible && h.object.userData && h.object.userData.kind);
    return hit ? hit.object.userData : null;
  }
  renderer.domElement.addEventListener('pointerdown', (e) => { downPos = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!downPos || e.button !== 0) return;
    const moved = Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]);
    downPos = null;
    if (moved > 6) return;
    const u = pick(e);
    if (u) { select(u.kind, u.id); handlers.onPick(u.kind, u.id); }
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.buttons) return;
    const u = pick(e);
    renderer.domElement.style.cursor = u ? 'pointer' : 'grab';
    handlers.onHover(u, e);
  });
  renderer.domElement.addEventListener('pointerleave', () => handlers.onHover(null));
  renderer.domElement.addEventListener('dblclick', (e) => {
    if (detail) return;
    const u = pick(e);
    if (u && u.kind === 'rack' && handlers.onOpenRack) handlers.onOpenRack(u.id);
  });

  function objectFor(kind, id) {
    if (kind === 'rack') return racks[id].g;
    if (kind === 'crac') return cracs[id].m;
    if (kind === 'ups') return upss[id].m;
    if (kind === 'leak') return leakZone;
    if (kind === 'acs') return acs;
    return null;
  }
  function select(kind, id) {
    if (detail) { RV.select(kind, id); return; }
    const o = kind && kind !== 'device' && kind !== 'pdu' ? objectFor(kind, id) : null;
    selected = o;
    if (o) { selBox.setFromObject(o); selBox.visible = true; } else selBox.visible = false;
  }

  // Vistas de cámara
  let anim = null;
  function flyTo(pos, target, ms = 700, done) {
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    let start = null; // se toma del primer frame para no mezclar relojes
    anim = (now) => {
      if (start === null) start = now;
      const k = Math.min(1, (now - start) / ms); const e = 1 - Math.pow(1 - k, 3);
      camera.position.lerpVectors(p0, pos, e); controls.target.lerpVectors(t0, target, e);
      if (k >= 1) { anim = null; if (done) done(); }
    };
  }
  const VIEWS = {
    iso: [new THREE.Vector3(6.4, 5.2, 6.6), CENTER],
    top: [new THREE.Vector3(1.25, 10.5, 0.01), new THREE.Vector3(1.24, 0, 0)],
    aisle: [new THREE.Vector3(4.6, 1.6, 0), new THREE.Vector3(0.6, 1.0, 0)],
  };
  camera.position.copy(VIEWS.iso[0]);
  function setView(name) { if (detail) exitRack(false); const v = VIEWS[name]; if (v) flyTo(v[0].clone(), v[1].clone()); }
  function focus(kind, id) {
    if (detail && kind === 'rack' && id === detail) { RV.select(null); return; }
    if (detail) exitRack(false);
    const o = objectFor(kind, id); if (!o) return;
    const box = new THREE.Box3().setFromObject(o); const c = box.getCenter(new THREE.Vector3());
    let off;
    if (kind === 'rack') { const row = RACKS.find((r) => r.id === id).row; off = new THREE.Vector3(1.3, 1.9, row === 'A' ? 1.8 : -1.8); }
    else off = new THREE.Vector3(2.2, 1.6, c.z < 0 ? 2.6 : -2.6);
    flyTo(c.clone().add(off), c);
    select(kind, id);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // ---------- Vista de detalle del rack -------------------------------------------------
  const RV = createRackView();
  let detail = null, roomCam = null, side = 'front';
  // el rack queda a la derecha del centro para no quedar bajo el inspector
  const detailTarget = (sd) => new THREE.Vector3(sd === 'front' ? -0.32 : 0.32, 1.0, 0);
  const sideCam = (sd) => new THREE.Vector3(sd === 'front' ? 0.05 : -0.05, 1.2, sd === 'front' ? 3.7 : -3.7);
  function enterRack(id) {
    if (detail === id) return;
    const fromRoom = !detail;
    if (fromRoom) roomCam = { pos: camera.position.clone(), target: controls.target.clone() };
    const swap = () => {
      RV.build(id, world); detail = id; side = 'front';
      selBox.visible = false;
      controls.minDistance = 0.3; controls.maxDistance = 6; controls.maxPolarAngle = Math.PI * 0.62;
      controls.autoRotate = false;
      camera.position.copy(sideCam('front')).multiplyScalar(1.5); controls.target.copy(detailTarget('front'));
      flyTo(sideCam('front'), detailTarget('front'), 650);
      if (handlers.onDetail) handlers.onDetail(id);
    };
    if (fromRoom) {
      const R = racks[id];
      const c = new THREE.Vector3(); R.g.getWorldPosition(c); c.y = 1.0;
      const front = new THREE.Vector3(0, 0, 1).applyQuaternion(R.g.quaternion);
      flyTo(c.clone().add(front.multiplyScalar(1.2)), c, 420, swap);
    } else swap();
  }
  function exitRack(restore = true) {
    if (!detail) return;
    const id = detail;
    RV.clear(); detail = null; anim = null;
    controls.minDistance = 2.2; controls.maxDistance = 16; controls.maxPolarAngle = Math.PI * 0.49;
    controls.autoRotate = autoRotate;
    const R = racks[id];
    const c = new THREE.Vector3(); R.g.getWorldPosition(c); c.y = 1.0;
    const front = new THREE.Vector3(0, 0, 1).applyQuaternion(R.g.quaternion);
    camera.position.copy(c).add(front.multiplyScalar(2.3)); controls.target.copy(c);
    if (restore && roomCam) flyTo(roomCam.pos, roomCam.target, 650);
    if (handlers.onDetail) handlers.onDetail(null);
  }
  function rackSide(sd) {
    if (!detail) return;
    side = sd;
    flyTo(sideCam(sd), detailTarget(sd), 750);
  }
  function focusDevice(name) {
    const p = RV.deviceCenter(name); if (!p) return;
    const z = side === 'front' ? 1 : -1;
    flyTo(new THREE.Vector3(p.x - 0.1 * z, p.y + 0.12, z * 1.35), new THREE.Vector3(-0.22 * z, p.y, 0), 600);
  }

  let world = null, mode = 'estado', sevMap = {}, pulse = 0;
  const C = (hex) => new THREE.Color(hex);
  const LED = { ok: C(0x30c48d), warn: C(0xf5c518), crit: C(0xe5484d), down: C(0x14171d), off: C(0x2a2f39) };

  function sync() {
    if (!world) return;
    if (detail) RV.sync(world);
    for (const def of RACKS) {
      const R = racks[def.id], rk = world.racks[def.id];
      const real = rackMaxInlet(world, def.id);
      const sev = sevMap[def.id] || 'ok';
      if (mode === 'calor') {
        const hc = heatColor(real);
        R.bar.material.color.copy(hc);
        R.bodyMat.emissive.copy(hc).multiplyScalar(0.28);
        const txt = def.id + '|' + fmt1(real) + '°';
        if (R.lastLabel !== txt) { R.label.userData.draw(def.id, fmt1(real) + ' °C'); R.lastLabel = txt; }
      } else {
        R.bar.material.color.set(SEV[sev].color);
        R.bodyMat.emissive.setHex(sev !== 'ok' && sev !== 'info' ? new THREE.Color(SEV[sev].color).multiplyScalar(0.12).getHex() : 0x000000);
        if (R.lastLabel !== def.id) { R.label.userData.draw(def.id); R.lastLabel = def.id; }
      }
      for (const name in R.devs) {
        const st = deviceState(world, def.id, R.devs[name].def);
        R.devs[name].led.material.color.copy(LED[st] || LED.ok);
      }
      R.hinge.rotation.y = rk.rearOpen ? -1.75 : 0;
      if (R.cable) R.cable.visible = !!world.flags.cable;
      if (def.id === 'R04') {
        if (rk.sensorLoose) { R.sensor.position.set(RW / 2 + 0.03, 1.35, -0.25); R.sensor.rotation.z = 0.5; }
        else { R.sensor.position.set(RW / 2 - 0.06, 1.86, RD / 2 + 0.03); R.sensor.rotation.z = 0; }
      }
      if (R.gapGlow) R.gapGlow.material.opacity = rk.gap ? (mode === 'calor' ? 0.55 : 0.0) : 0;
      if (R.gapGlow) R.gapGlow.visible = rk.gap;
    }
    const c2 = world.flags.crac2Down;
    cracs['CRAC-2'].lamp.material.color.setHex(c2 ? 0xe5484d : 0x30c48d);
    cracs['CRAC-1'].lamp.material.color.setHex(world.crac[1].off ? 0xe5484d : 0x30c48d);
    upss['UPS-A'].scr.material.color.setHex(world.ups.A.mode === 'battery' ? 0xf5c518 : 0x30c48d);
    water.visible = world.leak.active;
    water.scale.setScalar(Math.max(0.05, world.leak.radius));
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (anim) anim(now);
    if (detail) { RV.animate(now); controls.update(); renderer.render(RV.scene, camera); return; }
    pulse = (Math.sin(now / 260) + 1) / 2;
    if (world) {
      leakZone.material.opacity = world.leak.active ? 0.15 + 0.25 * pulse : 0.0;
      if (world.flags.crac2Down) cracs['CRAC-2'].front.emissive.setRGB(0.35 * pulse, 0.03 * pulse, 0.03 * pulse);
      else cracs['CRAC-2'].front.emissive.setRGB(0, 0, 0);
      for (const def of RACKS) {
        const sev = sevMap[def.id];
        if (mode === 'estado' && (sev === 'disaster' || sev === 'high')) racks[def.id].bar.scale.y = 1 + pulse * 1.5;
        else racks[def.id].bar.scale.y = 1;
      }
    }
    if (selected) selBox.setFromObject(selected);
    controls.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);

  let autoRotate = false;
  return {
    update(w, m, sev) { world = w; mode = m; sevMap = sev; sync(); },
    setView, focus, select, enterRack, exitRack, rackSide, focusDevice,
    get detail() { return detail; },
    toggleRotate() { autoRotate = !autoRotate; controls.autoRotate = autoRotate; controls.autoRotateSpeed = 0.8; return autoRotate; },
    zoom(f) { const d = camera.position.clone().sub(controls.target).multiplyScalar(f); const len = d.length(); if (len > controls.minDistance && len < controls.maxDistance) camera.position.copy(controls.target).add(d); },
  };
}
