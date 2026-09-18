export const folders = ['projects', 'about', 'experience', 'contact'] as const;
export type FolderId = typeof folders[number];
export type Language = 'en' | 'zh';
export const labels: Record<FolderId, Record<Language, string>> = {
  projects: { en: 'Projects', zh: '项目' }, about: { en: 'About', zh: '关于' },
  experience: { en: 'Experience', zh: '经历' }, contact: { en: 'Contact', zh: '联系' },
};
export const projectIds = ['3d-reconstruction', 'drone-simulator', 'fast-ai-movie', 'vehicle-identification'] as const;
export type ProjectId = typeof projectIds[number];
export type WindowId = FolderId | `project:${ProjectId}`;
export type WindowState = { id: WindowId; minimized: boolean; maximized: boolean };
export type DesktopAction = { type: 'open' | 'close' | 'minimize' | 'maximize'; id: WindowId };
export function desktopReducer(state: WindowState[], action: DesktopAction): WindowState[] {
  const found = state.find(w => w.id === action.id);
  if (action.type === 'close') return state.filter(w => w.id !== action.id);
  if (action.type === 'open') return [...state.filter(w => w.id !== action.id), { id: action.id, minimized: false, maximized: found?.maximized ?? false }];
  return state.map(w => w.id !== action.id ? w : action.type === 'minimize' ? { ...w, minimized: true } : { ...w, maximized: !w.maximized });
}
