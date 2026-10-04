import { afterEach, expect, it, vi } from 'vitest';
import { CrtAgentTransport } from './transport';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('does not upload questions or browsing events on static-only hosting', async () => {
  vi.stubEnv('VITE_GHOST_STATIC_MODE', 'true');
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const transport = new CrtAgentTransport();
  await expect(transport.request('/chat', { message: 'hello' })).rejects.toThrow('CRT.AGENT is offline');
  await expect(transport.request('/observe', { events: [] })).rejects.toThrow('CRT.AGENT is offline');
  expect(fetch).not.toHaveBeenCalled();
});
