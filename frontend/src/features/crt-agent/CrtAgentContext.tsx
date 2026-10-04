import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Language } from '../../model';
import { useDesktop } from './DesktopContext';
import { CrtAgentTransport } from './transport';
import { BehaviorTracker } from './behavior';
import { detectMessageLocale, validatePresentationForContext, type AgentEvent, type Source } from './CrtAgentChat';
import { decideProactive, type ProactiveSession } from './proactivePolicy';
import { idleTransition, interactionTransition, responseTransition, type SemanticState } from './agentState';
import { activitySummary } from './activity';

export type CrtAgentCue={target?:string;gesture?:string;text?:string;state?:string;until:number;persistent?:boolean};
/** A persistent cue stays visible until the client cancels or replaces it. */
export function cue(value:Partial<CrtAgentCue>){window.dispatchEvent(new CustomEvent('crt-agent-cue',{detail:{...value,until:value.persistent?Number.POSITIVE_INFINITY:Object.keys(value).length?performance.now()+6000:0}}));}
type Line={id:string;role:'user'|'ghost';text:string;sources:Source[]};
function useController(language:Language){
  const desktop=useDesktop();const desk=useRef(desktop);desk.current=desktop;
  const transport=useRef(new CrtAgentTransport());const task=useRef<AbortController|null>(null);const run=useRef('');const tracker=useRef<BehaviorTracker|null>(null);const semanticState=useRef<SemanticState>('idle');const proactive=useRef<ProactiveSession>({startedAt:performance.now(),lastMessageAt:null,proactiveCount:0,unanswered:0,lightInviteUsed:false});
  const [lines,setLines]=useState<Line[]>([]);const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);const [open,setOpen]=useState(false);const [dnd,setDnd]=useState(false);const [state,setState]=useState<SemanticState>('idle');const [scanning,setScanning]=useState(false);const [tools,setTools]=useState<Array<'searchKnowledge'|'readKnowledge'|'present'>>([]);const [activityLocale,setActivityLocale]=useState<Language>(language);
  const options=useRef({dnd});options.current={dnd};const generation=useRef(0);const trace=useRef<Array<{kind:string;instruction?:string;reason?:string}>>([]);const guide=useRef<{targetId:string;startedAt:number;awaiting?:boolean}|null>(null);const guideWait=useRef<AbortController|null>(null);
  const patchLine=(id:string,update:(line:Line)=>Line)=>setLines(prev=>prev.map(line=>line.id===id?update(line):line));
  const setSemanticState=(next:SemanticState,visual=true)=>{semanticState.current=next;setState(next);if(visual)cue({state:next,gesture:next==='thinking'?'think':next==='guiding'?'point':'idle'});};
  const transitionInteraction=(kind:'message'|'interaction')=>{const [first,second]=interactionTransition(semanticState.current,kind);setSemanticState(first);if(second)setTimeout(()=>setSemanticState(second),180);};
  const stop=()=>{generation.current++;task.current?.abort();task.current=null;guideWait.current?.abort();guideWait.current=null;guide.current=null;if(run.current)void transport.current.cancel(run.current);run.current='';setBusy(false);setScanning(false);semanticState.current='idle';setState('idle');cue({});document.querySelectorAll('.agent-highlight').forEach(e=>e.classList.remove('agent-highlight'));};
  useEffect(()=>{const wakeFromRest=()=>{if(semanticState.current==='sleeping')transitionInteraction('interaction');};const onInput=(e:Event)=>{if((e.target as Element)?.closest?.('[data-agent-ui]'))return;desk.current.touch();const active=guide.current;if(e.type==='pointerdown'&&active){const id=(e.target as Element)?.closest<HTMLElement>('[data-agent-id]')?.dataset.agentId;if(id===active.targetId){const completion=desk.current.targetRegistry.completion(id);if(!completion){stop();return;}guide.current={...active,awaiting:true};const waiting=new AbortController();guideWait.current=waiting;void desk.current.targetRegistry.waitForReady({activeWindow:completion.window,activePanel:completion.panel||''},waiting.signal).then(()=>{if(waiting.signal.aborted||guide.current?.targetId!==id)return;guide.current=null;guideWait.current=null;void startRef.current(`The visitor completed guide target ${id}. Propose only the next available guide step, or explain and finish.`,false,true);}).catch(()=>undefined);return;}stop();return;}if(task.current)stop();};const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&semanticState.current==='guiding'){e.preventDefault();stop();}};document.addEventListener('pointermove',wakeFromRest,{passive:true});document.addEventListener('pointerdown',wakeFromRest,{passive:true});document.addEventListener('keydown',wakeFromRest);document.addEventListener('pointerdown',onInput,true);document.addEventListener('wheel',onInput,{passive:true,capture:true});document.addEventListener('scroll',onInput,true);document.addEventListener('keydown',onKey,true);const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('pointermove',wakeFromRest);document.removeEventListener('pointerdown',wakeFromRest);document.removeEventListener('keydown',wakeFromRest);document.removeEventListener('pointerdown',onInput,true);document.removeEventListener('wheel',onInput,true);document.removeEventListener('scroll',onInput,true);document.removeEventListener('keydown',onKey,true);document.removeEventListener('visibilitychange',hide);task.current?.abort();void transport.current.clear();};},[]);
  // The tracker is session-local and always records only registered semantic targets.
  useEffect(()=>{const instance=new BehaviorTracker(()=>desk.current.snapshot());tracker.current=instance;return instance.attach();},[]);

  function record(kind:string,instruction?:string,reason?:string){trace.current=[...trace.current.slice(-19),{kind,instruction,reason}];}
  function applyPresentation(raw:unknown,lineId:string,signal:AbortSignal){
    const context=desk.current.snapshot();const validated=validatePresentationForContext(raw,context.targets);
    const instruction=validated.instruction;
    if(!instruction){record('ignored-instruction',undefined,validated.reason);return;}
    if(instruction.type==='highlight'||instruction.type==='guideTo'){
      const resolved=desk.current.targetRegistry.resolve(instruction.target,instruction.type,context);
      const element=resolved.element;
      if(!element){record('ignored-instruction',instruction.type,resolved.reason);return;}
      if(instruction.type==='highlight'){element.classList.add('agent-highlight');const timer=setTimeout(()=>element.classList.remove('agent-highlight'),4500);signal.addEventListener('abort',()=>{clearTimeout(timer);element.classList.remove('agent-highlight');},{once:true});}
      else {guide.current={targetId:instruction.target,startedAt:performance.now()};setSemanticState('guiding');cue({target:instruction.target,state:'guiding',persistent:true});}
    } else if(instruction.type==='speak'||instruction.type==='showRecommendation'){setSemanticState('speaking');patchLine(lineId,l=>({...l,text:l.text+(l.text?'\n':'')+instruction.value}));}
    else if(instruction.type==='showHint') cue({text:instruction.value});
    else setSemanticState(instruction.value as SemanticState);
    record('presentation',instruction.type);
  }

  async function consume(path:string,body:unknown,lineId:string,controller:AbortController,current:number,guideStep=false){
    let nextPath=path,nextBody=body;
    while(!controller.signal.aborted&&current===generation.current){
      let failed=false;
      for await(const item of transport.current.stream(nextPath,nextBody,controller.signal)){
        if(current!==generation.current||controller.signal.aborted)return;
        if(item.type==='run')run.current=item.runId;
        if(item.type==='delta'){setScanning(false);setSemanticState('speaking');patchLine(lineId,l=>({...l,text:l.text+item.text}));}
        if(item.type==='status'){setScanning(false);setStatus(item.text);setSemanticState('thinking');}
        if(item.type==='source')patchLine(lineId,l=>({...l,sources:[...l.sources.filter(s=>s.id!==item.source.id),item.source]}));
        if(item.type==='activity'){setTools(previous=>[...previous.slice(-7),item.name]);setScanning(item.name==='searchKnowledge'||item.name==='readKnowledge');}
        if(item.type==='presentation')applyPresentation(item.instruction,lineId,controller.signal);
        if(item.type==='error'){failed=true;record('stream-error');const safe=language==='zh'?'CRT.AGENT 暂时不可用。':'CRT.AGENT is temporarily unavailable.';setStatus(safe);patchLine(lineId,l=>({...l,text:l.text+'\n'+safe}));}
        if(item.type==='done'&&!item.waiting){run.current='';task.current=null;setBusy(false);setScanning(false);if(!failed)setStatus('');if(guideStep&&!guide.current)stop();else if(semanticState.current!=='guiding')setSemanticState('idle',false);}
      }
      return;
    }
  }
  async function start(message:string,observe=false,guideStep=false){
    if(!observe&&!guideStep)stop();else if(observe&&task.current)return;
    const behavior=tracker.current?.snapshot({locale:language,dnd:options.current.dnd,proactiveCount:proactive.current.proactiveCount});
    let outgoing=message;
    if(observe){
      if(!behavior)return;
      const decision=decideProactive(behavior,desk.current.snapshot().targets,proactive.current,performance.now());
      if(decision.kind==='silent')return;
      outgoing=decision.message;proactive.current={...proactive.current,proactiveCount:proactive.current.proactiveCount+1,unanswered:proactive.current.unanswered+1,lastMessageAt:performance.now(),lightInviteUsed:proactive.current.lightInviteUsed||decision.kind==='invite'};
    }else { proactive.current={...proactive.current,unanswered:0};setActivityLocale(detectMessageLocale(message)||language);transitionInteraction('message'); }
    const current=generation.current;const controller=new AbortController();task.current=controller;setBusy(true);if(!observe)setOpen(true);
    const id=crypto.randomUUID();setLines(prev=>[...prev.slice(-40),...(!observe?[{id:crypto.randomUUID(),role:'user' as const,text:message,sources:[]}]:[]),{id,role:'ghost',text:'',sources:[]}]);
    try{await consume(observe?'/observe':'/chat',{requestId:crypto.randomUUID(),message:outgoing,messageLocale:observe?undefined:detectMessageLocale(outgoing),pageContext:desk.current.snapshot(),dnd:options.current.dnd,guideStep,behavior},id,controller,current,guideStep);}catch{if(!controller.signal.aborted){record('stream-failure');const safe=language==='zh'?'CRT.AGENT 暂时不可用。':'CRT.AGENT is temporarily unavailable.';setStatus(safe);patchLine(id,l=>({...l,text:l.text+'\n'+safe}));stop();}}
  }
  const startRef=useRef(start);startRef.current=start;
  useEffect(()=>{const timer=setInterval(()=>{const t=tracker.current;if(!t)return;const context=desk.current.snapshot();t.tick(context);if(guide.current&&performance.now()-guide.current.startedAt>45000){stop();return;}const behavior=t.snapshot({locale:language,dnd:options.current.dnd,proactiveCount:proactive.current.proactiveCount});const next=idleTransition(semanticState.current,behavior.idleSeconds);if(next!==semanticState.current)setSemanticState(next);const meaningful=t.consumeMeaningfulInteraction(),pageActivity=t.consumePageActivity();if(semanticState.current==='sleeping'&&meaningful)transitionInteraction('interaction');else if(semanticState.current==='dozing'&&pageActivity)transitionInteraction('interaction');if(document.hidden||options.current.dnd||task.current||guide.current||document.querySelector('.monitor-screen[data-booting="true"]'))return;if(document.activeElement?.matches('input,textarea,[contenteditable="true"]')||[...document.querySelectorAll('video')].some(v=>!v.paused&&!v.ended))return;void startRef.current('',true);},1000);return()=>clearInterval(timer);},[language]);
  const behavior=tracker.current?.snapshot({locale:activityLocale,dnd,proactiveCount:proactive.current.proactiveCount});
  const activity=activitySummary(state,behavior,desk.current.snapshot().targets,tools,lines.flatMap(line=>line.sources));
  return {lines,status,busy,open,setOpen,dnd,start,stop,state,scanning,activity,activityLocale,
    debug:()=>({behavior:tracker.current?.snapshot({locale:language,dnd,proactiveCount:proactive.current.proactiveCount})??null,context:desk.current.snapshot(),runId:run.current,activitySafeTrace:trace.current}),
    setDnd:(value:boolean)=>{setDnd(value);window.dispatchEvent(new CustomEvent('crt-agent-dnd',{detail:value}));},
    clear:async()=>{stop();setLines([]);setStatus('');await transport.current.clear();},
  };
}
const Context=createContext<ReturnType<typeof useController>|null>(null);
export function AgentProvider({language,children}:{language:Language;children:ReactNode}){const value=useController(language);return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useAgent(){const ctx=useContext(Context);if(!ctx)throw new Error('Missing AgentProvider');return ctx;}
