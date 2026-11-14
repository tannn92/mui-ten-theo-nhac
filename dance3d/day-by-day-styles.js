import * as T from 'three';
import {fitPoint,fitSection,armShell} from './body-fit.js?v=1411.1139';
import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1411.1139';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// "Day by Day" (T-ARA), dance cover by Tiature (owner song queue 2026-11-11): the whole unit wears pink sleeveless trench
// mini dresses (notched lapel, double-breasted black buttons, self belt with a black square buckle, A-line skirt) in shades
// from rose to blush, with black ankle boots or black strappy heels. Built like tim-em-styles.js: the bodice hugs the body
// through body-fit.js (convex torso slice + ease), sleeves are her own arm skin lifted (armShell), boots/sandal straps take
// the skinning of her own leg (skinLike(mesh, side)). The dress is split into top (bodice + lapels + buttons, down to the
// waistband) and bottom (belt + skirt). Modest for the child: the bodice reaches the waistband, the skirt keeps a lining.
// Style ids: day-by-day-1-{top,bottom,shoes} (shop set) and day-by-day-crew-c1..c6-{top,bottom,shoes} (crew only).
const caches=new WeakMap();
const V=()=>new T.Vector3();
function donorCache(donor){
 if(caches.has(donor))return caches.get(donor);
 const body=donor.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),g=body.geometry,p=g.attributes.position,ix=g.index,inv=body.matrixWorld.clone().invert(),pos=n=>donor.vrm.humanoid.getRawBoneNode(n).getWorldPosition(V()).applyMatrix4(inv),hip=pos('hips'),neck=pos('neck');
 const boneIndex=n=>{const raw=donor.vrm.humanoid.getRawBoneNode(n);let i=body.skeleton.bones.indexOf(raw);if(i<0)i=body.skeleton.bones.findIndex(b=>b.name===raw?.name);if(i<0)throw Error('Missing bone '+n);return i;},floor=Math.min(...Array.from(ix.array,i=>p.getY(i)));
 function section(y){return fitSection(body,boneIndex,hip,neck,y)||[.085,.06];}
 const shells=new Map();
 function shell(key,test,offset=0){if(shells.has(key))return shells.get(key);const map=new Map(),attrs=Object.fromEntries(['position','normal','uv','skinIndex','skinWeight'].filter(k=>g.attributes[k]).map(k=>[k,[]])),out=[];
  const ok=id=>test(p.getX(id),p.getY(id),p.getZ(id));
  for(let i=0;i<ix.count;i+=3){const tri=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(!tri.every(ok))continue;for(const id of tri){if(!map.has(id)){map.set(id,map.size);for(const[k,a]of Object.entries(attrs)){const src=g.attributes[k];for(let c=0;c<src.itemSize;c++)a.push(src.getComponent(id,c)+(k==='position'?g.attributes.normal.getComponent(id,c)*offset:0));}}out.push(map.get(id));}}
  const geo=new T.BufferGeometry();for(const[k,a]of Object.entries(attrs))geo.setAttribute(k,k==='skinIndex'?new T.Uint16BufferAttribute(a,4):new T.Float32BufferAttribute(a,g.attributes[k].itemSize));geo.setIndex(out);geo.computeBoundingSphere();shells.set(key,geo);return geo;}
 // the skin triangles of one lower leg + foot: leg pieces copy their movement from these only (tim-em lesson: a piece that
 // takes weights from the other leg stretches between the legs in a wide stance)
 const legQueries=new Map();function legQuery(side){if(!legQueries.has(side)){const s=Math.sign(pos(side+'Foot').x),top=pos(side+'LowerLeg').y+.06;
  legQueries.set(side,getTriangleQuery(geometryTriangles(g).filter(r=>[r.t.a,r.t.b,r.t.c].every(q=>q.x*s>.005&&q.y<top))));}return legQueries.get(side);}
 const c={body,hip,neck,pos,boneIndex,section,shell,floor,legQuery};caches.set(donor,c);return c;
}
// color: dress fabric; sleeve: none | cap | short; skirt: hem length below the waist (m); shoes: boots | sandals;
// sandalColor for the strappy heels. Shades follow the clip: rose, baby pink, blush, near-white pink, dusty rose.
export const dayByDaySpecs=[
{id:'1',lead:true,color:'#f3b6c2',sleeve:'cap',skirt:.170,shoes:'boots'},
{id:'c1',color:'#e3929f',sleeve:'none',skirt:.150,shoes:'sandals'},
{id:'c2',color:'#f5c3cc',sleeve:'none',skirt:.150,shoes:'boots'},
{id:'c3',color:'#f9dde2',sleeve:'short',skirt:.145,shoes:'sandals'},
{id:'c4',color:'#d98897',sleeve:'none',skirt:.155,shoes:'boots'},
{id:'c5',color:'#f1aebb',sleeve:'cap',skirt:.150,shoes:'sandals'},
{id:'c6',color:'#eda3b1',sleeve:'none',skirt:.160,shoes:'boots'}];
export const hideNativeDayByDaySafety=(m,o)=>/^day-by-day-/.test(o?.style||'')&&(m.userData.excludeHatMua||m.userData.excludeHuntrix||/cream_undershorts/.test(m.name));
const textures=new Map();
// fine diagonal twill of a cotton trench (128 px, tiled)
function twill(){if(textures.has('twill'))return textures.get('twill');const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,128,128);
 x.lineWidth=1;for(let k=-128;k<128;k+=4){x.strokeStyle='rgba(120,90,95,.07)';x.beginPath();x.moveTo(k,128);x.lineTo(k+128,0);x.stroke();}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(4,4);textures.set('twill',t);return t;}
export function* buildDayByDayStyles(variants,options){const records=new Map(),parts=[],timings=[];
for(const slot of ['top','bottom','shoes'])for(const[index,opt]of(options[slot]||[]).entries()){
 const match=/^day-by-day-(?:crew-)?(1|c[1-6])-(top|bottom|shoes)$/.exec(opt.style||'');if(!match)continue;const spec=dayByDaySpecs.find(s=>s.id===match[1]);if(!spec)continue;
 const start=performance.now(),donor=variants[opt.variant],c=donorCache(donor),{body,hip,neck,pos,boneIndex,section,shell,floor,legQuery}=c,rec={id:opt.id,index,slot,meshes:[]};
 const phys=(color,o={})=>{const m=new T.MeshPhysicalMaterial({color,roughness:.7,clearcoat:.05,sheen:.5,side:T.DoubleSide,...o});m.emissive.set(color);m.emissiveIntensity=o.glow??.16;return m;};
 const cloth=(()=>{const m=phys(spec.color,{roughness:.72,sheen:.6,sheenRoughness:.5,sheenColor:new T.Color('#ffe6ec'),glow:.18});m.map=twill();return m;})();
 const dark=phys(spec.color,{glow:.08});dark.color.multiplyScalar(.82);dark.emissive.copy(dark.color);
 const black=phys('#1b1719',{roughness:.3,clearcoat:.7,clearcoatRoughness:.15,sheen:0,glow:.05}),button=phys('#141113',{roughness:.25,clearcoat:.9,sheen:0,glow:.04});
 const skin=new T.MeshToonMaterial({color:'#fff1df',emissive:'#bca98f',emissiveIntensity:.18,side:T.DoubleSide});
 function register(geo,m,owned=true){const mesh=new T.SkinnedMesh(geo,m);mesh.name=rec.id+'_'+rec.meshes.length;mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(body.skeleton,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;mesh.userData.sharedCrewGeometry=!owned;body.parent.add(mesh);rec.meshes.push(mesh);return mesh;}
 function weighted(geo,m,rigid=null){const pp=geo.attributes.position,si=[],sw=[],hips=boneIndex('hips'),spine=boneIndex('spine'),chest=boneIndex('chest'),upper=boneIndex('upperChest'),sp=pos('spine').y,ch=pos('chest').y,up=pos('upperChest').y;
  for(let i=0;i<pp.count;i++){if(rigid==='hips'&&slot==='bottom'&&pp.getY(i)<hip.y+.025){const w=T.MathUtils.smoothstep(hip.y+.025-pp.getY(i),0,.135)*.62,l=T.MathUtils.clamp(.5+pp.getX(i)/.10,0,1);si.push(hips,boneIndex('leftUpperLeg'),boneIndex('rightUpperLeg'),0);sw.push(1-w,w*l,w*(1-l),0);continue;}let a,b,w;if(rigid){a=b=boneIndex(rigid);w=0;}else{const y=pp.getY(i);if(y<sp){a=hips;b=spine;w=T.MathUtils.clamp((y-hip.y)/(sp-hip.y),0,1);}else if(y<ch){a=spine;b=chest;w=T.MathUtils.clamp((y-sp)/(ch-sp),0,1);}else{a=chest;b=upper;w=T.MathUtils.clamp((y-ch)/(up-ch),0,1);}}si.push(a,b,0,0);sw.push(1-w,w,0,0);}geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geo.computeVertexNormals();geo.computeBoundingSphere();return register(geo,m);}
 function grid(rows,cols,fn,m,rigid=null){const pp=[],uv=[],ii=[];for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){pp.push(...fn(j/rows,k/cols).toArray());uv.push(k/cols,j/rows);}for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;ii.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ii);return weighted(g,m,rigid);}
 function disc(center,r,m,rigid,squash=.45){const g=new T.SphereGeometry(1,10,6);g.scale(r,r,r*squash);g.translate(...center.toArray());return weighted(g,m,rigid);}
 let query=null;function skinLike(mesh,side=null){const q=side?legQuery(side):(query=query||getTriangleQuery(geometryTriangles(body.geometry)));const g=mesh.geometry,p=g.attributes.position,si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight;for(let i=0;i<p.count;i++){const h=q.nearest(V().fromBufferAttribute(p,i));if(!h)continue;const bc=h.record.t.getBarycoord(h.point,V()),blend=[bc.x,bc.y,bc.z],all=new Map();for(let j=0;j<3;j++)for(let k=0;k<4;k++){const bi=si.getComponent(h.record.ids[j],k),w=sw.getComponent(h.record.ids[j],k)*blend[j];all.set(bi,(all.get(bi)||0)+w);}const best=[...all].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=best.reduce((n,x)=>n+x[1],0)||1;while(best.length<4)best.push([0,0]);g.attributes.skinIndex.setXYZW(i,...best.map(x=>x[0]));g.attributes.skinWeight.setXYZW(i,...best.map(x=>x[1]/sum));}return mesh;}
 const depths=new Map();function fitted(y,a,e=.008){const q=fitPoint(body,boneIndex,hip,neck,y,a,e);if(q)return V().set(q[0],y,q[1]);if(!depths.has(y)){const p=body.geometry.attributes.position;let lo=Infinity,hi=-Infinity;for(const id of new Set(body.geometry.index.array))if(Math.abs(p.getX(id))<.085&&Math.abs(p.getY(id)-y)<.018){lo=Math.min(lo,p.getZ(id));hi=Math.max(hi,p.getZ(id));}depths.set(y,Number.isFinite(lo)?[lo,hi]:[hip.z-.05,hip.z+.06]);}const d=depths.get(y),co=Math.cos(a),sn=Math.sin(a),rx=section(y)[0]+e;return V().set(co*rx,y,sn>=0?hip.z+Math.pow(Math.max(0,1-Math.pow(Math.abs(co),4)),.325)*(d[1]-hip.z+e):hip.z-Math.pow(-sn,.85)*(hip.z-d[0]+e));}
 const waist=hip.y+.062,front=Math.PI/2;
 if(slot==='top'){
  register(shell('dbd-skin-upper',(x,y)=>y>hip.y-.025&&y<neck.y+.035,.0015),skin,false);
  // bodice: waistband up to a high round neckline at the back and sides, a shallow V in front (closed at the bust)
  const low=waist-.014,top=neck.y-.028,vDepth=.050;
  grid(26,48,(u,v)=>{const a=v*Math.PI*2,f=Math.max(0,Math.sin(a)),vee=vDepth*Math.pow(Math.max(0,1-Math.abs(Math.cos(a))/.34),1.2)*(f>0?1:0);return fitted(T.MathUtils.lerp(low,top-vee,u),a,.007+.005*f*f);},cloth);
  // notched lapels: a flap each side of the V, lying on the chest, a little wider at the bottom, with the notch near the top
  // the inner edge follows the V exactly (a little inside it, so no skin shows between lapel and bodice)
  const veeAt=cv=>vDepth*Math.pow(Math.max(0,1-cv/.34),1.2);
  for(const s of [-1,1]){grid(8,4,(u,v)=>{const cv=.34*u,y=top-veeAt(cv)-.002,d0=Math.asin(cv)-.035,width=.24*(1-.45*u)*(u>.70&&u<.84?.55:1),a=front+s*(d0+v*width);return fitted(y-v*.006*(1-u),a,.0155+.002*v);},dark);}
  // double-breasted front: two columns of three black buttons from the waist to the bust
  for(let j=0;j<3;j++){const y=T.MathUtils.lerp(low+.020,top-vDepth-.012,j/2);for(const s of [-1,1])disc(fitted(y,front+s*.30,.0145),.0058,button);}
  // shoulder yoke: a band over each shoulder so the bodice reads as a dress, not a vest
  if(spec.sleeve!=='none')for(const side of ['left','right']){const ua=pos(side+'UpperArm'),la=pos(side+'LowerArm');register(armShell(body,boneIndex,side,{lower:false,offset:.007,a:ua,b:la,upperFrac:spec.sleeve==='cap'?.28:.50,puff:spec.sleeve==='cap'?.004:.002}),cloth,false);}
 }
 if(slot==='bottom'){
  // lining + her thigh skin lifted, so the rose donor's own undershorts never show (no per-family hide hook in wardrobe.js)
  const len=spec.skirt,hemY=waist-len;
  register(shell('dbd-inner-'+Math.round(len*1000),(x,y)=>y<waist+.004&&y>hemY+.010,.010),phys(spec.color,{roughness:.8,glow:.10}),false);
  register(shell('dbd-thigh-'+Math.round(len*1000),(x,y)=>y>hip.y-.160&&y<hemY+.020,.0095),skin,false);
  // A-line skirt: from the waistband, flaring evenly to the hem, a soft wave in the hem
  grid(12,64,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.013),fl=.050*Math.pow(u,1.1)+.004*Math.sin(a*12)*u;return V().set(q.x+Math.cos(a)*fl,waist-u*len+.003*Math.sin(a*12)*u,q.z+Math.sin(a)*fl);},cloth,'hips');
  // hem facing (darker inside edge) so the hem reads in the toon light
  grid(1,64,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.013),fl=.050+.004*Math.sin(a*12);return V().set((q.x+Math.cos(a)*fl)*.995,waist-len+.003*Math.sin(a*12)+u*.010,(q.z+Math.sin(a)*fl-hip.z)*.995+hip.z);},dark,'hips');
  // the double-breasted front continues: two buttons below the belt
  for(const s of [-1,1]){const q=fitted(waist-.040,front+s*.30,.013);q.addScaledVector(V().set(Math.cos(front+s*.30),0,Math.sin(front+s*.30)),.050*Math.pow(.040/len,1.1)+.002);disc(q,.0058,button,'hips');}
  // self belt with a black square buckle
  grid(3,48,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.017);q.y=waist+.006-u*.020;return q;},dark,'hips');
  const f=fitted(waist-.004,front,.022),bk=new T.TorusGeometry(.012,.0025,4,4);bk.rotateZ(Math.PI/4);bk.scale(1.15,.95,1);bk.translate(f.x,f.y,f.z);weighted(bk,black,'hips');
 }
 if(slot==='shoes'){
  register(shell('dbd-legs',(x,y)=>y>floor&&y<hip.y-.105,.0005),skin,false);
  if(spec.shoes==='boots'){
   // black patent ankle boots: her foot and ankle skin lifted, a block heel and a sole rim
   register(shell('dbd-boot',(x,y)=>y>floor-.01&&y<floor+.115,.004),black,false);
   for(const side of ['left','right']){const f=pos(side+'Foot');
    skinLike(grid(2,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.040,floor+.002+u*.010,f.z+.030+Math.sin(a)*.078);},black),side);
    skinLike(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.040*u,floor+.012,f.z+.030+Math.sin(a)*.078*u);},black),side);
    skinLike(grid(2,12,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.018,floor-.004+u*.016,f.z-.034+Math.sin(a)*.016);},black),side);}
  } else {
   // black strappy heels: a thin black sole under the foot, an ankle strap, two toe straps and a slim heel
   register(shell('dbd-sole',(x,y)=>y>floor-.01&&y<floor+.016,.0035),black,false);
   for(const side of ['left','right']){const f=pos(side+'Foot'),kn=pos(side+'LowerLeg'),p=body.geometry.attributes.position,s=Math.sign(f.x);
    const ring=(y,e,w)=>{const ids=[];for(const id of new Set(body.geometry.index.array)){const x=p.getX(id);if(x*s>.005&&Math.abs(x-f.x)<.07&&Math.abs(p.getY(id)-y)<.008)ids.push(id);}if(!ids.length)return;
     let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const id of ids){x0=Math.min(x0,p.getX(id));x1=Math.max(x1,p.getX(id));z0=Math.min(z0,p.getZ(id));z1=Math.max(z1,p.getZ(id));}
     const cx=(x0+x1)/2,cz=(z0+z1)/2,hx=(x1-x0)/2+e,hz=(z1-z0)/2+e;skinLike(grid(1,28,(u,v)=>{const a=v*Math.PI*2;return V().set(cx+Math.cos(a)*hx,y-w/2+u*w,cz+Math.sin(a)*hz);},black),side);};
    ring(f.y+.012,.004,.009);ring(floor+.030,.004,.007);ring(floor+.022,.004,.006);
    skinLike(grid(2,10,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.008,floor-.012+u*.026,f.z-.036+Math.sin(a)*.008);},black),side);}
  }
 }
 const groups=new Map();for(const m of rec.meshes){if(m.userData.sharedCrewGeometry)continue;const g=m.geometry,key=m.material.uuid+'|'+Object.entries(g.attributes).map(([k,a])=>k+a.itemSize+a.array.constructor.name).sort().join(',')+'|'+g.index?.array.constructor.name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}for(const ms of groups.values())if(ms.length>1){const g=mergeGeometries(ms.map(m=>m.geometry),false);if(!g)throw Error('Day by Day geometry schema mismatch');ms[0].geometry.dispose();ms[0].geometry=g;for(const m of ms.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
 rec.buildMs=performance.now()-start;records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});timings.push({slot,ms:rec.buildMs,meshes:rec.meshes.length});yield;
}return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
export function createDayByDayStyles(...args){const it=buildDayByDayStyles(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
