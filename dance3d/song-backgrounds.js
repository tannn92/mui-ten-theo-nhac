import * as T from 'three';

// Locally drawn scenery: no reference photos, people, logos, or network assets.
// One background texture, painted only on song/viewport changes; no per-frame work.
export function selectBackdrop(chart={}) {
 chart=chart||{};
 const text=[chart.slug,chart.title,chart.audio].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
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
 return{tint(){return active==='golden'?{disc:0xd9a04a,ring:0xfff0c0}:active==='sounds'?{disc:0xf0d2ea,ring:0xffffff}:active==='secret'?{disc:0xcdb497,ring:0xfff3d6}:{disc:0xe0c3d5,ring:0xfffbfe};},setSong(chart){const next=selectBackdrop(chart);if(next!==active){active=next;if(width)paint();}},resize(w,h){const nextW=Math.min(1600,Math.max(640,Math.round(w))),nextH=Math.min(1600,Math.max(480,Math.round(h)));if(nextW!==width||nextH!==height){width=nextW;height=nextH;paint();}},diagnostics(){return{id:active,paints,width,height};}};
}
