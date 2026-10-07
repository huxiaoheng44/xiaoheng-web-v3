import catalog from '../../../../content/guide-catalog.json';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Language } from '../../model';
import { useDesktop } from './DesktopContext';
import { MontyTransport, MontyRequestError, requestFailureMessage } from './transport';
import { BehaviorTracker } from './behavior';
import { detectMessageLocale, validatePresentationForContext, type TokenUsage, type Source } from './MontyChat';
import { decideProactive, type ProactiveSession } from './proactivePolicy';
import { idleTransition, interactionTransition, responseTransition, type SemanticState } from './agentState';
import { activitySummary } from './activity';
import { completionReached } from './TargetRegistry';
import type { GuideProgress } from './GuideWorkflow';

export type MontyCue={target?:string;gesture?:string;text?:string;state?:string;until:number;persistent?:boolean;waiting?:boolean};
/** A persistent cue stays visible until the client cancels or replaces it. */
export function cue(value:Partial<MontyCue>){window.dispatchEvent(new CustomEvent('monty-cue',{detail:{...value,until:value.persistent?Number.POSITIVE_INFINITY:Object.keys(value).length?performance.now()+6000:0}}));}
type Line={id:string;role:'user'|'monty';text:string;sources:Source[];createdAt:number;activity:string[];steps:string[]};
function useController(language:Language){
  const desktop=useDesktop();const desk=useRef(desktop);desk.current=desktop;
  const transport=useRef(new MontyTransport());const task=useRef<AbortController|null>(null);const run=useRef('');const tracker=useRef<BehaviorTracker|null>(null);const semanticState=useRef<SemanticState>('idle');const proactive=useRef<ProactiveSession>({startedAt:performance.now(),lastMessageAt:null,proactiveCount:0,unanswered:0,lightInviteUsed:false});
  const activeLine=useRef('');
  const [projectChoices,setProjectChoices]=useState<string[]>([]);
  const [welcomeVisible,setWelcomeVisible]=useState(false);
  const [welcomeHost,setWelcomeHost]=useState<HTMLDivElement|null>(null);
  useEffect(()=>{if(welcomeVisible){proactive.current.lightInviteUsed=true;proactive.current.lastMessageAt=performance.now();}},[welcomeVisible]);
  const [usage,setUsage]=useState<TokenUsage|null>(null);
  const [lines,setLines]=useState<Line[]>([]);const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);const [open,setOpen]=useState(false);const [dnd,setDnd]=useState(false);const [state,setState]=useState<SemanticState>('idle');const [scanning,setScanning]=useState(false);const [tools,setTools]=useState<Array<'searchKnowledge'|'readKnowledge'|'present'>>([]);const [activityLocale,setActivityLocale]=useState<Language>(language);
  const options=useRef({dnd,welcomeVisible,choosing:false});options.current={dnd,welcomeVisible,choosing:projectChoices.length>0};const generation=useRef(0);const trace=useRef<Array<{kind:string;instruction?:string;reason?:string}>>([]);const guide=useRef<{targetId:string;startedAt:number;awaiting?:boolean}|null>(null);const guideWait=useRef<AbortController|null>(null);
  const [guideProgress,setGuideProgress]=useState<GuideProgress|null>(null);
  const guideLocale=useRef<Language>(language);
  useEffect(()=>{const update=(event:Event)=>{const progress=(event as CustomEvent<GuideProgress|null>).detail;setGuideProgress(progress);if(progress)setLines(prev=>prev.map(line=>line.id===activeLine.current&&line.steps.at(-1)!==progress.text?{...line,steps:[...line.steps,progress.text]}:line));};window.addEventListener('monty-guide-progress',update);return()=>window.removeEventListener('monty-guide-progress',update);},[]);
  const patchLine=(id:string,update:(line:Line)=>Line)=>setLines(prev=>prev.map(line=>line.id===id?update(line):line));
  const setSemanticState=(next:SemanticState,visual=true)=>{semanticState.current=next;setState(next);if(visual)cue({state:next,gesture:next==='thinking'?'think':next==='guiding'?'point':'idle'});};
  const transitionInteraction=(kind:'message'|'interaction')=>{const [first,second]=interactionTransition(semanticState.current,kind);setSemanticState(first);if(second)setTimeout(()=>setSemanticState(second),180);};
  const stop=()=>{setProjectChoices([]);generation.current++;task.current?.abort();task.current=null;guideWait.current?.abort();guideWait.current=null;guide.current=null;setGuideProgress(null);if(run.current)void transport.current.cancel(run.current);run.current='';setBusy(false);setScanning(false);semanticState.current='idle';setState('idle');cue({});document.querySelectorAll('.agent-highlight').forEach(e=>e.classList.remove('agent-highlight'));};
  useEffect(()=>{const wakeFromRest=()=>{if(semanticState.current==='sleeping')transitionInteraction('interaction');};const onInput=(e:Event)=>{if((e.target as Element)?.closest?.('[data-agent-ui]')&&!(e.type==='click'&&guide.current&&guide.current.targetId===(e.target as Element)?.closest<HTMLElement>('[data-agent-id]')?.dataset.agentId))return;desk.current.touch();const active=guide.current;if(e.type==='click'&&active){const id=(e.target as Element)?.closest<HTMLElement>('[data-agent-id]')?.dataset.agentId;if(id===active.targetId){const completion=desk.current.targetRegistry.completion(id);if(!completion){stop();return;}if(active.awaiting)return;guide.current={...active,awaiting:true};cue({target:id,state:'guiding',persistent:true,waiting:true});const waiting=new AbortController();guideWait.current=waiting;void desk.current.targetRegistry.waitFor(()=>{const context=desk.current.snapshot();return completionReached(completion,context)&&desk.current.targetRegistry.ready(context);},waiting.signal).then(()=>{if(waiting.signal.aborted||guide.current?.targetId!==id)return;guide.current=null;guideWait.current=null;void startRef.current(`The visitor completed guide target ${id}. Propose only the next available guide step, or explain and finish.`,false,true);}).catch(()=>undefined);return;}stop();return;}if(task.current&&!active)stop();};const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'&&semanticState.current==='guiding'){e.preventDefault();stop();}};document.addEventListener('pointermove',wakeFromRest,{passive:true});document.addEventListener('pointerdown',wakeFromRest,{passive:true});document.addEventListener('keydown',wakeFromRest);document.addEventListener('click',onInput,true);document.addEventListener('wheel',onInput,{passive:true,capture:true});document.addEventListener('keydown',onKey,true);const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('pointermove',wakeFromRest);document.removeEventListener('pointerdown',wakeFromRest);document.removeEventListener('keydown',wakeFromRest);document.removeEventListener('click',onInput,true);document.removeEventListener('wheel',onInput,true);document.removeEventListener('keydown',onKey,true);document.removeEventListener('visibilitychange',hide);task.current?.abort();void transport.current.clear();};},[]);
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
      for await(const item of transport.current.stream(nextPath,nextBody,controller.signal)){
        if(current!==generation.current||controller.signal.aborted)return;
        if(transport.current.usage)setUsage(transport.current.usage);
        if(item.type==='usage'){transport.current.usage=item.usage;setUsage(item.usage);}
        if(item.type==='run')run.current=item.runId;
        if(item.type==='projectChoices'){setProjectChoices(catalog.filter(entry=>Array.isArray(item.ids)&&item.ids.includes(entry.id)).map(entry=>entry.id));patchLine(lineId,l=>({...l,text:item.message}));}
        if(item.type==='delta'){setScanning(false);setSemanticState('speaking');patchLine(lineId,l=>({...l,text:l.text+item.text}));}
        if(item.type==='status'){setScanning(false);setStatus(item.text);setSemanticState('thinking');}
        if(item.type==='source')patchLine(lineId,l=>({...l,sources:[...l.sources.filter(s=>s.id!==item.source.id),item.source]}));
        if(item.type==='activity'){patchLine(lineId,line=>({...line,activity:[...line.activity,item.name]}));setTools(previous=>[...previous.slice(-7),item.name]);setScanning(item.name==='searchKnowledge'||item.name==='readKnowledge');}
        if(item.type==='presentation')applyPresentation(item.instruction,lineId,controller.signal);
        if(item.type==='error'){record('stream-error');throw new MontyRequestError(item.code||'request-failed');}
        if(item.type==='done'&&!item.waiting){run.current='';task.current=null;setBusy(false);setScanning(false);setStatus('');if(guideStep&&!guide.current)stop();else if(semanticState.current!=='guiding')setSemanticState('idle',false);}
      }
      return;
    }
  }
  async function start(message:string,observe=false,guideStep=false){
    if(!observe&&!guideStep){stop();guideLocale.current=detectMessageLocale(message)||language;}else if(observe&&task.current)return;
    const behavior=tracker.current?.snapshot({locale:language,dnd:options.current.dnd,proactiveCount:proactive.current.proactiveCount});
    let outgoing=message;
    if(observe){
      if(!behavior)return;
      const decision=decideProactive(behavior,desk.current.snapshot().targets,proactive.current,performance.now());
      if(decision.kind==='silent')return;
      outgoing=decision.message;proactive.current={...proactive.current,proactiveCount:proactive.current.proactiveCount+1,unanswered:proactive.current.unanswered+1,lastMessageAt:performance.now(),lightInviteUsed:proactive.current.lightInviteUsed||decision.kind==='invite'};
    }else { proactive.current={...proactive.current,unanswered:0};setActivityLocale(guideLocale.current);transitionInteraction('message'); }
    const current=generation.current;const controller=new AbortController();task.current=controller;setBusy(true);setStatus('');if(!observe)setOpen(true);
    const id=crypto.randomUUID();activeLine.current=id;setLines(prev=>[...prev,...(!observe&&!guideStep?[{id:crypto.randomUUID(),role:'user' as const,text:message,sources:[],createdAt:Date.now(),activity:[],steps:[]}]:[]),{id,role:'monty',text:'',sources:[],createdAt:Date.now(),activity:[],steps:[]}]);
    try{await consume(observe?'/observe':'/chat',{requestId:crypto.randomUUID(),message:outgoing,messageLocale:observe?undefined:guideLocale.current,pageContext:desk.current.snapshot(),dnd:options.current.dnd,guideStep,behavior},id,controller,current,guideStep);}catch(error){if(!controller.signal.aborted&&current===generation.current){record('stream-failure');stop();if(observe){setLines(prev=>prev.filter(line=>line.id!==id));setStatus('');}else{const safe=requestFailureMessage(error,guideLocale.current);setStatus(safe);patchLine(id,l=>({...l,text:l.text+(l.text?'\n':'')+safe}));}}}
  }
  const startRef=useRef(start);startRef.current=start;
  useEffect(()=>{const timer=setInterval(()=>{const t=tracker.current;if(!t)return;const context=desk.current.snapshot();t.tick(context);if(guide.current&&performance.now()-guide.current.startedAt>45000){stop();return;}const behavior=t.snapshot({locale:language,dnd:options.current.dnd,proactiveCount:proactive.current.proactiveCount});const next=idleTransition(semanticState.current,behavior.idleSeconds);if(next!==semanticState.current)setSemanticState(next);const meaningful=t.consumeMeaningfulInteraction(),pageActivity=t.consumePageActivity();if(semanticState.current==='sleeping'&&meaningful)transitionInteraction('interaction');else if(semanticState.current==='dozing'&&pageActivity)transitionInteraction('interaction');if(document.hidden||options.current.dnd||options.current.welcomeVisible||options.current.choosing||task.current||guide.current||document.querySelector('.monitor-screen[data-booting="true"]'))return;if(document.activeElement?.matches('input,textarea,[contenteditable="true"]')||[...document.querySelectorAll('video')].some(v=>!v.paused&&!v.ended))return;void startRef.current('',true);},1000);return()=>clearInterval(timer);},[language]);
  const behavior=tracker.current?.snapshot({locale:activityLocale,dnd,proactiveCount:proactive.current.proactiveCount});
  const activity=activitySummary(state,behavior,desk.current.snapshot().targets,tools,lines.flatMap(line=>line.sources));
  return {projectChoices,welcomeVisible,welcomeHost,setWelcomeHost,setWelcomeVisible,usage,refreshUsage:async()=>{const current=generation.current;try{const quota=await transport.current.quota();if(current===generation.current)setUsage(quota);}catch{/* The history remains readable while offline. */}},guideProgress,guideLocale:guideLocale.current,lines,status,busy,open,setOpen,dnd,start,stop,state,scanning,activity,activityLocale,
    debug:()=>({behavior:tracker.current?.snapshot({locale:language,dnd,proactiveCount:proactive.current.proactiveCount})??null,context:desk.current.snapshot(),runId:run.current,activitySafeTrace:trace.current}),
    setDnd:(value:boolean)=>{setDnd(value);window.dispatchEvent(new CustomEvent('monty-dnd',{detail:value}));},
    clear:async()=>{stop();activeLine.current='';setLines([]);setStatus('');setUsage(null);await transport.current.clear();},
  };
}
const Context=createContext<ReturnType<typeof useController>|null>(null);
export function AgentProvider({language,children}:{language:Language;children:ReactNode}){const value=useController(language);return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useAgent(){const ctx=useContext(Context);if(!ctx)throw new Error('Missing AgentProvider');return ctx;}
