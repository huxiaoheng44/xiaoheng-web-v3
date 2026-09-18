import os
from pathlib import Path
from dotenv import load_dotenv, dotenv_values

ROOT = Path(__file__).resolve().parents[3]
LOCAL_ENV = dotenv_values(ROOT / 'backend' / '.env')
load_dotenv(ROOT / 'backend' / '.env')
# Do not send visitor conversations to tracing services implicitly.
os.environ['LANGCHAIN_TRACING_V2'] = 'false'
os.environ['LANGSMITH_TRACING'] = 'false'
MODEL = os.getenv('GHOST_MODEL', '')
PROVIDER = os.getenv('GHOST_PROVIDER', 'deepseek' if MODEL.startswith('deepseek') else 'openai').strip().lower()
if PROVIDER not in {'openai', 'deepseek'}:
    raise RuntimeError('GHOST_PROVIDER must be openai or deepseek')
BASE_URL = os.getenv('GHOST_BASE_URL', '').strip() or ('https://api.deepseek.com' if PROVIDER == 'deepseek' else 'https://api.openai.com/v1')
def select_api_key(provider, environment, local):
    if environment.get('GHOST_API_KEY'): return environment['GHOST_API_KEY']
    if provider == 'deepseek':
        # Never send an unrelated process-wide OpenAI credential to DeepSeek.
        # The old name is accepted only when deliberately present in this project's file.
        return environment.get('DEEPSEEK_API_KEY') or local.get('OPENAI_API_KEY') or ''
    return environment.get('OPENAI_API_KEY') or ''

KEY = select_api_key(PROVIDER, os.environ, LOCAL_ENV)
THINKING = os.getenv('GHOST_THINKING', 'disabled').strip().lower()
if THINKING not in {'enabled', 'disabled'}:
    raise RuntimeError('GHOST_THINKING must be enabled or disabled')
MAX_TOKENS = int(os.getenv('GHOST_MAX_TOKENS', '8192' if PROVIDER == 'deepseek' and THINKING == 'enabled' else '1600'))
ORIGINS = os.getenv('GHOST_ALLOWED_ORIGINS', 'http://127.0.0.1:5173,http://localhost:5173').split(',')
SESSION_LIMIT = int(os.getenv('GHOST_SESSION_LIMIT', '100'))
GLOBAL_LIMIT = int(os.getenv('GHOST_GLOBAL_CALLS_PER_HOUR', '300'))
REQUEST_LIMIT = int(os.getenv('GHOST_REQUESTS_PER_MINUTE', '20'))
IP_LIMIT = int(os.getenv('GHOST_IP_REQUESTS_PER_MINUTE', '90'))
