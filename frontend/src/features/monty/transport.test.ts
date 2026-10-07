import { afterEach, expect, it, vi } from 'vitest';
import { MontyTransport, MontyRequestError, requestFailureMessage } from './transport';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('does not upload questions or browsing events on static-only hosting', async () => {
  vi.stubEnv('VITE_MONTY_STATIC_MODE', 'true');
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const transport = new MontyTransport();
  await expect(transport.request('/chat', { message: 'hello' })).rejects.toThrow('Monty is offline');
  await expect(transport.request('/observe', { events: [] })).rejects.toThrow('Monty is offline');
  expect(fetch).not.toHaveBeenCalled();
});

it('recovers an expired session without failing the user request', async () => {
  const fetch = vi.fn()
    .mockResolvedValueOnce(new Response('{}', {status:401}))
    .mockResolvedValueOnce(Response.json({token:'fresh',configured:true}))
    .mockResolvedValueOnce(new Response('ok'));
  vi.stubGlobal('fetch',fetch);
  const transport=new MontyTransport();transport.token='expired';
  await expect(transport.request('/chat',{requestId:'same-id'})).resolves.toBeInstanceOf(Response);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(JSON.parse(fetch.mock.calls[2][1].body).requestId).toBe('same-id');
});

it('absorbs a brief network failure before a response starts', async () => {
  vi.useFakeTimers();
  try {
    const fetch=vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(new Response('ok'));
    vi.stubGlobal('fetch',fetch);
    const transport=new MontyTransport();transport.token='valid';
    const result=expect(transport.request('/chat',{requestId:'same-id'})).resolves.toBeInstanceOf(Response);
    await vi.runAllTimersAsync();await result;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][1].body).toBe(fetch.mock.calls[1][1].body);
  } finally { vi.useRealTimers(); }
});

it('limits retries and never retries rate limits or duplicate requests', async () => {
  vi.useFakeTimers();
  try {
    for(const status of [503,429,409,422]) {
      const fetch=vi.fn().mockImplementation(async()=>new Response('{}',{status}));
      vi.stubGlobal('fetch',fetch);
      const transport=new MontyTransport();transport.token='valid';
      const outcome=transport.request('/chat',{}).catch(error=>error);
      await vi.runAllTimersAsync();
      expect((await outcome).status).toBe(status);
      expect(fetch).toHaveBeenCalledTimes(status===503?3:1);
    }
  } finally {vi.useRealTimers();}
});

it('cancels a pending retry when the user aborts', async () => {
  vi.useFakeTimers();
  try {
    const controller=new AbortController();const fetch=vi.fn().mockRejectedValue(new TypeError('network'));
    vi.stubGlobal('fetch',fetch);
    const transport=new MontyTransport();transport.token='valid';
    const outcome=transport.request('/chat',{},controller.signal).catch(error=>error);
    await vi.advanceTimersByTimeAsync(100);controller.abort();await vi.runAllTimersAsync();
    expect((await outcome).name).toBe('AbortError');expect(fetch).toHaveBeenCalledTimes(1);
  } finally {vi.useRealTimers();}
});

it('preserves partial output and reports a truncated stream without replaying it', async () => {
  const fetch=vi.fn().mockResolvedValue(new Response('data: {"type":"delta","text":"Partial reply"}\n\n'));
  vi.stubGlobal('fetch',fetch);
  const transport=new MontyTransport();transport.token='valid';const events=[];
  let failure;
  try { for await(const event of transport.stream('/chat',{},new AbortController().signal))events.push(event); }
  catch(error){failure=error;}
  expect(events).toEqual([{type:'delta',text:'Partial reply'}]);
  expect(failure).toMatchObject({code:'interrupted'});expect(fetch).toHaveBeenCalledTimes(1);
});


it('does not resume an expired tour with a lost server-side goal', async () => {
  const fetch=vi.fn().mockResolvedValue(new Response('{}',{status:401}));vi.stubGlobal('fetch',fetch);
  const transport=new MontyTransport();transport.token='expired';
  await expect(transport.request('/chat',{guideStep:true})).rejects.toMatchObject({code:'guide-expired'});
  expect(fetch).toHaveBeenCalledTimes(1);expect(transport.token).toBe('');
});

it('describes request failures without claiming the robot is offline', () => {
  expect(requestFailureMessage(new MontyRequestError('timeout'),'zh')).toContain('回复等待超时');
  expect(requestFailureMessage(new MontyRequestError('http',429),'en')).toContain('Too many requests');
  expect(requestFailureMessage(new TypeError('network'),'en')).toContain('connection');
  expect(requestFailureMessage(new MontyRequestError('configuration'),'zh')).toContain('配置');
});
