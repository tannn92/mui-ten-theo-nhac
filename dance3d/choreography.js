// Pure song-clock choreography. No timers, RNG calls, mutable playhead or frame history.
// Clip poses live in the motion bank; this module selects and blends their source times.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=u=>{u=clamp(u,0,1);return u*u*(3-2*u);};
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const sorted=x=>[...new Set((Array.isArray(x)?x:[]).filter(finite))].sort((a,b)=>a-b);
const hash=(a,b)=>{let x=Math.imul(a+37,2654435761)^Math.imul(b+19,2246822519);x^=x>>>16;return(x>>>0)/4294967296;};
const modeOf=e=>e<.33?'calm':e>=.7?'strong':'groove';
function interval(xs,t){let lo=0,hi=xs.length-1;while(hi-lo>1){const m=(lo+hi)>>>1;if(xs[m]<=t)lo=m;else hi=m;}return lo;}
// Monotone C1 cubic through the real irregular beat timestamps.
function beatCurve(xs,ys=xs.map((_,i)=>i)){
 const n=xs.length,h=xs.slice(1).map((v,i)=>v-xs[i]),d=h.map((v,i)=>(ys[i+1]-ys[i])/v),m=Array(n);
 const endpoint=(h0,h1,d0,d1)=>{const v=((2*h0+h1)*d0-h0*d1)/(h0+h1);return v*d0<=0?0:d0*d1<0&&Math.abs(v)>3*Math.abs(d0)?3*d0:v;};
 if(n===2)m.fill(d[0]);else{m[0]=endpoint(h[0],h[1],d[0],d[1]);m[n-1]=endpoint(h[n-2],h[n-3],d[n-2],d[n-3]);for(let i=1;i<n-1;i++){const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];m[i]=(w1+w2)/(w1/d[i-1]+w2/d[i]);}}
 return t=>{if(t<=xs[0])return{phase:ys[0],rate:0};if(t>=xs[n-1])return{phase:ys[n-1]+(t-xs[n-1])*m[n-1],rate:m[n-1]};const i=interval(xs,t),u=(t-xs[i])/h[i],u2=u*u,u3=u2*u;
  return{phase:(2*u3-3*u2+1)*ys[i]+(u3-2*u2+u)*h[i]*m[i]+(-2*u3+3*u2)*ys[i+1]+(u3-u2)*h[i]*m[i+1],rate:((6*u2-6*u)*ys[i]+(-6*u2+6*u)*ys[i+1])/h[i]+(3*u2-4*u+1)*m[i]+(3*u2-2*u)*m[i+1]};};
}
// Source endpoint easing gives zero source velocity at the held first/last pose.
// The interior remains linear in musical beats. There is deliberately no modulo.
function sourceProgress(u,edge){
 u=clamp(u,0,1);if(u<edge){const x=u/edge;return edge*(2*x*x-x*x*x);}if(u>1-edge){const x=(1-u)/edge;return 1-edge*(2*x*x-x*x*x);}return u;
}
export function createChoreography(bank){
 const clips=(bank?.clips||[]).map((c,i)=>{const available=Array.isArray(c.frames)&&c.frames.length>1&&c.fps>0?(c.frames.length-1)/c.fps:Infinity;const duration=Math.min(c.duration,available);if(!c.id||!finite(duration)||duration<=0||!finite(c.beats)||c.beats<=0)throw new RangeError('Invalid choreography clip metadata at '+i);let sourceCurve=null;if(c.beatTimes!=null){const ts=c.beatTimes;if(!Array.isArray(ts)||ts.length!==c.beats+1||ts.some((t,j)=>!finite(t)||t<0||t>duration+1e-6||(j&&t<=ts[j-1]))||Math.abs(ts[0])>1e-6||Math.abs(ts.at(-1)-duration)>1e-5)throw new RangeError('Invalid source beatTimes for '+c.id);sourceCurve=beatCurve(ts.map((_,j)=>j),ts);}return{id:c.id,energy:clamp(finite(c.energy)?c.energy:.5,0,1),beats:c.beats,duration,index:i,sourceCurve};});
 if(!clips.length||new Set(clips.map(c=>c.id)).size!==clips.length)throw new RangeError('Choreography requires distinct motion-bank clips');
 let phrases=[],path=[],phaseAt=t=>({phase:t*2,rate:2}),energyAt=()=>.5,horizon=300;
 function setSong(moves,chart){
  let beats=sorted(chart?.beats?.length?chart.beats:moves?.beats);const proposed=chart?.bpm??moves?.bpm,bpm=finite(proposed)&&proposed>0?clamp(proposed,20,400):120;
  if(beats.length<2){const start=beats[0]??0;beats=[start,start+60/bpm];}
  phaseAt=beatCurve(beats);const tail=beats.at(-1)-beats.at(-2);
  horizon=Math.max(finite(chart?.duration)?chart.duration:0,finite(moves?.end)?moves.end:0,beats.length>2?beats.at(-1):300,beats[0]+8*tail);
  let bars=sorted(chart?.downbeats?.length?chart.downbeats:moves?.downbeats).filter(t=>t>=beats[0]-1e-6&&t<=horizon);
  if(!bars.length)bars=beats.filter((_,i)=>i%4===0);
  if(!bars.length)bars=[beats[0]];
  const knownBars=bars.length,barTail=bars.length>1?bars.at(-1)-bars.at(-2):4*tail;
  while(bars.at(-1)<horizon+32*tail)bars.push(bars.at(-1)+Math.max(.1,barTail));
  const incoming=Array.isArray(moves?.energy)?moves.energy:[];
  const energies=bars.map((_,i)=>{const e=incoming[Math.min(i,incoming.length-1)];return clamp(finite(e)?e:.5,0,1);});
  energyAt=t=>{if(t<=bars[0])return energies[0];if(t>=bars.at(-1))return energies.at(-1);const i=interval(bars,t),u=(t-bars[i])/(bars[i+1]-bars[i]);return energies[i]+(energies[i+1]-energies[i])*smooth(u);};
  phrases=[];const uses=clips.map(()=>0);let bi=0,last=null;
  while(bi<bars.length-1&&bars[bi]<=horizon&&(bi<knownBars||beats.length<=2)){
   const e=energies[bi],mode=modeOf(e);let rate=mode==='calm'?.5:1;
   let candidates=clips.filter(c=>c.id!==last&&(mode==='calm'?c.energy<=.4:mode==='strong'?c.energy>=.68:c.energy>=.33&&c.energy<=.77));
   if(!candidates.length)candidates=clips.filter(c=>c.id!==last);if(!candidates.length)candidates=clips;
   const k=phrases.length;candidates.sort((a,b)=>(.7*Math.abs(a.energy-e)+.065*uses[a.index]+.10*hash(k,a.index))-(.7*Math.abs(b.energy-e)+.065*uses[b.index]+.10*hash(k,b.index)));
   const clip=candidates[0];uses[clip.index]++;last=clip.id;
   // Strong sixteen-beat captures span three musical bars, not four.
   // Short clips keep their budget to avoid reaching the end early and holding.
   if(mode==='strong'&&clip.beats>=12)rate=4/3;
   let count=clamp(Math.round(clip.beats/(4*rate)),2,4),end=Math.min(bi+count,bars.length-1);
   // A major loudness change can choose a new family at the next actual bar.
   for(let j=bi+1;j<end;j++)if((mode==='calm'&&energies[j]>=.7)||(mode==='strong'&&energies[j]<.33)){end=j;break;}
   const startBeat=phaseAt(bars[bi]).phase,endBeat=phaseAt(bars[end]).phase;
   phrases.push({id:k,clip,mode,rate,start:bars[bi],end:bars[end],startBeat,endBeat,bar:bi});bi=end;
  }
  // Alternate broad direction, varying extent with measured bar energy. Smoothstep
  // interpolation gives zero velocity at every path knot, including energy jumps.
  path=[{phase:phaseAt(bars[0]).phase,x:0,z:0,yaw:0}];
  for(let i=2;i<bars.length;i+=2){const e=(energies[i]+energies[Math.max(0,i-1)])/2,drive=smooth((e-.08)/.84),travel=.025+.195*drive,side=(i/2)%2?-1:1;
   path.push({phase:phaseAt(bars[i]).phase,x:side*travel,z:.045*drive*Math.sin(i*.9),yaw:side*.12*drive});}
  if(path.length<2)path.push({phase:path[0].phase+8,x:0,z:0,yaw:0});
 }
 function sample(t){
  const time=clamp(finite(t)?t:0,0,horizon),beat=phaseAt(time),p=beat.phase;
  let index=phrases.length-1;for(let i=0;i<phrases.length;i++)if(p<phrases[i].endBeat){index=i;break;}
  const current=phrases[index],previous=phrases[index-1],next=phrases[index+1];let selected=[{phrase:current,weight:1}];
  if(previous&&p<current.startBeat+.5){const u=smooth(p-current.startBeat+.5);selected=[{phrase:previous,weight:1-u},{phrase:current,weight:u}];}
  else if(next&&p>next.startBeat-.5){const u=smooth(p-next.startBeat+.5);selected=[{phrase:current,weight:1-u},{phrase:next,weight:u}];}
  const layers=selected.filter(x=>x.weight>1e-12).map(({phrase:f,weight})=>{const u=(p-f.startBeat)*f.rate/f.clip.beats,progress=sourceProgress(u,Math.min(.125,.5/f.clip.beats));return{clip:f.clip.id,time:clamp(f.clip.sourceCurve?f.clip.sourceCurve(progress*f.clip.beats).phase:progress*f.clip.duration,0,f.clip.duration),weight};});
  let pi=path.length-2;for(let i=0;i<path.length-1;i++)if(p<path[i+1].phase){pi=i;break;}const a=path[pi],b=path[pi+1],span=b.phase-a.phase,u=clamp((p-a.phase)/span,0,1),s=smooth(u),ds=6*u*(1-u)*beat.rate/span;
  const energy=energyAt(time),drive=smooth((energy-.08)/.84);
  return{layers,energy,amplitude:.60+.40*drive,rootX:a.x+(b.x-a.x)*s,rootZ:a.z+(b.z-a.z)*s,yaw:a.yaw+(b.yaw-a.yaw)*s,rootVelocity:{x:(b.x-a.x)*ds,z:(b.z-a.z)*ds},beatPhase:p,phaseRate:current.rate,phraseId:current.id,mode:current.mode};
 }
 setSong(null,null);
 return{setSong,sample,get phrases(){return phrases.map(p=>({id:p.id,clip:p.clip.id,mode:p.mode,phaseRate:p.rate,start:p.start,end:p.end,startBeat:p.startBeat,endBeat:p.endBeat,bar:p.bar}));}};
}
