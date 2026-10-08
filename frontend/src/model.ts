export const folders = ['projects', 'readme', 'profile', 'contact', 'doom', 'monty-history'] as const;
export type FolderId = typeof folders[number];
export type Language = 'en' | 'zh';
export const labels: Record<FolderId, Record<Language, string>> = {
  projects: { en: 'Projects', zh: '项目' }, readme: { en: 'README', zh: 'README' },
  profile: { en: 'Profile', zh: '个人资料' }, contact: { en: 'Contact', zh: '联系' },
  doom: { en: 'DOOM', zh: '毁灭战士' }, 'monty-history': { en: 'Monty chat history', zh: 'Monty 聊天记录' },
};
/** Desktop file names shown on icons and window titles; `labels` stay the semantic names Monty matches against. */
export const fileLabels: Record<FolderId, Record<Language, string>> = {
  projects: { en: 'Projects', zh: '项目' }, readme: { en: 'README', zh: 'README' },
  profile: { en: 'Profile', zh: '个人资料' }, contact: { en: 'Contact', zh: '联系' },
  doom: { en: 'DOOM.exe', zh: 'DOOM.exe' }, 'monty-history': { en: 'monty.history', zh: 'monty.history' },
};
export const projectIds = ['pingpong-vision', 'web-harvest-rag', 'you-dont-need-rag', 'fast-ai-movie', 'vehicle-identification', '3d-reconstruction', 'drone-simulator'] as const;
export type ProjectId = typeof projectIds[number];
export type WindowId = FolderId | 'monty-history' | `project:${ProjectId}`;
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
