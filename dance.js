'use strict';
window.Dance=(()=>{let runtime=null,pendingSong=[null,null];return{
 async init(canvas,bundle){const {createRuntime}=await import('./dance3d/runtime.js?v=1111.0832');runtime=await createRuntime(canvas,bundle);await runtime.setSong(...pendingSong);},
 setSong(moves,chart){pendingSong=[moves,chart];return runtime?.setSong(moves,chart);},draw(t){runtime?.draw(t);},
 setOutfit(id){runtime?.setOutfit(id);},
 // two-iPad play: the partner dancer (side 'L' = host, 'R' = guest), the outfit as option ids, head points for the markers
 setDuo(opts){return runtime?.setDuo(opts);},outfitIds(){return runtime?.outfitIds()||null;},heads(){return runtime?.heads()||{me:null,partner:null};},equip(slot,index){runtime?.equip(slot,index);},mountWardrobe(container){runtime?.mountWardrobe(container);},
 snapshot(){return runtime?.snapshot();},diagnostics(){return runtime?.snapshot();},get test(){return runtime?.test;},audit(t){runtime?.draw(t);return runtime?.snapshot();},
 get ready(){return !!runtime;},get hasMoves(){return !!pendingSong[0];},get outfits(){return runtime?.outfits||[];},get outfit(){return runtime?.outfit||'rose';}
};})();
