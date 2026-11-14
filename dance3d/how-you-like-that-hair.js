import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const V=()=>new T.Vector3();
const fringeCache=new WeakMap(),goldMaps=new WeakMap(),darkMaps=new WeakMap();
const palettes={821:{rgb:[24,20,26],base:'#18141a',sheen:'#8d7aa8',shade:'#6c6276'},822:{rgb:[238,112,170],base:'#ee70aa',sheen:'#ffb2d4',shade:'#c97a9f'},823:{rgb:[196,186,214],base:'#c4bad6',sheen:'#ebe4f6',shade:'#a9a0bb'},824:{rgb:[22,20,24],base:'#161418',sheen:'#2e2a34',shade:'#68606b'},811:{rgb:[66,44,36],base:'#422c24',sheen:'#6e4a3a',shade:'#7f6c66'},812:{rgb:[222,168,132],base:'#dea884',sheen:'#f2c9a8',shade:'#c7a592'},813:{rgb:[196,192,200],base:'#c4c0c8',sheen:'#e8e6ec',shade:'#aaa6b2'},814:{rgb:[70,24,28],base:'#46181c',sheen:'#7a2e34',shade:'#7c6266'},801:{rgb:[118,80,56],base:'#765038',sheen:'#a77c5a',shade:'#9a8172'},802:{rgb:[22,20,24],base:'#161418',sheen:'#2c2832',shade:'#68606b'},803:{rgb:[124,26,40],base:'#7c1a28',sheen:'#b23a4a',shade:'#9c6670'},804:{rgb:[104,70,50],base:'#684632',sheen:'#957055',shade:'#94796a'},500:{rgb:[146,45,68],base:'#922d44',sheen:'#c45168',shade:'#a36b76'},600:{rgb:[26,24,27],base:'#1a181b',sheen:'#302c34',shade:'#6b636e'},11:{rgb:[220,208,177],base:'#d6c9a9',sheen:'#f3e9d1',shade:'#c5bda9'},1:{rgb:[204,174,121],base:'#c8ac79',sheen:'#e6d4ad',shade:'#baab8d'},4:{rgb:[158,134,199],base:'#a18ac7',sheen:'#d0c2eb',shade:'#a69ac2'},105:{rgb:[183,166,214],base:'#baa9d5',sheen:'#e0d5f1',shade:'#b6aacb'},202:{rgb:[158,120,78],base:'#9d713f',sheen:'#ba8a50',shade:'#c0b6ab'},203:{rgb:[173,163,151],base:'#a99d8d',sheen:'#c0b5a4',shade:'#c0b6ab'}};
function paletteMap(old,id){if(!old)return old;if(goldMaps.has(old)&&goldMaps.get(old).has(id))return goldMaps.get(old).get(id);const img=old.image,c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const data=ctx.getImageData(0,0,c.width,c.height),a=data.data,rgb=palettes[id].rgb;for(let i=0;i<a.length;i+=4){const l=(.2126*a[i]+.7152*a[i+1]+.0722*a[i+2])/255,k=.48+Math.sqrt(l);a[i]=Math.min(255,rgb[0]*k);a[i+1]=Math.min(255,rgb[1]*k);a[i+2]=Math.min(255,rgb[2]*k);}ctx.putImageData(data,0,0);const t=old.clone();t.source=new T.Source(c);t.needsUpdate=true;if(!goldMaps.has(old))goldMaps.set(old,new Map());goldMaps.get(old).set(id,t);return t;}
function darkMap(old){if(!old)return old;if(darkMaps.has(old))return darkMaps.get(old);const c=document.createElement('canvas'),img=old.image;c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);const d=x.getImageData(0,0,c.width,c.height);for(let i=0;i<d.data.length;i+=4){const l=(d.data[i]+d.data[i+1]+d.data[i+2])/765,k=.48+Math.sqrt(l);d.data[i]=38*k;d.data[i+1]=31*k;d.data[i+2]=38*k;}x.putImageData(d,0,0);const t=old.clone();t.source=new T.Source(c);t.needsUpdate=true;darkMaps.set(old,t);return t;}
function tintNative(m,id){m.color.set('#ffffff');if(m.shadeColorFactor)m.shadeColorFactor.set(palettes[id]?.shade||'#847d87');m.map=palettes[id]?paletteMap(m.map,id):darkMap(m.map);m.shadeMultiplyTexture=palettes[id]?paletteMap(m.shadeMultiplyTexture,id):darkMap(m.shadeMultiplyTexture);return m;}
function cropLower(g,id){if(![4,8,105,106,201,202,203,204].includes(id))return g;const p=g.attributes.position;for(let i=0;i<p.count;i++){let x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(id>=201){if(y<1.17)y=1.17+(y-1.17)*.48;x*=1.01;z=-.02+(z+.02)*1.01;if(z>.01)y=Math.max(y,1.116);p.setXYZ(i,x,y,z);}else if(y<1.075)p.setY(i,1.075+(y-1.075)*(id===106?.65:.20));}g.computeVertexNormals();return g;}

function fitCrown(g,head){const p=g.attributes.position,si=g.attributes.skinIndex,sw=g.attributes.skinWeight;for(let i=0;i<p.count;i++){const y=p.getY(i);if(y>1.15)p.setY(i,1.15+(y-1.15)*.65);si.setXYZW(i,head,0,0,0);sw.setXYZW(i,1,0,0,0);}g.computeVertexNormals();return g;}


function fringeGeometry(source){if(fringeCache.has(source))return fringeCache.get(source);const g=source.geometry,p=g.attributes.position,ix=g.index,parent=Array.from({length:p.count},(_,i)=>i),find=x=>{while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;};for(let i=0;i<ix.count;i+=3){const a=ix.getX(i);parent[find(ix.getX(i+1))]=find(a);parent[find(ix.getX(i+2))]=find(a);}const bounds=new Map();for(const id of new Set(ix.array)){const root=find(id);let b=bounds.get(root);if(!b)bounds.set(root,b={minZ:Infinity,maxZ:-Infinity,maxX:0,minY:Infinity});b.minZ=Math.min(b.minZ,p.getZ(id));b.maxZ=Math.max(b.maxZ,p.getZ(id));b.maxX=Math.max(b.maxX,Math.abs(p.getX(id)));b.minY=Math.min(b.minY,p.getY(id));}const keep=new Set([...bounds].filter(([,b])=>b.minZ>.0&&b.maxZ>.065&&b.maxX<.151&&b.minY>.95).map(([id])=>id)),ids=[];for(let i=0;i<ix.count;i+=3)if(keep.has(find(ix.getX(i))))ids.push(ix.getX(i),ix.getX(i+1),ix.getX(i+2));const out=g.clone();out.clearGroups();out.setIndex(ids);fringeCache.set(source,out);return out;}
// How You Like That crew hair (the four BLACKPINK looks of the MV's final-chorus dance in the blue tunnel and the pink blossom
// hall, MV 2:26-2:57, plain crew faces): m1 near-black chin-length bob with a lavender sheen (Jennie), m2 long bright pink hair
// (Lisa), m3 long lavender-silver waves (Rosé), m4 long black straight hair (Jisoo). Same construction as kill-this-love-hair.js
// (donor scalp + fringe recoloured, strand locks); only the ids, shapes and palettes differ.
export const hyltHairSpecs=[{id:'m1',name:'How You Like That · tóc đen ngang vai, mái thưa'},{id:'m2',name:'How You Like That · tóc hồng dài thẳng, mái bằng'},{id:'m3',name:'How You Like That · tóc bạch kim ánh tím dài, rẽ ngôi giữa'},{id:'m4',name:'How You Like That · tóc đen dài thẳng, buộc nửa đầu'}];
export function hyltHairOptions(){return{hair:hyltHairSpecs.map(s=>({id:`how-you-like-that-hair-${s.id}`,style:`how-you-like-that-hair-${s.id}`,variant:1,crewOnly:true,label:s.name}))};}
export function* buildHyltHair(variants,options){
 const records=new Map(),parts=[],timings=[];
 for(const[index,opt]of(options.hair||[]).entries()){
  if(!opt.style?.startsWith('how-you-like-that-hair-'))continue;
  const tag=opt.style.split('-').at(-1),id=({m1:3,m2:111,m3:1,m4:11})[tag],paletteId=({m1:821,m2:822,m3:823,m4:824})[tag],donor=variants[opt.variant],source=donor.parts.hair.find(m=>/HairBack/.test([].concat(m.material)[0]?.name))||donor.parts.hair[0],body=donor.meshes.find(m=>[].concat(m.material).some(x=>/Body.*SKIN/.test(x.name))),start=performance.now(),skeleton=body.skeleton;
  const indexOf=name=>{const n=donor.vrm.humanoid.getRawBoneNode(name);const i=skeleton.bones.findIndex(b=>b.name===n.name);if(i<0)throw Error('Crew hair missing bone '+name);return i;},head=indexOf('head'),chest=indexOf('upperChest');
  const dark=palettes[paletteId]?.base||'#241c24',light=palettes[paletteId]?.sheen||'#30252f',mat=new T.MeshStandardMaterial({color:dark,roughness:.42,metalness:0,side:T.DoubleSide}),shine=new T.MeshToonMaterial({color:light,side:T.DoubleSide});
  const rec={id:opt.id,index,slot:'hair',meshes:[]},batches=new Map([[mat,[]],[shine,[]]]);
  // Existing closed scalp contains no native buns or braids. Keep UVs/weights.
  const scalp=cropLower(source.geometry.clone(),id);scalp.clearGroups();const scalpMat=tintNative([].concat(source.material)[0].clone(),paletteId);
  const cap=new T.SkinnedMesh(scalp,id>=201||palettes[paletteId]?new T.MeshStandardMaterial({color:dark,roughness:.65,side:T.DoubleSide}):scalpMat);cap.name=opt.id+'_scalp';cap.position.copy(source.position);cap.quaternion.copy(source.quaternion);cap.scale.copy(source.scale);cap.bind(source.skeleton,source.bindMatrix);cap.visible=false;cap.frustumCulled=false;source.parent.add(cap);rec.meshes.push(cap);
  const fringeSource=donor.parts.hair.find(m=>m!==source);if(fringeSource&&id<201){const g=fitCrown(cropLower(fringeGeometry(fringeSource).clone(),id),head),m=tintNative([].concat(fringeSource.material)[0].clone(),paletteId);const f=new T.SkinnedMesh(g,m);f.name=opt.id+'_native-fringe';f.position.copy(body.position);f.quaternion.copy(body.quaternion);f.scale.copy(body.scale);f.bind(skeleton,body.bindMatrix);f.visible=false;f.frustumCulled=false;fringeSource.parent.add(f);rec.meshes.push(f);
   const bg=cropLower(g.clone(),id),p=bg.attributes.position,si=bg.attributes.skinIndex,sw=bg.attributes.skinWeight;for(let i=0;i<p.count;i++){p.setXYZ(i,-p.getX(i),p.getY(i),-.04-p.getZ(i));si.setXYZW(i,head,0,0,0);sw.setXYZW(i,1,0,0,0);}bg.computeVertexNormals();const b=new T.SkinnedMesh(bg,m);b.name=opt.id+'_combed-back';b.position.copy(body.position);b.quaternion.copy(body.quaternion);b.scale.copy(body.scale);b.bind(skeleton,body.bindMatrix);b.visible=false;b.frustumCulled=false;body.parent.add(b);rec.meshes.push(b);}

  function geometry(g,material=mat,rigid=false){const p=g.attributes.position,si=[],sw=[];for(let i=0;i<p.count;i++){const lower=rigid?0:T.MathUtils.smoothstep(1.035-p.getY(i),0,.28)*.38;si.push(head,chest,0,0);sw.push(1-lower,lower,0,0);}g.setAttribute('skinIndex',new T.Uint16BufferAttribute(si,4));g.setAttribute('skinWeight',new T.Float32BufferAttribute(sw,4));g.deleteAttribute('uv');batches.get(material).push(g);}
  function lock(points,width=.019,depth=.009,wave=0,phase=0,rigid=false){
   const curve=new T.CatmullRomCurve3(points.map(a=>new T.Vector3(...a))),p=[],ix=[],rows=28,cols=8;
   for(let j=0;j<=rows;j++){const u=j/rows,c=curve.getPoint(u),t=curve.getTangent(u).normalize(),across=V().crossVectors(t,V().set(0,0,1)).normalize();if(across.lengthSq()<.1)across.set(1,0,0);const out=V().crossVectors(across,t).normalize(),taper=.035+.965*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.38);c.addScaledVector(across,wave*Math.sin(u*Math.PI*3+phase)*Math.sin(u*Math.PI));for(let k=0;k<=cols;k++){const a=k/cols*Math.PI*2,v=c.clone().addScaledVector(across,Math.cos(a)*width*taper).addScaledVector(out,Math.sin(a)*depth*taper);p.push(...v.toArray());}}
   for(let j=0;j<rows;j++)for(let k=0;k<cols;k++){const a=j*(cols+1)+k;ix.push(a,a+1,a+cols+1,a+1,a+cols+2,a+cols+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();geometry(g,mat,rigid);
   // Thin strand highlight follows the actual top surface, never across the face.
   const hp=[],hi=[];for(let j=0;j<=rows;j++){const u=j/rows,c=curve.getPoint(u),t=curve.getTangent(u).normalize(),across=V().crossVectors(t,V().set(0,0,1)).normalize(),taper=.035+.965*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.38);c.addScaledVector(across,wave*Math.sin(u*Math.PI*3+phase)*Math.sin(u*Math.PI));c.z+=depth*taper+.0003;hp.push(c.x-.0015*taper,c.y,c.z,c.x+.0015*taper,c.y,c.z);}for(let j=0;j<rows;j++){const a=j*2;hi.push(a,a+1,a+2,a+1,a+3,a+2);}const hg=new T.BufferGeometry();hg.setAttribute('position',new T.Float32BufferAttribute(hp,3));hg.setIndex(hi);hg.computeVertexNormals();geometry(hg,shine,rigid);
  }
  function sweep(side,part=.0){}
  function back(length=.73,wave=0){for(let j=0;j<15;j++){const a=Math.PI*.12+j/14*Math.PI*.76,x=Math.cos(a)*.113,z=-Math.sin(a)*.135-.015;lock([[x*.70,1.21,z*.70],[x,1.10,z],[x*1.12,.94,z*1.03],[x*(1.1+.10*Math.sin(j)),length+.018*Math.sin(j*2),z+.016*Math.sin(j)]],id===1?.020:.024,.010,wave,j);}}
  function frontLong(side,length,wave=0,count=3){for(let j=0;j<count;j++){const s=side;lock([[s*(.103+j*.009),1.18,.072],[s*(.135+j*.008),1.075,.068],[s*(.14+j*.013),.92,.055],[s*(.15+j*.015),length+.015*j,.075]],id===1?.015:.018,.008,wave,j);}}
  // Shapes from the owner's photo (the four members in the HYLT hanbok stage looks, 2026-11-14):
  // side/back curtain: locks round the head from the temple (a=0 at the side) to the back; the side locks fall in front of
  // the shoulder (front=true) or just behind it, so the hair reads as one curtain, never as two separate tails
  function curtain(len,{wave=0,front=true,n=17,w=.022,lift=0,bob=false}={}){
   for(let j=0;j<n;j++){const a=-.30+j/(n-1)*(Math.PI+.60),c=Math.cos(a),s=Math.sin(a),side=c>=0?1:-1,back=s>.42||Math.abs(c)<.80,ph=j*1.7;
    const top=[c*.058,1.226,-s*.066-.010],mid=[c*.121,1.120,-s*.132-.012],ear=[c*.128,1.030,-s*.140-.016];
    let low,end;
    if(bob){low=[c*.126,.975,-s*.132-.010];end=[c*.112,len+.010*Math.sin(ph),-s*.118-.004];}
    else if(back||!front){low=[c*.132,.950,-s*.140-.030];end=[c*(.128+.010*Math.sin(ph)),len+.014*Math.sin(ph*1.3)+lift*Math.abs(c),-s*.150-.034];}
    else{const k=Math.max(0,-s);low=[side*.142,.955,.010+k*.10];end=[side*(.140+.012*Math.sin(ph)),len+.012*Math.sin(ph*1.3),.030+k*.10];}
    lock([top,mid,ear,low,end],w,.010,wave,j);}}
  // face-framing front locks from the temple, falling in front of the shoulder and touching the curtain behind them
  function frame(len,{wave=0,n=4,x0=.098,bob=false}={}){for(const s of[-1,1])for(let j=0;j<n;j++){const t=j/(n-1);
   if(bob)lock([[s*(x0+.008*t),1.185,.074-.012*t],[s*(.128+.006*t),1.090,.062-.018*t],[s*(.134+.004*t),.990,.050-.022*t],[s*(.122+.004*t),len+.006*t,.054-.022*t]],.016,.008,wave,j);
   else lock([[s*(x0+.008*t),1.185,.074-.012*t],[s*(.128+.006*t),1.075,.066-.018*t],[s*(.138+.006*t),.950,.062-.020*t],[s*(.138+.010*t),len+.010*t,.068-.020*t]],.017,.008,wave,j);}}
  // fringe across the forehead: blunt (Lisa) or a light see-through fringe (Jennie); cut = the bottom edge height
  function fringe(cut,{n=13,w=.0165,span=.088,wisp=false}={}){for(let j=0;j<n;j++){const t=j/(n-1)*2-1,x=t*span,curve=t*t;
   const bottom=cut+(wisp?.010*Math.abs(Math.sin(j*2.3))+.010*curve:.004*curve);
   lock([[x*.30,1.230,.046],[x*.80,1.208,.110],[x*.98,1.160,.140+(-.010*curve)],[x*1.02,bottom,.148-.012*curve]],wisp?.010:w,.0045,0,j,true);}}
  if(tag==='m2'){// Lisa: long straight bright pink hair with a blunt fringe at the brows
   curtain(.70,{n:17});frame(.70,{n:4});fringe(1.090,{n:13});
  }else if(tag==='m3'){// Rosé: long straight lavender-silver hair, middle part, the front locks part of the curtain
   curtain(.72,{n:17,wave:.004});frame(.72,{n:5,x0:.080});
   for(const s of[-1,1])lock([[s*.004,1.232,.048],[s*.050,1.218,.105],[s*.090,1.175,.128],[s*.112,1.110,.110]],.020,.006,0,s,true);
  }else if(tag==='m4'){// Jisoo: long straight black hair, half-up: the top section combed back to a small knot behind the crown
   curtain(.70,{n:17,front:false});
   for(const s of[-1,1])for(let j=0;j<3;j++)lock([[s*(.090+.006*j),1.180,.078-.010*j],[s*(.128),1.120,.020-.012*j],[s*.090,1.150,-.100],[s*.020,1.165,-.140]],.013,.007,0,j,true);
   for(const s of[-1,1])lock([[s*.004,1.232,.048],[s*.050,1.218,.105],[s*.088,1.180,.122],[s*.104,1.120,.100]],.020,.006,0,s,true);
   for(let j=0;j<8;j++){const a=j/8*Math.PI*2;lock([[0,1.170,-.140],[Math.cos(a)*.020,1.170+Math.sin(a)*.016,-.160],[Math.cos(a)*.012,1.168+Math.sin(a)*.010,-.172]],.012,.008,0,j,true);}
   frame(.70,{n:3,x0:.104});
  }else if(tag==='m1'){// Jennie: black shoulder-length straight cut with a lavender sheen and a light fringe
   curtain(.915,{n:17,bob:true,w:.024});frame(.905,{n:4,bob:true});fringe(1.100,{n:8,wisp:true,span:.074});
  }
  for(const[material,geos]of batches){if(!geos.length)continue;const g=mergeGeometries(geos,false);for(const x of geos)x.dispose();g.computeBoundingSphere();const mesh=new T.SkinnedMesh(g,material);mesh.name=opt.id+(material===mat?'_locks':'_sheen');mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);mesh.scale.copy(body.scale);mesh.bind(skeleton,body.bindMatrix);mesh.visible=false;mesh.frustumCulled=false;body.parent.add(mesh);rec.meshes.push(mesh);}
  rec.buildMs=performance.now()-start;records.set('hair:'+index,rec);for(const mesh of rec.meshes)parts.push({slot:'hair',variant:index,donor:opt.variant,mesh});timings.push({id,index,milliseconds:rec.buildMs,meshes:rec.meshes.length});yield;
 }
 return{records,parts,timings,meshesFor:(s,i)=>records.get(s+':'+i)?.meshes,hide(){for(const p of parts)p.mesh.visible=false;}};
}
export function createHyltHair(...args){const it=buildHyltHair(...args);let step;do{step=it.next();}while(!step.done);return step.value;}
