import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1111.2136';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Independent additions: caller retains ownership of numeric wardrobe indices.
export const huntrixSongs=['golden','sounds','takedown','how'];
export function huntrixOptions(){
 const out={top:[],bottom:[],shoes:[]};
 for(const song of huntrixSongs)for(const role of ['lead','left','right'])for(const slot of Object.keys(out)){
  const id=`huntrix-${song}-${role}-${slot}`;out[slot].push({id,style:id,variant:1,label:`HUNTR/X · ${song} · ${role} · ${slot}`});
 }return out;
}
export function* buildHuntrixStyles(variants,options){
 const records=new Map(),parts=[],V=()=>new T.Vector3();
 const material=(color,metalness=0)=>new T.MeshStandardMaterial({color,metalness,roughness:metalness?.36:.72,side:T.DoubleSide});
 for(const slot of ['top','bottom','shoes'])for(const [index,opt]of options[slot].entries()){
  if(!opt.style?.startsWith('huntrix-'))continue;
  const [,song,role]=opt.style.split('-'),donor=variants[opt.variant],body=donor.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name)));
  for(const m of donor.parts.lower)if(/cream_undershorts/.test(m.name))m.userData.excludeHuntrix=true;
  const rec={id:opt.id,index,slot,meshes:[]},inv=body.matrixWorld.clone().invert(),pos=n=>donor.vrm.humanoid.getRawBoneNode(n).getWorldPosition(V()).applyMatrix4(inv);
  const hip=pos('hips'),neck=pos('neck'),knee=pos('leftLowerLeg'),foot=pos('leftFoot'),p=body.geometry.attributes.position,ix=body.geometry.index;
  const tris=geometryTriangles(body.geometry);
  const white=material('#fff8ee'),gold=material('#e6b836',.65),black=material('#222333',.22),silver=material('#dbe7f5',.65),bright=material('#ffdb62');
  function register(g,m,source=body){
   g.computeVertexNormals();g.computeBoundingSphere();const mesh=new T.SkinnedMesh(g,m);mesh.name=rec.id+'_'+rec.meshes.length;
   mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);mesh.bind(source.skeleton,source.bindMatrix);mesh.frustumCulled=false;mesh.visible=false;source.parent.add(mesh);rec.meshes.push(mesh);return mesh;
  }
  function shell(filter,change,m,clearance=.012){
   const g=body.geometry.clone(),ids=[];for(const tr of tris)if(tr.ids.every(id=>filter(V().fromBufferAttribute(p,id))))ids.push(...tr.ids);
   g.setIndex(ids);g.clearGroups();const a=g.attributes.position;for(const id of new Set(ids)){const v=V().fromBufferAttribute(a,id);change(v);v.addScaledVector(V().fromBufferAttribute(body.geometry.attributes.normal,id),clearance);a.setXYZ(id,v.x,v.y,v.z);}return register(g,m);
  }
  function* surface(g,m,skinSource=body,anchor=null){
   const skinTris=skinSource===body?tris:geometryTriangles(skinSource.geometry),query=getTriangleQuery(skinTris);
   const a=g.attributes.position,si=[],sw=[];for(let i=0;i<a.count;i++){if(i%128===0)yield;
    const v=anchor||V().fromBufferAttribute(a,i);const hit=query.nearest(v),best={...hit.record,q:hit.point,d:hit.distanceSq};
    const bary=best.t.getBarycoord(best.q,V()),weights=new Map();best.ids.forEach((id,k)=>{for(let j=0;j<4;j++){const b=skinSource.geometry.attributes.skinIndex.getComponent(id,j),w=skinSource.geometry.attributes.skinWeight.getComponent(id,j)*bary.getComponent(k);weights.set(b,(weights.get(b)||0)+w);}});
    const list=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=list.reduce((s,x)=>s+x[1],0);for(let j=0;j<4;j++){si.push(list[j]?.[0]||0);sw.push((list[j]?.[1]||0)/sum);}
   }g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));return register(g,m,skinSource);
  }
  function* box(x,y,z,w,h,d,m){const g=new T.BoxGeometry(w,h,d,1,3,1);g.translate(x,y,z);return yield* surface(g,m);}
  function* tube(top,bottom,rx,rz,m,pleats=0){
   const a=[],ids=[],cols=48,rows=8;for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){const u=j/rows,theta=k/cols*Math.PI*2,r=1+u*(top-bottom>.05?.24:0)+pleats*u*Math.cos(theta*12);a.push(Math.cos(theta)*rx*r,T.MathUtils.lerp(top,bottom,u),hip.z+Math.sin(theta)*rz*r);}
   for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const n=j*(cols+1)+k;ids.push(n,n+1,n+cols+1,n+1,n+cols+2,n+cols+1);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));g.setIndex(ids);return yield* surface(g,m,donor.parts.bottom[0]);
  }
  function* fittedGoldenSkirt(){
   const top=hip.y+.105,bottom=hip.y-.215,cols=64,rows=14,positions=[],indices=[];
   const blouse=donor.parts.top.find(m=>![].concat(m.material).some(x=>/Accessory_Tie/.test(x.name)));
   function radialSurface(source,y,c,s){
    const a=source.geometry.attributes.position,ix=source.geometry.index,origin=V().set(c*.35,y,hip.z+s*.35),ray=new T.Ray(origin,V().set(-c,0,-s));let best=null;
    for(const tr of getTriangleQuery(geometryTriangles(source.geometry)).rayCandidates(ray)){const q=ray.intersectTriangle(tr.t.a,tr.t.b,tr.t.c,false,V());if(q&&(!best||q.distanceToSquared(origin)<best.distanceToSquared(origin)))best=q;}
    return best?Math.max(.025,best.x*c+(best.z-hip.z)*s):null;
   }
   const rings=[];for(let k=0;k<=cols;k++){if(k%32===0)yield;
    const a=k/cols*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
    const bodyWaist=radialSurface(body,top,c,s)||.075,shirtWaist=radialSurface(blouse,top,c,s);
    const waist=Math.max(bodyWaist+.007,shirtWaist?shirtWaist*1.045+.003:0);
    const hips=Math.max(waist, (radialSurface(body,hip.y-.025,c,s)||waist)+.014);
    rings.push({a,c,s,waist,hips});
   }
   for(let j=0;j<=rows;j++)for(const {a,c,s,waist,hips}of rings){
    const u=j/rows,hipBlend=T.MathUtils.smoothstep(u,0,.43),flare=.016*T.MathUtils.smoothstep(u,.35,1);
    const fold=.0035*Math.cos(a*16)*T.MathUtils.smoothstep(u,.2,1),r=T.MathUtils.lerp(waist,hips,hipBlend)+flare+fold;
    positions.push(c*r,T.MathUtils.lerp(top,bottom,u),hip.z+s*r);
   }
   for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;indices.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);
   const mesh=yield* surface(g,new T.MeshToonMaterial({color:'#242634',side:T.DoubleSide}),donor.parts.bottom[0]);
   mesh.userData.goldenFit={waistMax:Math.max(...rings.map(r=>r.waist)),hipMax:Math.max(...rings.map(r=>r.hips)),hem:bottom};
  }
  function radial(v,scale){v.x*=scale;v.z=hip.z+(v.z-hip.z)*scale;}
  const topColor=song==='golden'?white:song==='sounds'?silver:song==='takedown'?black:material(role==='lead'?'#e83d4c':role==='left'?'#218bd9':'#f5df32');
  if(slot==='top'){
   // Body-derived fitted vest; sleeves are separate shells, all skin weights retained.
   const hem=hip.y+.065,shoulder=neck.y-.008;
   // Retain the donor blouse's tailored shoulders and connected neckline.
   for(const source of donor.parts.top){
    if([].concat(source.material).some(m=>/Accessory_Tie/.test(m.name)))continue;
    const g=source.geometry.clone(),a=g.attributes.position,ix=g.index,ids=[];
    for(let i=0;i<ix.count;i+=3){if(i%3072===0)yield;const tri=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(tri.every(k=>a.getY(k)>hem&&Math.abs(a.getX(k))<(song==='sounds'&&role==='right'||song==='how'&&role!=='left'?.125:Math.abs(pos('leftHand').x)-.018)))ids.push(...tri);}
    g.setIndex(ids);g.clearGroups();
    for(const id of new Set(ids)){a.setX(id,a.getX(id)*1.035);a.setZ(id,a.getZ(id)*1.06);}
    register(g,topColor,source);
   }
   // Open collar and front placket provide solid geometry beyond recoloring.
   for(const sign of [-1,1])yield* box(sign*.027,shoulder-.028,hip.z+.059,.025,.058,.008,song==='golden'?white:black);
   yield* box(0,(hem+shoulder)/2,hip.z+.09,.006,shoulder-hem-.02,.004,song==='golden'?white:silver);
   if(song==='golden'){
    for(const sign of [-1,1]){
     const jacket=rec.meshes[0],jp=jacket.geometry.attributes.position,ji=jacket.geometry.index;
     for(let j=0;j<3;j++){
      const ray=new T.Ray(V().set(sign*.038,hem+.037+j*.035,.5),V().set(0,0,-1));let hit=null;
      for(const tr of getTriangleQuery(geometryTriangles(jacket.geometry)).rayCandidates(ray)){const q=ray.intersectTriangle(tr.t.a,tr.t.b,tr.t.c,false,V());if(q&&(!hit||q.z>hit.z))hit=q;}
      if(!hit)throw Error('Golden button has no jacket anchor');
      const g=new T.SphereGeometry(.0045,8,6);g.scale(1,1,.45);g.translate(hit.x,hit.y,hit.z+.0015);yield* surface(g,gold,jacket,hit);
     }
     const sh=pos(sign>0?'leftUpperArm':'rightUpperArm'),shoulderNode=donor.vrm.humanoid.getRawBoneNode(sign>0?'leftShoulder':'rightShoulder'),shoulderIndex=body.skeleton.bones.findIndex(b=>b.name===shoulderNode.name);
     if(shoulderIndex<0)throw Error('Golden shoulder bone missing');
     const shoulderDetail=(x,y,z,w,h,d)=>{
      const g=new T.BoxGeometry(w,h,d),si=[],sw=[];g.translate(x,y,z);
      for(let k=0;k<g.attributes.position.count;k++){si.push(shoulderIndex,0,0,0);sw.push(1,0,0,0);}
      g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));register(g,gold);
     };
     shoulderDetail(sh.x,sh.y+.018,sh.z+.020,.052,.010,.052);
     for(let j=0;j<6;j++)shoulderDetail(sh.x+(j-2.5)*.008,sh.y-.011,sh.z+.048,.003,.035,.003);
    }
   }else if(song==='takedown'){yield* box(.06,hem+.055,hip.z+.075,.042,.05,.012,black);yield* box(-.055,hem+.09,hip.z+.072,.045,.007,.014,silver);}
   else if(song==='how'){yield* box(0,hem+.045,hip.z+.075,.075,.014,.009,role==='lead'?gold:material('#fa65ae'));}
  }
  if(slot==='bottom'){
   const pants=song==='takedown'||(song==='how'&&role==='right'),skirt=(song==='golden'&&role!=='right')||(song==='sounds'&&role==='left')||(song==='how'&&role==='lead');
   const end=pants?foot.y+.035:hip.y-(song==='golden'?.18:.105);
   const cloth=song==='sounds'?white:song==='how'&&role==='lead'?bright:black;
   shell(v=>v.y> end&&v.y<hip.y+.105,v=>{
    // Golden safety shorts retain the continuous donor crotch and all skin weights.
    // Normal clearance is applied by shell(); never dilate the two legs across x=0.
    if(song==='golden')return;
    const side=v.x>=0?'left':'right',a=pos(side+'UpperLeg'),b=pos(side+'LowerLeg'),c=pos(side+'Foot'),start=v.y>b.y?a:b,stop=v.y>b.y?b:c,u=T.MathUtils.clamp((start.y-v.y)/(start.y-stop.y),0,1),center=start.clone().lerp(stop,u);
    if(v.y<hip.y-.02)v.sub(center).multiply(new T.Vector3(pants?1.24:1.22,1,pants?1.2:1.22)).add(center);else radial(v,1.15);
   },song==='golden'?new T.MeshToonMaterial({color:'#242634',side:T.DoubleSide}):skirt?material('#fff1cf'):cloth);
   if(song==='golden'){
    // A continuous inner lining matches the donor surface exactly. At extreme
    // hip flexion, normal-offset outer cloth can move behind the other thigh.
    // Polygon offset keeps this opaque lining over the donor's printed underwear
    // without a second geometric dilation or a split at the centre seam.
    const lining=new T.MeshToonMaterial({color:'#242634',side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
    const inner=shell(v=>v.y>hip.y-.195&&v.y<hip.y+.115,v=>{},lining,0);
    inner.userData.goldenSafetyLining=true;
   }
   if(skirt){if(song==='golden')yield* fittedGoldenSkirt();else yield* tube(hip.y+.11,hip.y-(role==='left'?.135:.15),.135,.112,cloth,.07);}
   shell(v=>v.y>hip.y+.075&&v.y<hip.y+.105,v=>{if(song!=='golden')radial(v,1.13);},song==='how'&&role==='left'?material('#fa65ae'):song==='golden'?black:silver);
   if(pants)for(const sign of [-1,1])yield* box(sign*.105,hip.y-.15,hip.z+.035,.028,.065,.065,cloth);
  }
  if(slot==='shoes'){
   const m=song==='sounds'?white:black;
   for(const source of donor.parts.shoes){const g=source.geometry.clone();g.clearGroups();register(g,m,source);}
   // Boot shafts have real calf topology and preserve knee deformation.
   shell(v=>v.y>foot.y+.035&&v.y<knee.y-.045,v=>{const side=v.x>=0?'left':'right',a=pos(side+'LowerLeg'),b=pos(side+'Foot'),u=T.MathUtils.clamp((a.y-v.y)/(a.y-b.y),0,1),c=a.clone().lerp(b,u);v.sub(c).multiply(new T.Vector3(1.12,1,1.15)).add(c);},m);
   if(song!=='golden')for(const sign of [-1,1])for(let i=0;i<3;i++)yield* box(sign*Math.abs(foot.x),foot.y+.07+i*.037,foot.z+.047,.038,.006,.007,song==='golden'?gold:silver);
  }
  // Merge only compatible, same-material surfaces inside one wardrobe record.
  // Preserve donor, bind matrix and local transform boundaries.
  const batches=new Map();for(const mesh of rec.meshes){
   const g=mesh.geometry;if(Array.isArray(mesh.material)||Object.keys(g.morphAttributes).length)continue;
   const schema=Object.entries(g.attributes).map(([n,a])=>[n,a.itemSize,a.normalized,a.array.constructor.name]).sort();
   const key=JSON.stringify([mesh.material.uuid,mesh.skeleton.uuid,mesh.bindMatrix.elements,mesh.position.toArray(),mesh.quaternion.toArray(),mesh.scale.toArray(),schema,g.index?.array.constructor.name]);
   if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);
  }
  for(const batch of batches.values())if(batch.length>1){
   const merged=mergeGeometries(batch.map(m=>m.geometry),false);if(!merged)throw Error('Compatible garment merge failed');
   const first=batch[0];first.geometry.dispose();first.geometry=merged;merged.computeBoundingSphere();
   for(const mesh of batch.slice(1)){mesh.removeFromParent();mesh.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(mesh),1);}
  }
  records.set(slot+':'+index,rec);rec.meshes.forEach(mesh=>parts.push({slot,variant:index,donor:opt.variant,mesh}));
 }
 return{records,parts,meshesFor(slot,index){return records.get(slot+':'+index)?.meshes;},hide(){parts.forEach(p=>p.mesh.visible=false);}};
}

export function createHuntrixStyles(...args){const iterator=buildHuntrixStyles(...args);let step;do{step=iterator.next();}while(!step.done);return step.value;}
