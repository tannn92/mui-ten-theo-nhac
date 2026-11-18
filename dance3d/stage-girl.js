// Stage 'girl' for the song girl-xinh-that-tinh (split out of song-backgrounds.js, mv-look 2026-11-15, pixel-identical).
// ONE FILE PER SONG so per-song polish can run in parallel: this file owns the song's painted backdrop (paint), the stage
// disc/ring colours (tint), the MV light palette (mv, read by mv-look.js) and the MV camera hints (hints, read by
// mv-director.js). Painted in code: no photos, people, text or logos. Canvas space 1600x1000; the floor line (horizon) at
// ~y 560-600 sits on the 3D floor under the MV camera; keep the textures' size as is (<= 1024 px tall).
export const id='girl';
export const tint={disc:0xe0c3d5,ring:0xfffbfe};
// MV light palette: key/rim light, fill sky/ground, beam + dust colour, 3D floor, grade (centre/edge), wall brightness
export const mv={key:0xfff4f4,rim:0xffa0c8,sky:0xfff4f8,gnd:0x5a4a5a,beam:0xffd0e8,dust:0xfff0f8,floor:0x241c24,gc:0xfff8f8,ge:0x6a5068,wall:.92};
// MV camera hints (optional): force:[{from,to,kind}] (kind: wide crane full hero side close arch), noClose:[[from,to]]
export const hints={};
import {paintGeneric} from './stage-generic.js?v=1611.2031';
export function paint(c,tools){paintGeneric(c,tools,'girl');}
