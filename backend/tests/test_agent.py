import json
import time
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.main import create_app
from backend.app.knowledge.store import Knowledge, build, records
from backend.app.core.config import ROOT
from backend.app.schemas.contracts import ChatRequest, PresentationInstruction
from backend.app.agent.guide_planner import GuidePlanner

CTX={'language':'zh','contextVersion':0,'activeWindow':None,'windows':[],'aboutTab':'profile','targets':[{'id':'folder:projects','available':True,'guideable':True,'capabilities':['highlight','guideTo'],'names':{'en':'Projects','zh':'项目'}}]}
def body(message='你好',**kwargs): return {'requestId':str(uuid.uuid4()),'message':message,'pageContext':CTX,**kwargs}
def semantic_behavior(events=None,dnd=False): return {'route':'desktop','window':None,'activePanel':'','locale':'zh','dnd':dnd,'proactiveCount':0,'events':events or [],'idleSeconds':20}
def events(response):
    assert response.status_code==200,response.text
    return [json.loads(line[6:]) for line in response.text.splitlines() if line.startswith('data: ')]

class Fake:
    def __init__(self,mode='open'): self.mode=mode;self.seen=[]
    async def complete(self,messages,emit):
        self.seen.append(messages)
        if messages[-1]['role']=='tool':
            emit({'type':'delta','text':'已完成' if 'success' in messages[-1]['content'] else '已收到结果'})
            return {'role':'assistant','content':'Finished after tool result.'}
        if self.mode=='silent':return {'role':'assistant','content':None}
        if self.mode=='search':name='searchKnowledge';args={'query':'drone PX4 控制'}
        else:
            name='present';args={'actions':[{'type':'highlight','target':'folder:projects','value':''}]}
        return {'role':'assistant','content':None,'tool_calls':[{'id':'call1','type':'function','function':{'name':name,'arguments':json.dumps(args)}}]}

@pytest.fixture
def knowledge(tmp_path):
    db=tmp_path/'kb.sqlite';build(db=db);return Knowledge(db)

def login(client):return {'Authorization':'Bearer '+client.post('/api/session').json()['token']}

def test_knowledge_allowlist(knowledge):
    assert knowledge.search('无人机 PX4')
    rows=list(records())
    assert any(r['source'] == 'content/html/zh/drone.html' for r in rows)
    assert not any(r['source'].endswith('/index.html') or r['source'] == 'knowledge/README.md' for r in rows)

def test_chat_emits_only_validated_presentation(knowledge):
    fake=Fake();app=create_app(fake,knowledge)
    with TestClient(app) as client:
        h=login(client);ev=events(client.post('/api/chat',json=body('打开无人机项目'),headers=h))
        presentation=next(e for e in ev if e['type']=='presentation')
        assert presentation['instruction']=={'type':'highlight','target':'folder:projects','value':''}
        assert not any(e['type'] in {'action','approval'} for e in ev)

@pytest.mark.parametrize('message', ['带我看 AI 项目', 'Show me AI projects'])
def test_explicit_project_tour_has_trusted_desktop_fallback(knowledge,message):
    # A provider may answer in prose and omit tools; the planner must still
    # provide the one safe, registered entry point.
    with TestClient(create_app(Fake('silent'),knowledge)) as client:
        h=login(client);ev=events(client.post('/api/chat',json=body(message),headers=h))
        assert [e['instruction'] for e in ev if e['type']=='presentation']==[{'type':'guideTo','target':'folder:projects','value':''}]

def test_guide_planner_rejects_invalid_or_plural_provider_candidates():
    planner=GuidePlanner();context=ChatRequest.model_validate(body()).pageContext
    assert planner.plan('有哪些 AI 项目',context,'zh') is None
    assert planner.from_candidate_ids(context,'zh',['unknown']).kind=='finish'
    assert planner.from_candidate_ids(context,'zh',['folder:projects','unknown']).kind=='finish'
    hidden=context.model_copy(update={'targets':[context.targets[0].model_copy(update={'guideable':False})]})
    assert planner.from_candidate_ids(hidden,'zh',['folder:projects']).kind=='finish'
    assert planner.plan('带我看项目',context,'zh',candidate_ids=[]).kind=='finish'

def test_guide_planner_continues_only_with_registered_collection_cards():
    planner=GuidePlanner()
    collection=ChatRequest.model_validate({**body(), 'pageContext':{**CTX,'activeWindow':'projects','activePanel':'collection','targets':[
        {'id':'project-card:fast-ai-movie','available':True,'guideable':True,'capabilities':['highlight','guideTo'],'names':{'en':'FAST AI Movie Web','zh':'FAST AI 电影网站'},'projectId':'fast-ai-movie'},
        {'id':'project-card:unavailable','available':True,'guideable':False,'capabilities':['highlight','guideTo'],'names':{'en':'Unavailable','zh':'不可用'},'projectId':'unavailable'},
    ]}}).pageContext
    assert planner.plan('completed folder',collection,'en',guide_step=True).target_id=='project-card:fast-ai-movie'

def test_guide_planner_matches_coarse_ai_topic_only_against_registered_metadata():
    planner=GuidePlanner();assert planner.topic('带我看 AI 项目')=='ai'
    context=ChatRequest.model_validate({**body(), 'pageContext':{**CTX,'activeWindow':'projects','activePanel':'collection','targets':[
        {'id':'project-card:3d','available':True,'guideable':True,'capabilities':['guideTo'],'names':{'en':'Stereo 3D','zh':'立体视觉'}},
        {'id':'project-card:fast-ai-movie','available':True,'guideable':True,'capabilities':['guideTo'],'names':{'en':'FAST AI Movie Web','zh':'AI 电影'}},
    ]}}).pageContext
    assert planner.plan('completed',context,'zh',guide_step=True,topic='ai').target_id=='project-card:fast-ai-movie'

def test_unavailable_targets_are_not_emitted(knowledge):
    with TestClient(create_app(Fake(),knowledge)) as client:
        h=login(client)
        unavailable={**CTX,'targets':[{'id':'folder:projects','available':False,'capabilities':['highlight','guideTo'],'names':{'en':'Projects','zh':'项目'}}]}
        ev=events(client.post('/api/observe',json={**body(behavior=semantic_behavior()), 'pageContext':unavailable},headers=h))
        assert not any(e['type']=='presentation' for e in ev)

def test_search_and_session_isolation(knowledge):
    with TestClient(create_app(Fake('search'),knowledge)) as client:
        h=login(client);other=login(client)
        ev=events(client.post('/api/chat',json=body('介绍无人机'),headers=h))
        assert any(e['type']=='source' for e in ev)
        assert client.post('/api/chat',json=body()).status_code==401
        client.delete('/api/session',headers=h)
        assert client.post('/api/chat',json=body(),headers=h).status_code==401
        assert client.post('/api/chat',json=body(),headers=other).status_code==200

def test_semantic_behavior_contract_and_validation(knowledge):
    assert ChatRequest.model_validate(body(behavior=semantic_behavior())).behavior is not None
    with pytest.raises(ValueError):ChatRequest.model_validate(body(behavior={**semantic_behavior(),'trajectory':[]}))
    with pytest.raises(ValueError):PresentationInstruction.model_validate({'type':'openProject','target':'projects','value':''})
    assert PresentationInstruction.model_validate({'type':'guideTo','target':'folder:projects','value':''}).type == 'guideTo'
    with TestClient(create_app(Fake('silent'),knowledge)) as client:
        h=login(client);b=body()
        assert events(client.post('/api/observe',json=b,headers=h))==[{'type':'done','waiting':False}]
        assert client.post('/api/observe',json=b,headers=h).status_code==409
        assert client.post('/api/chat',content='x'*65537,headers=h).status_code==413
        assert client.post('/api/session',headers={'origin':'https://evil.invalid'}).status_code==403

def test_missing_key_and_cancel(knowledge,monkeypatch):
    from backend.app.core import config
    monkeypatch.setattr(config,'KEY','')
    with TestClient(create_app(knowledge=knowledge)) as client:
        h=login(client);ev=events(client.post('/api/chat',json=body(),headers=h))
        assert any(e['type']=='error' and 'configured' in e['message'] for e in ev)
    with TestClient(create_app(Fake(),knowledge)) as client:
        h=login(client);ev=events(client.post('/api/chat',json=body('打开项目'),headers=h));rid=ev[0]['runId']
        client.post(f'/api/runs/{rid}/cancel',headers=h)
        assert client.post(f'/api/runs/{rid}/resume',headers=h).status_code==404

def test_expiration(knowledge):
    app=create_app(Fake(),knowledge)
    with TestClient(app) as client:
        h=login(client);next(iter(app.state.store.sessions.values())).touched=time.monotonic()-1801
        assert client.post('/api/chat',json=body(),headers=h).status_code==401

def test_proactive_cooldown_and_dnd(knowledge):
    fake=Fake('silent');app=create_app(fake,knowledge)
    with TestClient(app) as client:
        h=login(client)
        session=next(iter(app.state.store.sessions.values()));session.evaluated=-1e9
        session.created=time.monotonic()-31
        payload=dict(behavior=semantic_behavior())
        events(client.post('/api/observe',json=body(**payload),headers=h));assert len(fake.seen)==1
        events(client.post('/api/observe',json=body(**payload,dnd=True),headers=h));assert len(fake.seen)==1
        session.proactive_count=2
        events(client.post('/api/observe',json=body(**payload),headers=h));assert len(fake.seen)==1

def test_proactive_policy_requires_interest_and_honors_budget_dnd_and_cooldown():
    from types import SimpleNamespace
    from backend.app.agent.proactive import decide_proactive
    from backend.app.schemas.contracts import Behavior, PageContext
    now=100.; session=SimpleNamespace(created=0.,spoke=-1e9,proactive_count=0,unanswered_proactive=0,light_invite_sent=True)
    context=PageContext.model_validate({**CTX,'targets':[{'id':'project:drone-simulator','available':True,'capabilities':['highlight'],'names':{'en':'Drone Simulator','zh':'无人机仿真与控制'},'projectId':'drone-simulator'}]})
    no_interest=Behavior.model_validate(semantic_behavior())
    assert decide_proactive(no_interest,context,session,now).kind=='silent'
    interested=Behavior.model_validate(semantic_behavior([{'type':'dwell','target':'project:drone-simulator','projectId':'drone-simulator','duration':5}]))
    assert decide_proactive(interested,context,session,now).kind=='recommendation'
    assert decide_proactive(Behavior.model_validate(semantic_behavior(dnd=True)),context,session,now).kind=='silent'
    session.proactive_count=2;assert decide_proactive(interested,context,session,now).kind=='silent'
    session.proactive_count=0;session.spoke=20.;assert decide_proactive(interested,context,session,now).kind=='silent'

def test_resume_endpoint_is_removed(knowledge):
    with TestClient(create_app(Fake(),knowledge)) as client:
        h=login(client);other=login(client)
        rid=events(client.post('/api/chat',json=body('只介绍'),headers=h))[0]['runId']
        assert client.post(f'/api/runs/{rid}/resume',headers=other).status_code==404

def test_public_extra_requires_explicit_approval(tmp_path):
    import shutil
    (tmp_path/'content').mkdir(parents=True);(tmp_path/'knowledge').mkdir()
    shutil.copytree(ROOT/'content/html',tmp_path/'content/html',ignore=shutil.ignore_patterns('assets'))
    (tmp_path/'knowledge/private.md').write_text('Not approved: private canary',encoding='utf-8')
    (tmp_path/'knowledge/public.md').write_text('---\npublic: true\n---\n## Public FAQ\nApproved canary.',encoding='utf-8')
    rows=list(records(tmp_path))
    assert any('Approved canary' in r['text'] for r in rows)
    assert not any('private canary' in r['text'] for r in rows)
