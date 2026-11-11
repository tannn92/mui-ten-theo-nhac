import * as T from 'three';
import {fitPoint,fitSection,armShell} from './body-fit.js?v=1111.2211';
import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1111.2211';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// "TTL (Time To Love)" (T-ara & Supernova). Dance from BoBo's class cover; costumes from the OFFICIAL MV's dance scenes (owner
// 2026-11-11: "trang phục và background nền cần giống trong video này"): T-ara in grey/denim metallic jumpsuits, rompers and
// vests, studs, gold chains, fedoras, one pink glove, dark tights; Supernova in black waistcoats/jackets over grey or plaid shirts.
// Built like tim-em-styles.js: tops hug the body through body-fit.js (convex torso slice + ease, pushed past the bust), sleeves
// are her own arm skin lifted (armShell), shorts/trousers/tights/boots are her own skin lifted (skinned like the body), gloves
// are her hand skin lifted. Modest for the child: tops reach over the waistband, shorts reach mid-thigh over dark tights,
// boys wear closed shirts. No text or logos.
// Style ids: ttl-time-to-love-1-{top,bottom,shoes,accessory} (shop set + the fedora) and ttl-time-to-love-crew-{c1..c6,b1,b2}-*.
const caches=new WeakMap();
const V=()=>new T.Vector3();
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
function donorCache(donor){
 if(caches.has(donor))return caches.get(donor);
 const body=donor.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),g=body.geometry,p=g.attributes.position,ix=g.index,inv=body.matrixWorld.clone().invert(),pos=n=>donor.vrm.humanoid.getRawBoneNode(n).getWorldPosition(V()).applyMatrix4(inv),hip=pos('hips'),neck=pos('neck');
 const boneIndex=n=>{const raw=donor.vrm.humanoid.getRawBoneNode(n);let i=body.skeleton.bones.indexOf(raw);if(i<0)i=body.skeleton.bones.findIndex(b=>b.name===raw?.name);if(i<0)throw Error('Missing bone '+n);return i;},floor=Math.min(...Array.from(ix.array,i=>p.getY(i)));
 const shells=new Map();
 // her own skin triangles that pass a position test, lifted along the normal (skinned like the body)
 function shell(key,test,offset=0){if(shells.has(key))return shells.get(key);const map=new Map(),attrs=Object.fromEntries(['position','normal','uv','skinIndex','skinWeight'].filter(k=>g.attributes[k]).map(k=>[k,[]])),out=[];
  const ok=id=>test(p.getX(id),p.getY(id),p.getZ(id),id);
  for(let i=0;i<ix.count;i+=3){const tri=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(!tri.every(ok))continue;for(const id of tri){if(!map.has(id)){map.set(id,map.size);const off=typeof offset==='function'?offset(p.getX(id),p.getY(id),p.getZ(id)):offset;for(const[k,a]of Object.entries(attrs)){const src=g.attributes[k];for(let c=0;c<src.itemSize;c++)a.push(src.getComponent(id,c)+(k==='position'?g.attributes.normal.getComponent(id,c)*off:0));}}out.push(map.get(id));}}
  const geo=new T.BufferGeometry();for(const[k,a]of Object.entries(attrs))geo.setAttribute(k,k==='skinIndex'?new T.Uint16BufferAttribute(a,4):new T.Float32BufferAttribute(a,g.attributes[k].itemSize));geo.setIndex(out);geo.computeBoundingSphere();shells.set(key,geo);return geo;}
 const legQueries=new Map();function legQuery(side){if(!legQueries.has(side)){const s=Math.sign(pos(side+'Foot').x),top=pos(side+'UpperLeg').y;
  legQueries.set(side,getTriangleQuery(geometryTriangles(g).filter(r=>[r.t.a,r.t.b,r.t.c].every(q=>q.x*s>.004&&q.y<top))));}return legQueries.get(side);}
 const si=g.attributes.skinIndex,sw=g.attributes.skinWeight,wOf=(id,set)=>{let s=0;for(let k=0;k<4;k++)if(set.has(si.getComponent(id,k)))s+=sw.getComponent(id,k);return s;};
 const c={body,hip,neck,pos,boneIndex,shell,floor,legQuery,wOf};caches.set(donor,c);return c;
}
// top: tank (sleeveless) | tee (short/cap sleeves, puff) | shirt (long sleeves); cloth satin (metallic) | denim | cotton;
// print: plain | vest (black waistcoat over the shirt) | plaid | studs (silver studs round the neckline); chain: gold necklace;
// belt: studs (wide black, silver studs) | chain (gold); glove: one pink glove on that hand. bottom: shorts (+ tights) | long.
// shoes: boot (black ankle boots) | sneaker. hat: the fedora (accessory slot, shop item ttl-time-to-love-1-accessory).
export const ttlSpecs=[
{id:'1',top:'tee',sleeveLen:'cap',body:'#7d838c',cloth:'denim',print:'plain',chain:true,belt:'chain',glove:'left',bottom:'shorts',bottomColor:'#7d838c',bcloth:'denim',hem:-.158,tights:'#1b1b1f',shoe:'boot',hat:true},
{id:'c1',top:'tank',body:'#8e9198',cloth:'satin',print:'plain',chain:true,belt:'studs',glove:'right',bottom:'long',bottomColor:'#8e9198',bcloth:'satin',shoe:'boot'},
{id:'c2',top:'tank',body:'#6d7179',cloth:'satin',print:'studs',chain:true,belt:'chain',bottom:'shorts',bottomColor:'#6d7179',bcloth:'satin',hem:-.158,tights:'#18181b',shoe:'boot',hat:true},
{id:'c3',top:'tee',sleeveLen:'cap',puff:.012,body:'#1b1b1e',sleeve:'#8e9198',cloth:'cotton',print:'plain',chain:true,bottom:'long',bottomColor:'#1d1d21',bcloth:'cotton',shoe:'boot'},
{id:'c4',top:'tank',body:'#5d646e',cloth:'denim',print:'studs',belt:'chain',glove:'left',chain:true,bottom:'long',bottomColor:'#3e444d',bcloth:'denim',shoe:'boot'},
{id:'c5',top:'tee',sleeveLen:'short',body:'#4b4e56',cloth:'satin',print:'plain',chain:true,belt:'studs',bottom:'shorts',bottomColor:'#1c1c1f',bcloth:'cotton',hem:-.158,tights:'#202024',shoe:'boot',hat:true},
{id:'c6',top:'tank',body:'#9aa0a8',cloth:'denim',print:'plain',chain:true,belt:'studs',glove:'right',bottom:'shorts',bottomColor:'#9aa0a8',bcloth:'denim',hem:-.158,tights:'#26262b',shoe:'boot'},
{id:'b1',top:'shirt',body:'#a3a6ad',sleeve:'#a3a6ad',cloth:'cotton',print:'vest',bottom:'long',bottomColor:'#19191c',bcloth:'cotton',shoe:'sneaker',shoeColor:'#151517',sole:'#2a2a2e',boy:true},
{id:'b2',top:'shirt',body:'#a2a4ab',sleeve:'#18181b',cloth:'cotton',print:'jacket',chain:false,bottom:'long',bottomColor:'#1d1f23',bcloth:'denim',shoe:'sneaker',shoeColor:'#f2f2ef',sole:'#e3e1db',boy:true}];
export const hideNativeTtlSafety=(m,o)=>/^ttl-time-to-love-/.test(o?.style||'')&&(m.userData.excludeHatMua||m.userData.excludeHuntrix||/cream_undershorts/.test(m.name));
// 256 px canvases (u = height, v = around the body, the front is v = .25)
const textures=new Map();
function tex(kind,base){const key=kind+base;if(textures.has(key))return textures.get(key);const N=kind==='noise'||kind==='denim'||kind==='plaid'?128:256,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.fillStyle=base;x.fillRect(0,0,N,N);
 const at=(v,u)=>[v*N,(1-u)*N];
 if(kind==='vest'){x.fillStyle='#141416';x.fillRect(0,0,N,N);const [a0]=at(.25-.035,0),[a1]=at(.25+.035,0);x.fillStyle=base;x.fillRect(a0,0,a1-a0,at(0,.45)[1]);
  x.beginPath();x.moveTo(a0,at(0,.45)[1]);x.lineTo(at(.25,0)[0],at(0,.30)[1]);x.lineTo(a1,at(0,.45)[1]);x.fill();x.fillStyle='#c9ccd2';for(let u=.10;u<.42;u+=.08){const [p,q]=at(.25+.042,u);x.beginPath();x.arc(p,q,2.2,0,7);x.fill();}
  x.fillStyle='rgba(255,255,255,.06)';for(let k=0;k<N;k+=4)x.fillRect(k,0,1,N);}
 if(kind==='jacket'){x.fillStyle='#18181b';x.fillRect(0,0,N,N);const [a0]=at(.25-.09,0),[a1]=at(.25+.09,0);x.fillStyle=base;x.fillRect(a0,0,a1-a0,N);for(let k=0;k<N;k+=24){x.fillStyle='rgba(15,15,18,.6)';x.fillRect(a0,k,a1-a0,9);x.fillRect(a0+((k/24)%2)*8,0,6,N);}x.fillStyle='rgba(15,15,18,.6)';for(let q=a0;q<a1;q+=22)x.fillRect(q,0,8,N);x.fillStyle='rgba(255,255,255,.10)';x.fillRect(a0-3,0,3,N);x.fillRect(a1,0,3,N);}
 if(kind==='plaid'){for(let k=0;k<N;k+=32){x.fillStyle='rgba(15,15,18,.55)';x.fillRect(k,0,12,N);x.fillRect(0,k,N,12);x.fillStyle='rgba(200,202,208,.22)';x.fillRect(k+20,0,3,N);x.fillRect(0,k+20,N,3);}}
 if(kind==='studs'){x.fillStyle='#d6d8de';for(let k=0;k<20;k++){const v=.25+(k-9.5)*.016,[p,q]=at(v,.90-.05*Math.cos((k-9.5)/9.5*1.4));x.beginPath();x.arc(p,q,2.4,0,7);x.fill();}}
 if(kind==='noise'||kind==='denim'){for(let j=0;j<4200;j++){const l=rand(j)<.5?0:255;x.fillStyle='rgba('+l+','+l+','+l+','+(.03+rand(j+3)*.06)+')';x.fillRect(rand(j+1)*N,rand(j+2)*N,1,kind==='denim'?3:1);}
  if(kind==='denim'){x.strokeStyle='rgba(255,255,255,.07)';for(let k=-N;k<N;k+=3){x.beginPath();x.moveTo(k,0);x.lineTo(k+N,N);x.stroke();}}}
 if(kind==='print'){for(let j=0;j<160;j++){const cols=['#d9402e','#2b2b2f','#f6efe0','#3a7cc4'];x.fillStyle=cols[j%4];x.beginPath();x.arc(rand(j)*N,rand(j+11)*N,2+rand(j+5)*5,0,7);x.fill();}}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;if(kind==='noise'||kind==='denim'||kind==='plaid')t.repeat.set(3,3);textures.set(key,t);return t;}
export function* buildTtlStyles(variants,options){const records=new Map(),parts=[],timings=[];
for(const slot of ['top','bottom','shoes','accessory'])for(const[index,opt]of(options[slot]||[]).entries()){
 const match=/^ttl-time-to-love-(?:crew-)?(1|c[1-6]|b[1-2])-(top|bottom|shoes|accessory)$/.exec(opt.style||'');if(!match||match[2]!==slot)continue;const spec=ttlSpecs.find(s=>s.id===match[1]);if(!spec)continue;
 const start=performance.now(),donor=variants[opt.variant],c=donorCache(donor),{body,hip,neck,pos,boneIndex,shell,floor,legQuery,wOf}=c,rec={id:opt.id,index,slot,meshes:[]};
 const mat=(color,o={})=>{const m=new T.MeshPhysicalMaterial({color,roughness:.8,clearcoat:.03,sheen:.35,sheenRoughness:.6,side:T.DoubleSide,...o});m.emissive.set(color);m.emissiveIntensity=o.glow??(/^#[ef]/i.test(color)?.20:.10);if(o.map){m.map=o.map;m.emissiveMap=o.map;}return m;};
 const cloth=(color,kind,print='plain')=>{const map=print!=='plain'?tex(print,color):kind==='denim'?tex('denim',color):tex('noise',color),light=/^#[a-f9]/i.test(color);
  const m=mat('#ffffff',kind==='satin'?{map,roughness:.34,metalness:.38,clearcoat:.35,clearcoatRoughness:.3,sheen:.25,glow:0}:{map,roughness:kind==='denim'?.88:.8,glow:0});m.emissive.set('#ffffff');m.emissiveIntensity=light?.14:.07;return m;};
 const gold=mat('#d9b56a',{roughness:.28,metalness:.85,clearcoat:.4,sheen:0,glow:.10}),silver=mat('#d6d8de',{roughness:.25,metalness:.8,clearcoat:.4,sheen:0,glow:.08});
 function bead(p,r,m,bone){const g=new T.SphereGeometry(r,6,4);g.translate(p.x,p.y,p.z);return weighted(g,m,bone);}
 const skin=new T.MeshToonMaterial({color:'#fff1df',emissive:'#bca98f',emissiveIntensity:.18,side:T.DoubleSide});
 function register(geo,m,owned=true){const mesh=new T.SkinnedMesh(geo,m);mesh.name=rec.id+'_'+rec.meshes.length;mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(body.skeleton,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;mesh.userData.sharedCrewGeometry=!owned;body.parent.add(mesh);rec.meshes.push(mesh);return mesh;}
 function weighted(geo,m,rigid=null){const pp=geo.attributes.position,si=[],sw=[],hips=boneIndex('hips'),spine=boneIndex('spine'),chest=boneIndex('chest'),upper=boneIndex('upperChest'),sp=pos('spine').y,ch=pos('chest').y,up=pos('upperChest').y;
  for(let i=0;i<pp.count;i++){const y=pp.getY(i);let a,b,w;if(rigid){a=b=boneIndex(rigid);w=0;}else if(y<sp){a=hips;b=spine;w=T.MathUtils.clamp((y-hip.y)/(sp-hip.y),0,1);}else if(y<ch){a=spine;b=chest;w=T.MathUtils.clamp((y-sp)/(ch-sp),0,1);}else{a=chest;b=upper;w=T.MathUtils.clamp((y-ch)/(up-ch),0,1);}si.push(a,b,0,0);sw.push(1-w,w,0,0);}
  geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geo.computeVertexNormals();geo.computeBoundingSphere();return register(geo,m);}
 function grid(rows,cols,fn,m){const pp=[],uv=[],ii=[];for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){pp.push(...fn(j/rows,k/cols).toArray());uv.push(k/cols,j/rows);}for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;ii.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ii);return g;}
 function skinLike(geo,m,side){const q=legQuery(side),p=geo.attributes.position,si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight,I=[],W=[];for(let i=0;i<p.count;i++){const h=q.nearest(V().fromBufferAttribute(p,i));const all=new Map();if(h){const bc=h.record.t.getBarycoord(h.point,V()),blend=[bc.x,bc.y,bc.z];for(let j=0;j<3;j++)for(let k=0;k<4;k++){const bi=si.getComponent(h.record.ids[j],k),w=sw.getComponent(h.record.ids[j],k)*blend[j];all.set(bi,(all.get(bi)||0)+w);}}const best=[...all].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=best.reduce((n,x)=>n+x[1],0)||1;while(best.length<4)best.push([0,0]);I.push(...best.map(x=>x[0]));W.push(...best.map(x=>x[1]/sum));}
  geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(I,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(W,4));geo.computeVertexNormals();geo.computeBoundingSphere();return register(geo,m);}
 const depths=new Map();function fitted(y,a,e=.008){const q=fitPoint(body,boneIndex,hip,neck,y,a,e);if(q)return V().set(q[0],y,q[1]);if(!depths.has(y)){const p=body.geometry.attributes.position;let lo=Infinity,hi=-Infinity;for(const id of new Set(body.geometry.index.array))if(Math.abs(p.getX(id))<.085&&Math.abs(p.getY(id)-y)<.018){lo=Math.min(lo,p.getZ(id));hi=Math.max(hi,p.getZ(id));}depths.set(y,Number.isFinite(lo)?[lo,hi]:[hip.z-.05,hip.z+.06]);}const d=depths.get(y),co=Math.cos(a),sn=Math.sin(a),rx=(fitSection(body,boneIndex,hip,neck,y)||[.085,.06])[0]+e;return V().set(co*rx,y,sn>=0?hip.z+Math.pow(Math.max(0,1-Math.pow(Math.abs(co),4)),.325)*(d[1]-hip.z+e):hip.z-Math.pow(-sn,.85)*(hip.z-d[0]+e));}
 const waist=hip.y+.062;
 if(slot==='top'){
  register(shell('ttl-skin-upper',(x,y)=>y>hip.y-.025&&y<neck.y+.035,.0015),skin,false);
  const cl=cloth(spec.body,spec.cloth,spec.print);
  // body: from just under the shorts' waistband (it lies over it: ease grows to the hem) up to the neckline
  const hemY=waist-.048,topY=neck.y-(spec.top==='tank'?.034:.028);const clothM=cl;
  // the body-fit hull leaves out the VRoid bust bones, so the bust poked through: every row is also pushed out past the
  // furthest torso skin point (arms left out) in its angle bin, plus the same ease
  const R=18,B=48,far=c.torsoFar||(c.torsoFar=new Map()),fk=hemY+'|'+topY;if(!far.has(fk)){const pp=body.geometry.attributes.position,si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight,arm=new Set(['left','right'].flatMap(sd=>['Shoulder','UpperArm','LowerArm','Hand'].map(n=>{try{return boneIndex(sd+n);}catch(e){return -1;}}))),m=Array.from({length:R+1},()=>new Float32Array(B));
   for(const id of new Set(body.geometry.index.array)){const y=pp.getY(id);if(y<hemY-.012||y>topY+.012)continue;let w=0;for(let k=0;k<4;k++)if(arm.has(si.getComponent(id,k)))w+=sw.getComponent(id,k);if(w>.2)continue;
    const x=pp.getX(id),z=pp.getZ(id)-hip.z,r=Math.hypot(x,z),bi=((Math.round(Math.atan2(z,x)/(Math.PI*2)*B)%B)+B)%B,j=Math.round((y-hemY)/(topY-hemY)*R);for(const jj of [j-1,j,j+1])if(jj>=0&&jj<=R)for(const bb of [bi-1,bi,bi+1]){const q=(bb+B)%B;m[jj][q]=Math.max(m[jj][q],r);}}far.set(fk,m);}
  const farM=far.get(fk);
  weighted(grid(R,B,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(hemY,topY,u),e=.007+.016*Math.max(0,1-u/.30),q=fitted(y,a,e),r=Math.hypot(q.x,q.z-hip.z),need=u<.78?farM[Math.round(u*R)][Math.round(v*B)%B]+e:0;if(r<need){const n=Math.min(need,r+.03),dx=r>.01?q.x/r:Math.cos(a),dz=r>.01?(q.z-hip.z)/r:Math.sin(a);q.x=dx*n;q.z=hip.z+dz*n;}return q;}),clothM);
  const rib=mat(spec.print==='vest'?'#141416':spec.body,{roughness:.9});
  weighted(grid(2,40,(u,v)=>fitted(topY-.004+u*.010,v*Math.PI*2,.010)),rib);
  // sleeves: cap / short (upper arm part) or long (to the wrist); puff = grey satin puffed caps (MV black tops)
  // tank: wide straps over the shoulder caps (sleeveless, not a tube top)
  if(spec.top==='tank')for(const side of ['left','right'])register(armShell(body,boneIndex,side,{lower:false,a:pos(side+'UpperArm'),b:pos(side+'LowerArm'),upperFrac:.10,offset:.006}),clothM,false);
  if(spec.top!=='tank'){const sc=spec.sleeve&&spec.sleeve!==spec.body?cloth(spec.sleeve,spec.puff?'satin':spec.cloth):spec.print==='plaid'?cloth(spec.body,spec.cloth,'plaid'):cloth(spec.body,spec.cloth);
   for(const side of ['left','right']){const sh=pos(side+'UpperArm'),el=pos(side+'LowerArm');
    register(spec.top==='shirt'?armShell(body,boneIndex,side,{lower:true,offset:.006}):armShell(body,boneIndex,side,{lower:false,a:sh,b:el,upperFrac:spec.sleeveLen==='cap'?.30:.46,offset:.006,puff:spec.puff||.004}),sc,false);}}
  // gold chain necklace: two strands of small beads hanging in a U on the chest
  if(spec.chain)for(const [drop,n,r] of [[.050,22,.0042],[.078,26,.0036]])for(let k=0;k<=n;k++){const t=k/n,a=Math.PI/2+(t-.5)*1.9,y=topY-.004-drop*Math.sin(Math.PI*t);bead(fitted(y,a,.022+.012*Math.sin(Math.PI*t)),r,gold,'upperChest');}
  // belt over the top at the waist: wide black studded | gold chain
  if(spec.belt==='studs'){weighted(grid(3,48,(u,v)=>{const q=fitted(waist-.010+u*.022,v*Math.PI*2,.024);return q;}),mat('#141416',{roughness:.4,clearcoat:.6,glow:.05}));for(let k=0;k<14;k++){const a=Math.PI/2+(k-6.5)*.16;bead(fitted(waist+.001,a,.029),.0038,silver,'hips');}}
  if(spec.belt==='chain')for(let k=0;k<=40;k++){const t=k/40,a=Math.PI/2+(t-.5)*Math.PI*2,y=waist-.006-.010*Math.max(0,Math.cos(a-Math.PI/2));bead(fitted(y,a,.026),.0046,gold,'hips');}
  // one pink glove: her hand skin (+ the wrist) lifted, skinned like the hand
  if(spec.glove){const side=spec.glove,hb=new Set(body.skeleton.bones.map((b,i)=>[b,i]).filter(([b])=>{const n=b.name.toLowerCase();return n.includes(side==='left'?'_l_':'_r_')&&/hand|thumb|index|middle|ring|little/.test(n);}).map(([,i])=>i));
   const wrist=pos(side+'Hand'),lo=new Set([boneIndex(side+'LowerArm')]);try{hb.add(boneIndex(side+'Hand'));}catch(e){}
   register(shell('ttl-glove-'+side,(x,y,z,id)=>wOf(id,hb)>.4||(wOf(id,lo)>.3&&Math.hypot(x-wrist.x,y-wrist.y,z-wrist.z)<.040),.0035),mat('#e0428f',{roughness:.45,clearcoat:.5,sheen:.4,glow:.16}),false);}
 }
 if(slot==='bottom'){
  const bc=cloth(spec.bottomColor,spec.bcloth);
  if(spec.bottom==='shorts'){
   // the rose donor's pink undershorts (skirt-safety.js: hip-.15..hip+.10 at +8 mm) are covered: shorts lifted 11 mm, and
   // below the hem her own thigh skin lifted 9.5 mm down past the undershorts' edge (same as tim-em-styles.js)
   const hemY=hip.y+spec.hem;
   register(shell('ttl-shorts'+spec.hem,(x,y)=>y<waist+.006&&y>hemY,.011),bc,false);
   // dark tights under the shorts down to the ankle (her leg skin lifted 7 mm, inside the shorts' 11 mm)
   if(spec.tights)register(shell('ttl-tights',(x,y)=>y<hemY+.012&&y>floor+.07,.007),mat(spec.tights,{roughness:.55,sheen:.6,sheenRoughness:.4,glow:.06}),false);
   else if(hemY>hip.y-.160)register(shell('ttl-thigh'+spec.hem,(x,y)=>y>hip.y-.165&&y<hemY+.006,.0095),skin,false);
   // hem cuffs: a ring round each thigh, skinned from that thigh only
   const cuff=cloth(spec.bottomColor,spec.bcloth);
   for(const side of ['left','right']){const s=Math.sign(pos(side+'Foot').x),pp=body.geometry.attributes.position;let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const id of new Set(body.geometry.index.array)){const x=pp.getX(id),y=pp.getY(id);if(x*s>.004&&Math.abs(y-(hemY+.004))<.008){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,pp.getZ(id));z1=Math.max(z1,pp.getZ(id));}}
    if(!Number.isFinite(x0))continue;const cx=(x0+x1)/2,cz=(z0+z1)/2,rx=(x1-x0)/2+.013,rz=(z1-z0)/2+.013;
    skinLike(grid(2,32,(u,v)=>{const a=v*Math.PI*2;return V().set(cx+Math.cos(a)*rx,hemY+.001+u*.010,cz+Math.sin(a)*rz);}),cuff,side);}
  }else{
   // leggings / slim jeans: her leg skin lifted to the ankle (each leg keeps its own skinning)
   register(shell('ttl-long'+(spec.boy?'b':'g'),(x,y)=>y<waist+.006&&y>floor+.085,spec.boy?.013:.011),bc,false);
  }
 }
 if(slot==='shoes'){
  register(shell('ttl-legs',(x,y)=>y>floor&&y<hip.y-.105,.0005),skin,false);
  const boot=spec.shoe==='boot',top=floor+(boot?.135:.064),up=boot?mat('#141416',{roughness:.3,clearcoat:.8,clearcoatRoughness:.15,sheen:0,glow:.06}):mat(spec.shoeColor,{roughness:.6,clearcoat:.15}),sole=boot?mat('#0c0c0e',{roughness:.6,glow:.04}):mat(spec.sole,{roughness:.7,glow:.16});spec.high=boot;
  register(shell('ttl-shoe-'+(boot?'boot':'low'),(x,y)=>y>floor-.01&&y<top,.006),up,false);
  for(const side of ['left','right']){const f=pos(side+'Foot');
   skinLike(grid(2,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.041,floor+.003+u*.014,f.z+.030+Math.sin(a)*.079);}),sole,side);
   skinLike(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.041*u,floor+.017,f.z+.030+Math.sin(a)*.079*u);}),sole,side);
   // collar: a soft ring at the top of the shoe in the sole colour (high-tops) or the upper's colour
   const pp=body.geometry.attributes.position,s=Math.sign(f.x);let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const id of new Set(body.geometry.index.array)){const x=pp.getX(id),y=pp.getY(id);if(x*s>.004&&Math.abs(y-top)<.008){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,pp.getZ(id));z1=Math.max(z1,pp.getZ(id));}}
   if(!boot&&Number.isFinite(x0)){const cx=(x0+x1)/2,cz=(z0+z1)/2,rx=(x1-x0)/2+.009,rz=(z1-z0)/2+.009;skinLike(grid(2,24,(u,v)=>{const a=v*Math.PI*2;return V().set(cx+Math.cos(a)*rx,top-.010+u*.012,cz+Math.sin(a)*rz);}),spec.high?sole:up,side);}
  }
 }
 if(slot==='accessory'&&spec.hat){const head=pos('head'),C=V().set(head.x,1.192,head.z-.012),felt=mat('#3b3d43',{roughness:.85,sheen:.6,sheenRoughness:.5,glow:.10}),band=mat('#121214',{roughness:.5,clearcoat:.4,glow:.04});
  // crown: an oval felt dome with the fedora's front pinch and top crease; brim: wide, flat at the front, a little up at the sides
  weighted(grid(10,40,(u,v)=>{const a=v*Math.PI*2,front=Math.max(0,Math.sin(a)),rx=.124-.020*u,rz=.117-.018*u-.010*front*u,y=C.y-.006+.086*Math.sin(u*Math.PI*.5)-.012*Math.pow(u,3)*(1-Math.abs(Math.cos(a)));return C.clone().add(V().set(Math.cos(a)*rx*(u<.999?1:.4),y-C.y,Math.sin(a)*rz*(u<.999?1:.4)));}),felt,'head');
  weighted(grid(1,40,(u,v)=>{const a=v*Math.PI*2,r=.096*u;return C.clone().add(V().set(Math.cos(a)*r*.86,.074,Math.sin(a)*r*.80));}),felt,'head');
  weighted(grid(2,40,(u,v)=>{const a=v*Math.PI*2;return C.clone().add(V().set(Math.cos(a)*.1255,-.004+u*.022,Math.sin(a)*.1185));}),band,'head');
  weighted(grid(3,48,(u,v)=>{const a=v*Math.PI*2,r=.122+.064*u,side=Math.pow(Math.abs(Math.cos(a)),2);return C.clone().add(V().set(Math.cos(a)*r,-.008+.022*u*u*side-.006*u*Math.max(0,Math.sin(a)),Math.sin(a)*r*.96));}),felt,'head');}
 const groups=new Map();for(const m of rec.meshes){if(m.userData.sharedCrewGeometry)continue;const g=m.geometry,key=m.material.uuid+'|'+Object.entries(g.attributes).map(([k,a])=>k+a.itemSize+a.array.constructor.name).sort().join(',')+'|'+g.index?.array.constructor.name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}for(const ms of groups.values())if(ms.length>1){const g=mergeGeometries(ms.map(m=>m.geometry),false);if(!g)throw Error('TTL geometry schema mismatch');ms[0].geometry.dispose();ms[0].geometry=g;for(const m of ms.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
 rec.buildMs=performance.now()-start;records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});timings.push({slot,ms:rec.buildMs,meshes:rec.meshes.length});yield;
}return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
export function createTtlStyles(...args){const it=buildTtlStyles(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
