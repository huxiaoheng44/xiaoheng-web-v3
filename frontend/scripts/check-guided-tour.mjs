import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser=await chromium.launch({channel:'msedge',headless:true});
const sse=events=>events.map(event=>`data: ${JSON.stringify(event)}\n\n`).join('');
try {
 const page=await browser.newPage({viewport:{width:1440,height:960}});page.setDefaultTimeout(5000);const requests=[];let progress;const progressed=new Promise(resolve=>{progress=resolve});
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;if(path==='/api/session')return route.fulfill({json:{token:'tour',configured:true}});if(path.endsWith('/cancel'))return route.fulfill({json:{ok:true}});if(path!=='/api/chat')return route.fulfill({contentType:'text/event-stream',body:sse([{type:'done',waiting:false}])});const body=route.request().postDataJSON();requests.push(body);const step=requests.length;
  if(step===1)return route.fulfill({contentType:'text/event-stream',body:sse([{type:'run',runId:'tour-1'},{type:'presentation',instruction:{type:'guideTo',target:'folder:projects',value:''}},{type:'done',waiting:false}])});
  if(step===2){progress();return route.fulfill({contentType:'text/event-stream',body:sse([{type:'run',runId:'tour-2'},{type:'presentation',instruction:{type:'highlight',target:'project-card:fast-ai-movie',value:''}},{type:'presentation',instruction:{type:'guideTo',target:'project-card:fast-ai-movie',value:''}},{type:'done',waiting:false}])});}
  return route.fulfill({contentType:'text/event-stream',body:sse([{type:'run',runId:'tour-3'},{type:'delta',text:'FAST AI Movie is the selected AI project.'},{type:'done',waiting:false}] )});
 });
 await page.goto('http://127.0.0.1:5173');await page.locator('.boot-overlay').waitFor({state:'detached'});
 const input=page.getByRole('textbox',{name:'Ask CRT.AGENT'});await input.fill('带我看 AI 项目');await input.press('Enter');
 await page.waitForFunction(()=>document.querySelector('.crt-agent-overlay')?.dataset.mode==='move');await page.waitForFunction(()=>document.querySelector('.crt-agent-overlay')?.dataset.mode==='point');
 assert.equal(await page.locator('.desktop-window').count(),0);assert.equal(requests.length,1);
 await page.getByRole('button',{name:'Projects',exact:true}).click();
 await progressed;assert.equal(requests.length,2);assert.equal(requests[1].guideStep,true);assert.equal(requests[1].pageContext.activeWindow,'projects');assert.equal(requests[1].pageContext.activePanel,'collection');const target=requests[1].pageContext.targets.find(value=>value.id==='project-card:fast-ai-movie');assert.equal(target.guideable,true);assert.equal(target.visible,false);
 await page.waitForFunction(()=>document.querySelector('.crt-agent-overlay')?.dataset.visibilityDirection==='below');assert.equal(await page.locator('[data-agent-id="project-card:fast-ai-movie"].agent-highlight').count(),0);const scrollBox=await page.locator('.content-scroll').boundingBox();await page.mouse.move(scrollBox.x+20,scrollBox.y+20);await page.mouse.wheel(0,900);await page.waitForFunction(()=>document.querySelector('.crt-agent-overlay')?.dataset.mode==='move');await page.waitForFunction(()=>document.querySelector('.crt-agent-overlay')?.dataset.mode==='point');await page.locator('[data-agent-id="project-card:fast-ai-movie"].agent-highlight').waitFor();
 await page.getByRole('button',{name:/FAST AI Movie Web/}).click();await page.waitForTimeout(250);assert.equal(requests.length,3);assert.equal(requests[2].guideStep,true);assert.equal(requests[2].pageContext.activeWindow,'project:fast-ai-movie');
 await page.waitForFunction(()=>{const box=document.querySelector('.crt-agent-overlay')?.getBoundingClientRect();return !!box&&box.right>=innerWidth-26&&box.bottom>=innerHeight-40;},{},{timeout:7000});assert.equal(await page.locator('.agent-highlight').count(),0);
 console.log('PASS: deterministic guide tour waits for each real user click, refreshes context only after completion, and returns home under DND.');
} finally {await browser.close();}
