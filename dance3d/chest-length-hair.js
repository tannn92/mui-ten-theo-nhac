import * as T from 'three';
// Creates a separate geometry/material choice. Original donor hair stays intact.
export function* buildChestLengthHair(donor,{preserveColor=false}={}){
 // preserveColor is the legacy selector for the separate dark option; use an explicit palette.
 const palette=preserveColor?[48,32,29]:[158,120,78];
 const records=[],textureCache=new Map(),materialCache=new Map(),V=()=>new T.Vector3();
 function* honeyTexture(old){if(!old)return old;if(textureCache.has(old))return textureCache.get(old);const image=old.image,c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);for(let row=0;row<c.height;row+=32){yield;const height=Math.min(32,c.height-row),im=ctx.getImageData(0,row,c.width,height),d=im.data;for(let i=0;i<d.length;i+=4){const l=(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])/255,light=.48+1.00*Math.sqrt(l);d[i]=Math.min(255,palette[0]*light);d[i+1]=Math.min(255,palette[1]*light);d[i+2]=Math.min(255,palette[2]*light);}ctx.putImageData(im,0,row);}const tex=old.clone();tex.source=new T.Source(c);tex.needsUpdate=true;textureCache.set(old,tex);return tex;}
 function* material(old){if(materialCache.has(old))return materialCache.get(old);const m=old.clone();m.map=yield* honeyTexture(old.map);if(old.shadeMultiplyTexture)m.shadeMultiplyTexture=yield* honeyTexture(old.shadeMultiplyTexture);if(m.color)m.color.set('#ffffff');if(m.shadeColorFactor)m.shadeColorFactor.set(preserveColor?'#59403c':'#c0a37e');m.needsUpdate=true;materialCache.set(old,m);return m;}
 const stats={meshes:0,movedVertices:0,reboundVertices:0,invalidWeights:0,minY:Infinity};
 for(const source of donor.parts.hair){
  const g=source.geometry.clone(),p=g.attributes.position,ix=g.index,si=g.attributes.skinIndex,sw=g.attributes.skinWeight,inv=source.matrixWorld.clone().invert();
  const neck=donor.vrm.humanoid.getRawBoneNode('neck').getWorldPosition(V()).applyMatrix4(inv),chest=donor.vrm.humanoid.getRawBoneNode('chest').getWorldPosition(V()).applyMatrix4(inv),pivot=neck.y+.025,target=chest.y-.025;
  const ids=[...new Set(ix.array)],low=Math.min(...ids.map(i=>p.getY(i))),factor=low<target?(pivot-target)/(pivot-low):1;
  const boneIndex=new Map(source.skeleton.bones.map((b,i)=>[b,i]));
  function chain(i){let b=source.skeleton.bones[i];if(!/Hair/i.test(b?.name||''))return -1;while(b.parent&&/Hair/i.test(b.parent.name))b=b.parent;return boneIndex.get(b)??i;}
  function vertexChain(i){let best=-1,w=0;for(let k=0;k<4;k++){const c=chain(si.getComponent(i,k));if(c>=0&&sw.getComponent(i,k)>w){best=c;w=sw.getComponent(i,k);}}return best;}
  const triangles=[];for(let i=0;i<ix.count;i+=3){const tri=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)],chains=new Set(tri.map(vertexChain));triangles.push({ids:tri,chains,t:new T.Triangle(...tri.map(id=>V().fromBufferAttribute(p,id)))});}
  const byChain=new Map();for(const tr of triangles)for(const c of tr.chains){if(!byChain.has(c))byChain.set(c,[]);byChain.get(c).push(tr);}
  // Compress below the neck and bind each moved point to its upper strand segment.
  // This uses the existing shorter portion of the spring chain, not distant tip bones.
  let vertexStep=0;for(const id of ids){if(vertexStep++%16===0)yield;const old=V().fromBufferAttribute(p,id);if(old.y>=pivot||factor===1)continue;const next=old.clone();next.y=pivot-(pivot-old.y)*factor;const which=vertexChain(id);let best=null;
   for(const tr of (which>=0?(byChain.get(which)||[]):triangles)){const q=tr.t.closestPointToPoint(next,V()),dist=q.distanceToSquared(next);if(!best||dist<best.dist)best={...tr,q,dist};}
   if(best){const bary=best.t.getBarycoord(best.q,V()),weights=new Map();best.ids.forEach((i,k)=>{for(let j=0;j<4;j++){const b=source.geometry.attributes.skinIndex.getComponent(i,j),w=source.geometry.attributes.skinWeight.getComponent(i,j)*bary.getComponent(k);weights.set(b,(weights.get(b)||0)+w);}});const list=[...weights].filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,4),sum=list.reduce((s,x)=>s+x[1],0);if(!(sum>0)){stats.invalidWeights++;continue;}for(let k=0;k<4;k++){si.setComponent(id,k,list[k]?.[0]||0);sw.setComponent(id,k,(list[k]?.[1]||0)/sum);}stats.reboundVertices++;}
   p.setXYZ(id,next.x,next.y,next.z);stats.movedVertices++;
  }
  g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();const materials=[];for(const m of [].concat(source.material))materials.push(yield* material(m));const mesh=new T.SkinnedMesh(g,Array.isArray(source.material)?materials:materials[0]);mesh.name='hat-mua-chest-hair_'+source.name;mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);mesh.bind(source.skeleton,source.bindMatrix);mesh.frustumCulled=false;mesh.visible=false;source.parent.add(mesh);records.push(mesh);stats.meshes++;stats.minY=Math.min(stats.minY,...ids.map(i=>p.getY(i)));
 }
 return{meshes:records,stats,setVisible(visible){for(const m of records)m.visible=visible;},dispose(){for(const m of records){m.removeFromParent();m.geometry.dispose();}for(const m of materialCache.values())m.dispose();for(const t of textureCache.values())t.dispose();}};
}

export function createChestLengthHair(...args){const iterator=buildChestLengthHair(...args);let step;do{step=iterator.next();}while(!step.done);return step.value;}
