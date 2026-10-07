import type { Language } from '../../model';
import { useAgent } from './MontyContext';
import { ActivityPanel } from './ActivityPanel';

export function MontySettings({language}:{language:Language}){
 const agent=useAgent();const zh=language==='zh';
 return <section className="monty-settings" data-agent-ui aria-label={zh?'Monty 设置':'Monty settings'}>
  <h2>{zh?'设置':'Settings'}</h2>
  <label><input type="checkbox" aria-label={zh?'Monty 免打扰':'Monty do not disturb'} checked={agent.dnd} onChange={event=>agent.setDnd(event.target.checked)}/>{zh?'免打扰':'Do not disturb'}</label>
  <button onClick={()=>void agent.clear()}>{zh?'清空本次会话':'Clear this session'}</button>
  <p>{import.meta.env.VITE_MONTY_STATIC_MODE==='true'?(zh?'展示版：AI 暂未上线，不发送浏览数据。':'Preview: AI is offline. No browsing data is sent.'):(zh?'仅在本次会话中使用语义浏览摘要；刷新后重置。':'A semantic browsing summary is used only for this session and resets on refresh.')}</p>
  <details><summary>{zh?'会话活动':'Session activity'}</summary><ActivityPanel language={agent.activityLocale} summary={agent.activity}/></details>
 </section>;
}
