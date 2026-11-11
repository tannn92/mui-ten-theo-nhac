import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1111.2211';
// The four Secret singers (owner 2026-11-10: poster "Secret · phiên bản Tinh Hà Say Hi" + the stage photo; "Outfit vẫn k giống
// trong ảnh tôi mô tả, làm kĩ lại đi", "làm kỹ lại quần áo giày dép"). Crew-only looks secret-crew-m1..m4-{top,bottom,shoes}.
//  m1 CongB: caramel suede biker jacket (wide lapels, studs, epaulettes, diagonal zip + zip pocket), sleeves pushed up with the
//     white shirt cuff folded over them; white shirt with a big pointed collar and a silver bolo tie; very flared jeans with
//     rhinestones and a silver chain; cognac pointed shoes; chunky silver bangle (right wrist).
//  m2 Cody Nam Võ: maroon-brown blouson (silver zip, ribbed hem band, big flap chest pockets, sleeves bunched at the elbow) over a
//     white shirt with a huge dagger collar and a striped silk neckerchief; red-brown belt; ripped light flares with frayed hems;
//     oxblood glossy shoes; silver chain bracelet (right wrist).
//  m3 Quang Hùng MasterD: oversized camel corduroy jacket (collarless, big round silver buttons, flap pockets) over a gold satin
//     shirt, burgundy polka-dot scarf knotted with two long tails; burgundy belt; button-fly flares with paint splatter; cream shoes.
//  m4 Wren Evans: dark brown leather jacket with copper-foil front panels, a big pointed collar and western flap pockets over a
//     chambray shirt (collar out) and a white tee; dark whiskered bootcut jeans; cognac cowboy boots.
// Garments are cut from the donor's own skin (skinned exactly like her: shoulders bend with the arms, no shelves), the torso
// part pushed out to the convex torso outline (clothes bridge the body, never cling to it), then trimmed by cut fields (hem,
// neckline, front opening, cuffs). Collars are cloth surfaces laid onto the garment below them (pushed out of it, relaxed so they
// have no steps); lapels, pockets, scarves and trims are snapped onto the jacket/shirt and take their skinning.
const V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),S=(x,a,b)=>T.MathUtils.smoothstep(x,a,b),L=T.MathUtils.lerp,C=T.MathUtils.clamp;
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export const starLooks={
 m1:{jacket:{color:'#a8743f',fabric:'suede',hem:.632,ease:.015,straight:.6,shoulder:.007,sleeve:.014,sleeveEnd:.76,foldCuff:true,open:y=>.050*S(y,.785,.905),collar:'notch',zip:'biker',epaulettes:true,
   coll:{th0:.62,yF:.886,yB:.930,sF:.006,sB:.014,roll:.002,outer:[[0,.95,.872,.09],[.12,1.2,.888,.08],[.3,1.55,.910,.056],[.6,2.2,.915,.052],[1,3.1416,.910,.050]]},lapel:{y0:.79,yG:.888,W:[.082,.864],T:[.076,.880],cW:.72}},
  shirt:{color:'#f7f3ea',fabric:'shirt',hem:.640,bolo:true,cuff:.76,
   coll:{th0:.06,yF:.918,yB:.936,sF:.010,sB:.026,lift:.010,fold:.011,outer:[[0,.42,.855,.095],[.10,.85,.884,.09],[.25,1.35,.912,.054],[.55,2.1,.922,.048],[1,3.1416,.918,.046]]}},
  jeans:{base:'#7a9cc8',light:'#c6d8ec',dark:'#46679a',rhine:true,tassel:true,flare:.036},shoes:{kind:'pointed',color:'#9a5b2c',heel:.016},wrist:{bangle:'right'}},
 m2:{jacket:{color:'#56282b',fabric:'twill',hem:.724,ease:.018,puff:.016,straight:.75,shoulder:.009,sleeve:.020,sleeveEnd:.60,bunch:true,open:y=>.044+.008*S(y,.80,.905),band:true,flaps:'chest',zip:'edge',
   coll:{th0:.9,yF:.900,yB:.930,sF:.006,sB:.016,roll:.002,outer:[[0,1.15,.872,.09],[.15,1.4,.900,.062],[.35,1.7,.910,.056],[.6,2.2,.914,.054],[1,3.1416,.910,.052]]}},
  shirt:{color:'#f6f1e6',fabric:'shirt',hem:.722,kerchief:true,cuff:.935,vneck:.030,
   coll:{th0:.30,yF:.888,yB:.936,sF:.008,sB:.030,lift:.010,fold:.011,outer:[[0,.66,.822,.10],[.08,.95,.858,.095],[.22,1.35,.908,.058],[.55,2.1,.922,.050],[1,3.1416,.920,.048]]}},
  belt:{color:'#5e2620',buckle:'#dfe1e6'},jeans:{base:'#7598c4',light:'#c3d6ea',dark:'#43628f',distress:true,flare:.026,hemPipe:'#aabdd2'},shoes:{kind:'boot',color:'#3d1a17',heel:.014},wrist:{chain:'right'}},
 m3:{jacket:{color:'#c49a68',fabric:'cord',hem:.680,ease:.022,straight:.9,shoulder:.013,sleeve:.026,sleeveEnd:.875,open:y=>.036+.010*S(y,.80,.905),collar:'band',buttons:'#dcdcd6',flaps:'hip'},
  shirt:{color:'#dcb05a',fabric:'satin',hem:.722,cuff:.94},scarf:{color:'#7a1c24',dots:'#fbf6f0'},
  belt:{color:'#5a1f22',buckle:'#d8d9d4'},jeans:{base:'#7095c6',light:'#bcd1ea',dark:'#41649a',fly:true,splat:true,flare:.028},shoes:{kind:'loafer',color:'#f2ede2',sole:'#d9d0bd'}},
 m4:{jacket:{color:'#3a2016',fabric:'leather',panel:true,hem:.640,ease:.015,straight:.6,shoulder:.007,sleeve:.013,sleeveEnd:.87,open:y=>.028+.018*S(y,.80,.905),western:true,
   coll:{th0:.42,yF:.878,yB:.930,sF:.008,sB:.020,roll:.002,outer:[[0,.92,.832,.10],[.1,1.2,.866,.09],[.28,1.55,.906,.060],[.6,2.2,.912,.054],[1,3.1416,.908,.052]]}},
  shirt:{color:'#56779b',fabric:'denim',hem:.640,cuff:.935,vneck:true,tee:true,
   coll:{th0:.26,yF:.890,yB:.936,sF:.008,sB:.024,lift:.009,fold:.011,outer:[[0,.42,.876,.09],[.1,.75,.896,.07],[.3,1.4,.926,.042],[1,3.1416,.930,.040]]}},
  jeans:{base:'#3e5c88',light:'#93abc9',dark:'#21304f',whisker:11,flare:.020},shoes:{kind:'cowboy',color:'#a3612c',heel:.020}}
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
 twill:()=>tex('twill',128,128,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);x.strokeStyle='rgba(40,10,15,.10)';for(let i=-h;i<w;i+=2){x.beginPath();x.moveTo(i,0);x.lineTo(i+h,h);x.stroke();}
  noise(x,w,h,3000,71,(px,py,r)=>{x.fillStyle=r<.5?`rgba(255,235,235,${.05+r*.08})`:`rgba(30,5,10,${.04+r*.06})`;x.fillRect(px,py,2,1);});},[5,5]),
 cord:()=>tex('cord',256,64,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);for(let i=0;i<w;i+=8){x.fillStyle='rgba(95,60,25,.20)';x.fillRect(i,0,2,h);x.fillStyle='rgba(255,245,225,.30)';x.fillRect(i+3,0,3,h);}
  noise(x,w,h,2500,31,(px,py,r)=>{x.fillStyle=`rgba(80,50,20,${.03+r*.05})`;x.fillRect(px,py,1,2);});},[1,1]),
 shirt:()=>tex('shirtweave',128,128,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);x.strokeStyle='rgba(80,70,60,.05)';for(let i=0;i<w;i+=3){x.beginPath();x.moveTo(i,0);x.lineTo(i,h);x.stroke();x.beginPath();x.moveTo(0,i);x.lineTo(w,i);x.stroke();}},[6,6]),
 satin:()=>tex('satin',256,256,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);noise(x,w,h,70,41,(px,py,r)=>{const g=x.createLinearGradient(px-14,py-30,px+14,py+30);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,r<.5?'rgba(255,236,190,.32)':'rgba(70,40,10,.16)');g.addColorStop(1,'rgba(255,255,255,0)');
  x.fillStyle=g;x.beginPath();x.ellipse(px,py,5+r*8,26+r*20,.5+r*.6,0,7);x.fill();});},[2,2]),
 denim:()=>tex('denimshirt',128,128,(x,w,h)=>{x.fillStyle='#fff';x.fillRect(0,0,w,h);x.strokeStyle='rgba(30,50,90,.10)';for(let i=-h;i<w;i+=3){x.beginPath();x.moveTo(i,0);x.lineTo(i+h,h);x.stroke();}
  noise(x,w,h,2500,51,(px,py,r)=>{x.fillStyle=r<.5?`rgba(255,255,255,${.10+r*.2})`:`rgba(20,40,80,${.04+r*.06})`;x.fillRect(px,py,2,1);});},[5,5]),
 polka:(base,dot)=>tex('polka'+base,128,128,(x,w,h)=>{x.fillStyle=base;x.fillRect(0,0,w,h);x.fillStyle=dot;for(let j=0;j<6;j++)for(let i=0;i<6;i++){x.beginPath();x.arc(i*21.3+(j%2)*10.6+5,j*21.3+5,4.2,0,7);x.fill();}},[2,2]),
 // dark leather front panels printed with a copper/gold foil: large irregular blotches (tileable value noise, three octaves)
 foil2:()=>tex('foil2',256,256,(x,w,h)=>{const vn=(n,seed)=>{const g=new Float32Array(n*n);for(let i=0;i<n*n;i++)g[i]=rand(seed+i*1.37);
   return (u,v)=>{const X=u*n,Y=v*n,i=Math.floor(X),j=Math.floor(Y),fx=X-i,fy=Y-j,sx=fx*fx*(3-2*fx),sy=fy*fy*(3-2*fy),G=(a,b)=>g[((b%n+n)%n)*n+((a%n+n)%n)];return L(L(G(i,j),G(i+1,j),sx),L(G(i,j+1),G(i+1,j+1),sx),sy);};};
  const o1=vn(5,11),o2=vn(11,23),o3=vn(29,37),o4=vn(64,51),im=x.createImageData(w,h),dk=[58,32,22],cu=[196,122,53],au=[217,162,83],hi=[240,205,140];
  for(let j=0;j<h;j++)for(let i=0;i<w;i++){const u=i/w,v=j/h,val=.52*o1(u,v)+.30*o2(u,v)+.18*o3(u,v),f=o4(u,v);let c;
   if(val<.43)c=dk.map((q,k)=>q*(.85+.3*f));else if(val<.50)c=cu.map((q,k)=>L(q,dk[k],S(.49-val,0,.03)*.6)*(.8+.35*f));else c=(f>.8?hi:au).map(q=>q*(.85+.25*f));
   if(val>.425&&val<.44)c=c.map(q=>q*.6);const p=(j*w+i)*4;im.data[p]=c[0];im.data[p+1]=c[1];im.data[p+2]=c[2];im.data[p+3]=255;}
  x.putImageData(im,0,0);},[1,1]),
 // striped silk neckerchief (m2): cream / tan / brown diagonal stripes
 stripe:()=>tex('stripe2',128,128,(x,w,h)=>{x.fillStyle='#f1e6cf';x.fillRect(0,0,w,h);const cols=[['#7a4b30',7],['#f1e6cf',5],['#c79a68',9],['#f1e6cf',4],['#4f2e20',4],['#f1e6cf',3],['#c79a68',4],['#f1e6cf',6]];
  const per=cols.reduce((a,c)=>a+c[1],0);for(let k=-6;k<10;k++){let p=k*per;for(const [c,sw] of cols){x.fillStyle=c;x.beginPath();x.moveTo(p,0);x.lineTo(p+sw,0);x.lineTo(p+sw-h,h);x.lineTo(p-h,h);x.closePath();x.fill();p+=sw;}}},[1,1]),
 // jeans leg wash: u around the leg (0 outer seam, .25 front, .5 inner seam, .75 back), v from the waist (0) to the hem (1)
 jeans:J=>tex('jeans3'+J.base+(J.rhine?'r':'')+(J.splat?'s':'')+(J.distress?'d':''),256,640,(x,w,h)=>{x.fillStyle=J.base;x.fillRect(0,0,w,h);
  // v: 0 waistband, .32 crotch, .59 knee, 1 hem; u: 0 outer seam, .25 front (centre seam above the crotch), .5 inner, .75 back
  const blob=(u,v,ru,rv,col,a)=>{for(const du of [-1,0,1]){const cx=(u+du)*w,cy=v*h;const g=x.createRadialGradient(cx,cy,0,cx,cy,1);g.addColorStop(0,hexA(col,a));g.addColorStop(.6,hexA(col,a*.55));g.addColorStop(1,hexA(col,0));x.save();x.translate(cx,cy);x.scale(ru*w,rv*h);x.translate(-cx,-cy);x.fillStyle=g;x.beginPath();x.arc(cx,cy,1,0,7);x.fill();x.restore();}};
  // back and seams darker (indigo), fronts of thighs and knees faded
  x.fillStyle=hexA(J.dark,.22);x.fillRect(.55*w,0,.40*w,h);
  for(const [u,a,r] of [[0,.85,.10],[.5,.45,.07],[1,.85,.10]]){const g=x.createLinearGradient((u-r)*w,0,(u+r)*w,0);g.addColorStop(0,hexA(J.dark,0));g.addColorStop(.5,hexA(J.dark,a));g.addColorStop(1,hexA(J.dark,0));x.fillStyle=g;x.fillRect((u-r)*w,0,2*r*w,h);}
  blob(.27,.44,.15,.17,J.light,.95);blob(.26,.60,.12,.06,J.light,.85);blob(.27,.34,.10,.06,J.light,.6);blob(.75,.22,.16,.10,J.light,.55);blob(.27,.80,.12,.16,J.light,.40);blob(.75,.48,.12,.10,J.light,.30);
  // whiskers at the top of the thigh and behind the knee
  const nW=J.whisker||5;x.lineCap='round';for(let k=0;k<nW;k++){const v=.315+k*(.06/nW);x.strokeStyle=hexA(J.light,.75);x.lineWidth=2;x.beginPath();x.moveTo(.47*w,(v-.01)*h);x.quadraticCurveTo(.38*w,(v+.012)*h,(.22+.03*rand(k))*w,(v+.004+.01*rand(k+9))*h);x.stroke();
   x.strokeStyle=hexA(J.dark,.35);x.lineWidth=1;x.beginPath();x.moveTo(.47*w,(v-.004)*h);x.quadraticCurveTo(.38*w,(v+.018)*h,(.24+.03*rand(k))*w,(v+.010+.01*rand(k+9))*h);x.stroke();}
  for(let k=0;k<Math.ceil(nW*.6);k++){const v=.565+k*.012;x.strokeStyle=hexA(J.light,.55);x.lineWidth=1.6;x.beginPath();x.moveTo(.66*w,v*h);x.quadraticCurveTo(.75*w,(v+.008)*h,.84*w,v*h);x.stroke();}
  x.fillStyle=hexA(J.dark,.7);x.fillRect(0,h*.975,w,h*.025);
  // twill and slub
  x.globalAlpha=.10;x.strokeStyle='#0d1830';x.lineWidth=1;for(let i=-h;i<w;i+=3){x.beginPath();x.moveTo(i,0);x.lineTo(i+h*.35,h);x.stroke();}x.globalAlpha=1;
  noise(x,w,h,26000,91,(px,py,r)=>{x.fillStyle=r<.5?`rgba(255,255,255,${.04+r*.12})`:`rgba(10,20,50,${.03+r*.07})`;x.fillRect(px,py,1,2+r*4);});
  // seams and stitching: outer seam, centre seams above the crotch, flat fly, front pocket curves, back yoke and pockets
  x.strokeStyle='rgba(215,150,75,.75)';x.setLineDash([3,3]);x.lineWidth=1.3;
  for(const xx of [3,w-3]){x.beginPath();x.moveTo(xx,0);x.lineTo(xx,h);x.stroke();}
  for(const u of [.25,.75]){x.beginPath();x.moveTo(u*w,0);x.lineTo(u*w,.32*h);x.stroke();}
  x.beginPath();x.moveTo(.30*w,.02*h);x.lineTo(.30*w,.19*h);x.quadraticCurveTo(.295*w,.24*h,.25*w,.26*h);x.stroke();
  x.beginPath();x.moveTo(.04*w,.04*h);x.quadraticCurveTo(.13*w,.06*h,.18*w,.0*h);x.stroke();
  x.beginPath();x.moveTo(.58*w,.07*h);x.quadraticCurveTo(.66*w,.10*h,.75*w,.12*h);x.stroke();
  x.beginPath();x.moveTo(.64*w,.10*h);x.lineTo(.86*w,.10*h);x.lineTo(.85*w,.20*h);x.lineTo(.75*w,.23*h);x.lineTo(.65*w,.20*h);x.closePath();x.stroke();x.setLineDash([]);
  x.fillStyle='rgba(10,20,45,.35)';x.fillRect(.25*w-1,0,2,.25*h);x.fillRect(.64*w,.10*h,.22*w,.008*h);
  if(J.distress){// rips: white weft threads across a dark hole, frayed edges
   for(const [u,v,ru] of [[.28,.43,.05],[.24,.60,.045],[.31,.50,.02],[.20,.70,.02]]){x.fillStyle='rgba(30,40,60,.55)';x.beginPath();x.ellipse(u*w,v*h,ru*w,.008*h,0,0,7);x.fill();
    x.strokeStyle='rgba(250,248,240,.95)';x.lineWidth=1.2;for(let k=0;k<5;k++){const yy=(v-.006+k*.003)*h;x.beginPath();x.moveTo((u-ru*1.05)*w,yy);x.lineTo((u+ru*1.05)*w,yy+1);x.stroke();}}
   x.strokeStyle='rgba(240,238,228,.9)';x.lineWidth=1;for(let i=0;i<w;i+=2){x.beginPath();x.moveTo(i,h*.97);x.lineTo(i+rand(i)*2-1,h*(.985+rand(i+7)*.015));x.stroke();}}
  if(J.splat)for(let k=0;k<34;k++){const u=.13+rand(k+5)*.26,v=.33+rand(k+50)*.22,r=1.2+rand(k+80)*3.2;x.fillStyle='rgba(252,252,248,.97)';x.beginPath();x.ellipse(u*w,v*h,r,r*(.7+rand(k+3)*.6),rand(k)*3,0,7);x.fill();
   if(r>3){x.beginPath();x.arc(u*w+r*1.4,v*h+r,r*.35,0,7);x.fill();}}
  if(J.rhine)for(let k=0;k<44;k++){const u=.04+rand(k+15)*.44,v=.30+rand(k+60)*.64,px=u*w,py=v*h;x.fillStyle='rgba(60,70,90,.8)';x.beginPath();x.arc(px,py,3.2,0,7);x.fill();
   const g=x.createRadialGradient(px-.8,py-.8,0,px,py,2.6);g.addColorStop(0,'#ffffff');g.addColorStop(.6,'#d8dde6');g.addColorStop(1,'#8b93a3');x.fillStyle=g;x.beginPath();x.arc(px,py,2.6,0,7);x.fill();}
 },[1,1]),
 seat:J=>tex('seat'+J.base,256,128,(x,w,h)=>{x.fillStyle=J.base;x.fillRect(0,0,w,h);const g=x.createLinearGradient(0,0,0,h);g.addColorStop(0,hexA(J.dark,.35));g.addColorStop(1,hexA(J.light,.35));x.fillStyle=g;x.fillRect(0,0,w,h);
  // back pockets (u .62-.72 and .78-.88 around: back is u .75) and the yoke seam
  x.strokeStyle='rgba(205,140,70,.7)';x.setLineDash([3,2]);x.lineWidth=1.3;for(const u of [.42,.58]){x.beginPath();x.moveTo((u-.05)*w,.38*h);x.lineTo((u+.05)*w,.38*h);x.lineTo((u+.045)*w,.80*h);x.lineTo(u*w,.90*h);x.lineTo((u-.045)*w,.80*h);x.closePath();x.stroke();}
  x.beginPath();x.moveTo(.33*w,.22*h);x.quadraticCurveTo(.5*w,.34*h,.67*w,.22*h);x.stroke();
  for(const sx of [0,1]){x.beginPath();x.moveTo(sx*w+(sx?-1:1)*.035*w,.12*h);x.lineTo(sx*w+(sx?-1:1)*.035*w,.62*h);x.quadraticCurveTo(sx*w+(sx?-1:1)*.03*w,.74*h,sx*w,.78*h);x.stroke();}x.setLineDash([]);
  noise(x,w,h,7000,93,(px,py,r)=>{x.fillStyle=r<.5?`rgba(255,255,255,${.04+r*.10})`:`rgba(20,30,60,${.03+r*.06})`;x.fillRect(px,py,1,2);});},[1,1])
};
function mat(color,{fabric,rough=.7,clear=0,sheen=0,metal=0,glow=.10,map,side=T.DoubleSide,emis}={}){
 const m=new T.MeshPhysicalMaterial({color,roughness:rough,metalness:metal,clearcoat:clear,clearcoatRoughness:.35,sheen,sheenRoughness:.6,sheenColor:new T.Color(color).lerp(new T.Color('#ffffff'),.4),side});
 if(map)m.map=map;else if(fabric)m.map=fabrics[fabric]();m.emissive=new T.Color(emis||color);m.emissiveIntensity=glow;return m;}
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
 const jmA=null,panelM=J.panel?mat('#ffffff',{map:fabrics.foil2(),rough:.30,clear:.85,metal:.25,glow:.18,emis:'#8a5428'}):null;
 const jm=mat(J.color,{fabric:J.fabric,rough:J.fabric==='leather'?.30:J.fabric==='cord'?.86:J.fabric==='twill'?.8:.92,clear:J.fabric==='leather'?.75:0,sheen:J.fabric==='suede'||J.fabric==='cord'?.7:J.fabric==='twill'?.35:0,glow:J.fabric==='leather'?.10:.12});
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
 const jPart=partOf;
 const shirtP=K.skinShell({pick:pickUpper(shirtHem),place:placeFor(.0045,.0045,0),part:partOf,wrapU:{torso:8,arm:3},uv:{torso:torsoUV,arm:armUV},
  cuts:[(p,r)=>r.y-shirtHem,neckCut(Sh.vneck?.930:.938),sleeveCut(Sh.cuff),
   ...(Sh.vneck?[(p,r)=>!front(r)?1:Math.abs(r.x)-(+Sh.vneck===1?.022:Sh.vneck)*S(r.y,.86,.93)+.0001]:[])]});
 const shirt=shirtP.torso,shirtA=shirtP.arm;for(const g of [shirt,shirtA])if(g&&g.index.count){K.register(g,sm);K.pipe(g,sm,.0016);}
 // shirt tail below the jacket (opt-in: Sh.tail; all four now wear the shirt tucked or hidden): a short straight skirt from the hip outline
 if(Sh.tail&&Sh.hem<J.hem-.01){const top=J.hem+.010,bot=Sh.hem;K.surface(4,48,(u,v)=>{const y=L(top,bot,u),rg=ring(Math.max(y,hip.y-.018)),a=v*Math.PI*2,ux=Math.sin(a),uz=Math.cos(a),rr=reach(rg,ux,uz)+.017+.008*u;
  return {p:V(rg.c[0]+ux*rr,y,rg.c[1]+uz*rr),w:K.torsoW(Math.max(y,hip.y))};},sm,[8,1]);}
 // --- jacket
 const jacketP=K.skinShell({pick:pickUpper(J.hem),place:placeFor(J.ease,J.sleeve,J.straight,puff),part:jPart,wrapU:{torso:8,arm:3,panel:8},uv:{torso:torsoUV,arm:armUV,panel:torsoUV},
  cuts:[(p,r)=>r.y-J.hem,neckCut(J.collar==='band'?.934:.930),sleeveCut(J.sleeveEnd),(p,r)=>!front(r)?1:Math.abs(r.x)-opening(r.y)]});
 const jacketT=jacketP.torso,jacketA=jacketP.arm;K.register(jacketT,jm);K.register(jacketA,jmA||jm);K.register(jacketT,lining);K.register(jacketA,lining);
 K.pipe(jacketT,jm,J.fabric==='cord'?.0030:.0026);
 const jacket=jacketT;
 if(J.panel){// m4: the copper-foil front panels, from the shoulder seam to the hem, a dark leather band left along the opening
  const pn=K.skinShell({pick:pickUpper(J.hem),place:(r,n,id)=>placeFor(J.ease,J.sleeve,J.straight,puff)(r,n,id).addScaledVector(n,.0016),uv:torsoUV,wrapU:8,
   cuts:[(p,r)=>r.y-J.hem-.001,(p,r)=>.902-.006*S(Math.abs(r.x),.03,.09)-r.y,(p,r)=>Math.abs(r.x)-(J.open(r.y)+.012),(p,r)=>1.20-Math.atan2(Math.abs(r.x),r.z+.01),(p,r)=>.084-Math.abs(r.x)+(r.y<.852?1:0)]});
  if(pn.index.count){K.register(pn,panelM);K.pipe(pn,jm,.0017);}}K.pipe(jacketA,jmA||jm,J.fabric==='cord'?.0030:.0026,p=>Math.abs(p.x)>.25);
 const onJ=K.snapper(jacket),onS=K.snapper(shirt),onJA=K.snapper(jacketA),onSA=K.snapper(shirtA),onJall=K.snapper(mergeGeometries([jacket,jacketA],false));
 // cuffs: a band at the sleeve end (jacket), the white shirt cuff a little longer; m1 the white shirt cuff folded back over the
 // pushed-up jacket sleeve; m2 the jacket sleeve bunched at the elbow over the white shirt sleeve
 const ring3=(s,t,on,extra)=>{const sh=d.sh[s],hd=d.hand[s],x=sh.x+(hd.x-sh.x)*t,base=V(x,.9023,-.0145);return a=>{const dir=V(0,Math.cos(a),Math.sin(a)),hit=on(base.clone().addScaledVector(dir,.06),0);return {p:base.clone().addScaledVector(dir,hit.p.distanceTo(base)+extra),w:hit.w};};};
 for(const s of ['L','R']){const bands=[[J.sleeveEnd,jmA||jm,.014,onJA,.0025]];if(!J.foldCuff)bands.push([Sh.cuff,sm,.010,onSA,.0015]);
  for(const [end,m,width,on,ex] of bands)K.surface(2,20,(u,v)=>ring3(s,end-width*(1-u),on,ex)(v*Math.PI*2),m);
  if(J.foldCuff){K.surface(4,24,(u,v)=>{const t=L(J.sleeveEnd-.050,J.sleeveEnd+.006,u),r=ring3(s,Math.min(t,J.sleeveEnd-.002),onJA,.0045+.0025*Math.sin(Math.PI*u))(v*Math.PI*2);return r;},sm);
   const g=K.surface(1,24,(u,v)=>ring3(s,J.sleeveEnd-.050,onJA,.0040)(v*Math.PI*2),sm);K.pipe(g,sm,.0018);}
  if(J.bunch)for(const [dt,ex] of [[.012,.0035],[.040,.0045],[.075,.0035],[.11,.0025]])K.tube(Array.from({length:17},(_,j)=>ring3(s,J.sleeveEnd-dt,onJA,ex)(j/16*Math.PI*2+dt*40).p),.0032,jm,p=>onJA(p,0).w,6,true);}
 // --- collars: cut from the same skin as the jacket (so they lie on it and bend with it): the stand continues the jacket above
 // its neckline, the fall is a band below the neckline (+ lapels / long points along the front edge), lifted over the jacket
 const nb=r=>Math.atan2(Math.abs(r.x),-(r.z-zN)),neckY=(lo,b)=>lo-.010*S(b,1.3,2.8);
 const lift=(place,h)=>(r,n,id)=>place(r,n,id).addScaledVector(n,h);
 const jPlace=placeFor(J.ease,J.sleeve,J.straight,puff),sPlace=placeFor(.0045,.0045,0);
 // tri = [[x,y] inner-top, [x,y] outer-top, [x,y] tip] on the front (mirrored), strip = {y0,w(y)} a lapel along the front edge
 const inTri=(r,t)=>{if(!t||!front(r))return -1;const P=[Math.abs(r.x),r.y],e=(a,b)=>((b[0]-a[0])*(P[1]-a[1])-(b[1]-a[1])*(P[0]-a[0]))/Math.hypot(b[0]-a[0],b[1]-a[1]);
  const s0=Math.sign(((t[1][0]-t[0][0])*(t[2][1]-t[0][1])-(t[1][1]-t[0][1])*(t[2][0]-t[0][0])))||1;return Math.min(s0*e(t[0],t[1]),s0*e(t[1],t[2]),s0*e(t[2],t[0]));};
 function collarLayer(m,{place,lo,stand=0,depth,tri=null,strip=null,open=opening,pipeR=.0018,uvs=torsoUV,reachR=.088}){
  const inStrip=r=>strip&&front(r)?Math.min(open(r.y)+strip.w(r.y)-Math.abs(r.x),r.y-strip.y0):-1;
  const g=K.skinShell({pick:pickUpper(.78),place,uv:uvs,wrapU:8,cuts:[(p,r)=>neckY(lo,nb(r))+stand-r.y,
   (p,r)=>Math.max(Math.min(r.y-(neckY(lo,nb(r))-depth(nb(r))),reachR-Math.hypot(r.x,r.z-zN)),inStrip(r),inTri(r,tri)),(p,r)=>!front(r)?1:Math.abs(r.x)-open(r.y),
   (p,r)=>Math.abs(r.x)>.083&&r.y>.85?-1:1]});
  if(g.index.count){K.register(g,m);K.pipe(g,m,pipeR);}return g;}
 const dark=mat(new T.Color(J.color).multiplyScalar(J.fabric==='leather'?.9:J.fabric==='suede'?.74:.86).getStyle(),{fabric:J.fabric,rough:J.fabric==='leather'?.3:.9,clear:J.fabric==='leather'?.75:0,sheen:J.fabric==='suede'?.7:0,glow:.08});
 // --- collars as cloth: s runs from his left front end round the back of the neck to his right front end, v from the neckline
 // up the stand, over the fold and down to the outer edge. The fall is laid onto whatever is under it (shirt, jacket, an under
 // collar), pushed out of it, so it hugs the shoulders and spreads over the chest, and it is skinned like the cloth under it.
 let zc=zN,nrx=.032,nrz=.026;{let n=0,mx=0,mnz=9,mxz=-9;for(const i of d.used){const y=BP.getY(i);if(Math.abs(y-.927)>.005||W.neck[i]+W.torso[i]<.5||W.L[i]+W.R[i]>.3)continue;const x=BP.getX(i),z=BP.getZ(i);if(Math.abs(x)>.06)continue;mx=Math.max(mx,Math.abs(x));mnz=Math.min(mnz,z);mxz=Math.max(mxz,z);n++;}
  if(n>6){zc=(mnz+mxz)/2;nrx=mx;nrz=(mxz-mnz)/2;}}
 const ctr=V(0,.80,zc),outN=(h)=>{const n=h.n.clone();if(n.dot(h.p.clone().sub(ctr))<0)n.negate();return n;};
 // the outermost layer at p: probe from outside (away from the chest centre) and keep the surface nearest to that probe
 const outerHit=(p,list)=>{const q=p.clone().add(p.clone().sub(ctr).setLength(.035));let best=null,bd=0;for(const f of list){const h=f(q,0),dist=h.p.distanceTo(q);if(!best||dist<bd){best=h;bd=dist;}}best.n=outN(best);return best;};
 const mixW=(a,b,t)=>mergeW([...a.map(([i,w])=>[i,w*(1-t)]),...b.map(([i,w])=>[i,w*t])]);
 const ctrl=(cp,h)=>{let i=1;while(i<cp.length-1&&h>cp[i][0])i++;const A=cp[i-1],B=cp[i],t=C((h-A[0])/(B[0]-A[0]||1),0,1);return A.map((x,j)=>L(x,B[j],t));};
 function collarSurf(m,c,snaps,{rows=12,cols=56}={}){const vf=.24,lift=c.lift||.0045,G=[],Wt=[],isFall=j=>j/rows>vf+1e-6;
  const pushOut=(p,l)=>{const hp=outerHit(p,snaps),dd=p.clone().sub(hp.p).dot(hp.n);if(dd<l)p.addScaledVector(hp.n,l-dd);return hp;};
  for(let j=0;j<=rows;j++){G.push([]);Wt.push([]);for(let i=0;i<=cols;i++){const v=j/rows,s=i/cols,sg=s<.5?1:-1,h=s<.5?s*2:(1-s)*2,th=L(c.th0,Math.PI,Math.pow(h,c.thp||1));
   const ux=sg*Math.sin(th),uz=Math.cos(th),yb=L(c.yF,c.yB,S(h,0,c.hB||.45)),st=L(c.sF,c.sB,S(h,0,.5)),k=c.fold||.007;
   const N=V(ux*(nrx+.006),yb,zc+uz*(nrz+.006)),F=V(ux*(nrx+k),yb+st,zc+uz*(nrz+k)),hn=outerHit(N,snaps);
   if(v<=vf){G[j].push(N.lerp(F,v/vf));Wt[j].push(hn.w);continue;}
   const [,tho,yo,ro]=ctrl(c.outer,h),R0=ro||.09,ho=outerHit(V(sg*Math.sin(tho)*R0,yo,zc+Math.cos(tho)*R0),snaps);
   const t=(v-vf)/(1-vf),O=ho.p.clone().addScaledVector(ho.n,lift),p=F.clone().lerp(O,t);p.addScaledVector(V(p.x,0,p.z-zc).normalize(),(c.roll??.004)*Math.sin(Math.PI*t));
   const hp=outerHit(p,snaps),on=hp.p.clone().addScaledVector(hp.n,lift);p.lerp(on,S(t,.12,.5)*(c.lay??1));
   pushOut(p,lift);G[j].push(p);Wt[j].push(mixW(hn.w,hp.w,S(t,0,.6)));}}
  // relax the fall (no steps where it passes from the shirt onto the jacket), then keep it out of the cloth below
  for(let it=0;it<4;it++){const Q=G.map(r=>r.map(p=>p.clone()));for(let j=0;j<=rows;j++)if(isFall(j))for(let i=0;i<=cols;i++){const nb=[];
    if(j>0&&isFall(j-1))nb.push(G[j-1][i]);if(j<rows)nb.push(G[j+1][i]);if(i>0)nb.push(G[j][i-1]);if(i<cols)nb.push(G[j][i+1]);
    if(j===rows&&(i===0||i===cols))continue;if((j===rows||i===0||i===cols)&&nb.length>2){/* along the edge only */nb.length=0;if(j===rows){if(i>0)nb.push(G[j][i-1]);if(i<cols)nb.push(G[j][i+1]);}else{if(isFall(j-1))nb.push(G[j-1][i]);nb.push(G[j+1][i]);}}
    if(!nb.length)continue;const avg=V();for(const q of nb)avg.add(q);avg.multiplyScalar(1/nb.length);Q[j][i].lerp(avg,.5);}
   for(let j=0;j<=rows;j++)if(isFall(j))for(let i=0;i<=cols;i++)pushOut(Q[j][i],lift*.85);G.splice(0,G.length,...Q);}
  const geo=K.surface(rows,cols,(v,s)=>{const j=Math.round(v*rows),i=Math.round(s*cols);return {p:G[j][i],w:Wt[j][i]};},m,[1,1]);
  K.pipe(geo,m,c.pipe||.0017);return geo;}
 // lapels (m1): flat panels along the opening edge from the break point to the gorge, laid onto the jacket front
 function lapel(m,Lp){const out=[];for(const sx of [1,-1]){const g=K.surface(4,16,(r,c)=>{const y=L(Lp.y0,Lp.yG,c),I=[opening(y)-.003,y],
   O=c<Lp.cW?[L(opening(Lp.y0),Lp.W[0],c/Lp.cW),L(Lp.y0,Lp.W[1],c/Lp.cW)]:[L(Lp.W[0],Lp.T[0],(c-Lp.cW)/(1-Lp.cW)),L(Lp.W[1],Lp.T[1],(c-Lp.cW)/(1-Lp.cW))],
   x=L(I[0],O[0],r),yy=L(I[1],O[1],r),hit=onJ(d.front(Math.min(yy,.912),sx*x,.012).setY(yy),0),n=outN(hit);return {p:hit.p.clone().addScaledVector(n,.0035+.002*r),w:hit.w};},m);K.pipe(g,m,.0022);out.push(g);}return out;}
 let jc=null,sc=null;const shirtSnaps=[onS,onJall];
 if(J.lapel)lapel(dark,J.lapel);
 if(J.coll&&!J.coll.over)jc=collarSurf(dark,J.coll,shirtSnaps);
 if(Sh.coll)sc=collarSurf(sm,Sh.coll,shirtSnaps);
 if(J.coll&&J.coll.over)jc=collarSurf(dark,J.coll,shirtSnaps);
 if(J.collar==='band')collarLayer(jm,{place:lift(jPlace,.002),lo:.931,stand:.010,depth:b=>.004,pipeR:.0022});
 // neck pieces
 const neckW=mergeW([[K.bone('upperChest'),.65],[K.bone('neck'),.35]]),fr=(x,y)=>y<.912?d.front(y,x,.012):V(x,y,zc+nrz+.012),onSJ=(p,l,list=[onS,onJall])=>{const q=p.clone().add(V(0,0,.03));let h=null,bd=0;for(const f of list){const k=f(q,0),dd=k.p.distanceTo(q);if(!h||dd<bd){h=k;bd=dd;}}const n=outN(h);return {p:h.p.clone().addScaledVector(n,l),w:h.w,n};};
 if(Sh.bolo){// m1: silver bolo clasp at the throat, two thin cream cords with silver tips
  const cord=mat('#efe4c8',{rough:.6,glow:.18}),c0=onSJ(fr(0,.905),.011);K.blob(c0.p,[.0085,.0095,.0035],metal,c0.w,14);
  K.tube(Array.from({length:13},(_,j)=>{const a=j/12*Math.PI*2;return c0.p.clone().add(V(Math.cos(a)*.0060,Math.sin(a)*.0070,.0028));}),.0013,metal,c0.w,5,true);
  K.blob(c0.p.clone().add(V(0,0,.0035)),[.0028,.0032,.0018],mat('#9fb4c8',{rough:.2,metal:.6,clear:1,glow:.08}),c0.w,8);
  for(const sx of [1,-1]){const pts=Array.from({length:8},(_,j)=>onSJ(fr(sx*(.0035+.0022*j/7),L(.896,.800,j/7)),.0062,[onS]).p);K.tube(pts,.0012,cord,p=>onS(p,0).w,5);
   const e=pts[pts.length-1];K.blob(e.clone().add(V(0,-.004,0)),[.0018,.0045,.0018],metal,onS(e,0).w,8);}}
 if(Sh.kerchief){// m2: striped silk neckerchief knotted at the throat, the tail tucked into the open shirt
  const km=mat('#ffffff',{map:fabrics.stripe(),rough:.42,sheen:.8,clear:.2,glow:.16,emis:'#d8c4a2'});
  K.tube(Array.from({length:19},(_,j)=>{const b=-2.45+j/18*4.9,ux=Math.sin(b),uz=-Math.cos(b);return V(ux*(nrx+.006),.927-.022*S(Math.abs(b),1.5,2.45),zc+uz*(nrz+.007));}),.0048,km,neckW,8);
  const kn=onSJ(fr(0,.896),.010);K.blob(kn.p,[.0105,.0085,.0070],km,kn.w,12);
  for(const sx of [1,-1])K.surface(5,4,(u,v)=>{const x=sx*(.006+.012*u),y=.898+.004*u-(v-.5)*.012*(1-.5*u),h=onSJ(fr(x,y),.009);return {p:h.p,w:h.w};},km,[.6,.6]);
  K.surface(10,4,(u,v)=>{const y=L(.892,.848,u),w=.011*(1-.55*u),x=-.003+.006*u+(v-.5)*2*w,h=onSJ(fr(x,y),.0085-.004*u);return {p:h.p,w:h.w};},km,[.8,1.4]);}
 if(look.scarf){// m3: burgundy polka-dot scarf wrapped round the neck, knotted in front, two long tapered tails down the chest
  const red=mat(look.scarf.color,{map:fabrics.polka(look.scarf.color,look.scarf.dots),rough:.55,sheen:.5,glow:.10});
  K.tube(Array.from({length:25},(_,j)=>{const b=-Math.PI+j/24*2*Math.PI,ux=Math.sin(b),uz=-Math.cos(b);return V(ux*(nrx+.010),.934-.016*S(Math.abs(b),1.3,2.7),zc+uz*(nrz+.012));}),.0100,red,neckW,8,true);
  const kn=onSJ(fr(-.002,.899),.015);K.blob(kn.p,[.0145,.0115,.0095],red,kn.w,12);
  const tail=(x0,y0,x1,y1,w0,lift)=>K.surface(20,6,(u,v)=>{const y=L(y0,y1,u),cx=L(x0,x1,u)+.004*Math.sin(u*5),w=(w0*(.75+.5*S(u,0,.35)))*(1-.92*S(u,.72,1)),
   x=cx+(v-.5)*2*w+(v-.5)*.006*S(u,.72,1),h=onSJ(fr(x,y-(v-.5)*.010*S(u,.72,1)),lift*(1-.35*u)+.003*Math.sin(v*Math.PI),[onS]);return {p:h.p,w:h.w};},red,[1.1,3.4]);
  tail(-.006,.893,-.017,.768,.0108,.013);tail(.008,.892,.017,.806,.0092,.011);}
 // --- jacket details
 const onJF=(x,y,l=.002)=>{const h=onJ(fr(x,y),0),n=outN(h);return {p:h.p.clone().addScaledVector(n,l),w:h.w};};
 const zipLine=(pts,r=.0016)=>{const P=[];for(let i=0;i+1<pts.length;i++)for(let k=0;k<6;k++){const t=k/6;P.push(onJF(L(pts[i][0],pts[i+1][0],t),L(pts[i][1],pts[i+1][1],t),.0018).p);}
  const e=pts[pts.length-1];P.push(onJF(e[0],e[1],.0018).p);K.tube(P,r,metal,p=>onJ(p,0).w,5);return P;};
 if(J.zip==='biker'){// m1: the front zip runs from his left chest diagonally to the centre and down; a slanted zip pocket on his left chest
  zipLine([[.046,.832],[.012,.792],[-.020,.770],[-.022,J.hem+.004]]);const pl=onJF(.046,.828,.004);K.blob(pl.p,[.0030,.0065,.0016],metal,pl.w);
  zipLine([[.083,.826],[.052,.752]],.0013);const pk=onJF(.081,.818,.004);K.blob(pk.p,[.0025,.0055,.0014],metal,pk.w);
  zipLine([[-.050,.712],[-.078,.700]],.0012);
  // snap studs on the lapel tips and on the epaulettes
  for(const sx of [1,-1]){const st=onJF(sx*.073,.866,.007);K.blob(st.p,[.0033,.0033,.002],metal,st.w,10);}}
 if(J.epaulettes)for(const sx of [1,-1]){const g=K.surface(2,8,(u,v)=>{const x=sx*L(.050,.098,v),z=-.012+(u-.5)*.018*(1-.35*v),h=onJall(V(x,.95,z),0),n=outN(h);return {p:h.p.clone().addScaledVector(n,.0035),w:h.w};},dark);K.pipe(g,dark,.0016);
  const h=onJall(V(sx*.058,.95,-.012),0);K.blob(h.p.clone().addScaledVector(outN(h),.0065),[.0030,.0022,.0030],metal,h.w,10);}
 if(J.zip==='edge'){// m2: silver zip along the front edges
  for(const sx of [1,-1]){const pts=[];for(let k=0;k<=10;k++){const y=L(J.hem+.024,.862,k/10);pts.push([sx*(J.open(y)+.0035),y]);}zipLine(pts,.0014);}}
 if(J.band){// blouson waistband: ribbed band at the hem, open at the front
  K.surface(3,96,(u,v)=>{const y=J.hem+.002+u*.024,rg=ring(y),a0=Math.asin(C(opening(y)/.08,0,.99)),a=a0+v*(2*Math.PI-2*a0),ux=Math.sin(a),uz=Math.cos(a),rr=reach(rg,ux,uz)+J.ease+.002+.0014*Math.cos(v*300);
   return {p:V(rg.c[0]+ux*rr,y,rg.c[1]+uz*rr),w:K.torsoW(y)};},dark,[30,1]);}
 const patch=(m,cx,y0,y1,wd,flap,{btn=null,pipeM=null,west=false}={})=>{// a patch pocket (body + flap) laid onto the jacket front
  const body=K.surface(3,8,(u,v)=>{const y=L(y0,y1,u),x=cx+(v-.5)*wd*(1-.05*u),h=onJF(x,y,.0028);return h;},m);K.pipe(body,pipeM||m,.0016);
  const fl=K.surface(3,8,(u,v)=>{const y=y0+.003-u*flap*(west?1-.7*Math.abs(v-.5)*2:1),x=cx+(v-.5)*(wd+.004),h=onJF(x,y,.0050);return h;},m);K.pipe(fl,pipeM||m,.0017);
  if(btn){const b=onJF(cx,y0+.003-flap*.65,.0075);K.blob(b.p,[.0036,.0036,.0022],btn,b.w,10);}};
 if(J.flaps==='chest')for(const sx of [1,-1])patch(jm,sx*.047,.856,.808,.044,.017,{btn:metal,pipeM:dark});
 if(J.flaps==='hip')for(const sx of [1,-1])patch(jm,sx*.056,.742,.690,.050,.018,{pipeM:dark});
 if(J.western){const cream=mat('#d9c09a',{rough:.5,glow:.12});for(const sx of [1,-1]){const cx=sx*.054;
  const fl=K.surface(3,10,(u,v)=>{const y=.744-u*.020*(1-.75*Math.abs(v-.5)*2),x=cx+(v-.5)*.040;return onJF(x,y,.0035);},jm);
  K.tube(Array.from({length:11},(_,j)=>{const v=j/10,y=.744-.020*(1-.75*Math.abs(v-.5)*2)-.0012;return onJF(cx+(v-.5)*.040,y,.0045).p;}),.0011,cream,p=>onJ(p,0).w,5);
  K.tube([0,1].map(v=>onJF(cx+(v-.5)*.040,.7445,.0045).p),.0011,cream,p=>onJ(p,0).w,5);
  const b=onJF(cx,.729,.0065);K.blob(b.p,[.0028,.0028,.0018],metal,b.w,8);}}
 if(Sh.tee){// m4: the white tee under the open denim shirt
  const tee=mat('#f4f2ec',{fabric:'shirt',rough:.8,glow:.2});const g=K.skinShell({pick:id=>{const y=BP.getY(id);return y>.80&&y<.94&&W.torso[id]+W.neck[id]>.5&&BP.getZ(id)>-.01;},place:(r,n)=>r.clone().addScaledVector(n,.0028),uv:()=>[0,0],
   cuts:[(p,r)=>.924-.006*S(Math.abs(r.x),0,.03)-r.y,(p,r)=>.045-Math.abs(r.x),(p,r)=>r.z-.0]});if(g.index.count){K.register(g,tee);K.pipe(g,tee,.0018,p=>p.y>.90);}}
 if(J.buttons)for(let k=0;k<5;k++){const y=L(.712,.892,k/4),x=-(J.open(y)+.010),h=onJF(x,y,.0045);K.blob(h.p,[.0058,.0058,.0030],metal,h.w,12);
  K.tube(Array.from({length:11},(_,j)=>{const a=j/10*Math.PI*2;return h.p.clone().add(V(Math.cos(a)*.0040,Math.sin(a)*.0040,.0026));}),.0008,mat('#aeb0ab',{rough:.3,metal:.8,glow:.04}),h.w,4,true);}
 if(J.fabric==='cord'){// dropped shoulder seams read as an oversized jacket
  for(const sx of [1,-1])K.tube([0,.5,1].map(t=>{const h=onJall(V(sx*.104,L(.95,.86,t),L(-.01,.02,t)*0),0);return h.p.clone().addScaledVector(outN(h),.0012);}),.0013,dark,p=>onJall(p,0).w,5);}
 // bracelets: m1 a chunky silver bangle on his right wrist, m2 a silver chain on his right wrist
 if(look.wrist){const W2=look.wrist;
  for(const s of ['L','R']){const which=s==='L'?'left':'right',sh=d.sh[s],hd=d.hand[s];
   if(W2.bangle===which)for(const [t,r] of [[.955,.0034],[.972,.0022]]){const base=V(sh.x+(hd.x-sh.x)*t,.9023,-.0145),pts=[];let w0=null;
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2,dir=V(0,Math.cos(a),Math.sin(a)),hit=K.bodyNear(base.clone().addScaledVector(dir,.05));w0??=hit.w;pts.push(base.clone().addScaledVector(dir,hit.p.distanceTo(base)+r+.0012));}
    K.tube(pts,r,metal,w0,8,true);}
   if(W2.chain===which){const base=V(sh.x+(hd.x-sh.x)*.962,.9023,-.0145),n=20;
    for(let i=0;i<n;i++){const a=i/n*Math.PI*2,dir=V(0,Math.cos(a),Math.sin(a)),hit=K.bodyNear(base.clone().addScaledVector(dir,.05)),rr=hit.p.distanceTo(base)+.0032;
     K.blob(base.clone().addScaledVector(dir,rr),[.0030,.0022,.0030],metal,hit.w,6);}}}}
 void gold;
}
// ---------------------------------------------------------------- bottoms -----------------------------------------------
function buildBottom(d,K,look){
 const Jn=look.jeans,{hip,ring,reach,pos}=d,top=.734,bone=K.bone,crotch=hip.y-.058;
 const lin=mat(new T.Color(Jn.base).lerp(new T.Color(Jn.dark),.5).getStyle(),{rough:.9,glow:.10});K.skinCopy((x,y)=>y<top-.003&&y>d.floor+.025,lin,.004);
 const den=mat('#ffffff',{map:fabrics.jeans(Jn),rough:.86,sheen:.15,glow:.16,emis:Jn.base});
 const inside=mat(new T.Color(Jn.dark).multiplyScalar(.8).getStyle(),{rough:.9,glow:.04,side:T.BackSide});
 // leg cross-section (ellipse) at height y: the donor's own leg slice (bounding ellipse) plus a little ease, close through the
 // thigh, then the bell flaring from the knee down (owner: "quần ống loe", the stage photo)
 const legs={};for(const side of ['left','right'])legs[side]={up:pos(side+'UpperLeg'),kn:pos(side+'LowerLeg'),ft:pos(side+'Foot'),sx:side==='left'?1:-1};
 const LP=d.g.attributes.position,slices={left:new Map(),right:new Map()};
 for(const i of d.used){const x=LP.getX(i),y=LP.getY(i),z=LP.getZ(i);if(y>hip.y-.03||Math.abs(x)>.16||d.W.L[i]+d.W.R[i]>.3)continue;const sd=x>=0?'left':'right',k=Math.round(y*100);let b=slices[sd].get(k);
  if(!b){b=[9,-9,9,-9];slices[sd].set(k,b);}if(x<b[0])b[0]=x;if(x>b[1])b[1]=x;if(z<b[2])b[2]=z;if(z>b[3])b[3]=z;}
 const sliceAt=(side,y)=>{const k0=Math.round(y*100);let acc=[0,0,0,0],n=0;for(let k=k0-1;k<=k0+1;k++){const b=slices[side].get(k);if(!b||b[1]-b[0]>.2)continue;acc=acc.map((a,j)=>a+b[j]);n++;}
  if(!n)return null;return acc.map(a=>a/n);};
 const sliceCache=new Map();
 function legSection(side,y){const key=side+Math.round(y*400);let r=sliceCache.get(key);if(r)return r;const {kn,sx}=legs[side];
  const yy=C(y,d.floor+.06,crotch-.005);let b=sliceAt(side,yy);for(let dy=.01;!b&&dy<.08;dy+=.01)b=sliceAt(side,yy+dy)||sliceAt(side,yy-dy);
  const fl=Math.pow(S(kn.y+.015-y,0,kn.y+.015-d.floor),1.25),ease=L(.010,.014,S(y,kn.y,crotch)),F=Jn.flare||.026;
  // below the calf the leg slice is the ankle/foot: keep the knee-to-calf width so the bell hangs from the knee
  const kb=sliceAt(side,kn.y-.06)||b,useK=S(kn.y-.07-y,0,.08),bx0=L(b[0],kb[0],useK),bx1=L(b[1],kb[1],useK),bz0=L(b[2],kb[2],useK),bz1=L(b[3],kb[3],useK);
  r={cx:(bx0+bx1)/2+sx*.010*fl,cz:(bz0+bz1)/2+.006*fl,rx:(bx1-bx0)/2*1.05+ease+F*fl,rz:(bz1-bz0)/2*1.05+ease+F*1.05*fl,fl};sliceCache.set(key,r);return r;}
 // each leg is one piece from the waistband to the hem: above the crotch its outline is half of the hip outline closed on the
 // centre plane (the two legs meet at the centre-front/back seams, like real trousers), below it the thigh/knee/flare ellipse
 const half=(sx,a,y,e)=>{const rg=ring(Math.max(y,hip.y-.018)),c0=rg.c,pt=th=>{const ux=sx*Math.cos(th),uz=sx*Math.sin(th),rr=reach(rg,ux,uz)+e;return [c0[0]+ux*rr,c0[1]+uz*rr];};
  const P1=pt(Math.PI/2),P3=pt(-Math.PI/2);
  if(a<=Math.PI/2)return pt(a);if(a>=1.5*Math.PI)return pt(a-2*Math.PI);const t=(a-Math.PI/2)/Math.PI;return [sx*.0006,L(P1[1],P3[1],t)];};
 for(const side of ['left','right']){const {kn,sx}=legs[side],floor=d.floor;
  const legW=p=>{const kneeW=S(kn.y-p.y,-.05,.06),H=S(p.y,crotch-.03,hip.y+.04);return mergeW([[bone('hips'),H*.9],[bone(side+'UpperLeg'),(1-H*.9)*(1-kneeW)],[bone(side+'LowerLeg'),(1-H*.9)*kneeW]]);};
  const leg=K.surface(44,40,(u,v)=>{const a=v*Math.PI*2,ox=Math.cos(a),oz=Math.sin(a),fz=sx*oz,hem=floor+.007+.060*Math.pow(Math.max(0,fz),1.4),
    y=u<.32?L(top,crotch-.012,u/.32):L(crotch-.012,hem,(u-.32)/.68),e=legSection(side,y),E=[e.cx+sx*ox*e.rx,e.cz+fz*e.rz+(fz<0?.003*e.fl:0)],k=1-S(y,crotch-.010,crotch+.032),H=k<1?half(sx,a,y,.007):E;
   const p=V(L(H[0],E[0],k),y,L(H[1],E[1],k));return {p,w:legW(p)};},den,[1,1],y=>{if(y>crotch){const r=ring(Math.max(y,hip.y-.018));return {x:r.c[0]+sx*.03,z:r.c[1]};}const e=legSection(side,y);return {x:e.cx,z:e.cz};});
  // the u texture coordinate runs outer seam -> front -> inner seam -> back on both legs, matching the wash map
  if(sx<0){const uv=leg.attributes.uv;for(let i=0;i<uv.count;i++)uv.setX(i,1-uv.getX(i));uv.needsUpdate=true;}
  K.register(leg,inside);K.pipe(leg,mat(Jn.hemPipe||Jn.dark,{rough:.9,glow:Jn.hemPipe?.2:.06}),Jn.hemPipe?.0030:.0024,p=>p.y<floor+.05);
 }
 // waistband + belt loops (+ belt for m2/m3), fly, studs, m1's tassel
 const band=mat('#ffffff',{map:fabrics.seat(Jn),rough:.85,glow:.16,emis:Jn.base});
 K.surface(2,64,(u,v)=>{const y=top-u*.016,rg=ring(y),a=v*Math.PI*2,ux=Math.sin(a),uz=Math.cos(a),rr=reach(rg,ux,uz)+.0105;return {p:V(rg.c[0]+ux*rr,y,rg.c[1]+uz*rr),w:K.torsoW(y)};},band);
 const at=(y,a,e)=>{const rg=ring(y),ux=Math.sin(a),uz=Math.cos(a),rr=reach(rg,ux,uz)+e;return V(rg.c[0]+ux*rr,y,rg.c[1]+uz*rr);};
 if(look.belt){const bm=mat(look.belt.color,{rough:.4,clear:.5,glow:.07}),metal=mat(look.belt.buckle,{rough:.22,metal:.85,glow:.05});
  K.surface(2,64,(u,v)=>{const y=top-.002-u*.013,p=at(y,v*Math.PI*2,.0135);return {p,w:K.torsoW(y)};},bm);
  const c=at(top-.0085,0,.0165);K.surface(2,8,(u,v)=>{const p=c.clone().add(V((v-.5)*.024,(u-.5)*.017,0));return {p,w:K.torsoW(p.y)};},metal);
  K.tube([V(-.012,0,0),V(.012,0,0),V(.012,.017,0),V(-.012,.017,0)].map(q=>q.add(V(c.x,c.y-.0085,c.z+.003))),.0016,metal,K.torsoW(c.y),6,true);}
 else for(let k=0;k<6;k++){const a=k/6*Math.PI*2+.35,p=at(top-.008,a,.0115);K.blob(p,[.0035,.008,.002],band,K.torsoW(p.y),6);}
 const metal=mat('#d6d4cc',{rough:.25,metal:.8,glow:.05});
 if(Jn.fly)for(let k=0;k<5;k++){const y=top-.024-k*.017,p=at(y,0,.0105);K.blob(p,[.0034,.0034,.002],metal,K.torsoW(Math.max(y,hip.y)),8);}
 if(Jn.tassel){// m1: a silver chain from the front belt loop with a silver tassel
  const tp=at(top-.012,-.80,.014),w=K.torsoW(hip.y),bright=mat('#eef0f4',{rough:.18,metal:.9,glow:.12});
  for(let k=0;k<14;k++){const t=k/13,p=tp.clone().add(V(.010*t,-.070*t,.004+.010*Math.sin(t*2.6)));K.blob(p,[.0024,.0030,.0016],bright,w,6);}
  const e=tp.clone().add(V(.010,-.072,.006));K.blob(e,[.0035,.0045,.0035],bright,w,8);
  for(let k=0;k<7;k++){const a=k/7*Math.PI*2,o=V(Math.cos(a)*.0025,0,Math.sin(a)*.0025);K.tube([e.clone().add(o),e.clone().add(V(o.x*1.6,-.026,o.z*1.6+.002))],.0009,bright,w,4);}}
}
// ---------------------------------------------------------------- shoes -------------------------------------------------
function buildShoes(d,K,look){
 const Z=look.shoes,floor=d.floor;
 const skin=new T.MeshToonMaterial({color:'#fff1df',emissive:'#bca98f',emissiveIntensity:.18,side:T.DoubleSide});
 const sock=mat(Z.socks||'#2a2422',{rough:.9,glow:Z.socks?.22:.04});
 K.skinCopy((x,y)=>y>floor&&y<d.hip.y-.105,Z.socks?sock:skin,.0005);
 const up=mat(Z.color,{fabric:'leather',rough:Z.kind==='cowboy'?.38:.24,clear:.9,glow:Z.kind==='cowboy'?.10:.06}),sole=mat(Z.sole||'#2b1d17',{rough:.6,glow:Z.sole?.18:.03}),stitch=mat('#e8c58f',{rough:.6,glow:.15});
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
