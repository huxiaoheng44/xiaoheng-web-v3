import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Language, WindowId, ProjectId } from '../../model';
import { projectIds, folders } from '../../model';
import { useDesktop, findTarget, visibleTarget } from './DesktopContext';
import { GhostTransport } from './transport';
import { BehaviorTracker } from './behavior';
import { isNavigation, parseGhostAction, type GhostAction, type AgentEvent, type Source } from './GhostChat';

export type GhostCue={target?:string;gesture?:string;text?:string;until:number};
export function cue(value:Partial<GhostCue>){window.dispatchEvent(new CustomEvent('ghost-cue',{detail:{...value,until:performance.now()+6000}}));}
const settle=(signal:AbortSignal)=>new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);signal.aborted?reject(new DOMException('Stopped','AbortError')):resolve();},80);const abort=()=>{clearTimeout(timer);reject(new DOMException('Stopped','AbortError'));};signal.addEventListener('abort',abort,{once:true});});
type Line={id:string;role:'user'|'ghost';text:string;sources:Source[]};
type Approval=Extract<AgentEvent,{type:'approval'}>;
function useController(language:Language){
  const desktop=useDesktop();const desk=useRef(desktop);desk.current=desktop;
  const transport=useRef(new GhostTransport());const task=useRef<AbortController|null>(null);const run=useRef('');const tracker=useRef<BehaviorTracker|null>(null);const agentScroll=useRef(false);const navigationStarted=useRef(false);
  const [lines,setLines]=useState<Line[]>([]);const [status,setStatus]=useState('');const [busy,setBusy]=useState(false);const [approval,setApproval]=useState<Approval|null>(null);const [open,setOpen]=useState(false);const [companion,setCompanion]=useState(false);const [quiet,setQuiet]=useState(false);
  const options=useRef({companion,quiet});options.current={companion,quiet};const generation=useRef(0);const completed=useRef(new Set<string>());const trace=useRef<unknown[]>([]);
  const patchLine=(id:string,update:(line:Line)=>Line)=>setLines(prev=>prev.map(line=>line.id===id?update(line):line));
  const stop=()=>{generation.current++;navigationStarted.current=false;task.current?.abort();task.current=null;if(run.current)void transport.current.cancel(run.current);run.current='';setBusy(false);setApproval(null);cue({});document.querySelectorAll('.agent-highlight').forEach(e=>e.classList.remove('agent-highlight'));};
  useEffect(()=>{const onInput=(e:Event)=>{if((e.target as Element)?.closest?.('[data-agent-ui]'))return;if(e.type==='scroll'&&agentScroll.current)return;desk.current.touch();if(task.current)stop();};document.addEventListener('pointerdown',onInput,true);document.addEventListener('wheel',onInput,{passive:true,capture:true});document.addEventListener('scroll',onInput,true);const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);return()=>{document.removeEventListener('pointerdown',onInput,true);document.removeEventListener('wheel',onInput,true);document.removeEventListener('scroll',onInput,true);document.removeEventListener('visibilitychange',hide);task.current?.abort();void transport.current.clear();};},[]);
  useEffect(()=>{if(!companion){tracker.current=null;return;}const instance=new BehaviorTracker();tracker.current=instance;return instance.attach();},[companion]);

  async function execute(raw:GhostAction,version:number,authorized:boolean,signal:AbortSignal){
    const action=parseGhostAction(raw);if(!action||!('target'in action))throw new Error('Rejected unknown action');
    if(signal.aborted)throw new DOMException('Stopped','AbortError');
    if(version!==desk.current.snapshot().contextVersion)throw new Error('Page changed; refresh context');
    if(isNavigation(action)&&!authorized)throw new Error('Navigation needs approval');
    if(isNavigation(action)){desk.current.beginNavigation(!navigationStarted.current);navigationStarted.current=true;}
    if(action.type==='openWindow')desk.current.open(action.target as WindowId,true);
    else if(action.type==='openProject')desk.current.open(`project:${action.target as ProjectId}`,true);
    else if(action.type==='selectAboutTab')desk.current.selectTab(action.target,true);
    else if(action.type==='playGesture')cue({gesture:action.value});
    else if(action.type==='showHint')cue({text:action.value});
    else {
      const el=findTarget(action.target);if(!el||!el.isConnected)throw new Error('Target not found');
      if(action.type==='scrollToSection'){
        const scroller=el.closest<HTMLElement>('.content-scroll');if(!scroller||!el.closest('.desktop-window.active'))throw new Error('Target window is not active');
        agentScroll.current=true;
        try{const rect=scroller.getBoundingClientRect();const scale=rect.height/scroller.offsetHeight||1;scroller.scrollTop+=(el.getBoundingClientRect().top-rect.top)/scale-12;desk.current.touch(true);await settle(signal);}finally{agentScroll.current=false;}
      }else if(!visibleTarget(el))throw new Error('Target is not visible');
      if(action.type==='highlightTarget'){el.classList.add('agent-highlight');const timer=setTimeout(()=>el.classList.remove('agent-highlight'),4500);signal.addEventListener('abort',()=>{clearTimeout(timer);el.classList.remove('agent-highlight');},{once:true});}
      else if(action.type==='moveGhost')cue({target:action.target,gesture:'point'});
    }
    await settle(signal);
  }

  async function consume(path:string,body:unknown,lineId:string,controller:AbortController,current:number){
    let nextPath=path,nextBody=body;
    while(!controller.signal.aborted&&current===generation.current){
      let pending:Extract<AgentEvent,{type:'action'}>|null=null;let failed=false;
      for await(const item of transport.current.stream(nextPath,nextBody,controller.signal)){
        if(current!==generation.current||controller.signal.aborted)return;
        if(item.type==='run')run.current=item.runId;
        if(item.type==='delta')patchLine(lineId,l=>({...l,text:l.text+item.text}));
        if(item.type==='status'){setStatus(item.text);cue({gesture:'think'});}
        if(item.type==='source')patchLine(lineId,l=>({...l,sources:[...l.sources.filter(s=>s.id!==item.source.id),item.source]}));
        if(item.type==='approval'){setApproval(item);cue({text:item.summary.slice(0,150),gesture:'look'});}
        if(item.type==='action')pending=item;
        if(item.type==='error'){failed=true;setStatus(item.message);patchLine(lineId,l=>({...l,text:l.text+'\n'+item.message}));}
        if(item.type==='done'&&!item.waiting){run.current='';task.current=null;setApproval(null);setBusy(false);if(!failed)setStatus('');cue({gesture:'idle'});}
      }
      if(!pending)return;
      const actionKey=run.current+':'+pending.actionId;
      if(completed.current.has(actionKey))throw new Error('Duplicate action rejected');
      completed.current.add(actionKey);
      let result='success',detail='';
      try{await execute(pending.action,pending.contextVersion,pending.navigationAuthorized,controller.signal);}catch(e){result='failed';detail=e instanceof Error?e.message:'Action failed';}
      trace.current=[...trace.current.slice(-19),{action:pending.action,status:result,detail}];
      if(controller.signal.aborted)return;
      nextPath=`/runs/${encodeURIComponent(run.current)}/resume`;
      nextBody={requestId:crypto.randomUUID(),actionId:pending.actionId,status:result,detail,pageContext:desk.current.snapshot()};
    }
  }
  async function start(message:string,observe=false){
    if(!observe)stop();else if(task.current)return;
    const current=generation.current;const controller=new AbortController();task.current=controller;setBusy(true);if(!observe)setOpen(true);
    const id=crypto.randomUUID();setLines(prev=>[...prev.slice(-40),...(!observe?[{id:crypto.randomUUID(),role:'user' as const,text:message,sources:[]}]:[]),{id,role:'ghost',text:'',sources:[]}]);
    try{await consume(observe?'/observe':'/chat',{requestId:crypto.randomUUID(),message,pageContext:desk.current.snapshot(),...options.current,behavior:options.current.companion?tracker.current?.snapshot():undefined},id,controller,current);}catch(e){if(!controller.signal.aborted){const text=e instanceof Error?e.message:'Connection failed';setStatus(text);patchLine(id,l=>({...l,text:l.text+'\n'+text}));stop();}}
  }
  async function answerApproval(approved:boolean){
    if(!approval||!task.current||!run.current)return;const id=lines.at(-1)!.id;const pending=approval;setApproval(null);
    try{await consume(`/runs/${encodeURIComponent(run.current)}/resume`,{requestId:crypto.randomUUID(),actionId:pending.actionId,approved,pageContext:desk.current.snapshot()},id,task.current,generation.current);}catch(e){setStatus(e instanceof Error?e.message:'Resume failed');stop();}
  }
  const startRef=useRef(start);startRef.current=start;
  useEffect(()=>{let evaluated=0;const timer=setInterval(()=>{const t=tracker.current;if(!t)return;t.tick(desk.current.snapshot());if(document.hidden||options.current.quiet||task.current||document.querySelector('.monitor-screen[data-booting="true"]'))return;if(document.activeElement?.matches('input,textarea,[contenteditable="true"]')||[...document.querySelectorAll('video')].some(v=>!v.paused&&!v.ended))return;if(performance.now()-evaluated<30000)return;const reason=t.consumeReason();if(reason){evaluated=performance.now();void startRef.current(reason,true);}},1000);return()=>clearInterval(timer);},[]);
  async function sourceClick(source:Source){
    stop();const controller=new AbortController();task.current=controller;const target=source.target;
    try{
      desk.current.beginNavigation(true);navigationStarted.current=true;
      if(target.startsWith('project:')){const project=target.split(':')[1];if(!projectIds.includes(project as ProjectId))return;desk.current.open(`project:${project as ProjectId}`,true);}
      else if(target.startsWith('about:')){desk.current.selectTab(target.split(':')[1],true);}
      else if(target.startsWith('folder:')){const id=target.split(':')[1];if(!folders.includes(id as typeof folders[number]))return;desk.current.open(id as WindowId,true);}
      await settle(controller.signal);
      const el=findTarget(target);
      if(el){if(target.includes(':section-'))await execute({type:'scrollToSection',target,value:''},desk.current.snapshot().contextVersion,true,controller.signal);await execute({type:'highlightTarget',target,value:''},desk.current.snapshot().contextVersion,true,controller.signal);}
    }catch(e){if(!controller.signal.aborted)setStatus(e instanceof Error?e.message:'Source unavailable');}finally{if(task.current===controller)task.current=null;navigationStarted.current=false;}
  }
  return {lines,status,busy,approval,open,setOpen,companion,quiet,start,stop,answerApproval,sourceClick,
    debug:()=>({behavior:tracker.current?.snapshot()??null,context:desk.current.snapshot(),runId:run.current,approval,actions:trace.current}),
    setCompanion:(value:boolean)=>{stop();setCompanion(value);},setQuiet:(value:boolean)=>{stop();setQuiet(value);window.dispatchEvent(new CustomEvent('ghost-quiet',{detail:value}));},
    undo:()=>{stop();if(!desk.current.undo())setStatus(language==='zh'?'没有可撤销的导航':'No navigation to undo');},
    clear:async()=>{stop();setLines([]);setStatus('');await transport.current.clear();if(options.current.companion){setCompanion(false);}},
  };
}
const Context=createContext<ReturnType<typeof useController>|null>(null);
export function AgentProvider({language,children}:{language:Language;children:ReactNode}){const value=useController(language);return <Context.Provider value={value}>{children}</Context.Provider>;}
export function useAgent(){const ctx=useContext(Context);if(!ctx)throw new Error('Missing AgentProvider');return ctx;}
