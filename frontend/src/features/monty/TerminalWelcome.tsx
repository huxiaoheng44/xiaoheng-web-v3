import { useEffect, useState } from 'react';
import type { Language } from '../../model';
import offers from '../../../../content/guide-offers.json';

/** Fixed, tested destinations: rendering these choices never calls a model. */
export function TerminalWelcome({language,onSelect,onDismiss}:{language:Language;onSelect:(question:string)=>void;onDismiss:()=>void}) {
  const zh=language==='zh';
  const intro=zh?'你好，我是 Monty。想先看看什么？':'Hi, I’m Monty. What would you like to explore?';
  const total=intro.length+offers.reduce((sum,offer)=>sum+offer.label[language].length,0);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [count,setCount]=useState(reduced?total:0);
  useEffect(()=>{setCount(reduced?total:0);},[language,reduced,total]);
  useEffect(()=>{if(count>=total)return;const timer=setTimeout(()=>setCount(value=>Math.min(total,value+2)),24);return()=>clearTimeout(timer);},[count,total]);
  let offset=intro.length;
  return <section className="monty-speech terminal-welcome" data-monty-welcome aria-label={zh?'Monty 快捷提问':'Monty quick questions'}>
    <header><span>Monty</span><button type="button" aria-label={zh?'关闭快捷提问':'Dismiss quick questions'} onClick={onDismiss}>×</button></header>
    <p className="terminal-welcome-copy"><span aria-hidden="true">{intro.slice(0,count)}{count<intro.length&&<span className="terminal-type-caret">▋</span>}</span><span className="sr-only">{intro}</span></p>
    <div className="terminal-offer-list">{offers.map((offer,index)=>{
      const label=offer.label[language];const length=Math.max(0,Math.min(label.length,count-offset));offset+=label.length;
      return <button key={offer.id} type="button" data-offer-id={offer.id} aria-label={label} disabled={length<label.length} onClick={()=>onSelect(offer.question[language])}>
        <span className="terminal-offer-number" aria-hidden="true">{index+1}.</span><span aria-hidden="true">{label.slice(0,length)}{length>0&&length<label.length&&<span className="terminal-type-caret">▋</span>}</span>
      </button>;
    })}</div>
    <small>{zh?'点击填入问题，然后按 Enter 开始。也可以直接输入你的问题。':'Choose a question, then press Enter to start. Or type your own.'}</small>
  </section>;
}
