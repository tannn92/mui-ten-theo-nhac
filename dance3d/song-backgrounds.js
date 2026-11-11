import * as T from 'three';

// Locally drawn scenery: no reference photos, people, logos, or network assets.
// One background texture, painted only on song/viewport changes; no per-frame work.
export function selectBackdrop(chart={}) {
 chart=chart||{};
 const text=[chart.slug,chart.title,chart.audio].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/super[- _]junior/.test(text))return 'sju';
 if(/ttl-time-to-love|time to love/.test(text))return 'ttl';
 if(/laviem/.test(text))return 'laviem';
 if(/tim[- _]em/.test(text))return 'timem';
 if(/golden/.test(text))return 'golden';
 if(/secret|tinh[- _]ha/.test(text))return 'secret';
 if(/what[- _]it[- _]sounds/.test(text))return 'sounds';
 if(/takedown/.test(text))return 'takedown';
 if(/how[- _]it.?s?[- _]done/.test(text))return 'how';
 if(/hat[- _]mua/.test(text))return 'rain';
 if(/girl[- _]xinh|that[- _]tinh/.test(text))return 'girl';
 return 'dolce';
}
// Golden: a concert stage at golden hour (owner 2026-11-10: "cho cái stage tương tự hình"). Warm sky with the sun low behind
// the stage, soft light rays, a lighting rig with beams, gold bokeh and a glossy gold floor that reflects the sun.
// Drawn in code like the other stages: no photos, people or logos.
function paintGolden(c,{rect,path,glow,dot,line,rnd}){
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
// What It Sounds Like: a dreamy pastel sky (owner 2026-11-10 picture): periwinkle to pink, big soft light orbs, a cloud bank
// on the horizon and a pearly floor with a faint rainbow sheen. Drawn in code: no photos, people or logos.
function paintSounds(c,{rect,path,glow,dot,line,rnd}){
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
// Secret (BlackSi street cover): a night street in front of a cream arcade of tall arched shop windows glowing warm, wall
// sconces, stone pavement with the windows' reflections and a few newspaper pages drifting by. No logos, text or people.
function paintSecret(c,{rect,path,glow,dot,line,rnd}){
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
// Tìm em: the B-Wild Christmas clip's night plaza (owner 2026-11-11): a lit hotel tower against the black sky, a modern mall
// in perspective on the right with warm glowing panels, dark trees and café lights on the left, cyan spotlights on stands
// and wide stone pavement washed in blue light. Drawn in code: no photos, people, signs or logos.
function paintTimEm(c,{rect,path,glow,dot,line,rnd}){
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
// LAVIEM (Tinh Hà Say Hi stage, owner 2026-11-11): a pastel courtroom: lilac-pink palace front with mint pilasters and arched
// windows, a big green heart arch crowned by golden scales in the middle, peach jury benches with green heart outlines on both
// sides, two pink broken hearts, warm spotlights from above, a glossy black floor with reflections. No text or logos.
function paintLaviem(c,{rect,path,glow,dot,line,rnd}){
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
// U (Super Junior, SpadeA Shenzhen cover, owner song queue 2026-11-11): a city plaza by day: pale blue sky, a skyline of
// office towers with a slender spired supertall in the middle, a band of trees, a glass railing, wide beige stone paving
// with a grid of small dark studs. Drawn in code: no photos, people, text or logos.
function paintSju(c,{rect,path,glow,dot,line,rnd}){
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
// TTL (Time To Love), stage from the official MV's dance scenes (owner 2026-11-11): a black stage, white neon light bars
// radiating from a vanishing point like a light tunnel, a glossy black floor reflecting them, round white spotlights low on
// the back. A soft grey haze behind the dancers keeps the child visible on the dark. Drawn in code: no text or logos.
function paintTtl(c,{rect,path,glow,dot,line,rnd}){
 const H=600,VX=800,VY=330;
 c.fillStyle='#050507';c.fillRect(0,0,1600,1000);
 glow(VX,VY+40,700,'#3a3d48',.55);glow(VX,VY+120,420,'#5a5e6c',.35);
 // neon bars: segments along rays from the vanishing point, brighter and thicker further out
 const bar=(ang,r0,r1,w)=>{const x0=VX+Math.cos(ang)*r0,y0=VY+Math.sin(ang)*r0,x1=VX+Math.cos(ang)*r1,y1=VY+Math.sin(ang)*r1;
  c.save();c.lineCap='round';c.strokeStyle='rgba(220,232,255,.18)';c.lineWidth=w*4;c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();
  c.strokeStyle='rgba(240,246,255,.95)';c.lineWidth=w;c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();c.restore();
  // segment joints: the tubes are made of pieces
  const n=Math.floor((r1-r0)/70);for(let k=1;k<n;k++){const r=r0+(r1-r0)*k/n;dot(VX+Math.cos(ang)*r,VY+Math.sin(ang)*r,w*.55,'rgba(10,12,18,.9)');}};
 for(let k=0;k<13;k++){const ang=Math.PI*(1.06+k*.0738);bar(ang,170+(k%2)*40,900,4+2*Math.abs(Math.sin(ang)));}
 for(const s of [-1,1])for(let k=0;k<3;k++){const ang=(s<0?Math.PI*.97:Math.PI*.03)+s*(-k*.07);bar(ang,240,1000,5);}
 // floor: glossy black, the bars' reflections as streaks, a horizon line
 const fl=c.createLinearGradient(0,H,0,1000);fl.addColorStop(0,'#0d0e12');fl.addColorStop(1,'#020203');c.fillStyle=fl;c.fillRect(0,H,1600,400);
 for(let k=-9;k<=9;k++){const x=VX+k*95;c.save();const g=c.createLinearGradient(0,H,0,1000);g.addColorStop(0,'rgba(230,238,255,.30)');g.addColorStop(1,'rgba(230,238,255,0)');c.strokeStyle=g;c.lineWidth=3+Math.abs(k)*.4;c.beginPath();c.moveTo(VX+k*30,H);c.lineTo(x+k*60,1000);c.stroke();c.restore();}
 line(0,H,1600,H,'rgba(200,210,230,.25)',2);
 // round white spotlights low on the back, with their reflections
 for(const x of [260,520,1080,1340]){glow(x,H-30,90,'#ffffff',.55);dot(x,H-30,9,'#ffffff');glow(x,H+60,70,'#dfe7ff',.22);}
 // haze behind the dancers so the child reads on the black
 const wash=c.createRadialGradient(800,700,40,800,700,620);wash.addColorStop(0,'rgba(120,126,140,.42)');wash.addColorStop(1,'rgba(120,126,140,0)');c.fillStyle=wash;c.fillRect(0,300,1600,700);
}
export function createSongBackgrounds(scene){
 let active='dolce',width=0,height=0,texture=null,paints=0;
 function paint(){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const c=canvas.getContext('2d');c.scale(width/1600,height/1000);
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const path=(points,color,stroke,line=1)=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}};
  const glow=(x,y,r,color,alpha=.5)=>{c.save();c.globalAlpha=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();};
  const dot=(x,y,r,color)=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=color;c.fill();};
  const line=(x,y,xx,yy,color,w)=>{c.beginPath();c.moveTo(x,y);c.lineTo(xx,yy);c.strokeStyle=color;c.lineWidth=w;c.stroke();};
  const lamp=(x,y,scale=1)=>{line(x,y,x,y+145*scale,'#4a4d69',5*scale);glow(x,y,50*scale,'#ffe4a6',.5);dot(x,y,5*scale,'#fff1ce');};
  let seed=31;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const clear=h=>/^#[0-9a-f]{6}$/i.test(h)?`rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},0)`:'transparent';
  const soft=(x,y,r,color,alpha=.5)=>{c.save();c.globalAlpha=alpha;const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,clear(color));c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();};
  if(active==='golden'){paintGolden(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='sounds'){paintSounds(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='secret'){paintSecret(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='timem'){paintTimEm(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='laviem'){paintLaviem(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='ttl'){paintTtl(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='sju'){paintSju(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  const day=active==='how',street=['rain','takedown','how'].includes(active),accent=active==='takedown'?'#628fee':'#d996f3';
  const sky=c.createLinearGradient(0,0,0,700);sky.addColorStop(0,day?'#cadbeb':'#171c39');sky.addColorStop(.6,day?'#d6dfeb':street?'#4a4564':'#434363');sky.addColorStop(1,day?'#e4dde0':'#a390b2');c.fillStyle=sky;c.fillRect(0,0,1600,1000);
  if(!day)for(let i=0;i<38;i++)dot(rnd()*1600,rnd()*270,.6+rnd(), '#b8bbd4');
  if(active==='dolce'){
   // Tower and warm honeycomb facade flank an open fountain plaza.
   path([[115,335],[115,20],[285,20],[320,335]],'#30354d','#64627a',2);
   for(let y=42;y<330;y+=27)line(130,y,292,y,'#777082',2);
   for(let x=145;x<280;x+=28)line(x,30,x,330,'#4e5068',2);
   path([[985,105],[1580,18],[1600,485],[985,455]],'#554a51');
   c.save();c.beginPath();c.moveTo(985,105);c.lineTo(1580,18);c.lineTo(1600,485);c.lineTo(985,455);c.clip();
   for(let row=0;row<9;row++)for(let col=0;col<12;col++){
    const x=995+col*58+(row%2)*29,y=93+row*49;
    const p=Array.from({length:6},(_,i)=>[x+31*Math.cos(Math.PI/3*i+Math.PI/6),y+31*Math.sin(Math.PI/3*i+Math.PI/6)]);
    path(p,(row+col)%4===0?'#b4935b':'#806a4d','#d4b577',2);
   }c.restore();
   rect(1000,411,590,71,'#444356');for(let x=1020;x<1580;x+=69)rect(x,423,45,47,'#8f8090');
   rect(20,365,450,110,'#43425b');for(let x=44;x<465;x+=65)rect(x,385,42,51,'#b59a84');
   path([[250,530],[1365,530],[1280,588],[320,588]],'#62617b','#b7a2ce',2);
   for(let i=0;i<35;i++){
    const x=290+i*30,h=40+115*Math.pow(Math.sin(i/34*Math.PI),2)+20*Math.sin(i*1.5);
    glow(x,525,30,'#dc96ea',.3);line(x,528,x,528-h,'rgba(225,164,247,.30)',7);line(x,525,x,528-h,'#d3b0e8',1.6);
    dot(x,528-h,2,'#efd9fc');
   }
   glow(800,510,300,'#c789e0',.20);lamp(110,365,.9);lamp(1480,360,.95);
  }else if(street){
   // Pedestrian street: perspective facades and awnings, no shop signage.
   for(const side of [-1,1]){
    c.save();if(side===1){c.translate(1600,0);c.scale(-1,1);}
    path([[0,70],[520,280],[640,550],[0,600]],day?'#b6b7ba':'#646379',day?'#d9d9db':'#a7a2b0',2);
    path([[0,220],[530,365],[570,400],[0,285]],'#c0b6c3');
    for(let i=0;i<6;i++){const x=i*83,s=1-i*.12,y=130+i*33;
     rect(x+12,y,52*s,82*s,'#30394e');rect(x+18,y+8,36*s,53*s,i%2?'#9c8b9f':'#717c91');
     const by=315+i*25;path([[x,by],[x+75*s,by+13],[x+90*s,by+40],[x-10,by+26]],i%2?'#8c9aa8':'#c5bdc7');
     line(x+6,by+30,x+6,565,'#aaa5b5',6*s);rect(x+15,by+43,53*s,110*s,'#42465e');
     lamp(x+42,by+32,.65*s);
    }
    c.restore();
   }
   for(let j=0;j<(active==='rain'?3:1);j++){
    const y=110+j*53;c.beginPath();c.moveTo(130+j*120,y);c.quadraticCurveTo(800,y+140,1470-j*120,y);c.strokeStyle='#6a657c';c.lineWidth=2;c.stroke();
    for(let i=0;i<20;i++){const u=i/19,x=130+j*120+(1340-j*240)*u,yy=y+280*u*(1-u);glow(x,yy,13,'#ffeac5',.45);dot(x,yy,2.4,'#fff2d3');}
   }
   if(!day){glow(150,570,190,accent,.48);glow(1450,570,190,accent,.48);}
   if(active==='takedown')for(const x of [170,1430]){line(x,420,x,570,'#535368',4);rect(x-18,400,36,24,accent);glow(x,412,65,accent,.5);}
   if(day){for(const x of [570,1030]){line(x,350,x,520,'#727d79',9);for(let n=0;n<6;n++)dot(x+Math.cos(n)*50,350+Math.sin(n)*35,40,'#8daba0');}line(1460,140,1460,540,'#636b7c',8);rect(1442,155,36,100,'#4b5260');dot(1460,176,10,'#b96376');}
  }else{
   // Tree-lined boulevard: layered foliage and softly blurred distant lamps.
   for(const side of [-1,1])for(let i=0;i<6;i++){
    const x=side<0?55+i*82:1545-i*82,y=150+i*46,s=1-i*.12;
    line(x,580-i*7,x-25*side,y,'#3b3d4a',22*s);
    line(x,y+105,x+65*side,y+25,'#3b3d4a',10*s);
    for(let j=0;j<12;j++){const a=j/12*Math.PI*2;dot(x+Math.cos(a)*75*s,y+Math.sin(a)*60*s,45*s,j%3?'#303e4b':'#4d5350');}
    glow(x-25*side,y+50,65*s,'#b99757',.21);lamp(x+35*side,y+110,.8*s);
   }
   for(let i=0;i<42;i++){const side=i%2?-1:1,x=800+side*(170+rnd()*490),y=390+rnd()*140,r=3+rnd()*10;glow(x,y,r*3,i%3?'#ffe3a3':'#a9cbbd',.42);dot(x,y,r,i%3?'rgba(255,231,179,.35)':'rgba(181,223,209,.35)');}
   rect(30,470,310,55,'#455265');rect(1260,470,310,55,'#57516b');
  }
  // Spacious low-contrast dance floor; perspective lines stay faint.
  const floor=c.createLinearGradient(0,560,0,1000);floor.addColorStop(0,'#9e92af');floor.addColorStop(1,'#d1c4d6');c.fillStyle=floor;c.fillRect(0,590,1600,410);
  for(let x=-1600;x<=3200;x+=400)line(800,590,x,1000,'rgba(248,235,249,.10)',2);
  for(const y of [650,750,900])line(0,y,1600,y,'rgba(248,235,249,.12)',2);
  const calm=c.createRadialGradient(800,560,35,800,560,650);calm.addColorStop(0,'rgba(205,190,211,.48)');calm.addColorStop(.6,'rgba(186,171,200,.19)');calm.addColorStop(1,'rgba(180,165,195,0)');c.fillStyle=calm;c.fillRect(0,0,1600,1000);
  finish(canvas);
 }
 function finish(canvas){const next=new T.CanvasTexture(canvas);next.colorSpace=T.SRGBColorSpace;next.generateMipmaps=false;next.minFilter=T.LinearFilter;scene.background=next;texture?.dispose();texture=next;paints++;}
 return{tint(){return active==='golden'?{disc:0xd9a04a,ring:0xfff0c0}:active==='sounds'?{disc:0xf0d2ea,ring:0xffffff}:active==='secret'?{disc:0xcdb497,ring:0xfff3d6}:active==='timem'?{disc:0xa9c8e8,ring:0xf2fbff}:active==='laviem'?{disc:0xe8c4cf,ring:0xfff1f4}:active==='ttl'?{disc:0x3c3f48,ring:0xe8eeff}:active==='sju'?{disc:0xbfb6a6,ring:0xffffff}:{disc:0xe0c3d5,ring:0xfffbfe};},setSong(chart){const next=selectBackdrop(chart);if(next!==active){active=next;if(width)paint();}},resize(w,h){const nextW=Math.min(1600,Math.max(640,Math.round(w))),nextH=Math.min(1600,Math.max(480,Math.round(h)));if(nextW!==width||nextH!==height){width=nextW;height=nextH;paint();}},diagnostics(){return{id:active,paints,width,height};}};
}
