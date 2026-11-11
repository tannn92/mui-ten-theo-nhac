import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Hair of the four LAVIEM singers (owner 2026-11-11, poster left->right CAPTAIN BOY, Pháp Kiều, Quang Hùng MasterD, CoolKid).
//  m1 CAPTAIN BOY  platinum white, short sides, a messy spiky top (pieces up and forward), a few short fringe flicks
//  m2 Pháp Kiều    black, a centre part with a long curtain fringe framing the face to the cheekbones, sides over the ears
//  m3 Quang Hùng   black, tousled volume brushed up, a piecey fringe swept to his right, forehead partly open (this video)
//  m4 CoolKid      a big peach-blond curly baroque judge wig: rows of sausage curls from the crown down to the shoulders
// Same kit as star-hair.js: the donor's fitted scalp + tapered clumps on a head ellipsoid, rigid to the head bone, MToon shading.
const styles={
 'laviem-hair-m1':{label:'CAPTAIN BOY · tóc bạch kim dựng',top:'#fbfaf6',mid:'#ebe6dc',low:'#b8ae9f',ring:.10,grain:1.2,front:1.13,side:1.075,back:1.02},
 'laviem-hair-m2':{label:'Pháp Kiều · tóc đen rẽ ngôi giữa',top:'#2b2427',mid:'#1a1517',low:'#0f0c0d',ring:.18,grain:1.3,front:1.16,side:1.06,back:1.0},
 'laviem-hair-m3':{label:'Quang Hùng · tóc đen mái dày',top:'#2a2224',mid:'#191516',low:'#100d0e',ring:.12,grain:1.6,front:1.10,side:1.075,back:1.0},
 'laviem-hair-m4':{label:'CoolKid · tóc giả xoăn kiểu quan toà',top:'#f6e2cc',mid:'#ebc6a6',low:'#d2a283',ring:.06,grain:.8,front:1.19,side:1.05,back:1.0}
};
export const laviemHairOptions=()=>({hair:Object.entries(styles).map(([id,s])=>({id,style:id,variant:1,crewOnly:true,label:s.label}))});
const L0=(a,b,t)=>a+(b-a)*t,YT=1.36,YB=.98,S=(x,a,b)=>T.MathUtils.smoothstep(x,a,b);
// colour by height (v 0 = top of the hair, 1 = nape), fine strands across each clump, a soft light ring on the crown
function ramp(st){const W=256,H=256,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d'),im=x.createImageData(W,H),
 c=[st.top,st.mid,st.low].map(h=>new T.Color(h).convertLinearToSRGB()),rv=(YT-1.245)/(YT-YB);
 for(let j=0;j<H;j++){const v=j/(H-1),base=c[0].clone().lerp(c[1],S(v,0,.42)).lerp(c[2],S(v,.42,1)),ring=Math.exp(-Math.pow((v-rv)/.05,2))*st.ring;
  for(let i=0;i<W;i++){const u=i/W,g=st.grain??1,str=1-.07*g+g*(.06*Math.sin(u*Math.PI*14+Math.sin(u*31)*.8)+.04*Math.sin(u*Math.PI*38)+.03*Math.sin(u*Math.PI*86+1.3)),out=Math.max(0,Math.sin(u*Math.PI*2)),k=str*(1+ring*out*1.3),o=(j*W+i)*4;
   im.data[o]=255*Math.min(1,base.r*k+ring*out*.09);im.data[o+1]=255*Math.min(1,base.g*k+ring*out*.075);im.data[o+2]=255*Math.min(1,base.b*k+ring*out*.07);im.data[o+3]=255;}}
 x.putImageData(im,0,0);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.wrapS=T.RepeatWrapping;t.flipY=false;return t;}
function hairMaterial(v,tex){const all=v.parts.hair.map(m=>[].concat(m.material)[0]).filter(m=>m?.isMToonMaterial),src=all.find(m=>/_Hair_00_HAIR/.test(m.name))||all[0];
 if(src)try{const m=src.clone();m.name='LaviemHair';m.map=tex;m.shadeMultiplyTexture=tex;m.color.setRGB(1,1,1);m.shadeColorFactor.setRGB(.70,.62,.66);m.side=T.DoubleSide;m.needsUpdate=true;return m;}catch(e){console.warn('star hair toon',e);}
 return new T.MeshToonMaterial({map:tex,side:T.DoubleSide});}
export function* buildLaviemHair(variants,opts){
 const records=new Map(),parts=[],timings=[];
 for(const [index,opt] of (opts.hair||[]).entries()){
  const st=styles[opt.style];if(!st)continue;const kind=opt.style.slice(-2);
  const v=variants[opt.variant],body=v.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),sk=body.skeleton,start=performance.now(),head=sk.bones.findIndex(b=>b.name===v.vrm.humanoid.getRawBoneNode('head').name),geos=[];
  let seed=index*131+17+kind.charCodeAt(1)*7;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;},J=a=>(rnd()-.5)*a;
  function add(g){const p=g.attributes.position,si=[],sw=[];for(let i=0;i<p.count;i++){si.push(head,0,0,0);sw.push(1,0,0,0);}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geos.push(g);}
  // head ellipsoid (fitted to her hairlines: forehead z .145, crown y 1.29, sides x .15, back z -.185); th elevation, ph azimuth (0 front, + his left)
  const C=new T.Vector3(0,1.135,-.02),R=[.150,.155,.165],D=Math.PI/180;
  const at=(th,ph,l)=>new T.Vector3(C.x+R[0]*Math.cos(th*D)*Math.sin(ph*D)*l,C.y+R[1]*Math.sin(th*D)*l,C.z+R[2]*Math.cos(th*D)*Math.cos(ph*D)*l);
  // a clump: lens-shaped section lying on the head (w across the surface, d outward, flatter underneath), round root, pointed tip
  function lock(keys,w,d,o={}){const curve=new T.CatmullRomCurve3(keys.map(k=>Array.isArray(k)?at(...k):k),false,'centripetal'),rows=o.rows||18,cols=8,P=[],U=[],IX=[],taper=o.taper??.05,root=o.root??.5,sharp=o.sharp??1.5;
   for(let j=0;j<=rows;j++){const u=j/rows,p=curve.getPoint(u),t=curve.getTangent(u),nrm=p.clone().sub(C).normalize();let a=new T.Vector3().crossVectors(t,nrm);if(a.lengthSq()<1e-8)a.set(1,0,0);a.normalize();if(o.roll)a.applyAxisAngle(t,o.roll*D);
    const b=new T.Vector3().crossVectors(a,t).normalize(),k=(root+(1-root)*Math.sin(Math.min(1,u/.18)*Math.PI/2))*(1-(1-taper)*Math.pow(u,sharp));
    for(let i=0;i<=cols;i++){const q=i/cols*Math.PI*2,c=Math.cos(q),s=Math.sin(q),pp=p.clone().addScaledVector(a,c*w*k).addScaledVector(b,(s>0?s:s*.55)*d*k);P.push(pp.x,pp.y,pp.z);U.push(i/cols,0);}}
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i;IX.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(P,3));g.setAttribute('uv',new T.Float32BufferAttribute(U,2));g.setIndex(IX);g.computeVertexNormals();add(g);}
  // base: the donor's fitted scalp (HairBack), lifted 3 mm, trimmed to this cut's hairline (front), side length and nape
  const src=v.parts.hair.find(m=>/HairBack/.test([].concat(m.material)[0]?.name));
  if(src){const scalp=src.geometry.clone();scalp.clearGroups();scalp.computeVertexNormals();const sp=scalp.attributes.position,sn=scalp.attributes.normal,suv=[];
   for(let i=0;i<sp.count;i++){sp.setXYZ(i,sp.getX(i)+sn.getX(i)*.003,sp.getY(i)+sn.getY(i)*.003,sp.getZ(i)+sn.getZ(i)*.003);suv.push(.5+Math.atan2(sp.getX(i),sp.getZ(i)+.02)/(2*Math.PI),0);}
   scalp.setAttribute('uv',new T.Float32BufferAttribute(suv,2));const keep=[],ix=scalp.index,ok=id=>{const y=sp.getY(id),z=sp.getZ(id);return z>.035?y>st.front:y>st.side+(st.back-st.side)*S(z,-.02,-.12);};
   for(let i=0;i<ix.count;i+=3){const a=ix.getX(i),b=ix.getX(i+1),c=ix.getX(i+2);if(ok(a)&&ok(b)&&ok(c))keep.push(a,b,c);}scalp.setIndex(keep);add(scalp);}
  if(kind==='m2'){// Pháp Kiều: centre part; the fringe falls from the part in two curtains to the cheekbones, sides over the ears
   for(let k=0;k<20;k++){const ph=k*18+J(6);lock([[88,ph,1.02],[64,ph+J(6),1.045],[40,ph+J(6),1.055]],.03,.008,{taper:.5});}
   for(const sg of [1,-1])for(let k=0;k<10;k++){const f=k/9,ph0=sg*(6+f*46)+J(3),tip=L0(4,-30,Math.pow(f,.7));lock([[88,sg*3,1.03],[70,sg*(4+f*10),1.06],[46,ph0*.8,1.08],[24,ph0+sg*10,1.08],[tip+10,ph0+sg*20,1.07],[tip+J(3),ph0+sg*27,1.055]],.021,.0075,{taper:.12,sharp:1.6,rows:22});}
   for(const sg of [1,-1])for(let k=0;k<4;k++){const ph=sg*(50+k*7);lock([[30,ph,1.07],[0,ph+sg*4,1.07],[-30,ph+sg*8,1.06],[-52-k*3,ph+sg*10,1.05]],.018,.007,{taper:.1,sharp:1.5,rows:18});}
   for(const sg of [1,-1])for(let k=0;k<8;k++){const ph=sg*(64+k*8)+J(3);lock([[72,ph*.7,1.04],[42,ph,1.07],[8,ph,1.07],[-24,ph,1.05],[-44+(k%2)*5,ph+sg*3,1.035]],.026,.0085,{taper:.15});}
   for(let k=0;k<15;k++){const ph=180-84+k*12+J(3);lock([[76,ph,1.04],[42,ph,1.065],[2,ph,1.06],[-30,ph,1.04],[-50+(k%2)*5,ph,1.025]],.026,.0085,{taper:.15});}
   for(let k=0;k<6;k++){const ph=J(140)+(k%2?180:0),th0=60+rnd()*24;lock([[th0,ph,1.05],[th0+6,ph+J(20),1.09],[th0+8,ph+J(30),1.11]],.010,.004,{taper:.05,sharp:1.2,rows:10});}
  }else if(kind==='m3'){// LAVIEM Quang Hùng: black, tousled volume on top brushed up and back, a piecey fringe falling from his left to his
   // right brow with the forehead partly open, short tidy sides (ears free)
   for(const s of [1,-1])for(let k=0;k<7;k++){const ph=s*(56+k*10);lock([[50,ph,1.01],[22,ph+s*3,1.03],[-8-(k%3)*3,ph+s*6,1.02]],.018,.0055,{taper:.2});}
   for(let k=0;k<15;k++){const ph=180-84+k*12;lock([[72,ph,1.03],[32,ph,1.045],[0,ph,1.035],[-28+(k%2)*4,ph,1.015]],.022,.006,{taper:.3});}
   for(let k=0;k<22;k++){const ph=k*16.4+J(10),th0=84+J(6);lock([[th0,ph,1.05],[64,ph-8+J(12),1.14+J(.03)],[46+J(10),ph-14+J(16),1.16+J(.04)]],.027,.009,{taper:.2});}
   for(let k=0;k<14;k++){const ph=-40+k*7+J(4),up=J(.04);lock([[62,ph*.6,1.07],[50,ph,1.16+up],[40+J(6),ph-8+J(8),1.20+up],[42+J(8),ph-14+J(12),1.23+up]],.022,.008,{taper:.05,sharp:1.3,rows:14});}
   for(let k=0;k<9;k++){const r=30-k*7+J(3),tip=-2-9*(k/8)+J(3);lock([[60,r+8,1.07],[40,r+2,1.12],[22,r-6,1.11],[6,r-14,1.08],[tip,r-22,1.06]],.020,.0075,{taper:.05,sharp:1.5,rows:18});}
   for(let k=0;k<8;k++){const ph=J(120),th0=58+rnd()*24;lock([[th0,ph,1.10],[th0+8,ph-8+J(16),1.17],[th0+12+J(6),ph-14+J(20),1.21]],.012,.005,{taper:.04,sharp:1.2,rows:10});}
  }else if(kind==='m4'){// CoolKid's judge wig: a puffed crown and rows of hanging sausage curls, wider and lower towards the shoulders
   for(let k=0;k<22;k++){const ph=k*16.4+J(8);lock([[86,ph,1.08],[66,ph+J(10),1.17],[46,ph+J(10),1.21]],.036,.016,{taper:.6,root:.8});}
   const curl=(th,ph,l,len,r,turns)=>{const top=at(th,ph,l),out=top.clone().sub(C).setY(0).normalize(),side=new T.Vector3(-out.z,0,out.x),pts=[];
    for(let i=0;i<=14;i++){const t=i/14,a=t*turns*Math.PI*2,rr=r*(1-.25*t);pts.push(top.clone().add(new T.Vector3(0,-len*t,0)).addScaledVector(out,Math.cos(a)*rr+.012*t).addScaledVector(side,Math.sin(a)*rr));}
    lock(pts,.0150,.0120,{taper:.6,root:.9,sharp:2,rows:28});};
   const rows=[[66,1.16,.040,24,0],[50,1.20,.045,26,0],[34,1.24,.050,28,44],[18,1.28,.055,28,50],[2,1.32,.060,28,54],[-14,1.36,.060,26,58],[-30,1.40,.060,24,62],[-46,1.43,.055,22,66],[-60,1.45,.050,20,70]];
   for(const [th,l,len,n,gap] of rows)for(let k=0;k<n;k++){const ph=-180+(k+.5)*360/n+J(4);if(Math.abs(ph)<gap)continue;curl(th+J(3),ph,l+J(.03),len*(1+J(.2)),.011,2.2+J(.5));}
   for(let k=0;k<11;k++){const ph=-50+k*10+J(3);curl(46+J(3),ph,1.14,.026,.012,1.5);curl(58+J(3),ph+5,1.15,.026,.012,1.5);}
  }else{// m1 CAPTAIN BOY: short sides and back, a spiky messy platinum top: many pieces up and forward, a few short flicks at the fringe
   for(const s of [1,-1])for(let k=0;k<7;k++){const ph=s*(56+k*10);lock([[48,ph,1.01],[20,ph+s*3,1.025],[-6-(k%3)*3,ph+s*6,1.015]],.018,.0055,{taper:.2});}
   for(let k=0;k<15;k++){const ph=180-84+k*12;lock([[70,ph,1.03],[30,ph,1.04],[0,ph,1.03],[-26+(k%2)*4,ph,1.012]],.022,.006,{taper:.3});}
   for(let k=0;k<22;k++){const ph=k*16.4+J(10),th0=84+J(6);lock([[th0,ph,1.04],[64,ph+J(14),1.12+J(.03)],[48+J(10),ph+J(18),1.15+J(.04)]],.026,.0085,{taper:.2});}
   for(let k=0;k<40;k++){const ph=J(170),th0=48+rnd()*38,up=J(.06);lock([[th0,ph,1.07],[th0+9,ph+J(16),1.18+up],[th0+15+J(6),ph+J(24),1.30+up]],.014,.006,{taper:.03,sharp:1.15,rows:10});}
   for(let k=0;k<11;k++){const ph=-46+k*9+J(4),up=J(.04);lock([[58,ph*.6,1.07],[44,ph,1.14+up],[34+J(6),ph+J(10),1.19+up],[30+J(8),ph+J(14),1.23+up]],.019,.007,{taper:.04,sharp:1.3,rows:14});}
   for(let k=0;k<7;k++){const r=-30+k*9+J(3);lock([[56,r,1.07],[36,r+3,1.11],[20,r+6,1.10],[8+J(4),r+9,1.08]],.016,.006,{taper:.05,sharp:1.5,rows:14});}
  }
  const geo=mergeGeometries(geos,false);for(const g of geos)g.dispose();
  {const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++)uv.setY(i,T.MathUtils.clamp((YT-p.getY(i))/(YT-YB),0,1));}
  geo.computeBoundingSphere();
  const mesh=new T.SkinnedMesh(geo,hairMaterial(v,ramp(st)));mesh.name=opt.id+'_laviem';mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(sk,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;body.parent.add(mesh);
  const rec={id:opt.id,index,slot:'hair',meshes:[mesh],buildMs:performance.now()-start};records.set('hair:'+index,rec);parts.push({slot:'hair',variant:index,donor:opt.variant,mesh});timings.push({id:opt.id,index,milliseconds:rec.buildMs,meshes:1});yield;
 }
 return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){for(const p of parts)p.mesh.visible=false;}};
}
