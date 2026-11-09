// Derived from approved natural-boy base SHA256 67328828cdd461c54cf863d06e672e941ec0b75d558521f477bc87434697d5b7.
import * as T from 'three';
import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1011.0649';
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
 function section(y){const f=T.MathUtils.clamp((y-hip.y+.04)/(neck.y-hip.y+.005)*15,0,15),i=Math.floor(f),j=Math.min(15,i+1);return[dims[i][0]*(1-f+i)+dims[j][0]*(f-i),dims[i][1]*(1-f+i)+dims[j][1]*(f-i)];}
 const shells=new Map();
 function shell(key,test,offset=0){if(shells.has(key))return shells.get(key);const ids=[],map=new Map(),attrs=Object.fromEntries(['position','normal','uv','skinIndex','skinWeight'].filter(k=>g.attributes[k]).map(k=>[k,[]])),out=[];
 for(let i=0;i<ix.count;i+=3){const tri=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(!tri.every(id=>test(p.getX(id),p.getY(id),p.getZ(id))))continue;for(const id of tri){if(!map.has(id)){map.set(id,map.size);ids.push(id);for(const[k,a]of Object.entries(attrs)){const src=g.attributes[k];for(let c=0;c<src.itemSize;c++)a.push(src.getComponent(id,c)+(k==='position'?g.attributes.normal.getComponent(id,c)*offset:0));}}out.push(map.get(id));}}
 const geo=new T.BufferGeometry();for(const[k,a]of Object.entries(attrs))geo.setAttribute(k,k==='skinIndex'?new T.Uint16BufferAttribute(a,4):new T.Float32BufferAttribute(a,g.attributes[k].itemSize));geo.setIndex(out);geo.computeBoundingSphere();shells.set(key,geo);return geo;}
 const c={body,hip,neck,pos,boneIndex,section,shell,floor,cacheMs:performance.now()-t0};caches.set(donor,c);return c;
}
export const girlXinhBoySpecs=[
{id:'b1',role:'boy',shirt:'long',color:'#fbfcff',opening:.08,trim:'closed',tie:false},
{id:'b2',role:'boy',shirt:'long',color:'#ffffff',opening:.48,trim:'open',tie:false},
{id:'b3',role:'boy',shirt:'long',color:'#f9fbfe',opening:.14,trim:'piping',tie:false},
{id:'b4',role:'boy',shirt:'long',color:'#ffffff',opening:.38,trim:'double',tie:false}
];
export const girlXinhBoyOptions=()=>Object.fromEntries(['top','bottom','shoes'].map(slot=>[slot,girlXinhBoySpecs.map(s=>({id:`girl-xinh-crew-${s.id}-${slot}`,style:`girl-xinh-crew-${s.id}-${slot}`,variant:1,role:s.role,crewOnly:true,label:`Girl Xinh · ${s.id}`}))]));
export const girlXinhBoySets=girlXinhBoySpecs.map(s=>({referencePerson:s.id,label:`Girl Xinh · ${s.id}`,role:s.role,crewOnly:true,selectionIds:Object.fromEntries(['hair','top','bottom','shoes','accessory'].map(k=>[k,k==='hair'?`girl-xinh-hair-${s.id}`:k==='accessory'?'none':`girl-xinh-crew-${s.id}-${k}`]))}));
export const hideNativeGirlXinhBoySafety=(mesh,opt)=>!!opt?.style?.startsWith('girl-xinh-crew-')&&(mesh.userData.excludeHatMua||/cream_undershorts/.test(mesh.name));
function sequinTexture(){const size=64,a=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const n=y*size+x,r=rand(n),edge=false,v=r>.84?255:r>.70?235:250;a.set([v,v,v,255],n*4);}const t=new T.DataTexture(a,size,size);t.needsUpdate=true;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(3,3);t.colorSpace=T.SRGBColorSpace;return t;}let sparkle;
export function* buildGirlXinhBoyStyles(variants,options){const records=new Map(),parts=[],timings=[];
for(const slot of ['top','bottom','shoes'])for(const[index,opt]of(options[slot]||[]).entries()){
const match=/^girl-xinh-crew-([gb][1-6])-(top|bottom|shoes)$/.exec(opt.style||'');if(!match)continue;const spec=girlXinhBoySpecs.find(s=>s.id===match[1]);if(!spec)throw Error('Unknown Dolce role');const start=performance.now(),donor=variants[opt.variant],c=donorCache(donor),{body,hip,neck,pos,boneIndex,section,shell,floor}=c,rec={id:opt.id,index,slot,meshes:[]};
const mat=(color,roughness=.8)=>new T.MeshStandardMaterial({color,roughness,side:T.DoubleSide}),white=mat('#fffdfc'),skin=new T.MeshToonMaterial({color:'#fff1df',emissive:'#bca98f',emissiveIntensity:.18,side:T.DoubleSide}),cloth=mat(spec.color,spec.role==='girl'?.48:.85),gray=mat('#8c969f'),silver=mat('#d6dde2',.65);white.emissive.set('#ffffff');white.emissiveIntensity=.12;if(spec.role==='boy'){cloth.emissive.set('#ffffff');cloth.emissiveIntensity=.09;}if(spec.role==='girl'){sparkle??=sequinTexture();cloth.map=sparkle;cloth.metalness=.03;cloth.emissive.copy(cloth.color);cloth.emissiveIntensity=.13;}
  function register(geo,m,owned=true){const mesh=new T.SkinnedMesh(geo,m);mesh.name=rec.id+'_'+rec.meshes.length;mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(body.skeleton,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;mesh.userData.sharedCrewGeometry=!owned;body.parent.add(mesh);rec.meshes.push(mesh);return mesh;}
  function weighted(geo,m,rigid=null){const pp=geo.attributes.position,si=[],sw=[],hips=boneIndex('hips'),spine=boneIndex('spine'),chest=boneIndex('chest'),upper=boneIndex('upperChest'),sp=pos('spine').y,ch=pos('chest').y,up=pos('upperChest').y;
   for(let i=0;i<pp.count;i++){if(rigid==='hips'&&slot==='bottom'&&spec.role==='girl'&&spec.shape!=='shorts'&&pp.getY(i)<hip.y+.025){const w=T.MathUtils.smoothstep(hip.y+.025-pp.getY(i),0,.135)*.92,l=T.MathUtils.clamp(.5+pp.getX(i)/.10,0,1);si.push(hips,boneIndex('leftUpperLeg'),boneIndex('rightUpperLeg'),0);sw.push(1-w,w*l,w*(1-l),0);continue;}let a,b,w;if(rigid){a=b=boneIndex(rigid);w=0;}else{const y=pp.getY(i);if(y<sp){a=hips;b=spine;w=T.MathUtils.clamp((y-hip.y)/(sp-hip.y),0,1);}else if(y<ch){a=spine;b=chest;w=T.MathUtils.clamp((y-sp)/(ch-sp),0,1);}else{a=chest;b=upper;w=T.MathUtils.clamp((y-ch)/(up-ch),0,1);}}si.push(a,b,0,0);sw.push(1-w,w,0,0);}geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geo.computeVertexNormals();geo.computeBoundingSphere();return register(geo,m);}
  function grid(rows,cols,fn,m,rigid=null){const pp=[],uv=[],ii=[];for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){pp.push(...fn(j/rows,k/cols).toArray());uv.push(k/cols,j/rows);}for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;ii.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ii);return weighted(g,m,rigid);}
  function sphere(center,scale,m,rigid){const g=new T.SphereGeometry(1,8,6);g.scale(...scale);g.translate(...center.toArray());return weighted(g,m,rigid);}
  function line(a,b,r,m,rigid=null){const g=new T.CylinderGeometry(r,r,a.distanceTo(b),5);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V().set(0,1,0),b.clone().sub(a).normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());weighted(g,m,rigid);}
  function oval(y,a,extra=0){const [rx,rz]=section(y),x=Math.cos(a),z=Math.sin(a);return V().set(x*(rx+extra),y,hip.z+Math.sign(z)*Math.sqrt(Math.max(0,1-Math.pow(Math.abs(x),4)))*(rz+extra));}
  function fluff(center,rx,rz,height,m,rigid,seed=0){for(let j=0;j<36;j++){const a=j*2.39996,y=Math.sin(j*1.731+seed)*height*.42,r=1+.09*Math.sin(j*2.13);sphere(center.clone().add(V().set(Math.cos(a)*rx*r,y,Math.sin(a)*rz*r)),[.010,.015,.010],m,rigid);}}
  function bow(center,m,rigid){for(const sign of [-1,1])sphere(center.clone().add(V().set(sign*.012,0,0)),[.015,.010,.004],m,rigid);sphere(center,[.005,.006,.005],m,rigid);}
  const waist=hip.y+(spec.role==='boy'?.090:.065);
  function torso(y,a,extra=0){const [rx,rz]=section(y);return V().set(Math.cos(a)*(rx+extra),y,hip.z+Math.sign(Math.sin(a))*Math.pow(Math.abs(Math.sin(a)),.55)*(rz+extra));}
  function patch(rows,cols,fn,m,weightFn){const mesh=grid(rows,cols,fn,m);if(weightFn){const g=mesh.geometry,p=g.attributes.position;for(let i=0;i<p.count;i++){const [a,b,w]=weightFn(V().fromBufferAttribute(p,i));g.attributes.skinIndex.setXYZW(i,boneIndex(a),boneIndex(b),0,0);g.attributes.skinWeight.setXYZW(i,1-w,w,0,0);}}return mesh;}
  function limb(side,aName,bName,start,end,radius,m){const a=pos(side+aName),b=pos(side+bName),axis=b.clone().sub(a).normalize(),t=V().set(0,0,1),n=V().crossVectors(axis,t).normalize();patch(5,16,(u,v)=>{const q=a.clone().lerp(b,start+(end-start)*u),ang=v*Math.PI*2,r=radius*(1-.12*u);return q.addScaledVector(n,Math.cos(ang)*r).addScaledVector(t,Math.sin(ang)*r);},m,()=>[side+aName,side+aName,0]);}
  // Fit only the rear depth to the already-approved donor, keeping x/y silhouette.
  // This replaces intersecting safety patches with a continuous outer fabric hull.
  const rearQuery=getTriangleQuery(geometryTriangles(body.geometry));
  function fitRear(q,clearance=.011){if(q.z>=hip.z)return q;const ray=new T.Ray(V().set(q.x,q.y,hip.z-.5),V().set(0,0,1));let back=Infinity;for(const r of rearQuery.rayCandidates(ray)){const hit=ray.intersectTriangle(r.t.a,r.t.b,r.t.c,false,V());if(hit&&hit.z<back)back=hit.z;}if(Number.isFinite(back))q.z=Math.min(q.z,back-clearance);return q;}
  if(slot==='top'){
    register(shell('skin-upper',(x,y)=>y>hip.y-.02&&y<neck.y+.045,.0014),skin,false);
    if(spec.role==='boy'){
      const low=hip.y+.020,high=neck.y-.020;
      const shirt=(y,a,e=0)=>{const taper=T.MathUtils.smoothstep(y,high-.050,high),rx=T.MathUtils.lerp(.092,.038,taper)+e,front=T.MathUtils.lerp(.088,.043,taper)+e,back=T.MathUtils.lerp(.056,.036,taper)+e,z=Math.sin(a);return fitRear(V().set(Math.cos(a)*rx,y,hip.z+Math.sign(z)*Math.pow(Math.abs(z),.65)*(z>=0?front:back)),.016);};
      const opening=spec.opening;
      grid(9,30,(u,v)=>{const a=opening+v*(Math.PI*2-2*opening)+Math.PI/2;return shirt(T.MathUtils.lerp(low,neck.y-.070,u),a,.007);},cloth);
      // White tee only spans the open front; its hem tucks behind the visible belt.
      grid(8,4,(u,v)=>{const y=T.MathUtils.lerp(waist-.004,high-.008,u),left=shirt(y,Math.PI/2+opening,.006),right=shirt(y,Math.PI/2-opening,.006);return left.lerp(right,v);},white);
      register(shell('boy-white-tee-yoke',(x,y)=>Math.abs(x)<.165&&y>neck.y-.085&&y<neck.y+.025,.014),cloth,false);
      // Analytic shoulder yoke and a closed white neck band avoid cut donor triangles.
      grid(5,30,(u,v)=>{const a=opening+v*(Math.PI*2-2*opening)+Math.PI/2;return shirt(neck.y-.008-u*.062,a,.007);},cloth);
      grid(3,24,(u,v)=>{const a=v*Math.PI*2,z=Math.sin(a);return V().set(Math.cos(a)*T.MathUtils.lerp(.045,.060,u),neck.y+.023-u*.036,hip.z+Math.sign(z)*Math.pow(Math.abs(z),.65)*(z>=0?T.MathUtils.lerp(.066,.085,u):T.MathUtils.lerp(.050,.065,u)));},white);
      // Rounded shoulder cap follows the arm; taper sleeves along the elbow chain.
      for(const side of ['left','right']){sphere(pos(side+'UpperArm').add(V().set(0,-.010,0)),[.030,.028,.034],cloth,side+'UpperArm');limb(side,'UpperArm','LowerArm',.04,spec.shirt==='short'?.58:1.03,.032,cloth);if(spec.shirt!=='short')limb(side,'LowerArm','Hand',-.04,.86,.026,cloth);}
      if(spec.tie){line(V().set(0,high+.003,shirt(high,Math.PI/2).z+.006),V().set(0,high-.018,shirt(high-.018,Math.PI/2).z+.007),.007,gray);grid(6,2,(u,v)=>{const y=high-.018-u*.122,w=.009+.004*Math.sin(u*Math.PI);return V().set((v-.5)*w*2,y,shirt(y,Math.PI/2).z+.011);},gray);}
      // Narrow biker zip tapes and chest-pocket piping sit on the jacket surface.
      const trimMat=mat(spec.trim==='piping'?'#7e8a94':'#89959f',.88);
      function frontAt(x,y,offset=.002){const taper=T.MathUtils.smoothstep(y,high-.050,high),rx=T.MathUtils.lerp(.092,.038,taper)+.007,depth=T.MathUtils.lerp(.088,.043,taper)+.007,sin=Math.sqrt(Math.max(0,1-(x/rx)**2));return V().set(x,y,hip.z+Math.pow(sin,.65)*depth+offset);}
      function tape(y,side,start=.018,end=.084){grid(1,12,(u,v)=>frontAt(side*T.MathUtils.lerp(start,end,v),y+(u-.5)*.0030),trimMat);}
      for(const side of [-1,1]){
        const edge=Math.sin(opening)*(.092+.007),start=Math.max(.018,edge+.004);
        tape(high-.072,side,start,.086);tape(waist+.034,side,start,.075);
        grid(12,1,(u,v)=>{const y=T.MathUtils.lerp(low+.008,high-.010,u),q=shirt(y,Math.PI/2+side*opening,.007);q.x+=(v-.5)*.0028;q.z+=.0025;return q;},trimMat);
      }
      if(spec.trim==='piping')for(const side of[-1,1])tape(high-.079,side,.020,.083);
      if(spec.trim==='double')for(const side of[-1,1]){
        grid(5,1,(u,v)=>frontAt(side*T.MathUtils.lerp(.028,.060,u),high-.025-.055*u+(v-.5)*.003),trimMat);
      }
      // Tiny slider rests directly on the edge tape, with torso skin weights.
      const slider=shirt(high-.064,Math.PI/2+opening,.007);slider.z+=.004;
      sphere(slider,[.0028,.006,.0018],silver,null);
      // Pants overlap belongs to hips, smoothly returning to torso weights above it.
      for(const mesh of rec.meshes){if(mesh.userData.sharedCrewGeometry)continue;const g=mesh.geometry,p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;for(let i=0;i<p.count;i++){const keep=T.MathUtils.smoothstep(p.getY(i),hip.y+.113,hip.y+.185);if(keep>=1)continue;const weights=new Map([[boneIndex('hips'),1-keep]]);for(let k=0;k<4;k++){const bi=si.getComponent(i,k);weights.set(bi,(weights.get(bi)||0)+sw.getComponent(i,k)*keep);}const list=[...weights].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=list.reduce((n,a)=>n+a[1],0);for(let k=0;k<4;k++){si.setComponent(i,k,list[k]?.[0]||0);sw.setComponent(i,k,(list[k]?.[1]||0)/sum);}}}
    }else{
      const low=spec.shape==='dress'?waist-.012:waist+.038,high=neck.y-.060;
      grid(7,32,(u,v)=>{const a=v*Math.PI*2,top=high+(spec.neck==='asym'?.027*Math.cos(a):0);return torso(T.MathUtils.lerp(low,top,u),a,.009);},cloth);
      if(spec.neck==='halter')grid(6,6,(u,v)=>{const y=T.MathUtils.lerp(high-.010,neck.y-.009,u),x=(v-.5)*2*T.MathUtils.lerp(.064,.022,u);return V().set(x,y,hip.z+section(y)[1]+.014);},cloth);
      // Sparse bright discs remain visible at crew scale; same torso weights as the cloth.
      silver.emissive.set('#eeeeff');silver.emissiveIntensity=.35;
      for(let j=0;j<90;j++){const a=rand(j+441)*Math.PI*2,y=T.MathUtils.lerp(low+.010,high-.010,rand(j+92)),q=torso(y,a,.012),g=new T.CircleGeometry(.0018+.0009*rand(j+17),4);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V().set(0,0,1),V().set(Math.cos(a),0,Math.sin(a))));g.translate(...q.toArray());weighted(g,silver);}
      // Continuous fitted straps end inside the upper garment envelope.
      for(const sign of [-1,1])if(spec.neck!=='asym'||sign===1)grid(6,2,(u,v)=>{const y=T.MathUtils.lerp(high-.012,neck.y-.006,u),x=sign*T.MathUtils.lerp(.050,spec.neck==='halter'?.022:.050,u)+(v-.5)*.011;return V().set(x,y,hip.z+section(y)[1]+.012);},cloth);
      if(['g2','g5','g6'].includes(spec.id))for(let j=0;j<14;j++){const a=j/14*Math.PI*2;grid(3,1,(u,v)=>{const y=low-u*(.027+.018*rand(j)),q=torso(low,a+(v-.5)*.043,.012);q.y=y;return q;},cloth);}
    }
  }
  if(slot==='bottom'){
    const isBoy=spec.role==='boy',shortHem=hip.y-.10;
    if(!isBoy)register(shell(isBoy?'trouser-safety':'short-safety',(x,y)=>y<(waist-.005)&&y>(isBoy?floor+.025:shortHem),.007),isBoy?white:cloth,false);
    const inner=(isBoy?white:cloth).clone();inner.polygonOffset=true;inner.polygonOffsetFactor=-2;inner.polygonOffsetUnits=-2;register(shell(isBoy?'trouser-inner':'short-inner',(x,y)=>y<waist-.005&&y>(isBoy?floor+.025:shortHem),0),inner,false);
    if(isBoy){
      // One closed donor topology from waist through crotch and both legs.
      // Retain original skin weights; blend only the lower leg surface toward
      // the approved wide-trouser envelope, avoiding overlapping seat patches.
      const pants=shell('boy-continuous-pants',(x,y)=>y<waist-.004&&y>floor-.001,0).clone(),pp=pants.attributes.position,nn=pants.attributes.normal;
      const limbData=Object.fromEntries(['left','right'].map(side=>[side,{upper:pos(side+'UpperLeg'),foot:pos(side+'Foot')}])) ;
      for(let i=0;i<pp.count;i++){
        const original=V().fromBufferAttribute(pp,i),y=Math.max(original.y,floor+.035),side=original.x>=0?'left':'right',d=limbData[side],t=T.MathUtils.clamp((d.upper.y-y)/(d.upper.y-d.foot.y),0,1),center=d.upper.clone().lerp(d.foot,t),angle=Math.atan2(original.z-center.z,original.x-center.x),u=T.MathUtils.clamp((waist-.015-y)/(waist-.015-floor-.035),0,1),fold=.0025*Math.cos(angle*7+.3*Math.sin(u*5)),upperBlend=T.MathUtils.smoothstep(waist-y,.015,.15),rx=T.MathUtils.lerp(.034,.053+.005*Math.sin(u*Math.PI),upperBlend)+fold,rz=Math.sin(angle)>=0?T.MathUtils.lerp(.055,.090-.005*u,upperBlend)+fold:T.MathUtils.lerp(.060,.090,T.MathUtils.smoothstep(u,0,.40))+fold;
        const wide=V().set(center.x+Math.cos(angle)*rx,y,hip.z+.006+Math.sin(angle)*rz),base=original.clone().addScaledVector(V().fromBufferAttribute(nn,i),.008);base.y=y;
        base.lerp(wide,T.MathUtils.smoothstep(hip.y-.020-y,0,.110));pp.setXYZ(i,base.x,base.y,base.z);
      }
      pants.computeVertexNormals();pants.computeBoundingSphere();register(pants,white);
      grid(1,32,(u,v)=>{const a=v*Math.PI*2;return V().set(Math.cos(a)*.090,waist-.012*u,hip.z+Math.sin(a)*(Math.sin(a)>0?.087:.057));},gray,'hips');
      const buckle=new T.TorusGeometry(.008,.0018,4,12);buckle.scale(1.3,.8,1);buckle.translate(0,waist-.006,hip.z+.091);weighted(buckle,silver,'hips');
    }else{
      if(spec.shape==='shorts'){grid(4,32,(u,v)=>torso(T.MathUtils.lerp(waist-.003,hip.y-.040,u),v*Math.PI*2,.015),cloth,'hips');}
      if(spec.shape==='shorts')for(const side of ['left','right']){const p=pos(side+'UpperLeg');grid(5,20,(u,v)=>{const a=v*Math.PI*2;return V().set(p.x+Math.cos(a)*.048,T.MathUtils.lerp(hip.y+.010,shortHem,u),hip.z+.012+Math.sin(a)*.073);},cloth,side+'UpperLeg');}
      else{
        const hem=spec.shape==='dress'?hip.y-.135:hip.y-.100;
        grid(5,32,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(waist,hem,u),[rx,rz]=section(Math.max(y,hip.y-.025));return V().set(Math.cos(a)*(rx+.008+.010*u),y,hip.z+Math.sin(a)*(rz+.008+.010*u));},cloth,'hips');
        if(spec.shape==='ruffles'||spec.shape==='dress')for(let tier=0;tier<3;tier++)grid(4,40,(u,v)=>{const a=v*Math.PI*2,y=waist-.022-tier*.048-u*.065+.006*Math.sin(a*13+tier)*u,[rx,rz]=section(Math.max(y,hip.y-.025)),wave=.005*Math.sin(a*17+tier)*u;return V().set(Math.cos(a)*(rx+.010+.019*u+wave),y,hip.z+Math.sin(a)*(rz+.010+.019*u+wave));},cloth,'hips');
        if(spec.shape==='fringe')for(let j=0;j<24;j++){const a=j/24*Math.PI*2;grid(3,1,(u,v)=>{const y=waist-.025-u*(.145+.025*rand(j)),[rx,rz]=section(hip.y-.015),ang=a+(v-.5)*.053;return V().set(Math.cos(ang)*(rx+.014+.006*u),y,hip.z+Math.sin(ang)*(rz+.014+.006*u));},cloth,'hips');}
      }
      grid(2,32,(u,v)=>torso(waist-u*.016,v*Math.PI*2,.013),cloth,'hips');
      for(let j=0;j<32;j++){const a=j/32*Math.PI*2,q=torso(waist-.008,a,.016),g=new T.CircleGeometry(.0023,4);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V().set(0,0,1),V().set(Math.cos(a),0,Math.sin(a))));g.translate(...q.toArray());weighted(g,silver,'hips');}
    }
  }
  if(slot==='shoes'){
    const knee=pos('leftLowerLeg');register(shell('leg-skin',(x,y)=>y>floor&&y<hip.y-.105,.008),skin,false);
    if(spec.boots)register(shell('white-boot',(x,y)=>y>floor+.025&&y<knee.y-.035,.011),white,false);
    for(const side of ['left','right']){const f=pos(side+'Foot');sphere(V().set(f.x,floor+.035,f.z+.027),[.040,.033,.073],white,side+'Foot');sphere(V().set(f.x,floor+.011,f.z+.028),[.043,.014,.078],white,side+'Foot');
      if(spec.boots){const pp=body.geometry.attributes.position,front=y=>{let z=-Infinity;for(const i of new Set(body.geometry.index.array))if(Math.abs(pp.getX(i)-f.x)<.040&&Math.abs(pp.getY(i)-y)<.016)z=Math.max(z,pp.getZ(i));return (Number.isFinite(z)?z:f.z+.040)+.012;};for(let j=0;j<7;j++){const y=f.y+.035+j*.027;for(const sign of [-1,1])line(V().set(f.x-.015,y-sign*.009,front(y-sign*.009)),V().set(f.x+.015,y+sign*.009,front(y+sign*.009)),.0017,silver,side+'LowerLeg');}}
    }
  }
  const groups=new Map();for(const m of rec.meshes){if(m.userData.sharedCrewGeometry)continue;const g=m.geometry,key=m.material.uuid+'|'+Object.entries(g.attributes).map(([k,a])=>k+a.itemSize+a.array.constructor.name).sort().join(',')+'|'+g.index?.array.constructor.name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}for(const ms of groups.values())if(ms.length>1){const g=mergeGeometries(ms.map(m=>m.geometry),false);if(!g)throw Error('Dolce geometry schema mismatch');ms[0].geometry.dispose();ms[0].geometry=g;for(const m of ms.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
  rec.buildMs=performance.now()-start;records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});timings.push({id:spec.id,slot,milliseconds:rec.buildMs,meshes:rec.meshes.length});yield;
}return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
export function createGirlXinhBoyStyles(...args){const it=buildGirlXinhBoyStyles(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
