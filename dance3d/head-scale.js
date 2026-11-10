// Preview-only head proportion adapter. Must run before spring update, after
// humanoid update; all garment construction must still use original rest pose.
const state=new WeakMap();
// aspect (optional [x,y,z], each .85–1.15): a head shape on top of the size, e.g. a narrower and longer head (Quang Hùng,
// owner 2026-11-10 "khuôn mặt thuôn hơi dài"); face, hair and hat on the head bone all follow it.
export function applyHeadScale(vrm,scale=1,aspect=null){
 if(!(scale>=.75&&scale<=1))throw Error('Preview head scale outside tested bounds');
 const a=Array.isArray(aspect)&&aspect.length===3&&aspect.every(v=>v>=.85&&v<=1.15)?aspect:[1,1,1],key=scale+'|'+a.join(',');
 const head=vrm.humanoid.getRawBoneNode('head');if(!head)return;
 let s=state.get(head);if(!s){const inherited=head.userData.previewHeadScaleBase;const below=node=>{for(let n=node;n;n=n.parent)if(n===head)return true;return false;},colliders=[],joints=[];const seen=new Set();
 for(const group of vrm.springBoneManager?.colliderGroups||[])for(const c of group.colliders||[]){if(!below(c)||seen.has(c))continue;seen.add(c);const original=c.shape,copy=Object.assign(Object.create(Object.getPrototypeOf(original)),original);c.shape=copy;colliders.push({shape:copy,radius:inherited?.colliderRadii[colliders.length]??original.radius});}
 for(const joint of vrm.springBoneManager?.joints||[]){if(!below(joint.bone))continue;const settings={...joint.settings};joint.settings=settings;joints.push({settings,radius:inherited?.jointRadii[joints.length]??settings.hitRadius});}
 const base=head.scale.clone();if(inherited)base.fromArray(inherited.scale);head.userData.previewHeadScaleBase={scale:base.toArray(),colliderRadii:colliders.map(c=>c.radius),jointRadii:joints.map(j=>j.radius)};s={base,colliders,joints,scale:null};state.set(head,s);}
 if(s.key===key)return;s.key=key;s.scale=scale;head.scale.copy(s.base).multiplyScalar(scale);head.scale.x*=a[0];head.scale.y*=a[1];head.scale.z*=a[2];
 for(const c of s.colliders)if(Number.isFinite(c.radius))c.shape.radius=c.radius*scale;
 for(const j of s.joints)if(Number.isFinite(j.radius))j.settings.hitRadius=j.radius*scale;
 vrm.scene.updateMatrixWorld(true);vrm.springBoneManager?.reset();
 return{colliders:s.colliders.length,joints:s.joints.length};
}
