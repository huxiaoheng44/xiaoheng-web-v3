import './test-workspace.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 let chats=0;
 const sse=(events)=>events.map(event=>`data: ${JSON.stringify(event)}\n\n`).join('');
 await page.route('**/api/**',async route=>{const path=new URL(route.request().url()).pathname;if(path==='/api/session')return route.fulfill({json:{token:'activity-token',configured:true}});if(path.endsWith('/cancel'))return route.fulfill({json:{ok:true}});if(path==='/api/chat'){chats++;await new Promise(resolve=>setTimeout(resolve,500));return route.fulfill({contentType:'text/event-stream',body:sse([{type:'run',runId:'activity-run'},{type:'status',text:'retrieving'},{type:'activity',kind:'tool',name:'searchKnowledge'},{type:'source',source:{id:'readme',title:'README',target:'',source:'repo',version:'1',sourceType:'github-source',url:'https://github.com/huxiaoheng44/xiaoheng-web-v3/blob/main/README.md'}},{type:'delta',text:'A safe answer.'},{type:'done',waiting:false}])});}return route.fulfill({contentType:'text/event-stream',body:sse([{type:'done',waiting:false}])});});
 await page.goto('http://127.0.0.1:5173');await page.locator('.boot-overlay').waitFor({state:'detached'});
 const gear=page.getByRole('button',{name:'Open Monty activity summary'});assert.equal(await gear.getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#agent-activity-panel').count(),0);
 await gear.focus();await gear.press('Enter');await page.locator('#agent-activity-panel').waitFor();assert.equal(await gear.getAttribute('aria-expanded'),'true');
 const panel=page.locator('#agent-activity-panel');assert.equal((await panel.textContent()).match(/prompt|reasoning|token|clientX|clientY|trajectory|rect|selector|textContent/i),null);
 await gear.press('Enter');assert.equal(await page.locator('#agent-activity-panel').count(),0);
 const input=page.getByRole('textbox',{name:'Ask Monty'});await input.fill('What is in the README?');await input.press('Enter');await page.locator('.activity-toggle.is-active').waitFor();assert.equal(await page.locator('.activity-toggle').evaluate(el=>getComputedStyle(el).animationName),'none');
 await page.getByText('A safe answer.').waitFor();await page.locator('.activity-toggle.is-active').waitFor({state:'detached'});
 await gear.click();const source=panel.getByRole('link',{name:'README'});await source.waitFor();assert.equal(await source.getAttribute('target'),'_blank');assert.equal(page.url(),'http://127.0.0.1:5173/');
 await page.getByRole('button',{name:'Monty help'}).hover();const dnd=page.getByRole('checkbox',{name:'Monty do not disturb'});await dnd.check();assert.equal(await dnd.isChecked(),true);await input.fill('A direct question');await input.press('Enter');await page.waitForTimeout(80);assert.equal(chats,2);assert.equal(await page.locator('.activity-toggle.is-active').count(),0);
 console.log('PASS: activity panel is collapsed by default, keyboard/ARIA accessible, reduced-motion safe, and renders only activity-safe data with user-opened sources.');
}finally{await browser.close();}
