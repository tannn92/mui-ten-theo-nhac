// MV camera director (owner 2026-11-15 "tôi muốn game trông điện ảnh hơn, như đang enjoy 1 cái mv vậy", reports/mv-look).
// The camera is a PURE FUNCTION OF SONG TIME: setSong builds a fixed shot list from the chart (bar lines), the song's per-bar
// loudness (mv-energy.js), the arrow density, the backup formation (crew entry) and the lead's own root path; shot(t) only
// reads that list. Same chart + same formation = same shots, after any seek, on both iPads in two-player play.
// Shot grammar: wide / crane (high wide) / full (full body) / hero (low angle) / side (3/4) / close (half body).
// Comfort for a 6-year-old: hard cuts only on bar lines, slow eased moves inside a shot, shots ≥ 2 bars (usually 4-8),
// no shake, no fast pans; close-ups ≤ ~18% of the song, never in the busiest arrow bars.
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x)),lerp=(a,b,u)=>a+(b-a)*u,ease=u=>{u=clamp(u,0,1);return u*u*u*(u*(u*6-15)+10);};
const DEG=Math.PI/180;
function hashStr(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function rng(seed){let a=seed||1;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// Framing per kind: fov (vertical degrees), camera height, look height, visible height at the subject (frame), yaw (deg),
// group shots (wide, crane) frame the whole group around its centre dancer, lead shots frame the lead where she
// actually stands (never assumed at x 0). Moves: d* are the change over the whole shot (eased).
const KINDS={
 wide: {fov:30,camY:1.30,lookY:.66,frame:2.55,yaw:0},
 crane:{fov:30,camY:2.35,lookY:.50,frame:2.60,yaw:0},
 full: {fov:26,camY:1.02,lookY:.64,frame:1.86,yaw:0},
 hero: {fov:30,camY:.34,lookY:.72,frame:1.95,yaw:0},
 side: {fov:26,camY:.98,lookY:.64,frame:1.92,yaw:19},
 close:{fov:22,camY:1.00,lookY:.86,frame:.98,yaw:0},
 arch: {fov:28,camY:.62,lookY:.86,frame:1.95,yaw:0},
};
export const SHOT_KINDS=Object.keys(KINDS);
// Crew position at song time t from its entry (anchor, then timed moves; walks are eased), as crew.js lays them out.
function crewAt(c,t){const p0=Array.isArray(c.anchor)?c.anchor:[0,0,-1];let p=p0;for(const m of (c.moves||[]).slice().sort((a,b)=>a.at-b.at)){if(t<m.at)break;const to=Array.isArray(m.to)?m.to:p0;const u=m.dur>0?clamp((t-m.at)/m.dur,0,1):1;const s=u*u*(3-2*u);p=u>=1?to:[lerp(p[0],to[0],s),lerp(p[1],to[1],s),lerp(p[2],to[2],s)];}return p;}
export function createDirector(){
 let plan=[],info={},group=null,rawY=null,path=null,pathY=null,pathT0=0,pathDt=.1,duoOn=false,slots=[0],partnerX=null,corr=null;
 // smoothed lead path (built by the runtime at 10 Hz): x and hips height
 const pathAt=(arr,t,fallback)=>{if(!arr||!arr.length)return fallback;const f=clamp((t-pathT0)/pathDt,0,arr.length-1),i=Math.floor(f),u=f-i;return lerp(arr[i],arr[Math.min(i+1,arr.length-1)],u);};
 const smooth=(arr,sec)=>{if(!arr)return null;const r=Math.max(1,Math.round(sec/pathDt)),out=new Float32Array(arr.length);
  for(let i=0;i<arr.length;i++){let s=0,w=0;for(let k=-r;k<=r;k++){const j=clamp(i+k,0,arr.length-1),g=Math.exp(-(k*k)/(r*r*.5));s+=arr[j]*g;w+=g;}out[i]=s/w;}return out;};
 function setSong({chart,slug,energy,crew,duo,lead,centre,hints,players}={}){corr=null;
  duoOn=!!duo;slots=duoOn?[-duo.slotX,duo.slotX]:[0];partnerX=typeof duo?.partnerX==='function'?duo.partnerX:null;// centre rotation: the other player walks her own member path
  path=null;pathY=null;rawY=null;
  if(lead&&lead.x?.length){pathT0=lead.t0;pathDt=lead.dt;path=smooth(lead.x,1.6);pathY=smooth(lead.y,1.2);rawY=lead.y;}
  const dur=Number(chart?.duration)||200,end=Number(chart?.end)||dur;
  let bars=(chart?.downbeats||[]).filter(Number.isFinite).slice().sort((a,b)=>a-b);
  if(bars.length<4){const bpm=Number(chart?.bpm)||120,len=240/bpm;bars=[];for(let t=0;t<dur;t+=len)bars.push(t);}
  const nb=bars.length,barEnd=i=>i+1<nb?bars[i+1]:Math.max(bars[nb-1]+(bars[nb-1]-bars[nb-2]),dur);
  // per-bar loudness (0..1) and arrow density of the densest level
  const lv=chart?.levels||{},notes=[lv.kho,lv.vua,chart?.notes].find(x=>Array.isArray(x)&&x.length)||[];
  const dens=new Array(nb).fill(0);{let j=0;const ts=notes.map(n=>n.t).sort((a,b)=>a-b);for(let i=0;i<nb;i++){const a=bars[i],b=barEnd(i);while(j<ts.length&&ts[j]<a)j++;let k=j;while(k<ts.length&&ts[k]<b)k++;dens[i]=k-j;}}
  const sortedD=dens.slice().sort((a,b)=>a-b),dq=q=>sortedD[Math.floor(q*(nb-1))];const busyAt=Math.max(dq(.8)+(dq(.8)<=dq(.5)?1:0),2);
  const en=Array.isArray(energy)&&energy.length>=nb-2?Array.from({length:nb},(_,i)=>energy[Math.min(i,energy.length-1)]):dens.map(d=>clamp(d/Math.max(1,dq(.95)),0,1));
  const R=rng(hashStr(slug||chart?.title||'song')+(duoOn?7:0));
  // song events from the backup formation (pure: anchors + timed moves of the crew entry)
  const list=(crew?.crew||[]).filter(c=>!c.duoOut);
  const lineAt=t=>{const s=[];for(const c of list){const p=crewAt(c,t);if(Math.abs(p[0])>1.4)continue;s.push(p);}return s;};
  const playersAt=t=>[pathAt(path,t,0),partnerX(t)];// centre rotation duo: both players' x on their member paths
  const flagsAt=t=>{const ps=lineAt(t);let beside=0,front=0,maxX=0;for(const p of ps){const ax=Math.abs(p[0]);maxX=Math.max(maxX,ax);
    for(const sx of (partnerX?playersAt(t):typeof centre==='function'?[pathAt(path,t,0)]:slots)){if(p[2]>-.3&&p[2]<=.3&&Math.abs(p[0]-sx)<.8&&Math.abs(p[0]-sx)>.05)beside++;if(p[2]>.12&&Math.abs(p[0]-sx)<.55)front++;}}
   return {beside,front,maxX};};
  // the group track (10 Hz, pure): on-stage dancers = crew from the entry + the player(s) at their slots + the lead's root path;
  // bbox centre / half width, the centre dancer (nearest x 0 at the front; opts.centre(t) can name it later), and the
  // half width the lead shots need when someone dances right beside the lead. Smoothed like the lead path.
  {const T0=-2,DT=.1,n=Math.ceil((dur+4-T0)/DT)+1,cx=new Float32Array(n),hw=new Float32Array(n),cd=new Float32Array(n),lw=new Float32Array(n);
   for(let i=0;i<n;i++){const t=T0+i*DT,lx=pathAt(path,t,0),pl=partnerX?playersAt(t).map(x=>[x,0,0]):slots.map(sx=>[sx+lx,0,0]),all=pl.concat(lineAt(t));let a=1e9,b=-1e9,best=null;
    for(const p of all){a=Math.min(a,p[0]);b=Math.max(b,p[0]);const sc=Math.abs(p[0])-p[2]*.5;if(!best||sc<best[0])best=[sc,p[0]];}
    const hint=typeof centre==='function'?centre(t):null;cx[i]=(a+b)/2*.6+(Number.isFinite(hint)?hint:best[1])*.4;hw[i]=Math.max(.9,(b-a)/2+.55,Math.max(...pl.map(p=>Math.abs(p[0]-cx[i])))+.5);cd[i]=Number.isFinite(hint)?hint:best[1];
    let w=0;for(const p of all)for(const q of pl){const d=Math.abs(p[0]-q[0]);if(p[2]>-.3&&d<.85)w=Math.max(w,d+.45);}lw[i]=w;}
   const sm=a=>{const r=16,o=new Float32Array(a.length);for(let i=0;i<a.length;i++){let s=0,w=0;for(let k=-r;k<=r;k++){const j=clamp(i+k,0,a.length-1),g=Math.exp(-(k*k)/(r*r*.5));s+=a[j]*g;w+=g;}o[i]=s/w;}return o;};
   const mx=a=>{const r=10,o=new Float32Array(a.length);for(let i=0;i<a.length;i++){let m=0;for(let k=-r;k<=r;k++)m=Math.max(m,a[clamp(i+k,0,a.length-1)]);o[i]=m;}return o;};
   group={t0:T0,dt:DT,cx:sm(cx),hw:sm(mx(hw)),cd:sm(cd),lw:sm(mx(lw))};}
  const arches=[];for(const c of list)if(c.arch?.in&&c.arch?.out)arches.push([c.arch.in[0]-.6,c.arch.out[1]+.2]);
  const barFlags=bars.map((b,i)=>{const a=b,z=barEnd(i),m=[a,(a+z)/2,z-.05].map(flagsAt);return {beside:Math.max(...m.map(f=>f.beside)),front:Math.max(...m.map(f=>f.front)),maxX:Math.max(...m.map(f=>f.maxX)),arch:arches.some(([p,q])=>p<z&&q>a)};});
  // 1) cut points: section changes (loudness steps), events, then 4/8-bar chunks; never under 2 bars
  const cuts=new Set([0]);
  const avg=(i,n)=>{let s=0,k=0;for(let j=i;j<Math.min(nb,i+n);j++){s+=en[j];k++;}return k?s/k:0;};
  for(let i=2;i<nb-1;i++)if(Math.abs(avg(i,2)-avg(i-2,2))>.28)cuts.add(i);
  for(let i=1;i<nb;i++){const a=barFlags[i-1],b=barFlags[i];if(a.arch!==b.arch||(a.front>0)!==(b.front>0)||(a.beside>0)!==(b.beside>0))cuts.add(i);}
  const hintCuts=new Set();for(const h of hints?.force||[])for(const x of [h.from,h.to]){let i=-1;for(let k=0;k<nb;k++)if(bars[k]<=x+.05)i=k;if(i>0&&i<nb){cuts.add(i);hintCuts.add(i);}}// hint windows start/end on their bar line
  let cl=[...cuts].sort((a,b)=>a-b);
  // drop cuts that would leave a piece under 2 bars (keep the event cuts' later side)
  const ev=c=>barFlags[c]?.arch!==barFlags[c-1]?.arch||hintCuts.has(c);const pruned=[0];
  for(const c of cl.slice(1)){if(c-pruned.at(-1)<2){if(ev(c)&&pruned.length>1&&c-pruned[pruned.length-2]>=2)pruned[pruned.length-1]=c;continue;}pruned.push(c);}
  if(nb-pruned.at(-1)<2&&pruned.length>1)pruned.pop();
  const pieces=[];for(let k=0;k<pruned.length;k++){const a=pruned[k],b=k+1<pruned.length?pruned[k+1]:nb;let i=a;
   while(i<b){const left=b-i,calm=avg(i,4)<.45;let n=left<=5?left:(calm&&left>=10?8:4);if(left-n===1)n+=1;if(left-n>0&&left-n<2)n=left;pieces.push([i,i+n]);i+=n;}}
  // 2) a shot kind per piece
  let closeTime=0,last=null,lastSide=1,lastHero=-9;const total=Math.max(1,barEnd(nb-1)-bars[0]);
  plan=[];const firstLoud=en.findIndex(e=>e>.45);
  pieces.forEach(([a,b],k)=>{const t0=bars[a],t1=barEnd(b-1),len=t1-t0,e=avg(a,b-a),fl={beside:0,front:0,maxX:0,arch:false};let busy=0;
   for(let i=a;i<b;i++){const f=barFlags[i];fl.beside=Math.max(fl.beside,f.beside);fl.front=Math.max(fl.front,f.front);fl.maxX=Math.max(fl.maxX,f.maxX);fl.arch=fl.arch||f.arch;if(dens[i]>=busyAt)busy++;}
   const busyShare=busy/(b-a),prevE=a>0?avg(Math.max(0,a-2),2):e,lift=e-prevE>.25;
   let kind,forced=null;
   if(fl.arch)kind='arch';
   else if(k===0)kind=en[0]<.3?'crane':'wide';
   else if(k===pieces.length-1)kind='wide';
   else if(fl.front)kind='crane';
   else{
    const w=[];const add=(x,n)=>{if(x!==last)w.push([x,n]);};
    let lowY=9;if(rawY)for(let t=t0-.5;t<=t1+.5;t+=.1)lowY=Math.min(lowY,pathAt(rawY,t,.6));const ov=([p,q])=>p<t1&&q>t0,canClose=busyShare<.5&&e<.8&&lowY>=.42&&!(hints?.noClose||[]).some(ov);
    if(lift){add('hero',3);add('wide',2);add('full',1);}
    else if(e>=.62){add('full',3);add('wide',2);add(k-lastHero>3?'hero':'side',2);add('side',2);if(canClose&&(closeTime+len)/total<=.16)add('close',2);}
    else{add('full',3);add('side',2);if(canClose&&(closeTime+len)/total<=.18&&len<=total*.08+12)add('close',4);add('wide',1);}
    if(fl.beside){for(const x of w)if(x[0]==='side')x[1]=0;else if(x[0]==='close')x[1]=Math.min(x[1],2);add('wide',2);}
    const sum=w.reduce((s,x)=>s+x[1],0);let r=R()*sum;kind=w.find(x=>(r-=x[1])<0)?.[0]||'full';
    if(a<firstLoud&&kind==='hero')kind='full';}
   {const f=(hints?.force||[]).find(h=>Math.min(t1,h.to)-Math.max(t0,h.from)>(t1-t0)*.5&&KINDS[h.kind]);if(f){kind=f.kind;forced=f;}}// per-song hint (stage-<id>.js)
   if(kind==='close')closeTime+=len;if(kind==='hero')lastHero=k;
   const kd=KINDS[kind],side=kind==='side'?(lastSide=-lastSide):(R()<.5?-1:1);
   // the move inside the shot: push-in, pull-out, orbit drift, crane - all slow and eased over the whole shot
   const mv=kind==='crane'?{dFrame:-.25,dCamY:k===0?-.9:-.55,dYaw:0}:kind==='wide'?(k===pieces.length-1?{dFrame:.45,dCamY:.25,dYaw:0}:{dFrame:R()<.5?-.25:.2,dCamY:0,dYaw:(R()-.5)*10}):
    kind==='full'?(R()<.5?{dFrame:-.16,dCamY:0,dYaw:0}:{dFrame:0,dCamY:0,dYaw:side*8}):kind==='hero'?{dFrame:-.12,dCamY:.08,dYaw:side*5}:kind==='side'?{dFrame:-.08,dCamY:0,dYaw:-side*9}:
    kind==='close'?{dFrame:-.12,dCamY:0,dYaw:side*6}:{dFrame:-.14,dCamY:.05,dYaw:0};
   // two players: a close-up is a two-shot of both (each iPad's own player must always be in frame); focus kept for later
   const focus=-1;
   const groupShot=kind==='wide'||kind==='crane',halfW=groupShot?(duoOn?1.1:.9):duoOn?(kind==='close'?1.0:.95):(kind==='close'?.45:.62);
   if(forced&&plan.length&&plan.at(-1).forced===forced){const p=plan.at(-1);p.t1=t1;p.bars+=b-a;last=kind;return;}
   plan.push({forced,kind,t0,t1,bars:b-a,energy:+e.toFixed(2),busy:+busyShare.toFixed(2),side,focus,halfW,group:groupShot,beside:fl.beside>0,yaw:kd.yaw*side,...kd,...mv});
   last=kind;});
  // the first shot also covers the count-in, the last one runs past the end
  if(plan.length){plan[0].t0=-1e9;plan.at(-1).t1=1e9;}
  const closeShare=plan.filter(s=>s.kind==='close').reduce((s,x)=>s+Math.min(x.t1,end)-Math.max(x.t0,bars[0]),0)/Math.max(1,end-bars[0]);
  info={slug,end:+end.toFixed(2),bars:nb,shots:plan.length,closeShare:+closeShare.toFixed(3),busyAt,duo:duoOn,kinds:plan.reduce((m,s)=>(m[s.kind]=(m[s.kind]||0)+1,m),{})};
  // Centre rotation: the players walk member paths and may stand at a side spot, right behind an arrow-ring column. Per 10 Hz
  // sample, the smallest pan (and at most 1.45x pull-out) that keeps every player's hips clear of the 4 ring zones and in frame;
  // smoothed inside each shot (never across a cut). players(t) -> [[x,hipsY,z],...]. Pure: a function of t only.
  if(typeof players==='function'){const DT=.1,T0=-2,n=Math.ceil((end+4-T0)/DT)+1,dx=new Float32Array(n),kz=new Float32Array(n).fill(1),dyA=new Float32Array(n),idx=new Int32Array(n);
   const RINGS=[[330/1180,560/820],[330/1180,710/820],[850/1180,560/820],[850/1180,710/820]],RR=124/1180,ASP=1180/820,DX=[0];for(let d=.05;d<=1.2001;d+=.05)DX.push(+d.toFixed(2),-d.toFixed(2));
   const proj=(o,p)=>{const fx=o.target[0]-o.pos[0],fy=o.target[1]-o.pos[1],fz=o.target[2]-o.pos[2],fl=Math.hypot(fx,fy,fz),f=[fx/fl,fy/fl,fz/fl];let r=[-f[2],0,f[0]];const rl=Math.hypot(r[0],r[2])||1;r=[r[0]/rl,0,r[2]/rl];const u=[r[1]*f[2]-r[2]*f[1],r[2]*f[0]-r[0]*f[2],r[0]*f[1]-r[1]*f[0]];
    const v=[p[0]-o.pos[0],p[1]-o.pos[1],p[2]-o.pos[2]],dz=v[0]*f[0]+v[1]*f[1]+v[2]*f[2],th=Math.tan(o.fov*DEG/2);if(dz<=.05)return null;return [.5+(v[0]*r[0]+v[1]*r[1]+v[2]*r[2])/(dz*th*ASP)/2,.5-(v[0]*u[0]+v[1]*u[1]+v[2]*u[2])/(dz*th)/2];};
   const bad=(o,ps)=>{let c=0;for(const p0 of ps)for(const sw of [-.1,0,.1]){const p=[p0[0]+sw,p0[1],p0[2]],q=proj(o,p);if(!q){c+=10;continue;}if(q[0]<.06||q[0]>.94)c+=3;if(o.kind!=='close'){const fq=proj(o,[p[0],.02,p[2]]);if(fq&&fq[1]>.975)c+=2;}for(const [x,y] of RINGS){const d=Math.hypot((q[0]-x)*ASP,q[1]-y)/ASP;if(d<RR)c+=1+(RR-d)*20;}}return c;};
   const tmp={pos:[0,0,0],target:[0,0,0],fov:30,kind:''};
   for(let i=0;i<n;i++){const t=T0+i*DT,o=shot(t,ASP);if(!o)continue;idx[i]=o.index;const hy=pathAt(rawY||pathY,t,.6),ps=(players(t)||[]).map(p=>[p[0],Math.min(p[1],hy+p[1]-.6),p[2]]);if(!ps.length||!bad(o,ps))continue;let best=null;
    for(const k of [1,1.15,1.3,1.45])for(const ay of [0,.1,.2,.3])for(const d of DX){tmp.fov=o.fov;tmp.kind=o.kind;for(let j=0;j<3;j++){const sh=j===0?d:j===1?-ay:0;tmp.target[j]=o.target[j]+sh;tmp.pos[j]=j===1?o.pos[1]+sh:tmp.target[j]+(o.pos[j]+sh-tmp.target[j])*k;}
     const c=bad(tmp,ps)*100+Math.abs(d)+2*(k-1)+1.5*ay;if(!best||c<best[0])best=[c,d,k,ay];if(best[0]<1e-9)break;}
    if(best){dx[i]=best[1];kz[i]=best[2];dyA[i]=best[3];}}
   const sm=(a,R)=>{const o=new Float32Array(a.length);for(let i=0;i<a.length;i++){let s=0,w=0;for(let k=-R;k<=R;k++){const j=i+k;if(j<0||j>=a.length||idx[j]!==idx[i])continue;const g=Math.exp(-.5*(k/(R/2))**2);s+=a[j]*g;w+=g;}o[i]=w?s/w:a[i];}return o;};
   // hold the worst need over +-0.6 s (a max filter) before smoothing, so the eased pan is complete when it is needed
   const hold=(a,R,f)=>{const o=new Float32Array(a.length);for(let i=0;i<a.length;i++){let m=a[i];for(let k=-R;k<=R;k++){const j=i+k;if(j<0||j>=a.length||idx[j]!==idx[i])continue;m=f(m,a[j]);}o[i]=m;}return o;};
   corr={t0:T0,dt:DT,dx:sm(hold(dx,6,(m,v)=>Math.abs(v)>Math.abs(m)?v:m),6),k:sm(hold(kz,6,Math.max),6),ay:sm(hold(dyA,6,Math.max),6),idx};info.ringFix=+(Array.from(dx).filter(v=>v).length*DT).toFixed(1);}
  return info;}
 // camera pose at song time t for a viewport aspect: {pos, target, fov, kind, close (0..1), shot index}
 const out={pos:[0,0,0],target:[0,0,0],fov:30,kind:'full',close:0,index:0,u:0};
 function shot(t,aspect=1.44){if(!plan.length)return null;
  let lo=0,hi=plan.length-1;while(lo<hi){const m=(lo+hi+1)>>1;if(plan[m].t0<=t)lo=m;else hi=m-1;}
  const s=plan[lo],a=Math.max(s.t0,-1),b=Math.min(s.t1,a+600),u=ease((t-(s.t0<-1e8?0:s.t0))/Math.max(1,(s.t1>1e8?b:s.t1)-(s.t0<-1e8?0:s.t0)));
  const lx=pathAt(path,t,0),ly=pathAt(pathY,t,.6);
  const gAt=k=>{if(!group)return k==='cx'||k==='cd'?0:k==='hw'?.9:0;const a=group[k],f=clamp((t-group.t0)/group.dt,0,a.length-1),i=Math.floor(f);return lerp(a[i],a[Math.min(i+1,a.length-1)],f-i);};
  // lead shots: on the lead (duo: the pair, or the focused player in a close-up); group shots: the group's centre
  let sx=s.group?gAt('cx'):duoOn?(s.focus>=0?slots[s.focus]:0)+lx:lx;
  let halfW=s.group?Math.max(s.halfW,gAt('hw')):s.beside&&s.kind!=='close'?Math.max(s.halfW,gAt('lw')):s.halfW;
  if(partnerX&&!s.group){const pp=[lx,partnerX(t)].sort((a,b)=>a-b);sx=s.focus>=0?pp[s.focus]:(pp[0]+pp[1])/2;halfW=Math.max(halfW,(pp[1]-pp[0])/2+.55);}
  if(s.kind==='arch')sx=lerp(lx,gAt('cx'),.4);
  const kneel=clamp((.6-ly)/.35,0,1);// a kneeling/crouching lead: aim lower
  // two players' close-up: a medium two-shot framed lower so both players' hips sit above the arrow rings
  const duoClose=duoOn&&s.kind==='close'?.3:0;
  const frame=s.frame+s.dFrame*u,camY=s.camY+s.dCamY*u-(s.kind==='close'?kneel*.35:kneel*.12),lookY=s.lookY-duoClose-(s.kind==='close'?kneel*.32:kneel*.1),yaw=(s.yaw+s.dYaw*u)*DEG;
  let aimDown=0;const tan=Math.tan(s.fov*DEG/2);let dist=Math.max(frame/2/tan,halfW/(tan*Math.max(.5,aspect)));
  if(corr){const f=clamp((t-corr.t0)/corr.dt,0,corr.dx.length-1),i=Math.floor(f),j=Math.min(i+1,corr.dx.length-1),w=corr.idx[j]===lo&&corr.idx[i]===lo?f-i:0,ci=corr.idx[i]===lo?i:j;sx+=lerp(corr.dx[ci],corr.dx[j],w);dist*=lerp(corr.k[ci],corr.k[j],w);aimDown=lerp(corr.ay[ci],corr.ay[j],w);}// centre rotation: players clear of the rings
  out.pos[0]=sx+Math.sin(yaw)*dist;out.pos[1]=camY-aimDown;out.pos[2]=Math.cos(yaw)*dist;
  out.target[0]=sx;out.target[1]=lookY-aimDown;out.target[2]=0;out.fov=s.fov;out.kind=s.kind;out.close=s.kind==='close'?1:0;out.index=lo;out.u=u;out.centre=gAt('cd');return out;}
 return {setSong,shot,get plan(){return plan;},get info(){return info;},crewAt};
}
