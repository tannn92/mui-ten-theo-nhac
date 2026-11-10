import {buildHair,options} from './hair-core.js?v=1011.0910';
export const goldenHairOptions=()=>({hair:options.hair.filter(o=>o.id.startsWith('golden-'))});
export function* buildGoldenHair(v,o){return yield* buildHair(v,o,'golden');}
export function createGoldenHair(...a){const g=buildGoldenHair(...a);let s;do{s=g.next();}while(!s.done);return s.value;}
export const goldenHairSpecs=options.hair.filter(o=>o.id.startsWith('golden-')).map(o=>({id:'zoey',name:o.label}));
