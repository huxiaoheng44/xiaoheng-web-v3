"""Opt-in real-model recall check: python -m backend.retrieval_eval.

Uses the installed local index, no chat model or fabricated vectors. The small
curated set is a regression signal, not a general semantic-quality benchmark.
"""
import json
import time
import uuid
from fastapi.testclient import TestClient
from .app.api.routes import create_app
from .app.core.config import ROOT
from .app.knowledge.store import Knowledge

CASES = [
    ('用摄像头读取工厂仪表上的数值', 'pingpong-vision'),
    ('把网页资料变成能引用来源的问答助手', 'web-harvest-rag'),
    ('不建检索系统，直接把资料放进模型上下文', 'you-dont-need-rag'),
    ('从马路录音判断驶过的是什么车', 'vehicle-identification'),
    ('recover depth from two photographs', '3d-reconstruction'),
    ('generate training videos with a virtual presenter', 'fast-ai-movie'),
    ('simulate aircraft control without risking hardware', 'drone'),
    ('read measurements from photographs of industrial displays', 'pingpong-vision'),
]


def main():
    knowledge = Knowledge()
    results=[]
    for query, expected in CASES:
        start=time.perf_counter()
        dense=knowledge.semantic_search(query,3)
        hybrid=knowledge.search(query)[:3]
        dense_hit=any(row['id'].split(':')[1]==expected for row,_ in dense)
        hybrid_hit=any(row['id'].split(':')[1]==expected for row in hybrid)
        results.append({'query':query,'expected':expected,'dense':[(row['id'],round(score,4)) for row,score in dense],
                        'hybrid':[row['id'] for row in hybrid],'denseHit':dense_hit,'hybridHit':hybrid_hit,
                        'elapsedMs':round((time.perf_counter()-start)*1000)})
    report={'retrieval':knowledge.retrieval_status(),'cases':results,
            'denseRecallAt3':sum(row['denseHit'] for row in results)/len(results),
            'hybridRecallAt3':sum(row['hybridHit'] for row in results)/len(results)}
    # Exercise the actual API seam: semantic project suggestions still require
    # a visitor selection and never directly move/highlight the agent.
    with TestClient(create_app(provider=object(),knowledge=knowledge)) as client:
        token=client.post('/api/session').json()['token']
        for query,expected in [('带我看用摄像头读取工厂仪表数值的项目','pingpong-vision'),
                               ('有没有能从声音判断车型的项目','vehicle-identification')]:
            response=client.post('/api/chat',headers={'Authorization':'Bearer '+token},json={
                'requestId':str(uuid.uuid4()),'message':query,
                'pageContext':{'language':'zh','contextVersion':0,'activeWindow':None,'windows':[],
                               'aboutTab':'profile','targets':[]}})
            response.raise_for_status()
            events=[json.loads(line[6:]) for line in response.text.splitlines() if line.startswith('data: ')]
            assert expected in next(e['ids'] for e in events if e['type']=='projectChoices')
            assert not any(e['type']=='presentation' for e in events)
    report['semanticChoiceApiCases']=2
    path=ROOT/'artifacts/retrieval-eval.json';path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({key:value for key,value in report.items() if key!='cases'},ensure_ascii=False))
    print(f'Report: {path}')
    assert report['retrieval']['mode']=='hybrid', 'Vector index is missing or incompatible; run npm run backend:vectors'
    assert all(row['denseHit'] and row['hybridHit'] for row in results), 'Recall regression; inspect report'


if __name__=='__main__':
    main()
