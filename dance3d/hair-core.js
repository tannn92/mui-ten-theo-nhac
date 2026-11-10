import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const palette={rumi:'#926eb8',mira:'#ca347f',zoey:'#171923'};
export const options={hair:[{id:'huntrix-rumi-hair',style:'huntrix-rumi-hair',variant:1,label:'Rumi · tóc tím tết nổi từ trán'},{id:'huntrix-mira-hair',style:'huntrix-mira-hair',variant:1,label:'Mira · tóc hồng hai chùm'},{id:'huntrix-zoey-hair',style:'huntrix-zoey-hair',variant:1,label:'Zoey · tóc đen hai búi thấp'},{id:'golden-zoey-hair',style:'golden-zoey-hair',variant:1,label:'Golden · Zoey · tóc đen hai búi thấp'}]};
function material(kind){const c=document.createElement('canvas');c.width=512;c.height=64;const x=c.getContext('2d'),im=x.createImageData(512,64),col=new T.Color(palette[kind]);col.convertLinearToSRGB();for(let y=0;y<64;y++)for(let i=0;i<512;i++){const fine=Math.sin(i*.47)+.6*Math.sin(i*1.71)+.45*Math.sin(i*.115),shine=Math.pow(Math.max(0,Math.cos(i/512*Math.PI*2)),8),k=.78+.115*fine+.14*shine,j=(y*512+i)*4;im.data[j]=255*col.r*k;im.data[j+1]=255*col.g*k;im.data[j+2]=255*col.b*k;im.data[j+3]=255;}x.putImageData(im,0,0);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=T.RepeatWrapping;return new T.MeshPhysicalMaterial({map,color:0xffffff,roughness:.51,metalness:0,clearcoat:.08,clearcoatRoughness:.4,side:T.DoubleSide});}
export function* buildHair(variants,opts,which='all'){
 const records=new Map(),parts=[],timings=[];
 for(const[index,opt]of(opts.hair||[]).entries()){
  if(!/^(huntrix-(rumi|mira|zoey)|golden-zoey)-hair$/.test(opt.style||''))continue;
  if(which==='golden'&&!opt.style.startsWith('golden-'))continue;if(which==='huntrix'&&!opt.style.startsWith('huntrix-'))continue;
  const kind=opt.style.split('-')[1],v=variants[opt.variant],body=v.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),sk=body.skeleton,start=performance.now(),bone=n=>sk.bones.findIndex(b=>b.name===v.vrm.humanoid.getRawBoneNode(n).name),head=bone('head'),chest=bone('upperChest'),hips=bone('hips'),geos=[];
  function add(g,rigid=true){const p=g.attributes.position,si=[],sw=[];for(let i=0;i<p.count;i++){const y=p.getY(i),h=rigid?0:T.MathUtils.smoothstep(.87-y,0,.46)*.65,c=rigid?0:T.MathUtils.smoothstep(1.02-y,0,.25)*.32;si.push(head,chest,hips,0);sw.push((1-c)*(1-h),c*(1-h),h,0);}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geos.push(g);}
  function grid(rows,cols,fn,rigid=true){const p=[],uv=[],ix=[];for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){p.push(...fn(j/rows,i/cols));uv.push(i/cols,j/rows);}for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i;ix.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();add(g,rigid);}
  function lock(points,w,d,rigid=true,taper=.15){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));grid(Math.max(32,points.length*3),12,(u,q)=>{const p=curve.getPoint(u),t=curve.getTangent(u),a=new T.Vector3().crossVectors(t,new T.Vector3(0,0,1)).normalize();if(a.lengthSq()<.1)a.set(1,0,0);const b=new T.Vector3().crossVectors(a,t).normalize(),k=(.32+.68*Math.sin(Math.min(1,u/.10)*Math.PI/2))*(1-(1-taper)*Math.pow(u,7));return p.addScaledVector(a,Math.cos(q*Math.PI*2)*w*k).addScaledVector(b,Math.sin(q*Math.PI*2)*d*k).toArray();},rigid);}
  // Reuse only the fitted closed scalp surface (no donor fringe/buns/panels).
  const scalpSource=v.parts.hair.find(m=>/HairBack/.test([].concat(m.material)[0]?.name));
  const scalp=scalpSource.geometry.clone();scalp.clearGroups();const sp=scalp.attributes.position,suv=[];for(let i=0;i<sp.count;i++){if(kind==='rumi'&&sp.getY(i)>1.16){const f=(1-T.MathUtils.smoothstep(Math.abs(sp.getX(i)),.02,.065))*T.MathUtils.smoothstep(sp.getY(i),1.16,1.22);sp.setY(i,sp.getY(i)+.047*f);}if(kind==='mira'&&sp.getZ(i)>.045&&sp.getY(i)>1.10){const f=T.MathUtils.smoothstep(sp.getZ(i),.045,.11)*(1-T.MathUtils.smoothstep(Math.abs(sp.getX(i)),.02,.10))*(1-T.MathUtils.smoothstep(sp.getY(i),1.18,1.23));sp.setY(i,sp.getY(i)+.019*f);}suv.push(.5+Math.atan2(sp.getX(i),sp.getZ(i)+.02)/(2*Math.PI),(sp.getY(i)-.95)/.29);}scalp.computeVertexNormals();scalp.setAttribute('uv',new T.Float32BufferAttribute(suv,2));add(scalp,true);
  function bun(cx,cy,cz,rx,ry,rz){grid(24,48,(u,q)=>{const t=u*Math.PI,a=q*Math.PI*2,r=1+.075*Math.cos(a*7+u*10);return[cx+rx*.88*Math.sin(t)*Math.cos(a)*r,cy+ry*.88*Math.cos(t),cz+rz*.88*Math.sin(t)*Math.sin(a)*r];});for(let k=0;k<4;k++){const pts=[];for(let j=0;j<=28;j++){const u=j/28,a=u*Math.PI*1.7+k*Math.PI/2;pts.push([cx+rx*.78*Math.cos(a),cy+ry*.74*Math.sin(a),cz+rz*.52*Math.cos(a*.5+k)]);}lock(pts,rx*.22,rz*.20,true,.65);}}
  if(kind==='rumi'){
   // One continuous three-strand Dutch braid: forehead -> raised crown -> nape -> tail.
   const path=new T.CatmullRomCurve3([[0,1.158,.120],[0,1.244,.100],[0,1.282,.055],[0,1.285,-.025],[0,1.255,-.112],[0,1.185,-.176],[0,1.08,-.195],[0,.78,-.195],[0,.34,-.185]].map(p=>new T.Vector3(...p)));
   const plen=path.getLength();
   for(let strand=0;strand<3;strand++){const ps=[];for(let j=0;j<=170;j++){const u=j/170,c=path.getPointAt(u),t=path.getTangentAt(u),n=new T.Vector3(0,-t.z,t.y).normalize(),a=u*plen/.105*Math.PI*2+strand*Math.PI*2/3,root=T.MathUtils.smoothstep(u,0,.025),r=(c.y>1.13?.035:T.MathUtils.lerp(.014,.028,T.MathUtils.smoothstep(c.y,.34,1.13)))*root;c.x+=r*Math.sin(a);c.addScaledVector(n,.016*Math.sin(2*a)*root);ps.push(c.toArray());}lock(ps,.021,.017,false,.35);}
   for(let j=0;j<6;j++)lock([[(j-2.5)*.004,.36,-.18],[(j-2.5)*.004,.29,-.18],[(j-2.5)*.003,.25,-.16]],.006,.004,false,.04);
  }else if(kind==='mira'){
   // Broad smooth straight back curtain, 11 overlapping ribbons with tapered tips.
   for(let j=0;j<11;j++){const x=(j-5)*.022,z=-.05-.13*Math.sqrt(Math.max(.1,1-(x/.14)**2));lock([[x*.40,1.18,z*.50],[x*.8,1.13,z*.95],[x,1.10,z],[x*1.10,.84,z-.018],[x*1.14,.54+.013*Math.cos(j),z+.015]],.023,.009,false,.12);}
   for(const s of[-1,1]){
    for(let j=0;j<3;j++)lock([[s*.070,1.194,-.065],[s*(.112+j*.006),1.198,-.105],[s*(.139+j*.006),1.10,-.14],[s*(.15+j*.005),.59+j*.008,-.11]],.010,.007,false,.12);
    lock([[s*.004,1.224,.075],[s*.080,1.172,.122],[s*.119,1.105,.105],[s*.123,.990,.090],[s*.115,.905,.083]],.014,.008,true,.03);
    for(let k=0;k<4;k++)lock([[s*.004,1.222,.075],[s*(.035+k*.012),1.201-k*.004,.120],[s*(.105+k*.004),1.145,.120],[s*(.123+k*.003),1.015,.092],[s*(.115+k*.004),.905+k*.008,.085]],.013,.005,true,.03);
   }
  }else{
   // Blunt full fringe hugs forehead; two longer locks end at collarbone.
   grid(24,40,(u,q)=>{const x=(q-.5)*.23*(.08+.92*Math.sin(u*Math.PI/2));return[x,1.229-.116*u-.014*(x/.115)**2*(1-u),-.005+.146*Math.sin(u*Math.PI/2)-.029*(x/.115)**2];});
   for(let k=0;k<19;k++){const x=(k-9)*.011;lock([[x*.15,1.228,.005],[x*.70,1.19,.102],[x,1.145,.139-.015*(x/.1)**2],[x,1.111+.002*Math.sin(k),.143-.018*(x/.1)**2]],.006,.002,true,.45);}
   for(const s of[-1,1]){
    lock([[s*.055,1.213,.066],[s*.127,1.145,.135],[s*.144,1.045,.113],[s*.143,.922,.092],[s*.123,.887,.067]],.012,.006,true,.05);
    bun(s*.098,1.012,-.119,.047,.041,.039);
   }
  }
  const geo=mergeGeometries(geos,false);for(const g of geos)g.dispose();geo.computeBoundingSphere();const mesh=new T.SkinnedMesh(geo,material(kind));mesh.name=opt.id+'_wig';mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(sk,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;body.parent.add(mesh);const rec={id:opt.id,index,slot:'hair',meshes:[mesh],buildMs:performance.now()-start};records.set('hair:'+index,rec);parts.push({slot:'hair',variant:index,donor:opt.variant,mesh});timings.push({id:opt.id,index,milliseconds:rec.buildMs,meshes:1});yield;
 }
 return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){for(const p of parts)p.mesh.visible=false;}};
}
