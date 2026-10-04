export const folders = ['projects', 'about', 'experience', 'contact', 'doom'] as const;
export type FolderId = typeof folders[number];
export type Language = 'en' | 'zh';
export const labels: Record<FolderId, Record<Language, string>> = {
  projects: { en: 'Projects', zh: '项目' }, about: { en: 'About', zh: '关于' },
  experience: { en: 'Experience', zh: '经历' }, contact: { en: 'Contact', zh: '联系' },
  doom: { en: 'DOOM', zh: '毁灭战士' },
};
/** Desktop file names shown on icons and window titles; `labels` stay the semantic names CRT.AGENT matches against. */
export const fileLabels: Record<FolderId, Record<Language, string>> = {
  projects: { en: 'Projects', zh: '项目' }, about: { en: 'README.txt', zh: 'README.txt' },
  experience: { en: 'Experience.exe', zh: '经历.exe' }, contact: { en: 'Contact', zh: '联系' },
  doom: { en: 'DOOM.exe', zh: 'DOOM.exe' },
};
export const projectIds = ['pingpong-vision', 'web-harvest-rag', 'you-dont-need-rag', 'fast-ai-movie', 'vehicle-identification', '3d-reconstruction', 'drone-simulator'] as const;
export type ProjectId = typeof projectIds[number];
export type WindowId = FolderId | `project:${ProjectId}`;
export type WindowState = { id: WindowId; minimized: boolean; maximized: boolean };
export type DesktopAction = { type: 'open' | 'close' | 'minimize' | 'maximize'; id: WindowId } | { type: 'showDesktop' };
export function desktopReducer(state: WindowState[], action: DesktopAction): WindowState[] {
  if (action.type === 'showDesktop') {
    const shouldMinimize = state.some(window => !window.minimized);
    return state.map(window => ({ ...window, minimized: shouldMinimize }));
  }
  const found = state.find(w => w.id === action.id);
  if (action.type === 'close') return state.filter(w => w.id !== action.id);
  if (action.type === 'open') return [...state.filter(w => w.id !== action.id), { id: action.id, minimized: false, maximized: found?.maximized ?? false }];
  return state.map(w => w.id !== action.id ? w : action.type === 'minimize' ? { ...w, minimized: true } : { ...w, maximized: !w.maximized });
}
