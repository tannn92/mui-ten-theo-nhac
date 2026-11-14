import * as T from 'three';
import {createPerformanceLibrary} from './performance-library.js?v=1411.1139';
import {createSongBackgrounds} from './song-backgrounds.js?v=1411.1139';
import {loadWardrobe} from './wardrobe.js?v=1411.1139';
import {createChoreography} from './choreography.js?v=1411.1139';
import {createPoseBank} from './pose-bank.js?v=1411.1139';
import {applyFaceExpression} from './face-expressions.js?v=1411.1139';
import {createCrew} from './crew.js?v=1411.1139';
import {newspaperProps} from './newspaper-prop.js?v=1411.1139';
import {applyHeadScale} from './head-scale.js?v=1411.1139';
import {createDancerProfiles,resolveDancerProfile} from './dancer-profiles.js?v=1411.1139';
import {createCapturedMotion,CAPTURE_ASSET,FULL_CAPTURE_ASSET} from './captured-motion.js?v=1411.1139';
import {readWardrobe,saveWardrobe,mountWardrobe} from './wardrobe-ui.js?v=1411.1139';
import {createPartner} from './partner.js?v=1411.1139';
import {shrinkLargeTextures,sweepGpu} from './texture-budget.js?v=1411.1139';
import {characterView,normCharacter} from './characters.js?v=1411.1139';
export async function createRuntime(canvas,bundle,opts={}){
 const [raw,data]=await Promise.all([bundle.json('wardrobe/config.json'),bundle.json('wardrobe/motion-bank.json')]);
 const beautyDemo=new URLSearchParams(location.search).get('dance')==='beauty';
 let captureAsset=beautyDemo?'wardrobe/beauty-demo.json':raw.captureAsset||(bundle.files[FULL_CAPTURE_ASSET]?FULL_CAPTURE_ASSET:CAPTURE_ASSET);
 if(beautyDemo&&!bundle.files[captureAsset])throw Error('Thiếu chuyển động demo nhảy đẹp');
 if(raw.captureAsset&&!bundle.files[captureAsset])throw Error('Thiếu chuyển động được chọn: '+captureAsset);
 const capturedData=bundle.files[captureAsset]?await bundle.json(captureAsset):null;
 const defaultCaptureAsset=captureAsset,defaultCaptured=capturedData?createCapturedMotion(capturedData):null;let captured=defaultCaptured,songRequest=0;const performances=createPerformanceLibrary(bundle,raw.performances||{});
 const config=structuredClone(raw);config.variants.forEach(v=>{const key=v.file;v.file=bundle.files[key];if(!v.file)throw Error('Thiếu dữ liệu nhân vật '+(v.id||key));});
 // Sharper dancers (owner 2026-11-11 "nhân vật của họ cũng sắc nét hơn ta", reports/audition-study): draw at the screen's full
 // density (2× on the iPad) instead of 1.5× scaled up. Without MSAA this needs less GPU memory than 1.5× with 4× MSAA did
 // (≈46 vs ≈87 MB) and at 2× the remaining stair-steps are too small to see. A device that cannot keep up drops back to 1.5×
 // (paceCheck, called from draw). Screens below 2× (desktop, the review/promo captures) keep MSAA as before.
 const renderer=new T.WebGLRenderer({canvas,antialias:(devicePixelRatio||1)<2,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.background=new T.Color('#f4e4ed');const backdrop=createSongBackgrounds(scene);const camera=new T.OrthographicCamera(-1.6,1.6,1.12,-1.12,.01,20);camera.position.set(0,.75,5);camera.lookAt(0,.75,0);
 scene.add(new T.HemisphereLight(0xffffff,0x997c94,1.35));const light=new T.DirectionalLight(0xfff5ef,1.1);light.position.set(-2,4,5);scene.add(light);
 // Look previews (owner 2026-11-11 "Ok vụ improvement", reports/look-options/HANDOFF.md): OFF unless ?look=… or
 // localStorage 'spike-look' names them (read once). Defaults since 2026-11-11 (owner "làm như bạn đề xuất đi"): shade, lead-dim,
 // lead-pool, lanes, burst — the same list as LOOK_DEFAULT in index.html; ?look=none restores the old look.
 const LOOK=(()=>{let s=null;try{const q=new URLSearchParams(location.search);s=q.has('look')?q.get('look'):localStorage.getItem('spike-look');}catch(e){}const words=String(s||'').toLowerCase().split(/[\s,]+/).filter(Boolean),w=new Set(words.includes('none')?[]:['shade','lead-dim','lead-pool','lanes','burst']);for(const x of words){if(x==='none')continue;if(x[0]==='-')w.delete(x.slice(1));else w.add(x);}if(w.has('all'))['shade','lead','lanes','burst','chev','beat'].forEach(x=>w.add(x));if(w.has('lead'))['lead-dim','lead-rim','lead-pool'].forEach(x=>w.add(x));return w;})();
 const lookShade=LOOK.has('shade')?'all':LOOK.has('shade-clothes')?'clothes':null;
 // shade (#4): less flat light, so bodies and clothes get their shadow side back
 if(lookShade){for(const o of scene.children)if(o.isHemisphereLight)o.intensity=.95;light.intensity=1.7;}
 const disc=new T.Mesh(new T.CylinderGeometry(.9,.95,.04,48),new T.MeshStandardMaterial({color:0xe0c3d5,roughness:1}));disc.position.y=-.03;scene.add(disc);
 const ring=new T.Mesh(new T.TorusGeometry(.92,.006,6,64),new T.MeshBasicMaterial({color:0xfffbfe}));ring.rotation.x=Math.PI/2;ring.position.y=-.005;scene.add(ring);
 const wardrobe=await loadWardrobe(scene,config),motion=createChoreography(data);
 // iPad memory (owner 2026-11-11, two iPads ran out of memory): halve the donors' 2048 px images before the first draw.
 try{await shrinkLargeTextures(wardrobe.variants.map(v=>v.vrm.scene));}catch(e){console.warn('shrink textures',e);}
 // Clear outlines (owner 2026-11-11, reports/audition-study): VRoid's 0.75 mm MToon outline is about half a pixel on the iPad;
 // 3 mm draws a visible line round body, clothes and hair. Only materials that already have an outline (the pass exists),
 // set before crew, partner and lazy hair styles clone them.
 for(const v of wardrobe.variants)v.vrm.scene.traverse(o=>{for(const m of [].concat(o.material||[]))if(m?.isMToonMaterial&&m.outlineWidthMode==='worldCoordinates'&&m.outlineWidthFactor>0&&m.outlineWidthFactor<.003)m.outlineWidthFactor=.003;});
 // Smaller head (owner 2026-11-10 "tỉ lệ cái đầu đang hơi to"; Codex chose 0.85): uniform raw-head scale on every donor, once,
 // AFTER the lazy styles captured the unscaled rest pose (their build steps restore it) and BEFORE any crew rig is cloned
 // (clones inherit the scale, the canonical baseline and the scaled head colliders/hair hit radii).
 {const hs=Number.isFinite(raw.headScale)?raw.headScale:1;if(hs!==1)for(const v of wardrobe.variants)applyHeadScale(v.vrm,hs);}
 // HUNTR/X faces (owner 2026-11-10 "mặt gốc vẫn giữ, mà với set huntrix thì thay cả mặt"): wearing a full Rumi/Mira/Zoey set
 // (top+bottom+shoes of a huntrix-/golden-/wisl- set) gives the child that character's face and head shape; anything else keeps the
 // original face (Codex dancer-profiles.js; absolute head scales, original .85). Built on demand, outside the draw loop.
 // Player character (owner 2026-11-14): opts.character ('nu' | 'nam', or a promise of it while the choice screen is up) is
 // awaited only here, after the donors loaded behind the choice. Nam: his face profile, his shop, his own remembered outfit.
 const who=characterView(config,wardrobe.options,normCharacter(await opts.character));
 if(who.initial)for(const [s,i] of Object.entries(who.initial)){try{wardrobe.equip(s,i);}catch(e){console.warn('nam outfit',e);}}
 const faceOf=()=>who.profile||resolveDancerProfile({selection:wardrobe.outfit,options:wardrobe.options,sets:config.sets});
 let leadFace=null;try{leadFace=createDancerProfiles({faceMeshes:wardrobe.variants[0].parts.face,rigs:wardrobe.variants.map(v=>v.vrm),initial:faceOf()});if(!leadFace.supported){console.warn('lead face',leadFace.reason);leadFace=null;}}catch(e){console.warn('lead face',e);leadFace=null;}
 let faceQueued=false;const queueFace=()=>{if(!leadFace||faceQueued)return;faceQueued=true;queueMicrotask(()=>{faceQueued=false;try{const id=faceOf();if(id!==leadFace.selected)leadFace.apply(id);}catch(e){console.warn('lead face',e);}});};let leadHeight=1,songMoves=null,lastTime=null,lastMode=null,idleStart=performance.now(),refresh=()=>{},lastSnapshot={},width=0,height=0;
 const v=new T.Vector3();
 for(const variant of wardrobe.variants)variant.vrm.scene.position.y=variant.restOffset||0;
 const crew=createCrew(scene,wardrobe);const news=newspaperProps(scene);// hand-held newspapers (Secret opening)
 // Two-iPad play: the other player's dancer (partner.js) stands at the other front-row spot; the child moves to her side
 // (host left, guest right, on both iPads). duo = null in one-player play.
 const partner=createPartner(scene,wardrobe,config),SLOT_X=.33;let duo=null,leadX=0;
 const poseBank=createPoseBank(data,wardrobe.variants);
 const look=(()=>{if(!LOOK.size)return{frame(){},beat(){},on:[]};
  const SKIN=/skin|face|eye|mouth|brow|lash|teeth|tooth|cheek/i,shaded=new WeakSet(),rimOrig=new WeakMap(),dimOf=new WeakMap(),dims=new WeakSet(),RIM=new T.Color(0xff9fcb);
  const dimOn=LOOK.has('lead-dim'),rimOn=LOOK.has('lead-rim'),pool=LOOK.has('lead-pool'),beatOn=LOOK.has('beat');let n=0,beat=null;
  // shade: MToon materials tuned "always lit" (shadingShift ≥ 0.99) get a toon shadow side; near-white shade colours 18% darker
  const shade=m=>{if(!lookShade||shaded.has(m)||!m.isMToonMaterial)return;shaded.add(m);if(lookShade==='clothes'&&SKIN.test(m.name||''))return;
   if(m.shadingShiftFactor>=.99){m.shadingShiftFactor=0;m.shadingToonyFactor=.9;}const c=m.shadeColorFactor;if(c&&c.r+c.g+c.b>2.6)c.multiplyScalar(.82);};
  // lead (#3): the child gets a soft pink rim; the backups get their own darker, greyer copies of the shared materials
  // (materials only: the copies use the same textures)
  const rim=m=>{if(!rimOn||!m.isMToonMaterial||rimOrig.has(m)||dims.has(m))return;rimOrig.set(m,rimPlain&&rimSig(m)?rimPlain:[m.parametricRimColorFactor.clone(),m.parametricRimFresnelPowerFactor,m.parametricRimLiftFactor,m.rimLightingMixFactor]);
   rimPlain=rimPlain||rimOrig.get(m);m.parametricRimColorFactor.copy(RIM).multiplyScalar(.55);m.parametricRimFresnelPowerFactor=3;m.parametricRimLiftFactor=.05;m.rimLightingMixFactor=.6;};
  let rimPlain=null;const rimSig=m=>m.parametricRimFresnelPowerFactor===3&&m.parametricRimLiftFactor===.05&&Math.abs(m.parametricRimColorFactor.r-.55)<.01;
  const grey=new T.Color(),dimColor=c=>{if(!c?.isColor)return;const l=c.r*.3+c.g*.59+c.b*.11;c.lerp(grey.setRGB(l,l,l),.2).multiplyScalar(.85);};
  const dim=m=>{if(dims.has(m))return m;let d=dimOf.get(m);if(d)return d;d=m.clone();dims.add(d);if(shaded.has(m))shaded.add(d);
   // a material copied from a rimmed one (crew-only styles are built from the child's) gets the plain rim back too
   const r=rimOrig.get(m)||(rimOn&&d.isMToonMaterial&&rimSig(d)?rimPlain:null);if(r&&d.isMToonMaterial){d.parametricRimColorFactor.copy(r[0]);d.parametricRimFresnelPowerFactor=r[1];d.parametricRimLiftFactor=r[2];d.rimLightingMixFactor=r[3];}
   if(dimOn){dimColor(d.color);if(d.isMToonMaterial)dimColor(d.shadeColorFactor);}d.update?.(0);dimOf.set(m,d);return d;};
  const sweep=()=>{if(lookShade)scene.traverse(o=>{for(const m of [].concat(o.material||[]))if(m)shade(m);});
   if(rimOn)for(const v of wardrobe.variants)v.vrm.scene.traverse(o=>{for(const m of [].concat(o.material||[]))if(m)rim(m);});
   if(dimOn||rimOn)crew.group.traverse(o=>{if(!o.isMesh||!o.material)return;o.material=Array.isArray(o.material)?o.material.map(dim):dim(o.material);});};
  // light pool under her feet (lead-pool), pulsing on the beat (beat, #9): a soft glow behind her feet (the camera looks level)
  let glow=null;if(pool||beatOn){const c=document.createElement('canvas');c.width=128;c.height=64;const g=c.getContext('2d'),gr=g.createRadialGradient(64,32,0,64,32,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.45,'rgba(255,214,236,.75)');gr.addColorStop(1,'rgba(255,170,215,0)');g.fillStyle=gr;g.fillRect(0,0,128,64);
   const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;glow=new T.Mesh(new T.PlaneGeometry(1.15,.34),new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:0}));glow.position.set(0,.02,-.3);glow.renderOrder=-2;glow.visible=false;scene.add(glow);}
  return{on:[...LOOK],beat(p){beat=Number.isFinite(p)?p:null;},
   frame(playing,x){if(n++%30===0)sweep();if(!glow)return;glow.visible=playing;if(!playing)return;const k=beatOn&&beat!=null?Math.pow(1-beat,2):0;
    glow.position.x=x;glow.material.opacity=Math.min(1,(pool?.6:0)+.4*k);glow.scale.setScalar(1+.08*k);}};})();
 let capturedIndex=new Map(captured?.boneNames.map((n,i)=>[n,i])||[]);
 let captureReferenceOffset=wardrobe.variants.find(v=>v.spec.id===captured?.referenceVariant)?.restOffset||0;
 // Bake only the two transition windows. Unwrapping the relative rotation
 // fixes the 180-degree branch change of per-frame shortest-path crossfades.
 let capturedFades=[];
 const fadeQ=new T.Quaternion(),fadeR=new T.Quaternion();
 function bakeCapturedFades(){
  capturedFades=[];if(!captured?.matched)return;
  const master=wardrobe.variants[0],savedYaw=master.vrm.scene.rotation.y;
  const windows=[{start:captured.t0,duration:captured.entryFade},{start:captured.t0+captured.duration-captured.exitFade,duration:captured.exitFade}];
  for(const {start,duration} of windows){const rows=[],previousRelative=[],previousAxes=[],count=Math.round(duration*120);
   if(duration<=0)continue;
   for(let frame=0;frame<=count;frame++){
    const t=start+frame*duration/count,stock=motion.sample(t),capture=captured.sample(t),weight=capture.weight;
    master.vrm.scene.rotation.y=(stock.yaw||0)*(1-weight);poseBank.apply(master,stock);
    const q=[];for(const e of master.entries){
     const authored=e.bone.quaternion.clone(),index=capturedIndex.get(e.name),target=index==null?new T.Quaternion():new T.Quaternion().fromArray(capture.q,index*4);
     const relative=authored.clone().invert().multiply(target).normalize(),prev=previousRelative[e.index];
     if(prev?prev.dot(relative)<0:relative.w<0)relative.set(-relative.x,-relative.y,-relative.z,-relative.w);
     previousRelative[e.index]=relative.clone();
     const length=Math.hypot(relative.x,relative.y,relative.z),axis=length>1e-9?new T.Vector3(relative.x,relative.y,relative.z).multiplyScalar(1/length):(previousAxes[e.index]||new T.Vector3(1,0,0));
     previousAxes[e.index]=axis;const halfAngle=Math.atan2(length,relative.w),sin=Math.sin(halfAngle*weight);
     const powered=new T.Quaternion(axis.x*sin,axis.y*sin,axis.z*sin,Math.cos(halfAngle*weight));
     authored.multiply(powered).normalize().toArray(q,e.index*4);
    }
    rows.push({q,bob:(master.vrm.humanoid.getNormalizedBoneNode('hips').position.y-master.baseHips.y)*(1-weight)});
   }
   capturedFades.push({start,end:start+duration,rows,fps:count/duration});
  }
  master.vrm.scene.rotation.y=savedYaw;master.vrm.scene.updateMatrixWorld(true);
 }
 function fadePoseAt(t){const fade=capturedFades.find(f=>t>=f.start&&t<=f.end);if(!fade)return null;const f=T.MathUtils.clamp((t-fade.start)*fade.fps,0,fade.rows.length-1),i=Math.floor(f),a=fade.rows[i],b=fade.rows[Math.min(i+1,fade.rows.length-1)],u=f-i,q=[];for(const e of wardrobe.variants[0].entries){fadeQ.fromArray(a.q,e.index*4).slerp(fadeR.fromArray(b.q,e.index*4),u).toArray(q,e.index*4);}return{q,bob:T.MathUtils.lerp(a.bob,b.bob,u)};}
 const physicalSlots=['hair','top','bottom','shoes'],presets=config.variants.map((v,i)=>({id:v.id,name:v.name||v.label||(i===0?'Bạc hà':i===1?'Nơ hồng':`Bộ ${i+1}`)}));
 function equip(slot,index){wardrobe.equip(slot,index);if(who.save)who.save(wardrobe.outfit);else saveWardrobe(wardrobe.outfit);refresh();queueFace();}
 // Wardrobe taps: a garment that was never worn is sewn on first use (up to ~2 s of CPU). Show "Đang may đồ…" first and
 // let it paint, then build. The API equip above stays synchronous for tools and tests.
 let sewingEl=null,sewingCount=0;
 function sewing(on){sewingCount=Math.max(0,sewingCount+(on?1:-1));if(!sewingEl){sewingEl=document.createElement('div');sewingEl.textContent='🧵 Đang may đồ…';sewingEl.setAttribute('role','status');sewingEl.style.cssText='position:fixed;left:50%;top:18px;transform:translateX(-50%);z-index:60;padding:10px 18px;border-radius:999px;background:#fff;color:#c9275f;font:700 18px ui-rounded,system-ui,sans-serif;box-shadow:0 4px 16px rgba(80,20,60,.25);pointer-events:none;transition:opacity .2s';document.body.appendChild(sewingEl);}sewingEl.style.opacity=sewingCount?'1':'0';}
 // Wardrobe taps arrive slot by slot (a preset set = several calls in one tick): batch them, sew the cold pieces with
 // interactive priority, then put the whole batch on at once. Latest selection per slot wins.
 let uiBatch=null,uiBatchNo=0;const uiSlotNo={};
 function equipFromUI(slot,index){if(!uiBatch){uiBatch={};queueMicrotask(flushUIBatch);}uiBatch[slot]=index;}
 function flushUIBatch(){const sel=uiBatch;uiBatch=null;const no=++uiBatchNo;for(const s in sel)uiSlotNo[s]=no;
  const put=()=>{for(const [s,i] of Object.entries(sel))if(uiSlotNo[s]===no)equip(s,i);};
  const cold=Object.entries(sel).some(([s,i])=>wardrobe.isStyleReady?!wardrobe.isStyleReady(s,i):!!(wardrobe.options?.[s]?.[i]?.style&&!wardrobe.styles?.meshesFor?.(s,i)));
  if(!cold)return put();
  sewing(true);const job=wardrobe.prepareOutfit?wardrobe.prepareOutfit(sel,{priority:100}):new Promise(r=>requestAnimationFrame(()=>setTimeout(r,30)));
  Promise.resolve(job).then(put).catch(e=>console.warn('sew',e)).finally(()=>sewing(false));}
 function resize(){const w=canvas.clientWidth||innerWidth,h=canvas.clientHeight||innerHeight;if(w===width&&h===height)return;width=w;height=h;renderer.setSize(w,h,false);backdrop.resize(w,h);const aspect=w/h,half=1.12;camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();}
  function crewSelection(s){const out={hair:s.hair??1};for(const k of ['hair','top','bottom','shoes','accessory']){if((k==='hair'||k==='accessory')&&!s.selectionIds?.[k])continue;const i=wardrobe.options[k]?.findIndex(o=>o.id===s.selectionIds?.[k]);if(!(i>=0))return null;out[k]=i;}return out;}
 function themedCrew(entry,chart){const slug=chart?.slug||Object.keys(raw.performances||{}).find(k=>raw.performances[k]===entry);
  // Trio songs (Huntrix): crewOutfits[slug] = {mode:'complement', sets:[...]} -> the backups wear the sets the child is NOT
  // wearing (left backup first). If she wears none of them, the first set (the group's leader) is left out.
  {const spec=config.crewOutfits?.[slug];if(spec&&!Array.isArray(spec)&&spec.mode==='complement'&&entry?.crew?.length){const sets=(spec.sets||[]).map(id=>(config.sets||[]).find(x=>x.id===id)).filter(Boolean),cur=wardrobe.outfit||{},mine=characterOf(cur),wearing=sets.find(x=>characterOfSet(x)===mine),
    // two players: the backups are the characters NEITHER player is; a backup left without a character steps out (a true
    // trio). By CHARACTER, whatever the theme of the set (owner 2026-11-11: Golden Zoey + HUNTR/X Rumi in Takedown showed
    // Mira and a second Zoey): one character or the same one twice -> 2 backups, two different ones -> 1.
    worn=duo?[mine,characterOf(partner.selection)].filter(Boolean):[],rest=worn.length?sets.filter(x=>!worn.includes(characterOfSet(x))):sets.filter(x=>x!==(wearing||sets[0]));// Character heights (owner 2026-11-10 "chiều cao các nhân vật chưa cân xứng": Mira ~170 cm, Rumi ~165, Zoey ~153):
   // spec.heights = {rumi:1, mira:1.036, zoey:.93} by name in the set id; the child takes the height of the set she wears.
   const hOf=x=>{for(const [k,v] of Object.entries(spec.heights||{}))if(x?.id?.includes(k))return v;return 1;};
   if(rest.length){const list=duo?entry.crew.slice(0,rest.length):entry.crew;return {...entry,...(duo?{crewCount:list.length}:{}),leadHeight:wearing?hOf(wearing):1,crew:list.map((c,i)=>{const set=rest[i%rest.length],k=hOf(set);return {...c,variant:1,outfit:{...set.selection},face:(/^(?:huntrix|golden|wisl)-(rumi|mira|zoey)/.exec(set.id)||[])[1]||'original',scale:(c.scale??1)*k,moves:c.moves?.map(m=>m.scale!=null?{...m,scale:m.scale*k}:m)};})};}}}const pool=(Array.isArray(config.crewOutfits?.[slug])?config.crewOutfits[slug]:[]).map(s=>({s,sel:crewSelection(s)})).filter(x=>x.sel);if(!entry?.crew?.length||!pool.length)return entry;
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  // Boy slots get boy looks and girl slots girl looks (role, default girl); a role without looks borrows from the whole pool.
  const byRole=new Map(),used=new Map();for(const x of pool){const r=x.s.role||'girl';if(!byRole.has(r))byRole.set(r,[]);byRole.get(r).push(x);}
  // A look with `max` (e.g. the one red-haired dancer) is given to at most that many dancers. A crew slot with `look` (Secret:
  // each singer has his own slot and staging) always wears that pool entry.
  const count=new Map();
  return {...entry,crew:entry.crew.map(c=>{const list=byRole.get(c.role||'girl')||pool;let n=used.get(list)||0,x=c.look?pool.find(y=>y.s.id===c.look)||null:null;const pinned=!!x;if(!pinned)for(let k=0;k<list.length;k++){const cand=list[(n+k)%list.length];if((count.get(cand)||0)<(cand.s.max??Infinity)){x=cand;n+=k;break;}}if(!x)x=list.filter(y=>y.s.max==null)[0]||list[n%list.length];if(!pinned)used.set(list,n+1);count.set(x,(count.get(x)||0)+1);const hk=x.s.height||1;return {...c,variant:x.s.variant??1,outfit:x.sel,...(x.s.face?{face:x.s.face}:{}),...(x.s.expr?{expr:x.s.expr}:{}),...(hk!==1?{scale:(c.scale??1)*hk,moves:c.moves?.map(m=>m.scale!=null?{...m,scale:m.scale*hk}:m)}:{})};})};}
 // Two-iPad play: no backup may stand where the partner dances. Any spot in the front row (z > -0.3, |x| < 0.75) moves out
 // to x = ±0.95 on its own side (Secret: the singer who comes up beside the child stands beside the pair instead).
 // Two players (owner 2026-11-11: "2 bé che luôn hoàn toàn 2 phụ hoạ đứng sau, mà đoạn giữa 2 bé thì trống trơn"). The solo
 // formations surround ONE child at x 0; in duo the children stand at ±0.33, right where the backups beside her stood.
 // - a spot in front of the children (z > 0.3, e.g. Hạt Mưa's two front dancers) moves out to x ±0.95 on its own side;
 // - a spot on the children's line (a Secret singer coming up beside her) stays beside the child on its side, just
 //   outside the pair (two singers on one side keep their order); in the middle two singers crowded the children's arms;
 // - a spot behind the children's band (|x| < 0.52) closes in to the gap between them (x * 0.36).
 const duoSpot=p=>{if(!Array.isArray(p)||p.length!==3)return p;const [x,y,z]=p,ax=Math.abs(x),s=x<0?-1:1;
  if(z>.3)return ax<.75?[.95*s,y,z]:p;
  if(z>-.3)return ax<.75?[s*(.66+Math.max(0,ax-.45)*1.2),y,z]:p;
  return ax<.52?[x*.36,y,z]:p;};
 const frontRowOut=c=>({...c,...(c.anchor?{anchor:duoSpot(c.anchor)}:{}),...(c.moves?{moves:c.moves.map(m=>m.to?{...m,to:duoSpot(m.to)}:m)}:{})});
 // The gap between the children holds one dancer a side: when two backups of the same side close in to it (their home
 // spots within 0.1 of each other), the one further back steps out (off stage on its side) instead of hiding behind the
 // other (Dolce, Tái Sinh, Girl Xinh: the M2 pair behind B1). Tracks stay matched to their dancers (no one is removed).
 const offStage=c=>{const out=p=>Array.isArray(p)&&p.length===3?[p[0]<0?-2.3:2.3,p[1],p[2]]:p;return {...c,duoOut:true,...(c.anchor?{anchor:out(c.anchor)}:{}),...(c.moves?{moves:c.moves.map(m=>m.to?{...m,to:out(m.to)}:m)}:{})};};
 // A dancer's home spot: the median of its on-stage spots (many walk on from off stage, so the anchor alone can be ±2.3).
 function homeSpot(c){const pts=[c.anchor,...(c.moves||[]).map(m=>m.to)].filter(p=>Array.isArray(p)&&p.length===3&&Math.abs(p[0])<1.15);if(!pts.length)return null;
  const med=k=>{const v=pts.map(p=>p[k]).sort((a,b)=>a-b),n=v.length;return n%2?v[(n-1)/2]:(v[n/2-1]+v[n/2])/2;};return [med(0),med(1),med(2)];}
 function duoCrew(list){const moved=list.map(frontRowOut);
  const mid=list.map((c,i)=>{const o=homeSpot(c);return {i,orig:o,a:o&&duoSpot(o)};}).filter(x=>x.orig&&x.orig[2]<=-.3&&Math.abs(x.orig[0])<.52&&Math.abs(x.a[0])<.2);
  const out=new Set();for(const side of [-1,1]){const row=mid.filter(x=>(x.orig[0]<0?-1:1)===side).sort((p,q)=>q.a[2]-p.a[2]);const kept=[];for(const x of row){if(kept.some(k=>Math.abs(k.a[0]-x.a[0])<.1))out.add(x.i);else kept.push(x);}}
  return moved.map((c,i)=>out.has(i)?offStage(list[i]):c);}
 // HUNTR/X trio with two different characters: the one backup left is the third of the trio, in the middle behind them
 const centred=c=>{const mid=p=>Array.isArray(p)&&p.length===3?[0,p[1],p[2]]:p;return {...c,...(c.anchor?{anchor:mid(c.anchor)}:{}),...(c.moves?{moves:c.moves.map(m=>m.to?{...m,to:mid(m.to)}:m)}:{})};};
 // HUNTR/X character heights for a selection (the set it wears in that song), as for the child (leadHeight)
 // HUNTR/X character of an outfit (slot -> option index): the top and bottom of any Rumi/Mira/Zoey set, whatever its theme
 // (huntrix-, golden-, wisl-). Used for the trio backups and the heights; the face uses resolveDancerProfile (same sets).
 function characterOfSet(x){return (/^(?:huntrix|golden|wisl)-(rumi|mira|zoey)$/.exec(x?.id||'')||[])[1]||null;}
 function characterOf(sel){if(!sel)return null;for(const x of config.sets||[]){const c=characterOfSet(x);if(c&&['top','bottom'].every(k=>x.selection?.[k]===sel[k]))return c;}return null;}
 function setHeight(slug,sel){const spec=config.crewOutfits?.[slug];if(!sel||!spec||Array.isArray(spec)||spec.mode!=='complement')return 1;const c=characterOf(sel);return c&&Number.isFinite(spec.heights?.[c])?spec.heights[c]:1;}
 let bgPlaying=null,lastSweep=0,paceLast=0,paceSum=0,paceN=0;
 // paceCheck: a device that cannot draw the full density fast enough (frames over 22 ms on average for ~4 s of play) goes
 // back to 1.5× for the rest of the session. Gaps over 100 ms (tab hidden, pauses) are not counted.
 function paceCheck(playing,now){if(!playing||renderer.getPixelRatio()<=1.5){paceLast=0;return;}if(paceLast&&now-paceLast<100){paceSum+=now-paceLast;paceN++;}paceLast=now;
  if(paceN>=240){if(paceSum/paceN>22){renderer.setPixelRatio(1.5);console.info('render density 1.5 (frames '+(paceSum/paceN).toFixed(1)+' ms)');}paceSum=0;paceN=0;}}
 function draw(t){const started=performance.now();resize();const playing=t!=null&&Number.isFinite(t);paceCheck(playing,started);{const lh=playing?leadHeight:1;for(const v of wardrobe.variants)if(v.vrm.scene.scale.x!==lh)v.vrm.scene.scale.setScalar(lh);}if(playing!==bgPlaying){bgPlaying=playing;try{wardrobe.setBackgroundPaused?.(playing);}catch(e){}}const clock=playing?t:(performance.now()-idleStart)/1000;const delta=lastTime==null?0:clock-lastTime,seek=lastMode!==playing||delta<0||delta>.15,dt=seek?0:Math.min(.05,Math.max(0,delta));lastTime=clock;lastMode=playing;const menu=document.querySelector('#menu'),menuOpen=menu&&!menu.hidden&&!menu.classList.contains('hide')&&menu.style.display!=='none',crewVisible=playing&&!menuOpen,needed=new Set([0]);if(crewVisible)for(const i of crew.sharedVariants())needed.add(i);for(const slot of physicalSlots){const i=wardrobe.variantFor?wardrobe.variantFor(slot,wardrobe.outfit[slot]):wardrobe.outfit[slot];if(Number.isInteger(i))needed.add(i);}const activeVariants=wardrobe.variants.filter((_,i)=>needed.has(i));const sample=motion.sample(playing?clock:clock*.5),capture=playing?captured?.sample(captured.t0===0&&clock<0?0:clock):null,captureWeight=capture?.weight||0,fadePose=captureWeight>0&&captureWeight<1?fadePoseAt(clock):null,sourceRoot=poseBank.root(sample),authoredRootX=.3*Math.tanh(((sample.rootX||0)+sourceRoot[0]*.5)/.3),authoredRootZ=T.MathUtils.clamp((sample.rootZ||0)+sourceRoot[2]*.5,-.13,.13),rootX=T.MathUtils.lerp(authoredRootX,capture?.root[0]||0,captureWeight),rootZ=T.MathUtils.lerp(authoredRootZ,capture?.root[2]||0,captureWeight),rootYaw=(sample.yaw||0)*(1-captureWeight);
 for(const variant of wardrobe.variants){variant.vrm.scene.position.x=rootX+leadX;variant.vrm.scene.position.z=rootZ;variant.vrm.scene.rotation.y=rootYaw;}
 for(const variant of activeVariants){
  // Captured poses are source-time stabilized; stock power and anatomy guards
  // must not overwrite the actual choreography inside the captured interval.
  if(fadePose){variant.vrm.humanoid.getNormalizedBoneNode('hips').position.copy(variant.baseHips);variant.vrm.humanoid.getNormalizedBoneNode('hips').position.y+=fadePose.bob;for(const e of variant.entries)e.bone.quaternion.fromArray(fadePose.q,e.index*4);}
  else if(captureWeight===1){variant.vrm.humanoid.getNormalizedBoneNode('hips').position.copy(variant.baseHips);for(const e of variant.entries){const index=capturedIndex.get(e.name);if(index==null)e.bone.quaternion.identity();else e.bone.quaternion.fromArray(capture.q,index*4);}}
  else poseBank.apply(variant,sample);
  variant.vrm.humanoid.update();variant.vrm.scene.updateMatrixWorld(true);
 }
 const capturedY=(capture?.root[1]||0)-captureReferenceOffset;let groundedY=capturedY;
 if(captureWeight<1){let low=Infinity;for(const side of ['left','right']){wardrobe.master.humanoid.getRawBoneNode(side+'Foot').getWorldPosition(v);low=Math.min(low,v.y);}const authoredY=wardrobe.master.scene.position.y+.075-low;groundedY=T.MathUtils.lerp(authoredY,capturedY,captureWeight);}
 for(let i=0;i<wardrobe.variants.length;i++){const variant=wardrobe.variants[i],vrm=variant.vrm;vrm.scene.position.y=groundedY+(variant.restOffset||0);const active=needed.has(i);if(active){vrm.scene.updateMatrixWorld(true);if(seek||!variant.wasActive)vrm.springBoneManager?.reset();applyFaceExpression(vrm,wardrobe.options.face[wardrobe.outfit.face],clock);vrm.update(dt);}variant.wasActive=active;}
 const side=menuOpen&&width<1000&&width>height&&height<=600,compact=menuOpen&&width<1000&&!side;camera.zoom=compact?.55:1;camera.updateProjectionMatrix();
  // landscape phone: the menu panel covers the right part, so centre the dancer in the free strip on the left
  camera.position.x=menuOpen&&width>=1000?.47:side?(1-(width-10-Math.min(470,width*.58))/width)*1.12*width/height:0;camera.position.y=compact?-.4:.75;camera.lookAt(camera.position.x,camera.position.y,0);news.hideAll();if(crewVisible)news.update('lead',wardrobe.master.humanoid,news.slug,t);crew.update(crewVisible,playing?t:null,width/height,captureWeight===1&&capture?.root?capture.root:null);partner.update(!!duo,clock,leadX,playing);if(crewVisible&&partner.visible)news.update('partner',partner.humanoid,news.slug,t,'lead');look.frame(crewVisible,rootX+leadX);renderer.render(scene,camera);
  // Away from a song, every 3 s, free the GPU copies of what nobody shows (outfits tried on before). See texture-budget.js.
  if(!playing&&started-lastSweep>3000){lastSweep=started;try{sweepGpu(scene,leadFace?.resources?.()||[]);}catch(e){console.warn('gpu sweep',e);}}
 lastSnapshot={time:playing?t:null,motionSource:captureWeight===1?'captured':captureWeight>0?'blend':'authored',captured:{asset:captureAsset,available:!!captured,matched:captured?.matched||false,active:captureWeight>0,weight:captureWeight,source:'cac-center',transition:'continuous-relative-120hz',sourceTime:capture?.sourceTime??null,localTime:capture?.localTime??null,index:capture?.index??null,next:capture?.next??null,alpha:capture?.alpha??null,t0:captured?.t0??null,duration:captured?.duration??null,entryFade:captured?.entryFade??null,exitFade:captured?.exitFade??null},activeVariants:[...needed].sort((a,b)=>a-b),source:captureWeight>0?capture.localTime:sample.layers[0]?.time,layers:[...sample.layers.map(l=>({...l,weight:l.weight*(1-captureWeight)})).filter(l=>l.weight>0),...(captureWeight>0?[{clip:'cac-center',time:capture.localTime,weight:captureWeight}]:[])],clipIds:captureWeight===1?['cac-center']:captureWeight>0?['cac-center',...sample.layers.map(l=>l.clip)]:sample.layers.map(l=>l.clip),mode:sample.mode,phraseId:sample.phraseId,energy:sample.energy,amplitude:sample.amplitude,rootX,rootZ,leadX,sourceRoot,speed:sample.phaseRate,phaseRate:sample.phaseRate,rootVelocity:sample.rootVelocity,beatPhase:sample.beatPhase,rootPosition:[rootX,wardrobe.master.scene.position.y,rootZ],yaw:rootYaw,seek,drawMs:performance.now()-started,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls};
 }
 function snapshot(){const bones={};for(const name of ['hips','spine','chest','neck','head','leftShoulder','rightShoulder','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot']){const b=wardrobe.master.humanoid.getRawBoneNode(name);if(!b)continue;b.getWorldPosition(v);const world=v.toArray(),screen=v.clone().project(camera);bones[name]={world,screen:[(screen.x+1)*width/2,(1-screen.y)*height/2],quaternion:b.quaternion.toArray()};}return{...lastSnapshot,backdrop:backdrop.diagnostics(),crew:crew.diagnostics(),selection:{...wardrobe.outfit},bones,finite:Object.values(bones).every(b=>b.world.every(Number.isFinite)),face:{id:wardrobe.options.face[wardrobe.outfit.face].id,values:wardrobe.options.face[wardrobe.outfit.face].values},parts:wardrobe.variants.flatMap((v,i)=>Object.entries(v.parts).flatMap(([slot,ms])=>ms.map(m=>({slot,variant:i,visible:m.visible,meshId:m.uuid,geometryId:m.geometry.uuid,indexCount:m.geometry.index?.count||0})))).concat((wardrobe.styleParts||[]).map(p=>({slot:p.slot,variant:p.variant,donor:p.donor,visible:p.mesh.visible,meshId:p.mesh.uuid,geometryId:p.mesh.geometry.uuid,indexCount:p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count}))).concat((wardrobe.accessoryParts||[]).map(p=>({slot:p.slot,variant:p.variant,visible:p.mesh.visible,meshId:p.mesh.uuid,geometryId:p.mesh.geometry.uuid,indexCount:p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count}))),accessories:(wardrobe.accessoryParts||[]).map(p=>({slot:p.slot,variant:p.variant,visible:p.mesh.visible,meshId:p.mesh.uuid,geometryId:p.mesh.geometry.uuid,indexCount:p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count})),audit:wardrobe.audit};}
 const api={draw,equip,snapshot,
 async setDuo(opts){duo=opts?{side:opts.side==='R'?'R':'L'}:null;leadX=duo?(duo.side==='L'?-SLOT_X:SLOT_X):0;await partner.setOutfit(duo?opts.partner||null:null);partner.setSpot(-leadX,setHeight(news.slug,partner.selection));},
 // the character travels with the outfit (lobby, prep, loaded); no key = Nữ, exactly the message older builds send
 outfitIds(){return {...Object.fromEntries(['hair','top','bottom','shoes','accessory'].map(s=>[s,wardrobe.options[s]?.[wardrobe.outfit[s]]?.id??null])),...(who.character==='nam'?{character:'nam'}:{})};},get character(){return who.character;},
 heads(){const head=wardrobe.master.humanoid.getRawBoneNode('head');let me=null;if(head){head.getWorldPosition(v);v.y+=.16*wardrobe.master.scene.scale.x;v.project(camera);me=[(v.x+1)/2*width,(1-v.y)/2*height];}return{me,partner:duo?partner.headScreen(camera,width,height):null};},
 async setSong(moves,chart){const request=++songRequest,entry=beautyDemo?null:performances.find(chart),loaded=entry?await performances.load(entry):null;if(request!==songRequest)return false;
 // Backups wear theme outfits that are built on demand (lazy wardrobe): sew them before the crew rigs clone the meshes.
 // Song-themed backup outfits (config.crewOutfits[slug], crew-only garments): each backup gets a random one per song,
 // no repeats while the pool lasts. Sewn before the crew rigs clone the meshes.
 for(const v of wardrobe.variants)v.vrm.scene.scale.setScalar(1);leadHeight=1;
 let crewEntry=themedCrew(entry,chart);if(duo&&crewEntry?.crew)crewEntry={...crewEntry,crew:crewEntry.crewCount===1&&crewEntry.crew.length===1?crewEntry.crew.map(centred):duoCrew(crewEntry.crew)};
 for(const c of crewEntry?.crew||[])if(c.outfit)await wardrobe.prepareOutfit(c.outfit);if(request!==songRequest)return false;
 captured=loaded?.lead?createCapturedMotion(loaded.lead):defaultCaptured;captureAsset=loaded?.lead?entry.lead:defaultCaptureAsset;
 capturedIndex=new Map(captured?.boneNames.map((n,i)=>[n,i])||[]);captureReferenceOffset=wardrobe.variants.find(v=>v.spec.id===captured?.referenceVariant)?.restOffset||0;
 songMoves=moves;news.slug=chart?.slug||Object.keys(raw.performances||{}).find(k=>raw.performances[k]===entry)||null;backdrop.setSong(chart);{const tint=backdrop.tint?.();if(tint){disc.material.color.set(tint.disc);ring.material.color.set(tint.ring);}}motion.setSong(moves,chart);const matched=captured?.setSong(moves,chart);if(loaded?.lead&&!matched)throw Error('Lead track song identity mismatch');{const keep=leadFace?.selected;if(keep&&keep!=='original')leadFace.apply('original');crew.setSong(chart,crewEntry,loaded?.crewData);if(keep&&keep!=='original')leadFace.apply(keep);}leadHeight=crewEntry?.leadHeight||1;partner.setSpot(-leadX,setHeight(news.slug,partner.selection));bakeCapturedFades();lastTime=null;idleStart=performance.now();return true;},outfits:presets,get outfit(){const i=presets.findIndex((_,i)=>physicalSlots.every(s=>wardrobe.variantFor(s,wardrobe.outfit[s])===i&&!wardrobe.options[s][wardrobe.outfit[s]].style));return i>=0&&!(wardrobe.outfit.accessory>0)?presets[i].id:'mixed';},setOutfit(id){const i=presets.findIndex(p=>p.id===id);if(i>=0){physicalSlots.forEach(s=>{const choice=wardrobe.options?.[s]?.findIndex(o=>o.variant===i)??i;if(choice>=0)equip(s,choice);});if(wardrobe.slots.includes('accessory'))equip('accessory',0);}},mountWardrobe(container){refresh=mountWardrobe(container,who.uiConfig,equipFromUI,()=>wardrobe.outfit,name=>(who.character==='nam'&&bundle.files['wardrobe/icons/nam-'+name+'.webp'])||bundle.files['wardrobe/icons/'+name+'.webp']||null);},test:{wardrobe,camera,scene,renderer,motion,poseBank,crew,captured,partner,config,look,who,profile:()=>leadFace?.selected??null}};
 // Warm both crew costumes while the loading state is still visible. Otherwise
 // their first shader compilation can stall the first audible dance beat.
 // Owner 2026-11-09: trying clothes on must not wait. Sew the shop (set items first) while the loading screen is up, for
 // at most 4 s, then keep sewing the rest of the shop in the background ahead of the crew looks. Priority 99 pauses
 // while a song plays; a tap on an unsewn item still jumps the queue at 100.
 {const shop=[],seen=new Set(),add=(slot,i)=>{const o=wardrobe.options?.[slot]?.[i],k=slot+':'+i;if(o?.style&&who.isShop(slot,i)&&!seen.has(k)){seen.add(k);shop.push({[slot]:i});}};
  for(const set of who.sets)for(const [slot,i] of Object.entries(set.selection||{}))add(slot,i);
  for(const [slot,items] of Object.entries(wardrobe.options||{}))items.forEach((_,i)=>add(slot,i));
  const t0=performance.now(),st=wardrobe.styles;if(st?.ensureStyle)for(const x of shop){if(performance.now()-t0>4000)break;const [slot,i]=Object.entries(x)[0];try{st.ensureStyle(slot,i);}catch(e){console.warn('shop sew',e);}}
  if(wardrobe.prepareOutfit)shop.forEach((x,k)=>wardrobe.prepareOutfit(x,{priority:99}).catch(e=>console.warn('shop sew',e)));}
 draw(null);crew.update(true,0,width/height);
 if(renderer.compileAsync)await renderer.compileAsync(scene,camera);else renderer.compile(scene,camera);
 renderer.render(scene,camera);crew.update(false,null,width/height);draw(null);
 // iPad memory (owner 2026-11-11): the crew-only looks of every song (mostly the Secret singers' hair) held ~290 MB sewn
 // ahead; they are sewn when their song opens (setSong waits for them). The shop itself stays sewn: try-on must not wait.
 setTimeout(()=>{try{wardrobe.prewarmOutfits?.(who.sets.map(x=>x.selection),{everything:false});}catch(e){console.warn('prewarm',e);}},2500);
 return api;
}
