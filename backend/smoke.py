"""Opt-in live model smoke test. Requires running, configured localhost backend."""
import json
import uuid
import httpx

with httpx.Client(base_url='http://127.0.0.1:8000',timeout=45) as client:
    session=client.post('/api/session').json()
    if not session.get('configured'): raise SystemExit('Backend is not configured; no model request made.')
    headers={'Authorization':'Bearer '+session['token']}
    try:
        with client.stream('POST','/api/chat',headers=headers,json={'requestId':str(uuid.uuid4()),'message':'Briefly describe Xiaoheng’s drone project using the knowledge base. Do not navigate.','pageContext':{'language':'en','contextVersion':0,'targets':[]}}) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if line.startswith('data: '):
                    item=json.loads(line[6:])
                    if item['type']=='delta':print(item['text'],end='',flush=True)
                    if item['type']=='error':raise RuntimeError(item['message'])
        print('\nLive smoke completed; review grounding against the cited sources.')
    finally:client.delete('/api/session',headers=headers)
