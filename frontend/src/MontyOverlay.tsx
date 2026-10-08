import { useEffect, useRef, useState } from 'react';
import { MontySpeech } from './features/monty/MontySpeech';
import { type Language } from './model';
import { useDesktop, visibleTarget } from './features/monty/DesktopContext';
import { useAgent, type MontyCue } from './features/monty/MontyContext';
import { MontySettings } from './features/monty/MontySettings';
import type { SemanticState } from './features/monty/agentState';
import { guideProgress } from './features/monty/GuideWorkflow';
import { stateLabel, visualState } from './features/monty/visualState';
import { applyMontyFrame, loadMontyAtlas, type MontyAtlas } from './features/monty/montyAtlas';

type Mode = 'idle' | 'move' | 'look' | 'point';

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
type Spot = () => DOMRect | null;
/** `launchFrom`: the on-screen Monty it takes over from at boot. `parkAt`: where to fly back to at shutdown. */
export function MontyOverlay({ language, launchFrom, parkAt }: { language: Language; launchFrom?: Spot; parkAt?: Spot }) {
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
  const parkRef = useRef(parkAt); parkRef.current = parkAt;
  useEffect(() => { void loadMontyAtlas().then(value => { atlas.current = value; }); }, []);
  useEffect(() => { if (parkAt) { setChatOpen(false); setSettingsOpen(false); } }, [parkAt]);
  useEffect(() => {
    const element = host.current!;
    const hint = bubble.current!;
    const REST_KEY = 'monty-position';
    const loadRest = (): { fx:number; fy:number } | null => { try { const value = JSON.parse(localStorage.getItem(REST_KEY) ?? 'null'); return value && Number.isFinite(value.fx) && Number.isFinite(value.fy) ? value : null; } catch { return null; } };
    let rest = loadRest();
    const clampX = (value:number, size:number) => Math.max(10, Math.min(value, innerWidth - size - 15));
    const clampY = (value:number, size:number) => Math.max(10, Math.min(value, innerHeight - size - 24));
    const homeFor = (size:number) => rest
      ? { x: clampX(rest.fx * (innerWidth - size), size), y: clampY(rest.fy * (innerHeight - size), size) }
      : { x: innerWidth - size - (innerWidth<=700?34:64), y: innerHeight - size - (innerWidth<=700?48:74) };
    const initialSize=innerWidth <= 700 ? 62 : 100;
    const launch = launchFrom?.();
    let x = launch ? launch.left + launch.width/2 - initialSize/2 : homeFor(initialSize).x, y = launch ? launch.top + launch.height/2 - initialSize/2 : homeFor(initialSize).y;
    // The sprite starts at the size of the Monty it replaces and settles to its own size on the way home.
    const avatarScale = (scale:number) => element.style.setProperty('--power-scale', String(Math.round(scale * 1000) / 1000));
    let launchSettle = 0;
    if (launch) { avatarScale(launch.width / initialSize); launchSettle = requestAnimationFrame(() => { launchSettle = requestAnimationFrame(() => avatarScale(1)); }); }
    let lastActivity = performance.now(), lastTime = 0, frameId = 0, animationKey = '', animationStarted = 0;
    let previousHint = '';
    let previousProgress = '';
    const highlighted=new Set<HTMLElement>();
    let command: MontyCue = { until: 0 }, dnd = false;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const onCue = (event: Event) => { command = (event as CustomEvent<MontyCue>).detail; };
    const onDnd = (event: Event) => { dnd = (event as CustomEvent<boolean>).detail; };
    window.addEventListener('monty-cue', onCue); window.addEventListener('monty-dnd', onDnd);
    const onPointer = () => { lastActivity = performance.now(); };
    const onFocus = () => { lastActivity = performance.now(); };
    const onActivity = () => { lastActivity = performance.now(); };
    const onLeave = () => undefined;
    // Dragging: press and move > 5px. The drop point becomes Monty's new home (also after a guide ends).
    const avatar = element.querySelector<HTMLElement>('.monty-avatar')!;
    let drag: { id:number; dx:number; dy:number; startX:number; startY:number; moved:boolean } | null = null;
    let dragX = 0, dragY = 0, suppressClick = false;
    const onDragStart = (event: PointerEvent) => {
      if (event.button !== 0) return;
      drag = { id: event.pointerId, dx: event.clientX - x, dy: event.clientY - y, startX: event.clientX, startY: event.clientY, moved: false };
      avatar.setPointerCapture(event.pointerId);
    };
    const onDragMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) { drag.moved = true; element.classList.add('is-dragging'); }
      if (drag.moved) { dragX = event.clientX - drag.dx; dragY = event.clientY - drag.dy; }
    };
    const onDragEnd = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      if (drag.moved) {
        const size = innerWidth <= 700 ? 62 : 100;
        rest = { fx: x / Math.max(1, innerWidth - size), fy: y / Math.max(1, innerHeight - size) };
        try { localStorage.setItem(REST_KEY, JSON.stringify(rest)); } catch { /* storage unavailable: keep it for this visit */ }
        suppressClick = true; element.classList.remove('is-dragging');
      }
      drag = null; lastActivity = performance.now();
    };
    const onAvatarClick = (event: MouseEvent) => { if (suppressClick) { suppressClick = false; event.preventDefault(); event.stopImmediatePropagation(); } };
    const onResetPosition = () => { rest = null; try { localStorage.removeItem(REST_KEY); } catch { /* ignore */ } };
    avatar.addEventListener('pointerdown', onDragStart);
    avatar.addEventListener('pointermove', onDragMove);
    avatar.addEventListener('pointerup', onDragEnd);
    avatar.addEventListener('pointercancel', onDragEnd);
    avatar.addEventListener('click', onAvatarClick, true);
    window.addEventListener('monty-reset-position', onResetPosition);
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
          if(!command.waiting&&(mode==='point'||anchor.classList.contains('agent-highlight'))){anchor.classList.add('agent-highlight');highlighted.add(anchor);}
        } else if (command.target) {
          const direction=desktopRef.current.targetRegistry.direction(command.target,desktopRef.current.snapshot());
          element.dataset.visibilityDirection = direction;
          // A clipped target keeps its highlight while the visitor scrolls.
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
        highlighted.forEach(target=>target.classList.remove('agent-highlight'));highlighted.clear();
        if(previousProgress){previousProgress='';window.dispatchEvent(new CustomEvent('monty-guide-progress',{detail:null}));}
      }
      element.dataset.agentState = command.until > performance.now() ? (command.state || stateRef.current) : stateRef.current;

      const park = parkRef.current?.();
      element.dataset.parking = String(!!park);
      if (park) { tx = park.left + park.width/2 - size/2; ty = park.top + park.height/2 - size/2; avatarScale(park.width / size); }
      if (!command.target && !guidingTarget && Math.hypot(tx - x, ty - y) > 8) mode = 'move';
      if (drag?.moved) { tx = clampX(dragX, size); ty = clampY(dragY, size); x = tx; y = ty; mode = 'move'; }
      if (!park) { tx = Math.max(10, Math.min(tx, maxX)); ty = Math.max(55, Math.min(ty, maxY)); }
      const follow = reduced ? 1 : Math.min(1, dt * (park ? 7 : 2.4));
      x += (tx - x) * follow;
      y += (ty - y) * follow;
      if (!park) { x = Math.max(10, Math.min(x, maxX)); y = Math.max(10, Math.min(y, maxY)); }
      element.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
      const currentAtlas = atlas.current;
      const key=animationName(mode, tx < x, speakingRef.current, scanningRef.current, stateRef.current);if(key!==animationKey){animationKey=key;animationStarted=time;}
      const animation = currentAtlas?.animations[key];
      const sequence = animation?.frames ?? [0];
      const elapsedFrame=Math.floor((time-animationStarted) / (1000 / (animation?.fps ?? 6)));const frameIndex=animation?.loop?elapsedFrame%sequence.length:Math.min(elapsedFrame,sequence.length-1);
      if (currentAtlas) applyMontyFrame(element, currentAtlas, sequence[frameIndex] ?? 0);
      element.dataset.mode = mode;
      element.dataset.reduced = String(reduced);
      element.classList.remove('face-right');
      element.classList.toggle('bubble-right', x < 200);
      element.classList.toggle('speech-below', y < innerHeight / 2);
      highlighted.forEach(target=>{if(!target.isConnected)highlighted.delete(target);});
      setHint(park ? '' : message);
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
      window.removeEventListener('monty-reset-position', onResetPosition);
      avatar.removeEventListener('pointerdown', onDragStart); avatar.removeEventListener('pointermove', onDragMove);
      avatar.removeEventListener('pointerup', onDragEnd); avatar.removeEventListener('pointercancel', onDragEnd);
      avatar.removeEventListener('click', onAvatarClick, true);
      cancelAnimationFrame(frameId); cancelAnimationFrame(launchSettle);
      highlighted.forEach(target=>target.classList.remove('agent-highlight'));highlighted.clear();
      document.removeEventListener('pointermove', onPointer); document.removeEventListener('pointerdown', onActivity);
      document.removeEventListener('keydown', onActivity); document.removeEventListener('focusin', onFocus); document.removeEventListener('focusout', onLeave);
      document.documentElement.removeEventListener('pointerleave', onLeave); document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  return <div className="monty-overlay" ref={host} data-agent-ui data-visual-state={visual.marker} data-waking-effect={visual.wakingEffect}>
   <div ref={agent.setWelcomeHost}/><div className="monty-bubble" ref={bubble} hidden aria-hidden="true"/>{!agent.welcomeVisible&&(desktop.active!=='monty-history'||agent.guideProgress)&&<MontySpeech language={language} open={chatOpen}/>}
      <button className="monty-avatar" aria-label={language==='zh'?'和 Monty 聊天':'Chat with Monty'} title={language==='zh'?'点击聊天，拖动可移动 Monty':'Click to chat, drag to move Monty'} aria-expanded={chatOpen} onClick={()=>{setChatOpen(value=>!value);setSettingsOpen(false);}}><span className="monty-sprite"/></button><span className="monty-scroll-arrow" aria-hidden="true"/><span className="monty-caption">monty.exe</span>
   {chatOpen&&<div className="agent-settings-control"><button className="activity-toggle" aria-label={language==='zh'?'打开 Monty 设置':'Open Monty settings'} aria-expanded={settingsOpen} onClick={()=>setSettingsOpen(value=>!value)}>⚙</button><button className="activity-toggle history-toggle" aria-label={language==='zh'?'打开聊天记录':'Open chat history'} title={language==='zh'?'聊天记录':'Chat history'} onClick={()=>{desktop.open('monty-history');setSettingsOpen(false);}}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M6 4h13v14a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-1h11v1a3 3 0 0 0 6 0M6 4a3 3 0 0 0-3 3v2h3V4Zm0 0v13M9 8h7M9 11h7M9 14h5"/></svg></button>{settingsOpen&&<MontySettings language={language}/>}</div>}
   <span className="sr-only" role="status">{stateLabel(agent.state,language)}</span>
  </div>;
}
