// Stage 'urman' for the song u-r-man (U R Man, SS501; DRIPPIN relay dance cover, M2 studio; owner 2026-11-16 "lấy theo drippin").
// One file per song (mv-look layout): painted backdrop (paint), stage disc/ring colours (tint), MV light palette (mv), camera
// hints (hints). The clip's studio is a seamless cyclorama whose colour changes by section, a white floor and a thin light line
// where the floor meets the wall. sectionAt(t) gives the backdrop colour key for song time t; song-backgrounds.js repaints the
// backdrop when the key changes (a dozen repaints per song, at the clip's own cuts). The clip's beat-by-beat light flicker
// (purple <-> magenta, grey <-> teal) is NOT copied: one steady colour per section (no strobing for the child).
// Drawn in code: no photos, people, text or logos. Canvas space 1600x1000, horizon at y ~590.
export const id='urman';
export const tint={disc:0xd9cde3,ring:0xffffff};
export const mv={key:0xfff6fb,rim:0xe6c8ff,sky:0xf2e8ff,gnd:0x4a4450,beam:0xf0e0ff,dust:0xfff4ff,floor:0xd6d2da,gc:0xfff8ff,ge:0x5a4870,wall:.9};
export const hints={};
// section colours (wall top, wall bottom near the floor), sampled from the clip's backdrop
const COL={
 dark:['#141314','#2a282b'],    // 0-8.2   intro: silhouettes in the dark, back light
 grey:['#5e5952','#857e76'],    // 8.2-16.6
 pink:['#c81fae','#e64fcf'],    // 16.6-32.5, 75.1-91.0  solo sections
 ice:['#a9b8cc','#cfd3de'],     // 32.5-41.5, 91.0-100.0 (grey/teal light)
 violet:['#8d3fe6','#b25af5'],  // 41.5-75.1, 100.0-133.7, 157.5-end
 red:['#8e0b1e','#b81a31'],     // 133.7-150.0 bridge
 lilac:['#c6a9d9','#ddc9e6'],   // 150.0-154.5 (the light fades back in)
 orchid:['#b45fe6','#cf86f1']   // 154.5-157.5
};
const TL=[[0,'dark'],[8.2,'grey'],[16.6,'pink'],[32.5,'ice'],[41.5,'violet'],[75.1,'pink'],[91.0,'ice'],[100.0,'violet'],[133.7,'red'],[150.0,'lilac'],[154.5,'orchid'],[157.5,'violet']];
export function sectionAt(t){let k=TL[0][1];if(t==null||!Number.isFinite(t))return 'violet';for(const [a,c] of TL){if(t>=a)k=c;else break;}return k;}
export function paint(c,{rect,glow,line,rnd},section='violet'){
 const [top,bot]=COL[section]||COL.violet,H=590,dark=section==='dark';
 // seamless wall: one colour, a little brighter toward the floor, darker toward the top corners (vignette)
 const w=c.createLinearGradient(0,0,0,H);w.addColorStop(0,top);w.addColorStop(1,bot);c.fillStyle=w;c.fillRect(0,0,1600,H);
 const v=c.createRadialGradient(800,H*.62,120,800,H*.62,980);v.addColorStop(0,'rgba(255,255,255,0)');v.addColorStop(1,dark?'rgba(0,0,0,.45)':'rgba(20,0,40,.22)');c.fillStyle=v;c.fillRect(0,0,1600,H);
 // the cove: the wall bends into the floor (soft band), then the floor
 const cove=c.createLinearGradient(0,H-40,0,H+30);cove.addColorStop(0,'rgba(255,255,255,0)');cove.addColorStop(1,dark?'rgba(60,58,62,.6)':'rgba(255,255,255,.35)');c.fillStyle=cove;c.fillRect(0,H-40,1600,70);
 const f=c.createLinearGradient(0,H,0,1000);
 if(dark){f.addColorStop(0,'#2e2c30');f.addColorStop(1,'#141315');}else{f.addColorStop(0,'#e6e3ea');f.addColorStop(.5,'#f2f0f4');f.addColorStop(1,'#dcd9e0');}
 c.fillStyle=f;c.fillRect(0,H,1600,1000-H);
 // the floor picks up the wall colour near the line
 const tintF=c.createLinearGradient(0,H,0,H+160);tintF.addColorStop(0,bot);tintF.addColorStop(1,'rgba(0,0,0,0)');c.save();c.globalAlpha=dark?.25:.30;c.fillStyle=tintF;c.fillRect(0,H,1600,160);c.restore();
 // the thin light line along the base of the wall (bright white tube, soft glow)
 glow(800,H-6,700,'#ffffff',dark?.18:.10);
 line(0,H-6,1600,H-6,'rgba(255,255,255,.55)',6);line(0,H-6,1600,H-6,'#ffffff',2.4);
 if(dark){glow(800,H-40,520,'#ffffff',.22);glow(800,260,420,'#5a5560',.25);}
 // faint floor sheen and scuffs
 for(let i=0;i<60;i++){const y=H+20+Math.pow(rnd(),1.3)*(1000-H-20),x=rnd()*1600;line(x,y,x+30+rnd()*80,y,dark?'rgba(255,255,255,.04)':'rgba(120,110,130,.07)',1);}
 const wash=c.createRadialGradient(800,820,40,800,820,640);wash.addColorStop(0,dark?'rgba(255,255,255,.06)':'rgba(255,255,255,.35)');wash.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=wash;c.fillRect(0,H,1600,1000-H);
}
