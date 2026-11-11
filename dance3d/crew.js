import * as T from 'three';
import {createIndependentCrewRig} from './independent-crew-rig.js?v=1111.1248';
import {createDancerProfiles} from './dancer-profiles.js?v=1111.1248';
import {hideNativeCrewSafety} from './crew-styles.js?v=1111.1248';
import {hideNativeDolceSafety} from './dolce-crew-styles.js?v=1111.1248';
import {hideNativeGirlXinhSafety} from './girl-xinh-lead.js?v=1111.1248';
import {hideNativeGirlXinhBoySafety} from './girl-xinh-boys-styles.js?v=1111.1248';
import {hideNativeTaiSinhSafety} from './tai-sinh-styles.js?v=1111.1248';
import {hideNativeTaiSinhCrewSafety} from './tai-sinh-crew-styles.js?v=1111.1248';
import {hideNativeHuntrixTrioSafety} from './huntrix-trio-styles.js?v=1111.1248';
import {hideNativeGoldenStageSafety} from './golden-stage-styles.js?v=1111.1248';
import {hideNativeWislSafety} from './wisl-styles.js?v=1111.1248';
import {hideNativeSecretSafety} from './secret-styles.js?v=1111.1248';
import {newspaperProps,paperState} from './newspaper-prop.js?v=1111.1248';

// Four background performers reuse the live A/B skeletons, geometry, materials
// and morph arrays. Detached binding applies a crew transform AFTER skinning;
// cloning attached meshes would cancel their offsets and stack them on the lead.
export function createCrew(scene,wardrobe){
 const group=new T.Group();group.name='backup-dancers';scene.add(group);
 const news=newspaperProps(scene);// hand-held newspapers (runtime hides them each frame and sets news.slug)
 const layout=[{x:-1.21,y:.64,scale:.56,variant:0},{x:-.76,y:.50,scale:.60,variant:1},
  {x:.76,y:.50,scale:.60,variant:0},{x:1.21,y:.64,scale:.56,variant:1}];
 const dancers=layout.map((spec,index)=>{
  const source=wardrobe.variants[spec.variant%wardrobe.variants.length],root=new T.Group();
  root.name=`backup-dancer-${index+1}`;root.position.set(spec.x,spec.y,-.85);root.scale.setScalar(spec.scale);group.add(root);
  const meshes=[];
  // The original full-outfit meshes retain their matching body alpha masks.
  // Split wardrobe parts are deliberately excluded to prevent doubled skin.
  for(const original of source.meshes){
   if(!original.isSkinnedMesh)continue;
   const mesh=original.clone(false);mesh.name=`crew-${index}-${original.name}`;
   mesh.skeleton=original.skeleton;mesh.bindMode='detached';
   // Small background figures use the shared surface material once. The
   // duplicate MToon outline group adds no useful detail at this scale.
   if(Array.isArray(original.material)&&original.material.length===2&&original.material[1].isOutline)mesh.material=original.material[0];
   mesh.bindMatrix.copy(original.bindMatrix);mesh.bindMatrixInverse.copy(original.bindMatrix).invert();
   mesh.matrixAutoUpdate=false;mesh.matrix.copy(original.bindMatrix);
   mesh.visible=true;mesh.frustumCulled=false;mesh.renderOrder=-1;
   if(original.morphTargetInfluences)mesh.morphTargetInfluences=original.morphTargetInfluences;
   mesh.onBeforeRender=original.onBeforeRender;mesh.onAfterRender=original.onAfterRender;
   root.add(mesh);meshes.push(mesh);
  }
  return{index,source,root,meshes,spec};
 });
 const point=new T.Vector3(),bonePoint=new T.Vector3();let visible=false,lastTime=null,activeIndices=[0,1,2,3],independent=[];
 // Frame guard: if a slow device drops under ~45 fps for 3 s while 3+ own-motion backups dance, the outer
 // ones (crew entries 3 and 4) are hidden for the rest of the song; the inner pair keeps dancing.
 let lastWall=null,slowFor=0,emaMs=16.7,reduced=false,reducedLevel=0;
 // Slow-device steps: all -> 8 -> 4 -> 2 backups (crew entries are listed in priority order: front row first).
 const CREW_LIMITS=[99,8,4,2];
 function setSong(chart,performance=null,tracks=[]){
  for(const actor of independent){actor.rig.dispose();actor.face?.dispose();}independent=[];lastWall=null;slowFor=0;emaMs=16.7;reduced=false;reducedLevel=0;
  const isTrio=/golden|what[- _]it[- _]sounds|takedown|how[- _]it.?s?[- _]done/i.test([chart?.slug,chart?.title].join(' '));
  const count=performance?.crewCount??(isTrio?2:4);activeIndices=count===0?[]:count===1?[1]:count===2?[1,2]:Array.from({length:Math.max(4,count)},(_,i)=>i);// 1: a HUNTR/X trio with two players (only one backup left)
  for(const [i,spec]of (performance?.crew||[]).entries()){
   if(i>=activeIndices.length)break;
   const source=wardrobe.variants[spec.variant??1];if(!source)throw Error('Crew donor is missing');
   const rig=createIndependentCrewRig(source);let selected=source.meshes.filter(m=>m.isSkinnedMesh&&!m.userData.requiredBottomStyle);
   if(spec.outfit){selected=[...source.parts.face,...source.parts.upper,...source.parts.lower,...source.parts.feet];for(const slot of ['hair','top','bottom','shoes']){const choice=spec.outfit[slot]??(spec.variant??1),option=wardrobe.options[slot][choice];if(!option||wardrobe.variants[option.variant]!==source)throw Error('Independent crew outfit must use its donor rig');selected.push(...(wardrobe.styles.meshesFor(slot,choice)||source.parts[slot]));}const acc=spec.outfit.accessory,accOpt=acc!=null?wardrobe.options.accessory?.[acc]:null;if(accOpt?.style)selected.push(...(wardrobe.styles.meshesFor('accessory',acc)||[]));}
   if(spec.outfit&&wardrobe.options.bottom[spec.outfit.bottom]?.style?.startsWith('huntrix-'))selected=selected.filter(m=>!m.userData.excludeHuntrix);if(spec.outfit){const bottomOption=wardrobe.options.bottom[spec.outfit.bottom];selected=selected.filter(m=>!hideNativeCrewSafety(m,bottomOption)&&!hideNativeDolceSafety(m,bottomOption)&&!hideNativeGirlXinhSafety(m,bottomOption)&&!hideNativeGirlXinhBoySafety(m,bottomOption)&&!hideNativeTaiSinhSafety(m,bottomOption)&&!hideNativeTaiSinhCrewSafety(m,bottomOption)&&!hideNativeHuntrixTrioSafety(m,bottomOption)&&!hideNativeGoldenStageSafety(m,bottomOption)&&!hideNativeWislSafety(m,bottomOption)&&!hideNativeSecretSafety(m,bottomOption));}rig.setMeshes(selected);
   // Same as the shared crew: small background figures skip the MToon outline pass (half the draw calls).
   for(const m of rig.meshes)if(m.visible&&Array.isArray(m.material)&&m.material.length===2&&m.material[1].isOutline)m.material=m.material[0];
   rig.setMotion(tracks[i],null,chart);if(spec.rootScale)rig.setRootScale(spec.rootScale);rig.setMirror(!!spec.mirror);group.add(rig.root);
   const sign=i%2===0?-1:1,anchor=spec.anchor||[sign*.59,.18,-.85],scale=spec.scale??.8;
   if(anchor.length!==3||!anchor.every(Number.isFinite)||!Number.isFinite(scale)||scale<=0)throw Error('Invalid crew placement');
   const moves=[...(spec.moves||[])].sort((p,q)=>p.at-q.at);for(const r of spec.ready||[])if(!(Array.isArray(r)&&r.length===2&&r.every(Number.isFinite)&&r[0]<r[1]))throw Error('Invalid crew ready interval');for(const m of moves){if(!Number.isFinite(m.at)||!(m.dur>0)||(m.to!=null&&!(m.to.length===3&&m.to.every(Number.isFinite)))||(m.yaw!=null&&!Number.isFinite(m.yaw))||(m.scale!=null&&!(m.scale>0)))throw Error('Invalid crew move');}
   rig.root.position.fromArray(anchor);rig.root.scale.setScalar(scale);// HUNTR/X character sets (owner 2026-11-10): the backup takes that character's face and head shape (Codex profiles).
    let face=null;if(spec.face&&spec.face!=='original'){try{const fm=source.parts.face.map(m=>rig.mapping.get(m)).filter(Boolean);face=createDancerProfiles({faceMeshes:fm,rigs:[{humanoid:rig.humanoid,scene:rig.model,springBoneManager:rig.springs}],initial:spec.face});if(!face.supported){console.warn('crew face',face.reason);face=null;}}catch(e){console.warn('crew face',e);face=null;}}
    // Secret singers: a fixed expression from the look (e.g. Wren's open grin, Cody's smirk) and their own blink.
    const expr=spec.expr&&typeof spec.expr==='object'?Object.entries(spec.expr).filter(([,w])=>Number.isFinite(w)&&w>0):null,faceMorph=expr?.length?source.parts.face.map(m=>rig.mapping.get(m)).filter(m=>m?.morphTargetDictionary&&m.morphTargetInfluences):null;
    independent.push({index:activeIndices[i],rig,spec,source,anchor,scale,moves,face,expr:faceMorph?.length?expr:null,faceMorph,blink:1.3+i*.83});
  }
 }
 // Eye-closing shapes in the expression scale the blink down so the lids never pass through each other; a resting
 // Fcl_EYE_Close (hooded lids) stays under the blink.
 function expression(actor,t){const tt=t??performance.now()/1000,b=Math.pow(Math.max(0,Math.sin(tt*1.8+actor.blink)),40);
  for(const m of actor.faceMorph){const d=m.morphTargetDictionary,inf=m.morphTargetInfluences;let shut=0,lid=0;for(const [n,w] of actor.expr){const k=d[n];if(k==null)continue;inf[k]=w;if(n==='Fcl_EYE_Close')lid=w;else if(/^Fcl_EYE_(Joy|Fun)/.test(n))shut+=w;}const c=d.Fcl_EYE_Close;if(c!=null)inf[c]=Math.min(1,lid+b*Math.max(0,1-shut-lid));}}
 function update(show,t,aspect,leadRoot=null){
  visible=!!show;group.visible=visible;lastTime=t;
  // Landscape iPad keeps the authored spacing. Narrow windows pull the row
  // inward instead of losing the outer two dancers beyond the camera edges.
  const spacing=Math.min(1,Math.max(.44,aspect/.95));
  for(const dancer of dancers){dancer.root.position.x=dancer.spec.x*spacing;dancer.root.visible=activeIndices.includes(dancer.index)&&!independent.some(a=>a.index===dancer.index);}
  const now=performance.now();
  const keep=CREW_LIMITS[reducedLevel];if(visible&&t!=null&&independent.length>keep&&reducedLevel<CREW_LIMITS.length-1){if(lastWall!=null){const dt=now-lastWall;if(dt<250){emaMs+=(dt-emaMs)*.05;slowFor=emaMs>22?slowFor+dt:0;if(slowFor>3000){do reducedLevel++;while(reducedLevel<CREW_LIMITS.length-1&&CREW_LIMITS[reducedLevel]>=independent.length);reduced=true;slowFor=0;emaMs=16.7;}}}lastWall=now;}else if(t==null)lastWall=null;
  for(const [k,actor]of independent.entries()){actor.rig.root.visible=visible&&k<CREW_LIMITS[reducedLevel];if(!actor.rig.root.visible)continue;place(actor,t,spacing);// off-stage (|x|>3, beyond every screen width): hidden and not animated
   if(actor.offstage){actor.rig.root.visible=false;continue;}actor.rig.update(t==null?t:t+(actor.spec.timeOffset||0),wardrobe.master.humanoid,actor.ovr,leadRoot);if(actor.expr)expression(actor,t);if(visible)news.update(actor.spec.id,actor.rig.humanoid,news.slug,t);}
  group.updateMatrixWorld(true);
 }
 // Formation changes over the song (e.g. the ring around the center): each move eases from the current spot to
 // `to` (null = home) with yaw (deg, 0 = facing the camera) and scale, starting at song time `at` over `dur` s.
 function trapz(tau,D){const r=Math.min(.25,D/4),A=D-r;if(tau<=0)return 0;if(tau>=D)return 1;if(tau<r)return tau*tau/(2*r)/A;if(tau<D-r)return (tau-r/2)/A;const u=D-tau;return 1-u*u/(2*r)/A;}
 function angLerp(a,b,u){const d=((b-a+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;return a+d*u;}
 // `walk` moves: walk at constant speed facing the way they go (turn 0.35 s at each end), legs stepping with the distance
 // walked (no foot sliding); `ready` intervals: stand still facing front until the cue, then dance.
 function place(actor,t,spacing){let [x,y,z]=actor.anchor,yaw=0,sc=actor.scale,ww=0,phase=0;if(t!=null)for(const m of actor.moves){if(m.walk&&t>=m.at-.25&&t<m.at)ww=Math.max(ww,T.MathUtils.smoothstep(t,m.at-.25,m.at));if(t<m.at)break;const to=m.to||actor.anchor,ty=(m.yaw??0)*Math.PI/180,ts=m.scale??actor.scale;
  if(m.walk){const fx=x,fz=z,dx=to[0]-fx,dz=to[2]-fz,L=Math.hypot(dx,dz),tau=t-m.at,u=trapz(tau,m.dur),travel=Math.atan2(dx,dz),y0=yaw;x=fx+dx*u;y+=(to[1]-y)*u;z=fz+dz*u;sc+=(ts-sc)*u;
   yaw=tau>=m.dur?ty:tau<.35?angLerp(y0,travel,T.MathUtils.smoothstep(tau,0,.35)):tau>m.dur-.35?angLerp(travel,ty,T.MathUtils.smoothstep(tau,m.dur-.35,m.dur)):travel;
   if(tau<m.dur+.3){ww=Math.max(ww,tau<m.dur?1:1-T.MathUtils.smoothstep(tau,m.dur,m.dur+.3));phase=2*Math.PI*L*u/(.62*sc);}}
  else{const p=T.MathUtils.smootherstep(t,m.at,m.at+m.dur);x+=(to[0]-x)*p;y+=(to[1]-y)*p;z+=(to[2]-z)*p;yaw+=(ty-yaw)*p;sc+=(ts-sc)*p;}}
  let wr=0;if(t!=null)for(const [a,b] of actor.spec.ready||[])if(t>a-.3&&t<b+.3)wr=Math.max(wr,T.MathUtils.smoothstep(t,a-.3,a)*(1-T.MathUtils.smoothstep(t,b,b+.3)));
  const o=Math.min(1,ww+wr),ps=t!=null?paperState(news.slug,actor.spec.id,t):null,keepArms=!!(ps&&ps.w>0),face=ps?.arms||0;// holding the paper: the arms stay on the paper (base pose), face windows lift it in front of the face
  actor.ovr=o>0||face>0?{o,m:ww/((ww+wr)||1),phase,keepArms,face}:null;
  actor.offstage=Math.abs(x)>2.25;actor.rig.root.position.set(x*spacing,y,z);actor.rig.root.rotation.set(0,yaw,0);actor.rig.root.scale.setScalar(sc);}
 function diagnostics(){return{count:activeIndices.length,reduced,reducedLevel,frameEmaMs:+emaMs.toFixed(1),independent:independent.map(a=>({index:a.index,id:a.spec.id,face:a.spec.face||'original',position:a.rig.root.position.toArray(),scale:a.rig.root.scale.x,feetWorld:['left','right'].map(side=>a.rig.humanoid.getRawBoneNode(side+'Foot').getWorldPosition(new T.Vector3()).toArray()),...a.rig.diagnostics()})),visible,sharedSkinning:independent.length===0,outlinePass:false,time:lastTime,dancers:dancers.filter(d=>activeIndices.includes(d.index)&&!independent.some(a=>a.index===d.index)).map(d=>{
  d.source.vrm.humanoid.getRawBoneNode('leftHand').getWorldPosition(bonePoint);
  point.copy(bonePoint).applyMatrix4(d.root.matrixWorld);
  return{index:d.index,variant:d.spec.variant,scale:d.spec.scale,position:d.root.position.toArray(),handWorld:point.toArray(),feetWorld:['left','right'].map(side=>d.source.vrm.humanoid.getRawBoneNode(side+'Foot').getWorldPosition(new T.Vector3()).applyMatrix4(d.root.matrixWorld).toArray()),meshes:d.meshes.length,
   sharedGeometry:d.meshes.every((m,i)=>m.geometry===d.source.meshes.filter(x=>x.isSkinnedMesh)[i].geometry),
   sharedSkeleton:d.meshes.every((m,i)=>m.skeleton===d.source.meshes.filter(x=>x.isSkinnedMesh)[i].skeleton)};
 })};}
 return{update,setSong,diagnostics,group,dancers,sharedVariants(){return [...new Set(dancers.filter(d=>activeIndices.includes(d.index)&&!independent.some(a=>a.index===d.index)).map(d=>d.spec.variant))];},get independent(){return independent;}};
}
