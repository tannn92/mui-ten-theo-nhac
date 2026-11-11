import {createFaceIdentities} from './dancer-face-shapes.js?v=1111.2044';
import {applyHeadScale} from './head-scale.js?v=1111.2044';
export const dancerProfiles=Object.freeze([
 Object.freeze({id:'original',label:'Gương mặt gốc',headScale:.85}),
 Object.freeze({id:'rumi',label:'Rumi · cân đối',headScale:.85}),
 // Mira (owner 2026-11-11): Quang Hùng's head as it was before his 90% (same size and long narrow shape); her hair is unchanged.
 Object.freeze({id:'mira',label:'Mira · thon dài',headScale:.76,headAspect:Object.freeze([.87,1.075,.94])}),
 Object.freeze({id:'zoey',label:'Zoey · tròn đáng yêu',headScale:.92}),
 // Secret singers (crew only): male faces, smaller heads (older, taller look)
 Object.freeze({id:'boy1',label:'Secret · CongB',headScale:.75}),Object.freeze({id:'boy2',label:'Secret · Cody Nam Võ',headScale:.75}),
 // Owner 2026-11-11: Quang Hùng's head length to 90% (1.075 -> .9675, width kept); Wren Evans gets the same head size.
 Object.freeze({id:'boy3',label:'Secret · Quang Hùng MasterD',headScale:.76,headAspect:Object.freeze([.87,.9675,.94])}),Object.freeze({id:'boy4',label:'Secret · Wren Evans',headScale:.76,headAspect:Object.freeze([.87,.9675,.94])}),
 // LAVIEM singers (crew only, 2026-11-11): CAPTAIN BOY, Pháp Kiều (narrower, a little longer), CoolKid (rounder)
 Object.freeze({id:'boy5',label:'LAVIEM · CAPTAIN BOY',headScale:.75}),Object.freeze({id:'boy6',label:'LAVIEM · Pháp Kiều',headScale:.75,headAspect:Object.freeze([.92,1.0,.96])}),
 Object.freeze({id:'boy7',label:'LAVIEM · CoolKid',headScale:.75,headAspect:Object.freeze([1.02,.95,1.0])})
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
 if(!face.supported)return{supported:false,reason:face.reason,apply:()=>false,prepare:()=>false,resources:()=>[],dispose(){}};
 const prior=rigs.map(v=>{const h=v.humanoid.getRawBoneNode('head'),base=h?.userData.previewHeadScaleBase?.scale;return base?h.scale.x/base[0]:1;});
 let current=null;
 function prepare(id='original'){if(!known(id))throw Error('Unknown dancer profile: '+id);return id==='original'?true:face.build(id);}
 function apply(id='original'){if(!known(id))throw Error('Unknown dancer profile: '+id);face.set(id);const p=dancerProfiles.find(p=>p.id===id);for(const rig of rigs)applyHeadScale(rig,p.headScale,p.headAspect);current=id;return true;}
 // Initialize before actor visibility. Baseline exists only for resource cleanup.
 apply(initial);
 return{supported:true,apply,prepare,resources:()=>face.resources?.()||[],get selected(){return current;},get timings(){return face.timings;},dispose(){face.dispose();rigs.forEach((r,i)=>applyHeadScale(r,prior[i]));current=null;}};
}
