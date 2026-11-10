import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Hair of the four Secret singers (owner 2026-11-10 poster: "được thì tạo hình dáng và mặt mũi giống ảnh này").
//  m1 copper-brown, textured and swept up, a few strands falling on the forehead
//  m2 dark brown pompadour: volume swept up and back, forehead open, short sides
//  m3 chocolate mushroom cut: a full heavy fringe down to the brows, rounded volume
//  m4 near-black, fluffy, a fringe swept across to his left, the right side of the forehead open
// Built like boy-hair.js: the donor's fitted scalp as the base + tapered locks laid on a head ellipsoid (rigid to the head).
const styles={
 'star-hair-m1':{color:'#7d4024',label:'Secret · tóc nâu đồng vuốt dựng'},
 'star-hair-m2':{color:'#33201a',label:'Secret · tóc vuốt ngược bồng'},
 'star-hair-m3':{color:'#3d281d',label:'Secret · tóc nấm mái dày'},
 'star-hair-m4':{color:'#241b1b',label:'Secret · tóc bồng mái lệch'}
};
export const starHairOptions=()=>({hair:Object.entries(styles).map(([id,s])=>({id,style:id,variant:1,crewOnly:true,label:s.label}))});
function material(hex){const c=document.createElement('canvas');c.width=512;c.height=64;const x=c.getContext('2d'),im=x.createImageData(512,64),col=new T.Color(hex);col.convertLinearToSRGB();
 for(let y=0;y<64;y++)for(let i=0;i<512;i++){const fine=Math.sin(i*.47)+.6*Math.sin(i*1.71)+.45*Math.sin(i*.115),shine=Math.pow(Math.max(0,Math.cos(i/512*Math.PI*2)),8),k=.80+.11*fine+.20*shine,j=(y*512+i)*4;
  im.data[j]=255*Math.min(1,col.r*k);im.data[j+1]=255*Math.min(1,col.g*k);im.data[j+2]=255*Math.min(1,col.b*k);im.data[j+3]=255;}
 x.putImageData(im,0,0);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=T.RepeatWrapping;
 return new T.MeshPhysicalMaterial({map,color:0xffffff,roughness:.48,metalness:0,clearcoat:.15,clearcoatRoughness:.4,sheen:.4,sheenRoughness:.5,sheenColor:new T.Color(hex).lerp(new T.Color('#ffffff'),.35),side:T.DoubleSide});}
export function* buildStarHair(variants,opts){
 const records=new Map(),parts=[],timings=[];
 for(const [index,opt] of (opts.hair||[]).entries()){
  const st=styles[opt.style];if(!st)continue;const kind=opt.style.slice(-2);
  const v=variants[opt.variant],body=v.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),sk=body.skeleton,start=performance.now(),head=sk.bones.findIndex(b=>b.name===v.vrm.humanoid.getRawBoneNode('head').name),geos=[];
  let seed=index*131+17;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function add(g){const p=g.attributes.position,si=[],sw=[];for(let i=0;i<p.count;i++){si.push(head,0,0,0);sw.push(1,0,0,0);}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geos.push(g);}
  // head ellipsoid (fitted to her hairlines: forehead z .145, crown y 1.29, sides x .15, back z -.185); th elevation, ph azimuth (0 front, + her left)
  const C=new T.Vector3(0,1.135,-.02),R=[.150,.155,.165],D=Math.PI/180;
  const at=(th,ph,lift)=>new T.Vector3(C.x+R[0]*Math.cos(th*D)*Math.sin(ph*D)*lift,C.y+R[1]*Math.sin(th*D)*lift,C.z+R[2]*Math.cos(th*D)*Math.cos(ph*D)*lift);
  // a lock: flat ribbon lying on the head (wide across the surface, thin along the normal), round root, pointed tip
  function lock(pts,w,dd,taper=.08){const curve=new T.CatmullRomCurve3(pts),rows=20,cols=10,P=[],UV=[],IX=[];
   for(let j=0;j<=rows;j++){const u=j/rows,p=curve.getPoint(u),t=curve.getTangent(u),nrm=p.clone().sub(C).normalize(),a=new T.Vector3().crossVectors(t,nrm).normalize(),b=new T.Vector3().crossVectors(a,t).normalize(),k=(.6+.4*Math.sin(Math.min(1,u/.12)*Math.PI/2))*(1-(1-taper)*Math.pow(u,2.0));
    for(let i=0;i<=cols;i++){const q=i/cols*Math.PI*2,pp=p.clone().addScaledVector(a,Math.cos(q)*w*k).addScaledVector(b,Math.sin(q)*dd*k);P.push(pp.x,pp.y,pp.z);UV.push(i/cols,u);}}
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i;IX.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('uv',new T.Float32BufferAttribute(UV,2));g.setIndex(IX);g.computeVertexNormals();add(g);}
  const path=(keys)=>keys.map(([th,ph,l])=>at(th,ph,l)),C2=t=>Math.max(-10,Math.min(22,t));
  // base: the donor's fitted scalp (HairBack), lifted 3 mm, kept short
  const src=v.parts.hair.find(m=>/HairBack/.test([].concat(m.material)[0]?.name));
  if(src){const lowCut=kind==='m3'?1.04:1.058,scalp=src.geometry.clone();scalp.clearGroups();scalp.computeVertexNormals();const sp=scalp.attributes.position,sn=scalp.attributes.normal,suv=[];
   for(let i=0;i<sp.count;i++){sp.setXYZ(i,sp.getX(i)+sn.getX(i)*.003,sp.getY(i)+sn.getY(i)*.003,sp.getZ(i)+sn.getZ(i)*.003);suv.push(.5+Math.atan2(sp.getX(i),sp.getZ(i)+.02)/(2*Math.PI),(sp.getY(i)-.95)/.29);}
   scalp.setAttribute('uv',new T.Float32BufferAttribute(suv,2));const keep=[],ix=scalp.index;
   for(let i=0;i<ix.count;i+=3){const a=ix.getX(i),b=ix.getX(i+1),c=ix.getX(i+2);if([a,b,c].every(id=>{const y=sp.getY(id),z=sp.getZ(id);return y>lowCut&&!(z>.035&&y<(kind==='m3'?1.10:1.135));}))keep.push(a,b,c);}scalp.setIndex(keep);add(scalp);}
  // shared: tapered back down to the nape, neat sides above the ears
  const back=(lift=1.05,low=-40)=>{for(let k=0;k<13;k++){const ph=180-62+k*10.3+(rnd()-.5)*4;lock(path([[72,ph,lift-.01],[30,ph,lift+.01],[0,ph,lift-.005],[low+(k%2)*5,ph,lift-.025]]),.021,.008,.10);}};
  const sides=(lift=1.04,low=-22,over=0)=>{for(const s of [1,-1])for(let k=0;k<6;k++){const ph=s*(58+k*10);lock(path([[62,ph,lift],[25,ph+s*2,lift+.01],[low-(k%2)*4+over,ph+s*3,lift-.015]]),.018,.007,.08);}};
  const crown=(lift,n=16,to=42)=>{for(let k=0;k<n;k++){const ph=k*360/n+(rnd()-.5)*8;lock(path([[89,ph,lift-.03],[68,ph+4,lift],[to,ph+8,lift-.01]]),.024,.008,.12);}};
  if(kind==='m3'){// mushroom: rounded volume, heavy fringe to the brows, temples and ears half covered
   crown(1.10,18,30);back(1.07,-44);sides(1.07,-34,-6);
   for(let k=0;k<17;k++){const ph=(k-8)*7.6,tip=-13+Math.abs(ph)*.12+(rnd()-.5)*3;lock(path([[78,ph*.5,1.08],[52,ph*.85,1.14],[22,ph,1.13],[tip,ph*1.06,1.075]]),.0215,.0085,.09);}
   for(const s of [1,-1])for(let k=0;k<3;k++){const ph=s*(66+k*9);lock(path([[60,ph,1.10],[20,ph,1.11],[-30-k*4,ph+s*4,1.06]]),.021,.008,.10);}
  }else if(kind==='m4'){// fluffy, fringe swept across to his left; his right forehead open
   crown(1.12,16,36);back(1.07,-36);sides(1.055,-12);
   for(let k=0;k<17;k++){const p0=-50+k*6.0,sweep=30,tip=2+(-p0)*.28+(rnd()-.5)*4;lock(path([[80,p0*.45,1.11],[56,p0*.8,1.17],[30,p0+sweep*.55,1.15],[C2(tip),p0+sweep,1.085]]),.0205,.0085,.08);}
   for(let k=0;k<5;k++){const ph=-24+k*10;lock(path([[88,ph-20,1.14],[72,ph-6,1.20],[52,ph+8,1.17]]),.024,.010,.14);}
  }else if(kind==='m2'){// pompadour: up and back from the hairline, forehead open, short sides
   crown(1.05,14,44);back(1.04,-30);sides(1.03,2);
   for(let k=0;k<30;k++){const ph=(k-14.5)*3.7+(rnd()-.5)*2,h=1.25+.05*Math.cos(ph*D*2.4)+(rnd()-.5)*.035,sw=ph<-8?-4:5;lock(path([[23,ph,1.010],[34,ph+sw*.3,h-.05],[48,ph+sw*.7,h],[68,ph+sw,h-.05],[94,ph+sw*1.2,1.10],[120,ph+sw*1.2,1.04]]),.0125,.0065,.10);}
   for(let k=0;k<9;k++){const ph=-28+k*7;lock(path([[30,ph,1.06],[44,ph+3,1.29],[60,ph+6,1.28],[84,ph+8,1.15]]),.016,.008,.16);}
  }else{// m1: textured, swept up with spiky ends, a few strands on the forehead
   crown(1.08,16,42);back(1.045,-30);sides(1.035,0);
   for(let k=0;k<14;k++){const ph=(k-6.5)*7.6+(rnd()-.5)*6,h=1.22+rnd()*.07;lock(path([[24,ph,1.02],[40,ph+4,h-.05],[58,ph+9+(rnd()-.5)*10,h],[70+rnd()*8,ph+14+(rnd()-.5)*16,h+.02]]),.0205,.0085,.06);}
   for(let k=0;k<9;k++){const ph=(rnd()-.5)*90,th=60+rnd()*25;lock(path([[th,ph,1.10],[th+8,ph+6,1.22],[th+14,ph+10+(rnd()-.5)*12,1.27]]),.017,.007,.05);}
   for(const [ph,low] of [[-14,4],[-6,10],[10,6]])lock(path([[34,ph,1.05],[22,ph+3,1.075],[low,ph+6,1.065]]),.009,.004,.05);
  }
  const geo=mergeGeometries(geos,false);for(const g of geos)g.dispose();geo.computeBoundingSphere();
  const mesh=new T.SkinnedMesh(geo,material(st.color));mesh.name=opt.id+'_star';mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(sk,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;body.parent.add(mesh);
  const rec={id:opt.id,index,slot:'hair',meshes:[mesh],buildMs:performance.now()-start};records.set('hair:'+index,rec);parts.push({slot:'hair',variant:index,donor:opt.variant,mesh});timings.push({id:opt.id,index,milliseconds:rec.buildMs,meshes:1});yield;
 }
 return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){for(const p of parts)p.mesh.visible=false;}};
}
