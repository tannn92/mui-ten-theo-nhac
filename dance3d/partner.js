import * as T from 'three';
import {createIndependentCrewRig} from './independent-crew-rig.js?v=1111.2211';
import {createDancerProfiles,resolveDancerProfile,dancerProfiles} from './dancer-profiles.js?v=1111.2211';
import {applyHeadScale} from './head-scale.js?v=1111.2211';
// Two-iPad play: the other player's dancer (owner 2026-11-10 "vũ công thứ 2 cũng y hệt thế, đa phần phân biệt nhau qua
// quần áo và mũi tên chỉ trên đầu"). The same child model in the other player's outfit, at the other front-row spot, with
// the child's exact pose, eyelids and mouth every frame. Built like the child herself (wardrobe.visibleParts): one
// independent rig per donor model the outfit uses (the face always comes from the master, variant 0), all posed the same.
// A full Rumi/Mira/Zoey set gives that character's face, as it does for the child.
const SLOTS=['hair','top','bottom','shoes','accessory'];
const POSE_BONES=['hips','spine','chest','neck','head','leftUpperArm','rightUpperArm','leftLowerArm','rightLowerArm','leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg'];
export function createPartner(scene,wardrobe,config){
 const group=new T.Group();group.name='duo-partner';group.visible=false;scene.add(group);
 let rigs=[],face=null,faceId='original',sel=null,spotX=0,scale=1,request=0,shown=false,faceMap=[],accessories=0;
 const v=new T.Vector3();
 // wardrobe option ids (what goes over the line) -> option indices on this iPad; an unknown id keeps the default item
 function selectionOf(ids){const out={};for(const slot of SLOTS){const list=wardrobe.options[slot]||[],i=list.findIndex(o=>o.id===ids?.[slot]);out[slot]=i>=0?i:(wardrobe.defaults?.[slot]??0);}return out;}
 function clear(){for(const r of rigs){r.rig.root.removeFromParent();try{r.rig.dispose?.();}catch(e){}}rigs=[];try{face?.dispose?.();}catch(e){}face=null;faceMap=[];accessories=0;}
 async function setOutfit(ids){
  const n=++request;
  if(!ids){clear();sel=null;faceId='original';return;}
  const s=selectionOf(ids);
  if(wardrobe.prepareOutfit)await wardrobe.prepareOutfit(s,{priority:100});   // sew first: a rig only copies meshes that exist
  if(n!==request)return;
  clear();sel=s;
  for(const [i,meshes] of wardrobe.visibleParts(s)){const rig=createIndependentCrewRig(wardrobe.variants[i]);rig.setMeshes(meshes);rig.setMotion(null,null,null);group.add(rig.root);rigs.push({i,rig});}
  rigs.sort((a,b)=>a.i-b.i);
  // The clones carry the child's head as it is right now (Mira's or Zoey's when she wears that set): every donor rig
  // starts from the plain head, then a character set gives ALL of them its head (face and hair stay the same size).
  const heads=rigs.map(r=>({humanoid:r.rig.humanoid,scene:r.rig.model,springBoneManager:r.rig.springs})),plain=dancerProfiles.find(q=>q.id==='original');
  for(const h of heads)applyHeadScale(h,plain.headScale,plain.headAspect);
  const faceRig=rigs.find(r=>r.i===0);faceId='original';
  if(!faceRig)return;
  const copies=wardrobe.variants[0].parts.face.map(m=>[m,faceRig.rig.mapping.get(m)]).filter(([,c])=>c);
  faceMap=copies.filter(([m,c])=>m.morphTargetInfluences&&c.morphTargetInfluences);
  faceId=resolveDancerProfile({selection:s,options:wardrobe.options,sets:config.sets})||'original';
  if(faceId!=='original'){try{face=createDancerProfiles({faceMeshes:copies.map(([,c])=>c),rigs:heads,initial:faceId});if(!face.supported){console.warn('partner face',face.reason);face=null;}}catch(e){console.warn('partner face',e);face=null;}}
  // accessories that are not sewn styles (headphones, bracelets, hat…) hang on the child's bones: copy them onto the partner's
  const acc=wardrobe.options.accessory?.[s.accessory];
  if(acc&&!acc.style)for(const root of wardrobe.accessories?.choices?.[s.accessory]?.roots||[]){
   const bone=faceRig.rig.model.getObjectByName(root.parent?.name);if(!bone)continue;
   const c=root.clone(true);c.traverse(o=>{if(o.isMesh)o.visible=true;});
   if(acc.id==='cowboy'&&Number.isFinite(c.userData.baseY)){c.position.y=c.userData.baseY+(s.hair===0?-.045:0);c.scale.set(s.hair===1?1.10:1,1,s.hair===1?1.07:1);}   // same fit rule as accessories.equip
   bone.add(c);accessories++;}
 }
 function setSpot(x,s=1){spotX=x;scale=s;}
 // after the child is posed for this frame. leadX = the child's own side offset; playing: heights apply only in a song
 function update(visible,clock,leadX,playing=true){
  shown=!!visible&&rigs.length>0;group.visible=shown;if(!shown)return;
  const s=playing?scale:1;
  for(const r of rigs){r.rig.root.position.set(spotX-s*leadX,0,0);r.rig.root.scale.setScalar(s);r.rig.update(clock,wardrobe.master.humanoid,null,null);}
  for(const [m,c] of faceMap){const a=m.morphTargetInfluences,b=c.morphTargetInfluences;for(let k=0;k<a.length&&k<b.length;k++)b[k]=a[k];}
 }
 function headScreen(camera,width,height){const head=rigs[0]?.rig.humanoid.getRawBoneNode('head');if(!shown||!head)return null;head.getWorldPosition(v);v.y+=.16*rigs[0].rig.root.scale.x;v.project(camera);return[(v.x+1)/2*width,(1-v.y)/2*height];}
 function diagnostics(){
  const r=rigs[0],hips=r?.rig.humanoid.getRawBoneNode('hips'),pose={};
  if(r)for(const n of POSE_BONES){const b=r.rig.humanoid.getNormalizedBoneNode(n);if(b)pose[n]=b.quaternion.toArray();}
  const eye=faceMap.find(([,c])=>c.morphTargetDictionary?.Fcl_EYE_Close!=null)?.[1];
  return{visible:shown,rigs:rigs.length,donors:rigs.map(x=>x.i),meshes:rigs.reduce((a,x)=>a+x.rig.meshes.filter(m=>m.visible).length,0),face:faceId,x:spotX,scale,hipsWorld:hips?hips.getWorldPosition(new T.Vector3()).toArray():null,pose,eyeClose:eye?eye.morphTargetInfluences[eye.morphTargetDictionary.Fcl_EYE_Close]:null,accessories};
 }
 return{setOutfit,setSpot,update,headScreen,diagnostics,selectionOf,dispose(){clear();group.removeFromParent();},get humanoid(){return rigs[0]?.rig.humanoid||null;},get visible(){return shown;},get selection(){return sel;}};
}
