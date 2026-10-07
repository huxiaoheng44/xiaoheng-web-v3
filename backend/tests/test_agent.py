import json
import time
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.main import create_app
from backend.app.knowledge.store import Knowledge, build, records
from backend.app.core.config import ROOT
from backend.app.schemas.contracts import ChatRequest, PresentationInstruction
from backend.app.agent.guide_planner import CATALOG, GuidePlanner

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
    db=tmp_path/'kb.sqlite';build(db=db, semantic=False);return Knowledge(db)

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
        assert next(e for e in ev if e['type']=='projectChoices')['ids']
        assert not any(e['type']=='presentation' for e in ev)

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

@pytest.mark.parametrize('message', ['带我看 AI 项目', 'Show me AI projects'])
def test_tour_can_start_inside_open_projects(message):
    context=ChatRequest.model_validate({**body(), 'pageContext':{**CTX,'activeWindow':'projects','activePanel':'collection','targets':[
        {'id':'project-card:fast-ai-movie','available':False,'guideable':True,'capabilities':['guideTo'],'names':{'en':'FAST AI Movie Web','zh':'FAST AI 视频编辑平台'}},
    ]}}).pageContext
    assert GuidePlanner().plan(message,context,'zh').target_id=='project-card:fast-ai-movie'

def test_full_stack_tour_does_not_choose_alphabetically_first_project():
    planner=GuidePlanner()
    context=ChatRequest.model_validate({**body(), 'pageContext':{**CTX,'activeWindow':'projects','activePanel':'collection','targets':[
        {'id':f'project-card:{id}','available':True,'guideable':True,'capabilities':['guideTo'],'names':{'en':id,'zh':id}}
        for id in ['3d-reconstruction','fast-ai-movie']
    ]}}).pageContext
    assert planner.plan('completed',context,'en',guide_step=True,topic=planner.topic('Show me full-stack projects')).target_id=='project-card:fast-ai-movie'

@pytest.mark.parametrize('project', CATALOG)
def test_each_catalog_project_routes_from_desktop_through_collection_to_detail(project):
    planner=GuidePlanner();question=f"Show me {project['id']}"
    assert planner.plan(question,ChatRequest.model_validate(body()).pageContext,'en').target_id=='folder:projects'
    context=ChatRequest.model_validate({**body(), 'pageContext':{**CTX,'activeWindow':'projects','activePanel':'collection','targets':[
        {'id':f"project-card:{project['id']}",'available':False,'guideable':True,'capabilities':['guideTo'],'names':{'en':project['id'],'zh':project['id']}}
    ]}}).pageContext
    assert planner.plan('completed',context,'zh',guide_step=True,topic=planner.topic(question)).target_id==f"project-card:{project['id']}"
    result=planner.plan('completed',context.model_copy(update={'activeWindow':f"project:{project['id']}",'activePanel':'detail','targets':[]}),'zh',guide_step=True,topic=planner.topic(question))
    assert result.kind=='finish' and '已到达' in result.message
    for locale in ['en','zh']:
        arrived=planner.plan('completed',context.model_copy(update={'activeWindow':f"project:{project['id']}",'activePanel':'detail','targets':[]}),locale,guide_step=True,topic=planner.topic(question))
        PresentationInstruction(type='speak',value=arrived.message)

def test_unmatched_topic_does_not_fall_back_to_unrelated_card():
    planner=GuidePlanner()
    context=ChatRequest.model_validate({**body(), 'pageContext':{**CTX,'activeWindow':'projects','activePanel':'collection','targets':[
        {'id':'project-card:3d-reconstruction','available':True,'guideable':True,'capabilities':['guideTo'],'names':{'en':'3D','zh':'三维'}}
    ]}}).pageContext
    assert planner.plan('Show me full-stack projects',context,'en').kind=='finish'

def test_session_usage_is_authorized_and_guidance_does_not_spend_tokens(knowledge):
    app=create_app(Fake('silent'),knowledge)
    with TestClient(app) as client:
        assert client.get('/api/session/usage').status_code==401
        h=login(client)
        before=client.get('/api/session/usage',headers=h).json()
        assert before['used']==0 and before['remaining']==before['limit']
        events(client.post('/api/chat',json=body('带我看 AI 项目'),headers=h))
        assert client.get('/api/session/usage',headers=h).json()==before
        ev=events(client.post('/api/chat',json=body('你好'),headers=h))
        assert any(e['type']=='usage' and e['usage']['used']>0 for e in ev)
        assert client.get('/api/session/usage',headers=h).json()['remaining']<before['remaining']

@pytest.mark.parametrize('window',['about','contact','monty-history','project:drone-simulator'])
def test_tour_first_guides_minimizing_an_unrelated_window(window):
    context=ChatRequest.model_validate({**body(), 'pageContext':{**CTX,'activeWindow':window,'activePanel':'','targets':[
        *CTX['targets'],
        {'id':f'window:minimize:{window}','available':True,'guideable':True,'capabilities':['guideTo'],'names':{'en':'Minimize window','zh':'最小化窗口'}}
    ]}}).pageContext
    assert GuidePlanner().plan('带我看 AI 项目',context,'zh').target_id==f'window:minimize:{window}'

def test_minimize_continuation_preserves_destination_on_desktop():
    planner=GuidePlanner()
    context=ChatRequest.model_validate(body()).pageContext
    assert planner.plan('completed minimize',context,'zh',guide_step=True,topic='ai').target_id=='folder:projects'


@pytest.mark.parametrize('question,folder',[('带我看 README','about'),('带我看工作经历','experience'),('Show me contact','contact'),('Show me DOOM','doom')])
def test_other_desktop_destinations_survive_window_minimization(question,folder):
    planner=GuidePlanner();topic=planner.topic(question)
    assert topic==f'folder:{folder}'
    context=ChatRequest.model_validate({**body(), 'pageContext':{**CTX,'targets':[
        {'id':f'folder:{folder}','available':True,'guideable':True,'capabilities':['guideTo'],'names':{'en':folder,'zh':folder}}
    ]}}).pageContext
    assert planner.plan('completed minimize',context,'zh',guide_step=True,topic=topic).target_id==f'folder:{folder}'
    arrived=context.model_copy(update={'activeWindow':folder})
    assert '已打开' in planner.plan('completed folder',arrived,'zh',guide_step=True,topic=topic).message

def test_about_preposition_does_not_override_a_project_topic():
    assert GuidePlanner.topic('带我看关于 AI 的项目')=='ai'

@pytest.mark.parametrize('locale',['zh','en'])
@pytest.mark.parametrize('offer',json.loads((ROOT/'content/guide-offers.json').read_text(encoding='utf-8')))
def test_welcome_offers_finish_through_the_real_api_without_a_model(knowledge,locale,offer):
    fake=Fake('silent')
    with TestClient(create_app(fake,knowledge)) as client:
        h=login(client)
        desktop={**CTX,'language':locale,'targets':[*CTX['targets'],{'id':'folder:experience','available':True,'guideable':True,'capabilities':['guideTo'],'names':{'en':'Experience','zh':'经历'}}]}
        first=events(client.post('/api/chat',json={**body(offer['question'][locale],messageLocale=locale),'pageContext':desktop},headers=h))
        if offer['id']=='ai':
            assert 'pingpong-vision' in next(e for e in first if e['type']=='projectChoices')['ids']
            first=events(client.post('/api/chat',json={**body('Take me to fast-ai-movie',messageLocale=locale),'pageContext':desktop},headers=h))
        target='folder:experience' if offer['id']=='experience' else 'folder:projects'
        assert next(e['instruction']['target'] for e in first if e['type']=='presentation')==target
        if offer['id']=='experience':
            context={**desktop,'activeWindow':'experience','activePanel':''}
        else:
            collection={**desktop,'activeWindow':'projects','activePanel':'collection','targets':[
                {'id':f"project-card:{p['id']}",'available':True,'guideable':True,'capabilities':['guideTo'],'names':{'en':p['id'],'zh':p['id']}} for p in CATALOG
            ]}
            second=events(client.post('/api/chat',json={**body('completed folder',messageLocale=locale,guideStep=True),'pageContext':collection},headers=h))
            project='fast-ai-movie' if offer['id']=='ai' else 'drone-simulator'
            assert next(e['instruction']['target'] for e in second if e['type']=='presentation')==f'project-card:{project}'
            context={**collection,'activeWindow':f'project:{project}','activePanel':'detail'}
        final=events(client.post('/api/chat',json={**body('completed target',messageLocale=locale,guideStep=True),'pageContext':context},headers=h))
        assert next(e['instruction']['type'] for e in final if e['type']=='presentation')=='speak'
        if offer['id']=='ai':
            speech=next(e['instruction']['value'] for e in final if e['type']=='presentation')
            assert 'FAST AI Movie' in speech
            assert ('AI 讲解员' if locale=='zh' else 'AI speaker') in speech
            assert 'safe guide' not in speech
        assert fake.seen==[]
        assert client.get('/api/session/usage',headers=h).json()['used']==0

@pytest.mark.parametrize('question', ['Show me AI projects', '有哪些 LLM 相关项目', 'RAG projects', '有没有LLM相关的', 'RAG项目'])
def test_topic_discovery_requires_selection_before_navigation(knowledge, question):
    fake=Fake('silent')
    with TestClient(create_app(fake,knowledge)) as client:
        ev=events(client.post('/api/chat',json=body(question),headers=login(client)))
        choices=next((e for e in ev if e['type']=='projectChoices'),None)
        assert choices is not None
        assert ('web-harvest-rag' if 'RAG' in question else 'pingpong-vision') in choices['ids']
        assert not any(e['type']=='presentation' and e['instruction']['type']=='guideTo' for e in ev)
        assert fake.seen==[]

@pytest.mark.parametrize('query,expected', [
    ('AI projects', {'pingpong-vision','web-harvest-rag','you-dont-need-rag','fast-ai-movie','vehicle-identification','3d-reconstruction'}),
    ('大语言模型项目', {'pingpong-vision','web-harvest-rag','you-dont-need-rag'}),
    ('RAG projects', {'web-harvest-rag','you-dont-need-rag'}),
])
def test_topic_search_returns_diverse_grounded_project_overviews(knowledge,query,expected):
    results=knowledge.search(query)
    projects={row['id'].split(':')[1] for row in results if row['id'].endswith(':summary')}
    assert expected <= projects
    assert all(row['source'].startswith('content/') for row in results)

def test_conceptual_questions_and_specific_projects_do_not_offer_unrelated_choices():
    planner=GuidePlanner()
    assert planner.discover('What is RAG?', 'en') is None
    assert planner.discover('Take me to pingpong-vision', 'en') is None
    assert set(planner.discover('LLM projects', 'en').choices)=={'pingpong-vision','web-harvest-rag','you-dont-need-rag'}


@pytest.mark.parametrize('locale',['en','zh'])
def test_arrival_introduces_fast_ai_movie_without_requiring_another_target(locale):
    fake=Fake('silent')
    with TestClient(create_app(fake,object())) as client:
        h=login(client)
        events(client.post('/api/chat',json=body('Show me FAST AI Movie',messageLocale=locale),headers=h))
        detail={**CTX,'activeWindow':'project:fast-ai-movie','activePanel':'detail','targets':[]}
        final=events(client.post('/api/chat',json={**body('completed target',messageLocale=locale,guideStep=True),'pageContext':detail},headers=h))
        instructions=[PresentationInstruction.model_validate(e['instruction']) for e in final if e['type']=='presentation']
        assert len(instructions)==1 and instructions[0].type=='speak'
        assert 'FAST AI Movie' in instructions[0].value
        assert ('AI 讲解员' if locale=='zh' else 'AI speaker') in instructions[0].value
        assert 'safe guide' not in instructions[0].value
        assert final[-1]['type']=='done' and final[-1]['waiting'] is False
        assert fake.seen==[]
