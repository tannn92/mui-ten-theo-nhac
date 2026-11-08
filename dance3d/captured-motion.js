// Pure, absolute-song-time sampling. The private captured pose data is loaded
// from the encrypted bundle; no video, key, pose array, or personal asset lives here.
export const CAPTURE_ASSET='wardrobe/cac-center-240-260.json';
export const FULL_CAPTURE_ASSET='wardrobe/cac-center-full.json';
const finite=v=>typeof v==='number'&&Number.isFinite(v);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=u=>{u=clamp(u,0,1);return u*u*(3-2*u);};
const title=s=>typeof s==='string'?s.normalize('NFC').trim().toLowerCase():'';

export function createCapturedMotion(data){
 const {fps,t0,duration,boneNames,song}=data||{};
 if(!finite(fps)||fps<=0||!finite(t0)||t0<0||!finite(duration)||duration<=0||!Array.isArray(boneNames)||!boneNames.length||new Set(boneNames).size!==boneNames.length||!Array.isArray(data.frames)||data.frames.length<Math.ceil(duration*fps))throw new Error('Invalid captured motion metadata');
 if(!song?.slug||!song?.title||!finite(song.duration))throw new Error('Captured motion needs an explicit song identity');
 const size=boneNames.length*4;
 const frames=data.frames.map((f,i)=>{
  if(!Array.isArray(f.q)||f.q.length!==size||!f.q.every(finite))throw new Error('Invalid captured quaternion frame '+i);
  if(!Array.isArray(f.root)||f.root.length!==3||!f.root.every(finite))throw new Error('Invalid captured root frame '+i);
  const q=f.q.slice();for(let j=0;j<size;j+=4){const n=Math.hypot(...q.slice(j,j+4));if(n<1e-8)throw new Error('Zero captured quaternion at frame '+i);for(let k=0;k<4;k++)q[j+k]/=n;}
  return{q,root:f.root.slice()};
 });
 const end=t0+duration,entryFade=t0===0?0:Math.min(.5,duration/2),exitFade=Math.min(1,duration-entryFade);let matched=false;
 function setSong(_moves,chart){
  const identity=chart?.slug??chart?.id;
  matched=!!chart&&(identity!=null?identity===song.slug:title(chart.title)===title(song.title))&&finite(chart.duration)&&Math.abs(chart.duration-song.duration)<.1;
  return matched;
 }
 function sample(t){
  if(!matched||!finite(t)||t<t0||t>end)return null;
  const localTime=t-t0,f=clamp(localTime*fps,0,frames.length-1),index=Math.floor(f),next=Math.min(index+1,frames.length-1),alpha=f-index,a=frames[index],b=frames[next],q=new Array(size);
  for(let j=0;j<size;j+=4){let dot=0;for(let k=0;k<4;k++)dot+=a.q[j+k]*b.q[j+k];const sign=dot<0?-1:1;dot=clamp(Math.abs(dot),0,1);let wa=1-alpha,wb=alpha;if(dot<.9995){const angle=Math.acos(dot),s=Math.sin(angle);wa=Math.sin((1-alpha)*angle)/s;wb=Math.sin(alpha*angle)/s;}let norm=0;for(let k=0;k<4;k++){q[j+k]=wa*a.q[j+k]+wb*sign*b.q[j+k];norm+=q[j+k]*q[j+k];}norm=Math.sqrt(norm);for(let k=0;k<4;k++)q[j+k]/=norm;}
  const weight=(entryFade>0?smooth(localTime/entryFade):1)*smooth((duration-localTime)/exitFade);
  return{active:weight>0,weight,source:'cac-center',sourceTime:t,localTime,index,next,alpha,q,root:a.root.map((v,k)=>v+(b.root[k]-v)*alpha)};
 }
 return{setSong,sample,boneNames:boneNames.slice(),t0,duration,entryFade,exitFade,referenceVariant:data.referenceVariant||'rose',get matched(){return matched;}};
}
