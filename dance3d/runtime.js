import * as T from 'three';
import {createPerformanceLibrary} from './performance-library.js?v=0911.2025';
import {createSongBackgrounds} from './song-backgrounds.js?v=0911.2025';
import {loadWardrobe} from './wardrobe.js?v=0911.2025';
import {createChoreography} from './choreography.js?v=0911.2025';
import {createPoseBank} from './pose-bank.js?v=0911.2025';
import {applyFaceExpression} from './face-expressions.js?v=0911.2025';
import {createCrew} from './crew.js?v=0911.2025';
import {createCapturedMotion,CAPTURE_ASSET,FULL_CAPTURE_ASSET} from './captured-motion.js?v=0911.2025';
import {readWardrobe,saveWardrobe,mountWardrobe} from './wardrobe-ui.js?v=0911.2025';
export async function createRuntime(canvas,bundle){
 const [raw,data]=await Promise.all([bundle.json('wardrobe/config.json'),bundle.json('wardrobe/motion-bank.json')]);
 const beautyDemo=new URLSearchParams(location.search).get('dance')==='beauty';
 let captureAsset=beautyDemo?'wardrobe/beauty-demo.json':raw.captureAsset||(bundle.files[FULL_CAPTURE_ASSET]?FULL_CAPTURE_ASSET:CAPTURE_ASSET);
 if(beautyDemo&&!bundle.files[captureAsset])throw Error('Thiếu chuyển động demo nhảy đẹp');
 if(raw.captureAsset&&!bundle.files[captureAsset])throw Error('Thiếu chuyển động được chọn: '+captureAsset);
 const capturedData=bundle.files[captureAsset]?await bundle.json(captureAsset):null;
 const defaultCaptureAsset=captureAsset,defaultCaptured=capturedData?createCapturedMotion(capturedData):null;let captured=defaultCaptured,songRequest=0;const performances=createPerformanceLibrary(bundle,raw.performances||{});
 const config=structuredClone(raw);config.variants.forEach(v=>{const key=v.file;v.file=bundle.files[key];if(!v.file)throw Error('Thiếu dữ liệu nhân vật '+(v.id||key));});
 const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.outputColorSpace=T.SRGBColorSpace;
 const scene=new T.Scene();scene.background=new T.Color('#f4e4ed');const backdrop=createSongBackgrounds(scene);const camera=new T.OrthographicCamera(-1.6,1.6,1.12,-1.12,.01,20);camera.position.set(0,.75,5);camera.lookAt(0,.75,0);
 scene.add(new T.HemisphereLight(0xffffff,0x997c94,1.35));const light=new T.DirectionalLight(0xfff5ef,1.1);light.position.set(-2,4,5);scene.add(light);
 const disc=new T.Mesh(new T.CylinderGeometry(.9,.95,.04,48),new T.MeshStandardMaterial({color:0xe0c3d5,roughness:1}));disc.position.y=-.03;scene.add(disc);
 const ring=new T.Mesh(new T.TorusGeometry(.92,.006,6,64),new T.MeshBasicMaterial({color:0xfffbfe}));ring.rotation.x=Math.PI/2;ring.position.y=-.005;scene.add(ring);
 const wardrobe=await loadWardrobe(scene,config),motion=createChoreography(data);let songMoves=null,lastTime=null,lastMode=null,idleStart=performance.now(),refresh=()=>{},lastSnapshot={},width=0,height=0;
 const v=new T.Vector3();
 for(const variant of wardrobe.variants)variant.vrm.scene.position.y=variant.restOffset||0;
 const crew=createCrew(scene,wardrobe);
 const poseBank=createPoseBank(data,wardrobe.variants);
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
 function equip(slot,index){wardrobe.equip(slot,index);saveWardrobe(wardrobe.outfit);refresh();}
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
 function themedCrew(entry,chart){const slug=chart?.slug||Object.keys(raw.performances||{}).find(k=>raw.performances[k]===entry);const pool=(config.crewOutfits?.[slug]||[]).map(s=>({s,sel:crewSelection(s)})).filter(x=>x.sel);if(!entry?.crew?.length||!pool.length)return entry;
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  // Boy slots get boy looks and girl slots girl looks (role, default girl); a role without looks borrows from the whole pool.
  const byRole=new Map(),used=new Map();for(const x of pool){const r=x.s.role||'girl';if(!byRole.has(r))byRole.set(r,[]);byRole.get(r).push(x);}
  // A look with `max` (e.g. the one red-haired dancer) is given to at most that many dancers.
  const count=new Map();
  return {...entry,crew:entry.crew.map(c=>{const list=byRole.get(c.role||'girl')||pool;let n=used.get(list)||0,x=null;for(let k=0;k<list.length;k++){const cand=list[(n+k)%list.length];if((count.get(cand)||0)<(cand.s.max??Infinity)){x=cand;n+=k;break;}}if(!x)x=list.filter(y=>y.s.max==null)[0]||list[n%list.length];used.set(list,n+1);count.set(x,(count.get(x)||0)+1);return {...c,variant:x.s.variant??1,outfit:x.sel};})};}
 let bgPlaying=null;
 function draw(t){const started=performance.now();resize();const playing=t!=null&&Number.isFinite(t);if(playing!==bgPlaying){bgPlaying=playing;try{wardrobe.setBackgroundPaused?.(playing);}catch(e){}}const clock=playing?t:(performance.now()-idleStart)/1000;const delta=lastTime==null?0:clock-lastTime,seek=lastMode!==playing||delta<0||delta>.15,dt=seek?0:Math.min(.05,Math.max(0,delta));lastTime=clock;lastMode=playing;const menu=document.querySelector('#menu'),menuOpen=menu&&!menu.hidden&&!menu.classList.contains('hide')&&menu.style.display!=='none',crewVisible=playing&&!menuOpen,needed=new Set([0]);if(crewVisible)for(const i of crew.sharedVariants())needed.add(i);for(const slot of physicalSlots){const i=wardrobe.variantFor?wardrobe.variantFor(slot,wardrobe.outfit[slot]):wardrobe.outfit[slot];if(Number.isInteger(i))needed.add(i);}const activeVariants=wardrobe.variants.filter((_,i)=>needed.has(i));const sample=motion.sample(playing?clock:clock*.5),capture=playing?captured?.sample(captured.t0===0&&clock<0?0:clock):null,captureWeight=capture?.weight||0,fadePose=captureWeight>0&&captureWeight<1?fadePoseAt(clock):null,sourceRoot=poseBank.root(sample),authoredRootX=.3*Math.tanh(((sample.rootX||0)+sourceRoot[0]*.5)/.3),authoredRootZ=T.MathUtils.clamp((sample.rootZ||0)+sourceRoot[2]*.5,-.13,.13),rootX=T.MathUtils.lerp(authoredRootX,capture?.root[0]||0,captureWeight),rootZ=T.MathUtils.lerp(authoredRootZ,capture?.root[2]||0,captureWeight),rootYaw=(sample.yaw||0)*(1-captureWeight);
 for(const variant of wardrobe.variants){variant.vrm.scene.position.x=rootX;variant.vrm.scene.position.z=rootZ;variant.vrm.scene.rotation.y=rootYaw;}
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
  camera.position.x=menuOpen&&width>=1000?.47:side?(1-(width-10-Math.min(470,width*.58))/width)*1.12*width/height:0;camera.position.y=compact?-.4:.75;camera.lookAt(camera.position.x,camera.position.y,0);crew.update(crewVisible,playing?t:null,width/height,captureWeight===1&&capture?.root?capture.root:null);renderer.render(scene,camera);
 lastSnapshot={time:playing?t:null,motionSource:captureWeight===1?'captured':captureWeight>0?'blend':'authored',captured:{asset:captureAsset,available:!!captured,matched:captured?.matched||false,active:captureWeight>0,weight:captureWeight,source:'cac-center',transition:'continuous-relative-120hz',sourceTime:capture?.sourceTime??null,localTime:capture?.localTime??null,index:capture?.index??null,next:capture?.next??null,alpha:capture?.alpha??null,t0:captured?.t0??null,duration:captured?.duration??null,entryFade:captured?.entryFade??null,exitFade:captured?.exitFade??null},activeVariants:[...needed].sort((a,b)=>a-b),source:captureWeight>0?capture.localTime:sample.layers[0]?.time,layers:[...sample.layers.map(l=>({...l,weight:l.weight*(1-captureWeight)})).filter(l=>l.weight>0),...(captureWeight>0?[{clip:'cac-center',time:capture.localTime,weight:captureWeight}]:[])],clipIds:captureWeight===1?['cac-center']:captureWeight>0?['cac-center',...sample.layers.map(l=>l.clip)]:sample.layers.map(l=>l.clip),mode:sample.mode,phraseId:sample.phraseId,energy:sample.energy,amplitude:sample.amplitude,rootX,rootZ,sourceRoot,speed:sample.phaseRate,phaseRate:sample.phaseRate,rootVelocity:sample.rootVelocity,beatPhase:sample.beatPhase,rootPosition:[rootX,wardrobe.master.scene.position.y,rootZ],yaw:rootYaw,seek,drawMs:performance.now()-started,triangles:renderer.info.render.triangles,calls:renderer.info.render.calls};
 }
 function snapshot(){const bones={};for(const name of ['hips','spine','chest','neck','head','leftShoulder','rightShoulder','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot']){const b=wardrobe.master.humanoid.getRawBoneNode(name);if(!b)continue;b.getWorldPosition(v);const world=v.toArray(),screen=v.clone().project(camera);bones[name]={world,screen:[(screen.x+1)*width/2,(1-screen.y)*height/2],quaternion:b.quaternion.toArray()};}return{...lastSnapshot,backdrop:backdrop.diagnostics(),crew:crew.diagnostics(),selection:{...wardrobe.outfit},bones,finite:Object.values(bones).every(b=>b.world.every(Number.isFinite)),face:{id:wardrobe.options.face[wardrobe.outfit.face].id,values:wardrobe.options.face[wardrobe.outfit.face].values},parts:wardrobe.variants.flatMap((v,i)=>Object.entries(v.parts).flatMap(([slot,ms])=>ms.map(m=>({slot,variant:i,visible:m.visible,meshId:m.uuid,geometryId:m.geometry.uuid,indexCount:m.geometry.index?.count||0})))).concat((wardrobe.styleParts||[]).map(p=>({slot:p.slot,variant:p.variant,donor:p.donor,visible:p.mesh.visible,meshId:p.mesh.uuid,geometryId:p.mesh.geometry.uuid,indexCount:p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count}))).concat((wardrobe.accessoryParts||[]).map(p=>({slot:p.slot,variant:p.variant,visible:p.mesh.visible,meshId:p.mesh.uuid,geometryId:p.mesh.geometry.uuid,indexCount:p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count}))),accessories:(wardrobe.accessoryParts||[]).map(p=>({slot:p.slot,variant:p.variant,visible:p.mesh.visible,meshId:p.mesh.uuid,geometryId:p.mesh.geometry.uuid,indexCount:p.mesh.geometry.index?.count||p.mesh.geometry.attributes.position.count})),audit:wardrobe.audit};}
 const api={draw,equip,snapshot,async setSong(moves,chart){const request=++songRequest,entry=beautyDemo?null:performances.find(chart),loaded=entry?await performances.load(entry):null;if(request!==songRequest)return false;
 // Backups wear theme outfits that are built on demand (lazy wardrobe): sew them before the crew rigs clone the meshes.
 // Song-themed backup outfits (config.crewOutfits[slug], crew-only garments): each backup gets a random one per song,
 // no repeats while the pool lasts. Sewn before the crew rigs clone the meshes.
 const crewEntry=themedCrew(entry,chart);
 for(const c of crewEntry?.crew||[])if(c.outfit)await wardrobe.prepareOutfit(c.outfit);if(request!==songRequest)return false;
 captured=loaded?.lead?createCapturedMotion(loaded.lead):defaultCaptured;captureAsset=loaded?.lead?entry.lead:defaultCaptureAsset;
 capturedIndex=new Map(captured?.boneNames.map((n,i)=>[n,i])||[]);captureReferenceOffset=wardrobe.variants.find(v=>v.spec.id===captured?.referenceVariant)?.restOffset||0;
 songMoves=moves;backdrop.setSong(chart);motion.setSong(moves,chart);const matched=captured?.setSong(moves,chart);if(loaded?.lead&&!matched)throw Error('Lead track song identity mismatch');crew.setSong(chart,crewEntry,loaded?.crewData);bakeCapturedFades();lastTime=null;idleStart=performance.now();return true;},outfits:presets,get outfit(){const i=presets.findIndex((_,i)=>physicalSlots.every(s=>wardrobe.variantFor(s,wardrobe.outfit[s])===i&&!wardrobe.options[s][wardrobe.outfit[s]].style));return i>=0&&!(wardrobe.outfit.accessory>0)?presets[i].id:'mixed';},setOutfit(id){const i=presets.findIndex(p=>p.id===id);if(i>=0){physicalSlots.forEach(s=>{const choice=wardrobe.options?.[s]?.findIndex(o=>o.variant===i)??i;if(choice>=0)equip(s,choice);});if(wardrobe.slots.includes('accessory'))equip('accessory',0);}},mountWardrobe(container){refresh=mountWardrobe(container,config,equipFromUI,()=>wardrobe.outfit);},test:{wardrobe,camera,scene,renderer,motion,poseBank,crew,captured}};
 // Warm both crew costumes while the loading state is still visible. Otherwise
 // their first shader compilation can stall the first audible dance beat.
 // Owner 2026-11-09: trying clothes on must not wait. Sew the shop (set items first) while the loading screen is up, for
 // at most 4 s, then keep sewing the rest of the shop in the background ahead of the crew looks. Priority 99 pauses
 // while a song plays; a tap on an unsewn item still jumps the queue at 100.
 {const shop=[],seen=new Set(),add=(slot,i)=>{const o=wardrobe.options?.[slot]?.[i],k=slot+':'+i;if(o?.style&&!o.crewOnly&&!seen.has(k)){seen.add(k);shop.push({[slot]:i});}};
  for(const set of config.sets||[])for(const [slot,i] of Object.entries(set.selection||{}))add(slot,i);
  for(const [slot,items] of Object.entries(wardrobe.options||{}))items.forEach((_,i)=>add(slot,i));
  const t0=performance.now(),st=wardrobe.styles;if(st?.ensureStyle)for(const x of shop){if(performance.now()-t0>4000)break;const [slot,i]=Object.entries(x)[0];try{st.ensureStyle(slot,i);}catch(e){console.warn('shop sew',e);}}
  if(wardrobe.prepareOutfit)shop.forEach((x,k)=>wardrobe.prepareOutfit(x,{priority:99}).catch(e=>console.warn('shop sew',e)));}
 draw(null);crew.update(true,0,width/height);
 if(renderer.compileAsync)await renderer.compileAsync(scene,camera);else renderer.compile(scene,camera);
 renderer.render(scene,camera);crew.update(false,null,width/height);draw(null);
 setTimeout(()=>{try{wardrobe.prewarmOutfits?.([...(config.sets||[]).map(x=>x.selection),...Object.values(config.crewOutfits||{}).flat().map(crewSelection).filter(Boolean)]);}catch(e){console.warn('prewarm',e);}},2500);
 return api;
}
