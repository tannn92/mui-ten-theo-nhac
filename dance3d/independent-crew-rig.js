import * as T from 'three';
import {VRMHumanoid,VRMSpringBoneManager,VRMSpringBoneJoint} from '@pixiv/three-vrm';
import {limitSkirtSprings} from './skirt-safety.js?v=0911.1652';
import {createCapturedMotion} from './captured-motion.js?v=0911.1652';

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
  if(original.morphTargetInfluences)copy.morphTargetInfluences=[...original.morphTargetInfluences];
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
 const names=Object.keys(raw),rotation=new T.Quaternion(),rootTarget=new T.Vector3(),identity=new T.Quaternion();let capture=null,index=new Map(),lastWeight=0,coverage=null,rootScale=[1,1,1],mirror=false;
 // Mirror (right side of a symmetric formation): swap left/right bones and reflect across the body's x=0 plane.
 const mirrorPartner=new Map(names.map(n=>[n,n.startsWith('left')&&raw['right'+n.slice(4)]?'right'+n.slice(4):n.startsWith('right')&&raw['left'+n.slice(5)]?'left'+n.slice(5):n])),mirrorTmp=new Map(names.map(n=>[n,new T.Quaternion()]));
 function setMeshes(selected){for(const m of meshes)m.visible=false;for(const original of selected){const copy=mapping.get(original);if(!copy?.isMesh)throw Error('Crew garment is not in donor rig');if(!copy.parent)mapping.get(original.parent)?.add(copy);copy.visible=true;}for(const m of meshes)if(!m.visible)m.removeFromParent();}
 function setMotion(data,moves,chart){coverage=data?.coverage??null;if(coverage){let end=-Infinity;for(const interval of coverage){if(!Array.isArray(interval)||interval.length!==2||!interval.every(Number.isFinite)||interval[0]<end||interval[1]<=interval[0]||interval[0]<data.t0||interval[1]>data.t0+data.duration+.001)throw Error('Invalid crew coverage intervals');end=interval[1];}}capture=data?createCapturedMotion(data):null;index=new Map(capture?.boneNames.map((n,i)=>[n,i])||[]);if(capture&&!capture.setSong(moves,chart))throw Error('Crew track song identity mismatch');}
 function update(t,fallback){
  const sampleTime=capture?.t0===0&&t<0?0:t,pose=capture?.sample(sampleTime);let weight=pose?.weight||0;if(coverage){const interval=coverage.find(([a,b])=>sampleTime>=a&&sampleTime<=b);if(!interval)weight=0;else{const [a,b]=interval,fade=Math.min(.25,(b-a)/2);weight*=(a===0?1:T.MathUtils.smoothstep(sampleTime,a,a+fade))*T.MathUtils.smoothstep(b-sampleTime,0,fade);}}lastWeight=weight;
  // Fallback uses the lead's normalized local pose, never its raw skeleton.
  for(const name of names){const target=humanoid.getNormalizedBoneNode(name),base=fallback?.getNormalizedBoneNode(name);if(base)target.quaternion.copy(base.quaternion);else target.quaternion.identity();const i=index.get(name);if(weight&&i!==undefined)target.quaternion.slerp(rotation.fromArray(pose.q,i*4),weight);}
  if(mirror){for(const name of names){const n=humanoid.getNormalizedBoneNode(name);if(n)mirrorTmp.get(name).copy(n.quaternion);}for(const name of names){const n=humanoid.getNormalizedBoneNode(name),q=mirrorTmp.get(mirrorPartner.get(name));if(n)n.quaternion.set(q.x,-q.y,-q.z,q.w);}}
  const hips=humanoid.getNormalizedBoneNode('hips');hips.position.copy(baseHips);humanoid.update();
  model.position.copy(source.vrm.scene.position);model.quaternion.copy(source.vrm.scene.quaternion);
  if(pose&&weight){rootTarget.fromArray(pose.root);rootTarget.x*=mirror?-rootScale[0]:rootScale[0];rootTarget.z*=rootScale[2];rootTarget.y+=source.restOffset||0;model.position.lerp(rootTarget,weight);model.quaternion.slerp(identity,weight);}
  model.updateWorldMatrix(true,true);const dt=previousTime==null?0:t-previousTime,seek=previousTime==null||dt<0||dt>.15;previousTime=t;if(seek){springs.reset();springAccumulator=0;}else{springAccumulator+=Math.max(0,dt);if(springAccumulator>=1/30-1e-6){springs.update(Math.min(.05,springAccumulator));springAccumulator=0;}}model.updateMatrixWorld(true);return weight;
 }
 // Backups keep their formation spot: scale the captured sideways/forward travel (bounce and kneel height stay).
 function setMirror(v){mirror=!!v;}
 function setRootScale(v){rootScale=Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)?v:[1,1,1];}
 return{root,model,humanoid,meshes,mapping,setMeshes,setMotion,setRootScale,setMirror,update,diagnostics(){return{independentBones:true,mirror,springJoints:springs.joints.size,springHz:30,weight:lastWeight,matched:capture?.matched||false,meshCount:meshes.filter(m=>m.visible).length,sharedGeometry:meshes.every(m=>originals.some(o=>o.isMesh&&o.geometry===m.geometry))};},dispose(){for(const s of skeletons.values())s.dispose();root.removeFromParent();}};
}
