import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 let requests=[],mode='',ctx,run=0,cancels=0,results=[];
 const sse=(route,items)=>route.fulfill({contentType:'text/event-stream',body:items.map(i=>'data: '+JSON.stringify(i)+'\n\n').join('')});
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url()),b=route.request().postDataJSON();
  if(url.pathname==='/api/session')return route.fulfill({json:{token:'test-token',configured:true}});
  if(url.pathname.endsWith('/cancel')){cancels++;return route.fulfill({json:{ok:true}});}
  if(url.pathname==='/api/chat'){
   requests.push(b);mode=b.message;ctx=b.pageContext;run++;
   if(mode==='stale')return sse(route,[{type:'run',runId:String(run)},{type:'action',actionId:String(run),action:{type:'openWindow',target:'about',value:''},contextVersion:ctx.contextVersion+100,navigationAuthorized:true},{type:'done',waiting:true}]);
   if(mode==='interrupt')return sse(route,[{type:'run',runId:String(run)},{type:'approval',actionId:String(run),summary:'Start a tour?',actions:[]},{type:'done',waiting:true}]);
   return sse(route,[{type:'run',runId:String(run)},{type:'delta',text:'Recorded.'},{type:'done',waiting:false}]);
  }
  if(url.pathname.endsWith('/resume')){results.push(b);return sse(route,[{type:'delta',text:'Stale target rejected.'},{type:'done',waiting:false}]);}
  return route.fulfill({json:{ok:true}});
 });
 await page.goto('http://127.0.0.1:5173');await page.locator('.boot-overlay').waitFor({state:'detached'});
 const input=page.getByRole('textbox',{name:'Ask Ghost'});
 await input.fill('stale');await input.press('Enter');await page.getByText('Stale target rejected.',{exact:true}).waitFor();
 assert.equal(results[0].status,'failed');assert.equal(await page.locator('.desktop-window').count(),0);
 await input.fill('interrupt');await input.press('Enter');await page.locator('.ghost-approval').waitFor();
 await page.getByRole('button',{name:'Collapse chat'}).click();await page.getByRole('button',{name:'About',exact:true}).click();
 await page.waitForTimeout(200);assert(cancels>0);assert.equal(await page.locator('.ghost-approval').count(),0);
 await input.click();await page.getByLabel('Smart companion',{exact:true}).check();
 await page.mouse.move(300,250);await page.mouse.move(400,280);await page.waitForTimeout(130);await page.mouse.move(420,285);
 await input.fill('consented');await input.press('Enter');await page.getByText('Recorded.',{exact:true}).last().waitFor();
 const request=requests.at(-1);assert(request.companion);assert(request.behavior.trajectory.length>0&&request.behavior.trajectory.length<=20);
 await page.getByLabel('Smart companion',{exact:true}).uncheck();await input.fill('no tracking');await input.press('Enter');await page.waitForTimeout(150);
 assert(!requests.at(-1).behavior);assert(!requests.at(-1).companion);
 console.log('PASS: stale action refused, user click cancels pending task, consent opt-in/out, bounded trajectory upload.');
}finally{await browser.close();}
import './test-workspace.mjs';
