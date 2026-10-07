import './test-workspace.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const offers=JSON.parse(await readFile(new URL('../../content/guide-offers.json',import.meta.url),'utf8'));
let browser;let server;
const base=process.env.MONTY_TEST_URL||'http://127.0.0.1:5173';
let api=process.env.MONTY_GUIDE_TEST_API;
try {
 if(!api){
  const root=fileURLToPath(new URL('../../',import.meta.url));
  const python=fileURLToPath(new URL(process.platform==='win32'?'../../backend/.venv/Scripts/python.exe':'../../backend/.venv/bin/python',import.meta.url));
  // The real routes and planner run here. An accidental model call fails locally.
  server=spawn(python,['-c',"import socket, uvicorn; from backend.app.api.routes import create_app; sock=socket.socket(); sock.bind(('127.0.0.1',0)); sock.listen(128); print(sock.getsockname()[1],flush=True); uvicorn.Server(uvicorn.Config(create_app(provider=object(),knowledge=object()),log_level='warning')).run(sockets=[sock])"],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
  const port=await new Promise((resolve,reject)=>{server.once('error',reject);server.once('exit',code=>reject(new Error(`Guide test server exited: ${code}`)));server.stdout.once('data',value=>resolve(Number(value.toString().trim())));});
  api=`http://127.0.0.1:${port}`;
  let ready=false;
  for(let attempt=0;attempt<100;attempt++){try{ready=(await fetch(`${api}/api/health`)).ok;}catch{}if(ready)break;await new Promise(resolve=>setTimeout(resolve,100));}
  assert.ok(ready,'Guide test server did not start');
 }
 browser=await chromium.launch({channel:'msedge',headless:true});
 for(const language of ['en','zh'])for(const offer of offers){
  const animated=language==='en'&&offer.id==='ai';
  const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:animated?'no-preference':'reduce'});page.setDefaultTimeout(15000);
  const requests=[];let modelErrors=0;
  await page.route('**/api/**',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/api/chat')requests.push(route.request().postDataJSON());
   const response=await route.fetch({url:`${api}${path}`});
   const body=await response.body();if(body.toString().includes('"type": "error"'))modelErrors++;
   await route.fulfill({response,body});
  });
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(await page.locator('.terminal-welcome').count(),0);
  await page.getByRole('button',{name:'Power on',exact:true}).click();
  if(language==='zh')await page.getByRole('button',{name:'Switch to Chinese',exact:true}).click();
  await page.locator('.terminal-welcome').waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('.terminal-offer-list button')].every(button=>!button.disabled));
  assert.equal(requests.length,0);
  if(animated)await page.screenshot({path:'artifacts/monty-welcome.png'});
  await page.getByRole('button',{name:offer.label[language],exact:true}).click();
  await page.waitForFunction(question=>document.querySelector('#monty-command')?.value===question,offer.question[language]);
  assert.equal(requests.length,0);assert.equal(await page.locator('.desktop-window').count(),0);
  assert.equal(await page.locator('.terminal-welcome').count(),0);
  await page.getByRole('textbox',{name:'Ask Monty'}).press('Enter');
  if(offer.id==='ai'){
   await page.locator('[data-project-choice="pingpong-vision"]').waitFor();
   assert.equal(await page.locator('[data-project-choice]').count(),6);
   assert.equal(await page.locator('.agent-highlight').count(),0);
   assert.equal(await page.locator('.desktop-window').count(),0);
   await page.locator('[data-project-choice="pingpong-vision"]').click();
  }
  const folder=offer.id==='experience'?'experience':'projects';
  await page.locator(`[data-agent-id="folder:${folder}"].agent-highlight`).waitFor();
  assert.equal(requests.length,1);assert.equal(requests[0].message,offer.question[language]);
  await page.locator(`[data-agent-id="folder:${folder}"]`).click();
  if(offer.id!=='experience'){
   const project=offer.id==='ai'?'pingpong-vision':'drone-simulator';
   const scroller=page.locator('.desktop-window.active .content-scroll');
   const box=await scroller.boundingBox();await page.mouse.move(box.x+15,box.y+15);
   // Only test-user wheel events reveal a clipped card; Monty never scrolls it.
   for(let step=0;step<35;step++){
    if(await page.locator(`[data-agent-id="project-card:${project}"].agent-highlight`).count())break;
    const direction=await page.locator('.monty-overlay').getAttribute('data-visibility-direction');
    if(direction==='below')await page.mouse.wheel(0,80);
    else if(direction==='above')await page.mouse.wheel(0,-80);
    await page.waitForTimeout(120);
   }
   await page.locator(`[data-agent-id="project-card:${project}"].agent-highlight`).waitFor();
   await page.locator(`[data-agent-id="project-card:${project}"]`).click();
  }
  await page.waitForFunction(()=>!document.querySelector('.monty-overlay')?.dataset.guidePhase);
  await page.getByText(language==='zh'?/已到达项目详情|已打开你要看的内容/:/You have reached the project details|The requested content is open/).waitFor();

  assert.equal(await page.getByText('There is no safe guide target in the current view.',{exact:true}).count(),0);
  assert.equal(modelErrors,0);assert.equal(requests.length,1);
  console.log(`PASS real API: ${language}/${offer.id}, choice → draft → Enter → user-operated guide → completion.`);
  await page.close();
 }
 // Hand-editing must cancel the draft animation and never submit automatically.
 const page=await browser.newPage({viewport:{width:1440,height:960}});page.setDefaultTimeout(15000);
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:30000});await page.getByRole('button',{name:'Power on',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('[data-offer-id="ai"]')?.disabled);
 await page.getByRole('button',{name:'AI projects',exact:true}).click();
 const input=page.getByRole('textbox',{name:'Ask Monty'});await input.fill('My own question');await page.waitForTimeout(400);
 assert.equal(await input.inputValue(),'My own question');assert.equal(await page.locator('.desktop-window').count(),0);
 await page.getByRole('button',{name:'Shut down xiaohengOS',exact:true}).click();await page.getByRole('button',{name:'Power on',exact:true}).click();assert.equal(await page.locator('.terminal-welcome').count(),0);
 console.log('PASS: editing cancels typewriter insertion; the welcome appears only once per page session.');
} finally {await browser?.close();server?.kill();}
