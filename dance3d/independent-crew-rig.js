import * as T from 'three';
import {VRMHumanoid,VRMSpringBoneManager,VRMSpringBoneJoint} from '@pixiv/three-vrm';
import {limitSkirtSprings} from './skirt-safety.js?v=1611.2031';
import {createCapturedMotion} from './captured-motion.js?v=1611.2031';

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
 const names=Object.keys(raw),rotation=new T.Quaternion(),rootTarget=new T.Vector3(),identity=new T.Quaternion();let armHook=null;// arm-collision
 let capture=null,index=new Map(),lastWeight=0,coverage=null,rootScale=[1,1,1],mirror=false,prevRootT=null;const lpRoot=new T.Vector3(),leadV=new T.Vector3(),offQ=new T.Quaternion(),UP=new T.Vector3(0,1,0);
 // Mirror (right side of a symmetric formation): swap left/right bones and reflect across the body's x=0 plane.
 const mirrorPartner=new Map(names.map(n=>[n,n.startsWith('left')&&raw['right'+n.slice(4)]?'right'+n.slice(4):n.startsWith('right')&&raw['left'+n.slice(5)]?'left'+n.slice(5):n])),mirrorTmp=new Map(names.map(n=>[n,new T.Quaternion()]));
 function setMeshes(selected){for(const m of meshes)m.visible=false;for(const original of selected){const copy=mapping.get(original);if(!copy?.isMesh)throw Error('Crew garment is not in donor rig');if(!copy.parent)mapping.get(original.parent)?.add(copy);copy.visible=true;}for(const m of meshes)if(!m.visible)m.removeFromParent();}
 function setMotion(data,moves,chart){coverage=data?.coverage??null;if(coverage){let end=-Infinity;for(const interval of coverage){if(!Array.isArray(interval)||interval.length!==2||!interval.every(Number.isFinite)||interval[0]<end||interval[1]<=interval[0]||interval[0]<data.t0||interval[1]>data.t0+data.duration+.001)throw Error('Invalid crew coverage intervals');end=interval[1];}}capture=data?.shared?data.shared:data?createCapturedMotion(data):null;index=new Map(capture?.boneNames.map((n,i)=>[n,i])||[]);if(capture&&!data?.shared&&!capture.setSong(moves,chart))throw Error('Crew track song identity mismatch');}
 // Centre rotation: per-window tracks [{t0,t1,cap}] (shared captured motions, already matched to the song): inside a window
 // (0.3 s fades) the pose and root move to that track (e.g. the member who kneels takes the kneeling member's track).
 let windows=[],detrend=null;function setRootDetrend(fn){detrend=typeof fn==='function'?fn:null;}// centre rotation: the slow travel of the shared track, removed (the formation path travels)
 function setWindows(list){windows=(list||[]).map(w=>({...w,index:new Map(w.cap.boneNames.map((n,i)=>[n,i]))}));}
 function update(t,fallback,ovr,leadRoot,arch=null,srcOff=null){// srcOff: centre rotation, the child's own path offset [x,y,z,yaw] (not the backups' to copy)
  const sampleTime=capture?.t0===0&&t<0?0:t,pose=capture?.sample(sampleTime);let weight=pose?.weight||0;if(coverage){const interval=coverage.find(([a,b])=>sampleTime>=a&&sampleTime<=b);if(!interval)weight=0;else{const [a,b]=interval,fade=Math.min(.25,(b-a)/2);weight*=(a===0?1:T.MathUtils.smoothstep(sampleTime,a,a+fade))*T.MathUtils.smoothstep(b-sampleTime,0,fade);}}lastWeight=weight;
  // Fallback uses the lead's normalized local pose, never its raw skeleton.
  for(const name of names){const target=humanoid.getNormalizedBoneNode(name),base=fallback?.getNormalizedBoneNode(name);if(base)target.quaternion.copy(base.quaternion);else target.quaternion.identity();const i=index.get(name);if(weight&&i!==undefined)target.quaternion.slerp(rotation.fromArray(pose.q,i*4),weight);}
  let wPose=null,wW=0;if(windows.length&&t!=null)for(const w of windows){if(t<w.t0-.3||t>w.t1+.3)continue;const ww=T.MathUtils.smoothstep(t,w.t0-.3,w.t0)*(1-T.MathUtils.smoothstep(t,w.t1,w.t1+.3)),p=w.cap.sample(t);if(!p||!(ww*p.weight>wW))continue;wW=ww*p.weight;wPose={p,index:w.index};}
  if(wPose)for(const name of names){const i=wPose.index.get(name);if(i!==undefined)humanoid.getNormalizedBoneNode(name)?.quaternion.slerp(rotation.fromArray(wPose.p.q,i*4),wW);}
  if(mirror){for(const name of names){const n=humanoid.getNormalizedBoneNode(name);if(n)mirrorTmp.get(name).copy(n.quaternion);}for(const name of names){const n=humanoid.getNormalizedBoneNode(name),q=mirrorTmp.get(mirrorPartner.get(name));if(n)n.quaternion.set(q.x,-q.y,-q.z,q.w);}}
  const ow=ovr?.o||0,om=ovr?.m||0;if(ow>0){for(const name of OV_BONES){if(ovr.keepArms&&ARM_BONES.has(name))continue;const n=humanoid.getNormalizedBoneNode(name);if(!n)continue;ovPose(name,false,0,ovS);if(om>0){ovPose(name,true,ovr.phase||0,ovW);ovS.slerp(ovW,om);}n.quaternion.slerp(ovS,ow);}}
  if(ovr?.face>0)for(const [name,q] of Object.entries(FACE_ARMS)){const n=humanoid.getNormalizedBoneNode(name);if(n)n.quaternion.slerp(faceQ.fromArray(q),ovr.face);}
  // Arch (How You Like That 2:13-2:18, crew spec `arch`): the body settles to a standing pose leaning a little towards
  // the child, on tiptoe (arch.toe deg foot pitch + arch.lift m), arms set below by IK on the raw bones; a track that turns
  // away there no longer shows.
  const aw=arch?.w||0;if(aw>0){for(const name of ARCH_BODY){const n=humanoid.getNormalizedBoneNode(name);if(!n)continue;ovPose(name,false,0,ovS);if(name==='spine'||name==='chest'){ovE.set((arch.lean||0)*.5*DEG,0,0,'XYZ');ovS.multiply(archQ.setFromEuler(ovE));}else if((name==='leftFoot'||name==='rightFoot')&&arch.toe){ovE.set(arch.toe*DEG,0,0,'XYZ');ovS.multiply(archQ.setFromEuler(ovE));}n.quaternion.slerp(ovS,aw);}}
  if(armHook)armHook(humanoid,1-aw);// arm-collision (arch: fades out under the arch IK)
  const hips=humanoid.getNormalizedBoneNode('hips');hips.position.copy(baseHips);humanoid.update();
  model.position.copy(source.vrm.scene.position);model.quaternion.copy(source.vrm.scene.quaternion);if(srcOff){model.position.x-=srcOff[0];model.position.y-=srcOff[1];model.position.z-=srcOff[2];if(srcOff[3])model.quaternion.premultiply(offQ.setFromAxisAngle(UP,-srcOff[3]));}
  // Root: the own track where it covers, else the lead's root (so hip sway, bounce and squats follow the copied pose).
  // Fast hip motion (sway, pops) stays full size; only slow travel is scaled by rootScale, keeping the formation spot.
  const lw=leadRoot&&weight<1?1-weight:0;
  if((pose&&weight)||lw||wPose){if(pose&&weight)rootTarget.fromArray(pose.root).multiplyScalar(weight);else rootTarget.set(0,0,0);if(lw)rootTarget.addScaledVector(leadV.fromArray(leadRoot),lw);if(wPose){const k=Math.min(1,weight+lw);rootTarget.y+=(wPose.p.root[1]*(k>0?k:1)-rootTarget.y)*wW;}// window track: its height only (kneel, crouch); its x/z travel belongs to another spot
   if(detrend&&t!=null){const d=detrend(t),k=Math.min(1,weight+lw);rootTarget.x-=d[0]*k;rootTarget.z-=d[1]*k;}const rdt=prevRootT==null||t==null?NaN:t-prevRootT;prevRootT=t;if(!(rdt>=0&&rdt<.3))lpRoot.copy(rootTarget);else lpRoot.lerp(rootTarget,1-Math.exp(-rdt/.6));
   rootTarget.x=lpRoot.x*rootScale[0]+(rootTarget.x-lpRoot.x);rootTarget.z=lpRoot.z*rootScale[2]+(rootTarget.z-lpRoot.z);if(mirror)rootTarget.x=-rootTarget.x;
   rootTarget.y+=source.restOffset||0;model.position.lerp(rootTarget,Math.min(1,weight+lw+wW));model.quaternion.slerp(identity,weight);}if(ow>0){rootTarget.copy(source.vrm.scene.position);if(srcOff){rootTarget.x-=srcOff[0];rootTarget.y-=srcOff[1];rootTarget.z-=srcOff[2];}rootTarget.y+=.012*om*(1+Math.cos(2*(ovr.phase||0)))/2;model.position.lerp(rootTarget,ow);model.quaternion.slerp(identity,ow);}
  if(aw>0){rootTarget.set(0,(source.restOffset||0)+(arch.lift||0)+.006*Math.sin((t||0)*Math.PI*130.4/60),0);model.position.lerp(rootTarget,aw);model.quaternion.slerp(identity,aw);model.updateWorldMatrix(true,true);
   for(const k of [0,1])armIK(k?'right':'left',arch.hands[k],arch.pole,aw);}
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
 // Two-bone IK on the raw arm bones (world space): the wrist goes to target, the elbow bends towards pole; blended by w.
 const ARCH_BODY=['hips','spine','chest','upperChest','neck','head','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot','leftToes','rightToes'].filter(n=>raw[n]),archQ=new T.Quaternion();
 const iS=new T.Vector3(),iE=new T.Vector3(),iH=new T.Vector3(),iT=new T.Vector3(),iU=new T.Vector3(),iN=new T.Vector3(),iE2=new T.Vector3(),iA=new T.Vector3(),iB=new T.Vector3(),iq=new T.Quaternion(),iw=new T.Quaternion(),ip=new T.Quaternion(),il=new T.Quaternion();
 function turnBone(node,from,to,w){iq.setFromUnitVectors(from,to);node.getWorldQuaternion(iw);iw.premultiply(iq);node.parent.getWorldQuaternion(ip);il.copy(ip.invert()).multiply(iw);node.quaternion.slerp(il,w);node.updateWorldMatrix(false,true);}
 function armIK(side,target,pole,w){const up=raw[side+'UpperArm']?.node,lo=raw[side+'LowerArm']?.node,ha=raw[side+'Hand']?.node;if(!up||!lo||!ha||!target)return;
  up.getWorldPosition(iS);lo.getWorldPosition(iE);ha.getWorldPosition(iH);const a=iS.distanceTo(iE),b=iE.distanceTo(iH);iU.subVectors(target,iS);const d=T.MathUtils.clamp(iU.length(),Math.abs(a-b)+1e-3,a+b-1e-3);iU.normalize();iT.copy(iS).addScaledVector(iU,d);
  iN.subVectors(pole||iE,iS);iN.addScaledVector(iU,-iN.dot(iU));if(iN.lengthSq()<1e-8)iN.set(0,-1,0).addScaledVector(iU,-iU.y);iN.normalize();
  const c=T.MathUtils.clamp((a*a+d*d-b*b)/(2*a*d),-1,1);iE2.copy(iS).addScaledVector(iU,a*c).addScaledVector(iN,a*Math.sqrt(1-c*c));
  turnBone(up,iA.subVectors(iE,iS).normalize(),iB.subVectors(iE2,iS).normalize(),w);
  lo.getWorldPosition(iE);ha.getWorldPosition(iH);turnBone(lo,iA.subVectors(iH,iE).normalize(),iB.subVectors(iT,iE).normalize(),w);}
 function setArmCollision(fn){armHook=typeof fn==='function'?fn:null;}// arm-collision
 function setMirror(v){mirror=!!v;}
 function setRootScale(v){rootScale=Array.isArray(v)&&v.length===3&&v.every(Number.isFinite)?v:[1,1,1];}
 return{root,model,humanoid,meshes,mapping,springs,setMeshes,setMotion,setWindows,setRootDetrend,setRootScale,setMirror,setArmCollision,update,diagnostics(){const hw=humanoid.getRawBoneNode('hips')?.getWorldPosition(new T.Vector3());return{independentBones:true,mirror,hipsWorld:hw?hw.toArray():null,springJoints:springs.joints.size,springHz:30,weight:lastWeight,matched:capture?.matched||false,meshCount:meshes.filter(m=>m.visible).length,sharedGeometry:meshes.every(m=>originals.some(o=>o.isMesh&&o.geometry===m.geometry))};},dispose(){for(const s of skeletons.values())s.dispose();root.removeFromParent();}};
}
