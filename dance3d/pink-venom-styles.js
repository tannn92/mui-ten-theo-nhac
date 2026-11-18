import * as T from 'three';
import {fitPoint,fitSection,armShell} from './body-fit.js?v=1611.2031';
import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1611.2031';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// "Pink Venom" (BLACKPINK). Looks from the official MV's group dance in the white marble hall (second chorus, MV 2:02-2:20;
// crops from MV 2:04.5 and 2:16): white columns, two white stag statues, a round clock window, red petals on a white floor.
// Jennie's black varsity jacket with bright patches over a blue denim romper + black over-knee boots; Lisa's lilac rhinestone
// mesh halter over a green fishnet top + pink/yellow/olive camo cargo pants + black hiking boots; Rose's red tube top under a
// black shaggy cropped jacket + black strapped cargo pants + black high-top sneakers; Jisoo's white sleeveless jersey crop top
// with blue/red stripes + black shorts + black knee socks and combat boots.
// Built like how-you-like-that-styles.js: tops hug the body through body-fit.js (convex torso slice + ease, pushed past the
// bust), sleeves are her own arm skin lifted (armShell), shorts/trousers/shoes are her own skin lifted (skinned like the body,
// each leg its own; rings take weights from their own leg). Modest: every top reaches over the waistband (the MV's crop tops
// and the romper's cut-outs are closed). No text, numbers or logos (the jersey letters and patches are plain shapes).
// Style ids: pink-venom-1-{top,bottom,shoes} (shop set: Lisa's pink halter + camo cargo look, a girl's version) and
// pink-venom-crew-m1..m4-{top,bottom,shoes} (crew-only: the four members' looks).
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
// top: sleeve long | none; print varsity (black jacket, bright patches, open over denim) | halter (lilac rhinestone mesh over a
// green fishnet V) | shag (black shaggy jacket open over a red tube top) | jersey (white, blue/red stripes); collar colour;
// bottom: shorts (shortsColor; shortsPrint denim | plain) | pants (cargo trousers; pantsPrint camo | plain; straps);
// shoes: boot (shaft height; knee: up to the knee, over: over the knee; laces colour; soleColor).
export const pvSpecs=[
{id:'1',sleeve:'none',body:'#d9a3e0',print:'halter',ink:'#4f7a33',trim:'#f4e9fb',bottom:'pants',pantsPrint:'camo',bottomColor:'#e2457e',shoe:'boot',shoeColor:'#1b1b1f',shaft:.105,laces:'#e9e9ee',soleColor:'#efefef'},
{id:'m1',sleeve:'long',puff:.008,body:'#17171d',print:'varsity',ink:'#4f79b5',trim:'#e9e6df',collar:'#e9e6df',bottom:'shorts',shortsColor:'#5d86bd',shortsPrint:'denim',shoe:'boot',shoeColor:'#121216',over:true},
{id:'m2',sleeve:'none',body:'#d59ddd',print:'halter',ink:'#4a7330',trim:'#f4e9fb',bottom:'pants',pantsPrint:'camo',bottomColor:'#e2457e',shoe:'boot',shoeColor:'#1b1b1f',shaft:.105,laces:'#e9e9ee',soleColor:'#efefef'},
{id:'m3',sleeve:'long',puff:.014,body:'#141417',print:'shag',ink:'#d3222e',trim:'#2a2a30',bottom:'pants',pantsPrint:'plain',bottomColor:'#151518',straps:true,shoe:'boot',shoeColor:'#141417',shaft:.100,laces:'#e9e9ee',soleColor:'#f2f2f2'},
{id:'m4',sleeve:'none',body:'#f4f4f6',print:'jersey',ink:'#2f5bb8',trim:'#d3263a',collar:'#2f5bb8',bottom:'shorts',shortsColor:'#18181b',shortsPrint:'plain',shoe:'boot',shoeColor:'#151518',knee:true,sockBand:'#f4f4f6'}];
export const hideNativePvSafety=(m,o)=>/^pink-venom-/.test(o?.style||'')&&(m.userData.excludeHatMua||m.userData.excludeHuntrix||/cream_undershorts/.test(m.name));
// 256 px canvases (grid u = around the body with the front at .25 = canvas x; grid v = height = canvas y, flipped)
const textures=new Map();
function tex(kind,spec,nx=16,ny=16){const key=kind+nx+'x'+ny+JSON.stringify([spec.body,spec.ink,spec.trim,spec.shortsColor]);if(textures.has(key))return textures.get(key);const N=kind==='noise'?128:256,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.fillStyle=spec.body;x.fillRect(0,0,N,N);
 const stud=(px,py,r=2.2)=>{x.fillStyle=spec.trim||'#e4e4ea';x.beginPath();x.arc(px,py,r,0,7);x.fill();x.fillStyle='rgba(255,255,255,.8)';x.beginPath();x.arc(px-r*.35,py-r*.35,r*.4,0,7);x.fill();};
 const flower=(px,py,r,col,core)=>{x.fillStyle=col;for(let k=0;k<5;k++){const a=k*Math.PI*2/5;x.beginPath();x.arc(px+Math.cos(a)*r*.55,py+Math.sin(a)*r*.55,r*.48,0,7);x.fill();}x.fillStyle=core;x.beginPath();x.arc(px,py,r*.32,0,7);x.fill();};
 const f=.25*N;
 if(kind==='varsity'){// black varsity jacket open over the blue denim romper: a denim front panel with a seam (no chest
  // buttons), a cream rib edge down both front edges, and round/shield patches in bright colours on both sides (no letters)
  const g=x.createLinearGradient(f-24,0,f+24,0);g.addColorStop(0,'#4f79b5');g.addColorStop(.5,'#6b93c8');g.addColorStop(1,'#4f79b5');x.fillStyle=g;x.fillRect(f-24,0,48,N);
  x.fillStyle='rgba(255,255,255,.10)';for(let j=0;j<220;j++)x.fillRect(f-24+rand(j+3)*48,rand(j+5)*N,1,3);x.strokeStyle='#d9b45a';x.lineWidth=1;x.setLineDash([3,2]);x.beginPath();x.moveTo(f,0);x.lineTo(f,N);x.stroke();x.setLineDash([]);
  // (no buttons on the chest: two side-by-side dots there read wrongly on a child's figure)
  x.fillStyle=spec.trim;x.fillRect(f-30,0,6,N);x.fillRect(f+24,0,6,N);
  const cols=['#e23a3a','#f2c94c','#3fb27f','#5b8de0','#f08a2e','#e8336f','#ffffff','#8a4fc2'];
  for(let j=0;j<11;j++){const px=f+(j%2?1:-1)*(46+rand(j+31)*60),py=N*(.10+rand(j+47)*.80),r=8+rand(j+13)*6,c1=cols[j%cols.length],c2=cols[(j+3)%cols.length];
   x.fillStyle=c1;if(j%3===0){x.beginPath();x.arc(px,py,r,0,7);x.fill();x.fillStyle=c2;x.beginPath();x.arc(px,py,r*.55,0,7);x.fill();}
   else if(j%3===1){x.beginPath();x.moveTo(px-r,py-r);x.lineTo(px+r,py-r);x.lineTo(px+r,py+r*.3);x.lineTo(px,py+r*1.2);x.lineTo(px-r,py+r*.3);x.fill();x.fillStyle=c2;x.fillRect(px-r*.5,py-r*.5,r,r*.5);}
   else{x.fillRect(px-r,py-r*.7,r*2,r*1.4);x.fillStyle=c2;x.beginPath();x.moveTo(px-r*.7,py+r*.4);x.lineTo(px,py-r*.5);x.lineTo(px+r*.7,py+r*.4);x.fill();}}}
 if(kind==='varsleeve'){// varsity sleeves: black with a few bright patches
  const cols=['#e23a3a','#f2c94c','#3fb27f','#5b8de0'];for(let j=0;j<6;j++){x.fillStyle=cols[j%4];x.beginPath();x.arc(rand(j+3)*N,rand(j+9)*N,9,0,7);x.fill();}}
 if(kind==='halter'){// lilac rhinestone mesh halter over a green fishnet top: the fishnet shows in a deep V from the neck (the
  // canvas top is the neckline), closed below by the green top; the lilac mesh sparkles all over
  for(let j=0;j<900;j++){const l=rand(j+7);x.fillStyle=l<.5?'rgba(255,255,255,.55)':'rgba(150,90,170,.35)';x.fillRect(rand(j+1)*N,rand(j+2)*N,1.5,1.5);}
  x.fillStyle=spec.ink;x.beginPath();x.moveTo(f-44,0);x.lineTo(f+44,0);x.lineTo(f+8,N*.62);x.lineTo(f-8,N*.62);x.fill();
  x.strokeStyle='rgba(20,40,10,.75)';x.lineWidth=1.2;for(let r=0;r<16;r++)for(let k=-6;k<=6;k++){const px=f+k*8+(r%2)*4,py=5+r*10;if(py>N*.62||Math.abs(px-f)>8+36*(1-py/(N*.62)))continue;x.beginPath();x.ellipse(px,py,3,4,0,0,7);x.stroke();}
  x.strokeStyle=spec.trim;x.lineWidth=2;x.beginPath();x.moveTo(f-44,0);x.lineTo(f-8,N*.62);x.moveTo(f+44,0);x.lineTo(f+8,N*.62);x.stroke();}
 if(kind==='shag'){// black shaggy cropped jacket open over a red tube top: a red front panel, grey-white shag strokes on black
  x.fillStyle=spec.ink;x.fillRect(f-26,0,52,N);x.fillStyle='rgba(0,0,0,.18)';for(let j=0;j<40;j++)x.fillRect(f-26,rand(j+3)*N,52,1);
  for(let j=0;j<900;j++){const px=rand(j+11)*N,py=rand(j+17)*N;if(Math.abs(px-f)<28)continue;const l=40+Math.floor(rand(j+5)*140);x.strokeStyle='rgba('+l+','+l+','+(l+6)+',.85)';x.lineWidth=1.2;x.beginPath();x.moveTo(px,py);x.lineTo(px+(rand(j)-.5)*6,py+5+rand(j+9)*7);x.stroke();}}
 if(kind==='shagsleeve'){for(let j=0;j<1100;j++){const px=rand(j+11)*N,py=rand(j+17)*N,l=40+Math.floor(rand(j+5)*150);x.strokeStyle='rgba('+l+','+l+','+(l+6)+',.85)';x.lineWidth=1.2;x.beginPath();x.moveTo(px,py);x.lineTo(px+(rand(j)-.5)*6,py+5+rand(j+9)*7);x.stroke();}}
 if(kind==='jersey'){// white sleeveless jersey: blue/red/blue stripes across the chest and the hem, a plain blue shield where the
  // print was (no letters); the canvas top is the neckline
  for(const[y0,c] of [[.30,spec.ink],[.335,spec.trim],[.37,spec.ink],[.86,spec.ink],[.895,spec.trim],[.93,spec.ink]]){x.fillStyle=c;x.fillRect(0,N*y0,N,N*.022);}
  x.fillStyle=spec.ink;x.beginPath();x.moveTo(f-14,N*.46);x.lineTo(f+14,N*.46);x.lineTo(f+14,N*.58);x.lineTo(f,N*.66);x.lineTo(f-14,N*.58);x.fill();x.fillStyle='#ffffff';x.fillRect(f-8,N*.50,16,3);x.fillRect(f-8,N*.55,16,3);}
 if(kind==='camo'){// pink / yellow / olive / black camouflage blotches (Lisa's cargo trousers)
  const cols=['#f2c94c','#4f6b2e','#1d1a1c','#b52a5a','#e2457e'];for(let j=0;j<160;j++){x.fillStyle=cols[j%cols.length];x.beginPath();const px=rand(j+21)*N,py=rand(j+37)*N,r=6+rand(j+5)*12;
   x.moveTo(px+r*1.4,py);for(let k=1;k<9;k++){const a=k/9*Math.PI*2,rr=r*(.6+rand(j*9+k)*.6);x.lineTo(px+Math.cos(a)*rr*1.4,py+Math.sin(a)*rr*.8);}x.fill();}}
 if(kind==='denim'){x.fillStyle=spec.body;x.fillRect(0,0,N,N);for(let j=0;j<1400;j++){const l=rand(j+3)<.5;x.fillStyle=l?'rgba(255,255,255,.10)':'rgba(0,0,40,.10)';x.fillRect(rand(j+1)*N,rand(j+2)*N,1,3);}}
 if(kind==='noise'){for(let j=0;j<4200;j++){const l=rand(j)<.5?0:255;x.fillStyle='rgba('+l+','+l+','+l+','+(.03+rand(j+3)*.06)+')';x.fillRect(rand(j+1)*N,rand(j+2)*N,1,1);}}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;if(kind==='noise')t.repeat.set(3,3);if(kind==='camo'||kind==='denim')t.repeat.set(2,2);textures.set(key,t);return t;}
export function* buildPvStyles(variants,options){const records=new Map(),parts=[],timings=[];
for(const slot of ['top','bottom','shoes'])for(const[index,opt]of(options[slot]||[]).entries()){
 const match=/^pink-venom-(?:crew-)?(1|m[1-4])-(top|bottom|shoes)$/.exec(opt.style||'');if(!match||match[2]!==slot)continue;const spec=pvSpecs.find(s=>s.id===match[1]);if(!spec)continue;
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
  register(shell('pv-skin-upper',(x,y)=>y>hip.y-.025&&y<neck.y+.035,.0015),skin,false);
  const clothM=cloth(spec.body,spec.print);
  const hemY=waist-.048,topY=neck.y-.026;
    const R=18,B=48,far=c.torsoFar||(c.torsoFar=new Map()),fk=hemY+'|'+topY;if(!far.has(fk)){const pp=body.geometry.attributes.position,si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight,arm=new Set(['left','right'].flatMap(sd=>['Shoulder','UpperArm','LowerArm','Hand'].map(n=>{try{return boneIndex(sd+n);}catch(e){return -1;}}))),m=Array.from({length:R+1},()=>new Float32Array(B));
   for(const id of new Set(body.geometry.index.array)){const y=pp.getY(id);if(y<hemY-.012||y>topY+.012)continue;let w=0;for(let k=0;k<4;k++)if(arm.has(si.getComponent(id,k)))w+=sw.getComponent(id,k);if(w>.2)continue;
    const x=pp.getX(id),z=pp.getZ(id)-hip.z,r=Math.hypot(x,z),bi=((Math.round(Math.atan2(z,x)/(Math.PI*2)*B)%B)+B)%B,j=Math.round((y-hemY)/(topY-hemY)*R);for(const jj of [j-1,j,j+1])if(jj>=0&&jj<=R)for(const bb of [bi-1,bi,bi+1]){const q=(bb+B)%B;m[jj][q]=Math.max(m[jj][q],r);}}far.set(fk,m);}
  const farM=far.get(fk),loose=spec.print==='shag'||spec.print==='varsity'?.006:0;
  weighted(grid(R,B,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(hemY,topY,u),e=.007+loose+.016*Math.max(0,1-u/.30),q=fitted(y,a,e),r=Math.hypot(q.x,q.z-hip.z),need=u<.78?farM[Math.round(u*R)][Math.round(v*B)%B]+e:0;if(r<need){const n=Math.min(need,r+.03),dx=r>.01?q.x/r:Math.cos(a),dz=r>.01?(q.z-hip.z)/r:Math.sin(a);q.x=dx*n;q.z=hip.z+dz*n;}return q;}),clothM);
  // neck edge: a rib collar (cream for the varsity jacket, blue for the jersey), a thin halter band, or the shag itself
  weighted(grid(2,40,(u,v)=>fitted(topY-.004+u*.016,v*Math.PI*2,.010+loose)),mat(spec.collar||(spec.print==='halter'?spec.trim:spec.body),{roughness:.85}));
  // varsity jacket: a cream rib band at the hem
  if(spec.print==='varsity')weighted(grid(2,48,(u,v)=>fitted(hemY+.002+u*.014,v*Math.PI*2,.010+loose)),mat(spec.trim,{roughness:.9}));
  // jersey: blue bands round the armholes
  if(spec.print==='jersey')for(const side of ['left','right']){const sh=pos(side+'UpperArm'),s=Math.sign(sh.x);weighted(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().set(sh.x-s*.006+(u-.5)*.006*s,sh.y+Math.sin(a)*.040-.008,sh.z+Math.cos(a)*.036);}),mat(spec.collar,{roughness:.8}),side+'UpperArm');}
  // sleeves: the varsity jacket's black patched sleeves with a cream rib cuff; the shaggy jacket's long fuzzy sleeves
  if(spec.sleeve==='long'){const sc=spec.print==='varsity'?cloth(spec.body,'varsleeve'):spec.print==='shag'?cloth(spec.body,'shagsleeve'):cloth(spec.body);for(const side of ['left','right'])register(armShell(body,boneIndex,side,{lower:true,offset:.006,a:pos(side+'UpperArm'),b:pos(side+'Hand'),puff:spec.puff||.004}),sc,false);
   if(spec.print==='varsity'){const tm=mat(spec.trim,{roughness:.9});for(const side of ['left','right']){const e=pos(side+'LowerArm'),h=pos(side+'Hand'),d=V().subVectors(h,e),L=d.length();d.normalize();const ax=Math.abs(d.y)<.9?V().set(0,1,0):V().set(1,0,0),p1=V().crossVectors(d,ax).normalize(),p2=V().crossVectors(d,p1).normalize(),cc=V().copy(e).addScaledVector(d,L*.84);
    weighted(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().copy(cc).addScaledVector(d,(u-.5)*L*.12).addScaledVector(p1,Math.cos(a)*.036).addScaledVector(p2,Math.sin(a)*.036);}),tm,side+'LowerArm');}}}
 }

 if(slot==='bottom'){
  if(spec.bottom==='shorts'){
   // shorts (Jennie's denim romper / Jisoo's black shorts). 2026-11-15 (orchestrator, the child can wear them now): the skin-
   // lifted shell showed the crotch/gusset shape, so they are built like How You Like That's loose shorts: a lining (her hip
   // skin lifted, continuous through the crotch, hidden inside), a loose band round the hips and a loose tube per leg, so the
   // shorts never show the body's shape. Same colour/texture, length, waistband and roll-up hem ring; her thigh skin below.
   const hemY=waist-.120,sm=spec.shortsPrint==='denim'?cloth(spec.shortsColor,'denim'):mat(spec.shortsColor,{roughness:.6,clearcoat:.2});
   register(shell('pv-shorts-in',(x,y)=>y<waist+.006&&y>hemY+.004,.010),sm,false);
   register(shell('pv-thigh-short',(x,y)=>y>hip.y-.165&&y<hemY+.014,.0095),skin,false);
   // the band runs down past the crotch (as HYLT), so the front reads flat across it; slimmer ease than HYLT's high-waisted
   // pair, so these short shorts keep their own fitted line; the roll-up hem ring sits on the tube's hem
   const bandLow=Math.max(hip.y-.058,hemY+.010),legTop=Math.min(bandLow+.012,hemY+.040);
   // the grids' uv run once round the body: tile them so the denim grain is as fine as on her skin-lifted lining
   const tile=g=>{const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*3,uv.getY(i)*.35);return g;};
   weighted(tile(grid(4,48,(u,v)=>fitted(T.MathUtils.lerp(waist+.004,bandLow,u),v*Math.PI*2,.011+.006*u))),sm,'hips');
   for(const side of ['left','right'])skinLike(tile(grid(6,28,(u,v)=>{const y=T.MathUtils.lerp(legTop,hemY,u),q=legSection(side,y,.010),a=v*Math.PI*2,g=.012+.004*u;return q?V().set(q.cx+Math.cos(a)*(q.rx+g),y,q.cz+Math.sin(a)*(q.rz+g)):V().set(0,y,hip.z);})),sm,side);
   for(const side of ['left','right'])ring(side,hemY+.005,.019,.010,sm);
   weighted(grid(3,48,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.018);q.y=waist+.008-u*.018;return q;}),spec.shortsPrint==='denim'?sm:mat('#26262b',{roughness:.5}),'hips');
  }else{
   // cargo trousers: her leg skin lifted from the waist to the ankle (a little loose), a hem ring per leg, a waistband, a
   // cargo pocket on each outer thigh; Rose's black pair has strap rings round both legs
   const hemY=floor+.060,off=.015,pm=spec.pantsPrint==='camo'?cloth(spec.bottomColor,'camo'):mat(spec.bottomColor,{roughness:.75,glow:.05});
   register(shell('pv-pants',(x,y)=>y<waist+.010&&y>hemY,off),pm,false);
   for(const side of ['left','right'])ring(side,hemY+.004,off+.003,.018,pm);
   weighted(grid(3,48,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.022);q.y=waist+.008-u*.018;return q;}),spec.pantsPrint==='camo'?mat('#3f5a26',{roughness:.7}):pm,'hips');
   const pk=spec.pantsPrint==='camo'?mat('#4f6b2e',{roughness:.8}):mat('#232328',{roughness:.8});
   for(const side of ['left','right']){const y=hip.y-.115,q=legSection(side,y,.012);if(!q)continue;skinLike(grid(2,2,(u,v)=>V().set(q.out+q.s*(off+.004),y-.030+u*.060,q.cz-.022+v*.044)),pk,side);}
   if(spec.straps){const knee=pos('leftLowerLeg').y,strap=mat('#2b2b30',{roughness:.4,clearcoat:.5,glow:.04}),metal=mat('#d4d4da',{roughness:.25,metalness:.8,glow:.3});
    for(const side of ['left','right'])for(const y of [knee+.07,knee-.10]){ring(side,y,off+.006,.012,strap);ring(side,y,off+.0075,.004,metal);}}
  }
 }

 if(slot==='shoes'){
  register(shell('pv-legs',(x,y)=>y>floor&&y<hip.y-.105,.0005),skin,false);
  // boots: her foot and ankle skin lifted to the shaft top, a sole rim (white for the hiking boots and high-tops), a heel, a
  // collar ring (Jisoo's white sock band above her knee boots) and lace bars up the front
  const kneeY=pos('leftLowerLeg').y,sh=spec.over?Math.min(kneeY-floor+.075,hip.y-.172-floor):spec.knee?kneeY-floor-.012:spec.shaft||.115,up=mat(spec.shoeColor,{roughness:.35,clearcoat:.7,clearcoatRoughness:.2,sheen:0,glow:.06}),sole=mat(spec.soleColor||'#26262b',{roughness:.6,glow:spec.soleColor?.12:.04}),lace=mat(spec.laces||'#3a3a40',{roughness:.5,glow:spec.laces?.15:.05});
  register(shell('pv-boot-'+Math.round(sh*1000),(x,y)=>y>floor-.01&&y<floor+sh,.0045),up,false);
  for(const side of ['left','right']){const f=pos(side+'Foot');
   skinLike(grid(2,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.041,floor+.002+u*(spec.soleColor?.018:sh>.12?.016:.010),f.z+.030+Math.sin(a)*.079);}),sole,side);
   skinLike(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.041*u,floor+(spec.soleColor?.020:sh>.12?.018:.012),f.z+.030+Math.sin(a)*.079*u);}),sole,side);
   skinLike(grid(2,12,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.018,floor-.004+u*(sh>.12?.020:.030),f.z-.034+Math.sin(a)*.016);}),sole,side);
   ring(side,floor+sh-.003,.0065,spec.sockBand?.022:.008,spec.sockBand?mat(spec.sockBand,{roughness:.8}):up);
   const nl=spec.knee||spec.over?0:spec.laces?4:sh>.12?Math.max(5,Math.round(sh/.03)):0;for(let k=0;k<nl;k++){const y=floor+.040+k*(sh-.055)/(nl-1),q=legSection(side,y,.010);if(!q)continue;skinLike(grid(1,2,(u,v)=>V().set(q.cx+(v-.5)*.022,y-.002+u*.004,q.cz+q.rz+.0075)),lace,side);}
  }
 }
 const groups=new Map();for(const m of rec.meshes){if(m.userData.sharedCrewGeometry)continue;const g=m.geometry,key=m.material.uuid+'|'+Object.entries(g.attributes).map(([k,a])=>k+a.itemSize+a.array.constructor.name).sort().join(',')+'|'+g.index?.array.constructor.name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}for(const ms of groups.values())if(ms.length>1){const g=mergeGeometries(ms.map(m=>m.geometry),false);if(!g)throw Error('Pink Venom geometry schema mismatch');ms[0].geometry.dispose();ms[0].geometry=g;for(const m of ms.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
 rec.buildMs=performance.now()-start;records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});timings.push({slot,ms:rec.buildMs,meshes:rec.meshes.length});yield;
}return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
export function createPvStyles(...args){const it=buildPvStyles(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
