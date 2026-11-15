import * as T from 'three';
// Flat boy's chest (owner 2026-11-14 "hình nam sao trông như kiểu có ngực vậy?"). The four VRoid donors are girls: the bust is
// modelled in the body mesh itself (the J_Sec_*_Bust bones only jiggle it, so flattening the bones just creases it). Boys' garments
// (Nam's shop and every boy/male-singer crew look) are sewn against a BOY copy of the donor: the same bones, materials and mesh
// transform, but the body geometry's bust region pressed flat (back to the line from the rib cage to the upper chest, then lightly smoothed;
// weighted by the bust bone weights) and the
// bust weights moved to upperChest (no jiggle). Every sewing module finds its body as donor.meshes' Body SKIN mesh and fits its
// skin shells, hulls and outlines to it, so all boys' tops follow. Girls keep the original donors and geometry untouched.
// YB / YT: rib cage under the bust and upper chest above it, body-local metres of the VRoid body all four donors share
const ITER=12,LAMBDA=.5,WELD=1e4,YB=.776,YT=.864,CUT=.022;
const boyDonors=new WeakMap();
function flatGeometry(body){
 const g=body.geometry,P=g.attributes.position,N=g.attributes.normal,SI=g.attributes.skinIndex,SW=g.attributes.skinWeight,n=P.count,bones=body.skeleton.bones;
 const bust=new Set(),upper=bones.findIndex(b=>/UpperChest$/.test(b.name));
 bones.forEach((b,i)=>{if(/J_Sec_[LR]_Bust/.test(b.name))bust.add(i);});
 const out=new T.BufferGeometry();
 for(const [k,a] of Object.entries(g.attributes))out.setAttribute(k,a);
 out.setIndex(g.index);for(const gr of g.groups)out.addGroup(gr.start,gr.count,gr.materialIndex);
 out.morphAttributes=g.morphAttributes;out.morphTargetsRelative=g.morphTargetsRelative;
 if(!bust.size||upper<0)return out;
 // weld seams by position so the smoothing and the normals see one surface
 const key=i=>Math.round(P.getX(i)*WELD)+","+Math.round(P.getY(i)*WELD)+","+Math.round(P.getZ(i)*WELD),weld=new Int32Array(n),ids=new Map();
 for(let i=0;i<n;i++){const k=key(i);let w=ids.get(k);if(w===undefined){w=ids.size;ids.set(k,w);}weld[i]=w;}
 const m=ids.size,mask=new Float32Array(m),pos=new Float64Array(m*3);
 for(let i=0;i<n;i++){const w=weld[i];let b=0;for(let k=0;k<4;k++)if(bust.has(SI.getComponent(i,k)))b+=SW.getComponent(i,k);mask[w]=Math.max(mask[w],T.MathUtils.smoothstep(b,0,.30));pos[w*3]=P.getX(i);pos[w*3+1]=P.getY(i);pos[w*3+2]=P.getZ(i);}
 const nb=Array.from({length:m},()=>null),ix=g.index.array,link=(a,b)=>{if(mask[a]>0||mask[b]>0){(nb[a]||(nb[a]=new Set())).add(b);(nb[b]||(nb[b]=new Set())).add(a);}};
 for(let t=0;t<ix.length;t+=3){const a=weld[ix[t]],b=weld[ix[t+1]],c=weld[ix[t+2]];link(a,b);link(b,c);link(c,a);}
 const moving=[];for(let w=0;w<m;w++)if(mask[w]>0&&nb[w])moving.push(w);
 // 1) remove the bulge: every bust vertex moves back by how far the girl's front surface at its (x, y) stands out of the line
 //    between the rib cage under the bust (YB) and the upper chest above it (YT) at the same x (only inward, at most CUT)
 const used=new Set(ix),cell=new Map(),ck=(x,y)=>Math.round(x/.004)+','+Math.round(y/.004);
 for(const i of used){const z=P.getZ(i);if(z<=0)continue;const k=ck(P.getX(i),P.getY(i));if(!(cell.get(k)>=z))cell.set(k,z);}
 const front=(x,y)=>{let z=-Infinity;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++){const v=cell.get((Math.round(x/.004)+a)+','+(Math.round(y/.004)+b));if(v>z)z=v;}return z;};
 for(const w of moving){const x=pos[w*3],y=pos[w*3+1];if(pos[w*3+2]<=0)continue;const zb=front(x,YB),zt=front(x,YT),zf=front(x,y);if(![zb,zt,zf].every(Number.isFinite))continue;
  const line=T.MathUtils.lerp(zb,zt,T.MathUtils.clamp((y-YB)/(YT-YB),0,1)),d=Math.max(-CUT,Math.min(0,line-zf));pos[w*3+2]+=d*mask[w];}
 // 2) a light smoothing pass over the bust region (under-bust crease, nipples)
 const lists=moving.map(w=>[...nb[w]]),next=new Float64Array(moving.length*3);
 for(let it=0;it<ITER;it++){
  moving.forEach((w,j)=>{const l=lists[j];let x=0,y=0,z=0;for(const q of l){x+=pos[q*3];y+=pos[q*3+1];z+=pos[q*3+2];}const f=LAMBDA*mask[w];next[j*3]=pos[w*3]+f*(x/l.length-pos[w*3]);next[j*3+1]=pos[w*3+1]+f*(y/l.length-pos[w*3+1]);next[j*3+2]=pos[w*3+2]+f*(z/l.length-pos[w*3+2]);});
  moving.forEach((w,j)=>{pos[w*3]=next[j*3];pos[w*3+1]=next[j*3+1];pos[w*3+2]=next[j*3+2];});
 }
 // normals of the welded surface around the moved region (area weighted), blended in by the bust mask
 const touched=new Uint8Array(m);for(const w of moving){touched[w]=1;for(const q of nb[w])touched[q]=1;}
 const nrm=new Float64Array(m*3),A=new T.Vector3(),B=new T.Vector3(),C=new T.Vector3();
 for(let t=0;t<ix.length;t+=3){const a=weld[ix[t]],b=weld[ix[t+1]],c=weld[ix[t+2]];if(!touched[a]&&!touched[b]&&!touched[c])continue;
  A.set(pos[b*3]-pos[a*3],pos[b*3+1]-pos[a*3+1],pos[b*3+2]-pos[a*3+2]);B.set(pos[c*3]-pos[a*3],pos[c*3+1]-pos[a*3+1],pos[c*3+2]-pos[a*3+2]);C.crossVectors(A,B);
  for(const v of [a,b,c]){nrm[v*3]+=C.x;nrm[v*3+1]+=C.y;nrm[v*3+2]+=C.z;}}
 const p2=new Float32Array(P.array.length),n2=new Float32Array(N.array.length),si2=new SI.array.constructor(SI.array),sw2=new Float32Array(SW.array.length);
 for(let i=0;i<n;i++){
  const w=weld[i];p2[i*3]=pos[w*3];p2[i*3+1]=pos[w*3+1];p2[i*3+2]=pos[w*3+2];
  const o=A.set(N.getX(i),N.getY(i),N.getZ(i));
  if(touched[w]){C.set(nrm[w*3],nrm[w*3+1],nrm[w*3+2]);if(C.lengthSq()>0){C.normalize();if(C.dot(o)<0)C.negate();o.lerp(C,Math.min(1,mask[w]*2)).normalize();}}
  n2[i*3]=o.x;n2[i*3+1]=o.y;n2[i*3+2]=o.z;
  // bust weights -> upperChest (one entry), the rest unchanged
  let moved=0;const e=[];for(let k=0;k<4;k++){const b=SI.getComponent(i,k),v=SW.getComponent(i,k);if(bust.has(b))moved+=v;else e.push([b,v]);}
  if(moved>0){const u=e.find(x=>x[0]===upper);if(u)u[1]+=moved;else e.push([upper,moved]);}
  for(let k=0;k<4;k++){si2[i*4+k]=e[k]?.[0]??0;sw2[i*4+k]=e[k]?.[1]??0;}
 }
 out.setAttribute('position',new T.BufferAttribute(p2,3));out.setAttribute('normal',new T.BufferAttribute(n2,3));
 out.setAttribute('skinIndex',new T.BufferAttribute(si2,4));out.setAttribute('skinWeight',new T.BufferAttribute(sw2,4));
 out.computeBoundingSphere();return out;
}
// the boy copy of one donor variant: same object except its Body SKIN mesh (never added to the scene; garments read its geometry
// and register on its parent / skeleton / bind matrix, which are the real body's)
export function boyDonor(variant){
 let d=boyDonors.get(variant);if(d)return d;
 const body=variant.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name)));if(!body){boyDonors.set(variant,variant);return variant;}
 const t0=performance.now(),boy=new T.SkinnedMesh(flatGeometry(body),body.material);boy.name=body.name;
 boy.position.copy(body.position);boy.quaternion.copy(body.quaternion);boy.scale.copy(body.scale);boy.bind(body.skeleton,body.bindMatrix);
 Object.defineProperty(boy,'matrixWorld',{get:()=>body.matrixWorld});Object.defineProperty(boy,'parent',{get:()=>body.parent});
 boy.userData.boyBody=true;
 d={...variant,meshes:variant.meshes.map(m=>m===body?boy:m),boy:true,boyBodyMs:performance.now()-t0};boyDonors.set(variant,d);return d;
}
// lazy: a donor's boy copy is made the first time a boy's garment asks for it (Nam's items all use donor 1)
const lists=new WeakMap();
export function boyVariants(variants){let l=lists.get(variants);if(!l){l=new Proxy(variants,{get:(t,k)=>typeof k==='string'&&/^\d+$/.test(k)&&t[k]?boyDonor(t[k]):Reflect.get(t,k)});lists.set(variants,l);}return l;}
// male wardrobe item ids: the Nam player's shop/sets/defaults and every crew look with role 'boy' (top/bottom/shoes)
export function maleItemIds(config){
 const ids=new Set(),slots=['top','bottom','shoes'],nam=config.characters?.nam;
 if(nam){for(const s of slots)for(const id of nam.shop?.[s]||[])ids.add(id);for(const s of slots)if(nam.defaults?.[s])ids.add(nam.defaults[s]);for(const set of nam.sets||[])for(const s of slots)if(set.selectionIds?.[s])ids.add(set.selectionIds[s]);}
 for(const list of Object.values(config.crewOutfits||{}))if(Array.isArray(list))for(const look of list)if(look?.role==='boy')for(const s of slots)if(look.selectionIds?.[s])ids.add(look.selectionIds[s]);
 return ids;
}
// The donor's own upper skin (neck, arms, hands; the torso under a top is alpha-cut but still writes depth, so a flat garment sank
// behind the girl's bust) shown under a boy's top: the same triangles as variant.parts.upper on the boy geometry.
export function boyUpperParts(variant){
 const d=boyDonor(variant),boy=d.meshes.find(m=>m.userData.boyBody);if(!boy)return null;
 const src=variant.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),out=[];
 for(const part of variant.parts.upper){
  if(part.geometry.attributes.position!==src.geometry.attributes.position){out.push(part);continue;}
  const geo=new T.BufferGeometry();for(const [k,a] of Object.entries(boy.geometry.attributes))geo.setAttribute(k,a);
  geo.setIndex(part.geometry.index);for(const gr of part.geometry.groups)geo.addGroup(gr.start,gr.count,gr.materialIndex);
  geo.morphAttributes=part.geometry.morphAttributes;geo.morphTargetsRelative=part.geometry.morphTargetsRelative;geo.boundingSphere=boy.geometry.boundingSphere;
  const mesh=new T.SkinnedMesh(geo,part.material);mesh.name=part.name+'__boy';
  mesh.position.copy(part.position);mesh.quaternion.copy(part.quaternion);mesh.scale.copy(part.scale);mesh.bind(part.skeleton,part.bindMatrix);mesh.frustumCulled=false;
  if(part.morphTargetInfluences){mesh.morphTargetInfluences=[...part.morphTargetInfluences];mesh.morphTargetDictionary={...part.morphTargetDictionary};}
  mesh.userData={...part.userData,boyBody:true};mesh.visible=false;part.parent.add(mesh);out.push(mesh);
 }
 return out;
}
