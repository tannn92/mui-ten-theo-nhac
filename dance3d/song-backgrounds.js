import * as T from 'three';
import {STAGES} from './stages.js?v=1611.0354';

// Locally drawn scenery: no reference photos, people, logos, or network assets.
// One background texture, painted only on song/viewport changes; no per-frame work.
export function selectBackdrop(chart={}) {
 chart=chart||{};
 const text=[chart.slug,chart.title,chart.audio].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/ddu[- _]du/i.test(text))return 'ddudu';
 if(/kill[- _]this[- _]love/.test(text))return 'ktl';
 if(/how[- _]you[- _]like[- _]that/.test(text))return 'hylt';
 if(/pink[- _]venom/.test(text))return 'pv';
 if(/jisoo[- _]flower|flower \(jisoo\)/.test(text))return 'jf';
 if(/roly[- _]poly/.test(text))return 'rolypoly';
 if(/super[- _]junior/.test(text))return 'sju';
 if(/ttl-time-to-love|time to love/.test(text))return 'ttl';
 if(/day[- _]by[- _]day/.test(text))return 'dbd';
 if(/laviem/.test(text))return 'laviem';
 if(/tim[- _]em/.test(text))return 'timem';
 if(/golden/.test(text))return 'golden';
 if(/secret|tinh[- _]ha/.test(text))return 'secret';
 if(/what[- _]it[- _]sounds/.test(text))return 'sounds';
 if(/takedown/.test(text))return 'takedown';
 if(/how[- _]it.?s?[- _]done/.test(text))return 'how';
 if(/hat[- _]mua/.test(text))return 'rain';
 if(/girl[- _]xinh|that[- _]tinh/.test(text))return 'girl';
 if(/tai[- _]sinh/.test(text))return 'taisinh';
 return 'dolce';
}
export function createSongBackgrounds(scene){
 let active='dolce',width=0,height=0,texture=null,paints=0;
 function paint(){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const c=canvas.getContext('2d');c.scale(width/1600,height/1000);
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const path=(points,color,stroke,line=1)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}};
  const glow=(x,y,r,color,alpha=.5)=>{c.save();c.globalAlpha=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();};
  const dot=(x,y,r,color)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();};
  const line=(x,y,xx,yy,color,w)=>{c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=w;c.stroke();};
  const lamp=(x,y,scale=1)=>{line(x,y,x,y+145*scale,'#4a4d69',5*scale);glow(x,y,50*scale,'#ffe4a6',.5);dot(x,y,5*scale,'#fff1ce');};
  let seed=31;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const clear=h=>/^#[0-9a-f]{6}$/i.test(h)?`rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},0)`:'transparent';
  const soft=(x,y,r,color,alpha=.5)=>{c.save();c.globalAlpha=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,clear(color));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();};
  // each song's painter lives in its own stage-<id>.js (stages.js); the dedicated ones get the soft glow as glow
  (STAGES[active]||STAGES.dolce).paint(c,{rect,path,glow:soft,glowPlain:glow,dot,line,lamp,rnd});
  finish(canvas);
 }
 function finish(canvas){const next=new T.CanvasTexture(canvas);next.colorSpace=T.SRGBColorSpace;next.generateMipmaps=false;next.minFilter=T.LinearFilter;scene.background=next;texture?.dispose();texture=next;paints++;}
 return{tint(){return (STAGES[active]||STAGES.dolce).tint;},setSong(chart){const next=selectBackdrop(chart);if(next!==active){active=next;if(width)paint();}},resize(w,h){const nextW=Math.min(1600,Math.max(640,Math.round(w))),nextH=Math.min(1600,Math.max(480,Math.round(h)));if(nextW!==width||nextH!==height){width=nextW;height=nextH;paint();}},diagnostics(){return{id:active,paints,width,height};}};
}
