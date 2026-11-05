// Âm thanh tổng hợp bằng WebAudio – không cần file âm thanh
let ctx = null, master = null, crowd = null, on = true;
const noiseBuf = sec => { const b = ctx.createBuffer(1, ctx.sampleRate * sec, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
const ok = v => ctx && on && v > 0.02;

export const sfx = {
  init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    // tiếng quán ồn ào nền: noise lọc dải giọng nói + LFO
    const n = ctx.createBufferSource(); n.buffer = noiseBuf(3); n.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 520; bp.Q.value = 0.8;
    crowd = ctx.createGain(); crowd.gain.value = 0.05;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.31; lg.gain.value = 0.02; lfo.connect(lg).connect(crowd.gain); lfo.start();
    n.connect(bp).connect(crowd).connect(master); n.start();
  },
  ready: () => !!ctx,
  toggle() { on = !on; if (master) master.gain.value = on ? 0.8 : 0; return on; },
  crowd(v) { if (crowd) crowd.gain.setTargetAtTime(0.03 + v * 0.05, ctx.currentTime, 0.5); },
  clink(v = 1) {
    if (!ok(v)) return; const t = ctx.currentTime;
    [2350, 3120, 4410, 5230].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * (0.98 + Math.random() * 0.04);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09 * v / (i + 1), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5 - i * 0.07);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.55);
    });
  },
  cheer(v = 1) {
    if (!ok(v)) return; const t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = noiseBuf(1.2);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35 * v, t + 0.06); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    n.connect(f).connect(g).connect(master); n.start(t);
  },
  beat(i, v = 1) {
    if (!ok(v)) return; const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.value = i === 3 ? 880 : 520 + i * 60;
    g.gain.setValueAtTime(0.2 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (i === 3 ? 0.4 : 0.15));
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.45);
  },
  gulp(v = 1) {
    if (!ok(v)) return; const t = ctx.currentTime;
    for (let i = 0; i < 4; i++) {
      const s = t + 0.25 + i * 0.22, o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(180, s); o.frequency.exponentialRampToValueAtTime(90, s + 0.12);
      g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.25 * v, s + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.15);
      o.connect(g).connect(master); o.start(s); o.stop(s + 0.16);
    }
  },
  spin(dur = 4, v = 1) {
    if (!ok(v)) return; const t = ctx.currentTime; let s = 0, gap = 0.05;
    while (s < dur) {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = 1400;
      g.gain.setValueAtTime(0.03 * v, t + s); g.gain.exponentialRampToValueAtTime(0.0001, t + s + 0.025);
      o.connect(g).connect(master); o.start(t + s); o.stop(t + s + 0.03);
      s += gap; gap *= 1.07;
    }
  },
  dice(dur = 1.5, v = 1) {
    if (!ok(v)) return; const t = ctx.currentTime;
    for (let s = 0; s < dur; s += 0.07 + Math.random() * 0.06) {
      const n = ctx.createBufferSource(); n.buffer = noiseBuf(0.04);
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.18 * v, t + s); g.gain.exponentialRampToValueAtTime(0.0001, t + s + 0.04);
      n.connect(f).connect(g).connect(master); n.start(t + s);
    }
  },
  thunk(v = 1) {
    if (!ok(v)) return; const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.15);
    g.gain.setValueAtTime(0.4 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g).connect(master); o.start(t); o.stop(t + 0.22);
  },
  bell(v = 1) {
    if (!ok(v)) return; const t = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const s = t + i * 0.18, o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 2100;
      g.gain.setValueAtTime(0.12 * v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.3); o.connect(g).connect(master); o.start(s); o.stop(s + 0.32);
    }
  },
  call(v = 1) {
    if (!ok(v)) return; const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 1200;
    o.frequency.setValueAtTime(330, t); o.frequency.linearRampToValueAtTime(440, t + 0.3); o.frequency.linearRampToValueAtTime(300, t + 0.9);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.08 * v, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 1.05);
  },
  moto(v = 1, up = true) {
    if (!ok(v)) return; const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = 'sawtooth'; f.type = 'lowpass'; f.frequency.value = 500;
    o.frequency.setValueAtTime(up ? 95 : 120, t); o.frequency.linearRampToValueAtTime(up ? 120 : 80, t + 1.4);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07 * v, t + 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + 1.55);
  },
  pop(v = 0.6) {
    if (!ok(v)) return; const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(1200, t + 0.06);
    g.gain.setValueAtTime(0.12 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1); o.connect(g).connect(master); o.start(t); o.stop(t + 0.12);
  },
  coin(v = 0.8) {
    if (!ok(v)) return; const t = ctx.currentTime;
    [1320, 1760].forEach((f, i) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'square'; o.frequency.value = f; const s = t + i * 0.08;
      g.gain.setValueAtTime(0.06 * v, s); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.18); o.connect(g).connect(master); o.start(s); o.stop(s + 0.2); });
  },
  scrub(v = 0.5) {
    if (!ok(v)) return; const t = ctx.currentTime;
    const n = ctx.createBufferSource(); n.buffer = noiseBuf(0.12); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2800; f.Q.value = 1.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.08 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); n.connect(f).connect(g).connect(master); n.start(t);
  },
  win(v = 1) { if (!ok(v)) return; [660, 880, 1100].forEach((f, i) => setTimeout(() => sfx.beat(i === 2 ? 3 : 1, v), i * 110)); },
  lose(v = 1) {
    if (!ok(v)) return; const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(400, t); o.frequency.exponentialRampToValueAtTime(150, t + 0.5);
    g.gain.setValueAtTime(0.2 * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55); o.connect(g).connect(master); o.start(t); o.stop(t + 0.6);
  }
};
