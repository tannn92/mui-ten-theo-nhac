// All keys are private-bundle paths. Only exact song identity selects a performance.
export function createPerformanceLibrary(bundle,entries={}){
 const cache=new Map();
 function find(chart){if(!chart)return null;const key=chart.slug||chart.id;if(key)return entries[key]||null;const matches=Object.values(entries).filter(e=>e.title?.normalize('NFC').trim().toLowerCase()===chart.title?.normalize('NFC').trim().toLowerCase()&&Math.abs(e.duration-chart.duration)<.1);if(matches.length>1)throw Error('Ambiguous performance identity');return matches[0]||null;}
 function json(name){if(!name)return Promise.resolve(null);if(!bundle.files[name])throw Error('Missing performance asset: '+name);if(!cache.has(name))cache.set(name,bundle.json(name).catch(e=>{cache.delete(name);throw e;}));return cache.get(name);}
 async function load(entry){if(!entry)return null;const crew=entry.crew||[];if(![0,2,4].includes(entry.crewCount??crew.length))throw Error('Unsupported crew count');if(crew.length>4||crew.length>(entry.crewCount??crew.length))throw Error('Too many crew tracks');const [lead,...crewData]=await Promise.all([json(entry.lead),...crew.map(c=>json(c.asset))]);const needed=new Set([entry.lead,...crew.map(c=>c.asset)]);for(const key of cache.keys())if(!needed.has(key))cache.delete(key);return{entry,lead,crewData};}
 return{find,load};
}
