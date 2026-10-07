import catalog from '../../../../content/guide-catalog.json';
import { folders, labels, type Language, type WindowState } from '../../model';

export type GuideView = { windows: WindowState[] };
export type GuideStep = { target: string; kind: 'path' | 'recovery' };
export type GuideResult = { done: true; message: string } | { done: false; step: GuideStep };

/** A fixed destination, a remaining route, and a replaceable recovery stack.
 * No clicks, scrolls, DOM mutation or server calls happen in this module.
 */
export class LocalGuide {
  private destination = '';
  private locale: Language = 'en';
  private route: string[] = [];
  private recovery: GuideStep[] = [];

  start(destination: string, locale: Language) {
    if (!catalog.some(p => p.id === destination) && !folders.some(id => `folder:${id}` === destination)) return false;
    this.destination = destination;
    this.locale = locale;
    this.route = this.path();
    this.recovery = [];
    return true;
  }

  cancel() { this.destination = ''; this.route = []; this.recovery = []; }
  get active() { return !!this.destination; }
  snapshot() { return { destination: this.destination, route: [...this.route], recovery: [...this.recovery] }; }

  private path() {
    return this.destination.startsWith('folder:') ? [this.destination.slice(7)] : ['projects', `project:${this.destination}`];
  }

  update(view: GuideView): GuideResult | null {
    if (!this.active) return null;
    const visible = view.windows.filter(w => !w.minimized);
    const active = visible.at(-1)?.id;
    const path = this.path();
    const destination = path.at(-1)!;
    if (active === destination) {
      const project = catalog.find(p => p.id === this.destination);
      const folder = folders.find(id => id === destination);
      const message = project
        ? `${this.locale === 'zh' ? '已到达项目详情。' : 'You have reached the project details. '}${project.title} — ${project.description[this.locale]}`
        : `${this.locale === 'zh' ? '已打开你要看的内容：' : 'The requested content is open: '}${folder ? labels[folder][this.locale] : destination}。`;
      this.cancel();
      return { done: true, message };
    }
    // State is authoritative: skip prerequisites already reached, and restore
    // them if the visitor closes a window or takes another route.
    this.route = active === 'projects' && path.length > 1 ? [destination] : path;
    this.recovery = [];
    if (active === 'projects' && path.length > 1) {
      return { done: false, step: { kind: 'path', target: `project-card:${this.destination}` } };
    }
    if (active) {
      const usefulUnderneath = visible.slice(0, -1).some(w => path.includes(w.id));
      const target = usefulUnderneath || visible.length === 1 ? `window:minimize:${active}` : 'desktop:show';
      this.recovery = [{ kind: 'recovery', target }];
      return { done: false, step: this.recovery[0] };
    }
    return { done: false, step: { kind: 'path', target: `folder:${path[0]}` } };
  }
}
