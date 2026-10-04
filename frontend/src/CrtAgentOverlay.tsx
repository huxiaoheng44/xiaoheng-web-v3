import { useEffect, useRef, useState } from 'react';
import { CrtAgentSpeech } from './features/crt-agent/CrtAgentSpeech';
import { type Language } from './model';
import { useDesktop, visibleTarget } from './features/crt-agent/DesktopContext';
import { useAgent, type CrtAgentCue } from './features/crt-agent/CrtAgentContext';
import { CrtAgentSettings } from './features/crt-agent/CrtAgentSettings';
import type { SemanticState } from './features/crt-agent/agentState';
import { stateLabel, visualState } from './features/crt-agent/visualState';

type Mode = 'idle' | 'move' | 'look' | 'point';
type CrtAgentFrame = { x:number; y:number; w:number; h:number; duration_ms:number; offset:[number,number] };
type CrtAgentAtlas = { sheet:{ width:number; height:number }; frames:CrtAgentFrame[]; animations:Record<string,{ frames:number[]; fps:number; loop:boolean }> };

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
export function CrtAgentOverlay({ language, launchFromCenter = false }: { language: Language; launchFromCenter?: boolean }) {
  const agent = useAgent();
  const desktop = useDesktop();
  const desktopRef = useRef(desktop);
  desktopRef.current = desktop;
  const [chatOpen,setChatOpen]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const atlas = useRef<CrtAgentAtlas|null>(null);
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
  useEffect(() => { void fetch('/assets/crt-agent.json?v=crt-agent-v3').then(r => r.ok ? r.json() : Promise.reject()).then((value:CrtAgentAtlas) => { atlas.current = value; }).catch(() => undefined); }, []);
  useEffect(() => {
    const element = host.current!;
    const hint = bubble.current!;
    const homeFor = (size:number) => ({ x: innerWidth - size - (innerWidth<=700?34:64), y: innerHeight - size - (innerWidth<=700?48:74) });
    const initialSize=innerWidth <= 700 ? 62 : 100;
    let x = launchFromCenter ? (innerWidth-initialSize)/2 : homeFor(initialSize).x, y = launchFromCenter ? (innerHeight-initialSize)/2 : homeFor(initialSize).y;
    let lastActivity = performance.now(), lastTime = 0, frameId = 0, animationKey = '', animationStarted = 0;
    let previousHint = '';
    let command: CrtAgentCue = { until: 0 }, dnd = false;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onCue = (event: Event) => { command = (event as CustomEvent<CrtAgentCue>).detail; };
    const onDnd = (event: Event) => { dnd = (event as CustomEvent<boolean>).detail; };
    window.addEventListener('crt-agent-cue', onCue); window.addEventListener('crt-agent-dnd', onDnd);
    const onPointer = () => { lastActivity = performance.now(); };
    const onFocus = () => { lastActivity = performance.now(); };
    const onActivity = () => { lastActivity = performance.now(); if (command.target && command.persistent) window.dispatchEvent(new CustomEvent('crt-agent-guide-ended')); };
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
          anchor.classList.add('agent-highlight');
          guidingTarget = true;
          const rect = anchor.getBoundingClientRect(); tx = rect.right + 16; ty = rect.top - size;
          const drawer = document.querySelector('.crt-agent-drawer')?.getBoundingClientRect();
          if (drawer && tx < drawer.right && tx + size > drawer.left && ty + size > drawer.top) ty = drawer.top - size - 16;
          // The sprite travels first, then remains beside the target and points.
          mode = Math.hypot(tx - x, ty - y) > 8 ? 'move' : 'point';
          element.dataset.visibilityDirection = 'visible';
        } else if (command.target) {
          const direction=desktopRef.current.targetRegistry.direction(command.target,desktopRef.current.snapshot());
          element.dataset.visibilityDirection = direction;
          message = direction==='above' ? (language==='zh'?'目标在上方，请向上滚动。':'The target is above. Please scroll up.') : direction==='below' ? (language==='zh'?'目标在下方，请向下滚动。':'The target is below. Please scroll down.') : (language==='zh'?'请先打开对应内容后再继续。':'Please open the relevant content, then continue.');
        }
      } else element.dataset.gesture = '';
      element.dataset.agentState = command.until > performance.now() ? (command.state || stateRef.current) : stateRef.current;
      const guideInTransit = guidingTarget && Math.hypot(tx - x, ty - y) > 8;
      if (!guidingTarget && Math.hypot(tx - x, ty - y) > 8) mode = 'move';
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
      window.removeEventListener('crt-agent-cue', onCue); window.removeEventListener('crt-agent-dnd', onDnd);
      cancelAnimationFrame(frameId);
      document.removeEventListener('pointermove', onPointer); document.removeEventListener('pointerdown', onActivity);
      document.removeEventListener('keydown', onActivity); document.removeEventListener('focusin', onFocus); document.removeEventListener('focusout', onLeave);
      document.documentElement.removeEventListener('pointerleave', onLeave); document.removeEventListener('visibilitychange', visibility);
    };
  }, [language]);
  return <div className="crt-agent-overlay" ref={host} data-agent-ui data-visual-state={visual.marker} data-waking-effect={visual.wakingEffect}>
   <div className="crt-agent-bubble" ref={bubble} hidden aria-hidden="true"/><CrtAgentSpeech language={language} open={chatOpen}/>
   <span className="agent-badge" aria-hidden="true">CRT</span>
   <button className="crt-agent-avatar" aria-label={language==='zh'?'打开 CRT 机器人对话':'Open CRT agent chat'} aria-expanded={chatOpen} onClick={()=>{setChatOpen(value=>!value);setSettingsOpen(false);}}><span className="crt-agent-sprite"/></button><span className="crt-agent-caption">CRT.AGENT</span>
   {chatOpen&&<div className="agent-settings-control"><button className="activity-toggle" aria-label={language==='zh'?'打开 CRT.AGENT 设置':'Open CRT.AGENT settings'} aria-expanded={settingsOpen} onClick={()=>setSettingsOpen(value=>!value)}>⚙</button>{settingsOpen&&<CrtAgentSettings language={language}/>}</div>}
   <span className="sr-only" role="status">{stateLabel(agent.state,language)}</span>
  </div>;
}
