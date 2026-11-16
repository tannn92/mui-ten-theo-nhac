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
// boy silhouette (body-local metres, same VRoid body): hip/thigh slim window, seat, waist fill window
const HIP0=.47,HIP1=.57,HIP2=.645,HIP3=.73,HIPX=.030,HIPS=.76,SEAT=-.028,SEATS=.55,WAIST0=.63,WAIST1=.86,LEG0=.10,LEG1=.18,LEGS=.88;
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
 // 3) boy's silhouette (owner 2026-11-15 "quần áo nam cho nam tính lên"): slimmer hips and thighs, a flatter seat, and the waist
 //    filled to a straight line from the hips to the chest, so every boy's top and pair of trousers sewn on this body follows
 const shaped=silhouette(g,bones,weld,m,pos,body.skeleton);
 // normals of the welded surface around the moved region (area weighted), blended in by the bust mask
 const touched=new Uint8Array(m);for(const w of moving){touched[w]=1;for(const q of nb[w])touched[q]=1;}
 for(let w=0;w<m;w++)if(shaped[w]>0){touched[w]=1;mask[w]=Math.max(mask[w],.5);}
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
// main bone class of every welded vertex: t torso chain, l leg, o other (arms, neck, head, feet)
function classes(g,bones,weld,m){
 const SI=g.attributes.skinIndex,SW=g.attributes.skinWeight,cls=new Uint8Array(m),kind=bones.map(b=>/C_(Hips|Spine|Chest|UpperChest)$/.test(b.name)?1:/_(UpperLeg|LowerLeg)$/.test(b.name)?2:0);
 for(let i=0;i<SI.count;i++){let best=-1,w=0;for(let k=0;k<4;k++){const v=SW.getComponent(i,k);if(v>w){w=v;best=SI.getComponent(i,k);}}cls[weld[i]]=best<0?0:kind[best];}
 return cls;
}
function silhouette(g,bones,weld,m,pos,sk){
 const cls=classes(g,bones,weld,m),moved=new Float32Array(m),S=T.MathUtils.smoothstep;
 // 0) slimmer legs: leg vertices pulled towards their leg's axis by LEGS (full from the shin to the crotch, none at the ankle)
 const L=['L','R'].map(s=>['UpperLeg','LowerLeg','Foot'].map(n=>boneY(sk,'J_Bip_'+s+'_'+n)));
 if(L.every(l=>l.every(Boolean)))for(let w=0;w<m;w++){if(cls[w]!==2)continue;const x=pos[w*3],y=pos[w*3+1],z=pos[w*3+2],l=L[(x>=0)===(L[0][0].x>=0)?0:1];
  const k=S(y,LEG0,LEG1)*(1-S(y,l[0].y-.02,l[0].y+.03));if(k<=0)continue;const a=y>l[1].y?l[1]:l[2],b=y>l[1].y?l[0]:l[1],t=T.MathUtils.clamp((y-a.y)/(b.y-a.y),0,1),cx=a.x+(b.x-a.x)*t,cz=a.z+(b.z-a.z)*t,f=1-k*(1-LEGS);
  const nx=cx+(x-cx)*f,nz=cz+(z-cz)*f;moved[w]+=Math.hypot(nx-x,nz-z);pos[w*3]=nx;pos[w*3+2]=nz;}
 // a) hips and thighs: |x| beyond HIPX squeezed by HIPS (full between HIP1 and HIP2), b) seat: the back beyond SEAT pulled in by SEATS
 for(let w=0;w<m;w++){if(!cls[w])continue;const x=pos[w*3],y=pos[w*3+1],z=pos[w*3+2];
  const k=Math.min(S(y,HIP0,HIP1),1-S(y,HIP2,HIP3));if(k<=0)continue;
  const ax=Math.abs(x);if(ax>HIPX){const nx=Math.sign(x)*(HIPX+(ax-HIPX)*(1-k*(1-HIPS)));moved[w]+=Math.abs(nx-x);pos[w*3]=nx;}
  if(z<SEAT){const nz=SEAT+(z-SEAT)*(1-k*(1-SEATS));moved[w]+=Math.abs(nz-z);pos[w*3+2]=nz;}}
 // c) waist: the torso half-width per 1 cm slice, filled up to the straight line from the slimmed hips (WAIST0) to the chest (WAIST1)
 const bin=y=>Math.round(y*100),half=new Map();
 for(let w=0;w<m;w++){if(cls[w]!==1)continue;const y=pos[w*3+1];if(y<WAIST0-.02||y>WAIST1+.02)continue;const b=bin(y);half.set(b,Math.max(half.get(b)||0,Math.abs(pos[w*3])));}
 const at=y=>{const b=bin(y);let v=0;for(let d=-1;d<=1;d++)v=Math.max(v,half.get(b+d)||0);return v;},h0=at(WAIST0),h1=at(WAIST1);
 if(h0>0&&h1>0)for(let w=0;w<m;w++){if(cls[w]!==1)continue;const y=pos[w*3+1];if(y<=WAIST0||y>=WAIST1)continue;
  const cur=at(y),target=T.MathUtils.lerp(h0,h1,(y-WAIST0)/(WAIST1-WAIST0));if(!(cur>0)||target<=cur)continue;
  const f=1+(target/cur-1)*Math.min(S(y,WAIST0,WAIST0+.03),1-S(y,WAIST1-.03,WAIST1)),nx=pos[w*3]*f;moved[w]+=Math.abs(nx-pos[w*3]);pos[w*3]=nx;}
 return moved;
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
// the boy copy of the donor's lower skin (hips and legs; slimmer than the girl's) shown under a boy's trousers
export const boyLowerParts=variant=>boyUpperParts(variant,'lower');
// male wardrobe item ids: the Nam player's shop/sets/defaults and every crew look with role 'boy' (top/bottom/shoes)
export function maleItemIds(config){
 const ids=new Set(),slots=['top','bottom','shoes'],nam=config.characters?.nam;
 if(nam){for(const s of slots)for(const id of nam.shop?.[s]||[])ids.add(id);for(const s of slots)if(nam.defaults?.[s])ids.add(nam.defaults[s]);for(const set of nam.sets||[])for(const s of slots)if(set.selectionIds?.[s])ids.add(set.selectionIds[s]);}
 for(const list of Object.values(config.crewOutfits||{}))if(Array.isArray(list))for(const look of list)if(look?.role==='boy')for(const s of slots)if(look.selectionIds?.[s])ids.add(look.selectionIds[s]);
 return ids;
}
// The donor's own upper skin (neck, arms, hands; the torso under a top is alpha-cut but still writes depth, so a flat garment sank
// behind the girl's bust) shown under a boy's top: the same triangles as variant.parts.upper on the boy geometry.
export function boyUpperParts(variant,key='upper'){
 const d=boyDonor(variant),boy=d.meshes.find(m=>m.userData.boyBody);if(!boy)return null;
 const src=variant.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),out=[];
 for(const part of variant.parts[key]){
  // the girl's skirt safety shorts never go under a boy's trousers (they stood out of the slimmer straight legs)
  if(part.geometry.attributes.position!==src.geometry.attributes.position){if(!(key==='lower'&&/_cream_undershorts$/.test(part.name)))out.push(part);continue;}
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

// Boys' tops bend with the spine (owner 2026-11-15 "sao ảnh kia nhân vật nam vẫn có ngực vậy?": Nam bending forward under the
// HYLT arch, 2:14-2:16). The sewn torso shells jumped from hips weights at the waist straight to upperChest at the chest (spine and
// chest got almost nothing), so a deep forward bend folded the top sharply under the chest like a bust and lifted the hem off the
// belly. Every vertex weighted ONLY to the torso chain (hips, spine, chest, upperChest) gets a smooth blend by its rest height
// between the two chain bones around it; arm, shoulder and neck weights (armpits, collar, sleeves) stay as sewn. Boys' tops only.
const TORSO=['Hips','Spine','Chest','UpperChest'],torsoM=new T.Matrix4(),torsoV=new T.Vector3();
export function smoothTorsoWeights(meshes){
 for(const mesh of meshes||[]){
  const sk=mesh?.isSkinnedMesh?mesh.skeleton:null,g=mesh?.geometry,P=g?.attributes.position,SI=g?.attributes.skinIndex,SW=g?.attributes.skinWeight;
  if(!sk||!P||!SI||!SW||g.userData.boyTorsoSmoothed)continue;
  const ks=TORSO.map(n=>sk.bones.findIndex(b=>b.name==='J_Bip_C_'+n));if(ks.some(k=>k<0))continue;
  const ys=ks.map(k=>torsoM.copy(sk.boneInverses[k]).invert().elements[13]);if(!(ys[0]<ys[1]&&ys[1]<ys[2]&&ys[2]<ys[3]))continue;
  const torso=new Set(ks);
  for(let i=0;i<P.count;i++){
   let only=true,any=false;for(let j=0;j<4;j++){if(!(SW.getComponent(i,j)>0))continue;any=true;if(!torso.has(SI.getComponent(i,j))){only=false;break;}}
   if(!only||!any)continue;
   const y=torsoV.fromBufferAttribute(P,i).applyMatrix4(mesh.bindMatrix).y;
   let a=0,f=0;if(y>=ys[3])a=3;else if(y>ys[0]){a=y<ys[1]?0:y<ys[2]?1:2;f=(y-ys[a])/(ys[a+1]-ys[a]);}
   SI.setXYZW(i,ks[a],ks[Math.min(a+1,3)],0,0);SW.setXYZW(i,1-f,f,0,0);
  }
  SI.needsUpdate=true;SW.needsUpdate=true;g.userData.boyTorsoSmoothed=true;
 }
}

// Boys' trousers hang straight (owner 2026-11-15 "quần áo nam cho nam tính lên"): bell-bottoms, palazzo legs and wide hips read
// as a girl's. After a boy's bottom is sewn, every vertex further out than the boy body's own surface plus an ease (per 1 cm slice and
// 15-degree sector, around each leg axis below the crotch and around the pelvis above it) is pulled in: r' = cap + (r - cap) * k, k
// chosen so the garment's outermost layer ends EXTRA beyond the cap. The mapping is monotone, so layers keep their order. Below the
// knee the cap stays the knee's (a straight leg, no taper and no flare). Boys' tops get the same cap below the waist (no peplum flare
// around the hips). The geometry is copied first (positions and normals), so a geometry shared with any other item never changes.
const SECT=24,envs=new WeakMap(),gv=new T.Vector3();
function boneY(sk,name){const k=sk.bones.findIndex(b=>b.name===name);if(k<0)return null;const e=new T.Matrix4().copy(sk.boneInverses[k]).invert().elements;return new T.Vector3(e[12],e[13],e[14]);}
function bodyEnvelope(body){
 let E=envs.get(body);if(E)return E;
 const sk=body.skeleton,g=body.geometry,P=g.attributes.position,mats=[].concat(body.material),skin=new Uint8Array(P.count);
 for(const gr of g.groups.length?g.groups:[{start:0,count:g.index.count,materialIndex:0}])if(/SKIN/.test(mats[gr.materialIndex]?.name||''))for(let t=gr.start;t<gr.start+gr.count;t++)skin[g.index.array[t]]=1;
 const L=['L','R'].map(s=>({hip:boneY(sk,'J_Bip_'+s+'_UpperLeg'),knee:boneY(sk,'J_Bip_'+s+'_LowerLeg'),foot:boneY(sk,'J_Bip_'+s+'_Foot')}));
 const hips=boneY(sk,'J_Bip_C_Hips');if(!hips||L.some(l=>!l.hip||!l.knee||!l.foot))return null;
 const crotch=L[0].hip.y-.055;
 const axis=(side,y)=>{const l=L[side],a=y>l.knee.y?l.knee:l.foot,b=y>l.knee.y?l.hip:l.knee,t=T.MathUtils.clamp((y-a.y)/(b.y-a.y),0,1);return [a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t];};
 const centre=[0,hips.z];
 const grid=()=>new Map(),put=(map,y,a,r)=>{const k=Math.round(y*100)*SECT+a;if(!(map.get(k)>=r))map.set(k,r);};
 const legs=[grid(),grid()],pelvis=grid(),sector=(dx,dz)=>((Math.round(Math.atan2(dz,dx)/(2*Math.PI)*SECT)%SECT)+SECT)%SECT;
 for(let i=0;i<P.count;i++){if(!skin[i])continue;gv.fromBufferAttribute(P,i).applyMatrix4(body.bindMatrix);const y=gv.y;if(y<L[0].foot.y||y>hips.y+.2)continue;
  if(y<crotch+.03){const side=gv.x>=0===(L[0].hip.x>=0)?0:1,[cx,cz]=axis(side,y),dx=gv.x-cx,dz=gv.z-cz;put(legs[side],y,sector(dx,dz),Math.hypot(dx,dz));}
  if(y>crotch-.03){const dx=gv.x-centre[0],dz=gv.z-centre[1];put(pelvis,y,sector(dx,dz),Math.hypot(dx,dz));}}
 // a cell's radius: the max of its 3x3 neighbourhood (empty cells take the nearest filled slice of that sector)
 const look=(map,y,a)=>{const b=Math.round(y*100);for(let d=0;d<6;d++){let v=0;for(const bb of d?[b-d,b+d]:[b])for(let da=-1;da<=1;da++)for(let db=-1;db<=1;db++){const r=map.get((bb+db)*SECT+((a+da+SECT)%SECT));if(r>v)v=r;}if(v>0)return v;}return 0;};
 // body skin vertices of the legs and pelvis per 1 cm slice and side, for the skin weights of rebuilt trouser legs
 const near=new Map();for(let i=0;i<P.count;i++){if(!skin[i])continue;gv.fromBufferAttribute(P,i).applyMatrix4(body.bindMatrix);if(gv.y>crotch+.06)continue;const k=Math.round(gv.y*100)*2+(gv.x>=0===(L[0].hip.x>=0)?0:1);if(!near.has(k))near.set(k,[]);near.get(k).push(i,gv.x,gv.y,gv.z);}
 const straightK=[0,1].map(side=>{const out=new Float64Array(SECT);for(let a=0;a<SECT;a++)for(let y=L[side].foot.y+.06;y<=L[side].knee.y+.04;y+=.01)out[a]=Math.max(out[a],look(legs[side],y,a));return out;});
 const straight=(side,a)=>straightK[side][a];
 E={L,hips,crotch,axis,centre,legs,pelvis,look,sector,near,straight,SI:g.attributes.skinIndex,SW:g.attributes.skinWeight};envs.set(body,E);return E;
}
// cap (radius) and pivot for one garment point; null when out of range. kind: 'bottom' or 'top'
function capFor(E,x,y,z,kind){
 const S=T.MathUtils.smoothstep;
 if(kind==='top'){if(y>E.hips.y+.07||y<E.crotch-.06)return null;const dx=x-E.centre[0],dz=z-E.centre[1],a=E.sector(dx,dz);const body=E.look(E.pelvis,Math.max(y,E.crotch+.01),a);if(!body)return null;
  // full cap below the hips joint + 3 cm, none above the waist (hips + 7 cm)
  return {cx:E.centre[0],cz:E.centre[1],cap:body+.022,w:1-S(y,E.hips.y+.03,E.hips.y+.07)};}
 if(y>E.hips.y+.05)return null;
 if(kind==='shoes'&&y>=E.crotch)return null;
 if(y>=E.crotch){const dx=x-E.centre[0],dz=z-E.centre[1],body=E.look(E.pelvis,y,E.sector(dx,dz));if(!body)return null;return {cx:E.centre[0],cz:E.centre[1],cap:body+.008,w:1-S(y,E.hips.y,E.hips.y+.05)};}
 const side=x>=0===(E.L[0].hip.x>=0)?0:1,[cx,cz]=E.axis(side,y),dx=x-cx,dz=z-cz,a=E.sector(dx,dz),knee=E.L[side].knee.y;
 // straight leg: below the knee the knee's radius (+ more ease towards the hem), above it the thigh's
 // straight leg: from the foot to the knee one radius per direction (the widest of shin, calf and knee), above the knee the thigh's,
 // never narrower than that straight radius up to 8 cm above the knee (no step at the knee)
 const K=E.straight(side,a),own=E.look(E.legs[side],y,a),r=y<knee?Math.max(K,own):Math.max(own,K*(1-S(y,knee+.08,knee+.14)));if(!r)return null;
 const ease=y<knee?.010+.004*S(knee-y,0,.2):T.MathUtils.lerp(.010,.008,S(y,knee,E.crotch));
 const inner=Math.max(0,-Math.sign(E.L[side].hip.x)*dx/(Math.hypot(dx,dz)||1));
 // boys' boot shafts (Secret / LAVIEM) hug the shin above the foot, so the straight trousers cover them
 if(kind==='shoes'){const f=E.L[side].foot.y,b=E.look(E.legs[side],y,a);return y<f+.035||!b?null:{cx,cz,cap:b+.005,w:S(y,f+.035,f+.06)};}
 return {cx,cz,cap:r+ease*(1-.7*inner),w:1};
}
export function straightenBoyGarment(meshes,kind,boyBody){
 const body=boyBody;
 const EXTRA=kind==='top'?.006:kind==='shoes'?.001:.004,out=new Map(),list=(meshes||[]).filter(m=>m?.isSkinnedMesh&&m.geometry?.attributes.position&&!m.geometry.userData.boyStraight);if(!list.length)return [];
 const E=body&&bodyEnvelope(body);if(!E)return [];
 // trousers whose two legs are one piece (palazzo, wide jeans: vertices on the centre line below the knee) get new straight legs
 let joined=false;if(kind==='bottom'){let c=0;for(const mesh of list){const P=mesh.geometry.attributes.position;for(let i=0;i<P.count;i++){gv.fromBufferAttribute(P,i).applyMatrix4(mesh.bindMatrix);if(gv.y<E.L[0].knee.y&&Math.abs(gv.x)<.008)c++;}}joined=c>20;}
 // pass 1: per cell, how far the garment's outermost layer stands beyond the cap
 const pts=[],far=new Map();let moved=0;
 for(const mesh of list){const P=mesh.geometry.attributes.position,inv=mesh.bindMatrix,info=new Array(P.count);
  for(let i=0;i<P.count;i++){gv.fromBufferAttribute(P,i).applyMatrix4(inv);const c=capFor(E,gv.x,gv.y,gv.z,kind);if(!c)continue;const dx=gv.x-c.cx,dz=gv.z-c.cz,r=Math.hypot(dx,dz);if(r<=c.cap)continue;
   const key=Math.round(gv.y*100)*SECT+E.sector(dx,dz);far.set(key,Math.max(far.get(key)||0,r-c.cap));info[i]={c,r,dx,dz,key,p:gv.clone()};}
  pts.push([mesh,info]);}
 const reach=k=>{let v=0;for(const d of [-2*SECT,-SECT,0,SECT,2*SECT])for(const e of [-1,0,1])v=Math.max(v,far.get(k+d+e)||0);return v;};
 for(const [mesh,info] of pts){
  if(!info.some(Boolean)&&!joined)continue;
  let geo=out.get(mesh.geometry);if(!geo){const g=mesh.geometry;geo=new T.BufferGeometry();for(const [k,a] of Object.entries(g.attributes))geo.setAttribute(k,a);geo.setIndex(g.index);for(const gr of g.groups)geo.addGroup(gr.start,gr.count,gr.materialIndex);
   geo.morphAttributes=g.morphAttributes;geo.morphTargetsRelative=g.morphTargetsRelative;geo.setAttribute('position',g.attributes.position.clone());if(g.attributes.normal)geo.setAttribute('normal',g.attributes.normal.clone());geo.userData={...g.userData,boyStraight:true};out.set(g,geo);
   const P=geo.attributes.position,back=new T.Matrix4().copy(mesh.bindMatrix).invert();
   info.forEach((d,i)=>{if(!d)return;const span=reach(d.key);const k=span>EXTRA?EXTRA/span:1,ex=d.r-d.c.cap,nr=d.c.cap+ex*k,r2=d.r+(nr-d.r)*d.c.w,s=r2/d.r;
    d.p.x=d.c.cx+d.dx*s;d.p.z=d.c.cz+d.dz*s;d.p.applyMatrix4(back);P.setXYZ(i,d.p.x,d.p.y,d.p.z);moved++;});
   // trousers whose legs touched (palazzo, wide jeans) share triangles across the crotch gap: once the legs are pulled apart they
   // would stretch into a web between them, so those triangles (below the crotch, sides differ or stretched > 2.5x) are dropped
   if(kind==='bottom'&&g.index&&g.groups.length<2){const O=g.attributes.position,ix=g.index.array,keep=[],q=new T.Vector3(),side=i=>{q.fromBufferAttribute(O,i).applyMatrix4(mesh.bindMatrix);return q.x>=0;},
     low=i=>{q.fromBufferAttribute(O,i).applyMatrix4(mesh.bindMatrix);return q.y<E.crotch+(joined?.012:-.005);},len=(A,a,b)=>Math.hypot(A.getX(a)-A.getX(b),A.getY(a)-A.getY(b),A.getZ(a)-A.getZ(b)),edge=(A,a,b,c)=>Math.max(len(A,a,b),len(A,b,c),len(A,c,a));let dropped=0;
    for(let t=0;t<ix.length;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];
     if((joined&&(low(a)||low(b)||low(c)))||low(a)&&low(b)&&low(c)&&((side(a)!==side(b)||side(b)!==side(c))||(edge(P,a,b,c)>.01&&edge(P,a,b,c)>2.5*edge(O,a,b,c)))){dropped++;continue;}keep.push(a,b,c);}
    if(dropped){geo.setIndex(keep);geo.clearGroups();for(const gr of g.groups)geo.addGroup(0,keep.length,gr.materialIndex);geo.userData.boyDropped=dropped;}}
   P.needsUpdate=true;geo.computeBoundingSphere();}
  mesh.geometry=geo;}
 if(!joined)return [];
 // The new legs are a shell of the boy body itself (its triangles and exact skin weights, so it moves exactly like the legs): below
 // the crotch every leg vertex goes out from its leg axis to the straight-leg cap (at least skin + 10 mm); around the crotch it
 // stands 15 mm out along the normal; above that it sinks back under the kept pelvis part. Made in the material of the piece that
 // lost the most leg triangles.
 const src=list.slice().sort((a,b)=>(b.geometry.userData.boyDropped||0)-(a.geometry.userData.boyDropped||0))[0];if(!src.geometry.userData.boyDropped)return [];
 const SP=src.geometry.attributes.position;let hem=Infinity;for(let i=0;i<SP.count;i++){gv.fromBufferAttribute(SP,i).applyMatrix4(src.bindMatrix);hem=Math.min(hem,gv.y);}
 const g=body.geometry,P=g.attributes.position,mats=[].concat(body.material),gr=g.groups.find(x=>/SKIN/.test(mats[x.materialIndex]?.name||''))||{start:0,count:g.index.count},ix=g.index.array,S=T.MathUtils.smoothstep;
 const yLow=Math.max(hem,E.L[0].foot.y-.004),y1=E.crotch+.08,inBand=i=>{const y=P.getY(i);return y>=yLow&&y<=y1&&Math.abs(P.getX(i))<.14;};
 const weldKey=i=>Math.round(P.getX(i)*1e4)+','+Math.round(P.getY(i)*1e4)+','+Math.round(P.getZ(i)*1e4);
 // smooth (welded) body normals of the band
 const wn=new Map(),A=new T.Vector3(),B=new T.Vector3(),C=new T.Vector3(),tris=[];
 for(let t=gr.start;t<gr.start+gr.count;t+=3){const a=ix[t],b=ix[t+1],c=ix[t+2];if(!(inBand(a)&&inBand(b)&&inBand(c)))continue;tris.push(a,b,c);
  A.fromBufferAttribute(P,b).sub(B.fromBufferAttribute(P,a));C.fromBufferAttribute(P,c).sub(B);A.cross(C);for(const v of [a,b,c]){const k=weldKey(v),n=wn.get(k);if(n)n.add(A);else wn.set(k,A.clone());}}
 if(!tris.length)return [];
 const map=new Map(),pos=[],uv=[],si=[],sw=[],oix=[],V3=new T.Vector3(),U=g.attributes.uv;
 const place=i=>{V3.fromBufferAttribute(P,i);const y=V3.y,n=wn.get(weldKey(i)).clone().normalize();
  // the front of the crotch keeps half (7.5 mm) (a full 15 mm along the normals of the donor's rounded front made a knob there)
  const front=(1-S(Math.abs(V3.x),.02,.055))*S(n.z,.2,.6),shellP=V3.clone().addScaledVector(n,.015*(1-S(y,E.crotch+.04,y1))*(1-.5*front));
  if(y>=E.crotch-.01)return shellP;
  const side=(V3.x>=0)===(E.L[0].hip.x>=0)?0:1,[cx,cz]=E.axis(side,y),dx=V3.x-cx,dz=V3.z-cz,r=Math.hypot(dx,dz)||1e-6,c=capFor(E,V3.x,y,V3.z,'bottom'),R=Math.max(r+.010,c?c.cap:0);
  const legP=new T.Vector3(cx+dx/r*R,y,cz+dz/r*R);return legP.lerp(shellP,S(y,E.crotch-.05,E.crotch-.01));};
 const vid=i=>{let k=map.get(i);if(k!==undefined)return k;k=map.size;map.set(i,k);const p=place(i);pos.push(p.x,p.y,p.z);uv.push(U?U.getX(i):0,U?U.getY(i):0);for(let q=0;q<4;q++){si.push(E.SI.getComponent(i,q));sw.push(E.SW.getComponent(i,q));}return k;};
 for(const v of tris)oix.push(vid(v));
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geo.setIndex(oix);
 // welded normals for the new surface too (no seams at the body's UV splits)
 {const Pp=geo.attributes.position,nn=new Float32Array(Pp.count*3),wk=[...map.keys()].map(i=>weldKey(i)),acc=new Map();
  for(let t=0;t<oix.length;t+=3){const a=oix[t],b=oix[t+1],c=oix[t+2];A.fromBufferAttribute(Pp,b).sub(B.fromBufferAttribute(Pp,a));C.fromBufferAttribute(Pp,c).sub(B);A.cross(C);for(const v of [a,b,c]){const n=acc.get(wk[v]);if(n)n.add(A);else acc.set(wk[v],A.clone());}}
  for(let v=0;v<Pp.count;v++){const n=acc.get(wk[v]).clone().normalize();nn[v*3]=n.x;nn[v*3+1]=n.y;nn[v*3+2]=n.z;}geo.setAttribute('normal',new T.BufferAttribute(nn,3));}
 geo.computeBoundingSphere();geo.userData.boyStraight=true;
 const mesh=new T.SkinnedMesh(geo,src.material);mesh.name=src.name+'_boylegs';mesh.position.copy(src.position);mesh.quaternion.copy(src.quaternion);mesh.scale.copy(src.scale);
 mesh.bind(src.skeleton,body.bindMatrix);mesh.frustumCulled=false;mesh.visible=false;mesh.userData.boyLeg=true;src.parent?.add(mesh);
 return [mesh];
}
export const _boyShapeDebug={bodyEnvelope,capFor};
