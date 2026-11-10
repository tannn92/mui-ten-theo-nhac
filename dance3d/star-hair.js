import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Hair of the four Secret singers. Owner 2026-11-10 (poster, left→right CongB, Cody Nam Võ, Quang Hùng MasterD, Wren Evans):
// "sửa trang phục và gương mặt sao cho giống mv hơn nữa ... chưa nhận diện ra dễ được ai là ai".
//  m1 CongB       dark copper; short tapered sides, ears free; a long spiky top brushed up and over to his right, a few
//                 pieces falling on his right forehead
//  m2 Cody Nam Võ dark auburn pompadour: a tall smooth roll from a straight hairline, sides slicked back, ears free
//  m3 Quang Hùng  mushroom dome; a heavy piecey fringe to the eyelids; burgundy crown fading to near-black ends
//  m4 Wren Evans  dark brown, fluffy and wavy; a curtain fringe parted on his left and swept across to his right
// Built from the donor's fitted scalp + tapered clumps laid on a head ellipsoid, rigid to the head bone. Shaded with a clone
// of the donor's MToon hair material (the same toon light as the child's hair) and a colour ramp by height.
const styles={
 'star-hair-m1':{label:'CongB · tóc nâu hạt dẻ xù, mái lệch',top:'#7e4b33',mid:'#5d3526',low:'#3b2219',ring:.14,grain:1.4,front:1.13,side:1.075,back:1.02},
 'star-hair-m2':{label:'Cody Nam Võ · tóc vuốt pompadour',top:'#3f2621',mid:'#2b1a17',low:'#1c1211',ring:.30,front:1.17,side:1.08,back:1.03},
 'star-hair-m3':{label:'Quang Hùng · tóc đen mái dày, lộ tai',top:'#4c1f2a',mid:'#25171a',low:'#161012',ring:.04,grain:1.6,front:1.10,side:1.075,back:1.0},
 'star-hair-m4':{label:'Wren Evans · tóc bồng mái rèm',top:'#43291f',mid:'#2c1b16',low:'#1c1311',ring:.16,grain:1.4,front:1.13,side:1.05,back:1.0}
};
export const starHairOptions=()=>({hair:Object.entries(styles).map(([id,s])=>({id,style:id,variant:1,crewOnly:true,label:s.label}))});
const YT=1.36,YB=.98,S=(x,a,b)=>T.MathUtils.smoothstep(x,a,b);
// colour by height (v 0 = top of the hair, 1 = nape), fine strands across each clump, a soft light ring on the crown
function ramp(st){const W=256,H=256,cv=document.createElement('canvas');cv.width=W;cv.height=H;const x=cv.getContext('2d'),im=x.createImageData(W,H),
 c=[st.top,st.mid,st.low].map(h=>new T.Color(h).convertLinearToSRGB()),rv=(YT-1.245)/(YT-YB);
 for(let j=0;j<H;j++){const v=j/(H-1),base=c[0].clone().lerp(c[1],S(v,0,.42)).lerp(c[2],S(v,.42,1)),ring=Math.exp(-Math.pow((v-rv)/.05,2))*st.ring;
  for(let i=0;i<W;i++){const u=i/W,g=st.grain??1,str=1-.07*g+g*(.06*Math.sin(u*Math.PI*14+Math.sin(u*31)*.8)+.04*Math.sin(u*Math.PI*38)+.03*Math.sin(u*Math.PI*86+1.3)),out=Math.max(0,Math.sin(u*Math.PI*2)),k=str*(1+ring*out*1.3),o=(j*W+i)*4;
   im.data[o]=255*Math.min(1,base.r*k+ring*out*.09);im.data[o+1]=255*Math.min(1,base.g*k+ring*out*.075);im.data[o+2]=255*Math.min(1,base.b*k+ring*out*.07);im.data[o+3]=255;}}
 x.putImageData(im,0,0);const t=new T.CanvasTexture(cv);t.colorSpace=T.SRGBColorSpace;t.wrapS=T.RepeatWrapping;t.flipY=false;return t;}
function hairMaterial(v,tex){const all=v.parts.hair.map(m=>[].concat(m.material)[0]).filter(m=>m?.isMToonMaterial),src=all.find(m=>/_Hair_00_HAIR/.test(m.name))||all[0];
 if(src)try{const m=src.clone();m.name='StarHair';m.map=tex;m.shadeMultiplyTexture=tex;m.color.setRGB(1,1,1);m.shadeColorFactor.setRGB(.70,.62,.66);m.side=T.DoubleSide;m.needsUpdate=true;return m;}catch(e){console.warn('star hair toon',e);}
 return new T.MeshToonMaterial({map:tex,side:T.DoubleSide});}
export function* buildStarHair(variants,opts){
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
  if(kind==='m2'){// pompadour: one sagittal profile (hairline → tall roll leaning forward → over the crown → nape) swept across the
   // head; the roll is tallest in the middle and sinks into the temples, each clump keeps its x so the roll stays wide over the top
   const prof=[[11.3,.989],[21.6,1.141],[33.9,1.329],[46.8,1.461],[59.3,1.425],[73.9,1.31],[90,1.20],[108,1.11],[125,1.06],[142,1.035],[156,1.025]];
   for(let k=0;k<40;k++){const f=(k-19.5)/19.5,x0=.118*f+J(.002),hl=11.3+17*f*f,A=.78*Math.max(.2,1-.55*f*f-.25*f**4)*(1+J(.05))*(1-.05*f);
    lock(prof.map(([th,L],i)=>{const t=(th+(hl-11.3)*Math.max(0,1-i/3))*D,Lf=1+(L-1)*A,x=x0*(1-.22*i/(prof.length-1)),s=Math.sqrt(Math.max(.04,1-(x/(R[0]*Lf))**2));return new T.Vector3(x,C.y+R[1]*Math.sin(t)*Lf*s,C.z+R[2]*Math.cos(t)*Lf*s);}),.0165,.006,{taper:.3,sharp:3,rows:32});}
   for(const s of [1,-1])for(let k=0;k<8;k++){const th0=32-k*5.5,ph0=s*(54+k*3.5);lock([[th0,ph0,.995],[th0+1,s*(78+k),1.03],[th0+3,s*104,1.035],[th0+5,s*128,1.03],[th0+4,s*150,1.025]],.019,.0055,{taper:.4,sharp:2});}
   for(let k=0;k<15;k++){const ph=180-84+k*12;lock([[60,ph,1.03],[35,ph,1.04],[5,ph,1.035],[-34+(k%2)*3,ph,1.015]],.022,.006,{taper:.3});}
   for(const s of [1,-1])lock([[8,s*74,1.0],[-6,s*77,1.01],[-20,s*79,1.005]],.011,.004,{taper:.25});
  }else if(kind==='m3'){// stage photo: lies flat on the head (no dome); the outline is not one ring: a long piecey fringe to the
   // eyes parted a little to his left with gaps, the sides longer (straight down past the ear tops), the nape tapered short
   for(let k=0;k<18;k++){const ph=k*20+J(6);lock([[89,ph,1.02],[68,ph+5,1.03],[42,ph+8,1.04]],.03,.007,{taper:.5});}
   for(let k=0;k<13;k++){const f=(k-6)/6,ph=f*56+J(3),away=ph>12?6:-4,tip=-18+5*f*f+[0,4,-2,3,-1,5,1][k%7]+J(2);lock([[78,ph*.25,1.03],[56,ph*.7+away*.3,1.05],[30,ph*.92+away*.7,1.06],[6,ph+away,1.05],[tip,ph*1.03+away+J(4),1.035]],.034,.0085,{taper:.14,sharp:2});}
   for(let k=0;k<8;k++){const ph=-50+k*14+J(5);lock([[74,ph*.25,1.025],[50,ph*.7,1.04],[24,ph*.92,1.045],[0,ph,1.04],[-10+J(4),ph,1.03]],.03,.007,{taper:.3,sharp:2.2});}
   for(let k=0;k<5;k++){const ph=-44+k*20+J(6);lock([[46,ph,1.07],[22,ph+J(8),1.075],[2,ph+J(8),1.06],[-21+J(3),ph+J(10),1.045]],.011,.0045,{taper:.05,sharp:1.6,rows:12});}
   for(const s of [1,-1])for(let k=0;k<7;k++){const ph=s*(64+k*9),a=Math.abs(ph),tip=a<75?-10:a<=108?-6-(k%2)*3:-30;lock([[70,ph*.6,1.035],[40,ph,1.05],[14,ph+s,1.055],[tip,ph+s*2,1.045]],.026,.0085,{taper:.14});}
   for(let k=0;k<15;k++){const ph=180-80+k*11.4,c=Math.cos((ph-180)*D);lock([[78,ph,1.035],[45,ph,1.05],[5,ph,1.045],[-22,ph,1.03-.01*c],[-36-6*(1-c)+(k%2)*3,ph,1.02-.01*c]],.026,.008,{taper:.15});}
   for(let k=0;k<14;k++){const ph=J(150)+(k%2?180:0),th0=50+rnd()*36;lock([[th0,ph,1.04],[th0+6,ph+J(20),1.09],[th0+9+J(6),ph+J(30),1.12+J(.03)]],.010,.004,{taper:.04,sharp:1.2,rows:10});}
   // no pieces by the ears (owner: "tóc anh ta đâu có lọn nào dài đến tai"); a few long fringe wisps into the eyes (stage photo)
   for(let k=0;k<7;k++){const ph=-42+k*13+J(5);lock([[30,ph,1.07],[8,ph+J(6),1.065],[-12,ph+J(8),1.05],[-25-J(5),ph+J(10),1.04]],.009,.0035,{taper:.04,sharp:1.4,rows:12});}
  }else if(kind==='m4'){// asymmetric: a big swoop from a part on his left across the forehead to his right temple (tips down to the
   // eye there), his left side brushed back close to the head (a triangle of forehead open by the part), fuller on his right
   for(let k=0;k<22;k++){const ph=k*16.4+J(10),th0=82+J(6),L=1.09+J(.05)+(Math.sin(ph*D)<0?.035:0);lock([[th0,ph,1.05],[60,ph-6+J(10),L],[38+J(8),ph-10+J(14),L-.01]],.027,.009,{taper:.25});}
   for(let k=0;k<15;k++){const ph=180-84+k*12+J(3);lock([[74,ph,1.06],[40,ph+5,1.11],[8,ph-4,1.10],[-20,ph+4,1.07],[-34+(k%2)*5,ph+8,1.09]],.023,.008,{taper:.1});}
   for(let k=0;k<6;k++){const ph=58+k*10;lock([[56,ph-6,1.05],[28,ph+4,1.075],[2,ph+12,1.065],[-16-(k%2)*4,ph+18,1.055]],.02,.007,{taper:.12});}
   for(let k=0;k<6;k++){const ph=-(58+k*10);lock([[60,ph*.85,1.08],[30,ph,1.13],[4,ph-4,1.12],[-16,ph-1,1.10],[-28-(k%2)*4,ph-8,1.13]],.022,.008,{taper:.1});}
   for(let k=0;k<15;k++){const r=24-k*4.4,f=k/14,drop=-6-18*f*f;lock([[72,r+4,1.06],[50,r,1.15],[28,r-10,1.18],[10,r-19,1.16],[-4,r-25,1.13],[drop+J(3),r-32-6*f,1.10+.03*f]],.023,.0085,{taper:.06,sharp:1.6,rows:22});}
   for(let k=0;k<4;k++){const r=30+k*8;lock([[66,r-4,1.06],[46,r+6,1.13],[34,r+16,1.14],[30+J(4),r+28,1.12]],.02,.0075,{taper:.1});}
   for(let k=0;k<7;k++){const ph=J(120),th0=55+rnd()*28;lock([[th0,ph,1.10],[th0+8,ph-10+J(16),1.17],[th0+12+J(6),ph-18+J(20),1.21]],.012,.005,{taper:.04,sharp:1.2,rows:10});}
   for(let k=0;k<4;k++){const ph=-(60+k*7);lock([[10,ph+18,1.15],[-8,ph+6,1.13],[-20-k*2,ph-2,1.14],[-24-k*2,ph-9,1.19]],.016,.006,{taper:.05,sharp:1.4,rows:12});}
  }else{// m1 CongB (stage photo): chestnut, soft and tousled, moderate volume with wispy flicks at the top edges; short tidy sides,
   // ears free; the fringe falls in separate pieces across the forehead from his right (lifted, hairline showing) to his left brow
   for(const s of [1,-1])for(let k=0;k<7;k++){const ph=s*(56+k*10);lock([[48,ph,1.01],[20,ph+s*3,1.03],[-10-(k%3)*3,ph+s*6,1.02]],.018,.0055,{taper:.2});}
   for(let k=0;k<15;k++){const ph=180-84+k*12;lock([[70,ph,1.03],[30,ph,1.045],[0,ph,1.035],[-30+(k%2)*4,ph,1.015]],.022,.006,{taper:.3});}
   for(let k=0;k<20;k++){const ph=k*18+J(10),th0=84+J(6);lock([[th0,ph,1.04],[62,ph+12+J(12),1.12+J(.03)],[42+J(10),ph+22+J(18),1.13+J(.04)]],.026,.0085,{taper:.2});}
   for(let k=0;k<12;k++){const ph=-50+k*9+J(4),up=J(.05);lock([[60,ph*.6,1.06],[46,ph,1.13+up],[36+J(8),ph+10+J(8),1.17+up],[38+J(10),ph+16+J(14),1.21+up]],.022,.008,{taper:.04,sharp:1.3,rows:14});}
   for(let k=0;k<10;k++){const r=-34+k*7+J(3),tip=-8-6*(k/9)+J(4);lock([[60,r-10,1.07],[38,r-3,1.12],[18,r+6,1.11],[2,r+13,1.08],[tip,r+20,1.06]],.019,.007,{taper:.05,sharp:1.5,rows:18});}
   for(let k=0;k<5;k++){const ph=J(100),th0=58+rnd()*25;lock([[th0,ph,1.08],[th0+8,ph+J(20),1.15],[th0+12+J(8),ph+J(30),1.20]],.012,.005,{taper:.04,sharp:1.2,rows:10});}
  }
  const geo=mergeGeometries(geos,false);for(const g of geos)g.dispose();
  {const p=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<p.count;i++)uv.setY(i,T.MathUtils.clamp((YT-p.getY(i))/(YT-YB),0,1));}
  geo.computeBoundingSphere();
  const mesh=new T.SkinnedMesh(geo,hairMaterial(v,ramp(st)));mesh.name=opt.id+'_star';mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(sk,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;body.parent.add(mesh);
  const rec={id:opt.id,index,slot:'hair',meshes:[mesh],buildMs:performance.now()-start};records.set('hair:'+index,rec);parts.push({slot:'hair',variant:index,donor:opt.variant,mesh});timings.push({id:opt.id,index,milliseconds:rec.buildMs,meshes:1});yield;
 }
 return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){for(const p of parts)p.mesh.visible=false;}};
}
