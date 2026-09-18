"""OpenAI-compatible transport with explicit per-provider parameter adaptation."""
from openai import AsyncOpenAI, AuthenticationError, RateLimitError, APIConnectionError, APITimeoutError
from ..core import config

def request_options():
    common={'model':config.MODEL,'stream':True}
    if config.PROVIDER=='deepseek':
        return {**common,'max_tokens':config.MAX_TOKENS,'extra_body':{'thinking':{'type':config.THINKING}}}
    return {**common,'parallel_tool_calls':False,'max_completion_tokens':config.MAX_TOKENS,'store':False}

class ChatProvider:
    def __init__(self,tools): self.tools=tools
    async def complete(self,messages,emit):
        if not config.KEY or not config.MODEL:
            raise RuntimeError('Agent is not configured. Set backend API key and GHOST_MODEL. / 尚未配置后端模型。')
        try:
            async with AsyncOpenAI(api_key=config.KEY,base_url=config.BASE_URL,timeout=30,max_retries=0) as client:
                stream=await client.chat.completions.create(messages=messages,tools=self.tools,**request_options())
                text=''; reasoning=''; calls={}; finish=None
                async for chunk in stream:
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
            raise RuntimeError('Model authentication failed / 模型认证失败，请检查后端 Key 与接口地址是否属于同一服务商。') from None
        except RateLimitError:
            raise RuntimeError('Model service quota or rate limit reached / 模型服务额度或频率受限。') from None
        except (APIConnectionError,APITimeoutError):
            raise RuntimeError('Model service connection failed or timed out / 模型服务连接失败或超时。') from None
