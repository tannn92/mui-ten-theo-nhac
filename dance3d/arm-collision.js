import * as T from 'three';
import {boyDonor} from './boy-body.js?v=1611.2031';

// Arms never pass through the body (owner 2026-11-15 "nhiều đoạn di chuyển vung tay... cảm giác vẫn cứ có tình trạng tay xuyên
// qua người"). One pass on a rig's FINAL normalized pose (after every motion layer: capture, pose bank, fades, crew/partner
// overrides), before humanoid.update / spring bones / skinning. Hooks: runtime.js (lead), crew.js + independent-crew-rig.js
// (own-motion crew), partner.js (duo partner); all marked "// arm-collision".
//
// Body: per torso bone (hips, spine, chest, upperChest) one radius table in that bone's normalized frame (1 cm slices x 48 sectors
// around the bone's vertical axis, bilinear, tapered over 2 cm past the ends) = max over the dancer's whole Body SKIN (+8 mm for
// clothes and air; boy body for Nam / boy looks) and the torso-weighted vertices of every worn garment (+3 mm). Spring bones
// (skirt flare, hair, accessories) are not part of it. Built from the real geometry, cached by geometry and per outfit.
// Arm: test points on the distal half of the upper arm, the forearm and a 3 x 3 hand grid, each with its own radius measured
// from the arm skin.
// Resolve, two rounds of: (A) swivel: shoulder and wrist stay, the elbow turns about the shoulder-wrist axis (soft-min over 13
// angles within +-120 deg, gated by forearm/hand penetration, so a pose that does not sink in is untouched); (B) push: what still
// sinks in moves along the torso's outward normal (upper-arm hits swing the arm about the shoulder, forearm hits move the elbow and
// more stiffly the wrist, hand hits move the wrist to the surface), then two-bone IK (bone lengths kept). The hand's local rotation
// stays. A wrist near the head is pinned (hand-to-face / hand-to-head gestures keep their contact; only the elbow moves). Never ends
// deeper than it came in (continuous fade back to the incoming pose).
// Pure function of the incoming pose: no history, no filters (seek-deterministic). No allocations per frame.

const TORSO = ['hips', 'spine', 'chest', 'upperChest'];
const NS = 48, SL = 0.01, TAPER = 0.02;
const MARGIN_SKIN = 0.008;   // body skin: clothes + air (m, rig units)
const MARGIN_CLOTH = 0.003;  // garment surface: air only
const SOFT = 0.008;          // soft start half-width: push = (d+SOFT)^2/(4 SOFT) for |d| < SOFT
const ITER = 2;             // swivel + push rounds
const WRIST_EASE = 0.3;     // forearm hits in phase B: the wrist moves this much more stiffly than the elbow (keeps hand contacts)
const UPPER_U = [0.5, 0.75, 1.0], FORE_U = [0.25, 0.5, 0.75, 1.0];
const ARM_NAMES = ['UpperArm', 'LowerArm', 'Hand'];

const isSkin = m => [].concat(m.material).some(x => /Body.*SKIN/.test(x?.name || ''));
const isFace = m => [].concat(m.material).some(x => /FACE|EYE|Face_00_SKIN|HAIR/i.test(x?.name || '')) || /^Face_/.test(m.name);

// Body SKIN mesh of a donor variant: the girl body, or the boy body (boy-body.js boyDonor, built on first use).
export function bodyMeshOf(variant, boy) {
 if (!variant) return null;
 if (boy) { try { const d = boyDonor(variant); const m = d.meshes.find(x => x.userData?.boyBody); if (m) return m; } catch (e) { console.warn('arm-collision boy body', e); } }
 return variant.meshes.find(m => m.isSkinnedMesh && isSkin(m));
}

// humanoid bone name by raw bone NAME (J_Bip_...): every rig in the game (variants, crew clones, partner clones) uses the same names
const names = new Map();
function learnNames(humanoid) {
 for (const [name, b] of Object.entries(humanoid.rawHumanBones)) if (b?.node && !names.has(b.node.name)) names.set(b.node.name, name);
}
function mapBone(bone) {
 const n = names.get(bone.name); if (n) return n;
 if (/Bust/i.test(bone.name)) for (let x = bone.parent; x; x = x.parent) { const m = names.get(x.name); if (m) return m; }   // bust -> chest/upperChest
 return null;   // skirt / hair / accessory spring bones: not part of the collision body
}
const tmpM = new T.Matrix4();
function restOf(sk, name, out) {
 for (let k = 0; k < sk.bones.length; k++) if (names.get(sk.bones[k].name) === name) { tmpM.copy(sk.boneInverses[k]).invert(); return out.setFromMatrixPosition(tmpM); }
 return null;
}

// Per mesh (cached by geometry + index): radius tables of its torso-dominated vertices in the torso bones' normalized frames
// (bind space = normalized axes, bind pose = VRM rest), and for skin meshes the arm vertices (bind space) for the test radii.
const meshCache = new WeakMap();
function meshPart(mesh) {
 const g = mesh.geometry, key = g.index || g; let per = meshCache.get(g);
 if (!per) { per = new Map(); meshCache.set(g, per); }
 let part = per.get(key); if (part) return part;
 const P = g.attributes.position, SI = g.attributes.skinIndex, SW = g.attributes.skinWeight, sk = mesh.skeleton, skin = isSkin(mesh);
 part = {tables: [], arm: null, skin, rest: {}};
 if (!P || !SI || !SW || !sk) { per.set(key, part); return part; }
 const idx = g.index, used = new Uint8Array(P.count);
 if (idx) for (let i = 0; i < idx.count; i++) used[idx.getX(i)] = 1; else used.fill(1);
 for (const n of [...TORSO, 'head', ...['left', 'right'].flatMap(s => ARM_NAMES.map(a => s + a))]) part.rest[n] = restOf(sk, n, new T.Vector3());
 const pts = Object.fromEntries(TORSO.map(n => [n, []])), arm = {left: {upper: [], lower: [], hand: []}, right: {upper: [], lower: [], hand: []}}, V = new T.Vector3();
 const boneName = sk.bones.map(b => mapBone(b));
 for (let i = 0; i < P.count; i++) {
  if (!used[i]) continue;
  let best = -1, bw = 0; for (let j = 0; j < 4; j++) { const w = SW.getComponent(i, j); if (w > bw) { bw = w; best = SI.getComponent(i, j); } }
  if (best < 0) continue; const n = boneName[best]; if (!n) continue;
  V.fromBufferAttribute(P, i).applyMatrix4(mesh.bindMatrix);
  if (TORSO.includes(n)) { const r = part.rest[n]; if (r) pts[n].push(V.x - r.x, V.y - r.y, V.z - r.z); continue; }
  if (!skin || bw < 0.5) continue;
  const m = /^(left|right)(UpperArm|LowerArm|Hand|Thumb|Index|Middle|Ring|Little)/.exec(n); if (!m) continue;
  arm[m[1]][m[2] === 'UpperArm' ? 'upper' : m[2] === 'LowerArm' ? 'lower' : 'hand'].push(V.x, V.y, V.z);
 }
 for (const n of TORSO) {
  const p = pts[n]; if (p.length < 60) continue;
  let y0 = Infinity, y1 = -Infinity; for (let i = 1; i < p.length; i += 3) { y0 = Math.min(y0, p[i]); y1 = Math.max(y1, p[i]); }
  const ns = Math.max(1, Math.ceil((y1 - y0) / SL)), R = new Float32Array(ns * NS).fill(-1);
  for (let i = 0; i < p.length; i += 3) {
   const x = p[i], y = p[i + 1], z = p[i + 2], s = Math.min(ns - 1, Math.floor((y - y0) / SL));
   const a = ((Math.floor((Math.atan2(z, x) + Math.PI) / (2 * Math.PI) * NS) % NS) + NS) % NS, r = Math.hypot(x, z);
   if (r > R[s * NS + a]) R[s * NS + a] = r;
  }
  // rows: fill empty sectors around the ring when at least a third is covered (a garment that wraps the body); a row with fewer
  // sectors stays partial (a tie, a bow: only its own sectors count, the rest is -1 = no surface)
  for (let s = 0; s < ns; s++) {
   let filled = 0; for (let a = 0; a < NS; a++) if (R[s * NS + a] >= 0) filled++;
   if (filled < NS / 3) continue;
   for (let a = 0; a < NS; a++) if (R[s * NS + a] < 0) {
    let l = 1, r = 1; while (R[s * NS + (a - l + NS) % NS] < 0) l++; while (R[s * NS + (a + r) % NS] < 0) r++;
    const A = R[s * NS + (a - l + NS) % NS], B = R[s * NS + (a + r) % NS]; R[s * NS + a] = A + (B - A) * l / (l + r);
   }
  }
  // empty rows inside the range (sparse garments): take the lower of the two neighbours (never invent a wider surface)
  for (let s = 0; s < ns; s++) for (let a = 0; a < NS; a++) if (R[s * NS + a] < 0) {
   let lo = s - 1, hi = s + 1; while (lo >= 0 && R[lo * NS + a] < 0) lo--; while (hi < ns && R[hi * NS + a] < 0) hi++;
   if (lo >= 0 && hi < ns && hi - lo <= 4) R[s * NS + a] = Math.min(R[lo * NS + a], R[hi * NS + a]);
  }
  for (let k = 0; k < R.length; k++) if (R[k] < 0) R[k] = 0;
  part.tables.push({name: n, bone: TORSO.indexOf(n), y0, ns, R, margin: skin ? MARGIN_SKIN : MARGIN_CLOTH, mesh: mesh.name});
 }
 if (skin) part.arm = arm;
 per.set(key, part); return part;
}

// arm test points + radii from the skin meshes' arm vertices: radius = 75th percentile of the skin's distance to the bone axis
// near the point; hand = 3 x 3 grid of clusters along / across the hand + 80th percentile half-thickness + 3 mm
function armRadii(parts) {
 const pct = (a, q) => { if (!a.length) return 0; a.sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(q * a.length))]; };
 const out = {}, V = new T.Vector3(), rest = parts.find(p => p.skin && p.rest.leftUpperArm)?.rest || parts.find(p => p.rest.leftUpperArm)?.rest;
 if (!rest) return out;
 for (const side of ['left', 'right']) {
  const S = rest[side + 'UpperArm'], E = rest[side + 'LowerArm'], W = rest[side + 'Hand']; if (!S || !E || !W) continue;
  const cat = k => parts.flatMap(p => p.arm ? p.arm[side][k] : []);
  const up = cat('upper'), lo = cat('lower'), ha = cat('hand');
  const seg = (A, B, list, us) => {
   const ab = new T.Vector3().subVectors(B, A), L = ab.length(); ab.divideScalar(L);
   return us.map(u => { const d = []; for (let i = 0; i < list.length; i += 3) { V.set(list[i] - A.x, list[i + 1] - A.y, list[i + 2] - A.z); const t = V.dot(ab) / L; if (Math.abs(t - u) * L > 0.012) continue; d.push(V.addScaledVector(ab, -V.dot(ab)).length()); } return d.length > 5 ? pct(d, 0.75) : 0.02; });
  };
  const upper = seg(S, E, up.concat(lo), UPPER_U), lower = seg(E, W, lo.concat(ha), FORE_U);
  const ax = new T.Vector3().subVectors(W, E).normalize(), upv = new T.Vector3(0, 1, 0).addScaledVector(ax, -ax.y).normalize(), across = new T.Vector3().crossVectors(ax, upv).normalize(), local = [];
  let a0 = Infinity, a1 = -Infinity, c0 = Infinity, c1 = -Infinity;
  for (let i = 0; i < ha.length; i += 3) { V.set(ha[i] - W.x, ha[i + 1] - W.y, ha[i + 2] - W.z); const a = V.dot(ax), c = V.dot(across); local.push(a, c, V.dot(upv)); if (a > -0.01) { a0 = Math.min(a0, a); a1 = Math.max(a1, a); c0 = Math.min(c0, c); c1 = Math.max(c1, c); } }
  const hand = [];
  for (let ia = 0; ia < 3 && local.length; ia++) for (let ic = 0; ic < 3; ic++) {
   const A0 = a0 + (a1 - a0) * ia / 3, A1 = a0 + (a1 - a0) * (ia + 1) / 3, C0 = c0 + (c1 - c0) * ic / 3, C1 = c0 + (c1 - c0) * (ic + 1) / 3; let n = 0, sa = 0, sc = 0, st = 0; const th = [];
   for (let i = 0; i < local.length; i += 3) { const a = local[i], c = local[i + 1]; if (a < A0 || a > A1 || c < C0 || c > C1) continue; n++; sa += a; sc += c; st += local[i + 2]; }
   if (n < 4) continue; sa /= n; sc /= n; st /= n;
   for (let i = 0; i < local.length; i += 3) { const a = local[i], c = local[i + 1]; if (a < A0 || a > A1 || c < C0 || c > C1) continue; th.push(Math.abs(local[i + 2] - st)); }
   hand.push({off: new T.Vector3().addScaledVector(ax, sa).addScaledVector(across, sc).addScaledVector(upv, st), r: pct(th, 0.8) + 0.003, core: ic === 1 && ia > 0});
  }
  out[side] = {upper, lower, hand};
 }
 return out;
}

// Collision model of one dancer from its visible meshes (body skin pieces + garments; face/hair/eyes are skipped).
const models = new Map();   // key string -> model (small: one per outfit seen)
export function modelFor(meshes, humanoid, key = null) {
 if (key != null && models.has(key)) return models.get(key);
 const t0 = performance.now(); learnNames(humanoid);
 const parts = [];
 for (const m of meshes) if (m?.isSkinnedMesh && !isFace(m)) parts.push(meshPart(m));
 const tables = [];
 for (let bi = 0; bi < TORSO.length; bi++) {   // one table per torso bone: max over the parts of (surface radius + its margin)
  const src = []; for (const p of parts) for (const t of p.tables) if (t.bone === bi) src.push(t);
  if (!src.length) continue;
  let y0 = Infinity, y1 = -Infinity; for (const t of src) { y0 = Math.min(y0, t.y0); y1 = Math.max(y1, t.y0 + t.ns * SL); }
  const ns = Math.max(1, Math.round((y1 - y0) / SL)), R = new Float32Array(ns * NS);
  for (const t of src) for (let s = 0; s < t.ns; s++) {
   const k = Math.round((t.y0 - y0) / SL) + s; if (k < 0 || k >= ns) continue;
   for (let a = 0; a < NS; a++) { const r = t.R[s * NS + a]; if (r > 0) R[k * NS + a] = Math.max(R[k * NS + a], r + t.margin); }
  }
  let maxR = 0; for (let k = 0; k < R.length; k++) if (R[k] > maxR) maxR = R[k];
  tables.push({name: TORSO[bi], bone: bi, y0, ns, R, maxR, margin: 0, parts: src.map(t => t.mesh)});
 }
 const model = {tables, radii: armRadii(parts), meshes: parts.length, buildMs: performance.now() - t0};
 if (key != null) { if (models.size > 64) models.clear(); models.set(key, model); }
 return model;
}

// ---- solver scratch (no per-frame allocations)
const inv = TORSO.map(() => new T.Matrix4()), tq = TORSO.map(() => new T.Quaternion());
const S = new T.Vector3(), E = new T.Vector3(), W = new T.Vector3(), P = new T.Vector3(), L = new T.Vector3(), N = new T.Vector3(), Nb = new T.Vector3();
const dE = new T.Vector3(), dW = new T.Vector3(), Eh = new T.Vector3(), Wt = new T.Vector3(), Ex = new T.Vector3(), Hc = new T.Vector3();
const A1 = new T.Vector3(), B1 = new T.Vector3(), U = new T.Vector3(), Pl = new T.Vector3(), Ax = new T.Vector3(), rot = new T.Quaternion();
const hq = new T.Quaternion(), wq = new T.Quaternion(), pq = new T.Quaternion(), lq = new T.Quaternion(), sv = new T.Vector3(), scl = new T.Vector3();
let TRACE = null; export function armTrace(on) { const t = TRACE; TRACE = on ? [] : null; return t; }
const stats = {calls: 0, ms: 0, pushed: 0, maxMs: 0, swivels: 0, backoff: 0};
const CHAIN = ['hips', 'spine', 'chest', 'upperChest', 'neck', 'head', 'leftShoulder', 'leftUpperArm', 'rightShoulder', 'rightUpperArm'];   // parent before child
const SIDES = ['left', 'right'];

function soft(d) { return d <= -SOFT ? 0 : d >= SOFT ? d : (d + SOFT) * (d + SOFT) / (4 * SOFT); }

// soft push (rig units) for a sphere (centre p world, radius r rig units) inside the torso; outward normal in N (world).
// Every table (body skin, each garment) counts; normals are blended by push, so the direction never jumps.
function depthAt(model, p, r, noNormal = false) {
 let best = 0, sum = 0; if (!noNormal) N.set(0, 0, 0);
 const tabs = model.tables;
 for (let b = 0; b < tabs.length; b++) {
  const tb = tabs[b], bi = tb.bone, e = inv[bi].elements, px = p.x, py = p.y, pz = p.z;
  const ly = e[1] * px + e[5] * py + e[9] * pz + e[13], fy = (ly - tb.y0) / SL - 0.5;   // bone-local height first: most tables end here
  if (fy < -TAPER / SL || fy > tb.ns - 1 + TAPER / SL) continue;
  const lx = e[0] * px + e[4] * py + e[8] * pz + e[12], lz = e[2] * px + e[6] * py + e[10] * pz + e[14];
  const rho = Math.sqrt(lx * lx + lz * lz); if (rho < 1e-5 || rho - r - SOFT > tb.maxR) continue;   // far from this bone's surface
  L.set(lx, ly, lz);
  let taper = 1, s0, s1, u;
  if (fy < 0) { taper = 1 + fy * SL / TAPER; s0 = s1 = 0; u = 0; } else if (fy > tb.ns - 1) { taper = 1 - (fy - tb.ns + 1) * SL / TAPER; s0 = s1 = tb.ns - 1; u = 0; }
  else { s0 = Math.floor(fy); s1 = Math.min(tb.ns - 1, s0 + 1); u = fy - s0; }
  if (taper <= 0) continue;
  const fa = (Math.atan2(L.z, L.x) + Math.PI) / (2 * Math.PI) * NS - 0.5, a0f = Math.floor(fa), v = fa - a0f, a0 = ((a0f % NS) + NS) % NS, a1 = (a0 + 1) % NS, R = tb.R;
  const rad = ((R[s0 * NS + a0] * (1 - v) + R[s0 * NS + a1] * v) * (1 - u) + (R[s1 * NS + a0] * (1 - v) + R[s1 * NS + a1] * v) * u) * taper;
  if (!(rad > 0)) continue;
  const m = soft(rad + tb.margin + r - rho); if (m <= 0) continue;
  if (m > best) best = m; if (noNormal) continue;
  Nb.set(L.x / rho, 0, L.z / rho).applyQuaternion(tq[bi]);   // world radial normal of this bone
  N.addScaledVector(Nb, m);
 }
 if (best > 0 && !noNormal) { const l = N.length(); if (l > 1e-9) N.divideScalar(l); else best = 0; }
 return best;
}
// grow d so that d . n >= m (the smallest change that satisfies every push asked so far, roughly)
function want(d, n, m) { const have = d.dot(n); if (m > have) d.addScaledVector(n, m - have); }

// Arm state, forward kinematics done here (no scene-graph walks inside the solve): world shoulder joint S, parent (shoulder bone)
// world rotation Qp, local rotations qu / ql / qh and rest offsets; E, W, Qu, Ql, Qh follow from them.
const A = {S: new T.Vector3(), E: new T.Vector3(), W: new T.Vector3(), Qp: new T.Quaternion(), Qu: new T.Quaternion(), Ql: new T.Quaternion(), Qh: new T.Quaternion(),
 qu: new T.Quaternion(), ql: new T.Quaternion(), qh: new T.Quaternion(), offE: new T.Vector3(), offW: new T.Vector3(), s: 1};
const tv = new T.Vector3(), tm = new T.Matrix4();
function fk() {
 A.Qu.multiplyQuaternions(A.Qp, A.qu); A.E.copy(A.offE).applyQuaternion(A.Qu).add(A.S);
 A.Ql.multiplyQuaternions(A.Qu, A.ql); A.W.copy(A.offW).applyQuaternion(A.Ql).add(A.E); A.Qh.multiplyQuaternions(A.Ql, A.qh);
}
// Arm moves that keep the elbow a hinge (the QA elbow rule: the forearm bends only about the upper arm's own hinge axis):
// rotArm turns the whole arm rigidly about the shoulder; bendTo opens/closes the elbow in its current bend plane.
const hv = new T.Vector3(), qh0 = new T.Quaternion();
const PIN0 = 0.15, PIN1 = 0.25, FACE_FREE = 0.40;   // wrist distance to the head centre (rig m): fully pinned below PIN0, free above PIN1
function rotArm(q) { A.Qu.premultiply(q); A.qu.copy(pq.copy(A.Qp).invert()).multiply(A.Qu); fk(); }
function bendTo(d) {
 const a = A.S.distanceTo(A.E), b = A.E.distanceTo(A.W); d = T.MathUtils.clamp(d, Math.abs(a - b) + 1e-4, a + b - 1e-4);
 A1.subVectors(A.E, A.S).normalize(); B1.subVectors(A.W, A.E).normalize();
 const beta = Math.acos(T.MathUtils.clamp(A1.dot(B1), -1, 1)), beta2 = Math.PI - Math.acos(T.MathUtils.clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1));
 hv.set(0, A.side === 'left' ? -1 : 1, 0).applyQuaternion(A.Qu);   // anatomical hinge (as the QA kernel reads it)
 tv.crossVectors(A1, B1).addScaledVector(hv, 0.05); if (tv.lengthSq() < 1e-12) return; tv.normalize();
 rot.setFromAxisAngle(tv, beta2 - beta); A.Ql.premultiply(rot); A.ql.copy(pq.copy(A.Qu).invert()).multiply(A.Ql); fk();
}
// two-bone IK by hinge-safe moves: elbow angle for the reach, rigid turn onto the target, rigid swivel towards the elbow hint
function reach(Wtarget, Ehint) {
 bendTo(A.S.distanceTo(Wtarget));
 rot.setFromUnitVectors(A1.subVectors(A.W, A.S).normalize(), B1.subVectors(Wtarget, A.S).normalize()); rotArm(rot);
 U.subVectors(A.W, A.S); if (U.lengthSq() < 1e-12) return; U.normalize();
 A1.subVectors(A.E, A.S); A1.addScaledVector(U, -A1.dot(U)); B1.subVectors(Ehint, A.S); B1.addScaledVector(U, -B1.dot(U));
 if (A1.lengthSq() < 1e-10 || B1.lengthSq() < 1e-10) return;
 const ang = Math.atan2(tv.crossVectors(A1, B1).dot(U), A1.dot(B1)); rot.setFromAxisAngle(U, ang); rotArm(rot);
}

// penetration of the whole arm (upper-arm distal half, forearm, core hand points) for elbow Ev, wrist Wv, hand rotation hrot
function armPen(model, rd, Ev, Wv, hrot, coreOnly, noUpper = false) {
 let sum = 0;
 for (let k = noUpper ? UPPER_U.length : coreOnly ? 1 : 0; k < UPPER_U.length; k++) { P.lerpVectors(A.S, Ev, UPPER_U[k]); sum += depthAt(model, P, rd.upper[k], true); }
 for (let k = 0; k < FORE_U.length; k++) { P.lerpVectors(Ev, Wv, FORE_U[k]); sum += depthAt(model, P, rd.lower[k], true); }
 for (let k = 0; k < rd.hand.length; k++) { const hp = rd.hand[k]; if (coreOnly && !hp.core) continue; P.copy(hp.off).multiplyScalar(A.s).applyQuaternion(hrot).add(Wv); sum += depthAt(model, P, hp.r, true); }
 return sum;
}
const SWIVEL_K = 13, SW_RANGE = 2 * Math.PI / 3, SW_COST = 0.004, SW_PREF = 1.2, SW_TAU = 0.12, SW_GATE0 = 0.004, SW_GATE1 = 0.012;   // gate: summed push 4 -> 12 mm (light touches: push only)
const Cc = new T.Vector3(), e1 = new T.Vector3(), e2 = new T.Vector3(), Es = new T.Vector3(), fd0 = new T.Vector3(), hq2 = new T.Quaternion(), swCost = new Float32Array(SWIVEL_K);
// (A) swivel (only when the forearm / hand sink in): wrist and shoulder stay, the elbow turns about the shoulder-wrist axis. Soft-min over 13 elbow angles within +-120 deg (penetration +
// a preference for small turns), gated by the current penetration: a pose that does not sink in is left exactly as it is.
function swivel(model, rd) {
 const s = A.s, p0 = armPen(model, rd, A.E, A.W, A.Qh, false, true), g = T.MathUtils.smoothstep(p0, SW_GATE0, SW_GATE1);
 if (g <= 0) return 0;   // gate: no turn without real penetration (exactly 0 below SW_GATE0, so skipping is exact)
 stats.swivels++;
 U.subVectors(A.W, A.S); const d = U.length(); if (d < 1e-6) return 0; U.divideScalar(d);
 const t = A1.subVectors(A.E, A.S).dot(U); Cc.copy(A.S).addScaledVector(U, t); e1.subVectors(A.E, Cc); const re = e1.length(); if (re < 1e-4 * s) return 0;
 e1.divideScalar(re); e2.crossVectors(U, e1); fd0.subVectors(A.W, A.E).normalize();
 let min = Infinity;
 for (let k = 0; k < SWIVEL_K; k++) {
  const ph = SW_RANGE * (2 * k / (SWIVEL_K - 1) - 1); Es.copy(Cc).addScaledVector(e1, re * Math.cos(ph)).addScaledVector(e2, re * Math.sin(ph));
  rot.setFromUnitVectors(fd0, tv.subVectors(A.W, Es).normalize()); hq2.copy(A.Qh).premultiply(rot);   // hand turns with the forearm
  swCost[k] = armPen(model, rd, Es, A.W, hq2, true) / (SW_COST * s) + SW_PREF * (1 - Math.cos(ph)); if (swCost[k] < min) min = swCost[k];
 }
 // soft-min as a weighted mean of the angles over an open range (no wrap-around), scaled by the gate: continuous in the pose
 let sw = 0, sp = 0; for (let k = 0; k < SWIVEL_K; k++) { const ph = SW_RANGE * (2 * k / (SWIVEL_K - 1) - 1), w = Math.exp(-(swCost[k] - min) / SW_TAU); sw += w; sp += w * ph; }
 const ph = (sp / sw) * g;
 if (TRACE) TRACE.push(['swivel', +p0.toFixed(4), +g.toFixed(3), +ph.toFixed(3), +re.toFixed(3), Array.from(swCost).map(x => +x.toFixed(2))]);
 Es.copy(Cc).addScaledVector(e1, re * Math.cos(ph)).addScaledVector(e2, re * Math.sin(ph));
 rot.setFromAxisAngle(U, ph); rotArm(rot);   // rigid turn about the shoulder-wrist axis: wrist stays, elbow stays a hinge
 return 1;
}

// (B) push: what still sinks in moves the joints along the torso's outward normal: upper-arm hits swing the arm about the
// shoulder, forearm hits share elbow / stiffer wrist, hand hits move the wrist; then two-bone IK (lengths kept).
function push(model, rd, weight, pin) {
 const s = A.s, a = A.S.distanceTo(A.E), bl = A.E.distanceTo(A.W);
 dE.set(0, 0, 0); dW.set(0, 0, 0); let any = 0;
 for (let k = 0; k < UPPER_U.length; k++) {
  const u = UPPER_U[k]; P.lerpVectors(A.S, A.E, u); const m = depthAt(model, P, rd.upper[k]) * s * weight; if (m <= 0) continue; any++;
  const mE = m / u; want(dE, N, mE);
  if (pin < 1) { Ax.crossVectors(A1.subVectors(A.E, A.S), N); const al = Ax.length(); if (al > 1e-9) { rot.setFromAxisAngle(Ax.divideScalar(al), mE / Math.max(a, 1e-4)); B1.subVectors(A.W, A.S).applyQuaternion(rot).add(A.S).sub(A.W); const bm = B1.length(); if (bm > 1e-9) want(dW, B1.divideScalar(bm), bm * (1 - pin)); } }
 }
 for (let k = 0; k < FORE_U.length; k++) {
  const u = FORE_U[k]; P.lerpVectors(A.E, A.W, u); const m = depthAt(model, P, rd.lower[k]) * s * weight; if (m <= 0) continue; any++;
  const iw = WRIST_EASE * (1 - pin) + (u > 0.9 ? 1 - pin : 0), q = (1 - u) * (1 - u) + u * u * iw;
  if (q > 1e-6) { want(dE, N, m * (1 - u) / q); if (iw > 0) want(dW, N, m * u * iw / q); }
 }
 for (let k = 0; k < rd.hand.length; k++) {
  const hp = rd.hand[k]; P.copy(hp.off).multiplyScalar(s).applyQuaternion(A.Qh).add(A.W); const m = depthAt(model, P, hp.r) * s * weight; if (m <= 0) continue; any++;
  want(dW, N, m);
 }
 if (!any) return 0;
 // near the face, never push the wrist towards it (the push would lift a hand in front of the face)
 const near = 1 - T.MathUtils.smoothstep(A.W.distanceTo(Hc) / s, PIN1, FACE_FREE);
 if (near > 0) { tv.subVectors(Hc, A.W).normalize(); const toward = dW.dot(tv); if (toward > 0) dW.addScaledVector(tv, -toward * near); }
 if (TRACE) TRACE.push(['push', any, dE.toArray().map(x => +x.toFixed(3)), dW.toArray().map(x => +x.toFixed(3))]);
 Wt.copy(A.W).add(dW); Eh.copy(A.E).add(dE);
 reach(Wt, Eh);
 return any;
}

// Solve one rig. humanoid: VRMHumanoid (its normalized arm nodes are edited); model: modelFor(); weight 0..1 scales the change.
export function solveArms(humanoid, model, weight = 1) {
 if (!model || !(weight > 0) || !model.tables.length) return 0;
 const t0 = performance.now();
 // fresh world matrices for just the nodes the solve reads (root + parents, torso, neck/head, shoulders, upper arms); the solve
 // then does its own arm FK
 const root = humanoid.normalizedHumanBonesRoot; root.updateWorldMatrix(true, false);
 for (let k = 0; k < CHAIN.length; k++) { const node = humanoid.getNormalizedBoneNode(CHAIN[k]); if (!node) continue; node.updateMatrix(); node.matrixWorld.multiplyMatrices(node.parent.matrixWorld, node.matrix); }
 for (let b = 0; b < TORSO.length; b++) { const node = humanoid.getNormalizedBoneNode(TORSO[b]); if (!node) return 0; inv[b].copy(node.matrixWorld).invert(); node.matrixWorld.decompose(sv, tq[b], scl); }
 A.s = scl.x || 1;
 const head = humanoid.getNormalizedBoneNode('head'); let total = 0;
 if (head) { Hc.setFromMatrixPosition(head.matrixWorld); Hc.y += 0.06 * A.s; }
 for (const side of SIDES) {
  const rd = model.radii[side], up = humanoid.getNormalizedBoneNode(side + 'UpperArm'), lo = humanoid.getNormalizedBoneNode(side + 'LowerArm'), ha = humanoid.getNormalizedBoneNode(side + 'Hand');
  if (!rd || !up || !lo || !ha || !up.parent) continue;
  A.side = side; A.S.setFromMatrixPosition(up.matrixWorld); up.parent.matrixWorld.decompose(sv, A.Qp, scl);
  A.qu.copy(up.quaternion); A.ql.copy(lo.quaternion); A.qh.copy(ha.quaternion); A.offE.copy(lo.position).multiplyScalar(A.s); A.offW.copy(ha.position).multiplyScalar(A.s); fk();
  const pin = head ? 1 - T.MathUtils.smoothstep(A.W.distanceTo(Hc) / A.s, PIN0, PIN1) : 0;   // wrist near the head: contact kept
  qh0.copy(A.Qh);
  let changed = 0; const pIn = armPen(model, rd, A.E, A.W, A.Qh, false);
  for (let it = 0; it < ITER; it++) {
   const a = swivel(model, rd), b = push(model, rd, 1, pin);
   changed += a + b; if (!b) break;
  }
  if (!changed) continue;
  total += changed;
  // safety: where the solve could not clear the body (an arm straight through the trunk, normals on both sides), never end
  // deeper than it came in: fade back to the incoming pose as the leftover penetration approaches the incoming one (continuous)
  const pOut = armPen(model, rd, A.E, A.W, A.Qh, false), keep = pIn > 1e-6 ? 1 - T.MathUtils.smoothstep(pOut / pIn, 0.5, 1) : 1;
  if (keep < 1) stats.backoff++; if (TRACE) TRACE.push(['end', side, +pIn.toFixed(4), +pOut.toFixed(4), +keep.toFixed(3)]);
  const w = weight * keep;
  // near the head the hand keeps its world orientation too (a palm on the cheek stays on the cheek)
  if (pin > 0) { hq2.copy(A.Qh).slerp(qh0, pin); A.qh.copy(pq.copy(A.Ql).invert()).multiply(hq2); }
  if (w < 1) { up.quaternion.slerp(A.qu, w); lo.quaternion.slerp(A.ql, w); ha.quaternion.slerp(A.qh, w); } else { up.quaternion.copy(A.qu); lo.quaternion.copy(A.ql); ha.quaternion.copy(A.qh); }
  // (world matrices below the upper arm refresh with the next scene update; humanoid.update reads local rotations)
 }
 const ms = performance.now() - t0; stats.calls++; stats.ms += ms; if (ms > stats.maxMs) stats.maxMs = ms; if (total) stats.pushed++;
 return total;
}

const ARM = ['leftUpperArm', 'leftLowerArm', 'leftHand', 'rightUpperArm', 'rightLowerArm', 'rightHand'];
// copy the solved arm rotations of one humanoid onto others that wear the same pose (lead variants, partner donor rigs)
export function copyArms(from, to) {
 for (let i = 0; i < ARM.length; i++) { const a = from.getNormalizedBoneNode(ARM[i]), b = to.getNormalizedBoneNode(ARM[i]); if (a && b && a !== b) b.quaternion.copy(a.quaternion); }
}

// Lead: solve on the master variant's humanoid against the outfit she wears (wardrobe.visibleParts: body skin pieces, the boy
// body for Nam, garments), then copy the arms to the other posed variants. The model is rebuilt only when the outfit changes.
let leadSig = NaN, leadModel = null;
function outfitSig(wardrobe, character) {
 let h = character === 'nam' ? 7 : 3; const o = wardrobe.outfit, st = wardrobe.styles;
 for (const k in o) { const v = o[k]; h = (h * 131 + (Number.isFinite(v) ? v + 1 : 0)) % 2147483647; const ms = st?.meshesFor?.(k, v); h = (h * 7 + (ms ? ms.length + 1 : 0)) % 2147483647; }
 return h;
}
export function leadArmCollision(wardrobe, activeVariants, character, weight = 1) {// weight: 1 - the child's arch weight (centre rotation: she may make the HYLT arch)
 if (window.__armCollisionOff) return;
 const master = wardrobe.variants[0]; if (!master) return;
 try {
  const pk = partnerKey ? partnerKey() : 0, sig = (outfitSig(wardrobe, character) * 31 + pk) % 2147483647;
  if (sig !== leadSig || !leadModel) {   // the whole body skin always counts (parts hidden under clothes are still there)
   leadSig = sig; const ms = [...wardrobe.visibleParts(wardrobe.outfit).values()].flat(), body = bodyMeshOf(master, character === 'nam');
   const list = body ? [body, ...ms.filter(m => !isSkin(m))] : ms;
   // duo: the partner wears the child's exact pose (partner.js), so one pose must clear both bodies and both outfits
   const pp = pk && partnerParts ? partnerParts() : null;
   if (pp) { const pb = bodyMeshOf(pp.donor, pp.boy); if (pb) list.push(pb); for (const m of pp.meshes) if (!isSkin(m)) list.push(m); }
   leadModel = modelFor(list, master.vrm.humanoid, 'lead:' + sig + ':' + ms.length + ':' + (pp ? pp.meshes.length : 0));
  }
  if (weight <= 0) return;
  solveArms(master.vrm.humanoid, leadModel, weight);
  for (const v of activeVariants) if (v !== master) copyArms(master.vrm.humanoid, v.vrm.humanoid);
 } catch (e) { console.warn('arm-collision lead', e); window.__armCollisionOff = true; }
}
// Duo partner (partner.js): key() -> a number that changes with the partner's outfit / visibility (0 = no partner);
// parts() -> {meshes (its visible meshes), donor (variant of its face rig), boy}. The partner copies the child's solved pose.
let partnerKey = null, partnerParts = null;
export function setPartnerArmSource(key, parts) { partnerKey = key; partnerParts = parts; leadModel = null; }

// Independent rigs (own-motion crew): solve against the rig's own visible meshes. weight: 1 - arch weight (crew.js)
export function rigArmCollision(rig, weight = 1, donor = null) {
 if (window.__armCollisionOff) return;
 try {
  if (!rig.__armModel) {
   const vis = rig.meshes.filter(m => m.visible), body = bodyMeshOf(donor, vis.some(m => m.userData?.boyBody));
   rig.__armModel = modelFor(body ? [body, ...vis.filter(m => !isSkin(m))] : vis, rig.humanoid);
  }
  solveArms(rig.humanoid, rig.__armModel, weight);
 }
 catch (e) { console.warn('arm-collision rig', e); window.__armCollisionOff = true; }
}
export function armCollisionStats() {
 return {...stats, avgMs: stats.calls ? stats.ms / stats.calls : 0, lead: leadModel ? {tables: leadModel.tables.map(t => [t.name, t.ns, +t.y0.toFixed(3), t.margin, +Math.max(...t.R).toFixed(3)]), meshes: leadModel.meshes, buildMs: +leadModel.buildMs.toFixed(1),
  radii: Object.fromEntries(Object.entries(leadModel.radii).map(([k, v]) => [k, {upper: v.upper.map(x => +x.toFixed(3)), lower: v.lower.map(x => +x.toFixed(3)), hand: v.hand.map(h => +h.r.toFixed(3))}]))} : null};
}
export function debugLead(wardrobe, rig = null) {
 const h = rig ? rig.humanoid : wardrobe.variants[0].vrm.humanoid, model = rig ? rig.__armModel : leadModel; if (!model) return null;
 h.normalizedHumanBonesRoot.updateWorldMatrix(true, true);
 for (let b = 0; b < TORSO.length; b++) { const node = h.getNormalizedBoneNode(TORSO[b]); inv[b].copy(node.matrixWorld).invert(); node.getWorldQuaternion(tq[b]); }
 const out = {};
 for (const side of SIDES) {
  const rd = model.radii[side], up = h.getNormalizedBoneNode(side + 'UpperArm'), lo = h.getNormalizedBoneNode(side + 'LowerArm'), ha = h.getNormalizedBoneNode(side + 'Hand');
  up.getWorldPosition(S); lo.getWorldPosition(E); ha.getWorldPosition(W); ha.getWorldQuaternion(hq); const rows = [];
  const one = (lab, p, r) => { let bestD = -9, who = null; for (const tb of model.tables) { L.copy(p).applyMatrix4(inv[tb.bone]); const rho = Math.hypot(L.x, L.z); const s = Math.floor((L.y - tb.y0) / SL); if (s < 0 || s >= tb.ns) continue; const a = ((Math.floor((Math.atan2(L.z, L.x) + Math.PI) / (2 * Math.PI) * NS) % NS) + NS) % NS; const d = tb.R[s * NS + a] + r - rho; if (d > bestD) { bestD = d; who = tb.name + ':' + tb.mesh; } } rows.push([lab, +(bestD * 100).toFixed(1), who]); };
  UPPER_U.forEach((u, k) => one('up' + u, P.lerpVectors(S, E, u), rd.upper[k])); FORE_U.forEach((u, k) => one('fo' + u, P.lerpVectors(E, W, u), rd.lower[k]));
  rd.hand.forEach((hp, k) => one('h' + k, P.copy(hp.off).applyQuaternion(hq).add(W), hp.r));
  out[side] = rows;
 }
 return out;
}
export function resetArmCollisionStats() { stats.calls = 0; stats.ms = 0; stats.pushed = 0; stats.maxMs = 0; stats.swivels = 0; stats.backoff = 0; }
function debugDepth(humanoid, model, p) {
 humanoid.normalizedHumanBonesRoot.updateWorldMatrix(true, true);   // parents too: turn() reads fresh parent matrices
 for (let b = 0; b < TORSO.length; b++) { const node = humanoid.getNormalizedBoneNode(TORSO[b]); inv[b].copy(node.matrixWorld).invert(); node.getWorldQuaternion(tq[b]); }
 const rows = []; for (const tb of model.tables) { L.copy(p).applyMatrix4(inv[tb.bone]); const rho = Math.hypot(L.x, L.z), s = Math.floor((L.y - tb.y0) / SL), a = ((Math.floor((Math.atan2(L.z, L.x) + Math.PI) / (2 * Math.PI) * NS) % NS) + NS) % NS; rows.push([tb.name, L.toArray().map(x => +x.toFixed(3)), s, tb.ns, s >= 0 && s < tb.ns ? +tb.R[s * NS + a].toFixed(3) : null, +rho.toFixed(3)]); }
 return {soft: depthAt(model, p, 0), rows};
}
if (typeof window !== 'undefined') window.__armCollision = {stats: armCollisionStats, reset: resetArmCollisionStats, debugLead, debugDepth};
