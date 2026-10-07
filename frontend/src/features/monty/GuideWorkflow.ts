import catalog from '../../../../content/guide-catalog.json';
import type { Language } from '../../model';
import type { TargetDefinition, VisibilityDirection } from './TargetRegistry';

/** The catalog order is the curated recommendation order, independent of DOM/ID order. */
export function projectGuideTarget(id: string, names: TargetDefinition['names']): TargetDefinition {
  if (!catalog.some(project => project.id === id)) throw new Error(`Missing Monty guide catalog entry: ${id}`);
  return { id: `project-card:${id}`, names, scope: { window: 'projects', panel: 'collection' },
    capabilities: ['highlight', 'guideTo'], projectId: id, completion: { window: `project:${id}`, panel: 'detail' } };
}

export type GuidePhase = 'scroll-cue' | 'travel-to-target' | 'waiting-for-click' | 'waiting-for-window' | 'unavailable';
export type GuideProgress = { phase: GuidePhase; text: string; direction: VisibilityDirection };

/** Layout stays local. This module produces presentation only, never page actions. */
export function guideProgress(direction: VisibilityDirection, arrived: boolean, waiting: boolean, name: string, locale: Language, targetId = ''): GuideProgress {
  const zh = locale === 'zh';
  if (targetId.startsWith('window:minimize:')) {
    if (waiting) return { phase: 'waiting-for-window', direction, text: zh ? '正在等待窗口收起，再继续带你过去…' : 'Waiting for the window to minimize, then we’ll continue…' };
    return { phase: arrived ? 'waiting-for-click' : 'travel-to-target', direction, text: zh ? `请点击「${name}」，先收起这个窗口，再继续前往目标。` : `Click “${name}” to put this window away, then we’ll continue to your destination.` };
  }
  if (waiting) return { phase: 'waiting-for-window', direction, text: zh ? '正在等待内容打开…' : 'Waiting for the content to open…' };
  if (direction === 'visible') return arrived
    ? { phase: 'waiting-for-click', direction, text: zh ? `找到了「${name}」，请点击继续。` : `Found ${name}. Click it to continue.` }
    : { phase: 'travel-to-target', direction, text: zh ? `正在指向「${name}」…` : `Moving to ${name}…` };
  if (direction === 'unavailable') return { phase: 'unavailable', direction, text: zh ? '请先打开对应内容后再继续。' : 'Please open the relevant content to continue.' };
  const words = { above: ['上', 'up'], below: ['下', 'down'], left: ['左', 'left'], right: ['右', 'right'] }[direction];
  return { phase: 'scroll-cue', direction, text: zh ? `请向${words[0]}滚动，找到「${name}」后我会指给你看。` : `Scroll ${words[1]} to find ${name}. I’ll point to it when it appears.` };
}
