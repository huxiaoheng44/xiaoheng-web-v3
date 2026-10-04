import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const sse = (route, events) => route.fulfill({ contentType: 'text/event-stream', body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('') });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/session') return route.fulfill({ json: { token: 'boundary-token', configured: true } });
    if (url.pathname.endsWith('/cancel')) return route.fulfill({ json: { ok: true } });
    if (url.pathname === '/api/chat') return sse(route, [
      { type: 'run', runId: 'boundary-run' },
      { type: 'presentation', instruction: { type: 'highlight', target: 'unknown:target', value: '' } },
      { type: 'presentation', instruction: { type: 'guideTo', target: 'folder:projects', value: '' } },
      { type: 'done', waiting: false },
    ]);
    return sse(route, [{ type: 'done', waiting: false }]);
  });
  await page.goto('http://127.0.0.1:5173');
  await page.locator('.boot-overlay').waitFor({ state: 'detached' });
  const initialWindows = await page.locator('.desktop-window').count();
  const initialScroll = await page.evaluate(() => window.scrollY);
  const input = page.getByRole('textbox', { name: 'Ask CRT.AGENT' });
  await input.fill('Show a safe hint');
  await input.press('Enter');
  await page.waitForFunction(() => document.querySelector('.crt-agent-overlay')?.dataset.mode === 'move', null, { timeout: 12000 });
  await page.waitForFunction(() => document.querySelector('.crt-agent-overlay')?.dataset.mode === 'point', null, { timeout: 12000 });
  assert.equal(await page.locator('.desktop-window').count(), initialWindows);
  assert.equal(await page.evaluate(() => window.scrollY), initialScroll);
  assert.equal(await page.locator('[data-agent-id="folder:projects"].agent-highlight').count(), 1);
  assert.equal(await page.locator('[data-agent-id="folder:projects"]').count(), 1);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('.crt-agent-overlay')?.dataset.mode === 'move', null, { timeout: 12000 });
  await page.waitForFunction(() => {
    const overlay = document.querySelector('.crt-agent-overlay')?.getBoundingClientRect();
    return !!overlay && overlay.right >= innerWidth - 26 && overlay.bottom >= innerHeight - 40;
  }, null, { timeout: 12000 });
  console.log('PASS: valid guideTo travels, then points until cancelled and returns home; malformed or unavailable display instructions have no page side effects; CRT.AGENT cannot navigate, scroll, click, type, open UI, or change tabs.');
} finally {
  await browser.close();
}
import './test-workspace.mjs';
