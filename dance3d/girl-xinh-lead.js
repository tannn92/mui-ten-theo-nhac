import * as T from 'three';
import {fitPoint,fitSection} from './body-fit.js?v=1111.2237';
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
export const girlXinhOptions=()=>Object.fromEntries(['top','bottom','shoes','accessory'].map(slot=>[slot,[{id:'girl-xinh-1-'+slot,style:'girl-xinh-1-'+slot,variant:1,label:'Girl Xinh trắng · '+slot}]]));
export const girlXinhSets=[{id:'girl-xinh-1',label:'Girl Xinh trắng',selectionIds:{hair:'girl-xinh-1-hair',top:'girl-xinh-1-top',bottom:'girl-xinh-1-bottom',shoes:'girl-xinh-1-shoes',accessory:'girl-xinh-1-accessory'}}];
export const hideNativeGirlXinhSafety=(m,opt)=>!!opt?.style?.startsWith('girl-xinh-1-')&&(m.userData.excludeHatMua||/cream_undershorts/.test(m.name));
export function* buildGirlXinhLeadStyles(variants,options){const records=new Map(),parts=[],timings=[];
for(const slot of ['top','bottom','shoes','accessory'])for(const[index,opt]of(options[slot]||[]).entries()){
if(opt.style!=='girl-xinh-1-'+slot&&!(slot==='accessory'&&opt.style==='girl-xinh-1-accessory-2ben'))continue;const start=performance.now(),donor=variants[opt.variant],c=donorCache(donor),{body,hip,neck,pos,boneIndex,section,shell,floor}=c,rec={id:opt.id,index,slot,meshes:[]};
const satin=new T.MeshPhysicalMaterial({color:'#fffdfb',roughness:.43,metalness:.01,sheen:.7,sheenColor:'#ffffff',clearcoat:.15,side:T.DoubleSide,emissive:'#ffffff',emissiveIntensity:.24}),organza=satin.clone();organza.roughness=.48;organza.metalness=0;organza.clearcoat=0;organza.transparent=true;organza.opacity=.88;organza.depthWrite=false;
const fur=new T.MeshStandardMaterial({color:'#fffefe',roughness:.95,side:T.DoubleSide,emissive:'#ffffff',emissiveIntensity:.14}),skin=new T.MeshToonMaterial({color:'#fff1df',emissive:'#bca98f',emissiveIntensity:.18,side:T.DoubleSide});
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
  function patch(rows,cols,fn,m,weights){const mesh=grid(rows,cols,fn,m);if(weights){const g=mesh.geometry,p=g.attributes.position;for(let i=0;i<p.count;i++){const [a,b,w]=weights(V().fromBufferAttribute(p,i));g.attributes.skinIndex.setXYZW(i,boneIndex(a),boneIndex(b),0,0);g.attributes.skinWeight.setXYZW(i,1-w,w,0,0);}}return mesh;}
  function shag(center,rx,rz,height,m,rigid,count=100){
   grid(6,24,(u,v)=>{const a=v*Math.PI*2,r=.72+.42*Math.sin(u*Math.PI*.88)+.035*Math.sin(a*7+u*3);return center.clone().add(V().set(Math.cos(a)*rx*r,(u-.5)*height+.004*Math.sin(a*11+u*4),Math.sin(a)*rz*r));},m,rigid);
   const pp=[],ii=[];for(let j=0;j<count;j++){const a=rand(j+17)*Math.PI*2,u=rand(j+318),y=(u-.5)*height,r=.72+.42*Math.sin(u*Math.PI*.88),root=center.clone().add(V().set(Math.cos(a)*rx*r,y,Math.sin(a)*rz*r)),t=V().set(-Math.sin(a),0,Math.cos(a)),n=pp.length/3,tip=root.clone().add(V().set(Math.cos(a)*.016,-.017-.018*rand(j+19),Math.sin(a)*.016));pp.push(...root.clone().addScaledVector(t,-.0013).toArray(),...root.clone().addScaledVector(t,.0013).toArray(),...tip.toArray());ii.push(n,n+1,n+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setIndex(ii);weighted(g,m,rigid);
  }
  if(slot==='top'){
   register(shell('gx-skin-upper',(x,y)=>y>hip.y-.025&&y<neck.y+.035,.002),skin,false);
   const hem=waist+.030,high=neck.y-.060;
   grid(12,40,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(hem,high,u),fold=.0012*Math.sin(u*Math.PI*9+a*2+.45*Math.sin(a*3));return profile(y,a,.010+fold);},satin);
   grid(10,16,(u,v)=>{const y=T.MathUtils.lerp(high-.008,neck.y-.010,u),width=T.MathUtils.lerp(.069,.022,u),x=(v-.5)*2*width,front=hip.z+section(y)[1]+.012+.002*Math.sin(u*20+v*3);return V().set(x,y,front);},satin);
   for(const sign of [-1,1])line(V().set(sign*.022,neck.y-.012,hip.z+section(neck.y-.01)[1]+.014),pos('neck').add(V().set(sign*.024,0,0)),.0026,satin);
   for(const side of ['left','right'])shag(pos(side+'Hand').add(V().set(0,.012,0)),.024,.030,.040,fur,side+'Hand',180);
  }
  if(slot==='bottom'){
   register(shell('gx-short-outer',(x,y)=>y>hip.y-.105&&y<waist-.002,.003),satin,false);const inner=satin.clone();inner.polygonOffset=true;inner.polygonOffsetFactor=-2;inner.polygonOffsetUnits=-2;register(shell('gx-short-inner',(x,y)=>y>hip.y-.108&&y<waist-.002,0),inner,false);
   grid(4,40,(u,v)=>profile(waist-u*.016,v*Math.PI*2,.010),satin,'hips');
   // Soft short overlapping handkerchief flounces, with no outward shelf at the hips.
   for(let layer=0;layer<3;layer++)grid(6,48,(u,v)=>{const a=v*Math.PI*2,y=waist-.006-layer*.037-u*.065+.010*Math.sin(a*11+layer*.8)*u+.009*Math.cos(a+.7)*u,[rx,rz]=section(Math.max(y,hip.y-.025)),fold=.007*Math.sin(a*19+layer+u*2)*u;return V().set(Math.cos(a)*(rx+.006+.014*u+.002*layer+fold),y,hip.z+Math.sin(a)*(rz+.017+.019*u+.002*layer+fold));},satin,'hips');
   for(const side of ['left','right'])for(let j=0;j<4;j++){
    const sign=side==='left'?1:-1,rootY=waist-.038-j*.019,end=pos(side+'LowerLeg').y-(j===0?.10:j===1?.015:.16),phase=j*1.3+(sign>0?.3:1.1),rootZ=hip.z+[.048,.006,-.040,-.075][j];
    patch(16,4,(u,v)=>{const width=(.016+j*.004)*(.35+.65*Math.sin(u*Math.PI))*(1+.16*Math.sin(u*17+phase)),across=(v-.5)*width,twist=phase+u*8.1,y=T.MathUtils.lerp(rootY,end,u)+.013*Math.sin(v*7+u*17)*u,x=sign*(.104-.012*u+.006*Math.sin(u*8+phase))+across*Math.cos(twist),z=rootZ+.011*Math.sin(u*9+phase)+across*Math.sin(twist);return V().set(x,y,z);},organza,q=>{const k=pos(side+'LowerLeg').y;if(q.y>hip.y-.04)return['hips',side+'UpperLeg',T.MathUtils.smoothstep(hip.y+.025-q.y,0,.13)];return[side+'UpperLeg',side+'LowerLeg',T.MathUtils.smoothstep(k-q.y,-.045,.065)];});
   }
  }
  if(slot==='shoes'){
   register(shell('gx-leg-skin',(x,y)=>y>floor&&y<hip.y-.106,.008),skin,false);
   for(const side of ['left','right']){const f=pos(side+'Foot'),k=pos(side+'LowerLeg'),center=f.clone().lerp(k,.43);shag(center,.055,.071,(k.y-f.y)*.61,fur,side+'LowerLeg',600);sphere(V().set(f.x,floor+.031,f.z+.027),[.040,.032,.072],satin,side+'Foot');sphere(V().set(f.x,floor+.009,f.z+.027),[.043,.012,.076],satin,side+'Foot');}
  }
  if(slot==='accessory'){
   const head=pos('head'),one=head.clone().add(V().set(-.102,.235,.095)),centers=opt.style==='girl-xinh-1-accessory-2ben'?[one,V().set(2*head.x-one.x,one.y,one.z)]:[one];for(const center of centers){for(const sign of [-1,1]){const g=new T.SphereGeometry(1,10,6);g.scale(.033,.020,.009);g.rotateZ(sign*.25);g.translate(center.x+sign*.024,center.y,center.z);weighted(g,satin,'head');}sphere(center,[.008,.010,.011],satin,'head');for(const sign of [-1,1])grid(6,2,(u,v)=>center.clone().add(V().set(sign*(.007+.012*u)+(v-.5)*.016,-.005-u*.062,.003+.007*Math.sin(u*5))),organza,'head');}
  }
  const groups=new Map();for(const m of rec.meshes){if(m.userData.sharedCrewGeometry)continue;const g=m.geometry,key=m.material.uuid+'|'+Object.entries(g.attributes).map(([k,a])=>k+a.itemSize+a.array.constructor.name).sort().join(',')+'|'+g.index?.array.constructor.name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}for(const ms of groups.values())if(ms.length>1){const g=mergeGeometries(ms.map(m=>m.geometry),false);if(!g)throw Error('GX geometry schema mismatch');ms[0].geometry.dispose();ms[0].geometry=g;for(const m of ms.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
  rec.buildMs=performance.now()-start;records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});timings.push({slot,ms:rec.buildMs,meshes:rec.meshes.length});yield;
 }return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
export function createGirlXinhLeadStyles(...args){const it=buildGirlXinhLeadStyles(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
