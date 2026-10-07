import './test-workspace.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 const requests=[];page.on('request',r=>requests.push(r.url()));
 await page.goto('http://127.0.0.1:5173/');await page.locator('.boot-overlay').waitFor({state:'detached'});
 await page.evaluate(()=>document.fonts.ready);
 const client=await page.context().newCDPSession(page);await client.send('DOM.enable');await client.send('CSS.enable');
 const {root}=await client.send('DOM.getDocument');
 for(const selector of ['.terminal-user']){
  const {nodeId}=await client.send('DOM.querySelector',{nodeId:root.nodeId,selector});
  const {fonts}=await client.send('CSS.getPlatformFontsForNode',{nodeId});
  assert(fonts.some(f=>f.isCustomFont&&f.familyName.includes('Fusion Pixel')&&f.glyphCount>0),JSON.stringify({selector,fonts}));
  console.log(selector,fonts.map(f=>({family:f.familyName,glyphs:f.glyphCount,custom:f.isCustomFont})));
 }
 assert(!requests.some(url=>/fonts\.(googleapis|gstatic)\.com/.test(url)));
 await page.getByRole('button',{name:'README',exact:true}).click();await page.getByRole('button',{name:'maximize README',exact:true}).click();
 await page.screenshot({path:'artifacts/test-results/pixel-font-en.png'});
 await page.getByRole('button',{name:'close README',exact:true}).click();await page.getByRole('button',{name:'Switch to Chinese'}).click();
 await page.getByRole('button',{name:'README',exact:true}).click();
 await page.screenshot({path:'artifacts/test-results/pixel-font-zh.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/test-results/pixel-font-mobile.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('PASS: custom Chinese/name glyphs, monospaced terminal, local font requests, bilingual and mobile layout.');
}finally{await browser.close();}
