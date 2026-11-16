// Escena 3D de la sala con Three.js. Todos los colores, luces y texturas vienen
// del tema activo a través del adaptador (src/themes/three.js).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RACKS } from './scenario.js';
import { deviceState, rackMaxInlet, fmt1 } from './sim.js';
import { createRackView } from './rackview.js';
import { fadeRecord, setFade, collectMaterials, easeInOut, smoothstep } from './fade.js';
import { createThemeBinder, heatColor } from './themes/three.js';
import { getTokens } from './themes/index.js';
import { priorityOf, drawStatusIcon } from './status.js';

const U = 0.0445;
const RW = 0.6, RD = 1.1, RH = 2.0;
const PITCH = 0.62;

export function createScene(container, handlers) {
  const TB = createThemeBinder();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(getTokens().scene.fog, 14, 26);
  TB.on((T) => { renderer.setClearColor(T.scene.clear); scene.fog.color.set(T.scene.fog); });
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const CENTER = new THREE.Vector3(1.24, 0.7, 0);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(CENTER);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 2.2; controls.maxDistance = 16;

  const hemi = new THREE.HemisphereLight(); scene.add(hemi);
  const dir = new THREE.DirectionalLight(); dir.position.set(4, 8, 5); scene.add(dir);
  const dir2 = new THREE.DirectionalLight(); dir2.position.set(-5, 4, -6); scene.add(dir2);
  TB.on((T) => {
    const S = T.scene;
    hemi.color.set(S.hemiSky); hemi.groundColor.set(S.hemiGround); hemi.intensity = S.hemiInt;
    dir.color.set(S.hemiSky); dir.intensity = S.keyInt;
    dir2.color.set(S.fillColor); dir2.intensity = S.fillInt;
  });

  // Etiquetas (sprites) con los colores del tema
  const labels = [];
  function labelSprite(text, opts = {}) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 96;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(opts.w || 0.5, (opts.w || 0.5) * 0.375, 1);
    s.renderOrder = 10;
    let args = [text];
    s.userData.draw = (txt, sub) => {
      args = [txt, sub];
      const L = getTokens().scene.label, F = getTokens().fonts;
      const g = c.getContext('2d');
      g.clearRect(0, 0, 256, 96);
      g.fillStyle = L.bg;
      const w = 236, h = sub ? 84 : 56, x = 10, y = sub ? 6 : 20;
      g.beginPath(); g.roundRect(x, y, w, h, 14); g.fill();
      g.strokeStyle = L.border; g.lineWidth = 2; g.stroke();
      g.fillStyle = L.txt; g.font = `600 40px ${F.head}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(txt, 128, sub ? 36 : 48);
      if (sub) { g.fillStyle = L.sub; g.font = `500 28px ${F.mono}`; g.fillText(sub, 128, 70); }
      tex.needsUpdate = true;
    };
    s.userData.redraw = () => s.userData.draw(...args);
    s.userData.draw(text);
    labels.push(s);
    return s;
  }
  TB.on(() => labels.forEach((l) => l.userData.redraw()));

  // Texturas del piso y de los CRAC
  const tileTex = TB.canvas(128, 128, (g, T) => {
    g.fillStyle = T.scene.floor; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = T.scene.floorJoint; g.lineWidth = 4; g.strokeRect(0, 0, 128, 128);
  }, (t) => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 13); });
  const perfTex = TB.canvas(128, 128, (g, T) => {
    g.fillStyle = T.scene.perf; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = T.scene.perfJoint; g.lineWidth = 6; g.strokeRect(0, 0, 128, 128);
    g.fillStyle = T.scene.perfHole;
    for (let y = 14; y < 120; y += 12) for (let x = 14; x < 120; x += 12) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
  });
  const grilleTex = (label) => TB.canvas(256, 280, (g, T) => {
    const S = T.scene;
    g.fillStyle = S.cracGrille; g.fillRect(0, 0, 256, 280);
    g.fillStyle = S.cracSlat;
    for (let y = 70; y < 270; y += 10) g.fillRect(16, y, 224, 5);
    g.fillStyle = S.cracPanel; g.fillRect(16, 14, 110, 40);
    g.fillStyle = S.cracText; g.font = `600 22px ${T.fonts.mono}`; g.textBaseline = 'middle'; g.fillText(label, 24, 35);
  });
  // degradado radial para los halos (máscara; el color lo da el material)
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  const haloTex = TB.canvas(128, 128, (g, T) => {
    g.clearRect(0, 0, 128, 128);
    const gr = g.createRadialGradient(64, 64, 10, 64, 64, 63);
    gr.addColorStop(0, rgba(T.mask, 0.9)); gr.addColorStop(0.65, rgba(T.mask, 0.55)); gr.addColorStop(1, rgba(T.mask, 0));
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  });
  const std = (opts) => new THREE.MeshStandardMaterial(opts);

  // Piso técnico
  const floorMat = std({ map: tileTex, roughness: 0.9 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 7.8), floorMat);
  floor.userData.noFade = true;
  floor.rotation.x = -Math.PI / 2; floor.position.set(1.24, 0, 0); scene.add(floor);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
    const m = std({ map: perfTex, roughness: 0.7, emissiveIntensity: 0.6 });
    TB.color(m, (T) => T.scene.perfGlow, 'emissive');
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.58), m);
    p.rotation.x = -Math.PI / 2; p.position.set(i * PITCH, 0.003, -0.3 + j * 0.6); scene.add(p);
  }

  const pickables = [];
  const racks = {};

  // Contorno de alarma: 12 barras finas sobre las aristas del rack
  function outlineGroup(mat) {
    const g = new THREE.Group();
    const t = 0.016, w = RW + 0.03, h = RH + 0.03, d = RD + 0.03;
    const bar = (sx, sy, sz, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat); m.position.set(x, y, z); g.add(m); };
    for (const y of [0.01, h]) for (const z of [-d / 2, d / 2]) bar(w, t, t, 0, y, z);
    for (const y of [0.01, h]) for (const x of [-w / 2, w / 2]) bar(t, t, d, x, y, 0);
    for (const x of [-w / 2, w / 2]) for (const z of [-d / 2, d / 2]) bar(t, h, t, x, h / 2, z);
    return g;
  }

  // Racks
  RACKS.forEach((def) => {
    const idx = Number(def.id.slice(1));
    const g = new THREE.Group();
    if (def.row === 'A') { g.position.set((idx - 1) * PITCH, 0, -(0.6 + RD / 2)); }
    else { g.position.set((10 - idx) * PITCH, 0, 0.6 + RD / 2); g.rotation.y = Math.PI; }
    const bodyMat = std({ roughness: 0.55, metalness: 0.3 });
    TB.color(bodyMat, (T) => T.scene.rack);
    const body = new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RD), bodyMat);
    body.position.y = RH / 2; g.add(body);
    // marco frontal
    const innerMat = std({ roughness: 1 }); TB.color(innerMat, (T) => T.scene.rackInner);
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(RW - 0.08, 42 * U), innerMat);
    inner.position.set(0, 0.06 + 21 * U, RD / 2 + 0.002); g.add(inner);
    const devs = {};
    def.devices.forEach((d) => {
      const h = d.h * U - 0.004;
      const dm = std({ roughness: 0.6, metalness: 0.3 }); TB.color(dm, (T) => T.scene.dev[d.type] || T.scene.dev.server);
      const m = new THREE.Mesh(new THREE.BoxGeometry(RW - 0.1, h, 0.02), dm);
      const y = 0.06 + (d.u - 1) * U + (d.h * U) / 2;
      m.position.set(0, y, RD / 2 + 0.012); g.add(m);
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.035, Math.min(0.022, h * 0.6), 0.008), new THREE.MeshBasicMaterial());
      led.position.set(RW / 2 - 0.09, y, RD / 2 + 0.024); g.add(led);
      const led2 = led.clone(); led2.material = led.material; led2.position.x = -RW / 2 + 0.09; g.add(led2);
      devs[d.name] = { led, def: d };
    });
    // panel ciego faltante (hueco con brillo en modo calor)
    let gapGlow = null, gapFill = null;
    if (def.gap) {
      const [a, b] = def.gap;
      const gm = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }); TB.color(gm, (T) => T.scene.gapGlow);
      gapGlow = new THREE.Mesh(new THREE.PlaneGeometry(RW - 0.1, (b - a + 1) * U), gm);
      gapGlow.position.set(0, 0.06 + (a - 1) * U + ((b - a + 1) * U) / 2, RD / 2 + 0.004); g.add(gapGlow);
      const fm = std({ roughness: 0.8, metalness: 0.2 }); TB.color(fm, (T) => T.scene.dev.patch);
      const gh = (b - a + 1) * U;
      const geo = new THREE.BoxGeometry(RW - 0.1, gh, 0.012); geo.translate(0, gh / 2, 0);
      gapFill = new THREE.Mesh(geo, fm); gapFill.position.set(0, 0.06 + (a - 1) * U, RD / 2 + 0.008); gapFill.scale.y = 0.001; g.add(gapFill);
    }
    // estado: contorno + ícono de prioridad (+ halo en el piso si el tema lo usa)
    const outlineMat = new THREE.MeshBasicMaterial();
    const outline = outlineGroup(outlineMat); outline.visible = false; g.add(outline);
    const iconCanvas = document.createElement('canvas'); iconCanvas.width = iconCanvas.height = 128;
    const iconTex = new THREE.CanvasTexture(iconCanvas); iconTex.colorSpace = THREE.SRGBColorSpace;
    const icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex, depthTest: false, transparent: true }));
    icon.scale.set(0.36, 0.36, 1); icon.position.set(0, RH + 0.62, 0); icon.renderOrder = 11; icon.visible = false; g.add(icon);
    const haloMat = new THREE.MeshBasicMaterial({ map: haloTex, transparent: true, opacity: 0.55, depthWrite: false });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat);
    halo.rotation.x = -Math.PI / 2; halo.scale.set(1.15, 1.75, 1); halo.position.y = 0.006; halo.visible = false; g.add(halo);
    // puerta trasera con bisagra
    const hinge = new THREE.Group(); hinge.position.set(RW / 2, RH / 2, -RD / 2 - 0.012); g.add(hinge);
    const doorMat = std({ roughness: 0.5, metalness: 0.35 }); TB.color(doorMat, (T) => T.scene.rackDoor);
    const door = new THREE.Mesh(new THREE.BoxGeometry(RW, RH - 0.04, 0.02), doorMat);
    door.position.x = -RW / 2; hinge.add(door);
    // sensor de entrada superior
    const sensorMat = std({}); TB.color(sensorMat, (T) => T.scene.sensor); TB.color(sensorMat, (T) => T.scene.sensorGlow, 'emissive');
    const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.02), sensorMat);
    sensor.position.set(RW / 2 - 0.06, 1.86, RD / 2 + 0.03); g.add(sensor);
    // cable de consola (R02)
    let cable = null;
    if (def.id === 'R02') {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.12, 0.06 + 35.5 * U, -RD / 2 + 0.05), new THREE.Vector3(0.2, 1.2, -RD / 2 - 0.15), new THREE.Vector3(0.1, 0.35, -RD / 2 - 0.35), new THREE.Vector3(0.0, 0.01, -RD / 2 - 0.55)]);
      const cm = std({}); TB.color(cm, (T) => T.scene.cable); TB.color(cm, (T) => T.scene.cableGlow, 'emissive');
      cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.008, 6), cm);
      cable.visible = false; g.add(cable);
    }
    const label = labelSprite(def.id, { w: 0.55 });
    label.position.set(0, RH + 0.26, RD / 2 - 0.1); g.add(label);

    body.userData = { kind: 'rack', id: def.id };
    pickables.push(body);
    g.traverse((o) => { if (o.isMesh && o !== body) o.userData = { kind: 'rack', id: def.id }; if (o.isMesh && o !== label && o !== halo && !outline.children.includes(o)) pickables.push(o); });
    scene.add(g);
    racks[def.id] = { gapFill, g, bodyMat, outline, outlineMat, icon, iconCanvas, iconTex, iconKey: '', halo, haloMat, hinge, sensor, devs, gapGlow, label, cable, lastLabel: '' };
  });

  // CRAC
  const cracs = {};
  [['CRAC-1', -3.05], ['CRAC-2', 3.05]].forEach(([id, z]) => {
    const tex = grilleTex(id);
    const mats = [0, 0, 0, 0, 0, 0].map(() => { const m = std({ roughness: 0.6, metalness: 0.3 }); TB.color(m, (T) => T.scene.crac); return m; });
    const front = std({ map: tex, roughness: 0.6, metalness: 0.2 });
    if (z < 0) mats[4] = front; else mats[5] = front;
    const m = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.95, 0.85), mats);
    m.position.set(1.24, 0.975, z); scene.add(m);
    m.userData = { kind: 'crac', id };
    pickables.push(m);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.02), new THREE.MeshBasicMaterial());
    lamp.position.set(1.24 + 0.75, 1.75, z + (z < 0 ? 0.43 : -0.43)); scene.add(lamp);
    lamp.userData = m.userData; pickables.push(lamp);
    const lbl = labelSprite(id, { w: 0.7 }); lbl.position.set(1.24, 2.25, z); scene.add(lbl);
    cracs[id] = { m, lamp, front };
  });

  // UPS
  const upss = {};
  [['UPS-A', -1.15], ['UPS-B', 1.15]].forEach(([id, z]) => {
    const um = std({ roughness: 0.55, metalness: 0.3 }); TB.color(um, (T) => T.scene.ups);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.9, 1.0), um);
    m.position.set(-1.55, 0.95, z); scene.add(m);
    m.userData = { kind: 'ups', id }; pickables.push(m);
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.16), new THREE.MeshBasicMaterial());
    scr.position.set(-1.55 + 0.401, 1.5, z); scr.rotation.y = Math.PI / 2; scene.add(scr);
    scr.userData = m.userData; pickables.push(scr);
    const lbl = labelSprite(id, { w: 0.6 }); lbl.position.set(-1.55, 2.2, z); scene.add(lbl);
    upss[id] = { m, scr };
  });

  // Contención del pasillo frío (puertas de vidrio) y lector de acceso
  const glassMat = () => { const m = std({ transparent: true, opacity: 0.14, roughness: 0.1, metalness: 0.1, depthWrite: false }); TB.color(m, (T) => T.scene.glass); return m; };
  [-0.33, 4 * PITCH + 0.33].forEach((x) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.02, RH, 1.2), glassMat());
    p.position.set(x, RH / 2, 0); scene.add(p);
    const fm = std({}); TB.color(fm, (T) => T.scene.glassFrame);
    const fr = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.2), fm);
    fr.position.set(x, RH, 0); scene.add(fr);
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4 * PITCH + 0.66, 0.02, 1.2), glassMat());
  roof.position.set(2 * PITCH, RH + 0.01, 0); scene.add(roof);
  const acsMat = std({}); TB.color(acsMat, (T) => T.scene.acs); TB.color(acsMat, (T) => T.scene.acsGlow, 'emissive');
  const acs = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.1), acsMat);
  acs.position.set(4 * PITCH + 0.36, 1.25, 0.66); scene.add(acs);
  acs.userData = { kind: 'acs', id: 'ACS' }; pickables.push(acs);
  const acsLedMat = new THREE.MeshBasicMaterial(); TB.color(acsLedMat, (T) => T.led.on);
  const acsLed = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.03), acsLedMat);
  acsLed.position.set(4 * PITCH + 0.385, 1.3, 0.66); scene.add(acsLed);

  // Zona de detección de fugas (junto a CRAC-1)
  const leakMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false }); TB.color(leakMat, (T) => T.scene.leak);
  const leakZone = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.6), leakMat);
  leakZone.rotation.x = -Math.PI / 2; leakZone.position.set(1.24, 0.004, -2.33); scene.add(leakZone);
  leakZone.userData = { kind: 'leak', id: 'LEAK-Z3', noFade: true }; pickables.push(leakZone);
  const ropeMat = new THREE.MeshBasicMaterial(); TB.color(ropeMat, (T) => T.scene.rope);
  const rope = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.006, 0.012), ropeMat);
  rope.position.set(1.24, 0.006, -2.45); scene.add(rope);
  rope.userData = leakZone.userData; pickables.push(rope);
  const waterMat = std({ transparent: true, opacity: 0.55, roughness: 0.05, metalness: 0.2, depthWrite: false }); TB.color(waterMat, (T) => T.scene.water);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 40), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.set(0.7, 0.007, -2.42); water.visible = false; scene.add(water);
  water.userData = leakZone.userData; pickables.push(water);

  // Caja de embalaje junto a R06 (hallazgo del checklist de ronda; se retira con una acción)
  const boxMat = std({ roughness: 0.95 }); TB.color(boxMat, (T) => T.scene.cardboard);
  const trashBox = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.32), boxMat);
  trashBox.position.set(2.48, 0.15, 2.05); trashBox.rotation.y = 0.3; scene.add(trashBox);
  trashBox.userData = { kind: 'rack', id: 'R06' }; pickables.push(trashBox);

  // Baldosa de la zona 3 (se levanta) y paños absorbentes (aparecen al contener)
  const tilePivot = new THREE.Group(); tilePivot.position.set(0.41, 0.012, -2.42); scene.add(tilePivot);
  const tileMat = std({ map: tileTex, roughness: 0.9 });
  const tileGeo = new THREE.BoxGeometry(0.58, 0.02, 0.58); tileGeo.translate(0.29, 0, 0);
  const tile = new THREE.Mesh(tileGeo, tileMat); tilePivot.add(tile);
  tile.userData = leakZone.userData; pickables.push(tile);
  const mats = new THREE.Group(); mats.position.set(0.95, 0.012, -2.42); scene.add(mats);
  const matMat = std({ roughness: 1 }); TB.color(matMat, (T) => T.scene.leak);
  [[-0.15, -0.12, 0.3], [0.12, 0.05, -0.2], [0.32, -0.08, 0.6]].forEach(([x, z, r]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.012, 0.18), matMat); m.position.set(x, 0.006, z); m.rotation.y = r; mats.add(m); });
  mats.scale.setScalar(0.001); mats.userData.noFade = false;
  let tileTarget = 0, matsTarget = 0.001, blinkUntil = 0;

  // Selección
  const selBox = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1)));
  TB.color(selBox.material, (T) => T.scene.select);
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
    if (!downPos || e.button !== 0 || busy) { downPos = null; return; }
    const moved = Math.hypot(e.clientX - downPos[0], e.clientY - downPos[1]);
    downPos = null;
    if (moved > 6) return;
    const u = pick(e);
    if (u) { select(u.kind, u.id); handlers.onPick(u.kind, u.id); }
  });
  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.buttons || busy) return;
    const u = pick(e);
    renderer.domElement.style.cursor = u ? 'pointer' : 'grab';
    handlers.onHover(u, e);
  });
  renderer.domElement.addEventListener('pointerleave', () => handlers.onHover(null));
  renderer.domElement.addEventListener('dblclick', (e) => {
    if (detail || busy) return;
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

  // ---------- Animaciones de cámara --------------------------------------------------------
  const reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  let anim = null; // función por frame (now) → true cuando termina
  let busy = false; // transición sala ↔ detalle o frente ↔ trasera en curso
  function run(ms, step, done, ease = easeInOut) {
    // tiempo acumulado con pasos acotados: si un cuadro se demora (p. ej. al compilar
    // los shaders de la vista de detalle), la animación no salta al final
    let last = null, elapsed = 0;
    anim = (now) => {
      if (last === null) last = now;
      elapsed += Math.min(50, Math.max(0, now - last)); last = now;
      const k = ms <= 0 ? 1 : Math.min(1, elapsed / ms);
      step(ease(k), k);
      if (k >= 1) { anim = null; if (done) done(); }
    };
  }
  function flyTo(pos, target, ms = 700, done) {
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    run(ms, (e) => { camera.position.lerpVectors(p0, pos, e); controls.target.lerpVectors(t0, target, e); }, done, (k) => 1 - Math.pow(1 - k, 3));
  }
  function setBusy(b) { busy = b; controls.enabled = !b; if (b) handlers.onHover && handlers.onHover(null); container.classList.toggle('busy', b); }
  // Con prefers-reduced-motion: sin vuelo, solo un fundido corto del lienzo.
  function fadeCut(apply, done) {
    const cv = renderer.domElement;
    cv.style.transition = 'opacity 120ms ease';
    cv.style.opacity = '0';
    setTimeout(() => { apply(); cv.style.opacity = '1'; setTimeout(() => { cv.style.transition = ''; if (done) done(); }, 130); }, 130);
  }

  const VIEWS = {
    iso: [new THREE.Vector3(6.4, 5.2, 6.6), CENTER],
    top: [new THREE.Vector3(1.25, 10.5, 0.01), new THREE.Vector3(1.24, 0, 0)],
    aisle: [new THREE.Vector3(4.6, 1.6, 0), new THREE.Vector3(0.6, 1.0, 0)],
  };
  camera.position.copy(VIEWS.iso[0]);
  function setView(name) {
    if (busy) return;
    const v = VIEWS[name]; if (!v) return;
    if (detail) { exitRack(() => flyTo(v[0].clone(), v[1].clone())); return; }
    flyTo(v[0].clone(), v[1].clone());
  }
  // ---------- Tomas de cámara con línea de visión (modo Demo) -------------------------------------
  /** Caja de un objeto de la sala (solo mallas visibles: sin etiquetas ni íconos). */
  function targetBox(kind, id) {
    const o = objectFor(kind, id); if (!o) return null;
    const b = new THREE.Box3();
    o.updateMatrixWorld(true);
    o.traverse((m) => { if (m.isMesh && m.visible) b.expandByObject(m); });
    return b.isEmpty() ? new THREE.Box3().setFromObject(o) : b;
  }
  const occRay = new THREE.Raycaster();
  /** ¿Se ve el punto «to» desde «from» sin que otro objeto se interponga? (los del propio objetivo no cuentan) */
  function lineClear(from, to, kind, id) {
    const dir = to.clone().sub(from); const dist = dir.length(); dir.normalize();
    occRay.set(from, dir); occRay.near = 0; occRay.far = Math.max(0, dist - 0.03);
    return !occRay.intersectObjects(pickables, false).some((h) => h.object.visible && !(h.object.userData && h.object.userData.kind === kind && h.object.userData.id === id));
  }
  /** ¿La cámara quedaría dentro de algún objeto? (desde adentro, el raycasting no ve las caras) */
  function insideAny(pos) {
    const b = new THREE.Box3();
    return pickables.some((m) => m.visible && m.geometry && !m.geometry.type.startsWith('Plane') && b.setFromObject(m).expandByScalar(0.05).containsPoint(pos));
  }
  /** Frente de un objeto (vector unitario hacia donde mira) y su eje lateral. */
  function frontOf(kind, id) {
    let n;
    if (kind === 'rack') n = new THREE.Vector3(0, 0, RACKS.find((r) => r.id === id).row === 'A' ? 1 : -1);
    else if (kind === 'crac') n = new THREE.Vector3(0, 0, id === 'CRAC-1' ? 1 : -1);
    else if (kind === 'ups') n = new THREE.Vector3(1, 0, 0);
    else n = new THREE.Vector3(0, 0, 1);
    return { n, side: new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0)).negate() };
  }
  /**
   * Resuelve una toma: shot = { kind, id, look: [lado, alto, frente] (punto a mirar, relativo al centro
   * de la caja, en ejes del frente del objeto), cands: [[lado, alto, frente], …] (posiciones de cámara) }.
   * Devuelve la primera posición desde la que el objetivo se ve sin obstáculos (comprobado con
   * raycasting hacia el centro y hacia arriba y abajo de él), o null si todas están tapadas.
   */
  function resolveShot(shot) {
    const box = targetBox(shot.kind, shot.id); if (!box) return null;
    const c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const { n, side } = frontOf(shot.kind, shot.id);
    const rel = ([s, u, f]) => c.clone().addScaledVector(side, s).add(new THREE.Vector3(0, u, 0)).addScaledVector(n, f);
    const target = rel(shot.look || [0, 0, 0]);
    const samples = [target, target.clone().add(new THREE.Vector3(0, size.y * 0.25, 0)), target.clone().add(new THREE.Vector3(0, -size.y * 0.25, 0))];
    for (let i = 0; i < shot.cands.length; i++) {
      const pos = rel(shot.cands[i]);
      if (!insideAny(pos) && samples.every((p) => lineClear(pos, p, shot.kind, shot.id))) return { pos, target, index: i };
    }
    return null;
  }
  /** Vuela a una toma ya resuelta (ms = 0: salto inmediato). */
  function flyShot(res, kind, id, ms = 1600) {
    if (busy || !res) return false;
    if (detail) { exitRack(() => flyShot(res, kind, id, ms)); return true; }
    controls.minDistance = 0.5; // las tomas de la Demo pueden estar más cerca que la distancia mínima de la órbita
    if (ms <= 0 || reduceMotion.matches) { anim = null; camera.position.copy(res.pos); controls.target.copy(res.target); controls.update(); }
    else {
      // Curva que sube por sobre los racks y baja al punto final (Bézier cúbica con los puntos de
      // control sobre el origen y el destino): un vuelo en línea recta podía atravesar racks o techo.
      const p0 = camera.position.clone(), p3 = res.pos.clone(), t0 = controls.target.clone(), t1 = res.target.clone();
      const H = Math.max(3.6, p0.y, p3.y);
      const p1 = new THREE.Vector3(p0.x, H, p0.z), p2 = new THREE.Vector3(p3.x, H, p3.z);
      const direct = p0.distanceTo(p3) < 0.8; // tomas muy cercanas: sin subir
      run(ms, (e) => {
        if (direct) camera.position.lerpVectors(p0, p3, e);
        else { const u = 1 - e; camera.position.set(0, 0, 0).addScaledVector(p0, u * u * u).addScaledVector(p1, 3 * u * u * e).addScaledVector(p2, 3 * u * e * e).addScaledVector(p3, e * e * e); }
        controls.target.lerpVectors(t0, t1, e);
      });
    }
    select(kind, id);
    return true;
  }
  /** Corre el encuadre a la derecha (px de pantalla) para que el objetivo no quede bajo el inspector. */
  function setFrameOffset(px) {
    const w = container.clientWidth;
    viewShift = w ? px / w : 0; applyShift();
  }
  /** Detiene en seco cualquier animación de cámara y sale del detalle del rack sin transición. */
  function cancel() {
    anim = null;
    renderer.domElement.style.opacity = '1'; renderer.domElement.style.transition = '';
    if (detail) {
      RV.select(null); RV.clear(); detail = null; p = 0; resetContext();
      controls.minDistance = 2.2; controls.maxDistance = 16; controls.maxPolarAngle = Math.PI * 0.49;
      if (handlers.onDetail) handlers.onDetail(null);
    }
    controls.minDistance = 2.2;
    controls.autoRotate = autoRotate;
    setBusy(false);
  }

  /** Vuela hacia un objeto de la sala (ms: duración del vuelo; la Demo usa vuelos más lentos). */
  function focus(kind, id, ms = 700) {
    if (busy) return;
    if (detail && kind === 'rack' && id === detail) { RV.select(null); return; }
    if (detail) { exitRack(() => focus(kind, id, ms)); return; }
    const o = objectFor(kind, id); if (!o) return;
    const box = new THREE.Box3().setFromObject(o); const c = box.getCenter(new THREE.Vector3());
    let off;
    if (kind === 'rack') { const row = RACKS.find((r) => r.id === id).row; off = new THREE.Vector3(1.3, 1.9, row === 'A' ? 1.8 : -1.8); }
    else off = new THREE.Vector3(2.2, 1.6, c.z < 0 ? 2.6 : -2.6);
    flyTo(c.clone().add(off), c, reduceMotion.matches ? 0 : ms);
    select(kind, id);
  }

  function resize() {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = w + 'px'; renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h; applyShift();
  }
  // desplazamiento horizontal del encuadre (portada: la sala queda a la derecha del texto)
  let viewShift = 0;
  function applyShift() {
    const w = container.clientWidth, h = container.clientHeight;
    if (viewShift && w && h) camera.setViewOffset(w, h, -viewShift * w, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // ---------- Contexto de la sala que se atenúa en la vista de detalle ---------------------
  // Un "ítem" por objeto de primer nivel de la escena (cada rack, CRAC, UPS, vidrio…).
  // Los materiales compartidos entre ítems se clonan para atenuarlos por separado.
  const FOG = { near: 14, far: 26 };
  const items = [];
  {
    const owner = new Map();
    scene.children.forEach((obj) => {
      if (obj.isLight || obj === floor || obj === selBox) return;
      obj.traverse((o) => {
        if (!o.material || (o.userData && o.userData.noFade)) return;
        const arr = [].concat(o.material).map((m) => {
          if (owner.has(m) && owner.get(m) !== obj) return m.clone();
          owner.set(m, obj); return m;
        });
        o.material = Array.isArray(o.material) ? arr : arr[0];
      });
      const box = new THREE.Box3().setFromObject(obj);
      if (box.isEmpty()) return;
      const rackId = Object.keys(racks).find((k) => racks[k].g === obj) || null;
      items.push({ obj, rackId, box, center: box.getCenter(new THREE.Vector3()), floor: box.max.y < 0.06, recs: [...collectMaterials(obj)].map(fadeRecord), occ: 1 });
    });
  }
  const CTX = 0.22, CTX_FLOOR = 0.6;
  const tmpV = new THREE.Vector3(), tmpB = new THREE.Box3();
  // ¿El ítem tapa el rack (está entre la cámara y el rack) o envuelve a la cámara?
  function occludes(it, camLocal) {
    if (it.floor) return false;
    if (tmpB.copy(it.box).expandByScalar(0.45).containsPoint(camera.position)) return true;
    const c = RV.root.worldToLocal(tmpV.copy(it.center));
    const len = Math.hypot(camLocal.x, camLocal.z) || 1;
    const vx = camLocal.x / len, vz = camLocal.z / len;
    const along = c.x * vx + c.z * vz; // distancia hacia la cámara
    const perp = Math.abs(c.x * vz - c.z * vx);
    return along > 0.45 && along < len + 0.6 && perp < 1.5;
  }
  let p = 0; // 0 = sala, 1 = detalle
  let lastNow = 0;
  // Dos efectos independientes:
  //  · contexto: la sala se atenúa según el progreso p (niebla + opacidad);
  //  · ocultación: lo que queda entre la cámara y el rack (o la envuelve) se desvanece
  //    rápido según la geometría, durante toda la transición y en la vista de detalle.
  function applyContext(now, snap) {
    const dt = Math.min(0.1, (now - lastNow) / 1000 || 0.016); lastNow = now;
    if (!RV.root) return;
    const camLocal = RV.root.worldToLocal(camera.position.clone());
    const pe = smoothstep(0, 0.55, p);
    const own = 1 - smoothstep(0.15, 0.75, p); // el rack simple se funde con el detallado
    for (const it of items) {
      let f, fs;
      if (it.rackId === detail) { f = own; fs = own; }
      else {
        const target = occludes(it, camLocal) ? 0 : 1;
        it.occ = snap ? target : it.occ + (target - it.occ) * Math.min(1, dt * 14);
        const ctx = 1 + ((it.floor ? CTX_FLOOR : CTX) - 1) * pe;
        f = Math.min(ctx, it.occ);
        // las etiquetas se dibujan sin prueba de profundidad: se atenúan más para no tapar el rack
        fs = Math.min(1 + (CTX * 0.3 - 1) * pe, it.occ);
      }
      it.recs.forEach((r) => setFade(r, r.m.isSpriteMaterial ? fs : f));
    }
    RV.setOpacity(smoothstep(0.2, 1, p));
    scene.fog.near = FOG.near + (4.6 - FOG.near) * p;
    scene.fog.far = FOG.far + (11 - FOG.far) * p;
  }
  function resetContext() {
    for (const it of items) { it.occ = 1; it.recs.forEach((r) => setFade(r, 1)); }
    scene.fog.near = FOG.near; scene.fog.far = FOG.far;
  }

  // ---------- Vista de detalle del rack -------------------------------------------------
  const RV = createRackView(scene);
  let detail = null, roomCam = null, side = 'front';
  // al cambiar de tema, la vista de detalle abierta se reconstruye con los nuevos colores
  TB.on(() => {
    if (!detail || !RV.root || !world) return;
    const R = racks[detail];
    RV.build(detail, world, { position: R.g.position, quaternion: R.g.quaternion });
    RV.setOpacity(smoothstep(0.2, 1, p));
  });
  const ENTER_MS = 950, SIDE_MS = 900;
  // en coordenadas del rack: el rack queda a la derecha del centro para no quedar bajo el inspector
  const R_CAM = 3.7, CAM_Y = 1.2, TGT_Y = 1.0, TGT_X = 0.32;
  const camAt = (theta, r = R_CAM, y = CAM_Y) => new THREE.Vector3(Math.sin(theta) * r, y, Math.cos(theta) * r);
  const tgtAt = (theta) => new THREE.Vector3(-Math.cos(theta) * TGT_X, TGT_Y, Math.sin(theta) * TGT_X);
  const toWorld = (v) => RV.root.localToWorld(v.clone());
  const sideTheta = (sd) => (sd === 'front' ? 0 : Math.PI);

  // trayectoria con un arco vertical suave: pasa por sobre los racks (2 m) en vez de atravesarlos
  // ---------- Portada: órbita lenta de fondo y entrada a la sala ----------------------------
  const LANDING_POS = new THREE.Vector3(9.2, 5.6, 8.4), LANDING_SHIFT = 0.2;
  let landing = false;
  function setLanding(on, done) {
    if (on) {
      if (detail) { exitRack(() => setLanding(true, done)); return; }
      landing = true; anim = null;
      controls.enabled = false;
      camera.position.copy(LANDING_POS); controls.target.copy(CENTER);
      viewShift = LANDING_SHIFT; applyShift();
      controls.autoRotate = !reduceMotion.matches; controls.autoRotateSpeed = 0.35;
      if (done) done();
      return;
    }
    if (!landing) { if (done) done(); return; }
    landing = false;
    controls.autoRotate = false;
    setBusy(true);
    const [pos, tgt] = VIEWS.iso;
    const finish = () => { viewShift = 0; applyShift(); controls.autoRotate = autoRotate; setBusy(false); if (done) done(); };
    if (reduceMotion.matches) { fadeCut(() => { camera.position.copy(pos); controls.target.copy(tgt); viewShift = 0; applyShift(); controls.update(); }, finish); return; }
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    run(1400, (e) => { arcLerp(p0, pos, e); controls.target.lerpVectors(t0, tgt, e); viewShift = LANDING_SHIFT * (1 - e); applyShift(); }, finish);
  }

  function arcLerp(a, b, e) {
    camera.position.lerpVectors(a, b, e);
    const lift = Math.max(0, 2.8 - (a.y + b.y) / 2); // el punto medio queda sobre los 2 m de los racks
    camera.position.y += lift * Math.sin(Math.PI * e);
  }

  function enterRack(id, done) {
    if (busy) return false;
    if (detail === id) { if (done) done(); return true; }
    if (detail) { exitRack(() => enterRack(id, done)); return true; }
    roomCam = { pos: camera.position.clone(), target: controls.target.clone() };
    const R = racks[id];
    RV.build(id, world, { position: R.g.position, quaternion: R.g.quaternion });
    detail = id; side = 'front';
    selBox.visible = false; selected = null;
    controls.autoRotate = false;
    setBusy(true);
    if (handlers.onDetail) handlers.onDetail(id);
    const endPos = toWorld(camAt(0)), endTgt = toWorld(tgtAt(0));
    const finish = () => {
      controls.minDistance = 0.3; controls.maxDistance = 6; controls.maxPolarAngle = Math.PI * 0.62;
      setBusy(false); if (done) done();
    };
    if (reduceMotion.matches) {
      fadeCut(() => { camera.position.copy(endPos); controls.target.copy(endTgt); controls.update(); p = 1; applyContext(performance.now(), true); }, finish);
      return true;
    }
    for (const it of items) it.occ = 1;
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    controls.minDistance = 0.01; controls.maxDistance = 100; controls.maxPolarAngle = Math.PI;
    run(ENTER_MS, (e) => { arcLerp(p0, endPos, e); controls.target.lerpVectors(t0, endTgt, e); p = e; }, finish);
    return true;
  }

  function exitRack(done) {
    if (!detail || busy) return false;
    setBusy(true);
    if (handlers.onDetail) handlers.onDetail(null);
    RV.select(null);
    controls.minDistance = 0.01; controls.maxDistance = 100; controls.maxPolarAngle = Math.PI;
    const back = roomCam || { pos: VIEWS.iso[0].clone(), target: CENTER.clone() };
    const finish = () => {
      RV.clear(); detail = null; p = 0; resetContext();
      controls.minDistance = 2.2; controls.maxDistance = 16; controls.maxPolarAngle = Math.PI * 0.49;
      controls.autoRotate = autoRotate;
      setBusy(false);
      if (handlers.onDetailEnd) handlers.onDetailEnd(); // la UI se actualiza ya fuera del detalle
      if (done) done();
    };
    if (reduceMotion.matches) {
      fadeCut(() => { camera.position.copy(back.pos); controls.target.copy(back.target); controls.update(); }, finish);
      return true;
    }
    const p0 = camera.position.clone(), t0 = controls.target.clone();
    run(ENTER_MS, (e) => { arcLerp(p0, back.pos, e); controls.target.lerpVectors(t0, back.target, e); p = 1 - e; }, finish);
    return true;
  }

  // Frente ↔ trasera: la cámara rodea el rack en un arco (coordenadas del rack).
  function rackSide(sd) {
    if (!detail || busy) return false;
    side = sd;
    const c0 = RV.root.worldToLocal(camera.position.clone());
    const th0 = Math.atan2(c0.x, c0.z), r0 = Math.max(1.2, Math.hypot(c0.x, c0.z)), y0 = c0.y;
    let th1 = sideTheta(sd);
    let d = th1 - th0; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    if (Math.abs(Math.abs(d) - Math.PI) < 0.05) d = Math.PI; // de frente a trasera: siempre por el mismo lado
    const t0 = RV.root.worldToLocal(controls.target.clone());
    setBusy(true);
    const finish = () => setBusy(false);
    if (reduceMotion.matches) {
      fadeCut(() => { camera.position.copy(toWorld(camAt(th1))); controls.target.copy(toWorld(tgtAt(th1))); controls.update(); applyContext(performance.now(), true); }, finish);
      return true;
    }
    controls.minDistance = 0.01;
    run(SIDE_MS, (e) => {
      const th = th0 + d * e;
      camera.position.copy(toWorld(camAt(th, r0 + (R_CAM - r0) * e, y0 + (CAM_Y - y0) * e)));
      controls.target.copy(toWorld(new THREE.Vector3().lerpVectors(t0, tgtAt(th), e)));
    }, () => { controls.minDistance = 0.3; finish(); });
    return true;
  }

  function focusDevice(name) {
    if (!detail || busy) return;
    const pl = RV.deviceCenter(name); if (!pl) return;
    const th = sideTheta(side), z = Math.cos(th);
    flyTo(toWorld(new THREE.Vector3(pl.x - 0.1 * z, pl.y + 0.12, z * 1.35)), toWorld(new THREE.Vector3(-0.22 * z, pl.y, 0)), 650);
  }

  let world = null, mode = 'estado', sevMap = {}, pulse = 0;

  function sync() {
    if (!world) return;
    if (detail) RV.sync(world);
    const T = getTokens();
    for (const def of RACKS) {
      const R = racks[def.id], rk = world.racks[def.id];
      const real = rackMaxInlet(world, def.id);
      const sev = sevMap[def.id] || 'ok';
      const prio = priorityOf(sev);
      // estado: contorno + ícono de prioridad (en todos los temas)
      R.outline.visible = prio > 0;
      R.icon.visible = prio > 0;
      if (prio > 0) {
        R.outlineMat.color.set(T.sev[sev]);
        const key = sev + T.id + T.mode;
        if (R.iconKey !== key) {
          const g = R.iconCanvas.getContext('2d'); g.clearRect(0, 0, 128, 128);
          drawStatusIcon(g, 64, 64, 34, sev, T.sev[sev], T.onSev[sev], T.ui.bg2);
          R.iconTex.needsUpdate = true; R.iconKey = key;
        }
      }
      if (mode === 'calor') {
        const hc = heatColor(T, real);
        R.bodyMat.emissive.copy(hc).multiplyScalar(0.28);
        R.halo.visible = true; R.haloMat.color.copy(hc);
        const txt = def.id + '|' + fmt1(real) + '°';
        if (R.lastLabel !== txt) { R.label.userData.draw(def.id, fmt1(real) + ' °C'); R.lastLabel = txt; }
      } else {
        R.bodyMat.emissive.set(prio > 0 ? new THREE.Color(T.sev[sev]).multiplyScalar(0.1) : new THREE.Color(0, 0, 0));
        // halo en el piso: refuerzo del ícono, solo si el tema lo usa
        R.halo.visible = !!T.scene.halo && prio > 0 && prio < 3;
        if (R.halo.visible) R.haloMat.color.set(T.sev[sev]);
        if (R.lastLabel !== def.id) { R.label.userData.draw(def.id); R.lastLabel = def.id; }
      }
      for (const name in R.devs) {
        const st = deviceState(world, def.id, R.devs[name].def);
        R.devs[name].led.material.color.set({ ok: T.led.on, warn: T.led.warn, crit: T.led.crit, down: T.led.off, off: T.led.off }[st] || T.led.on);
      }
      R.hingeTarget = rk.rearOpen ? -1.75 : 0;
      if (R.cable) R.cable.visible = !!world.flags.cable;
      if (R.gapFill) R.gapFillTarget = rk.gap ? 0.001 : 1;
      if (def.id === 'R04') {
        R.sensorTarget = rk.sensorLoose ? [RW / 2 + 0.03, 1.35, -0.25, 0.5] : [RW / 2 - 0.06, 1.86, RD / 2 + 0.03, 0];
        if (!R.sensorInit) { R.sensor.position.set(...R.sensorTarget.slice(0, 3)); R.sensor.rotation.z = R.sensorTarget[3]; R.sensorInit = true; }
      }
      if (R.gapGlow) R.gapGlow.material.opacity = rk.gap ? (mode === 'calor' ? 0.55 : 0.0) : 0;
      if (R.gapGlow) R.gapGlow.visible = rk.gap && p < 0.01;
    }
    const c2 = world.flags.crac2Down;
    cracs['CRAC-2'].lamp.material.color.set(c2 ? T.led.crit : T.led.on);
    cracs['CRAC-1'].lamp.material.color.set(world.crac[1].off ? T.led.crit : T.led.on);
    upss['UPS-A'].scr.material.color.set(world.ups.A.mode === 'battery' ? T.led.warn : T.led.on);
    upss['UPS-B'].scr.material.color.set(T.led.on);
    water.visible = world.leak.active;
    water.scale.setScalar(Math.max(0.05, world.leak.radius));
    trashBox.visible = !!world.flags.trash;
    tileTarget = world.flags.tileLifted && world.leak.active ? -1.15 : 0;
    matsTarget = world.leak.active && world.leak.contained ? 1 : 0.001;
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (anim) anim(now);
    const dtS = Math.min(0.1, (now - (loop.prev || now)) / 1000); loop.prev = now;
    const k = Math.min(1, dtS * 6);
    for (const def of RACKS) {
      const R = racks[def.id];
      if (R.hingeTarget !== undefined) R.hinge.rotation.y += (R.hingeTarget - R.hinge.rotation.y) * k;
      if (R.gapFill && R.gapFillTarget !== undefined) R.gapFill.scale.y += (R.gapFillTarget - R.gapFill.scale.y) * k;
      if (R.sensorTarget) { const [x, y, z, rz] = R.sensorTarget; R.sensor.position.x += (x - R.sensor.position.x) * k; R.sensor.position.y += (y - R.sensor.position.y) * k; R.sensor.position.z += (z - R.sensor.position.z) * k; R.sensor.rotation.z += (rz - R.sensor.rotation.z) * k; }
    }
    tilePivot.rotation.z += (-tileTarget - tilePivot.rotation.z) * k;
    { const sc = mats.scale.x + (matsTarget - mats.scale.x) * k; mats.scale.setScalar(sc); }
    pulse = (Math.sin(now / 260) + 1) / 2;
    if (world && now < blinkUntil) cracs['CRAC-1'].lamp.material.color.set(Math.floor(now / 150) % 2 ? getTokens().led.on : getTokens().led.off);
    if (world) {
      leakZone.material.opacity = world.leak.active ? (0.15 + 0.25 * pulse) * (1 - 0.6 * p) : 0.0;
      if (world.flags.crac2Down) cracs['CRAC-2'].front.emissive.set(getTokens().sev.disaster).multiplyScalar(0.35 * pulse);
      else cracs['CRAC-2'].front.emissive.setRGB(0, 0, 0);
      for (const def of RACKS) {
        const sev = sevMap[def.id];
        const sc = priorityOf(sev) === 1 ? 0.36 * (1 + 0.18 * pulse) : 0.36; // el ícono de prioridad 1 late
        racks[def.id].icon.scale.set(sc, sc, 1);
        if (racks[def.id].gapGlow) racks[def.id].gapGlow.visible = world.racks[def.id].gap && p < 0.01;
      }
    }
    if (detail || p > 0) { applyContext(now, false); RV.animate(now); }
    if (selected && !detail) selBox.setFromObject(selected);
    controls.update();
    renderer.render(scene, camera);
  }
  requestAnimationFrame(loop);

  let autoRotate = false;
  return {
    update(w, m, sev) { world = w; mode = m; sevMap = sev; sync(); },
    setView, focus, select, enterRack, exitRack, rackSide, focusDevice, setLanding,
    resolveShot, flyShot, setFrameOffset, cancel,
    /** Vuelve a los límites normales de la órbita (al terminar las tomas de la Demo). */
    restoreOrbit() { if (!detail) controls.minDistance = 2.2; },
    get camPose() { return { pos: camera.position.toArray(), target: controls.target.toArray() }; },
    /** Animación breve al completar una acción en sala (el resto lo hace sync con el nuevo estado). */
    animateField(id) { if (id === 'crac1-boost') blinkUntil = performance.now() + 1500; if (world) sync(); },
    get landing() { return landing; },
    get detail() { return detail; },
    get busy() { return busy; },
    get animating() { return !!anim; },
    toggleRotate() { autoRotate = !autoRotate; if (!detail) controls.autoRotate = autoRotate; controls.autoRotateSpeed = 0.8; return autoRotate; },
    zoom(f) { if (busy) return; const d = camera.position.clone().sub(controls.target).multiplyScalar(f); const len = d.length(); if (len > controls.minDistance && len < controls.maxDistance) camera.position.copy(controls.target).add(d); },
  };
}
