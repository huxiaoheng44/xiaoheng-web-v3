import catalog from '../../../../content/guide-catalog.json';
import type { Language } from '../../model';
import type { TargetDefinition, VisibilityDirection } from './TargetRegistry';

/** The catalog order is the curated recommendation order, independent of DOM/ID order. */
export function projectGuideTarget(id: string, names: TargetDefinition['names']): TargetDefinition {
  if (!catalog.some(project => project.id === id)) throw new Error(`Missing Monty guide catalog entry: ${id}`);
  return { id: `project-card:${id}`, names, scope: { window: 'projects', panel: 'collection' },
    parentId: 'projects:collection', capabilities: ['highlight', 'guideTo'], projectId: id, completion: { window: `project:${id}`, panel: 'detail' } };
}

export type GuidePhase = 'scroll-cue' | 'travel-to-target' | 'waiting-for-click' | 'waiting-for-window' | 'presenting' | 'unavailable';
export type GuideProgress = { phase: GuidePhase; text: string; direction: VisibilityDirection };
export type GuideCopy = { step?: number; introduction?: string; position?: string; finished?: boolean };

/** All directions come from local layout; this never operates the page. */
export function guideProgress(direction: VisibilityDirection, arrived: boolean, waiting: boolean, name: string, locale: Language, targetId = '', copy: GuideCopy = {}): GuideProgress {
  const zh = locale === 'zh';
  const prefix = copy.step ? (zh ? `第 ${copy.step} 步：` : `Step ${copy.step}: `) : '';
  const phase = waiting ? 'waiting-for-window' : arrived ? 'waiting-for-click' : 'travel-to-target';
  if (direction === 'unavailable') return { phase: 'unavailable', direction, text: zh ? '请返回刚才的窗口，继续导览。' : 'Return to the previous window to continue the tour.' };
  if (direction !== 'visible') {
    const words = { above: ['上', 'up'], below: ['下', 'down'], left: ['左', 'left'], right: ['右', 'right'] }[direction];
    return { phase: 'scroll-cue', direction, text: zh ? `请向${words[0]}滚动，继续查看「${name}」。` : `Scroll ${words[1]} to continue with ${name}.` };
  }
  if (copy.introduction) {
    const text = copy.finished
      ? (zh ? '介绍完了，点击任意高亮项即可继续浏览。' : 'That’s the overview. Click any highlighted item to explore it.')
      : arrived ? `${copy.position}. ${copy.introduction}`
      : (zh ? `接下来介绍「${name}」。` : `Next, let’s look at ${name}.`);
    return { phase: arrived ? 'presenting' : 'travel-to-target', direction, text };
  }
  let text = zh ? `${prefix}点击「${name}」继续。` : `${prefix}click ${name} to continue.`;
  if (targetId === 'desktop:show') text = zh ? `${prefix}点击「显示桌面」，先收起当前窗口。` : `${prefix}click “Show desktop” to put the open windows away.`;
  else if (targetId.startsWith('window:minimize:')) text = zh ? `${prefix}点击「${name}」，再继续前往目标。` : `${prefix}click “${name}” to continue to your destination.`;
  if (waiting) text = zh ? '正在打开，马上继续。' : 'Opening — we’ll continue in a moment.';
  return { phase, direction, text };
}
