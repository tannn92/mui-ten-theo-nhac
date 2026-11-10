import {createFaceIdentities} from './dancer-face-shapes.js?v=1011.1042';
import {applyHeadScale} from './head-scale.js?v=1011.1042';
export const dancerProfiles=Object.freeze([
 Object.freeze({id:'original',label:'Gương mặt gốc',headScale:.85}),
 Object.freeze({id:'rumi',label:'Rumi · cân đối',headScale:.85}),
 Object.freeze({id:'mira',label:'Mira · thon dài',headScale:.85}),
 Object.freeze({id:'zoey',label:'Zoey · tròn đáng yêu',headScale:.92})
]);
const known=id=>dancerProfiles.some(p=>p.id===id);
const fromId=id=>typeof id==='string'?/^(?:huntrix|golden|wisl)-(rumi|mira|zoey)(?:-|$)/.exec(id)?.[1]:undefined;
// Auto mapping requires a complete currently worn character set, never hair alone.
// explicitCharacter is an intentional manual override, not a remembered quickset.
export function resolveDancerProfile({explicitCharacter,selection={},options={},sets=[]}={}){
 if(known(explicitCharacter))return explicitCharacter;
 const id=(slot,value)=>typeof value==='number'?options[slot]?.[value]?.id:typeof value==='object'?value?.id:value;
 for(const set of sets){const character=fromId(set.id);if(!character)continue;
  if(['top','bottom','shoes'].every(slot=>{const actual=id(slot,selection[slot]),expected=id(slot,set.selection?.[slot]);return actual!==undefined&&expected!==undefined&&actual===expected;}))return character;
 }
 return 'original';
}
export function createDancerProfiles({faceMeshes,rigs=[],initial='original'}={}){
 const face=createFaceIdentities(faceMeshes||[]);
 if(!face.supported)return{supported:false,reason:face.reason,apply:()=>false,prepare:()=>false,dispose(){}};
 const prior=rigs.map(v=>{const h=v.humanoid.getRawBoneNode('head'),base=h?.userData.previewHeadScaleBase?.scale;return base?h.scale.x/base[0]:1;});
 let current=null;
 function prepare(id='original'){if(!known(id))throw Error('Unknown dancer profile: '+id);return id==='original'?true:face.build(id);}
 function apply(id='original'){if(!known(id))throw Error('Unknown dancer profile: '+id);face.set(id);const p=dancerProfiles.find(p=>p.id===id);for(const rig of rigs)applyHeadScale(rig,p.headScale);current=id;return true;}
 // Initialize before actor visibility. Baseline exists only for resource cleanup.
 apply(initial);
 return{supported:true,apply,prepare,get selected(){return current;},get timings(){return face.timings;},dispose(){face.dispose();rigs.forEach((r,i)=>applyHeadScale(r,prior[i]));current=null;}};
}
