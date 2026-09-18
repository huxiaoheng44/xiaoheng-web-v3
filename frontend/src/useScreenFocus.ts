import { useEffect, useRef, useState } from 'react';

/** Hit-test the actual screen; transformed geometry never feeds back into layout. */
export function useScreenFocus() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const focusedRef = useRef(false);
  useEffect(() => {
    const stage = stageRef.current!;
    const screen = stage.querySelector<HTMLElement>('.monitor-screen')!;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 701px)');
    let timer: ReturnType<typeof setTimeout> | undefined;
    const transform = () => {
      if (!focusedRef.current) { stage.style.transform = 'translate3d(0px,0px,0) scale(1)'; return; }
      const matrix = new DOMMatrix(getComputedStyle(stage).transform);
      const stageRect = stage.getBoundingClientRect();
      const screenRect = screen.getBoundingClientRect();
      const currentScale = matrix.a || 1;
      const left = stageRect.left - matrix.e, top = stageRect.top - matrix.f;
      const sx = (screenRect.left - stageRect.left) / currentScale;
      const sy = (screenRect.top - stageRect.top) / currentScale;
      const width = screenRect.width / currentScale, height = screenRect.height / currentScale;
      const scale = Math.max(1, Math.min((innerWidth - 180) / width, (innerHeight - 96) / height, 2.4));
      const dx = (innerWidth - 80 - width * scale) / 2 - left - sx * scale;
      const dy = (innerHeight - height * scale) / 2 - top - sy * scale;
      stage.style.transform = `translate3d(${dx}px,${dy}px,0) scale(${scale})`;
    };
    const change = (value: boolean) => {
      clearTimeout(timer); timer = undefined;
      if (value === focusedRef.current) return;
      focusedRef.current = value; setFocused(value); transform();
    };
    const move = (event: PointerEvent) => {
      if (!finePointer.matches || event.pointerType === 'touch' || screen.dataset.booting === 'true') return;
      const rect = screen.getBoundingClientRect();
      const pad = focusedRef.current ? 16 : -6;
      const inside = event.clientX >= rect.left - pad && event.clientX <= rect.right + pad && event.clientY >= rect.top - pad && event.clientY <= rect.bottom + pad;
      if (inside) { clearTimeout(timer); timer = undefined; change(true); }
      else if (focusedRef.current && !timer) timer = setTimeout(() => change(false), 160);
    };
    const leave = () => change(false);
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') leave(); };
    const resize = () => { if (!finePointer.matches) leave(); else transform(); };
    const observer = new ResizeObserver(resize); observer.observe(stage);
    document.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', resize);
    finePointer.addEventListener('change', resize);
    return () => { clearTimeout(timer); observer.disconnect(); document.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', leave); document.removeEventListener('keydown', escape); window.removeEventListener('resize', resize); finePointer.removeEventListener('change', resize); };
  }, []);
  return { stageRef, focused };
}
