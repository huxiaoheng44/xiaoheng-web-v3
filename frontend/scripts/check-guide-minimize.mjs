import './test-workspace.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const sse=events=>events.map(event=>`data: ${JSON.stringify(event)}\n\n`).join('');
try {
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});page.setDefaultTimeout(15000);
 const requests=[];
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/session')return route.fulfill({json:{token:'minimize',configured:true,usage:{limit:300000,used:0,remaining:300000,reserved:0,estimated:false}}});
  if(path!=='/api/chat')return route.fulfill({contentType:'text/event-stream',body:sse([{type:'done',waiting:false}])});
  const body=route.request().postDataJSON();requests.push(body);
  assert.ok(body.pageContext.targets.some(t=>t.id==='desktop:show'&&t.guideable));
  return route.fulfill({contentType:'text/event-stream',body:sse([{type:'guidePlan',destination:'fast-ai-movie'},{type:'done',waiting:false}])});
 });
 await page.goto(process.env.MONTY_TEST_URL||'http://127.0.0.1:5173',{waitUntil:'domcontentloaded',timeout:30000});
 await page.getByRole('button',{name:'Power on',exact:true}).click();
 await page.getByRole('button',{name:'Contact',exact:true}).click();
 await page.getByRole('button',{name:'Chat with Monty',exact:true}).click();
 await page.getByRole('button',{name:'Open chat history',exact:true}).click();
 await page.getByRole('button',{name:'maximize Monty Chat History',exact:true}).click();
 const input=page.getByRole('textbox',{name:'Ask Monty'});await input.fill('带我看 AI 项目');await input.press('Enter');
 await page.locator('[data-agent-id="desktop:show"].agent-highlight').waitFor();
 await page.getByText(/显示桌面/).last().waitFor();
 assert.equal(requests.length,1);assert.equal(await page.locator('[data-window-id="monty-history"]').getAttribute('hidden'),null);
 await page.locator('[data-agent-id="desktop:show"]').focus();await page.keyboard.press('Enter');
 await page.locator('[data-agent-id="folder:projects"].agent-highlight').waitFor();
 assert.equal(requests.length,1);
 assert.equal(await page.locator('.desktop-window:not([hidden])').count(),0);
 await page.getByRole('button',{name:'Projects',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.monty-overlay')?.dataset.guidePhase==='waiting-for-click'||document.querySelector('.monty-overlay')?.dataset.guidePhase==='scroll-cue');
 assert.equal(requests.length,1);
 console.log('PASS: stacked history/contact windows are minimized only by real user clicks; keyboard completion reaches desktop and resumes the original project tour.');
} finally {await browser.close();}
