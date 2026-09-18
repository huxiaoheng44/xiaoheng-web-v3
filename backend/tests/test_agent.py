import json
import time
import uuid
import pytest
from fastapi.testclient import TestClient
from backend.main import create_app
from backend.app.knowledge.store import Knowledge, build, records
from backend.app.core.config import ROOT
from backend.app.schemas.contracts import ChatRequest, Action

CTX={'language':'zh','contextVersion':0,'activeWindow':None,'windows':[],'aboutTab':'profile','targets':[{'id':'folder:projects','label':'项目','visible':True,'rect':[0,0,20,20],'excerpt':''}]}
def body(message='你好',**kwargs): return {'requestId':str(uuid.uuid4()),'message':message,'pageContext':CTX,**kwargs}
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
            name='performActions';args={'summary':'打开无人机项目','actions':[{'type':'openProject','target':'drone-simulator','value':''}]}
        return {'role':'assistant','content':None,'tool_calls':[{'id':'call1','type':'function','function':{'name':name,'arguments':json.dumps(args)}}]}

@pytest.fixture
def knowledge(tmp_path):
    db=tmp_path/'kb.sqlite';build(db=db);return Knowledge(db)

def login(client):return {'Authorization':'Bearer '+client.post('/api/session').json()['token']}

def test_knowledge_allowlist(knowledge):
    assert knowledge.search('无人机 PX4')
    rows=list(records())
    assert not any('网页文案草案' in r['title'] or 'Portfolio copy' in r['title'] or r['source']=='knowledge/README.md' for r in rows)
    assert all('attachments' not in r['source'] for r in rows)

def test_chat_actions_wait_for_result(knowledge):
    fake=Fake();app=create_app(fake,knowledge)
    with TestClient(app) as client:
        h=login(client);ev=events(client.post('/api/chat',json=body('打开无人机项目'),headers=h))
        action=next(e for e in ev if e['type']=='action');rid=ev[0]['runId']
        assert len(fake.seen)==1 and action['navigationAuthorized']
        payload={'requestId':str(uuid.uuid4()),'actionId':action['actionId'],'status':'success','pageContext':{**CTX,'contextVersion':1,'activeWindow':'project:drone-simulator'}}
        ev2=events(client.post(f'/api/runs/{rid}/resume',json=payload,headers=h))
        assert any(e['type']=='delta' for e in ev2) and len(fake.seen)==2
        assert client.post(f'/api/runs/{rid}/resume',json=payload,headers=h).status_code==409

def test_proactive_approval_and_rejection(knowledge):
    with TestClient(create_app(Fake(),knowledge)) as client:
        h=login(client)
        ev=events(client.post('/api/observe',json=body(companion=True,behavior={'events':[],'trajectory':[],'idleSeconds':20}),headers=h))
        pending=next(e for e in ev if e['type']=='approval');assert not any(e['type']=='action' for e in ev)
        ev2=events(client.post(f'/api/runs/{ev[0]["runId"]}/resume',json={'requestId':str(uuid.uuid4()),'actionId':pending['actionId'],'approved':False,'pageContext':CTX},headers=h))
        assert not any(e['type']=='action' for e in ev2)
        assert any(s.rejected for s in client.app.state.store.sessions.values())

def test_search_and_session_isolation(knowledge):
    with TestClient(create_app(Fake('search'),knowledge)) as client:
        h=login(client);other=login(client)
        ev=events(client.post('/api/chat',json=body('介绍无人机'),headers=h))
        assert any(e['type']=='source' for e in ev)
        assert client.post('/api/chat',json=body()).status_code==401
        client.delete('/api/session',headers=h)
        assert client.post('/api/chat',json=body(),headers=h).status_code==401
        assert client.post('/api/chat',json=body(),headers=other).status_code==200

def test_consent_limits_and_validation(knowledge):
    assert ChatRequest.model_validate(body(behavior={'events':[],'trajectory':[],'idleSeconds':1})).behavior is None
    with pytest.raises(ValueError):Action.model_validate({'type':'eval','value':'alert(1)'})
    with pytest.raises(ValueError):Action.model_validate({'type':'openProject','target':'secrets','value':''})
    with TestClient(create_app(Fake('silent'),knowledge)) as client:
        h=login(client);b=body(companion=False)
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
        assert client.post(f'/api/runs/{rid}/resume',json={'requestId':str(uuid.uuid4()),'actionId':'call1:0','status':'success','pageContext':CTX},headers=h).status_code==409

def test_expiration(knowledge):
    app=create_app(Fake(),knowledge)
    with TestClient(app) as client:
        h=login(client);next(iter(app.state.store.sessions.values())).touched=time.monotonic()-1801
        assert client.post('/api/chat',json=body(),headers=h).status_code==401

def test_approval_accepts_then_waits_for_ui(knowledge):
    fake=Fake()
    with TestClient(create_app(fake,knowledge)) as client:
        h=login(client);ev=events(client.post('/api/chat',json=body('介绍无人机'),headers=h));rid=ev[0]['runId']
        approval=next(e for e in ev if e['type']=='approval')
        ev2=events(client.post(f'/api/runs/{rid}/resume',json={'requestId':str(uuid.uuid4()),'actionId':approval['actionId'],'approved':True,'pageContext':CTX},headers=h))
        action=next(e for e in ev2 if e['type']=='action');assert action['navigationAuthorized'];assert len(fake.seen)==1
        ev3=events(client.post(f'/api/runs/{rid}/resume',json={'requestId':str(uuid.uuid4()),'actionId':action['actionId'],'status':'failed','detail':'Target gone','pageContext':CTX},headers=h))
        assert len(fake.seen)==2 and 'failed' in fake.seen[-1][-1]['content']

def test_proactive_cooldown_and_quiet(knowledge):
    fake=Fake('silent');app=create_app(fake,knowledge)
    with TestClient(app) as client:
        h=login(client)
        payload=dict(companion=True,behavior={'events':[],'trajectory':[],'idleSeconds':20})
        events(client.post('/api/observe',json=body(**payload),headers=h));assert len(fake.seen)==1
        events(client.post('/api/observe',json=body(**payload),headers=h));assert len(fake.seen)==1
        session=next(iter(app.state.store.sessions.values()));session.evaluated=-1e9
        events(client.post('/api/observe',json=body(**payload,quiet=True),headers=h));assert len(fake.seen)==1
        session.proactive_count=5
        events(client.post('/api/observe',json=body(**payload),headers=h));assert len(fake.seen)==1

def test_cross_session_resume_and_negative_intent(knowledge):
    with TestClient(create_app(Fake(),knowledge)) as client:
        h=login(client);other=login(client)
        ev=events(client.post('/api/chat',json=body('不要打开项目，只介绍'),headers=h))
        approval=next(e for e in ev if e['type']=='approval');rid=ev[0]['runId']
        assert client.post(f'/api/runs/{rid}/resume',json={'requestId':str(uuid.uuid4()),'actionId':approval['actionId'],'approved':True,'pageContext':CTX},headers=other).status_code==409

def test_public_extra_requires_explicit_approval(tmp_path):
    import shutil
    (tmp_path/'content').mkdir(parents=True);(tmp_path/'knowledge').mkdir()
    shutil.copy(ROOT/'content/profile.json',tmp_path/'content/profile.json')
    shutil.copytree(ROOT/'content/projects',tmp_path/'content/projects',ignore=shutil.ignore_patterns('assets'))
    (tmp_path/'knowledge/private.md').write_text('Not approved: private canary',encoding='utf-8')
    (tmp_path/'knowledge/public.md').write_text('---\npublic: true\n---\n## Public FAQ\nApproved canary.',encoding='utf-8')
    rows=list(records(tmp_path))
    assert any('Approved canary' in r['text'] for r in rows)
    assert not any('private canary' in r['text'] for r in rows)
