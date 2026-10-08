import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import type { Language } from '../../model';
import { useAgent } from './MontyContext';
import { TerminalWelcome } from './TerminalWelcome';
import { useDesktop, useSemanticTarget } from './DesktopContext';
import { fetchMontyHealth, type MontyHealth } from './transport';

type Link = 'checking' | 'live' | 'local' | 'offline';
const HEALTH_INTERVAL = 60_000;

/** Monty's link to the backend, polled from /api/health (no session is created for it). */
function useMontyLink(){
 const [link,setLink]=useState<{state:Link;health:MontyHealth|null}>({state:'checking',health:null});
 useEffect(()=>{
  let controller:AbortController|null=null;
  const check=async()=>{
   controller?.abort();const current=new AbortController();controller=current;
   if(!navigator.onLine){setLink({state:'offline',health:null});return;}
   try{const health=await fetchMontyHealth(current.signal);setLink({state:health.configured?'live':'local',health});}
   catch{if(!current.signal.aborted)setLink({state:'offline',health:null});}
  };
  void check();
  const timer=setInterval(()=>{if(!document.hidden)void check();},HEALTH_INTERVAL);
  const wake=()=>{if(!document.hidden)void check();};
  window.addEventListener('online',wake);window.addEventListener('offline',wake);document.addEventListener('visibilitychange',wake);
  return()=>{controller?.abort();clearInterval(timer);window.removeEventListener('online',wake);window.removeEventListener('offline',wake);document.removeEventListener('visibilitychange',wake);};
 },[]);
 return link;
}

function SystemStatus({language,now}:{language:Language;now:Date}) {
 const zh=language==='zh';const agent=useAgent();const desktop=useDesktop();const {state:link,health}=useMontyLink();
 const format=(value:number)=>value.toLocaleString(zh?'zh-CN':'en-US');
 const replying=agent.busy;
 const linkHint={
  checking:zh?'正在连接 Monty…':'Connecting to Monty…',
  live:zh?`Monty 在线 · ${health?.model||'model'} · ${health?.latency??0}ms`:`Monty online · ${health?.model||'model'} · ${health?.latency??0}ms`,
  local:zh?'后端在线，未配置模型 · 仅本地导览':'Backend online, no model key · local guide only',
  offline:zh?'Monty 离线':'Monty offline',
 }[link]+(replying&&link!=='offline'?(zh?' · 回复中':' · replying'):'');
 const bars={checking:1,live:3,local:2,offline:0}[link];
 // Reply-token allowance of this session. Before the first question there is no session yet: show it full.
 const usage=agent.usage;const limit=usage?.limit??health?.sessionTokens??null;
 const remaining=usage?usage.remaining/Math.max(1,usage.limit):1;const reserved=usage?usage.reserved/Math.max(1,usage.limit):0;
 const percent=usage&&usage.remaining>0&&remaining<.01?'<1%':`${Math.floor(remaining*100)}%`;
 const level=remaining>.5?'high':remaining>.2?'mid':'low';
 const tokenHint=usage
  ?(zh?`剩余 ${usage.estimated?'≈':''}${format(usage.remaining)} / ${format(usage.limit)} 回复 token${usage.reserved>0?' · 回复中':''} · 点击查看聊天记录`:`${usage.estimated?'≈':''}${format(usage.remaining)} / ${format(usage.limit)} reply tokens left${usage.reserved>0?' · replying':''} · click for chat history`)
  :(zh?`满额${limit?` · ${format(limit)} 回复 token`:''} · 额度在第一次提问时开始计算`:`Full${limit?` · ${format(limit)} reply tokens`:''} · the allowance starts with your first question`);
 const locale=zh?'zh-CN':undefined;const localTime=now.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit',timeZoneName:'short'});
 return <div className="system-status" aria-label={zh?'系统状态':'System status'}>
  <span className="status-item monty-link" data-link={link} data-transmitting={replying&&link!=='offline'||undefined} data-hint={linkHint} role="img" aria-label={linkHint} tabIndex={0}><svg viewBox="0 0 17 14" width="17" height="14" shapeRendering="crispEdges" aria-hidden="true"><rect className={bars>=1?'is-lit':''} x="1" y="9" width="4" height="4" fill="currentColor"/><rect className={bars>=2?'is-lit':''} x="6.5" y="5" width="4" height="8" fill="currentColor"/><rect className={bars>=3?'is-lit':''} x="12" y="1" width="4" height="12" fill="currentColor"/>{link==='offline'&&<path className="is-lit link-cut" d="M1 1l15 12" stroke="currentColor" strokeWidth="1.6"/>}</svg></span>
  <button type="button" className="status-item token-battery" data-level={level} data-hint={tokenHint} aria-label={tokenHint} onClick={()=>desktop.open('monty-history')}>
   <span className="battery-cell" aria-hidden="true"><i className="battery-fill" style={{width:`${remaining*100}%`}}/>{reserved>0&&<i className="battery-reserved" style={{left:`${remaining*100}%`,width:`${Math.max(reserved*100,6)}%`}}/>}</span>
   <span className="battery-text">{usage?.estimated?'≈':''}{percent}</span>
  </button>
  <time dateTime={now.toISOString()} title={Intl.DateTimeFormat().resolvedOptions().timeZone}>{localTime}</time>
 </div>;
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
