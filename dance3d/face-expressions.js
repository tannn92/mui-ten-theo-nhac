const names=['happy','relaxed','surprised','angry','sad','blinkLeft','blinkRight'];
// Facial presets use the model's authored morph targets, keeping its head/neck
// geometry and identity. Blinking stays tied to the same supplied dance time.
export function applyFaceExpression(vrm,choice,time){
 const manager=vrm.expressionManager;if(!manager)return;
 for(const name of names)manager.setValue(name,Math.max(0,Math.min(1,choice?.values?.[name]||0)));
 manager.setValue('blink',Math.pow(Math.max(0,Math.sin(time*1.8)),40));
}
