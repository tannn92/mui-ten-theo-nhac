import * as T from 'three';

// Exact triangle queries. The tree only rejects impossible candidates; the final
// arithmetic remains THREE.Triangle/Ray, with original scan-order tie breaking.
const queryCache=new WeakMap(),geometryCache=new WeakMap();
const EPS=1e-12;
// Cache only immutable source geometry, or mark position/index needsUpdate after edits.
export function geometryTriangles(geometry){
 const p=geometry.attributes.position,ix=geometry.index,old=geometryCache.get(geometry);
 if(old&&old.p===p&&old.ix===ix&&old.pv===p.version&&old.iv===ix?.version)return old.records;
 const records=[],count=ix?ix.count:p.count;
 for(let i=0;i<count;i+=3){const ids=[0,1,2].map(k=>ix?ix.getX(i+k):i+k);const t=new T.Triangle(...ids.map(id=>new T.Vector3().fromBufferAttribute(p,id)));records.push({ids,t,triangle:t});}
 geometryCache.set(geometry,{p,ix,pv:p.version,iv:ix?.version,records});return records;
}
export function getTriangleQuery(records){
 let query=queryCache.get(records);if(query)return query;
 const entries=records.map((record,index)=>{const triangle=record.t||record.triangle;
  if(!triangle)throw Error('Triangle query requires record.t or record.triangle');
  const box=new T.Box3().setFromPoints([triangle.a,triangle.b,triangle.c]).expandByScalar(EPS);
  return {record,index,triangle,box,center:box.getCenter(new T.Vector3())};
 });
 function tree(items){
  const box=new T.Box3();for(const e of items)box.union(e.box);
  // Expand only the pruning bounds, never triangle coordinates.
  box.expandByScalar(EPS);
  if(items.length<=8)return {box,items};
  const size=box.getSize(new T.Vector3()),axis=size.x>=size.y&&size.x>=size.z?'x':size.y>=size.z?'y':'z';
  items.sort((a,b)=>a.center[axis]-b.center[axis]||a.index-b.index);const middle=items.length>>1;
  return {box,left:tree(items.slice(0,middle)),right:tree(items.slice(middle))};
 }
 const root=entries.length?tree(entries.slice()):null,scratch=new T.Vector3();
 function boxDistance(point,box){const x=Math.max(box.min.x-point.x,0,point.x-box.max.x),y=Math.max(box.min.y-point.y,0,point.y-box.max.y),z=Math.max(box.min.z-point.z,0,point.z-box.max.z);return x*x+y*y+z*z;}
 function nearest(point){
  if(!root)return null;
  const first=entries[0],bestPoint=first.triangle.closestPointToPoint(point,new T.Vector3());
  let best=first,bestDistance=bestPoint.distanceToSquared(point);
  // Match a linear scan's behavior for a non-finite first result as well.
  if(Number.isNaN(bestDistance))return {record:best.record,index:best.index,point:bestPoint,distanceSq:bestDistance};
  function visit(node,distance){
   if(distance>bestDistance+EPS*Math.max(1,bestDistance))return;
   if(node.items){for(const e of node.items){const q=e.triangle.closestPointToPoint(point,scratch),d=q.distanceToSquared(point);
    if(d<bestDistance||(d===bestDistance&&e.index<best.index)){best=e;bestDistance=d;bestPoint.copy(q);}
   }return;}
   const a=boxDistance(point,node.left.box),b=boxDistance(point,node.right.box);
   if(a<=b){visit(node.left,a);visit(node.right,b);}else{visit(node.right,b);visit(node.left,a);}
  }
  visit(root,boxDistance(point,root.box));return {record:best.record,index:best.index,point:bestPoint,distanceSq:bestDistance};
 }
 function rayCandidates(ray){
  const found=[];function visit(node){if(!ray.intersectsBox(node.box))return;if(node.items){for(const e of node.items)if(ray.intersectsBox(e.box))found.push(e);}else{visit(node.left);visit(node.right);}}
  if(root)visit(root);found.sort((a,b)=>a.index-b.index);return found.map(e=>e.record);
 }
 query={nearest,rayCandidates};queryCache.set(records,query);return query;
}
