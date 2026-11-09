import * as T from 'three';
import {buildChestLengthHair} from './chest-length-hair.js?v=0911.1727';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function hatMuaOptions(){return Object.fromEntries(['top','bottom','shoes','accessory'].map(slot=>[slot,[1,2,3].map(set=>({id:'hat-mua-'+set+'-'+slot,style:'hat-mua-'+set+'-'+slot,variant:1,label:'Hạt Mưa '+set+' · '+slot}))]));}
export const hatMuaSets=[1,2,3].map(set=>({id:'hat-mua-'+set,label:'Hạt Mưa · Bộ '+set,selectionIds:Object.fromEntries(['top','bottom','shoes','accessory'].map(slot=>[slot,'hat-mua-'+set+'-'+slot]))}));
export function* buildHatMuaStyles(variants,options){
 const records=new Map(),parts=[],V=()=>new T.Vector3(),toon=c=>new T.MeshToonMaterial({color:c,side:T.DoubleSide});
 for(const [index,opt] of (options.hair||[]).entries())if(['hat-mua-chest-hair','hat-mua-chest-hair-dark'].includes(opt.style)){
  const made=yield* buildChestLengthHair(variants[opt.variant],{preserveColor:opt.style.endsWith('-dark')});
  records.set('hair:'+index,{id:opt.id,index,slot:'hair',meshes:made.meshes});
  made.meshes.forEach(mesh=>parts.push({slot:'hair',variant:index,donor:opt.variant,mesh}));
 }
 for(const slot of ['top','bottom','shoes','accessory'])for(const[index,opt]of(options[slot]||[]).entries()){
  if(!/^hat-mua-[123]-/.test(opt.style||''))continue;const set=Number(opt.style.split('-')[2]);
  const donor=variants[opt.variant],body=donor.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),inv=body.matrixWorld.clone().invert(),bone=n=>donor.vrm.humanoid.getRawBoneNode(n),pos=n=>bone(n).getWorldPosition(V()).applyMatrix4(inv),hip=pos('hips'),neck=pos('neck');
  const rec={id:opt.id,index,slot,meshes:[]},white=toon('#ffffff'),pink=set===3?new T.MeshStandardMaterial({color:'#e7b0c5',roughness:1,side:T.DoubleSide,vertexColors:true}):toon('#f3bfd3'),pale=toon('#ffe0ea'),furPink=set===2?new T.MeshStandardMaterial({color:'#f2bfd6',roughness:1,side:T.DoubleSide}):toon('#e99cbe'),skin=toon('#fff1df');white.emissive.set('#ffffff');white.emissiveIntensity=.16;if(set===2)furPink.color.set('#f2bfd6');pink.emissive.set('#8b6477');pink.emissiveIntensity=.13;
  const trisOf=source=>{const p=source.geometry.attributes.position,ix=source.geometry.index,out=[];for(let i=0;i<ix.count;i+=3){const ids=[ix.getX(i),ix.getX(i+1),ix.getX(i+2)];out.push({ids,t:new T.Triangle(...ids.map(id=>V().fromBufferAttribute(p,id)))});}return out;};
  const tris=trisOf(body),torso=tris.filter(t=>t.ids.every(i=>Math.abs(body.geometry.attributes.position.getX(i))<.145));
  function register(g,m,source=body){if(set===3&&m===pink){const pp=g.attributes.position,cc=[];for(let i=0;i<pp.count;i++){const v=.94+.06*Math.sin(pp.getX(i)*823+pp.getY(i)*491)*Math.sin(pp.getZ(i)*719-pp.getY(i)*619);cc.push(v,v,v);}g.setAttribute('color',new T.Float32BufferAttribute(cc,3));}g.computeVertexNormals();g.computeBoundingSphere();const mesh=new T.SkinnedMesh(g,m);mesh.name=rec.id+'_'+rec.meshes.length;mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);mesh.bind(source.skeleton,source.bindMatrix);source.parent.add(mesh);mesh.visible=false;mesh.frustumCulled=false;rec.meshes.push(mesh);return mesh;}
  function* surface(g,m,source=body,rigid=null){
   const si=[],sw=[],ts=source===body?tris:trisOf(source),p=g.attributes.position;let rigidIndex=-1;if(rigid)rigidIndex=source.skeleton.bones.findIndex(b=>b.name===bone(rigid).name);
   for(let i=0;i<p.count;i++){if(i%(rigid?2048:8)===0)yield;if(rigid){if(rigidIndex<0)throw Error('Missing '+rigid);si.push(rigidIndex,0,0,0);sw.push(1,0,0,0);continue;}
    const v=V().fromBufferAttribute(p,i);let best;for(const t of ts){const q=t.t.closestPointToPoint(v,V()),d=q.distanceToSquared(v);if(!best||d<best.d)best={...t,q,d};}
    const bary=best.t.getBarycoord(best.q,V()),w=new Map();best.ids.forEach((id,k)=>{for(let j=0;j<4;j++){const b=source.geometry.attributes.skinIndex.getComponent(id,j),x=source.geometry.attributes.skinWeight.getComponent(id,j)*bary.getComponent(k);w.set(b,(w.get(b)||0)+x);}});
    const list=[...w].sort((a,b)=>b[1]-a[1]).slice(0,4),sum=list.reduce((s,x)=>s+x[1],0);for(let j=0;j<4;j++){si.push(list[j]?.[0]||0);sw.push((list[j]?.[1]||0)/sum);}
   }g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));return register(g,m,source);
  }
  function shell(test,m,offset=.009){const g=body.geometry.clone(),p=g.attributes.position,n=g.attributes.normal,ids=[];for(const t of tris)if(t.ids.every(id=>test(V().fromBufferAttribute(p,id))))ids.push(...t.ids);g.setIndex(ids);g.clearGroups();for(const id of new Set(ids)){const v=V().fromBufferAttribute(p,id).addScaledVector(V().fromBufferAttribute(n,id),offset);p.setXYZ(id,v.x,v.y,v.z);}return register(g,m);}
  function radial(y,a,region=tris){const c=Math.cos(a),s=Math.sin(a),o=V().set(c*.4,y,hip.z+s*.4),ray=new T.Ray(o,V().set(-c,0,-s));let hit;for(const t of region){const q=ray.intersectTriangle(t.t.a,t.t.b,t.t.c,false,V());if(q&&(!hit||q.distanceToSquared(o)<hit.distanceToSquared(o)))hit=q;}return hit?Math.max(.02,hit.x*c+(hit.z-hip.z)*s):.075;}
  function* grid(rows,cols,point,m,source=body){const a=[],ix=[];for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++){if(k%8===0)yield;a.push(...point(j/rows,k/cols).toArray());}for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const i=j*(cols+1)+k;ix.push(i,i+1,i+cols+1,i+1,i+cols+2,i+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));g.setIndex(ix);return yield* surface(g,m,source);}
  function* puff(center,radii,m,rigid=null,seed=0){const g=new T.SphereGeometry(1,16,10),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),f=1+.18*Math.sin(x*31+y*17+seed)*Math.cos(z*29-y*13);p.setXYZ(i,center.x+x*radii.x*f,center.y+y*radii.y*f,center.z+z*radii.z*f);}return yield* surface(g,m,body,rigid);}
  function* cuff(side,joint,radius,m){const c=pos(side+joint),axis=pos(side+'Hand').sub(pos(side+'LowerArm')).normalize(),q=new T.Quaternion().setFromUnitVectors(V().set(0,1,0),axis);
   for(let i=0;i<18;i++){const a=i/18*Math.PI*2,d=V().set(Math.cos(a)*radius,0,Math.sin(a)*radius).applyQuaternion(q);yield* puff(c.clone().add(d),V().set(.009,.012,.009),m,null,i);}
  }
  function* fiberRing(point,count,length,m,rigid,seed=0){const a=[],ix=[];for(let i=0;i<count;i++){if(i%32===0)yield;const angle=i/count*Math.PI*2,c=point(angle),out=V().set(Math.cos(angle),0,Math.sin(angle)),tan=V().set(-Math.sin(angle),0,Math.cos(angle)),len=length*(.65+.35*Math.sin(i*2.71+seed)**2),w=.0005+.0003*Math.sin(i*1.7)**2,n=a.length/3;for(let j=0;j<=3;j++){const t=j/3,v=c.clone().addScaledVector(out,len*.55*Math.sin(t*Math.PI*.7)).addScaledVector(tan,.004*Math.sin(i*2.3)*t*t);v.y-=len*t*t;for(const sign of [-1,1])a.push(...v.clone().addScaledVector(tan,sign*w*(1-.85*t)).toArray());if(j<3){const k=n+j*2;ix.push(k,k+1,k+2,k+1,k+3,k+2);}}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(a,3));g.setIndex(ix);yield* surface(g,m,body,rigid);}
  if(slot==='top'&&set===1){
   // Exported blouse masks upper skin: restore connected shoulder/arm geometry.
   shell(v=>v.y>hip.y-.015&&v.y<neck.y-.004,skin,.0014);
   const hem=hip.y+.09,high=neck.y-.105;
   yield* grid(14,64,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(hem,high,u),r=radial(y,a,torso)+.007;return V().set(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);},white);
   for(let layer=0;layer<3;layer++){const flounceLength=.040,start=high-layer*(high-hem-flounceLength)/2;
    yield* grid(6,64,(u,v)=>{const a=v*Math.PI*2,y=start-u*flounceLength+.003*Math.cos(a*20)*u,r=radial(y,a,torso)+.010+u*(.018+.006*Math.sin(a*20));return V().set(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);},white);
   }
   // Broad fitted halter panels meet the neck and leave a modest V front.
   function frontZ(x,y){const ray=new T.Ray(V().set(x,y,.4),V().set(0,0,-1));let z=-Infinity;for(const t of torso){const q=ray.intersectTriangle(t.t.a,t.t.b,t.t.c,false,V());if(q)z=Math.max(z,q.z);}return Number.isFinite(z)?z+.007:hip.z+.035;}
   for(const sign of [-1,1])yield* grid(18,10,(u,v)=>{const y=T.MathUtils.lerp(high-.009,neck.y-.008,u),inner=.022*u,outer=T.MathUtils.lerp(.076,.035,u),x=sign*T.MathUtils.lerp(inner,outer,v);return V().set(x,y,frontZ(x,y));},white);
   yield* grid(4,48,(u,v)=>{const y=neck.y-.022+u*.018,a=Math.PI+v*Math.PI,r=radial(y,a,torso)+.006;return V().set(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);},white);
   for(const side of ['left','right']){
    const wrist=pos(side+'Hand'),elbow=pos(side+'LowerArm'),axis=wrist.clone().sub(elbow).normalize();
    shell(v=>{const d=v.clone().sub(wrist),t=d.dot(axis);return t>-.027&&t<.065&&d.addScaledVector(axis,-t).length()<.065;},white,.004);
    const q=new T.Quaternion().setFromUnitVectors(V().set(0,1,0),axis);
    for(let row=0;row<3;row++)for(let j=0;j<28;j++){const a=j/28*Math.PI*2,offset=V().set(Math.cos(a)*.032,(row-1)*.018+.009*Math.sin(j*2.1+row),Math.sin(a)*.032).applyQuaternion(q);yield* puff(wrist.clone().add(offset),V().set(.012,.020,.012),white,side+'Hand',row*28+j);}
   }
  }
  if(slot==='top'&&set!==1){
   shell(v=>v.y>hip.y-.015&&v.y<neck.y+.040,skin,.0014);
   const high=neck.y-(set===2?.065:.075),hem=hip.y+(set===3?.075:.125);
   yield* grid(16,64,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(hem,high,u),r=radial(y,a,torso)+.009;return V().set(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);},pink);
   for(let row=0;row<(set===2?4:2);row++)yield* fiberRing(a=>{const r=radial(high,a,torso)+.012;return V().set(Math.cos(a)*r,high+.006-row*.005,hip.z+Math.sin(a)*r);},420,set===2?.040:.020,furPink,'chest',row);
   if(set===2){
    for(const [side,sign]of [['left',1],['right',-1]]){const c=V().set(sign*(radial(high,0,torso)+.012),high+.007,hip.z+.025);yield* puff(c,V().set(.025,.023,.025),furPink,side+'Shoulder');for(let row=0;row<6;row++)yield* fiberRing(a=>c.clone().add(V().set(Math.cos(a)*(.023+row*.001),.012-row*.006,Math.sin(a)*.026)),280,.065,furPink,side+'Shoulder',row);}
    for(const sign of [-1,1])for(let j=0;j<5;j++){const y=T.MathUtils.lerp(hem+.020,high-.020,j/4),z=hip.z+radial(y,Math.PI/2,torso)+.013;const g=new T.CylinderGeometry(.0015,.0015,.024,5);g.rotateZ(sign*.95);g.translate(sign*.010,y,z);yield* surface(g,white);}

   }else {const laceMat=toon('#f8dce7');for(const sign of [-1,1]){const a=sign>0?Math.PI*.23:Math.PI*.77,tangent=V().set(-Math.sin(a),0,Math.cos(a));for(let j=0;j<6;j++){const y=T.MathUtils.lerp(high-.007,hem+.009,j/5),r=radial(y,a,torso)+.014,c=V().set(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);for(const cross of [-1,1]){const from=c.clone().addScaledVector(tangent,-.010).add(V().set(0,-cross*.007,0)),to=c.clone().addScaledVector(tangent,.010).add(V().set(0,cross*.007,0)),g=new T.CylinderGeometry(.0018,.0018,from.distanceTo(to),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V().set(0,1,0),to.clone().sub(from).normalize()));g.translate(...from.clone().add(to).multiplyScalar(.5).toArray());yield* surface(g,laceMat);}}}}
   if(set===3)for(const side of ['left','right']){
    const wrist=pos(side+'Hand'),axis=wrist.clone().sub(pos(side+'LowerArm')).normalize();
    shell(v=>{const d=v.clone().sub(wrist),t=d.dot(axis);return t>-.10&&t<.065&&d.addScaledVector(axis,-t).length()<.065;},white,.004);
   }
  }
  if(slot==='bottom'){
   for(const m of donor.parts.lower)if(/cream_undershorts/.test(m.name))m.userData.excludeHatMua=true;
   shell(v=>v.y>hip.y-(set===2?.090:set===1?.105:.090)&&v.y<hip.y+(set===1?.050:set===2?.085:.11),set===2?white:pink,set===3?.004:.012);
   const lining=toon(set===2?'#ffffff':set===1?'#f3bfd3':'#f3bfd3');lining.polygonOffset=true;lining.polygonOffsetFactor=-2;lining.polygonOffsetUnits=-2;
   shell(v=>v.y>hip.y-(set===2?.095:set===1?.108:.095)&&v.y<hip.y+(set===1?.050:set===2?.085:.115),lining,0);
   const skirtSource=donor.parts.bottom[0],waist=hip.y+(set===2?.095:.060);
   if(set===1){
   // A skort: the opaque continuous donor shorts above supply two leg openings.
   // These short open flounces decorate the hips; there is no tubular skirt base.
   for(let layer=0;layer<2;layer++){const top=waist-layer*.050,end=layer===0?hip.y-.025:hip.y-.115;
    yield* grid(12,96,(u,v)=>{const a=v*Math.PI*2,q=u,wave=Math.sin(a*24+layer*.7)+.25*Math.sin(a*37+layer),y=T.MathUtils.lerp(top,end,u)+.003*wave*u*u*u;
     const attach=layer===0?radial(waist,a)+.008:radial(hip.y-.025,a)+.006;
     const r=attach+(layer===0?.026:.025)*q+.0045*wave*q;
     return V().set(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);},pink,skirtSource);
   }
   }else if(set===2){
    yield* grid(14,96,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(waist,hip.y-.110,u),base=T.MathUtils.lerp(radial(waist,a)+.018,radial(hip.y-.025,a)+.026,T.MathUtils.smoothstep(u,0,.7)),fold=.009*Math.cos(a*16)*T.MathUtils.smoothstep(u,.12,.5);const r=base+.015*u+fold;return V().set(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);},white,skirtSource);
    yield* grid(2,64,(u,v)=>{const a=v*Math.PI*2,y=waist-.018*u,r=radial(y,a)+.014;return V().set(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);},white);
    const g=new T.TorusGeometry(.014,.0028,6,16);g.scale(1.25,.8,1);g.translate(0,waist-.008,hip.z+radial(waist,Math.PI/2)+.020);yield* surface(g,new T.MeshStandardMaterial({color:'#e2e7ee',metalness:.7,roughness:.3}));
   }else{
    const top=hip.y+.09,hem=hip.y-.110;
    yield* grid(18,80,(u,v)=>{const a=v*Math.PI*2,y=T.MathUtils.lerp(top,hem,u),r=T.MathUtils.lerp(radial(top,a)+.012,radial(hip.y-.025,a)+.020,T.MathUtils.smoothstep(u,0,.55))+.004*u;return V().set(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);},pink,skirtSource);
    for(let row=0;row<3;row++)yield* fiberRing(a=>{const r=radial(hip.y-.025,a)+.020;return V().set(Math.cos(a)*r,hem+.010-row*.005,hip.z+Math.sin(a)*r);},480,.028,furPink,'hips',row);
    const laceMat=toon('#f8dce7');
    for(const sign of [-1,1]){const angle=sign>0?Math.PI*.23:Math.PI*.77,tangent=V().set(-Math.sin(angle),0,Math.cos(angle));
     for(let j=0;j<7;j++){const y=hip.y+.065-j*.024,r=radial(Math.max(y,hip.y-.025),angle)+.024,c=V().set(Math.cos(angle)*r,y,hip.z+Math.sin(angle)*r);
      for(const cross of [-1,1]){const from=c.clone().addScaledVector(tangent,-.013).add(V().set(0,-cross*.009,0)),to=c.clone().addScaledVector(tangent,.013).add(V().set(0,cross*.009,0)),g=new T.CylinderGeometry(.0022,.0022,from.distanceTo(to),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V().set(0,1,0),to.clone().sub(from).normalize()));g.translate(...from.clone().add(to).multiplyScalar(.5).toArray());yield* surface(g,laceMat);}
     }
     const r=radial(hip.y-.025,angle)+.025,start=V().set(Math.cos(angle)*r,hem+.008,hip.z+Math.sin(angle)*r);
     for(const side of [-1,1]){const pp=[],ii=[];for(let j=0;j<=12;j++){const u=j/12,c=start.clone().addScaledVector(tangent,side*(.006+.008*Math.sin(u*Math.PI*2))).add(V().set(0,-.135*u,.012*Math.sin(u*Math.PI)));pp.push(c.x-.0018,c.y,c.z,c.x+.0018,c.y,c.z);if(j<12){const k=j*2;ii.push(k,k+1,k+2,k+1,k+3,k+2);}}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pp,3));g.setIndex(ii);yield* surface(g,laceMat,body,'hips');}
    }
   }
  }
  if(slot==='shoes'){
   if(set!==2)for(const source of donor.parts.shoes){const g=source.geometry.clone();g.clearGroups();register(g,white,source);}
   const knee=pos('leftLowerLeg'),foot=pos('leftFoot');
   if(set!==2)shell(v=>v.y>foot.y+.035&&v.y<knee.y-.055,white,.009);
   else shell(v=>v.y>foot.y+.012&&v.y<knee.y-.015,skin,.0014);
   for(const side of ['left','right']){
    const foot=pos(side+'Foot'),knee=pos(side+'LowerLeg'),c=foot.clone().lerp(knee,.76);
    if(set===1)for(let j=0;j<24;j++){const a=j/24*Math.PI*2;yield* puff(c.clone().add(V().set(Math.cos(a)*.044,.006*Math.sin(j*2.4),Math.sin(a)*.040)),V().set(.010+.003*Math.sin(j*1.7),.021+.006*Math.cos(j*2.1),.012),white,side+'LowerLeg',j);}
    if(set===2){
     // Rounded low platform shoes replace the donor's pointed heeled boots.
     const floorY=body.geometry.attributes.position.array.reduce((min,v,i)=>i%3===1?Math.min(min,v):min,Infinity);const upper=new T.SphereGeometry(1,24,12);upper.scale(.039,.028,.072);upper.translate(foot.x,floorY+.043,foot.z+.037);yield* surface(upper,white,body,side+'Foot');
     const outline=new T.Shape(),w=.037,d=.070,r=.029;outline.moveTo(-w,-d+r);outline.lineTo(-w,d-r);outline.quadraticCurveTo(-w,d,0,d);outline.quadraticCurveTo(w,d,w,d-r);outline.lineTo(w,-d+r);outline.quadraticCurveTo(w,-d,0,-d);outline.quadraticCurveTo(-w,-d,-w,-d+r);const sole=new T.ExtrudeGeometry(outline,{depth:.018,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.004,bevelThickness:.005,curveSegments:16});sole.rotateX(Math.PI/2);sole.translate(foot.x,floorY+.020,foot.z+.037);yield* surface(sole,white,body,side+'Foot');
     for(let j=0;j<4;j++){const lace=new T.CylinderGeometry(.0018,.0018,.043,5);lace.rotateZ(Math.PI/2);lace.translate(foot.x,floorY+.067,foot.z+.020+j*.009);yield* surface(lace,pale,body,side+'Foot');}
     const g=new T.CylinderGeometry(.034,.031,(knee.y-foot.y)*.70,40,8,true);const pp=g.attributes.position;for(let i=0;i<pp.count;i++){const yy=pp.getY(i),a=Math.atan2(pp.getZ(i),pp.getX(i)),f=1+.12*Math.cos(yy*20)+.055*Math.sin(a*7+yy*60);pp.setXYZ(i,pp.getX(i)*f,yy+.004*Math.sin(a*9),pp.getZ(i)*f);}g.translate(foot.x,foot.y+(knee.y-foot.y)*.49,foot.z);yield* surface(g,furPink,body,side+'LowerLeg');for(let row=0;row<17;row++){const c=foot.clone().lerp(knee,.17+row*.043);yield* fiberRing(a=>c.clone().add(V().set(Math.cos(a)*(.036+.004*Math.sin(row/16*Math.PI)),.006*Math.sin(a*19+row),Math.sin(a)*(.036+.004*Math.sin(row/16*Math.PI)))),200,.028,furPink,side+'LowerLeg',row);}}
    if(set!==2)for(let j=0;j<7;j++)for(const sign of [-1,1]){const g=new T.CylinderGeometry(.0018,.0018,.036,5);g.rotateZ(sign*.8);g.translate(foot.x,foot.y+.045+j*.022,foot.z+.050);yield* surface(g,pale,body,side+'LowerLeg');}
   }
  }
  if(slot==='accessory'&&set!==2){
   // Tall, brimless fur volume. Fit the central crown rather than bun tips.
   const b=new T.Box3();for(const mesh of donor.parts.hair){const p=mesh.geometry.attributes.position,ix=mesh.geometry.index;for(const id of new Set(ix.array))b.expandByPoint(V().fromBufferAttribute(p,id).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv));}
   const size=b.getSize(V()),center=b.getCenter(V());let crownTop=-Infinity;
   for(const mesh of donor.parts.hair){const p=mesh.geometry.attributes.position,ix=mesh.geometry.index;for(const id of new Set(ix.array)){const v=V().fromBufferAttribute(p,id).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);if(Math.abs(v.x-center.x)<size.x*.15)crownTop=Math.max(crownTop,v.y);}}
   const bottom=crownTop-.125,height=.140,rx=size.x*.55,rz=size.z*.57;
   const shades=['#e0a0bc','#edb1cb','#d99ab5'].map(color=>new T.MeshStandardMaterial({color,roughness:1,side:T.DoubleSide}));
   // Use visible eyebrow triangles, not the recessed humanoid eye bones.
   let browTop=-Infinity;for(const mesh of donor.meshes.filter(m=>[].concat(m.material).some(x=>/FaceBrow/.test(x.name)))){const p=mesh.geometry.attributes.position,ix=mesh.geometry.index;for(const id of new Set(ix.array)){const v=V().fromBufferAttribute(p,id).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);browTop=Math.max(browTop,v.y);}}
   const browEdge=Number.isFinite(browTop)?browTop-.004:bottom;
   function cap(u,a){const dome=T.MathUtils.clamp((u-.35)/.65,0,1),lower=1-T.MathUtils.smoothstep(u,0,.72),front=T.MathUtils.smoothstep(Math.sin(a),-.65,.45),edge=T.MathUtils.lerp(bottom,browEdge,front),r=(.94+.11*Math.sin(u*Math.PI))*Math.sqrt(Math.max(.0004,1-dome*dome)),rough=.004*Math.sin(a*7+u*9)+.002*Math.sin(a*19-u*17);return V().set(center.x+Math.cos(a)*(rx*r+rough),bottom+height*u+(edge-bottom)*lower,center.z+Math.sin(a)*(rz*r+rough));}
   const points=[],ix=[],cols=64,rows=20;for(let j=0;j<=rows;j++)for(let k=0;k<=cols;k++)points.push(...cap(j/rows,k/cols*Math.PI*2).toArray());
   for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const i=j*(cols+1)+k;ix.push(i,i+1,i+cols+1,i+1,i+cols+2,i+cols+1);}
   const base=new T.BufferGeometry();base.setAttribute('position',new T.Float32BufferAttribute(points,3));base.setIndex(ix);yield* surface(base,shades[0],body,'head');
   // Thousands of fine curved fibers, batched per shade; no pebble clumps.
   let seed=18271;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
   const strands=shades.map(()=>({p:[],ix:[]}));
   for(let i=0;i<8500;i++){
    const u=rnd()*.995,a=rnd()*Math.PI*2,c=cap(u,a),out=V().set(Math.cos(a),u>.55?1.4:0,Math.sin(a)).normalize(),tan=V().set(-Math.sin(a),0,Math.cos(a)),length=.009+rnd()*.018,width=.00055+rnd()*.00065,sway=(rnd()-.5)*.015,batch=strands[i%3],n=batch.p.length/3;
    for(let j=0;j<=4;j++){const t=j/4,v=c.clone().addScaledVector(out,length*Math.sin(t*Math.PI*.7)).addScaledVector(tan,sway*t*t);v.y-=length*.65*t*t*(u>.65?.15:1);if(Math.sin(a)>-.2)v.y=Math.max(v.y,browTop-.009);const w=width*(1-t*.9);batch.p.push(...v.clone().addScaledVector(tan,-w).toArray(),...v.clone().addScaledVector(tan,w).toArray());if(j<4){const k=n+j*2;batch.ix.push(k,k+1,k+2,k+1,k+3,k+2);}}
   }
   for(let i=0;i<3;i++){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(strands[i].p,3));g.setIndex(strands[i].ix);yield* surface(g,shades[i],body,'head');}
  }
  if(slot==='accessory'&&set===3){const n=pos('neck'),silver=new T.MeshStandardMaterial({color:'#ece9e8',metalness:.4,roughness:.4});const pts=[];for(let j=0;j<64;j++){const a=j/64*Math.PI*2,y=n.y+.008,origin=V().set(n.x+Math.cos(a)*.3,y,n.z+Math.sin(a)*.3),ray=new T.Ray(origin,V().set(-Math.cos(a),0,-Math.sin(a)));let hit=null;for(const tr of tris){const q=ray.intersectTriangle(tr.t.a,tr.t.b,tr.t.c,false,V());if(q&&(!hit||q.distanceToSquared(origin)<hit.distanceToSquared(origin)))hit=q;}pts.push((hit||V().set(n.x+Math.cos(a)*.03,y,n.z+Math.sin(a)*.03)).add(V().set(Math.cos(a)*.002,0,Math.sin(a)*.002)));}const ring=new T.TubeGeometry(new T.CatmullRomCurve3(pts,true),64,.0015,6,true);yield* surface(ring,silver,body,'neck');const g=new T.SphereGeometry(.004,8,6);g.scale(.7,1.5,.5);g.translate(n.x,n.y-.037,hip.z+radial(n.y-.037,Math.PI/2,torso)+.008);yield* surface(g,silver,body,'neck');}
  if(slot==='accessory'&&set===2){
   const n=pos('neck');for(let i=0;i<24;i++){const a=i/24*Math.PI*2;const g=new T.SphereGeometry(.0045,8,6);const y=n.y-.025,r=radial(y,a,torso)+.006;g.translate(Math.cos(a)*r,y,hip.z+Math.sin(a)*r);yield* surface(g,white,body,'neck');}
   const c=pos('head').add(V().set(-.105,.18,.065));for(const sign of [-1,1]){const g=new T.SphereGeometry(1,12,8);g.scale(.025,.013,.005);g.rotateZ(sign*.35);g.translate(c.x+sign*.020,c.y,c.z);yield* surface(g,pale,body,'head');}
  }
  const batches=new Map();for(const mesh of rec.meshes){const g=mesh.geometry;if(Object.keys(g.morphAttributes).length)continue;const key=JSON.stringify([mesh.material.uuid,mesh.skeleton.uuid,mesh.bindMatrix.elements,mesh.position.toArray(),mesh.quaternion.toArray(),mesh.scale.toArray(),Object.entries(g.attributes).map(([n,a])=>[n,a.itemSize,a.array.constructor.name]).sort(),g.index?.array.constructor.name]);if(!batches.has(key))batches.set(key,[]);batches.get(key).push(mesh);}
  for(const batch of batches.values())if(batch.length>1){const g=mergeGeometries(batch.map(m=>m.geometry),false);if(!g)throw Error('Hat Mua merge failed');batch[0].geometry.dispose();batch[0].geometry=g;for(const m of batch.slice(1)){m.removeFromParent();m.geometry.dispose();rec.meshes.splice(rec.meshes.indexOf(m),1);}}
  records.set(slot+':'+index,rec);for(const mesh of rec.meshes)parts.push({slot,variant:index,donor:opt.variant,mesh});
 }
 return{records,parts,meshesFor(slot,index){return records.get(slot+':'+index)?.meshes;},hide(){parts.forEach(p=>p.mesh.visible=false);}};
}

export function createHatMuaStyles(...args){const iterator=buildHatMuaStyles(...args);let step;do{step=iterator.next();}while(!step.done);return step.value;}
