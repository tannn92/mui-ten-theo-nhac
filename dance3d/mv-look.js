import * as T from 'three';
import {createDirector} from './mv-director.js?v=1611.2031';
import {MV_ENERGY} from './mv-energy.js?v=1611.2031';
import {STAGES} from './stages.js?v=1611.2031';
// MV look (owner 2026-11-15 "tôi muốn game trông điện ảnh hơn, như đang enjoy 1 cái mv vậy", reports/mv-look/HANDOFF.md).
// PLAY MODE ONLY: menu, shop, results and the duo room keep today's orthographic framing and look (everything here is hidden
// or neutral there: zero-intensity lights, hidden meshes, materials restored).
// - a perspective camera driven by the director (mv-director.js): a pure function of song time;
// - a set that holds up under a moving camera: the song's painted backdrop on a far wall, a floor that meets it, truss
//   towers and lamps at the sides, light beams, and dust/bokeh at several depths (parallax);
// - key / fill / rim light in the song's colours, parametric rim + warmer skin + coloured outlines on the dancers;
// - soft contact shadows under every dancer (one instanced draw);
// - one full-screen overlay quad drawn last (no render target, no extra GPU memory): vignette + colour grade as a 2x
//   multiply (dst * 2 * src) per channel;
// - close-ups: the wall swaps to a blurred copy (a cheap depth of field).
// Switches: ?cam=fixed = today's camera and look (remembered in localStorage spike-cam; ?cam=mv or ?cam= forgets); ?mv=-beams,-dust,-grade,-shadows,-rim,-set.
// Slow devices: degrade(1) drops the overlay and the dust, degrade(2) also the beams (runtime paceCheck; density last).
const WORDS=(()=>{let cam=null,mv='';try{const q=new URLSearchParams(location.search);if(q.has('cam')){cam=q.get('cam');if(cam==='fixed')localStorage.setItem('spike-cam','fixed');else localStorage.removeItem('spike-cam');}else cam=localStorage.getItem('spike-cam');mv=q.get('mv')||'';}catch(e){}
 const off=new Set(String(mv).toLowerCase().split(/[\s,]+/).filter(w=>w[0]==='-').map(w=>w.slice(1)));return {fixed:String(cam||'').toLowerCase()==='fixed'||/\bnone\b/.test(mv),off};})();
// Per-song MV palette: in each song's stage-<id>.js (export mv), so per-song polish never edits this file.
const SKIN=/skin|face|body/i,HAIR=/hair/i;
function radialTex(size,stops){const c=document.createElement('canvas');c.width=c.height=size;const g=c.getContext('2d'),r=size/2,gr=g.createRadialGradient(r,r,0,r,r,r);for(const [o,col] of stops)gr.addColorStop(o,col);g.fillStyle=gr;g.fillRect(0,0,size,size);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;}
// a cheap soft blur of the backdrop canvas: halve 4 times (box pyramid), then double back up twice (bilinear) -> 1/4 size
function blurredCopy(img){const w=img.width||img.videoWidth,h=img.height||img.videoHeight;if(!w||!h)return null;let src=img,sw=w,sh=h;
 const step=(nw,nh)=>{const c=document.createElement('canvas');c.width=Math.max(2,nw|0);c.height=Math.max(2,nh|0);const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';g.drawImage(src,0,0,sw,sh,0,0,c.width,c.height);src=c;sw=c.width;sh=c.height;};
 for(let i=0;i<5;i++)step(sw/2,sh/2);step(sw*2,sh*2);step(sw*2,sh*2);step(sw*2,sh*2);
 const t=new T.CanvasTexture(src);t.colorSpace=T.SRGBColorSpace;t.generateMipmaps=false;t.minFilter=T.LinearFilter;return t;}
export function createMvLook({scene,renderer,camera:ortho,wardrobe,crew,partner,backdrop,disc,ring,key,hemi}){
 const enabled=!WORDS.fixed,off=WORDS.off;let level=0;
 const director=createDirector(),cam=new T.PerspectiveCamera(28,1.44,.05,60);
 const root=new T.Group();root.name='mv-look';root.visible=false;scene.add(root);
 // lights: the rim (from behind) exists from the start at intensity 0 (same shader programs in menu and play)
 const rim=new T.DirectionalLight(0xffffff,0);rim.position.set(1.6,3.2,-4.5);scene.add(rim);
 const rim2=new T.DirectionalLight(0xffffff,0);rim2.position.set(-2.2,2.4,-4);scene.add(rim2);
 const keyOrig={c:key.color.clone(),i:key.intensity,p:key.position.clone()},hemiOrig={c:hemi.color.clone(),g:hemi.groundColor.clone(),i:hemi.intensity};
 // ---- the set
 const wallMat=new T.MeshBasicMaterial({vertexColors:true,color:0xffffff,toneMapped:false,depthWrite:false,fog:false}),wallBlurMat=new T.MeshBasicMaterial({vertexColors:true,color:0xffffff,transparent:true,opacity:0,toneMapped:false,depthWrite:false,fog:false});
 const WALL_Z=-4.8,WALL_W=11.5;const wallGeo=(()=>{const g=new T.PlaneGeometry(3,3,12,12),uv=g.attributes.uv,pos=g.attributes.position,col=[];for(let i=0;i<uv.count;i++){const u=uv.getX(i)*3-1,v=uv.getY(i)*3-1;uv.setXY(i,u,v);
   const out=Math.max(0,-u,u-1,v-1);const k=Math.max(.28,1-out*1.6);col.push(k,k,k);}g.setAttribute('color',new T.Float32BufferAttribute(col,3));return g;})();const wall=new T.Mesh(wallGeo,wallMat),wallBlur=new T.Mesh(wallGeo,wallBlurMat);wall.renderOrder=-10;wallBlur.renderOrder=-9;root.add(wall,wallBlur);
 const floorTex=radialTex(256,[[0,'rgba(255,255,255,1)'],[.35,'rgba(200,200,200,1)'],[1,'rgba(40,40,40,1)']]);
 const floorMat=new T.MeshStandardMaterial({color:0x2a1a2e,map:floorTex,roughness:.42,metalness:.12});const floor=new T.Mesh(new T.PlaneGeometry(40,14),floorMat);floor.rotation.x=-Math.PI/2;floor.position.set(0,-.052,WALL_Z+7);floor.renderOrder=-8;root.add(floor);
 // a soft haze strip where the floor meets the painted wall (hides the seam)
 const hazeTex=(()=>{const c=document.createElement('canvas');c.width=4;c.height=64;const g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,64);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.7,'rgba(255,255,255,.55)');gr.addColorStop(1,'rgba(255,255,255,.8)');g.fillStyle=gr;g.fillRect(0,0,4,64);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;})();
 const hazeMat=new T.MeshBasicMaterial({map:hazeTex,color:0xffd0e8,transparent:true,depthWrite:false,toneMapped:false,fog:false});const haze=new T.Mesh(new T.PlaneGeometry(WALL_W*3,1.1),hazeMat);haze.position.set(0,.25,WALL_Z+.3);haze.renderOrder=-7;root.add(haze);
 // floor lines (a stage grid that shows perspective and movement)
 {const pts=[];for(let x=-9;x<=9;x+=1.2){pts.push(x,-.05,WALL_Z,x*1.0,-.05,3.5);}for(let z=WALL_Z+.5;z<3.5;z+=1.1)pts.push(-10,-.05,z,10,-.05,z);
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pts,3));const m=new T.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.07,depthWrite:false});root.add(new T.LineSegments(g,m));}
 const glowAt=[];
 // truss towers, a top bar and lamps (merged boxes), at the sides and behind: parallax when the camera moves
 const trussMat=new T.MeshStandardMaterial({color:0x9a94a4,roughness:.38,metalness:.55}),lampMat=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false,fog:false});
 {const boxes=[],lamps=[],add=(arr,w,h,d,x,y,z)=>{const g=new T.BoxGeometry(w,h,d);g.translate(x,y,z);arr.push(g);};
  for(const s of [-1,1]){for(const [x,z] of [[3.2,-1.6],[4.4,.4],[3.7,-4.4]]){add(boxes,.16,4.6,.16,s*x,2.25,z);for(let y=.4;y<4.4;y+=.55)add(boxes,.2,.05,.2,s*x,y,z);add(lamps,.13,.13,.06,s*x,3.6,z+.12);add(lamps,.13,.13,.06,s*x,2.7,z+.12);}
   add(boxes,.7,.9,.6,s*3.6,.4,-.6);add(boxes,.6,.7,.5,s*3.6,1.2,-.6);}
  add(boxes,9.6,.14,.14,0,4.3,-1.6);add(boxes,7.6,.14,.14,0,4.1,-4.6);for(let i=0;i<7;i++){add(lamps,.18,.1,.12,-2.4+i*.8,4.18,-1.5);}glowAt.push(...[-1,1].flatMap(s=>[[3.2,-1.6],[4.4,.4],[3.7,-4.4]].flatMap(([x,z])=>[[s*x,3.6,z+.14],[s*x,2.7,z+.14]])),...Array.from({length:7},(_,i)=>[-2.4+i*.8,4.12,-1.42]));
  const merge=list=>{let n=0;for(const g of list)n+=g.attributes.position.count;const pos=new Float32Array(n*3),nor=new Float32Array(n*3),idx=[];let o=0;for(const g of list){pos.set(g.attributes.position.array,o*3);nor.set(g.attributes.normal.array,o*3);for(const i of g.index.array)idx.push(i+o);o+=g.attributes.position.count;g.dispose();}
   const m=new T.BufferGeometry();m.setAttribute('position',new T.BufferAttribute(pos,3));m.setAttribute('normal',new T.BufferAttribute(nor,3));m.setIndex(idx);return m;};
  root.add(new T.Mesh(merge(boxes),trussMat));const lampMesh=new T.Mesh(merge(lamps),lampMat);root.add(lampMesh);}
 // lamp glows: one Points draw, additive soft dots on every lamp
 const glowTex=radialTex(64,[[0,'rgba(255,255,255,1)'],[.2,'rgba(255,255,255,.6)'],[1,'rgba(255,255,255,0)']]);
 const glowGeo=new T.BufferGeometry();glowGeo.setAttribute('position',new T.Float32BufferAttribute(glowAt.flat(),3));
 const glowMat=new T.PointsMaterial({map:glowTex,color:0xffc0e0,size:.55,sizeAttenuation:true,transparent:true,opacity:.85,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:false});
 const lampGlow=new T.Points(glowGeo,glowMat);lampGlow.renderOrder=4;root.add(lampGlow);
 // light beams: open cones from the top bar, additive, a vertical fade; slow deterministic sway (song time)
 const beamTex=(()=>{const c=document.createElement('canvas');c.width=4;c.height=128;const g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,128);gr.addColorStop(0,'rgba(255,255,255,.0)');gr.addColorStop(.06,'rgba(255,255,255,.55)');gr.addColorStop(.5,'rgba(255,255,255,.16)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,4,128);const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;})();
 const beamMat=new T.MeshBasicMaterial({map:beamTex,color:0xffc8e6,transparent:true,opacity:.22,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide,toneMapped:false,fog:false});
 const beamGeo=new T.CylinderGeometry(.04,.62,5.2,20,1,true);beamGeo.translate(0,-2.6,0);
 const beams=[];for(let i=0;i<6;i++){const m=new T.Mesh(beamGeo,beamMat);m.position.set(-2.0+i*.8,4.18,-1.5);m.renderOrder=5;root.add(m);beams.push(m);}
 // dust / bokeh: points at many depths (near ones big and soft)
 const dustTex=radialTex(64,[[0,'rgba(255,255,255,1)'],[.25,'rgba(255,255,255,.55)'],[1,'rgba(255,255,255,0)']]);
 const N=150,dpos=new Float32Array(N*3),dseed=new Float32Array(N*3);{let a=12345;const r=()=>(a=(a*16807)%2147483647)/2147483647;for(let i=0;i<N;i++){dseed[i*3]=(r()-.5)*11;dseed[i*3+1]=r()*4.2;dseed[i*3+2]=-5.5+r()*8.5;}}
 const dustGeo=new T.BufferGeometry();dustGeo.setAttribute('position',new T.BufferAttribute(dpos,3));
 const dustMat=new T.PointsMaterial({map:dustTex,color:0xffe0f0,size:.07,sizeAttenuation:true,transparent:true,opacity:.55,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:false});
 const dust=new T.Points(dustGeo,dustMat);dust.frustumCulled=false;dust.renderOrder=6;root.add(dust);
 // contact shadows: one instanced soft disc per dancer (hips over the floor)
 const shTex=radialTex(128,[[0,'rgba(0,0,0,.62)'],[.5,'rgba(0,0,0,.30)'],[1,'rgba(0,0,0,0)']]);
 const MAXS=20,shMat=new T.MeshBasicMaterial({map:shTex,color:0x1a0a1a,transparent:true,depthWrite:false,toneMapped:false,fog:false});
 const shGeo=new T.PlaneGeometry(.62,.42);shGeo.rotateX(-Math.PI/2);const shadows=new T.InstancedMesh(shGeo,shMat,MAXS);shadows.count=0;shadows.frustumCulled=false;shadows.renderOrder=-1;root.add(shadows);
 // the grade + vignette overlay (clip-space quad, drawn last): dst * 2 * src per channel (0.5 = unchanged)
 const gradeMat=new T.ShaderMaterial({uniforms:{uC:{value:new T.Color(0xffffff)},uE:{value:new T.Color(0x7a4a80)},uV:{value:.55},uA:{value:1.44},uL:{value:1.06}},
  vertexShader:'varying vec2 vUv;void main(){vUv=position.xy;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader:'uniform vec3 uC,uE;uniform float uV,uA,uL;varying vec2 vUv;void main(){vec2 p=vUv*vec2(uA,1.)/1.2;float d=dot(p,p);float v=smoothstep(.25,1.15,d)*uV;vec3 g=mix(uC*uL,uE,v);float top=smoothstep(.2,1.,vUv.y)*.04;gl_FragColor=vec4(g*.5+top,1.);}',
  depthTest:false,depthWrite:false,transparent:true,blending:T.CustomBlending,blendEquation:T.AddEquation,blendSrc:T.DstColorFactor,blendDst:T.SrcColorFactor,blendSrcAlpha:T.ZeroFactor,blendDstAlpha:T.OneFactor,toneMapped:false,fog:false});
 const grade=new T.Mesh(new T.PlaneGeometry(2,2),gradeMat);grade.frustumCulled=false;grade.renderOrder=1e6;root.add(grade);
 // ---- per song
 const bgColor=new T.Color(0x140c16);let pal=STAGES.dolce.mv,wallTex=null,blurTex=null,bgSaved=undefined,active=false,discOrig=null;
 const mats=new Map();// MToon material -> original values (rim, outline, shade), restored outside play
 function tuneMaterials(){const inCrew=new Set(),shared=new Set();crew.group.traverse(o=>{for(const m of [].concat(o.material||[]))if(m)inCrew.add(m);});
  // materials the player's rigs also use (crew rigs can share the donors' materials) are restored too
  for(const c of scene.children)if(c!==crew.group&&c!==root)c.traverse(o=>{for(const m of [].concat(o.material||[]))if(m)shared.add(m);});for(const m of shared)inCrew.delete(m);
  const visit=m=>{if(!m?.isMToonMaterial||m.userData.mvTuned)return;
   if(!inCrew.has(m))mats.set(m,{rc:m.parametricRimColorFactor.clone(),rp:m.parametricRimFresnelPowerFactor,rl:m.parametricRimLiftFactor,rm:m.rimLightingMixFactor,oc:m.outlineColorFactor?.clone(),om:m.outlineLightingMixFactor,sc:m.shadeColorFactor?.clone()});
   apply(m);m.userData.mvTuned=true;};
  scene.traverse(o=>{if(o.isMesh)for(const m of [].concat(o.material||[]))visit(m);});}
 const rimC=new T.Color(),tmp=new T.Color(),skinWarm=new T.Color(0xffd6cc),plum=new T.Color(0x2a1426);
 function apply(m){if(off.has('rim'))return;const hair=HAIR.test(m.name||''),skin=SKIN.test(m.name||'');
  m.parametricRimColorFactor.copy(rimC).multiplyScalar(hair?.5:skin?.22:.34);m.parametricRimFresnelPowerFactor=hair?3.2:4;m.parametricRimLiftFactor=hair?.04:0;m.rimLightingMixFactor=.35;
  if(m.outlineColorFactor){tmp.copy(m.outlineColorFactor);if(tmp.r+tmp.g+tmp.b<.6)m.outlineColorFactor.copy(tmp.lerp(plum,.6));m.outlineLightingMixFactor=.6;}
  if(skin&&m.shadeColorFactor)m.shadeColorFactor.multiply(skinWarm);}
 function restoreMaterials(){for(const [m,o] of mats){m.parametricRimColorFactor.copy(o.rc);m.parametricRimFresnelPowerFactor=o.rp;m.parametricRimLiftFactor=o.rl;m.rimLightingMixFactor=o.rm;if(o.oc&&m.outlineColorFactor)m.outlineColorFactor.copy(o.oc);if(o.om!=null)m.outlineLightingMixFactor=o.om;if(o.sc&&m.shadeColorFactor)m.shadeColorFactor.copy(o.sc);m.userData.mvTuned=false;}mats.clear();}
 function setSong({chart,slug,crew:entry,duo,lead,centre,players}){const id=backdrop.diagnostics?.()?.id||null,stage=STAGES[id]||STAGES.dolce;pal=stage.mv;rimC.set(pal.rim);
  beamMat.color.set(pal.beam);glowMat.color.set(pal.beam);dustMat.color.set(pal.dust);{const tint=backdrop.tint?.();floorMat.color.set(pal.floor);if(tint)floorMat.color.lerp(new T.Color(tint.disc),.28);}hazeMat.color.set(pal.sky);hazeMat.opacity=.55;bgColor.set(pal.floor).multiplyScalar(.6);gradeMat.uniforms.uC.value.set(pal.gc);gradeMat.uniforms.uE.value.set(pal.ge);wallMat.color.setScalar(pal.wall*.74);wallBlurMat.color.setScalar(pal.wall*.66);gradeMat.uniforms.uE.value.lerp(new T.Color(0x2a2230),.55);
  const info=director.setSong({chart,slug,energy:MV_ENERGY[slug],crew:entry,duo,lead,centre,players,hints:stage.hints});if(blurTex){blurTex.dispose();blurTex=null;}wallTex=null;return info;}
 // shadow casters: the hips of every shown humanoid (lead, partner, crew), found again every 30 frames
 let casters=[],frameNo=0;const hv=new T.Vector3(),M=new T.Matrix4(),Q=new T.Quaternion(),S=new T.Vector3(),P=new T.Vector3();
 function findCasters(){const list=[];const shown=o=>{for(let x=o;x;x=x.parent)if(!x.visible)return false;return true;};
  const look=g=>g.traverse(o=>{if(o.isBone&&/J_Bip_C_Hips$/.test(o.name)&&shown(o))list.push(o);});look(wardrobe.master.scene);look(crew.group);scene.children.forEach(c=>{if(c!==crew.group&&c!==root&&!wardrobe.variants.some(v=>v.vrm.scene===c)&&c.isGroup)look(c);});casters=list;}
 function placeShadows(){const spots=[];for(const b of casters){b.getWorldPosition(hv);if(!Number.isFinite(hv.x))continue;if(spots.some(s=>Math.abs(s[0]-hv.x)<.08&&Math.abs(s[2]-hv.z)<.08))continue;spots.push([hv.x,hv.y,hv.z]);if(spots.length>=MAXS)break;}
  spots.forEach(([x,y,z],i)=>{const k=T.MathUtils.clamp(y/.62,.4,1.4),s=1.15-.35*Math.abs(k-1);P.set(x,-.006+i*.0004,z);S.set(s,1,s);M.compose(P,Q,S);shadows.setMatrixAt(i,M);});shadows.count=spots.length;shadows.instanceMatrix.needsUpdate=true;}
 // Crew depth under a real perspective camera. For the level orthographic camera the formations fake depth: back rows are
 // lifted in y and drawn smaller, front rings lowered (config performances: y > 0 and scale < 1 behind). Under the MV camera
 // that floats them above the floor and shrinks them twice. After crew.update (which places every root each frame) a
 // dancer standing off the floor (|y| > 5 mm) goes to y 0, and a lifted one gets its perspective shrink back:
 // scale * (D + |z|) / D (D 4.1 m, the full-shot distance), at most 1. Dancers already on the floor (the members beside
 // her, the HYLT arch pair) are untouched. userData.mvDepth marks an adjusted root so a root that crew.update skipped this
 // frame is not adjusted twice. ?mv=-depth turns it off.
 const DEPTH_D=4.1;function crewDepth(){if(off.has('depth'))return;const roots=[];for(const d of crew.dancers||[])if(d.root)roots.push(d.root);for(const a of crew.independent||[])if(a.rig?.root)roots.push(a.rig.root);
  for(const r of roots){const y=r.position.y,sc=r.scale.x,m=r.userData.mvDepth;if(m&&y===0&&sc===m.s1)continue;if(Math.abs(y)<=.005){r.userData.mvDepth=null;continue;}
   const z=r.position.z,s1=y>0&&z<0?Math.min(Math.max(sc,1),sc*(DEPTH_D-z)/DEPTH_D):sc;r.position.y=0;r.scale.setScalar(s1);r.userData.mvDepth={y0:y,s0:sc,s1:r.scale.x};}}
 function enter(){active=true;root.visible=true;bgSaved=scene.background;tuneMaterials();
  key.color.set(pal.key);key.intensity=2.0;key.position.set(-2.2,3.6,4.2);hemi.color.set(pal.sky);hemi.groundColor.set(pal.gnd);hemi.intensity=.72;rim.color.set(pal.rim);rim.intensity=off.has('rim')?0:1.4;rim2.color.set(pal.key);rim2.intensity=off.has('rim')?0:.6;
  discOrig=discOrig||{c:disc.material.color.clone()};}
 function leave(){active=false;root.visible=false;if(scene.background===bgColor)scene.background=wallTex||bgSaved||null;bgSaved=undefined;restoreMaterials();
  key.color.copy(keyOrig.c);key.intensity=keyOrig.i;key.position.copy(keyOrig.p);hemi.color.copy(hemiOrig.c);hemi.groundColor.copy(hemiOrig.g);hemi.intensity=hemiOrig.i;rim.intensity=0;rim2.intensity=0;rim.color.set(0xffffff);rim2.color.set(0xffffff);}
 // fit the wall to the painted backdrop: its horizon (~59% down the picture) sits on the floor line
 function fitWall(tex){const img=tex.image,asp=(img?.width||16)/(img?.height||10),H=WALL_W/asp;for(const m of [wall,wallBlur]){m.scale.set(WALL_W,H,1);m.position.set(0,H*(.5-.6),WALL_Z);}}
 // per frame (play): grab the painted backdrop onto the wall, set lights/beams/dust/shadows, aim the camera; returns the camera to draw with
 function frame(t,width,height){
  if(t!=null)backdrop.tick?.(t);   // u-r-man: stages with sectionAt(t) repaint their backdrop when the section colour changes
  if(!enabled||t==null){if(active)leave();return ortho;}
  if(!active)enter();
  const bg=scene.background;if(bg&&bg.isTexture&&bg!==wallTex){wallTex=bg;wallMat.map=bg;wallMat.needsUpdate=true;fitWall(bg);if(blurTex)blurTex.dispose();blurTex=blurredCopy(bg.image);wallBlurMat.map=blurTex;wallBlurMat.needsUpdate=true;}
  scene.background=bgColor;
  wall.visible=!off.has('set')&&!!wallTex;
  const aspect=width/Math.max(1,height),s=director.shot(t,aspect);
  if(s){cam.fov=s.fov;cam.aspect=aspect;cam.position.set(s.pos[0],s.pos[1],s.pos[2]);cam.lookAt(s.target[0],s.target[1],s.target[2]);cam.updateProjectionMatrix();}
  // close-up: blur the wall (eased in over the first ~0.6 s of the shot is not needed: cuts are hard)
  wallBlurMat.opacity=s?.close&&blurTex?1:0;wallBlur.visible=wallBlurMat.opacity>0;
  const b=!off.has('beams')&&level<2,dOn=!off.has('dust')&&level<1;for(let i=0;i<beams.length;i++){const m=beams[i];m.visible=b;if(b){const ph=t*.35+i*1.7;m.rotation.z=Math.sin(ph)*.32+(i-2.5)*.1;m.rotation.x=.18+Math.sin(ph*.7+i)*.12;}}
  beamMat.opacity=s?.close?.12:.2;
  dust.visible=dOn;if(dOn){for(let i=0;i<N;i++){const x=dseed[i*3],y=dseed[i*3+1],z=dseed[i*3+2];dpos[i*3]=x+Math.sin(t*.13+i)*.25;dpos[i*3+1]=((y+t*.05*(1+(i%3)*.4))%4.2);dpos[i*3+2]=z+Math.cos(t*.11+i*.7)*.2;}dustGeo.attributes.position.needsUpdate=true;}
  crewDepth();
  if(frameNo++%30===0){findCasters();tuneMaterials();}shadows.visible=!off.has('shadows');if(shadows.visible)placeShadows();
  grade.visible=!off.has('grade')&&level<1;gradeMat.uniforms.uA.value=aspect;gradeMat.uniforms.uV.value=s?.close?.78:.66;
  return cam;}
 // build-time: make everything visible once so the startup compile covers these shaders, then hide
 function warm(){root.visible=true;return ()=>{root.visible=false;};}
 return {frame,setSong,warm,director,camera:cam,get enabled(){return enabled;},get active(){return active;},degrade(n){level=Math.max(level,n);},get level(){return level;},rim,rim2,root};
}
