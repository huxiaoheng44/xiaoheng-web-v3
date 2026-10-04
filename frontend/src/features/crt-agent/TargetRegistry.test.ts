import { describe, expect, it } from 'vitest';
import { TargetRegistry } from './TargetRegistry';

const element = { isConnected: true } as HTMLElement;
const projectContext = { activeWindow: 'project:drone-simulator', activePanel: 'detail' };

describe('semantic target registry', () => {
  it('exposes only declared localized semantic metadata for compatible targets', () => {
    const registry = new TargetRegistry(() => true);
    registry.register({ id: 'project:drone-simulator', names: { en: 'Drone Simulator', zh: '无人机仿真与控制' }, projectId: 'drone-simulator', scope: { window: 'project:drone-simulator', panel: 'detail' }, capabilities: ['highlight', 'guideTo'] }, element);
    registry.register({ id: 'project:drone-simulator:tag:px4-0', names: { en: 'PX4', zh: 'PX4' }, projectId: 'drone-simulator', tag: 'PX4', scope: { window: 'project:drone-simulator', panel: 'detail' }, capabilities: ['highlight', 'guideTo'] }, element);
    registry.register({ id: 'about:skills', names: { en: 'Toolkit', zh: '技能' }, scope: { window: 'about', panel: 'skills' }, capabilities: ['highlight'] }, element);

    expect(registry.snapshot(projectContext)).toEqual([
      { id: 'project:drone-simulator', available: true, visible: true, guideable: true, capabilities: ['highlight', 'guideTo'], names: { en: 'Drone Simulator', zh: '无人机仿真与控制' }, projectId: 'drone-simulator' },
      { id: 'project:drone-simulator:tag:px4-0', available: true, visible: true, guideable: true, capabilities: ['highlight', 'guideTo'], names: { en: 'PX4', zh: 'PX4' }, projectId: 'drone-simulator', tag: 'PX4' },
    ]);
    expect(JSON.stringify(registry.snapshot(projectContext))).not.toMatch(/rect|clientX|clientY|trajectory|textContent|selector|path/);
    expect(registry.resolve('project:drone-simulator', 'guideTo', projectContext).element).toBe(element);
    expect(registry.resolve('about:skills', 'highlight', projectContext)).toEqual({ element: null, reason: 'target-unavailable' });
    expect(registry.resolve('project:drone-simulator', 'highlight', { activeWindow: 'projects', activePanel: 'collection' })).toEqual({ element: null, reason: 'target-unavailable' });
  });

  it('unregisters dynamic detail targets and rejects unsupported capabilities', () => {
    const registry = new TargetRegistry(() => true);
    const unregister = registry.register({ id: 'project:drone-simulator:section-0', names: { en: 'Project section', zh: '项目分区' }, projectId: 'drone-simulator', scope: { window: 'project:drone-simulator', panel: 'detail' }, capabilities: ['highlight'] }, element);
    expect(registry.resolve('project:drone-simulator:section-0', 'guideTo', projectContext)).toEqual({ element: null, reason: 'target-unregistered' });
    unregister();
    expect(registry.snapshot(projectContext)).toEqual([]);
    expect(registry.resolve('project:drone-simulator:section-0', 'highlight', projectContext)).toEqual({ element: null, reason: 'target-unregistered' });
  });
});
