import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { Language } from './model';
import { projects } from './content/projects';
import { useMontyAnimation } from './features/monty/montyAtlas';

/**
 * xiaohengOS power cycle. Boot: Monty wakes → BIOS-style POST log while Monty scans from the logo corner →
 * the boot screen wipes away and Monty leaves the screen for its desk spot. Shutdown runs it backwards:
 * windows close, a shutdown log prints, Monty flies back to the centre and falls asleep on the standby screen.
 */
export type PowerPhase = 'off' | 'booting' | 'on' | 'shutting';
export type PowerStep = 'idle' | 'wake' | 'post' | 'reveal' | 'close' | 'log' | 'sleep';

const BOOT = { full: { wake: 760, post: 1500, reveal: 460 }, quick: { wake: 380, post: 650, reveal: 360 } };
const SHUTDOWN = { close: 380, log: 1050, sleep: 1050 };
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function usePowerSequence() {
  const [phase, setPhase] = useState<PowerPhase>('off');
  const [step, setStep] = useState<PowerStep>('idle');
  const boots = useRef(0);
  const [quick, setQuick] = useState(false);
  const timers = useRef<number[]>([]);
  const clear = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const schedule = (plan:[PowerStep|'end', number][], end:()=>void) => {
    clear(); let at = 0;
    for (const [next, delay] of plan) { at += delay; timers.current.push(window.setTimeout(() => next === 'end' ? end() : setStep(next), at)); }
  };
  const finishBoot = useCallback(() => { clear(); setPhase('on'); setStep('idle'); }, []);
  const finishShutdown = useCallback(() => { clear(); setPhase('off'); setStep('idle'); }, []);

  const powerOn = useCallback(() => {
    const fast = boots.current > 0; boots.current += 1; setQuick(fast);
    if (reducedMotion()) { finishBoot(); return; }
    const t = fast ? BOOT.quick : BOOT.full;
    setPhase('booting'); setStep('wake');
    schedule([['post', t.wake], ['reveal', t.post], ['end', t.reveal]], finishBoot);
  }, [finishBoot]);
  const shutDown = useCallback(() => {
    if (reducedMotion()) { finishShutdown(); return; }
    setPhase('shutting'); setStep('close');
    schedule([['log', SHUTDOWN.close], ['sleep', SHUTDOWN.log], ['end', SHUTDOWN.sleep]], finishShutdown);
  }, [finishShutdown]);

  // Any click or key during a transition skips to its end state.
  useEffect(() => {
    if (phase !== 'booting' && phase !== 'shutting') return;
    const armed = performance.now();
    const skip = (event:Event) => {
      if (performance.now() - armed < 200) return;
      if (event instanceof KeyboardEvent && ['Shift','Control','Alt','Meta','Tab'].includes(event.key)) return;
      if (phase === 'booting') {
        // Jump straight to the wipe so Monty still hands off from the logo corner.
        if (step === 'reveal') return;
        schedule([['reveal', 0], ['end', BOOT.quick.reveal]], finishBoot);
      } else finishShutdown();
    };
    window.addEventListener('pointerdown', skip, true); window.addEventListener('keydown', skip, true);
    return () => { window.removeEventListener('pointerdown', skip, true); window.removeEventListener('keydown', skip, true); };
  }, [phase, step, finishBoot, finishShutdown]);
  useEffect(() => clear, []);

  return { phase, step, quick, powerOn, shutDown };
}

const dots = (label:string, result:string, width = 34) => `${label} ${'.'.repeat(Math.max(3, width - label.length - result.length))} ${result}`;
function postLines(quick:boolean) {
  const lines = [
    { text: 'xiaohengOS BIOS v1.0  (C) 2026 Xiaoheng Hu', tone: 'head' },
    { text: dots('CPU  curiosity @ 3.14GHz', 'OK') },
    { text: dots('MEM  640K coffee', 'OK') },
    { text: dots('MOUNT /projects', `${projects.length} found`) },
    { text: dots('MOUNT /profile /contact', 'OK') },
    { text: dots('LOAD  MONTY.SYS', 'OK') },
  ];
  return quick ? [lines[0], lines[3], lines[5]] : lines;
}
function shutdownLines(language:Language) {
  return [
    { text: 'xiaoheng@portfolio:~$ shutdown -h now', tone: 'head' },
    { text: dots('Closing windows', 'OK') },
    { text: dots('Saving session', 'OK') },
    { text: dots('Parking MONTY.SYS', 'OK') },
    { text: language === 'zh' ? 'Monty：晚安。' : 'Monty: goodnight.', tone: 'say' },
  ];
}

function StandbyMonty({ phase, step }:{ phase:PowerPhase; step:PowerStep }) {
  const [animation, fps, next] =
    phase === 'booting' ? (step === 'wake' ? ['awake', 12, 'idle'] : ['scan', undefined, undefined])
    : phase === 'shutting' ? (step === 'sleep' ? ['sleep', 12, 'dozing'] : ['idle', undefined, undefined])
    : ['dozing', undefined, undefined];
  const ref = useMontyAnimation(animation as string, { fps, next });
  return <div className="startup-agent" data-anim={animation} aria-hidden="true"><span ref={ref} className="monty-sprite"/></div>;
}

export function PowerScreen({ phase, step, quick, language, onPowerOn }:{ phase:PowerPhase; step:PowerStep; quick:boolean; language:Language; onPowerOn:()=>void }) {
  const powered = useRef(false); if (phase !== 'off') powered.current = true;
  const cold = !powered.current; // the CRT warm-up flash only on the very first standby screen
  if (phase === 'on') return null;
  const en = language === 'en';
  const lines = phase === 'booting' && step !== 'wake' ? postLines(quick) : phase === 'shutting' && step !== 'close' ? shutdownLines(language) : [];
  const lineGap = phase === 'booting' ? (quick ? 150 : 190) : 160;
  return <div className={`boot-overlay ${cold ? 'is-cold' : ''}`} data-phase={phase} data-step={step} data-quick={quick || undefined} role="dialog" aria-label={en ? 'Start Monty' : '启动 Monty'}>
   {lines.length > 0 && <pre className="boot-log" aria-hidden="true">
    {lines.map((line, i) => <span key={`${phase}-${i}`} className={`boot-line ${line.tone ? `is-${line.tone}` : ''}`} style={{ '--i': i, '--gap': `${lineGap}ms` } as CSSProperties}>{line.text}</span>)}
    {phase === 'booting' && <span className="boot-line boot-bar" style={{ '--i': lines.length, '--gap': `${lineGap}ms` } as CSSProperties}><i/></span>}
    {phase === 'booting' && <span className="boot-line is-head" style={{ '--i': lines.length + 1, '--gap': `${lineGap}ms` } as CSSProperties}>Starting xiaohengOS<b className="boot-caret"/></span>}
   </pre>}
   <StandbyMonty phase={phase} step={step}/>
   {phase === 'shutting' && step === 'sleep' && <p className="boot-safe">{en ? 'It is now safe to turn off your computer.' : '现在可以安全地关闭计算机了。'}</p>}
   {phase === 'off' && <button className="boot-skip" aria-label={en ? 'Power on' : '开机'} title={en ? 'Power on' : '开机'} onClick={onPowerOn}><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M12 3v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/><path d="M7.2 6.4a7.5 7.5 0 1 0 9.6 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square"/></svg></button>}
   {phase === 'off' && <small className="boot-copyright">© 2026 {en ? 'Xiaoheng Hu' : '胡晓亨'}</small>}
   {(phase === 'booting' || phase === 'shutting') && <small className="boot-hint" aria-hidden="true">{en ? 'click or press any key to skip' : '点击或按任意键跳过'}</small>}
  </div>;
}

/** Where the standby Monty is drawn, so the desk Monty can launch from / land on exactly that spot. */
export function standbyMontyRect() {
  return document.querySelector('.boot-overlay .startup-agent')?.getBoundingClientRect() ?? null;
}
