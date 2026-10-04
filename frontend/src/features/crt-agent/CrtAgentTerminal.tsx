import { useEffect, useState } from 'react';
import type { Language } from '../../model';
import { useAgent } from './CrtAgentContext';

type Battery = { level: number; charging: boolean; addEventListener: (event: 'levelchange' | 'chargingchange', listener: () => void) => void; removeEventListener: (event: 'levelchange' | 'chargingchange', listener: () => void) => void; };

function SystemStatus({language,now}:{language:Language;now:Date}) {
 const [online,setOnline]=useState(()=>navigator.onLine);const [battery,setBattery]=useState<{level:number;charging:boolean}|null>(null);
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update);};},[]);
 useEffect(()=>{let active=true;let source:Battery|undefined;const update=()=>{if(active&&source)setBattery({level:source.level,charging:source.charging});};const supported=navigator as Navigator & { getBattery?:()=>Promise<Battery> };void supported.getBattery?.().then(value=>{if(!active)return;source=value;update();value.addEventListener('levelchange',update);value.addEventListener('chargingchange',update);});return()=>{active=false;if(source){source.removeEventListener('levelchange',update);source.removeEventListener('chargingchange',update);}};},[]);
 const locale=language==='zh'?'zh-CN':undefined;const localTime=now.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit',timeZoneName:'short'});const batteryText=battery?`${Math.round(battery.level*100)}%${battery.charging?' ⚡':''}`:'--';
 return <div className="system-status" aria-label={language==='zh'?'系统状态':'System status'}><span title={online?(language==='zh'?'网络已连接':'Network connected'):(language==='zh'?'网络未连接':'Network offline')}>⌁ {online?(language==='zh'?'网络':'NET'):(language==='zh'?'离线':'OFF')}</span><span title={language==='zh'?'电池状态':'Battery status'}>▱ {batteryText}</span><time dateTime={now.toISOString()} title={Intl.DateTimeFormat().resolvedOptions().timeZone}>{localTime}</time></div>;
}

export function CrtAgentTerminal({language,now}:{language:Language;now:Date}){
 const agent=useAgent();const [message,setMessage]=useState('');
 const submit=(event:React.FormEvent)=>{event.preventDefault();if(!message.trim())return;void agent.start(message.trim());setMessage('');};
 return <footer className="crt-agent-terminal os-terminal" data-agent-ui>
  <label htmlFor="ghost-command" className="terminal-user">xiaoheng@portfolio:~$</label>
  <form onSubmit={submit}><input id="ghost-command" aria-label="Ask CRT.AGENT" placeholder="ask CRT.AGENT…" value={message} maxLength={4000} autoComplete="off" onChange={e=>setMessage(e.target.value)}/></form>
  <SystemStatus language={language} now={now}/>
  <span className="sr-only">{language==='zh'?'回车发送，悬停 CRT.AGENT 查看帮助':'Enter to send. Hover CRT.AGENT for help.'}</span>
 </footer>;
}
