import { describe, expect, it } from 'vitest';
import { guideProgress, projectGuideTarget } from './GuideWorkflow';
import { projects } from '../../content/projects';

describe('Monty guide workflow', () => {
  it('declares the complete Projects → card → detail path for every project', () => {
    for (const project of projects) {
      const target = projectGuideTarget(project.id, { en: project.title, zh: project.zh });
      expect(target.scope).toEqual({ window: 'projects', panel: 'collection' });
      expect(target.completion).toEqual({ window: `project:${project.id}`, panel: 'detail' });
    }
  });
  it('updates scroll, travel, click and window messages in the original language', () => {
    for (const locale of ['zh', 'en'] as const) {
      expect(guideProgress('below', false, false, 'FAST AI', locale).phase).toBe('scroll-cue');
      expect(guideProgress('visible', false, false, 'FAST AI', locale).phase).toBe('travel-to-target');
      expect(guideProgress('visible', true, false, 'FAST AI', locale).phase).toBe('waiting-for-click');
      expect(guideProgress('visible', true, true, 'FAST AI', locale).phase).toBe('waiting-for-window');
    }
    expect(guideProgress('above', false, false, 'FAST AI', 'zh').text).toContain('向上滚动');
    expect(guideProgress('below', false, false, 'FAST AI', 'en').text).toContain('Scroll down');
  });
});


it('explains minimizing as a prerequisite in both languages',()=>{
 expect(guideProgress('visible',true,false,'最小化联系','zh','window:minimize:contact').text).toContain('先收起');
 expect(guideProgress('visible',true,true,'Minimize Contact','en','window:minimize:contact').text).toContain('minimize');
});
