// Stage 'sju' for the song super-junior-u (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='sju';
export const tint={disc:0xbfb6a6,ring:0xffffff};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xfff4e8,rim:0xa0d8ff,sky:0xf4f4f4,gnd:0x404448,beam:0xd0f0ff,dust:0xf0f8ff,floor:0x18191c,gc:0xfafaf8,ge:0x505860,wall:.9};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// U (Super Junior, SpadeA Shenzhen cover, owner song queue 2026-11-11): a city plaza by day: pale blue sky, a skyline of
// office towers with a slender spired supertall in the middle, a band of trees, a glass railing, wide beige stone paving
// with a grid of small dark studs. Drawn in code: no photos, people, text or logos.
export function paint(c,{rect,path,glow,dot,line,rnd}){
 const H=585;
 const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#7fb0dc');sky.addColorStop(.55,'#a9cbe6');sky.addColorStop(1,'#d9e6ee');c.fillStyle=sky;c.fillRect(0,0,1600,H);
 glow(1250,90,420,'#ffffff',.25);
 // far towers: hazy blue-grey blocks
 for(let i=0;i<18;i++){const x=i*92+rnd()*40-20,w=40+rnd()*50,h=90+rnd()*150;rect(x,H-80-h,w,h+80,i%2?'#9fb2c4':'#aabccc');for(let y=H-74-h;y<H-60;y+=9)rect(x+3,y,w-6,1.5,'rgba(255,255,255,.18)');}
 // a glass tower: windows grid, slight reflections
 const tower=(x,y,w,body,frame,sh)=>{rect(x,y,w,H-y,body);for(let yy=y+8;yy<H-40;yy+=10)rect(x,yy,w,2,frame);for(let xx=x+6;xx<x+w;xx+=12)rect(xx,y,2,H-y,frame);rect(x+w,y+10,sh,H-y-10,'rgba(60,80,100,.35)');};
 // left: the big white grid office block (cut by the left edge) and a white slab tower with a dark band near the top
 tower(-40,40,250,'#e8ebee','rgba(150,160,170,.55)',22);for(let yy=180;yy<H-40;yy+=60)rect(60,yy,26,40,'rgba(60,70,80,.55)');
 tower(330,120,150,'#eef1f3','rgba(160,170,180,.55)',30);rect(330,190,150,10,'#8f8a7e');
 // middle: the slender supertall, tapering, with a spire
 path([[880,H],[880,170],[905,60],[930,40],[952,60],[975,170],[975,H]],'#7f9bb5');
 path([[930,40],[952,60],[975,170],[975,H],[945,H],[945,120]],'#5e7a95');
 for(let y=80;y<H;y+=14)line(882,y,973,y,'rgba(220,235,245,.35)',1);
 line(930,40,930,6,'#5e7a95',3);
 // right: dark glass towers and a green-glass block
 tower(1010,200,110,'#8ea6bb','rgba(70,90,110,.45)',18);tower(1160,250,90,'#a2b6c6','rgba(80,95,115,.4)',14);
 tower(1300,170,120,'#55718c','rgba(30,45,60,.45)',20);rect(1290,160,140,14,'#46607a');
 path([[1440,330],[1600,300],[1600,H],[1440,H]],'#6f9a86');for(let y=340;y<H;y+=12)line(1440,y,1600,y-(y<400?30*(1-(y-330)/70):0),'rgba(220,240,230,.25)',1);
 // trees along the far edge of the plaza
 for(let i=0;i<46;i++){const x=i*36+rnd()*20,y=H-70+rnd()*20,r=26+rnd()*20;dot(x,y,r,i%3?'#3f5a3a':'#4d6b44');}
 rect(0,H-40,1600,40,'#40573c');
 // glass railing: posts and a metal top bar, the trees seen through it
 rect(0,H-36,1600,30,'rgba(190,215,220,.28)');line(0,H-36,1600,H-36,'#d8dde0',3);for(let x=20;x<1600;x+=150)line(x,H-36,x,H-4,'rgba(220,226,230,.8)',2);
 // pavement: beige stone, lighter far away, small dark studs in a perspective grid, soft daylight
 const fl=c.createLinearGradient(0,H,0,1000);fl.addColorStop(0,'#cfc6b6');fl.addColorStop(.4,'#d9d0c0');fl.addColorStop(1,'#bfb5a3');c.fillStyle=fl;c.fillRect(0,H-4,1600,1004-H);
 for(let k=1;k<9;k++){const v=Math.pow(k/9,1.6),y=H+(1000-H)*v;for(let j=-12;j<=12;j++){const x=800+j*(70+900*v);if(x>-20&&x<1620)dot(x,y,1.2+3*v,'rgba(70,64,56,.55)');}}
 for(let i=0;i<300;i++)dot(rnd()*1600,H+rnd()*(1000-H),.8+rnd()*1.4,'rgba(255,255,255,.12)');
 const wash=c.createRadialGradient(800,760,40,800,760,700);wash.addColorStop(0,'rgba(255,250,235,.30)');wash.addColorStop(1,'rgba(255,250,235,0)');c.fillStyle=wash;c.fillRect(0,H,1600,1000-H);
 line(0,H-4,1600,H-4,'rgba(255,255,255,.5)',2);
}
