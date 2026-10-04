import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, reducedMotion: 'reduce' });
  const requests = [];
  const sse = (route, events) => route.fulfill({ contentType: 'text/event-stream', body: events.map(event => `data: ${JSON.stringify(event)}\n\n`).join('') });
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/session') return route.fulfill({ json: { token: 'test-token', configured: true } });
    if (url.pathname.endsWith('/cancel')) return route.fulfill({ json: { ok: true } });
    const body = route.request().postDataJSON();
    if (url.pathname === '/api/chat') {
      requests.push(body);
      const target = body.message.includes('detail') ? 'project:drone-simulator' : body.message.includes('card') ? 'project-card:drone-simulator' : 'folder:projects';
      return sse(route, [
        { type: 'run', runId: 'display-run' },
        { type: 'presentation', instruction: { type: 'highlight', target, value: '' } },
        { type: 'delta', text: 'Projects are ready to explore.' },
        { type: 'done', waiting: false },
      ]);
    }
    if (url.pathname === '/api/observe') { requests.push(body); return sse(route, [{ type: 'done', waiting: false }]); }
    return route.fulfill({ json: { ok: true } });
  });
  await page.goto('http://127.0.0.1:5173');
  await page.locator('.boot-overlay').waitFor({ state: 'detached' });
  const deprecated = [['Smart', 'companion'].join(' '), ['Quiet', 'mode'].join(' ')];
  const pageText = await page.locator('body').innerText();
  for (const text of deprecated) assert.equal(pageText.includes(text), false);
  const input = page.getByRole('textbox', { name: 'Ask CRT.AGENT' });
  await input.fill('Tell me about projects');
  await input.press('Enter');
  await page.getByText('Projects are ready to explore.', { exact: true }).waitFor();
  await page.locator('[data-agent-id="folder:projects"].agent-highlight').waitFor();
  assert.equal(await page.locator('.desktop-window').count(), 0);
  const request = requests.at(-1);
  assert.equal('companion' in request, false);
  assert.equal('quiet' in request, false);
  const pathField = ['tra', 'jectory'].join('');
  assert.equal(pathField in request, false);
  assert.equal(JSON.stringify(request).match(/clientX|clientY|\brect\b|\bpath\b/), null);
  assert.deepEqual(Object.keys(request.pageContext.targets[0]).sort(), ['available', 'capabilities', 'guideable', 'id', 'names', 'visible']);
  assert.deepEqual(Object.keys(request.pageContext.targets[0].names).sort(), ['en', 'zh']);
  assert(request.behavior);
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await input.fill('Highlight a project card');
  await input.press('Enter');
  await page.locator('[data-agent-id="project-card:drone-simulator"].agent-highlight').waitFor();
  await page.getByRole('button', { name: /Drone Simulator/ }).click();
  await input.fill('Highlight project detail');
  await input.press('Enter');
  await page.locator('[data-agent-id="project:drone-simulator"].agent-highlight').waitFor();
  const detailRequest = requests.at(-1);
  assert(detailRequest.pageContext.targets.some(target => target.id === 'project:drone-simulator' && target.available && target.projectId === 'drone-simulator' && target.names.en === 'Drone Simulator' && target.names.zh === '无人机仿真与控制'));
  assert(detailRequest.pageContext.targets.some(target => target.id.startsWith('project:drone-simulator:tag:') && target.projectId === 'drone-simulator' && typeof target.tag === 'string'));
  await input.fill('semantic context only');
  await input.press('Enter');
  await page.getByText('Projects are ready to explore.', { exact: true }).last().waitFor();
  const semantic = requests.at(-1);
  assert(semantic.behavior);
  assert.deepEqual(Object.keys(semantic.behavior).sort(), ['activePanel', 'dnd', 'events', 'idleSeconds', 'locale', 'proactiveCount', 'route', 'window']);
  assert.equal(semantic.behavior.events.some(event => event.type === 'scroll'), false);
  assert.equal(pathField in semantic.behavior, false);
  assert.equal(JSON.stringify(semantic.behavior).match(/clientX|clientY|\brect\b|\bpath\b|selector|textContent/), null);
  console.log('PASS: CRT.AGENT display-only SSE, semantic session snapshot, and local visual hint.');
} finally {
  await browser.close();
}
import './test-workspace.mjs';
