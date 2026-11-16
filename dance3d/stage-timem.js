// Stage 'timem' for the song tim-em (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='timem';
export const tint={disc:0xa9c8e8,ring:0xf2fbff};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xf4f8ff,rim:0x9fd8ff,sky:0xeef6ff,gnd:0x3a4a5a,beam:0xc0e8ff,dust:0xe8f6ff,floor:0x141e2a,gc:0xf6faff,ge:0x4a6080,wall:.9};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// Tìm em: the B-Wild Christmas clip's night plaza (owner 2026-11-11): a lit hotel tower against the black sky, a modern mall
// in perspective on the right with warm glowing panels, dark trees and café lights on the left, cyan spotlights on stands
// and wide stone pavement washed in blue light. Drawn in code: no photos, people, signs or logos.
export function paint(c,{rect,path,glow,dot,line,rnd}){
 const H=585;
 const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#05070d');sky.addColorStop(.7,'#0d1220');sky.addColorStop(1,'#1b2235');c.fillStyle=sky;c.fillRect(0,0,1600,H);
 for(let i=0;i<22;i++)dot(rnd()*1600,rnd()*200,.5+rnd()*.8,'rgba(210,220,255,.45)');
 // far skyline: low towers with a few lit windows
 for(let i=0;i<9;i++){const x=330+i*70+rnd()*30,w=34+rnd()*36,h=60+rnd()*120;rect(x,H-60-h,w,h+60,'#141a2a');for(let k=0;k<10;k++)if(rnd()<.6)rect(x+4+rnd()*(w-10),H-55-h+rnd()*h,3,2,'rgba(255,214,150,.65)');}
 // the hotel tower behind the mall: a dark slab dotted with warm windows, a lit crown
 const tx=600,tw=230,tt=95;rect(tx,tt,tw,H-tt,'#1a1d29');rect(tx+tw,tt+20,38,H-tt-20,'#12141d');
 for(let y=tt+18;y<H-70;y+=11)for(let x=tx+10;x<tx+tw-8;x+=9){const r=rnd();if(r<.72)rect(x,y,4,5,r<.12?'rgba(255,246,220,.95)':r<.5?'rgba(255,214,140,.75)':'rgba(255,190,110,.45)');}
 rect(tx-6,tt-10,tw+12,12,'#2a2d3a');glow(tx+tw/2,tt-4,170,'#ffe2a6',.30);for(let x=tx;x<=tx+tw;x+=12)dot(x,tt-4,1.8,'#fff3d4');
 // the mall on the right: cream stone blocks in perspective, warm backlit slatted panels, glass with blue light at the base
 path([[930,175],[1600,40],[1600,H],[930,H]],'#cfc6b5');
 path([[930,175],[1040,153],[1040,H],[930,H]],'#bdb3a1');
 for(const [x0,x1,yTop0,yTop1,yBot] of [[955,1030,205,190,470],[1110,1290,165,128,450],[1370,1560,110,72,440]]){
  const g=c.createLinearGradient(x0,0,x1,0);g.addColorStop(0,'#ffdf9c');g.addColorStop(.5,'#fff0c4');g.addColorStop(1,'#f3c776');path([[x0,yTop0],[x1,yTop1],[x1,yBot],[x0,yBot]],g);
  for(let k=1;k<14;k++){const x=x0+(x1-x0)*k/14;line(x,yTop0+(yTop1-yTop0)*k/14,x,yBot,'rgba(170,120,60,.35)',1.5);}
  glow((x0+x1)/2,(yTop0+yBot)/2,(x1-x0)*1.1,'#ffd27e',.35);}
 rect(930,470,670,115,'#1e2a3d');for(let x=945;x<1600;x+=58){rect(x,482,44,92,'#2f4766');glow(x+22,530,40,'#79c8ff',.30);}
 rect(930,466,670,6,'#e8e0d2');
 // a warm accent sign glow on the facade (no letters)
 glow(1180,300,46,'#ff8a3c',.55);dot(1180,300,12,'#ff9e52');glow(1180,330,60,'#ffb070',.25);
 // left: dark trees, a café terrace with umbrellas and fairy lights
 for(let i=0;i<5;i++){const x=40+i*120+rnd()*30,y=330+rnd()*40,s=.8+rnd()*.5;line(x,H,x,y+40,'#1b1f20',8*s);for(let j=0;j<10;j++){const a=j/10*Math.PI*2;dot(x+Math.cos(a)*62*s,y+Math.sin(a)*40*s,36*s,j%3?'#0f1a17':'#16241f');}}
 for(const x of [90,260,430]){path([[x-60,470],[x+60,470],[x,438]],'#d9d4c8');line(x,470,x,540,'#8a8478',3);}
 for(let i=0;i<40;i++){const u=i/39,x=20+u*560,y=455+18*Math.sin(u*Math.PI*3);glow(x,y,10,'#ffe4b0',.5);dot(x,y,1.6,'#fff4d8');}
 rect(0,520,600,65,'#1b2030');for(let x=10;x<600;x+=70){rect(x,530,50,30,'rgba(255,210,150,.25)');}
 // cyan spotlights on stands at both sides
 for(const [x,y] of [[230,470],[880,500],[1320,482]]){line(x,y,x-14,H+6,'#2a2f3a',2);line(x,y,x+14,H+6,'#2a2f3a',2);rect(x-9,y-12,18,14,'#c9f1ff');glow(x,y-5,90,'#7fe0ff',.65);glow(x,y-5,26,'#ffffff',.9);}
 // pavement: grey stone squares washed in blue, brighter in the middle where the dancers stand
 const fl=c.createLinearGradient(0,H,0,1000);fl.addColorStop(0,'#4a6a8e');fl.addColorStop(.3,'#3d6290');fl.addColorStop(1,'#2a3f5e');c.fillStyle=fl;c.fillRect(0,H,1600,1000-H);
 const wash=c.createRadialGradient(800,760,40,800,760,700);wash.addColorStop(0,'rgba(140,200,255,.38)');wash.addColorStop(1,'rgba(140,200,255,0)');c.fillStyle=wash;c.fillRect(0,H,1600,1000-H);
 for(let x=-2400;x<=4000;x+=160)line(800,H,x,1000,'rgba(200,225,255,.12)',1.5);
 for(let k=1;k<10;k++){const y=H+(1000-H)*Math.pow(k/10,1.6);line(0,y,1600,y,'rgba(200,225,255,.11)',1.5);}
 for(const [x,col] of [[1100,'rgba(255,214,140,.16)'],[1300,'rgba(255,214,140,.14)'],[230,'rgba(127,224,255,.16)']])path([[x-40,H],[x+40,H],[x+120,1000],[x-120,1000]],col);
 line(0,H+1,1600,H+1,'rgba(200,230,255,.5)',2);
 const vig=c.createRadialGradient(800,620,300,800,620,1050);vig.addColorStop(0,'rgba(5,8,16,0)');vig.addColorStop(1,'rgba(5,8,16,.40)');c.fillStyle=vig;c.fillRect(0,0,1600,1000);
}
