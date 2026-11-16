// Stage 'ddudu' for the song ddu-du-ddu-du (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='ddudu';
export const tint={disc:0xc9a3c8,ring:0xffe8f4};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xfff0f0,rim:0xff5a8a,sky:0xffe2ea,gnd:0x4a3040,beam:0xff6f9f,dust:0xffc8d8,floor:0x1e1018,gc:0xfff2f2,ge:0x7a4060,wall:.85};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// DDU-DU DDU-DU (BLACKPINK, official MV, 2026-11-14): the main dance set of the final chorus (MV 2:50-3:24): a temple of
// neon-painted roof eaves: two red pointed-arch eaves sweep from the top centre down to the floor at both sides, lined with
// rafters painted in red / teal / pink bands with dot rows (dancheong-like); in the middle a stepped pyramid of nested neon
// outlines (pink, orange, teal, blue, violet) with a glowing pale triangle at its foot; a black mirror floor reflecting it,
// purple haze at the sides. Drawn in code: no photos, people, text or logos.
export function paint(c,{rect,path,glow,dot,line,rnd}){
 const H=610,CX=800;
 c.fillStyle='#0b0716';c.fillRect(0,0,1600,1000);
 glow(800,380,820,'#3a1450',.55);glow(140,420,360,'#6a3cc8',.30);glow(1460,420,360,'#6a3cc8',.30);glow(800,330,420,'#ff2f6a',.18);
 // the eaves: an arch edge from the top centre to each lower side, rafters radiating outwards from the edge
 const edge=(s,t)=>{const x=CX+s*(40+760*Math.pow(t,.85)),y=-30+(H+10)*Math.pow(t,1.35);return [x,y];};
 const band=['#d91e3c','#ff3b5c','#19c7d6','#ff4fa8','#f2c14a','#2b6be0'];
 for(const s of [-1,1]){
  for(let k=0;k<34;k++){const t0=k/34,t1=(k+.72)/34,[x0,y0]=edge(s,t0),[x1,y1]=edge(s,t1),L=240+130*Math.sin(t0*Math.PI),dx=s*.55,dy=-.83,
    p=[[x0,y0],[x1,y1],[x1+dx*L,y1+dy*L*.55+L*.25],[x0+dx*L,y0+dy*L*.55+L*.25]];
   path(p,k%2?'#c8173a':'#e0244a');
   // painted bands along the rafter: teal / pink / gold stripes and a dot row near the tip
   for(const [f,col] of [[.16,'#19c7d6'],[.30,'#19c7d6'],[.44,'#ff4fa8'],[.58,'#19c7d6'],[.72,'#f2c14a'],[.84,'#19c7d6']]){const a=[x0+dx*L*f,y0+(dy*.55+.25)*L*f],b=[x1+dx*L*f,y1+(dy*.55+.25)*L*f];line(a[0],a[1],b[0],b[1],col,7);}
   const tip=[(x0+x1)/2+dx*L*.9,(y0+y1)/2+(dy*.55+.25)*L*.9];dot(tip[0],tip[1],4,'#ffe6a0');}
  // the arch edge itself: a thick red beam with a gold line and a row of studs
  for(let k=0;k<60;k++){const [xa,ya]=edge(s,k/60),[xb,yb]=edge(s,(k+1)/60);line(xa,ya,xb,yb,'#a80f2c',26);line(xa,ya,xb,yb,'#ff6a3d',4);if(k%2===0)dot(xa+s*6,ya+8,3.5,'#ffd27a');}
 }
 // inner wall between the eaves: violet with stepped neon outlines forming the pyramid/diamond
 const tri=(w,h,col,lw)=>{c.save();c.strokeStyle=col;c.lineWidth=lw;c.beginPath();const top=150+(560-h),st=8;
  // stepped edges: the pyramid's sides go up in steps
  c.moveTo(CX-w,H-10);for(let i=0;i<st;i++){const x=CX-w+(w/st)*i,y=H-10-(H-10-top)*(i/st);c.lineTo(x,y-(H-10-top)/st);c.lineTo(x+w/st,y-(H-10-top)/st);}
  for(let i=st-1;i>=0;i--){const x=CX+w-(w/st)*i,y=H-10-(H-10-top)*(i/st);c.lineTo(x,y-(H-10-top)/st);c.lineTo(x,y);}c.stroke();c.restore();};
 c.save();c.globalAlpha=.85;path([[CX-330,H],[CX,150],[CX+330,H]],'#3b1a5c');c.restore();
 const cols=['#ff4fa8','#ff7a2f','#19c7d6','#2b6be0','#c45cff','#ffd24a','#ff3b5c'];
 for(let k=0;k<9;k++){const w=330-k*32,h=420-k*40;glow(CX,H-60-k*20,30,cols[k%7],.05);tri(w,h,cols[k%7],7);}
 // the glowing pale triangle at the pyramid's foot, framed by teal
 path([[CX-78,H-6],[CX,H-150],[CX+78,H-6]],'#19c7d6');path([[CX-58,H-12],[CX,H-122],[CX+58,H-12]],'#ffe9f2');glow(CX,H-60,140,'#ffd6ea',.45);
 for(let k=1;k<4;k++)line(CX-58+k*10,H-12-k*28,CX+58-k*10,H-12-k*28,'rgba(255,120,180,.55)',2);
 // ornaments: small gold cloud scrolls either side of the triangle
 for(const s of [-1,1]){for(let k=0;k<3;k++){c.save();c.strokeStyle='#ffd24a';c.lineWidth=3;c.beginPath();c.arc(CX+s*(120+k*18),H-170-k*6,10,0,Math.PI*1.5);c.stroke();c.restore();}}
 // black mirror floor: the pyramid and eaves reflected faintly, glossy streaks
 rect(0,H,1600,400,'#07050c');
 c.save();c.globalAlpha=.20;path([[CX-330,H],[CX,H+260],[CX+330,H]],'#ff4fa8');c.globalAlpha=.16;path([[CX-160,H],[CX,H+140],[CX+160,H]],'#19c7d6');c.restore();
 for(const s of [-1,1]){c.save();c.globalAlpha=.18;for(let k=0;k<8;k++){const x=CX+s*(420+k*50);line(x,H+6,x+s*80,H+200,k%2?'#ff3b5c':'#19c7d6',6);}c.restore();}
 for(let k=0;k<14;k++){c.save();c.globalAlpha=.06+rnd()*.06;line(200+rnd()*1200,H+20+rnd()*300,200+rnd()*1200,H+20+rnd()*300,'#ffffff',2);c.restore();}
 glow(CX,H+30,420,'#ff6aa8',.14);
 const pool=c.createRadialGradient(800,720,40,800,720,600);pool.addColorStop(0,'rgba(255,235,245,.16)');pool.addColorStop(1,'rgba(255,235,245,0)');c.fillStyle=pool;c.fillRect(0,300,1600,700);
}
