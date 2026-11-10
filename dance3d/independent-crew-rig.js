import * as T from 'three';
import {VRMHumanoid,VRMSpringBoneManager,VRMSpringBoneJoint} from '@pixiv/three-vrm';
import {limitSkirtSprings} from './skirt-safety.js?v=1011.2112';
import {createCapturedMotion} from './captured-motion.js?v=1011.2112';

// A private bone hierarchy for one performer. Geometry/materials stay shared;
// never call VRMHumanoid.clone(), which keeps the source raw bone references.
export function createIndependentCrewRig(source){
 const root=new T.Group(),model=source.vrm.scene.clone(true),originals=[],clones=[],byName=new Map();
 root.name='independent-crew';root.add(model);model.position.set(0,0,0);model.quaternion.identity();model.scale.set(1,1,1);
 source.vrm.scene.traverse(o=>originals.push(o));model.traverse(o=>{clones.push(o);if(o.userData?.inverseCacheProxy)delete o.userData.inverseCacheProxy;if(o.isBone)byName.set(o.name,o);});
 if(originals.length!==clones.length)throw Error('Crew clone hierarchy mismatch');
 const mapping=new Map(originals.map((o,i)=>[o,clones[i]])),meshes=[],skeletons=new Map();
 for(let i=0;i<originals.length;i++){
  const original=originals[i],copy=clones[i];if(!original.isMesh)continue;
  copy.visible=false;copy.frustumCulled=false;copy.updateMatrix();copy.matrixAutoUpdate=false;
  // Neutral face (eyes open): never inherit the lead's live expression (a smile/blink caught at song start).
  if(original.morphTargetInfluences)copy.morphTargetInfluences=original.morphTargetInfluences.map(()=>0);
  if(original.isSkinnedMesh){
   let skeleton=skeletons.get(original.skeleton);
   if(!skeleton){const bones=original.skeleton.bones.map(b=>mapping.get(b)||byName.get(b.name));if(bones.some(b=>!b))throw Error('Crew rig is missing a skin bone');skeleton=new T.Skeleton(bones,original.skeleton.boneInverses.map(m=>m.clone()));skeletons.set(original.skeleton,skeleton);}
   copy.skeleton=skeleton;copy.bindMode='attached';copy.bindMatrix.copy(original.bindMatrix);copy.bindMatrixInverse.copy(original.bindMatrixInverse);
  }
  meshes.push(copy);
 }
 mapping.get(source.vrm.humanoid.normalizedHumanBonesRoot)?.removeFromParent();
 const raw={};for(const [name,{node}]of Object.entries(source.vrm.humanoid.rawHumanBones)){
  const copy=mapping.get(node);if(!copy)throw Error('Crew raw humanoid bone missing: '+name);
  const rest=source.vrm.humanoid.rawRestPose[name];if(rest?.position)copy.position.fromArray(rest.position);if(rest?.rotation)copy.quaternion.fromArray(rest.rotation);raw[name]={node:copy};
 }
 model.updateMatrixWorld(true);const humanoid=new VRMHumanoid(raw),baseHips=humanoid.getNormalizedBoneNode('hips').position.clone();
 // Normalized hips are world-sampled by VRMHumanoid.update. They must live
 // under the same actor transform or that update cancels the crew placement.
 model.add(humanoid.normalizedHumanBonesRoot);
 const springs=new VRMSpringBoneManager(),groups=new Map();
 for(const originalGroup of source.vrm.springBoneManager?.colliderGroups||[]){const colliders=originalGroup.colliders.map(o=>{const copy=mapping.get(o);if(!copy)throw Error('Crew spring collider missing');copy.shape=o.shape;return copy;});groups.set(originalGroup,{...originalGroup,colliders});}
 for(const original of source.vrm.springBoneManager?.joints||[]){const bone=mapping.get(original.bone),child=mapping.get(original.child)||null;if(!bone)throw Error('Crew spring bone missing');bone.quaternion.copy(original._initialLocalRotation);bone.updateMatrix();const joint=new VRMSpringBoneJoint(bone,child,original.settings,original.colliderGroups.map(g=>groups.get(g)));if(original.center)joint.center=mapping.get(original.center)||null;springs.addJoint(joint);}
 model.updateMatrixWorld(true);springs.setInitState();limitSkirtSprings({springBoneManager:springs});let previousTime=null,springAccumulator=0;
 const names=Object.keys(raw),rotation=new T.Quaternion(),rootTarget=new T.Vector3(),identity=new T.Quaternion();let capture=null,index=new Map(),lastWeight=0,coverage=null,rootScale=[1,1,1],mirror=false,prevRootT=null;const lpRoot=new T.Vector3(),leadV=new T.Vector3();
 // Mirror (right side of a symmetric formation): swap left/right bones and reflect across the body's x=0 plane.
 const mirrorPartner=new Map(names.map(n=>[n,n.startsWith('left')&&raw['right'+n.slice(4)]?'right'+n.slice(4):n.startsWith('right')&&raw['left'+n.slice(5)]?'left'+n.slice(5):n])),mirrorTmp=new Map(names.map(n=>[n,new T.Quaternion()]));
 function setMeshes(selected){for(const m of meshes)m.visible=false;for(const original of selected){const copy=mapping.get(original);if(!copy?.isMesh)throw Error('Crew garment is not in donor rig');if(!copy.parent)mapping.get(original.parent)?.add(copy);copy.visible=true;}for(const m of meshes)if(!m.visible)m.removeFromParent();}
 function setMotion(data,moves,chart){coverage=data?.coverage??null;if(coverage){let end=-Infinity;for(const interval of coverage){if(!Array.isArray(interval)||interval.length!==2||!interval.every(Number.isFinite)||interval[0]<end||interval[1]<=interval[0]||interval[0]<data.t0||interval[1]>data.t0+data.duration+.001)throw Error('Invalid crew coverage intervals');end=interval[1];}}capture=data?createCapturedMotion(data):null;index=new Map(capture?.boneNames.map((n,i)=>[n,i])||[]);if(capture&&!capture.setSong(moves,chart))throw Error('Crew track song identity mismatch');}
 function update(t,fallback,ovr,leadRoot){
  const sampleTime=capture?.t0===0&&t<0?0:t,pose=capture?.sample(sampleTime);let weight=pose?.weight||0;if(coverage){const interval=coverage.find(([a,b])=>sampleTime>=a&&sampleTime<=b);if(!interval)weight=0;else{const [a,b]=interval,fade=Math.min(.25,(b-a)/2);weight*=(a===0?1:T.MathUtils.smoothstep(sampleTime,a,a+fade))*T.MathUtils.smoothstep(b-sampleTime,0,fade);}}lastWeight=weight;
  // Fallback uses the lead's normalized local pose, never its raw skeleton.
  for(const name of names){const target=humanoid.getNormalizedBoneNode(name),base=fallback?.getNormalizedBoneNode(name);if(base)target.quaternion.copy(base.quaternion);else target.quaternion.identity();const i=index.get(name);if(weight&&i!==undefined)target.quaternion.slerp(rotation.fromArray(pose.q,i*4),weight);}
  if(mirror){for(const name of names){const n=humanoid.getNormalizedBoneNode(name);if(n)mirrorTmp.get(name).copy(n.quaternion);}for(const name of names){const n=humanoid.getNormalizedBoneNode(name),q=mirrorTmp.get(mirrorPartner.get(name));if(n)n.quaternion.set(q.x,-q.y,-q.z,q.w);}}
  const ow=ovr?.o||0,om=ovr?.m||0;if(ow>0){for(const name of OV_BONES){if(ovr.keepArms&&ARM_BONES.has(name))continue;const n=humanoid.getNormalizedBoneNode(name);if(!n)continue;ovPose(name,false,0,ovS);if(om>0){ovPose(name,true,ovr.phase||0,ovW);ovS.slerp(ovW,om);}n.quaternion.slerp(ovS,ow);}}
  if(ovr?.face>0)for(const [name,q] of Object.entries(FACE_ARMS)){const n=humanoid.getNormalizedBoneNode(name);if(n)n.quaternion.slerp(faceQ.fromArray(q),ovr.face);}
  const hips=humanoid.getNormalizedBoneNode('hips');hips.position.copy(baseHips);humanoid.update();
  model.position.copy(source.vrm.scene.position);model.quaternion.copy(source.vrm.scene.quaternion);
  // Root: the own track where it covers, else the lead's root (so hip sway, bounce and squats follow the copied pose).
  // Fast hip motion (sway, pops) stays full size; only slow travel is scaled by rootScale, keeping the formation spot.
  const lw=leadRoot&&weight<1?1-weight:0;
  if((pose&&weight)||lw){if(pose&&weight)rootTarget.fromArray(pose.root).multiplyScalar(weight);else rootTarget.set(0,0,0);if(lw)rootTarget.addScaledVector(leadV.fromArray(leadRoot),lw);
   const rdt=prevRootT==null||t==null?NaN:t-prevRootT;prevRootT=t;if(!(rdt>=0&&rdt<.3))lpRoot.copy(rootTarget);else lpRoot.lerp(rootTarget,1-Math.exp(-rdt/.6));
   rootTarget.x=lpRoot.x*rootScale[0]+(rootTarget.x-lpRoot.x);rootTarget.z=lpRoot.z*rootScale[2]+(rootTarget.z-lpRoot.z);if(mirror)rootTarget.x=-rootTarget.x;
   rootTarget.y+=source.restOffset||0;model.position.lerp(rootTarget,Math.min(1,weight+lw));model.quaternion.slerp(identity,weight);}if(ow>0){rootTarget.copy(source.vrm.scene.position);rootTarget.y+=.012*om*(1+Math.cos(2*(ovr.phase||0)))/2;model.position.lerp(rootTarget,ow);model.quaternion.slerp(identity,ow);}
  model.updateWorldMatrix(true,true);const dt=previousTime==null?0:t-previousTime,seek=previousTime==null||dt<0||dt>.15;previousTime=t;if(seek){springs.reset();springAccumulator=0;}else{springAccumulator+=Math.max(0,dt);if(springAccumulator>=1/30-1e-6){springs.update(Math.min(.05,springAccumulator));springAccumulator=0;}}model.updateMatrixWorld(true);return weight;
 }
 // Backups keep their formation spot: scale the captured sideways/forward travel (bounce and kneel height stay).
 // Walking / standing-ready poses (normalized local rotations) that replace the dance while a backup walks on/off stage
 // or waits for its cue. Euler XYZ: the arm first hangs (z), then swings (x) in the parent frame.
 // Paper up in front of the face (Secret 43.9-48.4, back row): normalized local arm rotations from make_groove_fallback.py
 // (2-bone IK on the VRM rest skeleton, wrists 0.12 m either side of the head, 0.24 m in front of it).
 const FACE_ARMS={leftShoulder:[0,0,0,1],rightShoulder:[0,0,0,1],leftUpperArm:[0,-.39366,-.026,.91889],leftLowerArm:[-.00005,-.48919,.41727,.76589],leftHand:[0,-.08716,0,.99619],
  rightUpperArm:[0,.39366,.026,.91889],rightLowerArm:[-.00005,.48919,-.41727,.76589],rightHand:[0,.08716,0,.99619]},faceQ=new T.Quaternion();
 const ARM_BONES=new Set(['leftShoulder','rightShoulder','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand']);
 const OV_BONES=['hips','spine','chest','upperChest','neck','head','leftShoulder','rightShoulder','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftHand','rightHand','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot','leftToes','rightToes'].filter(n=>raw[n]);
 const ovE=new T.Euler(),ovS=new T.Quaternion(),ovW=new T.Quaternion(),DEG=Math.PI/180;
 function ovPose(name,walk,ph,q){let x=0,y=0,z=0;
  if(name==='leftUpperArm')z=-73*DEG;else if(name==='rightUpperArm')z=73*DEG;else if(name==='leftLowerArm')y=-10*DEG;else if(name==='rightLowerArm')y=10*DEG;
  if(walk){const sn=Math.sin(ph),cs=Math.cos(ph),kl=32*DEG*Math.pow(Math.max(0,cs),1.3),kr=32*DEG*Math.pow(Math.max(0,-cs),1.3);
   if(name==='hips')y=4*DEG*sn;else if(name==='spine')y=-3*DEG*sn;else if(name==='leftUpperLeg')x=-24*DEG*sn;else if(name==='rightUpperLeg')x=24*DEG*sn;
   else if(name==='leftLowerLeg')x=kl;else if(name==='rightLowerLeg')x=kr;else if(name==='leftFoot')x=-.4*kl;else if(name==='rightFoot')x=-.4*kr;
   else if(name==='leftUpperArm')x=18*DEG*sn;else if(name==='rightUpperArm')x=-18*DEG*sn;else if(name==='leftLowerArm')y=-14*DEG;else if(name==='rightLowerArm')y=14*DEG;}
  ovE.set(x,y,z,'XYZ');return q.setFromEuler(ovE);}
 function setMirror(v){mirror=!!v;}
 function setRootScale(v){rootScale=Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)?v:[1,1,1];}
 return{root,model,humanoid,meshes,mapping,springs,setMeshes,setMotion,setRootScale,setMirror,update,diagnostics(){const hw=humanoid.getRawBoneNode('hips')?.getWorldPosition(new T.Vector3());return{independentBones:true,mirror,hipsWorld:hw?hw.toArray():null,springJoints:springs.joints.size,springHz:30,weight:lastWeight,matched:capture?.matched||false,meshCount:meshes.filter(m=>m.visible).length,sharedGeometry:meshes.every(m=>originals.some(o=>o.isMesh&&o.geometry===m.geometry))};},dispose(){for(const s of skeletons.values())s.dispose();root.removeFromParent();}};
}
