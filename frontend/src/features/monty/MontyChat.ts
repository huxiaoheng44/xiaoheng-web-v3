import type { Language } from '../../model';
import catalog from '../../../../content/guide-catalog.json';
import groups from '../../../../content/presentation-groups.json';
export type PresentationItem = { target: string; introduction: string };
export type PresentationTask = { items: PresentationItem[] };
const presentationGroups = [...groups, {parentId:'projects:collection', destination:'folder:projects', targets:catalog.map(p=>`project-card:${p.id}`)}];
export function presentationDestination(target:string) { return presentationGroups.find(group=>group.targets.includes(target))?.destination; }
export type Target = { id: string; available: boolean; visible?: boolean; guideable?: boolean; capabilities: Array<'highlight'|'guideTo'>; names: { en: string; zh: string }; projectId?: string; parentId?: string; tag?: string };
export type PageContext = { language: Language; contextVersion: number; activeWindow: string | null; activePanel: string; windows: string[]; profileSection: string; targets: Target[] };
export type BehaviorEvent = { type:'click'|'hover'|'dwell'|'visit'|'visibility'; target:string; projectId?:string; tag?:string; duration:number };
export type Behavior = { route:string; window:string|null; activePanel:string; locale:Language; dnd:boolean; proactiveCount:number; events:BehaviorEvent[]; idleSeconds:number };
export type Source = { id:string; title:string; target:string; source:string; version:string; sourceType?:'portfolio'|'github-source'; repository?:string; branch?:string; path?:string; url?:string };
export type TokenUsage = {limit:number;used:number;remaining:number;reserved:number;estimated:boolean};
export type AgentEvent = {type:'guidePlan';destination:string} | {type:'projectChoices';ids:string[];message:string} | {type:'usage';usage:TokenUsage} | {type:'run';runId:string} | {type:'delta';text:string} | {type:'status';text:string} | {type:'source';source:Source} | {type:'activity';kind:'tool';name:'searchKnowledge'|'present'} | {type:'presentation';task:PresentationTask} | {type:'done';waiting:boolean;cancelled?:boolean} | {type:'error';message:string;code?:string};
export function detectMessageLocale(message:string):Language|undefined { if(/[\u3400-\u9fff]/.test(message))return 'zh'; if(/[A-Za-z]/.test(message))return 'en'; return undefined; }
export function parsePresentationTask(value:unknown): PresentationTask | null {
  if (!value || typeof value!=='object' || Array.isArray(value)) return null;
  const task=value as Record<string,unknown>;
  if(Object.keys(task).some(key=>key!=='items')||!Array.isArray(task.items)||!task.items.length||task.items.length>20)return null;
  const items:PresentationItem[]=[];
  for(const value of task.items){
    if(!value||typeof value!=='object'||Array.isArray(value))return null;
    const item=value as Record<string,unknown>;
    if(Object.keys(item).some(key=>key!=='target'&&key!=='introduction')||typeof item.target!=='string'||!/^[a-zA-Z0-9:_-]{1,160}$/.test(item.target)||typeof item.introduction!=='string'||!item.introduction.trim()||[...item.introduction].length>200)return null;
    items.push({target:item.target,introduction:item.introduction.trim()});
  }
  return new Set(items.map(item=>item.target)).size===items.length?{items}:null;
}

export function validatePresentationForContext(value:unknown, targets:Target[]):{task:PresentationTask|null;reason?:string} {
  const task=parsePresentationTask(value);
  if(!task)return {task:null,reason:'malformed-or-unknown'};
  const parents:Array<string|undefined>=[];
  for(const item of task.items){
    const group=presentationGroups.find(group=>group.targets.includes(item.target));
    if(group){parents.push(group.parentId);continue;}
    const target=targets.find(target=>target.id===item.target);
    if(!target?.capabilities.includes('highlight')||!(target.guideable||target.available))return {task:null,reason:'target-unavailable'};
    parents.push(target.parentId);
  }
  if(parents.length>1&&(!parents[0]||parents.some(parent=>parent!==parents[0])))return {task:null,reason:'targets-not-siblings'};
  return {task};
}
