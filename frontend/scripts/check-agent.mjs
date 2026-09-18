import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Never use the configured paid provider in browser regression tests.
 await page.route('**/api/chat',route=>route.fulfill({contentType:'text/event-stream',body:'data: '+JSON.stringify({type:'error',message:'Agent is not configured. Simulated offline test.'})+'\n\ndata: '+JSON.stringify({type:'done',waiting:false})+'\n\n'}));
 await page.goto('http://127.0.0.1:5173');await page.locator('.boot-overlay').waitFor({state:'detached'});
 const input=page.getByRole('textbox',{name:'Ask Ghost'});
 await input.fill('介绍一下你');await input.press('Enter');
 await page.getByText(/Agent is not configured/).first().waitFor();
 assert.equal(await page.locator('.desktop-window').count(),0);
 await page.locator('.ghost-options button').filter({hasText:'Clear session'}).click();
 let run=0,index=0,currentContext,requested=[];const ids=['3d-reconstruction','drone-simulator','fast-ai-movie','vehicle-identification'];
 const sse=async(route,events)=>route.fulfill({status:200,contentType:'text/event-stream',body:events.map(e=>'data: '+JSON.stringify(e)+'\n\n').join('')});
 await page.route('**/api/**',async route=>{
  const url=new URL(route.request().url());const data=route.request().postDataJSON();
  if(url.pathname==='/api/session')return route.fulfill({json:{token:'mock-session-token',configured:true}});
  if(url.pathname.endsWith('/cancel'))return route.fulfill({json:{ok:true}});
  if(url.pathname==='/api/observe'){requested.push(data);return sse(route,[{type:'done',waiting:false}]);}
  if(url.pathname==='/api/chat'){
   requested.push(data);currentContext=data.pageContext;run++;index=0;
   if(data.message.includes('approval'))return sse(route,[{type:'run',runId:`run${run}`},{type:'approval',actionId:`approval${run}`,summary:'May I open About?',actions:[{type:'openWindow',target:'about',value:''}]},{type:'done',waiting:true}]);
   return sse(route,[{type:'run',runId:`run${run}`},{type:'action',actionId:`${run}:${index}`,action:{type:'openProject',target:ids[index],value:''},contextVersion:currentContext.contextVersion,navigationAuthorized:true},{type:'done',waiting:true}]);
  }
  if(url.pathname.endsWith('/resume')){
   currentContext=data.pageContext;
   if(data.approved===false)return sse(route,[{type:'delta',text:'No navigation.'},{type:'done',waiting:false}]);
   assert.equal(data.status,'success',JSON.stringify(data));index++;
   if(index<4)return sse(route,[{type:'action',actionId:`${run}:${index}`,action:{type:'openProject',target:ids[index],value:''},contextVersion:currentContext.contextVersion,navigationAuthorized:true},{type:'done',waiting:true}]);
   return sse(route,[{type:'source',source:{id:'drone-section',title:'Drone architecture',target:'project:drone-simulator:section-0',source:'Public project',version:'test'}},{type:'delta',text:'All four projects are open.'},{type:'done',waiting:false}]);
  }
  return route.fulfill({json:{ok:true}});
 });
 await input.fill('open all projects');await input.press('Enter');
 await page.getByText('All four projects are open.',{exact:true}).waitFor();
 assert.equal(await page.locator('.desktop-window').count(),4);
 assert(requested.every(r=>!r.companion&&!r.behavior));
 await page.screenshot({path:'test-results/agent-desktop.png'});
 await page.getByRole('button',{name:'Undo navigation',exact:true}).click();assert.equal(await page.locator('.desktop-window').count(),0);
 await input.fill('approval');await input.press('Enter');await page.locator('.ghost-approval').getByText('May I open About?',{exact:true}).waitFor();
 assert.equal(await page.locator('.desktop-window').count(),0);
 await page.getByRole('button',{name:'No thanks',exact:true}).click();await page.getByText('No navigation.',{exact:true}).waitFor();
 await input.fill('open all projects');await input.press('Enter');
 await page.waitForFunction(()=>document.querySelectorAll('.desktop-window').length===4);
 await page.waitForTimeout(600);
 await page.getByRole('button',{name:'Drone architecture ↗',exact:true}).last().click();
 await page.locator('[data-agent-id="project:drone-simulator:section-0"].agent-highlight').waitFor();
 await page.getByRole('button',{name:'Collapse chat'}).click();
 await page.getByRole('button',{name:'About',exact:true}).click();
 await page.getByRole('region',{name:'About',exact:true}).getByRole('button',{name:'Education',exact:true}).click();
 assert.equal(await page.locator('[data-agent-id="about:education"]').count(),1);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
 await input.click();await page.screenshot({path:'test-results/agent-mobile.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const rect=await page.locator('.ghost-drawer').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=391);
 assert.deepEqual(errors,[]);
 console.log('PASS: simulated offline state, mock multi-step actions, consent-off payload, undo, approval decline, source navigation, mobile drawer. No paid calls.');
}finally{await browser.close();}
import './test-workspace.mjs';
