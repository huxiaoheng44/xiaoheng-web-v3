import type { Language } from '../../model';
import type { ActivitySafeSummary } from './activity';

export function ActivityPanel({language,summary}:{language:Language;summary:ActivitySafeSummary}){
 const zh=language==='zh';const label=(target:{en:string;zh:string})=>zh?target.zh:target.en;
 return <section id="agent-activity-panel" className="agent-activity-panel" aria-label={zh?'CRT.AGENT 活动摘要':'CRT.AGENT activity summary'}>
  <p className="activity-state">{zh?'状态':'State'}: <strong>{summary.state}</strong></p>
  <ActivityList title={zh?'近期语义观察':'Recent semantic observations'} items={summary.observations.map(item=>`${item.type} · ${item.target}`)}/>
  <ActivityList title={zh?'当前可见目标':'Visible targets'} items={summary.targets.map(target=>`${label(target)} · ${target.id}`)}/>
  <ActivityList title={zh?'允许的展示动作':'Allowed display actions'} items={summary.allowedActions}/>
  <ActivityList title={zh?'已使用工具':'Tools used'} items={summary.tools}/>
  <div><h3>{zh?'来源':'Sources'}</h3>{summary.sources.length?<ul>{summary.sources.map((source,index)=><li key={`${source.title}-${index}`}>{source.url?<a href={source.url} target="_blank" rel="noreferrer">{source.title}</a>:source.title}</li>)}</ul>:<p>{zh?'尚无来源。':'No sources yet.'}</p>}</div>
 </section>;
}
function ActivityList({title,items}:{title:string;items:string[]}){return <div><h3>{title}</h3>{items.length?<ul>{items.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul>:<p>—</p>}</div>}
