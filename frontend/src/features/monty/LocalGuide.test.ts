import { describe, expect, it } from 'vitest';
import { LocalGuide } from './LocalGuide';
import type { WindowId, WindowState } from '../../model';
const window = (id: WindowId, minimized = false): WindowState => ({ id, minimized, maximized: false });
const step = (guide: LocalGuide, windows: WindowState[]) => guide.update({ windows });
describe('local guide', () => {
  it('skips completed prerequisites and finishes from actual state', () => {
    const guide = new LocalGuide(); guide.start('pingpong-vision', 'en');
    expect(step(guide, [])).toMatchObject({ step: { target: 'folder:projects' } });
    expect(step(guide, [window('projects')])).toMatchObject({ step: { target: 'project-card:pingpong-vision' } });
    expect(step(guide, [window('project:pingpong-vision')])).toMatchObject({ done: true, message: expect.stringContaining('Gemini') });
    expect(guide.active).toBe(false);
  });
  it('recovers wrong windows without growing a stale stack', () => {
    const guide = new LocalGuide(); guide.start('pingpong-vision', 'zh');
    for (let i = 0; i < 20; i++) expect(step(guide, [window('projects'), window('contact')])).toMatchObject({ step: { target: 'window:minimize:contact' } });
    expect(guide.snapshot().recovery).toHaveLength(1);
    expect(step(guide, [window('projects'), window('contact', true)])).toMatchObject({ step: { target: 'project-card:pingpong-vision' } });
    expect(step(guide, [])).toMatchObject({ step: { target: 'folder:projects' } });
  });
  it('counts visible windows and never toggles show desktop twice', () => {
    const guide = new LocalGuide(); guide.start('folder:experience', 'en');
    expect(step(guide, [window('about'), window('contact')])).toMatchObject({ step: { target: 'desktop:show' } });
    expect(step(guide, [window('about', true), window('contact', true)])).toMatchObject({ step: { target: 'folder:experience' } });
    expect(step(guide, [window('about', true), window('contact')])).toMatchObject({ step: { target: 'window:minimize:contact' } });
  });
  it('rejects unknown goals and replaces/cancels existing goals', () => {
    const guide = new LocalGuide(); expect(guide.start('unknown', 'en')).toBe(false);
    guide.start('pingpong-vision', 'en'); guide.start('folder:contact', 'zh');
    expect(step(guide, [window('contact')])).toMatchObject({ done: true });
    guide.start('pingpong-vision', 'en'); guide.cancel(); expect(step(guide, [])).toBeNull();
  });
});
