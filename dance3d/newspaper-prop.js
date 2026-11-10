import * as T from 'three';

// Hand-held newspaper prop (owner 2026-11-10, Secret: "giơ 2 tay lên cầm không khí trông chuối quá").
// One opened two-page spread per performer, posed every frame from the hand bones (world space):
// - both hands hold the side edges a third down from the top; the print faces the dancer's front;
// - hands closer than the paper width -> the sheet bows forward (arc length kept, like real paper), never shrinks;
// - hands far apart (or one above the other) -> the upper hand holds the inner edge, the sheet flies outward;
// - shown only inside the per-song windows below, with a short scale in/out.
// Windows: song seconds, keyed by slug then performer ('lead' = the child, crew = config crew ids).
// Secret evidence (clip, song time ~ video - 0.04 s): open papers from the first dance beat (15.2 s, dance start in game)
// until the throw at ~29.5 s. The 38-50 s papers in the clip are held by kneeling backups, but the game crew stand
// arms-down there (no kneel), so no paper is shown then.
// [from, to] or [from, to, {face, arms}] (song s). face: the sheet stays in front of the face (no "roof" over the head);
// arms: the crew rig forces the arms up to hold it there (independent-crew-rig.js FACE_ARMS).
// Secret (owner 2026-11-10 "Ít ra phải cầm tờ báo nhún nhẩy, các bạn nam đi vào cũng nên cầm sẵn tờ báo"): the child holds the
// paper from the start and the boys from their walk-on at 7.0 (the lead's grooving fallback holds it like reading, then lifts
// it in front of the face 12.2-14.2); 43.9-48.4 the back-row boys hold it up in front of their faces like the kneeling
// girls in the clip (the singer in front, Quang Hùng S2L, does not).
export const NEWSPAPER_WINDOWS={
 secret:{lead:[[-1,29.5],[11.9,14.5,{face:true}]],S1L:[[7.0,29.5],[11.9,14.5,{face:true}],[44.4,48.4,{face:true,arms:true}]],
  S1R:[[7.0,29.5],[11.9,14.5,{face:true}],[43.9,48.4,{face:true,arms:true}]],S2L:[[7.0,29.5],[11.9,14.5,{face:true}]],
  S2R:[[7.0,29.5],[11.9,14.5,{face:true}],[44.4,48.4,{face:true,arms:true}]]},
};
const ARMS_FADE=.45;
// {w: paper visible weight, face: no-roof weight, arms: arm-override weight}
export function paperState(slug,key,t){const list=NEWSPAPER_WINDOWS[slug]?.[key];let w=0,face=0,arms=0;if(!list||t==null)return{w,face,arms};
 for(const [a,b,o]of list){if(t<a-ARMS_FADE||t>b+ARMS_FADE)continue;const k=Math.max(0,Math.min(1,(t-a)/FADE,(b-t)/FADE));w=Math.max(w,k);
  if(o?.face)face=Math.max(face,k);if(o?.arms){const u=Math.max(0,Math.min(1,(t-a+ARMS_FADE)/ARMS_FADE,(b+ARMS_FADE-t)/ARMS_FADE));arms=Math.max(arms,u*u*(3-2*u));}}
 return{w,face,arms};}

const W=.42,H=.29,NX=16,NY=4,TOP=H/3,BASE_THETA=.22,MAX_THETA=2.5,FADE=.15,BACK=.0015;
// one shared texture + material
let sharedMaterial=null;
function paperTexture(){
 const c=document.createElement('canvas');c.width=1024;c.height=708;const g=c.getContext('2d'),w=c.width,h=c.height;
 g.fillStyle='#f2eee3';g.fillRect(0,0,w,h);
 // faint fibre tint
 for(let i=0;i<500;i++){g.fillStyle=`rgba(120,110,90,${(.015+(i%7)*.004).toFixed(3)})`;g.fillRect((i*197)%w,(i*331)%h,2+(i%3),1);}
 g.fillStyle='#1d1d1d';g.textAlign='center';g.textBaseline='alphabetic';
 g.font='900 150px Georgia, "Times New Roman", serif';g.fillText('SECRET',w/2,165);
 g.fillRect(40,186,w-80,5);g.fillRect(40,232,w-80,2);
 g.font='italic 600 30px Georgia, "Times New Roman", serif';g.fillText('Bản tin nhảy · Số đặc biệt · Hôm nay',w/2,222);
 // centre fold
 g.fillStyle='rgba(0,0,0,.16)';g.fillRect(w/2-2,248,4,h-268);
 const col=(x0,y0,x1,y1)=>{g.fillStyle='#8d8a84';for(let y=y0;y<y1;y+=17){const end=x1-((y*13)%5===0?(x1-x0)*.35:0);g.fillRect(x0,y,end-x0,7);}};
 const pic=(x,y,ww,hh)=>{g.fillStyle='#b3b0aa';g.fillRect(x,y,ww,hh);g.fillStyle='#9a978f';g.fillRect(x+ww*.12,y+hh*.5,ww*.76,hh*.38);g.beginPath();g.arc(x+ww*.28,y+hh*.3,hh*.13,0,7);g.fill();};
 const head=(x,y,txt,size)=>{g.fillStyle='#262626';g.textAlign='left';g.font=`800 ${size}px Georgia, "Times New Roman", serif`;g.fillText(txt,x,y);};
 // left page
 head(48,290,'Cả phố cùng nhảy',38);col(48,310,250,690);pic(266,262,214,170);col(266,452,480,690);
 // right page
 head(544,290,'Bí mật được bật mí',38);pic(544,312,200,150);col(544,482,744,690);col(762,312,976,600);pic(762,616,214,62);
 return c;
}
function material(){
 if(sharedMaterial)return sharedMaterial;
 const tex=new T.CanvasTexture(paperTexture());tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
 sharedMaterial=new T.MeshStandardMaterial({map:tex,roughness:.92,metalness:0,side:T.FrontSide});
 return sharedMaterial;
}
// two printed layers (front faces +z, back faces -z with mirrored u so its print reads correctly)
function paperGeometry(){
 const per=(NX+1)*(NY+1),pos=new Float32Array(per*2*3),nor=new Float32Array(per*2*3),uv=new Float32Array(per*2*2),idx=[];
 for(let l=0;l<2;l++)for(let j=0;j<=NY;j++)for(let i=0;i<=NX;i++){const k=l*per+j*(NX+1)+i,u=i/NX;uv[k*2]=l?1-u:u;uv[k*2+1]=1-j/NY;}
 for(let l=0;l<2;l++)for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){const a=l*per+j*(NX+1)+i,b=a+1,c=a+NX+1,d=c+1;if(l)idx.push(a,b,c,b,d,c);else idx.push(a,c,b,b,c,d);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(pos,3));geo.setAttribute('normal',new T.BufferAttribute(nor,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.setIndex(idx);
 geo.boundingSphere=new T.Sphere(new T.Vector3(0,-H/6,0),.4);return geo;
}
// bend: arc of length W through angle 2*theta; chord ends at local (+-R sin theta, 0, 0), bulging toward +z
function bend(geo,theta){
 const pos=geo.attributes.position.array,nor=geo.attributes.normal.array,per=(NX+1)*(NY+1),R=W/(2*theta),ct=Math.cos(theta);
 for(let l=0;l<2;l++)for(let j=0;j<=NY;j++)for(let i=0;i<=NX;i++){const k=(l*per+j*(NX+1)+i)*3,phi=(i/NX-.5)*2*theta,s=Math.sin(phi),c=Math.cos(phi),sg=l?-1:1;
  pos[k]=R*s-(l?s*BACK:0);pos[k+1]=TOP-j/NY*H;pos[k+2]=R*(c-ct)-(l?c*BACK:0);nor[k]=s*sg;nor[k+1]=0;nor[k+2]=c*sg;}
 geo.attributes.position.needsUpdate=true;geo.attributes.normal.needsUpdate=true;
}
// half-angle of an arc of length W with chord c (sin x / x = c / W), clamped
function solveTheta(c){
 const r=c/W;if(r>=Math.sin(BASE_THETA)/BASE_THETA)return BASE_THETA;if(r<=Math.sin(MAX_THETA)/MAX_THETA)return MAX_THETA;
 let lo=BASE_THETA,hi=MAX_THETA;for(let n=0;n<24;n++){const m=(lo+hi)/2;if(Math.sin(m)/m>r)lo=m;else hi=m;}return (lo+hi)/2;
}

const cache=new WeakMap();
export function newspaperProps(scene){
 if(cache.has(scene))return cache.get(scene);
 const group=new T.Group();group.name='newspaper-props';scene.add(group);
 const papers=new Map();
 // scratch (no per-frame allocations)
 const hL=new T.Vector3(),hR=new T.Vector3(),gL=new T.Vector3(),gR=new T.Vector3(),tmp=new T.Vector3(),shL=new T.Vector3(),shR=new T.Vector3(),hip=new T.Vector3(),neck=new T.Vector3(),
  lat=new T.Vector3(),fwd=new T.Vector3(),sup=new T.Vector3(),xa=new T.Vector3(),ya=new T.Vector3(),za=new T.Vector3(),up=new T.Vector3(0,1,0),
  p2=new T.Vector3(),p1=new T.Vector3(),q2=new T.Quaternion(),q1=new T.Quaternion(),basis=new T.Matrix4(),ws=new T.Vector3(),qt=new T.Quaternion(),ax=new T.Vector3(1,0,0);
 function paper(key){let p=papers.get(key);if(!p){const geo=paperGeometry();bend(geo,BASE_THETA);const mesh=new T.Mesh(geo,material());mesh.name='newspaper-'+key;mesh.visible=false;mesh.frustumCulled=false;mesh.matrixAutoUpdate=true;group.add(mesh);p={mesh,theta:BASE_THETA,one:0,oneTarget:0,hand:-1,lastT:null};papers.set(key,p);}return p;}
 function windowWeight(slug,key,t){return paperState(slug,key,t).w;}
 function grip(humanoid,side,out){
  const hand=humanoid.getRawBoneNode(side+'Hand');if(!hand)return false;hand.getWorldPosition(out);
  const mid=humanoid.getRawBoneNode(side+'MiddleProximal');
  if(mid){mid.getWorldPosition(tmp);out.lerp(tmp,.7);return true;}
  const fore=humanoid.getRawBoneNode(side+'LowerArm');if(fore){fore.getWorldPosition(tmp);tmp.subVectors(out,tmp).multiplyScalar(.3);out.add(tmp);}return true;
 }
 function frameQuat(x,y,z,q){basis.makeBasis(x,y,z);q.setFromRotationMatrix(basis);}
 function hide(key){const p=papers.get(key);if(p)p.mesh.visible=false;}
 function hideAll(){for(const p of papers.values())p.mesh.visible=false;}
 function update(key,humanoid,slug,t){
  const st=paperState(slug,key,t),e=st.w;if(e<=0||!humanoid){hide(key);return;}
  const p=paper(key),mesh=p.mesh;
  if(!grip(humanoid,'left',gL)||!grip(humanoid,'right',gR)){mesh.visible=false;return;}
  const hipsBone=humanoid.getRawBoneNode('hips'),uaL=humanoid.getRawBoneNode('leftUpperArm'),uaR=humanoid.getRawBoneNode('rightUpperArm'),nk=humanoid.getRawBoneNode('neck')||humanoid.getRawBoneNode('head');
  if(!hipsBone||!uaL||!uaR||!nk){mesh.visible=false;return;}
  uaL.getWorldPosition(shL);uaR.getWorldPosition(shR);hipsBone.getWorldPosition(hip);nk.getWorldPosition(neck);hipsBone.getWorldScale(ws);
  const s=Math.abs(ws.y)||1,Ws=W*s;
  // dancer frame: lateral (toward the dancer's left), spine up, forward = lateral x up
  lat.subVectors(shL,shR);sup.subVectors(neck,hip).normalize();fwd.crossVectors(lat,sup).normalize();
  // mode: both hands, or the lower hand alone when the hands are far apart / stacked vertically
  xa.subVectors(gL,gR);const span=xa.length();xa.multiplyScalar(1/(span||1));const vert=Math.abs(xa.y);
  if(p.oneTarget===0&&(span>1.7*Ws||vert>.85))p.oneTarget=1;else if(p.oneTarget===1&&span<1.45*Ws&&vert<.7)p.oneTarget=0;
  const dt=p.lastT==null?1:Math.abs(t-p.lastT);p.lastT=t;
  p.one=dt>.25?p.oneTarget:p.one+(p.oneTarget-p.one)*(1-Math.exp(-dt*14));
  let theta=BASE_THETA;
  if(p.one<.999){
   // two hands: x along the hands (sign so the print faces forward), y = world up made orthogonal
   ya.copy(up).addScaledVector(xa,-xa.dot(up));if(ya.lengthSq()<1e-6)ya.copy(sup);ya.normalize();za.crossVectors(xa,ya);
   if(za.dot(fwd)<0){xa.negate();za.negate();}
   theta=solveTheta(span/s);p2.addVectors(gL,gR).multiplyScalar(.5);frameQuat(xa,ya,za,q2);
  }
  if(p.one>.001){
   // one hand: the upper one (with hysteresis; the other is usually on the hip), the sheet flies outward like a flag, facing forward
   const dy=gL.y-gR.y;if(p.hand<0)p.hand=dy>0?1:0;else if(p.hand===0&&dy>.08*s)p.hand=1;else if(p.hand===1&&dy<-.08*s)p.hand=0;
   const g=p.hand===1?gL:gR;
   xa.copy(lat).addScaledVector(up,-lat.dot(up));if(xa.lengthSq()<1e-6)xa.set(1,0,0);xa.normalize();ya.copy(up);za.crossVectors(xa,ya);
   const half=W/(2*BASE_THETA)*Math.sin(BASE_THETA)*s,side=p.hand===1?1:-1;// left hand holds the inner edge -> centre lies further toward the dancer's left (+x)
   p1.copy(g).addScaledVector(xa,side*half);frameQuat(xa,ya,za,q1);
   if(p.one>=.999){p2.copy(p1);q2.copy(q1);}else{p2.lerp(p1,p.one);q2.slerp(q1,p.one);}
   theta+=(BASE_THETA-theta)*p.one;
  }
  // hands up at the head: hold the sheet by its lower edge and tip it back over the head like a roof (clip 18-20 s) instead of over the face
  const hb=humanoid.getRawBoneNode('head');if(hb){hb.getWorldPosition(tmp);const gy=(gL.y+gR.y)/2,sy=(shL.y+shR.y)/2,lift=T.MathUtils.smoothstep(gy,sy+.45*(tmp.y-sy),tmp.y)*(1-p.one)*(1-st.face);
   if(lift>0){qt.setFromAxisAngle(ax,-.55*lift);q2.multiply(qt);ya.set(0,1,0).applyQuaternion(q2);p2.addScaledVector(ya,lift*(H-TOP)*s);}}
  if(Math.abs(theta-p.theta)>.002){p.theta=theta;bend(mesh.geometry,theta);}
  mesh.position.copy(p2);mesh.quaternion.copy(q2);const k=e<1?e*e*(3-2*e):1;mesh.scale.setScalar(s*Math.max(.001,k));mesh.visible=true;
 }
 const api={slug:null,update,hide,hideAll,papers,diagnostics(){const out={slug:api.slug};for(const [k,p]of papers)out[k]={visible:p.mesh.visible,position:p.mesh.position.toArray().map(v=>+v.toFixed(3)),theta:+p.theta.toFixed(3),oneHand:+p.one.toFixed(2)};return out;}};
 cache.set(scene,api);return api;
}
