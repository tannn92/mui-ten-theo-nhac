import {hideNativeHuntrixTrioSafety} from './huntrix-trio-styles.js?v=0911.2348';
import {hideNativeTaiSinhSafety} from './tai-sinh-styles.js?v=0911.2348';
import {hideNativeGirlXinhSafety} from './girl-xinh-lead.js?v=0911.2348';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {VRMLoaderPlugin} from '@pixiv/three-vrm';
import {createAccessories} from './accessories.js?v=0911.2348';
import {getWardrobeOptions,wardrobeDefaults} from './wardrobe-ui.js?v=0911.2348';
import {addSkirtShorts,limitSkirtSprings} from './skirt-safety.js?v=0911.2348';
import {createLazyStyles} from './lazy-styles.js?v=0911.2348';

const physicalSlots=['hair','top','bottom','shoes'];
const vector=new T.Vector3();
const equalMatrix=(a,b)=>a.elements.every((n,i)=>Math.abs(n-b.elements[i])<1e-4);
const materialName=mesh=>[].concat(mesh.material)[0]?.name||'';

// Split body triangles, preserving all texture alpha and the MToon outline pass.
// Each region uses the skin mask exported with the selected garment, not a global mask.
function bodyPart(source,region,waist,ankle){
 const position=source.geometry.attributes.position,index=source.geometry.index;
 const indices=[];const count=index?index.count:position.count;
 for(let i=0;i<count;i+=3){
 const ids=[0,1,2].map(k=>index?index.getX(i+k):i+k);let y=0;
 for(const id of ids){vector.fromBufferAttribute(position,id).applyMatrix4(source.matrixWorld);y+=vector.y/3;}
 const area=y>waist?'upper':y<ankle?'feet':'lower';if(area===region)indices.push(...ids);
 }
 if(!indices.length)return null;
 const geometry=new T.BufferGeometry();for(const [name,attribute] of Object.entries(source.geometry.attributes))geometry.setAttribute(name,attribute);
 geometry.morphAttributes=source.geometry.morphAttributes;geometry.morphTargetsRelative=source.geometry.morphTargetsRelative;
 geometry.setIndex(indices);
 if(Array.isArray(source.material))source.material.forEach((_,i)=>geometry.addGroup(0,indices.length,i));
 const mesh=new T.SkinnedMesh(geometry,source.material);mesh.name=source.name+'__'+region;
 mesh.position.copy(source.position);mesh.quaternion.copy(source.quaternion);mesh.scale.copy(source.scale);
 mesh.bind(source.skeleton,source.bindMatrix);mesh.frustumCulled=false;
 if(source.morphTargetInfluences){mesh.morphTargetInfluences=[...source.morphTargetInfluences];mesh.morphTargetDictionary={...source.morphTargetDictionary};}
 mesh.userData.bodyRegion=region;source.parent.add(mesh);return mesh;
}

export async function loadWardrobe(scene,config,onProgress=()=>{}){
 const loader=new GLTFLoader();loader.register(parser=>new VRMLoaderPlugin(parser));
 const variants=[],options=getWardrobeOptions(config),slots=Object.keys(options),counts=Object.fromEntries(Object.entries(options).map(([slot,items])=>[slot,items.length]));
 for(const slot of slots)if(!counts[slot])throw Error('Không có lựa chọn cho '+slot);
 // Load before interaction. Equipping never fetches another avatar or recreates a rig.
 for(let i=0;i<config.variants.length;i++){
 const spec=config.variants[i];onProgress(`Đang chuẩn bị bộ đồ ${i+1}/${config.variants.length}…`);
 const g=await loader.loadAsync(spec.file),vrm=g.userData.vrm;
 if(vrm.meta.metaVersion!=='1')throw Error('Các món phải cùng chuẩn VRM 1.0');
 // Damp skirt oscillation during knee lifts; keep hair and other springs unchanged.
 for(const joint of vrm.springBoneManager?.joints||[])
  if(/Skirt/.test(joint.bone?.name||''))Object.assign(joint.settings,{dragForce:.4,gravityPower:.15,stiffness:1});
 if(spec.id==='rose')limitSkirtSprings(vrm);
 scene.add(vrm.scene);vrm.scene.updateMatrixWorld(true);
 const meshes=[];vrm.scene.traverse(o=>{if(o.isMesh){o.frustumCulled=false;meshes.push(o);}});
 // The bob export has a grey texture on its fourth strand layer.
 // Reuse the adjacent brown strand texture (same UV layout); keep the layer's
 // geometry, skinning and spring bones so the back of the hair stays covered.
 if(spec.id==='mint'){
  const materials=meshes.flatMap(m=>[].concat(m.material));
  const brown=materials.find(m=>m.name==='N00_000_Hair_00_HAIR_03 (Instance)');
  const inner=materials.find(m=>m.name==='N00_000_Hair_00_HAIR_04 (Instance)');
  if(brown&&inner){inner.map=brown.map;inner.shadeMultiplyTexture=brown.shadeMultiplyTexture;inner.needsUpdate=true;}
 }
 variants.push({spec,vrm,meshes,parts:{hair:[],top:[],bottom:[],shoes:[],face:[],upper:[],lower:[],feet:[]}});
 }
 const master=variants[0],masterBones=new Map();master.vrm.scene.traverse(o=>{if(o.isBone)masterBones.set(o.name,o);});
 const waist=master.vrm.humanoid.getRawBoneNode('hips').getWorldPosition(new T.Vector3()).y+.025;
 const footRestY=master.vrm.humanoid.getRawBoneNode('leftFoot').getWorldPosition(new T.Vector3()).y;
 const ankle=footRestY+.045;
 const audit={waist,ankle,reboundBones:0,donorHelpers:0,unknown:[],offsets:[]};
 for(const variant of variants){
 // Body, face and clothing share compatible master bones. Hairstyle-specific chains stay
 // with their donor spring-bone manager; their normalized humanoid input is synchronized.
 if(variant!==master){
 const donorHip=variant.vrm.humanoid.getRawBoneNode('hips').getWorldPosition(new T.Vector3());
 const masterHip=master.vrm.humanoid.getRawBoneNode('hips').getWorldPosition(new T.Vector3());
 const offset=donorHip.y-masterHip.y;variant.restOffset=-offset;audit.offsets.push(offset);
 const skeletons=new Map();
 for(const mesh of variant.meshes){if(!mesh.isSkinnedMesh)continue;const original=mesh.skeleton;
 if(!skeletons.has(original)){
 const bones=original.bones.map(b=>{
 const common=masterBones.get(b.name);
 const aligned=b.matrixWorld.clone();aligned.elements[13]-=offset;
 if(common&&!/Hair/i.test(b.name)&&equalMatrix(common.matrixWorld,aligned)){audit.reboundBones++;return common;}
 audit.donorHelpers++;return b;
 });
 skeletons.set(original,new T.Skeleton(bones,original.boneInverses.map(m=>m.clone())));
 }
 mesh.bind(skeletons.get(original),mesh.bindMatrix);
 }
 }
 for(const mesh of variant.meshes){
 const name=materialName(mesh);let category=null;
 if(/Face|Eye/i.test(name)||/^Face/i.test(mesh.name))category='face';
 else if(/Hair/i.test(name)||/^Hair/i.test(mesh.name))category='hair';
 else if(/Body.*SKIN/i.test(name)){
 for(const region of ['upper','lower','feet']){const sourceOffset=-(variant.restOffset||0);const part=bodyPart(mesh,region,waist+sourceOffset,ankle+sourceOffset);if(part)variant.parts[region].push(part);}
 }else{
 for(const slot of ['top','bottom','shoes'])if((variant.spec.materials[slot]||[]).some(pattern=>name.includes(pattern))){category=slot;break;}
 if(!category)audit.unknown.push({variant:variant.spec.id,mesh:mesh.name,material:name});
 }
 if(category)variant.parts[category].push(mesh);mesh.visible=false;
 }
 for(const slot of physicalSlots)if(!variant.parts[slot].length)throw Error(`Thiếu ${slot} trong ${variant.spec.id}`);
 }
 for(const variant of variants){if(variant.spec.id==='rose')addSkirtShorts(variant);else if(variant.spec.id==='street')addSkirtShorts(variant,'dolce-pants');}
 if(audit.unknown.length)throw Error('Chưa phân loại material: '+audit.unknown.map(x=>x.material).join(', '));
 const outfit=wardrobeDefaults(config),accessories=createAccessories(master.vrm,options.accessory.map(o=>o.style?{...o,id:'none'}:o)),styles=createLazyStyles(variants,options);
 styles.ensureOutfit(outfit);
 const variantFor=(slot,choice=outfit[slot])=>options[slot]?.[choice]?.variant;
 const meshesFor=(slot,choice=outfit[slot])=>slot==='face'?master.parts.face:styles.meshesFor(slot,choice)||variants[variantFor(slot,choice)]?.parts[slot]||[];
 function updateVisibility(){
 styles.hide();
 variants.forEach((variant,i)=>{
 for(const key of Object.keys(variant.parts)){
 const slot=key==='upper'?'top':key==='lower'?'bottom':key==='feet'?'shoes':key;
 const show=key==='face'?i===0:i===variantFor(slot)&&(!physicalSlots.includes(key)||!styles.meshesFor(slot,outfit[slot]));
 variant.parts[key].forEach(mesh=>mesh.visible=show&&!(mesh.userData.excludeHatMua&&options.bottom[outfit.bottom].style?.startsWith('hat-mua-'))&&!(mesh.userData.excludeHuntrix&&options.bottom[outfit.bottom].style?.startsWith('huntrix-'))&&!hideNativeGirlXinhSafety(mesh,options.bottom[outfit.bottom])&&!hideNativeTaiSinhSafety(mesh,options.bottom[outfit.bottom])&&!hideNativeHuntrixTrioSafety(mesh,options.bottom[outfit.bottom])&&(!mesh.userData.requiredBottomStyle||options.bottom[outfit.bottom].style===mesh.userData.requiredBottomStyle));
 }
 });
 for(const slot of [...physicalSlots,'accessory'])styles.meshesFor(slot,outfit[slot])?.forEach(mesh=>mesh.visible=true);
 }
 function equip(slot,index){if(!slots.includes(slot)||!Number.isInteger(index)||index<0||index>=counts[slot])throw Error('Món đồ không tồn tại');styles.ensureStyle(slot,index);outfit[slot]=index;updateVisibility();accessories.equip(outfit.accessory,outfit.hair);}
 updateVisibility();accessories.equip(outfit.accessory,outfit.hair);
 return {isStyleReady:styles.isStyleReady,isOutfitReady:styles.isOutfitReady,prewarmOutfits:styles.prewarmOutfits,setBackgroundPaused:styles.setBackgroundPaused,ensureStyle:styles.ensureStyle,ensureOutfit:styles.ensureOutfit,prepareOutfit:styles.prepareOutfit,options,counts,defaults:wardrobeDefaults(config),variantFor,meshesFor,styles,styleParts:styles.parts,accessories,accessoryParts:accessories.parts,variants,master:master.vrm,outfit,audit,footRestY,equip,slots,snapshot(){return{outfit:{...outfit},face:master.parts.face.map(m=>m.uuid),active:Object.fromEntries(slots.map(k=>[k,k==='accessory'?(styles.meshesFor(k,outfit[k])||accessories.choices[outfit.accessory].meshes).map(m=>m.uuid):meshesFor(k).map(m=>m.uuid)])),body:Object.fromEntries(['upper','lower','feet'].map(k=>[k,variants.flatMap(v=>v.parts[k].filter(m=>m.visible).map(m=>m.uuid))])),audit};}};
}
