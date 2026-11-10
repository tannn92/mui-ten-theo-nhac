// Preview-only head proportion adapter. Must run before spring update, after
// humanoid update; all garment construction must still use original rest pose.
const state=new WeakMap();
export function applyHeadScale(vrm,scale=1){
 if(!(scale>=.75&&scale<=1))throw Error('Preview head scale outside tested bounds');
 const head=vrm.humanoid.getRawBoneNode('head');if(!head)return;
 let s=state.get(head);if(!s){const inherited=head.userData.previewHeadScaleBase;const below=node=>{for(let n=node;n;n=n.parent)if(n===head)return true;return false;},colliders=[],joints=[];const seen=new Set();
 for(const group of vrm.springBoneManager?.colliderGroups||[])for(const c of group.colliders||[]){if(!below(c)||seen.has(c))continue;seen.add(c);const original=c.shape,copy=Object.assign(Object.create(Object.getPrototypeOf(original)),original);c.shape=copy;colliders.push({shape:copy,radius:inherited?.colliderRadii[colliders.length]??original.radius});}
 for(const joint of vrm.springBoneManager?.joints||[]){if(!below(joint.bone))continue;const settings={...joint.settings};joint.settings=settings;joints.push({settings,radius:inherited?.jointRadii[joints.length]??settings.hitRadius});}
 const base=head.scale.clone();if(inherited)base.fromArray(inherited.scale);head.userData.previewHeadScaleBase={scale:base.toArray(),colliderRadii:colliders.map(c=>c.radius),jointRadii:joints.map(j=>j.radius)};s={base,colliders,joints,scale:null};state.set(head,s);}
 if(s.scale===scale)return;s.scale=scale;head.scale.copy(s.base).multiplyScalar(scale);
 for(const c of s.colliders)if(Number.isFinite(c.radius))c.shape.radius=c.radius*scale;
 for(const j of s.joints)if(Number.isFinite(j.radius))j.settings.hitRadius=j.radius*scale;
 vrm.scene.updateMatrixWorld(true);vrm.springBoneManager?.reset();
 return{colliders:s.colliders.length,joints:s.joints.length};
}
