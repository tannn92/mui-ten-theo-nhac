// Stage 'ktl' for the song kill-this-love (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='ktl';
export const tint={disc:0xd8a6b0,ring:0xfff0f2};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xfff2ea,rim:0xff6a6a,sky:0xffe8e4,gnd:0x4a2a34,beam:0xff8a8a,dust:0xffd8c8,floor:0x24121a,gc:0xfff4ee,ge:0x7a3a4a,wall:.85};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// Kill This Love (BLACKPINK, official MV, 2026-11-14): the main dance set of the final chorus (MV 2:50-3:08), a red palace
// hall seen down its length: pink-red carved walls and two great dark-red vault arches sweeping in from the top corners, a
// glowing pink-cloud painted ceiling panel in a gold frame, at the far end a blue-lit arch with white organ pipes, gothic
// stained-glass windows glowing amber with wall sconces on both sides, red banners, black stepped platforms at the back and
// an ivory glossy runway down the middle of a black mirror floor. Drawn in code: no photos, people, text or logos.
export function paint(c,{rect,path,glow,dot,line,rnd}){
 const H=600,VX=800,VY=330;
 // walls: deep pink-red, darker towards the edges
 const wall=c.createLinearGradient(0,0,1600,0);wall.addColorStop(0,'#5a0e22');wall.addColorStop(.28,'#b8344f');wall.addColorStop(.5,'#d65a72');wall.addColorStop(.72,'#b8344f');wall.addColorStop(1,'#5a0e22');c.fillStyle=wall;c.fillRect(0,0,1600,H);
 // ceiling panel: a trapezoid of pink-violet painted clouds in a gold-brown frame
 const cp=[[470,40],[1130,40],[1010,190],[590,190]];path([[400,0],[1200,0],[1060,215],[540,215]],'#6b3a24');path([[430,14],[1170,14],[1040,205],[560,205]],'#a8743c');
 const sky=c.createLinearGradient(0,40,0,190);sky.addColorStop(0,'#ff6fb5');sky.addColorStop(.5,'#c75ad8');sky.addColorStop(1,'#ff9a9e');c.fillStyle=sky;c.beginPath();cp.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
 c.save();c.beginPath();cp.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();for(let k=0;k<26;k++)glow(480+rnd()*640,50+rnd()*140,30+rnd()*50,k%3?'#ffd1ec':'#8a4fd8',.35);c.restore();
 glow(VX,120,380,'#ff7ac0',.25);
 // carved wall ornament: faint scroll rings on both walls
 for(let k=0;k<40;k++){const s=k%2?1:-1,x=VX+s*(260+rnd()*480),y=60+rnd()*420;c.save();c.globalAlpha=.16;c.strokeStyle='#ffd0da';c.lineWidth=2;c.beginPath();c.arc(x,y,10+rnd()*22,0,Math.PI*(1+rnd()));c.stroke();c.restore();}
 // far end: pale frame, a blue-lit arch with white organ pipes
 rect(VX-190,170,380,H-170,'#e9b9c4');path([[VX-150,H],[VX-150,280],[VX,190],[VX+150,280],[VX+150,H]],'#2a74c9');glow(VX,330,200,'#8fd0ff',.55);
 for(let k=0;k<17;k++){const x=VX-128+k*16,h=110+70*Math.sin(Math.PI*(k/16))+(k%2?-18:0),top=H-50-h-60;rect(x,top,11,H-50-top,'#f4f6fb');rect(x+7,top,3,H-50-top,'#b8c4d8');dot(x+5.5,top,5.5,'#ffffff');}
 rect(VX-150,H-60,300,14,'#d6dbe6');
 // stained-glass windows with warm light and wall sconces, both sides, in perspective
 for(const s of [-1,1])for(let k=0;k<3;k++){const d=[1,.72,.5][k],x=VX+s*(670-k*170)*1,w=110*d,h=250*d,y=VY-60*d-h*.35;
  path([[x-w/2,y+h],[x-w/2,y+w*.45],[x,y],[x+w/2,y+w*.45],[x+w/2,y+h]],'#3a0d18');path([[x-w/2+7*d,y+h-6],[x-w/2+7*d,y+w*.45+4],[x,y+9*d],[x+w/2-7*d,y+w*.45+4],[x+w/2-7*d,y+h-6]],'#f0a040');
  for(let q=0;q<10;q++)dot(x+(rnd()-.5)*w*.6,y+w*.4+rnd()*h*.55,6*d,['#d8402c','#ffd36a','#3d7bd8','#a8302c','#ffef9e'][q%5]);
  line(x,y+10*d,x,y+h,'#3a0d18',3*d);line(x-w/2+8,y+h*.55,x+w/2-8,y+h*.55,'#3a0d18',3*d);glow(x,y+h*.5,w*1.2,'#ffb050',.35);
  const lx=x+s*(-w*.85);dot(lx,y+h*.55,7*d,'#ffe7a8');glow(lx,y+h*.55,50*d,'#ffcf7a',.6);
  // red banner hanging beside each window
  rect(x-s*w*.95-14*d,y-20*d,28*d,h*.95,'#9c0f22');path([[x-s*w*.95-14*d,y-20*d+h*.95],[x-s*w*.95,y-4*d+h*.95+14*d],[x-s*w*.95+14*d,y-20*d+h*.95]],'#9c0f22');}
 // the two great vault arches: dark red ribs from the top corners curving down to the floor
 for(const s of [-1,1]){for(const [off,col,lw] of [[0,'#4a0a18',70],[0,'#7e1a2c',44],[8,'#c04a5a',6]]){c.save();c.strokeStyle=col;c.lineWidth=lw;c.beginPath();c.moveTo(VX+s*(40-off),-30);c.bezierCurveTo(VX+s*420,-10,VX+s*700,120,VX+s*(820-off),H+20);c.stroke();c.restore();}
  for(let k=0;k<14;k++){const t=k/13,x=VX+s*(40+(820-40)*(1-Math.pow(1-t,1.7))),y=-30+(H+50)*t*t;dot(x,y,3,'#ffb1a0');}}
 // back platforms: black stepped stages either side of the end wall
 for(const s of [-1,1]){path([[VX+s*150,H-40],[VX+s*470,H-40],[VX+s*520,H],[VX+s*150,H]],'#141016');path([[VX+s*150,H-70],[VX+s*400,H-70],[VX+s*430,H-40],[VX+s*150,H-40]],'#1d171e');line(VX+s*150,H-40,VX+s*470,H-40,'#5a4a54',2);}
 // floor: black mirror, ivory glossy runway widening to the front, warm reflections
 rect(0,H,1600,400,'#0c0809');
 const run=c.createLinearGradient(0,H,0,1000);run.addColorStop(0,'#f3e2cf');run.addColorStop(1,'#d9b89a');c.fillStyle=run;c.beginPath();c.moveTo(VX-200,H);c.lineTo(VX+200,H);c.lineTo(VX+760,1000);c.lineTo(VX-760,1000);c.closePath();c.fill();
 for(const s of [-1,1]){line(VX+s*200,H,VX+s*760,1000,'#7a5a4a',3);c.save();c.globalAlpha=.22;for(let k=0;k<3;k++){const x=VX+s*(670-k*170);line(x,H+8,x+s*30,H+160,'#ffb050',14);}c.restore();}
 c.save();c.globalAlpha=.30;rect(VX-130,H,260,120,'#9fd4ff');c.restore();c.save();c.globalAlpha=.18;for(let k=0;k<8;k++){const x=VX-120+k*34;line(x,H+4,x+(x-VX)*.4,H+150,'#ffffff',6);}c.restore();
 glow(VX,H+40,520,'#ffd9c8',.20);
 const pool=c.createRadialGradient(800,740,40,800,740,600);pool.addColorStop(0,'rgba(255,240,230,.22)');pool.addColorStop(1,'rgba(255,240,230,0)');c.fillStyle=pool;c.fillRect(0,300,1600,700);
}
