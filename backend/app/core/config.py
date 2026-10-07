import os
from pathlib import Path
from dotenv import load_dotenv, dotenv_values

ROOT = Path(__file__).resolve().parents[3]
LOCAL_ENV = dotenv_values(ROOT / 'backend' / '.env')
load_dotenv(ROOT / 'backend' / '.env')
# Compatibility: older deployments configured the agent with GHOST_* variables (the agent was
# called Ghost, then CRT.AGENT, now Monty). Map them onto MONTY_* unless the new name is set.
for _key, _value in list(os.environ.items()):
    if _key.startswith('GHOST_'):
        os.environ.setdefault('MONTY_' + _key[len('GHOST_'):], _value)
# Do not send visitor conversations to tracing services implicitly.
os.environ['LANGCHAIN_TRACING_V2'] = 'false'
os.environ['LANGSMITH_TRACING'] = 'false'
MODEL = os.getenv('MONTY_MODEL', '')
PROVIDER = os.getenv('MONTY_PROVIDER', 'deepseek' if MODEL.startswith('deepseek') else 'openai').strip().lower()
if PROVIDER not in {'openai', 'deepseek'}:
    raise RuntimeError('MONTY_PROVIDER must be openai or deepseek')
BASE_URL = os.getenv('MONTY_BASE_URL', '').strip() or ('https://api.deepseek.com' if PROVIDER == 'deepseek' else 'https://api.openai.com/v1')
def select_api_key(provider, environment, local):
    if environment.get('MONTY_API_KEY'): return environment['MONTY_API_KEY']
    if provider == 'deepseek':
        # Never send an unrelated process-wide OpenAI credential to DeepSeek.
        # The old name is accepted only when deliberately present in this project's file.
        return environment.get('DEEPSEEK_API_KEY') or local.get('OPENAI_API_KEY') or ''
    return environment.get('OPENAI_API_KEY') or ''

KEY = select_api_key(PROVIDER, os.environ, LOCAL_ENV)
THINKING = os.getenv('MONTY_THINKING', 'disabled').strip().lower()
if THINKING not in {'enabled', 'disabled'}:
    raise RuntimeError('MONTY_THINKING must be enabled or disabled')
MAX_TOKENS = int(os.getenv('MONTY_MAX_TOKENS', '8192' if PROVIDER == 'deepseek' and THINKING == 'enabled' else '1600'))
ORIGINS = os.getenv('MONTY_ALLOWED_ORIGINS', 'http://127.0.0.1:5173,http://localhost:5173').split(',')
SESSION_LIMIT = int(os.getenv('MONTY_SESSION_LIMIT', '100'))
GLOBAL_LIMIT = int(os.getenv('MONTY_GLOBAL_CALLS_PER_HOUR', '300'))
REQUEST_LIMIT = int(os.getenv('MONTY_REQUESTS_PER_MINUTE', '20'))
IP_LIMIT = int(os.getenv('MONTY_IP_REQUESTS_PER_MINUTE', '90'))

SESSION_OUTPUT_TOKENS = max(1, int(os.getenv("MONTY_SESSION_OUTPUT_TOKENS", "300000")))

EMBEDDING_MODEL = os.getenv('MONTY_EMBEDDING_MODEL', 'Xenova/multilingual-e5-small')
EMBEDDING_CACHE = Path(os.getenv('MONTY_EMBEDDING_CACHE', str(ROOT / 'backend/data/models')))
EMBEDDING_THREADS = max(1, int(os.getenv('MONTY_EMBEDDING_THREADS', '2')))
