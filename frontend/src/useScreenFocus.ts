import { useEffect, useRef, useState } from 'react';

/** Keeps the physical computer visible until xiaohengOS has been entered. */
export function useScreenFocus(active: boolean) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const stage = stageRef.current;
    const screen = stage?.querySelector<HTMLElement>('.monitor-screen');
    if (!stage || !screen) return;
    const canFocus = () => matchMedia('(min-width: 701px)').matches;
    const transform = () => {
      if (!active || !canFocus()) { stage.style.transform = 'translate3d(0px,0px,0) scale(1)'; return; }
      const matrix = new DOMMatrix(getComputedStyle(stage).transform);
      const stageRect = stage.getBoundingClientRect();
      const screenRect = screen.getBoundingClientRect();
      const currentScale = matrix.a || 1;
      const left = stageRect.left - matrix.e, top = stageRect.top - matrix.f;
      const sx = (screenRect.left - stageRect.left) / currentScale;
      const sy = (screenRect.top - stageRect.top) / currentScale;
      const width = screenRect.width / currentScale, height = screenRect.height / currentScale;
      // Keep equal left/right margins; Monty lives over the physical bezel.
      const scale = Math.max(1, Math.min((innerWidth - 180) / width, (innerHeight - 40) / height, 2.4));
      const dx = (innerWidth - width * scale) / 2 - left - sx * scale;
      const dy = (innerHeight - height * scale) / 2 - top - sy * scale;
      stage.style.transform = `translate3d(${dx}px,${dy}px,0) scale(${scale})`;
    };
    const resize = () => { setFocused(active && canFocus()); transform(); };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(stage);
    window.addEventListener('resize', resize);
    return () => { observer.disconnect(); window.removeEventListener('resize', resize); };
  }, [active]);
  return { stageRef, focused };
}
