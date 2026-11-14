import * as T from 'three';
import {fitPoint,fitSection,armShell} from './body-fit.js?v=1411.1139';
import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1411.1139';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// "Roly Poly" (T-ara), official MV (Dance Version), 70s disco club. Looks from the MV's club scenes: a red-white striped
// jacket over a mint polka-dot shirt with a red collar, polka-dot blouses with neck bows, denim vests, high-waist red / white /
// teal / denim flared trousers, red or mustard belts, shorts, chunky platform shoes, headscarves and sunglasses.
// Built like ttl-time-to-love-styles.js: tops hug the body through body-fit.js (convex torso slice + ease, pushed past the
// bust), sleeves are her own arm skin lifted (armShell), trousers/shorts/shoes are her own skin lifted (skinned like the body,
// each leg its own), flares widen her own leg section below the knee. Modest for the child: every top reaches over the
// waistband. No text or logos.
// Style ids: roly-poly-1-{top,bottom,shoes,accessory} (shop set + the headscarf), roly-poly-crew-{c1..c6}-{top,bottom,shoes}
// and roly-poly-crew-glasses-accessory (crew-only sunglasses).
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
// top: tee (short / cap sleeves, puff) | tank (sleeveless straps); cloth cotton | denim | satin;
// print: plain | dots (polka dots in `dots` colours) | stripes (vertical) | hstripes (horizontal) | jacket (striped jacket open
// over a dotted shirt, sleeves striped) | vest (denim vest over the blouse); collar: pointed collar colour; bow: neck bow colour;
// belt: colour of a belt over the top at the waist (gold buckle). bottom: flare (high-waist flared trousers) | shorts.
// shoes: platform (chunky platform pumps, colour). hat: scarf (polka-dot headscarf, accessory) | glasses (sunglasses).
export const rolyPolySpecs=[
{id:'1',top:'tee',sleeveLen:'short',body:'#93d3bf',cloth:'cotton',print:'jacket',stripe:['#f4eee2','#cf4a3e'],dots:['#d6463a','#2f6db0','#f0b93e','#2b2b30','#f6f1e4'],collar:'#d23a35',bow:'#d23a35',belt:'#c8302c',bottom:'flare',bottomColor:'#c9322e',bcloth:'cotton',shoe:'platform',shoeColor:'#c8302c',hat:'scarf'},
{id:'c1',top:'tee',sleeveLen:'cap',puff:.006,body:'#86a9cf',cloth:'denim',print:'plain',collar:'#86a9cf',belt:'#d9a531',bottom:'shorts',bottomColor:'#9c2b2e',bcloth:'cotton',hem:-.150,shoe:'platform',shoeColor:'#d23a35'},
{id:'c2',top:'tee',sleeveLen:'short',body:'#f5f2ea',cloth:'cotton',print:'dots',dots:['#e04a3c','#2a2a2e'],dotScale:.55,belt:'#cf2f2f',bottom:'flare',bottomColor:'#f1eee6',bcloth:'cotton',shoe:'platform',shoeColor:'#c99b67'},
{id:'c3',top:'tee',sleeveLen:'cap',puff:.012,body:'#f6f2ea',cloth:'cotton',print:'vest',vest:'#2e3d5c',dots:['#d6463a'],bow:'#d6463a',bottom:'flare',bottomColor:'#33425e',bcloth:'denim',shoe:'platform',shoeColor:'#1c1c20'},
{id:'c4',top:'tee',sleeveLen:'short',body:'#f4f1ea',cloth:'cotton',print:'vest',vest:'#9fb7cc',collar:'#f4f1ea',belt:'#b9824a',bottom:'flare',bottomColor:'#b4c1cd',bcloth:'denim',shoe:'platform',shoeColor:'#f2efe8'},
{id:'c5',top:'tank',body:'#86ccbb',cloth:'cotton',print:'dots',dots:['#203047'],dotScale:1.2,bottom:'flare',bottomColor:'#2c8e94',bcloth:'cotton',belt:'#203047',shoe:'platform',shoeColor:'#c8302c'},
{id:'c6',top:'tee',sleeveLen:'short',body:'#f4eee2',cloth:'cotton',print:'hstripes',stripe:['#f4eee2','#cf3b35'],collar:'#1f2d4a',bow:'#1f2d4a',belt:'#c8302c',bottom:'flare',bottomColor:'#3e5f8e',bcloth:'denim',shoe:'platform',shoeColor:'#8a2a2c'},
{id:'glasses',glasses:true}];
export const hideNativeRolyPolySafety=(m,o)=>/^roly-poly-/.test(o?.style||'')&&(m.userData.excludeHatMua||m.userData.excludeHuntrix||/cream_undershorts/.test(m.name));
// 256 px canvases (u = height, v = around the body, the front is v = .25)
const textures=new Map();
function dotsOn(x,N,cols,scale=1,seed=0){const step=N/(7/scale);for(let r=0,row=0;r<N+step;r+=step*.62,row++)for(let q=(row%2)*step/2;q<N+step;q+=step){const c=cols[(row*3+Math.round(q/step)+seed)%cols.length];x.fillStyle=c;x.beginPath();x.arc(q,r,step*.17,0,7);x.fill();}}
function tex(kind,spec){const key=kind+JSON.stringify([spec.body,spec.stripe,spec.dots,spec.vest,spec.dotScale]);if(textures.has(key))return textures.get(key);const N=kind==='noise'||kind==='denim'?128:256,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.fillStyle=spec.body;x.fillRect(0,0,N,N);
 const at=(v,u)=>[v*N,(1-u)*N],st=spec.stripe||['#f4eee2','#cf4a3e'];
 if(kind==='dots')dotsOn(x,N,spec.dots||['#2b2b30'],spec.dotScale||1);
 if(kind==='stripes'||kind==='sleeve'){x.fillStyle=st[0];x.fillRect(0,0,N,N);x.fillStyle=st[1];for(let k=0;k<N;k+=N/16)x.fillRect(k,0,N/48,N);}
 if(kind==='hstripes'){x.fillStyle=st[0];x.fillRect(0,0,N,N);x.fillStyle=st[1];for(let k=0;k<N;k+=N/14)x.fillRect(0,k,N,N/40);}
 if(kind==='jacket'){x.fillStyle=st[0];x.fillRect(0,0,N,N);x.fillStyle=st[1];for(let k=0;k<N;k+=N/24)x.fillRect(k,0,N/64,N);
  // the open front shows the dotted shirt: a band round v = .25 that widens towards the neck (lapels)
  x.save();x.beginPath();const [a0]=at(.25-.075,0),[a1]=at(.25+.075,0),[b0]=at(.25-.115,0),[b1]=at(.25+.115,0);x.moveTo(a0,N);x.lineTo(a0,at(0,.55)[1]);x.lineTo(b0,0);x.lineTo(b1,0);x.lineTo(a1,at(0,.55)[1]);x.lineTo(a1,N);x.closePath();x.clip();x.fillStyle=spec.body;x.fillRect(0,0,N,N);dotsOn(x,N,spec.dots||['#2b2b30'],.45);x.restore();
  x.strokeStyle='rgba(120,30,25,.55)';x.lineWidth=2;x.beginPath();x.moveTo(a0,N);x.lineTo(a0,at(0,.55)[1]);x.lineTo(b0,0);x.moveTo(a1,N);x.lineTo(a1,at(0,.55)[1]);x.lineTo(b1,0);x.stroke();}
 if(kind==='vest'){dotsOn(x,N,spec.dots||[spec.body],.7);x.fillStyle=spec.vest;x.fillRect(0,at(0,.80)[1],N,N);x.fillStyle=spec.body;if(!spec.dots)x.fillStyle=spec.body;
  // the vest is open at the centre front in a V from the neck down to the waist; the blouse shows through
  x.save();x.beginPath();const [a0]=at(.25-.035,0),[a1]=at(.25+.035,0),[b0]=at(.25-.10,0),[b1]=at(.25+.10,0);x.moveTo(a0,N);x.lineTo(b0,at(0,.80)[1]);x.lineTo(b1,at(0,.80)[1]);x.lineTo(a1,N);x.closePath();x.clip();x.fillStyle=spec.body;x.fillRect(0,0,N,N);if(spec.dots)dotsOn(x,N,spec.dots,.7);x.restore();
  for(let j=0;j<1800;j++){x.fillStyle='rgba(255,255,255,'+(.04+rand(j)*.05)+')';const yy=at(0,.8)[1]+rand(j+1)*(N-at(0,.8)[1]);x.fillRect(rand(j+2)*N,yy,1,3);}
  x.fillStyle='#e8e2d2';for(let u=.15;u<.75;u+=.14){const [p,q]=at(.25+.05,u);x.beginPath();x.arc(p,q,2.2,0,7);x.fill();}}
 if(kind==='noise'||kind==='denim'){for(let j=0;j<4200;j++){const l=rand(j)<.5?0:255;x.fillStyle='rgba('+l+','+l+','+l+','+(.03+rand(j+3)*.06)+')';x.fillRect(rand(j+1)*N,rand(j+2)*N,1,kind==='denim'?3:1);}
  if(kind==='denim'){x.strokeStyle='rgba(255,255,255,.07)';for(let k=-N;k<N;k+=3){x.beginPath();x.moveTo(k,0);x.lineTo(k+N,N);x.stroke();}}}
 if(kind==='scarf'){x.fillStyle='#cf2f30';x.fillRect(0,0,N,N);dotsOn(x,N,['#f6f1e6'],1.3);}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;if(kind==='noise'||kind==='denim')t.repeat.set(3,3);if(kind==='scarf')t.repeat.set(7,1);textures.set(key,t);return t;}
export function* buildRolyPolyStyles(variants,options){const records=new Map(),parts=[],timings=[];
for(const slot of ['top','bottom','shoes','accessory'])for(const[index,opt]of(options[slot]||[]).entries()){
 const match=/^roly-poly-(?:crew-)?(1|c[1-6]|glasses)-(top|bottom|shoes|accessory)$/.exec(opt.style||'');if(!match||match[2]!==slot)continue;const spec=rolyPolySpecs.find(s=>s.id===match[1]);if(!spec)continue;
 const start=performance.now(),donor=variants[opt.variant],c=donorCache(donor),{body,hip,neck,pos,boneIndex,shell,floor,legQuery,wOf}=c,rec={id:opt.id,index,slot,meshes:[]};
 const mat=(color,o={})=>{const m=new T.MeshPhysicalMaterial({color,roughness:.8,clearcoat:.03,sheen:.35,sheenRoughness:.6,side:T.DoubleSide,...o});m.emissive.set(color);m.emissiveIntensity=o.glow??(/^#[ef]/i.test(color)?.20:.10);if(o.map){m.map=o.map;m.emissiveMap=o.map;}return m;};
 const cloth=(color,kind,print='plain',extra={})=>{const s={...spec,body:color,...extra},map=print!=='plain'?tex(print,s):kind==='denim'?tex('denim',s):tex('noise',s),light=/^#[a-f9]/i.test(color);
  const m=mat('#ffffff',kind==='satin'?{map,roughness:.34,metalness:.38,clearcoat:.35,clearcoatRoughness:.3,sheen:.25,glow:0}:{map,roughness:kind==='denim'?.88:.8,glow:0});m.emissive.set('#ffffff');m.emissiveIntensity=light?.14:.07;return m;};
 const gold=mat('#d9b56a',{roughness:.28,metalness:.85,clearcoat:.4,sheen:0,glow:.10});
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
 if(slot==='top'){
  register(shell('rp-skin-upper',(x,y)=>y>hip.y-.025&&y<neck.y+.035,.0015),skin,false);
  const cl=cloth(spec.body,spec.cloth,spec.print);
  // body: from just under the trousers' waistband (it lies over it: ease grows to the hem) up to the neckline
  const hemY=waist-.048,topY=neck.y-(spec.top==='tank'?.034:.026);const clothM=cl;
  // the body-fit hull leaves out the VRoid bust bones: every row is also pushed out past the furthest torso skin point
  // (arms left out) in its angle bin, plus the same ease
  const R=18,B=48,far=c.torsoFar||(c.torsoFar=new Map()),fk=hemY+'|'+topY;if(!far.has(fk)){const pp=body.geometry.attributes.position,si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight,arm=new Set(['left','right'].flatMap(sd=>['Shoulder','UpperArm','LowerArm','Hand'].map(n=>{try{return boneIndex(sd+n);}catch(e){return -1;}}))),m=Array.from({length:R+1},()=>new Float32Array(B));
   for(const id of new Set(body.geometry.index.array)){const y=pp.getY(id);if(y<hemY-.012||y>topY+.012)continue;let w=0;for(let k=0;k<4;k++)if(arm.has(si.getComponent(id,k)))w+=sw.getComponent(id,k);if(w>.2)continue;
    const x=pp.getX(id),z=pp.getZ(id)-hip.z,r=Math.hypot(x,z),bi=((Math.round(Math.atan2(z,x)/(Math.PI*2)*B)%B)+B)%B,j=Math.round((y-hemY)/(topY-hemY)*R);for(const jj of [j-1,j,j+1])if(jj>=0&&jj<=R)for(const bb of [bi-1,bi,bi+1]){const q=(bb+B)%B;m[jj][q]=Math.max(m[jj][q],r);}}far.set(fk,m);}
  const farM=far.get(fk);
  weighted(grid(R,B,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(hemY,topY,u),e=.007+.016*Math.max(0,1-u/.30),q=fitted(y,a,e),r=Math.hypot(q.x,q.z-hip.z),need=u<.78?farM[Math.round(u*R)][Math.round(v*B)%B]+e:0;if(r<need){const n=Math.min(need,r+.03),dx=r>.01?q.x/r:Math.cos(a),dz=r>.01?(q.z-hip.z)/r:Math.sin(a);q.x=dx*n;q.z=hip.z+dz*n;}return q;}),clothM);
  const ribColor=spec.print==='jacket'?spec.stripe[0]:spec.print==='vest'?spec.body:spec.print==='hstripes'?spec.stripe[0]:spec.body;
  weighted(grid(2,40,(u,v)=>fitted(topY-.004+u*.010,v*Math.PI*2,.010)),mat(ribColor,{roughness:.9}));
  // sleeves: cap / short (upper arm part), striped for the jacket; tank: wide straps over the shoulder caps
  if(spec.top==='tank')for(const side of ['left','right'])register(armShell(body,boneIndex,side,{lower:false,a:pos(side+'UpperArm'),b:pos(side+'LowerArm'),upperFrac:.10,offset:.006}),clothM,false);
  if(spec.top!=='tank'){const sc=spec.print==='jacket'||spec.print==='stripes'?cloth(spec.stripe[0],'cotton','sleeve'):spec.print==='hstripes'?cloth(spec.stripe[0],'cotton','hstripes'):spec.print==='dots'?clothM:spec.print==='vest'?cloth(spec.body,'cotton',spec.dots?'dots':'plain',{dotScale:.7}):cloth(spec.body,spec.cloth);
   for(const side of ['left','right']){const sh=pos(side+'UpperArm'),el=pos(side+'LowerArm');
    register(armShell(body,boneIndex,side,{lower:false,a:sh,b:el,upperFrac:spec.sleeveLen==='cap'?.30:.50,offset:.006,puff:spec.puff||.004}),sc,false);}}
  // pointed collar: two flat flaps from the neckline down over the chest, a little apart at the front
  if(spec.collar){const cm=mat(spec.collar,{roughness:.7});for(const s of [-1,1]){const flap=grid(3,6,(u,w)=>{const a=Math.PI/2+s*(.10+w*.55),y=topY+.002-u*(.030+.018*(1-w)),q=fitted(y,a,.014+.004*u);return q;});weighted(flap,cm,'upperChest');}}
  // neck bow at the throat: two lobes + a knot (+ two short tails)
  if(spec.bow){const bm=mat(spec.bow,{roughness:.55,sheen:.5}),k=fitted(topY-.006,Math.PI/2,.020);
   blob(k,.008,bm,'upperChest',1,1,.7);for(const s of [-1,1]){blob(k.clone().add(V().set(s*.017,.001,-.001)),.012,bm,'upperChest',1.35,.75,.45,s*.25);blob(k.clone().add(V().set(s*.008,-.020,.000)),.007,bm,'upperChest',.6,1.7,.4,s*.35);}}
  // belt over the top at the waist, gold buckle at the front
  if(spec.belt){weighted(grid(3,48,(u,v)=>fitted(waist-.010+u*.020,v*Math.PI*2,.024)),mat(spec.belt,{roughness:.4,clearcoat:.6,glow:.08}));
   const f=fitted(waist,Math.PI/2,.030);weighted(grid(1,4,(u,v)=>f.clone().add(V().set((v-.5)*.030,(u-.5)*.022,0))),gold,'hips');}
 }
 if(slot==='bottom'){
  const bc=cloth(spec.bottomColor,spec.bcloth);
  if(spec.bottom==='shorts'){
   // the rose donor's pink undershorts (skirt-safety.js: hip-.15..hip+.10 at +8 mm) are covered: shorts lifted 11 mm, and
   // below the hem her own thigh skin lifted 9.5 mm down past the undershorts' edge (same as tim-em-styles.js)
   const hemY=hip.y+spec.hem;
   register(shell('rp-shorts'+spec.hem,(x,y)=>y<waist+.006&&y>hemY,.011),bc,false);
   if(hemY>hip.y-.160)register(shell('rp-thigh'+spec.hem,(x,y)=>y>hip.y-.165&&y<hemY+.006,.0095),skin,false);
   const cuff=cloth(spec.bottomColor,spec.bcloth);
   for(const side of ['left','right']){const s=Math.sign(pos(side+'Foot').x),pp=body.geometry.attributes.position;let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const id of new Set(body.geometry.index.array)){const x=pp.getX(id),y=pp.getY(id);if(x*s>.004&&Math.abs(y-(hemY+.004))<.008){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,pp.getZ(id));z1=Math.max(z1,pp.getZ(id));}}
    if(!Number.isFinite(x0))continue;const cx=(x0+x1)/2,cz=(z0+z1)/2,rx=(x1-x0)/2+.013,rz=(z1-z0)/2+.013;
    skinLike(grid(2,32,(u,v)=>{const a=v*Math.PI*2;return V().set(cx+Math.cos(a)*rx,hemY+.001+u*.010,cz+Math.sin(a)*rz);}),cuff,side);}
  }else{
   // high-waist flared trousers: her leg skin lifted, widening from the knee down to a wide hem over the shoe; the hem is
   // a ring round each leg's own section (skinned from that leg only)
   const knee=pos('leftLowerLeg').y,hemY=floor+.030,flare=y=>.011+.026*Math.pow(T.MathUtils.clamp((knee-.02-y)/(knee-.02-hemY),0,1),1.4);
   register(shell('rp-flare',(x,y)=>y<waist+.010&&y>hemY,(x,y)=>flare(y)),bc,false);
   for(const side of ['left','right']){const s=Math.sign(pos(side+'Foot').x),pp=body.geometry.attributes.position;let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const id of new Set(body.geometry.index.array)){const x=pp.getX(id),y=pp.getY(id);if(x*s>.004&&Math.abs(y-(hemY+.006))<.008){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,pp.getZ(id));z1=Math.max(z1,pp.getZ(id));}}
    if(!Number.isFinite(x0))continue;const cx=(x0+x1)/2,cz=(z0+z1)/2,rx=(x1-x0)/2+flare(hemY)+.002,rz=(z1-z0)/2+flare(hemY)+.002;
    skinLike(grid(2,32,(u,v)=>{const a=v*Math.PI*2;return V().set(cx+Math.cos(a)*rx,hemY-.004+u*.010,cz+Math.sin(a)*rz);}),bc,side);}
  }
 }
 if(slot==='shoes'){
  register(shell('rp-legs',(x,y)=>y>floor&&y<hip.y-.105,.0005),skin,false);
  const top=floor+.062,up=mat(spec.shoeColor,{roughness:.35,clearcoat:.7,clearcoatRoughness:.2,sheen:0,glow:.10}),sole=mat(spec.shoeColor,{roughness:.55,glow:.06}),dark=mat('#2a1d18',{roughness:.6,glow:.04});
  register(shell('rp-shoe',(x,y)=>y>floor-.01&&y<top,.006),up,false);
  for(const side of ['left','right']){const f=pos(side+'Foot');
   // chunky platform: a thick sole slab under the whole foot, a darker edge line, and a block heel at the back
   skinLike(grid(2,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.043,floor+.002+u*.024,f.z+.030+Math.sin(a)*.081);}),sole,side);
   skinLike(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.0435,floor+.002+u*.004,f.z+.030+Math.sin(a)*.0815);}),dark,side);
   skinLike(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.043*u,floor+.026,f.z+.030+Math.sin(a)*.081*u);}),sole,side);
   // ankle strap ring
   const pp=body.geometry.attributes.position,s=Math.sign(f.x),y0=floor+.075;let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const id of new Set(body.geometry.index.array)){const x=pp.getX(id),y=pp.getY(id);if(x*s>.004&&Math.abs(y-y0)<.008){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,pp.getZ(id));z1=Math.max(z1,pp.getZ(id));}}
   if(Number.isFinite(x0)){const cx=(x0+x1)/2,cz=(z0+z1)/2,rx=(x1-x0)/2+.006,rz=(z1-z0)/2+.006;skinLike(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().set(cx+Math.cos(a)*rx,y0-.005+u*.009,cz+Math.sin(a)*rz);}),up,side);}
  }
 }
 if(slot==='accessory'&&spec.hat==='scarf'){const sm=cloth('#cf2f30','cotton','scarf'),C=V().set(0,1.100,-.012);
  // polka-dot headscarf tied as a wide band over the crown from ear to ear (outside the hair: sized on the shop hair, top
  // 1.30, sides .165), a big knotted bow on top to one side, like the MV's red scarf bows
  weighted(grid(3,40,(u,v)=>{const t=(v-.5)*Math.PI*1.12,rx=.180,ry=.212,zz=(u-.5)*.072;return V().set(C.x+Math.sin(t)*rx*(1-.08*Math.abs(zz)/.036),C.y+Math.cos(t)*ry-.010*Math.abs(zz)/.036,C.z+zz+.018*Math.cos(t));}),sm,'head');
  const t0=-.42,K=V().set(C.x+Math.sin(t0)*.188,C.y+Math.cos(t0)*.220,C.z+.012);blob(K,.020,sm,'head',1,.85,.9);for(const s of [-1,1])blob(K.clone().add(V().set(s*.034*Math.cos(t0),-s*.034*Math.sin(t0)+.006,.002)),.026,sm,'head',1.35,.62,.55,-t0-s*.35);}
 if(slot==='accessory'&&spec.glasses){const {eyes,front}=c,z=front+.010,frame=mat('#f4f2ec',{roughness:.3,clearcoat:.8,glow:.18}),lens=mat('#6a2c44',{roughness:.12,clearcoat:1,metalness:.1,glow:.06,transparent:true,opacity:.62,depthWrite:false});
  // white cat-eye sunglasses over the drawn eyes: lens discs, a frame ring with upswept outer corners, a bridge, short arms
  for(const e of [eyes.l,eyes.r]){const s=Math.sign(e.x)||1,cx=e.x,cy=e.y+.002,RX=e.rx*1.02,RY=e.ry*1.05,curve=a=>1+Math.max(0,Math.cos(a)*s)*Math.max(0,Math.sin(a))*.95;
   weighted(grid(1,28,(u,v)=>{const a=v*Math.PI*2;return V().set(cx+Math.cos(a)*RX*u,cy+Math.sin(a)*RY*u*curve(a),z-.004*(1-u)+Math.abs(Math.cos(a))*u*.006*0);}),lens,'head');
   weighted(grid(1,28,(u,v)=>{const a=v*Math.PI*2,r=1+u*.34;return V().set(cx+Math.cos(a)*RX*r,cy+Math.sin(a)*RY*r*curve(a),z+.001);}),frame,'head');
   weighted(grid(1,2,(u,v)=>V().set(cx+s*RX*1.18,cy+RY*.35+.004*(u-.5),z-v*.10)),frame,'head');}
  const bx=(eyes.l.x+eyes.r.x)/2,gap=Math.abs(eyes.l.x-eyes.r.x)-1.2*(eyes.l.rx+eyes.r.rx);weighted(grid(1,2,(u,v)=>V().set(bx+(v-.5)*Math.max(.012,gap),(eyes.l.y+eyes.r.y)/2+.010+(u-.5)*.006,z+.002)),frame,'head');}
 const groups=new Map();for(const m of rec.meshes){if(m.userData.sharedCrewGeometry)continue;const g=m.geometry,key=m.material.uuid+'|'+Object.entries(g.attributes).map(([k,a])=>k+a.itemSize+a.array.constructor.name).sort().join(',')+'|'+g.index?.array.constructor.name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}for(const ms of groups.values())if(ms.length>1){const g=mergeGeometries(ms.map(m=>m.geometry),false);if(!g)throw Error('Roly Poly geometry schema mismatch');ms[0].geometry.dispose();ms[0].geometry=g;for(const m of ms.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
 rec.buildMs=performance.now()-start;records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});timings.push({slot,ms:rec.buildMs,meshes:rec.meshes.length});yield;
}return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
export function createRolyPolyStyles(...args){const it=buildRolyPolyStyles(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
