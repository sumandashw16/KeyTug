// All sounds are synthesized with WebAudio: no external assets.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const noise: AudioBuffer[] = [];
const FREQS = [1800, 2400, 3000, 2100];

function audio(): AudioContext | null {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor() as AudioContext;
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export const unlockAudio = () => {
  audio();
};

function noiseBuffer(c: AudioContext, i: number): AudioBuffer {
  if (!noise[i]) {
    const len = Math.floor(c.sampleRate * (0.025 + i * 0.006));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 3);
    noise[i] = buf;
  }
  return noise[i];
}

function tone(freq: number, dur: number, type: OscillatorType, vol: number, delay = 0, slideTo?: number) {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function playKey() {
  const c = audio();
  if (!c || !master) return;
  const i = Math.floor(Math.random() * 4);
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, i);
  src.playbackRate.value = 0.9 + Math.random() * 0.25;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = FREQS[i];
  f.Q.value = 0.9;
  const g = c.createGain();
  g.gain.value = 0.3;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
  tone(140 + Math.random() * 30, 0.035, 'sine', 0.05); // soft "thock"
}

export const playError = () => tone(240, 0.17, 'sawtooth', 0.08, 0, 120);
export const playTick = () => tone(660, 0.12, 'sine', 0.12);
export const playGo = () => tone(990, 0.35, 'triangle', 0.18);
export const playWin = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.28, 'triangle', 0.16, i * 0.11));
export const playLose = () => tone(330, 0.35, 'sine', 0.12, 0, 190);