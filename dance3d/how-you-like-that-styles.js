import * as T from 'three';
import {fitPoint,fitSection,armShell} from './body-fit.js?v=1611.0354';
import {geometryTriangles,getTriangleQuery} from './triangle-query.js?v=1611.0354';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// "How You Like That" (BLACKPINK). v2 looks (2026-11-14) from the owner's photo of the four members in the song's hanbok stage
// looks (left to right Lisa, Jisoo, Jennie, Rosé), clearer than the MV crops used for v1:
// - Jennie (m1, and the child's shop set): pink jeogori printed with square tiles of round medallions and rosettes, a cream
//   embroidered collar, full wide sleeves; long pink and black ribbons (otgoreum) from the hem to the knee; black fingerless
//   gloves (crew only); loose black high-waisted shorts with a wide black belt and a gold crescent buckle; black ankle boots.
// - Lisa (m2): black jeogori with gold/silver lace panels, a flower-embroidered collar band, one round embroidered medallion
//   and a red tassel (norigae) below it; sheer silver-beige lace sleeves; a straight mini skirt in a small silver/pink/black
//   arch pattern; black combat boots with buckle straps.
// - Jisoo (m4): black jacket with round gold cloud medallions over a burgundy brocade bodice with a gold floral waist band,
//   a cluster of teal/red/white/pink tassels at the right shoulder, a thin gold belt; a ruffled burgundy floral organza
//   peplum over loose black shorts; black over-knee lace-up boots.
// - Rosé (m3): a pastel embroidered top (lavender, pink, blue, white, one round medallion) under a black silk hanbok jacket,
//   a gold choker; a black pleated mini skirt with a large white embroidered pouch (norigae) and a red tassel at her left
//   front; black boots.
// Built like kill-this-love-styles.js: tops hug the body through body-fit.js (convex torso slice + ease, pushed past the bust),
// sleeves are her own arm skin lifted (armShell, puffed for the wide hanbok sleeves), shorts/shoes are her own skin lifted
// (skinned like the body, each leg its own; rings take weights from their own leg). Modest: every top reaches the waistband
// (the photo's crop tops and Rosé's bustier are closed tops with a modest neckline), skirts have black shorts underneath,
// the visible shorts are loose tubes over the skin, no fishnet; no paired dots/studs at chest height. No text or logos.
// Style ids: how-you-like-that-1-{top,bottom,shoes} (shop set: Jennie's look, a girl's version) and
// how-you-like-that-crew-m1..m4-{top,bottom,shoes} (crew-only: the four members' looks).
const caches=new WeakMap();
const V=()=>new T.Vector3();
const rand=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
function donorCache(donor){
 if(caches.has(donor))return caches.get(donor);
 const body=donor.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),g=body.geometry,p=g.attributes.position,ix=g.index,inv=body.matrixWorld.clone().invert(),pos=n=>donor.vrm.humanoid.getRawBoneNode(n).getWorldPosition(V()).applyMatrix4(inv),hip=pos('hips'),neck=pos('neck');
 const boneIndex=n=>{const raw=donor.vrm.humanoid.getRawBoneNode(n);let i=body.skeleton.bones.indexOf(raw);if(i<0)i=body.skeleton.bones.findIndex(b=>b.name===raw?.name);if(i<0)throw Error('Missing bone '+n);return i;},floor=Math.min(...Array.from(ix.array,i=>p.getY(i)));
 const shells=new Map();
 // her own skin triangles that pass a position test, lifted along the normal (skinned like the body)
 function shell(key,test,offset=0){if(shells.has(key))return shells.get(key);const map=new Map(),attrs=Object.fromEntries(['position','normal','uv','skinIndex','skinWeight'].filter(k=>g.attributes[k]).map(k=>[k,[]])),out=[];
  const ok=id=>test(p.getX(id),p.getY(id),p.getZ(id),id);
  for(let i=0;i<ix.count;i+=3){const tri=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(!tri.every(ok))continue;for(const id of tri){if(!map.has(id)){map.set(id,map.size);const off=typeof offset==='function'?offset(p.getX(id),p.getY(id),p.getZ(id)):offset;for(const[k,a]of Object.entries(attrs)){const src=g.attributes[k];for(let c=0;c<src.itemSize;c++)a.push(src.getComponent(id,c)+(k==='position'?g.attributes.normal.getComponent(id,c)*off:0));}}out.push(map.get(id));}}
  const geo=new T.BufferGeometry();for(const[k,a]of Object.entries(attrs))geo.setAttribute(k,k==='skinIndex'?new T.Uint16BufferAttribute(a,4):new T.Float32BufferAttribute(a,g.attributes[k].itemSize));geo.setIndex(out);geo.computeBoundingSphere();shells.set(key,geo);return geo;}
 const legQueries=new Map();function legQuery(side){if(!legQueries.has(side)){const s=Math.sign(pos(side+'Foot').x),top=pos(side+'UpperLeg').y;
  legQueries.set(side,getTriangleQuery(geometryTriangles(g).filter(r=>[r.t.a,r.t.b,r.t.c].every(q=>q.x*s>.004&&q.y<top))));}return legQueries.get(side);}
 const si=g.attributes.skinIndex,sw=g.attributes.skinWeight,wOf=(id,set)=>{let s=0;for(let k=0;k<4;k++)if(set.has(si.getComponent(id,k)))s+=sw.getComponent(id,k);return s;};
 // the drawn eyes (EyeWhite material) of the face mesh, for the sunglasses: per side centre + half size, and the face front
 const box=()=>({lo:[1e9,1e9,1e9],hi:[-1e9,-1e9,-1e9]}),eb={l:box(),r:box()};let front=-Infinity;
 for(const m of donor.meshes){const mg=m.geometry,mp=mg?.attributes?.position;if(!mp)continue;const mats=[].concat(m.material).map(x=>x.name),groups=mg.groups.length?mg.groups:[{start:0,count:mg.index?mg.index.count:mp.count,materialIndex:0}];
  for(const gr of groups){const mn=mats[gr.materialIndex]||mats[0]||'',white=/EyeWhite/.test(mn),lash=/FaceEyelash/.test(mn);if(!white&&!lash)continue;for(let k=gr.start;k<gr.start+gr.count;k++){const i=mg.index?mg.index.getX(k):k,v=[mp.getX(i),mp.getY(i),mp.getZ(i)];if(lash){front=Math.max(front,v[2]);continue;}const b=v[0]>0?eb.l:eb.r;for(let q=0;q<3;q++){b.lo[q]=Math.min(b.lo[q],v[q]);b.hi[q]=Math.max(b.hi[q],v[q]);}}}}
 const eyeOf=b=>b.lo[0]<1e8?{x:(b.lo[0]+b.hi[0])/2,y:(b.lo[1]+b.hi[1])/2,rx:(b.hi[0]-b.lo[0])/2,ry:(b.hi[1]-b.lo[1])/2}:null;
 const eyes={l:eyeOf(eb.l)||{x:.05,y:1.048,rx:.034,ry:.025},r:eyeOf(eb.r)||{x:-.05,y:1.048,rx:.034,ry:.025}};if(!Number.isFinite(front))front=.13;
 const c={body,hip,neck,pos,boneIndex,shell,floor,legQuery,wOf,eyes,front};caches.set(donor,c);return c;
}
// top: print jennie (pink tiles of medallions/rosettes, cream collar) | lisa (black, gold/silver lace, flower collar band, one
// medallion) | rose (pastel front under a black silk jacket) | jisoo (black jacket, gold cloud medallions, burgundy bodice,
// gold floral waist band); sleevePrint/sleeveColor: the sleeves' own cloth; hemUp: the top ends at the waistband (belted
// bottoms); ribbons: long otgoreum from the hem to the knee; gloves: fingerless; tassels: norigae cords; belt: thin gold band
// at the top's hem; choker: a gold band round the neck.
// bottom: shorts (loose high-waisted shorts, wide belt + gold buckle) | skirt (mini + shorts under; flare, pleats, skirtPrint,
// pouch) | peplum (ruffled organza peplum over loose shorts). shoes: boot (shaft height; knee, over; buckles: buckle straps).
export const hyltSpecs=[
{id:'1',puff:.026,body:'#f6b8cc',print:'jennie',ink:'#d9467a',trim:'#f8ecd8',sleevePrint:'jsleeve',collar:'#fdf6ee',hemUp:true,ribbons:['#f08aae','#1a191e'],bottom:'shorts',shorts:'#18171c',beltColor:'#121115',buckle:'#d8b25a',shoe:'boot',shoeColor:'#151518',shaft:.105},
{id:'m1',puff:.026,body:'#f4b4c9',print:'jennie',ink:'#d63f76',trim:'#f8ecd8',sleevePrint:'jsleeve',collar:'#fdf6ee',hemUp:true,ribbons:['#f08aae','#1a191e'],gloves:'#141417',bottom:'shorts',shorts:'#18171c',beltColor:'#121115',buckle:'#d8b25a',shoe:'boot',shoeColor:'#151518',shaft:.105},
{id:'m2',puff:.006,body:'#1b1a1f',print:'lisa',ink:'#d8b25a',trim:'#cfd0d8',sleeveColor:'#b8a27c',sleevePrint:'lacesleeve',collar:'#1b1a1f',tassels:[{a:.10,dy:.075,len:.105,cols:['#9e1b2c','#8a1626','#9e1b2c','#8a1626'],knot:'#b8924a'}],bottom:'skirt',skirt:.130,flare:.014,skirtColor:'#2a2530',skirtPrint:'ogee',sash:'#2a2530',shorts:'#18181b',shoe:'boot',shoeColor:'#151518',shaft:.150,buckles:true},
{id:'m3',puff:.018,body:'#17161b',print:'rose',ink:'#cbbdf0',trim:'#ece8f2',sleevePrint:'silk',collar:'#e4dcf0',choker:'#d9b45a',bottom:'skirt',skirt:.150,flare:.050,pleats:true,skirtColor:'#141318',skirtPrint:'pleat',sash:'#141318',pouch:true,shorts:'#18181b',shoe:'boot',shoeColor:'#151518',shaft:.120},
{id:'m4',puff:.014,body:'#18171c',print:'jisoo',ink:'#d8b25a',trim:'#d8b25a',bodice:'#4c1e3c',sleevePrint:'goldsleeve',collar:'#18171c',hemUp:true,belt:'#c9a24a',tassels:[{a:.52,dy:-.050,top:true,len:.090,cols:['#3fa7a0','#c8343c','#efe9e2','#e58fb0','#3fa7a0'],knot:'#c8343c'}],bottom:'peplum',skirtColor:'#4a1f3a',skirtPrint:'organza',sash:'#2c1226',shorts:'#18171c',shoe:'boot',shoeColor:'#151518',over:true}];
export const hideNativeHyltSafety=(m,o)=>/^how-you-like-that-/.test(o?.style||'')&&(m.userData.excludeHatMua||m.userData.excludeHuntrix||/cream_undershorts/.test(m.name));
// 256 px canvases (grid u = around the body with the front at .25 = canvas x, canvas x > front = her right; grid v = height =
// canvas y, flipped: torso top at canvas y 0, hem at N; skirts: waistband at canvas y N)
const textures=new Map();
function tex(kind,spec){const key=kind+JSON.stringify([spec.body,spec.ink,spec.trim,spec.skirtColor,spec.sleeveColor,spec.bodice]);if(textures.has(key))return textures.get(key);const N=kind==='noise'?128:256,c=document.createElement('canvas');c.width=c.height=N;const x=c.getContext('2d');x.fillStyle=spec.body;x.fillRect(0,0,N,N);
 const circle=(px,py,r,fill,stroke,lw=1.5)=>{x.beginPath();x.arc(px,py,r,0,7);if(fill){x.fillStyle=fill;x.fill();}if(stroke){x.strokeStyle=stroke;x.lineWidth=lw;x.stroke();}};
 const flower=(px,py,r,col,core,n=5)=>{x.fillStyle=col;for(let k=0;k<n;k++){const a=k*Math.PI*2/n;x.beginPath();x.arc(px+Math.cos(a)*r*.55,py+Math.sin(a)*r*.55,r*.48,0,7);x.fill();}circle(px,py,r*.32,core);};
 // round medallion (shou roundel): ring, filled core, a pale cross-bar motif
 const medal=(px,py,r,ink,pale)=>{circle(px,py,r,null,ink,1.6);circle(px,py,r*.62,ink);x.strokeStyle=pale;x.lineWidth=1.3;x.beginPath();x.moveTo(px-r*.40,py);x.lineTo(px+r*.40,py);x.moveTo(px,py-r*.40);x.lineTo(px,py+r*.40);x.stroke();x.strokeRect(px-r*.24,py-r*.24,r*.48,r*.48);};
 const rosette=(px,py,r,ink,pale)=>{flower(px,py,r,ink,pale,8);circle(px,py,r*.16,ink);};
 // gold cloud medallion (Jisoo's jacket)
 const cloud=(px,py,r,gold)=>{x.fillStyle=gold;for(const[dx,dy]of[[-.45,0],[.45,0],[0,-.42],[0,.42],[0,0]]){x.beginPath();x.arc(px+dx*r,py+dy*r,r*.55,0,7);x.fill();}x.strokeStyle='#6e5222';x.lineWidth=1.1;for(const s of[-1,1]){x.beginPath();x.arc(px+s*r*.25,py,r*.28,0,Math.PI*1.5);x.stroke();}};
 const f=.25*N;
 if(kind==='jennie'||kind==='jsleeve'){// pink jeogori: square tiles, each a round medallion or a rosette, pale grid lines
  const S=N/12;x.strokeStyle='rgba(255,236,242,.85)';x.lineWidth=1.1;for(let i=0;i<=N;i+=S){x.beginPath();x.moveTo(i,0);x.lineTo(i,N);x.moveTo(0,i);x.lineTo(N,i);x.stroke();}
  for(let r=0;r<N/S;r++)for(let k=0;k<N/S;k++){const cx=(k+.5)*S,cy=(r+.5)*S;if((r+k)%2)medal(cx,cy,S*.34,spec.ink,'#fbe3ec');else rosette(cx,cy,S*.36,spec.ink,'#fde9f0');for(const[dx,dy]of[[0,0],[S,0],[0,S],[S,S]])flower(k*S+dx,r*S+dy,2.4,'rgba(217,70,122,.75)','#fff4f7');}
  if(kind==='jennie'){// cream embroidered collar (the wrap from her left shoulder to the right of the front) + the white edge
   const band=(x0,y0,x1,y1,w)=>{x.strokeStyle=spec.trim;x.lineWidth=w;x.lineCap='round';x.beginPath();x.moveTo(x0,y0);x.lineTo(x1,y1);x.stroke();for(let t=0;t<=1;t+=.12)flower(x0+(x1-x0)*t,y0+(y1-y0)*t,3.6,'#e66f97','#c9a24a');x.strokeStyle='#ffffff';x.lineWidth=2.4;x.beginPath();x.moveTo(x0-w*.45,y0);x.lineTo(x1-w*.45,y1);x.stroke();};
   band(f-30,0,f+10,N*.50,15);band(f+30,0,f+16,N*.16,13);}}
 if(kind==='lisa'){// black jeogori: gold/silver lace scrolls, a band of red/gold/pink flowers along the collar, one medallion low on
  // her left front
  for(let j=0;j<120;j++){const px=rand(j+5)*N,py=rand(j+17)*N,r=3+rand(j+23)*6;if(Math.abs(px-f)<10&&py<N*.55)continue;x.strokeStyle=j%3?spec.ink:spec.trim;x.lineWidth=1.3;x.beginPath();x.arc(px,py,r,rand(j)*6,rand(j)*6+3.6);x.stroke();if(j%4===0)flower(px,py,3,j%8?spec.ink:spec.trim,'#1b1a1f');}
  const fl=['#b0283a','#d8b25a','#e46d8c','#b0283a','#7fae78'];for(let t=0;t<12;t++)flower(f-26+t*2.6,4+t*N*.036,6.5-t*.1,fl[t%5],'#f5e3b0');for(let t=0;t<4;t++)flower(f+28-t*3,4+t*10,6,fl[(t+2)%5],'#f5e3b0');
  const mx=f-30,my=N*.66;circle(mx,my,15,'#efe6d2',spec.ink,2.6);flower(mx,my,10,'#9cc4e4','#e8a0b8',6);circle(mx,my,4,'#e46d8c');}
 if(kind==='lacesleeve'){// sheer silver-beige lace: gold and silver leafy sprigs and small flowers
  x.fillStyle=spec.sleeveColor;x.fillRect(0,0,N,N);for(let j=0;j<90;j++){const px=rand(j+3)*N,py=rand(j+9)*N,a=rand(j+4)*6;x.strokeStyle=j%2?'#4a3a28':'#f4f1ea';x.lineWidth=1.6;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+Math.cos(a)*9,py+Math.sin(a)*9,px+Math.cos(a+.6)*16,py+Math.sin(a+.6)*16);x.stroke();for(let k=1;k<4;k++){const qx=px+Math.cos(a+.3)*k*4.5,qy=py+Math.sin(a+.3)*k*4.5;x.fillStyle=k%2?spec.ink:'#f7f3ea';x.beginPath();x.ellipse(qx,qy,2.6,1.3,a+1.2,0,7);x.fill();}if(j%5===0)flower(px,py,4,'#f7f3ea',spec.ink);}}
 if(kind==='rose'){// black silk jacket (a few coloured flowers) open over a pastel embroidered top: diagonal pastel bands, one round medallion low on her right
  for(let j=0;j<8;j++){const px=rand(j+41)*N,py=rand(j+53)*N;if(Math.abs(px-f)<46)continue;flower(px,py,6,['#e8336f','#f2c94c','#58c4a8','#b48ae0'][j%4],'#f2c94c');}
  const pw=34;x.save();x.beginPath();x.rect(f-pw,0,pw*2,N);x.clip();const g=x.createLinearGradient(f-pw,0,f+pw,N);g.addColorStop(0,'#e2d6f4');g.addColorStop(.5,'#f4cfe0');g.addColorStop(1,'#cde4f3');x.fillStyle=g;x.fillRect(f-pw,0,pw*2,N);
  for(let k=-6;k<10;k++){x.strokeStyle=['#f8dbe7','#c8e1f4','#ffffff','#d2c1f0'][(k+8)%4];x.lineWidth=7;x.beginPath();x.moveTo(f-pw+k*16,0);x.lineTo(f-pw+k*16+60,N);x.stroke();}
  const mx=f+10,my=N*.64;circle(mx,my,13,'#cfc2f2','#8f7fd0',2.2);x.strokeStyle='#8f7fd0';x.lineWidth=1.6;x.strokeRect(mx-6,my-6,12,12);x.beginPath();x.moveTo(mx-9,my);x.lineTo(mx+9,my);x.stroke();x.restore();
  x.fillStyle=spec.trim;x.fillRect(f-pw-3,0,3,N);x.fillRect(f+pw,0,3,N);}
 if(kind==='silk'){// black silk sleeves: soft sheen streaks and a few coloured flowers
  for(let j=0;j<16;j++){x.fillStyle='rgba(255,255,255,.05)';x.fillRect(rand(j+2)*N,0,2+rand(j+5)*5,N);}for(let j=0;j<5;j++)flower(rand(j+61)*N,rand(j+71)*N,6,['#e8336f','#f2c94c','#58c4a8','#b48ae0','#e8336f'][j],'#f2c94c');}
 if(kind==='jisoo'){// black jacket open over a burgundy brocade bodice: pink/gold neckline band, gold floral waist band, gold
  // edges; round gold cloud medallions on both fronts (staggered, never a pair at one height) and the back
  const pw=26;x.fillStyle=spec.bodice;x.fillRect(f-pw,0,pw*2,N);for(let j=0;j<46;j++){const px=f-pw+rand(j+31)*pw*2,py=rand(j+37)*N;flower(px,py,3+rand(j+3)*4,j%2?'rgba(150,70,112,.85)':'rgba(40,14,32,.8)',j%3?'#c98aab':'#d8b25a');}
  x.fillStyle='#b06a8a';x.fillRect(f-pw,0,pw*2,N*.07);for(let k=0;k<5;k++)flower(f-pw+6+k*11,N*.035,4,'#d8b25a','#f3e2c0');
  x.fillStyle='#e9dfc6';x.fillRect(f-pw,N*.60,pw*2,N*.13);for(let k=0;k<6;k++)flower(f-pw+5+k*9.4,N*(.635+.03*(k%2)),5,'#c9a24a','#3a2a1a');
  x.fillStyle=spec.ink;x.fillRect(f-pw-3,0,3,N);x.fillRect(f+pw,0,3,N);
  for(const[px,py]of[[f-pw-15,N*.42],[f-pw-15,N*.66],[f+pw+15,N*.62],[f+pw+15,N*.86],[f+N*.5-18,N*.32],[f+N*.5+18,N*.58],[f+N*.5-18,N*.84]])cloud(px,py,10,spec.ink);}
 if(kind==='goldsleeve'){for(let j=0;j<7;j++)cloud(rand(j+13)*N,rand(j+29)*N,9,spec.ink);}
 if(kind==='ogee'){// Lisa's skirt: dense small arches (silver with a pink core, black outlines) and gold glints
  x.fillStyle='#1d1a22';x.fillRect(0,0,N,N);const S=N/8;for(let r=0;r<=N/S*1.6;r++)for(let k=0;k<=N/S;k++){const px=(k+(r%2)*.5)*S,py=r*S*.62;
   x.beginPath();x.moveTo(px-14,py+12);x.quadraticCurveTo(px-14,py-6,px,py-16);x.quadraticCurveTo(px+14,py-6,px+14,py+12);x.closePath();x.fillStyle='#d4d0da';x.fill();x.strokeStyle='#1d1a22';x.lineWidth=2.2;x.stroke();
   x.beginPath();x.moveTo(px-7,py+10);x.quadraticCurveTo(px-7,py,px,py-7);x.quadraticCurveTo(px+7,py,px+7,py+10);x.closePath();x.fillStyle=(r+k)%3?'#c4869f':'#d8b25a';x.fill();}}
 if(kind==='pleat'){// black pleats: each pleat shaded light to dark
  for(let i=0;i<28;i++){const g=x.createLinearGradient(i*N/28,0,(i+1)*N/28,0);g.addColorStop(0,'#2a2930');g.addColorStop(.7,spec.skirtColor);g.addColorStop(1,'#060608');x.fillStyle=g;x.fillRect(i*N/28,0,N/28+1,N);}}
 if(kind==='organza'){// Jisoo's peplum: burgundy/purple floral organza
  for(let j=0;j<60;j++){const px=rand(j+7)*N,py=rand(j+11)*N,r=8+rand(j+13)*16,g=x.createRadialGradient(px,py,1,px,py,r);g.addColorStop(0,['#9c5a86','#2c1226','#7a3a64','#b06a94'][j%4]);g.addColorStop(1,'rgba(74,31,58,0)');x.fillStyle=g;x.fillRect(px-r,py-r,r*2,r*2);}
  for(let j=0;j<22;j++)flower(rand(j+17)*N,rand(j+19)*N,5+rand(j)*3,'rgba(201,128,168,.75)','#5a2a50');}
 if(kind==='pouch'){// Rosé's norigae pouch: pale lilac silk, silver edge, white peonies, a pink knot and a pink-to-wine tassel
  x.fillStyle='#e6deee';x.fillRect(0,0,N,N);x.strokeStyle='#bdb6cc';x.lineWidth=14;x.strokeRect(0,0,N,N);
  for(const[px,py,r]of[[50,50,26],[205,95,24],[45,165,22],[210,205,20]])flower(px,py,r,'#fbf9fc','#e9e2f0',6);
  circle(N/2,N*.22,24,'#e88fb0','#b0506e',3);const g=x.createLinearGradient(0,N*.30,0,N*.92);g.addColorStop(0,'#f2a6c2');g.addColorStop(.45,'#c0406a');g.addColorStop(1,'#6e0f26');x.fillStyle=g;x.fillRect(N/2-36,N*.30,72,N*.62);x.strokeStyle='rgba(255,255,255,.18)';x.lineWidth=1;for(let i=0;i<14;i++){x.beginPath();x.moveTo(N/2-33+i*5,N*.32);x.lineTo(N/2-33+i*5,N*.92);x.stroke();}}
 if(kind==='noise'){for(let j=0;j<4200;j++){const l=rand(j)<.5?0:255;x.fillStyle='rgba('+l+','+l+','+l+','+(.03+rand(j+3)*.06)+')';x.fillRect(rand(j+1)*N,rand(j+2)*N,1,1);}}
 const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;if(kind==='noise')t.repeat.set(3,3);if(kind==='lacesleeve')t.repeat.set(3,3);if(kind==='jsleeve'||kind==='silk'||kind==='goldsleeve')t.repeat.set(2,2);textures.set(key,t);return t;}
export function* buildHyltStyles(variants,options){const records=new Map(),parts=[],timings=[];
for(const slot of ['top','bottom','shoes'])for(const[index,opt]of(options[slot]||[]).entries()){
 const match=/^how-you-like-that-(?:crew-)?(1|m[1-4])-(top|bottom|shoes)$/.exec(opt.style||'');if(!match||match[2]!==slot)continue;const spec=hyltSpecs.find(s=>s.id===match[1]);if(!spec)continue;
 const start=performance.now(),donor=variants[opt.variant],c=donorCache(donor),{body,hip,neck,pos,boneIndex,shell,floor,legQuery}=c,rec={id:opt.id,index,slot,meshes:[]};
 const mat=(color,o={})=>{const m=new T.MeshPhysicalMaterial({color,roughness:.8,clearcoat:.03,sheen:.35,sheenRoughness:.6,side:T.DoubleSide,...o});m.emissive.set(color);m.emissiveIntensity=o.glow??(/^#[ef]/i.test(color)?.20:.10);if(o.map){m.map=o.map;m.emissiveMap=o.map;}return m;};
 const cloth=(color,print='plain',extra={})=>{const s={...spec,body:color,...extra},map=print!=='plain'?tex(print,s):tex('noise',s),light=/^#[a-f9]/i.test(color);
  const m=mat('#ffffff',{map,roughness:print==='silk'?.45:.8,sheen:print==='silk'?.7:.35,glow:0});m.emissive.set('#ffffff');m.emissiveIntensity=light?.14:.07;return m;};
 const skin=new T.MeshToonMaterial({color:'#fff1df',emissive:'#bca98f',emissiveIntensity:.18,side:T.DoubleSide});
 function register(geo,m,owned=true){const mesh=new T.SkinnedMesh(geo,m);mesh.name=rec.id+'_'+rec.meshes.length;mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(body.skeleton,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;mesh.userData.sharedCrewGeometry=!owned;body.parent.add(mesh);rec.meshes.push(mesh);return mesh;}
 function weighted(geo,m,rigid=null){const pp=geo.attributes.position,si=[],sw=[],hips=boneIndex('hips'),spine=boneIndex('spine'),chest=boneIndex('chest'),upper=boneIndex('upperChest'),sp=pos('spine').y,ch=pos('chest').y,up=pos('upperChest').y;
  for(let i=0;i<pp.count;i++){const y=pp.getY(i);let a,b,w;if(rigid){a=b=boneIndex(rigid);w=0;}else if(y<sp){a=hips;b=spine;w=T.MathUtils.clamp((y-hip.y)/(sp-hip.y),0,1);}else if(y<ch){a=spine;b=chest;w=T.MathUtils.clamp((y-sp)/(ch-sp),0,1);}else{a=chest;b=upper;w=T.MathUtils.clamp((y-ch)/(up-ch),0,1);}si.push(a,b,0,0);sw.push(1-w,w,0,0);}
  geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geo.computeVertexNormals();geo.computeBoundingSphere();return register(geo,m);}
 function grid(rows,cols,fn){const pp=[],uv=[],ii=[];for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){pp.push(...fn(j/rows,k/cols).toArray());uv.push(k/cols,j/rows);}for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;ii.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ii);return g;}
 function blob(center,r,m,bone,sx=1,sy=1,sz=1){const g=new T.SphereGeometry(r,12,8);g.scale(sx,sy,sz);g.translate(center.x,center.y,center.z);g.deleteAttribute('uv');g.deleteAttribute('normal');return weighted(g,m,bone);}
 function skinLike(geo,m,side){const q=legQuery(side),p=geo.attributes.position,si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight,I=[],W=[];for(let i=0;i<p.count;i++){const h=q.nearest(V().fromBufferAttribute(p,i));const all=new Map();if(h){const bc=h.record.t.getBarycoord(h.point,V()),blend=[bc.x,bc.y,bc.z];for(let j=0;j<3;j++)for(let k=0;k<4;k++){const bi=si.getComponent(h.record.ids[j],k),w=sw.getComponent(h.record.ids[j],k)*blend[j];all.set(bi,(all.get(bi)||0)+w);}}const best=[...all].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=best.reduce((n,x)=>n+x[1],0)||1;while(best.length<4)best.push([0,0]);I.push(...best.map(x=>x[0]));W.push(...best.map(x=>x[1]/sum));}
  geo.setAttribute('skinIndex',new T.Uint16BufferAttribute(I,4));geo.setAttribute('skinWeight',new T.Float32BufferAttribute(W,4));geo.computeVertexNormals();geo.computeBoundingSphere();return register(geo,m);}
 const depths=new Map();function fitted(y,a,e=.008){const q=fitPoint(body,boneIndex,hip,neck,y,a,e);if(q)return V().set(q[0],y,q[1]);if(!depths.has(y)){const p=body.geometry.attributes.position;let lo=Infinity,hi=-Infinity;for(const id of new Set(body.geometry.index.array))if(Math.abs(p.getX(id))<.085&&Math.abs(p.getY(id)-y)<.018){lo=Math.min(lo,p.getZ(id));hi=Math.max(hi,p.getZ(id));}depths.set(y,Number.isFinite(lo)?[lo,hi]:[hip.z-.05,hip.z+.06]);}const d=depths.get(y),co=Math.cos(a),sn=Math.sin(a),rx=(fitSection(body,boneIndex,hip,neck,y)||[.085,.06])[0]+e;return V().set(co*rx,y,sn>=0?hip.z+Math.pow(Math.max(0,1-Math.pow(Math.abs(co),4)),.325)*(d[1]-hip.z+e):hip.z-Math.pow(-sn,.85)*(hip.z-d[0]+e));}
 const waist=hip.y+.062;
 // one leg's section at height y (that leg's own vertices): centre, half sizes and the outer x
 function legSection(side,y,band=.008){const s=Math.sign(pos(side+'Foot').x),pp=body.geometry.attributes.position,ids=c.ids||(c.ids=[...new Set(body.geometry.index.array)]);let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const id of ids){const x=pp.getX(id),yy=pp.getY(id);if(x*s>.004&&Math.abs(yy-y)<band){x0=Math.min(x0,x);x1=Math.max(x1,x);z0=Math.min(z0,pp.getZ(id));z1=Math.max(z1,pp.getZ(id));}}
  return Number.isFinite(x0)?{s,cx:(x0+x1)/2,cz:(z0+z1)/2,rx:(x1-x0)/2,rz:(z1-z0)/2,out:s>0?x1:x0}:null;}
 function ring(side,y,grow,h,m){const q=legSection(side,y);if(!q)return;skinLike(grid(2,32,(u,v)=>{const a=v*Math.PI*2;return V().set(q.cx+Math.cos(a)*(q.rx+grow),y-h/2+u*h,q.cz+Math.sin(a)*(q.rz+grow));}),m,side);}
 // a norigae tassel hanging on the front at angle a (pi/2 = front centre, larger = her right): a knot and a few cords
 function tassel(a,y,len,cols,knot,e=.024){const q=fitted(y,a,e),tx=-Math.sin(a),tz=Math.cos(a);if(knot)blob(V().copy(q).add(V().set(0,.002,0)),.0072,mat(knot,{roughness:.45,glow:.18}),null,1,1,.55);
  cols.forEach((col,i)=>{const d=(i-(cols.length-1)/2)*.0052,g=new T.CylinderGeometry(.0030,.0050,len,6,1);g.translate(q.x+tx*d,y-.004-len/2,q.z+tz*d+.002);g.deleteAttribute('uv');weighted(g,mat(col,{roughness:.6,glow:.14}));});}
 // loose shorts: lining (her hip skin lifted, continuous through the crotch), a loose band round the hips and a loose tube per
 // leg flaring a little to the hem, so the shorts never show the body's shape; her thigh skin below
 function looseShorts(hemY,col){const sm=mat(col,{roughness:.7}),k=Math.round((waist-hemY)*1000);
  register(shell('hylt-shorts-in-'+k,(x,y)=>y<waist+.006&&y>hemY+.004,.010),sm,false);
  register(shell('hylt-thigh-'+k,(x,y)=>y>hip.y-.165&&y<hemY+.014,.0095),skin,false);
  weighted(grid(4,48,(u,v)=>fitted(T.MathUtils.lerp(waist+.004,hip.y-.058,u),v*Math.PI*2,.013+.010*u)),sm,'hips');
  for(const side of ['left','right'])skinLike(grid(6,28,(u,v)=>{const y=T.MathUtils.lerp(hip.y-.045,hemY,u),q=legSection(side,y,.010),a=v*Math.PI*2,g=.013+.008*u;return q?V().set(q.cx+Math.cos(a)*(q.rx+g),y,q.cz+Math.sin(a)*(q.rz+g)):V().set(0,y,hip.z);}),sm,side);}


 if(slot==='top'){
  register(shell('hylt-skin-upper',(x,y)=>y>hip.y-.025&&y<neck.y+.035,.0015),skin,false);
  const clothM=cloth(spec.body,spec.print);
  const hemY=spec.hemUp?waist-.012:waist-.048,topY=neck.y-.026;
    const R=18,B=48,far=c.torsoFar||(c.torsoFar=new Map()),fk=hemY+'|'+topY;if(!far.has(fk)){const pp=body.geometry.attributes.position,si=body.geometry.attributes.skinIndex,sw=body.geometry.attributes.skinWeight,arm=new Set(['left','right'].flatMap(sd=>['Shoulder','UpperArm','LowerArm','Hand'].map(n=>{try{return boneIndex(sd+n);}catch(e){return -1;}}))),m=Array.from({length:R+1},()=>new Float32Array(B));
   for(const id of new Set(body.geometry.index.array)){const y=pp.getY(id);if(y<hemY-.012||y>topY+.012)continue;let w=0;for(let k=0;k<4;k++)if(arm.has(si.getComponent(id,k)))w+=sw.getComponent(id,k);if(w>.2)continue;
    const x=pp.getX(id),z=pp.getZ(id)-hip.z,r=Math.hypot(x,z),bi=((Math.round(Math.atan2(z,x)/(Math.PI*2)*B)%B)+B)%B,j=Math.round((y-hemY)/(topY-hemY)*R);for(const jj of [j-1,j,j+1])if(jj>=0&&jj<=R)for(const bb of [bi-1,bi,bi+1]){const q=(bb+B)%B;m[jj][q]=Math.max(m[jj][q],r);}}far.set(fk,m);}
  const farM=far.get(fk);
  weighted(grid(R,B,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(hemY,topY,u),e=.007+.016*Math.max(0,1-u/.30),q=fitted(y,a,e),r=Math.hypot(q.x,q.z-hip.z),need=u<.78?farM[Math.round(u*R)][Math.round(v*B)%B]+e:0;if(r<need){const n=Math.min(need,r+.03),dx=r>.01?q.x/r:Math.cos(a),dz=r>.01?(q.z-hip.z)/r:Math.sin(a);q.x=dx*n;q.z=hip.z+dz*n;}return q;}),clothM);
  // neck edge: a soft collar band (white for Jennie's jeogori, pale lilac for Rosé's top)
  weighted(grid(2,40,(u,v)=>fitted(topY-.004+u*.016,v*Math.PI*2,.010)),mat(spec.collar||spec.body,{roughness:.85}));
  // a gold choker round the neck (Rosé): her neck section just above the collar
  if(spec.choker){const ny=topY+.026,pp=body.geometry.attributes.position,ids=c.ids||(c.ids=[...new Set(body.geometry.index.array)]);let x0=Infinity,x1=-Infinity,z0=Infinity,z1=-Infinity;for(const id of ids){const y=pp.getY(id),xx=pp.getX(id);if(Math.abs(y-ny)<.005&&Math.abs(xx)<.07){x0=Math.min(x0,xx);x1=Math.max(x1,xx);z0=Math.min(z0,pp.getZ(id));z1=Math.max(z1,pp.getZ(id));}}
   if(Number.isFinite(x0)){const cx=(x0+x1)/2,cz=(z0+z1)/2,rx=(x1-x0)/2+.003,rz=(z1-z0)/2+.003;weighted(grid(2,32,(u,v)=>{const a=v*Math.PI*2;return V().set(cx+Math.cos(a)*rx,ny-.005+u*.010,cz+Math.sin(a)*rz);}),mat(spec.choker,{roughness:.3,metalness:.6,glow:.25}),'neck');}}
  // sleeves: her whole arm skin lifted, puffed for the wide hanbok sleeves, in the sleeve's own cloth
  const sc=cloth(spec.sleeveColor||spec.body,spec.sleevePrint||'plain');for(const side of ['left','right'])register(armShell(body,boneIndex,side,{lower:true,offset:.006,a:pos(side+'UpperArm'),b:pos(side+'Hand'),puff:spec.puff||.004}),sc,false);
  // black fingerless gloves (Jennie): her hand skin lifted where the hand bone carries it (the fingers stay bare)
  if(spec.gloves){const hands=new Set(['leftHand','rightHand'].map(boneIndex));register(shell('hylt-gloves',(x,y,z,id)=>c.wOf(id,hands)>.5,.0025),mat(spec.gloves,{roughness:.45,clearcoat:.4,glow:.05}),false);}
  // thin gold belt at the hem (Jisoo)
  if(spec.belt){const by=hemY+.008;weighted(grid(2,48,(u,v)=>fitted(by-.005+u*.010,v*Math.PI*2,.026)),mat(spec.belt,{roughness:.35,clearcoat:.6,metalness:.4,glow:.12}));}
  // norigae tassels: dy from the hem (or from the top edge when top)
  for(const t of spec.tassels||[])tassel(Math.PI/2+t.a,t.top?topY+t.dy:hemY+t.dy,t.len,t.cols,t.knot,t.top?.034:.024);
  // long ribbons (otgoreum, Jennie): from the hem at her right front to the knee, lying on the outer front of her right thigh
  // (skinned like that leg, so a lifted knee never passes through them)
  if(spec.ribbons){const side=pos('rightFoot').x<0?'right':'left',knee=pos(side+'LowerLeg').y,top=hemY+.006,phi=.62;
   spec.ribbons.forEach((col,i)=>{const w=i?.016:.020,bot=knee+.012-i*.030,sh=i?.20:0;
    skinLike(grid(18,1,(u,v)=>{const y=T.MathUtils.lerp(top,bot,u),q=legSection(side,Math.min(y,hip.y-.050),.010)||{s:-1,cx:-.05,cz:hip.z,rx:.05,rz:.05},off=(y>waist-.160?.031:.013)-i*.002,ph=phi+sh,dx=q.s*Math.sin(ph),dz=Math.cos(ph),tx=q.s*Math.cos(ph),tz=-Math.sin(ph),acr=(v-.5)*w+i*.021;
     return V().set(q.cx+dx*(q.rx+off)+tx*acr,y,q.cz+dz*(q.rz+off)+tz*acr);}),mat(col,{roughness:.5,clearcoat:.3,glow:.12}),side);});}
 }

 if(slot==='bottom'){
  if(spec.bottom==='shorts'){
   // loose black high-waisted shorts, a wide black belt and a gold crescent buckle a little to her left of the front
   looseShorts(waist-.150,spec.shorts);
   weighted(grid(3,48,(u,v)=>fitted(T.MathUtils.lerp(waist+.004,waist-.040,u),v*Math.PI*2,.031)),mat(spec.beltColor,{roughness:.35,clearcoat:.6,glow:.05}),'hips');
   const b=fitted(waist-.019,Math.PI/2-.16,.036),gold=mat(spec.buckle,{roughness:.25,metalness:.75,clearcoat:.8,glow:.30});
   for(const[r,tube,arc,rot]of[[.0165,.0042,Math.PI*1.40,.45],[.0085,.0026,Math.PI*1.25,2.2]]){const g=new T.TorusGeometry(r,tube,6,22,arc);g.rotateZ(rot);g.scale(1,1,.45);g.translate(b.x,b.y,b.z);g.deleteAttribute('uv');weighted(g,gold,'hips');}
  }else if(spec.bottom==='peplum'){
   // ruffled organza peplum (two tiers) over loose black shorts
   looseShorts(waist-.138,spec.shorts);const pm=cloth(spec.skirtColor,spec.skirtPrint);
   for(const[y0,len,fl,e,n]of[[waist+.002,.104,.050,.016,14],[waist-.016,.086,.068,.030,17]])weighted(grid(8,72,(u,v)=>{const a=v*Math.PI*2,q=fitted(y0,a,e),r=fl*Math.pow(u,.9)+.007*Math.sin(a*n+u*2)*u;return V().set(q.x+Math.cos(a)*r,y0-u*len,q.z+Math.sin(a)*r);}),pm,'hips');
   weighted(grid(3,48,(u,v)=>{const q=fitted(waist,v*Math.PI*2,.017);q.y=waist+.006-u*.014;return q;}),mat(spec.sash,{roughness:.5}),'hips');
  }else{
   // black shorts under the skirt: her hip/thigh skin lifted down to near the hem, plus her thigh skin below
   const len=spec.skirt,hemY=waist-len,fl0=spec.flare??.048;
   register(shell('hylt-shorts-'+Math.round(len*1000),(x,y)=>y<waist+.004&&y>hemY+.012,.010),mat(spec.shorts,{roughness:.7}),false);
   register(shell('hylt-thigh-'+Math.round(len*1000),(x,y)=>y>hip.y-.165&&y<hemY+.020,.0095),skin,false);
   const sk=cloth(spec.skirtColor,spec.skirtPrint||'plain',{body:spec.skirtColor}),flareAt=(a,u)=>fl0*Math.pow(u,1.1)+(spec.pleats?.0045*Math.abs(Math.sin(a*14))*Math.min(1,u*2.5):.002*Math.sin(a*10)*u);
   weighted(grid(12,spec.pleats?112:64,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.013),fl=flareAt(a,u);return V().set(q.x+Math.cos(a)*fl,waist-u*len,q.z+Math.sin(a)*fl);}),sk,'hips');
   weighted(grid(3,48,(u,v)=>{const a=v*Math.PI*2,q=fitted(waist,a,.016);q.y=waist+.006-u*.016;return q;}),mat(spec.sash||'#151518',{roughness:.5}),'hips');
   // Rosé's norigae: a large pale pouch with a tassel hanging from the waistband at her left front, outside the skirt, its
   // lower end cut to a point
   if(spec.pouch){const a0=Math.PI/2-.30,L=.190,W=.084,tx=-Math.sin(a0),tz=Math.cos(a0),pm=mat('#ffffff',{map:tex('pouch',spec),roughness:.6,glow:0});pm.emissive.set('#ffffff');pm.emissiveIntensity=.12;
    weighted(grid(10,2,(u,v)=>{const d=(1-u)*L,y=waist+.004-d,uu=Math.min(1,d/len),q=fitted(waist,a0,.013),fl=flareAt(a0,uu)+.009,narrow=Math.min(1,u/.18)*.9+.1,acr=(v-.5)*W*narrow;return V().set(q.x+Math.cos(a0)*fl+tx*acr,y,q.z+Math.sin(a0)*fl+tz*acr);}),pm,'hips');}
  }
 }

 if(slot==='shoes'){
  register(shell('hylt-legs',(x,y)=>y>floor&&y<hip.y-.105,.0005),skin,false);
  // black boots: her foot and ankle skin lifted to the shaft top, a sole rim, a block heel, a collar ring; lace bars up the
  // front (over-knee) or buckle straps with a silver buckle on the outer side (combat boots)
  const kneeY=pos('leftLowerLeg').y,sh=spec.over?Math.min(kneeY-floor+.075,hip.y-.172-floor):spec.knee?kneeY-floor-.012:spec.shaft||.115,up=mat(spec.shoeColor,{roughness:.35,clearcoat:.7,clearcoatRoughness:.2,sheen:0,glow:.06}),sole=mat('#26262b',{roughness:.6,glow:.04}),lace=mat('#3a3a40',{roughness:.5,glow:.05}),strap=mat('#0d0d10',{roughness:.5,clearcoat:.4,glow:.04}),silver=mat('#cfd2da',{roughness:.25,metalness:.8,glow:.3});
  register(shell('hylt-boot-'+Math.round(sh*1000),(x,y)=>y>floor-.01&&y<floor+sh,.0045),up,false);
  for(const side of ['left','right']){const f=pos(side+'Foot');
   skinLike(grid(2,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.041,floor+.002+u*(sh>.12?.016:.010),f.z+.030+Math.sin(a)*.079);}),sole,side);
   skinLike(grid(1,24,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.041*u,floor+(sh>.12?.018:.012),f.z+.030+Math.sin(a)*.079*u);}),sole,side);
   skinLike(grid(2,12,(u,v)=>{const a=v*Math.PI*2;return V().set(f.x+Math.cos(a)*.018,floor-.004+u*(sh>.12?.020:.030),f.z-.034+Math.sin(a)*.016);}),sole,side);
   ring(side,floor+sh-.003,.0065,.008,up);
   if(spec.buckles)for(const y of [floor+.060,floor+.090,floor+.120]){const q=legSection(side,y,.010);if(!q)continue;ring(side,y,.0085,.008,strap);skinLike(grid(1,1,(u,v)=>V().set(q.out+q.s*.0095,y-.0055+u*.011,q.cz-.006+v*.012)),silver,side);}
   const nl=spec.over?Math.max(5,Math.round(sh/.03)):0;for(let k=0;k<nl;k++){const y=floor+.045+k*(sh-.06)/(nl-1),q=legSection(side,y,.010);if(!q)continue;skinLike(grid(1,2,(u,v)=>V().set(q.cx+(v-.5)*.022,y-.002+u*.004,q.cz+q.rz+.0075)),lace,side);}
  }
 }
 const groups=new Map();for(const m of rec.meshes){if(m.userData.sharedCrewGeometry)continue;const g=m.geometry,key=m.material.uuid+'|'+Object.entries(g.attributes).map(([k,a])=>k+a.itemSize+a.array.constructor.name).sort().join(',')+'|'+g.index?.array.constructor.name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);}for(const ms of groups.values())if(ms.length>1){const g=mergeGeometries(ms.map(m=>m.geometry),false);if(!g)throw Error('How You Like That geometry schema mismatch');ms[0].geometry.dispose();ms[0].geometry=g;for(const m of ms.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
 rec.buildMs=performance.now()-start;records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});timings.push({slot,ms:rec.buildMs,meshes:rec.meshes.length});yield;
}return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){parts.forEach(p=>p.mesh.visible=false);}};
}
export function createHyltStyles(...args){const it=buildHyltStyles(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
