import {buildHair,options} from './hair-core.js?v=1111.1719';
export const huntrixHairOptions=()=>({hair:options.hair.filter(o=>o.id.startsWith('huntrix-'))});
export function* buildHuntrixHair(v,o){return yield* buildHair(v,o,'huntrix');}
export function createHuntrixHair(...a){const g=buildHuntrixHair(...a);let s;do{s=g.next();}while(!s.done);return s.value;}
export const huntrixHairSpecs=options.hair.filter(o=>o.id.startsWith('huntrix-')).map(o=>({id:o.id.split('-')[1],name:o.label}));
