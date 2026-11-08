import * as T from 'three';

// Small, original mesh accessories. They follow the avatar's real raw bones;
// no second animation clock, spring simulation or face-covering attachment.
export function createAccessories(vrm,choices){
 const head=vrm.humanoid.getRawBoneNode('head');vrm.scene.updateMatrixWorld(true);
 const bounds=new T.Box3();let count=0;
 vrm.scene.traverse(mesh=>{if(!mesh.isSkinnedMesh||![].concat(mesh.material).some(m=>/Face.*SKIN/i.test(m?.name||'')))return;
  const p=mesh.geometry.attributes.position,ids=mesh.geometry.index?new Set(mesh.geometry.index.array):Array.from({length:p.count},(_,i)=>i);
  for(const i of ids){const v=new T.Vector3().fromBufferAttribute(p,i);mesh.applyBoneTransform(i,v);mesh.localToWorld(v);head.worldToLocal(v);bounds.expandByPoint(v);count++;}
 });
 if(!count){bounds.min.set(-.12,0,-.08);bounds.max.set(.12,.27,.10);}
 const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
 const ramp=new T.DataTexture(new Uint8Array([115,180,230,255]),4,1,T.RedFormat);ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=T.NearestFilter;
 const material=color=>new T.MeshToonMaterial({color,gradientMap:ramp});
 const powder=material('#e996bc'),rose=material('#dc6ca7'),cream=material('#fff4db'),dark=material('#5a385d'),gold=material('#eac061'),mint=material('#79c7b4');
 const records=choices.map((choice,index)=>({...choice,index,roots:[],meshes:[]}));
 function group(record,bone){const root=new T.Group();root.name='cosmetic_'+record.id;root.userData.cosmetic=true;bone.add(root);record.roots.push(root);return root;}
 function add(record,parent,geometry,mat,position=[0,0,0],scale=[1,1,1]){const mesh=new T.Mesh(geometry,mat);mesh.name='cosmetic_'+record.id+'_'+record.meshes.length;mesh.position.fromArray(position);mesh.scale.fromArray(scale);mesh.userData.cosmetic=true;mesh.userData.accessory=record.id;mesh.frustumCulled=false;parent.add(mesh);record.meshes.push(mesh);return mesh;}
 const sphere=new T.SphereGeometry(1,20,14);
 for(const record of records){
  if(record.id==='none')continue;
  if(record.id==='headphones'){
   const root=group(record,head),rx=size.x*.5+.025,cy=center.y+.015,ry=size.y*.54+.04,z=center.z;
   const points=Array.from({length:25},(_,i)=>{const a=i/24*Math.PI;return new T.Vector3(Math.cos(a)*rx,cy+Math.sin(a)*ry,z);});
   add(record,root,new T.TubeGeometry(new T.CatmullRomCurve3(points),48,.009,8,false),rose);
   for(const side of [-1,1]){add(record,root,sphere,dark,[center.x+side*rx,cy,z],[.022,.052,.037]);add(record,root,sphere,rose,[center.x+side*(rx+.013),cy,z],[.014,.044,.032]);add(record,root,sphere,cream,[center.x+side*(rx+.024),cy,z],[.004,.021,.018]);}
  }else if(record.id==='bow'){
   const rose=powder;
   const root=group(record,head);root.position.set(center.x,bounds.max.y+.045,center.z+.055);root.rotation.z=.12;
   const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(.025,.018,.056,.044,.069,.031);shape.bezierCurveTo(.081,.020,.077,-.024,.065,-.030);shape.bezierCurveTo(.046,-.036,.023,-.014,0,0);
   const wing=new T.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2,steps:1,curveSegments:8});
   add(record,root,wing,rose);add(record,root,wing,rose,[0,0,.012],[-1,1,-1]);add(record,root,sphere,gold,[0,0,.008],[.015,.018,.014]);
   for(const side of [-1,1]){const tail=new T.Shape();tail.moveTo(side*.005,-.007);tail.lineTo(side*.012,-.043);tail.lineTo(side*.027,-.033);tail.lineTo(side*.031,-.044);tail.lineTo(side*.028,-.010);tail.closePath();add(record,root,new T.ExtrudeGeometry(tail,{depth:.006,bevelEnabled:false}),rose,[0,0,-.004]);}
  }else if(record.id==='cowboy'){
   const rose=powder;
   const root=group(record,head);root.position.set(center.x,bounds.max.y+.055,center.z);root.rotation.z=-.08;root.userData.baseY=root.position.y;
   const brim=new T.SphereGeometry(1,32,12);const bp=brim.attributes.position;
   for(let i=0;i<bp.count;i++){const x=bp.getX(i);bp.setY(i,bp.getY(i)*.012+.035*Math.pow(Math.abs(x),3));bp.setX(i,x*(size.x*.68+.018));bp.setZ(i,bp.getZ(i)*(size.z*.70+.025));}brim.computeVertexNormals();
   add(record,root,brim,rose);add(record,root,new T.CylinderGeometry(.075,.095,.085,24),rose,[0,.037,0],[1,1,.85]);
   add(record,root,new T.CylinderGeometry(.094,.097,.018,24),cream,[0,.005,0],[1,1,.85]);
   add(record,root,sphere,gold,[0,.009,.083],[.012,.012,.004]);
  }else if(record.id==='bracelets'){
   for(const side of ['left','right']){const hand=vrm.humanoid.getRawBoneNode(side+'Hand'),arm=vrm.humanoid.getRawBoneNode(side+'LowerArm');const origin=hand.getWorldPosition(new T.Vector3()),direction=origin.clone().sub(arm.getWorldPosition(new T.Vector3())).normalize();const axis=hand.worldToLocal(origin.clone().add(direction)).normalize(),root=group(record,hand);
    for(const [i,mat] of [mint,gold,rose].entries()){const mesh=add(record,root,new T.TorusGeometry(.0195,.0034,8,24),mat,axis.clone().multiplyScalar((i-1)*.008-.009).toArray());mesh.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),axis);}
    const down=new T.Vector3(0,-1,0).applyQuaternion(hand.getWorldQuaternion(new T.Quaternion()).invert());add(record,root,sphere,gold,axis.clone().multiplyScalar(-.009).addScaledVector(down,.026).toArray(),[.006,.008,.006]);
   }
  }else throw new Error('Phụ kiện chưa được dựng: '+record.id);
 }
 function equip(index,hair=1){records.forEach(r=>r.meshes.forEach(m=>m.visible=r.index===index));const hat=records.find(r=>r.id==='cowboy')?.roots[0];if(hat){hat.position.y=hat.userData.baseY+(hair===0?-.045:0);hat.scale.set(hair===1?1.10:1,1,hair===1?1.07:1);}}
 equip(0);
 return{choices:records,equip,parts:records.flatMap(r=>r.meshes.map(mesh=>({slot:'accessory',variant:r.index,mesh}))),fit:{faceBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},faceVertices:count}};
}
