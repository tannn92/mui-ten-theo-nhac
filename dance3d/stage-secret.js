// Stage 'secret' for the song secret (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='secret';
export const tint={disc:0xcdb497,ring:0xfff3d6};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xfff2e0,rim:0xffd8a0,sky:0xfff2e4,gnd:0x4a3a30,beam:0xffe4b8,dust:0xfff0d0,floor:0x221a14,gc:0xfff6ea,ge:0x6a5040,wall:.9};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// Secret (BlackSi street cover): a night street in front of a cream arcade of tall arched shop windows glowing warm, wall
// sconces, stone pavement with the windows' reflections and a few newspaper pages drifting by. No logos, text or people.
export function paint(c,{rect,path,glow,dot,line,rnd}){
 const H=590,top=110;
 const sky=c.createLinearGradient(0,0,0,top+40);sky.addColorStop(0,'#10162c');sky.addColorStop(1,'#262b48');c.fillStyle=sky;c.fillRect(0,0,1600,top+40);
 for(let i=0;i<30;i++)dot(rnd()*1600,rnd()*90,.6+rnd(),'rgba(220,225,255,.6)');
 // the building: cream facade with a cornice and an attic band
 const wall=c.createLinearGradient(0,top,0,H);wall.addColorStop(0,'#d9cdb8');wall.addColorStop(.5,'#eadfc9');wall.addColorStop(1,'#d8c9ae');c.fillStyle=wall;c.fillRect(0,top,1600,H-top);
 rect(0,top,1600,26,'#c9bb9f');rect(0,top+26,1600,6,'#b5a586');for(let x=10;x<1600;x+=40)rect(x,top+8,22,12,'#bfae8f');
 rect(0,top+150,1600,14,'#cdbfa3');rect(0,top+164,1600,4,'#b8a888');
 // arched shop windows, warm inside
 const win=(x,w)=>{const y0=top+190,y1=H-12,r=w/2;
  c.save();c.beginPath();c.moveTo(x,y1);c.lineTo(x,y0+r);c.arc(x+r,y0+r,r,Math.PI,0);c.lineTo(x+w,y1);c.closePath();
  const g=c.createLinearGradient(0,y0,0,y1);g.addColorStop(0,'#fff1c9');g.addColorStop(.55,'#f7cf86');g.addColorStop(1,'#e2a457');c.fillStyle=g;c.fill();
  c.lineWidth=10;c.strokeStyle='#b49b72';c.stroke();c.lineWidth=3;c.strokeStyle='#8f7650';c.stroke();c.clip();
  for(let k=1;k<3;k++)line(x+w*k/3,y0,x+w*k/3,y1,'rgba(120,92,58,.55)',3);line(x,y0+r+40,x+w,y0+r+40,'rgba(120,92,58,.55)',3);
  for(const sy of [y1-70,y1-150]){rect(x+12,sy,w-24,6,'rgba(130,96,60,.45)');for(let k=0;k<4;k++){const bx=x+24+k*(w-48)/4;c.fillStyle=k%2?'rgba(150,92,52,.42)':'rgba(120,70,40,.38)';c.beginPath();c.roundRect(bx,sy-26,(w-48)/4-14,26,6);c.fill();line(bx+8,sy-26,bx+8+((w-48)/4-30)/2,sy-38,'rgba(110,70,40,.4)',2);line(bx+8+((w-48)/4-30)/2,sy-38,bx+(w-48)/4-22,sy-26,'rgba(110,70,40,.4)',2);}}
  c.restore();glow(x+r,y0+r+60,w*1.1,'#ffd98a',.45);
  // a small crest above the arch
  path([[x+r-18,y0-6],[x+r,y0-30],[x+r+18,y0-6]],'#b99d6c','#8f7650',2);};
 for(const x of [70,430,790,1150]){win(x+30,260);}
 const sconce=x=>{rect(x-5,top+250,10,26,'#6d5a3d');glow(x,top+246,46,'#ffe2a0',.9);dot(x,top+246,6,'#fff6dc');};
 for(const x of [60,420,780,1140,1500])sconce(x+20);
 // drifting newspaper pages
 for(const [x,y,a] of [[230,70,-.35],[1310,58,.28],[960,40,-.12],[560,95,.4]]){c.save();c.translate(x,y);c.rotate(a);rect(-34,-24,68,48,'#f4f1ea');rect(-34,-24,68,10,'#d8d2c6');for(let k=0;k<4;k++)rect(-28,-8+k*7,k%2?40:52,3,'#b9b3a7');c.restore();}
 // stone pavement reflecting the windows
 const fl=c.createLinearGradient(0,H,0,1000);fl.addColorStop(0,'#8b8279');fl.addColorStop(.4,'#6a635d');fl.addColorStop(1,'#4c4743');c.fillStyle=fl;c.fillRect(0,H,1600,1000-H);
 for(const x of [100,460,820,1180]){const g=c.createLinearGradient(0,H,0,1000);g.addColorStop(0,'rgba(255,214,140,.30)');g.addColorStop(1,'rgba(255,214,140,0)');path([[x+60,H],[x+230,H],[x+290,1000],[x,1000]],g);path([[x+90,H],[x+200,H],[x+240,1000],[x+50,1000]],g);}
 for(let x=-1600;x<=3200;x+=200)line(800,H,x,1000,'rgba(255,240,220,.10)',2);
 for(const y of [640,720,840])line(0,y,1600,y,'rgba(255,240,220,.08)',2);
 line(0,H+1,1600,H+1,'rgba(255,236,200,.55)',3);
 const vig=c.createRadialGradient(800,560,300,800,560,1050);vig.addColorStop(0,'rgba(20,16,30,0)');vig.addColorStop(1,'rgba(20,16,30,.32)');c.fillStyle=vig;c.fillRect(0,0,1600,1000);
}
