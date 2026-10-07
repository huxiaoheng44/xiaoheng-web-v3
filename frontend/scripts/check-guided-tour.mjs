import './test-workspace.mjs';
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const sse = events => events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('');
try {
 for (const reducedMotion of ['no-preference', 'reduce']) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion });
  page.setDefaultTimeout(15000);
  const requests = [];
  await page.route('**/api/**', async route => {
   const path = new URL(route.request().url()).pathname;
   if (path === '/api/session') return route.fulfill({ json: { token: 'tour', configured: true } });
   if (path.endsWith('/cancel')) return route.fulfill({ json: { ok: true } });
   if (path !== '/api/chat') return route.fulfill({ contentType: 'text/event-stream', body: sse([{ type: 'done', waiting: false }]) });
   requests.push(route.request().postDataJSON());
   return route.fulfill({ contentType: 'text/event-stream', body: sse([
    { type: 'run', runId: 'tour' }, { type: 'guidePlan', destination: 'fast-ai-movie' }, { type: 'done', waiting: false },
   ]) });
  });
  await page.goto(process.env.MONTY_TEST_URL || 'http://127.0.0.1:5173', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.getByRole('button', { name: 'Power on', exact: true }).click();
  await page.locator('.boot-overlay').waitFor({ state: 'detached' });
  // A constrained collection deterministically exercises both scroll directions,
  // independent of the production grid's changing number of columns.
  await page.addStyleTag({ content: '.content-scroll{max-height:160px!important}.project-directory{grid-template-columns:1fr!important}' });
  const input = page.getByRole('textbox', { name: 'Ask Monty' });
  await input.fill('带我看 AI 项目');
  await input.press('Enter');
  await page.waitForFunction(() => document.querySelector('.monty-overlay')?.dataset.guidePhase === 'waiting-for-click');
  assert.equal(await page.locator('.desktop-window').count(), 0);
  assert.equal(requests.length, 1);
  await page.getByRole('button', { name: 'Projects', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.monty-overlay')?.dataset.visibilityDirection === 'below');
  assert.equal(requests.length, 1);
  assert.equal(await page.locator('.agent-highlight').count(), 0);
  await page.getByText(/请向下滚动/).waitFor();
  assert.equal(await page.locator('.monty-scroll-arrow').isVisible(), true);
  assert.equal(await page.locator('.content-scroll').evaluate(el => el.scrollTop), 0);
  assert.equal(await page.locator('.monty-overlay').getAttribute('data-reduced'), String(reducedMotion === 'reduce'));
  if (reducedMotion === 'reduce') {
   await page.waitForTimeout(100);
   const first = await page.locator('.monty-overlay').boundingBox();
   await page.waitForTimeout(150);
   assert.deepEqual(await page.locator('.monty-overlay').boundingBox(), first);
  }
  const scrollBox = await page.locator('.content-scroll').boundingBox();
  await page.mouse.move(scrollBox.x + 20, scrollBox.y + 20);
  await page.mouse.wheel(0, 3000);
  await page.waitForFunction(() => document.querySelector('.monty-overlay')?.dataset.visibilityDirection === 'above');
  await page.getByText(/请向上滚动/).waitFor();
  for (let step = 0; step < 30; step++) {
   if (await page.locator('.monty-overlay').getAttribute('data-visibility-direction') === 'visible') break;
   await page.mouse.wheel(0, -50);
   await page.waitForTimeout(100);
  }
  await page.waitForFunction(() => document.querySelector('.monty-overlay')?.dataset.guidePhase === 'waiting-for-click');
  await page.locator('[data-agent-id="project-card:fast-ai-movie"].agent-highlight').waitFor();
  await page.getByText(/找到了.*FAST AI/).waitFor();
  assert.equal(await page.locator('.monty-scroll-arrow').isVisible(), false);
  assert.equal(requests.length, 1);
  await page.mouse.wheel(0, 25);
  await page.waitForTimeout(350);
  assert.match(await page.locator('[data-agent-id="project-card:fast-ai-movie"]').getAttribute('class'), /agent-highlight/, 'scrolling must preserve acquired highlight');
  await page.mouse.wheel(0, -25);
  await page.screenshot({ path: `artifacts/monty-guide-${reducedMotion}.png` });
  await page.getByRole('button', { name: /FAST AI Movie Web/ }).click();
  await page.getByText(/已到达项目详情/).waitFor();
  assert.equal(requests.length, 1);
  await page.waitForFunction(() => !document.querySelector('.monty-overlay')?.dataset.guidePhase);
  assert.equal(await page.locator('.agent-highlight').count(), 0);
  await page.close();
  console.log(`PASS (${reducedMotion}): keyboard entry, up/down cues, live Chinese instructions, user-only scroll/click, detail completion and cleanup.`);
 }
} finally { await browser.close(); }
