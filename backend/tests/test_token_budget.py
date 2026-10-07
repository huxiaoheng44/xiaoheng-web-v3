import asyncio
import pytest
from backend.app.core import config
from backend.app.services.sessions import Session
from backend.app.services.token_budget import BudgetedProvider, usage
from backend.app.providers.chat import ProviderFailure

@pytest.mark.asyncio
async def test_measured_output_settles_reservation_and_caps_the_next_call(monkeypatch):
    monkeypatch.setattr(config,'SESSION_OUTPUT_TOKENS',100)
    monkeypatch.setattr(config,'MAX_TOKENS',80)
    session=Session('test');limits=[];events=[]
    class Provider:
        async def complete(self,messages,emit):
            emit({'type':'modelUsage','outputTokens':60})
            emit({'type':'delta','text':'Hello'})
            return {'role':'assistant','content':'Hello'}
    def factory(limit):limits.append(limit);return Provider()
    provider=BudgetedProvider(session,factory)
    await provider.complete([],events.append)
    assert usage(session)=={'limit':100,'used':60,'remaining':40,'reserved':0,'estimated':False}
    assert not any(event['type']=='modelUsage' for event in events)
    class LastProvider:
        async def complete(self,messages,emit):
            emit({'type':'modelUsage','outputTokens':40})
            return {'role':'assistant','content':'Last'}
    await BudgetedProvider(session,lambda limit:(limits.append(limit) or LastProvider())).complete([],events.append)
    assert limits==[80,40]
    with pytest.raises(ProviderFailure,match='exhausted'):
        await provider.complete([],events.append)
    assert usage(session)['remaining']==0

@pytest.mark.asyncio
async def test_cancelled_or_unreported_usage_keeps_a_conservative_charge(monkeypatch):
    monkeypatch.setattr(config,'SESSION_OUTPUT_TOKENS',100)
    monkeypatch.setattr(config,'MAX_TOKENS',80)
    session=Session('test')
    class Provider:
        async def complete(self,messages,emit):raise asyncio.CancelledError()
    with pytest.raises(asyncio.CancelledError):
        await BudgetedProvider(session,lambda _:Provider()).complete([],lambda _:None)
    assert usage(session)=={'limit':100,'used':80,'remaining':20,'reserved':0,'estimated':True}

@pytest.mark.asyncio
async def test_overlapping_requests_cannot_reserve_the_same_tokens(monkeypatch):
    monkeypatch.setattr(config,'SESSION_OUTPUT_TOKENS',100)
    monkeypatch.setattr(config,'MAX_TOKENS',100)
    session=Session('test');started=asyncio.Event();release=asyncio.Event()
    class Provider:
        async def complete(self,messages,emit):started.set();await release.wait();return {'role':'assistant','content':''}
    provider=BudgetedProvider(session,lambda _:Provider())
    pending=asyncio.create_task(provider.complete([],lambda _:None));await started.wait()
    try:
        with pytest.raises(ProviderFailure,match='exhausted'):await provider.complete([],lambda _:None)
    finally:release.set();await pending
    assert session.output_reserved==0
