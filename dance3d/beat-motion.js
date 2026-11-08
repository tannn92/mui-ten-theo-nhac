// Stateless mapping from the game's latency-corrected song time to the approved
// Samba phrase. Source times refer to the bundled, unmodified 30 fps animation.
const PHRASE_BEATS = 24;
const SOURCE = [25,38,54,70,87,104,122,139,158,175,195,209,228,245,263,278,296,314,334,350,368,385,404,420,437].map(frame => frame / 30);
const LEAD_IN = 7 / 30;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function hermite(a, b, ma, mb, u, span = 1) {
  const u2 = u * u, u3 = u2 * u;
  return (2*u3-3*u2+1)*a + (u3-2*u2+u)*span*ma
    + (-2*u3+3*u2)*b + (u3-u2)*span*mb;
}

// Fritsch–Butland / PCHIP slopes: C1 interpolation without overshooting or
// reversing phase when a chart has uneven beat spacing.
function monotoneCurve(x, y) {
  const n = x.length;
  const h = x.slice(1).map((v, i) => v - x[i]);
  const d = h.map((v, i) => (y[i+1] - y[i]) / v);
  const m = new Array(n);
  if (n === 2) m.fill(d[0]);
  else {
    const endpoint = (h0, h1, d0, d1) => {
      const value = ((2*h0+h1)*d0-h0*d1)/(h0+h1);
      if (value*d0 <= 0) return 0;
      return d0*d1 < 0 && Math.abs(value)>3*Math.abs(d0) ? 3*d0 : value;
    };
    m[0] = endpoint(h[0], h[1], d[0], d[1]);
    m[n-1] = endpoint(h[n-2], h[n-3], d[n-2], d[n-3]);
    for (let i = 1; i < n-1; i++) {
      if (d[i-1]*d[i] <= 0) m[i] = 0;
      else {
        const w1 = 2*h[i]+h[i-1], w2 = h[i]+2*h[i-1];
        m[i] = (w1+w2)/(w1/d[i-1]+w2/d[i]);
      }
    }
  }
  return {
    slopes: m,
    sample(t) {
      if (t <= x[0]) return y[0] + (t-x[0])*m[0];
      if (t >= x[n-1]) return y[n-1] + (t-x[n-1])*m[n-1];
      let lo = 0, hi = n-1;
      while (hi-lo > 1) {
        const mid = (lo+hi) >>> 1;
        if (x[mid] <= t) lo = mid; else hi = mid;
      }
      return hermite(y[lo], y[hi], m[lo], m[hi], (t-x[lo])/h[lo], h[lo]);
    }
  };
}

const sourceCurve = monotoneCurve(SOURCE.map((_, i) => i), SOURCE);

export function createBeatMotion(data) {
  const fps = data?.fps, frameCount = data?.frames?.length;
  const available = Math.min(data?.duration ?? Infinity, (frameCount-1)/fps);
  if (!(fps > 0) || !Number.isFinite(available) || available < SOURCE.at(-1)) {
    throw new RangeError('Samba motion is too short for the approved 24-beat phrase');
  }
  let beatAt = t => t * 2;

  function setSong(moves, chart) {
    const candidate = Array.isArray(chart?.beats) ? chart.beats : moves?.beats;
    const beats = [...new Set((Array.isArray(candidate) ? candidate : [])
      .filter(v => typeof v === 'number' && Number.isFinite(v)))].sort((a,b) => a-b);
    if (beats.length >= 2) {
      const curve = monotoneCurve(beats, beats.map((_, i) => i));
      beatAt = t => t <= beats[0] ? 0 : Math.max(0, curve.sample(t));
    } else {
      const proposed = chart?.bpm ?? moves?.bpm;
      const bpm = typeof proposed === 'number' && Number.isFinite(proposed) && proposed > 0
        ? clamp(proposed, 20, 400) : 120;
      const first = beats[0] ?? 0;
      beatAt = t => Math.max(0, (t-first)*bpm/60);
    }
  }

  function sample(t) {
    // Countdown, idle and bad inputs hold the first pose, rather than wrapping
    // a negative modulo into the end of the dance.
    const songTime = typeof t === 'number' && Number.isFinite(t) ? Math.max(0,t) : 0;
    const phase = beatAt(songTime) % PHRASE_BEATS;
    const u = clamp(phase-(PHRASE_BEATS-1), 0, 1);
    const blend = u*u*(3-2*u);
    // End the incoming curve at the same source time AND velocity used at beat
    // zero. Smoothstep gives zero blend derivative at both ends of the seam.
    const start = hermite(LEAD_IN, SOURCE[0], SOURCE[0]-LEAD_IN,
      sourceCurve.slopes[0], u);
    return {source: sourceCurve.sample(phase), start, blend, energy: 1};
  }

  return {setSong, sample};
}
