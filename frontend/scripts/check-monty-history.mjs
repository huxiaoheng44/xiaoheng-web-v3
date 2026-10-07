import './test-workspace.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const sse=events=>events.map(event=>`data: ${JSON.stringify(event)}\n\n`).join('');
try {
 const page=await browser.newPage({viewport:{width:1440,height:960}});page.setDefaultTimeout(15000);
 let used=0;const quota=()=>({limit:300000,used,remaining:300000-used,reserved:0,estimated:false});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/session')return route.fulfill({json:{token:'history',configured:true,usage:quota()}});
  if(path==='/api/session/usage')return route.fulfill({json:quota()});
  if(path!=='/api/chat')return route.fulfill({contentType:'text/event-stream',body:sse([{type:'done',waiting:false}])});
  const body=route.request().postDataJSON();used+=100;
  return route.fulfill({contentType:'text/event-stream',body:sse([
   {type:'activity',kind:'tool',name:'searchKnowledge'},
   {type:'source',source:{id:'source',title:'Project overview',source:'public',target:'',version:'1',url:'https://example.com/project'}},
   {type:'delta',text:`Reply to ${body.message}`},{type:'usage',usage:quota()},{type:'done',waiting:false},
  ])});
 });
 await page.goto(process.env.MONTY_TEST_URL||'http://127.0.0.1:5173',{waitUntil:'domcontentloaded',timeout:30000});
 await page.getByRole('button',{name:'Power on',exact:true}).click();
 await page.getByRole('button',{name:'Chat with Monty',exact:true}).click();
 await page.getByRole('button',{name:'Open chat history',exact:true}).click();
 const history=page.getByRole('region',{name:'Monty Chat History',exact:true});
 await history.waitFor();await history.getByText(/No messages yet/).waitFor();
 await history.getByText(/300,000 \/ 300,000 reply tokens left/).waitFor();
 const input=page.getByRole('textbox',{name:'Ask Monty'});
 for(let i=1;i<=25;i++){
  const message=`Question ${i}`;await input.fill(message);await input.press('Enter');
  await history.getByText(`Reply to ${message}`,{exact:true}).waitFor();
 }
 assert.equal(await history.locator('.history-line').count(),50);
 assert.equal(await history.getByText('Question 1',{exact:true}).count(),1);
 await history.getByText(/297,500 \/ 300,000 reply tokens left/).waitFor();
 assert.equal(await history.getByRole('link',{name:'Project overview ↗'}).count(),25);
 await history.locator('.history-tools summary').first().click();await history.getByText('Searched the knowledge base').first().waitFor();
 assert.equal(await page.locator('.network-status svg').count(),1);
 assert.equal(await page.locator('.network-status').innerText(),'');
 await page.getByRole('button',{name:'minimize Monty Chat History',exact:true}).click();
 await page.getByRole('button',{name:'Restore Monty Chat History',exact:true}).click();
 assert.equal(await history.locator('.history-line').count(),50);
 await page.getByRole('button',{name:'maximize Monty Chat History',exact:true}).click();
 await page.screenshot({path:'artifacts/monty-history-desktop.png'});
 await page.getByRole('button',{name:'close Monty Chat History',exact:true}).click();
 await page.getByRole('button',{name:'Open chat history',exact:true}).click();
 assert.equal(await history.locator('.history-line').count(),50);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(1800);
 await page.screenshot({path:'artifacts/monty-history-mobile.png'});
 const footer=await page.locator('.monty-history-footer').boundingBox();assert.ok(footer&&footer.width>0);
 assert.deepEqual(errors,[]);
 console.log('PASS: scroll icon opens desktop history; all 50 messages, sources and activities retained; authoritative quota, restore/reopen and icon-only network status.');
} finally {await browser.close();}
