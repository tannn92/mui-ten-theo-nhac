import * as T from 'three';
import {fitPoint,fitSection,armShell,armRadius} from './body-fit.js?v=1011.1141';
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
export const taiSinhCrewOptions=()=>Object.fromEntries(['top','bottom','shoes'].map(slot=>[slot,Array.from({length:6},(_,i)=>({id:`tai-sinh-crew-g${i+1}-${slot}`,style:`tai-sinh-crew-g${i+1}-${slot}`,variant:1,crewOnly:true,label:`Tái Sinh · ${i+1} · ${slot}`}))]));
export const hideNativeTaiSinhCrewSafety=(m,opt)=>!!opt?.style?.startsWith('tai-sinh-crew-')&&(m.userData.excludeHatMua||/cream_undershorts/.test(m.name));
 function sequinMaterial(){
  const m=new T.MeshStandardMaterial({color:'#eef0f5',metalness:.25,roughness:.32,side:T.DoubleSide});
  m.customProgramCacheKey=()=> 'tai-sinh-white-sequin-v1';
  m.onBeforeCompile=s=>{
   s.vertexShader='varying vec3 vSequin;\n'+s.vertexShader;
   s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSequin=position;');
   s.fragmentShader='varying vec3 vSequin;\n'+s.fragmentShader;
   s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec2 tile=vSequin.xy*185.;tile.x+=mod(floor(tile.y),2.)*.5;vec2 cell=floor(tile);float jitter=fract(sin(dot(cell,vec2(41.3,89.7)))*15731.9);vec2 uv=fract(tile)-.5+vec2(jitter-.5,.5-jitter)*.22;
    float seed=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
    float disc=1.-smoothstep(.30,.47,length(uv));
    diffuseColor.rgb=mix(vec3(.92,.94,.97),mix(vec3(.98,.99,1.),vec3(.84,.88,.94),step(.88,seed)),disc);
   `);
   s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float angle=dot(normalize(vViewPosition),normal);
    float flash=pow(max(0.,cos(angle*18.+seed*25.)),18.);
    float crossShape=max((1.-smoothstep(.025,.09,abs(uv.x)))*(1.-smoothstep(.12,.46,abs(uv.y))), (1.-smoothstep(.025,.09,abs(uv.y)))*(1.-smoothstep(.12,.46,abs(uv.x))));
    totalEmissiveRadiance+=vec3(1.,1.,1.)*(disc*.16+crossShape*flash*1.8);
   `);
  };return m;
 }

export function* buildTaiSinhCrewStyles(variants,options){const records=new Map(),parts=[],timings=[];
for(const slot of ['top','bottom','shoes'])for(const[index,opt]of(options[slot]||[]).entries()){
if(!/^tai-sinh-crew-g[1-6]-/.test(opt.style||''))continue;const look=Number(opt.style.match(/g([1-6])/)[1]);const start=performance.now(),donor=variants[opt.variant],c=donorCache(donor),{body,hip,neck,pos,boneIndex,section,shell,floor}=c,rec={id:opt.id,index,slot,meshes:[]};
const satin=new T.MeshPhysicalMaterial({color:'#fffdfb',roughness:.43,metalness:.01,sheen:.7,sheenColor:'#ffffff',clearcoat:.15,side:T.DoubleSide,emissive:'#ffffff',emissiveIntensity:.24}),organza=satin.clone();organza.roughness=.48;organza.metalness=0;organza.clearcoat=0;organza.transparent=true;organza.opacity=.88;organza.depthWrite=false;
const fur=new T.MeshStandardMaterial({color:'#fffefe',roughness:.95,side:T.DoubleSide,emissive:'#ffffff',emissiveIntensity:.45}),skin=new T.MeshToonMaterial({color:'#fff1df',emissive:'#bca98f',emissiveIntensity:.18,side:T.DoubleSide});
  function register(geo,m,owned=true){const mesh=new T.SkinnedMesh(geo,m);mesh.name=rec.id+'_'+rec.meshes.length;mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(body.skeleton,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;mesh.userData.sharedCrewGeometry=!owned;body.parent.add(mesh);rec.meshes.push(mesh);return mesh;}
  function weighted(geo,m,rigid=null){const pp=geo.attributes.position,si=[],sw=[],hips=boneIndex('hips'),spine=boneIndex('spine'),chest=boneIndex('chest'),upper=boneIndex('upperChest'),sp=pos('spine').y,ch=pos('chest').y,up=pos('upperChest').y;
   for(let i=0;i<pp.count;i++){if(rigid==='hips'&&(slot==='bottom'||look===4)&&pp.getY(i)<hip.y+.025){const w=T.MathUtils.smoothstep(hip.y+.025-pp.getY(i),0,.135)*.62,l=T.MathUtils.clamp(.5+pp.getX(i)/.10,0,1);si.push(hips,boneIndex('leftUpperLeg'),boneIndex('rightUpperLeg'),0);sw.push(1-w,w*l,w*(1-l),0);continue;}let a,b,w;if(rigid&&!(slot==='top'&&rigid==='hips')){a=b=boneIndex(rigid);w=0;}else{const y=pp.getY(i);if(y<sp){a=hips;b=spine;w=T.MathUtils.clamp((y-hip.y)/(sp-hip.y),0,1);}else if(y<ch){a=spine;b=chest;w=T.MathUtils.clamp((y-sp)/(ch-sp),0,1);}else{a=chest;b=upper;w=T.MathUtils.clamp((y-ch)/(up-ch),0,1);}}si.push(a,b,0,0);sw.push(1-w,w,0,0);}geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geo.computeVertexNormals();geo.computeBoundingSphere();return register(geo,m);}
  function grid(rows,cols,fn,m,rigid=null){const pp=[],uv=[],ii=[];for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){pp.push(...fn(j/rows,k/cols).toArray());uv.push(k/cols,j/rows);}for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;ii.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ii);return weighted(g,m,rigid);}
  function sphere(center,scale,m,rigid){const g=new T.SphereGeometry(1,8,6);g.scale(...scale);g.translate(...center.toArray());return weighted(g,m,rigid);}
  function line(a,b,r,m,rigid=null){const g=new T.CylinderGeometry(r,r,a.distanceTo(b),5);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V().set(0,1,0),b.clone().sub(a).normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());weighted(g,m,rigid);}
  function oval(y,a,extra=0){const [rx,rz]=section(y),x=Math.cos(a),z=Math.sin(a);return V().set(x*(rx+extra),y,hip.z+Math.sign(z)*Math.sqrt(Math.max(0,1-Math.pow(Math.abs(x),4)))*(rz+extra));}
  function fluff(center,rx,rz,height,m,rigid,seed=0){for(let j=0;j<36;j++){const a=j*2.39996,y=Math.sin(j*1.731+seed)*height*.42,r=1+.09*Math.sin(j*2.13);sphere(center.clone().add(V().set(Math.cos(a)*rx*r,y,Math.sin(a)*rz*r)),[.010,.015,.010],m,rigid);}}
  function bow(center,m,rigid){for(const sign of [-1,1])sphere(center.clone().add(V().set(sign*.012,0,0)),[.015,.010,.004],m,rigid);sphere(center,[.005,.006,.005],m,rigid);}
  const waist=hip.y+.062;
  function profile(y,a,e=0){const q=fitPoint(body,boneIndex,hip,neck,y,a,e);if(q)return V().set(q[0],y,q[1]);const [rx,rz]=section(y);return V().set(Math.cos(a)*(rx+e),y,hip.z+Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.65)*(rz+e));}
  function patch(rows,cols,fn,m,weights){const mesh=grid(rows,cols,fn,m);if(weights){const g=mesh.geometry,p=g.attributes.position;for(let i=0;i<p.count;i++){const [a,b,w]=weights(V().fromBufferAttribute(p,i));g.attributes.skinIndex.setXYZW(i,boneIndex(a),boneIndex(b),0,0);g.attributes.skinWeight.setXYZW(i,1-w,w,0,0);}}return mesh;}
  function shag(center,rx,rz,height,m,rigid,count=100){
   grid(6,24,(u,v)=>{const a=v*Math.PI*2,r=.72+.42*Math.sin(u*Math.PI*.88)+.035*Math.sin(a*7+u*3);return center.clone().add(V().set(Math.cos(a)*rx*r,(u-.5)*height+.004*Math.sin(a*11+u*4),Math.sin(a)*rz*r));},m,rigid);
   const pp=[],ii=[];for(let j=0;j<count;j++){const a=rand(j+17)*Math.PI*2,u=rand(j+318),y=(u-.5)*height,r=.72+.42*Math.sin(u*Math.PI*.88),root=center.clone().add(V().set(Math.cos(a)*rx*r,y,Math.sin(a)*rz*r)),t=V().set(-Math.sin(a),0,Math.cos(a)),n=pp.length/3,tip=root.clone().add(V().set(Math.cos(a)*.016,-.017-.018*rand(j+19),Math.sin(a)*.016));pp.push(...root.clone().addScaledVector(t,-.0013).toArray(),...root.clone().addScaledVector(t,.0013).toArray(),...tip.toArray());ii.push(n,n+1,n+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setIndex(ii);weighted(g,m,rigid);
  }
  function fibers(fn,count,material,rigid=null,length=.018){
   const pp=[],ii=[];for(let j=0;j<count;j++){const u=rand(j+718),a=rand(j+38)*Math.PI*2,root=fn(u,a),out=V().set(Math.cos(a),.16,Math.sin(a)).normalize(),tan=V().set(-Math.sin(a),0,Math.cos(a)),len=length*(.55+.9*rand(j+851)),w=.0007+.0005*rand(j+161),n=pp.length/3;for(let k=0;k<=2;k++){const t=k/2,q=root.clone().addScaledVector(out,len*Math.sin(t*1.9)).addScaledVector(tan,.005*Math.sin(j)*t*t);q.y-=len*.65*t*t;pp.push(...q.clone().addScaledVector(tan,-w*(1-t*.9)).toArray(),...q.clone().addScaledVector(tan,w*(1-t*.9)).toArray());if(k<2){const x=n+k*2;ii.push(x,x+1,x+2,x+1,x+3,x+2);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setIndex(ii);weighted(g,material,rigid);
  }
  const silver=new T.MeshStandardMaterial({color:'#e4e7ee',metalness:.38,roughness:.27,emissive:'#bbc0cd',emissiveIntensity:.18,side:T.DoubleSide});
  const knit=satin.clone();knit.roughness=.85;knit.sheen=.3;
  function sleeve(side,kind='long',fluffy=false){const shoulder=pos(side+'UpperArm').lerp(pos('neck'),look===2?.28:look===5?.18:.15),elbow=pos(side+'LowerArm'),hand=pos(side+'Hand'),m=fluffy?fur:knit;
   function tube(a,b,r0,r1,bone){const axis=b.clone().sub(a).normalize(),basis=V().crossVectors(axis,V().set(0,0,1)).normalize(),other=V().crossVectors(axis,basis).normalize();const fn=(u,v)=>{const ang=v*Math.PI*2,r=T.MathUtils.lerp(r0,r1,u)*(1+.035*Math.sin(u*17+ang*6));return a.clone().lerp(b,u).addScaledVector(basis,Math.cos(ang)*r).addScaledVector(other,Math.sin(ang)*r);};const sm=grid(8,20,fn,m,bone);if(bone===side+'UpperArm'){const si=sm.geometry.attributes.skinIndex,sw=sm.geometry.attributes.skinWeight;for(let j=0;j<=8;j++)for(let k=0;k<=20;k++){const n=j*21+k,w=T.MathUtils.smoothstep(j/8,0,.30);si.setXYZW(n,boneIndex('upperChest'),boneIndex(bone),0,0);sw.setXYZW(n,1-w,w,0,0);}}if(fluffy){const pp=[],ii=[];for(let j=0;j<400;j++){const u=rand(j+21),v=rand(j+71),q=fn(u,v),out=q.clone().sub(a.clone().lerp(b,u)).normalize(),t=other,n=pp.length/3;pp.push(...q.clone().addScaledVector(t,-.0013).toArray(),...q.clone().addScaledVector(t,.0013).toArray(),...q.clone().addScaledVector(out,.015).addScaledVector(axis,.008).toArray());ii.push(n,n+1,n+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setIndex(ii);weighted(g,m,bone);}}
   if(kind==='short'){tube(shoulder,shoulder.clone().lerp(elbow,.67),.058,.046,side+'UpperArm');return;}
   if(!fluffy){register(armShell(body,boneIndex,side,{lower:true}),m,false);return;}tube(shoulder,elbow.clone().addScaledVector(elbow.clone().sub(shoulder).normalize(),.007),.041,.035,side+'UpperArm');tube(elbow.clone().addScaledVector(shoulder.clone().sub(elbow).normalize(),.006),hand,.025,.021,side+'LowerArm');
  }
  function skirt(u,a,depth=.155){const y=waist-u*depth,[rx,rz]=section(Math.max(y,hip.y-.025)),fold=(look===1?.007:look===6?0:.0035)*Math.cos(a*(look===1?22:16))*u;return V().set(Math.cos(a)*(rx+.008+.013*u+fold),y,hip.z+Math.sin(a)*(rz+.023+.020*u+fold));}
  function belt(){grid(2,48,(u,v)=>skirt(.025+u*.075,v*Math.PI*2).add(V().set(Math.cos(v*Math.PI*2)*.001,0,Math.sin(v*Math.PI*2)*.001)),silver,'hips');}
  if(slot==='top'){
   register(shell('tsc-skin-upper',(x,y)=>y>hip.y-.025&&y<neck.y+.035,.002),skin,false);
   const hem=waist+.027,high=neck.y-(look===2?.035:look===5?.080:.070),m=look===3?sequinMaterial():look===2||look===5?knit:satin;
   grid(10,40,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(hem,high,u);return profile(y,a,.010+.0015*Math.sin(u*27+a));},m);
   if(look===1||look===4){const lower=look===4?hip.y-.15:hem+.006,upper=neck.y-.018,coat=(u,a)=>{const y=T.MathUtils.lerp(lower,upper,u),q=profile(Math.max(y,hip.y-.025),a,.028+.009*Math.sin(u*Math.PI));q.y=y;return q;};
    grid(14,40,(u,v)=>coat(u,Math.PI-.95+v*(Math.PI+1.90)),fur,'hips');
    const pp=[],ii=[];for(let j=0;j<1000;j++){const u=rand(j+71),a=Math.PI-.95+rand(j+81)*(Math.PI+1.90),q=coat(u,a),t=V().set(-Math.sin(a),0,Math.cos(a)),n=pp.length/3;pp.push(...q.clone().addScaledVector(t,-.0011).toArray(),...q.clone().addScaledVector(t,.0011).toArray(),...q.clone().add(V().set(Math.cos(a)*.012,-.016,Math.sin(a)*.012)).toArray());ii.push(n,n+1,n+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setIndex(ii);weighted(g,fur,'hips');
    if(look===1)for(const side of ['left','right'])sleeve(side,'short',true);
   }
   if(look===2||look===5)for(const side of ['left','right'])sleeve(side,'long',false);
   if(look===5){grid(4,40,(u,v)=>profile(high-.014*u,v*Math.PI*2,.015+.005*Math.sin(u*Math.PI)),knit);}
   if(look===6){for(const y of [hem+.008,high-.007]){const f=(u,a)=>profile(y+(u-.5)*.026,a,.024+.006*Math.sin(u*Math.PI));grid(3,40,(u,v)=>f(u,v*Math.PI*2),fur);fibers(f,600,fur,null,.018);}for(const x of [-.028,.028])line(V().set(x,hem+.015,hip.z+section(hem+.015)[1]+.014),V().set(x,high-.015,hip.z+section(high-.015)[1]+.014),.0013,silver);}
   if([1,4,6].includes(look))for(const side of ['left','right'])shag(pos(side+'Hand').add(V().set(0,.014,0)),.026,.030,.040,fur,side+'Hand',180);
  }
  if(slot==='bottom'){
   register(shell('tsc-short-outer',(x,y)=>y>hip.y-.105&&y<waist-.002,.003),satin,false);const inner=satin.clone();inner.polygonOffset=true;inner.polygonOffsetFactor=-2;inner.polygonOffsetUnits=-2;register(shell('tsc-short-inner',(x,y)=>y>hip.y-.108&&y<waist-.002,0),inner,false);
   if(look===4){for(const side of ['left','right']){const sign=side==='left'?1:-1;grid(7,28,(u,v)=>{const a=v*Math.PI*2,r=.045+.003*Math.sin(u*Math.PI);return V().set(sign*.052+Math.cos(a)*r,waist-.035-u*.108,hip.z+Math.sin(a)*.068);},satin,'hips');}grid(5,32,(u,v)=>{const a=v*Math.PI*2;return profile(waist-u*.073,a,.013);},satin,'hips');grid(5,20,(u,v)=>V().set((v-.5)*.17,waist-.025-u*.097,hip.z+.075+.004*Math.sin(v*Math.PI)),satin,'hips');}
   else if(look===5){for(let j=0;j<3;j++)grid(5,48,(u,v)=>{const a=v*Math.PI*2,q=skirt((j*.039+u*.067)/.155,a);q.y+=.006*Math.sin(a*11+j)*u;q.x+=Math.cos(a)*(.011*u+j*.003);q.z+=Math.sin(a)*(.014*u+j*.003);return q;},satin,'hips');}
   else {grid(8,56,(u,v)=>{const a=v*Math.PI*2,q=skirt(u,a,look===6?.155:.150);if(look===6){q.y+=u*.030*Math.cos(a+.6);q.z+=Math.max(0,Math.sin(a))*.002*Math.sin(a*2);};return q;},look===3?sequinMaterial():look===2?fur:satin,'hips');if(look===2)fibers((u,a)=>skirt(u,a,.150).add(V().set(Math.cos(a)*.004,0,Math.sin(a)*.004)),1600,fur,'hips',.022);}
   if([3,6].includes(look))belt();if(look===6){for(let j=0;j<22;j++){const a=.4+j/21*(Math.PI-.8),u=.15+.14*Math.sin(a),q=skirt(u,a).add(V().set(Math.cos(a)*.002,0,Math.sin(a)*.002));sphere(q,[.0025,.002,.0015],silver,'hips');}}
  }
  if(slot==='shoes'){
   register(shell('tsc-leg-skin',(x,y)=>y>floor&&y<hip.y-.106,.008),skin,false);
   for(const side of ['left','right']){const f=pos(side+'Foot'),k=pos(side+'LowerLeg');if([2,5,6].includes(look)){const center=f.clone().lerp(k,.43);shag(center,.052,.068,(k.y-f.y)*.62,fur,side+'LowerLeg',500);}else{grid(10,28,(u,v)=>{const a=v*Math.PI*2,q=f.clone().setY(floor+.045).lerp(k,u*.91),rx=.029+.009*Math.sin(u*Math.PI),rz=.038+.008*Math.sin(u*Math.PI);return q.add(V().set(Math.cos(a)*rx,0,Math.sin(a)*rz));},satin,side+'LowerLeg');for(let j=0;j<5;j++){const y=f.y+.015+j*.018,z=f.z+.043;line(V().set(f.x-.016,y,z),V().set(f.x+.016,y+.003,z),.0009,silver,side+'LowerLeg');}}
    sphere(V().set(f.x,floor+.031,f.z+.027),[.040,.032,.072],satin,side+'Foot');sphere(V().set(f.x,floor+.009,f.z+.027),[.043,.012,.076],satin,side+'Foot');}
  }
  const groups=new Map();for(const m of rec.meshes){if(m.userData.sharedCrewGeometry)continue;const g=m.geometry,key=m.material.uuid+'|'+Object.entries(g.attributes).map(([k,a])=>k+a.itemSize+a.array.constructor.name).sort().join(',')+'|'+g.index?.array.constructor.name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}for(const ms of groups.values())if(ms.length>1){const g=mergeGeometries(ms.map(m=>m.geometry),false);if(!g)throw Error('GX geometry schema mismatch');ms[0].geometry.dispose();ms[0].geometry=g;for(const m of ms.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
  rec.buildMs=performance.now()-start;records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});timings.push({slot,ms:rec.buildMs,meshes:rec.meshes.length});yield;
 }return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
export function createTaiSinhCrewStyles(...args){const it=buildTaiSinhCrewStyles(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
