import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1011.1128';
// The four Secret singers (owner 2026-11-10: poster "Secret · phiên bản Tinh Hà Say Hi" + the stage photo; "Outfit vẫn k giống
// trong ảnh tôi mô tả, làm kĩ lại đi", "làm cả giày giống nhé"). Crew-only looks secret-crew-m1..m4-{top,bottom,shoes}.
//  m1 caramel suede biker jacket (zipped low, wide notched lapels) over a white shirt + beige tie, shirt tail out; light flares;
//     brown pointed shoes; bead bracelets.
//  m2 oxblood blouson (gathered waistband, chest flap pockets) open over a cream shirt with a huge dagger collar and a blush
//     neckerchief; oxblood belt; light flares; dark brown boots; silver chain bracelet.
//  m3 camel corduroy boxy jacket (collarless, silver buttons, hip flaps) over a golden satin shirt, red polka-dot neckerchief
//     with a long tail; oxblood belt; mid-wash button-fly flares; black loafers on white soles, white socks.
//  m4 dark brown leather jacket with a copper foil print and a pointed collar over a denim shirt (collar out); dark flares;
//     cognac pointed cowboy boots.
// Garments are cut from the donor's own skin (skinned exactly like her: shoulders bend with the arms, no shelves), the torso
// part pushed out to the convex torso outline (clothes bridge the body, never cling to it), then trimmed by cut fields (hem,
// neckline, front opening, cuffs). Collars, lapels, pockets and scarves are snapped onto the jacket and take its skinning.
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),S=(x,a,b)=>T.MathUtils.smoothstep(x,a,b),L=T.MathUtils.lerp,C=T.MathUtils.clamp;
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export const starLooks={
 m1:{jacket:{color:'#a9652f',fabric:'suede',hem:.648,ease:.015,straight:.6,shoulder:.007,sleeve:.013,sleeveEnd:.865,open:y=>.050*S(y,.785,.905),collar:'notch',zip:true},
  shirt:{color:'#f5f0e6',fabric:'shirt',hem:.600,collar:'point',tie:'#d9c6a0',cuff:.935},
  jeans:{base:'#9ab3cb',light:'#c9d8e6',dark:'#6f8aa6',patch:true,tassel:true},shoes:{kind:'pointed',color:'#6a3f22',heel:.016},wrist:{beads:'right'}},
 m2:{jacket:{color:'#5b2129',fabric:'leather',hem:.742,ease:.018,puff:.016,straight:.75,shoulder:.009,sleeve:.016,sleeveEnd:.86,open:y=>.030+.016*S(y,.80,.905),collar:'point',band:true,flaps:'chest'},
  shirt:{color:'#f4ede1',fabric:'shirt',hem:.722,collar:'dagger',kerchief:'#e2bfae',cuff:.935},
  belt:{color:'#4e1b1f',buckle:'#d9dbe0'},jeans:{base:'#8eaac6',light:'#c3d5e6',dark:'#647f9d',distress:true},shoes:{kind:'boot',color:'#33221c',heel:.014},wrist:{chain:'left'}},
 m3:{jacket:{color:'#c39563',fabric:'cord',hem:.700,ease:.020,straight:.9,shoulder:.011,sleeve:.016,sleeveEnd:.875,open:y=>.036+.010*S(y,.80,.905),collar:'band',buttons:'#dcdcd6',flaps:'hip'},
  shirt:{color:'#a87634',fabric:'satin',hem:.722,collar:'point',cuff:.94},scarf:{color:'#8f1b23',dots:'#f6ece6'},
  belt:{color:'#5c161b',buckle:'#cfd0cc'},jeans:{base:'#7f9fc3',light:'#b7cde4',dark:'#57749a',fly:true,studs:true},shoes:{kind:'loafer',color:'#1c1919',sole:'#f2f0ea',socks:'#f5f3ef'}},
 m4:{jacket:{color:'#3b2219',fabric:'foil',hem:.640,ease:.015,straight:.6,shoulder:.007,sleeve:.013,sleeveEnd:.87,open:y=>.028+.018*S(y,.80,.905),collar:'point'},
  shirt:{color:'#7392b6',fabric:'denim',hem:.640,collar:'point',cuff:.935,vneck:true},
  jeans:{base:'#5f7c9e',light:'#94adc8',dark:'#3e5677'},shoes:{kind:'cowboy',color:'#9c5d2b',heel:.020}}
};
// ---------------------------------------------------------------- donor body (rest pose, body-local) ------------------
const donors=new WeakMap();
function hull2(pts){pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
 for(const q of pts){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop();lo.push(q);}
 for(let i=pts.length-1;i>=0;i--){const q=pts[i];while(up.length>1&&cr(up[up.length-2],up[up.length-1],q)<=0)up.pop();up.push(q);}
 return lo.slice(0,-1).concat(up.slice(0,-1));}
function donorData(donor){
 let d=donors.get(donor);if(d)return d;
 const body=donor.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),g=body.geometry,inv=body.matrixWorld.clone().invert();
 const pos=n=>donor.vrm.humanoid.getRawBoneNode(n).getWorldPosition(V()).applyMatrix4(inv);
 const boneIndex=n=>{const raw=donor.vrm.humanoid.getRawBoneNode(n);let i=body.skeleton.bones.indexOf(raw);if(i<0)i=body.skeleton.bones.findIndex(b=>b.name===raw?.name);if(i<0)throw Error('Missing bone '+n);return i;};
 const groups={torso:['hips','spine','chest','upperChest'],neck:['neck','head'],L:['leftShoulder','leftUpperArm','leftLowerArm','leftHand'],R:['rightShoulder','rightUpperArm','rightLowerArm','rightHand'],legs:['leftUpperLeg','rightUpperLeg','leftLowerLeg','rightLowerLeg','leftFoot','rightFoot','leftToes','rightToes']};
 const gid=new Map();for(const [k,ns] of Object.entries(groups))for(const n of ns){try{gid.set(boneIndex(n),k);}catch(e){}}
 const P=g.attributes.position,SI=g.attributes.skinIndex,SW=g.attributes.skinWeight,n=P.count,W={};for(const k of Object.keys(groups))W[k]=new Float32Array(n);
 for(let i=0;i<n;i++){for(let k=0;k<4;k++){const grp=gid.get(SI.getComponent(i,k));if(grp&&grp!=='torso')W[grp][i]+=SW.getComponent(i,k);}W.torso[i]=Math.max(0,1-W.L[i]-W.R[i]-W.legs[i]-W.neck[i]);}
 const used=[...new Set(g.index.array)];let floor=Infinity;for(const i of used)floor=Math.min(floor,P.getY(i));
 const hip=pos('hips'),neck=pos('neck'),sh={L:pos('leftUpperArm'),R:pos('rightUpperArm')},hand={L:pos('leftHand'),R:pos('rightHand')};
 const tx=[];for(const i of used)if(W.torso[i]>=.6)tx.push([P.getX(i),P.getY(i),P.getZ(i)]);
 const rings=new Map(),yLo=hip.y-.02,yHi=neck.y-.012;
 function ring(y){const yy=C(y,yLo,yHi),key=Math.round(yy*500);let r=rings.get(key);if(r)return r;
  const pts=[];for(const q of tx)if(Math.abs(q[1]-key/500)<.02)pts.push([q[0],q[2]]);const h=hull2(pts);let cx=0,cz=0;for(const q of h){cx+=q[0];cz+=q[1];}
  r={h,c:[cx/h.length,cz/h.length]};rings.set(key,r);return r;}
 // distance from the ring centre to its outline along (ux,uz)
 function reach(r,ux,uz){const {h,c}=r;let best=Infinity;for(let i=0;i<h.length;i++){const A=h[i],B=h[(i+1)%h.length],ex=B[0]-A[0],ez=B[1]-A[1],den=ux*ez-uz*ex;if(Math.abs(den)<1e-12)continue;
  const t=((A[0]-c[0])*ez-(A[1]-c[1])*ex)/den,u=((A[0]-c[0])*uz-(A[1]-c[1])*ux)/den;if(t>0&&u>=-1e-6&&u<=1+1e-6&&t<best)best=t;}return Number.isFinite(best)?best:.08;}
 // point on the torso outline at height y whose x is `x` on the front (z>0) side, pushed out by e
 function front(y,x,e=0){const r=ring(y);let lo=-Math.PI/2,hi=Math.PI/2;const sx=Math.sign(x)||1;
  for(let k=0;k<22;k++){const a=(lo+hi)/2,ux=Math.sin(a),uz=Math.cos(a),px=r.c[0]+ux*(reach(r,ux,uz)+e);if(px<x)lo=a;else hi=a;}
  const a=(lo+hi)/2,ux=Math.sin(a),uz=Math.cos(a),t=reach(r,ux,uz)+e;void sx;return V(r.c[0]+ux*t,y,r.c[1]+uz*t);}
 const armT=(x,s)=>C((Math.abs(x)-Math.abs(sh[s].x))/(Math.abs(hand[s].x)-Math.abs(sh[s].x)),-1,2);
 d={body,g,pos,boneIndex,W,hip,neck,floor,sh,hand,ring,reach,front,armT,used};donors.set(donor,d);return d;
}
// ---------------------------------------------------------------- textures ---------------------------------------------
const textures=new Map();
function tex(key,w,h,draw,repeat=[1,1]){let t=textures.get(key);if(t)return t;const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);
 t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(...repeat);t.anisotropy=4;textures.set(key,t);return t;}
const hexA=(hex,a)=>{const c=new T.Color(hex);return `rgba(${Math.round(c.r*255)},${Math.round(c.g*255)},${Math.round(c.b*255)},${a})`;};
function noise(x,w,h,n,seed,fn){for(let j=0;j<n;j++)fn(rand(seed+j)*w,rand(seed+j+9e3)*h,rand(seed+j+2e4),j);}
const fabrics={
 // luminance maps (white = the material colour)
 suede:()=>tex('suede',256,256,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);noise(x,w,h,900,11,(px,py,r)=>{const g=x.createRadialGradient(px,py,0,px,py,6+r*16);const dark=r<.5;g.addColorStop(0,dark?'rgba(70,40,20,.10)':'rgba(255,240,215,.16)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(px-24,py-24,48,48);});
  noise(x,w,h,9000,77,(px,py,r)=>{x.fillStyle=`rgba(60,35,15,${.03+r*.05})`;x.fillRect(px,py,1,1);});},[3,3]),
 leather:()=>tex('leather',256,256,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);noise(x,w,h,5000,21,(px,py,r)=>{x.fillStyle=`rgba(40,10,15,${.02+r*.04})`;x.beginPath();x.arc(px,py,.6+r*1.4,0,7);x.fill();});
  noise(x,w,h,60,5,(px,py,r)=>{x.strokeStyle='rgba(255,235,235,.10)';x.lineWidth=1+r*2;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+20*r,py+15,px+40*(r-.5),py+40);x.stroke();});},[3,3]),
 cord:()=>tex('cord',256,64,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);for(let i=0;i<w;i+=8){x.fillStyle='rgba(95,60,25,.20)';x.fillRect(i,0,2,h);x.fillStyle='rgba(255,245,225,.30)';x.fillRect(i+3,0,3,h);}
  noise(x,w,h,2500,31,(px,py,r)=>{x.fillStyle=`rgba(80,50,20,${.03+r*.05})`;x.fillRect(px,py,1,2);});},[1,1]),
 shirt:()=>tex('shirtweave',128,128,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);x.strokeStyle='rgba(80,70,60,.05)';for(let i=0;i<w;i+=3){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(w,i);x.stroke();}},[6,6]),
 satin:()=>tex('satin',256,256,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);noise(x,w,h,70,41,(px,py,r)=>{const g=x.createLinearGradient(px-14,py-30,px+14,py+30);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,r<.5?'rgba(255,236,190,.32)':'rgba(70,40,10,.16)');g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g;x.beginPath();x.ellipse(px,py,5+r*8,26+r*20,.5+r*.6,0,7);x.fill();});},[2,2]),
 denim:()=>tex('denimshirt',128,128,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);x.strokeStyle='rgba(30,50,90,.10)';for(let i=-h;i<w;i+=3){x.beginPath();x.moveTo(i,0);x.lineTo(i+h,h);x.stroke();}
  noise(x,w,h,2500,51,(px,py,r)=>{x.fillStyle=r<.5?`rgba(255,255,255,${.10+r*.2})`:`rgba(20,40,80,${.04+r*.06})`;x.fillRect(px,py,2,1);});},[5,5]),
 polka:(base,dot)=>tex('polka'+base,128,128,(x,w,h)=>{x.fillStyle=base;x.fillRect(0,0,w,h);x.fillStyle=dot;for(let j=0;j<6;j++)for(let i=0;i<6;i++){x.beginPath();x.arc(i*21.3+(j%2)*10.6+5,j*21.3+5,4.2,0,7);x.fill();}},[2,2]),
 // colour map: dark leather with a copper foil print (torso v<.8 printed, v>.85 plain for the sleeves)
 foil:(base,dense=1)=>tex('foil3'+base+dense,512,512,(x,w,h)=>{x.fillStyle=base;x.fillRect(0,0,w,h);
  const leaf=(px,py,r,a,alpha)=>{for(const ox of [-w,0,w])for(const oy of [-h,0,h]){const qx=px+ox,qy=py+oy;if(qx<-r||qx>w+r||qy<-r||qy>h+r)continue;const g=x.createRadialGradient(qx-r*.25,qy-r*.25,0,qx,qy,r);g.addColorStop(0,`rgba(244,186,104,${alpha})`);g.addColorStop(.55,`rgba(196,116,48,${alpha*.9})`);g.addColorStop(1,'rgba(110,55,22,0)');x.fillStyle=g;x.beginPath();x.ellipse(qx,qy,r,r*.55,a,0,7);x.fill();}};
  for(let j=0;j<Math.round(700*dense);j++){const cx=rand(j+3)*w,cy=rand(j+703)*h,n=2+Math.floor(rand(j+1403)*4);for(let k=0;k<n;k++){const a=rand(j*7+k)*6.3;leaf(cx+Math.cos(a)*6,cy+Math.sin(a)*6,3+rand(j*13+k)*6,a,.55+rand(j*17+k)*.4);}}
  x.strokeStyle='rgba(40,18,10,.5)';x.lineWidth=1;for(let j=0;j<Math.round(260*dense);j++){const px=rand(j+51)*w,py=rand(j+151)*h;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+8,py+6,px+4*(rand(j)-.5)*6,py+14);x.stroke();}
  noise(x,w,h,Math.round(5000*dense),61,(px,py,r)=>{x.fillStyle=`rgba(${r<.5?'255,215,140':'25,12,8'},${.12+r*.25})`;x.fillRect(px,py,1.5,1.5);});},[1,1]),
 // jeans leg wash: u around the leg (0 outer seam, .25 front, .5 inner seam, .75 back), v from the waist (0) to the hem (1)
 jeans:J=>tex('jeans2'+J.base,256,640,(x,w,h)=>{x.fillStyle=J.base;x.fillRect(0,0,w,h);
  // v: 0 waistband, .32 crotch, .59 knee, 1 hem; u: 0 outer seam, .25 front (centre seam above the crotch), .5 inner, .75 back
  const blob=(u,v,ru,rv,col,a)=>{for(const du of [-1,0,1]){const cx=(u+du)*w,cy=v*h;const g=x.createRadialGradient(cx,cy,0,cx,cy,1);g.addColorStop(0,hexA(col,a));g.addColorStop(1,hexA(col,0));x.save();x.translate(cx,cy);x.scale(ru*w,rv*h);x.translate(-cx,-cy);x.fillStyle=g;x.beginPath();x.arc(cx,cy,1,0,7);x.fill();x.restore();}};
  blob(.30,.42,.18,.15,J.light,.85);blob(.29,.59,.15,.07,J.light,.75);blob(.75,.24,.17,.10,J.light,.55);blob(.30,.80,.15,.13,J.light,.35);blob(.75,.45,.15,.12,J.light,.30);
  for(const u of [0,.5,1]){const g=x.createLinearGradient((u-.06)*w,0,(u+.06)*w,0);g.addColorStop(0,hexA(J.dark,0));g.addColorStop(.5,hexA(J.dark,.55));g.addColorStop(1,hexA(J.dark,0));x.fillStyle=g;x.fillRect((u-.06)*w,0,.12*w,h);}
  x.strokeStyle=hexA(J.light,.55);x.lineWidth=2;for(let k=0;k<5;k++){const v=.30+k*.014;x.beginPath();x.moveTo(.31*w,v*h);x.quadraticCurveTo(.38*w,(v+.008)*h,.45*w,(v-.006)*h);x.stroke();}
  x.fillStyle=hexA(J.dark,.55);x.fillRect(0,h*.978,w,h*.022);
  // seams and stitching: outer seam, centre seams above the crotch, fly J, front pocket curves, back yoke and pockets
  x.strokeStyle='rgba(205,140,70,.6)';x.setLineDash([3,3]);x.lineWidth=1.3;
  for(const xx of [3,w-3]){x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke();}
  for(const u of [.25,.75]){x.beginPath();x.moveTo(u*w,0);x.lineTo(u*w,.32*h);x.stroke();}
  x.beginPath();x.moveTo(.29*w,.02*h);x.lineTo(.29*w,.20*h);x.quadraticCurveTo(.285*w,.25*h,.25*w,.27*h);x.stroke();
  x.beginPath();x.moveTo(.05*w,.03*h);x.quadraticCurveTo(.14*w,.05*h,.18*w,.0*h);x.stroke();
  x.beginPath();x.moveTo(.58*w,.07*h);x.quadraticCurveTo(.66*w,.10*h,.75*w,.12*h);x.stroke();
  x.beginPath();x.moveTo(.64*w,.10*h);x.lineTo(.86*w,.10*h);x.lineTo(.85*w,.20*h);x.lineTo(.75*w,.23*h);x.lineTo(.65*w,.20*h);x.closePath();x.stroke();x.setLineDash([]);
  x.fillStyle=hexA(J.dark,.35);x.fillRect(.64*w,.10*h,.22*w,.008*h);
  noise(x,w,h,30000,91,(px,py,r)=>{x.fillStyle=r<.5?`rgba(255,255,255,${.04+r*.10})`:`rgba(20,30,60,${.03+r*.06})`;x.fillRect(px,py,1,2+r*2);});
  if(J.distress)for(const [u,v] of [[.26,.56],[.32,.64]]){x.strokeStyle='rgba(250,250,250,.75)';x.lineWidth=1;for(let k=0;k<6;k++){x.beginPath();x.moveTo((u-.03)*w,(v+k*.004)*h);x.lineTo((u+.03)*w,(v+k*.004+.002)*h);x.stroke();}}
  if(J.studs)for(let k=0;k<26;k++){const u=.12+rand(k+5)*.30,v=.34+rand(k+50)*.45;x.fillStyle='rgba(255,255,255,.95)';x.beginPath();x.arc(u*w,v*h,2.2,0,7);x.fill();}
  if(J.patch){x.fillStyle='rgba(120,70,35,.85)';for(let k=0;k<5;k++){const a=k/5*6.28;x.beginPath();x.ellipse(.33*w+Math.cos(a)*9,.42*h+Math.sin(a)*7,6,4,a,0,7);x.fill();}x.fillStyle='rgba(170,120,60,.9)';x.beginPath();x.arc(.33*w,.42*h,4,0,7);x.fill();}
 },[1,1]),
 seat:J=>tex('seat'+J.base,256,128,(x,w,h)=>{x.fillStyle=J.base;x.fillRect(0,0,w,h);const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,hexA(J.dark,.35));g.addColorStop(1,hexA(J.light,.35));x.fillStyle=g;x.fillRect(0,0,w,h);
  // back pockets (u .62-.72 and .78-.88 around: back is u .75) and the yoke seam
  x.strokeStyle='rgba(205,140,70,.7)';x.setLineDash([3,2]);x.lineWidth=1.3;for(const u of [.42,.58]){x.beginPath();x.moveTo((u-.05)*w,.38*h);x.lineTo((u+.05)*w,.38*h);x.lineTo((u+.045)*w,.80*h);x.lineTo(u*w,.90*h);x.lineTo((u-.045)*w,.80*h);x.closePath();x.stroke();}
  x.beginPath();x.moveTo(.33*w,.22*h);x.quadraticCurveTo(.5*w,.34*h,.67*w,.22*h);x.stroke();
  for(const sx of [0,1]){x.beginPath();x.moveTo(sx*w+(sx?-1:1)*.035*w,.12*h);x.lineTo(sx*w+(sx?-1:1)*.035*w,.62*h);x.quadraticCurveTo(sx*w+(sx?-1:1)*.03*w,.74*h,sx*w,.78*h);x.stroke();}x.setLineDash([]);
  noise(x,w,h,7000,93,(px,py,r)=>{x.fillStyle=r<.5?`rgba(255,255,255,${.04+r*.10})`:`rgba(20,30,60,${.03+r*.06})`;x.fillRect(px,py,1,2);});},[1,1])
};
function mat(color,{fabric,rough=.7,clear=0,sheen=0,metal=0,glow=.10,map,side=T.DoubleSide}={}){
 const m=new T.MeshPhysicalMaterial({color,roughness:rough,metalness:metal,clearcoat:clear,clearcoatRoughness:.35,sheen,sheenRoughness:.6,sheenColor:new T.Color(color).lerp(new T.Color('#ffffff'),.4),side});
 if(map)m.map=map;else if(fabric)m.map=fabrics[fabric]();m.emissive=new T.Color(color);m.emissiveIntensity=glow;return m;}
// ---------------------------------------------------------------- geometry kit ------------------------------------------
function mergeW(list){const m=new Map();for(const [i,w] of list)if(w>0)m.set(i,(m.get(i)||0)+w);const top=[...m].sort((a,b)=>b[1]-a[1]).slice(0,4),s=top.reduce((n,x)=>n+x[1],0)||1;while(top.length<4)top.push([0,0]);return top.map(([i,w])=>[i,w/s]);}
function finish(pos,uv,si,sw,ix){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
 g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.setIndex(ix);g.computeVertexNormals();g.computeBoundingSphere();return g;}
function makeKit(d,rec){
 const {body,boneIndex,g}=d,BP=g.attributes.position,BN=g.attributes.normal,BSI=g.attributes.skinIndex,BSW=g.attributes.skinWeight,BIX=g.index;
 function register(geo,m){const mesh=new T.SkinnedMesh(geo,m);mesh.name=rec.id+'_'+rec.meshes.length;mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(body.skeleton,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;body.parent.add(mesh);rec.meshes.push(mesh);return mesh;}
 // a garment cut from her skin: pick(id) chooses vertices, place(rest,normal,id) reshapes them, cuts are fields f(placed,rest)>=0
 // to keep (linear clipping, skin weights blended), uv(rest,placed) -> [u,v] with u wrapping every `wrapU`
 function skinShell({pick,place,cuts=[],uv,wrapU=0,part=null}){
  const X=[],R=[],W=[],cells=new Map(),idOf=new Map();let tris=[];
  const find=(rx,ry,rz)=>{const cx=Math.round(rx*4e3),cy=Math.round(ry*4e3),cz=Math.round(rz*4e3);for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++){const l=cells.get((cx+a)+','+(cy+b)+','+(cz+c));if(l)for(const k of l){const r=R[k];if(Math.abs(r.x-rx)<2.5e-4&&Math.abs(r.y-ry)<2.5e-4&&Math.abs(r.z-rz)<2.5e-4)return k;}}return -1;};
  const vtx=id=>{let k=idOf.get(id);if(k!==undefined)return k;const rx=BP.getX(id),ry=BP.getY(id),rz=BP.getZ(id);k=find(rx,ry,rz);
   if(k<0){k=R.length;const r=V(rx,ry,rz),q=place(r,V(BN.getX(id),BN.getY(id),BN.getZ(id)).normalize(),id);X.push(q);R.push(r);
    const w=[];for(let c=0;c<4;c++)w.push([BSI.getComponent(id,c),BSW.getComponent(id,c)]);W.push(mergeW(w));const key=Math.round(rx*4e3)+','+Math.round(ry*4e3)+','+Math.round(rz*4e3);if(!cells.has(key))cells.set(key,[]);cells.get(key).push(k);}
   idOf.set(id,k);return k;};
  for(let i=0;i<BIX.count;i+=3){const a=BIX.getX(i),b=BIX.getX(i+1),c=BIX.getX(i+2);if(!(pick(a)&&pick(b)&&pick(c)))continue;const A=vtx(a),B=vtx(b),Cc=vtx(c);if(A!==B&&B!==Cc&&A!==Cc)tris.push(A,B,Cc);}
  for(const f of cuts){const val=[],vf=k=>val[k]??=f(X[k],R[k]),mid=new Map(),out=[];
   const split=(a,b)=>{const key=a<b?a+'_'+b:b+'_'+a;let k=mid.get(key);if(k!==undefined)return k;const va=vf(a),vb=vf(b),t=va/(va-vb);k=R.length;X.push(X[a].clone().lerp(X[b],t));R.push(R[a].clone().lerp(R[b],t));
    W.push(mergeW([...W[a].map(([i,w])=>[i,w*(1-t)]),...W[b].map(([i,w])=>[i,w*t])]));val[k]=0;mid.set(key,k);return k;};
   for(let i=0;i<tris.length;i+=3){const t=[tris[i],tris[i+1],tris[i+2]],v=t.map(vf),n=v.filter(x=>x>=0).length;if(n===3){out.push(...t);continue;}if(n===0)continue;
    const poly=[];for(let j=0;j<3;j++){const a=t[j],b=t[(j+1)%3];if(v[j]>=0)poly.push(a);if((v[j]>=0)!==(v[(j+1)%3]>=0))poly.push(split(a,b));}
    for(let j=1;j+1<poly.length;j++)out.push(poly[0],poly[j],poly[j+1]);}
   tris=out;}
  // smooth normals over the whole shell (parts share them, so no crease where they meet)
  const Nn=X.map(()=>V()),e1=V(),e2=V(),fn=V();for(let i=0;i<tris.length;i+=3){const a=X[tris[i]],b=X[tris[i+1]],c=X[tris[i+2]];e1.subVectors(b,a);e2.subVectors(c,a);fn.crossVectors(e1,e2);for(let j=0;j<3;j++)Nn[tris[i+j]].add(fn);}
  for(const n of Nn)n.normalize();
  const labels=part?[...new Set(R.map(r=>part(r)))]:[null],out={};
  for(const lab of labels){const remap=new Map(),pos=[],nor=[],uvs=[],si=[],sw=[],ix=[],U=new Map(),uvf=typeof uv==='object'&&uv?uv[lab]:uv,wu=typeof wrapU==='object'?wrapU[lab]:wrapU;
   const uvOf=k=>{let u=U.get(k);if(!u){u=uvf?uvf(R[k],X[k]):[0,0];U.set(k,u);}return u;};
   const emit=(k,shift)=>{const key=k+'|'+shift;let n=remap.get(key);if(n!==undefined)return n;n=pos.length/3;const p=X[k],q=Nn[k],u=uvOf(k);pos.push(p.x,p.y,p.z);nor.push(q.x,q.y,q.z);uvs.push(u[0]+shift,u[1]);for(const [b,w] of W[k]){si.push(b);sw.push(w);}remap.set(key,n);return n;};
   for(let i=0;i<tris.length;i+=3){const t=[tris[i],tris[i+1],tris[i+2]];if(part){const l=t.map(k=>part(R[k]));const cnt=l.filter(x=>x===lab).length;if(cnt<2&&!(cnt===1&&new Set(l).size===3&&l[0]===lab))continue;}
    let shift=[0,0,0];if(wu&&uvf){const us=t.map(k=>uvOf(k)[0]);if(Math.max(...us)-Math.min(...us)>wu/2)shift=us.map(u=>u<wu/2?wu:0);}
    ix.push(emit(t[0],shift[0]),emit(t[1],shift[1]),emit(t[2],shift[2]));}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('normal',new T.Float32BufferAttribute(nor,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
   g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.setIndex(ix);g.computeBoundingSphere();out[lab]=g;}
  return part?out:out[null];
 }
 // boundary chains of a mesh (edges used by one triangle), as arrays of vertex indices
 function rims(geo){const ix=geo.index.array,p=geo.attributes.position,key=i=>Math.round(p.getX(i)*1e5)+','+Math.round(p.getY(i)*1e5)+','+Math.round(p.getZ(i)*1e5),canon=new Map(),rep=i=>{const k=key(i);if(!canon.has(k))canon.set(k,i);return canon.get(k);};
  const cnt=new Map();for(let i=0;i<ix.length;i+=3)for(let j=0;j<3;j++){const a=rep(ix[i+j]),b=rep(ix[i+(j+1)%3]);if(a===b)continue;const k=a<b?a+'_'+b:b+'_'+a;cnt.set(k,(cnt.get(k)||0)+1);}
  const nb=new Map(),link=(a,b)=>{if(!nb.has(a))nb.set(a,[]);nb.get(a).push(b);};
  for(const [k,n] of cnt)if(n===1){const [A,B]=k.split('_').map(Number);link(A,B);link(B,A);}
  const seen=new Set(),out=[],walk=s=>{const chain=[s];seen.add(s);let cur=s,prev=-1;for(;;){const nx=(nb.get(cur)||[]).find(x=>x!==prev&&!seen.has(x));if(nx===undefined)break;chain.push(nx);seen.add(nx);prev=cur;cur=nx;}
   const closed=chain.length>2&&(nb.get(cur)||[]).includes(s);out.push({ids:chain,closed});};
  for(const [v,l] of nb)if(l.length===1&&!seen.has(v))walk(v);for(const v of nb.keys())if(!seen.has(v))walk(v);return out;}
 // piping (thickness) along the rims of a garment, skinned like the rim vertices
 function pipe(geo,m,r=.0022,filter=null){const p=geo.attributes.position,nrm=geo.attributes.normal,gi=geo.attributes.skinIndex,gw=geo.attributes.skinWeight,pos=[],uv=[],si=[],sw=[],ix=[];
  for(const {ids,closed} of rims(geo)){let pts=ids.filter(i=>!filter||filter(V().fromBufferAttribute(p,i)));if(pts.length<3)continue;const n=pts.length,seg=6,base=pos.length/3;
   for(let j=0;j<n;j++){const a=V().fromBufferAttribute(p,pts[closed?(j-1+n)%n:Math.max(0,j-1)]),b=V().fromBufferAttribute(p,pts[closed?(j+1)%n:Math.min(n-1,j+1)]),c=V().fromBufferAttribute(p,pts[j]),t=b.sub(a).normalize(),nn=V().fromBufferAttribute(nrm,pts[j]),u=V().crossVectors(t,nn).normalize(),w=V().crossVectors(u,t).normalize();
    for(let k=0;k<seg;k++){const ang=k/seg*Math.PI*2,q=c.clone().addScaledVector(u,Math.cos(ang)*r).addScaledVector(w,Math.sin(ang)*r);pos.push(q.x,q.y,q.z);uv.push(k/seg,j/n);for(let cc=0;cc<4;cc++){si.push(gi.getComponent(pts[j],cc));sw.push(gw.getComponent(pts[j],cc));}}}
   for(let j=0;j<(closed?n:n-1);j++){const a=base+j*seg,b=base+((j+1)%n)*seg;for(let k=0;k<seg;k++){const k2=(k+1)%seg;ix.push(a+k,b+k,a+k2,a+k2,b+k,b+k2);}}}
  if(!ix.length)return null;return register(finish(pos,uv,si,sw,ix),m);}
 // snap points onto a garment (nearest triangle), lifted along its normal, taking its blended skin weights
 function snapper(geo){const q=getTriangleQuery(geometryTriangles(geo)),gi=geo.attributes.skinIndex,gw=geo.attributes.skinWeight,nr=V(),bc=V();
  return (p,lift=0)=>{const h=q.nearest(p);h.record.t.getNormal(nr);h.record.t.getBarycoord(h.point,bc);const b=[bc.x,bc.y,bc.z],l=[];for(let j=0;j<3;j++)for(let c=0;c<4;c++)l.push([gi.getComponent(h.record.ids[j],c),gw.getComponent(h.record.ids[j],c)*b[j]]);
   return {p:h.point.clone().addScaledVector(nr,lift),n:nr.clone(),w:mergeW(l)};};}
 // a surface given point by point with its own skin weights: fn(u,v) -> {p, w}
 function surface(rows,cols,fn,m,uvScale=[1,1],axis=null){const pos=[],uv=[],si=[],sw=[],ix=[];for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const s=fn(j/rows,i/cols);pos.push(s.p.x,s.p.y,s.p.z);uv.push(i/cols*uvScale[0],j/rows*uvScale[1]);for(const [b,w] of s.w){si.push(b);sw.push(w);}}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i;ix.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}let geo=finish(pos,uv,si,sw,ix);
  if(axis){const p=geo.attributes.position,nr=geo.attributes.normal;let dot=0;for(let i=0;i<p.count;i++){const c=axis(p.getY(i));dot+=(p.getX(i)-c.x)*nr.getX(i)+(p.getZ(i)-c.z)*nr.getZ(i);}
   if(dot<0){for(let i=0;i<ix.length;i+=3){const t=ix[i+1];ix[i+1]=ix[i+2];ix[i+2]=t;}geo.dispose();geo=finish(pos,uv,si,sw,ix);}}
  register(geo,m);return geo;}
 const bone=n=>boneIndex(n);
 // rigid/height-blended torso weights for loose pieces
 function torsoW(y){const H=d.hip.y,sp=d.pos('spine').y,ch=d.pos('chest').y,up=d.pos('upperChest').y;if(y<sp)return mergeW([[bone('hips'),1-C((y-H)/(sp-H),0,1)],[bone('spine'),C((y-H)/(sp-H),0,1)]]);
  if(y<ch)return mergeW([[bone('spine'),1-(y-sp)/(ch-sp)],[bone('chest'),(y-sp)/(ch-sp)]]);return mergeW([[bone('chest'),1-C((y-ch)/(up-ch),0,1)],[bone('upperChest'),C((y-ch)/(up-ch),0,1)]]);}
 function tube(points,r,m,w,seg=8,closed=false){const curve=new T.CatmullRomCurve3(points,closed);const geo=new T.TubeGeometry(curve,Math.max(8,points.length*4),r,seg,closed);const p=geo.attributes.position,si=[],sw=[];
  for(let i=0;i<p.count;i++){const ww=typeof w==='function'?w(V().fromBufferAttribute(p,i)):w;for(const [b,x] of ww){si.push(b);sw.push(x);}}geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));register(geo,m);return geo;}
 function blob(center,radii,m,w,seg=12){const geo=new T.SphereGeometry(1,seg,Math.max(6,seg*.6|0));geo.scale(...radii);geo.translate(center.x,center.y,center.z);const p=geo.attributes.position,si=[],sw=[];
  for(let i=0;i<p.count;i++){const ww=typeof w==='function'?w(V().fromBufferAttribute(p,i)):w;for(const [b,x] of ww){si.push(b);sw.push(x);}}geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));register(geo,m);return geo;}
 // the donor's own skin around a region, as the other Secret styles carry it (the native body is hidden under a style)
 function skinCopy(test,m,offset=.0015){const keep=id=>test(BP.getX(id),BP.getY(id),BP.getZ(id));return register(skinShell({pick:keep,place:(r,n)=>r.clone().addScaledVector(n,offset),uv:(r)=>[0,0]}),m);}
 // body-surface weights near a point (shoes)
 function bodyNear(p){bodyQ??=getTriangleQuery(geometryTriangles(g));const h=bodyQ.nearest(p),bc=h.record.t.getBarycoord(h.point,V()),b=[bc.x,bc.y,bc.z],l=[];
  for(let j=0;j<3;j++)for(let c=0;c<4;c++)l.push([BSI.getComponent(h.record.ids[j],c),BSW.getComponent(h.record.ids[j],c)*b[j]]);return {p:h.point.clone(),w:mergeW(l)};}
 let bodyQ=null;function bodyW(p){bodyQ??=getTriangleQuery(geometryTriangles(g));const h=bodyQ.nearest(p),bc=h.record.t.getBarycoord(h.point,V()),b=[bc.x,bc.y,bc.z],l=[];
  for(let j=0;j<3;j++)for(let c=0;c<4;c++)l.push([BSI.getComponent(h.record.ids[j],c),BSW.getComponent(h.record.ids[j],c)*b[j]]);return mergeW(l);}
 return {register,skinShell,rims,pipe,snapper,surface,torsoW,tube,blob,skinCopy,bodyW,bodyNear,bone};
}
// ---------------------------------------------------------------- tops --------------------------------------------------
function buildTop(d,K,look){
 const J=look.jacket,Sh=look.shirt,{W,hip,neck,ring,reach,armT}=d,BP=d.g.attributes.position,zN=neck.z+.002;
 const skin=new T.MeshToonMaterial({color:'#fff1df',emissive:'#bca98f',emissiveIntensity:.18,side:T.DoubleSide});
 K.skinCopy((x,y)=>y>hip.y-.025&&y<neck.y+.035,skin);
 const jmA=J.fabric==='foil'?mat('#ffffff',{map:fabrics.foil(J.color,.35),rough:.32,clear:.75,metal:.12,glow:.05}):null;
 const jm=J.fabric==='foil'?mat('#ffffff',{map:fabrics.foil(J.color,1),rough:.32,clear:.75,metal:.15,glow:.05}):mat(J.color,{fabric:J.fabric,rough:J.fabric==='leather'?.36:J.fabric==='cord'?.86:.92,clear:J.fabric==='leather'?.55:0,sheen:J.fabric==='suede'||J.fabric==='cord'?.7:0,glow:J.fabric==='leather'?.08:.12});
 const lining=mat(new T.Color(J.color).multiplyScalar(.55).getStyle(),{rough:.8,glow:.05,side:T.BackSide});
 const sm=mat(Sh.color,{fabric:Sh.fabric,rough:Sh.fabric==='satin'?.32:.75,sheen:Sh.fabric==='satin'?.9:.2,clear:Sh.fabric==='satin'?.25:0,glow:Sh.fabric==='shirt'?.20:.12});
 const metal=mat('#d9d8d2',{rough:.25,metal:.8,glow:.05}),gold=mat('#c9a86a',{rough:.3,metal:.7,glow:.06});
 const armSide=r=>r.x>=0?'L':'R',armOf=id=>W.L[id]+W.R[id],torsoOf=id=>W.torso[id];
 const pickUpper=lo=>id=>{const y=BP.getY(id);return y>lo-.03&&W.legs[id]<.5&&(W.torso[id]+W.L[id]+W.R[id]+W.neck[id])>.5&&!(W.neck[id]>.5&&y>.965);};
 // torso reshaping: radial push to the convex outline (+ease), waist straightened toward the chest outline, blouson puff
 const chestY=.795;
 function torsoPoint(r,e,straight){const rg=ring(r.y),dx=r.x-rg.c[0],dz=r.z-rg.c[1],len=Math.hypot(dx,dz)||1,ux=dx/len,uz=dz/len;let rr=reach(rg,ux,uz);
  if(straight&&r.y<chestY){const rc=reach(ring(chestY),ux,uz);rr=Math.max(rr,L(rr,rc,straight*S(r.y,.60,chestY-.01)*(1-S(r.y,chestY-.04,chestY))+straight*(1-S(r.y,.60,chestY-.01))*.0));}
  return V(rg.c[0]+ux*(rr+e),r.y,rg.c[1]+uz*(rr+e));}
 const placeFor=(e,armE,straight,extra=()=>0)=>(r,n,id)=>{const wt=torsoOf(id),wa=armOf(id),t=wa>0?armT(r.x,armSide(r)):0,pa=r.clone().addScaledVector(n,armE*(1+.35*C(t,0,1))+(J.shoulder&&e>.008?J.shoulder*S(r.y,.86,.905)*(1-S(Math.abs(r.x),.10,.16)):0));
  const k=C(wt/(wt+wa+1e-6),0,1)*(1-S(r.y,.818,.856));if(k<=0)return pa;return pa.lerp(torsoPoint(r,e+extra(r.y),straight),k);};
 const front=r=>r.z>.004,opening=y=>J.open(y);
 const neckCut=(lo)=>(p,r)=>{const dx=r.x,dz=r.z-zN,rad=Math.hypot(dx,dz);if(rad>.095)return 1;const b=Math.atan2(Math.abs(dx),-dz);return (lo-.010*S(b,1.3,2.8))-r.y;};
 const sleeveCut=end=>(p,r)=>{if(Math.abs(r.x)<=Math.abs(d.sh.L.x))return 1;return end-armT(r.x,r.x>=0?'L':'R');};
 const torsoUV=(r)=>{const a=Math.atan2(r.x,r.z-.01);return [(a/(2*Math.PI)+.5)*8,r.y*14];};
 const armUV=(r)=>{const a=Math.atan2(r.z+.0145,r.y-.9023);return [(a/(2*Math.PI)+.5)*3,Math.abs(r.x)*14];};
 // --- shirt (only where it can show: the opening, the neck, the cuffs, the tail)
 const puff=y=>J.puff?J.puff*Math.sin(Math.PI*S(y,J.hem+.012,J.hem+.11)):0;
 const shirtHem=Math.max(Sh.hem,Sh.hem<J.hem-.01?J.hem-.012:Sh.hem);
 const partOf=r=>Math.abs(r.x)>.086&&r.y>.852?'arm':'torso';
 const shirtP=K.skinShell({pick:pickUpper(shirtHem),place:placeFor(.0045,.0045,0),part:partOf,wrapU:{torso:8,arm:3},uv:{torso:torsoUV,arm:armUV},
  cuts:[(p,r)=>r.y-shirtHem,neckCut(Sh.vneck?.930:.938),sleeveCut(Sh.cuff),
   ...(Sh.vneck?[(p,r)=>!front(r)?1:Math.abs(r.x)-.022*S(r.y,.86,.93)+.0001]:[])]});
 const shirt=shirtP.torso,shirtA=shirtP.arm;for(const g of [shirt,shirtA])if(g&&g.index.count){K.register(g,sm);K.pipe(g,sm,.0016);}
 // shirt tail below the jacket (m1): a short straight skirt from the hip outline
 if(Sh.hem<J.hem-.01){const top=J.hem+.010,bot=Sh.hem;K.surface(4,48,(u,v)=>{const y=L(top,bot,u),rg=ring(Math.max(y,hip.y-.018)),a=v*Math.PI*2,ux=Math.sin(a),uz=Math.cos(a),rr=reach(rg,ux,uz)+.017+.008*u;
  return {p:V(rg.c[0]+ux*rr,y,rg.c[1]+uz*rr),w:K.torsoW(Math.max(y,hip.y))};},sm,[8,1]);}
 // --- jacket
 const jacketP=K.skinShell({pick:pickUpper(J.hem),place:placeFor(J.ease,J.sleeve,J.straight,puff),part:partOf,wrapU:{torso:8,arm:3},uv:{torso:torsoUV,arm:armUV},
  cuts:[(p,r)=>r.y-J.hem,neckCut(J.collar==='band'?.934:.930),sleeveCut(J.sleeveEnd),(p,r)=>!front(r)?1:Math.abs(r.x)-opening(r.y)]});
 const jacket=jacketP.torso,jacketA=jacketP.arm;K.register(jacket,jm);K.register(jacketA,jmA||jm);K.register(jacket,lining);K.register(jacketA,lining);
 K.pipe(jacket,jm,J.fabric==='cord'?.0030:.0026);K.pipe(jacketA,jmA||jm,J.fabric==='cord'?.0030:.0026,p=>Math.abs(p.x)>.25);
 const onJ=K.snapper(jacket),onS=K.snapper(shirt),onJA=K.snapper(jacketA),onSA=K.snapper(shirtA),onJall=K.snapper(mergeGeometries([jacket,jacketA],false));
 // cuffs: a band at the sleeve end (jacket), the white shirt cuff a little longer
 for(const s of ['L','R']){const sx=s==='L'?1:-1,sh=d.sh[s],hd=d.hand[s];for(const [end,m,r0,width] of [[J.sleeveEnd,jmA||jm,.0105,.014],[Sh.cuff,sm,.0050,.010]]){
  K.surface(2,20,(u,v)=>{const t=end-width*(1-u),x=sh.x+(hd.x-sh.x)*t,a=v*Math.PI*2;
   const base=V(x,.9023,-.0145),dir=V(0,Math.cos(a),Math.sin(a)),probe=base.clone().addScaledVector(dir,.06),hit=(m===sm?onSA:onJA)(probe,0),rr=hit.p.distanceTo(base)+(m===sm?.0015:.0025);
   return {p:base.addScaledVector(dir,rr),w:hit.w};},m);void sx;void r0;}}
 // --- collars: cut from the same skin as the jacket (so they lie on it and bend with it): the stand continues the jacket above
 // its neckline, the fall is a band below the neckline (+ lapels / long points along the front edge), lifted over the jacket
 const nb=r=>Math.atan2(Math.abs(r.x),-(r.z-zN)),neckY=(lo,b)=>lo-.010*S(b,1.3,2.8);
 const lift=(place,h)=>(r,n,id)=>place(r,n,id).addScaledVector(n,h);
 const jPlace=placeFor(J.ease,J.sleeve,J.straight,puff),sPlace=placeFor(.0045,.0045,0);
 // shirt collar sits on the shirt inside the jacket opening, on the jacket outside it
 const scPlace=h=>(r,n,id)=>{const a=sPlace(r,n,id).addScaledVector(n,.004),b=jPlace(r,n,id).addScaledVector(n,h);if(!front(r))return b;return a.lerp(b,S(Math.abs(r.x)-opening(r.y),-.004,.004));};
 // tri = [[x,y] inner-top, [x,y] outer-top, [x,y] tip] on the front (mirrored), strip = {y0,w(y)} a lapel along the front edge
 const inTri=(r,t)=>{if(!t||!front(r))return -1;const P=[Math.abs(r.x),r.y],e=(a,b)=>((b[0]-a[0])*(P[1]-a[1])-(b[1]-a[1])*(P[0]-a[0]))/Math.hypot(b[0]-a[0],b[1]-a[1]);
  const s0=Math.sign(((t[1][0]-t[0][0])*(t[2][1]-t[0][1])-(t[1][1]-t[0][1])*(t[2][0]-t[0][0])))||1;return Math.min(s0*e(t[0],t[1]),s0*e(t[1],t[2]),s0*e(t[2],t[0]));};
 function collarLayer(m,{place,lo,stand=0,depth,tri=null,strip=null,open=opening,pipeR=.0018,uvs=torsoUV,reachR=.088}){
  const inStrip=r=>strip&&front(r)?Math.min(open(r.y)+strip.w(r.y)-Math.abs(r.x),r.y-strip.y0):-1;
  const g=K.skinShell({pick:pickUpper(.78),place,uv:uvs,wrapU:8,cuts:[(p,r)=>neckY(lo,nb(r))+stand-r.y,
   (p,r)=>Math.max(Math.min(r.y-(neckY(lo,nb(r))-depth(nb(r))),reachR-Math.hypot(r.x,r.z-zN)),inStrip(r),inTri(r,tri)),(p,r)=>!front(r)?1:Math.abs(r.x)-open(r.y),
   (p,r)=>Math.abs(r.x)>.083&&r.y>.85?-1:1]});
  if(g.index.count){K.register(g,m);K.pipe(g,m,pipeR);}return g;}
 const dark=mat(new T.Color(J.fabric==='foil'?'#2a1610':J.color).multiplyScalar(J.fabric==='foil'?1:.82).getStyle(),{fabric:J.fabric==='foil'?'leather':J.fabric,rough:J.fabric==='leather'||J.fabric==='foil'?.34:.9,clear:J.fabric==='leather'||J.fabric==='foil'?.6:0,sheen:J.fabric==='suede'?.7:0,glow:.08});
 if(J.collar==='notch'){collarLayer(dark,{place:lift(jPlace,.0035),lo:.930,stand:.010,depth:b=>.018,strip:{y0:.79,w:y=>.050*Math.pow(S(y,.79,.865),.9)*(1-.70*S(y,.872,.888))},tri:[[.040,.905],[.066,.912],[.074,.878]]});}
 if(J.collar==='point')collarLayer(dark,{place:lift(jPlace,.0035),lo:.930,stand:.011,depth:b=>.020,strip:{y0:.80,w:y=>.016*S(y,.80,.86)},tri:J.fabric==='foil'?[[.032,.908],[.068,.918],[.080,.836]]:[[.030,.906],[.064,.920],[.084,.842]]});
 if(J.collar==='band')collarLayer(jm,{place:lift(jPlace,.002),lo:.931,stand:.010,depth:b=>.004,pipeR:.0022});
 const dag=Sh.collar==='dagger',shOpen=Sh.tie?y=>.0045:Sh.vneck?y=>.004+.024*S(y,.855,.925):dag?y=>.010+.022*S(y,.86,.92):y=>.006;
 if(Sh.collar)collarLayer(sm,{place:scPlace(dag?.0095:.0080),lo:.938,stand:.011,open:shOpen,reachR:.072,depth:b=>dag?.014:.012,pipeR:.0015,
  tri:dag?[[.016,.918],[.042,.934],[.080,.858]]:Sh.vneck?[[.024,.916],[.050,.926],[.056,.872]]:[[.006,.914],[.040,.926],[.044,.876]]});
 // neck pieces
 const red=look.scarf?mat(look.scarf.color,{map:fabrics.polka(look.scarf.color,look.scarf.dots),rough:.6,sheen:.4,glow:.10}):null;
 if(Sh.tie){const tm=mat(Sh.tie,{fabric:'shirt',rough:.6,glow:.16});K.surface(14,4,(u,v)=>{const y=L(.902,.792,u),w=.0085*(1+.35*u)*(1-.8*S(u,.93,1)),hit=onS(V((v-.5)*2*w,y,.12),.0055);return {p:hit.p,w:hit.w};},tm);
  K.blob(onS(V(0,.904,.12),.008).p,[.0075,.0065,.005],tm,onS(V(0,.904,.12),0).w);}
 if(Sh.kerchief){const km=mat(Sh.kerchief,{fabric:'satin',rough:.45,sheen:.8,glow:.14});const knot=onS(V(0,.905,.12),.010);K.blob(knot.p,[.010,.008,.007],km,knot.w);
  for(const s of [1,-1])K.surface(8,3,(u,v)=>{const y=L(.900,.862,u),x=s*(.006+.010*u)+(v-.5)*.012*(1-u*.6),hit=onS(V(x,y,.12),.008+.004*(1-u));return {p:hit.p,w:hit.w};},km);
  K.tube(Array.from({length:17},(_,j)=>{const b=-2.5+j/16*5,dir=V(Math.sin(b),0,-Math.cos(b));return V(dir.x*.057,.928-.016*S(Math.abs(b),1.4,2.5),zN+dir.z*.057);}),.005,km,onJ(V(0,.93,zN-.06),0).w);}
 if(look.scarf){const wrap=Array.from({length:25},(_,j)=>{const b=-Math.PI+j/24*2*Math.PI,dir=V(Math.sin(b),0,-Math.cos(b));return V(dir.x*.061,.936-.020*S(Math.abs(b),1.3,2.7),zN+dir.z*.064);});
  K.tube(wrap,.0110,red,p=>onJall(V(p.x,.925,p.z),0).w,8,true);const kp=V(-.012,.900,0);const knot=onS(V(kp.x,kp.y,.12),.017);K.blob(knot.p,[.019,.014,.011],red,knot.w);
  // the long pointed tail down the chest and a short second end
  K.surface(18,6,(u,v)=>{const y=L(.894,.752,u),cx=-.008+.014*u,w=.026*Math.pow(1-u,.9)+.0015,hit=onS(V(cx+(v-.5)*2*w,y,.12),.011+.006*(1-u));return {p:hit.p,w:hit.w};},red,[.9,1.7]);
  K.surface(9,5,(u,v)=>{const y=L(.893,.842,u),cx=-.026-.012*u,w=.016*(1-u)+.0015,hit=onS(V(cx+(v-.5)*2*w,y,.12),.014);return {p:hit.p,w:hit.w};},red,[1,1.5]);}
 // --- jacket details
 if(J.zip){const zx=-.003;K.tube(Array.from({length:8},(_,j)=>onJ(d.front(L(J.hem+.004,.79,j/7),zx,J.ease),.0018).p),.0016,metal,p=>onJ(p,0).w);
  const pull=onJ(d.front(.79,zx,J.ease),.004);K.blob(pull.p,[.0035,.007,.0018],metal,pull.w);
  for(const [a,b] of [[[.026,.800],[.060,.846]],[[-.030,.700],[-.068,.716]]]){K.tube([0,.5,1].map(t=>onJ(d.front(L(a[1],b[1],t),L(a[0],b[0],t),J.ease),.0016).p),.0013,metal,p=>onJ(p,0).w);const e=onJ(d.front(b[1],b[0],J.ease),.004);K.blob(e.p,[.003,.006,.0016],metal,e.w);}
  // snap studs on the lapel tips and the epaulette-free shoulder
  for(const s of [1,-1]){const st=onJ(d.front(.885,s*(J.open(.885)+.036),J.ease+.006),.007);K.blob(st.p,[.0035,.0035,.002],metal,st.w);}}
 if(J.band){// blouson waistband: gathered band at the hem, open at the front
  K.surface(3,64,(u,v)=>{const y=J.hem+.002+u*.022,rg=ring(y),a0=Math.asin(C(opening(y)/.08,0,.99)),a=a0+v*(2*Math.PI-2*a0),ux=Math.sin(a),uz=Math.cos(a),rr=reach(rg,ux,uz)+J.ease+.002+.0018*Math.cos(v*170);
   return {p:V(rg.c[0]+ux*rr,y,rg.c[1]+uz*rr),w:K.torsoW(y)};},jm,[24,1]);}
 if(J.flaps){const ys=J.flaps==='chest'?[.842]:[.712];for(const y0 of ys)for(const s of [1,-1]){const cx=s*(J.flaps==='chest'?.046:.052);
  K.surface(3,8,(u,v)=>{const y=y0-u*.020,x=cx+(v-.5)*.042*(1-.12*u),hit=onJ(d.front(y,x,J.ease),.004);return {p:hit.p,w:hit.w};},jm);
  const btn=onJ(d.front(y0-.014,cx,J.ease),.0065);K.blob(btn.p,[.0032,.0032,.002],J.buttons?metal:jm,btn.w);}}
 if(J.buttons)for(let k=0;k<5;k++){const y=L(.722,.890,k/4),x=-(J.open(y)+.009),hit=onJ(d.front(y,x,J.ease),.004);K.blob(hit.p,[.0042,.0042,.0024],metal,hit.w);}
 if(J.fabric==='cord'){// shoulder seams + yoke line read as a tailored jacket
  for(const s of [1,-1])K.tube([0,.5,1].map(t=>onJ(V(s*L(.06,.105,t),.912-.012*t,-.01),.0012).p),.0012,jm,p=>onJ(p,0).w);}
 // bracelets
 if(look.wrist){const W2=look.wrist,bead1=mat('#3b2a22',{rough:.4,clear:.6,glow:.04}),bead2=mat('#8a5a35',{rough:.4,clear:.5,glow:.05});
  for(const s of ['L','R']){const which=s==='L'?'left':'right';if(W2.beads!==which&&W2.chain!==which)continue;const sh=d.sh[s],hd=d.hand[s],beads=W2.beads===which;
   for(const t of (beads?[.952,.974]:[.965])){const base=V(sh.x+(hd.x-sh.x)*t,.9023,-.0145),n=beads?14:22;
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2,dir=V(0,Math.cos(a),Math.sin(a)),hit=K.bodyNear(base.clone().addScaledVector(dir,.05)),rr=hit.p.distanceTo(base)+(beads?.0050:.0032);
     K.blob(base.clone().addScaledVector(dir,rr),beads?[.0042,.0042,.0042]:[.0026,.0020,.0026],beads?(i%3?bead1:bead2):metal,hit.w,6);}}}}
 void gold;
}
// ---------------------------------------------------------------- bottoms -----------------------------------------------
function buildBottom(d,K,look){
 const Jn=look.jeans,{hip,ring,reach,pos}=d,top=.734,bone=K.bone;
 const lin=mat(Jn.dark,{rough:.9,glow:.05});K.skinCopy((x,y)=>y<top-.003&&y>d.floor+.025,lin,.004);
 const den=mat('#ffffff',{map:fabrics.jeans(Jn),rough:.86,sheen:.25,glow:.10}),seatM=mat('#ffffff',{map:fabrics.seat(Jn),rough:.86,sheen:.25,glow:.10});
 const inside=mat(new T.Color(Jn.dark).multiplyScalar(.8).getStyle(),{rough:.9,glow:.04,side:T.BackSide});
 // leg cross-section (ellipse) at height y: thigh, slim knee, bell flare; centre pushed outward/forward by the flare
 const legs={};for(const side of ['left','right'])legs[side]={up:pos(side+'UpperLeg'),kn:pos(side+'LowerLeg'),ft:pos(side+'Foot'),sx:side==='left'?1:-1};
 function legSection(side,y){const {up,kn,ft,sx}=legs[side],c=y>kn.y?up.clone().lerp(kn,C((up.y-y)/(up.y-kn.y),0,1)):kn.clone().lerp(ft,C((kn.y-y)/(kn.y-ft.y),0,1)),fl=Math.pow(S(kn.y-.03-y,0,kn.y-d.floor-.03),1.35);
  const thigh=S(y,kn.y+.02,up.y-.02),rx=L(.0505,.0700,thigh)+.0215*fl,rz=L(.0525,.0690,thigh)+.0235*fl;return {cx:c.x+sx*.012*fl,cz:(y>kn.y?c.z:kn.z)+.004*fl+.004*thigh,rx,rz,fl};}
 // each leg is one piece from the waistband to the hem: above the crotch its outline is half of the hip outline closed on the
 // centre plane (the two legs meet at the centre-front/back seams, like real trousers), below it the thigh/knee/flare ellipse
 const crotch=hip.y-.058,half=(sx,a,y,e)=>{const rg=ring(Math.max(y,hip.y-.018)),c0=rg.c,pt=th=>{const ux=sx*Math.cos(th),uz=sx*Math.sin(th),rr=reach(rg,ux,uz)+e;return [c0[0]+ux*rr,c0[1]+uz*rr];};
  const P1=pt(Math.PI/2),P3=pt(-Math.PI/2);
  if(a<=Math.PI/2)return pt(a);if(a>=1.5*Math.PI)return pt(a-2*Math.PI);const t=(a-Math.PI/2)/Math.PI;return [sx*.0006,L(P1[1],P3[1],t)];};
 for(const side of ['left','right']){const {kn,sx}=legs[side],floor=d.floor;
  const legW=p=>{const kneeW=S(kn.y-p.y,-.05,.06),H=S(p.y,crotch-.03,hip.y+.04);return mergeW([[bone('hips'),H*.9],[bone(side+'UpperLeg'),(1-H*.9)*(1-kneeW)],[bone(side+'LowerLeg'),(1-H*.9)*kneeW]]);};
  const leg=K.surface(44,40,(u,v)=>{const a=v*Math.PI*2,ox=Math.cos(a),oz=Math.sin(a),fz=sx*oz,hem=floor+.004+.030*Math.pow(Math.max(0,fz),1.6)+.006*Math.max(0,fz),
    y=u<.32?L(top,crotch-.012,u/.32):L(crotch-.012,hem,(u-.32)/.68),e=legSection(side,y),E=[e.cx+sx*ox*e.rx,e.cz+fz*e.rz+(fz<0?.003*e.fl:0)],k=1-S(y,crotch-.010,crotch+.032),H=k<1?half(sx,a,y,.007):E;
   const p=V(L(H[0],E[0],k),y,L(H[1],E[1],k));return {p,w:legW(p)};},den,[1,1],y=>{if(y>crotch){const r=ring(Math.max(y,hip.y-.018));return {x:r.c[0]+sx*.03,z:r.c[1]};}const e=legSection(side,y);return {x:e.cx,z:e.cz};});
  // the u texture coordinate runs outer seam -> front -> inner seam -> back on both legs, matching the wash map
  if(sx<0){const uv=leg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));uv.needsUpdate=true;}
  K.register(leg,inside);K.pipe(leg,mat(Jn.dark,{rough:.9,glow:.06}),.0024,p=>p.y<floor+.05);
 }
 {const rg=ring(hip.y-.018);K.blob(V(0,crotch+.004,rg.c[1]),[.020,.030,.062],den,mergeW([[bone('hips'),.6],[bone('leftUpperLeg'),.2],[bone('rightUpperLeg'),.2]]),14);}
 // waistband + belt loops (+ belt for m2/m3), fly, studs, m1's tassel
 const band=mat(Jn.base,{map:fabrics.seat(Jn),rough:.85,glow:.10});
 K.surface(2,64,(u,v)=>{const y=top-u*.016,rg=ring(y),a=v*Math.PI*2,ux=Math.sin(a),uz=Math.cos(a),rr=reach(rg,ux,uz)+.0105;return {p:V(rg.c[0]+ux*rr,y,rg.c[1]+uz*rr),w:K.torsoW(y)};},band);
 const at=(y,a,e)=>{const rg=ring(y),ux=Math.sin(a),uz=Math.cos(a),rr=reach(rg,ux,uz)+e;return V(rg.c[0]+ux*rr,y,rg.c[1]+uz*rr);};
 if(look.belt){const bm=mat(look.belt.color,{rough:.4,clear:.5,glow:.07}),metal=mat(look.belt.buckle,{rough:.22,metal:.85,glow:.05});
  K.surface(2,64,(u,v)=>{const y=top-.002-u*.013,p=at(y,v*Math.PI*2,.0135);return {p,w:K.torsoW(y)};},bm);
  const c=at(top-.0085,0,.0165);K.surface(2,8,(u,v)=>{const p=c.clone().add(V((v-.5)*.024,(u-.5)*.017,0));return {p,w:K.torsoW(p.y)};},metal);
  K.tube([V(-.012,0,0),V(.012,0,0),V(.012,.017,0),V(-.012,.017,0)].map(q=>q.add(V(c.x,c.y-.0085,c.z+.003))),.0016,metal,K.torsoW(c.y),6,true);}
 else for(let k=0;k<6;k++){const a=k/6*Math.PI*2+.35,p=at(top-.008,a,.0115);K.blob(p,[.0035,.008,.002],band,K.torsoW(p.y),6);}
 const metal=mat('#d6d4cc',{rough:.25,metal:.8,glow:.05});
 if(Jn.fly)for(let k=0;k<5;k++){const y=top-.024-k*.017,p=at(y,0,.0105);K.blob(p,[.0034,.0034,.002],metal,K.torsoW(Math.max(y,hip.y)),8);}
 if(Jn.tassel){const tp=at(top-.016,-.95,.016),tm=mat('#1f1b1b',{rough:.5,glow:.04});K.tube([tp,tp.clone().add(V(.002,-.025,.004))],.0016,metal,K.torsoW(hip.y),5);
  for(let k=0;k<9;k++){const a=k/9*Math.PI*2,o=V(Math.cos(a)*.004,0,Math.sin(a)*.004);K.tube([tp.clone().add(V(.002,-.026,.004)).add(o),tp.clone().add(V(.002+o.x*1.4,-.075,.006+o.z*1.4))],.0012,tm,K.torsoW(hip.y),4);}
  K.blob(tp.clone().add(V(.002,-.028,.004)),[.0045,.006,.0045],tm,K.torsoW(hip.y),8);}
}
// ---------------------------------------------------------------- shoes -------------------------------------------------
function buildShoes(d,K,look){
 const Z=look.shoes,floor=d.floor;
 const skin=new T.MeshToonMaterial({color:'#fff1df',emissive:'#bca98f',emissiveIntensity:.18,side:T.DoubleSide});
 const sock=mat(Z.socks||'#2a2422',{rough:.9,glow:Z.socks?.22:.04});
 K.skinCopy((x,y)=>y>floor&&y<d.hip.y-.105,Z.socks?sock:skin,.0005);
 const up=mat(Z.color,{fabric:'leather',rough:Z.kind==='cowboy'?.42:.3,clear:.7,glow:Z.kind==='cowboy'?.10:.06}),sole=mat(Z.sole||'#2b1d17',{rough:.6,glow:Z.sole?.18:.03}),stitch=mat('#e8c58f',{rough:.6,glow:.15});
 for(const side of ['left','right']){const f=d.pos(side+'Foot'),sx=side==='left'?1:-1,heelZ=f.z-.046,toeZ=Z.kind==='cowboy'?f.z+.150:Z.kind==='loafer'?f.z+.112:Z.kind==='boot'?f.z+.132:f.z+.142,heel=Z.heel||0,soleT=Z.kind==='loafer'?.013:.006;
  const w=l=>{const ball=.036,heelW=.027;if(Z.kind==='loafer')return L(heelW,ball+.003,S(l,0,.5))*Math.sqrt(Math.max(0,1-Math.pow(S(l,.62,1.0),2)))+.002;return L(heelW,ball,S(l,0,.45))*Math.pow(1-S(l,.50,1),1.15)+.0025;};
  const topY=l=>{const ank=floor+(Z.kind==='loafer'?.062:.080),mid=floor+soleT+(Z.kind==='loafer'?.026:.024);if(Z.kind==='loafer')return L(ank,mid,S(l,.28,.80));return L(ank,mid,S(l,.28,.62))-(.024-.004)*S(l,.62,1);};
  const soleY=l=>floor+(heel?heel*(1-S(l,.22,.40)):0);
  const W_=K.bodyW(V(f.x,floor+.03,f.z)),Wt=K.bodyW(V(f.x,floor+.02,f.z+.06));
  const shoeW=p=>{const l=C((p.z-heelZ)/(toeZ-heelZ),0,1);return l<.62?W_:mergeW([...W_.map(([i,x])=>[i,x*(1-.4*S(l,.62,1))]),...Wt.map(([i,x])=>[i,x*.4*S(l,.62,1)])]);};
  // upper: around from the outer sole edge over the top to the inner sole edge
  K.surface(26,18,(u,v)=>{const l=u,z=L(heelZ,toeZ,l),a=v*Math.PI,ww=w(l),y0=soleY(l)+soleT,yt=topY(l),xo=Math.cos(a),yo=Math.pow(Math.sin(a),.75);const back=l<.08?S(.08-l,0,.08):0;
   return {p:V(f.x+sx*xo*ww*(1-.35*back),y0+(yt-y0)*yo,z-.006*back*yo),w:shoeW(V(0,0,z))};},up);
  // sole plate (+ thick white platform for the loafer) and the heel block
  K.surface(26,10,(u,v)=>{const l=u,z=L(heelZ,toeZ,l),ww=w(l)+.0015,y=soleY(l)+(v===0||v===1?soleT:0),x=f.x+sx*(v*2-1)*ww;return {p:V(x,v===0||v===1?soleY(l)+soleT*.5:soleY(l),z),w:shoeW(V(0,0,z))};},sole);
  K.surface(26,2,(u,v)=>{const l=u,z=L(heelZ,toeZ,l),ww=w(l)+.0016,yb=soleY(l),y=v===0?yb:v===1?yb+soleT*.5:yb+soleT;return {p:V(f.x+sx*ww*(v===1?1.02:1),y,z),w:shoeW(V(0,0,z))};},sole);
  K.surface(26,2,(u,v)=>{const l=u,z=L(heelZ,toeZ,l),ww=w(l)+.0016,yb=soleY(l),y=v===0?yb:v===1?yb+soleT*.5:yb+soleT;return {p:V(f.x-sx*ww*(v===1?1.02:1),y,z),w:shoeW(V(0,0,z))};},sole);
  if(heel)K.surface(2,12,(u,v)=>{const a=v*Math.PI*2,z=heelZ+.016+Math.sin(a)*.014*(1-.25*u),x=f.x+Math.cos(a)*.020*(1-.2*u),y=L(floor+heel,floor,u);return {p:V(x,y,z),w:W_};},sole);
  // shaft hidden under the flare (no gap between the trousers and the shoe)
  K.surface(4,16,(u,v)=>{const a=v*Math.PI*2,y=L(floor+.05,floor+.15,u);return {p:V(f.x+Math.cos(a)*.031,y,f.z-.004+Math.sin(a)*.035),w:K.bodyW(V(f.x,y,f.z))};},Z.kind==='loafer'?sock:up);
  if(Z.kind==='cowboy')K.tube(Array.from({length:7},(_,j)=>{const l=.55+j*.06,z=L(heelZ,toeZ,l);return V(f.x+sx*.000,topY(l)+.0016,z);}),.0011,stitch,shoeW(V(0,0,f.z+.07)),4);
  if(Z.kind==='loafer'){const l0=.55,z0=L(heelZ,toeZ,l0);K.surface(2,10,(u,v)=>{const a=v*Math.PI,ww=w(l0)*.85;return {p:V(f.x+sx*Math.cos(a)*ww,topY(l0)+.002+Math.sin(a)*.004*(1-u)+u*.002,z0+u*.012),w:shoeW(V(0,0,z0))};},mat('#2c2828',{rough:.35,clear:.6,glow:.05}));}
 }
}
// ---------------------------------------------------------------- builder -----------------------------------------------
export function* buildSecretStars(variants,options){
 const records=new Map(),parts=[],timings=[];
 for(const slot of ['top','bottom','shoes'])for(const [index,opt] of (options[slot]||[]).entries()){
  const m=/^secret-crew-(m[1-4])-(top|bottom|shoes)$/.exec(opt.style||'');if(!m||m[2]!==slot)continue;const look=starLooks[m[1]],start=performance.now(),donor=variants[opt.variant],d=donorData(donor),rec={id:opt.id,index,slot,meshes:[]},K=makeKit(d,rec);
  if(slot==='top')buildTop(d,K,look);else if(slot==='bottom')buildBottom(d,K,look);else buildShoes(d,K,look);
  // one draw per material
  const groups=new Map();for(const mesh of rec.meshes){const g=mesh.geometry,key=mesh.material.uuid+'|'+Object.keys(g.attributes).sort().join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);}
  for(const ms of groups.values())if(ms.length>1){const uniq=[...new Set(ms.map(x=>x.geometry))];if(uniq.length<ms.length)continue;const g=mergeGeometries(ms.map(x=>x.geometry),false);if(!g)continue;
   const old=ms.map(x=>x.geometry);ms[0].geometry=g;for(const x of ms.slice(1)){x.removeFromParent();rec.meshes.splice(rec.meshes.indexOf(x),1);}for(const o of old)if(!rec.meshes.some(x=>x.geometry===o))o.dispose();}
  rec.buildMs=performance.now()-start;records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});timings.push({slot,ms:rec.buildMs,meshes:rec.meshes.length});yield;
 }
 return {records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
