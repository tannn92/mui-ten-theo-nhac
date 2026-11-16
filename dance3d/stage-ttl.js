// Stage 'ttl' for the song ttl-time-to-love (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='ttl';
export const tint={disc:0x3c3f48,ring:0xe8eeff};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xeef2ff,rim:0x8fb0ff,sky:0xe8eeff,gnd:0x303448,beam:0xa0c0ff,dust:0xd0e0ff,floor:0x10121c,gc:0xf2f4ff,ge:0x3a4060,wall:.9};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// TTL (Time To Love), stage from the official MV's dance scenes (owner 2026-11-11): a black stage, white neon light bars
// radiating from a vanishing point like a light tunnel, a glossy black floor reflecting them, round white spotlights low on
// the back. A soft grey haze behind the dancers keeps the child visible on the dark. Drawn in code: no text or logos.
export function paint(c,{rect,path,glow,dot,line,rnd}){
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
