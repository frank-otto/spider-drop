// WebAudio player for the embedded CC0 samples (window.SD_SOUNDS, base64 mp3) – works via file://
let ctx = null, master = null, musicGain = null, loopGain = null, music = null, windSrc = null, bufs = {}, ready = false, muted = false;
export const log = [];
let clock = () => 0;
export function setClock(f) { clock = f; }
function b64(s) { const bin = atob(s), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
// iOS Safari: create/resume inside the tap, play a 1-sample silent buffer (unlocks output), ask for 'playback' (ignores the mute switch)
function kick(c) { try { const b = c.createBuffer(1, 1, 22050), s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch (e) {} }
export function audioState() { return ctx ? ctx.state : 'none'; }
export async function unlock() {
  try { if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback'; } catch (e) {}
  if (ctx) { if (ctx.state !== 'running') ctx.resume().catch(() => {}); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC(); kick(ctx); if (ctx.state !== 'running') ctx.resume().catch(() => {}); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.9;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; master.connect(comp); comp.connect(ctx.destination);
  musicGain = ctx.createGain(); musicGain.gain.value = 0.32; musicGain.connect(master);
  loopGain = ctx.createGain(); loopGain.gain.value = 0.5; loopGain.connect(master);
  const src = window.SD_SOUNDS || {};
  await Promise.all(Object.keys(src).map(k => new Promise(res => { try { ctx.decodeAudioData(b64(src[k]), b => { bufs[k] = b; res(); }, () => res()); } catch (e) { res(); } })));
  ready = true; window.__sdAudioReady = Object.keys(bufs).length; startWind();
}
export function play(n, vol = 1, rate = 1, delay = 0) {
  log.push({ n, t: clock() + delay, v: vol, r: rate });
  if (!ready || !bufs[n]) return;
  const s = ctx.createBufferSource(); s.buffer = bufs[n]; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vol; s.connect(g); g.connect(master); s.start(ctx.currentTime + delay);
}
function startWind() { if (windSrc || !bufs.wind) return; windSrc = ctx.createBufferSource(); windSrc.buffer = bufs.wind; windSrc.loop = true; windSrc.connect(loopGain); windSrc.start(); }
export function startMusic() {
  log.push({ n: 'music_graveyard', t: clock(), v: 1, r: 1, loop: 1 });
  if (!ready || music) return;
  music = ctx.createBufferSource(); music.buffer = bufs.music_graveyard; music.loop = true; music.connect(musicGain); music.start();
}
export function stopMusic() { log.push({ n: '__stopmusic', t: clock() }); if (music) { try { music.stop(); } catch (e) {} music = null; } }
export function setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.9; }
export function isMuted() { return muted; }
export const sfx = {
  web() { play(Math.random() < .5 ? 'swish_a' : 'swish_b', .55, 1.25 + Math.random() * .15); },
  release(sp) { play('whoosh', .3 + Math.min(sp, 20) * .015, 1.1 + Math.random() * .15); },
  fly(n) { play(n % 2 ? 'candy_a' : 'candy_b', .6, 1 + Math.min(n, 12) * .035); play('chime_a', .28, 1.05 + Math.min(n, 12) * .045); },
  candy() { play('candy_a', .8, .85); play('chime_c', .5); play('sub', .35, 1.3); },
  gold() { play('harp', .6); play('sparkle', .6, 1, .05); play('magic', .5, 1, .1); play('sub', .6); },
  burn() { play('fwoosh', .9, .9); play('impact', .7, .8); play('sub', .55, 1.1); },
  bat() { play('bats', .8, 1.05); play('hit', .5, 1.2); play('sub', .5, 1.1); },
  swat() { play('thud_a', 1, .85); play('hit', .55, 1); play('sub', .6, .95); },
  floor() { play('thud_b', .9, .9); play('impact', .6, .9); play('sub', .5, 1.2); },
  bounce() { play('soft', .7, .9); play('thud_b', .4, 1.3); },
  swing() { play('whoosh', .35, .8); },
  combo(c) { play('epic', .45, 1 + Math.min(c, 8) * .03); },
  ghost() { play('boo', .5, 1); },
  start(kids) { play('stinger', .7); play('boo', .35, 1.1, .2); if (kids) play('laugh_kids', .5, 1, .4); },
  end(best) { play('bell', .6, .9); play('howl', .35, 1, .3); if (best) play('success', .6, 1, .2); },
  ui() { play('soft', .4, 1.5); }
};
