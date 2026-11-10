import * as T from 'three';
// Body-hugging torso outline for the procedural clothing modules.
// Owner 2026-11-10: tops stood off the chest ("áo như kiểu ko dính vào thân… có khoảng không giữa áo và người") because every
// row of a top was an ellipse sized to the torso's widest/deepest point. Here a row at height y is the CONVEX HULL of the donor's
// own torso slice (rest pose, body-local coordinates): garments follow the real body, bridge the cleavage and never flare past it.
// Only the torso (hips..upperChest weights >= .6) between hip.y-.02 and neck.y-.01; outside that the modules keep their old shape.
const states=new WeakMap();
function state(body,boneIndex){
 let s=states.get(body);if(s)return s;
 const g=body.geometry,p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,tb=new Set();
 for(const n of ['hips','spine','chest','upperChest']){try{tb.add(boneIndex(n));}catch(e){}}
 const X=[],Y=[],Z=[];
 for(const id of new Set(g.index.array)){let w=0;for(let k=0;k<4;k++)if(tb.has(si.getComponent(id,k)))w+=sw.getComponent(id,k);if(w>=.6){X.push(p.getX(id));Y.push(p.getY(id));Z.push(p.getZ(id));}}
 s={X,Y,Z,rings:new Map()};states.set(body,s);return s;
}
function ring(s,y){
 const key=Math.round(y*1000);if(s.rings.has(key))return s.rings.get(key);
 const pts=[];for(let i=0;i<s.Y.length;i++)if(Math.abs(s.Y[i]-y)<.02)pts.push([s.X[i],s.Z[i]]);
 let r=null;
 if(pts.length>=12){
  pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
  for(const q of pts){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop();lo.push(q);}
  for(let i=pts.length-1;i>=0;i--){const q=pts[i];while(up.length>1&&cr(up[up.length-2],up[up.length-1],q)<=0)up.pop();up.push(q);}
  const h=lo.slice(0,-1).concat(up.slice(0,-1));
  if(h.length>=3){let cx=0,cz=0;for(const q of h){cx+=q[0];cz+=q[1];}r={h,c:[cx/h.length,cz/h.length]};}
 }
 s.rings.set(key,r);return r;
}
function ray(r,dx,dz){
 const {h,c}=r;let best=Infinity;
 for(let i=0;i<h.length;i++){const A=h[i],B=h[(i+1)%h.length],ex=B[0]-A[0],ez=B[1]-A[1],den=dx*ez-dz*ex;if(Math.abs(den)<1e-12)continue;
  const t=((A[0]-c[0])*ez-(A[1]-c[1])*ex)/den,u=((A[0]-c[0])*dz-(A[1]-c[1])*dx)/den;if(t>0&&u>=-1e-6&&u<=1+1e-6&&t<best)best=t;}
 return best;
}
// rows are the hull of a 4 cm band (covers the bust between a garment's rows) + 4 mm clearance so the skin never pokes through
const CLEAR=.004;
const inRange=(hip,neck,y)=>y>=hip.y-.02&&y<=neck.y-.01;
// point on the hugging outline at angle a (x = cos a, z = sin a, a = PI/2 is the front), pushed out by e
export function fitPoint(body,boneIndex,hip,neck,y,a,e=0){
 if(!inRange(hip,neck,y))return null;const r=ring(state(body,boneIndex),y);if(!r)return null;
 const dx=Math.cos(a),dz=Math.sin(a),t=ray(r,dx,dz);if(!Number.isFinite(t))return null;const k=t+e+CLEAR;return [r.c[0]+dx*k,r.c[1]+dz*k];
}
// [half width, front depth from hip.z] of the hugging outline (drop-in for the modules' section(y))
export function fitSection(body,boneIndex,hip,neck,y){
 if(!inRange(hip,neck,y))return null;const r=ring(state(body,boneIndex),y);if(!r)return null;
 let w=0;for(const q of r.h)w=Math.max(w,Math.abs(q[0]));const t=ray(r,0,1);if(!Number.isFinite(t))return null;
 return [w+CLEAR,r.c[1]+t+CLEAR-hip.z];
}

// Sleeves from her own arm (owner 2026-11-10, side view: the tube sleeves began inside the shoulder with a horizontal ring that
// stuck out in front of and behind the shoulder like a shelf once the arm hung down). The arm's own skin triangles (upper arm +
// shoulder cap, + forearm for long sleeves) lifted by `offset` along the normals, skinned exactly like the arm: no caps, no shelf.
// a/b = shoulder and elbow joint positions (body-local) for cutting short sleeves at upperFrac of the upper arm.
const arms=new WeakMap();
function armWeights(body,boneIndex,side){
 let m=arms.get(body);if(!m){m=new Map();arms.set(body,m);}if(m.has(side))return m.get(side);
 const g=body.geometry,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,ix=(n=>{try{return boneIndex(n);}catch(e){return -1;}});
 const up=new Set([ix(side+'UpperArm'),ix(side+'Shoulder')]),low=ix(side+'LowerArm'),n=g.attributes.position.count,wu=new Float32Array(n),wl=new Float32Array(n);
 for(let i=0;i<n;i++)for(let k=0;k<4;k++){const b=si.getComponent(i,k),w=sw.getComponent(i,k);if(up.has(b))wu[i]+=w;else if(b===low)wl[i]+=w;}
 const d={wu,wl,shells:new Map()};m.set(side,d);return d;
}
export function armShell(body,boneIndex,side,{lower=true,offset=.006,a=null,b=null,upperFrac=1,puff=0}={}){
 const d=armWeights(body,boneIndex,side),key=[lower,offset,upperFrac,puff].join('|');if(d.shells.has(key))return d.shells.get(key);
 const g=body.geometry,p=g.attributes.position,nrm=g.attributes.normal,ix=g.index,len=a&&b?Math.hypot(b.x-a.x,b.y-a.y,b.z-a.z):0;
 const ok=id=>{const w=d.wu[id]+(lower?d.wl[id]:0);if(w<.5)return false;if(upperFrac<1&&len){const t=((p.getX(id)-a.x)*(b.x-a.x)+(p.getY(id)-a.y)*(b.y-a.y)+(p.getZ(id)-a.z)*(b.z-a.z))/(len*len);if(t>upperFrac)return false;}return true;};
 const attrs=Object.fromEntries(['position','normal','uv','skinIndex','skinWeight'].filter(k=>g.attributes[k]).map(k=>[k,[]])),map=new Map(),out=[];
 for(let i=0;i<ix.count;i+=3){const tri=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];if(!tri.every(ok))continue;
  for(const id of tri){if(!map.has(id)){map.set(id,map.size);
   // puff sleeves: extra lift along the upper arm, 0 at the shoulder seam and at the hem, fullest in between
   let off=offset;if(puff&&len){const t=((p.getX(id)-a.x)*(b.x-a.x)+(p.getY(id)-a.y)*(b.y-a.y)+(p.getZ(id)-a.z)*(b.z-a.z))/(len*len),f=Math.min(1,Math.max(0,t/upperFrac));off+=puff*Math.pow(Math.sin(Math.PI*f),.7);}
   for(const [k,arr] of Object.entries(attrs)){const src=g.attributes[k];for(let c=0;c<src.itemSize;c++)arr.push(src.getComponent(id,c)+(k==='position'?nrm.getComponent(id,c)*off:0));}}out.push(map.get(id));}}
 const geo=new T.BufferGeometry();for(const [k,arr] of Object.entries(attrs)){const src=g.attributes[k];geo.setAttribute(k,k==='skinIndex'?new T.Uint16BufferAttribute(arr,4):new T.Float32BufferAttribute(arr,src.itemSize));}
 geo.setIndex(out);geo.computeBoundingSphere();d.shells.set(key,geo);return geo;
}
// radius of her arm around the segment p0->p1 at fraction u (for cuffs and trims placed on a shell sleeve): 80th percentile of
// the forearm (seg 'lower') or upper-arm (seg 'upper') skin distances from the axis in a 2 cm slab, so the thumb root never counts
export function armRadius(body,boneIndex,side,p0,p1,u,seg='lower'){
 const d=armWeights(body,boneIndex,side),p=body.geometry.attributes.position,L=Math.hypot(p1.x-p0.x,p1.y-p0.y,p1.z-p0.z)||1,ax=[(p1.x-p0.x)/L,(p1.y-p0.y)/L,(p1.z-p0.z)/L],rs=[];
 for(let i=0;i<p.count;i++){if((seg==='lower'?d.wl[i]:d.wu[i])<.5)continue;const vx=p.getX(i)-p0.x,vy=p.getY(i)-p0.y,vz=p.getZ(i)-p0.z,t=vx*ax[0]+vy*ax[1]+vz*ax[2];if(Math.abs(t-u*L)>.01)continue;
  const ox=vx-ax[0]*t,oy=vy-ax[1]*t,oz=vz-ax[2]*t,r=Math.hypot(ox,oy,oz);if(r<.07)rs.push(r);}
 if(rs.length<4)return .024;rs.sort((x,y)=>x-y);return rs[Math.floor(rs.length*.8)];
}
