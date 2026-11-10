import {buildGoldenStageStyles} from './golden-stage-styles.js?v=1011.0706';
import {buildGoldenHair} from './golden-hair.js?v=1011.0706';
import {buildHuntrixHair} from './huntrix-hair.js?v=1011.0706';
import {buildHuntrixTrioStyles} from './huntrix-trio-styles.js?v=1011.0706';
import {buildTaiSinhCrewStyles} from './tai-sinh-crew-styles.js?v=1011.0706';
import {buildTaiSinhHair} from './tai-sinh-hair.js?v=1011.0706';
import {buildTaiSinhStyles} from './tai-sinh-styles.js?v=1011.0706';
import {buildGirlXinhBoyStyles} from './girl-xinh-boys-styles.js?v=1011.0706';
import {buildGirlXinhHair} from './girl-xinh-hair.js?v=1011.0706';
import {buildGirlXinhLeadStyles} from './girl-xinh-lead.js?v=1011.0706';
import {buildDolceCrewHair} from './dolce-hair.js?v=1011.0706';
import {buildDolceCrewStyles} from './dolce-crew-styles.js?v=1011.0706';
import {buildHatMuaCrewHair} from './crew-hair.js?v=1011.0706';
import {buildHatMuaCrewStyles} from './crew-styles.js?v=1011.0706';
import {buildClothingStyles} from './clothing-styles.js?v=1011.0706';
import {buildHuntrixStyles} from './huntrix-styles.js?v=1011.0706';
import {buildHatMuaStyles} from './hat-mua-styles.js?v=1011.0706';

// Every cooperative step is a synchronous rest-pose transaction. The renderer
// always sees the live pose, never a donor left at rest across an event-loop yield.
function capture(nodes){return nodes.map(node=>({node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone(),matrix:node.matrix.clone(),matrixWorld:node.matrixWorld.clone(),dirty:node.matrixWorldNeedsUpdate}));}
function save(states){for(const s of states){s.position.copy(s.node.position);s.quaternion.copy(s.node.quaternion);s.scale.copy(s.node.scale);s.matrix.copy(s.node.matrix);s.matrixWorld.copy(s.node.matrixWorld);s.dirty=s.node.matrixWorldNeedsUpdate;}return states;}
function restore(states){for(const s of states){s.node.position.copy(s.position);s.node.quaternion.copy(s.quaternion);s.node.scale.copy(s.scale);s.node.matrix.copy(s.matrix);s.node.matrixWorld.copy(s.matrixWorld);s.node.matrixWorldNeedsUpdate=s.dirty;}}
export function createLazyStyles(variants,options){
 const nodes=new Set();
 for(const {vrm} of variants){vrm.scene.traverse(node=>nodes.add(node));for(let node=vrm.scene.parent;node;node=node.parent)nodes.add(node);}
 const nodeList=[...nodes],rest=capture(nodeList),liveState=capture(nodeList),parts=[],records=new Map(),built=new Set(),pending=new Map();
 const stats={builds:0,milliseconds:0,steps:0,maxStepMs:0,maxTaskMs:0,slowSteps:[],choices:[]};
 let paused=false,timer=null,sequence=0;
 // User requests keep the same 5 ms slices, but skip nested timers' 4 ms clamp.
 // Message tasks still yield to rendering/input; low-priority prewarm retains timers.
 const foregroundChannel=new MessageChannel();foregroundChannel.port1.onmessage=pump;
 const keyFor=(slot,index)=>slot+':'+index;
 function validate(slot,index){const option=options[slot]?.[index];if(!Number.isInteger(index)||!option)throw Error('Món đồ không tồn tại');return option;}
 function isStyleReady(slot,index){return !validate(slot,index).style||built.has(keyFor(slot,index));}
 function isOutfitReady(outfit){return Object.entries(outfit).filter(([s])=>options[s]).every(([s,i])=>isStyleReady(s,i));}
 function taskFor(slot,index,priority){
  const option=validate(slot,index),key=keyFor(slot,index);let task=pending.get(key);
  if(task){task.priority=Math.max(task.priority,priority);return task;}
  const selected=Object.fromEntries(Object.entries(options).map(([s,items])=>[s,items.map((o,i)=>s===slot&&i===index?o:{...o,style:null})]));
  const factory=option.style==='golden-zoey-hair'?buildGoldenHair:/^golden-(rumi|mira|zoey)-(top|bottom|shoes)$/.test(option.style)?buildGoldenStageStyles:/^huntrix-(rumi|mira|zoey)-hair/.test(option.style)?buildHuntrixHair:/^huntrix-(rumi|mira|zoey)-/.test(option.style)?buildHuntrixTrioStyles:option.style.startsWith('tai-sinh-crew-')?buildTaiSinhCrewStyles:option.style.startsWith('tai-sinh-hair-')||option.style==='tai-sinh-1-hair'?buildTaiSinhHair:option.style.startsWith('tai-sinh-1-')?buildTaiSinhStyles:option.style.startsWith('girl-xinh-hair-')||option.style==='girl-xinh-1-hair'?buildGirlXinhHair:option.style.startsWith('girl-xinh-1-')?buildGirlXinhLeadStyles:option.style.startsWith('girl-xinh-crew-b')?buildGirlXinhBoyStyles:option.style.startsWith('dolce-crew-hair-')?buildDolceCrewHair:option.style.startsWith('dolce-crew-')?buildDolceCrewStyles:option.style.startsWith('hat-mua-crew-hair-')?buildHatMuaCrewHair:option.style.startsWith('hat-mua-crew-')?buildHatMuaCrewStyles:option.style.startsWith('hat-mua-')?buildHatMuaStyles:option.style.startsWith('huntrix-')?buildHuntrixStyles:buildClothingStyles;
  let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  // Sync fallback callers may have no async consumer; still propagate via throw.
  promise.catch(()=>{});
  task={key,slot,index,priority,sequence:sequence++,iterator:factory(variants,selected),promise,resolve,reject,milliseconds:0};pending.set(key,task);return task;
 }
 function step(task){
  const start=performance.now(),live=save(liveState);let result;
  try{restore(rest);result=task.iterator.next();}
  catch(error){pending.delete(task.key);task.reject(error);throw error;}
  finally{restore(live);const elapsed=performance.now()-start;task.milliseconds+=elapsed;stats.steps++;stats.maxStepMs=Math.max(stats.maxStepMs,elapsed);if(elapsed>20)stats.slowSteps.push({slot:task.slot,index:task.index,milliseconds:elapsed});}
  if(!result.done)return false;
  // Partial meshes were hidden at creation. Publish the complete option atomically.
  for(const [key,record] of result.value.records)records.set(key,record);
  parts.push(...result.value.parts);built.add(task.key);pending.delete(task.key);
  for(const {mesh} of result.value.parts){mesh.visible=false;mesh.updateWorldMatrix(false,false);}
  stats.builds++;stats.milliseconds+=task.milliseconds;stats.choices.push({slot:task.slot,index:task.index,milliseconds:task.milliseconds});
  task.resolve(records.get(task.key)?.meshes);return true;
 }
 function schedule(){if(timer!==null)return;if(![...pending.values()].some(t=>!paused||t.priority>=100))return;if([...pending.values()].some(t=>t.priority>=100||(!paused&&t.priority>=99))){timer=true;foregroundChannel.port2.postMessage(0);}else timer=setTimeout(pump,0);}
 function pump(){const taskStart=performance.now();timer=null;const task=[...pending.values()].filter(t=>!paused||t.priority>=100).sort((a,b)=>b.priority-a.priority||a.sequence-b.sequence)[0];if(!task)return;
  const slice=task.priority>=99&&task.priority<100&&!paused?12:5;try{do{if(step(task))break;}while(performance.now()-taskStart<slice);}catch(error){console.error('Wardrobe build failed',error);}stats.maxTaskMs=Math.max(stats.maxTaskMs,performance.now()-taskStart);schedule();
 }
 function ensureStyle(slot,index){if(isStyleReady(slot,index))return records.get(keyFor(slot,index))?.meshes;const task=taskFor(slot,index,100);while(!step(task)){}return records.get(task.key)?.meshes;}
 function ensureOutfit(outfit){for(const [slot,index] of Object.entries(outfit))if(options[slot])ensureStyle(slot,index);}
 function prepareOutfit(outfit,{priority=100}={}){
  const tasks=[];for(const [slot,index]of Object.entries(outfit))if(options[slot]&&!isStyleReady(slot,index))tasks.push(taskFor(slot,index,priority).promise);
  schedule();return Promise.all(tasks).then(()=>undefined);
 }
 function prewarmOutfits(outfits=[]){
  // Caller supplies song/crew priorities first. All other options follow at zero.
  const tasks=outfits.map((outfit,i)=>prepareOutfit(outfit,{priority:Math.max(1,50-i)}));
  for(const [slot,items]of Object.entries(options))items.forEach((_,index)=>tasks.push(prepareOutfit({[slot]:index},{priority:0})));
  return Promise.all(tasks).then(()=>undefined);
 }
 function setBackgroundPaused(value){paused=!!value;schedule();}
 return {parts,records,stats,ensureStyle,ensureOutfit,prepareOutfit,prewarmOutfits,isStyleReady,isOutfitReady,setBackgroundPaused,meshesFor:(slot,index)=>records.get(keyFor(slot,index))?.meshes,hide(){for(const {mesh} of parts)mesh.visible=false;}};
}
