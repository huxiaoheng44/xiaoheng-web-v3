import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
 const page = await browser.newPage({viewport:{width:1440,height:960}});
 await page.goto('http://127.0.0.1:5173');
 await page.locator('.boot-overlay[data-phase=off]').waitFor();
 assert(await page.locator('.os-shell').evaluate(e=>e.inert));
 await page.screenshot({path:'artifacts/test-results/boot-start.png'});
 await page.locator('.boot-skip').click();
 await page.locator('.boot-overlay[data-step=post] .boot-log').waitFor();
 await page.screenshot({path:'artifacts/test-results/boot-post.png'});
 await page.locator('.boot-overlay').waitFor({state:'detached'});
 assert.equal(await page.locator('.os-shell').evaluate(e=>e.inert),false);
 await page.locator('.monty-overlay').waitFor();
 await page.screenshot({path:'artifacts/test-results/desk-motion.png'});
 assert.equal(await page.locator('.stage').evaluate(e=>getComputedStyle(e,'::before').animationName),'coffee-steam');
 const keyboard=await page.locator('.keyboard-object').boundingBox();
 const stage=await page.locator('.stage').boundingBox();
 assert(keyboard.width/stage.width>.52);
 assert(keyboard.x+keyboard.width/2<stage.x+stage.width*.4);
 // Shutdown: log, Monty back on the standby screen, desk Monty gone.
 await page.locator('.power-control').click();
 await page.locator('.boot-overlay[data-phase=shutting][data-step=log]').waitFor();
 await page.locator('.boot-overlay[data-phase=off]').waitFor({timeout:5000});
 assert.equal(await page.locator('.monty-overlay').count(),0);
 // Skip: a click during the boot jumps to the hand-off.
 await page.locator('.boot-skip').click();
 await page.waitForTimeout(300);
 await page.mouse.click(700,400);
 await page.locator('.boot-overlay').waitFor({state:'detached',timeout:1500});
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.reload();
 await page.locator('.boot-skip').click();
 assert.equal(await page.locator('.boot-overlay').count(),0);
 assert.equal(await page.locator('.stage').evaluate(e=>getComputedStyle(e,'::before').animationName),'none');
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('.stage').evaluate(e=>getComputedStyle(e,'::before').display),'none');
 console.log('PASS: standby, POST boot, shutdown, skip, keyboard layout, steam, reduced motion, mobile.');
} finally { await browser.close(); }
