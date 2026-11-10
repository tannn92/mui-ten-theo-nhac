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
