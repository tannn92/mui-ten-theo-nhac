import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const V=()=>new T.Vector3();
const fringeCache=new WeakMap(),goldMaps=new WeakMap(),darkMaps=new WeakMap();
function goldMap(old){if(!old)return old;if(goldMaps.has(old))return goldMaps.get(old);const img=old.image,c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,c.width,c.height),a=data.data;for(let i=0;i<a.length;i+=4){const l=(.2126*a[i]+.7152*a[i+1]+.0722*a[i+2])/255,k=.48+Math.sqrt(l);a[i]=Math.min(255,158*k);a[i+1]=Math.min(255,120*k);a[i+2]=Math.min(255,78*k);}ctx.putImageData(data,0,0);const t=old.clone();t.source=new T.Source(c);t.needsUpdate=true;goldMaps.set(old,t);return t;}
function darkMap(old){if(!old)return old;if(darkMaps.has(old))return darkMaps.get(old);const c=document.createElement('canvas'),img=old.image;c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);const d=x.getImageData(0,0,c.width,c.height);for(let i=0;i<d.data.length;i+=4){const l=(d.data[i]+d.data[i+1]+d.data[i+2])/765,k=.48+Math.sqrt(l);d.data[i]=38*k;d.data[i+1]=31*k;d.data[i+2]=38*k;}x.putImageData(d,0,0);const t=old.clone();t.source=new T.Source(c);t.needsUpdate=true;darkMaps.set(old,t);return t;}
function tintNative(m,id){m.color.set('#ffffff');if(m.shadeColorFactor)m.shadeColorFactor.set(id===4?'#c0a37e':'#847d87');m.map=id===4?goldMap(m.map):darkMap(m.map);m.shadeMultiplyTexture=id===4?goldMap(m.shadeMultiplyTexture):darkMap(m.shadeMultiplyTexture);return m;}
function cropLower(g,id){if(id!==4&&id!==8)return g;const p=g.attributes.position;for(let i=0;i<p.count;i++)if(p.getY(i)<1.075)p.setY(i,1.075+(p.getY(i)-1.075)*.20);g.computeVertexNormals();return g;}


function fringeGeometry(source){if(fringeCache.has(source))return fringeCache.get(source);const g=source.geometry,p=g.attributes.position,ix=g.index,parent=Array.from({length:p.count},(_,i)=>i),find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};for(let i=0;i<ix.count;i+=3){const a=ix.getX(i);parent[find(ix.getX(i+1))]=find(a);parent[find(ix.getX(i+2))]=find(a);}const bounds=new Map();for(const id of new Set(ix.array)){const root=find(id);let b=bounds.get(root);if(!b)bounds.set(root,b={minZ:Infinity,maxZ:-Infinity,maxX:0,minY:Infinity});b.minZ=Math.min(b.minZ,p.getZ(id));b.maxZ=Math.max(b.maxZ,p.getZ(id));b.maxX=Math.max(b.maxX,Math.abs(p.getX(id)));b.minY=Math.min(b.minY,p.getY(id));}const keep=new Set([...bounds].filter(([,b])=>b.minZ>.0&&b.maxZ>.065&&b.maxX<.151&&b.minY>.95).map(([id])=>id)),ids=[];for(let i=0;i<ix.count;i+=3)if(keep.has(find(ix.getX(i))))ids.push(ix.getX(i),ix.getX(i+1),ix.getX(i+2));const out=g.clone();out.clearGroups();out.setIndex(ids);fringeCache.set(source,out);return out;}
export const crewHairSpecs=[{id:1,name:'Tóc dài gợn sóng'},{id:2,name:'Hai bím tết thấp'},{id:3,name:'Tóc mái và hai đuôi ngắn'},{id:4,name:'Đuôi ngựa nâu vàng'},{id:6,name:'Tóc dài rẽ ngôi lệch'},{id:8,name:'Tóc buộc gọn phía sau'},{id:10,name:'Tóc dài lệch vai'},{id:11,name:'Tóc dài thẳng'}];
export function crewHairOptions(){return{hair:crewHairSpecs.map(s=>({id:`hat-mua-crew-hair-${s.id}`,style:`hat-mua-crew-hair-${s.id}`,variant:1,crewOnly:true,label:s.name}))};}
export function* buildHatMuaCrewHair(variants,options){
 const records=new Map(),parts=[],timings=[];
 for(const[index,opt]of(options.hair||[]).entries()){
  if(!opt.style?.startsWith('hat-mua-crew-hair-'))continue;
  const id=Number(opt.style.split('-').at(-1)),donor=variants[opt.variant],source=donor.parts.hair.find(m=>/HairBack/.test([].concat(m.material)[0]?.name))||donor.parts.hair[0],body=donor.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),start=performance.now(),skeleton=body.skeleton;
  const indexOf=name=>{const n=donor.vrm.humanoid.getRawBoneNode(name);const i=skeleton.bones.findIndex(b=>b.name===n.name);if(i<0)throw Error('Crew hair missing bone '+name);return i;},head=indexOf('head'),chest=indexOf('upperChest');
  const dark=id===4?'#9d713f':'#241c24',light=id===4?'#ba8a50':'#30252f',mat=new T.MeshStandardMaterial({color:dark,roughness:.42,metalness:0,side:T.DoubleSide}),shine=new T.MeshToonMaterial({color:light,side:T.DoubleSide});
  const rec={id:opt.id,index,slot:'hair',meshes:[]},batches=new Map([[mat,[]],[shine,[]]]);
  // Existing closed scalp contains no native buns or braids. Keep UVs/weights.
  const scalp=cropLower(source.geometry.clone(),id);scalp.clearGroups();const scalpMat=tintNative([].concat(source.material)[0].clone(),id);
  const cap=new T.SkinnedMesh(scalp,scalpMat);cap.name=opt.id+'_scalp';cap.position.copy(source.position);cap.quaternion.copy(source.quaternion);cap.scale.copy(source.scale);cap.bind(source.skeleton,source.bindMatrix);cap.visible=false;cap.frustumCulled=false;source.parent.add(cap);rec.meshes.push(cap);
  const fringeSource=donor.parts.hair.find(m=>m!==source);if(fringeSource){const g=cropLower(fringeGeometry(fringeSource).clone(),id),m=tintNative([].concat(fringeSource.material)[0].clone(),id);const f=new T.SkinnedMesh(g,m);f.name=opt.id+'_native-fringe';f.position.copy(fringeSource.position);f.quaternion.copy(fringeSource.quaternion);f.scale.copy(fringeSource.scale);f.bind(fringeSource.skeleton,fringeSource.bindMatrix);f.visible=false;f.frustumCulled=false;fringeSource.parent.add(f);rec.meshes.push(f);
   const bg=cropLower(g.clone(),id),p=bg.attributes.position,si=bg.attributes.skinIndex,sw=bg.attributes.skinWeight;for(let i=0;i<p.count;i++){p.setXYZ(i,-p.getX(i),p.getY(i),-.04-p.getZ(i));si.setXYZW(i,head,0,0,0);sw.setXYZW(i,1,0,0,0);}bg.computeVertexNormals();const b=new T.SkinnedMesh(bg,m);b.name=opt.id+'_combed-back';b.position.copy(body.position);b.quaternion.copy(body.quaternion);b.scale.copy(body.scale);b.bind(skeleton,body.bindMatrix);b.visible=false;b.frustumCulled=false;body.parent.add(b);rec.meshes.push(b);}

  function geometry(g,material=mat,rigid=false){const p=g.attributes.position,si=[],sw=[];for(let i=0;i<p.count;i++){const lower=rigid?0:T.MathUtils.smoothstep(1.035-p.getY(i),0,.28)*.38;si.push(head,chest,0,0);sw.push(1-lower,lower,0,0);}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.deleteAttribute('uv');batches.get(material).push(g);}
  function lock(points,width=.019,depth=.009,wave=0,phase=0,rigid=false){
   const curve=new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a))),p=[],ix=[],rows=28,cols=8;
   for(let j=0;j<=rows;j++){const u=j/rows,c=curve.getPoint(u),t=curve.getTangent(u).normalize(),across=V().crossVectors(t,V().set(0,0,1)).normalize();if(across.lengthSq()<.1)across.set(1,0,0);const out=V().crossVectors(across,t).normalize(),taper=.035+.965*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.38);c.addScaledVector(across,wave*Math.sin(u*Math.PI*3+phase)*Math.sin(u*Math.PI));for(let k=0;k<=cols;k++){const a=k/cols*Math.PI*2,v=c.clone().addScaledVector(across,Math.cos(a)*width*taper).addScaledVector(out,Math.sin(a)*depth*taper);p.push(...v.toArray());}}
   for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;ix.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();geometry(g,mat,rigid);
   // Thin strand highlight follows the actual top surface, never across the face.
   const hp=[],hi=[];for(let j=0;j<=rows;j++){const u=j/rows,c=curve.getPoint(u),t=curve.getTangent(u).normalize(),across=V().crossVectors(t,V().set(0,0,1)).normalize(),taper=.035+.965*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.38);c.addScaledVector(across,wave*Math.sin(u*Math.PI*3+phase)*Math.sin(u*Math.PI));c.z+=depth*taper+.0003;hp.push(c.x-.0015*taper,c.y,c.z,c.x+.0015*taper,c.y,c.z);}for(let j=0;j<rows;j++){const a=j*2;hi.push(a,a+1,a+2,a+1,a+3,a+2);}const hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(hp,3));hg.setIndex(hi);hg.computeVertexNormals();geometry(hg,shine,rigid);
  }
  function sweep(side,part=.0){}
  function back(length=.73,wave=0){for(let j=0;j<15;j++){const a=Math.PI*.12+j/14*Math.PI*.76,x=Math.cos(a)*.113,z=-Math.sin(a)*.135-.015;lock([[x*.70,1.21,z*.70],[x,1.10,z],[x*1.12,.94,z*1.03],[x*(1.1+.10*Math.sin(j)),length+.018*Math.sin(j*2),z+.016*Math.sin(j)]],id===1?.020:.024,.010,wave,j);}}
  function frontLong(side,length,wave=0,count=3){for(let j=0;j<count;j++){const s=side;lock([[s*(.103+j*.009),1.18,.072],[s*(.135+j*.008),1.075,.068],[s*(.14+j*.013),.92,.055],[s*(.15+j*.015),length+.015*j,.075]],id===1?.015:.018,.008,wave,j);}}
  if([1,6,10,11].includes(id)){
   back(id===11?.69:id===1?.72:.70,id===11?0:.008);sweep(-1,id===6||id===10?.035:0);sweep(1,id===6||id===10?.035:0);
   if(id===1){frontLong(-1,.73,.019,4);frontLong(1,.73,.019,4);}else if(id===11){frontLong(-1,.72,0,3);frontLong(1,.72,0,3);}else{frontLong(-1,.69,.009,5);frontLong(1,.83,.006,2);}
  }else if(id===2){
   sweep(-1);sweep(1);back(.96,.001);
   for(const sign of[-1,1])for(let strand=0;strand<3;strand++){const points=[];for(let j=0;j<=28;j++){const u=j/28,a=u*Math.PI*12+strand*Math.PI*2/3;points.push([sign*(.127+.010*Math.sin(u*Math.PI))+.0065*Math.cos(a),1.066-u*.34,.045+.0065*Math.sin(a)]);}lock(points,.0068,.0052,0,strand);}
  }else if(id===3){
   back(.97,.003);
   for(const s of[-1,1])for(let j=0;j<5;j++)lock([[s*.119,1.071,-.010],[s*(.153+j*.006),1.024,.015],[s*(.155+j*.005),.938,.039],[s*(.145+j*.005),.912+.005*j,.052]],.015,.008,.006,j);
  }else if(id===4){
   sweep(-1,.045);sweep(1,.045);back(1.085,0);for(let j=0;j<12;j++){const a=j/12*Math.PI*2;lock([[.025,1.224,-.119],[.058+Math.cos(a)*.025,1.213,-.169],[.085+Math.cos(a)*.032,1.02,-.172],[.065+Math.cos(a)*.030,.79+.025*Math.sin(a),-.145]],.017,.008,.004,j);}
  }else if(id===8){
   sweep(-1);sweep(1);back(1.085,0);for(let j=0;j<10;j++){const a=j/10*Math.PI*2;lock([[0,1.048,-.15],[Math.cos(a)*.024,.98,-.17],[Math.cos(a)*.025,.83,-.16]],.016,.008,.002,j);}
  }
  if(id===10){const clip=new T.MeshStandardMaterial({color:'#fff9ec',roughness:.35});batches.set(clip,[]);for(const side of[-1,1]){const g=new T.SphereGeometry(1,8,6);g.scale(.014,.024,.004);g.rotateZ(side*.7);g.translate(.112+side*.008,1.146,.105);geometry(g,clip,true);}}
  if(id===2){
   // Sample the actual scalp/fringe rest surface: the band follows its outermost
   // cross-section rather than a generic sphere or a floating hat boundary.
   const bandMat=new T.MeshStandardMaterial({color:'#d52d69',roughness:.55,side:T.DoubleSide});batches.set(bandMat,[]);
   const sampleMat=new T.MeshBasicMaterial({side:T.DoubleSide}),surface=rec.meshes.map(m=>new T.Mesh(m.geometry,sampleMat)),ray=new T.Raycaster(),pos=[],idx=[],rows=80,cols=6,center=V().set(0,1.075,.045);
   for(const m of surface)m.updateMatrixWorld(true);
   for(let i=0;i<=rows;i++){const a=-.06+i/rows*(Math.PI+.12),dir=V().set(Math.cos(a),Math.sin(a),.50*Math.sin(a)).normalize();for(let j=0;j<=cols;j++){const c=center.clone();c.z+=(j/cols-.5)*.024;c.y-=(j/cols-.5)*.015;ray.set(c.clone().addScaledVector(dir,.35),dir.clone().negate());const hit=ray.intersectObjects(surface,false).find(h=>h.distance<.35);const r=hit?.point.clone().sub(c).dot(dir)??.13;const point=c.addScaledVector(dir,r+.0018);pos.push(...point.toArray());}}
   const radii=[];for(let i=0;i<=rows;i++){let r=0;for(let j=0;j<=cols;j++){const k=(i*(cols+1)+j)*3;r=Math.max(r,Math.hypot(pos[k],pos[k+1]-center.y,pos[k+2]-center.z));}radii.push(r);}for(let i=0;i<=rows;i++){const a=-.06+i/rows*(Math.PI+.12),blend=Math.sin(i/rows*Math.PI)**2,avg=radii.slice(Math.max(0,i-8),Math.min(rows+1,i+9)).reduce((a,b)=>a+b,0)/radii.slice(Math.max(0,i-8),Math.min(rows+1,i+9)).length,r=avg+.004*blend-.022*(1-blend)**2;for(let j=0;j<=cols;j++){const k=(i*(cols+1)+j)*3;const d=V().set(Math.cos(a),Math.sin(a),.50*Math.sin(a)).normalize();pos[k]=d.x*r;const width=.38+.62*Math.sin(i/rows*Math.PI);pos[k+1]=center.y+d.y*r-(j/cols-.5)*.011*width;pos[k+2]=center.z+d.z*r+(j/cols-.5)*.018*width;}}
   for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const a=i*(cols+1)+j;idx.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();geometry(g,bandMat,true);sampleMat.dispose();
  }
  for(const[material,geos]of batches){if(!geos.length)continue;const g=mergeGeometries(geos,false);for(const x of geos)x.dispose();g.computeBoundingSphere();const mesh=new T.SkinnedMesh(g,material);mesh.name=opt.id+(material===mat?'_locks':'_sheen');mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(skeleton,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;body.parent.add(mesh);rec.meshes.push(mesh);}
  rec.buildMs=performance.now()-start;records.set('hair:'+index,rec);for(const mesh of rec.meshes)parts.push({slot:'hair',variant:index,donor:opt.variant,mesh});timings.push({id,index,milliseconds:rec.buildMs,meshes:rec.meshes.length});yield;
 }
 return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){for(const p of parts)p.mesh.visible=false;}};
}
export function createHatMuaCrewHair(...args){const it=buildHatMuaCrewHair(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
