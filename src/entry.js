import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { createWorld, updateWorld, QUALITY, CEIL, cobweb } from './world.js';
import { spider, animSpider, fly, candy, candyCorn, candle, bat, swatter } from './models.js';
import { createFX, sparks, puff, updateFX } from './fx.js';
import * as A from './audio.js';
import { T } from './i18n.js';

const URL_TXT = 'frank-otto.github.io/spider-drop', KIDS_ROUND = 60, R = .5, FLOOR = .6;
const $ = id => document.getElementById(id);
const ls = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
let seed = (window.__sdSeed || (Date.now() & 0xffffff)) >>> 0;
function rng() { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const lerp = (a, b, k) => a + (b - a) * k, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const DIFF = {
  easy: { g: 15, lives: 5, gap0: 15, gap1: 12, haz: .55, swat: .8, batSp: 1.5, mult: 1 },
  medium: { g: 17, lives: 3, gap0: 13, gap1: 9.5, haz: .75, swat: 1, batSp: 2.5, mult: 1 },
  hard: { g: 19, lives: 2, gap0: 11, gap1: 8, haz: .95, swat: 1.25, batSp: 3.5, mult: 1.5 },
  kids: { g: 13, lives: 99, gap0: 16, gap1: 14, haz: .4, swat: .6, batSp: 1, mult: 1 }
};
const S = {
  state: 'menu', lang: ls.get('sd-lang', 'en'), diff: ls.get('sd-diff', 'medium'), kids: ls.get('sd-kids', '0') === '1', q: ls.get('sd-q', ''), qUser: !!ls.get('sd-q', ''),
  score: 0, el: 0, gt: 0, dist: 0, flies: 0, candies: 0, golds: 0, streak: 0, bestStreak: 0, mult: 1, lives: 3, inv: 0, newBest: false, best: 0, hits: 0,
  name: ls.get('sd-name', 'Player') || 'Player', shake: 0, flash: 0, endT: -1, time: KIDS_ROUND, hold: false, swings: 0
};
if (!DIFF[S.diff] || S.diff === 'kids') S.diff = 'medium';
if (!QUALITY[S.q]) { S.q = 'high'; S.qUser = false; }
const bestKey = () => 'sd-best-' + (S.kids ? 'kids' : S.diff);
const D = () => DIFF[S.kids ? 'kids' : S.diff];
A.setClock(() => S.gt);
const t = k => T[S.lang][k] || T.en[k] || k;

// ---------------- renderer / scene ----------------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25; renderer.shadowMap.type = THREE.PCFShadowMap;
const W = createWorld(renderer, QUALITY[S.q], 3); const scene = W.scene;
const camera = new THREE.PerspectiveCamera(48, 1, .1, 200);
const F = createFX(scene, W.soft, W.smokeTex);
let composer, bloom;
function buildComposer() {
  if (composer) composer.dispose();
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), .3 * QUALITY[S.q].bloom, .35, .9); composer.addPass(bloom); // small, high threshold: flames glow, no glare veil
  composer.addPass(new OutputPass());
}
function applyQuality(qn, user) {
  S.q = qn; if (user) { S.qUser = true; ls.set('sd-q', qn); }
  const q = QUALITY[qn]; renderer.shadowMap.enabled = q.shadows; W.moon.castShadow = q.shadows;
  if (q.shadows) { W.moon.shadow.mapSize.set(q.shadowSize, q.shadowSize); if (W.moon.shadow.map) { W.moon.shadow.map.dispose(); W.moon.shadow.map = null; } }
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
  buildComposer(); resize(); $('btnQ').textContent = '⚙ ' + t('q_' + qn);
}
let VW = 1, VH = 1, camDist = 14;
function resize() {
  VW = window.innerWidth; VH = window.innerHeight; const dpr = Math.min(window.devicePixelRatio || 1, QUALITY[S.q].dpr);
  renderer.setPixelRatio(dpr); renderer.setSize(VW, VH, false); if (composer) { composer.setPixelRatio(dpr); composer.setSize(VW, VH); }
  camera.aspect = VW / VH; camera.fov = camera.aspect < .7 ? 56 : 48; camera.updateProjectionMatrix();
  const th = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); camDist = Math.max(6.4 / th, 7.2 / (th * camera.aspect) * .82); if (camera.aspect < .7) camDist = Math.min(camDist, 8.4 / th);
}

// ---------------- spider + silk ----------------
const sp = spider(); sp.scale.setScalar(1.45); scene.add(sp);
const P = new THREE.Vector2(0, 5), V = new THREE.Vector2(4, 0); let attached = null, ropeL = 0, shoot = 0;
const silkMat = new THREE.MeshBasicMaterial({ color: '#eef0ff', transparent: true, opacity: .92 });
const silk = new THREE.Mesh(new THREE.CylinderGeometry(.028, .028, 1, 6), silkMat); silk.visible = false; scene.add(silk);
const anchorWeb = cobweb(.55, .6); anchorWeb.visible = false; scene.add(anchorWeb);
function attach() {
  if (attached || S.state === 'end') return;
  const ahead = clamp(2.6 + V.x * .2, 2, 5.5); attached = new THREE.Vector2(P.x + ahead, CEIL); ropeL = attached.distanceTo(P); shoot = 0; S.swings++;
  A.sfx.web(); sparks(F, new THREE.Vector3(attached.x, CEIL, 0), 10, { colors: ['#ffffff', '#d8d8ff'], speed: 1.5, life: .4, grav: 2, size: .07 });
}
function detach() { if (!attached) return; attached = null; A.sfx.release(V.length()); }
function press() { S.hold = true; if (S.state === 'play' || S.state === 'menu') attach(); }
function releaseP() { S.hold = false; detach(); }

// ---------------- level objects ----------------
const items = [], haz = [], candles = [];
let nextX = 10, pat = 0;
const halo = new THREE.SpriteMaterial({ map: W.soft, color: '#bfffa0', transparent: true, opacity: .32, blending: THREE.AdditiveBlending, depthWrite: false });
function addItem(kind, x, y) {
  const m = kind === 'fly' ? fly() : kind === 'gold' ? candyCorn() : candy(['#ff5a8a', '#ff9a2a', '#b06aff', '#4ad8ff'][Math.floor(rng() * 4)]);
  m.position.set(x, y, 0); if (kind === 'fly') m.scale.setScalar(1.3); scene.add(m);
  if (kind !== 'candy') { const h = new THREE.Sprite(kind === 'gold' ? Object.assign(halo.clone(), {}) : halo); if (kind === 'gold') h.material.color.set('#ffc040'); h.scale.setScalar(kind === 'gold' ? 2 : .9); m.add(h); }
  items.push({ kind, m, x, y, ph: rng() * 6, taken: false, t: 0 });
}
function addCandle(x, y, h, floating) {
  const m = candle(h, W.flameTex); m.position.set(x, y, 0); scene.add(m);
  if (floating) { const hold = new THREE.Mesh(new THREE.CylinderGeometry(.32, .22, .12, 14), new THREE.MeshStandardMaterial({ color: '#3a3040', metalness: .7, roughness: .4 })); m.add(hold); }
  const c = { x, y: y + h + .25, on: true }; candles.push(c);
  haz.push({ kind: 'candle', m, x, c, box: { x0: x - .26, x1: x + .26, y0: y, y1: y + h }, flame: { x, y: y + h + .32, r: .38 } });
}
function addBat(x, y) { const m = bat(); m.position.set(x, y, 0); m.scale.setScalar(1.2); scene.add(m); haz.push({ kind: 'bat', m, x, base: y, ph: rng() * 6, r: .55 }); }
function addSwatter(x) { const m = swatter(); m.position.set(x, CEIL + .2, .1); scene.add(m); haz.push({ kind: 'swatter', m, x, ph: rng() * 6, w: (1.5 + rng() * .5) * D().swat, amp: .95, r: .95 }); }
function spawnPattern() {
  const d = D(), k = clamp(S.el / 80, 0, 1), gap = lerp(d.gap0, d.gap1, k), x = nextX, p = pat++;
  const arc = (x0, n, y0, y1) => { for (let i = 0; i < n; i++) { const u = i / (n - 1); addItem('fly', x0 + i * 1.05, lerp(y0, y1, u) + Math.sin(u * Math.PI) * 1.2); } };
  if (p === 0) { arc(x - 6, 7, 3.2, 4.6); nextX += 9; return; }
  if (p === 1) { addCandle(x + 2, 0, 1.6); arc(x - 1, 5, 4.2, 5.2); addItem('candy', x + 4.5, 5.6); nextX += 11; return; }
  const roll = rng() * d.haz + (1 - d.haz) * .0;
  if (rng() > d.haz) { // treats only
    const cx = x + 2, cy = 3.5 + rng() * 2.5; for (let i = 0; i < 8; i++) addItem('fly', cx + Math.cos(i / 8 * 6.28) * 1.4, cy + Math.sin(i / 8 * 6.28) * 1.4); addItem(rng() < .18 ? 'gold' : 'candy', cx, cy);
  } else if (roll < .3 * d.haz) { // floor candles
    const n = 2 + Math.floor(rng() * 2); for (let i = 0; i < n; i++) addCandle(x + i * 2.4, 0, 1.4 + rng() * 2.2); arc(x - 1, 6, 5.2, 5.8);
  } else if (roll < .55 * d.haz) { // floating candles with a gap
    const gy = 3 + rng() * 3; addCandle(x + 1, gy + 1.5, .9, true); addCandle(x + 1, gy - 2.6, .9, true); for (let i = 0; i < 4; i++) addItem('fly', x - .5 + i * 1, gy + .2); addCandle(x + 1, 0, 1.2);
  } else if (roll < .78 * d.haz) { // bats
    addBat(x + 3, 3 + rng() * 3); if (rng() < .5) addBat(x + 6, 3 + rng() * 3); arc(x, 5, 6.5, 6.8);
  } else { // swatter
    addSwatter(x + 2); for (let i = 0; i < 5; i++) addItem('fly', x + .5 + i * .8, 2.2); addItem('candy', x + 2, 1.7);
  }
  nextX += gap;
}
function clearLevel() { for (const it of items) scene.remove(it.m); items.length = 0; for (const h of haz) scene.remove(h.m); haz.length = 0; candles.length = 0; pat = 0; }

// ---------------- game flow ----------------
function start() {
  A.unlock().then(() => { if (S.state === 'play') A.startMusic(); });
  Object.assign(S, { state: 'play', score: 0, el: 0, dist: 0, flies: 0, candies: 0, golds: 0, streak: 0, bestStreak: 0, mult: 1, lives: D().lives, inv: 0, newBest: false, hits: 0, endT: -1, time: KIDS_ROUND, swings: 0, x0: P.x });
  clearLevel(); P.set(P.x, 5.2); V.set(5, -1); attached = null; nextX = P.x + 9; S.hold = false;
  attached = new THREE.Vector2(P.x + 2.6, CEIL); ropeL = attached.distanceTo(P); shoot = 1; // start mid-swing: instant motion
  A.sfx.start(S.kids); A.startMusic(); show(null); hud(); S.best = +ls.get(bestKey(), '0') || 0;
}
function end() {
  if (S.state !== 'play') return; S.state = 'end'; A.stopMusic(); detach();
  S.best = +ls.get(bestKey(), '0') || 0; if (S.score > S.best) { S.best = S.score; S.newBest = S.score > 0; ls.set(bestKey(), S.best); }
  A.sfx.end(S.newBest);
  $('eTitle').textContent = S.kids || S.lives > 0 ? t('kidsOver') : t('over'); $('eScore').textContent = S.score;
  $('eBest').textContent = S.newBest ? t('newBest') : t('best') + ': ' + S.best;
  $('eStats').textContent = `${S.flies} ${t('flies')} · ${S.candies + S.golds} ${t('candies')} · ${t('bestStreak')} ${S.bestStreak} · ${Math.round(S.dist)} ${t('dist')}`;
  $('eName').value = S.name; show('end'); hud();
}
function collect(it) {
  it.taken = true; it.t = 0; const at = it.m.position;
  if (S.state !== 'play') { A.sfx.fly(1); sparks(F, at, 20, { colors: ['#d8ff9a', '#ffffff'], speed: 2.5, life: .5, grav: 1, size: .09 }); return; }
  S.streak++; S.bestStreak = Math.max(S.bestStreak, S.streak); const nm = Math.min(5, 1 + Math.floor(S.streak / 6)); if (nm > S.mult) { A.sfx.combo(nm); popText(`BONUS ×${nm}`, '#ffd27a', 1.1, 1.4); pulse('hMultBox'); } S.mult = nm;
  const m = S.mult * D().mult;
  if (it.kind === 'fly') { S.flies++; S.score += Math.round(10 * m); A.sfx.fly(S.streak); sparks(F, at, 26, { colors: ['#d8ff9a', '#ffffff'], speed: 3, life: .6, grav: 1, size: .1 }); }
  else if (it.kind === 'candy') { S.candies++; S.score += Math.round(50 * m); A.sfx.candy(); sparks(F, at, 60, { colors: ['#ff7ab0', '#ffd27a', '#b88aff'], speed: 4.5, life: .9, grav: 2, size: .13 }); popText(`+${Math.round(50 * m)}`, '#ffb8d8', 1, .2); S.shake = Math.max(S.shake, .2); }
  else { S.golds++; S.score += Math.round(200 * m); A.sfx.gold(); sparks(F, at, 150, { colors: ['#ffd23a', '#fff2b0', '#ff9a2a'], speed: 6, life: 1.2, grav: 2, size: .15 }); popText(t('gold') + ` +${Math.round(200 * m)}`, '#ffd23a', 1.15, .5); if (!S.kids && S.lives < D().lives) { S.lives++; popText(t('heart'), '#ff8aa8', .9, 1.2); } S.flash = Math.max(S.flash, .3); S.shake = .45; }
  hud();
}
function hurt(kind, from) {
  if (S.state !== 'play' || S.inv > 0) return false;
  const away = new THREE.Vector2(P.x - from.x, P.y - from.y); if (away.lengthSq() < 1e-4) away.set(-1, 1); away.normalize();
  V.set(away.x * 6 - 2, Math.max(4, away.y * 7)); detach(); S.inv = 1.4; S.streak = 0; S.mult = 1;
  ({ candle: A.sfx.burn, bat: A.sfx.bat, swatter: A.sfx.swat, floor: A.sfx.floor })[kind]();
  const pos = new THREE.Vector3(P.x, P.y, 0);
  if (S.kids) { popText('💫', '#ffe08a', 1, .4); sparks(F, pos, 25, { colors: ['#ffe08a', '#ffffff'], speed: 3, life: .6, grav: 2, size: .1 }); hud(); return true; }
  S.lives--; S.hits++; S.shake = .9; S.flash = Math.max(S.flash, .2);
  popText(t({ candle: 'burn', bat: 'batHit', swatter: 'swat', floor: 'floor' }[kind]) + ' −❤️', '#ff8a8a', 1.05, .4); pulse('hLivesBox', true);
  sparks(F, pos, 40, { colors: kind === 'candle' ? ['#ffb050', '#ff6a20', '#ffe0a0'] : ['#d8c8ff', '#ffffff'], speed: 4, life: .7, grav: 3, size: .12 }); puff(F, pos, 3, kind === 'candle' ? '#5a4a4a' : '#6a5a8a', .7);
  if (S.lives <= 0) S.endT = S.gt + 1.2; hud(); return true;
}

// ---------------- UI ----------------
function show(id) { for (const s of ['menu', 'end']) $(s).classList.toggle('show', s === id); document.body.dataset.state = S.state; document.body.classList.toggle('kids', S.kids); }
function pulse(id, bad) { const el = $(id); el.classList.remove('pulse', 'bad'); void el.offsetWidth; el.classList.add('pulse'); if (bad) el.classList.add('bad'); }
function hud() {
  $('hScore').textContent = S.score; $('hLives').textContent = S.kids ? '∞' : '❤️'.repeat(Math.max(0, S.lives)) || '—';
  $('hMult').textContent = '×' + (S.mult * D().mult).toString().replace('.', S.lang === 'de' ? ',' : '.'); $('hTime').textContent = Math.ceil(S.time);
}
function applyLang() {
  document.documentElement.lang = S.lang; document.querySelectorAll('[data-t]').forEach(el => el.textContent = t(el.dataset.t));
  $('h3').textContent = S.kids ? t('h3k') : t('h3'); $('btnLang').textContent = S.lang === 'en' ? 'DE' : 'EN';
  $('btnKids').classList.toggle('on', S.kids); $('btnKids').setAttribute('aria-pressed', S.kids); document.querySelectorAll('#diff button').forEach(b => b.classList.toggle('on', b.dataset.d === S.diff)); $('diff').style.display = S.kids ? 'none' : '';
  $('btnSound').classList.toggle('on', !A.isMuted()); $('btnQ').textContent = '⚙ ' + t('q_' + S.q); hud();
}
const timers = [];
function popText(txt, col, big = 1, yOff = 0) {
  const v = new THREE.Vector3(P.x, P.y + 1 + yOff, 0).project(camera); const el = document.createElement('div'); el.className = 'pop'; el.textContent = txt;
  el.style.left = clamp((v.x * .5 + .5) * VW, 100, VW - 100) + 'px'; el.style.top = clamp((-v.y * .5 + .5) * VH, 90, VH - 60) + 'px'; el.style.color = col; el.style.fontSize = (30 * big * (VW < 600 ? .85 : 1)) + 'px';
  $('pops').appendChild(el); timers.push({ t: S.gt + 1.2, f: () => el.remove() });
}
function toast(s) { const el = $('toast'); el.textContent = s; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500); }

// ---------------- input: one button (hold = silk) ----------------
canvas.addEventListener('pointerdown', e => { A.unlock(); if (S.state === 'play') { e.preventDefault(); press(); try { canvas.setPointerCapture(e.pointerId); } catch (er) {} } });
for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, () => { if (S.hold) releaseP(); });
window.addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (['Space', 'ArrowUp', 'KeyW', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if ((e.code === 'Enter' || e.code === 'Space') && S.state !== 'play') { start(); return; }
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code) && S.state === 'play') press();
});
window.addEventListener('keyup', e => { if (['Space', 'ArrowUp', 'KeyW'].includes(e.code) && S.hold) releaseP(); });
$('btnPlay').onclick = () => start(); $('btnAgain').onclick = () => start();
$('btnMenu').onclick = () => { S.state = 'menu'; A.sfx.ui(); A.stopMusic(); show('menu'); clearLevel(); nextX = P.x + 8; };
$('btnCard').onclick = () => saveCard(false); $('btnShare').onclick = () => saveCard(true);
$('btnLang').onclick = () => { S.lang = S.lang === 'en' ? 'de' : 'en'; ls.set('sd-lang', S.lang); applyLang(); A.sfx.ui(); };
document.querySelectorAll('#diff button').forEach(b => b.onclick = () => { S.diff = b.dataset.d; ls.set('sd-diff', S.diff); applyLang(); A.sfx.ui(); });
$('btnKids').onclick = () => { S.kids = !S.kids; ls.set('sd-kids', S.kids ? '1' : '0'); applyLang(); show('menu'); A.unlock(); A.sfx.ui(); };
$('btnSound').onclick = () => { A.setMuted(!A.isMuted()); applyLang(); };
$('btnQ').onclick = () => { const o = ['low', 'mid', 'high', 'ultra']; applyQuality(o[(o.indexOf(S.q) + 1) % 4], true); };
$('eName').addEventListener('keydown', e => e.stopPropagation());
window.addEventListener('resize', resize);

// ---------------- highscore card ----------------
async function saveCard(share) {
  S.name = ($('eName').value || '').trim() || 'Player'; ls.set('sd-name', S.name);
  try { await document.fonts.load('700 40px Fredoka'); } catch (e) {}
  composer.render(); const src = renderer.domElement;
  const CW = 1080, CH = 1350, c = document.createElement('canvas'); c.width = CW; c.height = CH; const k = c.getContext('2d');
  const sw = src.width, sh = src.height, sc = Math.max(CW / sw, CH / sh); k.drawImage(src, (CW - sw * sc) / 2, (CH - sh * sc) / 2, sw * sc, sh * sc);
  const gr = k.createLinearGradient(0, 0, 0, CH); gr.addColorStop(0, 'rgba(10,6,20,.86)'); gr.addColorStop(.42, 'rgba(10,6,20,.3)'); gr.addColorStop(.7, 'rgba(10,6,20,.2)'); gr.addColorStop(1, 'rgba(10,6,20,.92)'); k.fillStyle = gr; k.fillRect(0, 0, CW, CH);
  const Fo = (w, s) => `${w} ${s}px Fredoka, "Arial Rounded MT Bold", sans-serif`; k.textAlign = 'center';
  k.fillStyle = '#ffd9a8'; k.font = Fo(700, 104); k.shadowColor = 'rgba(255,150,60,.6)'; k.shadowBlur = 30; k.fillText('🕷️ Spider Drop', CW / 2, 150); k.shadowBlur = 0;
  k.fillStyle = 'rgba(255,255,255,.9)'; k.font = Fo(500, 44); k.fillText(S.name.slice(0, 18), CW / 2, 240);
  k.fillStyle = '#fff'; k.font = Fo(700, 200); k.shadowColor = 'rgba(255,200,140,.7)'; k.shadowBlur = 40; k.fillText(String(S.score), CW / 2, 440); k.shadowBlur = 0;
  k.fillStyle = '#ffe4c8'; k.font = Fo(500, 40); k.fillText(t('score').toUpperCase() + ' · ' + (S.kids ? t('kids') : t('d_' + S.diff)) + (S.newBest ? ' · ' + t('newBest') : ''), CW / 2, 505);
  k.fillStyle = 'rgba(255,255,255,.85)'; k.font = Fo(400, 34); k.fillText(`${S.flies} ${t('flies')} · ${t('bestStreak')} ${S.bestStreak} · ${Math.round(S.dist)} ${t('dist')}`, CW / 2, 565);
  k.fillStyle = '#ffd27a'; k.font = Fo(600, 48); k.fillText(t('cardLine'), CW / 2, 1235);
  k.fillStyle = 'rgba(255,255,255,.8)'; k.font = Fo(400, 34); k.fillText(t('cardCta') + ' · ' + URL_TXT, CW / 2, 1295);
  const blob = await new Promise(r => c.toBlob(r, 'image/png')); window.__sdCard = { w: c.width, h: c.height };
  const file = new File([blob], 'spider-drop-highscore.png', { type: 'image/png' });
  if (share && navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], text: `Spider Drop: ${S.score} — ${t('cardLine')} https://${URL_TXT}/` }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'spider-drop-highscore.png'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}

// ---------------- simulation ----------------
const camPos = new THREE.Vector3(0, 5, 14), _v = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
function demoBot() { // menu: the spider swings by itself
  if (!attached && V.y < 0 && P.y < 5.5) attach(); else if (attached && P.x > attached.x + .6 && V.y > 0) detach();
}
function physics(dt) {
  const d = D(); V.y -= d.g * dt; V.x *= (1 - dt * .05);
  if (attached) {
    ropeL = Math.max(2.2, ropeL - (S.state === 'menu' ? 1.6 : 2.2) * dt);
    if (P.y < attached.y - .5 && V.x < 2.5) V.x += 3 * dt; // gentle forward assist
  }
  P.addScaledVector(V, dt);
  if (attached) { const dx = P.x - attached.x, dy = P.y - attached.y, dl = Math.hypot(dx, dy); if (dl > ropeL) { const nx = dx / dl, ny = dy / dl; P.set(attached.x + nx * ropeL, attached.y + ny * ropeL); const vr = V.x * nx + V.y * ny; if (vr > 0) { V.x -= vr * nx; V.y -= vr * ny; } } }
  const sp2 = V.length(); if (sp2 > 22) V.multiplyScalar(22 / sp2);
  if (P.y > CEIL - .55) { P.y = CEIL - .55; if (V.y > 0) V.y *= -.3; }
  if (P.y < FLOOR) {
    P.y = FLOOR;
    if (S.state === 'play' && !S.kids && S.inv <= 0) { hurt('floor', new THREE.Vector2(P.x - .5, P.y - 1)); V.y = 11; }
    else { V.y = Math.max(Math.abs(V.y) * .75, 9.5); if (V.x < 3) V.x = 3.5; if (S.state === 'play') { A.sfx.bounce(); puff(F, new THREE.Vector3(P.x, .2, 0), 2, '#6a5a7a', .6); } }
  }
}
function step(dt) {
  dt = Math.min(dt, 1 / 20); S.gt += dt;
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].t <= S.gt) { const f = timers[i].f; timers.splice(i, 1); f(); }
  const playing = S.state === 'play';
  if (playing) { S.el += dt; if (S.kids) { S.time = Math.max(0, KIDS_ROUND - S.el); if (S.time <= 0) end(); } }
  if (S.state === 'menu') demoBot();
  const x0 = P.x; for (let k = 0; k < 4; k++) physics(dt / 4);
  if (playing) { const dx = Math.max(0, P.x - x0); S.dist += dx; S.distAcc = (S.distAcc || 0) + dx; if (S.distAcc >= 1) { const m = Math.floor(S.distAcc); S.score += m; S.distAcc -= m; } }
  S.inv = Math.max(0, S.inv - dt);
  while (nextX < P.x + 30) spawnPattern();
  // items
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i]; it.ph += dt; const m = it.m;
    if (it.taken) { it.t += dt; m.position.lerp(_v.set(P.x, P.y, 0), 1 - Math.exp(-dt * 14)); m.scale.multiplyScalar(Math.exp(-dt * 9)); if (it.t > .3) { scene.remove(m); items.splice(i, 1); } continue; }
    if (it.kind === 'fly') { m.position.set(it.x + Math.sin(it.ph * 2.3) * .15, it.y + Math.sin(it.ph * 3.1) * .18, Math.sin(it.ph * 1.7) * .15); m.rotation.y = Math.sin(it.ph) * .8; const f = Math.sin(it.ph * 60) * .8; m.userData.w1.rotation.x = f; m.userData['w-1'].rotation.x = -f; }
    else { m.rotation.y += dt * 2; m.position.y = it.y + Math.sin(it.ph * 2) * .1; }
    if (it.x < P.x - 14) { scene.remove(m); items.splice(i, 1); continue; }
    const rr = it.kind === 'fly' ? .75 : .9; if ((m.position.x - P.x) ** 2 + (m.position.y - P.y) ** 2 < (rr + R * .6) ** 2) collect(it);
  }
  // hazards
  for (let i = haz.length - 1; i >= 0; i--) {
    const h = haz[i]; let hit = false, from = null;
    if (h.kind === 'candle') {
      const fl = h.m.userData.flame, k = .85 + .15 * Math.sin(S.gt * 13 + h.x) * Math.sin(S.gt * 7.3 + h.x); fl.scale.set(.42 * (.9 + .1 * k), .8 * k, 1);
      const b = h.box; const cx = clamp(P.x, b.x0, b.x1), cy = clamp(P.y, b.y0, b.y1);
      if ((P.x - cx) ** 2 + (P.y - cy) ** 2 < R * R) { hit = true; from = new THREE.Vector2(cx, cy); }
      if ((P.x - h.flame.x) ** 2 + (P.y - h.flame.y) ** 2 < (h.flame.r + R * .8) ** 2) { hit = true; from = new THREE.Vector2(h.flame.x, h.flame.y - .5); }
      if (hit && S.kids) { hit = false; if (S.inv <= 0) { hurt('candle', from); } }
    } else if (h.kind === 'bat') {
      h.ph += dt; h.x -= D().batSp * dt; h.m.position.set(h.x, h.base + Math.sin(h.ph * 2.2) * 1.1, 0); const f = Math.sin(h.ph * 16) * .9; h.m.userData.w1.rotation.y = f; h.m.userData['w-1'].rotation.y = -f; h.m.rotation.y = -.4;
      if ((P.x - h.m.position.x) ** 2 + (P.y - h.m.position.y) ** 2 < (h.r + R) ** 2) { hit = true; from = new THREE.Vector2(h.m.position.x, h.m.position.y); }
    } else if (h.kind === 'swatter') {
      h.ph += dt * h.w; const ang = Math.sin(h.ph) * h.amp; h.m.rotation.z = ang; const L = h.m.userData.L; const hx = h.x + Math.sin(ang) * L, hy = CEIL + .2 - Math.cos(ang) * L;
      if (Math.abs(Math.cos(h.ph)) > .995 && h.lastW !== Math.round(h.ph / Math.PI)) { h.lastW = Math.round(h.ph / Math.PI); if (Math.abs(h.x - P.x) < 14) A.sfx.swing(); }
      if ((P.x - hx) ** 2 + (P.y - hy) ** 2 < (h.r + R) ** 2) { hit = true; from = new THREE.Vector2(hx, hy); }
    }
    if (hit && playing) { if (h.kind !== 'candle' || !S.kids) hurt(h.kind, from); }
    if ((h.kind === 'bat' ? h.m.position.x : h.x) < P.x - 16) { scene.remove(h.m); haz.splice(i, 1); const ci = candles.indexOf(h.c); if (ci >= 0) candles.splice(ci, 1); }
  }
  if (playing && S.endT > 0 && S.gt >= S.endT) end();
  // spider pose + silk
  if (attached) {
    shoot = Math.min(1, shoot + dt * 12); const top = new THREE.Vector3(attached.x, attached.y, 0), bot = new THREE.Vector3(P.x, P.y, 0).add(new THREE.Vector3(attached.x - P.x, attached.y - P.y, 0).normalize().multiplyScalar(.55)), mid = top.clone().lerp(bot, shoot);
    const len = top.distanceTo(mid); silk.visible = true; silk.position.copy(top).lerp(mid, .5); silk.scale.set(1, len, 1); silk.quaternion.setFromUnitVectors(up, mid.clone().sub(top).normalize().negate());
    anchorWeb.visible = true; anchorWeb.position.set(attached.x + .3, CEIL + .05, .3); anchorWeb.scale.setScalar(.6 + shoot * .4);
    sp.rotation.z = lerp(sp.rotation.z, Math.atan2(P.x - attached.x, attached.y - P.y), 1 - Math.exp(-dt * 12));
  } else { silk.visible = false; anchorWeb.visible = false; sp.rotation.z = lerp(sp.rotation.z, clamp(-V.x * .03, -.5, .5) + (S.inv > 0 ? Math.sin(S.gt * 20) * .3 : 0), 1 - Math.exp(-dt * 6)); }
  sp.position.set(P.x, P.y, 0); sp.rotation.y = clamp(V.x * .03, -.4, .4);
  sp.visible = !(S.inv > 0 && Math.floor(S.gt * 14) % 2 === 0 && !S.kids);
  animSpider(sp, S.gt, attached ? 'hang' : 'fly', { x: clamp(V.x * .05, -1, 1), y: clamp(V.y * .05, -1, 1) });
  if (V.length() > 11 && rng() < .7) sparks(F, new THREE.Vector3(P.x, P.y, 0), 1, { colors: ['#c8b8ff'], speed: .4, life: .5, grav: 0, size: .08 });
  // camera
  const look = new THREE.Vector3(P.x + 2.2, clamp(4.4 + (P.y - 4.4) * .25, 3.8, 5.2), 0);
  camPos.lerp(_v.set(look.x - 1.5, look.y + 1.2, camDist), 1 - Math.exp(-dt * 4)); camera.position.copy(camPos);
  if (S.shake > .01) camera.position.add(new THREE.Vector3(rng() - .5, rng() - .5, 0).multiplyScalar(S.shake * .35));
  camera.lookAt(look); camera.updateMatrixWorld();
  W.flashL.position.set(P.x, P.y + 1, 2); W.flashL.intensity = S.flash * 30; if (bloom) bloom.strength = .3 * QUALITY[S.q].bloom + S.flash * .06;
  S.flash *= Math.exp(-dt * 4); S.shake *= Math.exp(-dt * 5);
  updateWorld(W, S.gt, dt, camera.position.x, P.x, candles, QUALITY[S.q]);
  updateFX(F, dt, VH * renderer.getPixelRatio() * .5 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  if (playing && Math.floor(S.gt * 10) !== S._h) { S._h = Math.floor(S.gt * 10); hud(); }
  $('hint').classList.toggle('show', playing && S.el < 6 && !S.kids || playing && S.kids && S.el < 6);
  $('hint').textContent = attached ? '🕸️ ' + t('release') : '👆 ' + t('hold');
}
function render() { composer.render(); }
const fps = { ema: 60, n: 0, acc: 0, frames: 0, checked: 0 };
function fpsTick(dt) { fps.acc += dt; fps.frames++; if (fps.acc >= 1) { const f = fps.frames / fps.acc; fps.ema = fps.n ? fps.ema * .6 + f * .4 : f; fps.n++; fps.acc = 0; fps.frames = 0;
  if (!S.qUser && !window.__sdNoAutoQ && fps.n >= 3 && fps.ema < 42 && S.q !== 'low' && S.gt - fps.checked > 3) { fps.checked = S.gt; const o = ['low', 'mid', 'high', 'ultra']; const nq = o[o.indexOf(S.q) - 1]; applyQuality(nq); toast(`${t('autoQ')} ${t('q_' + nq)} (${Math.round(fps.ema)} fps)`); fps.n = 0; } } }

applyQuality(S.q); applyLang(); show('menu');
let last = performance.now();
function loop(now) { const dt = (now - last) / 1000; last = now; if (!window.__sdManual) { step(dt); render(); fpsTick(dt); } requestAnimationFrame(loop); }
requestAnimationFrame(loop);
window.__sd = { S, start, end, step: (dt, n = 1) => { for (let i = 0; i < n; i++) step(dt); render(); }, log: A.log, quality: q => q ? applyQuality(q, true) : S.q, renderer,
  press, release: releaseP, pos: () => ({ x: P.x, y: P.y, vx: V.x, vy: V.y, att: attached ? { x: attached.x, y: attached.y } : null }),
  items: () => items.filter(i => !i.taken).map(i => ({ kind: i.kind, x: i.m.position.x, y: i.m.position.y })),
  hazards: () => haz.map(h => ({ kind: h.kind, x: h.kind === 'bat' ? h.m.position.x : h.x, y: h.kind === 'bat' ? h.m.position.y : (h.flame ? h.flame.y : 0) })),
  spawn: (kind, x, y, extra) => { if (kind === 'candle') addCandle(x, y || 0, extra || 2, !!y); else if (kind === 'bat') { addBat(x, y); if (extra !== undefined) haz[haz.length - 1].ph = extra; } else if (kind === 'swatter') { addSwatter(x); if (extra !== undefined) haz[haz.length - 1].ph = extra; } else addItem(kind, x, y); },
  clear: () => { clearLevel(); nextX = P.x + 1e5; }, place: (x, y, vx, vy) => { P.set(x, y); V.set(vx, vy); attached = null; }, diffs: DIFF, diff: () => S.diff,
  screen: (x, y) => { const v = new THREE.Vector3(x, y, 0).project(camera); return { x: (v.x * .5 + .5) * VW, y: (-v.y * .5 + .5) * VH }; } };
document.body.classList.add('ready');
