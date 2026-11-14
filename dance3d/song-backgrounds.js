import * as T from 'three';

// Locally drawn scenery: no reference photos, people, logos, or network assets.
// One background texture, painted only on song/viewport changes; no per-frame work.
export function selectBackdrop(chart={}) {
 chart=chart||{};
 const text=[chart.slug,chart.title,chart.audio].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/ddu[- _]du/i.test(text))return 'ddudu';
 if(/kill[- _]this[- _]love/.test(text))return 'ktl';
 if(/how[- _]you[- _]like[- _]that/.test(text))return 'hylt';
 if(/pink[- _]venom/.test(text))return 'pv';
 if(/jisoo[- _]flower|flower \(jisoo\)/.test(text))return 'jf';
 if(/roly[- _]poly/.test(text))return 'rolypoly';
 if(/super[- _]junior/.test(text))return 'sju';
 if(/ttl-time-to-love|time to love/.test(text))return 'ttl';
 if(/day[- _]by[- _]day/.test(text))return 'dbd';
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
// Day by Day (T-ARA, Tiature cover, owner song queue 2026-11-11): a bare concrete studio: grey board-formed concrete walls
// with rows of tie holes, a concrete ceiling with exposed pipes and black track spotlights, a glowing window panel on the
// left wall, tall white panels on the right wall, a pale wooden floor. Drawn in code: no photos, people, text or logos.
function paintDbd(c,{rect,path,glow,dot,line,rnd}){
 const H=620,CE=230,L=170,R=1430;
 // ceiling: light concrete, beams and pipes running across
 const ce=c.createLinearGradient(0,0,0,CE);ce.addColorStop(0,'#d9d6d1');ce.addColorStop(1,'#c9c5bf');c.fillStyle=ce;c.fillRect(0,0,1600,CE);
 rect(0,0,1600,22,'#e4e1dc');
 for(const [y,w,col] of [[70,16,'#e8e6e2'],[110,20,'#dedbd6'],[150,14,'#ebe9e5']]){rect(220,y,1160,w,col);line(220,y+w,1380,y+w,'rgba(0,0,0,.18)',2);for(let x=280;x<1380;x+=170)rect(x,y-3,8,w+6,'#cfccc7');}
 line(160,40,1440,40,'#3a3a3c',3);line(200,52,1400,52,'#5a5a5c',2);
 // track spotlights: small black cans with warm bright faces
 for(const x of [310,440,560,690,800,930]){rect(x-7,40,14,18,'#222');glow(x,66,70,'#fff6e4',.75);dot(x,64,8,'#fffdf5');}
 for(const [x,y] of [[1190,60],[1270,95]]){glow(x,y,60,'#fff6e4',.7);dot(x,y,7,'#fffdf5');}
 // side walls in perspective: concrete, darker toward the corners
 path([[0,0],[L,CE],[L,H],[0,H+90]],'#a9a7a2');path([[1600,0],[R,CE],[R,H],[1600,H+90]],'#b3b1ac');
 // back wall: board-formed concrete panels, tie holes, faint stains
 rect(L,CE,R-L,H-CE,'#a8a6a1');
 for(let x=L;x<R;x+=180)for(let y=CE;y<H;y+=90){const v=160+Math.floor(rnd()*22);rect(x+1,y+1,178,88,'rgb('+v+','+(v-2)+','+(v-6)+')');for(const dx of [30,150])for(const dy of [22,68])dot(x+dx,y+dy,2.6,'rgba(70,68,64,.55)');}
 for(let i=0;i<90;i++){const x=L+rnd()*(R-L),y=CE+rnd()*(H-CE);rect(x,y,1.5,10+rnd()*40,'rgba(80,78,74,.10)');}
 // two black speakers high on the back wall
 rect(360,CE+18,48,34,'#1e1e20');rect(1180,CE+18,48,34,'#1e1e20');
 // left wall: a glowing window panel; a dark door line
 path([[60,300],[120,322],[120,520],[60,540]],'#dff2f8');glow(90,420,110,'#e8fbff',.55);path([[60,300],[120,322],[120,520],[60,540]],null,'#7d7b77',3);
 // right wall: tall white panels and a doorway, a few steps at the bottom corner
 path([[1460,250],[1560,200],[1560,640],[1460,600]],'#eeeeec');path([[1460,250],[1560,200],[1560,640],[1460,600]],null,'#c9c7c2',2);
 path([[1440,260],[1455,255],[1455,600],[1440,605]],'#7c7a75');
 for(let k=0;k<3;k++)rect(1470-k*10,H-10-k*16,130+k*10,10,k%2?'#cfcdc8':'#bdbbb6');
 rect(L,H-8,R-L,8,'#8e8b85');
 // floor: pale warm wood, planks toward the camera, soft reflections of the lights
 const fl=c.createLinearGradient(0,H,0,1000);fl.addColorStop(0,'#c9b8a2');fl.addColorStop(.5,'#d8c7b0');fl.addColorStop(1,'#c3b098');c.fillStyle=fl;c.fillRect(0,H,1600,1000-H);
 for(let k=-28;k<=28;k++){const x0=800+k*32,x1=800+k*125;line(x0,H,x1,1000,'rgba(120,95,70,.16)',1.2);}
 for(let i=0;i<200;i++){const y=H+Math.pow(rnd(),1.4)*(1000-H),x=rnd()*1600;line(x,y,x+20+rnd()*60,y,'rgba(255,240,220,.12)',1);}
 for(const x of [440,800,1160])glow(x,H+120,160,'#fff4e2',.35);
 const wash=c.createRadialGradient(800,800,40,800,800,700);wash.addColorStop(0,'rgba(255,240,225,.22)');wash.addColorStop(1,'rgba(255,240,225,0)');c.fillStyle=wash;c.fillRect(0,H,1600,1000-H);
 line(0,H,1600,H,'rgba(255,255,255,.35)',2);
}
// Roly Poly (T-ara, official MV Dance Ver., 2026-11-14): the MV's 70s disco club: a big round mirrored ceiling light rig with
// trusses, disco balls, a back wall of black vinyl records on white behind the dance floor, darker side walls with records in
// pink / red / teal light, a glossy multicolour LED tile dance floor. Drawn in code: no photos, people, text or logos.
function paintRolyPoly(c,{rect,path,glow,dot,line,rnd}){
 const H=600,VX=800,VY=360;
 c.fillStyle='#0a0710';c.fillRect(0,0,1600,1000);
 glow(800,420,760,'#3a1838',.6);glow(260,380,320,'#e0457a',.28);glow(1340,380,320,'#21b3a6',.26);glow(800,300,380,'#f05a6a',.16);
 // side walls: dark, records in coloured light
 path([[0,120],[300,250],[300,H],[0,H+60]],'#1a0f1c');path([[1600,120],[1300,250],[1300,H],[1600,H+60]],'#0f1a1c');
 const record=(x,y,r,label)=>{dot(x,y,r,'#0d0d10');dot(x,y,r*.82,'#1b1b20');dot(x,y,r*.40,label);dot(x,y,r*.08,'#0d0d10');c.save();c.globalAlpha=.25;c.strokeStyle='#ffffff';c.lineWidth=1;c.beginPath();c.arc(x,y,r*.66,-.9,-.3);c.stroke();c.restore();};
 const labels=['#f2d34e','#e9497a','#3cc6b4','#f2f0e6','#e6532f','#8fd36a','#7db7ff'];
 for(let k=0;k<5;k++)for(let j=0;j<4;j++){const t=k/5;record(30+k*55,300+j*72-t*28,22-k*1.2,labels[(k+j)%7]);record(1570-k*55,300+j*72-t*28,22-k*1.2,labels[(k+j+3)%7]);}
 c.save();c.globalAlpha=.35;c.fillStyle='#e0457a';c.fillRect(0,250,300,360);c.fillStyle='#21b3a6';c.fillRect(1300,250,300,360);c.restore();
 // back wall: white panel covered with black records (coloured labels), framed by light columns
 rect(330,250,940,H-250,'#e9e4dc');
 for(let y=278,row=0;y<H-10;y+=56,row++)for(let x=356+(row%2)*28;x<1260;x+=56)record(x,y,24,labels[Math.floor(rnd()*7)]);
 c.save();const wash=c.createLinearGradient(330,0,1270,0);wash.addColorStop(0,'rgba(233,69,122,.30)');wash.addColorStop(.5,'rgba(255,255,255,0)');wash.addColorStop(1,'rgba(33,179,166,.30)');c.fillStyle=wash;c.fillRect(330,250,940,H-250);c.restore();
 for(const x of [318,1282]){rect(x-12,230,24,H-230,'#2a2030');for(let y=240;y<H;y+=26){dot(x,y,5,'#fff3c4');glow(x,y,16,'#ffd98a',.5);}}
 // ceiling: trusses from the corners to a big round mirrored light rig
 for(const [x0,x1] of [[0,560],[1600,1040],[140,640],[1460,960]]){line(x0,0,x1,150,'#5d5866',10);line(x0,14,x1,164,'#3a3640',4);for(let k=1;k<9;k++){const t=k/9;line(x0+(x1-x0)*t,150*t,x0+(x1-x0)*t,150*t+14,'#8b8696',2);}}
 c.save();c.beginPath();c.ellipse(800,135,430,92,0,0,Math.PI*2);c.fillStyle='#1c1820';c.fill();c.lineWidth=14;c.strokeStyle='#8f8a99';c.stroke();c.restore();
 c.save();c.beginPath();c.ellipse(800,135,360,70,0,0,Math.PI*2);c.clip();const mg=c.createRadialGradient(800,135,10,800,135,360);mg.addColorStop(0,'#fff6f0');mg.addColorStop(.35,'#f39bb6');mg.addColorStop(.7,'#7ad7cf');mg.addColorStop(1,'#3b3550');c.fillStyle=mg;c.fillRect(400,50,800,180);
 for(let k=0;k<60;k++){const a=rnd()*Math.PI*2,r=40+rnd()*320;c.globalAlpha=.25+rnd()*.4;c.fillStyle=k%3?'#ffffff':'#ff7ab0';c.fillRect(800+Math.cos(a)*r,135+Math.sin(a)*r*.2,6+rnd()*14,2+rnd()*4);}c.restore();
 for(let k=0;k<28;k++){const a=k/28*Math.PI*2;const x=800+Math.cos(a)*430,y=135+Math.sin(a)*92;glow(x,y,18,'#ffe2a8',.55);dot(x,y,4,'#fffbe8');}
 // disco balls hanging at different heights
 const ball=(x,y,r)=>{line(x,0,x,y-r,'#6c6872',2);glow(x,y,r*2.2,'#ffffff',.18);dot(x,y,r,'#9a98a6');c.save();c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.clip();
  for(let i=-r;i<r;i+=r/5)for(let j=-r;j<r;j+=r/5){const l=150+Math.floor(rnd()*105);c.fillStyle=rnd()<.08?'#ff8fc0':rnd()<.08?'#8ff0e6':'rgb('+l+','+l+','+(l+8)+')';c.fillRect(x+i+1,y+j+1,r/5-2,r/5-2);}
  const sh=c.createRadialGradient(x-r*.4,y-r*.4,r*.1,x,y,r);sh.addColorStop(0,'rgba(255,255,255,.35)');sh.addColorStop(1,'rgba(0,0,0,.45)');c.fillStyle=sh;c.fillRect(x-r,y-r,2*r,2*r);c.restore();dot(x-r*.35,y-r*.35,r*.12,'#ffffff');};
 for(const [x,y,r] of [[170,190,34],[380,250,24],[560,215,20],[1040,220,22],[1220,250,24],[1430,190,34],[700,270,14],[920,265,15]])ball(x,y,r);
 // light beams from the rig
 c.save();c.globalCompositeOperation='lighter';for(const [x,col,tx] of [[560,'rgba(233,69,122,.10)',300],[1040,'rgba(33,179,166,.10)',1300],[700,'rgba(255,240,200,.08)',620],[900,'rgba(255,240,200,.08)',980]]){c.fillStyle=col;c.beginPath();c.moveTo(x-10,170);c.lineTo(x+10,170);c.lineTo(tx+90,H+80);c.lineTo(tx-90,H+80);c.closePath();c.fill();}c.restore();
 // LED tile dance floor in perspective: glowing multicolour squares in a dark grid, glossy
 rect(0,H,1600,400,'#08060c');
 const ys=[];for(let k=0;k<=9;k++){const t=k/9;ys.push(H+400*Math.pow(t,1.6));}
 const xAt=(i,y)=>VX+(i*120)*(y-VY)/(H-VY)*.62;
 const cols=['#ff4f9a','#2fe0cf','#ffd64a','#5aa8ff','#fff4e6','#ff6a3d','#9cff6a'];
 for(let r=0;r<9;r++)for(let i=-12;i<12;i++){const y0=ys[r],y1=ys[r+1],col=cols[Math.abs((i*3+r*5)%7)],on=((i+r)%3!==0);
  const q=[[xAt(i,y0)+3,y0+2],[xAt(i+1,y0)-3,y0+2],[xAt(i+1,y1)-4,y1-2],[xAt(i,y1)+4,y1-2]];
  c.save();c.globalAlpha=on?.60:.18;path(q,col);c.restore();c.save();c.globalAlpha=on?.45:.12;const cx=(q[0][0]+q[2][0])/2,cy=(y0+y1)/2;glow(cx,cy,(y1-y0)*1.2,'#ffffff',on?.20:.05);c.restore();}
 for(let r=0;r<=9;r++)line(0,ys[r],1600,ys[r],'rgba(10,8,14,.9)',3);
 // reflections of the rig and the balls on the glossy floor, a soft pool behind the dancers
 glow(800,H+60,380,'#ffffff',.10);glow(260,H+40,160,'#ff4f9a',.18);glow(1340,H+40,160,'#2fe0cf',.18);
 const pool=c.createRadialGradient(800,720,40,800,720,600);pool.addColorStop(0,'rgba(255,240,245,.20)');pool.addColorStop(1,'rgba(255,240,245,0)');c.fillStyle=pool;c.fillRect(0,300,1600,700);
}
// DDU-DU DDU-DU (BLACKPINK, official MV, 2026-11-14): the main dance set of the final chorus (MV 2:50-3:24): a temple of
// neon-painted roof eaves: two red pointed-arch eaves sweep from the top centre down to the floor at both sides, lined with
// rafters painted in red / teal / pink bands with dot rows (dancheong-like); in the middle a stepped pyramid of nested neon
// outlines (pink, orange, teal, blue, violet) with a glowing pale triangle at its foot; a black mirror floor reflecting it,
// purple haze at the sides. Drawn in code: no photos, people, text or logos.
function paintDdu(c,{rect,path,glow,dot,line,rnd}){
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
// Kill This Love (BLACKPINK, official MV, 2026-11-14): the main dance set of the final chorus (MV 2:50-3:08), a red palace
// hall seen down its length: pink-red carved walls and two great dark-red vault arches sweeping in from the top corners, a
// glowing pink-cloud painted ceiling panel in a gold frame, at the far end a blue-lit arch with white organ pipes, gothic
// stained-glass windows glowing amber with wall sconces on both sides, red banners, black stepped platforms at the back and
// an ivory glossy runway down the middle of a black mirror floor. Drawn in code: no photos, people, text or logos.
function paintKtl(c,{rect,path,glow,dot,line,rnd}){
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
// How You Like That (BLACKPINK, official MV, 2026-11-14): the main dance set of the final chorus (MV 2:40-2:57), the pink
// blossom hall: a round hall with glowing pink plaster walls under a dense canopy of pink-violet blossom trees that arches over
// the top, a round window at the top centre, two big brown wooden (patchwork) horse statues on the back ledge either side of a
// bright white doorway, a low curved ivory ring wall round the dance floor, a pale grey-pink stone floor with a bright pool of
// light, and dark blue drapes at the far left and right edges. Drawn in code: no photos, people, text or logos.
function paintHylt(c,{rect,path,glow,dot,line,rnd}){
 const H=560,VX=800;
 // back walls: glowing pink plaster, brighter in the middle
 const wall=c.createLinearGradient(0,0,1600,0);wall.addColorStop(0,'#7a2a5a');wall.addColorStop(.25,'#e0609a');wall.addColorStop(.5,'#ff9cc6');wall.addColorStop(.75,'#e0609a');wall.addColorStop(1,'#7a2a5a');c.fillStyle=wall;c.fillRect(0,0,1600,H);
 for(let k=0;k<30;k++){c.save();c.globalAlpha=.10;c.strokeStyle='#ffe0ee';c.lineWidth=2;const x=200+rnd()*1200,y=200+rnd()*320;c.beginPath();c.moveTo(x,y);c.lineTo(x+(rnd()-.5)*60,y+20+rnd()*60);c.stroke();c.restore();}
 // white doorway at the back centre, with its light spilling out
 glow(VX,H-110,260,'#ffffff',.55);rect(VX-58,H-215,116,175,'#fff8fb');path([[VX-58,H-215],[VX,H-245],[VX+58,H-215]],'#fff8fb');
 // back ledge with the two wooden horses facing the centre
 rect(0,H-48,1600,48,'#b05a7a');rect(0,H-52,1600,6,'#e48ab0');
 const horse=(x,s)=>{const B='#7a4526',L='#a8683c',D='#4a2614';c.save();c.translate(x,H-52);c.scale(s,1);
  path([[-120,-150],[60,-160],[95,-150],[100,-110],[-110,-100],[-130,-120]],B);// body
  for(const lx of [-100,-60,40,80]){rect(lx,-110,20,110,lx<0?L:B);rect(lx-2,-14,24,14,D);}
  path([[60,-160],[95,-250],[120,-300],[160,-290],[175,-262],[140,-250],[120,-205],[100,-150]],B);// neck + head
  path([[95,-252],[118,-300],[106,-305],[86,-262]],D);for(let k=0;k<7;k++)rect(84+k*5,-262-k*7,7,9,'#c23a2a');// mane studs
  path([[-128,-145],[-160,-90],[-150,-70],[-122,-118]],D);// tail
  c.globalAlpha=.35;for(let k=0;k<40;k++){const px=-120+rnd()*220,py=-155+rnd()*45;rect(px,py,10+rnd()*14,8+rnd()*8,[L,D,'#c08050'][k%3]);}c.restore();};
 horse(VX-330,1);horse(VX+330,-1);
 // blossom canopy: dense pink-violet clusters from the top edge, thick at the sides, arching over the round window
 dot(VX,62,58,'#f6e9ee');for(let k=0;k<12;k++){const a=k/12*Math.PI*2;line(VX,62,VX+Math.cos(a)*56,62+Math.sin(a)*56,'#b0889a',3);}dot(VX,62,16,'#c8a8b8');
 for(let k=0;k<520;k++){const side=rnd()<.5?-1:1,t=rnd(),x=VX+side*(80+t*760)+(rnd()-.5)*60,y=-20+Math.pow(t,1.3)*360*(0.35+rnd()*.75)+rnd()*40;if(Math.abs(x-VX)<75&&y<130)continue;
  dot(x,y,8+rnd()*16,['#ff7ab8','#d659b5','#ffb3d6','#9c3c9a','#f05aa0','#7a2a7a'][k%6]);}
 for(let k=0;k<70;k++){const x=rnd()*1600,y=rnd()*260;dot(x,y,3+rnd()*4,'#ffe6f2');}
 for(const s of [-1,1]){line(VX+s*780,H,VX+s*700,260,'#5a2a3a',22);line(VX+s*700,260,VX+s*560,120,'#5a2a3a',12);line(VX+s*700,300,VX+s*820,150,'#5a2a3a',10);}
 // dark blue drapes at the far edges (the tunnel opening)
 for(const s of [-1,1]){const x0=s<0?0:1600;path([[x0,0],[x0+s*-90,0],[x0+s*-60,H+440],[x0,H+440]],'#1c2a52');for(let k=0;k<4;k++)line(x0-s*(16+k*18),0,x0-s*(12+k*14),1000,'#2e4478',4);}
 // floor: pale grey-pink stone with a bright pool of light in the middle
 const fl=c.createLinearGradient(0,H,0,1000);fl.addColorStop(0,'#b8909e');fl.addColorStop(1,'#8a6e7a');c.fillStyle=fl;c.fillRect(0,H,1600,440);
 for(let k=0;k<90;k++){c.save();c.globalAlpha=.05;dot(rnd()*1600,H+rnd()*440,6+rnd()*28,k%2?'#5a4450':'#e8d0d8');c.restore();}
 // low curved ivory ring wall round the dance floor
 c.save();c.strokeStyle='#efe2e6';c.lineWidth=26;c.beginPath();c.ellipse(VX,H+120,700,150,0,Math.PI*1.02,Math.PI*1.98);c.stroke();c.strokeStyle='#c9b0ba';c.lineWidth=5;c.beginPath();c.ellipse(VX,H+133,700,150,0,Math.PI*1.02,Math.PI*1.98);c.stroke();c.restore();
 const pool=c.createRadialGradient(VX,760,40,VX,760,560);pool.addColorStop(0,'rgba(255,245,250,.55)');pool.addColorStop(1,'rgba(255,245,250,0)');c.fillStyle=pool;c.fillRect(0,H,1600,440);
 glow(VX,300,520,'#ff8cc4',.18);
}
// Pink Venom (BLACKPINK, official MV, 2026-11-14): the main group-dance set of the second chorus (MV 2:02-2:20), the white
// marble hall: pale blue-white marble walls with rows of white columns on both sides, a tall arch at the back centre with a big
// round stained-glass clock window (gold frame, spokes) over three tall bright windows, a big grey stone sphere in front of it,
// two white rearing stag statues on the side ledges, broken white blocks and rubble with green vines, and a white floor
// scattered with crimson-pink petals. Drawn in code: no photos, people, text or logos.
function paintPv(c,{rect,path,glow,dot,line,rnd}){
 const H=560,VX=800;
 // back wall: pale blue-white marble, cooler at the edges
 const wall=c.createLinearGradient(0,0,1600,0);wall.addColorStop(0,'#9fb4c4');wall.addColorStop(.3,'#dfe8ee');wall.addColorStop(.5,'#f4f8fa');wall.addColorStop(.7,'#dfe8ee');wall.addColorStop(1,'#9fb4c4');c.fillStyle=wall;c.fillRect(0,0,1600,H);
 for(let k=0;k<40;k++){c.save();c.globalAlpha=.10;c.strokeStyle='#8fa2b2';c.lineWidth=1.5;const x=rnd()*1600,y=rnd()*H;c.beginPath();c.moveTo(x,y);c.lineTo(x+(rnd()-.5)*50,y+10+rnd()*40);c.stroke();c.restore();}
 // rows of white columns receding on both sides (bigger and further out toward the edges)
 for(const s of [-1,1])for(let k=4;k>=0;k--){const x=VX+s*(250+k*120+k*k*14),w=34+k*14,top=150-k*30;rect(x-w/2,top,w,H-top,'#f2f6f8');rect(x-w/2,top,w*.28,H-top,'#c8d6e0');rect(x-w/2-8,top-14,w+16,16,'#e6eef2');rect(x-w/2-8,H-18,w+16,18,'#d4e0e8');}
 // the central arch with the round clock window over three tall bright windows
 path([[VX-190,H],[VX-190,190],[VX-170,120],[VX-120,70],[VX-60,42],[VX,34],[VX+60,42],[VX+120,70],[VX+170,120],[VX+190,190],[VX+190,H]],'#e9f0f4');
 for(const k of [-1,0,1]){const x=VX+k*62;glow(x,H-120,90,'#ffffff',.5);rect(x-24,H-230,48,190,'#fbfdff');rect(x-24,H-230,48,8,'#cdb27a');}
 dot(VX,160,108,'#c9a865');dot(VX,160,96,'#7fb6b8');dot(VX,160,86,'#e8f2e6');
 for(let k=0;k<16;k++){const a=k/16*Math.PI*2;line(VX+Math.cos(a)*22,160+Math.sin(a)*22,VX+Math.cos(a)*88,160+Math.sin(a)*88,'#9a7c40',4);}
 for(let k=0;k<12;k++){const a=k/12*Math.PI*2;dot(VX+Math.cos(a)*70,160+Math.sin(a)*70,7,['#5aa0a8','#d9b45a','#9cc8b0'][k%3]);}
 dot(VX,160,24,'#b8954e');dot(VX,160,10,'#6e5426');line(VX,160,VX+44,128,'#3e2e14',5);line(VX,160,VX-12,214,'#3e2e14',4);
 // ornate gold rim round the arch
 c.save();c.strokeStyle='#cdb27a';c.lineWidth=6;c.beginPath();c.arc(VX,190,186,Math.PI*1.03,Math.PI*1.97);c.stroke();c.restore();
 // the big grey stone sphere in front of the arch (slightly right of centre, as in the MV)
 const sg=c.createRadialGradient(VX+130,H-150,10,VX+150,H-120,120);sg.addColorStop(0,'#e4e8ec');sg.addColorStop(.6,'#9aa2aa');sg.addColorStop(1,'#5e666e');c.fillStyle=sg;c.beginPath();c.arc(VX+150,H-120,112,0,7);c.fill();
 c.save();c.globalAlpha=.25;for(let k=0;k<14;k++)line(VX+150+(rnd()-.5)*160,H-120+(rnd()-.5)*160,VX+150+(rnd()-.5)*160,H-120+(rnd()-.5)*160,'#4a5058',2);c.restore();
 // side ledges with the two white rearing stags facing the centre
 rect(0,H-40,620,40,'#d8e2ea');rect(980,H-40,620,40,'#d8e2ea');
 const stag=(x,s)=>{const W='#f6f9fb',S='#c6d4de';c.save();c.translate(x,H-40);c.scale(s,1);
  path([[-90,-140],[30,-190],[70,-200],[80,-170],[-60,-110],[-100,-110]],W);// body rearing up
  rect(-92,-120,18,120,S);rect(-62,-118,18,118,W);// hind legs
  path([[40,-190],[110,-150],[118,-140],[104,-136],[50,-168]],W);path([[60,-196],[120,-200],[126,-190],[112,-186],[62,-182]],S);// front legs
  path([[60,-200],[78,-270],[100,-292],[120,-286],[112,-262],[90,-248],[82,-196]],W);// neck + head
  for(const[dx,dy] of [[0,0],[-14,6]]){line(96+dx,-290+dy,84+dx,-350+dy,S,5);line(88+dx,-322+dy,62+dx,-346+dy,S,4);line(86+dx,-336+dy,104+dx,-368+dy,S,4);line(84+dx,-350+dy,70+dx,-380+dy,S,3);}
  c.restore();};
 stag(VX-430,1);stag(VX+430,-1);
 // broken white blocks, rubble and green vines at the sides
 for(let k=0;k<26;k++){const s=rnd()<.5?-1:1,x=VX+s*(330+rnd()*460),y=H-20+rnd()*60,w=24+rnd()*60,h=14+rnd()*34;rect(x-w/2,y-h,w,h,k%3?'#eef3f6':'#c4d0da');}
 for(let k=0;k<14;k++){const s=k%2?-1:1,x=VX+s*(300+rnd()*480),y0=rnd()*120;for(let j=0;j<8;j++)dot(x+Math.sin(j*.9+k)*8,y0+j*22,4+rnd()*3,['#4f8a3a','#6aa04a','#3a6a2c'][j%3]);}
 glow(VX,240,520,'#ffffff',.25);
 // floor: white stone with soft grey wear and crimson-pink petals scattered (thicker at the edges)
 const fl=c.createLinearGradient(0,H,0,1000);fl.addColorStop(0,'#e6edf2');fl.addColorStop(1,'#f6f9fb');c.fillStyle=fl;c.fillRect(0,H,1600,440);
 for(let k=0;k<70;k++){c.save();c.globalAlpha=.06;dot(rnd()*1600,H+rnd()*440,8+rnd()*30,'#8a9aa8');c.restore();}
 for(let k=0;k<420;k++){const edge=rnd()<.6,x=edge?(rnd()<.5?rnd()*420:1180+rnd()*420):rnd()*1600,y=H+4+rnd()*436;dot(x,y,2+rnd()*(2+(y-H)/90),['#b0204a','#d0305e','#8a1438','#e05a80'][k%4]);}
}
// 꽃 (FLOWER) (JISOO, official MV, 2026-11-14): the main dance set of the first chorus (MV 1:05-1:33), an old European street by
// day under a pale overcast sky: tall pale-stone neoclassical buildings, fluted columns at the front left, a cream palace at the end
// of the street (balustrade, rows of windows, paired columns, a dark arched door), a red-brown stone building on the right, teal
// lamp posts, a dark green vintage car and a pot of pink-red flowers far off, grey asphalt with white petals scattered on it.
// Drawn in code: no photos, people, text or logos.
function paintJf(c,{rect,path,glow,dot,line,rnd}){
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
  if(active==='dbd'){paintDbd(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='ttl'){paintTtl(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='sju'){paintSju(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='rolypoly'){paintRolyPoly(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='hylt'){paintHylt(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='pv'){paintPv(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='jf'){paintJf(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='ktl'){paintKtl(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
  if(active==='ddudu'){paintDdu(c,{rect,path,glow:soft,dot,line,rnd});return finish(canvas);}
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
 return{tint(){return active==='jf'?{disc:0xb8bec4,ring:0xf2eee8}:active==='pv'?{disc:0xe4ecf0,ring:0xffffff}:active==='hylt'?{disc:0xe8b4c8,ring:0xfff2f8}:active==='ktl'?{disc:0xd8a6b0,ring:0xfff0f2}:active==='ddudu'?{disc:0xc9a3c8,ring:0xffe8f4}:active==='rolypoly'?{disc:0xd9b7c9,ring:0xfff2f8}:active==='golden'?{disc:0xd9a04a,ring:0xfff0c0}:active==='sounds'?{disc:0xf0d2ea,ring:0xffffff}:active==='secret'?{disc:0xcdb497,ring:0xfff3d6}:active==='timem'?{disc:0xa9c8e8,ring:0xf2fbff}:active==='laviem'?{disc:0xe8c4cf,ring:0xfff1f4}:active==='dbd'?{disc:0xd2c3ae,ring:0xffffff}:active==='ttl'?{disc:0x3c3f48,ring:0xe8eeff}:active==='sju'?{disc:0xbfb6a6,ring:0xffffff}:{disc:0xe0c3d5,ring:0xfffbfe};},setSong(chart){const next=selectBackdrop(chart);if(next!==active){active=next;if(width)paint();}},resize(w,h){const nextW=Math.min(1600,Math.max(640,Math.round(w))),nextH=Math.min(1600,Math.max(480,Math.round(h)));if(nextW!==width||nextH!==height){width=nextW;height=nextH;paint();}},diagnostics(){return{id:active,paints,width,height};}};
}
