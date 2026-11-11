import * as T from 'three';
import {fitPoint,fitSection,armShell,armRadius} from './body-fit.js?v=1111.2136';
import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1111.2136';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// "Tìm em" (B-Wild Christmas street dance, owner 2026-11-11): white fur, red velvet, red sequin belts, fluffy leg warmers.
// Same construction as secret-styles.js: tops hug the body through body-fit.js (convex torso slice + 4 mm), sleeves and
// gloves are her own arm skin lifted (armShell / bone-weighted shells), boots and leg warmers take the leg's own skinning.
// Modest for the child: every top reaches the waistband (the dancers' bare midriff is closed), skirts/shorts keep a lining.
const caches=new WeakMap();
const V=()=>new T.Vector3();
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
function donorCache(donor){
 if(caches.has(donor))return caches.get(donor);const t0=performance.now();
 const body=donor.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),g=body.geometry,p=g.attributes.position,ix=g.index,inv=body.matrixWorld.clone().invert(),pos=n=>donor.vrm.humanoid.getRawBoneNode(n).getWorldPosition(V()).applyMatrix4(inv),hip=pos('hips'),neck=pos('neck');
 const boneIndex=n=>{const raw=donor.vrm.humanoid.getRawBoneNode(n);let i=body.skeleton.bones.indexOf(raw);if(i<0)i=body.skeleton.bones.findIndex(b=>b.name===raw?.name);if(i<0)throw Error('Missing bone '+n);return i;},floor=Math.min(...Array.from(ix.array,i=>p.getY(i)));
 function section(y){return fitSection(body,boneIndex,hip,neck,y)||[.085,.06];}
 const shells=new Map();
 // skin shell by position test (secret-styles), or by bone weight (wtest gets the summed weight of a bone set)
 function shell(key,test,offset=0,bones=null){if(shells.has(key))return shells.get(key);const map=new Map(),attrs=Object.fromEntries(['position','normal','uv','skinIndex','skinWeight'].filter(k=>g.attributes[k]).map(k=>[k,[]])),out=[];
  const bs=bones?new Set(bones.map(boneIndex)):null,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,w=id=>{let s=0;for(let k=0;k<4;k++)if(bs.has(si.getComponent(id,k)))s+=sw.getComponent(id,k);return s;};
  const ok=id=>test(p.getX(id),p.getY(id),p.getZ(id),bs?w(id):0);
  for(let i=0;i<ix.count;i+=3){const tri=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(!tri.every(ok))continue;for(const id of tri){if(!map.has(id)){map.set(id,map.size);for(const[k,a]of Object.entries(attrs)){const src=g.attributes[k];for(let c=0;c<src.itemSize;c++)a.push(src.getComponent(id,c)+(k==='position'?g.attributes.normal.getComponent(id,c)*offset:0));}}out.push(map.get(id));}}
  const geo=new T.BufferGeometry();for(const[k,a]of Object.entries(attrs))geo.setAttribute(k,k==='skinIndex'?new T.Uint16BufferAttribute(a,4):new T.Float32BufferAttribute(a,g.attributes[k].itemSize));geo.setIndex(out);geo.computeBoundingSphere();shells.set(key,geo);return geo;}
 // the skin triangles of one lower leg + foot: leg pieces copy their movement from these only. With the whole body a warmer's
 // inner side was nearer the OTHER shin and followed it, so in a wide stance the warmers stretched across like a dropped skirt.
 const legQueries=new Map();function legQuery(side){if(!legQueries.has(side)){const s=Math.sign(pos(side+'Foot').x),top=pos(side+'LowerLeg').y+.06;
  legQueries.set(side,getTriangleQuery(geometryTriangles(g).filter(r=>[r.t.a,r.t.b,r.t.c].every(q=>q.x*s>.005&&q.y<top))));}return legQueries.get(side);}
 const c={body,hip,neck,pos,boneIndex,section,shell,floor,legQuery,cacheMs:performance.now()-t0};caches.set(donor,c);return c;
}
// top: tube (white bandeau to the waist, fur edge) | corset (red velvet, gold buttons) | halter (red, high neck) | fluffy (white
// long-sleeve knit, fur trims); gloves: white fur cuffs | red long gloves. bottom: ruffle (white fluffy tiers) | shorts | vinyl
// (red patent mini) | fur (burgundy fur mini); belt: red sequin | silver studs. shoes: boots + warmers (white | burgundy | none).
export const timEmSpecs=[
{id:'1',lead:true,top:'tube',topColor:'#fbf8f4',gloves:'white',bottom:'ruffle',bottomColor:'#fbf8f4',belt:'sequin',warmers:'white'},
{id:'c1',top:'corset',topColor:'#9c1224',bottom:'ruffle',bottomColor:'#fbf8f4',belt:'none',warmers:'none'},
{id:'c2',top:'tube',topColor:'#fbf8f4',gloves:'red',bottom:'vinyl',bottomColor:'#c0121f',belt:'studs',warmers:'none'},
{id:'c3',top:'halter',topColor:'#b0141f',gloves:'red',bottom:'shorts',bottomColor:'#f7f4ef',belt:'sequin',warmers:'none'},
{id:'c4',top:'fluffy',topColor:'#fbf8f4',bottom:'fur',bottomColor:'#6a1020',belt:'none',warmers:'none'},
{id:'c5',top:'tube',topColor:'#fbf8f4',bottom:'shorts',bottomColor:'#f7f4ef',belt:'sequin',warmers:'burgundy'},
{id:'c6',top:'corset',topColor:'#9c1224',gloves:'white',bottom:'shorts',bottomColor:'#7a1222',belt:'studs',warmers:'white'}];
export const hideNativeTimEmSafety=(m,o)=>/^tim-em-/.test(o?.style||'')&&(m.userData.excludeHatMua||m.userData.excludeHuntrix||/cream_undershorts/.test(m.name));
const textures=new Map();
function tex(kind){if(textures.has(kind))return textures.get(kind);const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,128,128);
 if(kind==='fur'){for(let j=0;j<2600;j++){const a=rand(j)*128,b=rand(j+5000)*128,l=3+rand(j+9000)*7,t=(rand(j+13000)-.5)*1.2;x.strokeStyle='rgba('+(rand(j+77)<.5?'120,110,105':'255,255,255')+','+(.10+rand(j+31)*.22)+')';x.lineWidth=1;x.beginPath();x.moveTo(a,b);x.lineTo(a+Math.sin(t)*l,b+Math.cos(t)*l);x.stroke();}}
 if(kind==='velvet'){for(let j=0;j<5000;j++){x.fillStyle='rgba(0,0,0,'+(.02+rand(j)*.07)+')';x.fillRect(rand(j+1)*128,rand(j+2)*128,1,1);}for(let i=0;i<128;i+=16){const gr=x.createLinearGradient(i,0,i+16,0);gr.addColorStop(0,'rgba(0,0,0,.10)');gr.addColorStop(.5,'rgba(255,255,255,.06)');gr.addColorStop(1,'rgba(0,0,0,.10)');x.fillStyle=gr;x.fillRect(i,0,16,128);}}
 if(kind==='sequin'){x.fillStyle='#d8d8d8';x.fillRect(0,0,128,128);for(let y=0;y<128;y+=6)for(let a=(y/6)%2*3;a<128;a+=6){const v=150+Math.floor(rand(a*31+y)*105);x.fillStyle='rgb('+v+','+v+','+v+')';x.beginPath();x.arc(a,y,2.6,0,7);x.fill();}}
 if(kind==='knit'){for(let a=0;a<128;a+=8)for(let y=0;y<128;y+=6){x.strokeStyle='rgba(120,110,100,.18)';x.beginPath();x.moveTo(a,y);x.lineTo(a+4,y+6);x.lineTo(a+8,y);x.stroke();}}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(kind==='sequin'?6:3,kind==='sequin'?2:3);textures.set(kind,t);return t;}
export function* buildTimEmStyles(variants,options){const records=new Map(),parts=[],timings=[];
for(const slot of ['top','bottom','shoes','accessory'])for(const[index,opt]of(options[slot]||[]).entries()){
 const match=/^tim-em-(?:crew-)?(1|c[1-6])-(top|bottom|shoes|accessory)$/.exec(opt.style||'');if(!match)continue;const spec=timEmSpecs.find(s=>s.id===match[1]);if(!spec)continue;
 const start=performance.now(),donor=variants[opt.variant],c=donorCache(donor),{body,hip,neck,pos,boneIndex,section,shell,floor,legQuery}=c,rec={id:opt.id,index,slot,meshes:[]};
 const phys=(color,o={})=>{const m=new T.MeshPhysicalMaterial({color,roughness:.65,clearcoat:.06,sheen:.3,side:T.DoubleSide,...o});m.emissive.set(color);m.emissiveIntensity=o.glow??.08;return m;};
 const memo=new Map(),once=(k,f)=>{if(!memo.has(k))memo.set(k,f());return memo.get(k);};
 const fur=(c,sheenColor='#ffffff')=>once('fur'+c+sheenColor,()=>{const m=phys(c,{roughness:.95,clearcoat:0,sheen:1,sheenRoughness:.6,sheenColor:new T.Color(sheenColor),glow:c==='#fbf8f4'||c==='#ffffff'?.22:.10});m.map=tex('fur');return m;});
 const velvet=c=>once('vel'+c,()=>{const m=phys(c,{roughness:.7,clearcoat:.05,sheen:1,sheenRoughness:.35,sheenColor:new T.Color('#ff6f80'),glow:.10});m.map=tex('velvet');return m;});
 const vinyl=c=>phys(c,{roughness:.18,clearcoat:1,clearcoatRoughness:.08,sheen:0,glow:.10});
 const sequin=()=>{const m=phys('#d4202e',{roughness:.28,metalness:.45,clearcoat:.7,sheen:0,glow:.12});m.map=tex('sequin');return m;};
 const silver=phys('#d6d8de',{roughness:.22,metalness:.8,clearcoat:.5,sheen:0,glow:.06}),gold=phys('#d8b46a',{roughness:.25,metalness:.7,sheen:0,glow:.06}),bootWhite=phys('#f6f4f0',{roughness:.35,clearcoat:.55,sheen:0,glow:.20}),sole=phys('#e9e6e0',{roughness:.6,glow:.12});
 const skin=new T.MeshToonMaterial({color:'#fff1df',emissive:'#bca98f',emissiveIntensity:.18,side:T.DoubleSide});
 function register(geo,m,owned=true){const mesh=new T.SkinnedMesh(geo,m);mesh.name=rec.id+'_'+rec.meshes.length;mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(body.skeleton,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;mesh.userData.sharedCrewGeometry=!owned;body.parent.add(mesh);rec.meshes.push(mesh);return mesh;}
 function weighted(geo,m,rigid=null){const pp=geo.attributes.position,si=[],sw=[],hips=boneIndex('hips'),spine=boneIndex('spine'),chest=boneIndex('chest'),upper=boneIndex('upperChest'),sp=pos('spine').y,ch=pos('chest').y,up=pos('upperChest').y;
  for(let i=0;i<pp.count;i++){if(rigid==='hips'&&slot==='bottom'&&pp.getY(i)<hip.y+.025){const w=T.MathUtils.smoothstep(hip.y+.025-pp.getY(i),0,.135)*.62,l=T.MathUtils.clamp(.5+pp.getX(i)/.10,0,1);si.push(hips,boneIndex('leftUpperLeg'),boneIndex('rightUpperLeg'),0);sw.push(1-w,w*l,w*(1-l),0);continue;}let a,b,w;if(rigid){a=b=boneIndex(rigid);w=0;}else{const y=pp.getY(i);if(y<sp){a=hips;b=spine;w=T.MathUtils.clamp((y-hip.y)/(sp-hip.y),0,1);}else if(y<ch){a=spine;b=chest;w=T.MathUtils.clamp((y-sp)/(ch-sp),0,1);}else{a=chest;b=upper;w=T.MathUtils.clamp((y-ch)/(up-ch),0,1);}}si.push(a,b,0,0);sw.push(1-w,w,0,0);}geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geo.computeVertexNormals();geo.computeBoundingSphere();return register(geo,m);}
 function grid(rows,cols,fn,m,rigid=null){const pp=[],uv=[],ii=[];for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){pp.push(...fn(j/rows,k/cols).toArray());uv.push(k/cols,j/rows);}for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;ii.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ii);return weighted(g,m,rigid);}
 function sphere(center,scale,m,rigid){const g=new T.SphereGeometry(1,8,6);g.scale(...scale);g.translate(...center.toArray());return weighted(g,m,rigid);}
 // legs: copy the body's skinning from the nearest skin triangle (boots, warmers, shorts hems follow the knee exactly)
 let query=null;function skinLike(mesh,side=null){const q=side?legQuery(side):(query=query||getTriangleQuery(geometryTriangles(body.geometry)));const g=mesh.geometry,p=g.attributes.position,si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight;for(let i=0;i<p.count;i++){const h=q.nearest(V().fromBufferAttribute(p,i));if(!h)continue;const bc=h.record.t.getBarycoord(h.point,V()),blend=[bc.x,bc.y,bc.z],all=new Map();for(let j=0;j<3;j++)for(let k=0;k<4;k++){const bi=si.getComponent(h.record.ids[j],k),w=sw.getComponent(h.record.ids[j],k)*blend[j];all.set(bi,(all.get(bi)||0)+w);}const best=[...all].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=best.reduce((n,x)=>n+x[1],0)||1;while(best.length<4)best.push([0,0]);g.attributes.skinIndex.setXYZW(i,...best.map(x=>x[0]));g.attributes.skinWeight.setXYZW(i,...best.map(x=>x[1]/sum));}return mesh;}
 const depths=new Map();function fitted(y,a,e=.008){const q=fitPoint(body,boneIndex,hip,neck,y,a,e);if(q)return V().set(q[0],y,q[1]);if(!depths.has(y)){const p=body.geometry.attributes.position;let lo=Infinity,hi=-Infinity;for(const id of new Set(body.geometry.index.array))if(Math.abs(p.getX(id))<.085&&Math.abs(p.getY(id)-y)<.018){lo=Math.min(lo,p.getZ(id));hi=Math.max(hi,p.getZ(id));}depths.set(y,Number.isFinite(lo)?[lo,hi]:[hip.z-.05,hip.z+.06]);}const d=depths.get(y),co=Math.cos(a),sn=Math.sin(a),rx=section(y)[0]+e;return V().set(co*rx,y,sn>=0?hip.z+Math.pow(Math.max(0,1-Math.pow(Math.abs(co),4)),.325)*(d[1]-hip.z+e):hip.z-Math.pow(-sn,.85)*(hip.z-d[0]+e));}
 // a fur band around the torso outline between y0 and y1: puffed in the middle, ragged edges, a few loose tufts
 function furBand(y0,y1,e,m,seed=0,cols=48){grid(4,cols,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(y0,y1,u)+(u===0||u===1?.003*Math.sin(a*13+seed):0),q=fitted(y,a,e+.010*Math.pow(Math.sin(u*Math.PI),.6)+.0025*Math.sin(a*17+u*5+seed));return q;},m);}
 // fluffy tube around a limb segment (leg warmers, glove cuffs), skinned like the limb
 function furTube(a,b,r0,r1,m,rows=8,cols=22,seed=0){const axis=b.clone().sub(a).normalize(),n=V().crossVectors(axis,V().set(0,0,1)).normalize(),bb=V().crossVectors(axis,n);return skinLike(grid(rows,cols,(u,v)=>{const ang=v*Math.PI*2,r=T.MathUtils.lerp(r0,r1,u)+.007*Math.pow(Math.sin(u*Math.PI),.5)+.0035*Math.sin(ang*9+u*7+seed)+.002*Math.sin(u*31+ang*3);return a.clone().lerp(b,u).addScaledVector(n,Math.cos(ang)*r).addScaledVector(bb,Math.sin(ang)*r);},m));}
 // leg warmers (owner 2026-11-11: "nhìn như bị tụt váy đỏ xuống chân"). They were 10 cm tubes round the bone, three times
 // her shin's width, so from the front the pair met in one band. Now each follows her own shin: at every height the skin
 // section (centre and half-widths, grown until the ellipse holds every skin point) plus a fur thickness that is a snug cuff
 // under the knee and slouches wider over the boot top, shaggy outline, ragged edges. From the front the two legs stay apart.
 function legWarmer(side,m,seed){
  const p=body.geometry.attributes.position,f=pos(side+'Foot'),kn=pos(side+'LowerLeg'),s=Math.sign(f.x),y0=floor+.066,y1=f.y+.86*(kn.y-f.y),rows=14,cols=40;
  const ids=[];for(const id of new Set(body.geometry.index.array)){const x=p.getX(id),y=p.getY(id);if(x*s>.005&&Math.abs(x-f.x)<.06&&y>y0-.03&&y<y1+.03)ids.push(id);}
  let secs=[];for(let j=0;j<=rows;j++){const y=T.MathUtils.lerp(y0,y1,j/rows),near=ids.filter(id=>Math.abs(p.getY(id)-y)<.014);if(!near.length){secs.push(null);continue;}
   let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const id of near){const x=p.getX(id),z=p.getZ(id);x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,z);z1=Math.max(z1,z);}
   const cx=(x0+x1)/2,cz=(z0+z1)/2,hx=Math.max(.008,(x1-x0)/2),hz=Math.max(.008,(z1-z0)/2);let k=1;for(const id of near)k=Math.max(k,Math.hypot((p.getX(id)-cx)/hx,(p.getZ(id)-cz)/hz));
   secs.push({cx,cz,hx:hx*k,hz:hz*k});}
  if(!secs.some(Boolean))secs=secs.map(()=>({cx:f.x,cz:f.z,hx:.018,hz:.03}));
  for(let j=0;j<=rows;j++)if(!secs[j]){let a=j,b=j;while(a>0&&!secs[a])a--;while(b<rows&&!secs[b])b++;secs[j]=secs[a]||secs[b];if(secs[a]&&secs[b]&&a!==b){const t=(j-a)/(b-a);secs[j]=Object.fromEntries(Object.keys(secs[a]).map(key=>[key,T.MathUtils.lerp(secs[a][key],secs[b][key],t)]));}}
  secs=secs.map((x,j)=>{const a=secs[Math.max(0,j-1)],b=secs[Math.min(rows,j+1)];return Object.fromEntries(Object.keys(x).map(key=>[key,.25*a[key]+.5*x[key]+.25*b[key]]));});
  const thick=u=>T.MathUtils.lerp(.024,.012,T.MathUtils.smoothstep(u,.04,.82))*(u>.9?T.MathUtils.lerp(1,.45,(u-.9)/.1):1)*(u<.05?T.MathUtils.lerp(.8,1,u/.05):1)+(u<.86?.0010*Math.sin(u*Math.PI*7):0);
  return skinLike(grid(rows,cols,(u,v)=>{const a=v*Math.PI*2,j=Math.round(u*rows),S=secs[j],t=thick(u),
   tuft=Math.min(1,t/.012)*(.0024*Math.sin(a*11+u*4+seed)+.0016*Math.sin(a*23+u*9+seed*2)+.0014*Math.sin(u*41+a*5)),r=t+tuft,
   y=T.MathUtils.lerp(y0,y1,u)-(j===0?.007*(.5+.5*Math.sin(a*17+seed)):0)+(j===rows?.005*(.5+.5*Math.sin(a*13+seed*3)):0);
   return V().set(S.cx+Math.cos(a)*(S.hx+r),y,S.cz+Math.sin(a)*(S.hz+r));},m),side);}
 const waist=hip.y+.062,bustTop=neck.y-.075;
 if(slot==='top'){
  register(shell('tim-skin-upper',(x,y)=>y>hip.y-.025&&y<neck.y+.035,.0015),skin,false);
  const cloth=spec.top==='corset'?velvet(spec.topColor):spec.top==='halter'?velvet(spec.topColor):spec.top==='fluffy'?(()=>{const m=phys(spec.topColor,{roughness:.9,sheen:.8,glow:.2});m.map=tex('knit');return m;})():phys(spec.topColor,{roughness:.75,sheen:.6,glow:.2});
  const low=waist-.012;
  if(spec.top==='tube'){grid(16,44,(u,v)=>{const a=v*Math.PI*2,top=bustTop+.006*Math.cos(a*2)-(Math.sin(a)<0?.004:0);return fitted(T.MathUtils.lerp(low,top,u),a,.006);},cloth);furBand(bustTop-.016,bustTop+.010,.006,fur('#fbf8f4'),1);furBand(low-.004,low+.016,.007,fur('#fbf8f4'),2);}
  if(spec.top==='corset'){grid(16,44,(u,v)=>{const a=v*Math.PI*2,front=Math.max(0,Math.sin(a)),top=bustTop+.012-.014*Math.pow(front,8)+.006*Math.pow(Math.abs(Math.cos(a)),3);return fitted(T.MathUtils.lerp(low-.008,top,u),a,.007);},cloth);
   for(const da of [-.62,-.30,.30,.62])grid(14,1,(u,v)=>fitted(T.MathUtils.lerp(low-.004,bustTop,u),Math.PI/2+da+(v-.5)*.012,.0085),once('seam',()=>phys('#6e0c18',{glow:.05})));
   for(let j=0;j<6;j++){const y=T.MathUtils.lerp(low+.006,bustTop-.010,j/5);sphere(fitted(y,Math.PI/2,.0105),[.0032,.0032,.0022],gold);}}
  if(spec.top==='halter'){grid(16,44,(u,v)=>fitted(T.MathUtils.lerp(low,neck.y-.030,u),v*Math.PI*2,.007),cloth);
   const nr=[];for(let j=0;j<=28;j++){const a=j/28*Math.PI*2;nr.push(fitted(neck.y-.030,a,.009));}grid(3,28,(u,v)=>{const q=nr[Math.round(v*28)].clone();q.y+=u*.022;const s=1-.18*u;q.x*=s;q.z=hip.z+(q.z-hip.z)*s;return q;},cloth);}
  if(spec.top==='fluffy'){grid(16,44,(u,v)=>fitted(T.MathUtils.lerp(low,neck.y-.030,u),v*Math.PI*2,.007),cloth);for(const side of ['left','right'])register(armShell(body,boneIndex,side,{lower:true,offset:.007}),cloth,false);furBand(neck.y-.048,neck.y-.022,.010,fur('#fbf8f4'),3);
   for(const side of ['left','right']){const el=pos(side+'LowerArm'),hand=pos(side+'Hand');furTube(el.clone().lerp(hand,.70),el.clone().lerp(hand,.98),armRadius(body,boneIndex,side,el,hand,.75,'lower')+.006,armRadius(body,boneIndex,side,el,hand,.95,'lower')+.008,fur('#fbf8f4'),5,18,side==='left'?4:5);}}
  if(spec.gloves==='red')for(const side of ['left','right'])register(shell('tim-glove-red-'+side,(x,y,z,w)=>w>.5,.0035,[side+'LowerArm',side+'Hand']),velvet('#b0141f'),false);
  if(spec.gloves==='white')for(const side of ['left','right']){register(shell('tim-glove-white-'+side,(x,y,z,w)=>w>.5,.0035,[side+'LowerArm',side+'Hand']),phys('#f8f6f2',{roughness:.8,glow:.22}),false);const el=pos(side+'LowerArm'),hand=pos(side+'Hand');furTube(el.clone().lerp(hand,.08),el.clone().lerp(hand,.30),armRadius(body,boneIndex,side,el,hand,.15,'lower')+.007,armRadius(body,boneIndex,side,el,hand,.30,'lower')+.007,fur('#fbf8f4'),5,18,side==='left'?6:7);}
 }
 if(slot==='bottom'){
  const light=/^#f/i.test(spec.bottomColor),bc=spec.bottom==='vinyl'?vinyl(spec.bottomColor):spec.bottom==='ruffle'?fur(spec.bottomColor):light?once('cloth'+spec.bottomColor,()=>phys(spec.bottomColor,{roughness:.7,sheen:.4,glow:.22})):velvet(spec.bottomColor);
  const short=spec.bottom==='shorts',lining=short?bc:phys(spec.bottomColor,{roughness:.8,glow:.12});
  // the rose donor's own pink undershorts (skirt-safety.js: hip-.15..hip+.10, +8 mm) show under every rose-donor bottom unless
  // wardrobe.js/crew.js hide them per family; without that shared hook they are covered here: lining +10 mm down to the hem,
  // then her own thigh skin lifted 9.5 mm down past the undershorts' edge.
  const hemY=short?hip.y-.092:spec.bottom==='ruffle'?waist-.148:spec.bottom==='vinyl'?waist-.135:waist-.120;
  register(shell('tim-inner-'+spec.id,(x,y)=>y<waist+.004&&y>hemY+(short?0:.010),.010),lining,false);
  register(shell('tim-thigh-'+(short?'s':spec.bottom),(x,y)=>y>hip.y-.160&&y<hemY+(short?.008:.020),.0095),skin,false);
  if(short){for(const side of ['left','right']){const up=pos(side+'UpperLeg'),kn=pos(side+'LowerLeg'),t=(hip.y-.087-up.y)/(kn.y-up.y),cx=up.clone().lerp(kn,t);skinLike(grid(2,26,(u,v)=>{const a=v*Math.PI*2,r=.058+.004*u;return V().set(cx.x+Math.cos(a)*r,hip.y-.080-u*.014,cx.z+Math.sin(a)*r*1.05);},bc));}}
  if(spec.bottom==='ruffle'){for(let k=0;k<3;k++){const y0=waist-.010-k*.040,len=.058;grid(6,64,(u,v)=>{const a=v*Math.PI*2,y=y0-u*len,q=fitted(Math.max(y0,hip.y-.020),a,.012+.006*k),fl=.010+k*.010+.020*u+.006*Math.sin(a*16+k)*u;return V().set(q.x+Math.cos(a)*fl,y+.004*Math.sin(a*11+k*2)*u,q.z+Math.sin(a)*fl);},bc,'hips');}}
  if(spec.bottom==='vinyl'||spec.bottom==='fur'){const len=spec.bottom==='fur'?.120:.135;grid(10,56,(u,v)=>{const a=v*Math.PI*2,y=waist-u*len,q=fitted(waist,a,.012),fl=.022*u+(spec.bottom==='fur'?.004*Math.sin(a*19)*u:0);return V().set(q.x+Math.cos(a)*fl,y,q.z+Math.sin(a)*fl);},bc,'hips');
   if(spec.bottom==='fur')grid(2,56,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.034);return V().set(q.x*.98,waist-len-.004+u*.010+.003*Math.sin(a*23),q.z);},bc,'hips');}
  if(spec.belt!=='none'){const belt=spec.belt==='sequin'?sequin():phys('#e9e9ec',{roughness:.5,glow:.15});grid(3,48,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.016+(spec.bottom==='ruffle'?.006:0));q.y=waist+.004-u*.018-.010*Math.max(0,Math.sin(a))*0;return q;},belt,'hips');
   const f=fitted(waist-.005,Math.PI/2,.021+(spec.bottom==='ruffle'?.006:0));if(spec.belt==='studs'){for(let j=0;j<16;j++){const a=Math.PI/2+(j-7.5)*.17;sphere(fitted(waist-.005,a,.020),[.0028,.0028,.002],silver,'hips');}}
   const bk=new T.TorusGeometry(.009,.0018,4,14);bk.scale(1.4,.9,1);bk.translate(f.x,f.y,f.z);weighted(bk,silver,'hips');}
 }
 if(slot==='shoes'){
  register(shell('tim-legs',(x,y)=>y>floor&&y<hip.y-.105,.0005),skin,false);
  const knee=pos('leftLowerLeg').y,lace=spec.warmers==='none';
  // boots: her shin/foot skin lifted, white patent; lace-up boots (no warmers) reach just under the knee
  register(shell('tim-boot-'+(lace?'tall':'short'),(x,y)=>y>floor-.01&&y<(lace?knee-.045:floor+.13),.004),bootWhite,false);
  for(const side of ['left','right']){const f=pos(side+'Foot'),kn=pos(side+'LowerLeg');
   skinLike(grid(2,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.040,floor+.004+u*.012,f.z+.030+Math.sin(a)*.078);},sole),side);
   // the platform's top, so the sole is solid (alone in the shop picture it showed as an empty ring round the foot)
   skinLike(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.040*u,floor+.016,f.z+.030+Math.sin(a)*.078*u);},sole),side);
   if(lace)for(let j=0;j<6;j++){const y=T.MathUtils.lerp(floor+.07,knee-.07,j/5),cx=f.clone().lerp(kn,(y-f.y)/(kn.y-f.y));skinLike(grid(1,4,(u,v)=>V().set(cx.x+(v-.5)*.026,y+(u-.5)*.003+(v-.5)*.004*(j%2?1:-1),cx.z+.040+.004),phys('#ffffff',{glow:.25})),side);}
   if(!lace)legWarmer(side,spec.warmers==='white'?fur('#fbf8f4'):fur('#6a1020','#c06a7c'),side==='left'?8:9);}
 }
 if(slot==='accessory'&&spec.lead){const head=pos('head'),center=V().set(head.x,1.214,head.z-.012),wf=fur('#fbf8f4');
  grid(10,40,(u,v)=>{const a=v*Math.PI*2,r=Math.sin(u*Math.PI*.5+.02),ry=.070*Math.cos(u*Math.PI*.5);return center.clone().add(V().set(Math.cos(a)*.112*r,ry*.62+.004*Math.sin(a*9),Math.sin(a)*.104*r));},wf,'head');
  grid(4,48,(u,v)=>{const a=v*Math.PI*2,b=Math.sin(u*Math.PI);return center.clone().add(V().set(Math.cos(a)*(.115+.016*b+.003*Math.sin(a*13)),-.012+u*.026,Math.sin(a)*(.107+.016*b+.003*Math.sin(a*13))));},wf,'head');
  sphere(center.clone().add(V().set(.030,.050,-.020)),[.020,.020,.020],wf,'head');}
 const groups=new Map();for(const m of rec.meshes){if(m.userData.sharedCrewGeometry)continue;const g=m.geometry,key=m.material.uuid+'|'+Object.entries(g.attributes).map(([k,a])=>k+a.itemSize+a.array.constructor.name).sort().join(',')+'|'+g.index?.array.constructor.name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}for(const ms of groups.values())if(ms.length>1){const g=mergeGeometries(ms.map(m=>m.geometry),false);if(!g)throw Error('Tìm em geometry schema mismatch');ms[0].geometry.dispose();ms[0].geometry=g;for(const m of ms.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
 rec.buildMs=performance.now()-start;records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});timings.push({slot,ms:rec.buildMs,meshes:rec.meshes.length});yield;
}return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
export function createTimEmStyles(...args){const it=buildTimEmStyles(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
