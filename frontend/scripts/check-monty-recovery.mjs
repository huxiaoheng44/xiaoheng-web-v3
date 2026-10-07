import './test-workspace.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
const sse=events=>events.map(event=>`data: ${JSON.stringify(event)}\n\n`).join('');
try {
 const page=await browser.newPage();page.setDefaultTimeout(15000);
 const counts=new Map();let sessions=0;
 await page.route('**/api/**',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/session')return route.fulfill({json:{token:`session-${++sessions}`,configured:true}});
  if(path!=='/api/chat')return route.fulfill({json:{ok:true}});
  const request=route.request().postDataJSON();const message=request.message;
  const count=(counts.get(message)||0)+1;counts.set(message,count);
  if(message==='短暂断网'&&count===1)return route.abort('failed');
  if(message==='会话过期'&&count===1)return route.fulfill({status:401,json:{detail:'expired'}});
  if(message==='持续断网')return route.fulfill({status:503,json:{detail:'temporary'}});
  const events=message==='模型超时'?[{type:'error',code:'timeout',message:'internal timeout'}]
   :[{type:'delta',text:message==='半截回复'?'已有内容':'恢复成功'}];
  if(message!=='半截回复')events.push({type:'done',waiting:false});
  return route.fulfill({contentType:'text/event-stream',body:sse(events)});
 });
 await page.goto(process.env.MONTY_TEST_URL||'http://127.0.0.1:5173',{waitUntil:'domcontentloaded',timeout:30000});
 await page.getByRole('button',{name:'Power on',exact:true}).click();
 const input=page.getByRole('textbox',{name:'Ask Monty'});
 const send=async message=>{await input.fill(message);await input.press('Enter');};
 await send('短暂断网');await page.getByText('恢复成功',{exact:false}).waitFor();assert.equal(counts.get('短暂断网'),2);
 await send('会话过期');await page.waitForFunction(()=>document.querySelector('.monty-utterance')?.textContent?.includes('恢复成功'));
 // Wait for the renewed request, rather than matching text left from the first reply.
 await page.waitForTimeout(300);assert.equal(counts.get('会话过期'),2);assert.equal(sessions,2);
 await send('模型超时');await page.getByText(/这次回复等待超时/).waitFor();
 await send('恢复后提问');await page.getByText('恢复成功',{exact:false}).waitFor();assert.equal(await page.getByText(/这次回复等待超时/).count(),0);
 await send('持续断网');await page.getByText(/连接暂时不稳定/).waitFor();assert.equal(counts.get('持续断网'),3);
 await send('半截回复');await page.getByText(/已有内容.*这次回复中断/s).waitFor();assert.equal(counts.get('半截回复'),1);
 assert.equal(await page.getByText(/unavailable|暂时不可用/i).count(),0);
 console.log('PASS: transient recovery, session renewal, localized timeout, stale error cleanup, bounded retries, partial-stream preservation.');
} finally {await browser.close();}
