import type { AgentEvent } from './GhostChat';
const base=(import.meta as ImportMeta & {env:Record<string,string>}).env.VITE_GHOST_API_URL||'';
export class GhostTransport {
  token=''; configured=false;
  async session(signal?:AbortSignal){if(import.meta.env.VITE_GHOST_STATIC_MODE==='true')throw new Error('AI chat is offline on this preview. Please explore the folders. / 当前为静态展示版，AI 后端尚未部署，请直接浏览文件夹。');if(this.token)return;const r=await fetch(`${base}/api/session`,{method:'POST',signal});if(!r.ok)throw new Error('Ghost server unavailable / 后端未连接');const data=await r.json();this.token=data.token;this.configured=data.configured;}
  async request(path:string,body?:unknown,signal?:AbortSignal,method='POST'){
    await this.session(signal);
    const r=await fetch(`${base}/api${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${this.token}`},body:body===undefined?undefined:JSON.stringify(body),signal});
    if(!r.ok){if(r.status===401)this.token='';let detail='Ghost unavailable / 服务暂不可用';try{const d=await r.json();if(typeof d.detail==='string')detail=d.detail;}catch{}throw new Error(detail);}
    return r;
  }
  async *stream(path:string,body:unknown,signal:AbortSignal):AsyncGenerator<AgentEvent>{
    const response=await this.request(path,body,signal);if(!response.body)throw new Error('Missing stream');
    const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';
    try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true}).replace(/\r/g,'');let boundary;while((boundary=buffer.indexOf('\n\n'))>=0){const packet=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);const data=packet.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trim()).join('\n');if(data)yield JSON.parse(data) as AgentEvent;}}}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  }
  cancel(id:string){if(this.token)return this.request(`/runs/${encodeURIComponent(id)}/cancel`).catch(()=>{});}
  async clear(){if(this.token)await this.request('/session',undefined,undefined,'DELETE').catch(()=>{});this.token='';}
}
