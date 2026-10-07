"""Public, current-snapshot GitHub source ingestion. Never reads Git history or .git."""
from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import PurePosixPath
from urllib.parse import quote
from urllib.request import Request, urlopen

ALLOWED_REPOSITORIES = {
    'huxiaoheng44/xiaoheng-web-v3': 'https://github.com/huxiaoheng44/xiaoheng-web-v3',
}
MAX_FILE_BYTES = 180_000
MAX_FILES = 300
TEXT_EXTENSIONS = {'.py', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.txt', '.css', '.html', '.yml', '.yaml', '.toml'}
EXCLUDED_PARTS = {'.git', 'node_modules', 'build', 'dist', 'coverage', '.cache', '__pycache__', '.venv', 'venv', 'env', '.pytest_cache', '.mypy_cache', '.ruff_cache', 'data'}
EXCLUDED_NAMES = {'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock', 'cargo.lock', 'composer.lock'}
SECRET_NAME = re.compile(r'(^|[._-])(secret|credential|private|id_rsa|token)([._-]|$)', re.I)

@dataclass(frozen=True)
class Repository:
    slug: str
    url: str

def allowed_repository(slug: str) -> Repository:
    if slug not in ALLOWED_REPOSITORIES:
        raise ValueError('Repository is not allowlisted')
    return Repository(slug, ALLOWED_REPOSITORIES[slug])

def github_json(url: str) -> dict:
    request = Request(url, headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'monty-source-indexer'})
    with urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode('utf-8'))

def github_bytes(url: str, limit: int = MAX_FILE_BYTES) -> bytes:
    request = Request(url, headers={'Accept': 'application/vnd.github+json', 'User-Agent': 'monty-source-indexer'})
    with urlopen(request, timeout=30) as response:
        data = response.read(limit + 1)
    if len(data) > limit:
        raise ValueError('Source file exceeds source index limit')
    return data

def is_safe_path(path: str) -> bool:
    pure = PurePosixPath(path)
    name = pure.name.lower()
    if not path or path.startswith('/') or '..' in pure.parts: return False
    if any(part.lower() in EXCLUDED_PARTS for part in pure.parts): return False
    if name in EXCLUDED_NAMES or SECRET_NAME.search(name): return False
    if '.env' in name or name.endswith(('.pem', '.key', '.p12', '.pfx', '.sqlite', '.db', '.map', '.min.js')): return False
    return pure.suffix.lower() in TEXT_EXTENSIONS

def is_safe_source(path: str, content: bytes) -> bool:
    return is_safe_path(path) and len(content) <= MAX_FILE_BYTES and b'\0' not in content

def fetch_current_snapshot(slug: str = 'huxiaoheng44/xiaoheng-web-v3') -> tuple[Repository, str, dict[str, str]]:
    repo = allowed_repository(slug)
    branch = github_json(f'https://api.github.com/repos/{repo.slug}').get('default_branch')
    if not isinstance(branch, str) or not re.fullmatch(r'[A-Za-z0-9._/-]{1,120}', branch):
        raise ValueError('GitHub did not provide a valid default branch')
    tree = github_json(f'https://api.github.com/repos/{repo.slug}/git/trees/{quote(branch, safe="")}?recursive=1')
    if tree.get('truncated') is True: raise ValueError('GitHub source tree is too large to index safely')
    files: dict[str, str] = {}
    entries = tree.get('tree')
    if not isinstance(entries, list): raise ValueError('GitHub did not provide a source tree')
    for entry in entries:
        if len(files) >= MAX_FILES: break
        path = entry.get('path') if isinstance(entry, dict) else None
        size = entry.get('size') if isinstance(entry, dict) else None
        if not isinstance(entry, dict) or entry.get('type') != 'blob' or not isinstance(path, str) or not isinstance(size, int) or size > MAX_FILE_BYTES or not is_safe_path(path): continue
        content = github_bytes(f'https://raw.githubusercontent.com/{repo.slug}/{quote(branch, safe="")}/{quote(path, safe="/")}')
        if is_safe_source(path, content): files[path] = content.decode('utf-8')
    return repo, branch, files

def file_url(repo: Repository, branch: str, path: str) -> str:
    return f'{repo.url}/blob/{quote(branch, safe="")}/{quote(path, safe="/")}'

def source_records(repo: Repository, branch: str, files: dict[str, str]):
    safe_files = {path: text for path, text in files.items() if is_safe_source(path, text.encode('utf-8'))}
    readme = next((text for path, text in safe_files.items() if path.lower() == 'readme.md'), '')
    yield {'id': f'github:{repo.slug}:summary', 'title': f'{repo.slug} / repository summary', 'text': readme[:12_000] or f'Public source snapshot of {repo.slug}.', 'target': '', 'language': 'mixed', 'source': repo.url, 'sourceType': 'github-source', 'repository': repo.slug, 'branch': branch, 'path': 'README.md' if readme else '', 'url': file_url(repo, branch, 'README.md') if readme else repo.url}
    directories = sorted({str(PurePosixPath(path).parent) for path in safe_files if '/' in path})
    if directories:
        yield {'id': f'github:{repo.slug}:modules', 'title': f'{repo.slug} / modules', 'text': '\n'.join(directories), 'target': '', 'language': 'mixed', 'source': repo.url, 'sourceType': 'github-source', 'repository': repo.slug, 'branch': branch, 'path': '', 'url': repo.url}
    for path, text in sorted(safe_files.items()):
        for index, chunk in enumerate(_chunks(text)):
            yield {'id': f'github:{repo.slug}:{path}:{index}', 'title': f'{repo.slug} / {path}', 'text': chunk, 'target': '', 'language': 'mixed', 'source': repo.url, 'sourceType': 'github-source', 'repository': repo.slug, 'branch': branch, 'path': path, 'url': file_url(repo, branch, path)}

def _chunks(text: str, size: int = 3500):
    text = text.strip()
    for start in range(0, len(text), size):
        yield text[start:start + size]
