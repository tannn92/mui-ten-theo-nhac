// Stage 'rolypoly' for the song roly-poly (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='rolypoly';
export const tint={disc:0xd9b7c9,ring:0xfff2f8};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xfff4e8,rim:0xffb0f0,sky:0xfff0f8,gnd:0x503a5a,beam:0xffc0ff,dust:0xfff0c0,floor:0x24162a,gc:0xfff6f0,ge:0x7a4a80,wall:.88};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// Roly Poly (T-ara, official MV Dance Ver., 2026-11-14): the MV's 70s disco club: a big round mirrored ceiling light rig with
// trusses, disco balls, a back wall of black vinyl records on white behind the dance floor, darker side walls with records in
// pink / red / teal light, a glossy multicolour LED tile dance floor. Drawn in code: no photos, people, text or logos.
export function paint(c,{rect,path,glow,dot,line,rnd}){
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
