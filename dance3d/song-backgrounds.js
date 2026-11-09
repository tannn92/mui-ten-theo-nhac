import * as T from 'three';

// Locally drawn scenery: no reference photos, people, logos, or network assets.
// One background texture, painted only on song/viewport changes; no per-frame work.
export function selectBackdrop(chart={}) {
 chart=chart||{};
 const text=[chart.slug,chart.title,chart.audio].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/golden/.test(text))return 'golden';
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
  if(active==='golden'){paintGolden(c,{rect,path,glow,dot,line,rnd});return finish(canvas);}
  const day=active==='how',street=['rain','sounds','takedown','how'].includes(active),accent=active==='takedown'?'#628fee':'#d996f3';
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
   if(active==='sounds'||active==='takedown')for(const x of [170,1430]){line(x,420,x,570,'#535368',4);rect(x-18,400,36,24,accent);glow(x,412,65,accent,.5);}
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
 return{tint(){return active==='golden'?{disc:0xd9a04a,ring:0xfff0c0}:{disc:0xe0c3d5,ring:0xfffbfe};},setSong(chart){const next=selectBackdrop(chart);if(next!==active){active=next;if(width)paint();}},resize(w,h){const nextW=Math.min(1600,Math.max(640,Math.round(w))),nextH=Math.min(1600,Math.max(480,Math.round(h)));if(nextW!==width||nextH!==height){width=nextW;height=nextH;paint();}},diagnostics(){return{id:active,paints,width,height};}};
}
