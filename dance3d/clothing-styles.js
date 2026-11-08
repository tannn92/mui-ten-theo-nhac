import * as T from 'three';

// Extra garments use the existing donor skeleton and its skin mask. All meshes
// are made once at load time; equipping only changes visibility.
export function createClothingStyles(variants,options){
 const records=new Map(),parts=[],V=()=>new T.Vector3();
 const ramp=new T.DataTexture(new Uint8Array([125,185,235,255]),4,1,T.RedFormat);ramp.needsUpdate=true;ramp.minFilter=ramp.magFilter=T.NearestFilter;
 const mat=color=>new T.MeshToonMaterial({color,gradientMap:ramp,side:T.DoubleSide});
 const cream=mat('#fff6e8'),navy=mat('#526b9d'),pink=mat('#eda2bc');
 const used=mesh=>new Set(mesh.geometry.index?.array||Array.from({length:mesh.geometry.attributes.position.count},(_,i)=>i));
 function bounds(mesh){const box=new T.Box3(),p=mesh.geometry.attributes.position;for(const i of used(mesh))box.expandByPoint(V().fromBufferAttribute(p,i));return box;}
 function clone(record,source,change){
  const mesh=source.clone(false);mesh.name=record.id+'_'+record.meshes.length;mesh.geometry=source.geometry.clone();
  const p=mesh.geometry.attributes.position,b=bounds(source);for(const i of used(source)){const v=V().fromBufferAttribute(p,i);change?.(v,b);p.setXYZ(i,v.x,v.y,v.z);}p.needsUpdate=true;mesh.geometry.computeVertexNormals();mesh.geometry.computeBoundingSphere();
  // MToon instances carry loader-managed alpha/outline uniforms. Share the
  // original instances rather than cloning an unregistered shader material.
  // Shape and attached details distinguish options; donor texture stays intact.
  mesh.material=source.material;
  mesh.skeleton=source.skeleton;mesh.bindMatrix.copy(source.bindMatrix);mesh.bindMatrixInverse.copy(source.bindMatrixInverse);
  if(source.morphTargetInfluences)mesh.morphTargetInfluences=[...source.morphTargetInfluences];
  source.parent.add(mesh);mesh.visible=false;mesh.frustumCulled=false;record.meshes.push(mesh);return mesh;
 }
 function attached(record,bone,geometry,material,position){
  const mesh=new T.Mesh(geometry,material);mesh.name=record.id+'_detail_'+record.meshes.length;
  mesh.position.copy(bone.worldToLocal(position.clone()));mesh.quaternion.copy(bone.getWorldQuaternion(new T.Quaternion()).invert());
  mesh.visible=false;mesh.frustumCulled=false;bone.add(mesh);record.meshes.push(mesh);return mesh;
 }
 // Details inherit the garment's skin weights instead of a rigid chest offset.
 function skinDetail(record,source,geometry,material,samples){
  const si=[],sw=[];for(const sample of samples){
   const weights=new Map();sample.ids.forEach((id,k)=>{for(let j=0;j<4;j++){
    const bone=source.geometry.attributes.skinIndex.getComponent(id,j),w=source.geometry.attributes.skinWeight.getComponent(id,j)*sample.bary.getComponent(k);
    weights.set(bone,(weights.get(bone)||0)+w);
   }});
   const list=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),total=list.reduce((n,x)=>n+x[1],0);
   for(let j=0;j<4;j++){si.push(list[j]?.[0]||0);sw.push((list[j]?.[1]||0)/total);}
  }
  geometry.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geometry.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geometry.computeVertexNormals();
  const mesh=new T.SkinnedMesh(geometry,material);mesh.name=record.id+'_surface_'+record.meshes.length;
  mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);mesh.bind(source.skeleton,source.bindMatrix);source.parent.add(mesh);mesh.visible=false;mesh.frustumCulled=false;record.meshes.push(mesh);return mesh;
 }
 function triangles(source){const p=source.geometry.attributes.position,ix=source.geometry.index,out=[];
  for(let i=0;i<ix.count;i+=3){const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],v=ids.map(id=>V().fromBufferAttribute(p,id));out.push({ids,triangle:new T.Triangle(...v)});}return out;
 }
 function dolceMaterial(source,style){
  const original=[].concat(source?.material||[])[0],m=new T.MeshToonMaterial({map:original?.map||null,alphaTest:original?.alphaTest||.5,side:T.DoubleSide});
  m.customProgramCacheKey=()=>style;
  m.onBeforeCompile=shader=>{
   shader.vertexShader='varying vec3 vDolcePosition;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvDolcePosition = position;');
   shader.fragmentShader='varying vec3 vDolcePosition;\n'+shader.fragmentShader;
   const pink=style==='dolce-glitter'||style==='dolce-shirt'||style==='dolce-skirt';
   let code=pink?'diffuseColor.rgb=mix(vec3(.62,.22,.38),vec3(1.,.67,.80),.55+.45*dot(diffuseColor.rgb,vec3(.3333)));':'diffuseColor.rgb=mix(vec3(.52,.56,.62),vec3(.98,.97,.96),.65+.35*dot(diffuseColor.rgb,vec3(.3333)));';
   if(style==='dolce-boots'||style==='dolce-sneakers')code='float tone=dot(diffuseColor.rgb,vec3(.3333));diffuseColor.rgb=mix(vec3(.98,.97,.96),vec3(.42,.46,.52),smoothstep(.16,.55,tone));';
   if(style==='dolce-skirt')code='float clothTone=dot(diffuseColor.rgb,vec3(.3333));'+code+'diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.88,.94),smoothstep(.65,.90,clothTone)*.8);';
   if(style==='dolce-shirt')code+='if(abs(vDolcePosition.x)<.035 && vDolcePosition.z>.015)diffuseColor.rgb=vec3(.98,.97,.96);';
   if(style==='dolce-glitter')code+='vec2 cell=vDolcePosition.xy*130.;vec2 f=abs(fract(cell)-.5);float rnd=fract(sin(dot(floor(cell),vec2(127.1,311.7)))*43758.5453);float spark=step(.80,rnd)*(1.-smoothstep(.10,.23,length(f)));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.98,.90),spark*.9);';
   if(style==='dolce-tie')code='float check=mod(floor(vDolcePosition.x*210.)+floor(vDolcePosition.y*210.),2.);diffuseColor.rgb=mix(vec3(.27,.32,.40),vec3(.64,.69,.74),check);';
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n'+code);
  };return m;
 }
 function collar(record,source,neck,tie=false){
  const tris=triangles(source),local=neck.clone().applyMatrix4(source.matrixWorld.clone().invert()),positions=[],samples=[],indices=[];
  function point(x,y,front){
   const ray=new T.Ray(V().set(x,y,front?1:-1),V().set(0,0,front?-1:1));let best=null;
   for(const t of tris){const hit=ray.intersectTriangle(t.triangle.a,t.triangle.b,t.triangle.c,false,V());if(hit&&(!best||ray.origin.distanceToSquared(hit)<ray.origin.distanceToSquared(best.p)))best={p:hit,...t};}
   if(!best){const target=V().set(x,y,local.z+(front?.045:-.045));for(const t of tris){const p=t.triangle.closestPointToPoint(target,V()),d=p.distanceToSquared(target);if(!best||d<best.d)best={p,d,...t};}}
   const bary=best.triangle.getBarycoord(best.p,V());best.p.z+=front?.002:-.002;
   positions.push(...best.p.toArray());samples.push({ids:best.ids,bary});return samples.length-1;
  }
  // Broad filled panels conform to the front, shoulders and upper back.
  function panel(corners,front){const n=10,start=samples.length;
   for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){const u=x/n,v=y/n,a=new T.Vector2(...corners[0]).lerp(new T.Vector2(...corners[1]),u),b=new T.Vector2(...corners[3]).lerp(new T.Vector2(...corners[2]),u);a.lerp(b,v);point(local.x+a.x,local.y+a.y,front);}
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){const a=start+y*(n+1)+x,b=a+1,c=a+n+1,d=c+1;indices.push(a,b,c,b,d,c);}
  }
  if(tie){panel([[-.012,-.035],[.012,-.035],[.023,-.15],[-.023,-.15]],true);panel([[-.023,-.15],[.023,-.15],[0,-.18],[0,-.18]],true);}
  else{for(const sign of[-1,1])panel([[sign*.032,-.026],[sign*.105,-.048],[sign*.023,-.139],[sign*.015,-.112]],true);
  panel([[-.09,-.035],[.09,-.035],[.085,-.105],[-.085,-.105]],false);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);skinDetail(record,source,g,tie?dolceMaterial(null,'dolce-tie'):navy,samples);
 }
 for(const slot of ['top','bottom','shoes'])for(const [index,option]of options[slot].entries()){
  if(!option.style)continue;const donor=variants[option.variant],vrm=donor.vrm,source=donor.parts[slot],record={id:option.id,slot,index,meshes:[]};
  const bone=n=>vrm.humanoid.getRawBoneNode(n),position=n=>bone(n).getWorldPosition(V());
  if(option.style.startsWith('dolce-')){
   const style=option.style;
   if(style==='dolce-pants'){
    // Build a clean continuous trouser surface from the body's leg topology.
    // Cargo pockets, straps and alpha cutouts are deliberately not inherited.
    const body=donor.meshes.find(m=>[].concat(m.material).some(mat=>/Body.*SKIN/.test(mat.name))),inverse=body.matrixWorld.clone().invert();
    const hip=position('hips').applyMatrix4(inverse),waist=hip.y+.075,hem=position('leftFoot').applyMatrix4(inverse).y+.006;
    const chains=['left','right'].map(side=>['UpperLeg','LowerLeg','Foot'].map(n=>position(side+n).applyMatrix4(inverse)));
    const indices=[],p=body.geometry.attributes.position,ix=body.geometry.index;
    for(let i=0;i<ix.count;i+=3){const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(ids.every(id=>p.getY(id)>=hem&&p.getY(id)<=waist))indices.push(...ids);}
    const pants=clone(record,body,v=>{
     const chain=chains[v.x>=0?0:1],a=v.y>chain[1].y?chain[0]:chain[1],b=v.y>chain[1].y?chain[1]:chain[2],u=T.MathUtils.clamp((a.y-v.y)/(a.y-b.y),0,1),c=a.clone().lerp(b,u);
     const dx=v.x-c.x,dz=v.z-c.z,len=Math.hypot(dx,dz),blend=T.MathUtils.smoothstep(hip.y-v.y,.035,.105);
     if(len>1e-6){const radius=.057;v.x=T.MathUtils.lerp(v.x*1.035,c.x+dx/len*radius,blend);// Leave clearance behind the calf for the lace-boot shaft in mixed outfits.
     const rearClearance=dz<0?.016*T.MathUtils.smoothstep(chain[1].y+.035-v.y,0,.09):0;v.z=T.MathUtils.lerp(v.z*1.06,c.z+dz/len*(radius+rearClearance),blend);}
    });pants.geometry.clearGroups();pants.geometry.setIndex(indices);pants.geometry.computeVertexNormals();pants.geometry.computeBoundingSphere();pants.material=new T.MeshToonMaterial({color:'#f7f5f4',side:T.DoubleSide});
   }else for(const mesh of source){
    if(slot==='top'&&/Accessory_Tie/.test([].concat(mesh.material)[0].name))continue;
    const inverse=mesh.matrixWorld.clone().invert(),waist=position('hips').add(V().set(0,.065,0)).applyMatrix4(inverse).y,legX=Math.abs(position('leftUpperLeg').applyMatrix4(inverse).x);
    const material=dolceMaterial(mesh,style),layers=style==='dolce-skirt'?[1.22,.94,.67]:[1];
    for(const layer of layers){const result=clone(record,mesh,v=>{
     if(style==='dolce-skirt'){const u=T.MathUtils.clamp((waist-v.y)/.25,0,1);v.y=waist-(waist-v.y)*layer;v.x*=1+.14*u;v.z*=1+.14*u;}
     if(style==='dolce-pants'){const u=T.MathUtils.clamp((waist-v.y)/.16,0,1),center=Math.sign(v.x)*legX;v.x=center+(v.x-center)*(1+.85*u);v.z*=1+.22*u;}
     if(style==='dolce-shirt'){v.x*=1.06;v.z*=1.13;v.y-=.035*T.MathUtils.clamp((waist+.06-v.y)/.10,0,1);}
    });result.material=material;result.geometry.clearGroups();}
   }
   if(style==='dolce-shirt')collar(record,record.meshes[0],position('neck'),true);
  }else if(option.style==='puff-hoodie'){
   // Inflate sleeves around their own T-pose arm axes, not around world origin.
   for(const mesh of source){const inverse=mesh.matrixWorld.clone().invert(),segments=['left','right'].flatMap(side=>[['UpperArm','LowerArm'],['LowerArm','Hand']].map(([a,b])=>[position(side+a).applyMatrix4(inverse),position(side+b).applyMatrix4(inverse)]));
    clone(record,mesh,v=>{let best=null,d=Infinity;for(const[a,b]of segments){const axis=b.clone().sub(a),u=T.MathUtils.clamp(v.clone().sub(a).dot(axis)/axis.lengthSq(),0,1),center=a.clone().addScaledVector(axis,u),distance=v.distanceTo(center);if(distance<d){d=distance;best=center;}}
     if(Math.abs(v.x)>.16&&d<.10)v.sub(best).multiplyScalar(1.20).add(best);
    });
   }
  }else if(option.style==='sailor'){
   source.forEach(m=>clone(record,m,null));
   collar(record,source[0],position('neck'));
  }else if(option.style==='tiered-skirt'){
   for(const m of source){const waist=position('hips').add(V().set(0,.065,0)).applyMatrix4(m.matrixWorld.clone().invert()).y;
    clone(record,m,v=>{const u=T.MathUtils.clamp((waist-v.y)/.25,0,1);v.x*=1+.10*u;v.z*=1+.10*u;});
    clone(record,m,v=>{v.y=waist-(waist-v.y)*.68;v.x*=1.08;v.z*=1.08;});}
  }else if(option.style==='wide-pants'){
   source.forEach(m=>{const inverse=m.matrixWorld.clone().invert(),waist=position('hips').add(V().set(0,.06,0)).applyMatrix4(inverse).y,legX=Math.abs(position('leftUpperLeg').applyMatrix4(inverse).x);
    clone(record,m,v=>{const u=T.MathUtils.clamp((waist-v.y)/.16,0,1),center=Math.sign(v.x)*legX;v.x=center+(v.x-center)*(1+.5*u);v.z*=1+.12*u;});});
  }else if(option.style==='fur-boots'){
   source.forEach(m=>clone(record,m,null));
   for(const side of['left','right']){const foot=position(side+'Foot'),knee=position(side+'LowerLeg'),p=foot.clone().lerp(knee,.48);
    const ring=new T.TorusGeometry(.039,.011,8,24);ring.rotateX(Math.PI/2);attached(record,bone(side+'LowerLeg'),ring,cream,p);
   }
  }else if(option.style==='wing-sneakers'){
   source.forEach(m=>clone(record,m,null));
   const shoe=source[0],tris=triangles(shoe),inverse=shoe.matrixWorld.clone().invert();
   for(const[side,sign]of[['left',1],['right',-1]]){
    const target=position(side+'Foot').add(V().set(sign*.023,-.026,.025)).applyMatrix4(inverse);let best=null;
    for(const t of tris){const p=t.triangle.closestPointToPoint(target,V()),d=p.distanceToSquared(target);if(!best||d<best.d)best={...t,p,d};}
    const sample={ids:best.ids,bary:best.triangle.getBarycoord(best.p,V())};
    const shape=new T.Shape();shape.moveTo(-sign*.005,-.004);shape.quadraticCurveTo(sign*.020,.007,sign*.035,.039);shape.quadraticCurveTo(sign*.007,.031,0,.012);shape.lineTo(-sign*.005,-.004);
    const wing=new T.ExtrudeGeometry(shape,{depth:.007,bevelEnabled:false,curveSegments:8});wing.translate(best.p.x,best.p.y,best.p.z-.0035);
    skinDetail(record,shoe,wing,cream,Array.from({length:wing.attributes.position.count},()=>sample));
    const stud=new T.SphereGeometry(.007,10,8);stud.translate(best.p.x,best.p.y+.003,best.p.z);
    skinDetail(record,shoe,stud,pink,Array.from({length:stud.attributes.position.count},()=>sample));
   }
  }else throw Error('Kiểu đồ chưa được dựng: '+option.style);
  records.set(slot+':'+index,record);record.meshes.forEach(mesh=>parts.push({slot,variant:index,donor:option.variant,mesh}));
 }
 return{parts,records,meshesFor(slot,index){return records.get(slot+':'+index)?.meshes;},hide(){for(const p of parts)p.mesh.visible=false;}};
}
