import * as THREE from './vendor/three.module.js';

const STEP=.26;
const COLORS=['#4c6851','#7a885c','#46534d','#687365','#8c826a','#b5ad8b','#2e453f','#86b7ae','#d1c7a0','#bc9560','#6a5440','#dce0b7','#ab6548','#9bd3c6','#ffd491','#393d32','#31554c','#e9e1bf','#c8ab61','#253c38'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const mix=(a,b,t)=>a+(b-a)*t;
const hash=(x,y,z)=>{const n=Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453;return n-Math.floor(n);};
const cube=new THREE.BoxGeometry(1,1,1);
const dummy=new THREE.Object3D();
const color=new THREE.Color();

class Voxels {
 constructor(){this.blocks=[];}
 add(x,y,z,p=0,sx=STEP,sy=sx,sz=sx){this.blocks.push([x,y,z,p,sx,sy,sz]);}
 fill(x,y,z,w,h,d,p=0,step=STEP){
  for(let i=0;i<w;i++)for(let j=0;j<h;j++)for(let k=0;k<d;k++)this.add(x+i*step,y+j*step,z+k*step,p,step);
 }
 build(parent,{shadows=true,opacity=1}={}){
  const batches=new Map();
  for(const block of this.blocks){const type=block[3]===13?'cyan':block[3]===14?'amber':block[3]===7?'water':[9,12].includes(block[3])?'metal':'stone';if(!batches.has(type))batches.set(type,[]);batches.get(type).push(block);}
  for(const [type,blocks] of batches){
   const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:type==='metal'?.55:.92,metalness:type==='metal'?.48:.02,opacity,transparent:opacity<1,depthWrite:opacity===1});
   if(type==='cyan'){material.emissive.set('#7cbbb0');material.emissiveIntensity=.55;}
   if(type==='amber'){material.emissive.set('#ffd18a');material.emissiveIntensity=1.1;}
   if(type==='water'){material.emissive.set('#487f79');material.emissiveIntensity=.24;material.roughness=.42;}
   const mesh=new THREE.InstancedMesh(cube,material,blocks.length);
   blocks.forEach(([x,y,z,p,sx,sy,sz],i)=>{
    dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.set(sx*.98,sy*.98,sz*.98);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    color.set(COLORS[p]).multiplyScalar(.91+hash(x,y,z)*.18);mesh.setColorAt(i,color);
   });
   mesh.castShadow=shadows;mesh.receiveShadow=shadows;mesh.computeBoundingSphere();parent.add(mesh);
  }
  return this.blocks.length;
 }
}

function terrain(builder,engine,seed,radius,offset=[0,0,0],scale=1){
 const cells=JSON.parse(engine.terrain(seed,radius));
 for(let i=0;i<cells.length;i+=4)builder.add(offset[0]+cells[i]*STEP*scale,offset[1]+cells[i+1]*STEP*scale,offset[2]+cells[i+2]*STEP*scale,cells[i+3],STEP*scale);
}
function tree(builder,x,y,z,seed){
 for(let h=0;h<10;h++)builder.add(x,y+h*.24,z,10,.25);
 for(let h=0;h<4;h++){builder.add(x+.24*h,y+1.4+h*.17,z,10,.2);builder.add(x-.2*h,y+1.7+h*.15,z-.14*h,10,.2);}
 const crowns=[[0,2.4,0],[.64,2.2,.18],[-.64,2.6,-.22],[.14,3.05,-.37]];
 for(const [cx,cy,cz] of crowns)for(let a=-4;a<=4;a++)for(let b=-3;b<=3;b++)for(let c=-4;c<=4;c++){
  const r=a*a/17+b*b/10+c*c/17;
  if(r<1 && hash(a+seed,b,c)>.14){
   const p=hash(a+seed*2,b,c)>.55?11:hash(a,b+seed,c)>.5?1:18;
   builder.add(x+cx+a*.23,y+cy+b*.23,z+cz+c*.23,p,.23);
  }
 }
}
function lantern(builder,x,y,z){
 builder.add(x,y,z,10,.12,.55,.12);
 builder.add(x,y+.34,z,14,.24,.28,.24);
 builder.add(x,y+.54,z,9,.31,.09,.31);
}
function buildObservatory(builder,telescope){
 // Stepped octagonal foundations and a round, open-air astronomical tower.
 for(let level=0;level<3;level++)for(let x=-8;x<=8;x++)for(let z=-8;z<=8;z++){
  if(Math.abs(x)+Math.abs(z)<12 && Math.max(Math.abs(x),Math.abs(z))<=8-level)builder.add(x*.23+.45,1.1+level*.23,z*.23-.8,level===2?9:8,.23);
 }
 for(let y=0;y<22;y++)for(let x=-6;x<=6;x++)for(let z=-6;z<=6;z++){
  const r=Math.hypot(x,z);
  if(r>4.9&&r<6.25){
   const window=((y>=4&&y<=9)||(y>=14&&y<=18))&&((Math.abs(x)<=1&&Math.abs(z)>=5)||(Math.abs(z)<=1&&Math.abs(x)>=5));
   if(!window)builder.add(.45+x*.23,1.8+y*.23,-.8+z*.23,y%5===0?9:8,.23);
   else if(y===6||y===16)builder.add(.45+x*.19,1.8+y*.23,-.8+z*.19,14,.23,.7,.23);
  }
 }
 for(const [x,z] of [[-1.38,0],[1.38,0],[0,-1.38],[0,1.38]])for(let y=0;y<23;y++)builder.add(.45+x,1.7+y*.23,-.8+z,10,.18,.23,.18);
 for(let x=-8;x<=8;x++)for(let z=-8;z<=8;z++)if(Math.hypot(x,z)<8.4)builder.add(.45+x*.23,6.9,-.8+z*.23,Math.hypot(x,z)>7.1?9:16,.23);
 for(let a=0;a<30;a++){
  const angle=a/30*Math.PI*2,x=.45+Math.cos(angle)*1.82,z=-.8+Math.sin(angle)*1.82;
  builder.add(x,7.2,z,9,.1,.54,.1);builder.add(x,7.5,z,9,.18,.1,.18);
 }
 // A small exterior staircase, its steps following the tower's curve.
 for(let i=0;i<36;i++){
  const a=i*.15-1.1,r=1.65;
  builder.add(.45+Math.cos(a)*r,1.55+i*.145,-.8+Math.sin(a)*r,8,.48,.13,.48);
 }
 const base=new Voxels();
 for(let y=0;y<5;y++)base.add(0,y*.18,0,9,.42,.18,.42);
 base.add(0,.9,0,12,.65,.28,.7);base.build(telescope);
 const barrel=new THREE.Group();barrel.position.y=1.03;barrel.rotation.x=-.46;telescope.add(barrel);
 const tube=new Voxels();
 for(let z=-7;z<=5;z++)for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++){
  const r=Math.hypot(x,y),outer=z<-4?3.6:2.9;
  if(r>outer-1.3&&r<outer)tube.add(x*.17,y*.17,z*.17,z%3===0?9:12,.17);
  if(z===-7&&r<outer-1)tube.add(x*.17,y*.17,z*.17,13,.17);
 }
 tube.fill(-.7,-.7,-.8,2,2,7,9,.16);tube.build(barrel);
 telescope.position.set(.45,7,-.8);
 return barrel;
}
function buildWindmill(builder,rotor){
 const x=-3.85,z=-.5;
 for(let y=0;y<12;y++)for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)if(Math.max(Math.abs(a),Math.abs(b))===2)builder.add(x+a*.22,1.06+y*.22,z+b*.22,y%3===0?10:8,.22);
 for(let y=0;y<4;y++)for(let a=-3+y;a<=3-y;a++)for(let b=-3+y;b<=3-y;b++)builder.add(x+a*.22,3.75+y*.22,z+b*.22,16,.22);
 const blades=new Voxels();
 for(let blade=0;blade<4;blade++){
  const angle=blade*Math.PI/2;
  for(let length=1;length<=8;length++)for(let width=0;width<2;width++){
   const px=length*.2,py=width*.18-.1;
   blades.add(Math.cos(angle)*px-Math.sin(angle)*py,Math.sin(angle)*px+Math.cos(angle)*py,0,width?8:10,.18);
  }
 }
 blades.add(0,0,.08,9,.36);blades.build(rotor);rotor.position.set(x,3.32,z+.64);
 lantern(builder,x,1.3,z+.7);
}
function buildShip(parent){
 const ship=new THREE.Group();ship.rotation.y=-.55;ship.rotation.z=.08;ship.position.set(3.7,1.2,2.8);parent.add(ship);
 const b=new Voxels();
 for(let z=-6;z<=6;z++)for(let x=-3;x<=3;x++)for(let y=-2;y<=2;y++){
  const r=(x*x/10+y*y/5)/(1-Math.abs(z)/11);
  if(r<1)b.add(x*.23,y*.23,z*.25,y===2&&z<1&&z>-4?13:z%4===0?9:16,.23);
 }
 for(const side of [-1,1]){
  for(let x=3;x<=10;x++)for(let z=0;z<=Math.max(0,8-x/2);z++)b.add(side*x*.23,-.05,z*.25,hash(x,side,z)>.75?9:8,.23,.12,.23);
  for(let z=1;z<=5;z++)b.add(side*.72,-.19,z*.25,10,.3);
  b.add(side*.69,-.15,1.55,14,.38,.38,.17);b.add(side*1.01,-.48,.65,10,.13,.5,.13);
 }
 b.build(ship);
 // The solitary wanderer echoes the supplied landscape illustrations.
 const person=new Voxels();person.fill(1.8,-.05,.25,2,3,1,10,.13);person.fill(1.8,.35,.22,2,3,2,17,.13);
 person.add(1.87,.83,.29,17,.38);person.add(1.87,.84,.48,13,.28,.16,.09);
 person.add(1.85,.49,.05,16,.32,.38,.18);person.add(1.63,.42,.28,9,.12,.42,.12);person.build(ship);
 return ship;
}
function buildGarden(builder){
 for(const [x,z,seed] of [[-4.1,3.2,1],[-3.2,-3.8,7],[3.25,-3.6,4],[5.4,-.9,8],[-.8,4.1,6]])tree(builder,x,1.1,z,seed);
 // Warm stepping-stones, low grasses, tiny starflowers, and old boundary ruins.
 for(let i=0;i<23;i++){
  const a=i*.18,x=Math.sin(a)*2.8,z=2.2+Math.cos(a)*1.8;
  builder.add(x,1.18,z,5,.38,.12,.38);
 }
 for(let i=0;i<160;i++){
  const a=i*2.399,r=2.1+hash(i,0,1)*4,x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(Math.hypot(x,z*.95)>6||Math.abs(x)<2&&Math.abs(z)<2)continue;
  builder.add(x,.89,z,1,.13,.35+hash(i,2,1)*.24,.13);
  if(i%4===0){builder.add(x,1.2,z,18,.16);builder.add(x+.13,1.2,z,11,.12);builder.add(x,1.2,z+.13,11,.12);}
 }
 for(let i=0;i<11;i++){
  const x=-4.2+i*.58,z=4.4;
  builder.add(x,.97,z,8,.52,.26,.36);if(i%3===0)builder.add(x,1.27,z,8,.32,.36,.3);
 }
 for(const [x,z] of [[-2.8,2.5],[2.1,2.8],[-2.4,-2.2],[4.8,1.1],[1.3,4.6]])lantern(builder,x,1.12,z);
}
function buildBridge(builder,engine){
 terrain(builder,engine,113,7,[8.35,.25,.55],.8);
 for(let i=0;i<14;i++){
  const x=5.2+i*.235,h=1.13+Math.sin(i/13*Math.PI)*.24;
  builder.add(x,h,.65,10,.235,.14,.95);
  if(i%2===0)for(const side of [-1,1])builder.add(x,h+.33,.65+side*.43,9,.09,.62,.09);
  for(const side of [-1,1])builder.add(x,h+.68,.65+side*.43,10,.24,.08,.08);
 }
 for(let i=0;i<4;i++)builder.add(8.45,1.34+i*.24,.5,8,1.05-i*.15,.24,1.05-i*.15);
 for(let a=0;a<12;a++){const angle=a/12*Math.PI*2;builder.add(8.45+Math.cos(angle)*.53,2.53,.5+Math.sin(angle)*.53,9,.13);}
 lantern(builder,8.45,2.4,.5);
}
function cloud(parent,x,y,z,seed){
 const group=new THREE.Group(),b=new Voxels();
 for(let a=-5;a<=5;a++)for(let h=-1;h<=2;h++)for(let c=-3;c<=3;c++){
  if(a*a/28+h*h/7+c*c/12<1&&hash(a+seed,h,c)>.12)b.add(a*.55,h*.45,c*.55,11,.6,.45,.6);
 }
 b.build(group,{shadows:false,opacity:.4});group.position.set(x,y,z);parent.add(group);return group;
}

export function createSanctuary({engine,renderer,active,paused,reduced}){
 const scene=new THREE.Scene(),world=new THREE.Group();scene.add(world);
 const camera=new THREE.OrthographicCamera(-20,20,12,-12,.1,180);
 const original={tone:renderer.toneMapping,exposure:renderer.toneMappingExposure,shadow:renderer.shadowMap.enabled};
 const state={yaw:.78,pitch:.53,span:22,framing:1,focus:new THREE.Vector3(0,1.4,0),night:1,nightTarget:1,time:0,drag:null,tween:null};
 const canvas=renderer.domElement,staticBlocks=new Voxels();
 terrain(staticBlocks,engine,73,26);
 buildGarden(staticBlocks);buildBridge(staticBlocks,engine);
 const telescope=new THREE.Group(),rotor=new THREE.Group();world.add(telescope,rotor);
 const barrel=buildObservatory(staticBlocks,telescope);buildWindmill(staticBlocks,rotor);buildShip(world);
 const count=staticBlocks.build(world);
 const clouds=[[ -11,-4,3],[11,-5,7],[-9,2,-12],[13,1,-14],[-5,-9,-5]].map((p,i)=>cloud(scene,...p,i+9));
 const moonBuilder=new Voxels(),moon=new THREE.Group();
 for(let x=-7;x<=7;x++)for(let y=-7;y<=7;y++)for(let z=-7;z<=7;z++)if(Math.hypot(x,y,z)>5.8&&Math.hypot(x,y,z)<7.1)moonBuilder.add(x*.4,y*.4,z*.4,hash(x,y,z)>.7?5:11,.4);
 moonBuilder.build(moon,{shadows:false});scene.add(moon);
 const starGeometry=new THREE.BufferGeometry();starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(JSON.parse(engine.catalog(439,500)),3));
 const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xe8e8c9,size:.15,transparent:true,opacity:.7}));scene.add(stars);
 const ambient=new THREE.HemisphereLight(0xc4ddc8,0x344e45,2.3);
 const sun=new THREE.DirectionalLight(0xffe3b1,3);sun.position.set(-9,18,10);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-13;sun.shadow.camera.right=13;sun.shadow.camera.top=13;sun.shadow.camera.bottom=-13;sun.shadow.normalBias=.065;sun.shadow.bias=-.00025;
 const rim=new THREE.DirectionalLight(0x80bec4,1.8);rim.position.set(10,6,-10);scene.add(ambient,sun,rim);
 const warmLight=new THREE.PointLight(0xffba65,24,11,2);warmLight.position.set(.5,3.5,-.8);world.add(warmLight);
 const fallCount=130,fall=new THREE.InstancedMesh(cube,new THREE.MeshStandardMaterial({color:0x87c7b8,emissive:0x518d82,emissiveIntensity:.9,roughness:.45}),fallCount);fall.castShadow=false;world.add(fall);
 const fireflies=new THREE.InstancedMesh(cube,new THREE.MeshBasicMaterial({color:0xf5dda0,transparent:true,opacity:.8}),32);world.add(fireflies);
 const beam=new THREE.Group();telescope.add(beam);
 const beamMaterial=new THREE.MeshBasicMaterial({color:0xaad4c2,transparent:true,opacity:.09,depthWrite:false});
 for(let i=0;i<21;i++){const pixel=new THREE.Mesh(cube,beamMaterial);pixel.position.set(0,1.6+i*.2,-1.1-i*.24);pixel.scale.set(.25+i*.055,.16,.2);beam.add(pixel);}
 const colors={night:new THREE.Color('#102d2d'),day:new THREE.Color('#b3c1a7'),nightFog:new THREE.Color('#173a35'),dayFog:new THREE.Color('#b3c1a7')};
 scene.background=colors.night.clone();scene.fog=new THREE.Fog(colors.nightFog.clone(),40,110);
 function applyCamera(){
  const portrait=innerWidth/innerHeight<.85,aspect=innerWidth/innerHeight;
  const rawSpan=state.span*(portrait?1.15:1),span=portrait?mix(rawSpan,Math.max(rawSpan,20.5/aspect),state.framing):rawSpan,width=span*aspect;
  camera.left=-width*(portrait?.5:.62);camera.right=width*(portrait?.5:.38);camera.top=span*(portrait?.63:.54);camera.bottom=-span*(portrait?.37:.46);
  camera.updateProjectionMatrix();
  const distance=36,planar=Math.cos(state.pitch)*distance;
  camera.position.set(state.focus.x+Math.sin(state.yaw)*planar,state.focus.y+Math.sin(state.pitch)*distance,state.focus.z+Math.cos(state.yaw)*planar);camera.lookAt(state.focus);camera.updateMatrixWorld();
  const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1),direction=camera.getWorldDirection(new THREE.Vector3());
  moon.position.copy(state.focus).addScaledVector(right,width*(portrait?.28:.17)).addScaledVector(up,span*.31).addScaledVector(direction,30);moon.scale.setScalar((portrait?.68:1)*span/(portrait?44:22));
 }
 function activate(){
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  document.body.dataset.voxelCount=String(count);document.body.dataset.sky=state.nightTarget?'night':'day';
  state.tween=null;applyCamera();update(0,true);
  if(!paused()&&!reduced()){state.span=25;state.yaw=1.08;state.pitch=.58;focus('wide');}
 }
 function deactivate(){renderer.shadowMap.enabled=original.shadow;renderer.toneMapping=original.tone;renderer.toneMappingExposure=original.exposure;state.drag=null;state.tween=null;}
 function focus(name){
  const presets={telescope:{focus:new THREE.Vector3(.45,6.8,-.8),span:12,yaw:.55,pitch:.4,framing:0},landing:{focus:new THREE.Vector3(3.4,1.2,2.7),span:11,yaw:.9,pitch:.5,framing:0},waterfall:{focus:new THREE.Vector3(-2.6,-1.4,5),span:13,yaw:.37,pitch:.28,framing:0},wide:{focus:new THREE.Vector3(0,1.4,0),span:22,yaw:.78,pitch:.53,framing:1}};
  const next=presets[name]||presets.wide;
  state.tween={elapsed:0,from:{focus:state.focus.clone(),span:state.span,yaw:state.yaw,pitch:state.pitch,framing:state.framing},to:next};
  if(paused()||reduced()){Object.assign(state,next);state.focus=next.focus.clone();state.tween=null;applyCamera();}
  document.querySelectorAll('[data-voxel-focus]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.voxelFocus===name)));
  document.body.dataset.voxelView=name;
 }
 function toggleSky(){
  state.nightTarget=1-state.nightTarget;document.body.dataset.sky=state.nightTarget?'night':'day';
  const button=document.querySelector('#sanctuary-sky');button.textContent=state.nightTarget?'Daybreak ◯':'Nightfall ◐';button.setAttribute('aria-pressed',String(!state.nightTarget));
  if(paused()||reduced())state.night=state.nightTarget;
 }
 function update(dt,stopped){
  const step=Math.min(dt,.06);
  if(!stopped)state.time+=step;
  if(!stopped)state.night=mix(state.night,state.nightTarget,Math.min(1,step*.7));
  if(state.tween&&!stopped){
   state.tween.elapsed+=step;const p=clamp(state.tween.elapsed/1.8,0,1),e=p*p*(3-2*p),{from,to}=state.tween;
   state.focus.lerpVectors(from.focus,to.focus,e);state.span=mix(from.span,to.span,e);state.yaw=mix(from.yaw,to.yaw,e);state.pitch=mix(from.pitch,to.pitch,e);state.framing=mix(from.framing,to.framing,e);
   if(p===1)state.tween=null;
  }
  const t=state.time,night=state.night;
  world.position.y=stopped?world.position.y:Math.sin(t*.38)*.13;
  if(!stopped){telescope.rotation.y=Math.sin(t*.13)*.22-.55;rotor.rotation.z=t*.22;barrel.rotation.x=-.46+Math.sin(t*.17)*.05;}
  clouds.forEach((cloud,i)=>{if(!stopped){cloud.position.x+=Math.sin(t*.13+i)*step*.1;cloud.position.y+=Math.cos(t*.09+i)*step*.03;}cloud.children.forEach(mesh=>{mesh.material.opacity=mix(.6,.24,night);});});
  for(let i=0;i<fallCount;i++){
   const phase=(t*.43+i/fallCount)%1,x=-2.68+(hash(i,2,8)-.5)*.72,z=5.43+(hash(i,3,4)-.5)*.43,y=.36-phase*7.2;
   dummy.position.set(x+Math.sin(phase*6+i)*.11,y,z+phase*.35);dummy.scale.set(.11+hash(i,4,8)*.09,.15+hash(i,2,1)*.26,.1);dummy.rotation.set(0,0,0);dummy.updateMatrix();fall.setMatrixAt(i,dummy.matrix);
  }fall.instanceMatrix.needsUpdate=true;fall.computeBoundingSphere();
  for(let i=0;i<32;i++){const a=i*2.399+t*.1,r=3+hash(i,3,0)*3;dummy.position.set(Math.cos(a)*r,1.5+Math.sin(t*.7+i)*.6+hash(i,1,4),Math.sin(a)*r);dummy.scale.setScalar(.035+hash(i,4,2)*.025);dummy.updateMatrix();fireflies.setMatrixAt(i,dummy.matrix);}fireflies.instanceMatrix.needsUpdate=true;fireflies.material.opacity=night*.8;
  beam.visible=night>.2;beamMaterial.opacity=night*.055;
  scene.background.copy(colors.day).lerp(colors.night,night);scene.fog.color.copy(colors.dayFog).lerp(colors.nightFog,night);
  ambient.intensity=mix(2.6,1.05,night);sun.intensity=mix(3.2,1.2,night);rim.intensity=mix(.8,1.5,night);warmLight.intensity=night*28;stars.material.opacity=night*.75;
  renderer.toneMappingExposure=mix(1.05,1.4,night);applyCamera();
  document.body.style.setProperty('--sanctuary-night',night.toFixed(3));
 }
 canvas.addEventListener('pointerdown',event=>{if(!active())return;state.tween=null;state.drag={x:event.clientX,y:event.clientY};canvas.setPointerCapture(event.pointerId);});
 canvas.addEventListener('pointermove',event=>{if(!active()||!state.drag)return;state.yaw-=(event.clientX-state.drag.x)*.005;state.pitch=clamp(state.pitch+(event.clientY-state.drag.y)*.003,.15,1);state.drag={x:event.clientX,y:event.clientY};});
 canvas.addEventListener('pointerup',()=>{state.drag=null;});canvas.addEventListener('pointercancel',()=>{state.drag=null;});
 canvas.addEventListener('wheel',event=>{if(!active()||event.ctrlKey)return;event.preventDefault();state.tween=null;if(state.framing>0&&innerWidth/innerHeight<.85)state.span=(camera.top-camera.bottom)/1.15;state.framing=0;state.span=clamp(state.span+event.deltaY*.007,8,50);},{passive:false});
 document.addEventListener('keydown',event=>{
  if(!active()||document.querySelector('dialog[open]')||event.ctrlKey||event.metaKey||['INPUT','TEXTAREA'].includes(event.target.tagName))return;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();state.tween=null;if(event.key==='ArrowLeft')state.yaw-=.08;if(event.key==='ArrowRight')state.yaw+=.08;if(event.key==='ArrowUp')state.pitch=clamp(state.pitch+.05,.15,1);if(event.key==='ArrowDown')state.pitch=clamp(state.pitch-.05,.15,1);}
 });
 return {scene,camera,activate,deactivate,focus,toggleSky,resize:applyCamera,update};
}
