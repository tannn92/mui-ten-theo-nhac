// Stage 'hylt' for the song how-you-like-that (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='hylt';
export const tint={disc:0xe8b4c8,ring:0xfff2f8};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xfff0f4,rim:0xff7fbf,sky:0xffe6f2,gnd:0x6a4a70,beam:0xff9fd8,dust:0xffd4ec,floor:0x2c1830,gc:0xfff4f6,ge:0x8a5a86,wall:.8};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// How You Like That (BLACKPINK, official MV, 2026-11-14): the main dance set of the final chorus (MV 2:40-2:57), the pink
// blossom hall: a round hall with glowing pink plaster walls under a dense canopy of pink-violet blossom trees that arches over
// the top, a round window at the top centre, two big brown wooden (patchwork) horse statues on the back ledge either side of a
// bright white doorway, a low curved ivory ring wall round the dance floor, a pale grey-pink stone floor with a bright pool of
// light, and dark blue drapes at the far left and right edges. Drawn in code: no photos, people, text or logos.
export function paint(c,{rect,path,glow,dot,line,rnd}){
 const H=560,VX=800;
 // back walls: glowing pink plaster, brighter in the middle
 const wall=c.createLinearGradient(0,0,1600,0);wall.addColorStop(0,'#7a2a5a');wall.addColorStop(.25,'#e0609a');wall.addColorStop(.5,'#ff9cc6');wall.addColorStop(.75,'#e0609a');wall.addColorStop(1,'#7a2a5a');c.fillStyle=wall;c.fillRect(0,0,1600,H);
 for(let k=0;k<30;k++){c.save();c.globalAlpha=.10;c.strokeStyle='#ffe0ee';c.lineWidth=2;const x=200+rnd()*1200,y=200+rnd()*320;c.beginPath();c.moveTo(x,y);c.lineTo(x+(rnd()-.5)*60,y+20+rnd()*60);c.stroke();c.restore();}
 // white doorway at the back centre, with its light spilling out
 glow(VX,H-110,260,'#ffffff',.55);rect(VX-58,H-215,116,175,'#fff8fb');path([[VX-58,H-215],[VX,H-245],[VX+58,H-215]],'#fff8fb');
 // back ledge with the two wooden horses facing the centre
 rect(0,H-48,1600,48,'#b05a7a');rect(0,H-52,1600,6,'#e48ab0');
 // mv-look 2026-11-15: smooth carved wooden horses (curves, wood grain, a gloss line, soft shadow) instead of the blocky
 // patchwork squares, which looked cheap once the MV camera moves closer.
 const horse=(x,s)=>{const B='#7a4526',L='#b8784a',D='#4a2614';c.save();c.translate(x,H-52);c.scale(s,1);
  const g=(y0,y1,a,b)=>{const q=c.createLinearGradient(0,y0,0,y1);q.addColorStop(0,a);q.addColorStop(1,b);return q;};
  c.save();c.globalAlpha=.28;c.fillStyle='#3a1424';c.beginPath();c.ellipse(-10,-2,150,10,0,0,Math.PI*2);c.fill();c.restore();
  // legs: tapered, rounded, darker hooves
  for(const [lx,fill] of [[-98,L],[-58,B],[42,L],[80,B]]){c.fillStyle=g(-120,0,fill,D);c.beginPath();c.moveTo(lx-2,-118);c.quadraticCurveTo(lx+10,-60,lx+2,-12);c.lineTo(lx+20,-12);c.quadraticCurveTo(lx+16,-60,lx+24,-118);c.closePath();c.fill();
   c.fillStyle=D;c.beginPath();c.moveTo(lx-1,-14);c.lineTo(lx+22,-14);c.lineTo(lx+24,0);c.lineTo(lx-3,0);c.closePath();c.fill();}
  // tail
  c.strokeStyle=D;c.lineCap='round';c.lineWidth=14;c.beginPath();c.moveTo(-122,-140);c.quadraticCurveTo(-165,-120,-150,-68);c.stroke();
  // body
  c.fillStyle=g(-175,-95,L,B);c.beginPath();c.moveTo(-128,-122);c.bezierCurveTo(-130,-170,40,-178,92,-150);c.bezierCurveTo(112,-132,98,-100,62,-100);c.lineTo(-96,-98);c.bezierCurveTo(-122,-98,-130,-108,-128,-122);c.closePath();c.fill();
  // neck and head
  c.fillStyle=g(-310,-140,L,B);c.beginPath();c.moveTo(50,-158);c.bezierCurveTo(70,-210,92,-262,118,-296);c.bezierCurveTo(132,-308,152,-302,166,-290);c.bezierCurveTo(182,-276,182,-262,170,-256);
  c.bezierCurveTo(156,-252,142,-258,134,-246);c.bezierCurveTo(122,-220,112,-178,100,-142);c.closePath();c.fill();
  c.fillStyle=D;c.beginPath();c.ellipse(150,-288,4,4,0,0,Math.PI*2);c.fill();
  // mane with red studs
  c.strokeStyle=D;c.lineWidth=12;c.beginPath();c.moveTo(70,-170);c.quadraticCurveTo(92,-250,116,-300);c.stroke();
  for(let k=0;k<8;k++){const u=k/7,mx=72+u*42,my=-176-u*120;c.fillStyle='#c23a2a';c.beginPath();c.arc(mx-6,my,5,0,Math.PI*2);c.fill();}
  // wood grain and a gloss line along the back
  c.save();c.globalAlpha=.22;c.strokeStyle=D;c.lineWidth=2;for(let k=0;k<6;k++){const y=-160+k*10;c.beginPath();c.moveTo(-118,y+4);c.bezierCurveTo(-60,y-8+rnd()*6,20,y-6,86,y+2);c.stroke();}c.restore();
  c.save();c.globalAlpha=.45;c.strokeStyle='#f0c090';c.lineWidth=4;c.beginPath();c.moveTo(-110,-158);c.bezierCurveTo(-40,-170,30,-170,80,-152);c.stroke();c.beginPath();c.moveTo(80,-176);c.quadraticCurveTo(100,-240,124,-290);c.stroke();c.restore();
  c.restore();};
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
