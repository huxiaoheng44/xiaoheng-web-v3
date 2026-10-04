import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Language } from '../../model';
import { useAgent } from './CrtAgentContext';

/** Conversation-only surface. Session controls live in the adjacent settings panel. */
export function CrtAgentSpeech({language,open}:{language:Language;open:boolean}){
 const agent=useAgent();const zh=language==='zh';
 const latest=agent.lines.filter(line=>line.role==='ghost').at(-1);
 const [typed,setTyped]=useState('');
 const [height,setHeight]=useState<number>();const speechRef=useRef<HTMLElement>(null);const contentRef=useRef<HTMLDivElement>(null);
 const text=latest?.text.trim()||agent.status||(agent.busy?(zh?'想一想…':'Thinking…'):'');
 useEffect(()=>{if(!text){setTyped('');return;}if(!text.startsWith(typed)){setTyped('');return;}if(typed.length>=text.length)return;const timer=window.setTimeout(()=>setTyped(text.slice(0,Math.min(text.length,typed.length+3))),16);return()=>window.clearTimeout(timer);},[text,typed]);
 useLayoutEffect(()=>{const speech=speechRef.current,content=contentRef.current;if(!speech||!content)return;const measure=()=>{const style=getComputedStyle(speech);const chrome=['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((total,key)=>total+parseFloat(style[key as keyof CSSStyleDeclaration] as string||'0'),0);setHeight(Math.min(content.getBoundingClientRect().height+chrome,Math.min(280,window.innerHeight*.42)));};measure();const observer=new ResizeObserver(measure);observer.observe(content);window.addEventListener('resize',measure);return()=>{observer.disconnect();window.removeEventListener('resize',measure);};},[open]);
 if(!open&&!text)return null;
 return <section ref={speechRef} className="crt-agent-speech" data-agent-ui aria-label={zh?'CRT.AGENT 消息':'CRT.AGENT message'} style={height?{height}:undefined}><div ref={contentRef} className="crt-agent-speech-content">
  <p className="crt-agent-utterance" aria-live="polite">{typed}<span className="typing-caret" aria-hidden="true">▋</span></p>
  {!!latest?.sources.length&&<details><summary>{zh?'来源':'Sources'}</summary><div className="crt-agent-sources">{latest.sources.map(s=>s.url?<a key={s.id} href={s.url} target="_blank" rel="noreferrer">{s.title}</a>:<span key={s.id}>{s.title}</span>)}</div></details>}
 </div></section>;
}
