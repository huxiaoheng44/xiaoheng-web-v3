import type { Language } from '../../model';
export type PresentationType = 'speak' | 'setState' | 'highlight' | 'guideTo' | 'showHint' | 'showRecommendation';
export type PresentationState = 'idle' | 'observing' | 'thinking' | 'speaking' | 'guiding' | 'dozing' | 'sleeping' | 'waking';
export type PresentationInstruction = { type: PresentationType; target: string; targets?: string[]; value: string };
export type Target = { id: string; available: boolean; visible?: boolean; guideable?: boolean; capabilities: Array<'highlight'|'guideTo'>; names: { en: string; zh: string }; projectId?: string; parentId?: string; tag?: string };
export type PageContext = { language: Language; contextVersion: number; activeWindow: string | null; activePanel: string; windows: string[]; profileSection: string; targets: Target[] };
export type BehaviorEvent = { type:'click'|'hover'|'dwell'|'visit'|'visibility'; target:string; projectId?:string; tag?:string; duration:number };
export type Behavior = { route:string; window:string|null; activePanel:string; locale:Language; dnd:boolean; proactiveCount:number; events:BehaviorEvent[]; idleSeconds:number };
export type Source = { id:string; title:string; target:string; source:string; version:string; sourceType?:'portfolio'|'github-source'; repository?:string; branch?:string; path?:string; url?:string };
export type TokenUsage = {limit:number;used:number;remaining:number;reserved:number;estimated:boolean};
export type AgentEvent = {type:'guidePlan';destination:string} | {type:'projectChoices';ids:string[];message:string} | {type:'usage';usage:TokenUsage} | {type:'run';runId:string} | {type:'delta';text:string} | {type:'status';text:string} | {type:'source';source:Source} | {type:'activity';kind:'tool';name:'searchKnowledge'|'readKnowledge'|'present'} | {type:'presentation';instruction:PresentationInstruction} | {type:'done';waiting:boolean;cancelled?:boolean} | {type:'error';message:string;code?:string};
export function detectMessageLocale(message:string):Language|undefined { if(/[\u3400-\u9fff]/.test(message))return 'zh'; if(/[A-Za-z]/.test(message))return 'en'; return undefined; }
export function parsePresentationInstruction(value:unknown): PresentationInstruction | null {
  if (!value || typeof value!=='object') return null;
  const a=value as Record<string,unknown>;
  if(typeof a.type!=='string'||typeof a.target!=='string'||typeof a.value!=='string'||a.value.length>200||a.target.length>160||!/^[a-zA-Z0-9:_-]*$/.test(a.target))return null;
  if(!['speak','setState','highlight','guideTo','showHint','showRecommendation'].includes(a.type))return null;
  if(a.targets!==undefined&&(!Array.isArray(a.targets)||a.targets.length>20||a.targets.some(id=>typeof id!=='string'||!id||id.length>160||!/^[a-zA-Z0-9:_-]+$/.test(id))))return null;
  const list=a.targets as string[]|undefined;
  if(list?.length&&(a.type!=='highlight'||a.target||new Set(list).size!==list.length))return null;
  if(['highlight','guideTo'].includes(a.type)&&!a.target&&!list?.length)return null;
  if(!['highlight','guideTo'].includes(a.type)&&a.target)return null;
  if(['speak','showHint','showRecommendation'].includes(a.type)&&!a.value.trim())return null;
  if(a.type==='setState'&&!['idle','observing','thinking','speaking','guiding','dozing','sleeping','waking'].includes(a.value))return null;
  return a as PresentationInstruction;
}

export function validatePresentationForContext(value:unknown, targets:Target[]):{instruction:PresentationInstruction|null;reason?:'malformed-or-unknown'|'target-unavailable'} {
  const instruction=parsePresentationInstruction(value);
  if(!instruction)return {instruction:null,reason:'malformed-or-unknown'};
  if(instruction.type==='highlight'||instruction.type==='guideTo'){
    if(instruction.targets?.length){
      const selected=instruction.targets.map(id=>targets.find(t=>t.id===id));
      const parent=selected[0]?.parentId;
      if(!parent||selected.some(t=>!t||t.parentId!==parent||!t.capabilities.includes('highlight')||!(t.guideable??t.available)))return {instruction:null,reason:'target-unavailable'};
      return {instruction};
    }
    const target=targets.find(candidate=>candidate.id===instruction.target);
    if(!target?.capabilities.includes(instruction.type)||(instruction.type==='highlight'?!(target.visible??target.available):!(target.guideable??target.available)))return {instruction:null,reason:'target-unavailable'};
  }
  return {instruction};
}
