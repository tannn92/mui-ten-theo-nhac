import * as T from 'three';
import {createIndependentCrewRig} from './independent-crew-rig.js?v=0911.1643';
import {hideNativeCrewSafety} from './crew-styles.js?v=0911.1643';

// Four background performers reuse the live A/B skeletons, geometry, materials
// and morph arrays. Detached binding applies a crew transform AFTER skinning;
// cloning attached meshes would cancel their offsets and stack them on the lead.
export function createCrew(scene,wardrobe){
 const group=new T.Group();group.name='backup-dancers';scene.add(group);
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
 function setSong(chart,performance=null,tracks=[]){
  for(const actor of independent)actor.rig.dispose();independent=[];lastWall=null;slowFor=0;emaMs=16.7;reduced=false;reducedLevel=0;
  const isTrio=/golden|what[- _]it[- _]sounds|takedown|how[- _]it.?s?[- _]done/i.test([chart?.slug,chart?.title].join(' '));
  const count=performance?.crewCount??(isTrio?2:4);activeIndices=count===0?[]:count===2?[1,2]:Array.from({length:Math.max(4,count)},(_,i)=>i);
  for(const [i,spec]of (performance?.crew||[]).entries()){
   if(i>=activeIndices.length)break;
   const source=wardrobe.variants[spec.variant??1];if(!source)throw Error('Crew donor is missing');
   const rig=createIndependentCrewRig(source);let selected=source.meshes.filter(m=>m.isSkinnedMesh&&!m.userData.requiredBottomStyle);
   if(spec.outfit){selected=[...source.parts.face,...source.parts.upper,...source.parts.lower,...source.parts.feet];for(const slot of ['hair','top','bottom','shoes']){const choice=spec.outfit[slot]??(spec.variant??1),option=wardrobe.options[slot][choice];if(!option||wardrobe.variants[option.variant]!==source)throw Error('Independent crew outfit must use its donor rig');selected.push(...(wardrobe.styles.meshesFor(slot,choice)||source.parts[slot]));}}
   if(spec.outfit&&wardrobe.options.bottom[spec.outfit.bottom]?.style?.startsWith('huntrix-'))selected=selected.filter(m=>!m.userData.excludeHuntrix);if(spec.outfit){const bottomOption=wardrobe.options.bottom[spec.outfit.bottom];selected=selected.filter(m=>!hideNativeCrewSafety(m,bottomOption));}rig.setMeshes(selected);
   // Same as the shared crew: small background figures skip the MToon outline pass (half the draw calls).
   for(const m of rig.meshes)if(m.visible&&Array.isArray(m.material)&&m.material.length===2&&m.material[1].isOutline)m.material=m.material[0];
   rig.setMotion(tracks[i],null,chart);if(spec.rootScale)rig.setRootScale(spec.rootScale);rig.setMirror(!!spec.mirror);group.add(rig.root);
   const sign=i%2===0?-1:1,anchor=spec.anchor||[sign*.59,.18,-.85],scale=spec.scale??.8;
   if(anchor.length!==3||!anchor.every(Number.isFinite)||!Number.isFinite(scale)||scale<=0)throw Error('Invalid crew placement');
   const moves=[...(spec.moves||[])].sort((p,q)=>p.at-q.at);for(const m of moves){if(!Number.isFinite(m.at)||!(m.dur>0)||(m.to!=null&&!(m.to.length===3&&m.to.every(Number.isFinite)))||(m.yaw!=null&&!Number.isFinite(m.yaw))||(m.scale!=null&&!(m.scale>0)))throw Error('Invalid crew move');}
   rig.root.position.fromArray(anchor);rig.root.scale.setScalar(scale);independent.push({index:activeIndices[i],rig,spec,source,anchor,scale,moves});
  }
 }
 function update(show,t,aspect){
  visible=!!show;group.visible=visible;lastTime=t;
  // Landscape iPad keeps the authored spacing. Narrow windows pull the row
  // inward instead of losing the outer two dancers beyond the camera edges.
  const spacing=Math.min(1,Math.max(.44,aspect/.95));
  for(const dancer of dancers){dancer.root.position.x=dancer.spec.x*spacing;dancer.root.visible=activeIndices.includes(dancer.index)&&!independent.some(a=>a.index===dancer.index);}
  const now=performance.now();
  const keep=reducedLevel===0?99:reducedLevel===1?4:2;if(visible&&t!=null&&independent.length>keep){if(lastWall!=null){const dt=now-lastWall;if(dt<250){emaMs+=(dt-emaMs)*.05;slowFor=emaMs>22?slowFor+dt:0;if(slowFor>3000){reducedLevel=Math.min(2,reducedLevel+(independent.length>4&&reducedLevel===0?1:2));reduced=true;slowFor=0;emaMs=16.7;}}}lastWall=now;}else if(t==null)lastWall=null;
  for(const [k,actor]of independent.entries()){actor.rig.root.visible=visible&&k<(reducedLevel===0?99:reducedLevel===1?4:2);if(!actor.rig.root.visible)continue;place(actor,t,spacing);actor.rig.update(t==null?t:t+(actor.spec.timeOffset||0),wardrobe.master.humanoid);}
  group.updateMatrixWorld(true);
 }
 // Formation changes over the song (e.g. the ring around the center): each move eases from the current spot to
 // `to` (null = home) with yaw (deg, 0 = facing the camera) and scale, starting at song time `at` over `dur` s.
 function place(actor,t,spacing){let [x,y,z]=actor.anchor,yaw=0,sc=actor.scale;if(t!=null)for(const m of actor.moves){if(t<m.at)break;const p=T.MathUtils.smootherstep(t,m.at,m.at+m.dur),to=m.to||actor.anchor,ty=(m.yaw??0)*Math.PI/180,ts=m.scale??actor.scale;x+=(to[0]-x)*p;y+=(to[1]-y)*p;z+=(to[2]-z)*p;yaw+=(ty-yaw)*p;sc+=(ts-sc)*p;}actor.rig.root.position.set(x*spacing,y,z);actor.rig.root.rotation.set(0,yaw,0);actor.rig.root.scale.setScalar(sc);}
 function diagnostics(){return{count:activeIndices.length,reduced,reducedLevel,frameEmaMs:+emaMs.toFixed(1),independent:independent.map(a=>({index:a.index,id:a.spec.id,position:a.rig.root.position.toArray(),scale:a.rig.root.scale.x,feetWorld:['left','right'].map(side=>a.rig.humanoid.getRawBoneNode(side+'Foot').getWorldPosition(new T.Vector3()).toArray()),...a.rig.diagnostics()})),visible,sharedSkinning:independent.length===0,outlinePass:false,time:lastTime,dancers:dancers.filter(d=>activeIndices.includes(d.index)&&!independent.some(a=>a.index===d.index)).map(d=>{
  d.source.vrm.humanoid.getRawBoneNode('leftHand').getWorldPosition(bonePoint);
  point.copy(bonePoint).applyMatrix4(d.root.matrixWorld);
  return{index:d.index,variant:d.spec.variant,scale:d.spec.scale,position:d.root.position.toArray(),handWorld:point.toArray(),feetWorld:['left','right'].map(side=>d.source.vrm.humanoid.getRawBoneNode(side+'Foot').getWorldPosition(new T.Vector3()).applyMatrix4(d.root.matrixWorld).toArray()),meshes:d.meshes.length,
   sharedGeometry:d.meshes.every((m,i)=>m.geometry===d.source.meshes.filter(x=>x.isSkinnedMesh)[i].geometry),
   sharedSkeleton:d.meshes.every((m,i)=>m.skeleton===d.source.meshes.filter(x=>x.isSkinnedMesh)[i].skeleton)};
 })};}
 return{update,setSong,diagnostics,group,dancers,sharedVariants(){return [...new Set(dancers.filter(d=>activeIndices.includes(d.index)&&!independent.some(a=>a.index===d.index)).map(d=>d.spec.variant))];},get independent(){return independent;}};
}
