// Stage 'sounds' for the song what-it-sounds-like (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='sounds';
export const tint={disc:0xf0d2ea,ring:0xffffff};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xfff4fa,rim:0xe0a0ff,sky:0xfff0fa,gnd:0x58486a,beam:0xf0c8ff,dust:0xfff0ff,floor:0x221a2a,gc:0xfff8fc,ge:0x705a80,wall:.92};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// What It Sounds Like: a dreamy pastel sky (owner 2026-11-10 picture): periwinkle to pink, big soft light orbs, a cloud bank
// on the horizon and a pearly floor with a faint rainbow sheen. Drawn in code: no photos, people or logos.
export function paint(c,{rect,path,glow,dot,line,rnd}){
 const H=590,cx=800;
 const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#93a9e6');sky.addColorStop(.42,'#c3b5ee');sky.addColorStop(.78,'#efc4e6');sky.addColorStop(1,'#fbdcee');c.fillStyle=sky;c.fillRect(0,0,1600,H);
 // soft light from above
 c.save();c.globalCompositeOperation='lighter';
 for(let i=0;i<9;i++){const x=200+i*150+rnd()*60,w=40+rnd()*50;const g=c.createLinearGradient(x,0,x,H);g.addColorStop(0,'rgba(255,255,255,.09)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.beginPath();c.moveTo(x-w*.4,0);c.lineTo(x+w*.4,0);c.lineTo(x+w*1.6,H);c.lineTo(x-w*1.6,H);c.closePath();c.fill();}
 c.restore();
 // big blurred light orbs (bokeh) and tiny sparkles
 for(let i=0;i<16;i++){const x=rnd()*1600,y=40+rnd()*480,r=35+rnd()*85;glow(x,y,r,'#ffffff',.22+rnd()*.25);glow(x,y,r*.45,'#fff6fb',.25);}
 for(let i=0;i<10;i++){const x=rnd()*1600,y=60+rnd()*450,r=20+rnd()*40;glow(x,y,r,i%2?'#ffd2ec':'#cfe2ff',.35);}
 for(let i=0;i<55;i++)dot(rnd()*1600,rnd()*560,.7+rnd()*1.6,'rgba(255,255,255,.8)');
 for(let i=0;i<14;i++){const x=rnd()*1600,y=70+rnd()*460,k=4+rnd()*7;c.save();c.globalAlpha=.85;c.fillStyle='#ffffff';c.beginPath();c.moveTo(x,y-k);c.lineTo(x+k*.22,y-k*.22);c.lineTo(x+k,y);c.lineTo(x+k*.22,y+k*.22);c.lineTo(x,y+k);c.lineTo(x-k*.22,y+k*.22);c.lineTo(x-k,y);c.lineTo(x-k*.22,y-k*.22);c.closePath();c.fill();c.restore();}
 // cloud bank along the horizon
 for(let layer=0;layer<3;layer++)for(let i=0;i<22;i++){const x=-40+i*80+rnd()*40,y=H-28-layer*26+rnd()*14,r=38+rnd()*46-layer*8;c.save();c.globalAlpha=.30+layer*.12;c.fillStyle=layer===2?'#ffffff':layer?'#fbe6f4':'#f2d9f0';c.beginPath();c.arc(x,y,r,Math.PI,0);c.fill();c.restore();}
 glow(cx,H-20,520,'#ffffff',.35);
 // pearly floor with a faint rainbow sheen; a little deeper lilac at the front so the tap rings stand out
 const fl=c.createLinearGradient(0,H,0,1000);fl.addColorStop(0,'#fbe7f3');fl.addColorStop(.35,'#e3cdec');fl.addColorStop(1,'#b5a2d6');c.fillStyle=fl;c.fillRect(0,H,1600,1000-H);
 c.save();c.globalAlpha=.16;
 [['#ffb8dc',0],['#b8d8ff',1],['#c8f3e2',2]].forEach(([col,k])=>{path([[300+k*260,H],[420+k*260,H],[150+k*420,1000],[-30+k*420,1000]],col);path([[1300-k*260,H],[1180-k*260,H],[1450-k*420,1000],[1630-k*420,1000]],col);});
 c.restore();
 const rf=c.createLinearGradient(0,H,0,1000);rf.addColorStop(0,'rgba(255,255,255,.75)');rf.addColorStop(1,'rgba(255,255,255,0)');path([[cx-150,H],[cx+150,H],[cx+330,1000],[cx-330,1000]],rf);
 for(let x=-1600;x<=3200;x+=200)line(cx,H,x,1000,'rgba(255,255,255,.16)',2);
 for(const y of [640,720,840])line(0,y,1600,y,'rgba(255,255,255,.12)',2);
 line(0,H+1,1600,H+1,'rgba(255,255,255,.9)',3);
}
