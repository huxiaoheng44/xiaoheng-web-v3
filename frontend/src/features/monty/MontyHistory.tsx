import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Language } from '../../model';
import { useAgent } from './MontyContext';
import { ActivityPanel } from './ActivityPanel';

const toolNames = {
  searchKnowledge: { en: 'Searched the knowledge base', zh: '检索知识库' },
  readKnowledge: { en: 'Read a source', zh: '阅读资料' },
  present: { en: 'Presented guidance', zh: '展示导览提示' },
};

export function MontyHistory({language,visible}:{language:Language;visible:boolean}) {
  const agent=useAgent();const zh=language==='zh';
  const root=useRef<HTMLDivElement>(null);const followLatest=useRef(true);
  useEffect(()=>{const scroller=root.current?.closest('.content-scroll');if(!scroller)return;const track=()=>{followLatest.current=scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<60;};scroller.addEventListener('scroll',track,{passive:true});return()=>scroller.removeEventListener('scroll',track);},[]);
  useLayoutEffect(()=>{const scroller=root.current?.closest('.content-scroll');if(visible&&scroller&&followLatest.current)scroller.scrollTop=scroller.scrollHeight;},[visible,agent.lines,agent.busy]);
  useEffect(()=>{if(visible)void agent.refreshUsage();},[visible,agent.busy]);
  const lines=agent.lines.filter(line=>line.role==='user'||line.text||line.steps.length||line.activity.length||line.sources.length);
  return <div ref={root} className="monty-history" data-agent-ui>
    <div className="monty-history-intro"><span>{zh?'对话记录':'CONVERSATION LOG'}</span><p>{zh?'保留本次页面会话的全部记录；刷新或清空会话后重置。':'All messages from this page session. Resets when you refresh or clear the session.'}</p></div>
    {!lines.length&&<p className="monty-history-empty">{zh?'还没有聊天记录。在下方输入框和 Monty 打个招呼吧。':'No messages yet. Say hello to Monty in the command bar below.'}</p>}
    <ol className="monty-history-lines" aria-label={zh?'聊天记录':'Chat history'}>
      {lines.map(line=><li key={line.id} className={`history-line history-${line.role}`}>
        {line.role!=='user'&&<span className="monty-sprite history-avatar" aria-hidden="true"/>}<div className="history-bubble">
        <header><strong>{line.role==='user'?(zh?'你':'YOU'):'MONTY'}</strong><time dateTime={new Date(line.createdAt).toISOString()}>{new Date(line.createdAt).toLocaleTimeString(zh?'zh-CN':'en-GB',{hour:'2-digit',minute:'2-digit'})}</time></header>
        {line.text&&<p>{line.text}</p>}
        {!!line.steps.length&&<ol className="history-guide-steps">{line.steps.map((step,index)=><li key={index}>{step}</li>)}</ol>}
        {!!line.sources.length&&<div className="history-sources"><span>{zh?'来源':'Sources'}</span>{line.sources.map(source=>source.url?<a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a>:<span key={source.id}>{source.title}</span>)}</div>}
        {!!line.activity.length&&<details className="history-tools"><summary>{zh?'本次回复的活动':'Activity for this reply'}</summary><ul>{line.activity.map((tool,index)=><li key={index}>{toolNames[tool as keyof typeof toolNames]?.[language]??tool}</li>)}</ul></details>}
      </div></li>)}
    </ol>
    {agent.busy&&<p className="history-pending" role="status">{zh?'Monty 正在回复…':'Monty is replying…'}</p>}
    <details className="history-observations"><summary>{zh?'当前会话活动摘要':'Current session activity'}</summary><ActivityPanel language={language} summary={agent.activity}/></details>
  </div>;
}

export function MontyUsage({language}:{language:Language}) {
  const {usage}=useAgent();const zh=language==='zh';
  const format=(value:number)=>value.toLocaleString(zh?'zh-CN':'en-US');
  return <footer className="monty-history-footer" data-agent-ui>
    <span>{zh?'仅本次会话':'THIS SESSION'}</span>
    <span className="monty-token-balance" title={zh?'仅计算模型生成的回复 token，包含推理；不包含输入 token。用量缺失时按预留额度计入。':'Reply tokens, including reasoning; excludes input tokens. Missing usage is charged at the reserved allowance.'}>
      {usage?<>{usage.estimated?'≈ ':''}{format(usage.remaining)} / {format(usage.limit)} {zh?'回复 token 剩余':'reply tokens left'}{usage.reserved>0&&<small> · {zh?'回复中':'in progress'}</small>}</>:<>{zh?'回复额度：暂无数据':'Reply allowance: no data yet'}</>}
    </span>
  </footer>;
}
