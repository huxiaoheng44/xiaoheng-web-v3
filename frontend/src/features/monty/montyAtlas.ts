import { useEffect, useRef } from 'react';

export type MontyFrame = { x:number; y:number; w:number; h:number; duration_ms:number; offset:[number,number] };
export type MontyAtlas = { sheet:{ width:number; height:number }; frames:MontyFrame[]; animations:Record<string,{ frames:number[]; fps:number; loop:boolean }> };

let pending: Promise<MontyAtlas|null> | null = null;
/** One shared fetch of the sprite metadata for every Monty on the page. */
export function loadMontyAtlas() {
  pending ??= fetch('/assets/monty.json?v=monty-v3').then(r => r.ok ? r.json() as Promise<MontyAtlas> : null).catch(() => null);
  return pending;
}

export function applyMontyFrame(element:HTMLElement, atlas:MontyAtlas, index:number) {
  const sprite = atlas.frames[index];
  if (!sprite) return;
  element.style.setProperty('--frame-x', `${sprite.x * 100 / (atlas.sheet.width - sprite.w)}%`);
  element.style.setProperty('--frame-y', `${sprite.y * 100 / (atlas.sheet.height - sprite.h)}%`);
  element.style.setProperty('--sprite-offset-x', `${sprite.offset[0]}px`);
  element.style.setProperty('--sprite-offset-y', `${sprite.offset[1]}px`);
}

/** Plays one atlas animation on a `.monty-sprite`; non-looping ones hold their last frame, then `next` takes over. */
export function useMontyAnimation(name:string, { fps, next }:{ fps?:number; next?:string } = {}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let frameId = 0, cancelled = false;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    void loadMontyAtlas().then(atlas => {
      const element = ref.current;
      if (cancelled || !atlas || !element) return;
      let key = name, started = performance.now();
      const tick = (time:number) => {
        const animation = atlas.animations[key];
        if (!animation) return;
        const rate = key === name ? fps ?? animation.fps : animation.fps;
        let step = Math.floor((time - started) / (1000 / rate));
        if (!animation.loop && step >= animation.frames.length && next && key !== next && atlas.animations[next]) { key = next; started = time; step = 0; }
        const current = atlas.animations[key].frames;
        const index = reduced ? current[current.length - 1] : atlas.animations[key].loop ? current[step % current.length] : current[Math.min(step, current.length - 1)];
        applyMontyFrame(element, atlas, index);
        if (!reduced) frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
    });
    return () => { cancelled = true; cancelAnimationFrame(frameId); };
  }, [name, fps, next]);
  return ref;
}
