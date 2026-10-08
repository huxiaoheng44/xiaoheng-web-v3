import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import type { Language } from '../../model';
import { useAgent } from './MontyContext';
import { TerminalWelcome } from './TerminalWelcome';

type Battery = { level: number; charging: boolean; addEventListener: (event: 'levelchange' | 'chargingchange', listener: () => void) => void; removeEventListener: (event: 'levelchange' | 'chargingchange', listener: () => void) => void; };

function SystemStatus({language,now}:{language:Language;now:Date}) {
 const [online,setOnline]=useState(()=>navigator.onLine);const [battery,setBattery]=useState<{level:number;charging:boolean}|null>(null);
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 useEffect(()=>{let active=true;let source:Battery|undefined;const update=()=>{if(active&&source)setBattery({level:source.level,charging:source.charging});};const supported=navigator as Navigator & { getBattery?:()=>Promise<Battery> };void supported.getBattery?.().then(value=>{if(!active)return;source=value;update();value.addEventListener('levelchange',update);value.addEventListener('chargingchange',update);});return()=>{active=false;if(source){source.removeEventListener('levelchange',update);source.removeEventListener('chargingchange',update);}};},[]);
 const locale=language==='zh'?'zh-CN':undefined;const localTime=now.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit',timeZoneName:'short'});const batteryText=battery?`${Math.round(battery.level*100)}%${battery.charging?' ⚡':''}`:'--';
 return <div className="system-status" aria-label={language==='zh'?'系统状态':'System status'}><span className="network-status" role="img" aria-label={online?(language==='zh'?'网络已连接':'Network connected'):(language==='zh'?'网络未连接':'Network offline')} title={online?(language==='zh'?'网络已连接':'Network connected'):(language==='zh'?'网络未连接':'Network offline')}><svg viewBox="0 0 24 20" width="18" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 6a16 16 0 0 1 20 0M5 10a11 11 0 0 1 14 0M8.5 14a5.5 5.5 0 0 1 7 0"/><circle cx="12" cy="18" r="1" fill="currentColor"/>{!online&&<path d="M3 2l18 17" strokeWidth="2"/>}</svg></span><span title={language==='zh'?'电池状态':'Battery status'}>▱ {batteryText}</span><time dateTime={now.toISOString()} title={Intl.DateTimeFormat().resolvedOptions().timeZone}>{localTime}</time></div>;
}

export function MontyTerminal({language,now,trailing,active=false}:{language:Language;now:Date;trailing?:React.ReactNode;active?:boolean}){
 const terminalTarget=useSemanticTarget({id:'monty:terminal',names:{en:'Ask Monty',zh:'向 Monty 提问'},scope:{},capabilities:['highlight']});
 const agent=useAgent();const [message,setMessage]=useState('');
 const input=useRef<HTMLInputElement>(null);const offered=useRef(false);
 const [welcome,setWelcome]=useState(false);
 const [draft,setDraft]=useState<{text:string;index:number}|null>(null);
 useEffect(()=>{if(active&&!offered.current){offered.current=true;setWelcome(true);}else if(!active){setWelcome(false);setDraft(null);}},[active]);
 useEffect(()=>{agent.setWelcomeVisible(welcome);return()=>agent.setWelcomeVisible(false);},[welcome,agent.setWelcomeVisible]);
 useEffect(()=>{if(agent.busy)setWelcome(false);},[agent.busy]);
 useEffect(()=>{if(!draft)return;const timer=setTimeout(()=>{const index=Math.min(draft.text.length,draft.index+2);setMessage(draft.text.slice(0,index));setDraft(index===draft.text.length?null:{...draft,index});},24);return()=>clearTimeout(timer);},[draft]);
 const choose=(question:string)=>{setWelcome(false);if(matchMedia('(prefers-reduced-motion: reduce)').matches){setMessage(question);setDraft(null);}else{setMessage('');setDraft({text:question,index:0});}input.current?.focus();};
 const submit=(event:React.FormEvent)=>{event.preventDefault();const outgoing=(draft?.text??message).trim();if(!outgoing)return;setDraft(null);setWelcome(false);void agent.start(outgoing);setMessage('');};
 return <footer className="monty-terminal os-terminal" data-agent-ui>
  {active&&welcome&&agent.welcomeHost&&createPortal(<TerminalWelcome language={language} onSelect={choose} onDismiss={()=>setWelcome(false)}/>,agent.welcomeHost)}
  <label htmlFor="monty-command" className="terminal-user">xiaoheng@portfolio:~$</label>
  <form ref={terminalTarget} data-agent-id="monty:terminal" onSubmit={submit}><input ref={input} id="monty-command" aria-label="Ask Monty" placeholder="ask Monty…" value={message} maxLength={4000} autoComplete="off" onChange={e=>{setDraft(null);setWelcome(false);setMessage(e.target.value);}} onKeyDown={e=>{if(e.key==='Escape'){setDraft(null);setWelcome(false);}}}/></form>
  <SystemStatus language={language} now={now}/>
  {trailing}
  <span className="sr-only">{language==='zh'?'回车发送，悬停 Monty 查看帮助':'Enter to send. Hover Monty for help.'}</span>
 </footer>;
}
