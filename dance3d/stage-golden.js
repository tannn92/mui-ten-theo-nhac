// Stage 'golden' for the song golden (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='golden';
export const tint={disc:0xd9a04a,ring:0xfff0c0};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xffeccc,rim:0xffc060,sky:0xfff0d8,gnd:0x5a3a28,beam:0xffd890,dust:0xffe6b0,floor:0x2a1a10,gc:0xfff4e0,ge:0x7a4a2a,wall:.95};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// Golden: a concert stage at golden hour (owner 2026-11-10: "cho cái stage tương tự hình"). Warm sky with the sun low behind
// the stage, soft light rays, a lighting rig with beams, gold bokeh and a glossy gold floor that reflects the sun.
// Drawn in code like the other stages: no photos, people or logos.
export function paint(c,{rect,path,glow,dot,line,rnd}){
 const H=590,cx=800;
 const sky=c.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#211331');sky.addColorStop(.3,'#57283a');sky.addColorStop(.6,'#bd5d22');sky.addColorStop(.84,'#f0a43a');sky.addColorStop(1,'#ffd36c');c.fillStyle=sky;c.fillRect(0,0,1600,H);
 for(let i=0;i<46;i++)dot(rnd()*1600,rnd()*190,.6+rnd()*.9,'rgba(255,226,200,.55)');
 // low warm cloud bands
 for(let i=0;i<14;i++){const y=330+rnd()*220,x=rnd()*1600,w=180+rnd()*420,h=10+rnd()*18;c.save();c.globalAlpha=.10+rnd()*.12;c.fillStyle=i%3?'#ffb36a':'#ff8f6a';c.beginPath();c.ellipse(x,y,w,h,0,0,Math.PI*2);c.fill();c.restore();}
 // the sun on the horizon, behind the stage, and its rays
 glow(cx,H,780,'#ff9a2c',.42);glow(cx,H,430,'#ffc24e',.55);glow(cx,H-6,210,'#ffe39a',.75);glow(cx,H-8,90,'#fff4d2',.9);
 c.save();c.globalCompositeOperation='lighter';
 for(let i=0;i<24;i++){const a=Math.PI+(i+.5)/24*Math.PI,w=.012+(i%3)*.008,r=1350;c.globalAlpha=.035+(i%2)*.03;
  const g=c.createRadialGradient(cx,H,40,cx,H,r);g.addColorStop(0,'#fff0c0');g.addColorStop(1,'rgba(255,200,110,0)');c.fillStyle=g;
  c.beginPath();c.moveTo(cx,H);c.lineTo(cx+Math.cos(a-w)*r,H+Math.sin(a-w)*r);c.lineTo(cx+Math.cos(a+w)*r,H+Math.sin(a+w)*r);c.closePath();c.fill();}
 c.restore();
 // lighting rig: two towers and a top bar with lamps; beams fall towards the middle of the stage
 const bronze='#3a2416',edge='#e6b85c',top=118;
 for(const x of [130,1470]){rect(x-14,top,28,H-top,bronze);line(x-14,top,x-14,H,edge,2);line(x+14,top,x+14,H,edge,2);
  for(let y=top;y<H-30;y+=34){line(x-14,y,x+14,y+34,'rgba(230,184,92,.55)',2);line(x+14,y,x-14,y+34,'rgba(230,184,92,.55)',2);}}
 rect(116,top-26,1368,26,bronze);line(116,top-26,1484,top-26,edge,2);line(116,top,1484,top,edge,2);
 for(let x=130;x<1470;x+=34){line(x,top-26,x+34,top,'rgba(230,184,92,.5)',2);}
 c.save();c.globalCompositeOperation='lighter';
 for(const [x,tx] of [[300,640],[550,720],[800,800],[1050,880],[1300,960]]){
  const g=c.createLinearGradient(x,top,tx,H);g.addColorStop(0,'rgba(255,233,170,.34)');g.addColorStop(1,'rgba(255,214,120,0)');c.fillStyle=g;
  c.beginPath();c.moveTo(x-10,top+10);c.lineTo(x+10,top+10);c.lineTo(tx+120,H+40);c.lineTo(tx-120,H+40);c.closePath();c.fill();}
 c.restore();
 for(const x of [300,550,800,1050,1300]){rect(x-13,top,26,20,'#1f140c');glow(x,top+16,46,'#ffe7a8',.8);dot(x,top+16,6,'#fff8e0');}
 // gold bokeh and sparkles
 for(let i=0;i<70;i++){const x=rnd()*1600,y=140+rnd()*(H-150),r=2+rnd()*8;glow(x,y,r*3.2,'#ffd77a',.28);dot(x,y,r*.55,'rgba(255,244,214,.75)');}
 for(let i=0;i<16;i++){const x=rnd()*1600,y=150+rnd()*400,k=4+rnd()*7;c.save();c.globalAlpha=.75;c.fillStyle='#fff6d6';c.beginPath();c.moveTo(x,y-k);c.lineTo(x+k*.22,y-k*.22);c.lineTo(x+k,y);c.lineTo(x+k*.22,y+k*.22);c.lineTo(x,y+k);c.lineTo(x-k*.22,y+k*.22);c.lineTo(x-k,y);c.lineTo(x-k*.22,y-k*.22);c.closePath();c.fill();c.restore();}
 // glossy gold floor with the sun's reflection; darker towards the front so the tap rings stay easy to see
 const fl=c.createLinearGradient(0,H,0,1000);fl.addColorStop(0,'#e3a640');fl.addColorStop(.16,'#a86a24');fl.addColorStop(.55,'#5a3617');fl.addColorStop(1,'#2a180d');c.fillStyle=fl;c.fillRect(0,H,1600,1000-H);
 const rf=c.createLinearGradient(0,H,0,1000);rf.addColorStop(0,'rgba(255,238,178,.8)');rf.addColorStop(.5,'rgba(255,206,110,.22)');rf.addColorStop(1,'rgba(255,190,90,0)');c.fillStyle=rf;
 path([[cx-90,H],[cx+90,H],[cx+260,1000],[cx-260,1000]],rf);
 for(const x of [130,1470])path([[x-18,H],[x+18,H],[x+40,800],[x-40,800]],'rgba(255,214,140,.10)');
 for(let x=-1600;x<=3200;x+=200)line(cx,H,x,1000,'rgba(255,214,140,.10)',2);
 for(const y of [640,720,840])line(0,y,1600,y,'rgba(255,224,160,.08)',2);
 line(0,H+1,1600,H+1,'rgba(255,240,195,.85)',3);
 const vig=c.createRadialGradient(cx,560,260,cx,560,1050);vig.addColorStop(0,'rgba(40,16,10,0)');vig.addColorStop(1,'rgba(40,16,10,.34)');c.fillStyle=vig;c.fillRect(0,0,1600,1000);
}
