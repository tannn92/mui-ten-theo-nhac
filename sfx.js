// SPIKE: tap sounds, all made in code. Nothing recorded, nothing taken from another game.
// Each recipe gets an audio context, an output node and a start time. SFX.play adds a level per sound so
// every sound is about as loud as the old beep, measured the way a tablet speaker plays it (above 200 Hz).
const SFX = (() => {
  const noiseBufs = new WeakMap();
  function noiseFor(c) {
    let b = noiseBufs.get(c);
    if (!b) {
      b = c.createBuffer(1, Math.floor(c.sampleRate * 0.4), c.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      noiseBufs.set(c, b);
    }
    return b;
  }
  function env(c, t, peak, decay, attack = 0) {
    const g = c.createGain();
    if (attack) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + attack); }
    else g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }
  // a pitched part: wave shape, start and end pitch, how fast it falls, level, how long it rings
  function tone(c, out, t, { type = 'sine', from, to = from, sweep = 0.05, peak = 1, decay = 0.2, attack = 0 }) {
    const o = c.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    if (to !== from) o.frequency.exponentialRampToValueAtTime(to, t + sweep);
    o.connect(env(c, t, peak, decay, attack)).connect(out);
    o.start(t); o.stop(t + attack + decay + 0.03);
  }
  // a noise part through one filter
  function hiss(c, out, t, { type = 'bandpass', freq = 1500, q = 0.8, peak = 0.5, decay = 0.05, attack = 0 }) {
    const n = c.createBufferSource(), f = c.createBiquadFilter();
    n.buffer = noiseFor(c);
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    n.connect(f).connect(env(c, t, peak, decay, attack)).connect(out);
    n.start(t); n.stop(t + attack + decay + 0.03);
  }
  function clap(c, out, t, freq, tail) {
    for (const d of [0, 0.011, 0.023]) hiss(c, out, t + d, { freq, q: 0.9, peak: 0.55, decay: d < 0.02 ? 0.018 : tail });
  }

  const LIST = [
    { id: 'kick-snap', group: 'Trống kick', name: 'Kick + tiếng tách nhẹ', play(c, o, t) {
      tone(c, o, t, { from: 230, to: 65, sweep: 0.1, peak: 1, decay: 0.2 });
      tone(c, o, t, { type: 'triangle', from: 160, to: 120, sweep: 0.07, peak: 0.35, decay: 0.07 });
      hiss(c, o, t, { freq: 1800, q: 0.7, peak: 0.25, decay: 0.05 }); } },
    { id: 'kick-round', group: 'Trống kick', name: 'Kick tròn', play(c, o, t) {
      tone(c, o, t, { from: 180, to: 55, sweep: 0.12, peak: 1, decay: 0.3 });
      tone(c, o, t, { type: 'triangle', from: 120, to: 90, sweep: 0.08, peak: 0.3, decay: 0.1 }); } },
    { id: 'kick-tight', group: 'Trống kick', name: 'Kick chắc, ngắn', play(c, o, t) {
      tone(c, o, t, { from: 260, to: 80, sweep: 0.05, peak: 1, decay: 0.12 });
      hiss(c, o, t, { type: 'lowpass', freq: 4000, q: 0.7, peak: 0.3, decay: 0.015 }); } },
    { id: 'kick-808', group: 'Trống kick', name: 'Kick 808 ngân dài', play(c, o, t) {
      tone(c, o, t, { from: 150, to: 50, sweep: 0.06, peak: 1, decay: 0.5 });
      tone(c, o, t, { type: 'triangle', from: 100, to: 60, sweep: 0.06, peak: 0.25, decay: 0.3 }); } },

    { id: 'snare', group: 'Snare, vỗ tay', name: 'Snare', play(c, o, t) {
      tone(c, o, t, { type: 'triangle', from: 220, to: 180, sweep: 0.05, peak: 0.5, decay: 0.1 });
      hiss(c, o, t, { freq: 2500, q: 0.6, peak: 0.6, decay: 0.14 });
      hiss(c, o, t, { freq: 900, q: 1, peak: 0.3, decay: 0.08 }); } },
    { id: 'clap', group: 'Snare, vỗ tay', name: 'Vỗ tay', play(c, o, t) {
      clap(c, o, t, 1400, 0.16);
      tone(c, o, t, { from: 220, to: 180, sweep: 0.05, peak: 0.25, decay: 0.06 }); } },
    { id: 'clap-warm', group: 'Snare, vỗ tay', name: 'Vỗ tay ấm', play(c, o, t) {
      clap(c, o, t, 900, 0.2); } },  // no low tone under it: the user heard it as a second sound ("bụp")
    { id: 'snap', group: 'Snare, vỗ tay', name: 'Búng tay', play(c, o, t) {
      hiss(c, o, t, { freq: 2600, q: 2, peak: 0.8, decay: 0.03 });
      tone(c, o, t, { from: 1100, to: 800, sweep: 0.02, peak: 0.2, decay: 0.025 }); } },

    { id: 'tom-low', group: 'Tom, conga, bongo', name: 'Tom trầm', play(c, o, t) {
      tone(c, o, t, { from: 160, to: 110, sweep: 0.2, peak: 0.9, decay: 0.35 });
      tone(c, o, t, { type: 'triangle', from: 320, to: 220, sweep: 0.12, peak: 0.15, decay: 0.12 }); } },
    { id: 'tom', group: 'Tom, conga, bongo', name: 'Tom vừa', play(c, o, t) {
      tone(c, o, t, { from: 260, to: 170, sweep: 0.15, peak: 0.9, decay: 0.25 });
      tone(c, o, t, { type: 'triangle', from: 520, to: 340, sweep: 0.12, peak: 0.15, decay: 0.12 });
      hiss(c, o, t, { type: 'lowpass', freq: 3000, q: 0.7, peak: 0.1, decay: 0.02 }); } },
    { id: 'tom-high', group: 'Tom, conga, bongo', name: 'Tom cao', play(c, o, t) {
      tone(c, o, t, { from: 380, to: 260, sweep: 0.12, peak: 0.8, decay: 0.2 });
      tone(c, o, t, { type: 'triangle', from: 760, to: 520, sweep: 0.12, peak: 0.12, decay: 0.1 }); } },
    { id: 'conga', group: 'Tom, conga, bongo', name: 'Conga', play(c, o, t) {
      tone(c, o, t, { from: 330, to: 300, sweep: 0.03, peak: 0.9, decay: 0.18 });
      tone(c, o, t, { from: 660, peak: 0.15, decay: 0.06 });
      hiss(c, o, t, { freq: 1500, q: 0.8, peak: 0.15, decay: 0.02 }); } },
    { id: 'bongo', group: 'Tom, conga, bongo', name: 'Bongo', play(c, o, t) {
      tone(c, o, t, { from: 520, to: 480, sweep: 0.02, peak: 0.8, decay: 0.1 });
      tone(c, o, t, { from: 1040, peak: 0.1, decay: 0.04 }); } },
    { id: 'trong-com', group: 'Tom, conga, bongo', name: 'Trống da (bịch)', play(c, o, t) {
      tone(c, o, t, { from: 200, to: 185, sweep: 0.05, peak: 0.9, decay: 0.25 });
      tone(c, o, t, { from: 400, to: 370, sweep: 0.05, peak: 0.3, decay: 0.12 });
      hiss(c, o, t, { type: 'lowpass', freq: 1200, q: 0.7, peak: 0.2, decay: 0.03 }); } },

    { id: 'wood-low', group: 'Gỗ, kim loại', name: 'Mõ gỗ trầm', play(c, o, t) {
      tone(c, o, t, { from: 600, to: 560, sweep: 0.02, peak: 0.8, decay: 0.08 });
      tone(c, o, t, { type: 'triangle', from: 1200, peak: 0.15, decay: 0.04 }); } },
    { id: 'wood', group: 'Gỗ, kim loại', name: 'Mõ gỗ', play(c, o, t) {
      tone(c, o, t, { from: 900, to: 850, sweep: 0.02, peak: 0.7, decay: 0.06 });
      tone(c, o, t, { type: 'triangle', from: 1800, peak: 0.15, decay: 0.03 }); } },
    { id: 'cowbell', group: 'Gỗ, kim loại', name: 'Chuông bò', play(c, o, t) {
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.5; f.connect(o);
      tone(c, f, t, { type: 'square', from: 540, peak: 0.6, decay: 0.25 });
      tone(c, f, t, { type: 'square', from: 800, peak: 0.6, decay: 0.25 }); } },

    { id: 'hihat', group: 'Hi-hat, lắc', name: 'Hi-hat đóng', play(c, o, t) {
      hiss(c, o, t, { type: 'highpass', freq: 7000, q: 0.7, peak: 0.6, decay: 0.05 }); } },
    { id: 'shaker', group: 'Hi-hat, lắc', name: 'Lắc (shaker)', play(c, o, t) {
      hiss(c, o, t, { freq: 5000, q: 0.8, peak: 0.6, decay: 0.08, attack: 0.02 }); } },

    { id: 'kick-clap', group: 'Trộn', name: 'Kick + vỗ tay', play(c, o, t) {
      tone(c, o, t, { from: 200, to: 60, sweep: 0.1, peak: 1, decay: 0.22 });
      clap(c, o, t, 1200, 0.12); } },
    { id: 'kick-hat', group: 'Trộn', name: 'Kick + hi-hat', play(c, o, t) {
      tone(c, o, t, { from: 230, to: 65, sweep: 0.1, peak: 1, decay: 0.2 });
      hiss(c, o, t, { type: 'highpass', freq: 7000, q: 0.7, peak: 0.35, decay: 0.04 }); } },
    { id: 'tom-shaker', group: 'Trộn', name: 'Tom + lắc', play(c, o, t) {
      tone(c, o, t, { from: 260, to: 170, sweep: 0.15, peak: 0.9, decay: 0.22 });
      hiss(c, o, t, { freq: 5000, q: 0.8, peak: 0.3, decay: 0.06, attack: 0.015 }); } },

    { id: 'pop', group: 'Vui tai', name: 'Bụp', play(c, o, t) {
      tone(c, o, t, { from: 320, to: 150, sweep: 0.04, peak: 0.9, decay: 0.08 }); } },
    { id: 'bubble', group: 'Vui tai', name: 'Bong bóng', play(c, o, t) {
      tone(c, o, t, { from: 300, to: 900, sweep: 0.05, peak: 0.7, decay: 0.07 }); } },

    { id: 'old', group: 'Để so sánh', name: 'Tiếng cũ (píp)', play(c, o, t) {
      tone(c, o, t, { type: 'triangle', from: 1900, to: 900, sweep: 0.06, peak: 0.9, decay: 0.09 });
      hiss(c, o, t, { freq: 3000, q: 0.8, peak: 0.8, decay: 0.05 }); } },
  ];
  const BY_ID = Object.fromEntries(LIST.map(s => [s.id, s]));
  const DEFAULT = 'clap-warm';  // the user's pick, 2026-11-07
  const level = {};   // per-sound gain, set by calibrate
  const bright = {};  // spectral centroid in Hz, set by calibrate

  async function render(s, speaker) {
    const sr = 44100, c = new OfflineAudioContext(1, Math.floor(sr * 0.6), sr);
    let out = c.destination;
    if (speaker) { const h = c.createBiquadFilter(); h.type = 'highpass'; h.frequency.value = 200; h.Q.value = 0.7; h.connect(c.destination); out = h; }
    s.play(c, out, 0);
    return (await c.startRendering()).getChannelData(0);
  }
  function loudness(x) {  // loudest 50 ms, as RMS
    const w = 2205; let best = 0;
    for (let a = 0; a + w <= x.length; a += 441) {
      let s = 0; for (let i = a; i < a + w; i++) s += x[i] * x[i];
      best = Math.max(best, s / w);
    }
    return Math.sqrt(best);
  }
  const N = 2048, COS = new Float64Array(N), SIN = new Float64Array(N), HANN = new Float64Array(N);
  for (let i = 0; i < N; i++) { COS[i] = Math.cos(2 * Math.PI * i / N); SIN[i] = Math.sin(2 * Math.PI * i / N); HANN[i] = 0.5 - 0.5 * COS[i]; }
  function centroid(x) {  // where the energy of the first 46 ms sits, in Hz
    const sr = 44100, v = new Float64Array(N); let num = 0, den = 0;
    for (let i = 0; i < N; i++) v[i] = x[i] * HANN[i];
    for (let k = 1; k < N / 2; k++) {
      let re = 0, im = 0;
      for (let i = 0, j = 0; i < N; i++, j = (j + k) & (N - 1)) { re += v[i] * COS[j]; im -= v[i] * SIN[j]; }
      const m = re * re + im * im; num += m * k * sr / N; den += m;
    }
    return num / den;
  }
  // Match every sound to the old beep's loudness on a tablet speaker, without letting a peak pass 0.9.
  async function calibrate(ids = LIST.map(s => s.id), withBrightness = false) {
    const target = loudness(await render(BY_ID.old, true));
    for (const id of ids) {
      const s = BY_ID[id]; if (!s) continue;
      const full = await render(s, false), spk = await render(s, true);
      const peak = full.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      level[id] = Math.min(target / Math.max(loudness(spk), 1e-6), 0.9 / Math.max(peak, 1e-6));
      if (withBrightness) bright[id] = centroid(full);
    }
  }
  function play(c, out, when, id) {
    const s = BY_ID[id] || BY_ID[DEFAULT];
    const g = c.createGain(); g.gain.value = level[s.id] ?? 1; g.connect(out);
    s.play(c, g, when);
  }
  return { LIST, BY_ID, DEFAULT, level, bright, calibrate, play, render };
})();
