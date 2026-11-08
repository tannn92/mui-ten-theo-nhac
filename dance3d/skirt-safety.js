import * as T from 'three';

// A real skinned undershort covers the dark underwear printed on the donor body.
// It follows the existing hips/thigh weights and is visible only with this skirt.
export function addSkirtShorts(variant,requiredStyle=null){
 const source=variant.meshes.find(m=>[].concat(m.material).some(mat=>/Body.*SKIN/.test(mat.name)));if(!source)return;
 const hips=variant.vrm.humanoid.getRawBoneNode('hips').getWorldPosition(new T.Vector3()).applyMatrix4(source.matrixWorld.clone().invert());
 const geometry=source.geometry.clone(),p=geometry.attributes.position,n=geometry.attributes.normal,ix=geometry.index,indices=[],used=new Set();
 const hem=hips.y-.15;
 for(let i=0;i<ix.count;i+=3){const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(ids.every(id=>p.getY(id)>=hem&&p.getY(id)<=hips.y+.10)){indices.push(...ids);ids.forEach(id=>used.add(id));}}
 geometry.clearGroups();geometry.setIndex(indices);
 for(const id of used){const v=new T.Vector3().fromBufferAttribute(p,id).addScaledVector(new T.Vector3().fromBufferAttribute(n,id),.008);p.setXYZ(id,v.x,v.y,v.z);}p.needsUpdate=true;geometry.computeBoundingSphere();
 const material=new T.MeshToonMaterial({color:requiredStyle?'#f5f3f2':'#f4d5e3',emissive:requiredStyle?'#303030':'#4b303e',emissiveIntensity:.35,side:T.DoubleSide});
 const mesh=new T.SkinnedMesh(geometry,material);mesh.name=variant.spec.id+'_cream_undershorts';mesh.userData.requiredBottomStyle=requiredStyle;mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);mesh.bind(source.skeleton,source.bindMatrix);mesh.frustumCulled=false;source.parent.add(mesh);variant.parts.lower.push(mesh);variant.meshes.push(mesh);
}

// Limit excess spring excursion, not the authored hips/knee motion. The pinned
// three-vrm solver stores its simulated tail in center coordinates; synchronize
// it after a limit so the following frame does not rebound from an invalid tail.
export function limitSkirtSprings(vrm){
 for(const joint of vrm.springBoneManager?.joints||[]){
  if(!/Skirt/.test(joint.bone.name))continue;
  const rest=joint.bone.quaternion.clone(),update=joint.update.bind(joint),limit=Math.PI/9;
  joint.update=delta=>{
   update(delta);const angle=rest.angleTo(joint.bone.quaternion);if(angle<=limit)return;
   joint.bone.quaternion.slerp(rest,1-limit/angle);joint.bone.updateMatrix();joint.bone.updateWorldMatrix(false,false);
   joint.bone.localToWorld(joint._currentTail.copy(joint.initialLocalChildPosition)).applyMatrix4(joint._getMatrixWorldToCenter());joint._prevTail.copy(joint._currentTail);
  };
 }
}
