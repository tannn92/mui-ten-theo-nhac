// Two-iPad play (duo): clock helpers. Pure functions, no imports (unit-tested in Node: spike/qa3d/duo-clock.test.mjs).

// The guest pings the host: t0 = guest send time, th = host time on reply, t1 = guest receive time (all performance.now ms).
// The round trip with the least delay carries the least jitter, so it gives the best offset: host time ~ local time + offset.
export function bestOffset(samples) {
  if (!samples?.length) throw Error('no samples');
  let best = null;
  for (const s of samples) { const rtt = s.t1 - s.t0; if (!best || rtt < best.rtt) best = {rtt, offset: s.th - (s.t0 + s.t1) / 2}; }
  return {offset: best.offset, rtt: best.rtt};
}

// AudioContext time at which a sound is HEARD at local performance.now() === perfMs. getOutputTimestamp pairs the sample being
// played out now with its performance time, so the speaker latency is included; before audio flows it reports zeros, and then
// currentTime (scheduling time) is the fallback. nowMs = performance.now() at the call.
export function ctxTimeAt(ctx, perfMs, nowMs) {
  // only a live pair: after iOS interrupts audio the last pair from before can linger (minutes off)
  const ts = ctx.state === undefined || ctx.state === 'running' ? ctx.getOutputTimestamp?.() : null;
  if (ts && ts.performanceTime > 0 && Math.abs(ts.contextTime - ctx.currentTime) < 0.5) return ts.contextTime + (perfMs - ts.performanceTime) / 1000;
  return ctx.currentTime + (perfMs - nowMs) / 1000;
}
