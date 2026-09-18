import { afterEach, expect, it, vi } from 'vitest';
import { GhostTransport } from './transport';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('does not upload questions or browsing events on static-only hosting', async () => {
  vi.stubEnv('VITE_GHOST_STATIC_MODE', 'true');
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const transport = new GhostTransport();
  await expect(transport.request('/chat', { message: 'hello' })).rejects.toThrow('AI chat is offline');
  await expect(transport.request('/observe', { events: [] })).rejects.toThrow('AI chat is offline');
  expect(fetch).not.toHaveBeenCalled();
});
