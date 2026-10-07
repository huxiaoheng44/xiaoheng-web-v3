import type { AgentEvent, TokenUsage } from './MontyChat';
const base=(import.meta as ImportMeta & {env:Record<string,string>}).env.VITE_MONTY_API_URL||'';
export class MontyRequestError extends Error {
  constructor(public readonly code:string, public readonly status=0) { super(code); }
}
function retryDelay(ms:number,signal?:AbortSignal) {
  return new Promise<void>((resolve,reject)=>{
    signal?.throwIfAborted();
    const aborted=()=>{clearTimeout(timer);reject(signal?.reason);};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',aborted);resolve();},ms);
    signal?.addEventListener('abort',aborted,{once:true});
  });
}
export class MontyTransport {
  token=''; configured=false; usage:TokenUsage|null=null;
  async session(signal?:AbortSignal){
    if(import.meta.env.VITE_MONTY_STATIC_MODE==='true')throw new MontyRequestError('Monty is offline on this preview');
    if(this.token)return;
    const r=await fetch(`${base}/api/session`,{method:'POST',signal});
    if(!r.ok)throw new MontyRequestError('http',r.status);
    const data=await r.json();this.token=data.token;this.configured=data.configured;this.usage=data.usage??null;
  }
  async request(path:string,body?:unknown,signal?:AbortSignal,method='POST'){
    const recoverable=path==='/chat'||path==='/observe';
    let renewed=false;
    for(let attempt=0;;){
      signal?.throwIfAborted();
      try {
        await this.session(signal);
        const r=await fetch(`${base}/api${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.token}`},body:body===undefined?undefined:JSON.stringify(body),signal});
        if(r.ok)return r;
        await r.body?.cancel();
        if(r.status===401){
          this.token='';
          if(recoverable&&!renewed){
            // A renewed session has lost the server's tour goal; never silently
            // resume a continuation with a different default project.
            if(body&&typeof body==='object'&&'guideStep' in body&&body.guideStep)throw new MontyRequestError('guide-expired');
            renewed=true;continue;
          }
        }
        throw new MontyRequestError('http',r.status);
      } catch(error) {
        if(signal?.aborted)throw error;
        const transient=error instanceof TypeError||(error instanceof MontyRequestError&&[408,500,502,503,504].includes(error.status));
        if(!recoverable||!transient||attempt>=2)throw error;
        // Reuse the request ID: if the server already accepted the request,
        // its 409 duplicate response prevents a second model run or page cue.
        await retryDelay([800,1600][attempt++],signal);
      }
    }
  }
  async *stream(path:string,body:unknown,signal:AbortSignal):AsyncGenerator<AgentEvent>{
    const response=await this.request(path,body,signal);
    if(!response.body)throw new MontyRequestError('interrupted');
    const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';let completed=false;
    try {
      while(true){
        const {done,value}=await reader.read();if(done)break;
        buffer+=decoder.decode(value,{stream:true}).replace(/\r/g,'');let boundary;
        while((boundary=buffer.indexOf('\n\n'))>=0){
          const packet=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);
          const data=packet.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('\n');
          if(data){const event=JSON.parse(data) as AgentEvent;if(event.type==='done')completed=true;yield event;if(completed)return;}
        }
      }
      if(!completed&&!signal.aborted)throw new MontyRequestError('interrupted');
    } finally {await reader.cancel().catch(()=>{});reader.releaseLock();}
  }
  async quota(signal?:AbortSignal){const response=await this.request('/session/usage',undefined,signal,'GET');this.usage=await response.json();return this.usage;}
  cancel(id:string){if(this.token)return this.request(`/runs/${encodeURIComponent(id)}/cancel`).catch(()=>{});}
  async clear(){if(this.token)await this.request('/session',undefined,undefined,'DELETE').catch(()=>{});this.token='';this.usage=null;}
}

export function requestFailureMessage(error:unknown,locale:'zh'|'en') {
  const zh=locale==='zh';
  const failure=error instanceof MontyRequestError?error:null;
  if(failure?.code==='Monty is offline on this preview')return zh?'当前是静态预览，尚未连接 Monty 后端。':'This is a static preview; Monty’s backend is not connected.';
  if(failure?.code==='budget')return zh?'本次会话的回复额度已用完，仍可查看聊天记录和浏览项目。':'This session’s reply allowance is used up. You can still read the history and explore projects.';
  if(failure?.code==='guide-expired')return zh?'导览会话已过期，请重新告诉我想看哪个项目。':'The tour session expired. Please tell me which project you would like to see again.';
  if(failure?.status===429||failure?.code==='rate-limit')return zh?'请求有点多，请稍后再试。':'Too many requests. Please try again shortly.';
  if(failure?.code==='timeout')return zh?'这次回复等待超时了，请再试一次。':'This reply took too long. Please try again.';
  if(failure?.code==='configuration')return zh?'模型服务配置有问题，请联系站点维护者。':'The model service needs configuration. Please contact the site owner.';
  if(failure?.code==='interrupted'||failure?.status===409)return zh?'这次回复中断了，你可以重新发送问题。':'This reply was interrupted. You can send your question again.';
  if(error instanceof TypeError||failure?.code==='connection'||[408,500,502,503,504].includes(failure?.status??0))return zh?'连接暂时不稳定，请稍后再试。':'The connection is temporarily unstable. Please try again shortly.';
  return zh?'这次请求未能完成，请再试一次。':'This request could not be completed. Please try again.';
}
