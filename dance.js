'use strict';
window.Dance=(()=>{let runtime=null,pendingSong=[null,null];return{
 async init(canvas,bundle){const {createRuntime}=await import('./dance3d/runtime.js?v=0911.1551');runtime=await createRuntime(canvas,bundle);await runtime.setSong(...pendingSong);},
 setSong(moves,chart){pendingSong=[moves,chart];return runtime?.setSong(moves,chart);},draw(t){runtime?.draw(t);},
 setOutfit(id){runtime?.setOutfit(id);},equip(slot,index){runtime?.equip(slot,index);},mountWardrobe(container){runtime?.mountWardrobe(container);},
 snapshot(){return runtime?.snapshot();},diagnostics(){return runtime?.snapshot();},get test(){return runtime?.test;},audit(t){runtime?.draw(t);return runtime?.snapshot();},
 get ready(){return !!runtime;},get hasMoves(){return !!pendingSong[0];},get outfits(){return runtime?.outfits||[];},get outfit(){return runtime?.outfit||'rose';}
};})();
