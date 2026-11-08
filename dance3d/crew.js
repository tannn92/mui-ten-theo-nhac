import * as T from 'three';

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
 const point=new T.Vector3(),bonePoint=new T.Vector3();let visible=false,lastTime=null;
 function update(show,t,aspect){
  visible=!!show;group.visible=visible;lastTime=t;
  // Landscape iPad keeps the authored spacing. Narrow windows pull the row
  // inward instead of losing the outer two dancers beyond the camera edges.
  const spacing=Math.min(1,Math.max(.44,aspect/.95));
  for(const dancer of dancers)dancer.root.position.x=dancer.spec.x*spacing;
  group.updateMatrixWorld(true);
 }
 function diagnostics(){return{count:dancers.length,visible,sharedSkinning:true,outlinePass:false,time:lastTime,dancers:dancers.map(d=>{
  d.source.vrm.humanoid.getRawBoneNode('leftHand').getWorldPosition(bonePoint);
  point.copy(bonePoint).applyMatrix4(d.root.matrixWorld);
  return{index:d.index,variant:d.spec.variant,scale:d.spec.scale,position:d.root.position.toArray(),handWorld:point.toArray(),feetWorld:['left','right'].map(side=>d.source.vrm.humanoid.getRawBoneNode(side+'Foot').getWorldPosition(new T.Vector3()).applyMatrix4(d.root.matrixWorld).toArray()),meshes:d.meshes.length,
   sharedGeometry:d.meshes.every((m,i)=>m.geometry===d.source.meshes.filter(x=>x.isSkinnedMesh)[i].geometry),
   sharedSkeleton:d.meshes.every((m,i)=>m.skeleton===d.source.meshes.filter(x=>x.isSkinnedMesh)[i].skeleton)};
 })};}
 return{update,diagnostics,group,dancers};
}
