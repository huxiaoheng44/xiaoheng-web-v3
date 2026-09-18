import { describe, expect, it } from 'vitest';
import { desktopReducer } from './model';
import { parseGhostAction } from './features/ghost/GhostChat';

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
});
describe('future agent boundary', () => {
  it('accepts only known UI actions and folder identifiers', () => {
    expect(parseGhostAction({ type: 'openWindow', folder: 'about' })).toEqual({ type: 'openWindow', folder: 'about' });
    expect(parseGhostAction({ type: 'eval', code: 'alert(1)' })).toBeNull();
    expect(parseGhostAction({ type: 'openWindow', folder: '../secrets' })).toBeNull();
    expect(parseGhostAction({ type: 'showHint', text: 'x'.repeat(201) })).toBeNull();
    expect(parseGhostAction(null)).toBeNull();
  });
});
