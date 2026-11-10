import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1011.0910';
import * as T from 'three';

// Extra garments use the existing donor skeleton and its skin mask. All meshes
// are made once per option; the cooperative generator supports deferred construction.
export function* buildClothingStyles(variants,options){
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
 function triangles(source){return geometryTriangles(source.geometry);}
 function nearest(tris,v){const hit=getTriangleQuery(tris).nearest(v);return hit?{...hit.record,p:hit.point,d:hit.distanceSq}:null;}
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
 // Sequin facets are anchored to cloth; highlights follow the deformed normal
 // and viewing direction rather than a wall-clock flashing animation.
 function sequinMaterial(){
  const m=new T.MeshStandardMaterial({color:'#ed9ebc',metalness:.25,roughness:.32,side:T.DoubleSide});
  m.customProgramCacheKey=()=> 'dolce-sequin-v2';
  m.onBeforeCompile=s=>{
   s.vertexShader='varying vec3 vSequin;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSequin=position;');
   s.fragmentShader='varying vec3 vSequin;\n'+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 tile=vSequin.xy*185.;tile.x+=mod(floor(tile.y),2.)*.5;vec2 cell=floor(tile);float jitter=fract(sin(dot(cell,vec2(41.3,89.7)))*15731.9);vec2 uv=fract(tile)-.5+vec2(jitter-.5,.5-jitter)*.22;
    float seed=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
    float disc=1.-smoothstep(.30,.47,length(uv));
    diffuseColor.rgb=mix(vec3(.9,.4,.62),mix(vec3(1.,.47,.69),vec3(.93,.93,1.),step(.48,seed)),disc);
   `);
   s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float angle=dot(normalize(vViewPosition),normal);
    float flash=pow(max(0.,cos(angle*18.+seed*25.)),18.);
    float crossShape=max((1.-smoothstep(.025,.09,abs(uv.x)))*(1.-smoothstep(.12,.46,abs(uv.y))), (1.-smoothstep(.025,.09,abs(uv.y)))*(1.-smoothstep(.12,.46,abs(uv.x))));
    totalEmissiveRadiance+=vec3(1.,.89,.96)*(disc*.26+crossShape*flash*2.2);
   `);
  };return m;
 }
 // Broad organza flounces: independent surfaces, without the donor skirt's
 // printed lace or long A-line silhouette. Keep its spring-bone skin weights.
 function* dolceFlounces(record,donor,position){
  const source=donor.parts.bottom[0],inv=source.matrixWorld.clone().invert(),hip=position('hips').applyMatrix4(inv),tris=triangles(source);
  for(let layer=0;layer<3;layer++){
   const positions=[],samples=[],indices=[],cols=96,rows=10;
   for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){if((j*(cols+1)+k)%128===0)yield;
    const u=j/rows,a=k/cols*Math.PI*2,fold=Math.sin(a*7.+layer*1.5),rx=.108+.016*layer+.030*u,rz=.077+.010*layer+.029*u;
    const y=hip.y+.030-layer*.050-u*.075+.009*fold*u;
    const target=V().set(Math.cos(a)*rx,y,Math.sin(a)*rz+hip.z),anchor=V().set(Math.cos(a)*.13,y,Math.sin(a)*.10+hip.z);let best=null;
    best=nearest(tris,anchor);
    target.x+=Math.cos(a)*.013*fold*u;target.z+=Math.sin(a)*.013*fold*u;
    positions.push(...target.toArray());samples.push({ids:best.ids,bary:best.triangle.getBarycoord(best.p,V())});
   }
   for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;indices.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);
   const material=new T.MeshStandardMaterial({color:'#ffd1db',emissive:'#633842',emissiveIntensity:.18,roughness:.5,metalness:.02,side:T.DoubleSide,transparent:layer!==2,opacity:layer===2?1:.82,depthWrite:layer===2});
   skinDetail(record,source,g,material,samples);
   const hem=g.clone(),hemIndices=[];for(let k=0;k<cols;k++){const a=(rows-1)*(cols+1)+k;hemIndices.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}hem.setIndex(hemIndices);
   const p=hem.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+.0006);
   skinDetail(record,source,hem,mat('#ffe1e7'),samples);
  }
 }

 function* dolceRibbons(record,donor,position){
  const body=donor.meshes.find(m=>[].concat(m.material).some(a=>/Body.*SKIN/.test(a.name))),inv=body.matrixWorld.clone().invert(),tris=triangles(body);
  const cloth=mat('#ffd1db'),edge=mat('#ffe1ee');cloth.emissive.set('#633842');cloth.emissiveIntensity=.18;cloth.transparent=true;cloth.opacity=.70;cloth.depthWrite=false;
  const hipY=position('hips').applyMatrix4(inv).y,belt=clone(record,body,v=>{v.x*=1.14;v.z*=1.18;}),bp=body.geometry.attributes.position,bi=body.geometry.index,beltIds=[];
  for(let i=0;i<bi.count;i+=3){const ids=[bi.getX(i),bi.getX(i+1),bi.getX(i+2)];if(ids.every(id=>bp.getY(id)>hipY+.02&&bp.getY(id)<hipY+.09))beltIds.push(...ids);}
  belt.geometry.setIndex(beltIds);belt.geometry.clearGroups();belt.material=sequinMaterial();
  // Fit the sequinned sash outside the skirt, not inside its flared waistband.
  const skirtTris=donor.parts.bottom.flatMap(triangles),beltPos=belt.geometry.attributes.position;
  function skirtSurface(x,y,z){const direction=V().set(x,0,z).normalize(),ray=new T.Ray(direction.clone().multiplyScalar(.5).setY(y),direction.clone().negate());let best=null;for(const t of getTriangleQuery(skirtTris).rayCandidates(ray)){const hit=ray.intersectTriangle(t.triangle.a,t.triangle.b,t.triangle.c,false,V());if(hit&&(!best||hit.lengthSq()>best.lengthSq()))best=hit;}return best;}
  let beltStep=0;for(const id of new Set(beltIds)){if(beltStep++%128===0)yield;const v=V().fromBufferAttribute(beltPos,id),hit=skirtSurface(v.x,v.y,v.z);if(hit)beltPos.setXYZ(id,hit.x*1.035,v.y,hit.z*1.035);}
  belt.geometry.computeVertexNormals();belt.geometry.computeBoundingSphere();
  const silver=new T.MeshStandardMaterial({color:'#e6edf7',metalness:.65,roughness:.23,emissive:'#555860',emissiveIntensity:.25});
  for(let i=0;i<21;i++){
   const u=i/20*2-1,ray=new T.Ray(V().set(u*.078,hipY+.052-.014*(1-u*u),.35),V().set(0,0,-1));let best=null;
   for(const t of getTriangleQuery(tris).rayCandidates(ray)){const hit=ray.intersectTriangle(t.triangle.a,t.triangle.b,t.triangle.c,false,V());if(hit&&(!best||hit.z>best.p.z))best={p:hit,...t};}
   if(!best)continue;
   const sample={ids:best.ids,bary:best.triangle.getBarycoord(best.p,V())},link=new T.TorusGeometry(.0047,.0012,5,10);link.scale(1,.75,1);if(i%2)link.rotateY(.65);const surface=skirtSurface(best.p.x,best.p.y,best.p.z)||best.p;link.translate(surface.x*1.04,best.p.y,surface.z*1.04+.003);
   skinDetail(record,body,link,silver,Array.from({length:link.attributes.position.count},()=>sample));
  }
  for(const [side,sign] of [['left',1],['right',-1]])for(let ribbon=0;ribbon<1;ribbon++){
   const hip=position(side+'UpperLeg').applyMatrix4(inv),knee=position(side+'LowerLeg').applyMatrix4(inv),foot=position(side+'Foot').applyMatrix4(inv);
   const start=position('hips').applyMatrix4(inv).y-.025,end=foot.y+.035,positions=[],samples=[],indices=[],rows=64,cols=16;
   for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){if((j*(cols+1)+k)%128===0)yield;
    const u=j/rows,v=k/cols-.5,y=T.MathUtils.lerp(start,end,u),c=y>knee.y?hip.clone().lerp(knee,T.MathUtils.clamp((hip.y-y)/(hip.y-knee.y),0,1)):knee.clone().lerp(foot,T.MathUtils.clamp((knee.y-y)/(knee.y-foot.y),0,1));
    const fold=Math.sin(u*Math.PI*5+sign*.7),width=.115*(1-.12*u),x=c.x+sign*(.108+.015*fold+v*width),z=c.z+.012+.030*Math.sin(u*Math.PI*5+sign*.7+v*2.4)+.016*Math.sin(v*Math.PI*2);
    const target=V().set(c.x+sign*.04,y,c.z);let best=null;
    best=nearest(tris,target);
    positions.push(x,y+.014*Math.cos(v*Math.PI*2+u*16),z);samples.push({ids:best.ids,bary:best.triangle.getBarycoord(best.p,V())});
   }
   for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;indices.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);skinDetail(record,body,g,cloth,samples);
   // Pale sewn edge follows exactly the same skin weights as the ribbon.
   const trim=g.clone(),trimIndices=[];for(let j=0;j<rows;j++)for(const k of [0,cols-1]){const a=j*(cols+1)+k;trimIndices.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}trim.setIndex(trimIndices);
   const p=trim.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+.0008);skinDetail(record,body,trim,edge,samples);
  }
 }

 function* dolceHalter(record,donor,position){
  const body=donor.meshes.find(m=>[].concat(m.material).some(a=>/Body.*SKIN/.test(a.name))),inv=body.matrixWorld.clone().invert();
  const hip=position('hips').applyMatrix4(inv),neck=position('neck').applyMatrix4(inv),chest=position('chest').applyMatrix4(inv),hem=hip.y+.13;
  const tris=triangles(body),positions=[],samples=[],indices=[],sequin=sequinMaterial();
  // Restore the exported shirt's hidden torso/arms only for this top.
  const skin=clone(record,body,v=>{const n=v.clone();n.y=0;if(n.length()>0)v.addScaledVector(n.normalize(),.0008);});
  const ids=[],p=body.geometry.attributes.position,ix=body.geometry.index;
  for(let i=0;i<ix.count;i+=3){const a=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(a.every(j=>p.getY(j)>hip.y+.02&&p.getY(j)<neck.y-.006))ids.push(...a);}
  skin.geometry.setIndex(ids);skin.geometry.clearGroups();
  // The donor atlas deliberately masks clothed torso texels. Reuse its actual
  // authored hand skin and registered MToon shader for the restored bare skin;
  // never mutate the shared atlas/material or expose transparent torso texels.
  const hand=donor.vrm.humanoid.getRawBoneNode('leftMiddleProximal');
  if(!hand)throw Error('Dolce skin requires donor hand skin anchor');
  const handLocal=hand.getWorldPosition(V()).applyMatrix4(inv);
  const hit=getTriangleQuery(geometryTriangles(body.geometry)).nearest(handLocal);
  const bary=hit.record.t.getBarycoord(hit.point,V()),uv=body.geometry.attributes.uv,skinUV=new T.Vector2();
  hit.record.ids.forEach((id,k)=>{skinUV.x+=uv.getX(id)*bary.getComponent(k);skinUV.y+=uv.getY(id)*bary.getComponent(k);});
  for(const id of new Set(ids))skin.geometry.attributes.uv.setXY(id,skinUV.x,skinUV.y);
  skin.geometry.attributes.uv.needsUpdate=true;
  skin.material=[].concat(body.material)[0];
  skin.userData.dolceSkin={source:body.name,anchor:'leftMiddleProximal',uv:skinUV.toArray()};
  const rows=24,cols=64;
  for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){if((j*(cols+1)+k)%128===0)yield;
   const a=k/cols*Math.PI*2,c=Math.cos(a),s=Math.sin(a),u=j/rows;
   const high=T.MathUtils.lerp(chest.y+.035,neck.y-.018,Math.pow(Math.abs(s),2));
   const y=T.MathUtils.lerp(hem,high,u),origin=V().set(c*.24,y,s*.24),ray=new T.Ray(origin,V().set(-c,0,-s));let best=null;
   for(const t of getTriangleQuery(tris).rayCandidates(ray)){const hit=ray.intersectTriangle(t.triangle.a,t.triangle.b,t.triangle.c,false,V());if(hit&&(!best||origin.distanceToSquared(hit)<best.d))best={p:hit,d:origin.distanceToSquared(hit),...t};}
   if(!best)throw Error('Halter body surface missing');
   const bary=best.triangle.getBarycoord(best.p,V());best.p.add(V().set(c*.004,0,s*.004));positions.push(...best.p.toArray());samples.push({ids:best.ids,bary});
  }
  for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;for(const ids of [[a,a+1,a+cols+1],[a+1,a+cols+2,a+cols+1]]){const center=V();ids.forEach(id=>center.add(V().fromArray(positions,id*3).multiplyScalar(1/3)));const keyhole=center.z>0&&Math.pow(center.x/.010,2)+Math.pow((center.y-(neck.y-.053))/.017,2)<1;if(!keyhole)indices.push(...ids);}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);skinDetail(record,body,g,sequin,samples);
  for(const k of [0,cols/2])for(const row of [5,14]){
   const id=row*(cols+1)+k,anchor=V().fromArray(positions,id*3),shape=new T.Shape();
   shape.moveTo(0,0);shape.bezierCurveTo(-.024,.025,-.025,-.013,0,0);shape.bezierCurveTo(.024,.025,.025,-.013,0,0);
   const bow=new T.ShapeGeometry(shape,8);bow.rotateY(k===0?Math.PI/4:-Math.PI/4);bow.translate(anchor.x,anchor.y,anchor.z+.006);
   skinDetail(record,body,bow,mat('#f6b2d0'),Array.from({length:bow.attributes.position.count},()=>samples[id]));
   for(const sign of [-1,1]){const tail=new T.PlaneGeometry(.005,.032,1,3);tail.rotateZ(sign*.24);tail.translate(anchor.x+sign*.005,anchor.y-.015,anchor.z+.007);skinDetail(record,body,tail,mat('#f6b2d0'),Array.from({length:tail.attributes.position.count},()=>samples[id]));}
  }
  // Forearm cuffs inherit body weights, so they bend with the wrist and elbow.
  for(const side of['left','right']){
   const elbow=position(side+'LowerArm').applyMatrix4(inv),hand=position(side+'Hand').applyMatrix4(inv),axis=hand.clone().sub(elbow),len=axis.length();axis.normalize();
   const cuff=clone(record,body,v=>{const u=v.clone().sub(elbow).dot(axis),center=elbow.clone().addScaledVector(axis,u);v.sub(center).multiplyScalar(1.065).add(center);});
   const cuffIds=[];for(let i=0;i<ix.count;i+=3){const a=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(a.every(j=>{const v=V().fromBufferAttribute(p,j).sub(elbow),d=v.dot(axis);return d>len*.06&&d<len*1.06&&v.addScaledVector(axis,-d).length()<.065;}))cuffIds.push(...a);}
   cuff.geometry.setIndex(cuffIds);cuff.geometry.clearGroups();cuff.material=sequin;
  }
 }

 function* collar(record,source,neck,tie=false){
  const tris=triangles(source),local=neck.clone().applyMatrix4(source.matrixWorld.clone().invert()),positions=[],samples=[],indices=[];
  function point(x,y,front){
   const ray=new T.Ray(V().set(x,y,front?1:-1),V().set(0,0,front?-1:1));let best=null;
   for(const t of getTriangleQuery(tris).rayCandidates(ray)){const hit=ray.intersectTriangle(t.triangle.a,t.triangle.b,t.triangle.c,false,V());if(hit&&(!best||ray.origin.distanceToSquared(hit)<ray.origin.distanceToSquared(best.p)))best={p:hit,...t};}
   if(!best){const target=V().set(x,y,local.z+(front?.045:-.045));best=nearest(tris,target);}
   const bary=best.triangle.getBarycoord(best.p,V());best.p.z+=front?.002:-.002;
   positions.push(...best.p.toArray());samples.push({ids:best.ids,bary});return samples.length-1;
  }
  // Broad filled panels conform to the front, shoulders and upper back.
  function* panel(corners,front){yield;const n=10,start=samples.length;
   for(let y=0;y<=n;y++)for(let x=0;x<=n;x++){if((y*(n+1)+x)%128===0)yield;const u=x/n,v=y/n,a=new T.Vector2(...corners[0]).lerp(new T.Vector2(...corners[1]),u),b=new T.Vector2(...corners[3]).lerp(new T.Vector2(...corners[2]),u);a.lerp(b,v);point(local.x+a.x,local.y+a.y,front);}
   for(let y=0;y<n;y++)for(let x=0;x<n;x++){const a=start+y*(n+1)+x,b=a+1,c=a+n+1,d=c+1;indices.push(a,b,c,b,d,c);}
  }
  if(tie){yield* panel([[-.012,-.035],[.012,-.035],[.023,-.15],[-.023,-.15]],true);yield* panel([[-.023,-.15],[.023,-.15],[0,-.18],[0,-.18]],true);}
  else{for(const sign of[-1,1])yield* panel([[sign*.032,-.026],[sign*.105,-.048],[sign*.023,-.139],[sign*.015,-.112]],true);
  yield* panel([[-.09,-.035],[.09,-.035],[.085,-.105],[-.085,-.105]],false);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(indices);skinDetail(record,source,g,tie?dolceMaterial(null,'dolce-tie'):navy,samples);
 }
 for(const slot of ['top','bottom','shoes'])for(const [index,option]of options[slot].entries()){
  if(!option.style)continue;const donor=variants[option.variant],vrm=donor.vrm,source=donor.parts[slot],record={id:option.id,slot,index,meshes:[]};
  const bone=n=>vrm.humanoid.getRawBoneNode(n),position=n=>bone(n).getWorldPosition(V());
  if(option.style.startsWith('dolce-')){
   const style=option.style;
   if(style==='dolce-glitter'){
    yield* dolceHalter(record,donor,position);
   }else if(style==='dolce-skirt'){
    yield* dolceFlounces(record,donor,position);
   }else if(style==='dolce-pants'){
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
    const material=dolceMaterial(mesh,style),layers=style==='dolce-skirt'?[1.08,.85,.62]:[1];
    for(const layer of layers){const result=clone(record,mesh,v=>{
     if(style==='dolce-skirt'){const u=T.MathUtils.clamp((waist-v.y)/.25,0,1);const a=Math.atan2(v.z,v.x),wave=Math.sin(a*18.+layer*8.);v.y=waist-(waist-v.y)*layer+.010*wave*u+.018*Math.cos(a+.4)*u;const flare=1+.19*u+.035*wave*u;v.x*=flare;v.z*=flare;}
     if(style==='dolce-pants'){const u=T.MathUtils.clamp((waist-v.y)/.16,0,1),center=Math.sign(v.x)*legX;v.x=center+(v.x-center)*(1+.85*u);v.z*=1+.22*u;}
     if(style==='dolce-shirt'){v.x*=1.06;v.z*=1.13;v.y-=.035*T.MathUtils.clamp((waist+.06-v.y)/.10,0,1);}
    });result.material=material;if(style==='dolce-skirt'&&layer<1){result.material=material.clone();result.material.onBeforeCompile=material.onBeforeCompile;result.material.customProgramCacheKey=material.customProgramCacheKey;result.material.transparent=true;result.material.opacity=.92;result.material.depthWrite=false;}result.geometry.clearGroups();}
   }
   if(style==='dolce-skirt')yield* dolceRibbons(record,donor,position);
   if(style==='dolce-boots')for(const side of ['left','right']){const foot=position(side+'Foot'),knee=position(side+'LowerLeg'),p=foot.clone().lerp(knee,.73);const ring=new T.TorusGeometry(.043,.012,12,64);const rp=ring.attributes.position;for(let i=0;i<rp.count;i++){const v=V().fromBufferAttribute(rp,i),a=Math.atan2(v.y,v.x);v.multiplyScalar(1+.045*Math.sin(a*31.)+.025*Math.cos(a*47.));rp.setXYZ(i,v.x,v.y,v.z);}ring.computeVertexNormals();ring.rotateX(Math.PI/2);attached(record,bone(side+'LowerLeg'),ring,mat('#fffafa'),p);}
   if(style==='dolce-shirt')yield* collar(record,record.meshes[0],position('neck'),true);
  }else if(option.style==='puff-hoodie'){
   // Inflate sleeves around their own T-pose arm axes, not around world origin.
   for(const mesh of source){const inverse=mesh.matrixWorld.clone().invert(),segments=['left','right'].flatMap(side=>[['UpperArm','LowerArm'],['LowerArm','Hand']].map(([a,b])=>[position(side+a).applyMatrix4(inverse),position(side+b).applyMatrix4(inverse)]));
    clone(record,mesh,v=>{let best=null,d=Infinity;for(const[a,b]of segments){const axis=b.clone().sub(a),u=T.MathUtils.clamp(v.clone().sub(a).dot(axis)/axis.lengthSq(),0,1),center=a.clone().addScaledVector(axis,u),distance=v.distanceTo(center);if(distance<d){d=distance;best=center;}}
     if(Math.abs(v.x)>.16&&d<.10)v.sub(best).multiplyScalar(1.20).add(best);
    });
   }
  }else if(option.style==='sailor'){
   source.forEach(m=>clone(record,m,null));
   yield* collar(record,source[0],position('neck'));
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
    best=nearest(tris,target);
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

export function createClothingStyles(...args){const iterator=buildClothingStyles(...args);let step;do{step=iterator.next();}while(!step.done);return step.value;}
