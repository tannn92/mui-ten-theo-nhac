// Stage 'dbd' for the song day-by-day (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='dbd';
export const tint={disc:0xd2c3ae,ring:0xffffff};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xfff4ea,rim:0xffd8b0,sky:0xfff4ea,gnd:0x4a4038,beam:0xffead0,dust:0xfff4e0,floor:0x201c18,gc:0xfff8f0,ge:0x6a5a4a,wall:.9};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
// Day by Day (T-ARA, Tiature cover, owner song queue 2026-11-11): a bare concrete studio: grey board-formed concrete walls
// with rows of tie holes, a concrete ceiling with exposed pipes and black track spotlights, a glowing window panel on the
// left wall, tall white panels on the right wall, a pale wooden floor. Drawn in code: no photos, people, text or logos.
export function paint(c,{rect,path,glow,dot,line,rnd}){
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
