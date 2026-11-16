// Stage 'how' for the song how-its-done (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='how';
export const tint={disc:0xe0c3d5,ring:0xfffbfe};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xfff0f6,rim:0xff90d0,sky:0xfff0f6,gnd:0x4a3a5a,beam:0xffb0e0,dust:0xffe0f0,floor:0x1c1424,gc:0xfff4f8,ge:0x5a4070,wall:.88};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
import {paintGeneric} from './stage-generic.js?v=1611.0956';
export function paint(c,tools){paintGeneric(c,tools,'how');}
