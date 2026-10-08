import catalog from '../../../../content/guide-catalog.json';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Language } from '../../model';
import { useAgent } from './MontyContext';

/** Conversation-only surface. Session controls live in the adjacent settings panel. */
export function MontySpeech({language,open}:{language:Language;open:boolean}){
 const agent=useAgent();const zh=language==='zh';
 const latest=agent.lines.filter(line=>line.role==='monty').at(-1);
 const [typed,setTyped]=useState('');
 const [dismissed,setDismissed]=useState('');
 const [height,setHeight]=useState<number>();const speechRef=useRef<HTMLElement>(null);const contentRef=useRef<HTMLDivElement>(null);
 const text=agent.guideProgress?.text||latest?.text.trim()||agent.status||(agent.busy?(zh?'想一想…':'Thinking…'):'');
 useEffect(()=>{if(!text){setTyped('');return;}if(!text.startsWith(typed)){setTyped('');return;}if(typed.length>=text.length)return;const timer=window.setTimeout(()=>setTyped(text.slice(0,Math.min(text.length,typed.length+3))),16);return()=>window.clearTimeout(timer);},[text,typed]);
 useLayoutEffect(()=>{const speech=speechRef.current,content=contentRef.current;if(!speech||!content)return;const measure=()=>{const style=getComputedStyle(speech);const chrome=['paddingTop','paddingBottom','borderTopWidth','borderBottomWidth'].reduce((total,key)=>total+parseFloat(style[key as keyof CSSStyleDeclaration] as string||'0'),0);setHeight(Math.min(content.getBoundingClientRect().height+chrome,Math.min(280,window.innerHeight*.42)));};measure();const observer=new ResizeObserver(measure);observer.observe(content);window.addEventListener('resize',measure);return()=>{observer.disconnect();window.removeEventListener('resize',measure);};},[open,text,agent.projectChoices.length]);
 if(!text||text===dismissed)return null;
 const displayed=agent.guideProgress?text:typed;
 return <section ref={speechRef} className={`monty-speech${agent.guideProgress?' is-guiding':''}`} data-agent-ui aria-label={zh?'Monty 消息':'Monty message'} style={height?{height}:undefined}><button type="button" className="monty-speech-close" aria-label={zh?'关闭消息':'Close message'} title={zh?'关闭':'Close'} onClick={()=>setDismissed(text)}>×</button><div ref={contentRef} className="monty-speech-content">
  <p className="monty-utterance" aria-live="polite">{displayed}<span className="typing-caret" aria-hidden="true">▋</span></p>
  {!!agent.projectChoices.length&&<div className="terminal-offer-list project-choice-list">{agent.projectChoices.map((id,index)=>{const project=catalog.find(entry=>entry.id===id)!;return <div key={id}><button type="button" data-project-choice={id} disabled={agent.busy} onClick={()=>agent.startGuide(project.id)}>{index+1}. {project.title}</button><small>{project.description[agent.guideLocale]}</small></div>;})}</div>}
  {!agent.guideProgress&&!!latest?.sources.length&&<details><summary>{zh?'来源':'Sources'}</summary><div className="monty-sources">{latest.sources.map(s=>s.url?<a key={s.id} href={s.url} target="_blank" rel="noreferrer">{s.title}</a>:<span key={s.id}>{s.title}</span>)}</div></details>}
 </div></section>;
}
