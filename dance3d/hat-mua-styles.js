import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function hatMuaOptions(){return Object.fromEntries(['top','bottom','shoes','accessory'].map(slot=>[slot,[{id:'hat-mua-1-'+slot,style:'hat-mua-1-'+slot,variant:1,label:{top:'Hạt Mưa 1 · Áo trắng bèo',bottom:'Hạt Mưa 1 · Váy hồng tầng',shoes:'Hạt Mưa 1 · Bốt trắng lông',accessory:'Hạt Mưa 1 · Mũ lông hồng'}[slot]}]]));}
export const hatMuaSets=[{id:'hat-mua-1',label:'Hạt Mưa · Bèo trắng hồng',selectionIds:{top:'hat-mua-1-top',bottom:'hat-mua-1-bottom',shoes:'hat-mua-1-shoes',accessory:'hat-mua-1-accessory'}}];
export function createHatMuaStyles(variants,options){
 const records=new Map(),parts=[],V=()=>new T.Vector3(),toon=c=>new T.MeshToonMaterial({color:c,side:T.DoubleSide});
 for(const slot of ['top','bottom','shoes','accessory'])for(const[index,opt]of(options[slot]||[]).entries()){
  if(!opt.style?.startsWith('hat-mua-1-'))continue;
  const donor=variants[opt.variant],body=donor.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),inv=body.matrixWorld.clone().invert(),bone=n=>donor.vrm.humanoid.getRawBoneNode(n),pos=n=>bone(n).getWorldPosition(V()).applyMatrix4(inv),hip=pos('hips'),neck=pos('neck');
  const rec={id:opt.id,index,slot,meshes:[]},white=toon('#ffffff'),pink=toon('#f3bfd3'),pale=toon('#ffe0ea'),furPink=toon('#e99cbe'),skin=toon('#fff1df');white.emissive.set('#ffffff');white.emissiveIntensity=.16;pink.emissive.set('#8b6477');pink.emissiveIntensity=.13;
  const trisOf=source=>{const p=source.geometry.attributes.position,ix=source.geometry.index,out=[];for(let i=0;i<ix.count;i+=3){const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];out.push({ids,t:new T.Triangle(...ids.map(id=>V().fromBufferAttribute(p,id)))});}return out;};
  const tris=trisOf(body),torso=tris.filter(t=>t.ids.every(i=>Math.abs(body.geometry.attributes.position.getX(i))<.145));
  function register(g,m,source=body){g.computeVertexNormals();g.computeBoundingSphere();const mesh=new T.SkinnedMesh(g,m);mesh.name=rec.id+'_'+rec.meshes.length;mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);mesh.bind(source.skeleton,source.bindMatrix);source.parent.add(mesh);mesh.visible=false;mesh.frustumCulled=false;rec.meshes.push(mesh);return mesh;}
  function surface(g,m,source=body,rigid=null){
   const si=[],sw=[],ts=source===body?tris:trisOf(source),p=g.attributes.position;let rigidIndex=-1;if(rigid)rigidIndex=source.skeleton.bones.findIndex(b=>b.name===bone(rigid).name);
   for(let i=0;i<p.count;i++){if(rigid){if(rigidIndex<0)throw Error('Missing '+rigid);si.push(rigidIndex,0,0,0);sw.push(1,0,0,0);continue;}
    const v=V().fromBufferAttribute(p,i);let best;for(const t of ts){const q=t.t.closestPointToPoint(v,V()),d=q.distanceToSquared(v);if(!best||d<best.d)best={...t,q,d};}
    const bary=best.t.getBarycoord(best.q,V()),w=new Map();best.ids.forEach((id,k)=>{for(let j=0;j<4;j++){const b=source.geometry.attributes.skinIndex.getComponent(id,j),x=source.geometry.attributes.skinWeight.getComponent(id,j)*bary.getComponent(k);w.set(b,(w.get(b)||0)+x);}});
    const list=[...w].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=list.reduce((s,x)=>s+x[1],0);for(let j=0;j<4;j++){si.push(list[j]?.[0]||0);sw.push((list[j]?.[1]||0)/sum);}
   }g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));return register(g,m,source);
  }
  function shell(test,m,offset=.009){const g=body.geometry.clone(),p=g.attributes.position,n=g.attributes.normal,ids=[];for(const t of tris)if(t.ids.every(id=>test(V().fromBufferAttribute(p,id))))ids.push(...t.ids);g.setIndex(ids);g.clearGroups();for(const id of new Set(ids)){const v=V().fromBufferAttribute(p,id).addScaledVector(V().fromBufferAttribute(n,id),offset);p.setXYZ(id,v.x,v.y,v.z);}return register(g,m);}
  function radial(y,a,region=tris){const c=Math.cos(a),s=Math.sin(a),o=V().set(c*.4,y,hip.z+s*.4),ray=new T.Ray(o,V().set(-c,0,-s));let hit;for(const t of region){const q=ray.intersectTriangle(t.t.a,t.t.b,t.t.c,false,V());if(q&&(!hit||q.distanceToSquared(o)<hit.distanceToSquared(o)))hit=q;}return hit?Math.max(.02,hit.x*c+(hit.z-hip.z)*s):.075;}
  function grid(rows,cols,point,m,source=body){const a=[],ix=[];for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++)a.push(...point(j/rows,k/cols).toArray());for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const i=j*(cols+1)+k;ix.push(i,i+1,i+cols+1,i+1,i+cols+2,i+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));g.setIndex(ix);return surface(g,m,source);}
  function puff(center,radii,m,rigid=null,seed=0){const g=new T.SphereGeometry(1,16,10),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=1+.18*Math.sin(x*31+y*17+seed)*Math.cos(z*29-y*13);p.setXYZ(i,center.x+x*radii.x*f,center.y+y*radii.y*f,center.z+z*radii.z*f);}return surface(g,m,body,rigid);}
  function cuff(side,joint,radius,m){const c=pos(side+joint),axis=pos(side+'Hand').sub(pos(side+'LowerArm')).normalize(),q=new T.Quaternion().setFromUnitVectors(V().set(0,1,0),axis);
   for(let i=0;i<18;i++){const a=i/18*Math.PI*2,d=V().set(Math.cos(a)*radius,0,Math.sin(a)*radius).applyQuaternion(q);puff(c.clone().add(d),V().set(.009,.012,.009),m,null,i);}
  }
  if(slot==='top'){
   // Exported blouse masks upper skin: restore connected shoulder/arm geometry.
   shell(v=>v.y>hip.y+.06&&v.y<neck.y-.004,skin,.0014);
   const hem=hip.y+.10,high=neck.y-.105;
   grid(14,64,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(hem,high,u),r=radial(y,a,torso)+.007;return V().set(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);},white);
   for(let layer=0;layer<3;layer++){const start=high-layer*(high-hem)/3;
    grid(6,64,(u,v)=>{const a=v*Math.PI*2,y=start-u*.045+.003*Math.cos(a*20)*u,r=radial(y,a,torso)+.010+u*(.018+.006*Math.sin(a*20));return V().set(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);},white);
   }
   for(const sign of [-1,1])grid(18,2,(u,v)=>{const y=T.MathUtils.lerp(high-.015,neck.y-.035,Math.sin(u*Math.PI)),x=sign*.064+(v-.5)*.012,z=hip.z+Math.cos(u*Math.PI)*.060;return V().set(x,y,z);},white);
   for(const side of ['left','right']){
    const wrist=pos(side+'Hand'),elbow=pos(side+'LowerArm'),axis=wrist.clone().sub(elbow).normalize();
    shell(v=>{const d=v.clone().sub(wrist),t=d.dot(axis);return t>-.027&&t<.065&&d.addScaledVector(axis,-t).length()<.065;},white,.004);
    cuff(side,'Hand',.025,white);
    const c=wrist.clone().add(V().set(0,.003,.031));for(const sign of [-1,1]){const g=new T.SphereGeometry(1,10,6);g.scale(.014,.008,.003);g.rotateZ(sign*.4);g.translate(c.x+sign*.012,c.y,c.z);surface(g,pink);}
   }
  }
  if(slot==='bottom'){
   for(const m of donor.parts.lower)if(/cream_undershorts/.test(m.name))m.userData.excludeHatMua=true;
   shell(v=>v.y>hip.y-.18&&v.y<hip.y+.11,pale,.012);
   const lining=toon('#ffe0ea');lining.polygonOffset=true;lining.polygonOffsetFactor=-2;lining.polygonOffsetUnits=-2;
   shell(v=>v.y>hip.y-.195&&v.y<hip.y+.115,lining,0);
   const skirtSource=donor.parts.bottom[0],waist=hip.y+.060;
   // Close fitted inner skirt supports three overlapping soft flounces.
   grid(16,80,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(waist,hip.y-.215,u),r=T.MathUtils.lerp(radial(waist,a)+.006,radial(hip.y-.025,a)+.013,T.MathUtils.smoothstep(u,0,.65));return V().set(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);},pink,skirtSource);
   for(let layer=0;layer<2;layer++){const top=waist-layer*.105,end=layer===0?hip.y-.105:hip.y-.218;
    grid(12,96,(u,v)=>{const a=v*Math.PI*2,q=Math.sin(u*Math.PI/2),wave=Math.sin(a*18+layer*.7),y=T.MathUtils.lerp(top,end,u)+.006*wave*u*u*u;
     const attach=layer===0?radial(waist,a)+.008:radial(hip.y-.025,a)+.006;
     const r=attach+(layer===0?.050:.040)*q+.008*wave*q;
     return V().set(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);},pink,skirtSource);
   }
  }
  if(slot==='shoes'){
   for(const source of donor.parts.shoes){const g=source.geometry.clone();g.clearGroups();register(g,white,source);}
   const knee=pos('leftLowerLeg'),foot=pos('leftFoot');
   shell(v=>v.y>foot.y+.035&&v.y<knee.y-.055,white,.009);
   for(const side of ['left','right']){
    const foot=pos(side+'Foot'),knee=pos(side+'LowerLeg'),c=foot.clone().lerp(knee,.76);
    for(let j=0;j<24;j++){const a=j/24*Math.PI*2;puff(c.clone().add(V().set(Math.cos(a)*.044,.006*Math.sin(j*2.4),Math.sin(a)*.040)),V().set(.010+.003*Math.sin(j*1.7),.021+.006*Math.cos(j*2.1),.012),white,side+'LowerLeg',j);}
    for(let j=0;j<7;j++)for(const sign of [-1,1]){const g=new T.CylinderGeometry(.0018,.0018,.036,5);g.rotateZ(sign*.8);g.translate(foot.x,foot.y+.045+j*.022,foot.z+.050);surface(g,pale,body,side+'LowerLeg');}
   }
  }
  if(slot==='accessory'){
   const b=new T.Box3();for(const mesh of donor.parts.hair){const p=mesh.geometry.attributes.position,ix=mesh.geometry.index;for(const id of new Set(ix?ix.array:Array.from({length:p.count},(_,i)=>i)))b.expandByPoint(V().fromBufferAttribute(p,id).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv));}const size=b.getSize(V()),center=b.getCenter(V());let crownTop=-Infinity;for(const mesh of donor.parts.hair){const p=mesh.geometry.attributes.position,ix=mesh.geometry.index;for(const id of new Set(ix.array)){const v=V().fromBufferAttribute(p,id).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);if(Math.abs(v.x-center.x)<size.x*.15)crownTop=Math.max(crownTop,v.y);}}center.y=(Number.isFinite(crownTop)?crownTop:b.max.y)-.080;
   const g=new T.SphereGeometry(1,40,16,0,Math.PI*2,0,Math.PI*.60),p=g.attributes.position;
   for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=1+.035*Math.sin(x*39+z*17)*Math.cos(y*27-z*21);p.setXYZ(i,center.x+x*size.x*.57*f,center.y+y*.105*f,center.z+z*size.z*.56*f);}
   surface(g,furPink,body,'head');
   for(let i=0;i<56;i++){const a=i/56*Math.PI*2,c=V().set(center.x+Math.cos(a)*size.x*.55,center.y-.010,center.z+Math.sin(a)*size.z*.54);puff(c,V().set(.015,.021,.015),furPink,'head',i);}
  }
  const batches=new Map();for(const mesh of rec.meshes){const g=mesh.geometry;if(Object.keys(g.morphAttributes).length)continue;const key=JSON.stringify([mesh.material.uuid,mesh.skeleton.uuid,mesh.bindMatrix.elements,mesh.position.toArray(),mesh.quaternion.toArray(),mesh.scale.toArray(),Object.entries(g.attributes).map(([n,a])=>[n,a.itemSize,a.array.constructor.name]).sort(),g.index?.array.constructor.name]);if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);}
  for(const batch of batches.values())if(batch.length>1){const g=mergeGeometries(batch.map(m=>m.geometry),false);if(!g)throw Error('Hat Mua merge failed');batch[0].geometry.dispose();batch[0].geometry=g;for(const m of batch.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
  records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});
 }
 return{records,parts,meshesFor(slot,index){return records.get(slot+':'+index)?.meshes;},hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
