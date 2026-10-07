import './test-workspace.mjs';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const sse=events=>events.map(e=>`data: ${JSON.stringify(e)}\n\n`).join('');
try{
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});page.setDefaultTimeout(15000);
 let requests=0;
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/session')return route.fulfill({json:{token:'local-guide',configured:true}});
  if(path.endsWith('/cancel'))return route.fulfill({json:{ok:true}});
  if(path!=='/api/chat')return route.fulfill({contentType:'text/event-stream',body:sse([{type:'done',waiting:false}])});
  requests++;const message=route.request().postDataJSON().message;
  const result=message==='highlight'?{type:'presentation',instruction:{type:'highlight',target:'project-card:pingpong-vision',value:''}}:{type:'guidePlan',destination:'pingpong-vision'};
  return route.fulfill({contentType:'text/event-stream',body:sse([{type:'run',runId:'local-guide'},result,{type:'done',waiting:false}])});
 });
 await page.goto(process.env.MONTY_TEST_URL||'http://127.0.0.1:5173');
 await page.getByRole('button',{name:'Power on',exact:true}).click();
 await page.getByRole('textbox',{name:'Ask Monty'}).fill('highlight');
 await page.locator('[data-agent-id="folder:projects"]').click();
 await page.getByRole('textbox',{name:'Ask Monty'}).press('Enter');
 const card=page.locator('[data-agent-id="project-card:pingpong-vision"]');
 await page.locator('[data-agent-id="project-card:pingpong-vision"].agent-highlight').waitFor();
 await page.waitForTimeout(4800);
 assert.match(await card.getAttribute('class'),/agent-highlight/,'highlight must not expire');
 const scroller=page.locator('.desktop-window.active .content-scroll');
 await scroller.hover();await page.mouse.wheel(0,400);await page.waitForTimeout(150);
 assert.match(await card.getAttribute('class'),/agent-highlight/,'scroll must not clear highlight');
 await page.getByRole('button',{name:'close Projects',exact:true}).click();
 assert.equal(await page.locator('.agent-highlight').count(),0);
 await page.locator('[data-agent-id="folder:about"]').click();
 await page.locator('[data-agent-id="folder:contact"]').click();
 await page.getByRole('textbox',{name:'Ask Monty'}).fill('guide');await page.getByRole('textbox',{name:'Ask Monty'}).press('Enter');
 await page.locator('[data-agent-id="desktop:show"].agent-highlight').waitFor();
 await page.locator('[data-agent-id="desktop:show"]').click();
 await page.locator('[data-agent-id="folder:projects"].agent-highlight').waitFor();
 await page.locator('[data-agent-id="folder:projects"]').click();
 await page.locator('[data-agent-id="project-card:pingpong-vision"].agent-highlight').waitFor();
 // A wrong window becomes a temporary recovery step, not cancellation.
 await page.locator('[data-agent-id="folder:contact"]').click();
 await page.locator('[data-agent-id="window:minimize:contact"].agent-highlight').waitFor();
 await page.locator('[data-agent-id="window:minimize:contact"]').click();
 await page.locator('[data-agent-id="project-card:pingpong-vision"].agent-highlight').waitFor();
 await page.locator('.desktop-window.active .content-scroll').hover();await page.mouse.wheel(0,30);await page.waitForTimeout(150);
 assert.match(await card.getAttribute('class'),/agent-highlight/);
 // Closing the collection clears its highlight, but keeps the original goal.
 await page.getByRole('button',{name:'close Projects',exact:true}).click();
 await page.locator('[data-agent-id="folder:projects"].agent-highlight').waitFor();
 await page.locator('[data-agent-id="folder:projects"]').click();
 await page.locator('[data-agent-id="project-card:pingpong-vision"].agent-highlight').waitFor();
 await card.click();
 await page.getByText(/You have reached the project details/).waitFor();
 assert.equal(requests,2,'no server round trips between guide steps');
 assert.equal(await page.locator('.agent-highlight').count(),0);
 console.log('PASS: persistent highlight, local recovery, show desktop, closed-window recovery, completion without continuation requests.');
}finally{await browser.close();}
