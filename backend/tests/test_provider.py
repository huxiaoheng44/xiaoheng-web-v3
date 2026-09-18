from types import SimpleNamespace
import pytest
from backend.app.providers import chat
from backend.app.core import config

def test_provider_credentials_never_cross_implicitly():
    assert config.select_api_key('deepseek',{'OPENAI_API_KEY':'unrelated-openai-secret'}, {})==''
    assert config.select_api_key('deepseek',{'OPENAI_API_KEY':'unrelated'}, {'OPENAI_API_KEY':'project-deepseek-secret'})=='project-deepseek-secret'
    assert config.select_api_key('deepseek',{'DEEPSEEK_API_KEY':'dedicated','OPENAI_API_KEY':'unrelated'}, {})=='dedicated'
    assert config.select_api_key('openai',{'OPENAI_API_KEY':'openai-secret','DEEPSEEK_API_KEY':'other'}, {})=='openai-secret'

def test_deepseek_parameters(monkeypatch):
    monkeypatch.setattr(config,'PROVIDER','deepseek')
    monkeypatch.setattr(config,'MODEL','deepseek-v4-flash')
    monkeypatch.setattr(config,'THINKING','disabled')
    options=chat.request_options()
    assert options['model']=='deepseek-v4-flash'
    assert options['extra_body']=={'thinking':{'type':'disabled'}}
    assert 'max_tokens' in options
    assert not {'store','parallel_tool_calls','max_completion_tokens'} & options.keys()

def test_openai_parameters(monkeypatch):
    monkeypatch.setattr(config,'PROVIDER','openai')
    options=chat.request_options()
    assert options['store'] is False and options['parallel_tool_calls'] is False
    assert 'max_completion_tokens' in options and 'extra_body' not in options

@pytest.mark.asyncio
async def test_deepseek_stream_keeps_reasoning_private(monkeypatch):
    monkeypatch.setattr(config,'PROVIDER','deepseek');monkeypatch.setattr(config,'THINKING','enabled')
    monkeypatch.setattr(config,'KEY','test-key');monkeypatch.setattr(config,'MODEL','deepseek-flash')
    monkeypatch.setattr(config,'BASE_URL','https://api.deepseek.com')
    seen={}
    async def stream():
        for delta,finish in [(SimpleNamespace(content=None,reasoning_content='private protocol state',tool_calls=[]),None),(SimpleNamespace(content='Hello',tool_calls=[]),'stop')]:
            yield SimpleNamespace(choices=[SimpleNamespace(delta=delta,finish_reason=finish)])
    class Client:
        def __init__(self,**kwargs):seen.update(kwargs);self.chat=SimpleNamespace(completions=self)
        async def __aenter__(self):return self
        async def __aexit__(self,*args):pass
        async def create(self,**kwargs):seen['request']=kwargs;return stream()
    monkeypatch.setattr(chat,'AsyncOpenAI',Client)
    events=[];result=await chat.ChatProvider([]).complete([],events.append)
    assert seen['base_url']=='https://api.deepseek.com'
    assert result['reasoning_content']=='private protocol state'
    assert events==[{'type':'delta','text':'Hello'}]
