"""Session output budgets, reserved before each model call and settled once."""
from ..core import config
from ..providers.chat import ProviderFailure


def usage(session):
    return {
        'limit': config.SESSION_OUTPUT_TOKENS,
        'used': session.output_used,
        'remaining': max(0, config.SESSION_OUTPUT_TOKENS - session.output_used - session.output_reserved),
        'reserved': session.output_reserved,
        'estimated': session.output_estimated,
    }


class BudgetedProvider:
    def __init__(self, session, factory):
        self.session = session
        self.factory = factory

    async def complete(self, messages, emit):
        session = self.session
        allowance = min(config.MAX_TOKENS, usage(session)['remaining'])
        if allowance <= 0:
            emit({'type': 'usage', 'usage': usage(session)})
            raise ProviderFailure('budget', 'Session reply allowance exhausted / 本次会话回复额度已用完。')
        session.output_reserved += allowance
        emit({'type': 'usage', 'usage': usage(session)})
        actual = None

        def relay(event):
            nonlocal actual
            if event['type'] == 'modelUsage':
                value = event.get('outputTokens')
                if isinstance(value, int) and not isinstance(value, bool) and value >= 0:
                    actual = value
            else:
                emit(event)

        try:
            return await self.factory(allowance).complete(messages, relay)
        except ProviderFailure as error:
            if error.code in {'configuration', 'rate-limit'} and actual is None:
                actual = 0
            raise
        finally:
            session.output_reserved -= allowance
            # Missing/cancelled usage must not give unlimited free retries.
            session.output_used += actual if actual is not None else allowance
            session.output_estimated |= actual is None
            emit({'type': 'usage', 'usage': usage(session)})
