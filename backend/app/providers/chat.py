"""OpenAI-compatible transport with explicit per-provider parameter adaptation."""
from openai import AsyncOpenAI, AuthenticationError, RateLimitError, APIConnectionError, APITimeoutError, APIStatusError
from ..core import config

class ProviderFailure(RuntimeError):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code


def request_options(max_output_tokens=None):
    common={'model':config.MODEL,'stream':True,'stream_options':{'include_usage':True}}
    output_limit=config.MAX_TOKENS if max_output_tokens is None else max_output_tokens
    if config.PROVIDER=='deepseek':
        return {**common,'max_tokens':output_limit,'extra_body':{'thinking':{'type':config.THINKING}}}
    return {**common,'parallel_tool_calls':False,'max_completion_tokens':output_limit,'store':False}

class ChatProvider:
    def __init__(self,tools,max_output_tokens=None): self.tools=tools; self.max_output_tokens=max_output_tokens
    async def complete(self,messages,emit):
        if not config.KEY or not config.MODEL:
            raise ProviderFailure('configuration', 'Agent is not configured. Set backend API key and MONTY_MODEL. / 尚未配置后端模型。')
        try:
            async with AsyncOpenAI(api_key=config.KEY,base_url=config.BASE_URL,timeout=30,max_retries=2) as client:
                stream=await client.chat.completions.create(messages=messages,tools=self.tools,**request_options(self.max_output_tokens))
                text=''; reasoning=''; calls={}; finish=None
                async for chunk in stream:
                    measured=getattr(chunk,'usage',None)
                    if measured is not None:
                        emit({'type':'modelUsage','outputTokens':measured.completion_tokens})
                    if not chunk.choices: continue
                    choice=chunk.choices[0]; delta=choice.delta
                    if choice.finish_reason: finish=choice.finish_reason
                    # Required for DeepSeek thinking-mode tool continuation; never sent to the UI.
                    reasoning+=getattr(delta,'reasoning_content',None) or ''
                    fragment=delta.content or getattr(delta,'refusal',None)
                    if fragment:
                        text+=fragment; emit({'type':'delta','text':fragment})
                    for c in delta.tool_calls or []:
                        item=calls.setdefault(c.index,{'id':'','type':'function','function':{'name':'','arguments':''}})
                        if c.id:item['id']=c.id
                        if c.function:
                            item['function']['name']+=c.function.name or ''
                            item['function']['arguments']+=c.function.arguments or ''
                if finish=='length': raise RuntimeError('Model output limit reached / 模型输出达到长度上限，请缩短问题或调整后端限制。')
                result={'role':'assistant','content':text or None}
                if calls:result['tool_calls']=list(calls.values())
                if config.PROVIDER=='deepseek' and config.THINKING=='enabled':result['reasoning_content']=reasoning
                return result
        except AuthenticationError:
            raise ProviderFailure('configuration', 'Model authentication failed / 模型认证失败，请检查后端 Key 与接口地址是否属于同一服务商。') from None
        except RateLimitError:
            raise ProviderFailure('rate-limit', 'Model service quota or rate limit reached / 模型服务额度或频率受限。') from None
        except APITimeoutError:
            raise ProviderFailure('timeout', 'Model reply timed out / 这次模型回复超时。') from None
        except APIConnectionError:
            raise ProviderFailure('connection', 'Model connection interrupted / 模型连接暂时中断。') from None
        except APIStatusError:
            raise ProviderFailure('request-failed', 'Model request failed / 这次模型请求未能完成。') from None
