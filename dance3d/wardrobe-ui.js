const key='spike-wardrobe-v1',physicalSlots=['hair','top','bottom','shoes'];
const accessoryDefaults=[{id:'none',label:'Không'},{id:'headphones',label:'Tai nghe'},{id:'bow',label:'Nơ tóc'},{id:'bracelets',label:'Vòng tay'}];
export function getWardrobeOptions(config={}){
 const variants=config.variants||[{id:'mint',labels:{}},{id:'rose',labels:{}}];
 const options=Object.fromEntries(physicalSlots.map(slot=>{const custom=config.options?.[slot];const values=Array.isArray(custom)?custom:variants.map((v,i)=>({id:v.id,label:v.labels?.[slot]||v.id,variant:i}));return[slot,values.filter(o=>Number.isInteger(o.variant)&&o.variant>=0&&o.variant<variants.length).map(o=>({...o}))];}));
 options.accessory=(config.accessories||accessoryDefaults).map(o=>({...o}));
 options.face=(config.faces||[{id:'gentle',label:'Dịu dàng',values:{happy:.18}}]).map(o=>({...o}));return options;
}
export function wardrobeDefaults(config={}){const options=getWardrobeOptions(config);return Object.fromEntries(Object.entries(options).map(([slot,values])=>{const fallback=slot==='accessory'||slot==='face'?0:Math.min(1,values.length-1),value=config.defaults?.[slot];return[slot,Number.isInteger(value)&&value>=0&&value<values.length?value:Math.max(0,fallback)];}));}
export function readWardrobe(config={}){
 const options=getWardrobeOptions(config),defaults=wardrobeDefaults(config);let saved=null;
 try{const raw=localStorage.getItem(key);if(raw!==null)saved=JSON.parse(raw);else{const legacy=localStorage.getItem('spike-outfit');if(legacy==='mint'||legacy==='rose')saved=Object.fromEntries(physicalSlots.map(s=>[s,legacy==='mint'?0:1]));}}catch{}
 // Migrate old four-slot saves independently. A malformed one-slot value must not
 // discard valid choices in the other slots; newly added accessories default off.
 return Object.fromEntries(Object.entries(options).map(([slot,values])=>{const v=saved?.[slot];return[slot,Number.isInteger(v)&&v>=0&&v<values.length?v:defaults[slot]];}));
}
export function saveWardrobe(outfit){try{localStorage.setItem(key,JSON.stringify(outfit));localStorage.setItem('spike-outfit',physicalSlots.every(s=>outfit[s]===0)?'mint':physicalSlots.every(s=>outfit[s]===1)?'rose':'mixed');}catch{}}
export function mountWardrobe(container,config,equip,current){
 container.replaceChildren();container.classList.add('wardrobe3d');const titles={hair:'Tóc',top:'Áo',bottom:'Quần / váy',shoes:'Giày',accessory:'Phụ kiện',face:'Gương mặt · biểu cảm'},buttons=[],options=getWardrobeOptions(config);
 if(config.sets?.length){const section=document.createElement('section'),title=document.createElement('strong'),items=document.createElement('div');section.dataset.wardrobeSlot='sets';title.textContent='Chọn cả bộ';section.append(title,items);for(const set of config.sets){const b=document.createElement('button');b.type='button';b.textContent=set.label;b.dataset.outfitSet=set.id;b.onclick=()=>{for(const[slot,index]of Object.entries(set.selection))equip(slot,index);};items.append(b);}container.append(section);}
 for(const [slot,values] of Object.entries(options)){const section=document.createElement('section'),title=document.createElement('strong'),items=document.createElement('div');section.dataset.wardrobeSlot=slot;title.textContent=titles[slot]||slot;section.append(title,items);
  values.forEach((v,i)=>{const b=document.createElement('button');b.type='button';b.textContent=v.label;b.dataset.slot=slot;b.dataset.choice=i;b.dataset.optionId=v.id;b.onclick=()=>equip(slot,i);items.append(b);buttons.push(b);});container.append(section);
 }
 const refresh=()=>buttons.forEach(b=>b.setAttribute('aria-pressed',current()[b.dataset.slot]===Number(b.dataset.choice)));refresh();return refresh;
}
