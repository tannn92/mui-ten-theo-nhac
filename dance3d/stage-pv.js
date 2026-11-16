// Stage 'pv' for the song pink-venom (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='pv';
export const tint={disc:0xe4ecf0,ring:0xffffff};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xf4f6ff,rim:0x9fd0ff,sky:0xeef4ff,gnd:0x3a4258,beam:0xb8e0ff,dust:0xe0f0ff,floor:0x161a26,gc:0xf6f8ff,ge:0x4a5a7a,wall:.85};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// Pink Venom (BLACKPINK, official MV, 2026-11-14): the main group-dance set of the second chorus (MV 2:02-2:20), the white
// marble hall: pale blue-white marble walls with rows of white columns on both sides, a tall arch at the back centre with a big
// round stained-glass clock window (gold frame, spokes) over three tall bright windows, a big grey stone sphere in front of it,
// two white rearing stag statues on the side ledges, broken white blocks and rubble with green vines, and a white floor
// scattered with crimson-pink petals. Drawn in code: no photos, people, text or logos.
export function paint(c,{rect,path,glow,dot,line,rnd}){
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
