import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Boy hairstyles for the crew (owner 2026-11-10: "tóc tai các bạn nam thì xấu" — the old boy hair was a smooth helmet with a
// blocky fringe). Short layered anime cut: the donor's fitted scalp (HairBack) as the base, a fringe of tapered pointed locks,
// neat sides above the ears, a layered nape and a few crown tufts for volume. Same construction as hair-core.js (Codex).
const styles={
 'boy-hair-1':{color:'#1f1b22',part:'side',label:'Nam · tóc đen mái lệch'},
 'boy-hair-2':{color:'#4a2f20',part:'center',label:'Nam · tóc nâu rẽ ngôi giữa'},
 'boy-hair-3':{color:'#d2b47c',part:'messy',label:'Nam · tóc vàng tẩy rối'},
 'boy-hair-4':{color:'#2a2026',part:'up',label:'Nam · tóc đen vuốt nhẹ'},
 'boy-hair-5':{color:'#3e2a22',part:'side',label:'Nam · tóc nâu đậm mái lệch'},
 'boy-hair-6':{color:'#a68d76',part:'center',label:'Nam · tóc nâu tro rẽ giữa'},
 'boy-hair-7':{color:'#8f5f3c',part:'up',label:'Nam · tóc nâu sáng vuốt'}
};
export const boyHairOptions=()=>({hair:Object.entries(styles).map(([id,s])=>({id,style:id,variant:1,crewOnly:true,label:s.label}))});
function material(hex){const c=document.createElement('canvas');c.width=512;c.height=64;const x=c.getContext('2d'),im=x.createImageData(512,64),col=new T.Color(hex);col.convertLinearToSRGB();
 for(let y=0;y<64;y++)for(let i=0;i<512;i++){const fine=Math.sin(i*.47)+.6*Math.sin(i*1.71)+.45*Math.sin(i*.115),shine=Math.pow(Math.max(0,Math.cos(i/512*Math.PI*2)),8),k=.78+.115*fine+.16*shine,j=(y*512+i)*4;im.data[j]=255*Math.min(1,col.r*k);im.data[j+1]=255*Math.min(1,col.g*k);im.data[j+2]=255*Math.min(1,col.b*k);im.data[j+3]=255;}
 x.putImageData(im,0,0);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=T.RepeatWrapping;return new T.MeshPhysicalMaterial({map,color:0xffffff,roughness:.5,metalness:0,clearcoat:.1,clearcoatRoughness:.4,side:T.DoubleSide});}
export function* buildBoyHair(variants,opts){
 const records=new Map(),parts=[],timings=[];
 for(const[index,opt]of(opts.hair||[]).entries()){
  const st=styles[opt.style];if(!st)continue;
  const v=variants[opt.variant],body=v.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),sk=body.skeleton,start=performance.now(),head=sk.bones.findIndex(b=>b.name===v.vrm.humanoid.getRawBoneNode('head').name),geos=[];
  let seed=index*97+13;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  function add(g){const p=g.attributes.position,si=[],sw=[];for(let i=0;i<p.count;i++){si.push(head,0,0,0);sw.push(1,0,0,0);}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));geos.push(g);}
  function grid(rows,cols,fn){const p=[],uv=[],ix=[];for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){p.push(...fn(j/rows,i/cols));uv.push(i/cols,j/rows);}for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i;ix.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();add(g);}
  // a tapered lock: wide flat root blending into the scalp, pointed tip
  function lock(points,w,d,taper=.06){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));grid(18,10,(u,q)=>{const p=curve.getPoint(u),t=curve.getTangent(u),a=new T.Vector3().crossVectors(t,new T.Vector3(0,0,1)).normalize();if(a.lengthSq()<.1)a.set(1,0,0);const b=new T.Vector3().crossVectors(a,t).normalize(),k=(.55+.45*Math.sin(Math.min(1,u/.15)*Math.PI/2))*(1-(1-taper)*Math.pow(u,2.2));return p.addScaledVector(a,Math.cos(q*Math.PI*2)*w*k).addScaledVector(b,Math.sin(q*Math.PI*2)*d*k).toArray();});}
  // base: the donor's fitted closed scalp, lifted 3 mm so the locks root into it
  const src=v.parts.hair.find(m=>/HairBack/.test([].concat(m.material)[0]?.name));
  if(src){const scalp=src.geometry.clone();scalp.clearGroups();scalp.computeVertexNormals();const sp=scalp.attributes.position,sn=scalp.attributes.normal,suv=[];for(let i=0;i<sp.count;i++){sp.setXYZ(i,sp.getX(i)+sn.getX(i)*.003,sp.getY(i)+sn.getY(i)*.003,sp.getZ(i)+sn.getZ(i)*.003);suv.push(.5+Math.atan2(sp.getX(i),sp.getZ(i)+.02)/(2*Math.PI),(sp.getY(i)-.95)/.29);}scalp.setAttribute('uv',new T.Float32BufferAttribute(suv,2));
   // keep it short: drop the back below the nape and the long sides
   const keep=[];const ix=scalp.index;for(let i=0;i<ix.count;i+=3){const a=ix.getX(i),b=ix.getX(i+1),c=ix.getX(i+2);if([a,b,c].every(id=>sp.getY(id)>1.035||sp.getZ(id)>.06))keep.push(a,b,c);}scalp.setIndex(keep);add(scalp);}
  // locks follow a head ellipsoid (centre/radii measured from the fitted hairlines: forehead z .145, crown y 1.29, sides x .15,
  // back z -.185). th = elevation, ph = azimuth (0 = front). lift > 1 sits the lock that far outside the skull.
  const C=[0,1.135,-.02],R=[.150,.155,.165],D2R=Math.PI/180;
  const at=(th,ph,lift)=>[C[0]+R[0]*Math.cos(th*D2R)*Math.sin(ph*D2R)*lift,C[1]+R[1]*Math.sin(th*D2R)*lift,C[2]+R[2]*Math.cos(th*D2R)*Math.cos(ph*D2R)*lift];
  const path=(th0,ph0,th1,ph1,l0,l1,n=5)=>Array.from({length:n},(_,i)=>{const u=i/(n-1),e=u*u*(3-2*u);return at(th0+(th1-th0)*u,ph0+(ph1-ph0)*e,l0+(l1-l0)*u);});
  const sweep=st.part==='side'?14:0,up=st.part==='up'?10:0;
  // top layer from the crown whorl, lying on the skull (covers the crown with lock texture, no knot)
  for(let k=0;k<14;k++){const ph=-180+k*360/14+7;lock(path(86,ph,48,ph+(st.part==='messy'?(rnd()-.5)*30:8),1.10,1.07),.020,.007,.10);}
  // fringe: 11 pointed locks from the front hairline over the forehead
  for(let k=0;k<11;k++){const ph=(k-5)*8.5,c=st.part==='center'?Math.sign(ph||1)*Math.min(12,Math.abs(ph)*.5):sweep,len=st.part==='messy'?(rnd()-.5)*10:(k%2?-3:3);
   lock(path(66,ph*.6,-4+len+up,ph+c,1.09,1.045),.0145,.0055,.05);}
  // sides: neat, ending above the ears
  for(const s of[-1,1])for(let k=0;k<5;k++){const ph=s*(52+k*11);lock(path(58,ph,-2-(k%2)*4,ph+s*4,1.085,1.04),.016,.006,.06);}
  // back: layered locks down to the nape
  for(let k=0;k<9;k++){const ph=180-64+k*16;lock(path(68,ph,-30-(k%2)*6,ph,1.085,1.035),.019,.007,.07);}
  const geo=mergeGeometries(geos,false);for(const g of geos)g.dispose();geo.computeBoundingSphere();
  const mesh=new T.SkinnedMesh(geo,material(st.color));mesh.name=opt.id+'_boy';mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(sk,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;body.parent.add(mesh);
  const rec={id:opt.id,index,slot:'hair',meshes:[mesh],buildMs:performance.now()-start};records.set('hair:'+index,rec);parts.push({slot:'hair',variant:index,donor:opt.variant,mesh});timings.push({id:opt.id,index,milliseconds:rec.buildMs,meshes:1});yield;
 }
 return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){for(const p of parts)p.mesh.visible=false;}};
}
