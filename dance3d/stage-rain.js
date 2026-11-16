// Stage 'rain' for the song hat-mua-vuong-van (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='rain';
export const tint={disc:0xe0c3d5,ring:0xfffbfe};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xf2f4ff,rim:0xb0c8ff,sky:0xeef2ff,gnd:0x3a4050,beam:0xd0dcff,dust:0xe8eeff,floor:0x161a22,gc:0xf6f8ff,ge:0x4a5268,wall:.9};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
import {paintGeneric} from './stage-generic.js?v=1611.0956';
export function paint(c,tools){paintGeneric(c,tools,'rain');}
