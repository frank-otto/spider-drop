// Cute spider, fly, candy, golden candy corn, candles, bat, swatter.
import * as THREE from 'three';

export function spider() {
  const g = new THREE.Group();
  const furM = new THREE.MeshStandardMaterial({ color: '#5e4488', roughness: .45, metalness: .1, emissive: '#26123e', emissiveIntensity: .6 });
  const legM = new THREE.MeshStandardMaterial({ color: '#46335e', roughness: .5, emissive: '#1a0c2a', emissiveIntensity: .5 });
  const abd = new THREE.Mesh(new THREE.SphereGeometry(.42, 24, 18), furM); abd.position.set(0, .12, -.05); abd.scale.set(1, .95, 1.05); abd.castShadow = true; g.add(abd);
  // orange hourglass-ish mark (cute pumpkin stripe)
  const mark = new THREE.Mesh(new THREE.SphereGeometry(.15, 14, 10), new THREE.MeshStandardMaterial({ color: '#ff8a2a', emissive: '#a03a00', emissiveIntensity: .5, roughness: .4 })); mark.scale.set(1, .55, .35); mark.position.set(0, .45, -.1); g.add(mark);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.3, 20, 16), furM); head.position.set(0, -.28, .2); head.castShadow = true; g.add(head);
  const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .2, emissive: '#555', emissiveIntensity: .4 }), black = new THREE.MeshBasicMaterial({ color: '#0a0610' }), shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 12), white); e.position.set(sx * .12, -.2, .44); g.add(e);
    const p = new THREE.Mesh(new THREE.SphereGeometry(.065, 12, 10), black); p.position.set(sx * .12, -.22, .54); g.add(p); g.userData['pupil' + sx] = p;
    const s = new THREE.Mesh(new THREE.SphereGeometry(.022, 8, 6), shine); s.position.set(sx * .12 + .03, -.17, .59); g.add(s);
    const fang = new THREE.Mesh(new THREE.ConeGeometry(.03, .1, 6), new THREE.MeshStandardMaterial({ color: '#e8e0f0' })); fang.rotation.x = Math.PI; fang.position.set(sx * .05, -.48, .4); g.add(fang);
  }
  const cheek = new THREE.MeshBasicMaterial({ color: '#ff7aa8', transparent: true, opacity: .5 }); for (const sx of [-1, 1]) { const c = new THREE.Mesh(new THREE.CircleGeometry(.05, 12), cheek); c.position.set(sx * .23, -.33, .44); c.lookAt(sx * .6, -.33, 1.5); g.add(c); }
  g.userData.legs = [];
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1, k = i % 4, ang = (k - 1.5) * .45;
    const hip = new THREE.Group(); hip.position.set(side * .22, -.1, .1 + Math.sin(ang) * .2); hip.rotation.y = side > 0 ? -ang : Math.PI + ang; g.add(hip);
    const up = new THREE.Mesh(new THREE.CapsuleGeometry(.045, .42, 4, 8), legM); up.rotation.z = Math.PI / 2; up.position.x = .23; up.castShadow = true;
    const upG = new THREE.Group(); upG.rotation.z = .55; upG.add(up); hip.add(upG);
    const knee = new THREE.Group(); knee.position.x = .46; upG.add(knee);
    const low = new THREE.Mesh(new THREE.CapsuleGeometry(.035, .5, 4, 8), legM); low.rotation.z = Math.PI / 2; low.position.x = .26; low.castShadow = true;
    const lowG = new THREE.Group(); lowG.rotation.z = -1.5; lowG.add(low); knee.add(lowG);
    g.userData.legs.push({ upG, lowG, ph: i * .8 + (side > 0 ? 1.6 : 0) });
  }
  return g;
}
export function animSpider(g, t, mode, look) {
  for (const L of g.userData.legs) {
    const w = mode === 'fly' ? Math.sin(t * 9 + L.ph) * .25 : Math.sin(t * 3 + L.ph) * .12;
    L.upG.rotation.z = (mode === 'fly' ? .2 : .55) + w; L.lowG.rotation.z = (mode === 'fly' ? -1.1 : -1.5) - w * .6;
  }
  if (look) for (const sx of [-1, 1]) { const p = g.userData['pupil' + sx]; p.position.x = sx * .12 + look.x * .03; p.position.y = -.22 + look.y * .03; }
}
export function fly() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(.13, 12, 10), new THREE.MeshStandardMaterial({ color: '#2a3a2a', roughness: .4, metalness: .4, emissive: '#0a1a0a' })); body.scale.set(1.3, .9, .9); g.add(body);
  const eyeM = new THREE.MeshStandardMaterial({ color: '#c02020', roughness: .3, emissive: '#601010', emissiveIntensity: .6 });
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(.065, 10, 8), eyeM); e.position.set(.13, .04, sx * .07); g.add(e); }
  const wm = new THREE.MeshBasicMaterial({ color: '#e0f0ff', transparent: true, opacity: .55, side: THREE.DoubleSide, depthWrite: false });
  for (const sx of [-1, 1]) { const p = new THREE.Group(); p.position.set(0, .08, sx * .05); const w = new THREE.Mesh(new THREE.CircleGeometry(.13, 12), wm); w.scale.set(1.5, .6, 1); w.position.set(-.08, .02, sx * .1); w.rotation.x = Math.PI / 2; p.add(w); g.add(p); g.userData['w' + sx] = p; }
  // glow ring so flies read against the dark wall
  g.userData.kind = 'fly'; return g;
}
export function candy(col) {
  const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: col, roughness: .25, metalness: .1, emissive: col, emissiveIntensity: .35 });
  const c = new THREE.Mesh(new THREE.SphereGeometry(.26, 18, 12), m); c.scale.set(1.25, 1, 1); c.castShadow = true; g.add(c);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(.22, .035, 6, 20), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .3, emissive: '#ffffff', emissiveIntensity: .25 })); stripe.rotation.y = Math.PI / 2; g.add(stripe);
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.ConeGeometry(.17, .28, 8), m); w.rotation.z = sx * Math.PI / 2; w.position.x = sx * .42; g.add(w); }
  g.userData.kind = 'candy'; return g;
}
export function candyCorn() {
  const g = new THREE.Group(); const mk = (c, e) => new THREE.MeshStandardMaterial({ color: c, emissive: e, emissiveIntensity: .5, roughness: .3, metalness: .3 });
  const parts = [['#fff4d0', '#806a30', .0, .12], ['#ffa020', '#a04a00', .22, .3], ['#ffd23a', '#a07000', .5, .42]];
  for (const [c, e, y0, r] of parts) { const m = new THREE.Mesh(new THREE.CylinderGeometry(y0 === 0 ? .02 : r - .1, r, .28, 16), mk(c, e)); m.position.y = .64 - y0 - .14; m.castShadow = true; g.add(m); }
  g.scale.setScalar(1.2); g.userData.kind = 'gold'; return g;
}
export function candle(h, tex) {
  const g = new THREE.Group();
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(.2, .24, h, 16), new THREE.MeshStandardMaterial({ color: '#efe2c4', roughness: .55, emissive: '#ff9a40', emissiveIntensity: .12 })); wax.position.y = h / 2; wax.castShadow = true; wax.receiveShadow = true; g.add(wax);
  for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(new THREE.CapsuleGeometry(.04, .15 + i * .1, 3, 6), wax.material); const a = i * 2.1; d.position.set(Math.cos(a) * .21, h - .12 - i * .05, Math.sin(a) * .21); g.add(d); }
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(.015, .015, .1, 4), new THREE.MeshBasicMaterial({ color: '#111' })); wick.position.y = h + .05; g.add(wick);
  const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ffd9a0', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); fl.scale.set(.42, .8, 1); fl.position.y = h + .4; g.add(fl);
  const core = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), new THREE.MeshBasicMaterial({ color: '#fff0c0' })); core.scale.y = 1.6; core.position.y = h + .2; g.add(core);
  g.userData.flame = fl; return g;
}
export function bat() {
  const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: '#2a1e2a', roughness: .5, emissive: '#100810', emissiveIntensity: .5 });
  const b = new THREE.Mesh(new THREE.SphereGeometry(.28, 14, 10), m); b.scale.set(1, 1.1, .9); b.castShadow = true; g.add(b);
  for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(.08, .22, 5), m); e.position.set(sx * .12, .33, 0); g.add(e);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff3a2a' })); eye.position.set(sx * .1, .06, .24); g.add(eye); }
  const s = new THREE.Shape(); s.moveTo(0, .1); s.lineTo(.4, .25); s.lineTo(.8, .3); s.quadraticCurveTo(.72, .05, .7, -.12); s.quadraticCurveTo(.58, -.02, .48, -.14); s.quadraticCurveTo(.36, -.04, .24, -.14); s.quadraticCurveTo(.12, -.04, 0, -.1); s.lineTo(0, .1);
  const wg = new THREE.ShapeGeometry(s, 6); const wm = new THREE.MeshStandardMaterial({ color: '#3a2840', side: THREE.DoubleSide, roughness: .5 });
  for (const sx of [-1, 1]) { const p = new THREE.Group(); p.position.x = sx * .2; const w = new THREE.Mesh(wg, wm); w.scale.x = sx; w.castShadow = true; p.add(w); g.add(p); g.userData['w' + sx] = p; }
  return g;
}
export function swatter() {
  // pivot at origin (ceiling); hangs down along -y, head at length L
  const g = new THREE.Group(); const L = 5.2;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(.07, .09, L - 1, 10), new THREE.MeshStandardMaterial({ color: '#8a5a2a', roughness: .6 })); handle.position.y = -(L - 1) / 2; handle.castShadow = true; g.add(handle);
  const c = document.createElement('canvas'); c.width = c.height = 128; const k = c.getContext('2d'); k.fillStyle = '#d02a2a'; k.fillRect(0, 0, 128, 128); k.fillStyle = '#7a0a0a'; for (let i = 0; i < 128; i += 12) { k.fillRect(i, 0, 4, 128); k.fillRect(0, i, 128, 4); }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, .1), new THREE.MeshStandardMaterial({ map: tx, roughness: .5, emissive: '#400000', emissiveIntensity: .4 })); head.position.y = -L + .2; head.castShadow = true; g.add(head);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(1.62, 1.82, .06), new THREE.MeshStandardMaterial({ color: '#601010' })); rim.position.copy(head.position); rim.position.z = -.03; g.add(rim);
  g.userData.L = L - .2; return g;
}
