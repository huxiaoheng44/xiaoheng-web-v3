import type { PageContext, Target } from './MontyChat';

export type TargetCapability = 'highlight' | 'guideTo';
export type TargetScope = { window?: string; panel?: string };
export type TargetNames = { en: string; zh: string };
export type TargetCompletion = { window: string; panel: string } | { minimizedWindow: string };
export type TargetDefinition = { id: string; names: TargetNames; scope: TargetScope; capabilities: TargetCapability[]; projectId?: string; tag?: string; parentId?: string; completion?: TargetCompletion };
export type VisibilityDirection = 'visible' | 'above' | 'below' | 'left' | 'right' | 'unavailable';
type TargetContext = Pick<PageContext, 'activeWindow' | 'activePanel'>;
type RegisteredTarget = TargetDefinition & { element: HTMLElement };

export function completionReached(completion: TargetCompletion, context: TargetContext) {
  return 'minimizedWindow' in completion
    ? context.activeWindow !== completion.minimizedWindow
    : context.activeWindow === completion.window && context.activePanel === completion.panel;
}

type Bounds = Pick<DOMRect, 'top' | 'bottom' | 'left' | 'right'>;
export function hasUsableVisibleArea(rect: Bounds, bounds: Bounds) {
  const width = rect.right - rect.left, height = rect.bottom - rect.top;
  return width > 0 && height > 0
    && Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left) >= Math.min(width / 2, 48)
    && Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top) >= Math.min(height / 2, 48);
}

export class TargetRegistry {
  private targets = new Map<string, RegisteredTarget>();
  private revision = 0;
  private listeners = new Set<() => void>();
  constructor(private readonly isVisible: (element: HTMLElement) => boolean) {}

  register(definition: TargetDefinition, element: HTMLElement) {
    this.targets.set(definition.id, { ...definition, element });
    this.publish();
    return () => {
      if (this.targets.get(definition.id)?.element === element) { this.targets.delete(definition.id); this.publish(); }
    };
  }

  getRevision() { return this.revision; }
  contextChanged() { this.publish(); }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  /** Resolves only after a locally registered, visible semantic condition becomes true. */
  waitFor(condition: () => boolean, signal?: AbortSignal) {
    if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
    if (condition()) return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const done = () => { unsubscribe(); signal?.removeEventListener('abort', aborted); resolve(); };
      const check = () => { if (condition()) done(); };
      const aborted = () => { unsubscribe(); reject(new DOMException('Aborted', 'AbortError')); };
      const unsubscribe = this.subscribe(check);
      signal?.addEventListener('abort', aborted, { once: true });
      check();
    });
  }

  ready(context: TargetContext) { return [...this.targets.values()].some(target => (target.scope.window ?? null) === context.activeWindow && (!target.scope.panel || target.scope.panel === context.activePanel) && target.element.isConnected && this.isVisible(target.element) && target.capabilities.includes('guideTo')); }
  waitForReady(context: TargetContext, signal?: AbortSignal) { return this.waitFor(() => this.ready(context), signal); }
  completion(id: string) { return this.targets.get(id)?.completion; }
  names(id: string) { return this.targets.get(id)?.names; }

  snapshot(context: TargetContext): Target[] {
    return [...this.targets.values()].sort((a, b) => a.id.localeCompare(b.id)).flatMap(target => {
      const inScope = this.matchesScope(target.scope, context) && target.element.isConnected;
      const guideable = inScope && target.capabilities.includes('guideTo');
      const visible = inScope && this.isVisible(target.element);
      return inScope ? [{
      id: target.id,
      available: visible,
      visible,
      guideable,
      capabilities: target.capabilities,
      names: target.names,
      ...(target.parentId ? { parentId: target.parentId } : {}),
      ...(target.projectId ? { projectId: target.projectId } : {}),
      ...(target.tag ? { tag: target.tag } : {}),
    }] : [];
    });
  }

  resolve(id: string, capability: TargetCapability, context: TargetContext) {
    const target = this.targets.get(id);
    if (!target || !target.capabilities.includes(capability)) return { element: null, reason: 'target-unregistered' as const };
    if (!this.matchesScope(target.scope, context) || !target.element.isConnected || (capability === 'highlight' && target.element.closest('[hidden]'))) return { element: null, reason: 'target-unavailable' as const };
    return { element: target.element };
  }

  /** Local-only viewport guidance. This never becomes part of the server snapshot. */
  direction(id: string, context: TargetContext): VisibilityDirection {
    const target = this.targets.get(id);
    if (!target || !this.matchesScope(target.scope, context) || !target.element.isConnected) return 'unavailable';
    const rect = target.element.getBoundingClientRect();
    if (this.isVisible(target.element)) return 'visible';
    const container = target.element.closest<HTMLElement>('.content-scroll')?.getBoundingClientRect();
    const bounds = { top: Math.max(0, container?.top ?? 0), bottom: Math.min(innerHeight, container?.bottom ?? innerHeight), left: Math.max(0, container?.left ?? 0), right: Math.min(innerWidth, container?.right ?? innerWidth) };
    if (rect.top < bounds.top) return 'above';
    if (rect.bottom > bounds.bottom) return 'below';
    if (rect.left < bounds.left) return 'left';
    if (rect.right > bounds.right) return 'right';
    return 'unavailable';
  }

  private matchesScope(scope: TargetScope, context: TargetContext) {
    return (!scope.window || scope.window === context.activeWindow) && (!scope.panel || scope.panel === context.activePanel);
  }
  private publish() { this.revision++; this.listeners.forEach(listener => listener()); }
}
