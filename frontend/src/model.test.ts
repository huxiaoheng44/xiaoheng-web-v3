import { describe, expect, it } from 'vitest';
import { desktopReducer } from './model';
import { parsePresentationInstruction } from './features/crt-agent/CrtAgentChat';

describe('desktop lifecycle', () => {
  it('restores minimized windows, preserves maximization and closes independently', () => {
    let state = desktopReducer([], { type: 'open', id: 'projects' });
    state = desktopReducer(state, { type: 'maximize', id: 'projects' });
    state = desktopReducer(state, { type: 'minimize', id: 'projects' });
    expect(state[0].minimized).toBe(true);
    state = desktopReducer(state, { type: 'open', id: 'projects' });
    expect(state).toEqual([{ id: 'projects', minimized: false, maximized: true }]);
    state = desktopReducer(state, { type: 'open', id: 'contact' });
    state = desktopReducer(state, { type: 'close', id: 'projects' });
    expect(state.map(w => w.id)).toEqual(['contact']);
  });
  it('toggles all open windows between the desktop and their prior visible state', () => {
    let state = desktopReducer([], { type: 'open', id: 'projects' });
    state = desktopReducer(state, { type: 'open', id: 'contact' });
    state = desktopReducer(state, { type: 'showDesktop' });
    expect(state.every(window => window.minimized)).toBe(true);
    state = desktopReducer(state, { type: 'showDesktop' });
    expect(state.every(window => !window.minimized)).toBe(true);
  });
});
describe('portfolio-agent presentation boundary', () => {
  it('accepts only display instructions and rejects page operations', () => {
    expect(parsePresentationInstruction({ type: 'highlight', target: 'project-card:drone-simulator', value: '' })).not.toBeNull();
    expect(parsePresentationInstruction({ type: 'openWindow', target: 'about', value: '' })).toBeNull();
    expect(parsePresentationInstruction({ type: 'scrollToSection', target: 'about:skills', value: '' })).toBeNull();
    expect(parsePresentationInstruction({ type: 'showHint', target: '', value: 'x'.repeat(201) })).toBeNull();
    expect(parsePresentationInstruction(null)).toBeNull();
  });
});
