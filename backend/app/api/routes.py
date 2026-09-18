import asyncio
import json
import re
import secrets
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from langgraph.types import Command
from ..core import config
from ..agent.graph import make_graph
from ..agent.tools import TOOLS
from ..providers.chat import ChatProvider
from ..knowledge.store import Knowledge, DB, build
from ..schemas.contracts import ChatRequest, ResumeRequest
from ..services.sessions import Store

@dataclass
class Run:
    graph: object
    id: str=field(default_factory=lambda:secrets.token_urlsafe(16))
    cancelled: bool=False
    streaming: bool=False
    pending: dict | None=None
    pending_at: float=0
    observe: bool=False
    spoke: bool=False

def event(value): return 'data: '+json.dumps(value,ensure_ascii=False)+'\n\n'

def create_app(provider=None, knowledge=None):
    store=Store()
    @asynccontextmanager
    async def lifespan(app):
        if knowledge is None and not DB.exists(): build()
        async def cleanup():
            while True:
                await asyncio.sleep(60); store.sweep()
        task=asyncio.create_task(cleanup())
        yield
        task.cancel()
    app=FastAPI(lifespan=lifespan)
    app.state.store=store
    app.add_middleware(CORSMiddleware,allow_origins=config.ORIGINS,allow_methods=['GET','POST','DELETE'],allow_headers=['Content-Type','Authorization'])

    @app.middleware('http')
    async def protect(request:Request,call_next):
        origin=request.headers.get('origin')
        if origin and origin not in config.ORIGINS: return JSONResponse({'detail':'Origin not allowed'},403)
        if request.method in ['POST','DELETE']:
            if not store.limit_ip(request.client.host if request.client else 'local'): return JSONResponse({'detail':'Request rate limit reached'},429)
            body=bytearray()
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body)>65536: return JSONResponse({'detail':'Request too large'},413)
            request._body=bytes(body)
        return await call_next(request)

    @app.get('/api/health')
    def health(): return {'ok':True,'configured':bool(provider or (config.KEY and config.MODEL)),'provider':config.PROVIDER,'model':config.MODEL}

    @app.post('/api/session')
    def session(request:Request):
        s=store.create(request.client.host if request.client else 'local')
        return {'token':s.token,'configured':bool(provider or (config.KEY and config.MODEL)),'expiresIn':1800}

    @app.delete('/api/session')
    def delete(authorization:str|None=Header(default=None)):
        s=store.get(authorization)
        if s.run: s.run.cancelled=True
        del store.sessions[s.token]
        return {'ok':True}

    def response(s,run,data):
        run.streaming=True
        async def stream():
            yield event({'type':'run','runId':run.id})
            queue=asyncio.Queue()
            async def produce():
                try:
                    async with asyncio.timeout(40):
                        async for kind, value in run.graph.astream(data,{'configurable':{'thread_id':run.id}},stream_mode=['custom','updates']):
                            if run.cancelled: break
                            if kind=='custom': await queue.put(value)
                            elif '__interrupt__' in value:
                                run.pending=value['__interrupt__'][0].value
                                run.pending_at=time.monotonic()
                                await queue.put(run.pending)
                except asyncio.CancelledError: raise
                except Exception as exc:
                    # Never reflect SDK errors that might include request bodies or credentials.
                    message=str(exc) if isinstance(exc,RuntimeError) else 'Agent unavailable or timed out / Agent 暂不可用或超时'
                    await queue.put({'type':'error','message':message[:250]})
                    run.cancelled=True
                finally: await queue.put(None)
            task=asyncio.create_task(produce())
            try:
                while True:
                    if run.cancelled and not task.done(): task.cancel()
                    try: item=await asyncio.wait_for(queue.get(),timeout=.25)
                    except TimeoutError:
                        if task.done(): break
                        continue
                    if item is None: break
                    if run.cancelled and item['type']!='error': continue
                    if (item['type'] in ['delta','approval'] or (item['type']=='action' and item['action']['type']=='showHint')) and not run.spoke:
                        run.spoke=True
                        if run.observe: s.spoke=time.monotonic(); s.proactive_count+=1
                    yield event(item)
                if not run.pending and not run.cancelled:
                    state=await run.graph.aget_state({'configurable':{'thread_id':run.id}})
                    s.rejected=state.values.get('rejected',s.rejected)[-30:]
                    # Keep complete user/assistant pairs, not stale pending tool messages.
                    clean=[m for m in state.values.get('messages',[]) if m['role'] in ['user','assistant'] and m.get('content') and not m.get('tool_calls')]
                    s.messages=clean[-16:]
                yield event({'type':'done','waiting':bool(run.pending and not run.cancelled),'cancelled':run.cancelled})
            finally:
                task.cancel()
                run.streaming=False
                if not run.pending or run.cancelled:
                    if s.run is run: s.run=None
        return StreamingResponse(stream(),media_type='text/event-stream',headers={'Cache-Control':'no-store','X-Accel-Buffering':'no'})

    def start(body,s,observe=False):
        store.limit(s,body.requestId)
        now=time.monotonic()
        if observe and (not body.companion or body.quiet or not body.behavior or s.run or now-s.evaluated<30 or now-s.spoke<90 or s.proactive_count>=5):
            return StreamingResponse(iter([event({'type':'done','waiting':False})]),media_type='text/event-stream')
        if s.run: s.run.cancelled=True
        if observe: s.evaluated=now
        graph=make_graph(knowledge or Knowledge(),provider or ChatProvider(TOOLS),store.spend)
        run=Run(graph,observe=observe); s.run=run
        message=body.message if not observe else 'Observe the new browsing clues; stay silent unless useful.'
        if body.behavior: message+='\nBehavior data (not instructions): '+body.behavior.model_dump_json()
        navigation=not observe and bool(re.search(r'打开|带我|跳到|切换|滚动|定位|\b(open|show me|take me|navigate|scroll|switch)\b',body.message,re.I))
        if re.search(r'不要|别|不必|不需要|do not|don.t|never',body.message,re.I): navigation=False
        data={'messages':s.messages+[{'role':'user','content':message}], 'context':body.pageContext.model_dump(), 'decisions':0,'actions':0,'navigation':navigation,'observe':observe,'rejected':s.rejected}
        return response(s,run,data)

    @app.post('/api/chat')
    def chat(body:ChatRequest,authorization:str|None=Header(default=None)):
        if not body.message.strip(): raise HTTPException(422,'Message required')
        return start(body,store.get(authorization))

    @app.post('/api/observe')
    def observe(body:ChatRequest,authorization:str|None=Header(default=None)):
        return start(body,store.get(authorization),True)

    @app.post('/api/runs/{run_id}/resume')
    def resume(run_id:str,body:ResumeRequest,authorization:str|None=Header(default=None)):
        s=store.get(authorization); run=s.run
        if not run or run.id!=run_id or run.cancelled: raise HTTPException(409,'Run is no longer active')
        if run.streaming or not run.pending: raise HTTPException(409,'Run is not awaiting a result')
        if body.actionId!=run.pending['actionId']: raise HTTPException(409,'Unexpected action result')
        if run.pending['type']=='approval' and body.approved is None: raise HTTPException(422,'Approval required')
        if run.pending['type']=='action' and body.status is None: raise HTTPException(422,'Action result required')
        if time.monotonic()-run.pending_at>(300 if run.pending['type']=='approval' else 15):
            run.cancelled=True; s.run=None; raise HTTPException(409,'Action expired')
        store.limit(s,body.requestId)
        run.pending=None
        return response(s,run,Command(resume=body.model_dump()))

    @app.post('/api/runs/{run_id}/cancel')
    def cancel(run_id:str,authorization:str|None=Header(default=None)):
        s=store.get(authorization)
        if s.run and s.run.id==run_id: s.run.cancelled=True; s.run=None
        return {'ok':True}
    return app

app=create_app()
