import * as THREE from './vendor/three.module.js';

const worlds=['Pale Frontier','Sleeping Sun','Lunar Shore','Crimson Oath','Blue Hour'];
const echoes=[
 ['The fallen voyager','Grass remembers','A distant home'],
 ['A sun still dreaming','The gold between','Footsteps in dust'],
 ['The tide above','A vessel without sea','The last horizon'],
 ['An unbroken promise','The arrow and the wind','Fire remembers'],
 ['The sleeping mill','A bridge to nowhere','The blue silence']
];
const locations=[[[.3,.39],[.62,.28],[.8,.59]],[[.42,.31],[.74,.42],[.61,.64]],[[.37,.32],[.66,.43],[.81,.67]],[[.44,.35],[.76,.29],[.63,.63]],[[.23,.3],[.55,.47],[.79,.63]]];
const mobileLocations=[[.25,.28],[.73,.38],[.54,.57]];
const palette=[['#acc7b2','#516d60','#172c28'],['#f1c08f','#b56c50','#432f32'],['#87bcc8','#32667e','#152b41'],['#c7593f','#843e38','#31282a'],['#82b9af','#315f65','#132c35']];
const $=selector=>document.querySelector(selector);
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const pad=n=>String(n).padStart(2,'0');
const storageKey='otherwhere-discoveries-v1';
const validDiscoveries=value=>Array.isArray(value)?[...new Set(value.filter(id=>Number.isInteger(id)&&id>=0&&id<15))]:[];

async function loadEngine(){
 const go=new window.Go();
 const response=await fetch('vendor/universe.wasm');
 if(!response.ok)throw new Error('Universe engine did not load');
 const {instance}=await WebAssembly.instantiate(await response.arrayBuffer(),go.importObject);
 const ready=new Promise(resolve=>window.addEventListener('otherwhere:engine-ready',resolve,{once:true}));
 go.run(instance).catch(error=>console.error('Go runtime:',error));
 await ready;
 return window.goUniverse;
}
const vertexShader='varying vec3 vPosition; varying vec3 vNormal; varying vec3 vView; void main(){vPosition=position;vNormal=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);vView=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}';
const planetShader='varying vec3 vPosition;varying vec3 vNormal;varying vec3 vView;uniform vec3 highColor;uniform vec3 lowColor;uniform vec3 darkColor;uniform float kind;float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}float fbm(vec3 p){float a=.5,v=0.;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.07+13.2;a*=.5;}return v;}void main(){vec3 p=vPosition*3.;float n=fbm(p*2.5),pattern=fbm(p+vec3(n*3.));if(kind>.5&&kind<1.5)pattern=.5+.32*sin(p.y*9.+n*9.);if(kind>2.5&&kind<3.5)pattern=pow(n,1.6)+.2*sin(p.y*13.+n*7.);vec3 albedo=mix(lowColor,highColor,smoothstep(.22,.72,pattern));vec3 normal=normalize(vNormal);float light=max(dot(normal,normalize(vec3(-.6,.8,1.))),0.);float rim=pow(1.-max(dot(normal,normalize(vView)),0.),3.);gl_FragColor=vec4(mix(darkColor,albedo,light*.9+.1)+highColor*rim*.12,1.);}';
const atmosphereShader='varying vec3 vNormal;varying vec3 vView;uniform vec3 glow;void main(){float rim=pow(1.-abs(dot(normalize(vNormal),normalize(vView))),4.);gl_FragColor=vec4(glow,rim*.17);}';

export async function initObservatory(api){
 const engine=await loadEngine();
 let discoveries=[];
 try{discoveries=validDiscoveries(JSON.parse(localStorage.getItem(storageKey)||'[]'));}catch{}
 let mode='map',selected=-1,signal=0,hold=0,toastTimer,flight;
 let simulationTime=0,lastTime=0,lastRender=0,flash=0,compact=innerWidth<=600;
 const labels=[],planets=[],meshes=[],probes=[];
 const canvas=$('#universe-canvas'),scene=new THREE.Scene(),system=new THREE.Group(),starGroup=new THREE.Group(),probeGroup=new THREE.Group();
 scene.add(system,starGroup,probeGroup);probeGroup.visible=false;
 const camera=new THREE.PerspectiveCamera(44,innerWidth/innerHeight,.1,180);
 const view={yaw:0,pitch:0,zoom:1},defaultCamera=new THREE.Vector3(),focus=new THREE.Vector3();
 let renderer;
 try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor(0,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 }catch{document.body.classList.add('flat-observatory');canvas.hidden=true;}
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(JSON.parse(engine.catalog(7284,compact?900:1800)),3));
 starGroup.add(new THREE.Points(geometry,new THREE.PointsMaterial({color:0xe3e4cf,size:.085,transparent:true,opacity:.67,sizeAttenuation:true})));
 // The armillary, orbits, surfaces, and probes are geometry in a depth-buffered scene.
 const armillary=new THREE.Group();
 for(let i=0;i<3;i++){
  const ring=new THREE.Mesh(new THREE.TorusGeometry(1.22+i*.18,.007,5,120),new THREE.MeshBasicMaterial({color:0xc2cdb1,transparent:true,opacity:.22}));
  ring.rotation.set(i*.55+.45,i*.7,i*.8);armillary.add(ring);
 }
 armillary.add(new THREE.Mesh(new THREE.IcosahedronGeometry(.14),new THREE.MeshBasicMaterial({color:0xd8dcc1})));system.add(armillary);
 worlds.forEach((name,i)=>{
  const group=new THREE.Group(),radius=[.73,.72,.89,.65,.72][i];
  const material=new THREE.ShaderMaterial({vertexShader,fragmentShader:planetShader,uniforms:{highColor:{value:new THREE.Color(palette[i][0])},lowColor:{value:new THREE.Color(palette[i][1])},darkColor:{value:new THREE.Color(palette[i][2])},kind:{value:i}}});
  const sphere=new THREE.Mesh(new THREE.SphereGeometry(radius,56,36),material);sphere.userData.world=i;meshes.push(sphere);group.add(sphere);
  group.add(new THREE.Mesh(new THREE.SphereGeometry(radius*1.13,40,24),new THREE.ShaderMaterial({vertexShader,fragmentShader:atmosphereShader,uniforms:{glow:{value:new THREE.Color(palette[i][0])}},transparent:true,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending})));
  if(i===1){
   const material=new THREE.ShaderMaterial({vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){float d=length(vUv-.5)*2.;float stripe=.4+.6*sin(d*155.);gl_FragColor=vec4(.78,.60,.43,(.16+stripe*.21)*smoothstep(.99,.85,d));}',transparent:true,side:THREE.DoubleSide,depthWrite:false});
   const ring=new THREE.Mesh(new THREE.RingGeometry(1.02,1.65,150),material);ring.rotation.set(1.09,.16,-.35);group.add(ring);
   const edge=new THREE.Mesh(new THREE.TorusGeometry(1.67,.008,4,150),new THREE.MeshBasicMaterial({color:0xe0b790,transparent:true,opacity:.32}));edge.rotation.copy(ring.rotation);group.add(edge);
  }
  group.rotation.z=[-.12,-.24,.1,.15,0][i];planets.push({group,sphere,radius});system.add(group);
  const points=[];
  for(let j=0;j<=160;j++){const a=j/160*Math.PI*2,r=[5.1,4.5,5.8,5.3,4.8][i];points.push(new THREE.Vector3(Math.cos(a)*r,[1.35,2.1,-.1,-1.9,-2.35][i],Math.sin(a)*r*.58));}
  const orbit=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xa1b6a1,transparent:true,opacity:.105}));orbit.userData.orbit=true;system.add(orbit);
  const button=document.createElement('button');button.className='planet-label';button.dataset.planet=i;button.setAttribute('aria-label','Land on '+name);
  button.innerHTML='<span class="planet-number">'+pad(i+1)+' / UNCHARTED</span><span class="planet-name">'+name+'</span><span class="planet-progress" aria-hidden="true"><i></i><i></i><i></i></span>';
  button.addEventListener('click',()=>land(i));$('#planet-labels').append(button);labels.push(button);
 });
 for(let i=0;i<3;i++){
  const group=new THREE.Group(),crystal=new THREE.Mesh(new THREE.OctahedronGeometry(.105),new THREE.MeshStandardMaterial({color:0xe0dbc2,metalness:.55,roughness:.18,emissive:0xa2c0a7,emissiveIntensity:.5}));
  const halo=new THREE.Mesh(new THREE.TorusGeometry(.19,.003,4,60),new THREE.MeshBasicMaterial({color:0xdde0c1,transparent:true,opacity:.5}));
  group.add(crystal,halo);probeGroup.add(group);probes.push({group,crystal,halo});
 }
 scene.add(new THREE.HemisphereLight(0xe6e9d5,0x183f3b,2));
 const light=new THREE.PointLight(0xffe1b3,22);light.position.set(-3,5,8);scene.add(light);
 // Resonance reveals a different spatial formation in each world.
 const formations=worlds.map((_,world)=>{
  const group=new THREE.Group(),color=new THREE.Color(palette[world][0]);
  const lineMaterial=new THREE.LineBasicMaterial({color,transparent:true,opacity:.3});
  if(world===0||world===4){
   const points=[];
   for(let j=0;j<130;j++){const t=j/129*Math.PI*4;points.push(new THREE.Vector3(world===0?(j/129-.5)*2.7:Math.cos(t)*.45,world===0?Math.sin(t)*.12:(j/129-.5)*1.9,Math.sin(t)*.5));}
   group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),lineMaterial));
  }else if(world===3){
   for(let j=0;j<9;j++){const blade=new THREE.Mesh(new THREE.ConeGeometry(.025,.34,3),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.45}));const a=j/9*Math.PI*2;blade.position.set(Math.cos(a)*.8,Math.sin(a)*.8,Math.cos(a)*.25);blade.rotation.z=a-Math.PI/2;group.add(blade);}
  }else{
   for(let j=0;j<3;j++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.4+j*.24,.004,4,100),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.35}));ring.rotation.set(world===2?j*.8:.4,j*.25,j*.5);group.add(ring);}
  }
  group.visible=false;scene.add(group);return group;
 });
 function countWorld(i){return discoveries.filter(id=>Math.floor(id/3)===i).length;}
 function updateProgress(){
  $('#journal-count').textContent=pad(discoveries.length)+' / 15';
  labels.forEach((label,i)=>{label.querySelector('.planet-number').textContent=pad(i+1)+' / '+(countWorld(i)===3?'CHARTED':countWorld(i)+'/3 ECHOES');[...label.querySelectorAll('i')].forEach((dot,j)=>dot.classList.toggle('found',discoveries.includes(i*3+j)));});
  if(mode==='field'){const n=countWorld(api.current());$('#field-count').textContent=n+' / 3 echoes recorded';$('#field-guide span:last-child').textContent=n===3?'World charted. Another orbit awaits.':'Find a glimmer. Tune its signal.';}
  renderJournal();
 }
 function renderJournal(){
  $('#journal-progress').textContent=pad(discoveries.length)+' / 15 ECHOES';
  $('#journal-caption').textContent=discoveries.length===15?'Every echo found. A universe made yours.':discoveries.length?'Drawn in the order you wandered.':'Your discoveries will draw it.';
  $('#journal-chart').innerHTML=engine.poster(JSON.stringify(discoveries));$('#journal-chart svg').setAttribute('aria-label','Your constellation, with '+discoveries.length+' recorded echoes');$('#journal-chart svg').setAttribute('role','img');
  $('#journal-entries').innerHTML=worlds.map((name,i)=>{const found=discoveries.filter(id=>Math.floor(id/3)===i);return '<div class="journal-world"><span>'+pad(i+1)+'</span><div><h3>'+name+'</h3><p>'+(found.length?found.map(id=>echoes[i][id%3]).join(' · '):'Uncharted')+'</p></div><span class="entry-count">'+found.length+' / 3</span></div>';}).join('');
  $('#export-poster').disabled=!discoveries.length;
 }
 function resize(){
  compact=innerWidth<=600;camera.aspect=innerWidth/innerHeight;camera.fov=compact?48:44;camera.updateProjectionMatrix();
  defaultCamera.set(0,compact?-.7:.15,compact?25:18);focus.set(0,compact?-.7:0,0);
  if(mode!=='flight')camera.position.copy(defaultCamera).multiplyScalar(view.zoom);
  system.position.x=compact?0:2.05;system.children.filter(child=>child.userData.orbit).forEach(child=>child.visible=!compact);armillary.visible=!compact;
  renderer?.setSize(innerWidth,innerHeight,false);camera.lookAt(focus);if(mode==='field')positionProbes();
 }
 function updatePlanets(){
  JSON.parse(engine.frame(simulationTime,compact)).forEach((p,i)=>{planets[i].group.position.set(p.x,p.y,p.z);planets[i].sphere.rotation.y=p.spin;});
 }
 const projected=new THREE.Vector3();
 function positionLabels(){
  system.updateMatrixWorld(true);
  planets.forEach((planet,i)=>{
   if(!renderer){labels[i].style.transform='translate('+(compact?12:48)+'vw,'+(compact?31+i*11:24+i*12)+'vh)';return;}
   planet.group.getWorldPosition(projected).project(camera);
   const x=(projected.x*.5+.5)*innerWidth,y=(-projected.y*.5+.5)*innerHeight;
   const offset=compact?22:innerHeight*.5*planet.radius/(18*Math.tan(22*Math.PI/180))+12,label=labels[i];
   const left=clamp(x-(compact?40:32),compact?16:innerWidth*.34,innerWidth-label.offsetWidth-25),top=clamp(y+offset,compact?230:120,innerHeight-90);
   label.style.transform='translate('+left.toFixed(1)+'px,'+top.toFixed(1)+'px)';
  });
 }
 function positionProbes(){
  const bounds=$('#field-ui').getBoundingClientRect(),heightAtZ=2*Math.tan(camera.fov*Math.PI/360)*defaultCamera.z,widthAtZ=heightAtZ*camera.aspect;
  const positions=compact?mobileLocations:locations[api.current()];
  probes.forEach((probe,i)=>{const [x,y]=positions[i],screenY=(bounds.top+y*bounds.height)/innerHeight;probe.group.position.set((x-.5)*widthAtZ,(.5-screenY)*heightAtZ+camera.position.y,0);});
  [...$('#echo-targets').children].forEach((button,i)=>{button.style.left=positions[i][0]*100+'%';button.style.top=positions[i][1]*100+'%';});
 }
 function buildTargets(){
  $('#echo-targets').replaceChildren();
  for(let i=0;i<3;i++){
   const id=api.current()*3+i,button=document.createElement('button');button.className='echo-target'+(discoveries.includes(id)?' recorded':'');button.dataset.echo=id;
   button.setAttribute('aria-label',discoveries.includes(id)?'Recorded: '+echoes[api.current()][i]:'Tune hidden echo '+(i+1));button.innerHTML='<span class="echo-number">'+(discoveries.includes(id)?'RECORDED':'ECHO '+pad(i+1))+'</span>';
   button.addEventListener('click',()=>selectEcho(id));$('#echo-targets').append(button);
  }positionProbes();
 }
 function selectEcho(id){
  if(mode!=='field')return;selected=id;hold=0;$('#instrument').hidden=false;$('#field-guide').hidden=true;
  $('#frequency').disabled=discoveries.includes(id);$('#frequency').value=50;$('#echo-sector').textContent='SECTOR '+pad(api.current()+1)+' / ECHO '+pad(id%3+1);
  $('#echo-name').textContent=discoveries.includes(id)?echoes[api.current()][id%3]:'Uncharted echo';
  [...$('#echo-targets').children].forEach(button=>button.classList.toggle('active',Number(button.dataset.echo)===id));updateSignal();$('#frequency').focus({preventScroll:true});
 }
 function dismissInstrument(){
  selected=-1;hold=0;$('#instrument').hidden=true;$('#field-guide').hidden=false;$('#echo-targets .active')?.focus({preventScroll:true});$('#echo-targets .active')?.classList.remove('active');
 }
 function updateSignal(){
  if(selected<0)return;const value=Number($('#frequency').value);signal=engine.resonance(selected,value);
  $('#frequency-output').textContent=value.toFixed(1);$('#strength-output').textContent=Math.round(signal*100)+'%';$('#strength-fill').style.width=signal*100+'%';$('#dial-needle').style.transform='rotate('+(value*2.8-140)+'deg)';
  if(discoveries.includes(selected)){$('#signal-status').textContent='Recorded in your constellation.';$('.lock-orbit').style.strokeDashoffset=0;return;}
  $('#signal-status').textContent=signal>.97?'Hold here. Listening…':signal>.7?'Close. Fine-tune the frequency.':'Move the dial to find a clear signal.';
  if(signal<=.97){hold=0;$('.lock-orbit').style.strokeDashoffset=1;}
 }
 function record(){
  if(selected<0||discoveries.includes(selected))return;discoveries.push(selected);try{localStorage.setItem(storageKey,JSON.stringify(discoveries));}catch{}
  const id=selected;$('#echo-name').textContent=echoes[api.current()][id%3];$('#frequency').disabled=true;
  const button=$('[data-echo="'+id+'"]');button.classList.add('recorded');button.setAttribute('aria-label','Recorded: '+echoes[api.current()][id%3]);button.querySelector('span').textContent='RECORDED';
  const n=countWorld(api.current());$('#discovery-toast').textContent=discoveries.length===15?'Your universe is complete.':n===3?worlds[api.current()]+' is charted.':echoes[api.current()][id%3]+' — recorded.';
  $('#discovery-toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#discovery-toast').classList.remove('visible'),4200);flash=api.paused()?0:1;
  if(!api.paused())document.querySelector('.world.current .scene-shade').animate([{opacity:1},{opacity:.1},{opacity:1}],{duration:1900,easing:'ease-out'});
  updateSignal();updateProgress();$('#announcement').textContent=echoes[api.current()][id%3]+'. Echo recorded. '+discoveries.length+' of 15 discovered.';
 }
 async function land(index){
  if(mode!=='map')return;mode='flight';document.body.classList.add('in-flight');labels.forEach(button=>button.disabled=true);await api.travel(index);
  if(!api.paused()&&!api.reduced()&&renderer){
   const destination=new THREE.Vector3();planets[index].group.getWorldPosition(destination);
   const startPosition=camera.position.clone(),direction=startPosition.clone().sub(destination).normalize(),endPosition=destination.clone().add(direction.multiplyScalar(planets[index].radius*2.1));
   await new Promise(resolve=>{flight={started:performance.now(),duration:1700,startPosition,endPosition,startFocus:focus.clone(),endFocus:destination,resolve};});
  }
  mode='field';flight=null;system.visible=false;starGroup.visible=false;probeGroup.visible=true;
  document.body.classList.remove('in-observatory','in-flight');document.body.classList.add('exploring');document.documentElement.style.setProperty('--flight','0');
  $('#stage').inert=false;$('#observatory').setAttribute('aria-hidden','true');$('#field-ui').hidden=false;$('#field-world').textContent='The '+worlds[index];history.replaceState(null,'','#world-'+pad(index+1));
  camera.position.copy(defaultCamera);camera.lookAt(focus);buildTargets();updateProgress();$('#field-guide').hidden=false;$('#instrument').hidden=true;selected=-1;
  $('#field-ui .back-map').focus({preventScroll:true});$('#announcement').textContent='Landed on '+worlds[index]+'. Find three glimmers and tune their signals.';
 }
 function returnToMap(){
  if(mode==='flight')return;const wasField=mode==='field';mode='map';selected=-1;hold=0;flash=0;formations.forEach(group=>group.visible=false);$('#stage').inert=true;$('#field-ui').hidden=true;
  document.body.classList.remove('exploring');document.body.classList.add('in-observatory');$('#observatory').removeAttribute('aria-hidden');system.visible=true;starGroup.visible=true;probeGroup.visible=false;labels.forEach(button=>button.disabled=false);
  camera.position.copy(defaultCamera).multiplyScalar(view.zoom);camera.lookAt(focus);history.replaceState(null,'','#observatory');document.querySelector('meta[name="theme-color"]').content='#102423';updateProgress();
  if(wasField)labels[api.current()].focus({preventScroll:true});
 }
 $('#frequency').addEventListener('input',updateSignal);$('#dismiss-instrument').addEventListener('click',dismissInstrument);
 document.querySelectorAll('[data-map]').forEach(button=>button.addEventListener('click',returnToMap));$('.wordmark').addEventListener('click',event=>{event.preventDefault();returnToMap();});
 $('#reset-orbit').addEventListener('click',()=>{view.yaw=0;view.pitch=0;view.zoom=1;resize();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')&&mode==='field'){if(selected>=0)dismissInstrument();else returnToMap();}});
 let fontStylePromise;
 const fontStyle=()=>fontStylePromise ||= Promise.all(['bodoni-moda.ttf','bodoni-moda-italic.ttf'].map(async(filename,i)=>{
  const response=await fetch('fonts/'+filename);if(!response.ok)throw new Error('Poster font unavailable');const bytes=new Uint8Array(await response.arrayBuffer());let binary='';
  for(let j=0;j<bytes.length;j+=8192)binary+=String.fromCharCode(...bytes.subarray(j,j+8192));
  return '@font-face{font-family:Bodoni;src:url(data:font/ttf;base64,'+btoa(binary)+') format("truetype");font-style:'+(i?'italic':'normal')+';}';
 })).then(styles=>'<style>'+styles.join('')+'</style>');
 $('#export-poster').addEventListener('click',async()=>{
  const button=$('#export-poster');button.disabled=true;
  try{const svg=engine.poster(JSON.stringify(discoveries)),embedded=svg.replace('><rect','>'+(await fontStyle())+'<rect'),url=URL.createObjectURL(new Blob([embedded],{type:'image/svg+xml'})),link=document.createElement('a');
   link.href=url;link.download='otherwhere-constellation.svg';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);
  }catch(error){console.error(error);$('#journal-caption').textContent='The poster could not be saved. Please try again.';}finally{button.disabled=!discoveries.length;}
 });
 const raycaster=new THREE.Raycaster();let drag;
 canvas.addEventListener('pointerdown',event=>{if(mode!=='map')return;drag={x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false};canvas.setPointerCapture(event.pointerId);});
 canvas.addEventListener('pointermove',event=>{if(!drag||mode!=='map')return;const dx=event.clientX-drag.x,dy=event.clientY-drag.y;if(Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY)>6)drag.moved=true;view.yaw=clamp(view.yaw+dx*.0025,-.45,.45);view.pitch=clamp(view.pitch+dy*.0015,-.2,.2);drag.x=event.clientX;drag.y=event.clientY;});
 canvas.addEventListener('pointerup',event=>{if(drag&&!drag.moved&&mode==='map'){raycaster.setFromCamera(new THREE.Vector2(event.clientX/innerWidth*2-1,-event.clientY/innerHeight*2+1),camera);const hit=raycaster.intersectObjects(meshes)[0];if(hit)land(hit.object.userData.world);}drag=null;});
 canvas.addEventListener('pointercancel',()=>{drag=null;});canvas.addEventListener('wheel',event=>{if(mode!=='map'||event.ctrlKey)return;event.preventDefault();view.zoom=clamp(view.zoom+event.deltaY*.0003,.83,1.25);},{passive:false});
 window.addEventListener('resize',resize);
 canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();$('#map-status').textContent='Graphics paused. Reload to restore the orbital view.';});
 canvas.addEventListener('webglcontextrestored',()=>{$('#map-status').textContent='Drag to orbit · Choose a world to land';});
 function tick(now){
  requestAnimationFrame(tick);const dt=Math.min((now-lastTime)/1000||.016,.06);lastTime=now;if(document.hidden){hold=0;return;}
  const modal=Boolean(document.querySelector('dialog[open]'));if(!api.paused()&&!modal&&mode==='map')simulationTime+=dt;
  if(selected>=0&&!discoveries.includes(selected)&&mode==='field'&&!modal){if(signal>.97){hold+=dt;$('.lock-orbit').style.strokeDashoffset=1-clamp(hold/1.15,0,1);if(hold>=1.15)record();}else hold=0;}
  if(now-lastRender<32)return;lastRender=now;
  if(mode==='map'){
   updatePlanets();system.rotation.set(view.pitch,view.yaw,0);camera.position.copy(defaultCamera).multiplyScalar(view.zoom);camera.lookAt(focus);
   if(!api.paused()&&!modal){starGroup.rotation.y=simulationTime*.0015;armillary.rotation.y=simulationTime*.045;}positionLabels();
  }else if(mode==='flight'&&flight){
   const progress=clamp((now-flight.started)/flight.duration,0,1),eased=progress*progress*(3-2*progress);
   camera.position.lerpVectors(flight.startPosition,flight.endPosition,eased);
   const arc=Math.sin(progress*Math.PI)*[.55,1.4,-.8,-.65,.3][api.current()];camera.position.x+=arc;camera.position.y+=arc*.4;
   camera.lookAt(new THREE.Vector3().lerpVectors(flight.startFocus,flight.endFocus,eased));
   document.documentElement.style.setProperty('--flight',String(Math.max(0,(progress-.65)/.35)));
   if(progress===1){const complete=flight.resolve;flight=null;complete();}
  }else if(mode==='field'){
   probes.forEach((probe,i)=>{const found=discoveries.includes(api.current()*3+i);probe.crystal.material.emissiveIntensity=found?.9:.3+(selected>=0&&selected%3===i?signal*.7:0);
    if(!api.paused()&&!modal){probe.crystal.rotation.y+=dt*.6;probe.crystal.rotation.z+=dt*.18;probe.halo.rotation.x=Math.sin(now*.0004+i)*.35;}probe.group.scale.setScalar(1+flash*.7);});
   flash=Math.max(0,flash-dt*.8);
   formations.forEach((group,i)=>{
    group.visible=i===api.current()&&selected>=0&&(signal>.2||discoveries.includes(selected));
    if(group.visible){group.position.copy(probes[selected%3].group.position);group.scale.setScalar(.5+signal*.8+flash*.8);if(!api.paused()&&!modal)group.rotation.z+=dt*[.1,.15,-.18,-.12,.2][i];}
   });
  }
  if(!modal)renderer?.render(scene,camera);
 }
 resize();updatePlanets();positionLabels();updateProgress();$('#map-status').textContent=renderer?'Drag to orbit · Choose a world to land':'Choose a world to land · 3D unavailable in this browser';
 requestAnimationFrame(tick);document.body.dataset.engine='go-wasm';document.body.dataset.renderer=renderer?'webgl':'flat';
 const initial=Number(location.hash.match(/^#world-0([1-5])$/)?.[1]);if(initial)land(initial-1);
}

