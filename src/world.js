// Candle-lit crypt corridor (side view): stone back wall with gothic moon windows, wooden ceiling beams, floor slabs,
// pillars, wall niches with skulls, cobwebs, coffins, dust motes and faint light shafts. Everything is recycled along +x.
import * as THREE from 'three';

export const QUALITY = {
  low: { dpr: 1, shadows: false, bloom: .8, parts: .45, lights: 2 },
  mid: { dpr: 1.25, shadows: false, bloom: 1, parts: .7, lights: 3 },
  high: { dpr: 1.6, shadows: true, shadowSize: 1024, bloom: 1, parts: 1, lights: 4 },
  ultra: { dpr: 2, shadows: true, shadowSize: 2048, bloom: 1, parts: 1.3, lights: 5 }
};
export const CEIL = 9, SEG = 24, NSEG = 4;
export function rnd(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function softTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
}
function smokeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const r = rnd(5);
  for (let i = 0; i < 26; i++) { const x = 128 + (r() - .5) * 110, y = 128 + (r() - .5) * 110, s = 30 + r() * 60; const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, 'rgba(255,255,255,.22)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
  return new THREE.CanvasTexture(c);
}
export function flameTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 84, 2, 32, 72, 50); gr.addColorStop(0, 'rgba(255,255,230,1)'); gr.addColorStop(.25, 'rgba(255,200,90,.95)'); gr.addColorStop(.6, 'rgba(255,110,20,.45)'); gr.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(32, 4); g.quadraticCurveTo(62, 70, 32, 124); g.quadraticCurveTo(2, 70, 32, 4); g.fill(); return new THREE.CanvasTexture(c);
}
function stoneTextures(kind, seed) {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d'); const r = rnd(seed);
  const h = document.createElement('canvas'); h.width = h.height = N; const hg = h.getContext('2d');
  g.fillStyle = '#2a2530'; g.fillRect(0, 0, N, N); hg.fillStyle = '#000'; hg.fillRect(0, 0, N, N);
  const rows = kind === 'floor' ? 4 : 8, bh = N / rows;
  for (let y = 0; y < rows; y++) {
    const cols = kind === 'floor' ? 4 : 4 + (y % 2), bw = N / cols, off = (y % 2) * bw * .5;
    for (let x = -1; x < cols + 1; x++) {
      const x0 = x * bw + off + 3, y0 = y * bh + 3, w = bw - 6, hh = bh - 6; const l = 30 + r() * 22, hue = 250 + r() * 30;
      g.fillStyle = `hsl(${hue},${8 + r() * 8}%,${l}%)`; g.beginPath(); g.roundRect(x0, y0, w, hh, 8); g.fill();
      const gr = hg.createLinearGradient(0, y0, 0, y0 + hh); gr.addColorStop(0, '#d8d8d8'); gr.addColorStop(.5, '#ffffff'); gr.addColorStop(1, '#b0b0b0'); hg.fillStyle = gr; hg.beginPath(); hg.roundRect(x0, y0, w, hh, 10); hg.fill();
    }
  }
  const id = g.getImageData(0, 0, N, N), hd = hg.getImageData(0, 0, N, N);
  for (let i = 0; i < N * N; i++) { const n = (r() - .5) * 26; for (let k = 0; k < 3; k++) id.data[i * 4 + k] = Math.max(0, Math.min(255, id.data[i * 4 + k] + n)); hd.data[i * 4] = Math.max(0, Math.min(255, hd.data[i * 4] + n * .8)); }
  g.putImageData(id, 0, 0);
  for (let i = 0; i < 40; i++) { const x = r() * N, y = r() * N, s = 10 + r() * 50; const gr = g.createRadialGradient(x, y, 0, x, y, s); gr.addColorStop(0, `rgba(${20 + r() * 20},${30 + r() * 25},20,.35)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - s, y - s, 2 * s, 2 * s); }
  const nm = document.createElement('canvas'); nm.width = nm.height = N; const ng = nm.getContext('2d'); const nd = ng.createImageData(N, N);
  const H = (x, y) => hd.data[(((y + N) % N) * N + ((x + N) % N)) * 4] / 255;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = (H(x + 1, y) - H(x - 1, y)) * 3, dy = (H(x, y + 1) - H(x, y - 1)) * 3; const l = Math.hypot(dx, dy, 1); const i = (y * N + x) * 4; nd.data[i] = (-dx / l * .5 + .5) * 255; nd.data[i + 1] = (dy / l * .5 + .5) * 255; nd.data[i + 2] = (1 / l * .5 + .5) * 255; nd.data[i + 3] = 255; }
  ng.putImageData(nd, 0, 0);
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace; const nmap = new THREE.CanvasTexture(nm);
  for (const t of [map, nmap]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; } return { map, nmap };
}
function woodTexture(seed) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); const r = rnd(seed);
  g.fillStyle = '#4a2c18'; g.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 70; i++) { g.strokeStyle = `rgba(${20 + r() * 40},${10 + r() * 20},5,${.25 + r() * .3})`; g.lineWidth = 1 + r() * 2; g.beginPath(); const y = r() * 64; g.moveTo(0, y); for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x * .03 + i) * 2); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
export function cobweb(S, op = .28) {
  const pts = []; const spokes = 7, tips = [];
  for (let s = 0; s < spokes; s++) { const u = s / (spokes - 1); tips.push(new THREE.Vector3(Math.cos(u * Math.PI / 2) * S, -Math.sin(u * Math.PI / 2) * S, 0)); }
  for (const t of tips) pts.push(new THREE.Vector3(), t);
  for (let k = 1; k <= 5; k++) for (let s = 0; s < spokes - 1; s++) { const a1 = tips[s].clone().multiplyScalar(k / 5.5), a2 = tips[s + 1].clone().multiplyScalar(k / 5.5); const mid = a1.clone().add(a2).multiplyScalar(.5).multiplyScalar(.92); pts.push(a1, mid, mid, a2); }
  return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#e0e0ff', transparent: true, opacity: op }));
}
export function skull(mat) {
  const g = new THREE.Group(); const h = new THREE.Mesh(new THREE.SphereGeometry(.32, 18, 14), mat); h.scale.set(1, 1.05, 1.1); g.add(h);
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(.34, .16, .3), mat); jaw.position.set(0, -.26, .08); g.add(jaw);
  const dark = new THREE.MeshBasicMaterial({ color: '#0a0608' });
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.085, 10, 8), dark); e.position.set(sx * .12, .02, .3); g.add(e); }
  const n = new THREE.Mesh(new THREE.ConeGeometry(.04, .09, 3), dark); n.position.set(0, -.1, .34); n.rotation.x = Math.PI; g.add(n);
  return g;
}

export function createWorld(renderer, q, seed = 3) {
  const scene = new THREE.Scene(); const W = { scene }; const r = rnd(seed); W.rng = r;
  scene.background = new THREE.Color('#07050c'); scene.fog = new THREE.FogExp2('#0d0a16', .028);
  const wallT = stoneTextures('wall', 3), floorT = stoneTextures('floor', 9);
  wallT.map.repeat.set(SEG / 5, 2.2); wallT.nmap.repeat.set(SEG / 5, 2.2); floorT.map.repeat.set(SEG / 4, 2); floorT.nmap.repeat.set(SEG / 4, 2);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallT.map, normalMap: wallT.nmap, normalScale: new THREE.Vector2(1.2, 1.2), roughness: .92, color: '#b8b0c8' });
  const floorMat = new THREE.MeshStandardMaterial({ map: floorT.map, normalMap: floorT.nmap, roughness: .8, metalness: .05, color: '#a49cb4' });
  const wood = woodTexture(4), woodMat = new THREE.MeshStandardMaterial({ map: wood, roughness: .8, color: '#9a7458' });
  const boneMat = new THREE.MeshStandardMaterial({ color: '#d8cfb8', roughness: .7 });
  const pilT = wallT.map.clone(); pilT.repeat.set(1, 3); pilT.needsUpdate = true; const pilMat = new THREE.MeshStandardMaterial({ map: pilT, roughness: .9, color: '#a8a0b8' });
  const winMat = new THREE.MeshBasicMaterial({ color: '#3a4a8a', fog: false }), barMat = new THREE.MeshStandardMaterial({ color: '#141018', roughness: .6, metalness: .5 });
  const shaftMat = new THREE.MeshBasicMaterial({ color: '#7a8cff', transparent: true, opacity: .03, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const ceilMat = new THREE.MeshStandardMaterial({ color: '#1a1418', roughness: 1 });
  W.segs = [];
  for (let s = 0; s < NSEG; s++) {
    const g = new THREE.Group(); g.position.x = s * SEG; scene.add(g); W.segs.push(g);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(SEG, 12), wallMat); wall.position.set(SEG / 2, 5.5, -4); wall.receiveShadow = true; g.add(wall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(SEG, 12), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(SEG / 2, 0, 1.5); floor.receiveShadow = true; g.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(SEG, 12), ceilMat); ceil.rotation.x = Math.PI / 2; ceil.position.set(SEG / 2, CEIL + .6, 1.5); g.add(ceil);
    for (let b = 0; b < SEG / 3; b++) { const beam = new THREE.Mesh(new THREE.BoxGeometry(.45, .55, 10), woodMat); beam.position.set(b * 3 + 1.5, CEIL + .3, 1); beam.castShadow = true; beam.receiveShadow = true; g.add(beam); }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(SEG, .35, .4), woodMat); rail.position.set(SEG / 2, CEIL, -3.6); g.add(rail);
    // pillars
    for (const px of [0, SEG / 2]) { const p = new THREE.Mesh(new THREE.BoxGeometry(1.3, CEIL + 1, 1.3), pilMat); p.position.set(px, (CEIL + 1) / 2, -3.4); p.castShadow = p.receiveShadow = true; g.add(p); const cap = new THREE.Mesh(new THREE.BoxGeometry(1.7, .4, 1.7), pilMat); cap.position.set(px, .2, -3.4); g.add(cap); }
    // gothic window with moon glow + light shaft
    const wx = SEG / 4 + (r() - .5) * 2, sh = new THREE.Shape(); sh.moveTo(-.9, 0); sh.lineTo(-.9, 2.2); sh.quadraticCurveTo(-.9, 3.4, 0, 3.9); sh.quadraticCurveTo(.9, 3.4, .9, 2.2); sh.lineTo(.9, 0); sh.lineTo(-.9, 0);
    const win = new THREE.Mesh(new THREE.ShapeGeometry(sh), winMat); win.position.set(wx, 4.4, -3.95); g.add(win);
    for (const bx of [-.3, .3]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(.07, 3.9, .08), barMat); bar.position.set(wx + bx, 6.3, -3.9); g.add(bar); } const hb = new THREE.Mesh(new THREE.BoxGeometry(1.8, .07, .08), barMat); hb.position.set(wx, 6, -3.9); g.add(hb);
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 9), shaftMat); shaft.position.set(wx + 1.8, 3.6, -1.5); shaft.rotation.set(-.5, 0, .45); g.add(shaft);
    // niches with skulls + second window
    const nx = SEG * .75 + (r() - .5) * 2;
    const niche = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.3, .5), new THREE.MeshStandardMaterial({ color: '#0e0a10', roughness: 1 })); niche.position.set(nx, 2.4, -3.85); g.add(niche);
    for (let k = 0; k < 3; k++) { const sk = skull(boneMat); sk.position.set(nx - .75 + k * .75, 2.3, -3.65); sk.rotation.y = (r() - .5) * .6; sk.scale.setScalar(.85); g.add(sk); }
    const win2 = win.clone(); win2.position.set(nx, 4.6, -3.95); win2.scale.setScalar(.8); g.add(win2);
    // coffin on the floor against the wall
    if (r() < .7) { const cs = new THREE.Shape(); cs.moveTo(-.35, 0); cs.lineTo(-.55, 1.3); cs.lineTo(-.35, 2.1); cs.lineTo(.35, 2.1); cs.lineTo(.55, 1.3); cs.lineTo(.35, 0); cs.lineTo(-.35, 0); const cof = new THREE.Mesh(new THREE.ExtrudeGeometry(cs, { depth: .6, bevelEnabled: true, bevelSize: .04, bevelThickness: .04, bevelSegments: 2 }), woodMat); cof.rotation.set(-Math.PI / 2, 0, Math.PI / 2 + (r() - .5) * .3); cof.position.set(SEG * .5 + 3 + r() * 3, 0, -2.6); cof.castShadow = cof.receiveShadow = true; g.add(cof); }
    // cobwebs at the ceiling corners
    for (let k = 0; k < 3; k++) { const w = cobweb(1.3 + r() * 1.1, .2 + r() * .1); w.position.set(k * 8 + 2 + r() * 3, CEIL, -3.5); if (r() < .5) w.scale.x = -1; g.add(w); }
    // bones on the floor
    for (let k = 0; k < 3; k++) { const bn = new THREE.Mesh(new THREE.CapsuleGeometry(.05, .5, 4, 8), boneMat); bn.rotation.set(Math.PI / 2, 0, r() * 3); bn.position.set(r() * SEG, .06, -2 + r() * 2); g.add(bn); }
  }
  // ---- lights ----
  W.hemi = new THREE.HemisphereLight('#7a6ab8', '#2a1a20', 1.25); scene.add(W.hemi);
  const moon = new THREE.DirectionalLight('#a8b4ff', 2.4); moon.castShadow = true; moon.shadow.bias = -.0008; moon.shadow.normalBias = .03;
  const sc = moon.shadow.camera; sc.left = -16; sc.right = 16; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 50; scene.add(moon, moon.target); W.moon = moon;
  W.fill = new THREE.DirectionalLight('#ffb070', .6); scene.add(W.fill, W.fill.target);
  W.candleLights = []; for (let i = 0; i < 5; i++) { const L = new THREE.PointLight('#ffa050', 0, 10, 1.8); scene.add(L); W.candleLights.push({ L, ph: i * 1.9 }); }
  W.flashL = new THREE.PointLight('#ffffff', 0, 14, 1.6); scene.add(W.flashL);
  // ---- dust motes + floor fog ----
  const soft = softTexture(), smoke = smokeTexture(); W.soft = soft; W.smokeTex = smoke; W.flameTex = flameTexture();
  const nM = Math.round(200 * q.parts), mg = new THREE.BufferGeometry(), mp = new Float32Array(nM * 3);
  for (let i = 0; i < nM; i++) { mp[i * 3] = r() * 40 - 10; mp[i * 3 + 1] = r() * CEIL; mp[i * 3 + 2] = -3 + r() * 6; }
  mg.setAttribute('position', new THREE.BufferAttribute(mp, 3)); W.motes = { n: nM, p: mp, g: mg };
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ map: soft, color: '#d8c8b0', size: .06, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending })); motes.frustumCulled = false; scene.add(motes);
  W.fog = []; for (let i = 0; i < Math.round(20 * q.parts); i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: smoke, color: '#5a4a7a', transparent: true, opacity: .1 + r() * .06, depthWrite: false })); s.position.set(r() * 40 - 10, .4 + r() * .6, -2 + r() * 4); s.scale.setScalar(4 + r() * 4); scene.add(s); W.fog.push(s); }
  return W;
}
// candles: array of {x, y (flame), on} (closest get the real lights)
export function updateWorld(W, t, dt, camX, focusX, candles, q) {
  { const lo = Math.floor((camX - 16) / SEG) * SEG, span = SEG * NSEG; for (const s of W.segs) { while (s.position.x + SEG <= lo) s.position.x += span; while (s.position.x >= lo + span) s.position.x -= span; } }
  const near = candles.filter(c => Math.abs(c.x - focusX) < 18).sort((a, b) => Math.abs(a.x - focusX) - Math.abs(b.x - focusX));
  W.candleLights.forEach((l, i) => { const c = near[i]; if (!c || i >= q.lights) { l.L.intensity = 0; return; } l.L.position.set(c.x, c.y + .4, .8); l.L.intensity = 7 * (.82 + .18 * Math.sin(t * 11 + l.ph) * Math.sin(t * 6.1 + l.ph)); });
  W.moon.position.set(focusX - 5, 8, 14); W.moon.target.position.set(focusX, 3, -4);
  W.fill.position.set(focusX + 8, 2, 10); W.fill.target.position.set(focusX, 4, 0);
  const m = W.motes; for (let i = 0; i < m.n; i++) { m.p[i * 3] += Math.sin(t * .4 + i) * dt * .15; m.p[i * 3 + 1] += Math.cos(t * .3 + i * 1.3) * dt * .12; if (m.p[i * 3] < camX - 16) m.p[i * 3] += 40; }
  m.g.attributes.position.needsUpdate = true;
  for (const f of W.fog) { if (f.position.x < camX - 16) f.position.x += 40; f.material.rotation += dt * .03; }
}
