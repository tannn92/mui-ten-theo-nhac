// Stage 'jf' for the song jisoo-flower (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='jf';
export const tint={disc:0xb8bec4,ring:0xf2eee8};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xfff6f0,rim:0xffd0a0,sky:0xfff0e8,gnd:0x4a4040,beam:0xffe0c0,dust:0xfff0d8,floor:0x221c1e,gc:0xfff8f0,ge:0x6a5a5a,wall:.88};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// 꽃 (FLOWER) (JISOO, official MV, 2026-11-14): the main dance set of the first chorus (MV 1:05-1:33), an old European street by
// day under a pale overcast sky: tall pale-stone neoclassical buildings, fluted columns at the front left, a cream palace at the end
// of the street (balustrade, rows of windows, paired columns, a dark arched door), a red-brown stone building on the right, teal
// lamp posts, a dark green vintage car and a pot of pink-red flowers far off, grey asphalt with white petals scattered on it.
// Drawn in code: no photos, people, text or logos.
export function paint(c,{rect,path,glow,dot,line,rnd}){
 const H=560,VX=820,VY=470;
 // sky: pale overcast blue-grey
 const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#c9d3dc');sky.addColorStop(1,'#e4e8ea');c.fillStyle=sky;c.fillRect(0,0,1600,H);
 // the cream palace at the end of the street
 const P0=560,P1=1150,PT=150;
 rect(P0,PT,P1-P0,H-PT,'#e9e4da');rect(P0-10,PT-18,P1-P0+20,22,'#d9d2c4');
 for(let x=P0;x<P1;x+=16)rect(x+4,PT-44,6,26,'#e2dccf');rect(P0-10,PT-50,P1-P0+20,8,'#d4ccbd');// balustrade
 rect(760,PT-110,280,62,'#e6e0d4');path([[740,PT-110],[900,PT-150],[1060,PT-110]],'#ddd6c8');// raised centre + pediment
 for(const y of [PT+30,PT+110])for(let x=P0+30;x<P1-30;x+=62){if(x>820&&x<980&&y>PT+60)continue;rect(x,y,26,40,'#8c9aa6');rect(x-3,y-6,32,6,'#d2cabb');rect(x+12,y,2,40,'#d8d2c6');}
 for(const x of [800,840,960,1000]){rect(x,PT+150,18,H-PT-150,'#f1ece2');rect(x,PT+150,5,H-PT-150,'#cfc7b8');}
 path([[860,H],[860,PT+230],[880,PT+200],[900,PT+192],[920,PT+200],[940,PT+230],[940,H]],'#4a4f55');// arched door
 rect(842,PT+170,116,22,'#7a6e5a');// carved panel over the door (plain)
 // left: tall pale stone building with arched windows, receding to the palace
 path([[330,0],[P0,PT-60],[P0,H],[330,H+30]],'#ddd8cf');
 for(let k=0;k<4;k++){const x=360+k*52,s=1-k*.15;rect(x,210+k*14,26*s,60*s,'#7f8c97');path([[x,210+k*14],[x+13*s,196+k*14],[x+26*s,210+k*14]],'#7f8c97');rect(x,330+k*10,26*s,50*s,'#7f8c97');}
 // front left: huge fluted columns on a stone base
 rect(0,0,330,H+40,'#e2ddd4');
 for(const x of [20,140,250]){const g=c.createLinearGradient(x,0,x+90,0);g.addColorStop(0,'#b9b2a6');g.addColorStop(.45,'#f3efe8');g.addColorStop(1,'#c4bdb0');c.fillStyle=g;c.fillRect(x,0,90,H-60);for(let f=8;f<90;f+=12)rect(x+f,0,2,H-60,'rgba(120,110,95,.25)');rect(x-10,H-70,110,30,'#d3ccbf');}
 rect(0,H-40,330,60,'#cfc8bb');
 // right: red-brown stone building receding, dark windows and a cornice
 path([[1150,PT-40],[1600,0],[1600,H+40],[1150,H]],'#9a7a6c');path([[1150,PT-40],[1600,0],[1600,30],[1150,PT-24]],'#7d6155');
 for(let k=0;k<5;k++){const x=1180+k*80+k*k*6,w=26+k*8,top=PT-10-k*28;for(const y of [top+40,top+150,top+260])rect(x,y,w,50+k*10,'#3e3c40');}
 for(let k=0;k<4;k++)rect(1200+k*95+k*k*8,PT+20-k*30,8+k*3,H-PT-20+k*40,'#b49386');
 // teal lamp posts and a far dark green vintage car, a pot of pink-red flowers
 for(const[x,h,w] of [[300,330,8],[520,190,5],[1180,210,5]]){rect(x,H-h,w,h,'#4f7f7c');dot(x+w/2,H-h-8,w*1.6,'#e8ecea');}
 path([[650,H-6],[656,H-30],[690,H-44],[730,H-44],[756,H-30],[770,H-6]],'#1f3a33');dot(668,H-4,9,'#151617');dot(752,H-4,9,'#151617');rect(690,H-40,36,10,'#9fb2b0');
 rect(470,H-30,40,26,'#6c5e52');for(let k=0;k<16;k++)dot(474+rnd()*32,H-36-rnd()*20,5+rnd()*3,['#d8506a','#f08aa0','#c02a40','#f2c0c8'][k%4]);
 glow(VX,VY-120,520,'#ffffff',.18);
 // street: grey asphalt in perspective, pale curbs converging, white petals scattered
 const fl=c.createLinearGradient(0,H,0,1000);fl.addColorStop(0,'#a9b0b5');fl.addColorStop(1,'#8e969c');c.fillStyle=fl;c.fillRect(0,H,1600,440);
 path([[0,H+40],[560,H],[600,H],[0,H+150]],'#c3c4c0');path([[1600,H+40],[1150,H],[1110,H],[1600,H+150]],'#b9b6b0');
 for(let k=0;k<60;k++){c.save();c.globalAlpha=.07;dot(rnd()*1600,H+rnd()*440,10+rnd()*40,'#5d656b');c.restore();}
 for(let k=0;k<170;k++){const y=H+6+rnd()*434;dot(rnd()*1600,y,1.2+rnd()*(1+(y-H)/160),['#f4f2ee','#e9e6e0','#ffffff'][k%3]);}
}
