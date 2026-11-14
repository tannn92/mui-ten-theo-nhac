import * as T from 'three';
import {fitPoint,fitSection,armShell} from './body-fit.js?v=1411.2316';
import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1411.2316';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// "DDU-DU DDU-DU" (BLACKPINK). Looks from the official MV's main group dance, the final chorus on the neon pyramid-temple set
// (MV 2:50-3:24): Jennie's white crescent-moon print top + wide blue/yellow/purple graphic trousers + black boots; Jisoo's
// hot-pink fuzzy cropped jacket + black-white checkered mini skirt + white ankle boots; Rosé's white graphic-print long-sleeve
// mini dress + checkered ankle boots; Lisa's black-white checkered tee + black track pants with neon green/red side stripes +
// white sneakers. Built like roly-poly-styles.js: tops hug the body through body-fit.js (convex torso slice + ease, pushed past
// the bust), sleeves are her own arm skin lifted (armShell), trousers/shoes are her own skin lifted (skinned like the body, each
// leg its own; rings and stripes take weights from their own leg). Modest: every top reaches over the waistband (the MV's crop
// tops are closed), every skirt has black shorts underneath (skirt-safety). No text or logos.
// Style ids: ddu-du-ddu-du-1-{top,bottom,shoes} (shop set, the Jisoo look as a girl's version) and
// ddu-du-ddu-du-crew-m1..m4-{top,bottom,shoes} (crew-only: the four members' looks).
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
export const dduSpecs=[
{id:'1',sleeve:'long',puff:.010,body:'#f2559e',inner:'#f7f4ef',print:'jacket',bottom:'skirt',skirt:.150,check:['#f6f4ef','#1d1c22'],shorts:'#1d1c22',shoe:'boot',shoeColor:'#f3f1ec'},
{id:'m1',sleeve:'long',puff:.004,body:'#f5f3ee',ink:'#1b1b20',print:'moons',bottom:'wide',bottomPrint:'graphic',graphic:['#3f86e6','#f0cf36','#1d2f8c','#19c7d6','#f4f2ee','#7b3fc6'],bodyB:'#f4f2ee',shoe:'boot',shoeColor:'#17171b'},
{id:'m2',sleeve:'long',puff:.012,body:'#ea3a92',print:'fuzzy',bottom:'skirt',skirt:.140,check:['#f6f4ef','#1d1c22'],shorts:'#1d1c22',shoe:'boot',shoeColor:'#f3f1ec'},
{id:'m3',sleeve:'long',puff:.004,body:'#f6f4f0',graphic:['#f0c43a','#2e6ed6','#df4a3e','#1c1c22','#3db58a'],print:'tattoo',bottom:'skirt',skirt:.120,skirtPrint:'tattoo',shorts:'#f3f1ec',shoe:'boot',shoeCheck:['#f6f4ef','#1d1c22'],shoeColor:'#f6f4ef'},
{id:'m4',sleeve:'short',puff:.004,body:'#f6f4ef',check:['#f6f4ef','#1d1c22'],print:'check',bottom:'track',bottomColor:'#141418',stripes:['#46f06a','#e8343a'],shoe:'sneaker',shoeColor:'#f4f4f1'}];
export const hideNativeDduSafety=(m,o)=>/^ddu-du-ddu-du-/.test(o?.style||'')&&(m.userData.excludeHatMua||m.userData.excludeHuntrix||/cream_undershorts/.test(m.name));
// 256 px canvases (grid u = height, v = around the body, the front is v = .25; shells use the body's own UVs)
const textures=new Map();
function tex(kind,spec,nx=16,ny=16){const key=kind+nx+'x'+ny+JSON.stringify([spec.body,spec.check,spec.graphic,spec.ink,spec.inner]);if(textures.has(key))return textures.get(key);const N=kind==='noise'?128:256,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.fillStyle=spec.body;x.fillRect(0,0,N,N);
 const ck=spec.check||['#f6f4ef','#1d1c22'],gr=spec.graphic||['#2a49d0','#f0cf36','#7b3fc6','#17171c'];
 if(kind==='check'){x.fillStyle=ck[0];x.fillRect(0,0,N,N);x.fillStyle=ck[1];const w=N/nx,h=N/ny;for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)if((i+j)%2)x.fillRect(i*w,j*h,w+.5,h+.5);}
 if(kind==='moons'){x.fillStyle=spec.ink||'#1b1b20';const w=N/nx,h=N/ny;for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const cx=(i+.5+(j%2)*.5)*w,cy=(j+.5)*h,r=w*.30;x.save();x.translate(cx,cy);x.scale(1,2.4);x.beginPath();x.arc(0,0,r,0,7);x.arc(r*.45,-r*.15,r*.82,0,7,true);x.fill('evenodd');x.restore();}}
 if(kind==='graphic'||kind==='tattoo'){let s=kind==='tattoo'?7:3;const r=()=>{const v=Math.sin(s++*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  if(kind==='graphic'){x.fillStyle=gr[0];x.fillRect(0,0,N,N);for(let k=0;k<46;k++){x.fillStyle=gr[1+Math.floor(r()*(gr.length-1))];x.beginPath();const cx=r()*N,cy=r()*N;x.moveTo(cx,cy);for(let q=0;q<5;q++)x.lineTo(cx+(r()-.5)*N*.35,cy+(r()-.5)*N*.35);x.closePath();x.fill();}
   x.strokeStyle='rgba(244,242,238,.55)';x.lineWidth=1.5;for(let k=0;k<10;k++){x.beginPath();x.moveTo(r()*N,r()*N);x.bezierCurveTo(r()*N,r()*N,r()*N,r()*N,r()*N,r()*N);x.stroke();}}
  else{for(let k=0;k<90;k++){const cx=r()*N,cy=r()*N,col=gr[Math.floor(r()*gr.length)];x.strokeStyle=col;x.fillStyle=col;x.lineWidth=2+r()*2;x.beginPath();if(k%3===0){x.arc(cx,cy,5+r()*8,0,7);x.stroke();}else if(k%3===1){x.moveTo(cx,cy);x.bezierCurveTo(cx+30*(r()-.5),cy-30*r(),cx+40*(r()-.5),cy+30*r(),cx+30*(r()-.5),cy+20);x.stroke();}else{x.beginPath();for(let q=0;q<5;q++){const a=q/5*Math.PI*2-Math.PI/2,b=a+Math.PI/5;x.lineTo(cx+Math.cos(a)*9,cy+Math.sin(a)*9);x.lineTo(cx+Math.cos(b)*4,cy+Math.sin(b)*4);}x.closePath();x.fill();}}}}
 if(kind==='fuzzy'||kind==='jacket'){for(let j=0;j<5200;j++){const l=rand(j)<.5?'255,190,225':'150,20,80';x.strokeStyle='rgba('+l+','+(.10+rand(j+3)*.16)+')';x.lineWidth=1;const px=rand(j+1)*N,py=rand(j+2)*N,a=rand(j+4)*6.28;x.beginPath();x.moveTo(px,py);x.lineTo(px+Math.cos(a)*4,py+Math.sin(a)*4);x.stroke();}}
 if(kind==='jacket'){// the open front shows the white tee: a band round v = .25 that widens towards the neck
  const at=(v,u)=>[v*N,(1-u)*N];x.save();x.beginPath();const [a0]=at(.25-.050,0),[a1]=at(.25+.050,0),[b0]=at(.25-.10,0),[b1]=at(.25+.10,0);x.moveTo(a0,N);x.lineTo(a0,at(0,.55)[1]);x.lineTo(b0,0);x.lineTo(b1,0);x.lineTo(a1,at(0,.55)[1]);x.lineTo(a1,N);x.closePath();x.clip();x.fillStyle=spec.inner||'#f7f4ef';x.fillRect(0,0,N,N);x.restore();
  x.strokeStyle='rgba(150,20,80,.6)';x.lineWidth=3;x.beginPath();x.moveTo(a0,N);x.lineTo(a0,at(0,.55)[1]);x.lineTo(b0,0);x.moveTo(a1,N);x.lineTo(a1,at(0,.55)[1]);x.lineTo(b1,0);x.stroke();}
 if(kind==='noise'){for(let j=0;j<4200;j++){const l=rand(j)<.5?0:255;x.fillStyle='rgba('+l+','+l+','+l+','+(.03+rand(j+3)*.06)+')';x.fillRect(rand(j+1)*N,rand(j+2)*N,1,1);}}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;if(kind==='noise')t.repeat.set(3,3);textures.set(key,t);return t;}
export function* buildDduStyles(variants,options){const records=new Map(),parts=[],timings=[];
for(const slot of ['top','bottom','shoes'])for(const[index,opt]of(options[slot]||[]).entries()){
 const match=/^ddu-du-ddu-du-(?:crew-)?(1|m[1-4])-(top|bottom|shoes)$/.exec(opt.style||'');if(!match||match[2]!==slot)continue;const spec=dduSpecs.find(s=>s.id===match[1]);if(!spec)continue;
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
  register(shell('dd-skin-upper',(x,y)=>y>hip.y-.025&&y<neck.y+.035,.0015),skin,false);
  const clothM=spec.print==='check'?cloth(spec.body,'check',30,9):spec.print==='moons'?cloth(spec.body,'moons',13,4):cloth(spec.body,spec.print);
  const hemY=waist-.048,topY=neck.y-.026;
    const R=18,B=48,far=c.torsoFar||(c.torsoFar=new Map()),fk=hemY+'|'+topY;if(!far.has(fk)){const pp=body.geometry.attributes.position,si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight,arm=new Set(['left','right'].flatMap(sd=>['Shoulder','UpperArm','LowerArm','Hand'].map(n=>{try{return boneIndex(sd+n);}catch(e){return -1;}}))),m=Array.from({length:R+1},()=>new Float32Array(B));
   for(const id of new Set(body.geometry.index.array)){const y=pp.getY(id);if(y<hemY-.012||y>topY+.012)continue;let w=0;for(let k=0;k<4;k++)if(arm.has(si.getComponent(id,k)))w+=sw.getComponent(id,k);if(w>.2)continue;
    const x=pp.getX(id),z=pp.getZ(id)-hip.z,r=Math.hypot(x,z),bi=((Math.round(Math.atan2(z,x)/(Math.PI*2)*B)%B)+B)%B,j=Math.round((y-hemY)/(topY-hemY)*R);for(const jj of [j-1,j,j+1])if(jj>=0&&jj<=R)for(const bb of [bi-1,bi,bi+1]){const q=(bb+B)%B;m[jj][q]=Math.max(m[jj][q],r);}}far.set(fk,m);}
  const farM=far.get(fk);
  weighted(grid(R,B,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(hemY,topY,u),e=.007+.016*Math.max(0,1-u/.30),q=fitted(y,a,e),r=Math.hypot(q.x,q.z-hip.z),need=u<.78?farM[Math.round(u*R)][Math.round(v*B)%B]+e:0;if(r<need){const n=Math.min(need,r+.03),dx=r>.01?q.x/r:Math.cos(a),dz=r>.01?(q.z-hip.z)/r:Math.sin(a);q.x=dx*n;q.z=hip.z+dz*n;}return q;}),clothM);
  const ribColor=spec.print==='check'?spec.check[1]:spec.print==='moons'?spec.body:spec.print==='tattoo'?spec.body:spec.body;
  weighted(grid(2,40,(u,v)=>fitted(topY-.004+u*.010,v*Math.PI*2,.010)),mat(ribColor,{roughness:.9}));
  // sleeves: long (whole arm skin lifted, puffed for the fuzzy jacket) or short; checks/prints carry on, the jacket's are fuzzy pink
  const sc=spec.print==='jacket'?cloth(spec.body,'fuzzy'):spec.print==='check'?cloth(spec.body,'check',12,12):spec.print==='moons'?cloth(spec.body,'moons',12,12):clothM;
  for(const side of ['left','right']){const sh=pos(side+'UpperArm'),el=pos(side+'LowerArm');
   register(spec.sleeve==='long'?armShell(body,boneIndex,side,{lower:true,offset:.006,puff:spec.puff||.004}):armShell(body,boneIndex,side,{lower:false,a:sh,b:el,upperFrac:.50,offset:.006,puff:spec.puff||.004}),sc,false);}
  // fuzzy jacket: a thick hem band at the waist (cropped jacket edge), in the same pink
  if(spec.print==='jacket'||spec.print==='fuzzy')weighted(grid(2,48,(u,v)=>fitted(hemY+.004+u*.016,v*Math.PI*2,.022)),cloth(spec.body,'fuzzy'));
 }

 if(slot==='bottom'){
  if(spec.bottom==='skirt'){
   // black (or white) shorts under the skirt: her hip/thigh skin lifted down to near the hem, plus her thigh skin below
   const len=spec.skirt,hemY=waist-len;
   register(shell('dd-shorts-'+Math.round(len*1000),(x,y)=>y<waist+.004&&y>hemY+.012,.010),mat(spec.shorts,{roughness:.7}),false);
   register(shell('dd-thigh-'+Math.round(len*1000),(x,y)=>y>hip.y-.165&&y<hemY+.020,.0095),skin,false);
   const sk=spec.skirtPrint==='tattoo'?cloth(spec.body,'tattoo'):cloth('#f6f4ef','check',36,7);
   // A-line mini skirt from the waistband, flaring to the hem
   weighted(grid(12,64,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.013),fl=.052*Math.pow(u,1.1)+.003*Math.sin(a*10)*u;return V().set(q.x+Math.cos(a)*fl,waist-u*len,q.z+Math.sin(a)*fl);}),sk,'hips');
   weighted(grid(3,48,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.016);q.y=waist+.006-u*.016;return q;}),mat(spec.skirtPrint==='tattoo'?spec.body:'#1d1c22',{roughness:.6}),'hips');
  }else{
   // trousers: her leg skin lifted from the waist to the ankle (wide: grows towards the hem), a hem ring per leg
   const hemY=floor+(spec.bottom==='wide'?.030:.060),wide=spec.bottom==='wide',knee=pos('leftLowerLeg').y,off=y=>wide?.018+.016*T.MathUtils.clamp((hip.y-y)/(hip.y-hemY),0,1):.012;
   const bc=wide?cloth(spec.bodyB||'#f4f2ee','graphic'):cloth(spec.bottomColor);
   register(shell('dd-'+spec.bottom,(x,y)=>y<waist+.010&&y>hemY,(x,y)=>off(y)),bc,false);
   for(const side of ['left','right'])ring(side,hemY+.004,off(hemY)+.002,wide?.012:.016,wide?bc:mat(spec.bottomColor,{roughness:.6}));
   weighted(grid(3,48,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.020);q.y=waist+.008-u*.018;return q;}),wide?bc:mat(spec.bottomColor,{roughness:.6}),'hips');
   // track pants: two side stripes (neon green and red) down each leg's outer seam, skinned from that leg only
   if(spec.bottom==='track'){const top=hip.y-.03,R=22,sm=spec.stripes.map(col=>mat(col,{roughness:.5,glow:.35}));
    for(const side of ['left','right']){const rows=[];for(let j=0;j<=R;j++){const y=T.MathUtils.lerp(top,hemY+.012,j/R),q=legSection(side,y,.010);if(q)rows.push([y,q]);}
     if(rows.length<4)continue;sm.forEach((m,k)=>{const dz=(k?-1:1)*.0075;skinLike(grid(rows.length-1,1,(u,v)=>{const [y,q]=rows[Math.round(u*(rows.length-1))];return V().set(q.out+q.s*(.0125),y,q.cz+dz+(v-.5)*(k?.014:.009));}),m,side);});}}
  }
 }

 if(slot==='shoes'){
  register(shell('dd-legs',(x,y)=>y>floor&&y<hip.y-.105,.0005),skin,false);
  if(spec.shoe==='boot'){
   // ankle boots: her foot and ankle skin lifted (checked for Rosé), a sole rim and a block heel
   const up=spec.shoeCheck?cloth(spec.shoeColor,'check',10,10,{check:spec.shoeCheck}):mat(spec.shoeColor,{roughness:.35,clearcoat:.7,clearcoatRoughness:.2,sheen:0,glow:.10}),sole=mat(spec.shoeCheck?'#1d1c22':spec.shoeColor==='#17171b'?'#2a2a30':'#e9e6df',{roughness:.6,glow:.05});
   register(shell('dd-boot',(x,y)=>y>floor-.01&&y<floor+.115,.0045),up,false);
   for(const side of ['left','right']){const f=pos(side+'Foot');
    skinLike(grid(2,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.040,floor+.002+u*.010,f.z+.030+Math.sin(a)*.078);}),sole,side);
    skinLike(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.040*u,floor+.012,f.z+.030+Math.sin(a)*.078*u);}),sole,side);
    skinLike(grid(2,12,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.018,floor-.004+u*.016,f.z-.034+Math.sin(a)*.016);}),sole,side);
    ring(side,floor+.112,.0065,.008,up);}
  }else{
   // chunky white sneakers: foot skin lifted to the ankle, a thick sole with a grey edge line, a lace panel
   const up=mat(spec.shoeColor,{roughness:.55,glow:.16}),sole=mat('#fbfbf8',{roughness:.7,glow:.2}),edge=mat('#b9bcc2',{roughness:.6,glow:.05});
   register(shell('dd-sneaker',(x,y)=>y>floor-.01&&y<floor+.070,.006),up,false);
   for(const side of ['left','right']){const f=pos(side+'Foot');
    skinLike(grid(2,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.043,floor+.002+u*.020,f.z+.028+Math.sin(a)*.082);}),sole,side);
    skinLike(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.0435,floor+.008+u*.003,f.z+.028+Math.sin(a)*.0825);}),edge,side);
    skinLike(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.043*u,floor+.022,f.z+.028+Math.sin(a)*.082*u);}),sole,side);
    ring(side,floor+.068,.007,.010,up);}
  }
 }
 const groups=new Map();for(const m of rec.meshes){if(m.userData.sharedCrewGeometry)continue;const g=m.geometry,key=m.material.uuid+'|'+Object.entries(g.attributes).map(([k,a])=>k+a.itemSize+a.array.constructor.name).sort().join(',')+'|'+g.index?.array.constructor.name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}for(const ms of groups.values())if(ms.length>1){const g=mergeGeometries(ms.map(m=>m.geometry),false);if(!g)throw Error('DDU-DU geometry schema mismatch');ms[0].geometry.dispose();ms[0].geometry=g;for(const m of ms.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
 rec.buildMs=performance.now()-start;records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});timings.push({slot,ms:rec.buildMs,meshes:rec.meshes.length});yield;
}return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
export function createDduStyles(...args){const it=buildDduStyles(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
