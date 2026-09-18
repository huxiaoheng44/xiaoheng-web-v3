import { folders, projectIds, type FolderId, type Language } from '../../model';
export const aboutTabs = ['profile','experience','education','skills','research'] as const;
export type GhostAction = { type: 'moveGhost' | 'highlightTarget' | 'scrollToSection' | 'openProject' | 'selectAboutTab' | 'openWindow' | 'playGesture' | 'showHint'; target: string; value: string };
export type Target = { id: string; label: string; visible: boolean; rect: number[]; excerpt: string };
export type PageContext = { language: Language; contextVersion: number; activeWindow: string | null; windows: string[]; aboutTab: string; targets: Target[] };
export type Behavior = { events: {type:'click'|'hover'|'visit'|'scroll'|'visibility';target:string;duration:number;value:number}[]; trajectory:{x:number;y:number;t:number}[]; idleSeconds:number };
export type Source = { id:string; title:string; target:string; source:string; version:string };
export type AgentEvent = {type:'run';runId:string} | {type:'delta';text:string} | {type:'status';text:string} | {type:'source';source:Source} | {type:'approval';actionId:string;summary:string;actions:GhostAction[]} | {type:'action';actionId:string;action:GhostAction;contextVersion:number;navigationAuthorized:boolean} | {type:'done';waiting:boolean;cancelled?:boolean} | {type:'error';message:string};
export const isNavigation = (a:GhostAction) => ['openWindow','openProject','selectAboutTab','scrollToSection'].includes(a.type);
export function parseGhostAction(value:unknown): GhostAction | {type:'openWindow'|'highlightFolder';folder:FolderId} | {type:'showHint';text:string} | null {
  if (!value || typeof value!=='object') return null;
  const a=value as Record<string,unknown>;
  // Keep legacy consumers valid while the network protocol uses target/value exclusively.
  if ((a.type==='openWindow'||a.type==='highlightFolder') && folders.includes(a.folder as FolderId)) return {type:a.type,folder:a.folder as FolderId};
  if (a.type==='showHint' && typeof a.text==='string' && a.text.trim() && a.text.length<=200) return {type:'showHint',text:a.text};
  if(typeof a.target!=='string'||typeof a.value!=='string'||a.value.length>200||a.target.length>160||!/^[a-zA-Z0-9:_-]*$/.test(a.target))return null;
  if(a.type==='openWindow'&&!folders.includes(a.target as FolderId))return null;
  if(a.type==='openProject'&&!projectIds.includes(a.target as typeof projectIds[number]))return null;
  if(a.type==='selectAboutTab'&&!aboutTabs.includes(a.target as typeof aboutTabs[number]))return null;
  if(a.type==='playGesture'&&!['idle','look','point','think','nod'].includes(a.value))return null;
  if(a.type==='showHint'&&!a.value.trim())return null;
  return ['moveGhost','highlightTarget','scrollToSection','openProject','selectAboutTab','openWindow','playGesture','showHint'].includes(String(a.type)) ? a as GhostAction : null;
}
