// Preview-only head proportion adapter. Must run before spring update, after
// humanoid update; all garment construction must still use original rest pose.
const state=new WeakMap();
// Neck (owner 2026-11-16 "nhân vật cổ hình như đang ko đáng kể, đâm ra tỉ lệ hơi dị"; he chose +1 cm, reports/neck/): the
// chibi head was enlarged around the head joint, so the chin reached the neck base and hid the neck. Every applyHeadScale
// call also sets the head bone NECK_LIFT higher along its neck: the raw bone (skin, face, hair and hats follow it) and the
// normalized one (face-safety and arm checks read it). It always starts from the unlifted position kept in
// userData.neckBase; clones copy userData, so a crew/partner clone of a lifted donor is re-lifted from the same base, never
// twice. Garments are still sewn at the captured rest pose (lazy-styles restore), so collars stay put and the neck skin
// stretches between the neck and head bones. Set once from config.neckLift (runtime.js) before any rig is cloned.
let NECK_LIFT=0;
export function setNeckLift(m){NECK_LIFT=Number.isFinite(m)?Math.min(.05,Math.max(0,m)):0;}
export const neckLift=()=>NECK_LIFT;
// The rest poses are lifted too: independent crew rigs reset every bone to the donor's rawRestPose before building their own
// normalized rig (independent-crew-rig.js), and resetRawPose/resetNormalizedPose must not drop the head back down.
function lift(node,rest){if(!node)return;const b=node.userData.neckBase||(node.userData.neckBase=node.position.toArray());node.position.fromArray(b);node.position.y+=NECK_LIFT;if(rest?.position)node.position.toArray(rest.position);}
// aspect (optional [x,y,z], each .85–1.15): a head shape on top of the size, e.g. a narrower and longer head (Quang Hùng,
// owner 2026-11-10 "khuôn mặt thuôn hơi dài"); face, hair and hat on the head bone all follow it.
export function applyHeadScale(vrm,scale=1,aspect=null){
 if(!(scale>=.75&&scale<=1))throw Error('Preview head scale outside tested bounds');
 const a=Array.isArray(aspect)&&aspect.length===3&&aspect.every(v=>v>=.85&&v<=1.15)?aspect:[1,1,1],key=scale+'|'+a.join(',')+'|'+NECK_LIFT;
 const head=vrm.humanoid.getRawBoneNode('head');if(!head)return;
 let s=state.get(head);if(!s){const inherited=head.userData.previewHeadScaleBase;const below=node=>{for(let n=node;n;n=n.parent)if(n===head)return true;return false;},colliders=[],joints=[];const seen=new Set();
 for(const group of vrm.springBoneManager?.colliderGroups||[])for(const c of group.colliders||[]){if(!below(c)||seen.has(c))continue;seen.add(c);const original=c.shape,copy=Object.assign(Object.create(Object.getPrototypeOf(original)),original);c.shape=copy;colliders.push({shape:copy,radius:inherited?.colliderRadii[colliders.length]??original.radius});}
 for(const joint of vrm.springBoneManager?.joints||[]){if(!below(joint.bone))continue;const settings={...joint.settings};joint.settings=settings;joints.push({settings,radius:inherited?.jointRadii[joints.length]??settings.hitRadius});}
 const base=head.scale.clone();if(inherited)base.fromArray(inherited.scale);head.userData.previewHeadScaleBase={scale:base.toArray(),colliderRadii:colliders.map(c=>c.radius),jointRadii:joints.map(j=>j.radius)};s={base,colliders,joints,scale:null};state.set(head,s);}
 if(s.key===key)return;s.key=key;s.scale=scale;head.scale.copy(s.base).multiplyScalar(scale);head.scale.x*=a[0];head.scale.y*=a[1];head.scale.z*=a[2];
 // A normalized rig built from an already lifted raw rest (independent crew rigs) starts lifted: its base is its position
 // minus the raw head's current lift, so the lift below stays single.
 const nh=vrm.humanoid.getNormalizedBoneNode?.('head');if(nh&&!nh.userData.neckBase){const rb=head.userData.neckBase,cur=rb?head.position.y-rb[1]:0;nh.userData.neckBase=[nh.position.x,nh.position.y-cur,nh.position.z];}
 lift(head,vrm.humanoid.rawRestPose?.head);lift(nh,vrm.humanoid.normalizedRestPose?.head);
 for(const c of s.colliders)if(Number.isFinite(c.radius))c.shape.radius=c.radius*scale;
 for(const j of s.joints)if(Number.isFinite(j.radius))j.settings.hitRadius=j.radius*scale;
 vrm.scene.updateMatrixWorld(true);vrm.springBoneManager?.reset();
 return{colliders:s.colliders.length,joints:s.joints.length};
}
