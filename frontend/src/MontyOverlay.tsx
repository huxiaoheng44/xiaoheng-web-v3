import { useEffect, useRef, useState } from 'react';
import { MontySpeech } from './features/monty/MontySpeech';
import { type Language } from './model';
import { useDesktop, visibleTarget } from './features/monty/DesktopContext';
import { useAgent, type MontyCue } from './features/monty/MontyContext';
import { MontySettings } from './features/monty/MontySettings';
import type { SemanticState } from './features/monty/agentState';
import { guideProgress } from './features/monty/GuideWorkflow';
import { stateLabel, visualState } from './features/monty/visualState';

type Mode = 'idle' | 'move' | 'look' | 'point';
type MontyFrame = { x:number; y:number; w:number; h:number; duration_ms:number; offset:[number,number] };
type MontyAtlas = { sheet:{ width:number; height:number }; frames:MontyFrame[]; animations:Record<string,{ frames:number[]; fps:number; loop:boolean }> };

export function animationName(mode:Mode, facingLeft:boolean, speaking:boolean, scanning:boolean, state:SemanticState) {
  if (speaking) return 'speaking';
  if (scanning) return 'scan';
  if (state === 'dozing') return 'dozing';
  if (state === 'sleeping') return 'sleep';
  if (mode === 'move') return 'travel';
  if (mode === 'look') return 'idle';
  if (mode === 'point') return facingLeft ? 'guide-left' : 'guide-right';
  return 'idle';
}
function modeForState(state:SemanticState):Mode { return state==='guiding'?'point':state==='observing'||state==='thinking'||state==='waking'?'look':'idle'; }
export function MontyOverlay({ language, launchFromCenter = false }: { language: Language; launchFromCenter?: boolean }) {
  const agent = useAgent();
  const desktop = useDesktop();
  const guideLocale = useRef(agent.guideLocale);guideLocale.current=agent.guideLocale;
  const desktopRef = useRef(desktop);
  desktopRef.current = desktop;
  const [chatOpen,setChatOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const atlas = useRef<MontyAtlas|null>(null);
  const speakingRef = useRef(agent.busy);
  speakingRef.current = agent.busy;
  const scanningRef = useRef(agent.scanning);
  scanningRef.current = agent.scanning;
  const stateRef=useRef(agent.state);stateRef.current=agent.state;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visual=visualState(agent.state,reduced);
  const settings = useRef({ dnd: agent.dnd });
  settings.current = { dnd: agent.dnd };
  const host = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  useEffect(() => { void fetch('/assets/monty.json?v=monty-v3').then(r => r.ok ? r.json() : Promise.reject()).then((value:MontyAtlas) => { atlas.current = value; }).catch(() => undefined); }, []);
  useEffect(() => {
    const element = host.current!;
    const hint = bubble.current!;
    const homeFor = (size:number) => ({ x: innerWidth - size - (innerWidth<=700?34:64), y: innerHeight - size - (innerWidth<=700?48:74) });
    const initialSize=innerWidth <= 700 ? 62 : 100;
    let x = launchFromCenter ? (innerWidth-initialSize)/2 : homeFor(initialSize).x, y = launchFromCenter ? (innerHeight-initialSize)/2 : homeFor(initialSize).y;
    let lastActivity = performance.now(), lastTime = 0, frameId = 0, animationKey = '', animationStarted = 0;
    let previousHint = '';
    let previousProgress = '';
    let highlighted:HTMLElement|null = null;
    let command: MontyCue = { until: 0 }, dnd = false;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onCue = (event: Event) => { command = (event as CustomEvent<MontyCue>).detail; };
    const onDnd = (event: Event) => { dnd = (event as CustomEvent<boolean>).detail; };
    window.addEventListener('monty-cue', onCue); window.addEventListener('monty-dnd', onDnd);
    const onPointer = () => { lastActivity = performance.now(); };
    const onFocus = () => { lastActivity = performance.now(); };
    const onActivity = () => { lastActivity = performance.now(); if (command.target && command.persistent) window.dispatchEvent(new CustomEvent('monty-guide-ended')); };
    const onLeave = () => undefined;
    const setHint = (text: string) => { if (previousHint !== text) { hint.textContent = text; hint.hidden = !text; previousHint = text; } };
    const tick = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000 || .016, .05); lastTime = time;
      const mobile = innerWidth <= 700;
      const size = mobile ? 62 : 100;
      const home = homeFor(size);
      let tx = home.x, ty = home.y, mode: Mode = modeForState(stateRef.current), message = '';
      if(!reduced){tx += Math.sin(time / 5400) * 8; ty += Math.sin(time / 1800) * 5;}
      const maxX = Math.max(10, innerWidth - size - 15), maxY = Math.max(10, innerHeight - size - 24);
      if (dnd || settings.current.dnd) message = '';
      let guidingTarget = false;
      if (command.until > performance.now()) {
        if (command.text) message = command.text;
        element.dataset.gesture = command.gesture || '';
        const anchor = command.target ? desktopRef.current.targetRegistry.resolve(command.target,'guideTo',desktopRef.current.snapshot()).element : null;
        if (anchor && visibleTarget(anchor)) {

          guidingTarget = true;
          const rect = anchor.getBoundingClientRect(); tx = rect.right + 16; ty = rect.top - size;
          if(tx>maxX)tx=rect.left-size-16;
          tx=Math.max(10,Math.min(tx,maxX));ty=Math.max(55,Math.min(ty,maxY));
          const drawer = document.querySelector('.monty-drawer')?.getBoundingClientRect();
          if (drawer && tx < drawer.right && tx + size > drawer.left && ty + size > drawer.top) ty = drawer.top - size - 16;
          // The sprite travels first, then remains beside the target and points.
          mode = Math.hypot(tx - x, ty - y) > 8 ? 'move' : 'point';
          element.dataset.visibilityDirection = 'visible';
          if(highlighted&&highlighted!==anchor)highlighted.classList.remove('agent-highlight');
          highlighted=anchor;anchor.classList.toggle('agent-highlight',mode==='point'&&!command.waiting);
        } else if (command.target) {
          const direction=desktopRef.current.targetRegistry.direction(command.target,desktopRef.current.snapshot());
          element.dataset.visibilityDirection = direction;
          if(highlighted){highlighted.classList.remove('agent-highlight');highlighted=null;}
          const bounds=anchor?.closest('.content-scroll')?.getBoundingClientRect();
          if(bounds){tx=Math.min(maxX,bounds.right+12);ty=Math.max(55,Math.min(maxY,(bounds.top+bounds.bottom-size)/2));}
          if(!reduced&&(direction==='above'||direction==='below'))ty+=Math.sin(time/280)*10;
          mode='look';
        }
        if(command.target){
          const direction=desktopRef.current.targetRegistry.direction(command.target,desktopRef.current.snapshot());
          const name=desktopRef.current.targetRegistry.names(command.target)?.[guideLocale.current]??command.target;
          const progress=guideProgress(direction,mode==='point',!!command.waiting,name,guideLocale.current,command.target);
          element.dataset.guidePhase=progress.phase;
          const serialized=JSON.stringify(progress);
          if(serialized!==previousProgress){previousProgress=serialized;window.dispatchEvent(new CustomEvent('monty-guide-progress',{detail:progress}));}
        }
      } else {
        element.dataset.gesture = '';delete element.dataset.visibilityDirection;delete element.dataset.guidePhase;
        if(highlighted){highlighted.classList.remove('agent-highlight');highlighted=null;}
        if(previousProgress){previousProgress='';window.dispatchEvent(new CustomEvent('monty-guide-progress',{detail:null}));}
      }
      element.dataset.agentState = command.until > performance.now() ? (command.state || stateRef.current) : stateRef.current;

      if (!command.target && !guidingTarget && Math.hypot(tx - x, ty - y) > 8) mode = 'move';
      tx = Math.max(10, Math.min(tx, maxX)); ty = Math.max(55, Math.min(ty, maxY));
      x += (tx - x) * (reduced?1:Math.min(1, dt * 2.4));
      y += (ty - y) * (reduced?1:Math.min(1, dt * 2.4));
      x = Math.max(10, Math.min(x, maxX)); y = Math.max(10, Math.min(y, maxY));
      element.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
      const currentAtlas = atlas.current;
      const key=animationName(mode, tx < x, speakingRef.current, scanningRef.current, stateRef.current);if(key!==animationKey){animationKey=key;animationStarted=time;}
      const animation = currentAtlas?.animations[key];
      const sequence = animation?.frames ?? [0];
      const elapsedFrame=Math.floor((time-animationStarted) / (1000 / (animation?.fps ?? 6)));const frameIndex=animation?.loop?elapsedFrame%sequence.length:Math.min(elapsedFrame,sequence.length-1);
      const sprite = currentAtlas?.frames[sequence[frameIndex] ?? 0];
      if (sprite && currentAtlas) {
        element.style.setProperty('--frame-x', `${sprite.x * 100 / (currentAtlas.sheet.width - sprite.w)}%`);
        element.style.setProperty('--frame-y', `${sprite.y * 100 / (currentAtlas.sheet.height - sprite.h)}%`);
        element.style.setProperty('--sprite-offset-x', `${sprite.offset[0]}px`);
        element.style.setProperty('--sprite-offset-y', `${sprite.offset[1]}px`);
      }
      element.dataset.mode = mode;
      element.dataset.reduced = String(reduced);
      element.classList.remove('face-right');
      element.classList.toggle('bubble-right', x < 200);
      element.classList.toggle('speech-below', y < innerHeight / 2);
      setHint(message);
      frameId = requestAnimationFrame(tick);
    };
    const visibility = () => { cancelAnimationFrame(frameId); if (!document.hidden) { lastTime = 0; frameId = requestAnimationFrame(tick); } };
    document.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerdown', onActivity, { passive: true });
    document.addEventListener('keydown', onActivity);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onLeave);
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', visibility);
    frameId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('monty-cue', onCue); window.removeEventListener('monty-dnd', onDnd);
      cancelAnimationFrame(frameId);
      highlighted?.classList.remove('agent-highlight');
      document.removeEventListener('pointermove', onPointer); document.removeEventListener('pointerdown', onActivity);
      document.removeEventListener('keydown', onActivity); document.removeEventListener('focusin', onFocus); document.removeEventListener('focusout', onLeave);
      document.documentElement.removeEventListener('pointerleave', onLeave); document.removeEventListener('visibilitychange', visibility);
    };
  }, [language]);
  return <div className="monty-overlay" ref={host} data-agent-ui data-visual-state={visual.marker} data-waking-effect={visual.wakingEffect}>
   <div ref={agent.setWelcomeHost}/><div className="monty-bubble" ref={bubble} hidden aria-hidden="true"/>{!agent.welcomeVisible&&(desktop.active!=='monty-history'||agent.guideProgress)&&<MontySpeech language={language} open={chatOpen}/>}
      <button className="monty-avatar" aria-label={language==='zh'?'和 Monty 聊天':'Chat with Monty'} aria-expanded={chatOpen} onClick={()=>{setChatOpen(value=>!value);setSettingsOpen(false);}}><span className="monty-sprite"/></button><span className="monty-scroll-arrow" aria-hidden="true"/><span className="monty-caption">monty.exe</span>
   {chatOpen&&<div className="agent-settings-control"><button className="activity-toggle" aria-label={language==='zh'?'打开 Monty 设置':'Open Monty settings'} aria-expanded={settingsOpen} onClick={()=>setSettingsOpen(value=>!value)}>⚙</button><button className="activity-toggle history-toggle" aria-label={language==='zh'?'打开聊天记录':'Open chat history'} title={language==='zh'?'聊天记录':'Chat history'} onClick={()=>{desktop.open('monty-history');setSettingsOpen(false);}}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 4h13v14a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-1h11v1a3 3 0 0 0 6 0M6 4a3 3 0 0 0-3 3v2h3V4Zm0 0v13M9 8h7M9 11h7M9 14h5"/></svg></button>{settingsOpen&&<MontySettings language={language}/>}</div>}
   <span className="sr-only" role="status">{stateLabel(agent.state,language)}</span>
  </div>;
}
