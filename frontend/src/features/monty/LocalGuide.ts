import catalog from '../../../../content/guide-catalog.json';
import { folders, labels, type Language, type WindowState } from '../../model';

const profileSections = {
  experience: { en: 'Work experience', zh: '工作经历' },
  education: { en: 'Education', zh: '教育背景' },
  skills: { en: 'Toolkit', zh: '技能' },
  research: { en: 'Research & projects', zh: '研究与项目' },
};
export type GuideView = { windows: WindowState[]; profileSection?: string };
export type GuideStep = { target: string; kind: 'path' | 'recovery' };
export type GuideResult = { done: true; message: string; highlights?: string[] } | { done: false; step: GuideStep };

/** A fixed destination, a remaining route, and a replaceable recovery stack.
 * No clicks, scrolls, DOM mutation or server calls happen in this module.
 */
export class LocalGuide {
  private destination = '';
  private locale: Language = 'en';
  private route: string[] = [];
  private recovery: GuideStep[] = [];

  start(destination: string, locale: Language) {
    if (!['tour:intro', 'tour:ai'].includes(destination) && !catalog.some(p => p.id === destination) && !folders.some(id => `folder:${id}` === destination)
      && !Object.keys(profileSections).some(id => `profile-section:${id}` === destination)) return false;
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
    if (this.destination === 'tour:intro') return ['readme'];
    if (this.destination === 'tour:ai') return ['projects'];
    if (this.destination.startsWith('profile-section:')) return ['profile'];
    return this.destination.startsWith('folder:') ? [this.destination.slice(7)] : ['projects', `project:${this.destination}`];
  }

  update(view: GuideView): GuideResult | null {
    if (!this.active) return null;
    const visible = view.windows.filter(w => !w.minimized);
    const active = visible.at(-1)?.id;
    const path = this.path();
    const destination = path.at(-1)!;
    const section = this.destination.startsWith('profile-section:') ? this.destination.slice(16) as keyof typeof profileSections : null;
    const requiredPanel = section ?? 'profile';
    if (active === 'profile' && destination === 'profile' && (view.profileSection ?? 'profile') !== requiredPanel) {
      const target = (view.profileSection ?? 'profile') === 'profile' ? `profile-section:${section}` : 'profile:back';
      this.route = section ? [`profile-section:${section}`] : ['profile:overview'];
      this.recovery = target === 'profile:back' ? [{ kind: 'recovery', target }] : [];
      return { done: false, step: this.recovery[0] ?? { kind: 'path', target } };
    }
    if (active === destination) {
      const project = catalog.find(p => p.id === this.destination);
      const folder = folders.find(id => id === destination);
      const highlights = this.destination === 'tour:intro' ? ['monty:terminal'] : this.destination === 'tour:ai' ? catalog.filter(p => p.topics.includes('ai')).map(p => `project-card:${p.id}`) : [];
      const message = this.destination === 'tour:intro'
        ? (this.locale === 'zh' ? '我是 Monty，你的桌面向导。README 介绍了这台电脑；在下方 Ask Monty 输入问题，我可以介绍项目、回答问题或带你浏览。' : 'I’m Monty, your desktop guide. README explains this computer. Ask me about projects or request a tour in the highlighted Ask Monty terminal below.')
        : this.destination === 'tour:ai'
        ? (this.locale === 'zh' ? '这些高亮项目都涉及 AI。可以滚动浏览，点击你感兴趣的项目查看详情。' : 'The highlighted projects all involve AI. Scroll to explore, then click any project that interests you.')
        : this.destination === 'folder:doom'
        ? (this.locale === 'zh' ? 'DOOM.exe 已打开，按照游戏中的提示开始玩吧！' : 'DOOM.exe is open. Follow the game’s controls and have fun!')
        : project
        ? `${this.locale === 'zh' ? '已到达项目详情。' : 'You have reached the project details. '}${project.title} — ${project.description[this.locale]}`
        : `${this.locale === 'zh' ? '已打开你要看的内容：' : 'The requested content is open: '}${section ? profileSections[section][this.locale] : folder ? labels[folder][this.locale] : destination}${this.locale === 'zh' ? '。' : '.'}`;
      this.cancel();
      return { done: true, message, highlights };
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
