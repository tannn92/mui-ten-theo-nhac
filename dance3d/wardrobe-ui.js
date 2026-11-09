const key='spike-wardrobe-v1',physicalSlots=['hair','top','bottom','shoes'];
const accessoryDefaults=[{id:'none',label:'Không'},{id:'headphones',label:'Tai nghe'},{id:'bow',label:'Nơ tóc'},{id:'bracelets',label:'Vòng tay'}];
export function getWardrobeOptions(config={}){
 const variants=config.variants||[{id:'mint',labels:{}},{id:'rose',labels:{}}];
 const options=Object.fromEntries(physicalSlots.map(slot=>{const custom=config.options?.[slot];const values=Array.isArray(custom)?custom:variants.map((v,i)=>({id:v.id,label:v.labels?.[slot]||v.id,variant:i}));return[slot,values.filter(o=>Number.isInteger(o.variant)&&o.variant>=0&&o.variant<variants.length).map(o=>({...o}))];}));
 options.accessory=(config.accessories||accessoryDefaults).map(o=>({...o}));
 options.face=(config.faces||[{id:'gentle',label:'Dịu dàng',values:{happy:.18}}]).map(o=>({...o}));return options;
}
export function wardrobeDefaults(config={}){const options=getWardrobeOptions(config);return Object.fromEntries(Object.entries(options).map(([slot,values])=>{const fallback=slot==='accessory'||slot==='face'?0:Math.min(1,values.length-1),value=config.defaults?.[slot];return[slot,Number.isInteger(value)&&value>=0&&value<values.length?value:Math.max(0,fallback)];}));}
export function readWardrobe(config={}){
 const options=getWardrobeOptions(config),defaults=wardrobeDefaults(config);let saved=null;
 try{const raw=localStorage.getItem(key);if(raw!==null)saved=JSON.parse(raw);else{const legacy=localStorage.getItem('spike-outfit');if(legacy==='mint'||legacy==='rose')saved=Object.fromEntries(physicalSlots.map(s=>[s,legacy==='mint'?0:1]));}}catch{}
 // Migrate old four-slot saves independently. A malformed one-slot value must not
 // discard valid choices in the other slots; newly added accessories default off.
 return Object.fromEntries(Object.entries(options).map(([slot,values])=>{const v=saved?.[slot];return[slot,Number.isInteger(v)&&v>=0&&v<values.length?v:defaults[slot]];}));
}
export function saveWardrobe(outfit){try{localStorage.setItem(key,JSON.stringify(outfit));localStorage.setItem('spike-outfit',physicalSlots.every(s=>outfit[s]===0)?'mint':physicalSlots.every(s=>outfit[s]===1)?'rose':'mixed');}catch{}}
// ---- Presentation only (UI pass 2026-11-09). Every choice is a big tile with a picture drawn in code, so a child who
// cannot read yet can still choose; the label stays under the picture for the grown-ups (button text = the label, as before).
// The data functions above, equip() and saving are unchanged. Pictures: known option ids first, then words in the label,
// so a new item still gets a sensible picture. Colours were checked against the 3D clothes. ----
const C={pink:['#ffa6cb','#d9578f'],hotpink:['#ff6fa8','#c2286a'],white:['#ffffff','#a998be'],cream:['#f6efe3','#b49c78'],black:['#433c4b','#17121c'],purple:['#6a52a0','#3b2a66'],mint:['#86dcd3','#3a9d92'],navy:['#3a5ba6','#213a74'],brown:['#9a6240','#5d3820'],grey:['#dcd8e3','#8f88a3'],red:['#ef4a72','#a81f47'],gold:['#ffd24a','#c48a00'],blue:['#8cc2ff','#3d7bd6']};
const HAIR=['#5e3b2c','#3a2219'],SKIN=['#ffe2cf','#e2a988'],INK='#3b1d52';
const HAIR_COLORS={blonde:['#f6dc8c','#c9a24f'],lightbrown:['#c98f5a','#8f5f35'],brown:['#7a4a2a','#4f2e18'],black:['#2f2a33','#141018'],purple:['#b79be6','#7d62b8'],pink:['#e2479a','#a4245f'],red:['#c8373e','#8a1f27']};
const ART={
 hair:{mint:['bob'],rose:['buns'],street:['long'],sport:['tails'],'hat-mua-chest-hair':['long','lightbrown'],'hat-mua-chest-hair-dark':['long','brown'],'girl-xinh-1-hair':['long','blonde'],'tai-sinh-1-hair':['long','black'],'huntrix-rumi-hair':['buns','purple'],'huntrix-mira-hair':['long','pink'],'huntrix-zoey-hair':['bob','black']},
 top:{mint:['hoodie','mint'],rose:['blouse','white'],street:['jacket','black'],sport:['vest','white'],'puff-hoodie':['hoodie','mint','puff'],sailor:['sailor','white'],'dolce-glitter':['crop','pink','glitter'],'dolce-shirt':['shirt','pink'],'huntrix-golden-lead-top':['coat','cream'],'huntrix-golden-left-top':['coat','cream'],'huntrix-golden-right-top':['coat','cream']},
 bottom:{mint:['shorts','black','mint'],rose:['skirt','pink'],street:['cargo','black'],sport:['capri','purple'],'tiered-skirt':['tiered','pink'],'wide-pants':['wide','black'],'dolce-skirt':['long','pink'],'dolce-pants':['wide','white'],'huntrix-golden-lead-bottom':['skirt','black'],'huntrix-golden-left-bottom':['skirt','black'],'huntrix-golden-right-bottom':['shorts','black']},
 shoes:{mint:['sneaker','black'],rose:['laceboot','brown'],street:['platform','grey'],sport:['sneaker','hotpink'],'fur-boots':['furboot','brown'],'wing-sneakers':['sneaker','black','wing'],'dolce-boots':['boot','white'],'dolce-sneakers':['sneaker','white'],'huntrix-golden-lead-shoes':['tallboot','black'],'huntrix-golden-left-shoes':['tallboot','black'],'huntrix-golden-right-shoes':['tallboot','black']},
 accessory:{none:['none'],headphones:['headphones','hotpink'],bow:['bow','pink'],bracelets:['bracelets','hotpink'],cowboy:['hat','pink']},
 face:{gentle:['gentle'],smile:['smile'],playful:['playful'],surprise:['surprise']}
};
function guess(slot,label){
 const t=String(label||'').toLowerCase(),c=/hồng/.test(t)?'pink':/trắng/.test(t)?'white':/đen/.test(t)?'black':/tím/.test(t)?'purple':/bạc hà|xanh lá/.test(t)?'mint':/xanh/.test(t)?'blue':/đỏ/.test(t)?'red':/vàng/.test(t)?'gold':/nâu/.test(t)?'brown':/kem/.test(t)?'cream':'';
 if(slot==='hair')return[/bob|ngắn/.test(t)?'bob':/búi|tết/.test(t)?'buns':/đuôi/.test(t)?'tails':'long',/vàng nâu/.test(t)?'lightbrown':/vàng/.test(t)?'blonde':/đen/.test(t)?'black':/tím/.test(t)?'purple':/hồng/.test(t)?'pink':/đỏ/.test(t)?'red':/nâu/.test(t)?'brown':''];
 if(slot==='top')return[/hoodie/.test(t)?'hoodie':/khoác/.test(t)?'jacket':/gile/.test(t)?'vest':/thủy thủ/.test(t)?'sailor':/sơ mi/.test(t)?'shirt':/lấp lánh|croptop/.test(t)?'crop':'blouse',c||'pink',/lấp lánh/.test(t)?'glitter':/tay phồng/.test(t)?'puff':''];
 if(slot==='bottom')return[/váy/.test(t)?(/tầng/.test(t)?'tiered':/dài|bèo/.test(t)?'long':'skirt'):/short/.test(t)?'shorts':/lửng/.test(t)?'capri':/túi hộp/.test(t)?'cargo':/rộng/.test(t)?'wide':'cargo',c||'blue'];
 if(slot==='shoes')return[/bốt/.test(t)?(/lông/.test(t)?'furboot':/dây/.test(t)?'laceboot':'boot'):/đế dày/.test(t)?'platform':'sneaker',c||'white',/cánh/.test(t)?'wing':''];
 if(slot==='accessory')return[/không/.test(t)?'none':/tai nghe/.test(t)?'headphones':/nơ/.test(t)?'bow':/vòng/.test(t)?'bracelets':/mũ|nón/.test(t)?'hat':'sparkle',c||'pink'];
 if(slot==='face')return[/cười/.test(t)?'smile':/nghịch/.test(t)?'playful':/ngạc|bất ngờ/.test(t)?'surprise':'gentle'];
 return['sparkle'];
}
const shade=(h,k=.86)=>'#'+[1,3,5].map(i=>Math.min(255,Math.round(parseInt(h.slice(i,i+2),16)*k)).toString(16).padStart(2,'0')).join('');
// a sticker: white outline, then the colour with a darker edge; Q = a detail without the white outline
const P=(d,f,e,x='')=>`<path d="${d}" fill="#fff" stroke="#fff" stroke-width="6" stroke-linejoin="round"/><path d="${d}" fill="${f}" stroke="${e}" stroke-width="2.2" stroke-linejoin="round"${x}/>`;
const Q=(d,f,e,w=1.8)=>`<path d="${d}" fill="${f}" stroke="${e}" stroke-width="${w}" stroke-linejoin="round"/>`;
const circ=(x,y,r)=>`M${x-r} ${y}a${r} ${r} 0 1 0 ${2*r} 0a${r} ${r} 0 1 0 ${-2*r} 0Z`;
const spark=(x,y,r,f)=>`<path d="M${x} ${y-r}Q${x+r*.2} ${y-r*.2} ${x+r} ${y}Q${x+r*.2} ${y+r*.2} ${x} ${y+r}Q${x-r*.2} ${y+r*.2} ${x-r} ${y}Q${x-r*.2} ${y-r*.2} ${x} ${y-r}Z" fill="${f}"/>`;
const bow=(x,y,f,e,k=1)=>`<g transform="translate(${x} ${y}) scale(${k})"><path d="M0 0L-9 -6Q-11.5 0 -9 6ZM0 0L9 -6Q11.5 0 9 6Z" fill="${f}" stroke="${e}" stroke-width="1.6" stroke-linejoin="round"/><circle r="2.6" fill="${f}" stroke="${e}" stroke-width="1.4"/></g>`;
const LONG='M22 10L26 8Q32 13 38 8L42 10L50 15L58 43L50 46L44 27L44 55Q32 58 20 55L20 27L14 46L6 43L14 15Z',CROP='M22 10L26 8Q32 13 38 8L42 10L50 15L58 43L50 46L44 27L44 39Q32 42 20 39L20 27L14 46L6 43L14 15Z',VEST='M21 10L26 8Q32 19 38 8L43 10L46 24L44 55Q32 58 20 55L18 24Z',BAND='M19.5 7H44.5V13H19.5Z';
function top(kind,c,x){
 const[f,e]=C[c]||C.pink;let s='';
 if(kind==='hoodie')s+=P('M21 12Q32 -2 43 12Q32 17 21 12Z',shade(f,.93),e);
 s+=P(kind==='vest'?VEST:kind==='crop'?CROP:LONG,f,e);
 if(kind==='hoodie')s+=Q('M24 40L40 40L42 50Q32 52 22 50Z',shade(f,.9),e)+'<path d="M29 12L28.5 22M35 12L35.5 22" stroke="#fff" stroke-width="2" stroke-linecap="round"/>';
 if(x==='puff')s+=P('M13 16Q10 7 18 8Q25 9 22 17Z',f,e)+P('M51 16Q54 7 46 8Q39 9 42 17Z',f,e);
 if(kind==='jacket')s+=Q('M26 8Q32 13 38 8L35 55L29 55Z','#9b94a6',e)+`<path d="M26 8L23 22L29 30M38 8L41 22L35 30" fill="none" stroke="#8d8696" stroke-width="2" stroke-linejoin="round"/>`;
 if(kind==='coat')s+=`<path d="M26 8L32 16L38 8" fill="none" stroke="${e}" stroke-width="2"/><g fill="#ffd24a" stroke="#c48a00" stroke-width="1.2">${[30,38,46].map(y=>`<circle cx="28" cy="${y}" r="2"/><circle cx="36" cy="${y}" r="2"/>`).join('')}<rect x="12" y="12" width="10" height="4.5" rx="2.2" transform="rotate(22 17 14)"/><rect x="42" y="12" width="10" height="4.5" rx="2.2" transform="rotate(-22 47 14)"/></g>`;
 if(kind==='vest')s+=`<g fill="${e}">${[25,33,41,49].map(y=>`<circle cx="32" cy="${y}" r="1.6"/>`).join('')}</g>`;
 if(kind==='blouse')s+=bow(32,13,'#ef4a72','#a81f47',.85);
 if(kind==='sailor')s+=Q('M23 9L32 24L41 9L47 13L45 21L32 28L19 21L17 13Z','#3a5ba6','#213a74')+'<path d="M19.6 17L32 25L44.4 17" fill="none" stroke="#fff" stroke-width="1.6"/>'+bow(32,27,'#ef4a72','#a81f47',.7);
 if(kind==='shirt')s+=Q('M26 8L24 16L31 13Z','#fff',e)+Q('M38 8L40 16L33 13Z','#fff',e)+Q('M32 13L29.5 17L31 41L32 44L33 41L34.5 17Z','#8f88a3','#5d566e');
 if(x==='glitter')s+=spark(27,22,4,'#fff')+spark(37,30,3,'#ffe27a')+spark(30,34,2.4,'#fff')+spark(16,30,2.4,'#fff')+spark(49,33,2.4,'#ffe27a');
 return s;
}
function bottom(kind,c,x){
 const[f,e]=C[c]||C.blue,lace='<path d="M14 44Q32 50 50 44" fill="none" stroke="#fff" stroke-width="2.6" stroke-dasharray="1 4" stroke-linecap="round"/>';
 if(kind==='skirt')return P('M22 12L42 12L52 46Q32 52 12 46Z',f,e)+Q(BAND,shade(f),e)+lace;
 if(kind==='tiered')return P('M17 28Q32 33 47 28L53 48Q32 54 11 48Z',f,e)+P('M22 12L42 12L47 30Q32 35 17 30Z',f,e)+Q(BAND,shade(f),e)+'<path d="M13 46.5Q32 52.5 51 46.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-dasharray="1 4" stroke-linecap="round"/>';
 if(kind==='long')return P('M23 9L41 9L51 55Q46 59 41 55Q36 60 32 55Q28 60 23 55Q18 59 13 55Z',f,e)+Q('M22 6H42V12H22Z',shade(f),e)+'<path d="M27 15L24 52M37 15L40 52M32 15V54" stroke="#fff" stroke-opacity=".75" stroke-width="1.6"/>';
 if(kind==='shorts')return P('M18 12L46 12L50 38L35 40L32 27L29 40L14 38Z',f,e)+Q('M17.5 9H46.5V15H17.5Z',shade(f),e)+(x?`<path d="M14.6 35L29.4 37M34.6 37L49.4 35" stroke="${(C[x]||C.mint)[0]}" stroke-width="4"/>`:'');
 if(kind==='wide')return P('M20 10L44 10L51 57L35 57L32 26L29 57L13 57Z',f,e)+Q(BAND,shade(f),e);
 if(kind==='capri')return P('M20 10L44 10L45 46L35 46L32 24L29 46L19 46Z',f,e)+Q(BAND,shade(f),e);
 return P('M20 10L44 10L45 57L35 57L32 24L29 57L19 57Z',f,e)+Q(BAND,shade(f),e)+Q('M20.5 31H27.5V41H20.5Z',shade(f,.8),e,1.4)+Q('M36.5 31H43.5V41H36.5Z',shade(f,.8),e,1.4);
}
function shoe(kind,c,x){
 const[f,e]=C[c]||C.white,sole=y=>Q(`M9 ${y}H57Q60 ${y} 60 ${y+3.5}Q60 ${y+7} 57 ${y+7}H9Q6 ${y+7} 6 ${y+3.5}Q6 ${y} 9 ${y}Z`,'#fff','#a998be');let s='';
 if(kind==='sneaker'){s=(x==='wing'?P('M13 32Q2 26 5 15Q10 23 15 25Q10 17 14 10Q18 20 21 28Z','#fff','#a998be'):'')+P('M9 42Q8 30 19 28L28 27Q34 35 47 37Q57 38 57 44L57 46L9 46Z',f,e)+sole(44)+`<path d="M27 31L23 34M31 33L27 36M35 34.5L31 37.5" stroke="${c==='white'||c==='grey'?'#ff6fa8':'#fff'}" stroke-width="2" stroke-linecap="round"/>`;}
 else if(kind==='platform')s=P('M10 38Q11 27 23 27L33 27Q41 33 50 35Q57 36 57 40L57 41L10 41Z',f,e)+Q('M9 40H57Q61 40 61 45V50Q61 54 57 54H9Q5 54 5 50V45Q5 40 9 40Z','#fff','#a998be')+'<path d="M25 31L22 34M30 31.5L27 35" stroke="#fff" stroke-width="2" stroke-linecap="round"/>';
 else{const y0=kind==='tallboot'?3:12;s=P(`M14 ${y0}L32 ${y0}L32 33Q45 33 53 38Q57 40 57 45L57 46L14 46Z`,f,e)+sole(44);
  if(kind==='laceboot')s+='<path d="M18 17L28 23M28 17L18 23M18 25L28 31M28 25L18 31" stroke="#f3dcc8" stroke-width="1.8" stroke-linecap="round"/>';
  if(kind==='furboot')s+=`<g fill="#fff6e8" stroke="#d8c3a5" stroke-width="1.2">${[14,19,24,29,33].map((v,i)=>`<circle cx="${v}" cy="${12+(i%2)}" r="4.4"/>`).join('')}</g>`;
  if(kind==='tallboot')s+=`<path d="M14 9H32" stroke="${shade(f,1.5)}" stroke-width="2"/>`;}
 return s;
}
const eyes=(y=38)=>`<ellipse cx="26.5" cy="${y}" rx="2.1" ry="2.7" fill="${INK}"/><ellipse cx="37.5" cy="${y}" rx="2.1" ry="2.7" fill="${INK}"/><circle cx="25.7" cy="${y-1}" r=".8" fill="#fff"/><circle cx="36.7" cy="${y-1}" r=".8" fill="#fff"/><ellipse cx="22.5" cy="${y+5}" rx="3" ry="1.8" fill="#ff9fb5" opacity=".75"/><ellipse cx="41.5" cy="${y+5}" rx="3" ry="1.8" fill="#ff9fb5" opacity=".75"/><path d="M29.5 ${y+6.5}Q32 ${y+8.5} 34.5 ${y+6.5}" fill="none" stroke="#c2286a" stroke-width="1.6" stroke-linecap="round"/>`;
function head(kind,color){
 const[h,he]=HAIR_COLORS[color]||HAIR,bangs=Q('M17.5 34Q18 19 32 19Q46 19 46.5 34Q41 27 36 29Q33 25 30 29Q24 26 17.5 34Z',h,he);let back='';
 if(kind==='bob')back=P('M13 35Q12 13 32 12Q52 13 51 35L51 48Q46 52 42 48L42 31L22 31L22 48Q18 52 13 48Z',h,he);
 else if(kind==='buns')back=P(circ(19,14,7.5),h,he)+P(circ(45,14,7.5),h,he)+P('M15 36Q14 16 32 15Q50 16 49 36Z',h,he)+P(circ(16,43,3.8)+circ(15.4,50,3.5)+circ(15,56.5,3.2),h,he)+P(circ(48,43,3.8)+circ(48.6,50,3.5)+circ(49,56.5,3.2),h,he);
 else if(kind==='tails')back=P('M19 19Q3 22 5 42Q7 55 15 61Q12 46 16 34Q18 26 23 22Z',h,he)+P('M45 19Q61 22 59 42Q57 55 49 61Q52 46 48 34Q46 26 41 22Z',h,he)+P('M15 35Q15 15 32 14Q49 15 49 35Z',h,he)+'<circle cx="20" cy="20" r="2.8" fill="#ff6fa8"/><circle cx="44" cy="20" r="2.8" fill="#ff6fa8"/>';
 else back=P('M12 34Q12 12 32 11Q52 12 52 34L53 62L43 62L42 34L22 34L21 62L11 62Z',h,he);
 return back+P(circ(32,38,14.5),SKIN[0],SKIN[1])+eyes(38)+bangs;
}
function face(kind){
 const[h,he]=HAIR,blush='<ellipse cx="19.5" cy="43" rx="3.4" ry="2" fill="#ff9fb5" opacity=".75"/><ellipse cx="44.5" cy="43" rx="3.4" ry="2" fill="#ff9fb5" opacity=".75"/>',open=(x,y)=>`<ellipse cx="${x}" cy="${y}" rx="2.6" ry="3.4" fill="${INK}"/><circle cx="${x-.9}" cy="${y-1.2}" r="1" fill="#fff"/>`,shut=x=>`<path d="M${x-4} 37Q${x} 31.5 ${x+4} 37" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
 let s=P('M9 34Q9 9 32 9Q55 9 55 34L55 52Q50 57 45 52L45 36L19 36L19 52Q14 57 9 52Z',h,he)+P(circ(32,35,20),SKIN[0],SKIN[1])+Q('M12.5 32Q13 13 32 13Q51 13 51.5 32Q44 22 37 25Q33 19 29 25Q20 21 12.5 32Z',h,he)+blush;
 if(kind==='smile')s+=shut(24.5)+shut(39.5)+Q('M26 43Q32 52 38 43Z','#ef4a72','#a81f47');
 else if(kind==='playful')s+=shut(24.5)+open(39.5,36)+'<path d="M27 44Q32 49 37 44" fill="none" stroke="#a81f47" stroke-width="2" stroke-linecap="round"/>'+Q('M31 46.5Q32.5 52 35.5 47.5Z','#ff8fb0','#c2286a',1.2);
 else if(kind==='surprise')s+=open(24.5,35)+open(39.5,35)+`<path d="M20.5 27Q24.5 24.5 28.5 27M35.5 27Q39.5 24.5 43.5 27" fill="none" stroke="${he}" stroke-width="2" stroke-linecap="round"/>`+Q(circ(32,46,3.4),'#ef4a72','#a81f47',1.4);
 else s+=open(24.5,36)+open(39.5,36)+'<path d="M28 44.5Q32 48 36 44.5" fill="none" stroke="#c2286a" stroke-width="2" stroke-linecap="round"/>';
 return s;
}
function extra(kind,c){
 const[f,e]=C[c]||C.pink;
 if(kind==='none')return'<circle cx="32" cy="32" r="18" fill="#fff" stroke="#cdbde0" stroke-width="3.5" stroke-dasharray="6 5" stroke-linecap="round"/>';
 if(kind==='headphones')return`<path d="M13 38Q12 12 32 12Q52 12 51 38" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/><path d="M13 38Q12 12 32 12Q52 12 51 38" fill="none" stroke="${e}" stroke-width="5.5" stroke-linecap="round"/>`+P('M7 34Q7 29 12 29H17V51H12Q7 51 7 46Z',f,e)+P('M57 34Q57 29 52 29H47V51H52Q57 51 57 46Z',f,e);
 if(kind==='bow')return P('M32 32L13 19Q7 32 13 45ZM32 32L51 19Q57 32 51 45Z',f,e)+Q('M30 36L25 53L30 50L33 37ZM34 36L39 53L34 50L31 37Z',shade(f,.92),e)+P(circ(32,32,5.5),shade(f,.9),e);
 if(kind==='bracelets')return`<ellipse cx="27" cy="38" rx="15" ry="8" fill="none" stroke="#fff" stroke-width="9"/><ellipse cx="27" cy="38" rx="15" ry="8" fill="none" stroke="${f}" stroke-width="4.5"/><ellipse cx="37" cy="27" rx="15" ry="8" fill="none" stroke="#fff" stroke-width="9"/><ellipse cx="37" cy="27" rx="15" ry="8" fill="none" stroke="#ffd24a" stroke-width="4.5"/>`+[[16,33],[38,45],[26,21],[50,31]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2.6" fill="#fff" stroke="${e}" stroke-width="1.2"/>`).join('');
 if(kind==='hat')return P('M17 38Q15 17 26 15Q32 20 38 15Q49 17 47 38Z',f,e)+Q('M17.4 32Q32 36.5 46.6 32L46.9 37Q32 41.5 17.1 37Z',shade(f,.72),e,1.4)+P('M4 39Q8 33 15 36Q32 42 49 36Q56 33 60 39Q56 48 32 48Q8 48 4 39Z',f,e);
 return spark(32,32,20,'#ffd24a');
}
function art(slot,v){
 const a=ART[slot]?.[v?.id]||guess(slot,v?.label);
 if(slot==='hair')return head(a[0],a[1]);if(slot==='top')return top(a[0],a[1],a[2]);if(slot==='bottom')return bottom(a[0],a[1],a[2]);
 if(slot==='shoes')return shoe(a[0],a[1],a[2]);if(slot==='face')return face(a[0]);return extra(a[0],a[1]);
}
// a whole outfit: its top over its bottom, its shoes at the feet, and a gold sparkle
function setArt(set,options){
 const one=s=>{const i=set.selection?.[s],v=options[s]?.[i];return Number.isInteger(i)&&v?art(s,v):'';},t=one('top'),b=one('bottom'),sh=one('shoes');
 return(b?`<g transform="translate(15 27) scale(.53)">${b}</g>`:'')+(t?`<g transform="translate(10 -1) scale(.68)">${t}</g>`:'')+(sh?`<g transform="translate(1 46) scale(.3)">${sh}</g><g transform="translate(63 46) scale(-.3 .3)">${sh}</g>`:'')+spark(55,8,6,'#ffd24a')+spark(8,22,3.6,'#ffd24a');
}
const HEAD_ICON={sets:()=>`<path d="M32 21V16Q32 12 36 11.5Q40 11 40 7.5Q40 4 36 4Q33 4 32 7" fill="none" stroke="#c48a00" stroke-width="3" stroke-linecap="round"/>`+P('M32 21L7 40Q5 45 10 45H54Q59 45 57 40Z','#ffd24a','#c48a00')+'<path d="M15 41H49" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>'+spark(52,12,6,'#ff6fa8'),hair:()=>head('buns'),top:()=>top('blouse','white'),bottom:()=>bottom('skirt','pink'),shoes:()=>shoe('sneaker','hotpink'),accessory:()=>extra('bow','pink'),face:()=>face('smile')};
const svg=(inner,box='0 0 64 64')=>`<svg viewBox="${box}" aria-hidden="true" focusable="false">${inner}</svg>`;
// iconUrl(name) -> URL of a real render of the item (reports/icon-render.cjs: set-<id>, <slot>-<id>, face-<id>) or null
export function mountWardrobe(container,config,equip,current,iconUrl=()=>null){
 container.replaceChildren();container.classList.add('wardrobe3d');const titles={hair:'Tóc',top:'Áo',bottom:'Quần / váy',shoes:'Giày',accessory:'Phụ kiện',face:'Gương mặt · biểu cảm'},buttons=[],sets=[],options=getWardrobeOptions(config);
 // a quick "boing" on the tile, and an event the page can answer with sparkles
 const jump=document.createElement('nav');jump.className='wjump';jump.setAttribute('aria-label','Chọn nhóm đồ');container.append(jump);
 const fire=(b,detail)=>{b.classList.remove('wpop');void b.offsetWidth;b.classList.add('wpop');b.dispatchEvent(new CustomEvent('wardrobe-equip',{bubbles:true,detail}));};
 const section=(slot,label)=>{const s=document.createElement('section'),head=document.createElement('div'),ic=document.createElement('span'),title=document.createElement('strong'),items=document.createElement('div');s.dataset.wardrobeSlot=slot;s.setAttribute('role','group');title.id='wsec-'+slot;s.setAttribute('aria-labelledby',title.id);head.className='wsec-head';ic.className='wsec-ic';ic.innerHTML=svg((HEAD_ICON[slot]||(()=>spark(32,32,20,'#ffd24a')))());title.textContent=label;head.append(ic,title);items.className='wgrid'+(slot==='sets'?' wsets':'');s.append(head,items);container.append(s);const j=document.createElement('button');j.type='button';j.className='wj';j.dataset.jump=slot;j.setAttribute('aria-label',label);j.innerHTML=ic.innerHTML;j.onclick=()=>s.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});jump.append(j);return items;};
 const tile=(label,pic,photo)=>{const b=document.createElement('button'),p=document.createElement('span'),name=document.createElement('span');b.type='button';b.className='wtile';p.className='wt-pic';
  if(photo){const img=document.createElement('img');img.src=photo;img.alt='';img.decoding='async';img.draggable=false;p.classList.add('wt-photo');p.append(img);}else p.innerHTML=svg(pic);name.className='wt-name';const m=/^(.+?) · (.+)$/.exec(label||'');
  if(m){const brand=document.createElement('span'),sep=document.createElement('span'),rest=document.createElement('span');brand.className='wt-brand';brand.dataset.brand=m[1].toLowerCase();brand.textContent=m[1];sep.className='wt-sep';sep.textContent=' · ';rest.textContent=m[2];name.append(brand,sep,rest);}else name.textContent=label;
  b.append(p,name);return b;};
 if(config.sets?.length){const items=section('sets','Chọn cả bộ');for(const set of config.sets){const photo=iconUrl('set-'+set.id),b=tile(set.label,photo?'':setArt(set,options),photo);b.classList.add('wset');b.dataset.outfitSet=set.id;b.onclick=()=>{for(const[slot,index]of Object.entries(set.selection))equip(slot,index);fire(b,{set:set.id});};items.append(b);sets.push([b,set]);}}
 for(const [slot,values] of Object.entries(options)){const items=section(slot,titles[slot]||slot);
  values.forEach((v,i)=>{if(v.crewOnly)return;const photo=iconUrl(slot+'-'+v.id),b=tile(v.label,photo?'':art(slot,v),photo);b.dataset.slot=slot;b.dataset.choice=i;b.dataset.optionId=v.id;b.onclick=()=>{equip(slot,i);fire(b,{slot,index:i});};items.append(b);buttons.push(b);});
 }
 // a whole-outfit tile looks chosen while every piece of it is on
 const refresh=()=>{const now=current();buttons.forEach(b=>b.setAttribute('aria-pressed',now[b.dataset.slot]===Number(b.dataset.choice)));sets.forEach(([b,set])=>b.setAttribute('aria-pressed',Object.entries(set.selection||{}).every(([s,i])=>now[s]===i)));};refresh();return refresh;
}
