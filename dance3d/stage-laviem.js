// Stage 'laviem' for the song laviem (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='laviem';
export const tint={disc:0xe8c4cf,ring:0xfff1f4};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xfff2f0,rim:0xffb0c8,sky:0xfff0f4,gnd:0x5a4048,beam:0xffd0e0,dust:0xfff0f4,floor:0x261820,gc:0xfff6f4,ge:0x7a5060,wall:.9};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// LAVIEM (Tinh Hà Say Hi stage, owner 2026-11-11): a pastel courtroom: lilac-pink palace front with mint pilasters and arched
// windows, a big green heart arch crowned by golden scales in the middle, peach jury benches with green heart outlines on both
// sides, two pink broken hearts, warm spotlights from above, a glossy black floor with reflections. No text or logos.
export function paint(c,{rect,path,glow,dot,line,rnd}){
 const H=585;
 const top=c.createLinearGradient(0,0,0,H);top.addColorStop(0,'#0c0a12');top.addColorStop(.25,'#2a2230');top.addColorStop(1,'#4a3c48');c.fillStyle=top;c.fillRect(0,0,1600,H);
 // palace front: pink wall, mint pilasters, arched windows, cornice
 path([[60,150],[1540,150],[1600,H],[0,H]],'#d9b7c4');rect(40,128,1520,26,'#c3a1b0');rect(40,120,1520,10,'#a7d6c2');
 for(let i=0;i<12;i++){const x=100+i*125;rect(x,154,26,H-154,'#9fd0bb');rect(x-4,154,34,12,'#c7eadb');rect(x-4,H-30,34,30,'#8cbfa9');
  if(i<11){const wx=x+44,wy=230,ww=56,wh=150;c.fillStyle='#efe4ea';c.beginPath();c.moveTo(wx,wy+wh);c.lineTo(wx,wy+ww/2);c.arc(wx+ww/2,wy+ww/2,ww/2,Math.PI,0);c.lineTo(wx+ww,wy+wh);c.closePath();c.fill();
   c.fillStyle='#b9a7c9';c.beginPath();c.moveTo(wx+5,wy+wh-4);c.lineTo(wx+5,wy+ww/2);c.arc(wx+ww/2,wy+ww/2,ww/2-5,Math.PI,0);c.lineTo(wx+ww-5,wy+wh-4);c.closePath();c.fill();
   line(wx+ww/2,wy+6,wx+ww/2,wy+wh-4,'#efe4ea',3);line(wx+5,wy+80,wx+ww-5,wy+80,'#efe4ea',3);dot(wx+ww/2,wy-14,6,'#e7889a');glow(wx+ww/2,wy-14,22,'#ffd0b0',.5);}}
 // central pediment + green heart arch with golden scales
 path([[640,150],[960,150],[800,70]],'#cfe9dc');path([[660,150],[940,150],[800,86]],'#e9c9d4');
 c.lineWidth=46;c.strokeStyle='#9cc95a';c.beginPath();c.moveTo(800,520);c.bezierCurveTo(560,360,600,190,740,215);c.bezierCurveTo(780,222,800,250,800,270);c.bezierCurveTo(800,250,820,222,860,215);c.bezierCurveTo(1000,190,1040,360,800,520);c.stroke();
 c.lineWidth=10;c.strokeStyle='#c4e483';c.stroke();
 line(800,150,800,250,'#e2c27a',6);line(730,180,870,180,'#e2c27a',5);dot(800,146,10,'#efd38c');
 for(const x of [735,865]){line(x,180,x-18,228,'#e2c27a',2);line(x,180,x+18,228,'#e2c27a',2);c.strokeStyle='#e2c27a';c.lineWidth=4;c.beginPath();c.moveTo(x-22,228);c.quadraticCurveTo(x,248,x+22,228);c.stroke();}
 glow(800,200,160,'#fff0c8',.25);
 // the judge's desk and two green balls on columns
 rect(690,420,220,110,'#f0c9a0');rect(690,420,220,12,'#f7dcc0');for(const x of [640,960]){rect(x-18,330,36,200,'#e9d6a8');dot(x,320,30,'#b9dc8e');dot(x,272,24,'#e8c79a');}
 // jury benches on both sides, peach with green heart outlines, stepping back in perspective
 for(const s of [-1,1]){for(let r=0;r<3;r++){const y0=380+r*48,x0=s<0?60+r*30:1540-r*30,x1=s<0?560-r*20:1040+r*20,a=Math.min(x0,x1),b=Math.max(x0,x1);
   rect(a,y0,b-a,40,r%2?'#f2c9a2':'#f6d6b3');rect(a,y0,b-a,6,'#fbe6cc');rect(a,y0+34,b-a,6,'#9ccf72');
   for(let x=a+40;x<b-30;x+=90){c.strokeStyle='#8fc463';c.lineWidth=4;c.beginPath();const hx=x,hy=y0+20;c.moveTo(hx,hy+9);c.bezierCurveTo(hx-14,hy,hx-10,hy-10,hx,hy-4);c.bezierCurveTo(hx+10,hy-10,hx+14,hy,hx,hy+9);c.stroke();}}}
 // pink broken hearts on the floor line
 for(const [x,y,sz] of [[470,520,52],[1130,520,52]]){c.fillStyle='#f2a9b8';c.beginPath();c.moveTo(x,y+sz*.9);c.bezierCurveTo(x-sz*1.2,y+sz*.1,x-sz*.6,y-sz*.7,x,y-sz*.2);c.bezierCurveTo(x+sz*.6,y-sz*.7,x+sz*1.2,y+sz*.1,x,y+sz*.9);c.fill();
  c.strokeStyle='#f7e3a4';c.lineWidth=5;c.beginPath();c.moveTo(x,y-sz*.2);c.lineTo(x-8,y+sz*.15);c.lineTo(x+8,y+sz*.4);c.lineTo(x,y+sz*.9);c.stroke();}
 // warm spotlights from the rig
 for(const x of [240,520,800,1080,1360]){const g=c.createLinearGradient(x,0,x,H);g.addColorStop(0,'rgba(255,240,205,.30)');g.addColorStop(1,'rgba(255,240,205,0)');path([[x-14,0],[x+14,0],[x+120,H],[x-120,H]],g);dot(x,8,7,'#fff6e2');glow(x,10,40,'#fff2d2',.8);}
 // glossy black floor: soft reflections of the pink set and the lights
 const fl=c.createLinearGradient(0,H,0,1000);fl.addColorStop(0,'#2c2228');fl.addColorStop(.35,'#17121a');fl.addColorStop(1,'#0c0a0e');c.fillStyle=fl;c.fillRect(0,H,1600,1000-H);
 for(let i=0;i<12;i++){const x=100+i*125;const g=c.createLinearGradient(0,H,0,H+220);g.addColorStop(0,'rgba(159,208,187,.30)');g.addColorStop(1,'rgba(159,208,187,0)');rect(x,H,26,220,g);}
 const pk=c.createLinearGradient(0,H,0,H+260);pk.addColorStop(0,'rgba(217,183,196,.35)');pk.addColorStop(1,'rgba(217,183,196,0)');c.fillStyle=pk;c.fillRect(0,H,1600,260);
 const wash=c.createRadialGradient(800,760,40,800,760,640);wash.addColorStop(0,'rgba(255,225,200,.22)');wash.addColorStop(1,'rgba(255,225,200,0)');c.fillStyle=wash;c.fillRect(0,H,1600,1000-H);
 for(let i=0;i<60;i++)dot(rnd()*1600,H+40+rnd()*380,1+rnd()*2.4,'rgba(255,255,255,.55)');
 line(0,H+1,1600,H+1,'rgba(255,220,230,.45)',2);
 const vig=c.createRadialGradient(800,620,300,800,620,1050);vig.addColorStop(0,'rgba(8,5,10,0)');vig.addColorStop(1,'rgba(8,5,10,.42)');c.fillStyle=vig;c.fillRect(0,0,1600,1000);
}
