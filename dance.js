'use strict';
// The dancing girl and her four backup dancers, drawn on a canvas behind the game.
// Each arm and leg is one picture that bends softly. Her hands go to the same spot on her body as the C.A.C center's
// (the center changes often), her body bows, crouches and leans with theirs, and her braids swing.
window.Dance = (() => {
const VW = 1180, VH = 820, HEAD = 1.0, ARM_Q = 1.3, LEG_Q = 1.1;
const wearOf = id => Object.entries(D.wear).filter(([k]) => k.startsWith(id + '/')).map(([key, w]) => ({ key, ...w }));   // an outfit: its pieces
let OVERRIDE = null, OUTFIT = 'blue', NECK = null, D = null, IM = {}, BG = null, cv = null, ctx = null, MV = null, beats = [], downs = [], GIRL = null, CREW = [], lastT = null, ready = false;
const mul = (a, b) => [a[0]*b[0]+a[2]*b[1], a[1]*b[0]+a[3]*b[1], a[0]*b[2]+a[2]*b[3], a[1]*b[2]+a[3]*b[3], a[0]*b[4]+a[2]*b[5]+a[4], a[1]*b[4]+a[3]*b[5]+a[5]];
const T = (x, y) => [1, 0, 0, 1, x, y];
const Rr = r => { const c = Math.cos(r), s = Math.sin(r); return [c, s, -s, c, 0, 0]; };
const R = d => Rr(d * Math.PI / 180);
const S = (sx, sy = sx) => [sx, 0, 0, sy, 0, 0];
const at = (m, p) => [m[0]*p[0] + m[2]*p[1] + m[4], m[1]*p[0] + m[3]*p[1] + m[5]];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const lerpAng = (a, b, w) => a + (((b - a + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI) * w;
const DEG = Math.PI / 180;

// ---- a limb: one straight picture, four points down it (root, middle joint, end joint, tip)
class Limb {
  constructor(name) {
    const L = D.limbs[name];
    Object.assign(this, { name, key: L.key, J: L.joints, s: L.scale, blend: L.blend, img: IM[L.key], h: D.sizes[L.key][1] });
    this.rest = [0, 1, 2].map(k => Math.atan2(this.J[k + 1][1] - this.J[k][1], this.J[k + 1][0] - this.J[k][0]));
    this.len = [0, 1].map(k => Math.hypot(this.J[k + 1][0] - this.J[k][0], this.J[k + 1][1] - this.J[k][1]) * this.s);
  }
  cx(y) {
    const J = this.J;
    if (y <= J[0][1]) return J[0][0];
    for (let k = 0; k < 3; k++) if (y <= J[k + 1][1]) return J[k][0] + (y - J[k][1]) / (J[k + 1][1] - J[k][1]) * (J[k + 1][0] - J[k][0]);
    return J[3][0];
  }
  bones(root, phi, q = 1) {   // phi: direction of each bone (radians, y down); q shortens the upper two bones
    const B = []; let P = root;
    for (let k = 0; k < 3; k++) {
      const th = phi[k] - this.rest[k], qk = k < 2 ? q : 1;
      const m = mul(T(P[0], P[1]), mul(Rr(th), mul(Rr(this.rest[k] - Math.PI / 2), mul(S(this.s, this.s * qk), mul(Rr(Math.PI / 2 - this.rest[k]), T(-this.J[k][0], -this.J[k][1]))))));
      B.push({ m, th }); P = at(m, this.J[k + 1]);
    }
    return B;
  }
  // two-bone reach: the middle joint bends to the side asked for, or outward when the dance does not say
  reach(root, target, hint, outward, state, dt, q = 1, bad = null) {
    const L1 = this.len[0] * q, L2 = this.len[1] * q;
    const dx = target[0] - root[0], dy = target[1] - root[1];
    const dmin = Math.sqrt(L1 * L1 + L2 * L2 - 2 * L1 * L2 * Math.cos(35 * Math.PI / 180));   // elbow open at least 35 degrees
    const d = clamp(Math.hypot(dx, dy), Math.max(Math.abs(L1 - L2) + 1, dmin), (L1 + L2) * 0.995), base = Math.atan2(dy, dx);
    const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const W = [root[0] + d * Math.cos(base), root[1] + d * Math.sin(base)];
    const pick = side => { const a1 = base + side * A, E = [root[0] + L1 * Math.cos(a1), root[1] + L1 * Math.sin(a1)];
      return { a1, a2: Math.atan2(W[1] - E[1], W[0] - E[0]), E }; };
    const p = pick(1), n = pick(-1);
    let want = Math.abs(hint) > 0.35 ? (hint > 0 ? 1 : 0) : ((p.E[0] - n.E[0]) * outward > 0 ? 1 : 0);
    if (bad) { const pb = +bad(p.E, W), nb = +bad(n.E, W); if (want === 1 && pb > nb) want = 0; else if (want === 0 && nb > pb) want = 1; }
    if (!(dt > 0 && dt < 0.25) || state.b == null) state.b = want;
    else state.b += clamp(want - state.b, -dt / 0.3, dt / 0.3);
    const w = state.b * state.b * (3 - 2 * state.b);
    return [lerpAng(n.a1, p.a1, w), lerpAng(n.a2, p.a2, w)];
  }
  // the limb as pieces down its length: rigid stretches, and thin slices near each joint that blend between bones
  segments(B, step) {
    const seg = [], J = this.J, s = this.s, r1 = this.blend[1], r2 = this.blend[2];
    seg.push({ m: B[0].m, y0: -400, y1: J[1][1] - r1, w2: 0 });
    const window = (k, jy, r) => {
      for (let y = jy - r; y < jy + r; y += step) {
        const yc = y + step / 2, u = clamp((yc - (jy - r)) / (2 * r), 0, 1), w = u * u * (3 - 2 * u);
        const p = [this.cx(yc), yc], a = at(B[k - 1].m, p), b = at(B[k].m, p);
        const P = [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w], th = lerpAng(B[k - 1].th, B[k].th, w);
        // keep each slice's own stretch along the limb (legs can be shortened)
        const q = Math.hypot(B[k - 1].m[2], B[k - 1].m[3]) / s * (1 - w) + Math.hypot(B[k].m[2], B[k].m[3]) / s * w;
        const m = mul(T(P[0], P[1]), mul(Rr(th), mul(Rr(this.rest[k] - Math.PI / 2), mul(S(s, s * q), mul(Rr(Math.PI / 2 - this.rest[k]), T(-p[0], -p[1]))))));
        seg.push({ m, y0: y, y1: y + step, w2: k === 2 ? w : 0 });
      }
    };
    window(1, J[1][1], r1);
    seg.push({ m: B[1].m, y0: J[1][1] + r1, y1: J[2][1] - r2, w2: 0 });
    window(2, J[2][1], r2);
    seg.push({ m: B[2].m, y0: J[2][1] + r2, y1: this.h + 400, w2: 1 });
    return seg;
  }
  // draw orders for the limb and anything worn on it (boots, sleeves, bracelets bend with it).
  // flip: -1..1, turns the hand over about its own length, like a wrist turning (1 = as drawn)
  ops(B, layers, step, flip = 1) {
    const seg = this.segments(B, step), out = [], J2 = this.J[2], r2 = this.rest[2];
    const F = fx => mul(T(J2[0], J2[1]), mul(Rr(r2 - Math.PI / 2), mul(S(fx, 1), mul(Rr(Math.PI / 2 - r2), T(-J2[0], -J2[1])))));
    for (const sg of seg) {
      const fx = sg.w2 >= 0.5 ? flip : 1, base = fx === 1 ? sg.m : mul(sg.m, F(fx));   // the hand side of the wrist turns over, the forearm does not
      for (const L of layers) {
        const ov = 1.6, ih = L.img.height;
        const ly0 = Math.max(0, (sg.y0 - ov - L.y) / L.s), ly1 = Math.min(ih, (sg.y1 + ov - L.y) / L.s);
        if (ly1 <= ly0) continue;
        out.push({ z: L.zOf((sg.y0 + sg.y1) / 2), img: L.img, m: mul(base, mul(T(L.x, L.y), L.post ? mul(S(L.s), L.post) : S(L.s))), r: [0, ly0, L.img.width, ly1 - ly0] });
      }
    }
    return out;
  }
}

// ---- a dancer: a body that bends at the waist, a head on a springy neck, four limbs that bend; every segment
// takes the CAC center's own angle, like a stick figure
const norm = a => ((a + 540) % 360) - 180;
class Dancer {
  constructor({ heads, headScale, wear, x, floor, scale, braids = false, step = 3 }) {
    Object.assign(this, { heads, headScale, x, floor, scale, braids, step });
    this.wear = wearOf(wear);
    this.limbs = { arm_l: new Limb('arm_l'), arm_r: new Limb('arm_r'), leg_l: new Limb('leg_l'), leg_r: new Limb('leg_r'), torso: new Limb('torso') };
    this.braid = { l: null, r: null };
    this.bend = { arm_l: {}, arm_r: {}, leg_l: {}, leg_r: {} };
    this.sp = {}; this.rl = {};
  }
  follow(name, P, dt, w) {   // a point that catches up with P quickly and smoothly, without overshoot
    let st = this.sp[name];
    if (!st || !(dt > 0 && dt < 0.25)) { st = this.sp[name] = { x: P.slice(), v: [0, 0] }; return P; }
    const n = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / n;
    for (let i = 0; i < n; i++) for (const k of [0, 1]) { st.v[k] += (w * w * (P[k] - st.x[k]) - 2 * w * st.v[k]) * h; st.x[k] += st.v[k] * h; }
    return st.x.slice();
  }
  limit(name, angs, dt, maxDegPerSec = 900, keep = true) {   // radians in and out
    const st = this.rl[name];
    if (!st || !(dt > 0 && dt < 0.25)) { if (keep) this.rl[name] = angs.slice(); return angs; }
    const m = maxDegPerSec * DEG * dt;
    const res = angs.map((a, i) => st[i] + clamp(norm((a - st[i]) / DEG) * DEG, -m, m));
    if (keep) this.rl[name] = res; return res;
  }
  spring(name, target, dt, k, c) {   // follow-through: the part catches up with a little give
    let st = this.sp[name];
    if (!st || !(dt > 0 && dt < 0.25)) st = this.sp[name] = { x: target, v: 0 };
    const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
    for (let i = 0; i < n; i++) { st.v += (k * (target - st.x) - c * st.v) * h; st.x += st.v * h; }
    return st.x;
  }
  draw(base, p, face, dt) {
    const bj = D.joints['body/body'], hk = this.heads[face], hj = D.joints[hk], ops = [];
    const pel = clamp(p.hip, -14, 14), che = this.spring('chest', clamp(p.spine, -30, 30), dt, 420, 34);
    const bow = this.spring('bow', clamp(1 - 1.2 * Math.max(0, 0.86 - p.tq), 0.6, 1), dt, 300, 30);
    const Mp = mul(R(pel), T(-bj.pelvis[0], -bj.pelvis[1]));
    const wW = at(Mp, bj.waist), Mc = mul(T(wW[0], wW[1]), mul(R(che), mul(S(1, bow), T(-bj.waist[0], -bj.waist[1]))));
    const hs = HEAD * this.headScale, n0 = at(Mc, bj.neck);
    const cdn = [-Math.sin(che * DEG), Math.cos(che * DEG)], csd = [-cdn[1], cdn[0]], TCh = bj.hip_l[1] - bj.shoulder_l[1];
    const ha = che + clamp(norm(this.spring('head', clamp(p.head, -24, 24), dt, 120, 15) - che), -18, 18);
    // a short neck from her collar up to her chin, leaning halfway between body and head; the head sits on top of it
    const na = (che + ha) / 2, nT = [n0[0] + Math.sin(na * DEG) * NECK.len, n0[1] - Math.cos(na * DEG) * NECK.len];
    const Mneck = mul(T(n0[0], n0[1]), mul(R(na), mul(T(-NECK.w / 2, -(NECK.len + NECK.top)), S(0.5))));
    const Mh = mul(T(nT[0], nT[1]), mul(R(ha), mul(S(hs), T(-hj.chin[0], -hj.chin[1]))));
    const LB = {}, flags = [], geo = {};
    // arms: each hand goes to the same spot on her body as on the dancer's (measured along and across the spine in
    // torso lengths), the elbow bends the way the dancer's does. A raised hand goes beside her big head, never across it.
    const dn = [-Math.sin(che * DEG), Math.cos(che * DEG)], sd = [-dn[1], dn[0]], TC = bj.hip_l[1] - bj.shoulder_l[1];
    const headPt = (x, y) => at(Mh, [x, y]), hw = D.sizes[hk][0], hh = D.sizes[hk][1];
    const upArm = {};
    for (const s of ['l', 'r']) {
      const limb = this.limbs['arm_' + s], Sh = at(Mc, bj['shoulder_' + s]), q = ARM_Q;
      let W = p.arm ? Sh.slice() : [Sh[0] + TC * (p['hd_' + s] * dn[0] + p['hs_' + s] * sd[0]), Sh[1] + TC * (p['hd_' + s] * dn[1] + p['hs_' + s] * sd[1])];
      // keep the hand off her eyes, nose and mouth smoothly: near the face, the hand's spot is eased outward around it,
      // so a hand moving past her face goes round it instead of across, and nothing jumps
      const inv = m => { const det = m[0] * m[3] - m[1] * m[2]; return [m[3] / det, -m[1] / det, -m[2] / det, m[0] / det, (m[2] * m[5] - m[3] * m[4]) / det, (m[1] * m[4] - m[0] * m[5]) / det]; };
      const toHead = inv(Mh), hp_ = at(toHead, W), out = s === 'l' ? -1 : 1;
      const fc = hj.face || [hw / 2, 0.72 * hh, 0.24 * hw, 0.19 * hh];
      const Z = hj.zones || { eyes: [fc[0], fc[1] - 0.3 * fc[3], 1.1 * fc[2], 0.55 * fc[3]], mouth: [fc[0], fc[1] + 0.55 * fc[3], 0.42 * fc[2], 0.45 * fc[3]], chin: fc[1] + fc[3], W: 2.4 * fc[2] };
      const eyes = Z.eyes, mouth = Z.mouth;
      const inE = (h_, z, g) => Math.hypot((h_[0] - z[0]) / (z[2] * g), (h_[1] - z[1]) / (z[3] * g)) < 1;
      const onFace = (P, g = 1) => { const h_ = at(toHead, P); return inE(h_, eyes, g) || inE(h_, mouth, g); };   // a hand may touch a cheek, not cover eyes or mouth
      const acrossFace = (P, Q) => {   // a forearm crossing the middle of her face, between brow and chin: an arm that looks broken
        const a = at(toHead, P), b = at(toHead, Q), top = eyes[1] - eyes[3], bot = Z.chin + 0.15 * Z.W;
        if ((a[0] - fc[0]) * (b[0] - fc[0]) > 0) return false;
        const u = (fc[0] - a[0]) / ((b[0] - a[0]) || 1e-6), y = a[1] + (b[1] - a[1]) * u;
        return y > top && y < bot;
      };
      const inHead = P => { const h_ = at(toHead, P); return Math.hypot((h_[0] - fc[0]) / (0.49 * hw), (h_[1] - 0.47 * hh) / (0.5 * hh)) < 1; };
      // 1) at the height of her face, a hand stays on its own side, outside the face with room for the hand:
      //    an arm never reaches across her face (that is where an arm looks broken). The pull fades in at the
      //    band's edges, so a hand moving into it slides smoothly. 2) Above her forehead, beside the head.
      const ss = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
      const top = eyes[1] - 2.2 * eyes[3], bot = Z.chin + 0.3 * Z.W;   // from above her brows to her upper chest
      const band = ss((hp_[1] - top) / (0.12 * Z.W)) * ss((bot - hp_[1]) / (0.12 * Z.W));
      const edge = eyes[0] + out * 0.62 * Z.W;
      if ((hp_[0] - edge) * out < 0) hp_[0] += (edge - hp_[0]) * band;
      const crown = ss((top + 0.12 * Z.W - hp_[1]) / (0.12 * Z.W)), edge2 = eyes[0] + out * 0.52 * hw;
      if ((hp_[0] - edge2) * out < 0) hp_[0] += (edge2 - hp_[0]) * crown;
      const st = this.bend['arm_' + s], q_ = q;
      const L1 = limb.len[0] * q_, L2 = limb.len[1] * q_, L3 = Math.hypot(limb.J[3][0] - limb.J[2][0], limb.J[3][1] - limb.J[2][1]) * limb.s;
      const segOver = (P, Q, g) => { for (let k = 0; k <= 5; k++) { const u = k / 5; if (onFace([P[0] + (Q[0] - P[0]) * u, P[1] + (Q[1] - P[1]) * u], g)) return true; } return false; };
      const sides = Wt => {   // both elbows that reach Wt (the elbow open at least 35 degrees), and the point actually reached
        const dx = Wt[0] - Sh[0], dy = Wt[1] - Sh[1], dmin = Math.sqrt(L1 * L1 + L2 * L2 - 2 * L1 * L2 * Math.cos(35 * DEG));
        const d = clamp(Math.hypot(dx, dy), Math.max(Math.abs(L1 - L2) + 1, dmin), (L1 + L2) * 0.995), base = Math.atan2(dy, dx);
        const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), R_ = [Sh[0] + d * Math.cos(base), Sh[1] + d * Math.sin(base)];
        return { R_, E: [[Sh[0] + L1 * Math.cos(base + a), Sh[1] + L1 * Math.sin(base + a)], [Sh[0] + L1 * Math.cos(base - a), Sh[1] + L1 * Math.sin(base - a)]] };
      };
      const elbowOk = (E, R_, upNow) => !onFace(E, 1.2) && !(!upNow && inHead(E)) && !segOver(E, R_, 1.05) && !acrossFace(E, R_);
      // a real elbow: with the upper arm hanging down, the forearm swings in across her body freely, but out to the side only a
      // little (straight out needs the shoulder turned all the way round; in a flat picture it reads as a broken elbow).
      // aDeg: the upper arm's direction (90 = straight down), rDeg: the elbow bend. Above 0 = further out than an arm goes.
      const outBy = (aDeg, rDeg) => { const h = clamp(1 - Math.abs(norm(aDeg - 90)) / 50, 0, 1); return -out * rDeg - (150 - 110 * h); };
      const unnatural = (E, Wt) => { const a = Math.atan2(E[1] - Sh[1], E[0] - Sh[0]); return outBy(a / DEG, norm((Math.atan2(Wt[1] - E[1], Wt[0] - E[0]) - a) / DEG)) > 0; };
      let B, up;
      if (p.arm) {   // the beat dance: a designed pose, turned with her chest: [upper arm direction, elbow bend, wrist bend]
        const [ua, rel, wb] = p.arm[s], a1 = (ua + che) * DEG, a2 = a1 + rel * DEG;
        B = limb.bones(Sh, [a1, a2, a2 + (limb.rest[2] - limb.rest[1]) + wb * DEG], q);
        up = at(B[1].m, limb.J[2])[1] < Sh[1] - 10;
      } else {
      // 1) a spot the forearm can reach without crossing her face: if neither elbow can, move it out to her own side
      for (let k = 0; k < 10; k++) {
        const Wt = at(Mh, hp_), upNow = Wt[1] < Sh[1] - 10, c = sides(Wt);
        if (elbowOk(c.E[0], c.R_, upNow) || elbowOk(c.E[1], c.R_, upNow)) break;
        hp_[0] += out * 0.05 * hw;
      }
      // 2) the hand glides to that spot (a quick critically damped follow): it never jumps between frames
      W = this.follow('hand_' + s, at(Mh, hp_), dt, 26);
      up = W[1] < Sh[1] - 10;
      // 3) the elbow takes the dancer's way unless that one crosses her face or goes into her head; side changes glide 0.3 s
      const A = limb.reach(Sh, W, p['eb_' + s], out, st, dt, q_, (E, Wt) => (!elbowOk(E, Wt, up) ? 2 : 0) + (unnatural(E, Wt) ? 1 : 0));
      // 4) the shoulder turns at most 750 degrees a second and the elbow bends at most 450: the forearm never jumps,
      //    and the elbow bend stays between -145 and 145 degrees (open at least 35), so it can never flip across
      const relA = clamp(norm((A[1] - A[0]) / DEG), -145, 145);
      let sa = this.rl['arm_' + s];
      const handClear = (wr_, fdir_, prefer = 0) => {   // the wrist bend nearest to the last one that keeps the whole hand off her eyes and mouth
        let bestOff = null;
        for (let off = -80; off <= 80; off += 10) {
          const a = fdir_ + off * DEG, tip = [wr_[0] + L3 * Math.cos(a), wr_[1] + L3 * Math.sin(a)];
          if (!segOver(wr_, tip, 1.05) && (bestOff === null || Math.abs(off - prefer) < Math.abs(bestOff - prefer))) bestOff = off;
        }
        return bestOff;
      };
      const pen = P => { const h_ = at(toHead, P); let m = 0;   // how deep a point sits in her eyes or mouth area (0 = clear)
        for (const z of [eyes, mouth]) m = Math.max(m, 1 - Math.hypot((h_[0] - z[0]) / (z[2] * 1.05), (h_[1] - z[1]) / (z[3] * 1.05)));
        return m; };
      const segPen = (P, Q) => { let m = 0; for (let k = 0; k <= 5; k++) { const u = k / 5; m = Math.max(m, pen([P[0] + (Q[0] - P[0]) * u, P[1] + (Q[1] - P[1]) * u])); } return m; };
      const armScore = (a, r) => { const B_ = limb.bones(Sh, [a, a + r * DEG, a + r * DEG + (limb.rest[2] - limb.rest[1])], q_);
        const e = at(B_[0].m, limb.J[1]), w_ = at(B_[1].m, limb.J[2]), f = a + r * DEG;
        let sc = segPen(e, w_) + (acrossFace(e, w_) ? 0.5 : 0);
        if (handClear(w_, f) === null) sc += segPen(w_, [w_[0] + L3 * Math.cos(f), w_[1] + L3 * Math.sin(f)]);
        sc += Math.max(0, outBy(a / DEG, r)) / 40;   // a way through an elbow no person could make counts against it too
        return sc; };
      if (!sa || !(dt > 0 && dt < 0.25)) sa = { a: A[0], r: relA };
      else {
        // within the speed limits, the first way that keeps her face clear: straight there, shoulder first, elbow first,
        // half way, or wait a moment
        const da = clamp(norm((A[0] - sa.a) / DEG), -700 * dt, 700 * dt), dr = clamp(relA - sa.r, -420 * dt, 420 * dt);
        const ma = 700 * dt, mr = 420 * dt;
        const tries_ = [[da, dr], [da, 0], [0, dr], [da / 2, dr / 2], [da, -dr], [-da / 2, dr], [0, 0],
          [ma, 0], [-ma, 0], [0, mr], [0, -mr], [ma, mr], [-ma, -mr], [ma, -mr], [-ma, mr]];   // or step aside, any way that clears her face
        // still stuck: a quicker move (up to 1.6 times faster, like a snap of the arm), toward the pose or out of the way
        const DA = norm((A[0] - sa.a) / DEG), DR = relA - sa.r, fa = 1.6 * ma, fr = 1.6 * mr;
        tries_.push([clamp(DA, -fa, fa), clamp(DR, -fr, fr)], [fa, 0], [-fa, 0], [0, fr], [0, -fr], [fa, fr], [-fa, -fr], [fa, -fr], [-fa, fr]);
        // the first way (in order of preference) that keeps her face clear; if none does, the one that comes least close
        let pick = null, best = Infinity, bestC = tries_[0];
        for (const c of tries_) {
          const sc = armScore(sa.a + c[0] * DEG, clamp(sa.r + c[1], -145, 145));
          if (sc <= 0) { pick = c; break; }
          if (sc < best) { best = sc; bestC = c; }
        }
        pick = pick || bestC;
        sa = { a: sa.a + pick[0] * DEG, r: clamp(sa.r + pick[1], -145, 145) };
      }
      this.rl['arm_' + s] = sa;
      const Lm = [sa.a, sa.a + sa.r * DEG];
      // 5) fingers that would touch her face: the wrist bends the hand down or out instead (smoothly)
      let B0 = limb.bones(Sh, [Lm[0], Lm[1], Lm[1] + (limb.rest[2] - limb.rest[1])], q_);
      const wr = at(B0[1].m, limb.J[2]), fdir = Lm[1];
      const prevW = st.wrist || 0, want_ = handClear(wr, fdir, 0);
      // the wrist bends exactly as far as needed (no lag over her face); otherwise it relaxes back at most 300 degrees a second
      const wb = want_ === null ? prevW : (Math.abs(want_) > Math.abs(prevW) || !(dt > 0) ? want_ : prevW + clamp(want_ - prevW, -300 * dt, 300 * dt));
      // the bend actually used is checked itself: if it would put the hand on her eyes or mouth, the nearest clear bend instead
      const clearAt = off => !segOver(wr, [wr[0] + L3 * Math.cos(fdir + off * DEG), wr[1] + L3 * Math.sin(fdir + off * DEG)], 1.05);
      if (clearAt(wb)) st.wrist = wb;
      else { const alt = handClear(wr, fdir, wb); st.wrist = alt === null ? wb : alt; }
      const wbUse = st.wrist;
      B = limb.bones(Sh, [Lm[0], Lm[1], Lm[1] + (limb.rest[2] - limb.rest[1]) + wbUse * DEG], q_);
      }
      const crosses = B => { const e = at(B[0].m, limb.J[1]), w_ = at(B[1].m, limb.J[2]), t_ = at(B[2].m, limb.J[3]); return segOver(e, w_, 1.0) || segOver(w_, t_, 1.0) || acrossFace(e, w_); };
      // an arm up by her head is drawn whole in front of her hair, never half behind her head
      upArm[s] = up || inHead(at(B[0].m, limb.J[1])) || inHead(at(B[1].m, limb.J[2]));
      LB['arm_' + s] = B;
      {
        const el = at(B[0].m, limb.J[1]), wr = at(B[1].m, limb.J[2]), tip = at(B[2].m, limb.J[3]);
        const mid = [(el[0] + wr[0]) / 2, (el[1] + wr[1]) / 2], hand = [(wr[0] + tip[0]) / 2, (wr[1] + tip[1]) / 2];
        const a = Math.atan2(el[1] - Sh[1], el[0] - Sh[0]), b = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
        const inner = 180 - Math.abs(norm((b - a) / DEG));   // 180 = a straight arm, small = folded flat
        if (onFace(el, 1.0)) flags.push('khuỷu đè mặt ' + s);
        if (onFace(tip, 1.0) || onFace(hand, 1.0)) flags.push('bàn tay che mắt/miệng ' + s);
        if (inner < 28) flags.push('khuỷu gập quá ' + s);
        if (outBy(a / DEG, norm((b - a) / DEG)) > 8) flags.push('khuỷu bẻ ra ngoài vô lý ' + s);
        geo.outMax = Math.max(geo.outMax ?? -999, outBy(a / DEG, norm((b - a) / DEG)));
        const h_ = at(toHead, el);
        if (!upArm[s] && inHead(el)) flags.push('tay xuyên đầu ' + s);
        if (crosses(B)) flags.push('tay vắt qua mặt ' + s);
        {   // how close the forearm and hand come to her eyes or mouth (1 = touching the edge), to pick frames for a look
          let m = 9; const zd = P => { const h_ = at(toHead, P); return Math.min(...[eyes, mouth].map(z => Math.hypot((h_[0] - z[0]) / z[2], (h_[1] - z[1]) / z[3]))); };
          for (let k = 0; k <= 4; k++) { const u = k / 4; m = Math.min(m, zd([el[0] + (wr[0] - el[0]) * u, el[1] + (wr[1] - el[1]) * u]), zd([wr[0] + (tip[0] - wr[0]) * u, wr[1] + (tip[1] - wr[1]) * u])); }
          geo.near = Math.min(geo.near ?? 9, m);
        }
        geo['arm_' + s] = [a / DEG, b / DEG];
      }
    }
    const crouch = this.spring('crouch', p.arm ? clamp(p.lq, 0.8, 1) : clamp(1 - Math.max(0, 0.95 - p.lq), 0.65, 1), dt, p.arm ? 900 : 360, p.arm ? 55 : 32);
    for (const s of ['l', 'r']) {   // legs: thighs stay below the hips, knees bend at most 70 degrees, feet flat
      const limb = this.limbs['leg_' + s], Hp = at(Mp, bj['hip_' + s]);
      if (p.leg) {
        const [th, rel, qq] = p.leg[s], a1 = (th + pel) * DEG, a2 = a1 + rel * DEG;
        LB['leg_' + s] = limb.bones(Hp, [a1, a2, limb.rest[2] + ((p.foot && p.foot[s]) || 0) * DEG], LEG_Q * crouch * qq);
        geo['leg_' + s] = [th, th + rel];
        continue;
      }
      const th0 = clamp(norm(p['th_' + s]), 8, 172), bend0 = clamp(norm(p['sn_' + s] - p['th_' + s]), -85, 85);
      const Lg = this.limit('leg_' + s, [th0 * DEG, (th0 + bend0) * DEG], dt), th = Lg[0] / DEG, bend = norm((Lg[1] - Lg[0]) / DEG);
      LB['leg_' + s] = limb.bones(Hp, [Lg[0], Lg[1], limb.rest[2]], LEG_Q * crouch);
      if (Math.abs(bend) > 115) flags.push('gối gập quá ' + s);
      geo['leg_' + s] = [th, th + bend];
    }
    const sole = s => at(LB['leg_' + s][2].m, this.limbs['leg_' + s].J[3]);
    const sl = sole('l'), sr = sole('r'), lowest = Math.max(sl[1], sr[1]), midx = (sl[0] + sr[0]) / 2;
    const root = mul(base, mul(T(this.x, this.floor), mul(S(this.scale), T(-midx, -lowest))));
    if (Math.abs(norm(ha - che)) > 22) flags.push('đầu nghiêng quá so với thân');
    this.last = { flags, geo: { ...geo, head: ha, chest: che, pelvis: pel, bow, crouch }, hip: [this.x - midx * this.scale, this.floor - lowest * this.scale] };
    ctx.setTransform(...mul(base, T(this.x, this.floor)));
    ctx.fillStyle = 'rgba(60,20,90,.22)'; ctx.beginPath(); ctx.ellipse(0, 4, 120 * this.scale / 0.44, 20 * this.scale / 0.44, 0, 0, 7); ctx.fill();
    const add = (z, key, m, r) => ops.push({ z, img: IM[key], m, r });
    // the body and what is worn on it bend together at the waist
    const TB = [{ m: Mc, th: che * DEG }, { m: Mp, th: pel * DEG }, { m: Mp, th: pel * DEG }];
    const tl = [{ img: IM['body/body'], x: 0, y: 0, s: 1, zOf: () => 30 }];
    const swingR = this.spring('skirtR', pel + che * 0.5, dt, 70, 6) - (pel + che * 0.5), swingY = this.spring('skirtY', crouch, dt, 110, 9) - crouch;
    for (const w of this.wear) if (w.bone === 'body') {
      const L = { img: IM[w.key], x: w.x, y: w.y, s: w.s, zOf: () => w.z };
      if (/\/(skirt|bottom)$/.test(w.key)) {   // a skirt swings from its waistband
        const cx = L.img.width / 2;
        L.post = mul(T(cx, 0), mul(R(clamp(swingR * 1.6, -7, 7)), mul(S(1 + clamp(swingY, -0.03, 0.03), 1 - clamp(swingY * 2.5, -0.06, 0.06)), T(-cx, 0))));
      }
      tl.push(L);
    }
    for (const o of this.limbs.torso.ops(TB, tl, 3, 1)) ops.push(o);
    add(44, hk, Mh);
    ops.push({ z: 31.5, img: NECK.img, m: Mneck });   // under the collar, under the chin
    for (const s of ['l', 'r']) {
      for (const kind of ['arm', 'leg']) {
        const name = kind + '_' + s, limb = this.limbs[name], elbowY = limb.J[1][1];
        const up = kind === 'arm' && upArm[s];   // a raised hand: the arm is drawn in front of her hair
        const lift = up ? 10 : 0;
        const layers = [{ img: limb.img, x: 0, y: 0, s: 1, zOf: kind === 'arm' ? (y => (y < elbowY ? 36 : 45) + lift) : (() => 10) }];
        for (const w of this.wear) if (w.limb === name) layers.push({ img: IM[w.key], x: w.x, y: w.y, s: w.s, zOf: () => w.z + lift });
        let flip = 1;
        if (kind === 'arm') {   // past level the hand turns over, as a wrist would
          const fa = LB[name][1], dir = Math.atan2(fa.m[1], fa.m[0]) + limb.rest[1];
          const up = Math.abs(norm((dir - Math.PI / 2) / DEG));
          const st = this.bend[name];
          if (!(dt > 0 && dt < 0.25) || st.flip == null) st.flip = up > 121 ? -1 : 1;
          else if (up > 130) st.flip = -1; else if (up < 112) st.flip = 1;
          flip = st.flip;
        }
        for (const o of limb.ops(LB[name], layers, kind === 'arm' ? this.step : this.step + 1, flip)) ops.push(o);
      }
    }
    for (const w of this.wear) if (w.bone === 'head') add(w.z, w.key, mul(Mh, mul(T(w.x, w.y), S(w.s))));
    if (this.braids) {   // braids hang from their ties and swing behind her moves
      for (const s of ['l', 'r']) {
        const bk = 'body/braid_' + s, bjn = D.joints[bk], tie = at(Mh, hj['tie_' + s]), len = bjn.len * 0.545;
        let st = this.braid[s];
        const restTip = [tie[0] + (s === 'l' ? -0.08 : 0.08) * len, tie[1] + len];
        if (!st || dt <= 0 || dt > 0.25) st = this.braid[s] = { tip: restTip.slice(), v: [0, 0], prevTie: tie.slice() };
        const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
        for (let i = 0; i < n; i++) {
          const ax = 70 * (restTip[0] - st.tip[0]) - 9 * st.v[0], ay = 70 * (restTip[1] - st.tip[1]) - 9 * st.v[1];
          st.v[0] += ax * h; st.v[1] += ay * h; st.tip[0] += st.v[0] * h; st.tip[1] += st.v[1] * h;
        }
        const dx = tie[0] - st.prevTie[0], dy = tie[1] - st.prevTie[1]; st.prevTie = tie.slice();
        st.tip[0] += dx * 0.35; st.tip[1] += dy * 0.35;
        const a = clamp(Math.atan2(st.tip[1] - tie[1], st.tip[0] - tie[0]) - Math.PI / 2, -0.7, 0.7);
        add(41, bk, mul(T(tie[0], tie[1]), mul(Rr(a), mul(S(0.545), T(-bjn.top[0], -bjn.top[1])))));
      }
    }
    ops.sort((a, b) => a.z - b.z);
    for (const o of ops) {
      ctx.setTransform(...mul(root, o.m));
      if (o.r) ctx.drawImage(o.img, o.r[0], o.r[1], o.r[2], Math.min(o.r[3], o.img.height - o.r[1]), o.r[0], o.r[1], o.r[2], Math.min(o.r[3], o.img.height - o.r[1]));
      else ctx.drawImage(o.img, 0, 0);
    }
  }
}


// ---- the song's moves: frames of named numbers, 30 a second, read in between
const ANG = new Set(['ua_l', 'fa_l', 'th_l', 'sn_l', 'ua_r', 'fa_r', 'th_r', 'sn_r', 'spine', 'hip', 'head']);
function beatAt(t) {
  if (!beats.length) { const n = t * 2; return { n, ph: n % 1, pulse: 0 }; }
  let lo = 0, hi = beats.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (beats[m] <= t) lo = m; else hi = m - 1; }
  const nx = beats[lo + 1] ?? beats[lo] + 0.42, ph = clamp((t - beats[lo]) / (nx - beats[lo]), 0, 1);
  return { n: lo + ph, ph, pulse: Math.exp(-((ph / 0.14) ** 2)) + Math.exp(-(((1 - ph) / 0.14) ** 2)) };
}
function barAt(t) {
  if (!downs.length) return { i: Math.floor(t / 1.68), t0: Math.floor(t / 1.68) * 1.68 };
  let lo = 0, hi = downs.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (downs[m] <= t) lo = m; else hi = m - 1; }
  return { i: lo, t0: downs[lo] };
}
function idlePose(t) {   // standing, swaying a little on the beat: before the song, on the menu, and where the video has no dance
  const n = beatAt(t).n, sw = Math.sin(Math.PI * n);
  return { ua_l: 100, fa_l: 95, ua_r: 80, fa_r: 85, th_l: 93, sn_l: 92, th_r: 87, sn_r: 88, spine: 3 * sw, hip: -2 * sw,
    head: 5 * Math.sin(Math.PI * n + 0.5), hd_l: 0.72, hs_l: 0.1, eb_l: 0.6, hd_r: 0.72, hs_r: -0.1, eb_r: -0.6,
    tq: 1, lq: 0.97 + 0.025 * Math.cos(2 * Math.PI * n), nose_x: 0, nose_y: 0 };
}
function idleWeight(t) {
  if (!MV) return 1;
  const end = MV.t0 + (MV.rows.length - 1) / MV.fps;
  let w = clamp(Math.max(MV.t0 - t, t - end) / 0.6 + 0.5, 0, 1);
  for (const [a, b] of MV.idle || []) w = Math.max(w, clamp(Math.min(t - a, b - t) / 0.6 + 0.5, 0, 1));
  return w;
}
function poseAt(t) {
  const idle = idlePose(t), w = idleWeight(t);
  if (w >= 1) return idle;
  const F = MV.rows, x = clamp((t - MV.t0) * MV.fps, 0, F.length - 1), i = Math.floor(x), u = x - i;
  const a = F[i], b = F[Math.min(i + 1, F.length - 1)], p = {};
  MV.fields.forEach((k, j) => { p[k] = ANG.has(k) ? a[j] + norm(b[j] - a[j]) * u : a[j] + (b[j] - a[j]) * u; });
  p.head = norm(p.head) * 0.8;
  if (w > 0) for (const k in idle) p[k] = ANG.has(k) ? p[k] + norm(idle[k] - p[k]) * w : p[k] + (idle[k] - p[k]) * w;
  return p;
}
// ---- her face: the mouth opens on each sung word (a happy open mouth, now and then a round 'oh', eyes closed on a long
// note), a gentle closed smile between words and in calm parts, a big smile in the liveliest parts, a blink every few
// seconds and now and then a wink. Every face is the same head with only the eyes and mouth changed, so nothing jumps.
const BLINKS = (() => { const r = []; let t = 1.1; for (let k = 0; t < 600; k++) { r.push(t); t += 2.3 + 2.7 * rnd(k * 3.7 + 0.9); } return r; })();
function lastAtOrBefore(arr, t, key = x => x) {
  if (!arr.length || key(arr[0]) > t) return -1;
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (key(arr[m]) <= t) lo = m; else hi = m - 1; }
  return lo;
}
function blinking(t) { const k = lastAtOrBefore(BLINKS, t); return k >= 0 && t - BLINKS[k] < 0.14; }
let FACES = null;   // the song's faces, worked out once per song, 30 a second, with no face shown for less than 0.1 s
function buildFaces(duration) {
  const raw = [];
  for (let i = 0; i <= Math.ceil(duration * 30) + 30; i++) raw.push(rawFace(i / 30));
  for (let pass = 0; pass < 3; pass++) {   // a face that would show for 1 or 2 frames takes the face before it
    let s = 0;
    for (let i = 1; i <= raw.length; i++) if (i === raw.length || raw[i] !== raw[s]) { if (i - s < 3 && s > 0) raw.fill(raw[s - 1], s, i); s = i; }
  }
  return raw;
}
function faceAt(t, playing) {
  if (!playing || !MV) return blinking(t) ? 'blink' : 'shut';
  if (FACES && MV.kind === 'groove') return FACES[clamp(Math.round(t * 30), 0, FACES.length - 1)];
  return rawFace(t);
}
function rawFace(t) {
  const bar = barAt(t);
  if (MV.kind !== 'groove') {   // the old dancer-following moves
    const bt = beatAt(t);
    if (MV.sing && MV.sing.some(([a, b]) => t >= a && t <= b)) return Math.floor(bt.n / 2) % 2 === 0 ? 'sing' : 'smile';
    if (bar.i % 4 === 3 && t - bar.t0 < 0.5) return 'wink';
    return 'smile';
  }
  const W = MV.words || [], k = lastAtOrBefore(W, t, w => w[0]);
  if (k >= 0) {
    const [a, b] = W[k], next = W[k + 1] ? W[k + 1][0] : Infinity;
    const end = next - b < 0.09 ? next : b;   // two words almost touching: the mouth stays open between them
    if (t < end) return (b - a > 0.7 && t - a > 0.3) ? 'sing' : (k % 3 === 2 ? 'oh' : 'smile');
  }
  const between = k >= 0 && (W[k + 1] ? W[k + 1][0] : Infinity) - t < 0.5 && t - W[k][1] < 0.6;   // a short pause inside a sung line
  const e = (MV.energy || [])[bar.i] ?? 0.4, open = e >= 0.7 && !between;
  if (!between && e >= 0.5 && bar.i % 8 === 7 && t - bar.t0 < 0.45) return 'wink';
  if (blinking(t)) return open ? 'sing' : 'blink';
  return open ? 'smile' : 'shut';
}

// ---- the beat dance (no video): gentle designed moves that land on the beat, chosen by how lively the music is.
// Arm poses for her right arm (screen right), degrees with y down: [upper arm direction (0 out, 90 down), elbow bend,
// wrist bend]. The left arm is the mirror image. Every pose and every way between two poses keeps the elbow natural.
const ARM = {
  down: [84, 10, 0], downOut: [72, 6, 0], downIn: [92, 16, 0], hip: [40, 102, 8], chest: [76, 124, -8], clap: [72, 130, -14],
  cheek: [18, -112, 10], ear: [-4, -92, 0], vUp: [-38, -14, 0], out: [10, -8, 0], outLow: [44, -2, 0], point: [-22, -6, 0],
  wave: [-8, -76, 0],
};
const ease = x => { x = clamp(x, 0, 1); return 0.5 - 0.5 * Math.cos(Math.PI * x); };   // soft in, soft out: never a snap
const mixP = (a, b, w) => a.map((v, i) => v + (b[i] - v) * w);
// a list of poses, one per beat: hold each pose, then move in the second half of the beat so the next one lands on its beat
function seq(u, keys) {
  const j = Math.ceil(u - 1e-9), L = keys.length, prev = keys[((j - 1) % L + L) % L], next = keys[(j % L + L) % L];
  return mixP(prev, next, ease((u - (j - 1) - 0.25) / 0.75));   // hold a quarter beat, then move for the rest
}
const STYLES = {
  sway: u => { const w = 0.5 + 0.5 * Math.sin(Math.PI * u); return { r: mixP(ARM.downIn, ARM.downOut, w), l: mixP(ARM.downIn, ARM.downOut, 1 - w) }; },
  clap: u => { const k = [ARM.outLow, ARM.clap]; return { r: seq(u, k), l: seq(u, k) }; },
  wave: u => {
    const side = ease(u - 3);   // the right hand waves for 4 beats, then the left: the change takes the whole 4th beat
    const wav = [...ARM.wave]; wav[1] += 12 * Math.sin(2 * Math.PI * u);   // the hand tips outward and back, away from her face
    return { r: mixP(wav, ARM.hip, side), l: mixP(ARM.hip, wav, side) };
  },
  cheer: u => { const pump = 0.5 + 0.5 * Math.cos(2 * Math.PI * (u % 1)), v = [...ARM.vUp]; v[0] -= 9 * pump; return { r: v, l: v }; },
  cute: u => ({ r: ARM.cheek, l: ARM.cheek, tilt: 9 * Math.sin(Math.PI * u) }),
  point: u => ({ r: seq(u / 2, [ARM.point, ARM.hip]), l: seq(u / 2, [ARM.hip, ARM.point]) }),
  roll: u => ({ r: seq(u, [ARM.chest, ARM.outLow]), l: seq(u, [ARM.outLow, ARM.chest]) }),
};
const BY_LEVEL = [['sway', 'cute', 'sway', 'cute'], ['clap', 'wave', 'sway', 'point', 'clap', 'wave'], ['cheer', 'point', 'clap', 'roll', 'wave']];
function blockStyle(k) {   // a 2-bar block's moves: from its liveliness, never the same as the block before
  if (k < 0 || !MV || !MV.energy) return { name: 'sway', e: 0.2 };   // no song yet (the menu): a gentle sway
  const e = ((MV.energy[2 * k] ?? 0.3) + (MV.energy[2 * k + 1] ?? MV.energy[2 * k] ?? 0.3)) / 2;
  const list = BY_LEVEL[e < 0.33 ? 0 : e < 0.7 ? 1 : 2];
  let name = list[Math.floor(rnd(k * 7.3 + 1.1) * list.length)];
  if (k > 0) { const before = blockStyle.cache[k - 1] ?? blockStyle(k - 1).name; if (before === name) name = list[(list.indexOf(name) + 1) % list.length]; }
  blockStyle.cache[k] = name;
  return { name, e };
}
blockStyle.cache = [];
function beatIndex(time) {   // the beat nearest to a time
  let lo = 0, hi = beats.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (beats[m] < time) lo = m + 1; else hi = m; }
  return lo > 0 && Math.abs(beats[lo - 1] - time) < Math.abs(beats[lo] - time) ? lo - 1 : lo;
}
function groovePose(t, mirror) {
  const bt = beatAt(t), n = bt.n, bar = barAt(t);
  const first = beats[0] ?? 0, last = beats[beats.length - 1] ?? 1e9;
  // the music's beats; before the first one and after the last she sways gently on her own
  const k = Math.floor(bar.i / 2), st = blockStyle(k), nx = blockStyle(k + 1);
  // where this 2-bar block starts and how many beats it really has (a bar the beat finder saw as 3 or 5 beats is fine)
  const b0 = downs.length ? beatIndex(downs[Math.min(2 * k, downs.length - 1)]) : 8 * k;
  const b1 = downs.length && 2 * k + 2 < downs.length ? beatIndex(downs[2 * k + 2]) : b0 + 8;
  const u = n - b0, LEN = Math.max(b1 - b0, 2);
  // the last beat of a block is the change: the old moves stop where they are and she moves cleanly into the new ones,
  // which land on the next block's first beat
  let arms = STYLES[st.name](Math.min(u, LEN - 1));
  if (u > LEN - 1) { const b2 = STYLES[nx.name](0), w = ease(u - (LEN - 1)); arms = { r: mixP(arms.r, b2.r, w), l: mixP(arms.l, b2.l, w), tilt: (arms.tilt || 0) * (1 - w) + (b2.tilt || 0) * w }; }
  let e = st.e;
  const outside = t < first - 0.2 || t > last;
  if (t < first - 0.2) { arms = STYLES.sway(n); e = 0.15; }
  if (t > last) { const w = ease((t - last) / 0.6); arms = { r: mixP(arms.r, ARM.vUp, w), l: mixP(arms.l, ARM.vUp, w), tilt: (arms.tilt || 0) * (1 - w) }; }   // the end: both arms up, held
  // the body: down on every beat, the weight from side to side, knees soft
  const ph = bt.ph, drop = Math.exp(-((ph / 0.3) ** 2)) + Math.exp(-(((1 - ph) / 0.2) ** 2));
  const bounce = (0.035 + 0.04 * e) * clamp(drop, 0, 1) * (t > last ? Math.max(0, 1 - (t - last) / 0.6) : 1);
  const sx = Math.sin(Math.PI * n) * (0.6 + 0.6 * e) * (mirror ? -1 : 1);   // the weight: + = on her right foot
  const mirrorP = p => [180 - p[0], -p[1], -p[2]];
  const give = q => q[0] > 30 ? [q[0], q[1] + Math.sign(q[1] || 1) * 60 * bounce, q[2]] : q;   // a low arm's elbow gives a little on the bounce
  const R = give(arms.r), L = give(arms.l);
  const pose = {
    arm: mirror ? { r: L, l: mirrorP(R) } : { r: R, l: mirrorP(L) },
    hip: 4 * sx, spine: -2 * sx, tq: 1, lq: 1 - bounce,
    head: 4 * Math.sin(Math.PI * n - 0.6) + (arms.tilt || 0) * (mirror ? -1 : 1),
    leg: { r: [85 + 5 * sx, 1, sx < 0 ? 1 + 0.06 * sx : 1], l: [95 + 5 * sx, -1, sx > 0 ? 1 - 0.06 * sx : 1] },
    foot: { r: sx < 0 ? 6 * sx : 0, l: sx > 0 ? 6 * sx : 0 },
  };
  return pose;
}

// ---- the stage: a fixed view (the game's rings and arrows sit on top), soft lights on the beat
const GIRL_AT = { x: 590, floor: 792, scale: 0.47 };
const CREW_AT = [{ x: 150, floor: 506, scale: 0.235 }, { x: 282, floor: 500, scale: 0.24 }, { x: 898, floor: 500, scale: 0.24 }, { x: 1030, floor: 506, scale: 0.235 }];
function star(x, y, r) { ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, rr = k % 2 ? r * 0.3 : r; ctx.lineTo(x + Math.sin(a) * rr, y - Math.cos(a) * rr); } ctx.closePath(); ctx.fill(); }
const SPARK = Array.from({ length: 30 }, (_, i) => ({ x: rnd(i * 3 + 1) * VW, y: rnd(i * 3 + 2) * VH * 0.55, s: 4 + rnd(i * 3 + 3) * 8, ph: rnd(i * 7) * 6.28, sp: 1.6 + rnd(i * 11) * 2.4 }));
function drawScene(screen, t, bt) {
  ctx.setTransform(...screen);
  if (BG) { const k = 1.35; ctx.drawImage(BG, VW / 2 - BG.width * k / 2, 800 - 840 * k, BG.width * k, BG.height * k); }
  else { ctx.fillStyle = '#b06ad6'; ctx.fillRect(-400, -300, VW + 800, VH + 600); }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const cols = ['255,150,225', '150,200,255', '205,160,255', '255,205,160'];
  for (let i = 0; i < 4; i++) {
    const x0 = 140 + i * 300, a = Math.sin(t * 0.9 + i * 1.7) * 0.3 + (i < 2 ? -0.18 : 0.18);
    ctx.save(); ctx.translate(x0, -30); ctx.rotate(a);
    const g = ctx.createLinearGradient(0, 0, 0, 900);
    g.addColorStop(0, `rgba(${cols[i]},${0.08 + 0.1 * bt.pulse})`); g.addColorStop(1, `rgba(${cols[i]},0)`);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(12, 0); ctx.lineTo(140, 900); ctx.lineTo(-140, 900); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  const r = 170 + 20 * bt.pulse, gl = ctx.createRadialGradient(GIRL_AT.x, GIRL_AT.floor, 10, GIRL_AT.x, GIRL_AT.floor, r);
  gl.addColorStop(0, `rgba(255,255,255,${0.45 + 0.2 * bt.pulse})`); gl.addColorStop(0.5, 'rgba(255,170,235,.3)'); gl.addColorStop(1, 'rgba(255,170,235,0)');
  ctx.fillStyle = gl; ctx.beginPath(); ctx.ellipse(GIRL_AT.x, GIRL_AT.floor, r, r * 0.22, 0, 0, 7); ctx.fill();
  ctx.restore();
}
function drawSparkles(screen, t, bt) {
  ctx.save(); ctx.setTransform(...screen); ctx.globalCompositeOperation = 'lighter';
  for (const s of SPARK) { const a = Math.max(0, Math.sin(t * s.sp + s.ph)) * (0.45 + 0.4 * bt.pulse); if (a < 0.05) continue;
    ctx.fillStyle = `rgba(255,250,255,${a})`; star(s.x, s.y, s.s * (0.7 + 0.5 * a)); }
  ctx.restore();
}

// t: song time while playing; null: the idle loop (menu), on its own clock
let idleClock = 0, idleLast = null;
function draw(t) {
  if (!ready) return;
  let songT = t, playingNow = t != null;
  if (!playingNow) { const now = performance.now() / 1000; idleClock += idleLast == null ? 0 : Math.min(now - idleLast, 0.1); idleLast = now; songT = idleClock; }
  else idleLast = null;
  const dt = lastT == null ? 0 : songT - lastT; lastT = songT;
  const W = cv.width, H = cv.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  const k = Math.min(W / VW, H / VH), screen = [k, 0, 0, k, (W - VW * k) / 2, (H - VH * k) / 2];
  const keep = { MV, beats, downs };
  if (!playingNow) { MV = null; beats = []; downs = []; }
  const bt = beatAt(songT), face = faceAt(songT, playingNow);
  const grooving = !MV || MV.kind === 'groove';
  const p = OVERRIDE ? OVERRIDE(songT) : grooving ? groovePose(songT, false) : poseAt(songT);
  drawScene(screen, songT, bt);
  CREW.forEach((c, k) => c.draw(screen, grooving ? groovePose(songT - 0.02 * (k % 2 + 1), k < 2) : p, 'smile', dt));
  GIRL.draw(screen, p, face, dt);
  drawSparkles(screen, songT, bt);
  if (!playingNow) ({ MV, beats, downs } = keep);
}
function makeNeck(c) {   // drawn here at twice the size, for a sharp edge: skin, a soft shadow under the chin, outlined sides
  const len = 44, top = 30, bot = 40, w = 54, h = top + len + bot, cv2 = document.createElement('canvas');
  cv2.width = w * 2; cv2.height = h * 2;
  const g = cv2.getContext('2d'); g.scale(2, 2);
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, c.shade); gr.addColorStop((top + 6) / h, c.shade); gr.addColorStop((top + len * 0.7) / h, c.skin); gr.addColorStop(1, c.skin);
  g.fillStyle = gr; g.fillRect(7, 0, w - 14, h);
  g.strokeStyle = c.line; g.lineWidth = 2.4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(7, 0); g.lineTo(7, h); g.moveTo(w - 7, 0); g.lineTo(w - 7, h); g.stroke();
  return { img: cv2, len, top, bot, w };
}
async function init(canvas, bundle) {
  cv = canvas; ctx = cv.getContext('2d');
  D = await bundle.json('rig.json');
  const load = src => new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = bad; im.src = src; });
  await Promise.all(Object.keys(D.sizes).map(async k => { IM[k] = await load(bundle.files[k + '.webp']); }));
  BG = await load(bundle.files['stage.webp']).catch(() => null);
  NECK = makeNeck(D.neck || { skin: '#fed6be', shade: '#e4af98', line: '#310501' });
  const crewHead = n => Object.fromEntries(['smile', 'sing', 'wink', 'shut', 'blink', 'oh'].map(f => [f, 'crew/' + n])), hs = n => D.joints['crew/' + n].scale_vs_girl;
  CREW = ['head_spiky', 'head_ponytail', 'head_buns', 'head_sidepart'].map((n, i) =>
    new Dancer({ heads: crewHead(n), headScale: hs(n), wear: 'crew', ...CREW_AT[i], step: 6 }));
  const saved = localStorage.getItem('spike-outfit');   // the outfit she wore last time on this device
  OUTFIT = (D.outfits || []).some(o => o.id === saved) ? saved : ((D.outfits || [])[0] || { id: 'blue' }).id;
  GIRL = new Dancer({ heads: Object.fromEntries(['smile', 'sing', 'wink', 'shut', 'blink', 'oh'].map(f => [f, 'body/head2_' + f])), headScale: D.joints['body/head2_smile'].scale_vs_old,
    wear: OUTFIT, ...GIRL_AT, braids: true, step: 3 });
  const fit = () => { const r = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(innerWidth * r); cv.height = Math.round(innerHeight * r); };
  fit(); addEventListener('resize', fit);
  ready = true;
}
function setOutfit(id) {   // a new outfit is only other pieces on the same body: her moves and everything else stay
  if (!D || !(D.outfits || []).some(o => o.id === id)) return;
  OUTFIT = id; GIRL.wear = wearOf(id); localStorage.setItem('spike-outfit', id);
}
function setSong(moves, chart) { MV = moves; beats = chart?.beats || []; downs = chart?.downbeats || []; lastT = null; blockStyle.cache = []; FACES = null; if (MV && MV.kind === 'groove') FACES = buildFaces(chart?.duration || (beats[beats.length - 1] || 0) + 5); }
function audit(t) { draw(t); return { girl: GIRL.last, crew: CREW.map(c => c.last), face: faceAt(t, true) }; }
return { init, setSong, setOutfit, ARM, STYLES, groovePose, styleAt: t => { const k = Math.floor(barAt(t).i / 2); return blockStyle(k).name + '>' + blockStyle(k + 1).name; }, setOverride: f => { OVERRIDE = f; }, get outfits() { return (D && D.outfits) || []; }, get outfit() { return OUTFIT; }, draw, audit, get ready() { return ready; }, get hasMoves() { return !!MV; } };
})();
