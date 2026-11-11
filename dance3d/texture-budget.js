// iPad memory (owner 2026-11-11). On two iPads the guest reloaded mid-song ("văng ra"), then clothes and faces vanished
// at random and came back slowly on both: the page ran out of memory and the WebGL content was dropped and re-sent.
// Two budgets:
// 1. shrinkLargeTextures: the four donor models decode 29 images of 2048 px (body skin and normal maps, VRoid outfit
//    atlases), 16 MB each on the CPU and about 21 MB each on the GPU, 464 MB in all. On the iPad stage a 1024 px copy
//    looks the same, so every image larger than `max` is resized once, after loading and before anything is drawn.
// 2. sweepGpu: three.js keeps every texture and vertex buffer it ever drew on the GPU, so trying outfits on piles them
//    up. Away from a song, the GPU copies of everything no visible mesh uses are released (the CPU copies stay, and
//    three.js uploads them again the next time they are drawn).
const texturesOf = m => {
  const out = [];
  for (const k in m) { const v = m[k]; if (v && v.isTexture) out.push(v); }
  if (m.uniforms) for (const u of Object.values(m.uniforms)) { const v = u?.value; if (v && v.isTexture) out.push(v); }
  return out;
};
const materialsOf = o => [].concat(o.material || []).filter(Boolean);

// Same options as three's ImageBitmapLoader (straight alpha, no colour conversion), so a copy behaves like the original.
const BITMAP = {premultiplyAlpha: 'none', colorSpaceConversion: 'none'};
async function resized(image, w, h) {
  if (typeof createImageBitmap === 'function') {
    try {
      const b = await createImageBitmap(image, {...BITMAP, resizeWidth: w, resizeHeight: h, resizeQuality: 'high'});
      if (b.width === w && b.height === h) return b;
      b.close?.();
    } catch (e) { /* a browser without resize options: draw it smaller instead */ }
  }
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'; x.drawImage(image, 0, 0, w, h);
  if (typeof createImageBitmap === 'function') {
    try { const b = await createImageBitmap(c, BITMAP); c.width = c.height = 0; return b; } catch (e) { /* keep the canvas */ }
  }
  return c;
}

export async function shrinkLargeTextures(roots, max = 1024) {
  const bySource = new Map();   // textures that share one image share its THREE.Source: resize each image once
  for (const root of roots) root.traverse(o => {
    if (!o.isMesh) return;
    for (const m of materialsOf(o)) for (const t of texturesOf(m)) {
      const source = t.source, im = source?.data;
      if (!im || !(Math.max(im.width || 0, im.height || 0) > max)) continue;
      let list = bySource.get(source); if (!list) bySource.set(source, list = new Set()); list.add(t);
    }
  });
  let before = 0, after = 0;
  for (const [source, list] of bySource) {
    const im = source.data, k = max / Math.max(im.width, im.height);
    const w = Math.max(1, Math.round(im.width * k)), h = Math.max(1, Math.round(im.height * k));
    const small = await resized(im, w, h);
    before += im.width * im.height * 4; after += w * h * 4;
    source.data = small;
    for (const t of list) t.needsUpdate = true;
    im.close?.();
  }
  return {images: bySource.size, savedMB: Math.round((before - after) / 1048576)};
}

// Everything ever seen in the scene, weakly: a face identity or a crew rig that left the scene keeps its GPU copies until
// it is drawn again, so the sweep remembers what it met (WeakRef, so nothing is kept alive by the sweep itself).
const seen = new Set(), known = new WeakSet();
const remember = x => { if (!known.has(x)) { known.add(x); seen.add(new WeakRef(x)); } };
export function sweepGpu(scene, extra = []) {   // extra: geometries/textures that live outside the scene (cached face identities)
  for (const x of extra) if (x && (x.isTexture || x.isBufferGeometry)) remember(x);
  const keep = new Set();
  scene.traverseVisible(o => {
    if (!o.geometry) return;
    keep.add(o.geometry);
    for (const m of materialsOf(o)) for (const t of texturesOf(m)) keep.add(t);
  });
  scene.traverse(o => {
    if (!o.geometry) return;
    remember(o.geometry);
    for (const m of materialsOf(o)) for (const t of texturesOf(m)) remember(t);
  });
  let textures = 0, geometries = 0;
  // A texture that shares its image with a kept one keeps the shared GPU copy (three counts the users of a source).
  for (const ref of seen) {
    const x = ref.deref();
    if (!x) { seen.delete(ref); continue; }
    if (keep.has(x)) continue;
    x.dispose();
    if (x.isTexture) textures++; else geometries++;
  }
  return {textures, geometries};
}
