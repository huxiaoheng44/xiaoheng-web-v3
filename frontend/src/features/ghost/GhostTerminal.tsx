import { useEffect, useRef, useState } from 'react';
import type { Language } from '../../model';
import { useAgent } from './AgentContext';
export function GhostTerminal({language,now}:{language:Language;now:Date}){
 const agent=useAgent();const [message,setMessage]=useState('');const [debug,setDebug]=useState('');const end=useRef<HTMLDivElement>(null);const zh=language==='zh';
 useEffect(()=>{if(agent.open)end.current?.scrollIntoView({block:'nearest'});},[agent.lines,agent.open]);
 const submit=(e:React.FormEvent)=>{e.preventDefault();if(!message.trim())return;void agent.start(message.trim());setMessage('');};
 return <div className="ghost-terminal" data-agent-ui>
  {agent.open&&<section className="ghost-drawer" aria-label="Ask Ghost">
   <header><span>GHOST / {zh?'你的像素馆长':'YOUR PIXEL CURATOR'}</span><button onClick={()=>agent.setOpen(false)} aria-label={zh?'收起对话':'Collapse chat'}>−</button></header>
   <div className="ghost-options"><label><input type="checkbox" checked={agent.companion} onChange={e=>agent.setCompanion(e.target.checked)}/>{zh?'智能陪伴':'Smart companion'}</label><label><input type="checkbox" checked={agent.quiet} onChange={e=>agent.setQuiet(e.target.checked)}/>{zh?'安静模式':'Quiet'}</label><button onClick={agent.undo}>{zh?'撤销导航':'Undo navigation'}</button><button onClick={()=>void agent.clear()}>{zh?'清空会话':'Clear session'}</button></div>
   <p className="ghost-privacy">{zh?'智能陪伴开启后，会向 AI 服务发送本次浏览摘要和简化鼠标轨迹；刷新重置，应用不长期保存。未开启也可以提问。服务商按其数据政策处理请求。':'Companion shares this visit’s browsing summary and simplified pointer path with AI. Refresh resets memory; this app does not keep it long-term. Chat works without tracking. Provider data policies apply.'}</p>
   <div className="ghost-log" role="log" aria-live="polite" aria-relevant="additions text">
    {!agent.lines.length&&<p>{zh?'我是晓亨的幽灵馆长。想了解项目，还是让我带你逛逛？':'I’m Xiaoheng’s ghost curator. Ask about a project, or let me show you around.'}</p>}
    {agent.lines.filter(l=>l.text||l.sources.length).map(line=><article className={`ghost-line ${line.role}`} key={line.id}><b>{line.role==='user'?'> YOU':'GHOST'}</b><p>{line.text}</p>{line.sources.length>0&&<div className="ghost-sources">{line.sources.map(s=>s.target?<button key={s.id} onClick={()=>void agent.sourceClick(s)}>{s.title} ↗</button>:<span key={s.id}>{s.title}</span>)}</div>}</article>)}
    {agent.approval&&<div className="ghost-approval"><p>{agent.approval.summary}</p><button onClick={()=>void agent.answerApproval(true)}>{zh?'开始':'Start'}</button><button onClick={()=>void agent.answerApproval(false)}>{zh?'不用了':'No thanks'}</button></div>}
    <div ref={end}/>
   </div>
   <div className="ghost-status" role="status">{agent.status}{agent.busy&&<button onClick={agent.stop}>{zh?'停止':'Stop'}</button>}</div>
   {(import.meta as ImportMeta & {env:{DEV:boolean}}).env.DEV&&<details className="ghost-debug"><summary onClick={()=>setDebug(JSON.stringify(agent.debug(),null,2))}>DEV / Events & targets</summary><pre>{debug}</pre></details>}
  </section>}
  <footer className="os-terminal"><button className="ask-toggle" onClick={()=>agent.setOpen(!agent.open)} aria-expanded={agent.open}>Ask Ghost {agent.approval?'!':'›'}</button><form onSubmit={submit}><input aria-label="Ask Ghost" placeholder={zh?'问我，或让我带你看看…':'Ask, or let me guide you…'} value={message} maxLength={4000} onFocus={()=>agent.setOpen(true)} onChange={e=>setMessage(e.target.value)}/><button type="submit" aria-label={zh?'发送':'Send'}>↵</button></form><time dateTime={now.toISOString()}>{now.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</time></footer>
 </div>;
}
