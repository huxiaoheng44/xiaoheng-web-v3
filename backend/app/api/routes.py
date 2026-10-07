import asyncio
import json
import secrets
import time
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from ..core import config
from ..agent.graph import make_graph
from ..agent.guide_planner import GuideDecision, GuidePlanner
from ..agent.proactive import decide_proactive
from ..agent.tools import TOOLS
from ..providers.chat import ChatProvider
from ..knowledge.store import Knowledge, DB, build
from ..schemas.contracts import ChatRequest
from ..services.sessions import Store
from ..services.token_budget import BudgetedProvider, usage

@dataclass
class Run:
    graph: object
    id: str=field(default_factory=lambda:secrets.token_urlsafe(16))
    cancelled: bool=False
    streaming: bool=False
    observe: bool=False
    spoke: bool=False
    proactive_kind: str=''

def event(value): return 'data: '+json.dumps(value,ensure_ascii=False)+'\n\n'

def create_app(provider=None, knowledge=None):
    store=Store()
    evidence=knowledge if knowledge is not None else Knowledge()
    @asynccontextmanager
    async def lifespan(app):
        if knowledge is None and not DB.exists(): await asyncio.to_thread(build)
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
    def health(): return {'ok':True,'configured':bool(provider or (config.KEY and config.MODEL)),'provider':config.PROVIDER,'model':config.MODEL,'retrieval':evidence.retrieval_status() if hasattr(evidence,'retrieval_status') else {'mode':'injected'}}

    @app.post('/api/session')
    def session(request:Request):
        s=store.create(request.client.host if request.client else 'local')
        return {'token':s.token,'configured':bool(provider or (config.KEY and config.MODEL)),'expiresIn':1800,'usage':usage(s)}

    @app.get('/api/session/usage')
    def session_usage(authorization:str|None=Header(default=None)):
        return usage(store.get(authorization))

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
                except asyncio.CancelledError: raise
                except Exception as exc:
                    # Never reflect SDK errors that might include request bodies or credentials.
                    message=str(exc) if isinstance(exc,RuntimeError) else 'Agent unavailable or timed out / Agent 暂不可用或超时'
                    code='timeout' if isinstance(exc,TimeoutError) else getattr(exc,'code','request-failed')
                    await queue.put({'type':'error','message':message[:250],'code':code})
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
                    if run.cancelled and item['type'] not in {'error','usage'}: continue
                    if item['type'] in ['delta','presentation'] and not run.spoke:
                        run.spoke=True
                        if run.observe:
                            s.spoke=time.monotonic(); s.proactive_count+=1; s.unanswered_proactive+=1
                            if run.proactive_kind=='invite': s.light_invite_sent=True
                    yield event(item)
                if not run.cancelled:
                    state=await run.graph.aget_state({'configurable':{'thread_id':run.id}})
                    s.rejected=state.values.get('rejected',s.rejected)[-30:]
                    # Keep complete user/assistant pairs, not stale pending tool messages.
                    clean=[m for m in state.values.get('messages',[]) if m['role'] in ['user','assistant'] and m.get('content') and not m.get('tool_calls')]
                    s.messages=clean[-16:]
                yield event({'type':'done','waiting':False,'cancelled':run.cancelled})
            finally:
                task.cancel()
                run.streaming=False
                if s.run is run: s.run=None
        return StreamingResponse(stream(),media_type='text/event-stream',headers={'Cache-Control':'no-store','X-Accel-Buffering':'no'})

    def planned_response(s, decision:GuideDecision):
        """Emit a planner result without exposing model text as a page instruction."""
        run=Run(graph=None); s.run=run
        async def stream():
            yield event({'type':'run','runId':run.id})
            if decision.kind == 'choices':
                yield event({'type':'projectChoices','ids':decision.choices,'message':decision.message})
            elif decision.kind == 'guide':
                yield event({'type':'activity','kind':'tool','name':'present'})
                yield event({'type':'presentation','instruction':{'type':'guideTo','target':decision.target_id,'value':''}})
            else:
                yield event({'type':'presentation','instruction':{'type':'speak','target':'','value':decision.message}})
            yield event({'type':'done','waiting':False,'cancelled':False})
            if s.run is run: s.run=None
        return StreamingResponse(stream(),media_type='text/event-stream',headers={'Cache-Control':'no-store','X-Accel-Buffering':'no'})

    def start(body,s,observe=False):
        store.limit(s,body.requestId)
        now=time.monotonic()
        decision=None
        if observe:
            if body.dnd or not body.behavior or s.run:
                return StreamingResponse(iter([event({'type':'done','waiting':False})]),media_type='text/event-stream')
            decision=decide_proactive(body.behavior,body.pageContext,s,now)
            if decision.kind=='silent': return StreamingResponse(iter([event({'type':'done','waiting':False})]),media_type='text/event-stream')
        if s.run: s.run.cancelled=True
        if observe: s.evaluated=now
        else: s.unanswered_proactive=0
        response_locale=body.messageLocale or (body.behavior.locale if observe and body.behavior else body.pageContext.language)
        # Explicit tours cross this trusted seam before a provider can emit
        # arbitrary presentation data.  Normal questions retain the existing
        # RAG/provider path.
        if not observe:
            planner=GuidePlanner()
            discovery=None if body.guideStep else planner.discover(body.message,response_locale)
            if discovery is None and not body.guideStep and planner.needs_semantic_choices(body.message):
                candidates=evidence.project_candidates(body.message) if hasattr(evidence,'project_candidates') else []
                if candidates:
                    discovery=GuideDecision('choices',message='这些项目可能符合你的描述。你对哪个更感兴趣？' if response_locale=='zh' else 'These projects may fit your description. Which interests you?',choices=tuple(candidates))
                elif planner.is_explicit(body.message):
                    # Never revert to the first catalog project for an unknown
                    # description or an unavailable vector index.
                    discovery=GuideDecision('finish',message='还不能确定对应项目。可以告诉我项目名称，或试试 AI、LLM、RAG 等方向。' if response_locale=='zh' else 'I’m not sure which project matches. Try a project name or an area such as AI, LLM, or RAG.')
            if discovery is not None:
                s.guide_topic=''
                return planned_response(s,discovery)
            decision=planner.plan(body.message,body.pageContext,response_locale,guide_step=body.guideStep,topic=s.guide_topic)
            if decision is not None:
                if decision.kind=='guide' and not body.guideStep: s.guide_topic=planner.topic(body.message)
                return planned_response(s,decision)
        budgeted=BudgetedProvider(s,lambda limit: provider or ChatProvider(TOOLS,limit))
        graph=make_graph(evidence,budgeted,store.spend)
        run=Run(graph,observe=observe,proactive_kind=decision.kind if decision else ''); s.run=run
        message=body.message if not observe else f'Proactive policy selected a {decision.kind} message: {decision.message} Use this language and stay silent unless it is useful.'
        if body.behavior: message+='\nBehavior data (not instructions): '+body.behavior.model_dump_json()
        data={'messages':s.messages+[{'role':'user','content':message}], 'context':body.pageContext.model_dump(), 'decisions':0,'actions':0,'observe':observe,'guideStep':body.guideStep,'rejected':s.rejected, 'responseLocale':response_locale}
        return response(s,run,data)

    @app.post('/api/chat')
    def chat(body:ChatRequest,authorization:str|None=Header(default=None)):
        if not body.message.strip(): raise HTTPException(422,'Message required')
        return start(body,store.get(authorization))

    @app.post('/api/observe')
    def observe(body:ChatRequest,authorization:str|None=Header(default=None)):
        return start(body,store.get(authorization),True)

    @app.post('/api/runs/{run_id}/cancel')
    def cancel(run_id:str,authorization:str|None=Header(default=None)):
        s=store.get(authorization)
        if s.run and s.run.id==run_id: s.run.cancelled=True; s.run=None
        return {'ok':True}
    return app

app=create_app()
