import { useEffect, useRef } from 'react';
import { labels, type FolderId, type Language } from './model';
import { findTarget, visibleTarget } from './features/ghost/DesktopContext';
import { useAgent, type GhostCue } from './features/ghost/AgentContext';

type Mode = 'idle' | 'move' | 'look' | 'point';
export function GhostOverlay({ language, screenFocused = false }: { language: Language; screenFocused?: boolean }) {
  const agent = useAgent();
  const settings = useRef({ companion: agent.companion, quiet: agent.quiet });
  settings.current = { companion: agent.companion, quiet: agent.quiet };
  const focusedRef = useRef(screenFocused);
  focusedRef.current = screenFocused;
  const host = useRef<HTMLDivElement>(null);
  const bubble = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current!;
    const hint = bubble.current!;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let reduced = media.matches;
    let pointer = { x: -1000, y: -1000 };
    let x = innerWidth * .81, y = innerHeight * .43;
    let lastActivity = performance.now(), lastTime = 0, frameId = 0;
    let target: HTMLElement | null = null;
    let previousHint = '';
    let command: GhostCue = { until: 0 }, quiet = false;
    const onCue = (event: Event) => { command = (event as CustomEvent<GhostCue>).detail; };
    const onQuiet = (event: Event) => { quiet = (event as CustomEvent<boolean>).detail; };
    window.addEventListener('ghost-cue', onCue); window.addEventListener('ghost-quiet', onQuiet);
    const onPointer = (event: PointerEvent) => { if (event.pointerType === 'touch') return; pointer = { x: event.clientX, y: event.clientY }; lastActivity = performance.now(); target = (event.target as Element).closest<HTMLElement>('[data-guide]'); };
    const onFocus = (event: FocusEvent) => { lastActivity = performance.now(); target = (event.target as Element)?.closest<HTMLElement>('[data-guide]'); };
    const onActivity = () => { lastActivity = performance.now(); };
    const onLeave = () => { pointer = { x: -1000, y: -1000 }; target = null; };
    const setHint = (text: string) => { if (previousHint !== text) { hint.textContent = text; hint.hidden = !text; previousHint = text; } };
    const tick = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000 || .016, .05); lastTime = time;
      const mobile = innerWidth <= 700;
      const size = mobile ? 62 : 100;
      const home = { x: innerWidth * (mobile ? .78 : .82), y: innerHeight * (mobile ? .79 : .43) };
      let tx = home.x, ty = home.y, mode: Mode = 'idle', message = '';
      if (!reduced && !mobile) { tx += Math.sin(time / 5400) * 28; ty += Math.sin(time / 1800) * 12; }
      if (target?.isConnected) {
        const rect = target.getBoundingClientRect();
        const name = target.dataset.guide;
        mode = name === 'control' ? 'look' : 'point';
        if (!reduced && !mobile) { tx = rect.right + 34; ty = rect.top - size * .55; }
        if (name && name in labels) message = language === 'en' ? `Open ${labels[name as FolderId].en}?` : `看看${labels[name as FolderId].zh}？`;
        else if (name === 'language') message = language === 'en' ? '你好！ English / 中文' : 'Hello! 中文 / English';
        else message = language === 'en' ? 'Make yourself at home.' : '随意探索吧。';
      } else if (!reduced && !mobile && Math.hypot(pointer.x - x, pointer.y - y) < 260) {
        tx = pointer.x + 55; ty = pointer.y - 95; mode = 'move';
      } else if (time - lastActivity > 12000) {
        message = language === 'en' ? 'Try a folder. I’ll be here.\n打开文件夹，随意看看。' : '打开文件夹，随意看看。\nTry a folder. I’ll be here.';
      }
      const maxX = Math.max(10, innerWidth - size - 15), maxY = Math.max(10, innerHeight - size - 24);
      if (focusedRef.current && !mobile) {
        tx = innerWidth - size - 14;
        ty = innerHeight * .52;
        if (!reduced) ty += Math.sin(time / 1800) * 6;
      }
      if (quiet || settings.current.quiet || settings.current.companion) message = '';
      if (command.until > performance.now()) {
        if (command.text) message = command.text;
        if (command.gesture) mode = command.gesture === 'think' ? 'look' : command.gesture === 'nod' ? 'idle' : command.gesture as Mode;
        element.dataset.gesture = command.gesture || '';
        const anchor = command.target ? findTarget(command.target) : null;
        if (anchor && visibleTarget(anchor) && !reduced && !mobile) {
          const rect = anchor.getBoundingClientRect(); tx = rect.right + 16; ty = rect.top - size;
          const drawer = document.querySelector('.ghost-drawer')?.getBoundingClientRect();
          if (drawer && tx < drawer.right && tx + size > drawer.left && ty + size > drawer.top) ty = drawer.top - size - 16;
          mode = 'point';
        }
      } else element.dataset.gesture = '';
      tx = Math.max(10, Math.min(tx, maxX)); ty = Math.max(55, Math.min(ty, maxY));
      if (reduced) { x = tx; y = ty; } else { x += (tx - x) * Math.min(1, dt * 2.4); y += (ty - y) * Math.min(1, dt * 2.4); }
      x = Math.max(10, Math.min(x, maxX)); y = Math.max(10, Math.min(y, maxY));
      const frame = reduced ? 0 : Math.floor(time / (mode === 'idle' ? 420 : 200)) % 4;
      element.style.transform = `translate3d(${Math.round(x)}px,${Math.round(y)}px,0)`;
      element.style.setProperty('--frame-x', `${frame * 100 / 3}%`);
      element.style.setProperty('--frame-y', `${['idle', 'move', 'look', 'point'].indexOf(mode) * 100 / 3}%`);
      element.dataset.mode = mode;
      element.dataset.reduced = String(reduced);
      element.classList.toggle('face-right', mode === 'move' && pointer.x < x);
      element.classList.toggle('bubble-right', x < 200);
      setHint(message);
      frameId = requestAnimationFrame(tick);
    };
    const visibility = () => { cancelAnimationFrame(frameId); if (!document.hidden) { lastTime = 0; frameId = requestAnimationFrame(tick); } };
    const motionChange = () => { reduced = media.matches; };
    document.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('pointerdown', onActivity, { passive: true });
    document.addEventListener('keydown', onActivity);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onLeave);
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', visibility);
    media.addEventListener('change', motionChange);
    frameId = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('ghost-cue', onCue); window.removeEventListener('ghost-quiet', onQuiet);
      cancelAnimationFrame(frameId);
      document.removeEventListener('pointermove', onPointer); document.removeEventListener('pointerdown', onActivity);
      document.removeEventListener('keydown', onActivity); document.removeEventListener('focusin', onFocus); document.removeEventListener('focusout', onLeave);
      document.documentElement.removeEventListener('pointerleave', onLeave); document.removeEventListener('visibilitychange', visibility); media.removeEventListener('change', motionChange);
    };
  }, [language]);
  return <div className="ghost-overlay" ref={host} aria-hidden="true"><div className="ghost-bubble" ref={bubble} hidden /><div className="ghost-sprite" /><span className="ghost-caption">GHOST.EXE</span></div>;
}
