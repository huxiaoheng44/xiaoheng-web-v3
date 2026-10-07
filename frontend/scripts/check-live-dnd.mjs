/** Real-provider smoke check.  This intentionally installs no route mocks. */
import './test-workspace.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage({viewport:{width:1440,height:960}});
 await page.goto('http://127.0.0.1:5173');
 await page.locator('.boot-overlay').waitFor({state:'detached'});
 await page.getByRole('button',{name:'Monty help'}).hover();
 const dnd=page.getByRole('checkbox',{name:'Monty do not disturb'});
 await dnd.check();assert.equal(await dnd.isChecked(),true);
 const input=page.getByRole('textbox',{name:'Ask Monty'});
 await input.fill('Briefly describe this portfolio.');await input.press('Enter');
 await page.locator('[aria-label="Monty message"] .monty-utterance').waitFor({timeout:45000});
 assert.equal(await page.locator('.desktop-window').count(),0);
 assert.equal(page.url(),'http://127.0.0.1:5173/');
 await page.screenshot({path:'artifacts/test-results/phase651-live-dnd.png'});
 console.log('PASS: real DeepSeek response remains available for a Terminal question while DND is enabled.');
}finally{await browser.close();}
