// SHADOWLINE — all sound is synthesized WebAudio, no files: footsteps
// (yours and the guards', quieter with distance), an alarm sting, a
// detection ping that rises with the meter, a pickup chime, a caught sting
// and a win jingle, over a barely-there room tone. Audio unlocks on the
// first Enter; M mutes.

let ctx = null;
let master = null;
let muted = false;

export function unlockAudio() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    startRoomTone();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}

export function isMuted() {
  return muted;
}

// A quiet looping wash of filtered noise: the gallery at night.
function startRoomTone() {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 220;
  const gain = ctx.createGain();
  gain.gain.value = 0.02;
  source.connect(filter).connect(gain).connect(master);
  source.start();
}

function tone(freq, startAt, dur, type, vol, slideTo = null) {
  if (!ctx || muted) return;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startAt);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, startAt + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(vol, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur);
  osc.connect(gain).connect(master);
  osc.start(startAt);
  osc.stop(startAt + dur + 0.05);
}

function thud(vol, filterFreq) {
  if (!ctx || muted) return;
  const length = Math.floor(ctx.sampleRate * 0.09);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const gain = ctx.createGain();
  gain.gain.value = vol;
  source.connect(filter).connect(gain).connect(master);
  source.start();
}

export function playFootstep(mode) {
  if (mode === 'sprint') thud(0.35, 500);
  else if (mode === 'crouch') thud(0.08, 300);
  else thud(0.18, 400);
}

// A guard's step, fading out past 400px so you hear patrols approaching.
export function playGuardStep(distance) {
  if (distance > 400) return;
  const vol = 0.22 * (1 - distance / 400);
  thud(vol, 350);
}

export function playAlarm() {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  tone(440, t, 0.22, 'sawtooth', 0.16, 660);
  tone(660, t + 0.22, 0.22, 'sawtooth', 0.16, 440);
}

export function playPing(meter) {
  if (!ctx || muted) return;
  tone(520 + meter * 420, ctx.currentTime, 0.08, 'sine', 0.12);
}

export function playPickup() {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  tone(659, t, 0.18, 'sine', 0.18);
  tone(988, t + 0.12, 0.3, 'sine', 0.18);
}

export function playCaught() {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  tone(220, t, 0.4, 'sawtooth', 0.2, 110);
  tone(233, t + 0.05, 0.4, 'sawtooth', 0.14, 116);
}

export function playWin() {
  if (!ctx || muted) return;
  const t = ctx.currentTime;
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => tone(f, t + i * 0.14, 0.3, 'triangle', 0.16));
}
