import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=process.env.PLAYWRIGHT_MODULE_PATH?await import(pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE_PATH,'index.mjs')).href):await import('playwright');
const browser=await chromium.launch({headless:true,args:['--enable-unsafe-swiftshader']});
const out=resolve(import.meta.dirname,'../.artifacts');
await mkdir(out,{recursive:true});
const url=process.env.PREVIEW_URL||'http://127.0.0.1:4173';
const errors=[],checks=[];
const note=message=>{checks.push(message);console.log(message);};
function watch(page){
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Error creating WebGL context'))errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
}
async function enter(page){
 await page.goto(url+'/#sanctuary');await page.waitForSelector('body.in-sanctuary');
 await page.waitForFunction(()=>Number(document.body.dataset.voxelCount)>10000);await page.evaluate(()=>document.fonts.ready);
}
async function canvasFrame(page){return page.locator('#universe-canvas').screenshot();}
try{
 const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});watch(page);await enter(page);await page.waitForTimeout(2200);
 assert.equal(await page.locator('body').getAttribute('data-renderer'),'webgl');
 assert.equal(await page.locator('#sanctuary-ui').isVisible(),true);
 await page.screenshot({path:resolve(out,'voxel-desktop-night.png')});
 const frame=await canvasFrame(page);await page.waitForTimeout(250);assert.notDeepEqual(await canvasFrame(page),frame,'The water, mill and floating world should animate');
 await page.locator('#motion').click();await page.waitForTimeout(150);
 const frozen=await canvasFrame(page);await page.waitForTimeout(400);assert.deepEqual(await canvasFrame(page),frozen,'Motion pause must freeze the rendered scene');
 // Direct interaction continues to work while continuous motion is paused.
 await page.mouse.move(1030,435);await page.mouse.down();await page.mouse.move(1170,485,{steps:10});await page.mouse.up();await page.waitForTimeout(120);
 assert.notDeepEqual(await canvasFrame(page),frozen,'Dragging should orbit the model');
 const orbited=await canvasFrame(page);await page.mouse.wheel(0,-220);await page.waitForTimeout(120);assert.notDeepEqual(await canvasFrame(page),orbited,'Wheel should change viewing distance');
 for(const name of ['telescope','landing','waterfall']){
  await page.locator('[data-voxel-focus="'+name+'"]').click();await page.waitForTimeout(150);
  assert.equal(await page.locator('body').getAttribute('data-voxel-view'),name);
  assert.equal(await page.locator('[data-voxel-focus="'+name+'"]').getAttribute('aria-pressed'),'true');
  await page.screenshot({path:resolve(out,'voxel-detail-'+name+'.png')});
 }
 await page.locator('#sanctuary-reset').click();await page.locator('#sanctuary-sky').click();await page.waitForTimeout(150);
 assert.equal(await page.locator('body').getAttribute('data-sky'),'day');
 assert.equal(await page.locator('#sanctuary-sky').textContent(),'Nightfall ◐');
 await page.screenshot({path:resolve(out,'voxel-desktop-day.png')});
 await page.locator('#sanctuary-sky').click();await page.locator('#motion').click();await page.locator('[data-voxel-focus="telescope"]').click();
 await page.waitForTimeout(200);await page.locator('[data-open="journal"]').click();await page.waitForTimeout(700);
 assert.equal(await page.locator('#journal').evaluate(n=>n.open),true);
 await page.keyboard.press('Escape');await page.waitForSelector('body.in-sanctuary');
 await page.keyboard.press('Escape');await page.waitForSelector('body.in-observatory');
 assert.equal(await page.locator('.planet-label:disabled').count(),0);
 await page.locator('[data-planet="0"]').hover({force:true});await page.locator('[data-planet="0"]').click();await page.waitForSelector('body.exploring');
 await page.locator('[data-echo="0"]').click();const range=await page.locator('#frequency').boundingBox();
 await page.mouse.click(range.x+6.5+(range.width-13)*.24,range.y+range.height/2);await page.waitForFunction(()=>document.querySelector('#frequency').disabled);
 assert.equal(await page.locator('#journal-count').textContent(),'01 / 15');
 note('Desktop: live voxel animation, frozen-frame pause, orbit, zoom, three landmarks, sky changes, journal and original signal gameplay passed.');
 await page.close();
 for(const [name,width,height] of [['mobile',390,844],['small-mobile',320,667],['tablet',768,1024],['short-desktop',1366,600]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});watch(page);await enter(page);
  assert.equal(await page.locator('#motion').getAttribute('aria-pressed'),'true');
  const boxes=await page.locator('.sanctuary-landmarks button,#sanctuary-sky,#sanctuary-reset,.main-nav button').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
  for(const box of boxes)assert.ok(box.x>=0&&box.right<=width&&box.y>=0&&box.bottom<=height,name+' control clipped');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:resolve(out,'voxel-'+name+'-night.png')});
  await page.locator('[data-voxel-focus="telescope"]').click();await page.waitForTimeout(100);
  assert.equal(await page.locator('body').getAttribute('data-voxel-view'),'telescope');
  await page.locator('#sanctuary-reset').click();await page.locator('#sanctuary-sky').click();await page.waitForTimeout(150);
  await page.screenshot({path:resolve(out,'voxel-'+name+'-day.png')});
  await page.keyboard.press('Escape');await page.waitForSelector('body.in-observatory');
  await page.locator('[data-sanctuary]').focus();await page.keyboard.press('Enter');await page.waitForSelector('body.in-sanctuary');
  await page.keyboard.press('ArrowRight');await page.locator('#sanctuary-reset').click();
  await page.close();note(name+': controls fit, reduced motion and keyboard re-entry passed.');
 }
 const fallback=await browser.newPage({viewport:{width:390,height:844}});watch(fallback);
 await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};});
 await fallback.goto(url+'/#sanctuary');await fallback.waitForFunction(()=>document.body.dataset.engine==='go-wasm');
 assert.equal(await fallback.locator('body').getAttribute('data-renderer'),'flat');
 assert.equal(await fallback.locator('#sanctuary-ui').isVisible(),false);
 assert.match(await fallback.locator('#map-status').textContent(),/needs WebGL/);await fallback.close();
 note('WebGL-unavailable navigation remains usable with a clear sanctuary status.');
 assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'voxel-playtest.json'),JSON.stringify({passed:true,checks,errors},null,2));
 console.log('PASS — voxel sanctuary play-test.');
}finally{await browser.close();}
