import * as T from 'three';
import {fitPoint,fitSection} from './body-fit.js?v=1011.0910';
import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1011.0910';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const caches=new WeakMap();
const V=()=>new T.Vector3();
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
function donorCache(donor){
 if(caches.has(donor))return caches.get(donor);const t0=performance.now();
 const body=donor.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),g=body.geometry,p=g.attributes.position,ix=g.index,inv=body.matrixWorld.clone().invert(),pos=n=>donor.vrm.humanoid.getRawBoneNode(n).getWorldPosition(V()).applyMatrix4(inv),hip=pos('hips'),neck=pos('neck');
 const boneIndex=n=>{const raw=donor.vrm.humanoid.getRawBoneNode(n);let i=body.skeleton.bones.indexOf(raw);if(i<0)i=body.skeleton.bones.findIndex(b=>b.name===raw?.name);if(i<0)throw Error('Missing crew bone '+n);return i;},torsoNames=['hips','spine','chest','upperChest','neck'],torsoSet=new Set(torsoNames.map(boneIndex)),profiles=Array.from({length:16},()=>[]),floor=Math.min(...Array.from(ix.array,i=>p.getY(i)));
 for(const id of new Set(ix.array)){let sum=0;for(let k=0;k<4;k++)if(torsoSet.has(g.attributes.skinIndex.getComponent(id,k)))sum+=g.attributes.skinWeight.getComponent(id,k);const y=p.getY(id);if((sum<.65&&y>hip.y+.025)||Math.abs(p.getX(id))>.14||y<hip.y-.04||y>neck.y-.035)continue;const j=T.MathUtils.clamp(Math.round((y-hip.y+.04)/(neck.y-hip.y+.005)*15),0,15);profiles[j].push([Math.abs(p.getX(id)),Math.abs(p.getZ(id)-hip.z)]);}
 const dims=profiles.map((a,j)=>{const percentile=k=>a.map(x=>x[k]).sort((x,y)=>x-y)[a.length-1];return a.length?[T.MathUtils.clamp(percentile(0),.045,.115),T.MathUtils.clamp(percentile(1),.035,.105)]:[j<5?.09:.075,.052];});
 for(let j=0;j<16;j++){const y=hip.y-.04+j/15*(neck.y-hip.y+.005);let front=0;for(const id of new Set(ix.array))if(Math.abs(p.getY(id)-y)<.035&&Math.abs(p.getX(id))<.09)front=Math.max(front,p.getZ(id)-hip.z);dims[j][1]=Math.max(dims[j][1],front+.003);}
 function section0(y){const f=T.MathUtils.clamp((y-hip.y+.04)/(neck.y-hip.y+.005)*15,0,15),i=Math.floor(f),j=Math.min(15,i+1);return[dims[i][0]*(1-f+i)+dims[j][0]*(f-i),dims[i][1]*(1-f+i)+dims[j][1]*(f-i)];}function section(y){return fitSection(body,boneIndex,hip,neck,y)||section0(y);}
 const shells=new Map();
 function shell(key,test,offset=0){if(shells.has(key))return shells.get(key);const ids=[],map=new Map(),attrs=Object.fromEntries(['position','normal','uv','skinIndex','skinWeight'].filter(k=>g.attributes[k]).map(k=>[k,[]])),out=[];
 for(let i=0;i<ix.count;i+=3){const tri=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(!tri.every(id=>test(p.getX(id),p.getY(id),p.getZ(id))))continue;for(const id of tri){if(!map.has(id)){map.set(id,map.size);ids.push(id);for(const[k,a]of Object.entries(attrs)){const src=g.attributes[k];for(let c=0;c<src.itemSize;c++)a.push(src.getComponent(id,c)+(k==='position'?g.attributes.normal.getComponent(id,c)*offset:0));}}out.push(map.get(id));}}
 const geo=new T.BufferGeometry();for(const[k,a]of Object.entries(attrs))geo.setAttribute(k,k==='skinIndex'?new T.Uint16BufferAttribute(a,4):new T.Float32BufferAttribute(a,g.attributes[k].itemSize));geo.setIndex(out);geo.computeBoundingSphere();shells.set(key,geo);return geo;}
 const c={body,hip,neck,pos,boneIndex,section,shell,floor,cacheMs:performance.now()-t0};caches.set(donor,c);return c;
}
export const wislOptions=()=>Object.fromEntries(['top','bottom','shoes'].map(slot=>[slot,['rumi','mira','zoey'].map(name=>({id:`wisl-${name}-${slot}`,style:`wisl-${name}-${slot}`,variant:1,label:`Sounds Like · ${name[0].toUpperCase()+name.slice(1)} · ${{top:'Áo',bottom:'Quần/váy',shoes:'Giày'}[slot]}`}))]));
export const hideNativeWislSafety=(m,opt)=>/^wisl-(rumi|mira|zoey)-/.test(opt?.style||'')&&(m.userData.excludeHatMua||m.userData.excludeHuntrix||/cream_undershorts/.test(m.name));
 function pearlMaterial(){const m=new T.MeshPhysicalMaterial({color:'#ffffff',metalness:.02,roughness:.28,iridescence:1,iridescenceIOR:1.3,iridescenceThicknessRange:[180,420],clearcoat:.65,clearcoatRoughness:.18,sheen:.4,side:T.DoubleSide,emissive:'#ffffff',emissiveIntensity:.34});m.customProgramCacheKey=()=> 'wisl-pearl-v1';m.onBeforeCompile=s=>{s.vertexShader='varying vec3 vPearl;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPearl=position;');s.fragmentShader='varying vec3 vPearl;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float w=sin(vPearl.y*27.+vPearl.x*18.+sin(vPearl.z*30.)*1.2);vec3 tint=mix(vec3(.80,.96,1.),vec3(1.,.84,.94),w*.5+.5);diffuseColor.rgb*=mix(vec3(1.),tint,.65);`);};return m;}

export function* buildWislStyles(variants,options){const records=new Map(),parts=[],timings=[];
for(const slot of ['top','bottom','shoes'])for(const[index,opt]of(options[slot]||[]).entries()){
if(!/^wisl-(rumi|mira|zoey)-/.test(opt.style||''))continue;const name=opt.style.split('-')[1];const start=performance.now(),donor=variants[opt.variant],c=donorCache(donor),{body,hip,neck,pos,boneIndex,section,shell,floor}=c,rec={id:opt.id,index,slot,meshes:[]};
const satin=new T.MeshPhysicalMaterial({color:'#fffdfb',roughness:.43,metalness:.01,sheen:.7,sheenColor:'#ffffff',clearcoat:.15,side:T.DoubleSide,emissive:'#ffffff',emissiveIntensity:.24}),organza=satin.clone();organza.roughness=.48;organza.metalness=0;organza.clearcoat=0;organza.transparent=true;organza.opacity=.88;organza.depthWrite=false;
const fur=new T.MeshStandardMaterial({color:'#fffefe',roughness:.95,side:T.DoubleSide,emissive:'#ffffff',emissiveIntensity:.45}),skin=new T.MeshToonMaterial({color:'#fff1df',emissive:'#bca98f',emissiveIntensity:.18,side:T.DoubleSide});
  function register(geo,m,owned=true){const mesh=new T.SkinnedMesh(geo,m);mesh.name=rec.id+'_'+rec.meshes.length;mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(body.skeleton,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;mesh.userData.sharedCrewGeometry=!owned;body.parent.add(mesh);rec.meshes.push(mesh);return mesh;}
  function weighted(geo,m,rigid=null){const pp=geo.attributes.position,si=[],sw=[],hips=boneIndex('hips'),spine=boneIndex('spine'),chest=boneIndex('chest'),upper=boneIndex('upperChest'),sp=pos('spine').y,ch=pos('chest').y,up=pos('upperChest').y;
   for(let i=0;i<pp.count;i++){if(rigid==='hips'&&slot==='bottom'&&pp.getY(i)<hip.y+.025){const w=T.MathUtils.smoothstep(hip.y+.025-pp.getY(i),0,.135)*.62,l=T.MathUtils.clamp(.5+pp.getX(i)/.10,0,1);si.push(hips,boneIndex('leftUpperLeg'),boneIndex('rightUpperLeg'),0);sw.push(1-w,w*l,w*(1-l),0);continue;}let a,b,w;if(rigid){a=b=boneIndex(rigid);w=0;}else{const y=pp.getY(i);if(y<sp){a=hips;b=spine;w=T.MathUtils.clamp((y-hip.y)/(sp-hip.y),0,1);}else if(y<ch){a=spine;b=chest;w=T.MathUtils.clamp((y-sp)/(ch-sp),0,1);}else{a=chest;b=upper;w=T.MathUtils.clamp((y-ch)/(up-ch),0,1);}}si.push(a,b,0,0);sw.push(1-w,w,0,0);}geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geo.computeVertexNormals();geo.computeBoundingSphere();return register(geo,m);}
  function grid(rows,cols,fn,m,rigid=null){const pp=[],uv=[],ii=[];for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){pp.push(...fn(j/rows,k/cols).toArray());uv.push(k/cols,j/rows);}for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;ii.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ii);return weighted(g,m,rigid);}
  function sphere(center,scale,m,rigid){const g=new T.SphereGeometry(1,8,6);g.scale(...scale);g.translate(...center.toArray());return weighted(g,m,rigid);}
  function line(a,b,r,m,rigid=null){const g=new T.CylinderGeometry(r,r,a.distanceTo(b),5);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V().set(0,1,0),b.clone().sub(a).normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());weighted(g,m,rigid);}
  function oval(y,a,extra=0){const [rx,rz]=section(y),x=Math.cos(a),z=Math.sin(a);return V().set(x*(rx+extra),y,hip.z+Math.sign(z)*Math.sqrt(Math.max(0,1-Math.pow(Math.abs(x),4)))*(rz+extra));}
  function fluff(center,rx,rz,height,m,rigid,seed=0){for(let j=0;j<36;j++){const a=j*2.39996,y=Math.sin(j*1.731+seed)*height*.42,r=1+.09*Math.sin(j*2.13);sphere(center.clone().add(V().set(Math.cos(a)*rx*r,y,Math.sin(a)*rz*r)),[.010,.015,.010],m,rigid);}}
  function bow(center,m,rigid){for(const sign of [-1,1])sphere(center.clone().add(V().set(sign*.012,0,0)),[.015,.010,.004],m,rigid);sphere(center,[.005,.006,.005],m,rigid);}
  const waist=hip.y+.062;
  function profile(y,a,e=0){const q=fitPoint(body,boneIndex,hip,neck,y,a,e);if(q)return V().set(q[0],y,q[1]);const [rx,rz]=section(y);return V().set(Math.cos(a)*(rx+e),y,hip.z+Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.65)*(rz+e));}
  function patch(rows,cols,fn,m,weights){const mesh=grid(rows,cols,fn,m);if(weights){const g=mesh.geometry,p=g.attributes.position;for(let i=0;i<p.count;i++){const [a,b,w]=weights(V().fromBufferAttribute(p,i));g.attributes.skinIndex.setXYZW(i,boneIndex(a),boneIndex(b),0,0);g.attributes.skinWeight.setXYZW(i,1-w,w,0,0);}}if(slot==='shoes'){const query=getTriangleQuery(geometryTriangles(body.geometry)),g=mesh.geometry,p=g.attributes.position,si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight;for(let i=0;i<p.count;i++){const h=query.nearest(V().fromBufferAttribute(p,i));if(!h)continue;const bc=h.record.t.getBarycoord(h.point,V()),blend=[bc.x,bc.y,bc.z],all=new Map();for(let j=0;j<3;j++)for(let k=0;k<4;k++){const bi=si.getComponent(h.record.ids[j],k),w=sw.getComponent(h.record.ids[j],k)*blend[j];all.set(bi,(all.get(bi)||0)+w);}const best=[...all].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=best.reduce((n,x)=>n+x[1],0);while(best.length<4)best.push([0,0]);g.attributes.skinIndex.setXYZW(i,...best.map(x=>x[0]));g.attributes.skinWeight.setXYZW(i,...best.map(x=>x[1]/sum));}}return mesh;}
  function shag(center,rx,rz,height,m,rigid,count=100){
   grid(6,24,(u,v)=>{const a=v*Math.PI*2,r=.72+.42*Math.sin(u*Math.PI*.88)+.035*Math.sin(a*7+u*3);return center.clone().add(V().set(Math.cos(a)*rx*r,(u-.5)*height+.004*Math.sin(a*11+u*4),Math.sin(a)*rz*r));},m,rigid);
   const pp=[],ii=[];for(let j=0;j<count;j++){const a=rand(j+17)*Math.PI*2,u=rand(j+318),y=(u-.5)*height,r=.72+.42*Math.sin(u*Math.PI*.88),root=center.clone().add(V().set(Math.cos(a)*rx*r,y,Math.sin(a)*rz*r)),t=V().set(-Math.sin(a),0,Math.cos(a)),n=pp.length/3,tip=root.clone().add(V().set(Math.cos(a)*.016,-.017-.018*rand(j+19),Math.sin(a)*.016));pp.push(...root.clone().addScaledVector(t,-.0013).toArray(),...root.clone().addScaledVector(t,.0013).toArray(),...tip.toArray());ii.push(n,n+1,n+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setIndex(ii);weighted(g,m,rigid);
  }
  const ivory=pearlMaterial(),gold=new T.MeshStandardMaterial({color:'#f5ca62',metalness:.45,roughness:.24,emissive:'#ffc54f',emissiveIntensity:.20,side:T.DoubleSide}),black=new T.MeshPhysicalMaterial({color:'#10121a',roughness:.42,clearcoat:.18,side:T.DoubleSide}),sequin=pearlMaterial();
  const hem=waist+.026,high=neck.y-.065,depths=new Map();
  function depth(y){if(depths.has(y))return depths.get(y);const p=body.geometry.attributes.position;let lo=Infinity,hi=-Infinity;for(const id of new Set(body.geometry.index.array))if(Math.abs(p.getX(id))<.085&&Math.abs(p.getY(id)-y)<.018){lo=Math.min(lo,p.getZ(id));hi=Math.max(hi,p.getZ(id));}const d=Number.isFinite(lo)?[lo,hi]:[hip.z-.05,hip.z+.06];depths.set(y,d);return d;}
  function fitted(y,a,e=.008){const [rx]=section(y),d=depth(y),co=Math.cos(a),sn=Math.sin(a);return V().set(co*(rx+e),y,sn>=0?hip.z+Math.pow(Math.max(0,1-Math.pow(Math.abs(co),4)),.325)*(d[1]-hip.z+e):hip.z-Math.pow(-sn,.85)*(hip.z-d[0]+e));}
  function shoulderWeight(mesh,side){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i++){const w=T.MathUtils.clamp((Math.abs(p.getX(i))-.035)/.13,0,.18);mesh.geometry.attributes.skinIndex.setXYZW(i,boneIndex('upperChest'),boneIndex(side+'UpperArm'),0,0);mesh.geometry.attributes.skinWeight.setXYZW(i,1-w,w,0,0);}return mesh;}
  function curve(points,r,material,side=null,rigid=null){const g=new T.TubeGeometry(new T.CatmullRomCurve3(points),Math.max(12,points.length*4),r,5,false),m=weighted(g,material,rigid);if(side)shoulderWeight(m,side);return m;}
  function sleeve(side){const a=pos(side+'UpperArm').lerp(pos('neck'),.25),el=pos(side+'LowerArm'),hand=pos(side+'Hand');function tube(from,to,r0,r1,bone){const axis=to.clone().sub(from).normalize(),basis=V().crossVectors(axis,V().set(0,0,1)).normalize(),other=V().crossVectors(axis,basis).normalize();const fn=(u,v)=>{const ang=v*Math.PI*2,r=T.MathUtils.lerp(r0,r1,u)*(1+.022*Math.sin(u*17+ang*4));return from.clone().lerp(to,u).addScaledVector(basis,Math.cos(ang)*r).addScaledVector(other,Math.sin(ang)*r);},mesh=grid(9,24,fn,sequin,bone);if(bone===side+'UpperArm'){for(let j=0;j<=9;j++)for(let k=0;k<=24;k++){const n=j*25+k,w=T.MathUtils.smoothstep(j/9,0,.3);mesh.geometry.attributes.skinIndex.setXYZW(n,boneIndex('upperChest'),boneIndex(bone),0,0);mesh.geometry.attributes.skinWeight.setXYZW(n,1-w,w,0,0);}}return fn;}
   tube(a,el.clone().addScaledVector(el.clone().sub(a).normalize(),.006),.030,.026,side+'UpperArm');const lower=tube(el.clone().addScaledVector(a.clone().sub(el).normalize(),.006),hand,.026,.022,side+'LowerArm');grid(2,24,(u,v)=>lower(.93+u*.07,v).add(V().set(0,0,.0002)),gold,side+'LowerArm');}
  function skirt(u,a){const y=waist-u*.166,[rx,rz]=section(Math.max(y,hip.y-.025)),fold=.002*Math.cos(a*12)*u;return V().set(Math.cos(a)*(rx+.008+.013*u+fold),y,hip.z+Math.sin(a)*(rz+.022+.017*u+fold));}
  function skirtBelt(u0,height){grid(3,48,(u,v)=>{const a=v*Math.PI*2,q=skirt(u0+u*height/.166,a);return q.add(V().set(Math.cos(a)*.001,0,Math.sin(a)*.001));},gold,'hips');}
  if(slot==='top'){
   register(shell('wisl-stage-skin-upper',(x,y)=>y>hip.y-.025&&y<neck.y+.035,.002),skin,false);
   if(name!=='rumi')register(shell('wisl-stage-shoulder-cover',(x,y)=>Math.abs(x)>.065&&Math.abs(x)<.19&&y>pos('upperChest').y-.030&&y<neck.y+.002,.005),sequin,false);
   if(name==='rumi')grid(20,40,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(hem,neck.y-.004,u);if(y<=high)return fitted(y,a,.006);const t=(y-high)/(neck.y-.004-high),q=fitted(high,a,.006),cap=V().set(Math.cos(a)*.027,neck.y-.004,hip.z+Math.sin(a)*.029);return q.lerp(cap,t);},ivory);
   else grid(12,40,(u,v)=>fitted(T.MathUtils.lerp(hem,high,u),v*Math.PI*2,.006),sequin);

   if(name!=='rumi'){grid(12,44,(u,v)=>fitted(T.MathUtils.lerp(hem-.003,neck.y-.024,u),Math.PI-.98+v*(Math.PI+1.96),.015),sequin);
   for(const side of ['left','right'])sleeve(side);
   grid(2,44,(u,v)=>fitted(hem-.004+u*.009,Math.PI-.98+v*(Math.PI+1.96),.016),gold);
   for(const sign of [-1,1]){const a=sign>0?.98:Math.PI-.98;curve(Array.from({length:8},(_,j)=>fitted(T.MathUtils.lerp(hem,neck.y-.024,j/7),a,.017)),.0016,gold);}
   for(const side of ['left','right']){
    const sign=side==='left'?1:-1,axis=pos(side+'LowerArm').sub(pos(side+'UpperArm')).normalize(),center=pos(side+'UpperArm').add(V().set(sign*.035,.012,.005));
    if(name==='rumi'){
     const cap=sphere(center,[.043,.024,.040],sequin,side+'UpperArm');shoulderWeight(cap,side);
     for(const scale of [1,.77])curve(Array.from({length:17},(_,j)=>{const a=j/16*Math.PI*2;return center.clone().add(V().set(Math.cos(a)*.044*scale,.012+(.012*(1-scale)),Math.sin(a)*.041*scale));}),.0014,gold,side);
     for(let j=0;j<3;j++)curve(Array.from({length:17},(_,k)=>{const a=k/16*Math.PI*2;return center.clone().add(V().set((j-1)*.019+Math.cos(a)*.009,.004+Math.sin(a)*.009,.037));}),.0009,gold,side);
     for(let j=0;j<2;j++){const start=center.clone().add(V().set(sign*.018,-.002,.034)),end=fitted(high-.020-j*.012,sign>0?1.00:Math.PI-1.00,.020);curve([start,start.clone().lerp(end,.5).add(V().set(0,-.027-j*.012,.012)),end],.0011,gold,side);}
    }else if(name==='mira'){
     shoulderWeight(sphere(center,[.043,.008,.034],gold,side+'UpperArm'),side);
     for(let j=0;j<9;j++){const x=(j-4)*.008,a=center.clone().add(V().set(x,0,.031)),b=a.clone().add(V().set(0,-.040-.014*(1-Math.abs(j-4)/4),.002));curve([a,a.clone().lerp(b,.5),b],.0016,gold,side);}
    }else{
     const g=new T.BoxGeometry(.080,.007,.050);g.rotateZ(sign*.15);g.translate(...center.toArray());shoulderWeight(weighted(g,ivory,side+'UpperArm'),side);for(const z of [-.026,.026])curve([center.clone().add(V().set(-.041,.006,z)),center.clone().add(V().set(.041,.006,z))],.0018,gold,side);for(const x of [-.041,.041])curve([center.clone().add(V().set(x,.006,-.026)),center.clone().add(V().set(x,.006,.026))],.0018,gold,side);
     for(let j=0;j<4;j++)for(let k=0;k<3;k++){const q=center.clone().add(V().set((j-1.5)*.019,.007,(k-1)*.018));shoulderWeight(sphere(q,[.0025,.0025,.0025],gold,side+'UpperArm'),side);}

    }
   }
   if(name==='mira'){for(const sign of [-1,1])for(let j=0;j<3;j++){const y=hem+.018+j*.027,q=fitted(y,sign>0?1:Math.PI-1,.018);sphere(q,[.0035,.0035,.002],gold,null);}}
   if(name==='zoey')grid(3,32,(u,v)=>pos('neck').add(V().set(Math.cos(v*Math.PI*2)*.029,-.015+u*.012,Math.sin(v*Math.PI*2)*.029)),gold,'neck');}
  }
  if(slot==='bottom'){
   if(name==='rumi'){const tights=new T.MeshStandardMaterial({color:'#ffffff',roughness:.6,transparent:true,opacity:.38,depthWrite:false,side:T.FrontSide,emissive:'#ffffff',emissiveIntensity:.15});register(shell('wisl-rumi-tights',(x,y)=>y>floor+.025&&y<hip.y-.105,.0012),tights,false);}
   register(shell('wisl-stage-short-outer',(x,y)=>y>hip.y-.108&&y<waist-.002,.003),ivory,false);const inner=ivory.clone();inner.polygonOffset=true;inner.polygonOffsetFactor=-2;inner.polygonOffsetUnits=-2;register(shell('wisl-stage-short-inner',(x,y)=>y>hip.y-.111&&y<waist-.002,0),inner,false);
   if(name==='rumi'){
    for(const side of ['left','right']){const sign=side==='left'?1:-1;grid(10,32,(u,v)=>{const a=v*Math.PI*2,rx=T.MathUtils.lerp(.049,.045,u);return V().set(sign*.047+Math.cos(a)*rx,waist-.022-u*.153,hip.z+Math.sin(a)*T.MathUtils.lerp(.071,.065,u));},ivory,'hips');}
    grid(7,48,(u,v)=>{const a=v*Math.PI*2,x=Math.cos(a)*.096,end=hip.y-.105+.075*Math.pow(Math.abs(x)/.096,2),y=T.MathUtils.lerp(waist,end,u),z=.076*Math.sqrt(Math.max(0,1-Math.pow(x/.096,4)));return V().set(x,y,hip.z+Math.sign(Math.sin(a))*z);},ivory,'hips');
    grid(3,48,(u,v)=>{const a=v*Math.PI*2;return V().set(Math.cos(a)*.098,waist+.001-u*.027,hip.z+Math.sign(Math.sin(a))*.079*Math.sqrt(Math.max(0,1-Math.pow(Math.cos(a),4))));},gold,'hips');
    curve(Array.from({length:20},(_,j)=>{const a=.15+j/19*2.8;return V().set(Math.cos(a)*.099,waist-.020-.023*Math.sin(j/19*Math.PI),hip.z+Math.sign(Math.sin(a))*.081*Math.sqrt(Math.max(0,1-Math.pow(Math.cos(a),4))));}),.0017,gold,null,'hips');
   }else{grid(9,56,(u,v)=>skirt(u,v*Math.PI*2),ivory,'hips');skirtBelt(.01,.018);if(name==='zoey')grid(3,48,(u,v)=>{const a=v*Math.PI*2,q=skirt(.20+.07*Math.cos(a+.5)+u*.065,a);return q.add(V().set(Math.cos(a)*.001,0,Math.sin(a)*.001));},gold,'hips');
    if(name==='mira'){
     const q=skirt(.10,1.02).add(V().set(.006,.002,.016));
     for(const sign of [-1,1])grid(5,12,(u,v)=>q.clone().add(V().set(sign*(.006+u*.043),Math.sin(v*Math.PI*2)*.024*Math.sin(u*Math.PI*.72),.010*Math.sin(u*Math.PI)+Math.cos(v*Math.PI*2)*.011*Math.sin(u*Math.PI*.72))),gold,'hips');
     sphere(q,[.008,.010,.008],gold,'hips');
     for(let j=0;j<2;j++)grid(12,5,(u,v)=>q.clone().add(V().set((v-.5)*(.032-.010*u)+(j-.5)*(.020+u*.030)+Math.sin(u*4+j)*.008,-u*(.15+j*.055),.012+Math.sin(u*5+j)*.014)),gold,'hips');
    }

   }
  }
  if(slot==='shoes'){
   register(shell('wisl-stage-leg-skin',(x,y)=>y>floor&&y<hip.y-.106,.0005),skin,false);
   for(const side of ['left','right']){const f=pos(side+'Foot'),k=pos(side+'LowerLeg'),top=name==='rumi'?hip.y-.155:name==='mira'?floor+.135:k.y-.015,bottom=floor+.045,src=body.geometry.attributes.position,ids=new Set(body.geometry.index.array),sign=side==='left'?1:-1,sections=[];
    for(let j=0;j<=24;j++){const y=T.MathUtils.lerp(bottom,top,j/24);let xmin=Infinity,xmax=-Infinity,zmin=Infinity,zmax=-Infinity;for(const id of ids){const x=src.getX(id);if(x*sign<.002||Math.abs(src.getY(id)-y)>.018)continue;xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);zmin=Math.min(zmin,src.getZ(id));zmax=Math.max(zmax,src.getZ(id));}sections.push(Number.isFinite(xmin)?[(xmin+xmax)/2,(zmin+zmax)/2,(xmax-xmin)/2+.004,(zmax-zmin)/2+.004]:[f.x,f.z,.035,.045]);}
    const fn=(u,a,e=0)=>{const t=u*24,j=Math.floor(t),b=Math.min(24,j+1),v=sections[j].map((x,n)=>T.MathUtils.lerp(x,sections[b][n],t-j));return V().set(v[0]+Math.cos(a)*(v[2]+e),T.MathUtils.lerp(bottom,top,u),v[1]+Math.sin(a)*(v[3]+e));},m=ivory;
    patch(20,28,(u,v)=>fn(u,v*Math.PI*2),m);
    patch(2,28,(u,v)=>fn(.96+u*.04,v*Math.PI*2,.001),gold);
    if(name!=='mira'){for(let j=0;j<8;j++)for(const sign of [-1,1])patch(4,2,(u,v)=>fn(.09+j*.10+u*.09,Math.PI/2+sign*(u-.5)*.95+(v-.5)*.055,.003),gold);}
    else patch(14,3,(u,v)=>fn(.04+u*.90,(side==='left'?.20:Math.PI-.40)+v*.18,.002),gold);
    sphere(V().set(f.x,floor+.029,f.z+.035),[.043,.031,.085],m,side+'Foot');sphere(V().set(f.x,floor+.008,f.z+.035),[.046,.013,.088],m,side+'Foot');
   }
  }
  const groups=new Map();for(const m of rec.meshes){if(m.userData.sharedCrewGeometry)continue;const g=m.geometry,key=m.material.uuid+'|'+Object.entries(g.attributes).map(([k,a])=>k+a.itemSize+a.array.constructor.name).sort().join(',')+'|'+g.index?.array.constructor.name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}for(const ms of groups.values())if(ms.length>1){const g=mergeGeometries(ms.map(m=>m.geometry),false);if(!g)throw Error('GX geometry schema mismatch');ms[0].geometry.dispose();ms[0].geometry=g;for(const m of ms.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
  rec.buildMs=performance.now()-start;records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});timings.push({slot,ms:rec.buildMs,meshes:rec.meshes.length});yield;
 }return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
export function createWislStyles(...args){const it=buildWislStyles(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
