import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const playwright=process.env.PLAYWRIGHT_MODULE_PATH
 ? await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH,'index.mjs')).href)
 : await import('playwright');
const out=resolve(import.meta.dirname,'../.artifacts');
await mkdir(out,{recursive:true});
const browser=await playwright.chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const url=process.env.PREVIEW_URL||'http://127.0.0.1:4173';
const errors=[],checks=[];
const note=text=>{checks.push(text);console.log(text);};
const watch=page=>{
 page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('Error creating WebGL context'))errors.push(message.text());});
 page.on('console',message=>{if(message.type()==='warning'&&message.text().includes('Buffer size too small'))errors.push(message.text());});
 page.on('response',response=>{if(response.status()>=400)errors.push(response.status()+' '+response.url());});
};
async function open(page,hash=''){
 await page.goto(url+'/'+hash);await page.waitForFunction(()=>document.body.dataset.engine==='go-wasm');
 await page.evaluate(()=>document.fonts.ready);
}
async function land(page,world){
 await page.locator('[data-planet="'+world+'"]').hover({force:true});
 await page.locator('[data-planet="'+world+'"]').click();
 await page.waitForSelector('body.exploring');await page.waitForTimeout(220);
 assert.equal(await page.locator('.world.current').getAttribute('data-id'),String(world));
 assert.equal(await page.locator('.world:not([inert])').count(),1);
}
async function dial(page,value){
 const box=await page.locator('#frequency').boundingBox();
 await page.mouse.click(box.x+6.5+(box.width-13)*value/100,box.y+box.height/2);
 return Number((await page.locator('#strength-output').textContent()).replace('%',''));
}
// Find a peak by playing the instrument; no target frequencies or engine internals are read.
async function discover(page,id){
 await page.locator('[data-echo="'+id+'"]').click();
 await page.locator('#frequency').press('Home');
 await page.waitForTimeout(1300);
 assert.equal(await page.locator('#frequency').isDisabled(),false,'A weak signal must not record an echo');
 let best={value:0,strength:0};
 for(let value=10;value<=100;value+=10){
  const strength=await dial(page,value);
  if(strength>best.strength)best={value,strength};
 }
 for(let value=best.value-6;value<=best.value+6;value+=1){
  const strength=await dial(page,Math.max(0,Math.min(100,value)));
  if(strength>=99)break;
 }
 await page.waitForFunction(()=>document.querySelector('#frequency').disabled);
 assert.equal(await page.locator('[data-echo="'+id+'"]').getAttribute('class').then(value=>value.includes('recorded')),true);
}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});watch(page);
 await open(page);
 assert.equal(await page.locator('body').getAttribute('data-renderer'),'webgl');
 assert.equal(await page.locator('.planet-label').count(),5);
 await page.screenshot({path:resolve(out,'observatory-desktop.png')});
 // Drag changes projected positions, and pause keeps the orbital frames stable.
 await page.locator('#motion').click();
 const before=await page.locator('[data-planet="0"]').getAttribute('style');
 await page.mouse.move(820,225);await page.mouse.down();await page.mouse.move(1010,275,{steps:12});await page.mouse.up();await page.waitForTimeout(150);
 assert.notEqual(await page.locator('[data-planet="0"]').getAttribute('style'),before);
 await page.locator('#reset-orbit').click();await page.waitForTimeout(100);
 const paused=await page.locator('[data-planet="0"]').getAttribute('style');
 await page.waitForTimeout(400);assert.equal(await page.locator('[data-planet="0"]').getAttribute('style'),paused);
 await page.locator('[data-open="journal"]').first().click();await page.waitForTimeout(200);
 assert.equal(await page.locator('#journal').evaluate(node=>node.open),true);
 assert.equal(await page.locator('#export-poster').isDisabled(),true);
 assert.equal(await page.locator('#journal').evaluate(node=>getComputedStyle(node).opacity),'1');
 await page.keyboard.press('Escape');await page.locator('#motion').click();
 note('Go WebAssembly and WebGL ready; drag, reset, pause, and empty journal verified.');
 for(let world=0;world<5;world++){
  await land(page,world);
  for(let echo=0;echo<3;echo++)await discover(page,world*3+echo);
  assert.match(await page.locator('#field-count').textContent(),/^3 \/ 3/);
  await page.screenshot({path:resolve(out,'charted-world-'+world+'.png')});
  await page.locator('.back-map').click();await page.waitForSelector('body.in-observatory');
  note(worldsLabel(world)+' fully discovered through frequency search.');
 }
 assert.equal(await page.locator('#journal-count').textContent(),'15 / 15');
 await page.locator('[data-open="journal"]').first().click();await page.waitForTimeout(600);
 await page.screenshot({path:resolve(out,'journal-desktop.png')});
 const downloadPromise=page.waitForEvent('download');
 await page.locator('#export-poster').click();const download=await downloadPromise;
 assert.equal(download.suggestedFilename(),'otherwhere-constellation.svg');
 const posterPath=resolve(out,'playtest-constellation.svg');await download.saveAs(posterPath);
 const poster=await readFile(posterPath,'utf8');assert.match(poster,/15 echoes/);assert.match(poster,/@font-face/);assert.match(poster,/data:font\/ttf;base64/);
 await page.reload();await page.waitForFunction(()=>document.body.dataset.engine==='go-wasm');
 assert.equal(await page.locator('#journal-count').textContent(),'15 / 15');
 await page.waitForSelector('body.in-observatory');
 await land(page,0);await page.locator('[data-echo="0"]').click();assert.equal(await page.locator('#frequency').isDisabled(),true);
 assert.match(await page.locator('#echo-name').textContent(),/fallen voyager/);
 note('All 15 discoveries persist across reload; self-contained SVG export verified.');
 await page.close();
 for(const [name,width,height] of [['mobile',390,844],['small-mobile',320,667],['tablet',768,1024],['short-desktop',1366,600]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce',deviceScaleFactor:1});watch(page);await open(page);
  assert.equal(await page.locator('#motion').getAttribute('aria-pressed'),'true');
  const boxes=await page.locator('.planet-label').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().toJSON()));
  for(const box of boxes){assert.ok(box.x>=0&&box.right<=width, name+' planet label overflows');assert.ok(box.y>=76&&box.bottom<=height-25,name+' planet label clipped');}
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];assert.ok(!(a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y),name+' labels overlap');}
  await page.screenshot({path:resolve(out,'observatory-'+name+'.png')});
  await land(page,4);await discover(page,12);
  const instrument=await page.locator('#instrument').boundingBox();
  assert.ok(instrument.x>=0&&instrument.x+instrument.width<=width&&instrument.y+instrument.height<=height,name+' instrument overflows');
  await page.screenshot({path:resolve(out,'field-'+name+'.png')});
  await page.keyboard.press('Escape');assert.equal(await page.locator('#instrument').isVisible(),false);
  await page.keyboard.press('Escape');await page.waitForSelector('body.in-observatory');
  await page.locator('[data-open="journal"]').first().click();await page.waitForTimeout(200);
  assert.equal(await page.locator('#journal').evaluate(node=>getComputedStyle(node).opacity),'1');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:resolve(out,'journal-'+name+'.png')});
  await page.close();note(name+' navigation, signal play, journal, and reduced motion verified.');
 }
 const fallback=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});watch(fallback);
 await fallback.addInitScript(()=>{
  const original=HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};
 });
 await open(fallback);assert.equal(await fallback.locator('body').getAttribute('data-renderer'),'flat');await land(fallback,1);await discover(fallback,3);await fallback.close();
 note('WebGL-unavailable fallback remains playable.');
 const stored=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});watch(stored);
 await stored.addInitScript(()=>localStorage.setItem('otherwhere-discoveries-v1','[-1,0,0,14,99,"1",null]'));
 await open(stored,'#world-03');await stored.waitForSelector('body.exploring');assert.equal(await stored.locator('#journal-count').textContent(),'02 / 15');assert.equal(await stored.locator('.world.current').getAttribute('data-id'),'2');await stored.close();
 note('Deep links and invalid saved-record recovery verified.');
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'observatory-playtest.json'),JSON.stringify({passed:true,checks,errors},null,2));
 console.log('PASS — complete observatory play-test.');
}finally{await browser.close();}
function worldsLabel(i){return ['Pale Frontier','Sleeping Sun','Lunar Shore','Crimson Oath','Blue Hour'][i];}

