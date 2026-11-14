// Player character (owner 2026-11-14 "khi mở game sẽ có option chọn nam hoặc nữ… nam thì có đồ nam và nhân vật là nam").
// 'nu' = the girl exactly as before (her sets, her shop, the 'original' face). 'nam' = the same body, rigs and dances with the
// male face profile 'nam', a boy's haircut and a male wardrobe: config.characters.nam lists the shop items and sets by option
// id (so songs that append options never shift them). Only this view decides what the shop shows and sews.
export const CHARACTER_KEY='spike-character';
export const normCharacter=c=>c==='nam'?'nam':'nu';
const NAM_SAVE='spike-wardrobe-nam-v1';
export function characterView(config,options,character){
 const spec=normCharacter(character)==='nam'?config.characters?.nam:null;
 if(!spec)return{character:'nu',profile:null,uiConfig:config,sets:config.sets||[],isShop:(slot,i)=>!!options[slot]?.[i]&&!options[slot][i].crewOnly,initial:null,save:null};
 const index=(slot,id)=>options[slot]?options[slot].findIndex(o=>o.id===id):-1;
 const resolve=ids=>{const out={};for(const [slot,id] of Object.entries(ids||{})){const i=index(slot,id);if(i<0)return null;out[slot]=i;}return out;};
 const sets=(spec.sets||[]).map(s=>{const selection=resolve(s.selectionIds);return selection?{id:s.id,label:s.label,selection}:null;}).filter(Boolean);
 const allow={};const add=(slot,id)=>{if(index(slot,id)>=0)(allow[slot]||(allow[slot]=new Set())).add(id);};
 for(const [slot,ids] of Object.entries(spec.shop||{}))for(const id of ids)add(slot,id);
 for(const s of sets)for(const [slot,i] of Object.entries(s.selection))add(slot,options[slot][i].id);
 // the shop UI hides crewOnly items: in the boy's view every item outside his list is hidden, his own items are shown
 const mark=(list,slot)=>(list||[]).map(o=>({...o,label:spec.labels?.[o.id]||o.label,crewOnly:!allow[slot]?.has(o.id)}));
 const uiConfig={...config,sets,options:Object.fromEntries(Object.entries(config.options||{}).map(([slot,list])=>[slot,mark(list,slot)])),accessories:mark(config.accessories,'accessory')};
 const defaults=resolve(spec.defaults)||{};
 // his outfit is remembered apart from hers, by option id
 let saved=null;try{saved=JSON.parse(localStorage.getItem(NAM_SAVE)||'null');}catch(e){}
 const initial={...defaults};
 if(saved&&typeof saved==='object')for(const [slot,id] of Object.entries(saved)){const i=index(slot,id);if(i>=0&&(slot==='face'||allow[slot]?.has(id)))initial[slot]=i;}
 const save=outfit=>{try{localStorage.setItem(NAM_SAVE,JSON.stringify(Object.fromEntries(Object.entries(outfit).map(([slot,i])=>[slot,options[slot]?.[i]?.id??null]))));}catch(e){}};
 return{character:'nam',profile:spec.profile||'nam',uiConfig,sets,isShop:(slot,i)=>!!options[slot]?.[i]&&!!allow[slot]?.has(options[slot][i].id),initial,save};
}
