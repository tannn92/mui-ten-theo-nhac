import * as T from 'three';

// Source-time pose preparation is independent of the song clock and seek history.
export function createPoseBank(bank,variants){
 if(!Array.isArray(bank.bones)||!bank.clips?.length)throw Error('Dữ liệu điệu nhảy không hợp lệ');
 const clips=new Map(bank.clips.map(c=>[c.id,c])),q=new T.Quaternion(),r=new T.Quaternion(),sum=new T.Vector4(),point=new T.Vector3(),head=new T.Vector3(),elbow=new T.Vector3(),hand=new T.Vector3(),parent=new T.Quaternion();
 const master=variants[0],arms=['leftUpperArm','rightUpperArm'];
 for(const variant of variants){variant.baseHips=variant.vrm.humanoid.getNormalizedBoneNode('hips').position.clone();variant.entries=bank.bones.map((name,index)=>({name,index,bone:variant.vrm.humanoid.getNormalizedBoneNode(name)})).filter(x=>x.bone);}
 function frame(c,t){const f=T.MathUtils.clamp(t*c.fps,0,c.frames.length-1),i=Math.floor(f);return {a:c.frames[i],b:c.frames[Math.min(i+1,c.frames.length-1)],u:f-i};}
 function read(c,name,t,out){const i=bank.bones.indexOf(name),f=frame(c,t);return out.fromArray(f.a.q,i*4).slerp(r.fromArray(f.b.q,i*4),f.u);}
 const headWorld=new T.Quaternion(),headParent=new T.Quaternion(),headUp=new T.Vector3(),headAxis=new T.Vector3(),up=new T.Vector3(0,1,0);
 function stabilizeHead(vrm){const node=vrm.humanoid.getNormalizedBoneNode('head');node.getWorldQuaternion(headWorld);headUp.copy(up).applyQuaternion(headWorld);const angle=Math.acos(T.MathUtils.clamp(headUp.y,-1,1)),limit=19*Math.PI/180;if(angle<1e-5)return;const excess=angle-limit*Math.tanh(angle/limit);headAxis.crossVectors(headUp,up).normalize();headWorld.premultiply(new T.Quaternion().setFromAxisAngle(headAxis,excess));node.parent.getWorldQuaternion(headParent);node.quaternion.copy(headParent.invert()).multiply(headWorld);node.updateWorldMatrix(false,true);}
 const elbowDir=new T.Vector3(),elbowRest=new T.Vector3(),elbowTarget=new T.Vector3(),elbowAxis=new T.Vector3(),elbowFix=new T.Quaternion();
 function constrainElbows(vrm){for(const side of ['left','right']){const node=vrm.humanoid.getNormalizedBoneNode(side+'LowerArm');elbowRest.set(side==='left'?1:-1,0,0);elbowDir.copy(elbowRest).applyQuaternion(node.quaternion);elbowTarget.copy(elbowDir);elbowTarget.z=Math.max(0,elbowTarget.z);elbowTarget.normalize();const angle=Math.acos(T.MathUtils.clamp(elbowRest.dot(elbowTarget),-1,1)),threshold=130*Math.PI/180,soft=10*Math.PI/180,target=angle<=threshold?angle:threshold+soft*Math.tanh((angle-threshold)/soft);if(angle>1e-6){elbowAxis.crossVectors(elbowRest,elbowTarget).normalize();elbowTarget.copy(elbowRest).applyAxisAngle(elbowAxis,target);}elbowFix.setFromUnitVectors(elbowDir,elbowTarget);node.quaternion.premultiply(elbowFix);node.updateWorldMatrix(false,true);}}
 function raw(variant,c,t){const h=variant.vrm.humanoid.getNormalizedBoneNode('hips'),f=frame(c,t);h.position.copy(variant.baseHips);h.position.y+=T.MathUtils.lerp(f.a.p?.[1]||0,f.b.p?.[1]||0,f.u);for(const e of variant.entries)e.bone.quaternion.fromArray(f.a.q,e.index*4).slerp(r.fromArray(f.b.q,e.index*4),f.u);variant.vrm.scene.updateMatrixWorld(true);stabilizeHead(variant.vrm);constrainElbows(variant.vrm);}
 // Test the whole forearm, not only the hand. Behind-head gestures are retained.
 function penetration(vrm,side){const human=vrm.humanoid;human.getNormalizedBoneNode('head').getWorldPosition(head);head.y+=.065;human.getNormalizedBoneNode(side+'LowerArm').getWorldPosition(elbow);human.getNormalizedBoneNode(side+'Hand').getWorldPosition(hand);let cost=0;for(let i=0;i<=7;i++){point.copy(elbow).lerp(hand,i/5);if(point.z<head.z-.10)continue;const d=((point.x-head.x)/.19)**2+((point.y-head.y)/.215)**2;cost+=Math.max(0,1-d)**2;}return cost;}
 for(const c of bank.clips){
  if(!c.frames?.length||!c.fps)throw Error('Điệu nhảy thiếu khung hình: '+c.id);
  // A short source-time filter removes capture spikes without flattening the
  // phrases. It is applied before the anatomy/face pass, so corrections are
  // computed for the same trajectories that the renderer actually samples.
  const source=c.frames;
  c.frames=source.map((f,i)=>{const values=[];for(let bone=0;bone<bank.bones.length;bone++){const ref=new T.Quaternion().fromArray(f.q,bone*4);sum.set(0,0,0,0);for(let j=-8;j<=8;j++){q.fromArray(source[Math.max(0,Math.min(source.length-1,i+j))].q,bone*4);const w=Math.exp(-.5*(j/3)**2)*(ref.dot(q)<0?-1:1);sum.x+=q.x*w;sum.y+=q.y*w;sum.z+=q.z*w;sum.w+=q.w*w;}new T.Quaternion(sum.x,sum.y,sum.z,sum.w).normalize().toArray(values,bone*4);}return {...f,q:values};});
  c.corrections=Object.fromEntries(arms.map(n=>[n,[]]));c.correctedFrames=0;
  for(let i=0;i<c.frames.length;i++){
   raw(master,c,i/c.fps);
   for(const name of arms){const side=name.startsWith('left')?'left':'right',bone=master.vrm.humanoid.getNormalizedBoneNode(name),original=bone.quaternion.clone();let best=original.clone(),bestCost=penetration(master.vrm,side)*100;
    if(bestCost>.02){c.correctedFrames++;bone.parent.getWorldQuaternion(parent);const world=bone.getWorldQuaternion(new T.Quaternion());
     for(const axis of [new T.Vector3(0,0,1),new T.Vector3(0,1,0),new T.Vector3(1,0,0)])for(const angle of [-1.2,-1,-.75,-.5,-.3,-.15,.15,.3,.5,.75,1,1.2]){q.setFromAxisAngle(axis,angle).multiply(world);bone.quaternion.copy(parent).invert().multiply(q);bone.updateWorldMatrix(false,true);const cost=penetration(master.vrm,side)*100+angle*angle*.15;if(cost<bestCost){bestCost=cost;best.copy(bone.quaternion);}}
    }
    bone.quaternion.copy(best);bone.updateWorldMatrix(false,true);c.corrections[name].push(best.clone().multiply(original.invert()));
   }
  }
  for(const name of arms){const values=c.corrections[name];c.corrections[name]=values.map((ref,i)=>{sum.set(0,0,0,0);for(let j=-10;j<=10;j++){const a=values[Math.max(0,Math.min(values.length-1,i+j))],w=Math.exp(-.5*(j/(c.id==='kick-and-pivot'?3.5:2))**2)*(ref.dot(a)<0?-1:1);sum.x+=a.x*w;sum.y+=a.y*w;sum.z+=a.z*w;sum.w+=a.w*w;}return new T.Quaternion(sum.x,sum.y,sum.z,sum.w).normalize();});}
 }
 function sampleBone(c,e,t,amplitude,out){read(c,e.name,t,out);const correction=c.corrections[e.name];if(correction){const f=T.MathUtils.clamp(t*c.fps,0,correction.length-1),i=Math.floor(f);q.copy(correction[i]).slerp(correction[Math.min(i+1,correction.length-1)],f-i);out.premultiply(q);}return out;}
 const accentQ=new T.Quaternion(),accentDir=new T.Vector3(),accentTarget=new T.Vector3(),accentRest=new T.Vector3(),accentX=new T.Vector3(1,0,0);
 function powerAccents(variant,sample){
  const drive=T.MathUtils.smoothstep(sample.energy??0,.63,.9);
  if(!drive)return;
  const human=variant.vrm.humanoid,phase=sample.beatPhase??0;
  // Continuous beat compression, rather than an arbitrary per-frame pose impulse.
  const pulse=Math.pow(.5+.5*Math.cos(2*Math.PI*phase),2),strength=drive*(.45+.55*pulse);
  for(const side of ['left','right']){
   const sign=side==='left'?1:-1,arm=human.getNormalizedBoneNode(side+'UpperArm');
   accentRest.set(sign,0,0);accentDir.copy(accentRest).applyQuaternion(arm.quaternion);
   accentTarget.copy(accentDir);accentTarget.x+=sign*.14*strength;accentTarget.normalize();
   accentQ.setFromUnitVectors(accentDir,accentTarget);arm.quaternion.premultiply(accentQ);
   const thigh=human.getNormalizedBoneNode(side+'UpperLeg');
   accentRest.set(0,-1,0);accentDir.copy(accentRest).applyQuaternion(thigh.quaternion);
   accentTarget.copy(accentDir);accentTarget.x+=sign*.045*strength;accentTarget.normalize();
   accentQ.setFromUnitVectors(accentDir,accentTarget);thigh.quaternion.premultiply(accentQ);
   const knee=human.getNormalizedBoneNode(side+'LowerLeg');
   accentQ.setFromAxisAngle(accentX,drive*pulse*.11);knee.quaternion.premultiply(accentQ);
  }
  const spine=human.getNormalizedBoneNode('spine');accentQ.setFromAxisAngle(accentX,drive*pulse*.045);spine.quaternion.multiply(accentQ);
 }
 const a=new T.Quaternion(),b=new T.Quaternion();
 const sharedPose=bank.bones.map(()=>new T.Quaternion());let sharedSample=null,sharedBob=0;
 function apply(variant,sample){
  // These native exports have identical normalized humanoid proportions/axes.
  // Evaluate source blending and constraints once; donors retain their own hips
  // origin and spring/helper chains while receiving the same normalized pose.
  if(variant!==master&&sharedSample===sample){
   const hips=variant.vrm.humanoid.getNormalizedBoneNode('hips');hips.position.copy(variant.baseHips);hips.position.y+=sharedBob;
   for(const e of variant.entries)e.bone.quaternion.copy(sharedPose[e.index]);
   variant.vrm.scene.updateMatrixWorld(true);return;
  }
  const layers=sample.layers.filter(l=>clips.has(l.clip)&&l.weight>0);if(!layers.length)throw Error('Không tìm thấy điệu nhảy');const h=variant.vrm.humanoid.getNormalizedBoneNode('hips');h.position.copy(variant.baseHips);let total=0,bob=0;for(const l of layers){const f=frame(clips.get(l.clip),l.time);bob+=T.MathUtils.lerp(f.a.p?.[1]||0,f.b.p?.[1]||0,f.u)*l.weight;total+=l.weight;}h.position.y+=bob/total;for(const e of variant.entries){let weight=0;for(const l of layers){sampleBone(clips.get(l.clip),e,l.time,sample.amplitude??1,b);if(!weight)a.copy(b);else a.slerp(b,l.weight/(weight+l.weight));weight+=l.weight;}e.bone.quaternion.copy(a);}powerAccents(variant,sample);variant.vrm.scene.updateMatrixWorld(true);stabilizeHead(variant.vrm);constrainElbows(variant.vrm);if(variant===master){sharedSample=sample;sharedBob=h.position.y-variant.baseHips.y;for(const e of variant.entries)sharedPose[e.index].copy(e.bone.quaternion);}}
 function root(sample){const p=[0,0,0];let total=0;for(const l of sample.layers){const c=clips.get(l.clip);if(!c||l.weight<=0)continue;const f=frame(c,l.time);for(let axis=0;axis<3;axis++)p[axis]+=T.MathUtils.lerp(f.a.p?.[axis]||0,f.b.p?.[axis]||0,f.u)*l.weight;total+=l.weight;}return p.map(x=>x/(total||1));}
 return{apply,root,clips,diagnostics:bank.clips.map(c=>({id:c.id,correctedFrames:c.correctedFrames,frames:c.frames.length}))};
}
