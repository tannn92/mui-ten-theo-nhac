import * as T from 'three';
import {fitPoint,fitSection,armShell} from './body-fit.js?v=1611.0956';
import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1611.0956';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// "Kill This Love" (BLACKPINK). Looks from the official MV's main group dance, the final chorus in the red palace hall with
// the organ pipes and the marching band (MV 2:50-3:08; crops from MV 3:01): Jennie's red knit one-strap dress (a red knit top
// and a red knit mini skirt here) + black heeled ankle boots; Rosé's red long-sleeve high-neck top + black buckled mini skirt +
// black lace-up combat boots; Lisa's red sleeveless top with studded trim and a black harness strap + black leather trousers
// with buckled straps on one leg + black boots; Jisoo's red military jacket with studs and a black belt + red mini skirt +
// black combat boots. Built like ddu-du-ddu-du-styles.js: tops hug the body through body-fit.js (convex torso slice + ease,
// pushed past the bust), sleeves are her own arm skin lifted (armShell), trousers/shoes are her own skin lifted (skinned like
// the body, each leg its own; rings take weights from their own leg). Modest: every top reaches over the waistband (the MV's
// crop tops are closed), every skirt has black shorts underneath (skirt-safety). No text or logos.
// Style ids: kill-this-love-1-{top,bottom,shoes} (shop set: Jisoo's red military jacket with Rosé's black buckled skirt, a
// girl's version) and kill-this-love-crew-m1..m4-{top,bottom,shoes} (crew-only: the four members' looks).
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
 // the drawn eyes (EyeWhite material) of the face mesh, for the sunglasses: per side centre + half size, and the face front
 const box=()=>({lo:[1e9,1e9,1e9],hi:[-1e9,-1e9,-1e9]}),eb={l:box(),r:box()};let front=-Infinity;
 for(const m of donor.meshes){const mg=m.geometry,mp=mg?.attributes?.position;if(!mp)continue;const mats=[].concat(m.material).map(x=>x.name),groups=mg.groups.length?mg.groups:[{start:0,count:mg.index?mg.index.count:mp.count,materialIndex:0}];
  for(const gr of groups){const mn=mats[gr.materialIndex]||mats[0]||'',white=/EyeWhite/.test(mn),lash=/FaceEyelash/.test(mn);if(!white&&!lash)continue;for(let k=gr.start;k<gr.start+gr.count;k++){const i=mg.index?mg.index.getX(k):k,v=[mp.getX(i),mp.getY(i),mp.getZ(i)];if(lash){front=Math.max(front,v[2]);continue;}const b=v[0]>0?eb.l:eb.r;for(let q=0;q<3;q++){b.lo[q]=Math.min(b.lo[q],v[q]);b.hi[q]=Math.max(b.hi[q],v[q]);}}}}
 const eyeOf=b=>b.lo[0]<1e8?{x:(b.lo[0]+b.hi[0])/2,y:(b.lo[1]+b.hi[1])/2,rx:(b.hi[0]-b.lo[0])/2,ry:(b.hi[1]-b.lo[1])/2}:null;
 const eyes={l:eyeOf(eb.l)||{x:.05,y:1.048,rx:.034,ry:.025},r:eyeOf(eb.r)||{x:-.05,y:1.048,rx:.034,ry:.025}};if(!Number.isFinite(front))front=.13;
 const c={body,hip,neck,pos,boneIndex,shell,floor,legQuery,wOf,eyes,front};caches.set(donor,c);return c;
}
// top: sleeve short | long; print plain | check | moons | graphic | tattoo | fuzzy | jacket (fuzzy jacket open over a tee);
// bottom: skirt (A-line mini + shorts under) | wide (wide trousers) | track (straight track pants + side stripes);
// shoes: boot (ankle boot, colour or check) | sneaker (chunky white sneaker).
// top: sleeve long | none; print knit | military | plain | harness; belt colour (black waist belt with a silver buckle);
// bottom: skirt (A-line mini + shorts under; skirtPrint knit | buckle | plain) | pants (straight leather trousers, strapped leg);
// shoes: boot (ankle or combat boot; shaft height, heel).
export const ktlSpecs=[
{id:'1',sleeve:'long',puff:.006,body:'#b5121f',print:'military',trim:'#e4e4ea',belt:'#151518',bottom:'skirt',skirt:.140,skirtColor:'#18181b',skirtPrint:'buckle',shorts:'#18181b',shoe:'boot',shoeColor:'#151518',shaft:.150},
{id:'m1',sleeve:'none',body:'#a5121d',print:'knit',ink:'#5e0810',bottom:'skirt',skirt:.165,skirtColor:'#a5121d',skirtPrint:'knit',shorts:'#18181b',shoe:'boot',shoeColor:'#151518',shaft:.110},
{id:'m2',sleeve:'long',puff:.004,body:'#bb1522',print:'plain',trim:'#e4e4ea',belt:'#151518',bottom:'skirt',skirt:.130,skirtColor:'#18181b',skirtPrint:'buckle',shorts:'#18181b',shoe:'boot',shoeColor:'#151518',shaft:.150},
{id:'m3',sleeve:'none',body:'#b3121f',print:'harness',trim:'#e4e4ea',belt:'#151518',bottom:'pants',bottomColor:'#141417',shoe:'boot',shoeColor:'#151518',shaft:.130},
{id:'m4',sleeve:'long',puff:.006,body:'#a01220',print:'military',trim:'#e4e4ea',belt:'#151518',bottom:'skirt',skirt:.140,skirtColor:'#a01220',skirtPrint:'plain',shorts:'#18181b',shoe:'boot',shoeColor:'#151518',shaft:.150}];
export const hideNativeKtlSafety=(m,o)=>/^kill-this-love-/.test(o?.style||'')&&(m.userData.excludeHatMua||m.userData.excludeHuntrix||/cream_undershorts/.test(m.name));
// 256 px canvases (grid u = around the body with the front at .25 = canvas x; grid v = height = canvas y, flipped)
const textures=new Map();
function tex(kind,spec,nx=16,ny=16){const key=kind+nx+'x'+ny+JSON.stringify([spec.body,spec.ink,spec.trim,spec.skirtColor]);if(textures.has(key))return textures.get(key);const N=kind==='noise'?128:256,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.fillStyle=spec.body;x.fillRect(0,0,N,N);
 const stud=(px,py,r=2.2)=>{x.fillStyle=spec.trim||'#e4e4ea';x.beginPath();x.arc(px,py,r,0,7);x.fill();x.fillStyle='rgba(255,255,255,.8)';x.beginPath();x.arc(px-r*.35,py-r*.35,r*.4,0,7);x.fill();};
 if(kind==='knit'){// dark red diamond lattice with a small dot in each diamond (the MV's patterned knit)
  x.strokeStyle=spec.ink||'#5e0810';x.lineWidth=2.2;const w=N/nx,h=N/ny;for(let i=-ny;i<=nx+ny;i++){x.beginPath();x.moveTo(i*w,0);x.lineTo(i*w+N*(w/h),N);x.stroke();x.beginPath();x.moveTo(i*w,0);x.lineTo(i*w-N*(w/h),N);x.stroke();}
  x.fillStyle=spec.ink||'#5e0810';for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){x.beginPath();x.arc((i+.5)*w,(j+.5)*h,1.6,0,7);x.fill();}}
 if(kind==='military'){// centre closure with two rows of silver studs, studded edge at the neck
  const f=.25*N;x.fillStyle='rgba(60,0,8,.55)';x.fillRect(f-1.5,0,3,N);for(let j=0;j<12;j++){const py=N*(.08+j*.075);stud(f-11,py);stud(f+11,py);}for(let i=0;i<28;i++)stud(N*(i/28),5,1.8);
  x.fillStyle='rgba(60,0,8,.35)';x.fillRect(f-30,N*.30,12,3);x.fillRect(f+18,N*.30,12,3);}
 if(kind==='harness'){// black strap from her left shoulder across to the right hip, a studded trim along the neckline
  x.strokeStyle='#151518';x.lineWidth=13;x.beginPath();x.moveTo(N*(.25+.09),0);x.lineTo(N*(.25-.07),N);x.stroke();x.strokeStyle='#5a5a60';x.lineWidth=1.5;x.beginPath();x.moveTo(N*(.25+.09)-5,0);x.lineTo(N*(.25-.07)-5,N);x.stroke();
  x.fillStyle='#c8c8ce';x.fillRect(N*(.25+.01)-6,N*.47,12,9);x.fillStyle='#151518';x.fillRect(N*(.25+.01)-3,N*.47+3,6,3);for(let i=0;i<30;i++)stud(N*(i/30),5,1.8);}
 if(kind==='buckle'){// black skirt: three rows of silver buckles down the front, faint stitched panels
  x.fillStyle=spec.skirtColor||'#18181b';x.fillRect(0,0,N,N);x.strokeStyle='rgba(255,255,255,.10)';x.lineWidth=1;for(let i=0;i<12;i++){x.beginPath();x.moveTo(i*N/12,0);x.lineTo(i*N/12,N);x.stroke();}
  for(const v of [.12,.25,.38])for(let j=0;j<3;j++){const px=v*N,py=N*(.15+j*.28);x.fillStyle='#2a2a2f';x.fillRect(px-11,py-3,22,7);x.strokeStyle='#d8d8de';x.lineWidth=2;x.strokeRect(px-6,py-6,12,13);x.fillStyle='#d8d8de';x.fillRect(px-1,py-5,2,11);}}
 if(kind==='noise'){for(let j=0;j<4200;j++){const l=rand(j)<.5?0:255;x.fillStyle='rgba('+l+','+l+','+l+','+(.03+rand(j+3)*.06)+')';x.fillRect(rand(j+1)*N,rand(j+2)*N,1,1);}}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;if(kind==='noise')t.repeat.set(3,3);textures.set(key,t);return t;}
export function* buildKtlStyles(variants,options){const records=new Map(),parts=[],timings=[];
for(const slot of ['top','bottom','shoes'])for(const[index,opt]of(options[slot]||[]).entries()){
 const match=/^kill-this-love-(?:crew-)?(1|m[1-4])-(top|bottom|shoes)$/.exec(opt.style||'');if(!match||match[2]!==slot)continue;const spec=ktlSpecs.find(s=>s.id===match[1]);if(!spec)continue;
 const start=performance.now(),donor=variants[opt.variant],c=donorCache(donor),{body,hip,neck,pos,boneIndex,shell,floor,legQuery}=c,rec={id:opt.id,index,slot,meshes:[]};
 const mat=(color,o={})=>{const m=new T.MeshPhysicalMaterial({color,roughness:.8,clearcoat:.03,sheen:.35,sheenRoughness:.6,side:T.DoubleSide,...o});m.emissive.set(color);m.emissiveIntensity=o.glow??(/^#[ef]/i.test(color)?.20:.10);if(o.map){m.map=o.map;m.emissiveMap=o.map;}return m;};
 const cloth=(color,print='plain',nx=16,ny=16,extra={})=>{const s={...spec,body:color,...extra},map=print!=='plain'?tex(print,s,nx,ny):tex('noise',s),light=/^#[a-f9]/i.test(color);
  const m=mat('#ffffff',{map,roughness:print==='fuzzy'||print==='jacket'?.95:.8,sheen:print==='fuzzy'||print==='jacket'?.8:.35,glow:0});m.emissive.set('#ffffff');m.emissiveIntensity=light?.14:.07;return m;};
 const skin=new T.MeshToonMaterial({color:'#fff1df',emissive:'#bca98f',emissiveIntensity:.18,side:T.DoubleSide});
 function register(geo,m,owned=true){const mesh=new T.SkinnedMesh(geo,m);mesh.name=rec.id+'_'+rec.meshes.length;mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(body.skeleton,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;mesh.userData.sharedCrewGeometry=!owned;body.parent.add(mesh);rec.meshes.push(mesh);return mesh;}
 function weighted(geo,m,rigid=null){const pp=geo.attributes.position,si=[],sw=[],hips=boneIndex('hips'),spine=boneIndex('spine'),chest=boneIndex('chest'),upper=boneIndex('upperChest'),sp=pos('spine').y,ch=pos('chest').y,up=pos('upperChest').y;
  for(let i=0;i<pp.count;i++){const y=pp.getY(i);let a,b,w;if(rigid){a=b=boneIndex(rigid);w=0;}else if(y<sp){a=hips;b=spine;w=T.MathUtils.clamp((y-hip.y)/(sp-hip.y),0,1);}else if(y<ch){a=spine;b=chest;w=T.MathUtils.clamp((y-sp)/(ch-sp),0,1);}else{a=chest;b=upper;w=T.MathUtils.clamp((y-ch)/(up-ch),0,1);}si.push(a,b,0,0);sw.push(1-w,w,0,0);}
  geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geo.computeVertexNormals();geo.computeBoundingSphere();return register(geo,m);}
 function grid(rows,cols,fn,m){const pp=[],uv=[],ii=[];for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){pp.push(...fn(j/rows,k/cols).toArray());uv.push(k/cols,j/rows);}for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;ii.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ii);return g;}
 function blob(center,r,m,bone,sx=1,sy=1,sz=1,rotZ=0){const g=new T.SphereGeometry(r,12,8);g.scale(sx,sy,sz);g.rotateZ(rotZ);g.translate(center.x,center.y,center.z);return weighted(g,m,bone);}
 function skinLike(geo,m,side){const q=legQuery(side),p=geo.attributes.position,si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight,I=[],W=[];for(let i=0;i<p.count;i++){const h=q.nearest(V().fromBufferAttribute(p,i));const all=new Map();if(h){const bc=h.record.t.getBarycoord(h.point,V()),blend=[bc.x,bc.y,bc.z];for(let j=0;j<3;j++)for(let k=0;k<4;k++){const bi=si.getComponent(h.record.ids[j],k),w=sw.getComponent(h.record.ids[j],k)*blend[j];all.set(bi,(all.get(bi)||0)+w);}}const best=[...all].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=best.reduce((n,x)=>n+x[1],0)||1;while(best.length<4)best.push([0,0]);I.push(...best.map(x=>x[0]));W.push(...best.map(x=>x[1]/sum));}
  geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(I,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(W,4));geo.computeVertexNormals();geo.computeBoundingSphere();return register(geo,m);}
 const depths=new Map();function fitted(y,a,e=.008){const q=fitPoint(body,boneIndex,hip,neck,y,a,e);if(q)return V().set(q[0],y,q[1]);if(!depths.has(y)){const p=body.geometry.attributes.position;let lo=Infinity,hi=-Infinity;for(const id of new Set(body.geometry.index.array))if(Math.abs(p.getX(id))<.085&&Math.abs(p.getY(id)-y)<.018){lo=Math.min(lo,p.getZ(id));hi=Math.max(hi,p.getZ(id));}depths.set(y,Number.isFinite(lo)?[lo,hi]:[hip.z-.05,hip.z+.06]);}const d=depths.get(y),co=Math.cos(a),sn=Math.sin(a),rx=(fitSection(body,boneIndex,hip,neck,y)||[.085,.06])[0]+e;return V().set(co*rx,y,sn>=0?hip.z+Math.pow(Math.max(0,1-Math.pow(Math.abs(co),4)),.325)*(d[1]-hip.z+e):hip.z-Math.pow(-sn,.85)*(hip.z-d[0]+e));}
 const waist=hip.y+.062;
 // one leg's section at height y (that leg's own vertices): centre, half sizes and the outer x
 function legSection(side,y,band=.008){const s=Math.sign(pos(side+'Foot').x),pp=body.geometry.attributes.position,ids=c.ids||(c.ids=[...new Set(body.geometry.index.array)]);let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const id of ids){const x=pp.getX(id),yy=pp.getY(id);if(x*s>.004&&Math.abs(yy-y)<band){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,pp.getZ(id));z1=Math.max(z1,pp.getZ(id));}}
  return Number.isFinite(x0)?{s,cx:(x0+x1)/2,cz:(z0+z1)/2,rx:(x1-x0)/2,rz:(z1-z0)/2,out:s>0?x1:x0}:null;}
 function ring(side,y,grow,h,m){const q=legSection(side,y);if(!q)return;skinLike(grid(2,32,(u,v)=>{const a=v*Math.PI*2;return V().set(q.cx+Math.cos(a)*(q.rx+grow),y-h/2+u*h,q.cz+Math.sin(a)*(q.rz+grow));}),m,side);}


 if(slot==='top'){
  register(shell('ktl-skin-upper',(x,y)=>y>hip.y-.025&&y<neck.y+.035,.0015),skin,false);
  const clothM=spec.print==='knit'?cloth(spec.body,'knit',14,10):spec.print==='plain'?cloth(spec.body):cloth(spec.body,spec.print);
  const hemY=waist-.048,topY=neck.y-.026;
    const R=18,B=48,far=c.torsoFar||(c.torsoFar=new Map()),fk=hemY+'|'+topY;if(!far.has(fk)){const pp=body.geometry.attributes.position,si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight,arm=new Set(['left','right'].flatMap(sd=>['Shoulder','UpperArm','LowerArm','Hand'].map(n=>{try{return boneIndex(sd+n);}catch(e){return -1;}}))),m=Array.from({length:R+1},()=>new Float32Array(B));
   for(const id of new Set(body.geometry.index.array)){const y=pp.getY(id);if(y<hemY-.012||y>topY+.012)continue;let w=0;for(let k=0;k<4;k++)if(arm.has(si.getComponent(id,k)))w+=sw.getComponent(id,k);if(w>.2)continue;
    const x=pp.getX(id),z=pp.getZ(id)-hip.z,r=Math.hypot(x,z),bi=((Math.round(Math.atan2(z,x)/(Math.PI*2)*B)%B)+B)%B,j=Math.round((y-hemY)/(topY-hemY)*R);for(const jj of [j-1,j,j+1])if(jj>=0&&jj<=R)for(const bb of [bi-1,bi,bi+1]){const q=(bb+B)%B;m[jj][q]=Math.max(m[jj][q],r);}}far.set(fk,m);}
  const farM=far.get(fk);
  weighted(grid(R,B,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(hemY,topY,u),e=.007+.016*Math.max(0,1-u/.30),q=fitted(y,a,e),r=Math.hypot(q.x,q.z-hip.z),need=u<.78?farM[Math.round(u*R)][Math.round(v*B)%B]+e:0;if(r<need){const n=Math.min(need,r+.03),dx=r>.01?q.x/r:Math.cos(a),dz=r>.01?(q.z-hip.z)/r:Math.sin(a);q.x=dx*n;q.z=hip.z+dz*n;}return q;}),clothM);
  // neck edge: a high collar for the long-sleeve tops (Rosé's high neck, the military collar), a narrow band otherwise
  const collar=spec.sleeve==='long'?.020:.010;
  weighted(grid(2,40,(u,v)=>fitted(topY-.004+u*collar,v*Math.PI*2,.010)),mat(spec.body,{roughness:.85}));
  // (the studded neck edge is painted into the military / harness textures: a metal ring here poked out at the shoulders)
  // sleeves: long (whole arm skin lifted) in the same red; sleeveless tops show her own arm skin (the skin shell above)
  if(spec.sleeve==='long'){const sc=cloth(spec.body);for(const side of ['left','right'])register(armShell(body,boneIndex,side,{lower:true,offset:.006,puff:spec.puff||.004}),sc,false);
   // studded cuff ring near each wrist (the MV's silver-stud cuffs)
   if(spec.trim){const tm=mat(spec.trim,{roughness:.3,metalness:.6,glow:.25});for(const side of ['left','right']){const e=pos(side+'LowerArm'),h=pos(side+'Hand'),d=V().subVectors(h,e),L=d.length();d.normalize();const ax=Math.abs(d.y)<.9?V().set(0,1,0):V().set(1,0,0),p1=V().crossVectors(d,ax).normalize(),p2=V().crossVectors(d,p1).normalize(),cc=V().copy(e).addScaledVector(d,L*.86);
    weighted(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().copy(cc).addScaledVector(d,(u-.5)*.008).addScaledVector(p1,Math.cos(a)*.029).addScaledVector(p2,Math.sin(a)*.029);}),tm,side+'LowerArm');}}}
  // black waist belt with a silver buckle at the front
  if(spec.belt){const by=hemY+.020,bm=mat(spec.belt,{roughness:.35,clearcoat:.6,glow:.04});weighted(grid(2,48,(u,v)=>fitted(by-.009+u*.018,v*Math.PI*2,.014)),bm);
   const f=fitted(by,Math.PI/2,.016);blob(f,.013,mat('#cfcfd6',{roughness:.25,metalness:.8,glow:.3}),'hips',1.3,1,.45);}
 }

 if(slot==='bottom'){
  if(spec.bottom==='skirt'){
   // black shorts under the skirt: her hip/thigh skin lifted down to near the hem, plus her thigh skin below
   const len=spec.skirt,hemY=waist-len;
   register(shell('ktl-shorts-'+Math.round(len*1000),(x,y)=>y<waist+.004&&y>hemY+.012,.010),mat(spec.shorts,{roughness:.7}),false);
   register(shell('ktl-thigh-'+Math.round(len*1000),(x,y)=>y>hip.y-.165&&y<hemY+.020,.0095),skin,false);
   const sk=spec.skirtPrint==='knit'?cloth(spec.skirtColor,'knit',28,8,{body:spec.skirtColor}):spec.skirtPrint==='buckle'?cloth(spec.skirtColor,'buckle',16,16,{body:spec.skirtColor}):cloth(spec.skirtColor);
   // A-line mini skirt from the waistband, flaring to the hem
   weighted(grid(12,64,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.013),fl=.048*Math.pow(u,1.1)+.002*Math.sin(a*10)*u;return V().set(q.x+Math.cos(a)*fl,waist-u*len,q.z+Math.sin(a)*fl);}),sk,'hips');
   weighted(grid(3,48,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.016);q.y=waist+.006-u*.016;return q;}),mat(spec.skirtPrint==='knit'?spec.skirtColor:'#151518',{roughness:.5}),'hips');
  }else{
   // straight black leather trousers: her leg skin lifted from the waist to the ankle, a hem ring per leg,
   // and three buckled straps round her left leg (the MV's strapped trouser leg)
   const hemY=floor+.060,off=.012,lm=mat(spec.bottomColor,{roughness:.35,clearcoat:.6,clearcoatRoughness:.3,sheen:0,glow:.05});
   register(shell('ktl-pants',(x,y)=>y<waist+.010&&y>hemY,off),lm,false);
   for(const side of ['left','right'])ring(side,hemY+.004,off+.002,.016,lm);
   weighted(grid(3,48,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.020);q.y=waist+.008-u*.018;return q;}),lm,'hips');
   const knee=pos('leftLowerLeg').y,strap=mat('#2b2b30',{roughness:.4,clearcoat:.5,glow:.04}),metal=mat('#d4d4da',{roughness:.25,metalness:.8,glow:.3});
   for(const y of [knee+.09,knee-.05,knee-.17]){ring('left',y,off+.006,.014,strap);ring('left',y,off+.0075,.004,metal);}
  }
 }

 if(slot==='shoes'){
  register(shell('ktl-legs',(x,y)=>y>floor&&y<hip.y-.105,.0005),skin,false);
  // black ankle / combat boots: her foot and ankle skin lifted to the shaft top, a sole rim, a block heel, a collar ring and
  // lace bars up the front
  const sh=spec.shaft||.115,up=mat(spec.shoeColor,{roughness:.35,clearcoat:.7,clearcoatRoughness:.2,sheen:0,glow:.06}),sole=mat('#26262b',{roughness:.6,glow:.04}),lace=mat('#3a3a40',{roughness:.5,glow:.05});
  register(shell('ktl-boot-'+Math.round(sh*1000),(x,y)=>y>floor-.01&&y<floor+sh,.0045),up,false);
  for(const side of ['left','right']){const f=pos(side+'Foot');
   skinLike(grid(2,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.041,floor+.002+u*(sh>.12?.016:.010),f.z+.030+Math.sin(a)*.079);}),sole,side);
   skinLike(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.041*u,floor+(sh>.12?.018:.012),f.z+.030+Math.sin(a)*.079*u);}),sole,side);
   skinLike(grid(2,12,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.018,floor-.004+u*(sh>.12?.020:.030),f.z-.034+Math.sin(a)*.016);}),sole,side);
   ring(side,floor+sh-.003,.0065,.008,up);
   if(sh>.12)for(let k=0;k<5;k++){const y=floor+.045+k*(sh-.06)/4,q=legSection(side,y,.010);if(!q)continue;skinLike(grid(1,2,(u,v)=>V().set(q.cx+(v-.5)*.022,y-.002+u*.004,q.cz+q.rz+.0075)),lace,side);}
  }
 }
 const groups=new Map();for(const m of rec.meshes){if(m.userData.sharedCrewGeometry)continue;const g=m.geometry,key=m.material.uuid+'|'+Object.entries(g.attributes).map(([k,a])=>k+a.itemSize+a.array.constructor.name).sort().join(',')+'|'+g.index?.array.constructor.name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}for(const ms of groups.values())if(ms.length>1){const g=mergeGeometries(ms.map(m=>m.geometry),false);if(!g)throw Error('Kill This Love geometry schema mismatch');ms[0].geometry.dispose();ms[0].geometry=g;for(const m of ms.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
 rec.buildMs=performance.now()-start;records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});timings.push({slot,ms:rec.buildMs,meshes:rec.meshes.length});yield;
}return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
export function createKtlStyles(...args){const it=buildKtlStyles(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
