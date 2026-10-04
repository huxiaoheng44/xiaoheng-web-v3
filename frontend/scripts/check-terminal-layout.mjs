import './test-workspace.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',route=>route.request().url().endsWith('/session')?route.fulfill({json:{token:'mock',configured:true}}):route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({type:'delta',text:'Here are Xiaoheng’s projects.'})+'\n\ndata: '+JSON.stringify({type:'done',waiting:false})+'\n\n'}));
 await page.goto('http://127.0.0.1:5173/');await page.locator('.boot-overlay').waitFor({state:'detached'});
 const input=page.getByRole('textbox',{name:'Ask CRT.AGENT'});await input.click();
 assert.equal(await page.locator('.crt-agent-drawer,.crt-agent-help').count(),0);
 for(const viewport of [{width:1440,height:960},{width:900,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  for(const name of ['README.txt','Projects','Experience.exe','Contact']){
   await page.getByRole('button',{name,exact:true}).click();
   await page.getByRole('button',{name:`maximize ${name}`,exact:true}).click();
   const rect=await page.getByRole('region',{name,exact:true}).boundingBox();
   const shell=await page.locator('.os-shell').boundingBox();const terminal=await page.locator('.crt-agent-terminal').boundingBox();
   assert(Math.abs(rect.x-shell.x)<4&&Math.abs(rect.y-shell.y)<4,JSON.stringify({viewport,rect,shell}));
   assert(Math.abs(rect.y+rect.height-terminal.y)<4,'Maximized window ends at terminal');
   assert(Math.abs(rect.width-shell.width)<4,'No folder rail left uncovered');
   await page.getByRole('button',{name:`close ${name}`,exact:true}).click();
  }
 }
 await page.setViewportSize({width:1440,height:960});await page.getByRole('button',{name:'CRT robot help'}).hover();
 await page.locator('.crt-agent-help').waitFor();
 await input.fill('hello');await input.press('Enter');await page.locator('.crt-agent-utterance').filter({hasText:'Here are Xiaoheng'}).waitFor();
 assert.equal(await page.locator('.crt-agent-terminal button,.crt-agent-drawer').count(),0);
 await page.screenshot({path:'artifacts/test-results/terminal-ghost.png'});assert.deepEqual(errors,[]);
 console.log('PASS: 4 maximized windows at 3 breakpoints, input-only terminal, hover help, mock speech.');
}finally{await browser.close();}
